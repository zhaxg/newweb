<script setup lang="ts">
/** 对应 FrmDM1050（停机维护）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1050
 *  已接入：dM1050Api.getTdm1050s（DataBind，入参 DtoQueryTdm1050{timeRange,typeEnum}）
 *    / dM1050Api.getTdm1050Dtos（HzDataBind，入参 DtoQueryTdm1050{timeRange}）
 *    / dM1050Api.addTdm1050（btnAdd，入参 DtoQueryTdm1050{typeEnum,stopTime}）
 *    / dM1050Api.saveTdm1050(trackList.SaveChangesData)（原 GetTrackingList + ToSaveChangesData）
 *  待接入：无
 *  偏差：Designer 中 textEdit1 未加入任何容器（不可见），故不迁移；
 *    停机类型下拉候选按 C# AddEnum(Tdm1050TypeEnum) 的 LDisplay 常量在页面内声明；
 *    删除取点击行（原 bscTdm1050.RemoveCurrent()，无确认提示），仅从跟踪列表移除，须再点「保存」落库 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowClickedEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { TrackableList } from "@/api/common/trackableList";
import { dM1050Api, Tdm1050TypeEnum, type Tdm1050, type Tdm1050Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 停机类型（原 comStopType / comStopTypeQuery 的 AddEnum(Tdm1050TypeEnum)） ---------- */
const stopTypeOptions = [
  { label: "检修", value: Tdm1050TypeEnum.Repair },
  { label: "1#剪切线换剪刃", value: Tdm1050TypeEnum.ChangeSl1 },
  { label: "2#剪切线换剪刃", value: Tdm1050TypeEnum.ChangeSl2 },
  { label: "工艺停机", value: Tdm1050TypeEnum.CraftStop },
  { label: "故障", value: Tdm1050TypeEnum.Gz },
  { label: "外部停机", value: Tdm1050TypeEnum.OutStop },
];
const stopTypeMap = new Map(stopTypeOptions.map((o) => [String(o.value), o.label]));
const stopTypeFmt = (p: ValueFormatterParams) => stopTypeMap.get(String(p.value ?? "")) ?? String(p.value ?? "");

/* ---------- 时间 ---------- */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}
/** 原 dto.TimeRange = [今天-7天, 今天+1天] */
function recordRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}
/** 原 ucTimeRange2.Value = [本月1日, 今天+1天] */
function hzRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}

/* ---------- 查询条件（原 bscQueryDto + ucTimeRange1 / comStopTypeQuery） ---------- */
const input = reactive({
  dates: recordRange() as Date[] | null,
  typeEnum: Tdm1050TypeEnum.Repair as Tdm1050TypeEnum | null,
});
/** 原 ucTimeRange2（汇总区独立时间） */
const hzDates = ref<Date[] | null>(hzRange());
/** 原 txtStopTime（默认 0） */
const addStopTime = ref<number | null>(0);
/** 原 comStopType（默认 index 0 = 检修） */
const addType = ref<Tdm1050TypeEnum>(Tdm1050TypeEnum.Repair);

/* ---------- 明细表（gridView1 / Tdm1050，TrackableList 行内编辑） ---------- */
const trackList = shallowRef<TrackableList<Tdm1050>>(new TrackableList<Tdm1050>());
const loading = ref(false);
const api = ref<GridApi | null>(null);
const current = ref<Tdm1050 | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onRowClicked(e: RowClickedEvent) {
  current.value = (e.data as Tdm1050 | undefined) ?? null;
}
function getRowId(p: GetRowIdParams) {
  return String((p.data as Tdm1050).id ?? "");
}
function onCellValueChanged(e: CellValueChangedEvent) {
  api.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}

const detailColDefs: ColDef[] = [
  { colId: "creator", field: "creator", headerName: "创建人", width: 100 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  {
    colId: "nStopTime",
    field: "nStopTime",
    headerName: "停机时间",
    width: 112,
    minWidth: 88,
    editable: true,
    cellEditor: "agNumberCellEditor",
  },
  {
    colId: "nStopType",
    field: "nStopType",
    headerName: "停机类型",
    width: 130,
    editable: true,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: stopTypeOptions.map((o) => String(o.value)) },
    valueParser: (p) => (p.newValue == null || p.newValue === "" ? null : Number(p.newValue)),
    valueFormatter: stopTypeFmt,
  },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 110 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 60, hide: true },
];

