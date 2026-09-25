<script setup lang="ts">
/** 对应 FrmHR3100（加热炉作业）：DDH.Winforms.SHR.Forms.FrmHR3100
 *  已接入：hR3010Api.queryNotInSlabs / querySlabs / cancelEnter / cancelExit / exitFur / elimFur
 *  待接入：入炉弹窗 FrmHR3120（btnEnter 待入炉聚焦行 / btnExit1 1#出炉聚焦行，OK 后回刷）；
 *          生产顺序导入 btnImport（原 DevExpress Excel 导入 ImportHROrder → importOrder，web 暂无 xlsx 解析设施）；
 *          改规格 btnChange1/2 原 Designer Visible=false（画面不显示），未迁 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { hR3010Api, Thr3010FurStatusEnum, type DtoThr3010, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();
const cLineCode = menuQs[0] ?? "ZG01";

/* ---------- 入炉时间（原 ucTimeRange1，默认 昨天 0 点 ~ 7 天后当前时刻） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 1);
  const b = new Date();
  b.setDate(b.getDate() + 7);
  return [a, b];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（DtoQueryThr3000） ---------- */
const input = reactive({
  cOrderNo: "",
  cBatchNo: "",
  cStove: "",
  cSgCode: "",
  cSgStd: "",
  cSpec: "",
  slabNo: "",
  dates: defaultRange() as Date[] | null,
});
const reason = ref("");
const reason1 = ref("");
const reason2 = ref("");

/* ---------- 表格数据 ---------- */
const notInRows = ref<DtoThr3010[]>([]);
const fur1In = ref<DtoThr3010[]>([]);
const fur1Out = ref<DtoThr3010[]>([]);
const fur2In = ref<DtoThr3010[]>([]);
const fur2Out = ref<DtoThr3010[]>([]);
const loading = ref(false);
const activeTab1 = ref("in");
const activeTab2 = ref("in");

/* 各炉页签统计（原 txtQua1..4 / txtWgt1..4 / txtWgtPj1..4） */
const stat1 = reactive({ qua: "", wgt: "", pj: "" });
const stat11 = reactive({ qua: "", wgt: "", pj: "" });
const stat2 = reactive({ qua: "", wgt: "", pj: "" });
const stat21 = reactive({ qua: "", wgt: "", pj: "" });
function fillStat(s: { qua: string; wgt: string; pj: string }, list: DtoThr3010[]) {
  if (!list.length) return;
  const qua = list.reduce((a, x) => a + (x.nQua ?? 0), 0);
  const wgt = list.reduce((a, x) => a + (x.nWgt ?? 0), 0);
  s.qua = String(qua);
  s.wgt = String(wgt);
  s.pj = String(Math.round((wgt / (qua || 1)) * 1000) / 1000);
}

/* ---------- 聚焦/勾选 ---------- */
const notInApi = ref<GridApi | null>(null);
const notInCurrent = ref<DtoThr3010 | null>(null);
function onNotInReady(e: GridReadyEvent) {
  notInApi.value = e.api;
}
function onNotInSelectionChanged() {
  const rows = notInApi.value?.getSelectedRows() as DtoThr3010[] | undefined;
  notInCurrent.value = rows?.[0] ?? null;
}
const fur1InApi = ref<GridApi | null>(null);
const fur1InCurrent = ref<DtoThr3010 | null>(null);
function onFur1InReady(e: GridReadyEvent) {
  fur1InApi.value = e.api;
}
function onFur1InSelectionChanged() {
  const rows = fur1InApi.value?.getSelectedRows() as DtoThr3010[] | undefined;
  fur1InCurrent.value = rows?.[0] ?? null;
}
const fur1OutApi = ref<GridApi | null>(null);
const fur2InApi = ref<GridApi | null>(null);
const fur2OutApi = ref<GridApi | null>(null);
function onFur1OutReady(e: GridReadyEvent) {
  fur1OutApi.value = e.api;
}
function onFur2InReady(e: GridReadyEvent) {
  fur2InApi.value = e.api;
}
function onFur2OutReady(e: GridReadyEvent) {
  fur2OutApi.value = e.api;
}

