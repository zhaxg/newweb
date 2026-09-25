<script setup lang="ts">
/** 对应 FrmSS1000（带钢工艺维护）：DDH.Winforms.SHR.Forms.Strip.FrmSS1000
 *  已接入：e1000Api.queryList / crudAppService.SaveList("TiE1000")（原 GetTrackingList + SaveChange）
 *  待接入：无
 *  偏差：原 Designer 声明的 bt / simpleButton4 从未实例化，未迁；
 *        添加默认值沿用原 EqualsFlag.RightOpen（厚度/宽度区间） */

import { ref, shallowRef } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { crudAppService } from "@/api/common/crudAppService";
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";
import { useToast } from "@/composables/useToast";
import { EqualsFlag, e1000Api, type TiE1000 } from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* 关键字（原 textEdit1，仅关键字一个查询条件） */
const keyword = ref("");

/* 行内编辑 + 增删改走 TrackableList（原 tiE1000BindingSource.GetTrackingList） */
const trackList = shallowRef<TrackableList<TiE1000>>(new TrackableList<TiE1000>());
const selectedId = ref<string | null>(null);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/* 列集/顺序按 Designer VisibleIndex，可见列可编辑（原 grid 未设 ReadOnly） */
const colDefs: ColDef[] = [
  { field: "cSgCode", headerName: "钢种", width: 150, editable: true },
  { field: "nThickMin", headerName: "厚度下限", width: 150, editable: true },
  { field: "nThickSwitch", headerName: "厚度区间", width: 150, editable: true },
  { field: "nThickMax", headerName: "厚度上限", width: 150, editable: true },
  { field: "nWidthMin", headerName: "宽度下限", width: 150, editable: true },
  { field: "nWidthSwitch", headerName: "宽度区间", width: 150, editable: true },
  { field: "nWidthMax", headerName: "宽度上限", width: 150, editable: true },
  { field: "exttempAim", headerName: "板坯出炉目标温度", width: 150, editable: true },
  { field: "crownAim", headerName: "成品凸度", width: 150, editable: true },
  { field: "rmthkAim", headerName: "粗轧目标厚度", width: 150, editable: true },
  { field: "rmwidAimDev", headerName: "粗轧目标宽度与成品宽度偏差", width: 150, editable: true },
  { field: "passno", headerName: "设定策略", width: 150, editable: true },
  { field: "rdtAim", headerName: "粗轧出口目标温度", width: 150, editable: true },
  { field: "fdtAim", headerName: "精轧目标温度", width: 150, editable: true },
  { field: "fetAim", headerName: "精轧入口目标温度", width: 150, editable: true },
  { field: "fmthkalt", headerName: "精轧厚度紧急变更值", width: 150, editable: true },
  { field: "fmtmpalt", headerName: "粗轧温度紧急变更值", width: 150, editable: true },
  { field: "crnalt", headerName: "凸度紧急变更值", width: 150, editable: true },
  { field: "cutMode", headerName: "剪切方式", width: 150, editable: true },
  { field: "ctAim", headerName: "卷取目标温度", width: 150, editable: true },
  { field: "ctcctmode", headerName: "CTC控制方式", width: 150, editable: true },
  { field: "heathdtail", headerName: "热头热尾标志", width: 150, editable: true },
  { field: "hotheadlng", headerName: "热头长度", width: 150, editable: true },
  { field: "hottaillng", headerName: "热尾长度", width: 150, editable: true },
  { field: "hotheadtmp", headerName: "头部温升温度", width: 150, editable: true },
  { field: "hottailtmp", headerName: "尾部温升温度", width: 150, editable: true },
  { field: "fmdsccode", headerName: "精轧除鳞是否投入", width: 150, editable: true },
  { field: "crownTolup", headerName: "凸度上公差", width: 150, editable: true },
  { field: "crownTollow", headerName: "凸度下公差", width: 150, editable: true },
  { field: "opengrp", headerName: "阀开启位置：大于1小于13的整数", width: 150, editable: true },
  { field: "flatAim", headerName: "平直度目标值", width: 150, editable: true },
  { field: "itaim", headerName: "CTC中间温度目标值", width: 150, editable: true },
  { field: "itaimpostol", headerName: "CTC中间温度上公差", width: 150, editable: true },
  { field: "itaimnegtol", headerName: "CTC中间温度下公差", width: 150, editable: true },
  { field: "fnfcoolrateaim", headerName: "前段冷却速率", width: 150, editable: true },
  { field: "fndcoolrateaim", headerName: "后段冷却速率", width: 150, editable: true },
  { field: "coilboxflag", headerName: "使用热卷箱", width: 150, editable: true },
  { field: "dryheadlng", headerName: "干头长度", width: 150, editable: true },
  { field: "drytaillng", headerName: "干尾长度", width: 150, editable: true },
  { field: "coolrattgt", headerName: "上下喷水阀比例(上/(上+下))", width: 150, editable: true },
  { field: "hwheight", headerName: "花纹板高度[%]", width: 150, editable: true },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
  { field: "cSteelType", headerName: "钢种大类", width: 112, hide: true },
  { field: "selected", headerName: "选择", width: 112, hide: true },
];

