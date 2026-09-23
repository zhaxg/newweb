<script setup lang="ts">
/** 对应 FrmMP2040（炼钢炉次组浇，炼钢总厂 LG02 / 一炼钢 LG01 共享，cQueryString=LG01|LG02）：DDH.Winforms.SMP.Forms.FrmMP2040
 *  已接入：castStoveApi.getLcList（未组浇次炉次）/ getJcList（未下发浇次）/ deleteLc（删除炉次）
 *          / creatJc（生成浇次）/ getLcListByJc（浇次焦点行→浇次炉次）/ deleteJc（删除浇次）
 *  待接入：机台下拉（原 UCMachine→QueryMachine，swagger 未生成，禁改 src/api 暂留空候选）
 *  布局：stackPanel1(连铸机+查询/生成浇次/删除炉次) → 上下Splitter：上=炉次 gcStove(gvStove 29可见+16隐藏+明细gridView1)
 *        ｜ 下=panel1[stackPanel2: 删除浇次 → 左右Splitter(61/39)：左=浇次信息 gvJc(10可见+22隐藏) ｜ 右=浇次炉次信息 gvJcStove(22可见+24隐藏+明细gridView2)]
 *        字段=camelCase 绑定，colId=原 Designer FieldName */
import { ref } from "vue";
import Button from "primevue/button";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
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
import { castStoveApi, type InputPlanDto, type Tmp2030Dto, type Tmp2040Dto } from "@/api/mes4ddh/smp.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery();
/** 产线编码（原 lineCode = QueryString：LG02/LG01） */
const lineCode = menuQs;

/* ---------- 查询条件（原 stackPanel1：连铸机 icboMachine，候选待接入） ---------- */
const icboMachine = ref<string | null>(null);

/* ---------- 数据与网格 ---------- */
const stoveRows = ref<Tmp2040Dto[]>([]);
const jcRows = ref<Tmp2030Dto[]>([]);
const jcStoveRows = ref<Tmp2040Dto[]>([]);
const querying = ref(false);
const stoveApi = ref<GridApi | null>(null);
const jcApi = ref<GridApi | null>(null);
const jcStoveApi = ref<GridApi | null>(null);

function autofit(api: GridApi | null) {
  requestAnimationFrame(() => api?.autoSizeAllColumns());
}
function ready(key: "stove" | "jc" | "jcStove") {
  return (e: GridReadyEvent) => {
    if (key === "stove") stoveApi.value = e.api;
    else if (key === "jc") jcApi.value = e.api;
    else jcStoveApi.value = e.api;
  };
}
/** 炉次勾选 = AG Grid row-selection 复选框（原 Selected 标记列已改隐藏列，ui-rules §7）；焦点=浇次表单行选中 */
function selectedStoves(): Tmp2040Dto[] {
  return (stoveApi.value?.getSelectedRows() ?? []) as Tmp2040Dto[];
}
function focusedJc(): Tmp2030Dto | null {
  const rows = jcApi.value?.getSelectedRows() ?? [];
  return (rows[0] as Tmp2030Dto | undefined) ?? null;
}

