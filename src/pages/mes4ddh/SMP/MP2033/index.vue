<script setup lang="ts">
/** 对应 FrmMP2033（炼钢总厂中厚板计划排产，cQueryString JSON {LineCode,ZGLineCodeInfo}）：DDH.Winforms.SMP.Forms.FrmMP2033
 *  已接入：frmMP2033Api.getSlabOrderList（计划查询）/ queryStoveCutInfo（切割计划加载）/ calcuateNewData（N·X流增删与拖拽重算）
 *          / checkCreateStoveCunInfo+createStoveCunInfo（生成炉次及切割计划）/ checkRemoveStoveCunInfo+removeStoveCunInfo（删除）
 *          / saveDatas（保存）/ updateStoveSgCodeInfo（炉次改钢种）/ getGPWidthInfo（钢坯宽度候选）
 *          + publicKVApi.getMSConfig（默认炉容量 LGLineDefaultStoveWgt）+ publicQMInfoApi.getSgCodeAndStd（钢种信息下拉）
 *  待接入：createStoveCutData（原 AddRealV1 备用路径未挂事件）；左右网格行拖拽调序（原 DXGridDragHelper/GridViewDragDropHelper
 *          跨网格拖放，AG Grid 不支持跨实例行拖，增删按钮已覆盖 calcuateNewData 同一重算入口）
 *          二级弹窗 FrmMS2033_UpdateSgCode（双击改钢种，占位）
 *  布局：stackPanel1(销售下发时间/轧制产线/计算用炉容量+查询/生成炉次及切割计划/删除炉次及切割计划/保存) → stackPanel2(原Visible=false: textEdit1/计划状态/钢坯宽度)
 *        → 上下Splitter：上=计划 gvPlan(18可见+4隐藏) ｜ 下=dataLayout(制造命令号/厚度/宽度/长度/生产备注/钢种信息) + stackPanel3(N·X流添加删除/炉次改钢种/件次改钢种)
 *          + 左右Splitter50/50：左=N流 ｜ 右=X流（同列集16可见+炉次流重量动态列+43隐藏，StoveHaveMoreSgCode 整行黄底）
 *        字段=camelCase 绑定，colId=原 Designer FieldName */
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { publicKVApi, publicQMInfoApi } from "@/api/mes4ddh/sms.swagger";
import {
  LgProdStatusEnum,
  OrderReviewEnum,
  frmMP2033Api,
  type FrmMS2033Dto_AddOrRemovePieceDto,
  type FrmMS2033Dto_PlanInfo,
  type FrmMS2033Dto_StoveCutInfo,
  type QueryParamDto,
  type SaveDataDto,
  type SgCodeAndStdDto,
} from "@/api/mes4ddh/smp.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs, json: menuJson } = useMenuQuery();

/* ---------- 注入参数（原 HandleQueryString / HandleZGLineCodeItems） ---------- */
const lineCode = String(menuJson.LineCode ?? "");
const zgOptions = ((menuJson.ZGLineCodeInfo as string[] | undefined) ?? []).map((x) => {
  const [v, ...rest] = x.split("-");
  return { label: rest.join("-") || v, value: v };
});

/* ---------- 查询条件（原 stackPanel1） ---------- */
function shiftDays(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}
const dtS = ref<Date>(shiftDays(-3));
const dtE = ref<Date>(shiftDays(7));
const cboZGLineInfo = ref<string | null>(zgOptions[0]?.value ?? null);
/** 计算用炉容量（原 speStoveWgt，Designer 默认 226 / min50 / max250，Load 时按 LGLineDefaultStoveWgt 配置覆盖） */
const speStoveWgt = ref<number>(226);

/* stackPanel2：原 Visible=false+Enabled=false 的次级条件（textEdit1 无标签 / 计划状态 / 钢坯宽度） */
const textEdit1 = ref("");
const icboPlan = ref<number | null>(null);
const planStatusOptions = [
  { label: "未排完", value: LgProdStatusEnum.NoPlan },
  { label: "已排完", value: LgProdStatusEnum.Finish },
];
const cboKGPWidth = ref<number[]>([]);
const kgpWidthOptions = ref<number[]>([]);