/* ---------- 列定义 ---------- */
const furStatusFmt = (p: ValueFormatterParams) => {
  const m: Record<string, string> = {
    [String(Thr3010FurStatusEnum.Batch)]: "已组批",
    [String(Thr3010FurStatusEnum.Wait)]: "待入炉",
    [String(Thr3010FurStatusEnum.RefuseBefore)]: "炉前拒收",
    [String(Thr3010FurStatusEnum.EnterFur)]: "入炉",
    [String(Thr3010FurStatusEnum.Eliminate)]: "剔炉",
    [String(Thr3010FurStatusEnum.ExitFur)]: "出炉",
    [String(Thr3010FurStatusEnum.RefuseAfter)]: "炉后拒收",
  };
  return m[String(p.value)] ?? "";
};
/** 订单号含 -B 标红（原 RowCellStyle） */
const orderRedClass = (p: { value: unknown }) => (String(p.value ?? "").includes("-B") ? "cell-danger" : "");

const notInColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 125 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112, cellClass: orderRedClass },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112, cellClass: orderRedClass },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112, cellClass: orderRedClass },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112, cellClass: orderRedClass },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 112 },
  { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 112 },
  { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 112 },
  { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 112 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 112 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 112 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 112 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "熔炼序号", width: 112 },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 112 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "计划钢种", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "冶炼钢种", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "nThickPlan", field: "nThickPlan", headerName: "计划厚度", width: 112 },
  { colId: "nWidthPlan", field: "nWidthPlan", headerName: "计划宽度", width: 112 },
  { colId: "nLenPlan", field: "nLenPlan", headerName: "计划长度", width: 112 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 112 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 125 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112 },
  { colId: "cDn", field: "cDn", headerName: "需要堆冷", width: 112 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112 },
  { colId: "cSgStdPlan", field: "cSgStdPlan", headerName: "计划执行标准", width: 138 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "性能要求", width: 112 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 112 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112 },
  { colId: "nOrderPlan", field: "nOrderPlan", headerName: "计划生产顺序", width: 138 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 150, hide: true },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 112, hide: true },
  { colId: "cRowNo", field: "cRowNo", headerName: "道次", width: 112, hide: true },
];