/* ---------- 列 ---------- */
/** 炉次 gvStove：29 可见 + 16 隐藏（Tmp2040Dto） */
const stoveColDefs = ref<ColDef[]>([
  { colId: "CPono", field: "cPono", headerName: "制造命令号", width: 110 },
  { colId: "Selected", field: "selected", headerName: "选择", hide: true },
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

/** 浇次炉次 gvJcStove：22 可见 + 24 隐藏（Tmp2040Dto，ViewCaption=浇次炉次信息） */
const jcStoveColDefs = ref<ColDef[]>([
  { colId: "CPono", field: "cPono", headerName: "制造命令号", width: 110 },
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
  { colId: "COrderNo", field: "cOrderNo", headerName: "订单号", width: 130 },
  { colId: "CRoute", field: "cRoute", headerName: "工艺路线", width: 110 },
  { colId: "CCustName", field: "cCustName", headerName: "客户名称", width: 120 },
  { colId: "CZGLineCode", field: "cZGLineCode", headerName: "轧制产线", width: 95 },
  { colId: "CTsyq", field: "cTsyq", headerName: "特殊要求", width: 100 },
  { colId: "NLgCn", field: "nLgCn", headerName: "炼钢产能", width: 90 },
  { colId: "CRemark", field: "cRemark", headerName: "备注", width: 100 },
  { colId: "CStNo", field: "cStNo", headerName: "炼钢工艺卡", width: 110 },
  /* 隐藏 24 列 */
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
  { colId: "CIsZb", field: "cIsZb", headerName: "是否备坯计划", hide: true },
  { colId: "DUseTime", field: "dUseTime", headerName: "可用时间", hide: true },
  { colId: "DJhqTime", field: "dJhqTime", headerName: "交货期", hide: true },
  { colId: "CSgCodeStd", field: "cSgCodeStd", headerName: "钢种标准", hide: true },
  { colId: "DDownDdTime", field: "dDownDdTime", headerName: "下发调度时间", hide: true },
  { colId: "CDownDdUser", field: "cDownDdUser", headerName: "下发调度人", hide: true },
  { colId: "DDownLgsc", field: "dDownLgsc", headerName: "下发生产时间", hide: true },
  { colId: "CDownLgscUser", field: "cDownLgscUser", headerName: "下发人", hide: true },
  { colId: "NWgtMeter", field: "nWgtMeter", headerName: "单量", hide: true },
]);

/* 明细行（LevelTemplate：gcStove→gridView1、gcJcStove→gridView2，RelationName=_tmp2041Dtos，20 可见 + 21 隐藏） */
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

/* ---------- 查询（原 GetLcList / GetJcList） ---------- */
/** stackPanel1 查询（simpleButton1_Click）：未组浇次炉次 + 未下发浇次 双查 */
async function onQuery() {
  querying.value = true;
  try {
    const lcInput: InputPlanDto = {
      cLineCode: lineCode,
      jcStatus: 0 /* JcStatusEnum.NoJc 未组成浇次 */,
      cCcmCode: icboMachine.value ?? null,
    };
    stoveRows.value = (await castStoveApi.getLcList(lcInput)) ?? [];
    /* 原 Selected 列语义：查询回填后按数据字段回灌行选择勾选态 */
    requestAnimationFrame(() => {
      stoveApi.value?.forEachNode((node) => node.setSelected(!!(node.data as Tmp2040Dto).selected));
      stoveApi.value?.autoSizeAllColumns();
    });

    const jcInput: InputPlanDto = {
      jcStatus: 10 /* JcStatusEnum.NoDown 未下发 */,
      cLineCode: lineCode,
      cCcmCode: icboMachine.value ?? null,
    };
    jcRows.value = (await castStoveApi.getJcList(jcInput)) ?? [];
    autofit(jcApi.value);

    /* 原 GetJcList 尾部 gvJc_FocusedRowChanged(null,null)：首行联动浇次炉次 */
    await loadJcStoves(jcRows.value[0]?.cJcNo ?? null);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 浇次焦点行 → 浇次炉次（原 gvJc_FocusedRowChanged → GetLcListByJc） */
async function loadJcStoves(jcNo: string | null | undefined) {
  try {
    jcStoveRows.value = jcNo ? ((await castStoveApi.getLcListByJc(jcNo)) ?? []) : [];
    autofit(jcStoveApi.value);
  } catch {
    /* 拦截层已 toast */
  }
}
function onJcSelectionChanged(_e: SelectionChangedEvent) {
  void loadJcStoves(focusedJc()?.cJcNo);
}

/* ---------- 按钮逻辑（原事件逐条） ---------- */
/** 生成浇次（simpleButton2_Click → CreatJc：选中=Selected 标记） */
async function onCreateJc() {
  const ids = selectedStoves().map((x) => x.id).filter(Boolean) as string[];
  if (!ids.length) {
    toast("没有选择组成浇次的炉次计划！", 2500, "warn");
    return;
  }
  if (!window.confirm("是否确认将已选中的炉次组合成一个浇次？")) return;
  try {
    await castStoveApi.creatJc(ids);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

/** 删除炉次（simpleButton4_Click → DeleteLc） */
async function onDeleteLc() {
  const ids = selectedStoves().map((x) => x.id).filter(Boolean) as string[];
  if (!ids.length) {
    toast("没有选择需要删除的炉次！", 2500, "warn");
    return;
  }
  if (!window.confirm("是否确认删除已选中的炉次？")) return;
  try {
    await castStoveApi.deleteLc(ids);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

/** 删除浇次（simpleButton7_Click → DeleteJc：焦点行） */
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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：连铸机 + 查询/生成浇次/删除炉次（Dock.Top 单行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">连铸机</label>
      <Select v-model="icboMachine" :options="[]" show-clear placeholder="请选择" class="w-40 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCreateJc">生成浇次</Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteLc">删除炉次</Button>
    </div>

    <!-- 上下分栏：上=炉次 gcStove（原 Dock.Fill）；splitterControl1.Bottom；下=panel1 -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="46" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="stoveColDefs" :row-data="stoveRows" :pagination="false"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :loading="querying" :master-detail="true" :detail-grid-options="stoveDetailOptions"
            :get-detail-row-data="getStoveDetailRows" @grid-ready="ready('stove')"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="30" class="flex flex-col overflow-hidden">
        <!-- stackPanel2：删除浇次（panel1 内 Dock.Top，横跨两表） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteJc">删除浇次</Button>
        </div>

        <!-- 左右分栏（splitterControl2，≈588/965）：左=浇次信息 gcJc（Dock.Left）｜右=浇次炉次信息 gcJcStove（Fill） -->
        <Splitter class="min-h-0 flex-1" layout="horizontal">
          <SplitterPanel :size="61" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">浇次信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="jcColDefs" :row-data="jcRows" :pagination="false"
                :loading="querying" :row-selection="{ mode: 'singleRow', enableClickSelection: true }"
                @grid-ready="ready('jc')" @first-data-rendered="autoSizeOnFirstData"
                @selection-changed="onJcSelectionChanged" />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">浇次炉次信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="jcStoveColDefs" :row-data="jcStoveRows"
                :pagination="false" :master-detail="true" :detail-grid-options="stoveDetailOptions"
                :get-detail-row-data="getStoveDetailRows" @grid-ready="ready('jcStove')"
                @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
