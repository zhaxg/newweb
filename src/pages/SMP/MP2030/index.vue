<script setup lang="ts">
/** 对应 FrmMP2030（炼钢计划排产，炼钢总厂 LG02 / 一炼钢 LG01 共享，cQueryString 为 JSON {LineCode,ZGLineCodeInfo}）：DDH.Winforms.SMP.Forms.FrmMP2030
 *  已接入：castStoveApi.getSlabOrderList（计划查询 GetOrderList）/ getLcList（炉次查询）/ deleteLc（删除炉次）
 *          / addLc（生成炉次·简单按钮 simpleButton9）/ getLcOrderList（炉次焦点行→订单列表）
 *  二次口径：cQueryString 经 useMenuQuery().json 注入 LineCode 与轧制产线候选（"ZG01-中厚板" 拆值/文案）
 *  待接入：机台下拉（原 UCMachine→ITpa1000AppService.QueryMachine，swagger 未生成，禁改 src/api 暂留空候选）
 *          二级弹窗 FrmMP2031 / FrmMP2032（占位）；castStove 查询类端点 mock 未注册（禁改 src/mock）
 *  布局：stackPanel1 查询条(日期/钢种/计划状态/轧制产线+查询/生成炉次/自动生成炉次) → 上下Splitter：
 *        上=计划 gcPlan(gvPlan 18可见+4隐藏) ｜ 下=panel1[stackPanel2: 连铸机+查询+删除；stackPanel3(原Visible=false): 连铸机/炉数/每炉支数/每炉重量+生成炉次 → 左右Splitter：左=炉次 gvStove(29可见+16隐藏+明细gridView1) ｜ 右=订单 gvStoveOrder(8可见+11隐藏)]
 *        字段=camelCase 绑定接口数据，colId=原 Designer FieldName 便于对照 */
