<script setup lang="ts">
/** 对应 FrmYD1000（库区管理）：DDH.Winforms.SYD.Forms.FrmYD1000
 *  已接入：tyd1000Api.queryRoom（查询）+ crudAppService.SaveList("Tyd1000")（原 bindingSource1.SaveChanges<Tyd1000>() 通用跟踪保存）
 *  待接入：「确认」按钮(btnSelected)是 FrmYD1000(isSelected:true) 选择器模式的产物，本菜单为编辑模式原 Designer 即 Visible=false，按硬规则保留不渲染入口语义（此处不加）
 *  布局：工具栏一行(关键字+查询/添加/删除/保存) → 单表(Tyd1000 9可见 + 3 hide)，行内编辑 */
import { ref, shallowRef } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconDeviceFloppy, IconPlus, IconRefresh, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { TrackableList } from "@/api/common/trackableList";
import { crudAppService } from "@/api/common/crudAppService";
import { NextStrId } from "@/lib/yitIdHelper";
import { tyd1000Api, type Tyd1000 } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const colDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStoreCode", headerName: "库区号", width: 120, editable: true },
  { field: "cStoreDes", headerName: "库区描述", width: 180, editable: true },
  { field: "cStoreType", headerName: "库区种类", width: 120, editable: true },
  { field: "nType", headerName: "库区类型", width: 110, editable: true },
  { field: "cRemark", headerName: "备注", width: 200, editable: true, flex: 1 },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 160 },
  { field: "lastModifier", headerName: "最后修改人", width: 110 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 160 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "cValidFlag", headerName: "生效标记", hide: true },
]);

const keyword = ref("");
const trackList = shallowRef<TrackableList<Tyd1000>>(new TrackableList<Tyd1000>());
const querying = ref(false);
const api = ref<GridApi | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function refresh() {
  api.value?.refreshCells({ force: true });
}

/* btnQuery → QueryRoom(keyword) */
async function onQuery() {
  querying.value = true;
  try {
    const list = ((await tyd1000Api.queryRoom(keyword.value.trim() || undefined)) ?? []) as Tyd1000[];
    trackList.value = new TrackableList<Tyd1000>(list);
    api.value?.setGridOption("rowData", trackList.value);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* simpleButton2 添加 → AddNew + 生成 Id */
function onAdd() {
  trackList.value.push({ id: NextStrId(), selected: false } as Tyd1000);
  const stored = trackList.value[trackList.value.length - 1] as Tyd1000;
  api.value?.applyTransaction({ add: [stored] });
  refresh();
}

/* simpleButton4 删除 → 移除勾选行 */
function onDelete() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择要删除的库区", 2000, "warn");
    return;
  }
  trackList.value.remove((r) => selected.includes(r));
  api.value?.applyTransaction({ remove: selected });
}

function selectedRows(): Tyd1000[] {
  const byGrid = (api.value?.getSelectedRows() ?? []) as Tyd1000[];
  if (byGrid.length) return byGrid;
  return trackList.value.filter((x) => x.selected);
}

/* simpleButton5 保存 → bindingSource.SaveChanges<Tyd1000>()（通用跟踪通路） */
async function onSave() {
  if (!window.confirm("确定保存当前改动吗？")) return;
  querying.value = true;
  try {
    await crudAppService.SaveList(trackList.value, "Tyd1000");
    await onQuery();
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：关键字 + 查询/添加/删除/保存；「确认」原 Visible=false 不加） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">关键字</label>
      <InputText v-model="keyword" class="w-56 shrink-0" @keydown.enter="onQuery" />
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
      <span class="ml-auto text-xs text-muted-foreground">库区（{{ trackList.length }}）</span>
      <Button variant="outlined" class="ml-2 shrink-0 whitespace-nowrap" aria-label="刷新" @click="onQuery">
        <IconRefresh class="h-3 w-3" />
      </Button>
    </div>

    <!-- 单表（原 cusGridConrol1 Dock.Fill） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :default-col-def="hmxDefaultColDef"
        :row-data="trackList"
        :locale-text="AG_GRID_LOCALE_CN"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
        @cell-value-changed="refresh"
      />
    </div>
  </div>
</template>
