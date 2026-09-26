<script setup lang="ts">
/** 对应 FrmDM1030（磨削实绩）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1030
 *  已接入：dM1030Api.queryTdm1030（查询/删除前置校验）
 *    / dM1030Api.saveTdm1030Changes(trackList.SaveChangesData)（原 GetTrackingList + ToSaveChangesData）
 *    / dM1030Api.againHandelTdm1030（重新处理，入参为勾选行 Id 列表）
 *    / systemKeyValueApi.getSysKvListByGroup("010100:ROLLTYPE")（原 colNRollerType.SetCodeFormatterAsync + 轧辊类型下拉）
 *  待接入：无
 *  偏差：Tdm1030StatusEnum（待处理/已处理/处理失败）未在 shr.swagger.ts 导出，页面内按 C# LDisplay 定义常量；
 *    生成类型 Tdm1030 缺 nHandleFlag/cRemark/cSyncFlag/dReadTime、入参类型缺 nHandelFlag，页面内做局部扩展类型；
 *    「选择」列与行内编辑并存，勾选改由 AG Grid 复选框呈现（列保留 hide:true）；
 *    删除取点击行（原 gridView1.FocusedRowObject），删除只从跟踪列表移除，须再点「保存」落库（与原行为一致） */

import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconRefresh, IconSearch, IconDeviceFloppy, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowClassParams,
  RowClickedEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { TrackableList } from "@/api/common/trackableList";
