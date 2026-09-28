<script setup lang="ts">
/** 对应 FrmTmp1220（板头板边）：DDH.Winforms.SMP.Forms.FrmTmp1220
 *  已接入：tmp1220Api.queryTmp1220 / changeTmp1220（原 GetTrackingList<Tmp1220>().ToSaveChangesData() 通路）
 *  变更跟踪：TrackableList<Tmp1220> —— 添加 push(Id=NextStrId, NStatus=1)、删除 remove、保存走 changeTmp1220
 *  查询条件：原 stackPanel1 内 关键字 textEdit1（1 条件与按钮同行；原 btnQuery_Click 未使用该输入，QueryTmp1220 无参） */

import { onMounted, ref, shallowRef } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type {
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tmp1220Api, type Tmp1220 } from "@/api/mes4ddh/smp.swagger";
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";

const { toast } = useToast();
const theme = makeHmxGridTheme();

// 查询条件（原 textEdit1「关键字」；原窗体查询未消费该值，控件保留）
const keyword = ref("");
// 行内编辑数据源：TrackableList 记录快照，changeTmp1220 据此算出增/改/删
const trackList = shallowRef<TrackableList<Tmp1220>>(new TrackableList<Tmp1220>());
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const selectedRow = ref<Tmp1220 | null>(null);

/* 列按 Designer VisibleIndex（含 NStatus 可用状态）；Id/Selected 以 hide: true 迁入 */
const rawCols: ColDef[] = [
  { field: "creator", headerName: "创建人", width: 112 },
  { field: "createTime", headerName: "创建时间", width: 112 },
  { field: "cRollTypeOne", headerName: "轧制方式", width: 112 },
  { field: "nSlabThickMin", headerName: "板厚最小值", width: 112 },
  { field: "nSlabThickSwitch", headerName: "板厚区间", width: 112 },
  { field: "nSlabThickMax", headerName: "板厚最大值", width: 112 },
  { field: "nWidthSwitchMin", headerName: "宽度最小值", width: 112 },
  { field: "nWidthSwitch", headerName: "宽度区间", width: 112 },
  { field: "nWidthSwitchMax", headerName: "宽度最大值", width: 112 },
  { field: "nLenSwitchMin", headerName: "长度最小值", width: 112 },
  { field: "nLenSwitch", headerName: "长度区间", width: 112 },
  { field: "nLenSwitchMax", headerName: "长度最大值", width: 112 },
  { field: "nSlabEdgeMin", headerName: "板边(MIN)", width: 112 },
  { field: "nSlabEdgeMax", headerName: "板边(MAX)", width: 112 },
  { field: "nSlabHeadMin", headerName: "板头(MIN)", width: 112 },
  { field: "nSlabHeadMax", headerName: "板头(MAX)", width: 112 },
  { field: "nThickSwitchMin", headerName: "厚度区间最小值", width: 112 },
  { field: "nThickSwitchMax", headerName: "厚度区间最大值", width: 112 },
  { field: "cRollTypeTwo", headerName: "轧制方式2", width: 112 },
  { field: "cTrimFlag", headerName: "切边方式", width: 112 },
  { field: "cCcl", headerName: "成材率", width: 112 },
  { field: "nThickMin", headerName: "厚度下限", width: 112 },
  { field: "nThickMax", headerName: "厚度上限", width: 112 },
  { field: "nWidthMin", headerName: "宽度下限", width: 112 },
  { field: "nWidthMax", headerName: "宽度上限", width: 112 },
  { field: "nLenMin", headerName: "长度下限", width: 112 },
  { field: "nLenMax", headerName: "长度上限", width: 112 },
  { field: "nSlabEdge", headerName: "板边取值", width: 112 },
  { field: "nSlabHead", headerName: "板头取值", width: 112 },
  { field: "nStatus", headerName: "可用状态", width: 112 },
  { field: "lastModifier", headerName: "最后修改人", width: 112 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 112 },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "selected", headerName: "选择", width: 112, hide: true },
];
/** 原 GridView 单元格可编辑（id/审计列只读），保存时由 TrackableList diff 出 changedItems */
const readOnlyFields = new Set(["id", "selected", "creator", "createTime", "lastModifier", "lastModifyTime"]);
const colDefs = ref<ColDef[]>(
  rawCols.map((c) => ({ editable: c.field != null && !readOnlyFields.has(c.field), ...c })),
);

function getRowId(p: GetRowIdParams) {
  return String((p.data as Tmp1220).id ?? "");
}
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onSelectionChanged(e: SelectionChangedEvent) {
  selectedRow.value = (e.api.getSelectedRows()[0] as Tmp1220 | undefined) ?? null;
}
function onCellValueChanged(_e: CellValueChangedEvent) {
  gridApi.value?.refreshCells({ force: true });
}

async function onQuery() {
  querying.value = true;
  try {
    const list = (await tmp1220Api.queryTmp1220()) ?? [];
    trackList.value = new TrackableList<Tmp1220>(list);
    selectedRow.value = null;
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* ---------- 主表按钮（原 stackPanel1：查询/添加/删除/保存） ---------- */
function onAdd() {
  // 原 bscTmp1220.Add(new Tmp1220 { Id = NextStrId(), NStatus = 1 })
  trackList.value.push({ id: NextStrId(), nStatus: 1 } as Tmp1220);
  const stored = trackList.value[trackList.value.length - 1] as Tmp1220;
  gridApi.value?.applyTransaction({ add: [stored] });
}
function onDelete() {
  const row = selectedRow.value;
  if (!row) return; // 原 FocusedRowObject == null 直接 return
  trackList.value.remove((r) => r.id === row.id);
  gridApi.value?.applyTransaction({ remove: [row] });
  selectedRow.value = null;
}

/* ---------- ShowYesNo 受控确认（原 MsgBox.ShowYesNo） ---------- */
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

function onSave() {
  const data = trackList.value.SaveChangesData;
  if (!data.addedItems.length && !data.changedItems.length && !data.deletedItems.length) return;
  askConfirm("确定要保存修改吗？", async () => {
    try {
      await tmp1220Api.changeTmp1220(data);
      toast("数据提交成功！", 2000, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：关键字 1 条件 + 查询/添加/删除/保存 同行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" placeholder="关键字" class="w-56 shrink-0" @keydown.enter="onQuery" />
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

    <!-- 主表（gridControl1 / gridView1，绑定实体 Tmp1220） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :pagination="false"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="trackList"
        :get-row-id="getRowId"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :loading="querying"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-value-changed="onCellValueChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
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