/* ---------- 汇总表（gridView2 / Tdm1050Dto，只读） ---------- */
const hzRows = ref<Tdm1050Dto[]>([]);
const hzLoading = ref(false);
const hzApi = ref<GridApi | null>(null);
function onHzReady(e: GridReadyEvent) {
  hzApi.value = e.api;
}
const rateFmt = (p: ValueFormatterParams) => (p.value == null || p.value === "" ? "" : `${p.value}%`);
const hzColDefs: ColDef[] = [
  { colId: "cDateTime", field: "cDateTime", headerName: "日期", width: 110 },
  { colId: "nAllTime", field: "nAllTime", headerName: "总时间", width: 96, minWidth: 72 },
  { colId: "nChangeSlTime1", field: "nChangeSlTime1", headerName: "1#剪切线换剪刃时间", width: 112, minWidth: 60 },
  { colId: "nChangeSlTime2", field: "nChangeSlTime2", headerName: "2#剪切线换剪刃时间", width: 112, minWidth: 60 },
  { colId: "nRepairTime", field: "nRepairTime", headerName: "检修时间", width: 112, minWidth: 60 },
  { colId: "nCraftStopTime", field: "nCraftStopTime", headerName: "工艺停机时间", width: 112, minWidth: 72 },
  { colId: "nGzTime", field: "nGzTime", headerName: "故障时间", width: 96, minWidth: 60 },
  { colId: "nOutStopTime", field: "nOutStopTime", headerName: "外部停机时间", width: 112, minWidth: 72 },
  { colId: "nAllStopTime", field: "nAllStopTime", headerName: "总停机时间", width: 112, minWidth: 60 },
  { colId: "nWorkTime", field: "nWorkTime", headerName: "作业时间", width: 96, minWidth: 60 },
  {
    colId: "nStartWorkRate",
    field: "nStartWorkRate",
    headerName: "设备可开工率",
    width: 112,
    minWidth: 72,
    valueFormatter: rateFmt,
  },
  {
    colId: "nWorkRate",
    field: "nWorkRate",
    headerName: "设备作业率",
    width: 112,
    minWidth: 60,
    valueFormatter: rateFmt,
  },
];

/* ---------- 数据绑定（原 DataBind / HzDataBind） ---------- */
async function onBind() {
  loading.value = true;
  try {
    const list = await dM1050Api.getTdm1050s({
      timeRange: toTimeRange(input.dates) ?? null,
      typeEnum: input.typeEnum,
    });
    trackList.value = new TrackableList<Tdm1050>(list ?? []);
    current.value = null;
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
async function onHzBind() {
  hzLoading.value = true;
  try {
    const list = await dM1050Api.getTdm1050Dtos({ timeRange: toTimeRange(hzDates.value) ?? null });
    hzRows.value = list ?? [];
    requestAnimationFrame(() => hzApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    hzLoading.value = false;
  }
}

/* ---------- ShowYesNo 受控确认 ---------- */
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

/* ---------- 按钮（原 stackPanel1/stackPanel3/stackPanel2 顺序：查询 | 添加停机信息 删除 保存 | 查询） ---------- */
function onQuery() {
  onBind();
}
function onHzQuery() {
  onHzBind();
}
async function onAdd() {
  if (!addStopTime.value || addStopTime.value <= 0) {
    toast("请填写正确的停机时间！", 2000, "warn");
    return;
  }
  loading.value = true;
  try {
    await dM1050Api.addTdm1050({ typeEnum: addType.value, stopTime: addStopTime.value });
    addStopTime.value = 0;
    toast("停机信息录入成功！", 2000, "success");
    await onBind();
    await onHzBind();
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
function onDel() {
  const row = current.value;
  if (!row) return;
  trackList.value.remove((x) => x.id === row.id);
  current.value = null;
}
function onSave() {
  const diff = trackList.value.SaveChangesData;
  const changed = diff.changedItems?.length ?? 0;
  const deleted = diff.deletedItems?.length ?? 0;
  if (changed === 0 && deleted === 0) return;
  askConfirm("是否确认保存当前修改！", async () => {
    loading.value = true;
    try {
      await dM1050Api.saveTdm1050(diff);
      await onBind();
      await onHzBind();
      toast("数据保存成功！", 2000, "success");
    } catch {
      /* 拦截层已 toast */
    } finally {
      loading.value = false;
    }
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 原 splitContainerControl1（Horizontal=false，538/1030≈52%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="52" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">停机维护记录</span>
        </div>
        <!-- stackPanel1：时间范围 + 停机类型 + 查询 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <DatePicker
            v-model="input.dates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="时间范围"
            class="w-72 shrink-0"
          />
          <Select
            v-model="input.typeEnum"
            :options="stopTypeOptions"
            option-label="label"
            option-value="value"
            placeholder="停机类型"
            class="w-40 shrink-0"
          />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
            <IconSearch class="h-3 w-3" />查询
          </Button>
        </div>
        <!-- stackPanel3：停机类型 + 停机时间 + 添加停机信息 + 删除 + 保存 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Select
            v-model="addType"
            :options="stopTypeOptions"
            option-label="label"
            option-value="value"
            placeholder="停机类型"
            class="w-40 shrink-0"
          />
          <div class="w-28 shrink-0">
            <InputNumber v-model="addStopTime" :min="0" :show-buttons="false" fluid placeholder="停机时间" />
          </div>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onAdd">
            <IconPlus class="h-3 w-3" />添加停机信息
          </Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
            <IconTrash class="h-3 w-3" />删除
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
            <IconDeviceFloppy class="h-3 w-3" />保存
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">停机维护明细（{{ trackList.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="detailColDefs"
            :row-data="trackList"
            :get-row-id="getRowId"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onReady"
            @row-clicked="onRowClicked"
            @cell-value-changed="onCellValueChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="48" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">停机维护汇总信息</span>
        </div>
        <!-- stackPanel2：时间范围 + 查询 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <DatePicker
            v-model="hzDates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="时间范围"
            class="w-72 shrink-0"
          />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="hzLoading" @click="onHzQuery">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">停机维护汇总（{{ hzRows.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="hzColDefs"
            :row-data="hzRows"
            :pagination="false"
            :animate-rows="false"
            :loading="hzLoading"
            @grid-ready="onHzReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

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
        <Button label="确定" variant="outlined" autofocus @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