function getRowId(p: GetRowIdParams) {
  return String((p.data as TiE1000).id);
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onSelectionChanged(_e: SelectionChangedEvent) {
  const row = gridApi.value?.getSelectedRows()[0] as TiE1000 | undefined;
  selectedId.value = row?.id ?? null;
}

function currentRow(): TiE1000 | null {
  return trackList.value.find((r) => r.id === selectedId.value) ?? null;
}

/* 原 btnQuery_Click：QueryList(textEdit1.Text) → AsTrackable */
async function onQuery() {
  querying.value = true;
  try {
    const list = (await e1000Api.queryList(keyword.value)) ?? [];
    trackList.value = new TrackableList<TiE1000>(list);
    selectedId.value = null;
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 btnAdd_Click：Id=GenerateID + 厚度/宽度区间 RightOpen，追加到末行 */
function onAdd() {
  const draft: TiE1000 = {
    id: NextStrId(),
    nThickSwitch: EqualsFlag.RightOpen,
    nWidthSwitch: EqualsFlag.RightOpen,
  };
  trackList.value.push(draft);
  const stored = trackList.value[trackList.value.length - 1] as TiE1000;
  gridApi.value?.applyTransaction({ add: [stored] });
  selectedId.value = stored.id ?? null;
  const node = gridApi.value?.getRowNode(String(stored.id));
  if (node) gridApi.value?.ensureNodeVisible(node);
}

/* 原 btnDelete_Click：RemoveCurrent（当前行），无确认 */
function onDelete() {
  const row = currentRow();
  if (!row) return;
  trackList.value.remove((r) => r.id === row.id);
  gridApi.value?.applyTransaction({ remove: [row] });
  if (selectedId.value === row.id) selectedId.value = null;
}

/* ShowYesNo 受控确认 */
const confirmOpen = ref(false);
const confirmMsg = ref("");
let confirmAction: (() => Promise<void>) | null = null;
function askConfirm(msg: string, action: () => Promise<void>) {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmOpen.value = true;
}
async function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  if (act) await act();
}

/* 原 btnSave_Click：GetTrackingList → 确认「是否确认保存修改？」→ SaveChange → 重查 → 「保存成功！」 */
function onSave() {
  askConfirm("是否确认保存修改？", async () => {
    try {
      await crudAppService.SaveList(trackList.value, "TiE1000");
      await onQuery();
      toast("保存成功！", 2000, "success");
    } catch {
      /* 拦截层已 toast */
    }
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 按钮行（原 stackPanel1：关键字 textEdit1 + 查询/添加/删除/保存）；ui-rules §6 单条件与按钮同行、用 placeholder -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" placeholder="关键字" class="w-40" @keydown.enter="onQuery" />
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
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 确认（对应原 MsgBox.ShowYesNo("是否确认保存修改？")） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