/** 炉内/出炉材料列集（gridView2~5，列序一致；gridView2 的 是否工程单/组批号 与其余相反） */
function furColDefs(gcdFirst: boolean): ColDef[] {
  const gcd: ColDef = { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 125 };
  const batchOrder: ColDef = { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 112 };
  const cols: ColDef[] = [
    { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
    { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
    ...(gcdFirst ? [gcd, batchOrder] : [batchOrder, gcd]),
    { colId: "cRowNo", field: "cRowNo", headerName: "道次", width: 112 },
    { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112, cellClass: orderRedClass },
    { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112, cellClass: orderRedClass },
    { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112, cellClass: orderRedClass },
    { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112, cellClass: orderRedClass },
    { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 112 },
    { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 112 },
    { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 112 },
    { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 112 },
    { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
    { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
    { colId: "cPieceNo", field: "cPieceNo", headerName: "熔炼序号", width: 112 },
    { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 112 },
    { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "计划钢种", width: 112 },
    { colId: "cSgCode", field: "cSgCode", headerName: "冶炼钢种", width: 112 },
    { colId: "nThick", field: "nThick", headerName: "坯厚", width: 112 },
    { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 112 },
    { colId: "nLen", field: "nLen", headerName: "坯长", width: 112 },
    { colId: "nQua", field: "nQua", headerName: "支数", width: 112 },
    { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
    { colId: "nWgtCz", field: "nWgtCz", headerName: "称重重量", width: 112 },
    { colId: "nThickPlan", field: "nThickPlan", headerName: "计划厚度", width: 112 },
    { colId: "nWidthPlan", field: "nWidthPlan", headerName: "计划宽度", width: 112 },
    { colId: "nLenPlan", field: "nLenPlan", headerName: "计划长度", width: 112 },
    { colId: "nBc", field: "nBc", headerName: "倍尺", width: 112 },
    { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 125 },
    { colId: "cTol", field: "cTol", headerName: "公差", width: 112 },
    { colId: "cDn", field: "cDn", headerName: "需要堆冷", width: 112 },
    { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112 },
    { colId: "cSgStdPlan", field: "cSgStdPlan", headerName: "计划执行标准", width: 138 },
    { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
    { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "性能要求", width: 112 },
    { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112 },
    { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 112 },
    { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 112 },
    { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 112 },
    { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 112 },
    { colId: "dRl", field: "dRl", headerName: "入炉时间", width: 140 },
    { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 112 },
    { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
    { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
    { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
    { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
    { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
    { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 150, hide: true },
    { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 125, hide: true },
    {
      colId: "nFurStatus",
      field: "nFurStatus",
      headerName: "加热炉状态",
      width: 125,
      hide: true,
      valueFormatter: furStatusFmt,
    },
    { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112, hide: true },
    { colId: "cSpecPlan", field: "cSpecPlan", headerName: "计划规格", width: 112, hide: true },
    { colId: "nOrderPlan", field: "nOrderPlan", headerName: "计划生产顺序", width: 138, hide: true },
    { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 125, hide: true },
  ];
  return cols;
}
const fur1InColDefs = furColDefs(true);
const fur1OutColDefs = furColDefs(false);
const fur2InColDefs = furColDefs(false);
const fur2OutColDefs = furColDefs(false);

/* ---------- 查询 ---------- */
async function onQuery() {
  loading.value = true;
  try {
    const dto = {
      cLineCode,
      cOrderNo: input.cOrderNo.trim() || undefined,
      cBatchNo: input.cBatchNo.trim() || undefined,
      cStove: input.cStove.trim() || undefined,
      cSgCode: input.cSgCode.trim() || undefined,
      cSgStd: input.cSgStd.trim() || undefined,
      cSpec: input.cSpec.trim() || undefined,
      slabNo: input.slabNo.trim() || undefined,
      dInTimeRange: toTimeRange(input.dates),
      listFurStatus: [Thr3010FurStatusEnum.Wait, Thr3010FurStatusEnum.EnterFur, Thr3010FurStatusEnum.ExitFur],
    };
    const [list1, list] = await Promise.all([hR3010Api.queryNotInSlabs(dto), hR3010Api.querySlabs(dto)]);
    notInRows.value = list1 ?? [];
    notInCurrent.value = null;
    const byOrder = (a: DtoThr3010, b: DtoThr3010) => (a.nOrder ?? 0) - (b.nOrder ?? 0);
    fur1In.value = (list ?? [])
      .filter((x) => x.cFurCode === "1" && x.nFurStatus === Thr3010FurStatusEnum.EnterFur)
      .sort(byOrder);
    fur1Out.value = (list ?? [])
      .filter((x) => x.cFurCode === "1" && x.nFurStatus === Thr3010FurStatusEnum.ExitFur)
      .sort(byOrder);
    fur2In.value = (list ?? [])
      .filter((x) => x.cFurCode === "2" && x.nFurStatus === Thr3010FurStatusEnum.EnterFur)
      .sort(byOrder);
    fur2Out.value = (list ?? [])
      .filter((x) => x.cFurCode === "2" && x.nFurStatus === Thr3010FurStatusEnum.ExitFur)
      .sort(byOrder);
    fillStat(stat1, fur1In.value);
    fillStat(stat11, fur1Out.value);
    fillStat(stat2, fur2In.value);
    fillStat(stat21, fur2Out.value);
    requestAnimationFrame(() => {
      notInApi.value?.autoSizeAllColumns();
      fur1InApi.value?.autoSizeAllColumns();
      fur1OutApi.value?.autoSizeAllColumns();
      fur2InApi.value?.autoSizeAllColumns();
      fur2OutApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* ---------- ShowYesNo 受控确认 ---------- */
const confirmOpen = ref(false);
const confirmMsg = ref("");
const confirmCaption = ref("确认");
let confirmAction: (() => Promise<void>) | null = null;
function askConfirm(msg: string, action: () => Promise<void>, caption = "确认") {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmCaption.value = caption;
  confirmOpen.value = true;
}
async function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  if (act) await act();
}

/* ---------- 入炉 / 出炉 / 撤销 / 吊销 ---------- */
function onEnter() {
  const row = notInCurrent.value;
  if (!row) return;
  // 原 FrmHR3120：入炉弹窗（选炉/录入炉号后 enterFur 提交），待接入
  toast("入炉弹窗 FrmHR3120 待接入", 2500, "warn");
}
function onExit1() {
  const row = fur1InCurrent.value;
  if (!row) return;
  // 原 FrmHR3120：1#出炉弹窗，待接入
  toast("出炉弹窗 FrmHR3120 待接入", 2500, "warn");
}
function onImport() {
  // 原 DevExpress Excel 导入（ImportHROrder → hR3010Api.importOrder），web 暂无 xlsx 解析设施
  toast("生产顺序导入（Excel）待接入", 2500, "warn");
}

function selectedIds(api: GridApi | null): string[] {
  const rows = api?.getSelectedRows() as DtoThr3010[] | undefined;
  return (rows ?? []).map((x) => x.id).filter((x): x is string => !!x);
}

async function doCancelEnter(api: GridApi | null, cFurCode: string) {
  const cMxIds = selectedIds(api);
  try {
    await hR3010Api.cancelEnter({ cLineCode, cMxIds, cFurCode });
    toast("数据提交成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}
function onCancelEnter1() {
  if (fur1In.value.length === 0) return;
  if (selectedIds(fur1InApi.value).length === 0) return;
  askConfirm("是否确认撤消入炉勾选的材料？", () => doCancelEnter(fur1InApi.value, "1#SRF"));
}
function onCancelEnter2() {
  if (fur2In.value.length === 0) return;
  if (selectedIds(fur2InApi.value).length === 0) return;
  askConfirm("是否确认撤消入炉勾选的材料？", () => doCancelEnter(fur2InApi.value, "2#SRF"));
}

async function doExit2() {
  const cMxIds = selectedIds(fur2InApi.value);
  try {
    await hR3010Api.exitFur({ cLineCode, cMxIds, cFurCode: "2#SRF" });
    toast("数据提交成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}
function onExit2() {
  if (fur2In.value.length === 0) return;
  if (selectedIds(fur2InApi.value).length === 0) return;
  askConfirm("是否确认出炉勾选的材料？", doExit2);
}

async function doCancelExit(api: GridApi | null, cFurCode: string) {
  const cMxIds = selectedIds(api);
  try {
    await hR3010Api.cancelExit({ cLineCode, cMxIds, cFurCode });
    toast("数据提交成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

async function doElim(cMxIds: string[], cReason: string, nFurStatus: Thr3010FurStatusEnum, cFurCode?: string) {
  try {
    const msg = await hR3010Api.elimFur({ cLineCode, cMxIds, cReason, nFurStatus, cFurCode });
    if (!msg) toast("数据提交成功！", 2000, "success");
    else toast("数据提交失败：" + msg, 2500, "warn");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}
function onElim() {
  if (notInRows.value.length === 0) return;
  const sel = (notInApi.value?.getSelectedRows() ?? []) as DtoThr3010[];
  if (sel.length === 0) return;
  const pieceNos = sel.map((x) => x.cPieceNo).join("\r\n");
  askConfirm(
    `是否确认吊销勾选的材料？\r\n${pieceNos}`,
    () =>
      doElim(
        sel.map((x) => x.id).filter((x): x is string => !!x),
        reason.value,
        Thr3010FurStatusEnum.RefuseBefore,
      ),
    "警告：请确认已经在二级系统吊销后再操作！",
  );
}
function onElim1() {
  if (fur1Out.value.length === 0) return;
  const cMxIds = selectedIds(fur1OutApi.value);
  if (cMxIds.length === 0) return;
  askConfirm("是否确认吊销勾选的材料？", () =>
    doElim(cMxIds, reason1.value, Thr3010FurStatusEnum.RefuseAfter, "1#SRF"),
  );
}
function onElim2() {
  if (fur2Out.value.length === 0) return;
  const cMxIds = selectedIds(fur2OutApi.value);
  if (cMxIds.length === 0) return;
  askConfirm("是否确认吊销勾选的材料？", () =>
    doElim(cMxIds, reason2.value, Thr3010FurStatusEnum.RefuseAfter, "2#SRF"),
  );
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：入炉时间/订单号/批号/炉号/钢种/执行标准/规格/板坯号） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入炉时间</label>
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
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">规格</label>
        <InputText v-model="input.cSpec" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
    </div>
    <!-- 工具栏（原 stackPanel1：查询/入炉/生产顺序导入） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEnter">入炉</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onImport">生产顺序导入</Button>
    </div>

    <!-- 上下分栏：原 split1 500/1039 ≈ 48% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="48" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">待入炉材料</span>
        </div>
        <!-- stackPanel5：原因 + 炉前吊销 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">原因</label>
          <InputText v-model="reason" class="w-48 shrink-0" />
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onElim"
            >炉前吊销</Button
          >
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="notInColDefs"
            :row-data="notInRows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onNotInReady"
            @selection-changed="onNotInSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 左右分栏：原 split2 1433/2182 ≈ 66% -->
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel :size="66" :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">1#加热炉</span>
            </div>
            <Tabs v-model:value="activeTab1" class="min-h-0 flex-1 flex-col">
              <TabList>
                <Tab value="in">炉内材料</Tab>
                <Tab value="out">出炉材料</Tab>
              </TabList>
              <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
                <TabPanel value="in" class="flex h-full flex-col overflow-hidden !p-0">
                  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                    <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelEnter1"
                      >撤销入炉</Button
                    >
                    <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onExit1">出炉</Button>
                    <span class="ml-2 shrink-0 text-xs text-muted-foreground">总支数</span>
                    <InputText v-model="stat1.qua" readonly class="w-20 shrink-0" />
                    <span class="shrink-0 text-xs text-muted-foreground">总重量</span>
                    <InputText v-model="stat1.wgt" readonly class="w-24 shrink-0" />
                    <span class="shrink-0 text-xs text-muted-foreground">平均重量</span>
                    <InputText v-model="stat1.pj" readonly class="w-24 shrink-0" />
                  </div>
                  <div class="min-h-0 flex-1 overflow-hidden">
                    <AgGridVue
                      class="hmx-ag-grid h-full w-full"
                      :theme="theme"
                      :locale-text="AG_GRID_LOCALE_CN"
                      :default-col-def="hmxDefaultColDef"
                      :column-defs="fur1InColDefs"
                      :row-data="fur1In"
                      :row-selection="{
                        mode: 'multiRow',
                        checkboxes: true,
                        headerCheckbox: true,
                        enableClickSelection: true,
                        enableSelectionWithoutKeys: true,
                      }"
                      :pagination="false"
                      :animate-rows="false"
                      :loading="loading"
                      @grid-ready="onFur1InReady"
                      @selection-changed="onFur1InSelectionChanged"
                      @first-data-rendered="autoSizeOnFirstData"
                    />
                  </div>
                </TabPanel>
                <TabPanel value="out" class="flex h-full flex-col overflow-hidden !p-0">
                  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                    <span class="shrink-0 text-xs text-muted-foreground">总支数</span>
                    <InputText v-model="stat11.qua" readonly class="w-20 shrink-0" />
                    <span class="shrink-0 text-xs text-muted-foreground">总重量</span>
                    <InputText v-model="stat11.wgt" readonly class="w-24 shrink-0" />
                    <span class="shrink-0 text-xs text-muted-foreground">平均重量</span>
                    <InputText v-model="stat11.pj" readonly class="w-24 shrink-0" />
                  </div>
                  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                    <label class="w-8 shrink-0 text-xs text-muted-foreground">原因</label>
                    <InputText v-model="reason1" class="w-48 shrink-0" />
                    <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onElim1"
                      >炉后吊销</Button
                    >
                  </div>
                  <div class="min-h-0 flex-1 overflow-hidden">
                    <AgGridVue
                      class="hmx-ag-grid h-full w-full"
                      :theme="theme"
                      :locale-text="AG_GRID_LOCALE_CN"
                      :default-col-def="hmxDefaultColDef"
                      :column-defs="fur1OutColDefs"
                      :row-data="fur1Out"
                      :row-selection="{
                        mode: 'multiRow',
                        checkboxes: true,
                        headerCheckbox: true,
                        enableClickSelection: true,
                        enableSelectionWithoutKeys: true,
                      }"
                      :pagination="false"
                      :animate-rows="false"
                      :loading="loading"
                      @grid-ready="onFur1OutReady"
                      @first-data-rendered="autoSizeOnFirstData"
                    />
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </SplitterPanel>

          <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">2#加热炉</span>
            </div>
            <Tabs v-model:value="activeTab2" class="min-h-0 flex-1 flex-col">
              <TabList>
                <Tab value="in">炉内材料</Tab>
                <Tab value="out">出炉材料</Tab>
              </TabList>
              <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
                <TabPanel value="in" class="flex h-full flex-col overflow-hidden !p-0">
                  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                    <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelEnter2"
                      >撤销入炉</Button
                    >
                    <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onExit2">出炉</Button>
                    <span class="ml-2 shrink-0 text-xs text-muted-foreground">总支数</span>
                    <InputText v-model="stat2.qua" readonly class="w-20 shrink-0" />
                    <span class="shrink-0 text-xs text-muted-foreground">总重量</span>
                    <InputText v-model="stat2.wgt" readonly class="w-24 shrink-0" />
                    <span class="shrink-0 text-xs text-muted-foreground">平均重量</span>
                    <InputText v-model="stat2.pj" readonly class="w-24 shrink-0" />
                  </div>
                  <div class="min-h-0 flex-1 overflow-hidden">
                    <AgGridVue
                      class="hmx-ag-grid h-full w-full"
                      :theme="theme"
                      :locale-text="AG_GRID_LOCALE_CN"
                      :default-col-def="hmxDefaultColDef"
                      :column-defs="fur2InColDefs"
                      :row-data="fur2In"
                      :row-selection="{
                        mode: 'multiRow',
                        checkboxes: true,
                        headerCheckbox: true,
                        enableClickSelection: true,
                        enableSelectionWithoutKeys: true,
                      }"
                      :pagination="false"
                      :animate-rows="false"
                      :loading="loading"
                      @grid-ready="onFur2InReady"
                      @first-data-rendered="autoSizeOnFirstData"
                    />
                  </div>
                </TabPanel>
                <TabPanel value="out" class="flex h-full flex-col overflow-hidden !p-0">
                  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                    <span class="shrink-0 text-xs text-muted-foreground">总支数</span>
                    <InputText v-model="stat21.qua" readonly class="w-20 shrink-0" />
                    <span class="shrink-0 text-xs text-muted-foreground">总重量</span>
                    <InputText v-model="stat21.wgt" readonly class="w-24 shrink-0" />
                    <span class="shrink-0 text-xs text-muted-foreground">平均重量</span>
                    <InputText v-model="stat21.pj" readonly class="w-24 shrink-0" />
                  </div>
                  <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
                    <label class="w-8 shrink-0 text-xs text-muted-foreground">原因</label>
                    <InputText v-model="reason2" class="w-48 shrink-0" />
                    <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onElim2"
                      >炉后吊销</Button
                    >
                  </div>
                  <div class="min-h-0 flex-1 overflow-hidden">
                    <AgGridVue
                      class="hmx-ag-grid h-full w-full"
                      :theme="theme"
                      :locale-text="AG_GRID_LOCALE_CN"
                      :default-col-def="hmxDefaultColDef"
                      :column-defs="fur2OutColDefs"
                      :row-data="fur2Out"
                      :row-selection="{
                        mode: 'multiRow',
                        checkboxes: true,
                        headerCheckbox: true,
                        enableClickSelection: true,
                        enableSelectionWithoutKeys: true,
                      }"
                      :pagination="false"
                      :animate-rows="false"
                      :loading="loading"
                      @grid-ready="onFur2OutReady"
                      @first-data-rendered="autoSizeOnFirstData"
                    />
                  </div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>

    <Dialog
      :visible="confirmOpen"
      modal
      :header="confirmCaption"
      :style="{ width: 'min(30rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs whitespace-pre-line">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>

<style scoped>
:deep(.cell-danger) {
  background-color: #fee2e2;
  color: #b91c1c;
}
</style>