/* dataLayoutControl1：切割计划编辑参数（原 Load/点击 回填） */
const txtCurrentStoveCutInfo = ref("");
const speNThick = ref<number>(263);
const speNWth = ref<number>(2030);
const speNLen = ref<number>(6000);
const txtProRemark = ref("");
/** 钢种信息（原 cboSgCodeInfo：项=炼钢工艺要点 `${钢种} - ${执行标准}`） */
const cboSgCodeInfo = ref<string | null>(null);
const sgList = ref<SgCodeAndStdDto[]>([]);
const sgOptions = computed(() =>
  sgList.value.map((x) => {
    const sign = `${x.cSgCode ?? ""} - ${x.cSgStd ?? ""}`;
    return { label: sign, value: sign };
  }),
);

/* ---------- 数据与网格 ---------- */
const planRows = ref<FrmMS2033Dto_PlanInfo[]>([]);
const leftRows = ref<FrmMS2033Dto_StoveCutInfo[]>([]);
const rightRows = ref<FrmMS2033Dto_StoveCutInfo[]>([]);
const querying = ref(false);
const planApi = ref<GridApi | null>(null);
const leftApi = ref<GridApi | null>(null);
const rightApi = ref<GridApi | null>(null);
/** 最新点击切割明细的行（原 _currentStoveCutInfo） */
const currentCut = ref<FrmMS2033Dto_StoveCutInfo | null>(null);

function fmtDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 00:00:00`;
}
function autofit(api: GridApi | null) {
  requestAnimationFrame(() => api?.autoSizeAllColumns());
}
function ready(key: "plan" | "left" | "right") {
  return (e: GridReadyEvent) => {
    if (key === "plan") planApi.value = e.api;
    else if (key === "left") leftApi.value = e.api;
    else rightApi.value = e.api;
  };
}
/** 计划行（swagger SlabPcDto 未声明 cPlanTime，按运行时数据补型） */
type PlanRow = FrmMS2033Dto_PlanInfo & { cPlanTime?: string | null };
/** 焦点计划行（原 gvPlan.GetFocusedRow；勾选首行视作焦点） */
function focusedPlan(): PlanRow | null {
  const rows = planApi.value?.getSelectedRows() ?? [];
  return (rows[0] as PlanRow | undefined) ?? null;
}
/** 勾选计划 = AG Grid row-selection 复选框（原 Selected 勾选列已改隐藏列，ui-rules §7） */
function selectedPlans(): FrmMS2033Dto_PlanInfo[] {
  return (planApi.value?.getSelectedRows() ?? []) as FrmMS2033Dto_PlanInfo[];
}
/** _selList 整行提交：Selected 字段随 selection-changed 回写，保持原载荷语义 */
function syncPlanSelectedField() {
  const sel = new Set(selectedPlans());
  planRows.value.forEach((r) => (r.selected = sel.has(r)));
}
function sortCut(list: FrmMS2033Dto_StoveCutInfo[]): FrmMS2033Dto_StoveCutInfo[] {
  return [...list].sort((a, b) => Number(a.nStrandNoSeqPlanTime ?? 0) - Number(b.nStrandNoSeqPlanTime ?? 0));
}
/** 替换左右列表（原 Clear+AddRange(OrderBy NStrandNoSeqPlanTime)） */
function replaceCut(data?: {
  dataSourceLeft?: FrmMS2033Dto_StoveCutInfo[] | null;
  dataSourceRight?: FrmMS2033Dto_StoveCutInfo[] | null;
}) {
  leftRows.value = sortCut(data?.dataSourceLeft ?? []);
  rightRows.value = sortCut(data?.dataSourceRight ?? []);
  currentCut.value = null;
}

/* ---------- 列 ---------- */
/** 计划 gvPlan：18 可见 + 4 隐藏（FrmMS2033Dto_PlanInfo = SlabPcDto） */
const planColDefs = ref<ColDef[]>([
  { colId: "Selected", field: "selected", headerName: "选择", hide: true },
  { colId: "NOrder", field: "nOrder", headerName: "消息排序号", width: 90 },
  { colId: "CPlanTime", field: "cPlanTime", headerName: "计划日期", width: 110 },
  { colId: "CreateTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "COrderNo", field: "cOrderNo", headerName: "订单号", width: 130 },
  { colId: "CSgCode", field: "cSgCode", headerName: "钢种", width: 90 },
  { colId: "CSgStd", field: "cSgStd", headerName: "执行标准", width: 120 },
  { colId: "CSteelType", field: "cSteelType", headerName: "钢种大类", width: 95 },
  { colId: "CSpec", field: "cSpec", headerName: "规格", width: 110 },
  { colId: "NSlabThick", field: "nSlabThick", headerName: "钢坯厚", width: 85 },
  { colId: "NSlabWidth", field: "nSlabWidth", headerName: "钢坯宽", width: 85 },
  { colId: "NSlabLenMin", field: "nSlabLenMin", headerName: "钢坯长度", width: 90 },
  { colId: "NSlabQua", field: "nSlabQua", headerName: "坯料支数", width: 90 },
  { colId: "NSlabWgt", field: "nSlabWgt", headerName: "坯重", width: 90 },
  { colId: "NSlabWgtSy", field: "nSlabWgtSy", headerName: "坯料剩余重量", width: 110 },
  { colId: "CSpecOrder", field: "cSpecOrder", headerName: "成品规格", width: 110 },
  { colId: "CZGLineCode", field: "cZGLineCode", headerName: "轧制产线", width: 95 },
  { colId: "Creator", field: "creator", headerName: "创建人", width: 90 },
  /* 隐藏 4 列 */
  { colId: "CCcmCode", field: "cCcmCode", headerName: "连铸机编码", hide: true },
  { colId: "NSlabLenMax", field: "nSlabLenMax", headerName: "钢坯长度最大值", hide: true },
  { colId: "_thr2000Id", field: "_thr2000Id", headerName: "轧钢日计划id", hide: true },
  { colId: "Tmp2010Id", field: "tmp2010Id", headerName: "生产订单id", hide: true },
]);

/** 切割计划列（左右两网格同列集：16 可见 + 备注后动态「炉次流重量」 + 43 隐藏） */
function makeCutColDefs(list: () => FrmMS2033Dto_StoveCutInfo[]): ColDef[] {
  return [
    { colId: "NSortJc", field: "nSortJc", headerName: "炉数", width: 70 },
    { colId: "CPlanTime", field: "cPlanTime", headerName: "计划日期", width: 110 },
    { colId: "CPono", field: "cPono", headerName: "制造命令号", width: 110 },
    { colId: "StoveSgCode", field: "stoveSgCode", headerName: "炉次钢种", width: 100 },
    { colId: "CSgCode", field: "cSgCode", headerName: "钢种", width: 90 },
    { colId: "CStrandNo", field: "cStrandNo", headerName: "流号", width: 70 },
    { colId: "NStrandNoSeq", field: "nStrandNoSeq", headerName: "炉流序号", width: 90 },
    { colId: "NLen", field: "nLen", headerName: "坯长", width: 80 },
    { colId: "NThickZg", field: "nThickZg", headerName: "轧制厚度", width: 90 },
    { colId: "CBackup", field: "cBackup", headerName: "备注", width: 90 },
    /* 原 AddCustomUnboundColumn：Unbound 炉次流重量，VisibleIndex=备注+1 */
    {
      colId: "StoveLiuWgt",
      field: "stoveLiuWgt",
      headerName: "炉次流重量",
      width: 100,
      valueGetter: (p) => {
        const pono = p.data?.cPono;
        if (!pono) return null;
        return list()
          .filter((x) => x.cPono === pono)
          .reduce((s, x) => s + Number(x.nWgt ?? 0), 0);
      },
    },
    { colId: "CSgStd", field: "cSgStd", headerName: "执行标准", width: 120 },
    { colId: "NThick", field: "nThick", headerName: "坯厚", width: 70 },
    { colId: "NWidth", field: "nWidth", headerName: "坯宽", width: 70 },
    { colId: "NWgt", field: "nWgt", headerName: "坯重", width: 80 },
    { colId: "NStrandNoSeqPlanTime", field: "nStrandNoSeqPlanTime", headerName: "计划日期件次顺序号", width: 140 },
    {
      colId: "NStrandNoSeq1PlanTime",
      field: "nStrandNoSeq1PlanTime",
      headerName: "计划日期流号一切顺序号",
      width: 160,
    },
    /* 隐藏 43 列 */
    { colId: "_tmp20410", field: "_tmp20410", headerName: "", hide: true },
    { colId: "Id", field: "id", headerName: "主键", hide: true },
    { colId: "CPId", field: "cPId", headerName: "轧制计划异常实绩表主键", hide: true },
    { colId: "CLineCode", field: "cLineCode", headerName: "产线", hide: true },
    { colId: "CLineDesc", field: "cLineDesc", headerName: "产线描述", hide: true },
    { colId: "CMachineCode", field: "cMachineCode", headerName: "机台编码", hide: true },
    { colId: "CMachineDesc", field: "cMachineDesc", headerName: "机台描述", hide: true },
    { colId: "NZjNum", field: "nZjNum", headerName: "铸机炉数", hide: true },
    { colId: "NZjskNum", field: "nZjskNum", headerName: "水口炉数", hide: true },
    { colId: "CStovePlanId", field: "cStovePlanId", headerName: "炉次计划id", hide: true },
    { colId: "CStoveRoutePlanId", field: "cStoveRoutePlanId", headerName: "炉次工艺路线计划id", hide: true },
    { colId: "CStove", field: "cStove", headerName: "炉号", hide: true },
    { colId: "CQie1", field: "cQie1", headerName: "一切", hide: true },
    { colId: "CQie2", field: "cQie2", headerName: "二切", hide: true },
    { colId: "CBeiChi", field: "cBeiChi", headerName: "倍尺", hide: true },
    { colId: "CPieceNo", field: "cPieceNo", headerName: "头侧件次号", hide: true },
    { colId: "CPrintCode", field: "cPrintCode", headerName: "喷号", hide: true },
    { colId: "NStrandNoSeq1", field: "nStrandNoSeq1", headerName: "炉次流号一切顺序号", hide: true },
    { colId: "NStrandNoSeq2", field: "nStrandNoSeq2", headerName: "炉次流号二切顺序号", hide: true },
    { colId: "CSgCodeStd", field: "cSgCodeStd", headerName: "钢种标准", hide: true },
    { colId: "CSpec", field: "cSpec", headerName: "规格", hide: true },
    { colId: "NLenCut1", field: "nLenCut1", headerName: "一切长度", hide: true },
    { colId: "CMatCode", field: "cMatCode", headerName: "物料编码", hide: true },
    { colId: "CMatName", field: "cMatName", headerName: "物料名称", hide: true },
    { colId: "COrderNo", field: "cOrderNo", headerName: "订单号", hide: true },
    { colId: "CSpecZg", field: "cSpecZg", headerName: "轧制规格", hide: true },
    { colId: "NWidthZg", field: "nWidthZg", headerName: "轧制宽度", hide: true },
    { colId: "NLenZg", field: "nLenZg", headerName: "轧制长度", hide: true },
    { colId: "CEnable", field: "cEnable", headerName: "启用", hide: true },
    { colId: "CTimestamp", field: "cTimestamp", headerName: "时间戳", hide: true },
    { colId: "Creator", field: "creator", headerName: "创建人", hide: true },
    { colId: "CreateTime", field: "createTime", headerName: "创建时间", hide: true },
    { colId: "LastModifier", field: "lastModifier", headerName: "最后修改人", hide: true },
    { colId: "LastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", hide: true },
    { colId: "CSw01", field: "cSw01", headerName: "备用字段1", hide: true },
    { colId: "CSw02", field: "cSw02", headerName: "备用字段2", hide: true },
    { colId: "CSw03", field: "cSw03", headerName: "备用字段3", hide: true },
    { colId: "CSw04", field: "cSw04", headerName: "备用字段4", hide: true },
    { colId: "CSw05", field: "cSw05", headerName: "备用字段5", hide: true },
    { colId: "CSw06", field: "cSw06", headerName: "备用字段6", hide: true },
    { colId: "Selected", field: "selected", headerName: "选择", hide: true },
    { colId: "Index", field: "index", headerName: "序号", hide: true },
    {
      colId: "StoveHaveMoreSgCode",
      field: "stoveHaveMoreSgCode",
      headerName: "炉次计划产出的件次是否存在多个钢种",
      hide: true,
    },
  ];
}
const leftColDefs = ref<ColDef[]>(makeCutColDefs(() => leftRows.value));
const rightColDefs = ref<ColDef[]>(makeCutColDefs(() => rightRows.value));
/** 原 SetBackgroundColor：StoveHaveMoreSgCode=true 整行黄底 */
function cutRowStyle(params: { data?: FrmMS2033Dto_StoveCutInfo }) {
  return params.data?.stoveHaveMoreSgCode ? { backgroundColor: "#ffff00" } : undefined;
}

/* ---------- 入参与查询（原 GetParamDto / btnQuery_Click_Real / GetStoveCutInfo） ---------- */
function getParamDto(withSel: FrmMS2033Dto_PlanInfo[] = []): QueryParamDto {
  const zgLineCode = cboZGLineInfo.value;
  if (!zgLineCode) {
    throw new Error("轧制产线不得为空！");
  }
  return {
    dTimeStart: fmtDate(dtS.value),
    dTimeEnd: fmtDate(dtE.value),
    cLineCode: lineCode,
    zGLineCode: zgLineCode,
    nReviewStatus: OrderReviewEnum.YesReview,
    lgPlanStatus: (icboPlan.value ?? null) as LgProdStatusEnum | null,
    stovePlanWgt: speStoveWgt.value ?? undefined,
    widths: cboKGPWidth.value.length ? cboKGPWidth.value.join(",") : null,
    _selList: withSel,
  };
}
function guardParam(): QueryParamDto | null {
  try {
    return getParamDto();
  } catch (e) {
    toast((e as Error).message, 2500, "warn");
    return null;
  }
}

/** 加载切割计划（原 GetStoveCutInfo：焦点计划行 → 左右两网格） */
async function loadCut(row: FrmMS2033Dto_PlanInfo | null | undefined) {
  if (!row) {
    leftRows.value = [];
    rightRows.value = [];
    currentCut.value = null;
    autofit(leftApi.value);
    autofit(rightApi.value);
    return;
  }
  const param = guardParam();
  if (!param) return;
  param._selList = [row];
  querying.value = true;
  try {
    const data = await frmMP2033Api.queryStoveCutInfo(param);
    replaceCut(data);
    autofit(leftApi.value);
    autofit(rightApi.value);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 查询（btnQuery_Click → GetSlabOrderList → 焦点行联动切割计划） */
async function onQuery() {
  const param = guardParam();
  if (!param) return;
  querying.value = true;
  try {
    planRows.value = (await frmMP2033Api.getSlabOrderList(param)) ?? [];
    /* 原 Selected 列语义：查询回填后按数据字段回灌行选择勾选态 */
    requestAnimationFrame(() => {
      planApi.value?.forEachNode((node) => node.setSelected(!!(node.data as FrmMS2033Dto_PlanInfo).selected));
      planApi.value?.autoSizeAllColumns();
    });
    /* 原 btnQuery_Click_Real 尾部 gvPlan_FocusedRowObjectChanged(null,null) */
    await loadCut(planRows.value[0] ?? null);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 计划行焦点变化（原 gvPlan_Click 回填坯料尺寸默认值 + FocusedRowObjectChanged 联动切割计划） */
function onPlanSelectionChanged() {
  syncPlanSelectedField();
  const row = focusedPlan();
  speNThick.value = row?.nSlabThick ?? 263;
  speNWth.value = row?.nSlabWidth ?? 2030;
  speNLen.value = row?.nSlabLenMin ?? 6000;
  txtProRemark.value = "";
  void loadCut(row);
}

/** 切割明细行点击（原 gridViewLeft/Right_Click：回填参数 + SetCurrentStoveCutInfo） */
function onCutSelected(side: "N" | "X") {
  const api = side === "N" ? leftApi.value : rightApi.value;
  const rows = api?.getSelectedRows() ?? [];
  const row = (rows[0] as FrmMS2033Dto_StoveCutInfo | undefined) ?? null;
  speNThick.value = Number(row?.nThick ?? 263);
  speNWth.value = Number(row?.nWidth ?? 2030);
  speNLen.value = Number(row?.nLen ?? 6000);
  txtProRemark.value = String(row?.cBackup ?? "");
  currentCut.value = row;
  txtCurrentStoveCutInfo.value = String(row?.cPono ?? "");
  if (row?.cSgCode && row?.cSgStd) cboSgCodeInfo.value = `${row.cSgCode} - ${row.cSgStd}`;
  else cboSgCodeInfo.value = null;
}
function onCutDblClick() {
  toast("改钢种弹窗 FrmMS2033_UpdateSgCode 待接入（原双击 ShowDialog 占位）", 2500, "warn");
}

/** 从下拉钢种串解析 SgCodeAndStdDto（原 _sgCodeAndStdDtoList.FirstOrDefault） */
function resolveSg(sign: string | null): SgCodeAndStdDto | null {
  if (!sign) return null;
  return sgList.value.find((x) => `${x.cSgCode ?? ""} - ${x.cSgStd ?? ""}` === sign) ?? null;
}

/* ---------- 生成炉次及切割计划（btnAutoCreateStove_Click） ---------- */
async function onCreateStoveCun() {
  const param = guardParam();
  if (!param) return;
  const selList = selectedPlans();
  param._selList = selList;
  querying.value = true;
  try {
    await frmMP2033Api.checkCreateStoveCunInfo(param);
  } catch {
    querying.value = false;
    /* 拦截层已 toast（校验不通过到此为止） */
    return;
  }
  querying.value = false;

  let warringStr = "";
  const widthList = [...new Set(selList.map((x) => x.nSlabWidth ?? 0))].sort((a, b) => a - b);
  if (widthList.length !== 1) {
    warringStr = `\n注意：选择的计划存在${widthList.length}种不同的宽度，宽度信息如下：\n${widthList.join(",\n")}，\n确定继续？`;
  }
  if (!window.confirm(`确定生成的炉次及炉次切割信息？${warringStr}`)) return;
  querying.value = true;
  try {
    await frmMP2033Api.createStoveCunInfo(param);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* ---------- 删除炉次及切割计划（btnRemove_Click） ---------- */
async function onRemoveStoveCun() {
  const row = focusedPlan();
  if (!row) return;
  const param = guardParam();
  if (!param) return;
  param._selList = [row];
  querying.value = true;
  try {
    await frmMP2033Api.checkRemoveStoveCunInfo(param);
  } catch {
    querying.value = false;
    return;
  }
  querying.value = false;
  if (
    !window.confirm(
      `确定删除生成的计划日期为${row.cPlanTime}的炉次及切割计划数据？\n注意：数据删除后无法恢复！请谨慎操作！`,
    )
  )
    return;
  querying.value = true;
  try {
    await frmMP2033Api.removeStoveCunInfo(param);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* ---------- 保存（btnSave_Click → SaveDatas） ---------- */
async function onSave() {
  const planRow = focusedPlan();
  if (!planRow) {
    toast("当前焦点行的提料单信息为空！", 2500, "warn");
    return;
  }
  const param = guardParam();
  if (!param) return;
  const dto: SaveDataDto = {
    paramDto: param,
    planInfo: planRow,
    datas: { dataSourceLeft: leftRows.value, dataSourceRight: rightRows.value },
    _removeDatas: [],
  };
  if (!window.confirm("确定保存？")) return;
  querying.value = true;
  try {
    await frmMP2033Api.saveDatas(dto);
    await loadCut(focusedPlan());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* ---------- N/X 流添加删除（AddReal / Remove_Click_Real → calcuateNewData） ---------- */
async function addReal(liu: "N" | "X") {
  const cur = currentCut.value;
  if (!cur) {
    toast("请先在下方的切割计划中点击要添加的数据所属的位置！", 2500, "warn");
    return;
  }
  const param = guardParam();
  if (!param) return;
  const body: FrmMS2033Dto_AddOrRemovePieceDto = {
    paramDto: param,
    stoveCutInfoAll: { dataSourceLeft: leftRows.value, dataSourceRight: rightRows.value },
    dataOperateTypeEnum: 1 /* DataOperateTypeEnum.Insert */,
    addOrRemoveData: {
      _stoveCutInfo: cur,
      nThick: speNThick.value,
      nWidth: speNWth.value,
      nLen: speNLen.value,
      backUp: txtProRemark.value,
      liu,
    },
  };
  if (!window.confirm(`确定在当前‘${cur.cStrandNo}’流所选的位置添加一个产出计划？`)) return;
  querying.value = true;
  try {
    const data = await frmMP2033Api.calcuateNewData(body);
    replaceCut(data);
    autofit(leftApi.value);
    autofit(rightApi.value);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
function onAddN() {
  void addReal("N");
}
function onAddX() {
  void addReal("X");
}

async function removeReal(row: FrmMS2033Dto_StoveCutInfo | null | undefined) {
  if (!row) return;
  const param = guardParam();
  if (!param) return;
  const body: FrmMS2033Dto_AddOrRemovePieceDto = {
    paramDto: param,
    stoveCutInfoAll: { dataSourceLeft: leftRows.value, dataSourceRight: rightRows.value },
    dataOperateTypeEnum: 3 /* DataOperateTypeEnum.Delete */,
    addOrRemoveData: { _stoveCutInfo: row },
  };
  if (
    !window.confirm(
      `确定删除‘${row.cStrandNo}’流数据中所选的制造命令号为‘${row.cPono}’炉流序号为‘${row.nStrandNoSeq}’的件次信息？`,
    )
  )
    return;
  querying.value = true;
  try {
    const data = await frmMP2033Api.calcuateNewData(body);
    replaceCut(data);
    autofit(leftApi.value);
    autofit(rightApi.value);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
function onRemoveN() {
  const rows = leftApi.value?.getSelectedRows() ?? [];
  void removeReal((rows[0] as FrmMS2033Dto_StoveCutInfo | undefined) ?? null);
}
function onRemoveX() {
  const rows = rightApi.value?.getSelectedRows() ?? [];
  void removeReal((rows[0] as FrmMS2033Dto_StoveCutInfo | undefined) ?? null);
}

/* ---------- 改钢种 ---------- */
function requireSg(): SgCodeAndStdDto | null {
  if (!currentCut.value) {
    toast("请先在下方的切割计划中点击要更新钢种的炉次的件次信息！", 2500, "warn");
    return null;
  }
  if (!cboSgCodeInfo.value) {
    toast("所选的钢种信息为空！", 2500, "warn");
    return null;
  }
  const info = resolveSg(cboSgCodeInfo.value);
  if (!info) {
    toast("禁止操作，无法根据件次的钢种和执行标准获取到炼钢工艺要点中维护的对应的钢种信息！", 3000, "warn");
    return null;
  }
  return info;
}

/** 炉次改钢种（btnChangeSgCodeByStove_Click → UpdateStoveSgCodeInfo：直接提交数据库） */
async function onChangeSgByStove() {
  const info = requireSg();
  if (!info || !currentCut.value) return;
  const cur = currentCut.value;
  if (
    !window.confirm(
      `确定将制造命令号为‘${cur.cPono}’的炉次的钢种和制造标准更新为‘${info.cSgCode}-${info.cSgStd}’？\n注意：因更新的数据范围较大，该操作会直接提交数据库！`,
    )
  )
    return;
  querying.value = true;
  try {
    await frmMP2033Api.updateStoveSgCodeInfo(cur, info);
    await loadCut(focusedPlan());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 件次改钢种（btnChangeSgCodeByPeice_Click：仅改当前行本地值，随保存提交） */
function onChangeSgByPiece() {
  const info = requireSg();
  if (!info || !currentCut.value) return;
  const cur = currentCut.value;
  const list = cur.cStrandNo === "N" ? leftRows.value : cur.cStrandNo === "X" ? rightRows.value : [];
  const target = list.find((x) => x.id === cur.id);
  if (target) {
    target.cSgCode = info.cSgCode;
    target.cSgStd = info.cSgStd;
    cur.cSgCode = info.cSgCode;
    cur.cSgStd = info.cSgStd;
  }
  /* 触发重绘 */
  if (cur.cStrandNo === "N") leftRows.value = [...leftRows.value];
  else rightRows.value = [...rightRows.value];
  leftApi.value?.refreshCells({ force: true });
  rightApi.value?.refreshCells({ force: true });
}

/* ---------- 挂载：注入参数 + 默认炉容量 + 钢种信息 + 钢坯宽度候选 ---------- */
async function fullWidth() {
  const param = guardParam();
  if (!param) return;
  param.widths = "";
  try {
    kgpWidthOptions.value = (await frmMP2033Api.getGPWidthInfo(param)) ?? [];
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(async () => {
  if (!menuQs) toast("界面必须配置注入参数，请联系管理员！", 3000, "warn");
  /* 默认炉容量（原 Load：GetMSConfig(LGLineDefaultStoveWgt) → cGroup==LineCode） */
  try {
    const kvList = (await publicKVApi.getMSConfig("LGLineDefaultStoveWgt")) ?? [];
    const kv = kvList.find((x) => x.cGroup === lineCode);
    if (kv?.cValue != null) {
      const v = Number(kv.cValue);
      if (!Number.isNaN(v)) speStoveWgt.value = v;
    }
  } catch {
    /* 拦截层已 toast */
  }
  /* 钢种信息下拉（原 FullSgCodeInfoItems → GetSgCodeAndStd） */
  try {
    sgList.value = (await publicQMInfoApi.getSgCodeAndStd()) ?? [];
  } catch {
    /* 拦截层已 toast */
  }
  /* 钢坯宽度候选（原 FullWidth → GetGPWidthInfo；C# 日期事件中调用被注释，此处挂载即取一次） */
  await fullWidth();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：查询条件 + 查询/生成炉次及切割计划/删除炉次及切割计划/保存（Dock.Top 单行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">销售下发时间</label>
      <DatePicker v-model="dtS" date-format="yy-mm-dd" show-icon class="shrink-0" @value-change="fullWidth" />
      <span class="shrink-0 text-xs text-muted-foreground">~</span>
      <DatePicker v-model="dtE" date-format="yy-mm-dd" show-icon class="shrink-0" @value-change="fullWidth" />
      <label class="shrink-0 text-xs text-muted-foreground">轧制产线</label>
      <Select
        v-model="cboZGLineInfo"
        :options="zgOptions"
        option-label="label"
        option-value="value"
        show-clear
        placeholder="请选择"
        class="w-36 shrink-0"
      />
      <label class="shrink-0 text-xs text-muted-foreground">计算用炉容量</label>
      <div class="w-24 shrink-0">
        <InputNumber v-model="speStoveWgt" :min="50" :max="250" :show-buttons="false" fluid />
      </div>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCreateStoveCun"
        >生成炉次及切割计划</Button
      >
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onRemoveStoveCun"
        >删除炉次及切割计划</Button
      >
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
    </div>

    <!-- stackPanel2：原 Visible=false+Enabled=false 的次级条件（textEdit1 / 计划状态 / 钢坯宽度），按原样隐藏保留 -->
    <div class="hidden">
      <div class="flex h-9 items-center gap-1 border-b border-border/60 px-2">
        <InputText v-model="textEdit1" />
        <label class="shrink-0 text-xs text-muted-foreground">计划状态</label>
        <Select
          v-model="icboPlan"
          :options="planStatusOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="全部"
          class="w-32"
        />
        <label class="shrink-0 text-xs text-muted-foreground">钢坯宽度</label>
        <MultiSelect v-model="cboKGPWidth" :options="kgpWidthOptions" placeholder="全部" class="w-56" />
      </div>
    </div>

    <!-- 上下分栏（splitterControl1 位于 gcPlan 之下）：上=计划 gvPlan（原 Dock.Top 高度≈30%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="32" :minSize="15" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="planColDefs"
            :row-data="planRows"
            :pagination="false"
            :loading="querying"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            @grid-ready="ready('plan')"
            @first-data-rendered="autoSizeOnFirstData"
            @selection-changed="onPlanSelectionChanged"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
        <!-- dataLayoutControl1：当前选定的炉次的制造命令号 / 厚度 / 宽度 / 长度 / 生产备注 / 钢种信息 -->
        <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">当前选定的炉次的制造命令号</label>
          <InputText v-model="txtCurrentStoveCutInfo" disabled class="w-40 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">厚度</label>
          <div class="w-24 shrink-0">
            <InputNumber v-model="speNThick" :min="0" :max="2000" :show-buttons="false" fluid />
          </div>
          <label class="shrink-0 text-xs text-muted-foreground">宽度</label>
          <div class="w-24 shrink-0">
            <InputNumber v-model="speNWth" :min="0" :max="5000" :show-buttons="false" fluid />
          </div>
          <label class="shrink-0 text-xs text-muted-foreground">长度</label>
          <div class="w-24 shrink-0">
            <InputNumber v-model="speNLen" :min="0" :max="20000" :show-buttons="false" fluid />
          </div>
          <label class="shrink-0 text-xs text-muted-foreground">生产备注</label>
          <InputText v-model="txtProRemark" class="w-32 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">钢种信息</label>
          <Select
            v-model="cboSgCodeInfo"
            :options="sgOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="w-56 shrink-0"
            filter
          />
        </div>

        <!-- stackPanel3：N流添加/N流删除/X流添加/X流删除/炉次改钢种/件次改钢种 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddN">N流添加</Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRemoveN">N流删除</Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddX">X流添加</Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRemoveX">X流删除</Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onChangeSgByStove">炉次改钢种</Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onChangeSgByPiece">件次改钢种</Button>
        </div>

        <!-- 左右分栏（gridSplitContainer1.Horizontal=true，各 50%）：左=N流(dataSourceLeft) ｜ 右=X流(dataSourceRight) -->
        <Splitter class="min-h-0 flex-1" layout="horizontal">
          <SplitterPanel :size="50" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="leftColDefs"
                :row-data="leftRows"
                :pagination="false"
                :loading="querying"
                :get-row-style="cutRowStyle"
                :row-selection="{ mode: 'singleRow', enableClickSelection: true }"
                @grid-ready="ready('left')"
                @first-data-rendered="autoSizeOnFirstData"
                @selection-changed="onCutSelected('N')"
                @cell-double-clicked="onCutDblClick"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :size="50" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="rightColDefs"
                :row-data="rightRows"
                :pagination="false"
                :loading="querying"
                :get-row-style="cutRowStyle"
                :row-selection="{ mode: 'singleRow', enableClickSelection: true }"
                @grid-ready="ready('right')"
                @first-data-rendered="autoSizeOnFirstData"
                @selection-changed="onCutSelected('X')"
                @cell-double-clicked="onCutDblClick"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