import { systemKeyValueApi } from "@/api/admin/request";
import { dM1030Api, type DtoQueryTdm1030, type Tdm1030, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 处理标识枚举（原 DDH.Service.SHR.Enums.Tdm1030StatusEnum，swagger 未导出） ---------- */
const HandleFlag = { Not: 0, Finish: 1, UnHandle: 2 } as const;
type HandleFlag = (typeof HandleFlag)[keyof typeof HandleFlag];
const handleFlagOptions = [
  { label: "待处理", value: HandleFlag.Not as HandleFlag },
  { label: "已处理", value: HandleFlag.Finish as HandleFlag },
  { label: "处理失败", value: HandleFlag.UnHandle as HandleFlag },
];
const handleFlagMap: Record<string, string> = { "0": "待处理", "1": "已处理", "2": "处理失败" };

/* ---------- 生成类型补齐（后端返回体含这些列，见「偏差」） ---------- */
type Tdm1030Row = Tdm1030 & {
  nHandleFlag?: HandleFlag | null;
  cRemark?: string | null;
  cSyncFlag?: string | null;
  dReadTime?: string | null;
};
type QueryTdm1030 = DtoQueryTdm1030 & { nHandelFlag?: HandleFlag | null };

/* ---------- 时间（原 ucTimeRange1，默认 [本月1日, 明天-1秒]） ---------- */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  end.setTime(end.getTime() - 1000);
  return [begin, end];
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

/* ---------- 查询条件（原 txtCRollerNo / ComNRollerType / ucTimeRange1 / comNHandelFlag） ---------- */
const input = reactive({
  cRollerNo: "",
  nRollerType: null as string | null,
  dates: defaultRange() as Date[] | null,
  nHandelFlag: HandleFlag.Finish as HandleFlag | null,
});

/* ---------- 轧辊类型（KV 010100:ROLLTYPE：下拉候选 + 单元格翻译） ---------- */
const rollTypeOptions = ref<{ label: string; value: string }[]>([]);
const kvRollType = new Map<string, string>();
const kvFmt = (m: Map<string, string>) => (p: ValueFormatterParams) =>
  m.get(String(p.value ?? "")) ?? String(p.value ?? "");
const enumFmt = (p: ValueFormatterParams) => handleFlagMap[String(p.value ?? "")] ?? String(p.value ?? "");

/* ---------- 表格（gridView1 / Tdm1030，TrackableList 行内编辑） ---------- */
const trackList = shallowRef<TrackableList<Tdm1030Row>>(new TrackableList<Tdm1030Row>());
const loading = ref(false);
const api = ref<GridApi | null>(null);
const current = ref<Tdm1030Row | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onRowClicked(e: RowClickedEvent) {
  current.value = (e.data as Tdm1030Row | undefined) ?? null;
}
function getRowId(p: GetRowIdParams) {
  return String((p.data as Tdm1030Row).id ?? "");
}
function onCellValueChanged(e: CellValueChangedEvent) {
  api.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}
function selectedRows(): Tdm1030Row[] {
  return (api.value?.getSelectedRows() as Tdm1030Row[] | undefined) ?? [];
}

const numEditable = { editable: true, cellEditor: "agNumberCellEditor" } as const;
const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 60, hide: true },
  { colId: "cRollerNo", field: "cRollerNo", headerName: "轧辊号", width: 130 },
  {
    colId: "nRollerType",
    field: "nRollerType",
    headerName: "轧辊类型",
    width: 100,
    editable: true,
    valueFormatter: kvFmt(kvRollType),
  },
  {
    colId: "nFrontHeadPath",
    field: "nFrontHeadPath",
    headerName: "磨前头部直径mm",
    width: 112,
    minWidth: 105,
    ...numEditable,
  },
  {
    colId: "nFrontCenterPath",
    field: "nFrontCenterPath",
    headerName: "磨前中部直径mm",
    width: 112,
    minWidth: 105,
    ...numEditable,
  },
  {
    colId: "nFrontTailPath",
    field: "nFrontTailPath",
    headerName: "磨前尾部直径mm",
    width: 112,
    minWidth: 105,
    ...numEditable,
  },
  {
    colId: "nLastHeadPath",
    field: "nLastHeadPath",
    headerName: "磨后头部直径mm",
    width: 112,
    minWidth: 105,
    ...numEditable,
  },
  {
    colId: "nLastCenterPath",
    field: "nLastCenterPath",
    headerName: "磨后中部直径mm",
    width: 112,
    minWidth: 105,
    ...numEditable,
  },
  {
    colId: "nLastTailPath",
    field: "nLastTailPath",
    headerName: "磨后尾部直径mm",
    width: 112,
    minWidth: 105,
    ...numEditable,
  },
  { colId: "nGrindNum", field: "nGrindNum", headerName: "磨削量0.01mm", width: 112, minWidth: 105, ...numEditable },
  { colId: "nHeadRoundness", field: "nHeadRoundness", headerName: "头圆度", width: 96, ...numEditable },
  { colId: "nCenterRoundness", field: "nCenterRoundness", headerName: "中圆度", width: 96, ...numEditable },
  { colId: "nTailRoundness", field: "nTailRoundness", headerName: "尾圆度", width: 96, ...numEditable },
  { colId: "nRollerTol", field: "nRollerTol", headerName: "辊型偏差", width: 96, ...numEditable },
  { colId: "nCenterHeight", field: "nCenterHeight", headerName: "中高", width: 88, ...numEditable },
  { colId: "dGrindStartTime", field: "dGrindStartTime", headerName: "磨削开始时间", width: 150, editable: true },
  { colId: "dGrindEndTime", field: "dGrindEndTime", headerName: "磨削结束时间", width: 150, editable: true },
  { colId: "nGrindNo", field: "nGrindNo", headerName: "磨削程序号", width: 100, editable: true },
  { colId: "cOperator", field: "cOperator", headerName: "操作人员", width: 100, editable: true },
  { colId: "nOrderNum", field: "nOrderNum", headerName: "磨削序号", width: 96 },
  { colId: "nHandleFlag", field: "nHandleFlag", headerName: "处理标识", width: 96, valueFormatter: enumFmt },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 140, editable: true },
  {
    colId: "cSyncFlag",
    field: "cSyncFlag",
    headerName: "是否同步轧辊数据",
    width: 112,
    minWidth: 105,
    editable: true,
  },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 100, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 110, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "dReadTime", field: "dReadTime", headerName: "同步时间", width: 150, hide: true },
];

/* 原 gridView1_RowCellStyle：磨后中部直径 > 磨前中部直径 → 红底 */
function getRowStyle(p: RowClassParams<Tdm1030Row>) {
  const r = p.data;
  if (!r) return undefined;
  return (r.nLastCenterPath ?? 0) > (r.nFrontCenterPath ?? 0)
    ? { backgroundColor: "#fee2e2", color: "#b91c1c" }
    : undefined;
}

