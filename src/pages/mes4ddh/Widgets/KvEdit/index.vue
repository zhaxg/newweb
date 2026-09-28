<script setup lang="ts">
/** 对应 FrmKvEdit（键值维护；菜单 SD1040/SD1050/SD1060/MP1230 共用，PCode=菜单 cQueryString=原窗体 QueryString）：
 *  Hmx.Winforms.Widgets.SysForms.FrmKvEdit
 *  已接入：systemKeyValueApi.queryKvFileds（原 SetGridControlKvFiledColumns 列转义：caption/visible）/
 *         systemKeyValueApi.querySysKvItemList(PCode) + 关键字本地过滤 /
 *         crudAppService.SaveList("HmxKv")（原 tsKeyValueBindingSource.GetTrackingList<HmxKv>().ToSaveChangesData → SaveChanges）
 *  待接入：queryKvFileds 的 editMask 掩码编辑器未迁（web 侧只应用列名与可见性） */

import { onMounted, ref, shallowRef } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { systemKeyValueApi } from "@/api/admin/request";
import { crudAppService } from "@/api/common/crudAppService";
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";
import { useMenuQuery } from "@/lib/menuQuery";
import type { HmxKv, KvFiledItem } from "@/api/admin/types";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: pcode } = useMenuQuery(); // 菜单 cQueryString = 原窗体 PCode

const trackList = shallowRef<TrackableList<HmxKv>>(new TrackableList<HmxKv>());
const keyword = ref("");
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// Designer 列序（VisibleIndex 0-8 + 隐藏列），中文列头按 HmxKv 实体 [LDisplay]
const baseCols: ColDef[] = [
  { field: "cCode", headerName: "编码", width: 140 },
  { field: "cName", headerName: "名称", width: 180 },
  { field: "cDesc", headerName: "描述", width: 160 },
  { field: "cValue", headerName: "扩展值", width: 120 },
  { field: "cGroup", headerName: "分组", width: 100 },
  { field: "cOrder", headerName: "排序", width: 80 },
  { field: "cSw01", headerName: "扩展1", width: 100 },
  { field: "cSw02", headerName: "扩展2", width: 100 },
  { field: "cSw03", headerName: "扩展3", width: 100 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cEnable", headerName: "启用", hide: true },
  { field: "cPid", headerName: "父编码", hide: true },
];
const colDefs = ref<ColDef[]>([...baseCols]);

/** 原 ViewControl_Completed → HmxKvEdit_FiledSetting.SetGridControlKvFiledColumns：
 *  先清空全部列头，再按 kvFileds 设置 caption/visible，新字段补列；未列出的列保留可见性但列头置空 */
function applyFiledCols(items: KvFiledItem[]) {
  const valid = items.filter((i) => i.filedName);
  if (!valid.length) return; // 占位 mock 形状不匹配时保持 Designer 列头
  const byName = new Map(valid.map((i) => [i.filedName!, i]));
  const next: ColDef[] = baseCols.map((c) => {
    const it = byName.get(String(c.field));
    return { ...c, headerName: it ? it.caption || "" : "", hide: it ? !it.visible : c.hide };
  });
  for (const it of valid) {
    if (!baseCols.some((c) => c.field === it.filedName)) {
      next.push({ field: it.filedName!, headerName: it.caption || "", hide: !it.visible, width: 120 });
    }
  }
  colDefs.value = next;
}

function getRowId(p: GetRowIdParams) {
  return String((p.data as HmxKv).id);
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function loadFields() {
  try {
    const fields = (await systemKeyValueApi.queryKvFileds(pcode)) ?? [];
    applyFiledCols(fields);
  } catch {
    /* 拦截层已 toast */
  }
}

async function onQuery() {
  querying.value = true;
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    const kw = keyword.value.trim();
    const rows = kw ? list.filter((x) => (x.cCode ?? "").includes(kw) || (x.cName ?? "").includes(kw)) : list;
    trackList.value = new TrackableList<HmxKv>(rows);
    gridApi.value?.deselectAll();
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 btnAdd_Click：AddNew + Id=GenerateID + CPid=PCode */
function onAdd() {
  const draft = { id: NextStrId(), cPid: pcode, selected: false } as HmxKv;
  trackList.value.push(draft);
  const stored = trackList.value[trackList.value.length - 1] as HmxKv;
  gridApi.value?.applyTransaction({ add: [stored] });
}

/** 原 btnDelete_Click：RemoveCurrent（web 侧删除勾选行） */
function onDelete() {
  const targets = (gridApi.value?.getSelectedRows() ?? []) as HmxKv[];
  if (!targets.length) return;
  for (const row of targets) {
    trackList.value.remove((r) => r === row || (row.id != null && r.id === row.id));
  }
  gridApi.value?.applyTransaction({ remove: targets });
}

async function onSave() {
  try {
    await crudAppService.SaveList(trackList.value, "HmxKv");
    toast("保存成功！", 2000, "success");
    await onQuery(); // C# 保存成功后重新查询
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(() => {
  void loadFields();
  void onQuery(); // 原 FrmKvEdit_Shown → btnQuery_Click
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1）：关键字输入 + 查询/添加/删除/保存 一行 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" placeholder="关键字" class="w-40 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">键值维护（{{ trackList.length }}）</span>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="trackList"
        :get-row-id="getRowId"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        :suppress-column-virtualisation="true"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
