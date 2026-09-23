<script setup lang="ts">
/** 对应 FrmQL2000（炉次成分录入 / 窗体标题「炼钢成分录入」）：DDH.Winforms.LIMS.Forms.FrmQL2000
 *  布局：查询区（9 项 + 生产时间 PrdTime + 送检时间 CreateTime，默认未确认/近7天送检）
 *       + stackPanel1 h-9（查询/炉次成分确认/新增炉次成分检验委托/指定最终样/新增试样/显示隐藏二维码）
 *         右=ViewCaption「炉次信息」
 *       → 上下 64%（炉次信息 | 下栏）
 *       → 下栏左右 20%（二维码条 | UCCfResult）
 *       → UCCfResult 左右 51%（炉次成分试样 | 炉次成分信息+保存结果）
 *  已接入：stoveChemicalCompositionTestApi.queryStoveSamples、getSamplesItems、
 *         saveItemResult、stoveConfirm、setFinalSample、addSample / tPa1000Api.queryLines
 *  待接入：FrmQL2002 新增炉次成分检验委托；FrmQL2001 新增成分试样（对话框）
 *  已知偏差：保存前 C# Formula.Evaluate 求值未迁（直接提交已录 nValue）；二维码以试样号文本代替条码图形；
 *         菜单 cQueryString=LG01,LG02 未经路由下发，产线下拉加载全量 */
import { nextTick, onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import {
  IconCheck,
  IconDeviceFloppy,
  IconLock,
  IconPlus,
  IconQrcode,
  IconSearch,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import {
  stoveChemicalCompositionTestApi,
  SampleJudgeResult,
  StoveChemResult,
  YesNo,
  type QueryStoveChemicalCompositionInput,
  type StoveInfo,
  type StoveSampleTestItem,
  type StoveTestSample,
  type TimeRange,
} from "@/api/mes4ddh/lims.swagger";
import { tPa1000Api, type Tpa1000 as LineRow } from "@/api/mes4ddh/shr.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : Number(p.value) === 1 ? "是" : "否");
const stoveChemFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 2: "合格", 3: "不合格", 4: "放行", 5: "判废" }) as Record<string, string>)[String(p.value)] ?? "";
const sampleJudgeFmt = (p: ValueFormatterParams) =>
  (({ 0: "待判", 1: "不需判", 2: "合格", 3: "不合格" }) as Record<string, string>)[String(p.value)] ?? "";
const rangeFmt = (p: ValueFormatterParams) => {
  const r = p.value as { min?: number | null; max?: number | null } | null;
  if (!r || (r.min == null && r.max == null)) return "";
  return `${r.min ?? ""} ~ ${r.max ?? ""}`;
};

/* ---------- 查询（原构造：送检 CreateTime 近7天～明天、ConfirmFlag=否、PrdTime 空、判定结果空） ---------- */
function defaultSendDates(): Date[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 7);
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);
  return [start, end];
}

const input = reactive({
  lineCode: null as string | null,
  stove: "",
  poNo: "",
  planNo: "",
  sgSign: "",
  sgStd: "",
  stoveChemResult: null as StoveChemResult | null | "",
  recheckFlag: null as YesNo | null | "",
  confirmFlag: YesNo.N as YesNo | null | "",
  prdDate: null as Date[] | null,
  sendDate: defaultSendDates() as Date[] | null,
});

const stoveChemOptions = [
  { label: "待判", value: StoveChemResult.None },
  { label: "合格", value: StoveChemResult.Qualified },
  { label: "不合格", value: StoveChemResult.Unqualified },
  { label: "放行", value: StoveChemResult.ManualRelease },
  { label: "判废", value: StoveChemResult.Waste },
];
const yesNoOptions = [
  { label: "否", value: YesNo.N },
  { label: "是", value: YesNo.Y },
];
const confirmFlagOptions = [
  { label: "否", value: YesNo.N },
  { label: "是", value: YesNo.Y },
];