import { computed, onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetDetailRowDataParams, GridApi, GridOptions, GridReadyEvent, RowClickedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { castStoveApi, LgProdStatusEnum, OrderReviewEnum, type InputPlanDto, type InputTmp2010Dto, type SlabPcDto, type Tmp2040Dto, type Tmp2042 } from "@/api/mes4ddh/smp.swagger";

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
const txtGz = ref("");
/** 计划状态（原 icboPlan，LgProdStatusEnum：0=未排完 20=已排完，默认第 0 项） */
const icboPlan = ref<number | null>(LgProdStatusEnum.NoPlan);
const planOptions = [
  { label: "未排完", value: LgProdStatusEnum.NoPlan },
  { label: "已排完", value: LgProdStatusEnum.Finish },
];
const cboZGLineInfo = ref<string | null>(zgOptions[0]?.value ?? null);
/** 连铸机（原 stackPanel2 icboMachineQuery / stackPanel3 icboMachineAdd，候选待接入） */
const icboMachineQuery = ref<string | null>(null);
const icboMachineAdd = ref<string | null>(null);
/** 炉数 / 每炉支数 / 每炉重量（原 stackPanel3，Visible=false 面板内 SpinEdit） */
const spinLs = ref<number | null>(null);
const spinZs = ref<number | null>(null);
const spinWgt = ref<number | null>(null);

/** 生成炉次/自动生成炉次：仅「未排完」可点（原 icboPlan_EditValueChanged 控制 Enabled） */
const genEnabled = computed(() => icboPlan.value === LgProdStatusEnum.NoPlan);

/* ---------- 数据与网格 ---------- */
const planRows = ref<SlabPcDto[]>([]);
const stoveRows = ref<Tmp2040Dto[]>([]);
const stoveOrderRows = ref<Tmp2042[]>([]);
const querying = ref(false);
const planApi = ref<GridApi | null>(null);
const stoveApi = ref<GridApi | null>(null);
const stoveOrderApi = ref<GridApi | null>(null);

/** 日期 → 原 C# DateTime 序列化串 */
function fmtDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 00:00:00`;
}
function autofit(api: GridApi | null) {
  requestAnimationFrame(() => api?.autoSizeAllColumns());
}
function ready(key: "plan" | "stove" | "order") {
  return (e: GridReadyEvent) => {
    if (key === "plan") planApi.value = e.api;
    else if (key === "stove") stoveApi.value = e.api;
    else stoveOrderApi.value = e.api;
  };
}
/** 勾选 = 原 Selected 转移标记列（agCheckboxCellRenderer，行选择由该列承担） */
function selectedStoves(): Tmp2040Dto[] {
  return stoveRows.value.filter((x) => x.selected);
}
function selectedPlans(): SlabPcDto[] {
  return planRows.value.filter((x) => x.selected);
}

/* ---------- 列（按 extract：camelCase 绑定 / colId=原 FieldName） ---------- */
const planColDefs = ref<ColDef[]>([
  { colId: "Selected", field: "selected", headerName: "选择", width: 60, minWidth: 60, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false, filter: false },
  { colId: "NOrder", field: "nOrder", headerName: "生产顺序", width: 90 },
  { colId: "CPlanTime", field: "cPlanTime", headerName: "计划日期", width: 110 },
  { colId: "COrderNo", field: "cOrderNo", headerName: "订单号", width: 130 },
  { colId: "CSgCode", field: "cSgCode", headerName: "钢种", width: 90 },
  { colId: "CSgStd", field: "cSgStd", headerName: "执行标准", width: 120 },
  { colId: "CSteelType", field: "cSteelType", headerName: "钢类", width: 80 },
  { colId: "CSpec", field: "cSpec", headerName: "坯料规格", width: 120 },
  { colId: "NSlabThick", field: "nSlabThick", headerName: "钢坯厚度", width: 90 },
  { colId: "NSlabWidth", field: "nSlabWidth", headerName: "钢坯宽度", width: 90 },
  { colId: "NSlabLenMin", field: "nSlabLenMin", headerName: "钢坯长度", width: 90 },
  { colId: "NSlabQua", field: "nSlabQua", headerName: "钢坯支数", width: 90 },
  { colId: "NSlabWgt", field: "nSlabWgt", headerName: "坯料重量", width: 95 },
  { colId: "NSlabWgtSy", field: "nSlabWgtSy", headerName: "坯料剩余重量", width: 110 },
  { colId: "CSpecOrder", field: "cSpecOrder", headerName: "成品规格", width: 110 },
  { colId: "CZGLineCode", field: "cZGLineCode", headerName: "轧制产线", width: 95 },
  { colId: "CreateTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "Creator", field: "creator", headerName: "创建人", width: 90 },
  /* 隐藏列（原 Visible=false / 未排 VisibleIndex） */
  { colId: "CCcmCode", field: "cCcmCode", headerName: "连铸机编码", hide: true },
  { colId: "NSlabLenMax", field: "nSlabLenMax", headerName: "钢坯长度最大值", hide: true },
  { colId: "_thr2000Id", field: "_thr2000Id", headerName: "轧钢日计划id", hide: true },
  { colId: "Tmp2010Id", field: "tmp2010Id", headerName: "生产订单id", hide: true },
]);

const stoveColDefs = ref<ColDef[]>([
  { colId: "CPono", field: "cPono", headerName: "制造命令号", width: 110 },
  { colId: "Selected", field: "selected", headerName: "选择", width: 60, minWidth: 60, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false, filter: false },
  { colId: "CPlanTime", field: "cPlanTime", headerName: "计划日期", width: 110 },
  { colId: "NStatus", field: "nStatus", headerName: "状态", width: 80 },
  { colId: "CCcCode", field: "cCcCode", headerName: "连铸代码", width: 95 },
  { colId: "CJcNo", field: "cJcNo", headerName: "浇次号", width: 90 },
  { colId: "CLineCode", field: "cLineCode", headerName: "产线", width: 80 },
  { colId: "CStove", field: "cStove", headerName: "炉号", width: 80 },
  { colId: "CSgCode", field: "cSgCode", headerName: "钢种", width: 90 },
  { colId: "CSgStd", field: "cSgStd", headerName: "执行标准", width: 120 },
  { colId: "CSpec", field: "cSpec", headerName: "规格", width: 110 },
  { colId: "NThick", field: "nThick", headerName: "厚度", width: 70 },
  { colId: "NWidth", field: "nWidth", headerName: "宽度", width: 70 },
  { colId: "NLen", field: "nLen", headerName: "长度", width: 70 },
  { colId: "NWgt", field: "nWgt", headerName: "重量", width: 80 },
  { colId: "NSort", field: "nSort", headerName: "顺序号", width: 80 },
  { colId: "CSpecOrder", field: "cSpecOrder", headerName: "成品规格", width: 110 },
  { colId: "NSortJc", field: "nSortJc", headerName: "浇次内炉次顺序号", width: 130 },
  { colId: "CMatCode", field: "cMatCode", headerName: "钢坯物料号", width: 110 },
  { colId: "CMatName", field: "cMatName", headerName: "钢坯物料名称", width: 130 },
  { colId: "COrderNo", field: "cOrderNo", headerName: "订单号", width: 130 },
  { colId: "CRoute", field: "cRoute", headerName: "工艺路线", width: 110 },
  { colId: "DJhqTime", field: "dJhqTime", headerName: "交货期", width: 110 },
  { colId: "CCustName", field: "cCustName", headerName: "客户名称", width: 120 },
  { colId: "CZGLineCode", field: "cZGLineCode", headerName: "轧制产线", width: 95 },
  { colId: "CRemark", field: "cRemark", headerName: "备注", width: 100 },
  { colId: "NWgtMeter", field: "nWgtMeter", headerName: "单量", width: 80 },
  { colId: "Creator", field: "creator", headerName: "创建人", width: 90 },
  { colId: "CreateTime", field: "createTime", headerName: "创建时间", width: 150 },
  /* 隐藏 16 列 */
  { colId: "Id", field: "id", headerName: "主键", hide: true },
  { colId: "CJcFk", field: "cJcFk", headerName: "浇次主键", hide: true },
  { colId: "CRhCode", field: "cRhCode", headerName: "真空代码", hide: true },
  { colId: "CLfCode", field: "cLfCode", headerName: "精炼代码", hide: true },
  { colId: "CLdCode", field: "cLdCode", headerName: "转炉代码", hide: true },
  { colId: "CIsZb", field: "cIsZb", headerName: "是否备坯计划", hide: true },
  { colId: "DUseTime", field: "dUseTime", headerName: "可用时间", hide: true },
  { colId: "CTsyq", field: "cTsyq", headerName: "特殊要求", hide: true },
  { colId: "NLgCn", field: "nLgCn", headerName: "炼钢产能", hide: true },
  { colId: "CLenMx", field: "cLenMx", headerName: "长度明细", hide: true },
  { colId: "CSgCodeStd", field: "cSgCodeStd", headerName: "钢种标准", hide: true },
  { colId: "CStNo", field: "cStNo", headerName: "炼钢工艺卡", hide: true },
  { colId: "DDownDdTime", field: "dDownDdTime", headerName: "下发调度时间", hide: true },
  { colId: "CDownDdUser", field: "cDownDdUser", headerName: "下发调度人", hide: true },
  { colId: "DDownLgsc", field: "dDownLgsc", headerName: "下发生产时间", hide: true },
  { colId: "CDownLgscUser", field: "cDownLgscUser", headerName: "下发人", hide: true },
]);

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

/* 明细行（原 gcStove LevelTemplate=gridView1，RelationName=_tmp2041Dtos：20 可见 + 21 隐藏） */
type StoveRow = Tmp2040Dto & { _tmp2041Dtos?: Record<string, unknown>[] };
const stoveDetailColDefs: ColDef[] = [
  { colId: "CPono", field: "cPono", headerName: "制造命令号", width: 110 },
  { colId: "CSgCode", field: "cSgCode", headerName: "钢种", width: 90 },
  { colId: "CSgStd", field: "cSgStd", headerName: "执行标准", width: 120 },
  { colId: "CStrandNo", field: "cStrandNo", headerName: "流号", width: 70 },
  { colId: "NStrandNoSeq", field: "nStrandNoSeq", headerName: "炉次流号顺序号", width: 120 },
  { colId: "COrderNo", field: "cOrderNo", headerName: "订单号", width: 130 },
  { colId: "NThick", field: "nThick", headerName: "厚度", width: 70 },
  { colId: "NWidth", field: "nWidth", headerName: "宽度", width: 70 },
  { colId: "NLen", field: "nLen", headerName: "长度", width: 70 },
  { colId: "NWgt", field: "nWgt", headerName: "重量", width: 80 },
  { colId: "CSpec", field: "cSpec", headerName: "规格", width: 110 },
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

/* ---------- 查询（原 GetOrderList / GetLcList） ---------- */
/** stackPanel1 查询：计划列表（simpleButton6_Click → GetOrderList） */
async function queryPlan() {
  const zgLineCode = cboZGLineInfo.value;
  if (!zgLineCode) {
    toast("轧制产线不得为空！", 2500, "warn");
    return;
  }
  querying.value = true;
  try {
    const input: InputTmp2010Dto = {
      dTimeStart: fmtDate(dtS.value),
      dTimeEnd: fmtDate(dtE.value),
      cSgCode: txtGz.value.trim() || null,
      cLineCode: zgLineCode,
      nReviewStatus: OrderReviewEnum.YesReview,
      lgPlanStatus: (icboPlan.value ?? null) as LgProdStatusEnum | null,
    };
    planRows.value = (await castStoveApi.getSlabOrderList(input)) ?? [];
    autofit(planApi.value);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** stackPanel2 查询：未组浇次的炉次列表（simpleButton1_Click → GetLcList） */
async function queryLc() {
  querying.value = true;
  try {
    const input: InputPlanDto = {
      cLineCode: lineCode,
      jcStatus: 0 /* JcStatusEnum.NoJc 未组成浇次 */,
      cCcmCode: icboMachineQuery.value ?? null,
    };
    stoveRows.value = (await castStoveApi.getLcList(input)) ?? [];
    autofit(stoveApi.value);
    /* 焦点行变化联动：第一行的订单（原 FocusedRowObjectChanged） */
    await loadLcOrders(stoveRows.value[0]?.id ?? null);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

async function refreshAll() {
  await queryPlan();
  await queryLc();
}

/** 炉次焦点行 → 订单列表（原 gvStove_FocusedRowObjectChanged → GetLcOrderList） */
async function loadLcOrders(lcId: string | null | undefined) {
  try {
    stoveOrderRows.value = lcId ? ((await castStoveApi.getLcOrderList(lcId)) ?? []) : [];
    autofit(stoveOrderApi.value);
  } catch {
    /* 拦截层已 toast */
  }
}
function onStoveRowClicked(e: RowClickedEvent<Tmp2040Dto>) {
  void loadLcOrders(e.data?.id);
}

/** stackPanel2 删除（simpleButton4_Click → DeleteLc，选中=Selected 列） */
async function onDeleteLc() {
  const ids = selectedStoves().map((x) => x.id).filter(Boolean) as string[];
  if (!ids.length) {
    toast("没有选择需要删除的炉次！", 2500, "warn");
    return;
  }
  if (!window.confirm("是否确认删除已选中的炉次？")) return;
  try {
    await castStoveApi.deleteLc(ids);
    await refreshAll();
  } catch {
    /* 拦截层已 toast */
  }
}

/** 计划前置校验（原 生成炉次/自动生成炉次 共用分支），返回选中计划 */
function requireSinglePlan(): SlabPcDto[] | null {
  const list = selectedPlans();
  if (!list.length) {
    toast("没有选择需要生成炉次的计划！", 2500, "warn");
    return null;
  }
  if (list.length > 1) {
    toast("只能选择一条计划生成炉次！", 2500, "warn");
    return null;
  }
  return list;
}
function requireSameSection(list: SlabPcDto[]): boolean {
  const num = new Set(list.map((x) => `${x.nSlabThick}_${x.nSlabWidth}`)).size;
  if (num > 1) {
    toast("不同断面，不能一起组炉！", 2500, "warn");
    return false;
  }
  return true;
}

/** stackPanel1 生成炉次（simpleButton2_Click → FrmMP2031 弹窗占位 → 双查刷新） */
async function onGenerate() {
  const list = requireSinglePlan();
  if (!list) return;
  if (!requireSameSection(list)) return;
  if (!cboZGLineInfo.value) {
    toast("轧制产线不得为空！", 2500, "warn");
    return;
  }
  toast("生成炉次弹窗 FrmMP2031 待接入（原 ShowDialog 占位）", 2500, "warn");
  await refreshAll();
}

/** stackPanel1 自动生成炉次（btnAutoCreateStove_Click → FrmMP2032 弹窗占位 → 双查刷新） */
async function onAutoGenerate() {
  const list = requireSinglePlan();
  if (!list) return;
  if (!requireSameSection(list)) return;
  toast("自动生成炉次弹窗 FrmMP2032 待接入（原 ShowDialog 占位）", 2500, "warn");
  await refreshAll();
}

/** stackPanel3 生成炉次（simpleButton9_Click → AddLc；原面板 Visible=false，保留隐藏渲染） */
async function onAddLc() {
  const list = selectedPlans();
  if (!list.length) {
    toast("没有选择需要生成炉次的计划！", 2500, "warn");
    return;
  }
  if (!icboMachineAdd.value) {
    toast("请选择需要排产的连铸机！", 2500, "warn");
    return;
  }
  if (!spinLs.value || spinLs.value <= 0) {
    toast("请输入正确的炉数", 2500, "warn");
    return;
  }
  if (!spinZs.value || spinZs.value <= 0) {
    toast("请输入正确的支数", 2500, "warn");
    return;
  }
  if (!spinWgt.value || spinWgt.value <= 0) {
    toast("请输入正确的炉次重量", 2500, "warn");
    return;
  }
  const machine = icboMachineAdd.value;
  if (!window.confirm(`是否确认给${machine}添加${spinLs.value}炉炉次计划？`)) return;
  try {
    await castStoveApi.addLc(machine, spinLs.value, spinWgt.value, spinZs.value, list);
    await refreshAll();
    toast("炉次生成成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

/** 计划状态切换（原 icboPlan_EditValueChanged：控 Enabled + 重查计划） */
function onPlanStatusChange() {
  void queryPlan();
}
/** 轧制产线切换（原 cboZGLineInfo_EditValueChanged → 重查计划） */
function onZgLineChange() {
  void queryPlan();
}

onMounted(() => {
  if (!menuQs) toast("界面必须配置注入参数，请联系管理员！", 3000, "warn");
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：查询条件 + 查询/生成炉次/自动生成炉次（Dock.Top 单行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">销售下发时间</label>
      <DatePicker v-model="dtS" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <span class="shrink-0 text-xs text-muted-foreground">~</span>
      <DatePicker v-model="dtE" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">钢种</label>
      <InputText v-model="txtGz" class="w-28 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">计划状态</label>
      <Select v-model="icboPlan" :options="planOptions" option-label="label" option-value="value" show-clear
        placeholder="全部" class="w-28 shrink-0" @value-change="onPlanStatusChange" />
      <label class="shrink-0 text-xs text-muted-foreground">轧制产线</label>
      <Select v-model="cboZGLineInfo" :options="zgOptions" option-label="label" option-value="value" show-clear
        placeholder="请选择" class="w-32 shrink-0" @value-change="onZgLineChange" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="queryPlan">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="!genEnabled" @click="onGenerate">生成炉次</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :disabled="!genEnabled" @click="onAutoGenerate">自动生成炉次</Button>
    </div>

    <!-- stackPanel4：原 Visible=false 的「占位控件」标签，按原样隐藏保留 -->
    <div class="hidden">
      <label class="text-xs text-muted-foreground">占位控件</label>
    </div>

    <!-- 上下分栏：上=计划 gcPlan（原 Dock.Fill+splitterControl1.Bottom）；下=panel1 -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="40" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="planColDefs" :row-data="planRows" :pagination="false"
            :loading="querying" @grid-ready="ready('plan')" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
        <!-- stackPanel2：连铸机 + 查询/删除（panel1 内 Dock.Top） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">连铸机</label>
          <Select v-model="icboMachineQuery" :options="[]" show-clear placeholder="请选择" class="w-40 shrink-0" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="queryLc">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteLc">删除</Button>
        </div>

        <!-- stackPanel3：原 Visible=false 的生成炉次参数条（连铸机/炉数/每炉支数/每炉重量/生成炉次），按原样隐藏保留 -->
        <div class="hidden">
          <div class="flex h-9 items-center gap-1 border-b border-border/60 px-2">
            <label class="shrink-0 text-xs text-muted-foreground">连铸机</label>
            <Select v-model="icboMachineAdd" :options="[]" show-clear placeholder="请选择" class="w-40 shrink-0" />
            <label class="shrink-0 text-xs text-muted-foreground">炉数</label>
            <div class="w-24 shrink-0">
              <InputNumber v-model="spinLs" :min="0" :show-buttons="false" fluid />
            </div>
            <label class="shrink-0 text-xs text-muted-foreground">每炉支数</label>
            <div class="w-24 shrink-0">
              <InputNumber v-model="spinZs" :min="0" :show-buttons="false" fluid />
            </div>
            <label class="shrink-0 text-xs text-muted-foreground">每炉重量</label>
            <div class="w-28 shrink-0">
              <InputNumber v-model="spinWgt" :min="0" :show-buttons="false" fluid />
            </div>
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddLc">生成炉次</Button>
          </div>
        </div>

        <!-- 左右分栏：左=炉次 gcStove（原 Dock.Fill+明细 gridView1）｜右=订单 gcStoveOrder（Dock.Right 456/1223≈37%） -->
        <Splitter class="min-h-0 flex-1" layout="horizontal">
          <SplitterPanel :size="63" :minSize="30" class="flex flex-col overflow-hidden">
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="stoveColDefs" :row-data="stoveRows"
                :pagination="false" :loading="querying" :master-detail="true" :detail-grid-options="stoveDetailOptions"
                :get-detail-row-data="getStoveDetailRows" @grid-ready="ready('stove')"
                @first-data-rendered="autoSizeOnFirstData" @row-clicked="onStoveRowClicked" />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="stoveOrderColDefs" :row-data="stoveOrderRows"
                :pagination="false" @grid-ready="ready('order')" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