/* ---------- 数据绑定（原 DataBind） ---------- */
async function onQuery() {
  loading.value = true;
  try {
    const list = await dM1030Api.queryTdm1030({
      cRollerNo: input.cRollerNo.trim() || null,
      nRollerType: input.nRollerType,
      timeRange: toTimeRange(input.dates),
      nHandelFlag: input.nHandelFlag,
    } as QueryTdm1030);
    trackList.value = new TrackableList<Tdm1030Row>((list as Tdm1030Row[] | undefined) ?? []);
    current.value = null;
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* 原 comNHandelFlag_SelectedIndexChanged：换状态即重查并切换「重新处理」按钮可见性 */
async function onFlagChange() {
  await onQuery();
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

/* ---------- 按钮（stackPanel1 原序：查询 删除 保存 重新处理） ---------- */

/* 原 btnDel_Click：焦点行删除；已处理且已同步的轧辊须是该轧辊最后一条同步数据 */
async function onDel() {
  if (trackList.value.length === 0) return;
  const row = current.value;
  if (!row) return;
  if (row.nHandleFlag === HandleFlag.Finish && row.cSyncFlag === "Y") {
    try {
      const all = await dM1030Api.queryTdm1030({
        cRollerNo: row.cRollerNo,
        timeRange: { min: null, max: null },
        nHandelFlag: row.nHandleFlag,
      } as QueryTdm1030);
      const later = ((all as Tdm1030Row[] | undefined) ?? []).filter(
        (x) =>
          x.cSyncFlag === "Y" && x.id !== row.id && String(x.dGrindEndTime ?? "") > String(row.dGrindEndTime ?? ""),
      );
      if (later.length > 0) {
        toast("请删除该轧辊最后一条磨削数据！", 2000, "warn");
        return;
      }
    } catch {
      /* 拦截层已 toast */
      return;
    }
  }
  trackList.value.remove((x) => x.id === row.id);
  current.value = null;
}

/* 原 btnSave_Click：仅 changed/deleted 有内容才提交 */
function onSave() {
  const diff = trackList.value.SaveChangesData;
  if (diff.changedItems.length === 0 && diff.deletedItems.length === 0) return;
  askConfirm("是否保存当前修改数据！", async () => {
    loading.value = true;
    try {
      await dM1030Api.saveTdm1030Changes(diff);
      toast("数据保存成功！", 2000, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    } finally {
      loading.value = false;
    }
  });
}

/* 原 btnHandle_Click：勾选行必须覆盖同轧辊号的全部数据 */
function onHandle() {
  if (trackList.value.length === 0) return;
  const sel = selectedRows();
  const selIds = new Set(sel.map((x) => x.id));
  const rollNos = [...new Set(sel.map((x) => x.cRollerNo ?? ""))];
  const untouched = trackList.value.filter((x) => rollNos.includes(x.cRollerNo ?? "") && !selIds.has(x.id));
  if (untouched.length > 0) {
    toast("请选择相同轧辊号的所有轧辊！", 2000, "warn");
    return;
  }
  askConfirm("是否确认重新处理选择的磨削数据！", async () => {
    loading.value = true;
    try {
      await dM1030Api.againHandelTdm1030(sel.map((x) => x.id ?? "").filter(Boolean));
      toast("数据提交成功！", 2000, "success");
    } catch {
      /* 拦截层已 toast */
    } finally {
      loading.value = false;
    }
  });
}

onMounted(async () => {
  try {
    const list = (await systemKeyValueApi.getSysKvListByGroup("010100:ROLLTYPE")) ?? [];
    rollTypeOptions.value = [...list]
      .sort((a, b) => String(a.cOrder ?? "").localeCompare(String(b.cOrder ?? "")))
      .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    for (const o of rollTypeOptions.value) kvRollType.set(o.value, o.label);
    api.value?.refreshCells({ force: true });
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 LabelControl + txtCRollerNo / ComNRollerType / ucTimeRange1 / comNHandelFlag） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">轧辊号</label>
        <InputText v-model="input.cRollerNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">轧辊类型</label>
        <Select
          v-model="input.nRollerType"
          :options="rollTypeOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">状态</label>
        <Select
          v-model="input.nHandelFlag"
          :options="handleFlagOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
          @change="onFlagChange"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">磨削开始时间</label>
        <DatePicker
          v-model="input.dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          placeholder="开始 至 结束"
          class="min-w-0 flex-1"
        />
      </div>
    </div>

    <!-- 工具栏（stackPanel1 原序：查询 删除 保存 重新处理；重新处理仅「处理失败」状态可见） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <Button
        v-if="input.nHandelFlag === HandleFlag.UnHandle"
        variant="outlined"
        class="shrink-0 whitespace-nowrap"
        @click="onHandle"
      >
        <IconRefresh class="h-3 w-3" />重新处理
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">磨削实绩（{{ trackList.length }}）</span>
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
          enableClickSelection: false,
          enableSelectionWithoutKeys: true,
        }"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        :get-row-style="getRowStyle"
        @grid-ready="onReady"
        @row-clicked="onRowClicked"
        @cell-value-changed="onCellValueChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

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