const lineOptions = ref<{ label: string; value: string }[]>([]);
async function loadLines() {
  try {
    const rows = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = (rows as LineRow[])
      .filter((r) => r.cCode != null)
      .map((r) => ({ label: r.cName ?? r.cCode ?? "", value: r.cCode! }));
    // 原 SelectedIndex = 0
    if (lineOptions.value.length && !input.lineCode) {
      input.lineCode = lineOptions.value[0].value;
    }
  } catch {
    /* 拦截层已 toast */
  }
}

function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates?.[0]) return undefined;
  return { min: isoLocal(dates[0]), max: dates[1] ? isoLocal(dates[1]) : undefined };
}
function buildQuery(): QueryStoveChemicalCompositionInput {
  return {
    lineCode: input.lineCode || undefined,
    stove: input.stove?.trim() || undefined,
    poNo: input.poNo?.trim() || undefined,
    planNo: input.planNo?.trim() || undefined,
    sgSign: input.sgSign?.trim() || undefined,
    sgStd: input.sgStd?.trim() || undefined,
    stoveChemResult:
      input.stoveChemResult === "" || input.stoveChemResult == null ? null : input.stoveChemResult,
    recheckFlag: input.recheckFlag === "" || input.recheckFlag == null ? null : input.recheckFlag,
    confirmFlag: input.confirmFlag === "" || input.confirmFlag == null ? null : input.confirmFlag,
    prdTime: toTimeRange(input.prdDate),
    createTime: toTimeRange(input.sendDate),
  };
}

/* ---------- 炉次信息（UCStoveInfo，25+1） ---------- */
const stoveRows = shallowRef<StoveInfo[]>([]);
const stoveGridApi = ref<GridApi | null>(null);
const focusStove = ref<StoveInfo | null>(null);
const querying = ref(false);

