<script setup lang="ts">
/** 对应 FrmMP2050（炼钢浇次计划，炼钢总厂 LG02 / 一炼钢 LG01 共享，cQueryString=LG01|LG02）：DDH.Winforms.SMP.Forms.FrmMP2050
 *  已接入：castStoveApi.getJcList（浇次查询）/ getLcListByJc（浇次焦点行→浇次炉次）/ getLcOrderList（炉次焦点行→订单）
 *          / deleteJc（删除浇次）/ downJc（下发）/ updateSort（保存顺序）/ checkJCInvalid+jCInvalid（浇次作废）
 *  事件口径：上移/下移=原 simpleButton7/8 纯前端调换 NSort；删除炉次(simpleButton5) 原 Designer 未绑 Click，按原样不挂事件
 *  待接入：机台下拉（原 UCMachine→QueryMachine，swagger 未生成）；浇次作废按钮原 Visible=false/Enabled=false，保留隐藏渲染但逻辑已接
 *  布局：stackPanel1(连铸机/状态/浇次下发时间+查询) → 左右Splitter(55/45)：左=panel1[浇次信息 gvJc + 底部工具条(下发/上移/下移/保存顺序/删除浇次/浇次作废)]
 *        ｜ 右=上下Splitter：上=浇次炉次信息 gvJcStove(20可见+26隐藏+明细gridView1) ｜ 下=订单 gvStoveOrder(8可见+11隐藏)+删除炉次条]
 *        字段=camelCase 绑定，colId=原 Designer FieldName */
import { nextTick, ref } from "vue";
import Button from "primevue/button";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconArrowDown, IconArrowUp, IconSearch, IconSend } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  ColDef,
  GetDetailRowDataParams,
  GridApi,
  GridOptions,
  GridReadyEvent,
  SelectionChangedEvent,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import {
  castStoveApi,
  type InputPlanDto,
  type Tmp2030Dto,
  type Tmp2040Dto,
  type Tmp2042,
} from "@/api/mes4ddh/smp.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery();
/** 产线编码（原 lineCode = QueryString：LG02/LG01） */
const lineCode = menuQs;

/* ---------- 查询条件（原 stackPanel1 / Load 默认值） ---------- */
function shiftDays(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}
const icboMachine = ref<string | null>(null);
/** 状态（原 icboStatus：JcStatusEnum 去首项(未组成浇次)去末项(作废) → 未下发/下发炼钢生产，默认首项） */
const icboStatus = ref<number | null>(10 /* JcStatusEnum.NoDown */);
const statusOptions = [
  { label: "未下发", value: 10 /* JcStatusEnum.NoDown */ },
  { label: "下发炼钢生产", value: 30 /* JcStatusEnum.DownLg */ },
];
const dtS = ref<Date>(shiftDays(-1));
const dtE = ref<Date>(shiftDays(7));

/* ---------- 数据与网格 ---------- */
const jcRows = ref<Tmp2030Dto[]>([]);
const jcStoveRows = ref<Tmp2040Dto[]>([]);
const stoveOrderRows = ref<Tmp2042[]>([]);
const querying = ref(false);
const jcApi = ref<GridApi | null>(null);
const jcStoveApi = ref<GridApi | null>(null);
const stoveOrderApi = ref<GridApi | null>(null);

function autofit(api: GridApi | null) {
  requestAnimationFrame(() => api?.autoSizeAllColumns());
}
function ready(key: "jc" | "jcStove" | "order") {
  return (e: GridReadyEvent) => {
    if (key === "jc") jcApi.value = e.api;
    else if (key === "jcStove") jcStoveApi.value = e.api;
    else stoveOrderApi.value = e.api;
  };
}
function rowId(params: { data: Tmp2030Dto }) {
  return String(params.data.id ?? params.data.cJcNo ?? "");
}
/** 焦点浇次（原 gvJc.GetFocusedRow） */
function focusedJc(): Tmp2030Dto | null {
  const rows = jcApi.value?.getSelectedRows() ?? [];
  return (rows[0] as Tmp2030Dto | undefined) ?? null;
}
/** 上移/下移后保持焦点在当前浇次（原 FocusedRowHandle 跟随） */
async function refocusJc(id: string | null | undefined) {
  await nextTick();
  if (!id) return;
  jcApi.value?.forEachNode((node) => {
    if (node.data?.id === id) node.setSelected(true, true);
  });
}

function fmtDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 00:00:00`;
}

/* ---------- 列 ---------- */
/** 浇次 gvJc：10 可见 + 22 隐藏（Tmp2030Dto，ViewCaption=浇次信息） */
const jcColDefs = ref<ColDef[]>([
  { colId: "CJcNo", field: "cJcNo", headerName: "浇次号", width: 90 },
  { colId: "CSgCodeStd", field: "cSgCodeStd", headerName: "钢种标准", width: 100 },
  { colId: "CCcmCode", field: "cCcmCode", headerName: "连铸", width: 90 },
  { colId: "CSlabSize", field: "cSlabSize", headerName: "断面", width: 110 },
  { colId: "NWgt", field: "nWgt", headerName: "重量", width: 90 },
  { colId: "NLsNum", field: "nLsNum", headerName: "炉数", width: 70 },
  { colId: "NSort", field: "nSort", headerName: "顺序号", width: 80 },
  { colId: "CRemark", field: "cRemark", headerName: "备注", width: 100 },
  { colId: "Creator", field: "creator", headerName: "创建人", width: 90 },
  { colId: "CreateTime", field: "createTime", headerName: "创建时间", width: 150 },
  /* 隐藏 22 列 */
  { colId: "Id", field: "id", headerName: "主键", hide: true },
  { colId: "LastModifier", field: "lastModifier", headerName: "最后修改人", hide: true },
  { colId: "LastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { colId: "NStatus", field: "nStatus", headerName: "浇次计划状态", hide: true },
  { colId: "CSgStd", field: "cSgStd", headerName: "执行标准", hide: true },
  { colId: "CSgCode", field: "cSgCode", headerName: "钢种", hide: true },
  { colId: "DJhqTime", field: "dJhqTime", headerName: "交货时间", hide: true },
  { colId: "CLev", field: "cLev", headerName: "等级", hide: true },
  { colId: "DStartTime", field: "dStartTime", headerName: "开始时间", hide: true },
  { colId: "DEndTime", field: "dEndTime", headerName: "结束时间", hide: true },
  { colId: "CRh", field: "cRh", headerName: "真空", hide: true },
  { colId: "DOrderTime", field: "dOrderTime", headerName: "订单日期", hide: true },
  { colId: "CMatType", field: "cMatType", headerName: "类型(销售坯)", hide: true },
  { colId: "NThick", field: "nThick", headerName: "厚度", hide: true },
  { colId: "NWidth", field: "nWidth", headerName: "宽度", hide: true },
  { colId: "CLen", field: "cLen", headerName: "长度", hide: true },
  { colId: "NLsMin", field: "nLsMin", headerName: "炉数最小值", hide: true },
  { colId: "NLsMax", field: "nLsMax", headerName: "炉数最大值", hide: true },
  { colId: "DDownDdTime", field: "dDownDdTime", headerName: "下发调度时间", hide: true },
  { colId: "CDownDdUser", field: "cDownDdUser", headerName: "下发调度人", hide: true },
  { colId: "DDownLgTime", field: "dDownLgTime", headerName: "下发生产时间", hide: true },
  { colId: "CDownLgUser", field: "cDownLgUser", headerName: "下发生产人", hide: true },
]);

/** 浇次炉次 gvJcStove：20 可见 + 26 隐藏（Tmp2040Dto，ViewCaption=浇次炉次信息） */
const jcStoveColDefs = ref<ColDef[]>([
  { colId: "CPlanTime", field: "cPlanTime", headerName: "计划日期", width: 110 },
  { colId: "CCcCode", field: "cCcCode", headerName: "连铸代码", width: 95 },
  { colId: "CJcNo", field: "cJcNo", headerName: "浇次号", width: 90 },
  { colId: "CSgCode", field: "cSgCode", headerName: "钢种", width: 90 },
  { colId: "CSgStd", field: "cSgStd", headerName: "执行标准", width: 120 },
  { colId: "CSpec", field: "cSpec", headerName: "规格", width: 110 },
  { colId: "NThick", field: "nThick", headerName: "厚度", width: 70 },
  { colId: "NWidth", field: "nWidth", headerName: "宽度", width: 70 },
  { colId: "CLenMx", field: "cLenMx", headerName: "长度明细", width: 100 },
  { colId: "NQua", field: "nQua", headerName: "支数", width: 70 },
  { colId: "NWgt", field: "nWgt", headerName: "重量", width: 80 },
  { colId: "NSortJc", field: "nSortJc", headerName: "浇次内炉次顺序号", width: 130 },
  { colId: "CSpecOrder", field: "cSpecOrder", headerName: "成品规格", width: 110 },
  { colId: "CRoute", field: "cRoute", headerName: "工艺路线", width: 110 },
  { colId: "CCustName", field: "cCustName", headerName: "客户名称", width: 120 },
  { colId: "CTsyq", field: "cTsyq", headerName: "特殊要求", width: 100 },
  { colId: "NLgCn", field: "nLgCn", headerName: "炼钢产能", width: 90 },
  { colId: "CRemark", field: "cRemark", headerName: "备注", width: 100 },
  { colId: "CPono", field: "cPono", headerName: "制造命令号", width: 110 },
  { colId: "CZGLineCode", field: "cZGLineCode", headerName: "轧制产线", width: 95 },
  /* 隐藏 26 列 */
  { colId: "Selected", field: "selected", headerName: "选择", hide: true },
  { colId: "Id", field: "id", headerName: "主键", hide: true },
  { colId: "Creator", field: "creator", headerName: "创建人", hide: true },
  { colId: "CreateTime", field: "createTime", headerName: "创建时间", hide: true },
  { colId: "NStatus", field: "nStatus", headerName: "状态", hide: true },
  { colId: "CJcFk", field: "cJcFk", headerName: "浇次主键", hide: true },
  { colId: "CLineCode", field: "cLineCode", headerName: "产线", hide: true },
  { colId: "CStove", field: "cStove", headerName: "炉号", hide: true },
  { colId: "NLen", field: "nLen", headerName: "长度", hide: true },
  { colId: "NSort", field: "nSort", headerName: "顺序号", hide: true },
  { colId: "CMatCode", field: "cMatCode", headerName: "钢坯物料号", hide: true },
  { colId: "CMatName", field: "cMatName", headerName: "钢坯物料名称", hide: true },
  { colId: "CRhCode", field: "cRhCode", headerName: "真空代码", hide: true },
  { colId: "CLfCode", field: "cLfCode", headerName: "精炼代码", hide: true },
  { colId: "CLdCode", field: "cLdCode", headerName: "转炉代码", hide: true },
  { colId: "COrderNo", field: "cOrderNo", headerName: "订单号", hide: true },
  { colId: "CIsZb", field: "cIsZb", headerName: "是否备坯计划", hide: true },
  { colId: "DUseTime", field: "dUseTime", headerName: "可用时间", hide: true },
  { colId: "DJhqTime", field: "dJhqTime", headerName: "交货期", hide: true },
  { colId: "CSgCodeStd", field: "cSgCodeStd", headerName: "钢种标准", hide: true },
  { colId: "CStNo", field: "cStNo", headerName: "炼钢工艺卡", hide: true },
  { colId: "DDownDdTime", field: "dDownDdTime", headerName: "下发调度时间", hide: true },
  { colId: "CDownDdUser", field: "cDownDdUser", headerName: "下发调度人", hide: true },
  { colId: "DDownLgsc", field: "dDownLgsc", headerName: "下发生产时间", hide: true },
  { colId: "CDownLgscUser", field: "cDownLgscUser", headerName: "下发人", hide: true },
  { colId: "NWgtMeter", field: "nWgtMeter", headerName: "单量", hide: true },
]);

/** 炉次订单 gvStoveOrder：8 可见 + 11 隐藏（Tmp2042Dto） */
const stoveOrderColDefs = ref<ColDef[]>([
  { colId: "COrderNo", field: "cOrderNo", headerName: "订单号", width: 130 },
  { colId: "CSgCode", field: "cSgCode", headerName: "钢种", width: 90 },
  { colId: "CSgStd", field: "cSgStd", headerName: "标准", width: 120 },
  { colId: "NQua", field: "nQua", headerName: "支数", width: 70 },
  { colId: "NSlabLen", field: "nSlabLen", headerName: "钢坯长度", width: 90 },
  { colId: "CSlabSize", field: "cSlabSize", headerName: "坯料规格", width: 120 },
  { colId: "NWgtPlan", field: "nWgtPlan", headerName: "炉次计划重量", width: 110 },
  { colId: "CSpec", field: "cSpec", headerName: "成品规格", width: 110 },
  /* 隐藏 11 列 */
  { colId: "Id", field: "id", headerName: "主键", hide: true },
  { colId: "Creator", field: "creator", headerName: "创建人", hide: true },
  { colId: "CreateTime", field: "createTime", headerName: "创建时间", hide: true },
  { colId: "LastModifier", field: "lastModifier", headerName: "最后修改人", hide: true },
  { colId: "LastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { colId: "NStatus", field: "nStatus", headerName: "订单状态", hide: true },
  { colId: "CLcFk", field: "cLcFk", headerName: "炉次主键", hide: true },
  { colId: "CCcmCode", field: "cCcmCode", headerName: "连铸代码", hide: true },
  { colId: "NWgtOrder", field: "nWgtOrder", headerName: "订单重量", hide: true },
  { colId: "NSlabThick", field: "nSlabThick", headerName: "钢坯厚度", hide: true },
  { colId: "NSlabWidth", field: "nSlabWidth", headerName: "钢坯宽度", hide: true },
]);

/* 明细行（原 gcJcStove LevelTemplate=gridView1，RelationName=_tmp2041Dtos：20 可见 + 21 隐藏） */
type StoveRow = Tmp2040Dto & { _tmp2041Dtos?: Record<string, unknown>[] };
const stoveDetailColDefs: ColDef[] = [
  { colId: "CPono", field: "cPono", headerName: "制造命令号", width: 110 },
  { colId: "CStrandNo", field: "cStrandNo", headerName: "流号", width: 70 },
  { colId: "NStrandNoSeq", field: "nStrandNoSeq", headerName: "炉次流号顺序号", width: 120 },
  { colId: "CSgStd", field: "cSgStd", headerName: "执行标准", width: 120 },
  { colId: "CSgCode", field: "cSgCode", headerName: "钢种", width: 90 },
  { colId: "CSpec", field: "cSpec", headerName: "规格", width: 110 },
  { colId: "NThick", field: "nThick", headerName: "厚度", width: 70 },
  { colId: "NWidth", field: "nWidth", headerName: "宽度", width: 70 },
  { colId: "NLen", field: "nLen", headerName: "长度", width: 70 },
  { colId: "NWgt", field: "nWgt", headerName: "重量", width: 80 },
  { colId: "COrderNo", field: "cOrderNo", headerName: "订单号", width: 130 },
  { colId: "CSgCodeStd", field: "cSgCodeStd", headerName: "钢种标准", width: 100 },
  { colId: "NIndex", field: "nIndex", headerName: "炉次计划产出件次序号", width: 150 },
  { colId: "CSpecZg", field: "cSpecZg", headerName: "轧制规格", width: 110 },
  { colId: "NThickZg", field: "nThickZg", headerName: "轧制厚度", width: 90 },
  { colId: "NWidthZg", field: "nWidthZg", headerName: "轧制宽度", width: 90 },
  { colId: "NLenZg", field: "nLenZg", headerName: "轧制长度", width: 90 },
  { colId: "CDelFlag", field: "cDelFlag", headerName: "删除标识", width: 90 },
  { colId: "Creator", field: "creator", headerName: "创建人", width: 90 },
  { colId: "CreateTime", field: "createTime", headerName: "创建时间", width: 150 },
  /* 隐藏 21 列 */
  { colId: "Id", field: "id", headerName: "主键", hide: true },
  { colId: "CStovePlanId", field: "cStovePlanId", headerName: "炉次计划id", hide: true },
  { colId: "CLineCode", field: "cLineCode", headerName: "产线", hide: true },
  { colId: "CStove", field: "cStove", headerName: "炉号", hide: true },
  { colId: "CPieceNo", field: "cPieceNo", headerName: "头侧件次号", hide: true },
  { colId: "CPrintCode", field: "cPrintCode", headerName: "喷号", hide: true },
  { colId: "CMatCode", field: "cMatCode", headerName: "钢坯物料号", hide: true },
  { colId: "CMatName", field: "cMatName", headerName: "钢坯物料名称", hide: true },
  { colId: "CStNo", field: "cStNo", headerName: "炼钢工艺卡", hide: true },
  { colId: "CBackup", field: "cBackup", headerName: "备注", hide: true },
  { colId: "CTimestamp", field: "cTimestamp", headerName: "时间戳", hide: true },
  { colId: "CSw01", field: "cSw01", headerName: "备用字段1", hide: true },
  { colId: "CSw02", field: "cSw02", headerName: "备用字段2", hide: true },
  { colId: "CSw03", field: "cSw03", headerName: "备用字段3", hide: true },
  { colId: "CSw04", field: "cSw04", headerName: "备用字段4", hide: true },
  { colId: "CSw05", field: "cSw05", headerName: "备用字段5", hide: true },
  { colId: "CSw06", field: "cSw06", headerName: "备用字段6", hide: true },
  { colId: "Selected", field: "selected", headerName: "选择", hide: true },
  { colId: "CEnable", field: "cEnable", headerName: "启用", hide: true },
  { colId: "LastModifier", field: "lastModifier", headerName: "最后修改人", hide: true },
  { colId: "LastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", hide: true },
];
const stoveDetailOptions: GridOptions = {
  columnDefs: stoveDetailColDefs,
  defaultColDef: hmxDefaultColDef,
  theme: theme.value,
  localeText: AG_GRID_LOCALE_CN,
  pagination: false,
};
function getStoveDetailRows(params: GetDetailRowDataParams<StoveRow>) {
  params.successCallback([...((params.data?._tmp2041Dtos ?? []) as Record<string, unknown>[])]);
}

/* ---------- 查询（原 GetJcList → 焦点联动 GetLcListByJc → GetLcOrderList） ---------- */
async function onQuery() {
  querying.value = true;
  try {
    const input: InputPlanDto = {
      dTimeStart: fmtDate(dtS.value),
      dTimeEnd: fmtDate(dtE.value),
      jcStatus: (icboStatus.value ?? null) as number | null,
      cLineCode: lineCode,
      cCcmCode: icboMachine.value ?? null,
    };
    jcRows.value = (await castStoveApi.getJcList(input)) ?? [];
    autofit(jcApi.value);
    /* 原 GetJcList 尾部 gvJc_FocusedRowObjectChanged(null,null) */
    await loadJcStoves(jcRows.value[0]?.cJcNo ?? null);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

async function loadJcStoves(jcNo: string | null | undefined) {
  try {
    jcStoveRows.value = jcNo ? ((await castStoveApi.getLcListByJc(jcNo)) ?? []) : [];
    autofit(jcStoveApi.value);
    /* 焦点炉次联动订单（原 gvJcStove_FocusedRowObjectChanged → GetLcOrderList） */
    await loadLcOrders(jcStoveRows.value[0]?.id ?? null);
  } catch {
    /* 拦截层已 toast */
  }
}
function onJcSelectionChanged(_e: SelectionChangedEvent) {
  void loadJcStoves(focusedJc()?.cJcNo);
}

async function loadLcOrders(lcId: string | null | undefined) {
  try {
    stoveOrderRows.value = lcId ? ((await castStoveApi.getLcOrderList(lcId)) ?? []) : [];
    autofit(stoveOrderApi.value);
  } catch {
    /* 拦截层已 toast */
  }
}
function onJcStoveSelectionChanged() {
  const rows = jcStoveApi.value?.getSelectedRows() ?? [];
  void loadLcOrders((rows[0] as Tmp2040Dto | undefined)?.id);
}

/* ---------- 按钮逻辑（原事件逐条，中文提示照抄） ---------- */
/** 下发（simpleButton10_Click → DownJc） */
async function onDownJc() {
  const row = focusedJc();
  if (!row) {
    toast("没有选择下发的浇次！", 2500, "warn");
    return;
  }
  if (!window.confirm("是否确认下发浇次？")) return;
  try {
    await castStoveApi.downJc(row.id!);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

/** 上移（simpleButton7_Click：纯前端调换 NSort，保存顺序时才提交） */
async function onMoveUp() {
  const cur = focusedJc();
  if (!cur) {
    toast("没有选择需要上调的浇次！", 2500, "warn");
    return;
  }
  const curSort = Number(cur.nSort ?? 0);
  const lstUp = jcRows.value.filter((x) => Number(x.nSort ?? 0) <= curSort - 1);
  const lstDown = jcRows.value.filter((x) => Number(x.nSort ?? 0) > curSort);
  const prev = lstUp[lstUp.length - 1];
  if (!prev) {
    toast("无法上调！", 2500, "warn");
    return;
  }
  const tmp = cur.nSort;
  cur.nSort = prev.nSort;
  prev.nSort = tmp;
  const rest = lstUp.filter((x) => x !== prev);
  jcRows.value = [...rest, cur, prev, ...lstDown];
  await refocusJc(cur.id);
}

/** 下移（simpleButton8_Click：纯前端调换 NSort） */
async function onMoveDown() {
  const cur = focusedJc();
  if (!cur) {
    toast("没有选择需要下调的浇次！", 2500, "warn");
    return;
  }
  const curSort = Number(cur.nSort ?? 0);
  const lstUp = jcRows.value.filter((x) => Number(x.nSort ?? 0) < curSort);
  const lstDown = jcRows.value.filter((x) => Number(x.nSort ?? 0) >= curSort + 1);
  const next = lstDown[0];
  if (!next) {
    toast("无法下调！", 2500, "warn");
    return;
  }
  const tmp = cur.nSort;
  cur.nSort = next.nSort;
  next.nSort = tmp;
  const rest = lstDown.filter((x) => x !== next);
  jcRows.value = [...lstUp, next, cur, ...rest];
  await refocusJc(cur.id);
}

/** 保存顺序（simpleButton2_Click → UpdateSort：整表回传） */
async function onSaveSort() {
  if (!jcRows.value.length) {
    toast("没有选择需要保存顺序的浇次！", 2500, "warn");
    return;
  }
  if (!window.confirm("是否确认对调整的顺序进行保存？")) return;
  try {
    await castStoveApi.updateSort(jcRows.value);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

/** 删除浇次（simpleButton9_Click → DeleteJc） */
async function onDeleteJc() {
  const row = focusedJc();
  if (!row) {
    toast("没有选择需要删除的浇次计划！", 2500, "warn");
    return;
  }
  if (!window.confirm(`是否确认删除浇次号${row.cJcNo}的浇次计划？`)) return;
  try {
    await castStoveApi.deleteJc(row.id!);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

/** 浇次作废（btnJCInvalid_Click：CheckJCInvalid → 确认 → JCInvalid；原 Visible=false/Enabled=false，隐藏渲染） */
async function onJcInvalid() {
  const row = focusedJc();
  if (!row) {
    toast("请选择需要作废的已下发炼钢生产的浇次计划！", 2500, "warn");
    return;
  }
  try {
    await castStoveApi.checkJCInvalid(row.id!);
  } catch {
    /* 拦截层已 toast（校验不通过到此为止） */
    return;
  }
  const yes = window.confirm(
    `确定要作废已下发炼钢生产的浇次号为‘${row.cJcNo}’的浇次计划？\n注意：1、浇次计划作废后不可撤销！请谨慎操作！\n2、仅作废还未进行生产的浇次计划中的炉次计划，已经生产的炉次计划不会作废！`,
  );
  if (!yes) return;
  try {
    await castStoveApi.jCInvalid(row.id!);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}
/* 删除炉次（stackPanel3 simpleButton5）：原 Designer 未绑 Click 事件，按原样保留按钮不挂处理器 */
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：连铸机/状态/浇次下发时间 + 查询（Dock.Top 单行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">连铸机</label>
      <Select v-model="icboMachine" :options="[]" show-clear placeholder="请选择" class="w-36 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">状态</label>
      <Select
        v-model="icboStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        show-clear
        placeholder="全部"
        class="w-36 shrink-0"
      />
      <label class="shrink-0 text-xs text-muted-foreground">浇次下发时间</label>
      <DatePicker v-model="dtS" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <span class="shrink-0 text-xs text-muted-foreground">~</span>
      <DatePicker v-model="dtE" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 左右分栏（splitterControl1，panel1 Dock.Left≈537/969） -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <SplitterPanel :size="55" :minSize="30" class="flex flex-col overflow-hidden">
        <!-- 左：浇次信息 gcJc（Dock.Fill） + 底部工具条 stackPanel2（Dock.Bottom） -->
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">浇次信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="jcColDefs"
            :row-data="jcRows"
            :pagination="false"
            :loading="querying"
            :get-row-id="rowId"
            :row-selection="{ mode: 'singleRow', enableClickSelection: true }"
            @grid-ready="ready('jc')"
            @first-data-rendered="autoSizeOnFirstData"
            @selection-changed="onJcSelectionChanged"
          />
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-t border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDownJc">
            <IconSend class="h-3 w-3" />下发
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onMoveUp">
            <IconArrowUp class="h-3 w-3" />上移
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onMoveDown">
            <IconArrowDown class="h-3 w-3" />下移
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSaveSort">保存顺序</Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteJc"
            >删除浇次</Button
          >
          <!-- 原 btnJCVisible=false/Enabled=false：按原样隐藏保留，逻辑已接 onJcInvalid -->
          <Button variant="outlined" severity="danger" class="hidden whitespace-nowrap" @click="onJcInvalid"
            >浇次作废</Button
          >
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
        <!-- 右：上下分栏（gcJcStove Fill / splitterControl2 Bottom / gcStoveOrder Bottom / stackPanel3 Bottom） -->
        <Splitter class="min-h-0 flex-1" layout="vertical">
          <SplitterPanel :size="48" :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">浇次炉次信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="jcStoveColDefs"
                :row-data="jcStoveRows"
                :pagination="false"
                :loading="querying"
                :master-detail="true"
                :detail-grid-options="stoveDetailOptions"
                :get-detail-row-data="getStoveDetailRows"
                :row-selection="{ mode: 'singleRow', enableClickSelection: true }"
                @grid-ready="ready('jcStove')"
                @first-data-rendered="autoSizeOnFirstData"
                @selection-changed="onJcStoveSelectionChanged"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
            <!-- 订单 gcStoveOrder（无 ViewCaption） -->
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="stoveOrderColDefs"
                :row-data="stoveOrderRows"
                :pagination="false"
                @grid-ready="ready('order')"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
            <!-- stackPanel3：删除炉次（原未绑事件，按钮按元素保留） -->
            <div class="flex h-9 shrink-0 items-center gap-1 border-t border-border/60 px-2">
              <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap">删除炉次</Button>
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