const stoveColDefs = ref<ColDef[]>([
  { field: "cPoNo", headerName: "制造命令号", width: 130 },
  { field: "cStove", headerName: "炉号", width: 90 },
  { field: "cpStove", headerName: "母炉号", width: 90 },
  { field: "cSgSign", headerName: "钢种", width: 90 },
  { field: "cSgStd", headerName: "执行标准", width: 120 },
  { field: "cStNo", headerName: "制造标准号", width: 110 },
  { field: "cOrderNo", headerName: "订单号", width: 120 },
  { field: "cOrderTsyq", headerName: "合同特殊要求", width: 140 },
  { field: "cLineCode", headerName: "产线代码", width: 95, valueFormatter: (p) => lineOptions.value.find((l) => l.value === p.value)?.label ?? (p.value ?? "") },
  { field: "cMachine", headerName: "炉台号", width: 90 },
  { field: "cRouteCode", headerName: "精炼路径", width: 100 },
  { field: "nThick", headerName: "厚度", width: 70 },
  { field: "nWth", headerName: "宽度", width: 70 },
  { field: "nLen", headerName: "长度", width: 70 },
  { field: "nPlanWgt", headerName: "计划出钢重量", width: 120 },
  { field: "cSpec", headerName: "规格", width: 100 },
  { field: "cIngotCode", headerName: "锭坯型", width: 90 },
  { field: "recheckFlag", headerName: "复验标记", width: 90, valueFormatter: yesNoFmt },
  { field: "cJudgeResult", headerName: "判定结果", width: 100, valueFormatter: stoveChemFmt },
  { field: "cJudgeRemark", headerName: "判定备注", width: 130 },
  { field: "cJudgeUser", headerName: "判定人", width: 90 },
  { field: "dJudgeTime", headerName: "判定时间", width: 140 },
  { field: "dProdTime", headerName: "生产时间", width: 140 },
  { field: "cConfirmUser", headerName: "成分确认人", width: 110 },
  { field: "dConfirmTime", headerName: "成分确认时间", width: 140 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cConfirmFlag", headerName: "确认标记", hide: true, valueFormatter: yesNoFmt },
]);

/* ---------- 试样（UCCfResult 样本表，11+1） ---------- */
const samples = shallowRef<StoveTestSample[]>([]);
const sampleGridApi = ref<GridApi | null>(null);
const currentSample = ref<StoveTestSample | null>(null);

const sampleColDefs = ref<ColDef[]>([
  { field: "cSampleNo", headerName: "试样号", width: 110 },
  { field: "cGw", headerName: "工位", width: 70 },
  { field: "cStove", headerName: "炉号", width: 90 },
  { field: "cSendUser", headerName: "发送人", width: 90 },
  { field: "dSendTime", headerName: "发送时间", width: 140 },
  { field: "cJudgeResult", headerName: "判定结果", width: 90, valueFormatter: sampleJudgeFmt, cellClass: (p) => judgeCell(p) },
  { field: "cJudgeRemark", headerName: "判定备注", width: 120 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 90, valueFormatter: yesNoFmt },
  { field: "cFinalFlag", headerName: "是否最终样", width: 100, valueFormatter: yesNoFmt },
  { field: "cTestUser", headerName: "结果录入人", width: 100 },
  { field: "dTestTime", headerName: "结果录入时间", width: 140 },
  { field: "dJudgeTime", headerName: "判定时间", hide: true },
  { field: "id", headerName: "主键", hide: true },
  { field: "cDisable", headerName: "作废", hide: true },
]);

function judgeCell(p: ValueFormatterParams) {
  const v = Number(p.value);
  if (v === 2) return "judge-ok";
  if (v === 3) return "judge-ng";
  return "";
}

/* ---------- 检验结果（UCCfResult 结果表，7+7；仅 nValue/valueDisplay 可编辑） ---------- */
const testItems = shallowRef<StoveSampleTestItem[]>([]);
const itemGridApi = ref<GridApi | null>(null);
/** 原 AllowEditResult = 炉次未确认；Load 时先 true，选中炉次后按 CConfirmFlag */
const allowEditResult = ref(true);
const showSave = ref(true);
const showBarcode = ref(false);

const itemColDefs = ref<ColDef[]>([
  { field: "cName", headerName: "元素名称", width: 110 },
  {
    field: "valueDisplay",
    headerName: "检验结果",
    width: 110,
    editable: true,
  },
  { field: "stdRange", headerName: "标准范围", width: 110, valueFormatter: rangeFmt },
  { field: "cFormula", headerName: "计算公式", width: 130 },
  { field: "stdAccuracy", headerName: "小数位数", width: 90 },
  { field: "nValue", headerName: "原始结果", width: 100, editable: true },
  { field: "isJudge", headerName: "是否判定", width: 90, valueFormatter: yesNoFmt },
  { field: "cCode", headerName: "元素代码", hide: true },
  { field: "cJudgeFlag", headerName: "判定标记", hide: true },
  { field: "mainRange", headerName: "工艺范围", hide: true, valueFormatter: rangeFmt },
  { field: "speRange", headerName: "放行范围", hide: true, valueFormatter: rangeFmt },
  { field: "cCtrlFlag", headerName: "判定标记", hide: true },
  { field: "isPrint", headerName: "是否打质保书", hide: true, valueFormatter: yesNoFmt },
  { field: "judgeResult", headerName: "判定", hide: true, valueFormatter: sampleJudgeFmt },
  { field: "cJudgeFormula", headerName: "判定公式", hide: true },
]);

async function waitForGridRows(api: GridApi | null, min = 1): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    await nextTick();
    if (api && api.getDisplayedRowCount() >= min) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return !!api && api.getDisplayedRowCount() >= min;
}

/* ---------- 查询（原 btnQuery_Click → queryStoveSamples） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    const rows = ((await stoveChemicalCompositionTestApi.queryStoveSamples(buildQuery())) ?? []) as StoveInfo[];
    stoveRows.value = rows;
    focusStove.value = null;
    samples.value = [];
    testItems.value = [];
    currentSample.value = null;
    stoveGridApi.value?.setGridOption("rowData", rows);
    if (rows.length) {
      await waitForGridRows(stoveGridApi.value);
      const api = stoveGridApi.value;
      if (api) {
        api.deselectAll();
        api.getDisplayedRowAtIndex(0)?.setSelected(true);
      }
    }
    requestAnimationFrame(() => stoveGridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* ---------- 炉次选中 → 绑试样 + 可编辑开关（原 UcStoveInfo1_FocusedRowObjectChanged） ---------- */
async function onStoveSelection(e: SelectionChangedEvent) {
  const row = (e.api.getSelectedNodes()[0]?.data as StoveInfo) ?? null;
  focusStove.value = row;
  // 原：BindData(CurrentRow?.Samples)；AllowEditResult = CConfirmFlag != Y
  samples.value = (row?.samples ?? []) as StoveTestSample[];
  testItems.value = [];
  currentSample.value = null;
  allowEditResult.value = row?.cConfirmFlag !== YesNo.Y;
  showSave.value = true; // Load 时 ShowSaveButton = true
  sampleGridApi.value?.setGridOption("rowData", samples.value);
  await waitForGridRows(sampleGridApi.value);
  if (samples.value.length && sampleGridApi.value) {
    sampleGridApi.value.deselectAll();
    sampleGridApi.value.getDisplayedRowAtIndex(0)?.setSelected(true);
  }
}

/* ---------- 试样选中 → getSamplesItems + 二维码（原 GridView2_FocusedRowObjectChanged） ---------- */
async function onSampleSelection(e: SelectionChangedEvent) {
  const row = (e.api.getSelectedNodes()[0]?.data as StoveTestSample) ?? null;
  currentSample.value = row;
  if (!row) {
    testItems.value = [];
    return;
  }
  try {
    let items = row.testItems;
    if (!items?.length) {
      items = ((await stoveChemicalCompositionTestApi.getSamplesItems(row.id ?? undefined)) ?? []) as StoveSampleTestItem[];
      row.testItems = items;
    }
    testItems.value = [...items];
    itemGridApi.value?.setGridOption("rowData", testItems.value);
    await waitForGridRows(itemGridApi.value);
    requestAnimationFrame(() => itemGridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
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

/* 原 UcCfResult1_BtnSaveClick：（公式求值未迁）→ saveItemResult → 「保存成功」→ 重查 */
async function onSaveItems() {
  const sample = currentSample.value;
  if (!sample) return;
  try {
    // 同步网格内编辑回 sample.testItems（AG Grid 默认改 data 引用）
    sample.testItems = testItems.value;
    await stoveChemicalCompositionTestApi.saveItemResult(sample);
    toast("保存成功", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

/* 原 btnConfirm_Click */
function onStoveConfirm() {
  const stove = focusStove.value;
  if (!stove) return;
  if (stove.cConfirmFlag === YesNo.Y) {
    toast("炉次已确认成分结果，不能重复操作", 2000, "warn");
    return;
  }
  const finalSample = (stove.samples ?? []).find((x) => x.cFinalFlag === YesNo.Y);
  if (!finalSample) {
    toast("炉次未指定最终样，不能成分确认", 2000, "warn");
    return;
  }
  askConfirm(`确认炉次${stove.cStove}成分已录入完成？`, async () => {
    try {
      await stoveChemicalCompositionTestApi.stoveConfirm(stove);
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 simpleButton1_Click → FrmQL2002（占位） */
function onAddCfDelegate() {
  toast("新增炉次成分检验委托：录入弹窗（FrmQL2002）待接入", 2000, "warn");
}

/* 原 simpleButton2_Click → setFinalSample */
function onSetFinalSample() {
  const sample = currentSample.value;
  if (!sample) return;
  askConfirm(`确定要指定${sample.cSampleNo}为最终样？`, async () => {
    try {
      await stoveChemicalCompositionTestApi.setFinalSample(sample.id ?? undefined);
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* 原 btnAddSample_Click → FrmQL2001（占位） */
function onAddSample() {
  if (!focusStove.value) return;
  toast("新增试样：录入弹窗（FrmQL2001）待接入", 2000, "warn");
}

/* 原 simpleButton3_Click：PanelVisibility Both ↔ Panel2 */
function onToggleQrcode() {
  showBarcode.value = !showBarcode.value;
}

function onStoveGridReady(e: GridReadyEvent) {
  stoveGridApi.value = e.api;
}
function onSampleGridReady(e: GridReadyEvent) {
  sampleGridApi.value = e.api;
}
function onItemGridReady(e: GridReadyEvent) {
  itemGridApi.value = e.api;
}

onMounted(() => {
  void loadLines();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl 11 项） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <Select v-model="input.lineCode" :options="lineOptions" option-label="label" option-value="value"
            show-clear filter placeholder="全部" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="input.stove" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">制造命令号</label>
          <InputText v-model="input.poNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">计划号</label>
          <InputText v-model="input.planNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.sgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="input.sgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">判定结果</label>
          <Select v-model="input.stoveChemResult" :options="stoveChemOptions" option-label="label" option-value="value"
            show-clear class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">复验标记</label>
          <Select v-model="input.recheckFlag" :options="yesNoOptions" option-label="label" option-value="value"
            show-clear class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">是否已确认</label>
          <Select v-model="input.confirmFlag" :options="confirmFlagOptions" option-label="label" option-value="value"
            show-clear class="min-w-0 flex-1" />
        </div>
        <div class="col-span-3 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">生产时间</label>
          <DatePicker v-model="input.prdDate" selectionMode="range" :manualInput="false" date-format="yy-mm-dd"
            show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-3 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">送检时间</label>
          <DatePicker v-model="input.sendDate" selectionMode="range" :manualInput="false" date-format="yy-mm-dd"
            show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- stackPanel1：6 按钮 h-9 + 右=炉次信息 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onStoveConfirm">
        <IconCheck class="h-3 w-3" />炉次成分确认
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddCfDelegate">
        <IconPlus class="h-3 w-3" />新增炉次成分检验委托
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSetFinalSample">
        <IconLock class="h-3 w-3" />指定最终样
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddSample">
        <IconPlus class="h-3 w-3" />新增试样
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onToggleQrcode">
        <IconQrcode class="h-3 w-3" />显示/隐藏二维码
      </Button>
      <span class="ml-auto text-xs font-medium text-muted-foreground">炉次信息</span>
    </div>

    <!-- 上下（原 SplitterPosition 286/444≈64%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="64" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="stoveColDefs" :row-data="stoveRows"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onStoveGridReady" @selection-changed="onStoveSelection"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 下栏左右（原 238/1172≈20%：二维码 | UCCfResult；二维码可隐藏） -->
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel v-if="showBarcode && currentSample?.cSampleNo" :size="20" :minSize="12"
            class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">二维码</span>
            </div>
            <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-3">
              <!-- 条码图形未迁：显示试样号文本占位 -->
              <div class="text-base font-bold tracking-widest">{{ currentSample.cSampleNo }}</div>
              <div class="break-all text-center text-xs text-muted-foreground">{{ currentSample.cSampleNo }}</div>
            </div>
          </SplitterPanel>

          <SplitterPanel :minSize="40" class="flex min-h-0 flex-col overflow-hidden">
            <!-- UCCfResult：左右 541/1064≈51% -->
            <Splitter class="min-h-0 flex-1">
              <SplitterPanel :size="51" :minSize="28" class="flex flex-col overflow-hidden">
                <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                  <span class="text-xs font-medium text-muted-foreground">炉次成分试样</span>
                </div>
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="sampleColDefs" :row-data="samples"
                    :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                    :pagination="false" :animate-rows="false"
                    @grid-ready="onSampleGridReady" @selection-changed="onSampleSelection"
                    @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>

              <SplitterPanel :minSize="28" class="flex flex-col overflow-hidden">
                <!-- 保存结果按钮条 h-9 + 右=炉次成分信息（有按钮共用行） -->
                <div v-if="showSave && allowEditResult"
                  class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                  <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSaveItems">
                    <IconDeviceFloppy class="h-3 w-3" />保存结果
                  </Button>
                  <span class="ml-auto text-xs font-medium text-muted-foreground">炉次成分信息</span>
                </div>
                <div v-else class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                  <span class="ml-auto text-xs font-medium text-muted-foreground">炉次成分信息</span>
                </div>
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="itemColDefs" :row-data="testItems"
                    :pagination="false" :animate-rows="false"
                    @grid-ready="onItemGridReady" @first-data-rendered="autoSizeOnFirstData" />
                </div>
              </SplitterPanel>
            </Splitter>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
    <Dialog :visible="confirmOpen" modal header="确认" :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs whitespace-pre-line">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
:deep(.judge-ok) {
  background-color: rgba(0, 255, 0, 0.247) !important;
}
:deep(.judge-ng) {
  background-color: rgba(255, 0, 0, 0.247) !important;
}
</style>
