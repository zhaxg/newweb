<script setup lang="ts">
/** 对应 FrmHR4200（中厚板计划执行情况查询）：DDH.Winforms.SHR.Forms.FrmHR4200
 *  已接入：tPa1000Api.queryLines / hR3000Api.queryThr3000s+queryThr3010s / hR4200Api 23 个接口页签 / hR4000Api.addSj（测试按钮=定尺剪实绩行同步）
 *  偏差：班次/确认状态/长度类型等 KV/枚举列显示原值；测试按钮原无提示（web 补成功提示） */
import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  hR3000Api,
  hR4000Api,
  hR4200Api,
  tPa1000Api,
  type DtoQueryL2,
  type Thr3000,
  type Thr3010,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const { parts: menuQs } = useMenuQuery();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}

/* ---------- 产线下拉（原 CLineCodeTextEdit，菜单参数初始化） ---------- */
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string>(menuQs[0] ?? "ZG01");

const input = reactive({
  cBatchNo: "",
  cStove: "",
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 上：组批计划 / 计划材料明细 ---------- */
const planRows = ref<Thr3000[]>([]);
const matRows = ref<Thr3010[]>([]);
const loading = ref(false);
const planApi = ref<GridApi | null>(null);
const matApi = ref<GridApi | null>(null);
function onPlanReady(e: GridReadyEvent) {
  planApi.value = e.api;
}
function onMatReady(e: GridReadyEvent) {
  matApi.value = e.api;
}
const planColDefs: ColDef[] = [
  /*  { colId: "selected", field: "selected", headerName: "选择", width: 150 },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 150 },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 150 },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 150 },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 150 },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 150 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 150 },
  { colId: "nRateSj", field: "nRateSj", headerName: "实际成材率", width: 150 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 150 },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "处理结果", width: 150 },
  { colId: "cConfirmStatus", field: "cConfirmStatus", headerName: "收料状态", width: 150 },
  { colId: "cConfirmEmp", field: "cConfirmEmp", headerName: "收料人", width: 150 },
  { colId: "dConfirm", field: "dConfirm", headerName: "收料时间", width: 150 },
  { colId: "cConfirmShift", field: "cConfirmShift", headerName: "收料班次", width: 150 },
  { colId: "cConfirmGroup", field: "cConfirmGroup", headerName: "收料班组", width: 150 },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 150 },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 150, hide: true },
  { colId: "cTlOrderNo", field: "cTlOrderNo", headerName: "提料订单号", width: 150, hide: true },*/
];
const matColDefs: ColDef[] = [
  /*  { colId: "selected", field: "selected", headerName: "选择", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "处理结果", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 150 },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 150 },
  { colId: "nFurStatus", field: "nFurStatus", headerName: "加热炉状态", width: 150 },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 150 },
  { colId: "nRollStatus", field: "nRollStatus", headerName: "轧制状态", width: 150 },
  { colId: "cRollCode", field: "cRollCode", headerName: "轧机编号", width: 150 },
  { colId: "cFinishEmp", field: "cFinishEmp", headerName: "轧制完成人", width: 150 },
  { colId: "dRoll", field: "dRoll", headerName: "轧制完成时间", width: 150 },
  { colId: "cRollShift", field: "cRollShift", headerName: "轧制完成班次", width: 150 },
  { colId: "cRollGroup", field: "cRollGroup", headerName: "轧制完成班组", width: 150 },
  { colId: "nJqStatus", field: "nJqStatus", headerName: "剪切计划状态", width: 150 },
  { colId: "cJqCode", field: "cJqCode", headerName: "剪切设备", width: 150 },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 150 },
  { colId: "cRowNo", field: "cRowNo", headerName: "道号", width: 150 },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 150 },
  { colId: "cPos", field: "cPos", headerName: "当前位置", width: 150 },
  { colId: "nWdRl", field: "nWdRl", headerName: "入炉温度", width: 150 },
  { colId: "cShiftRl", field: "cShiftRl", headerName: "入炉班次", width: 150 },
  { colId: "cGroupRl", field: "cGroupRl", headerName: "入炉班组", width: 150 },
  { colId: "dRl", field: "dRl", headerName: "入炉时间", width: 150 },
  { colId: "nWdCl", field: "nWdCl", headerName: "出炉温度", width: 150 },
  { colId: "cShiftCl", field: "cShiftCl", headerName: "出炉班次", width: 150 },
  { colId: "cGroupCl", field: "cGroupCl", headerName: "出炉班组", width: 150 },
  { colId: "dCl", field: "dCl", headerName: "出炉时间", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 150, hide: true },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 150, hide: true },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150, hide: true },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 150, hide: true },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 150, hide: true },
  { colId: "zh", field: "zh", headerName: "照核信息", width: 150, hide: true },
  { colId: "sgd", field: "sgd", headerName: "上辊道信息", width: 150, hide: true },
  { colId: "fur", field: "fur", headerName: "加热信息", width: 150, hide: true },
  { colId: "roll", field: "roll", headerName: "轧制信息", width: 150, hide: true },
  { colId: "yc", field: "yc", headerName: "轧制异常信息", width: 150, hide: true },
  { colId: "yjz", field: "yjz", headerName: "预矫直信息", width: 150, hide: true },
  { colId: "rjz", field: "rjz", headerName: "热矫直信息", width: 150, hide: true },
  { colId: "ckl", field: "ckl", headerName: "超快冷信息", width: 150, hide: true },*/
];

let currentMat: Thr3010 | null = null;

async function query() {
  loading.value = true;
  try {
    const dto = {
      cLineCode: lineCode.value || undefined,
      dCreateTimeRange: toTimeRange(input.dates),
      cBatchNo: input.cBatchNo.trim() || null,
      cStove: input.cStove.trim() || null,
      cOrderNo: input.cOrderNo.trim() || null,
      cSgCode: input.cSgCode.trim() || null,
      cSgStd: input.cSgStd.trim() || null,
    };
    planRows.value = (await hR3000Api.queryThr3000s(dto as Parameters<typeof hR3000Api.queryThr3000s>[0])) ?? [];
    matRows.value = [];
    currentMat = null;
    for (const arr of tabRows.value) arr.splice(0);
    requestAnimationFrame(() => planApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function onPlanSelected() {
  const row = (planApi.value?.getSelectedRows()[0] as Thr3000 | undefined) ?? null;
  if (!row) {
    matRows.value = [];
    currentMat = null;
    for (const arr of tabRows.value) arr.splice(0);
    return;
  }
  matRows.value = (await hR3000Api.queryThr3010s(row.id ?? undefined)) ?? [];
  requestAnimationFrame(() => matApi.value?.autoSizeAllColumns());
}

/* ---------- 下：23 个接口页签 ---------- */
const tabs: { label: string; fn: (d?: DtoQueryL2) => Promise<unknown[]>; special?: "batchOrder" | "slabBatch" }[] = [
  { label: "上辊道实绩", fn: hR4200Api.queryTiL2me04s },
  { label: "照核记录", fn: hR4200Api.queryTiL2me05s },
  { label: "装炉实绩", fn: hR4200Api.queryTiL2me06s },
  { label: "加热实绩", fn: hR4200Api.queryTiL2me11s },
  { label: "轧制实绩", fn: hR4200Api.queryTiL2me02s },
  { label: "轧制异常实绩", fn: hR4200Api.queryTiL2me01s },
  { label: "预矫直实绩", fn: hR4200Api.queryTiL2me08s },
  { label: "ACC超快冷实绩", fn: hR4200Api.queryTiL2me14s },
  { label: "热矫直实绩", fn: hR4200Api.queryTiL2me09s },
  { label: "切头剪CS实绩", fn: hR4200Api.queryTiP48j01s },
  { label: "双边剪DSS实绩", fn: hR4200Api.queryTiP48j02s, special: "batchOrder" },
  { label: "定尺剪实绩", fn: hR4200Api.queryTiP48j031s },
  { label: "取大样实绩", fn: hR4200Api.queryTiP48j04s, special: "slabBatch" },
  { label: "超声波探伤UST实绩", fn: hR4200Api.queryTiP48j05s },
  { label: "照核实绩", fn: hR4200Api.queryTiL2me15s },
  { label: "测厚仪测量曲线1", fn: hR4200Api.queryTiL2me16s },
  { label: "测厚仪测量曲线2", fn: hR4200Api.queryTiL2me17s },
  { label: "平直度仪测量实绩", fn: hR4200Api.queryTiL2me18s },
  { label: "终轧温度曲线实绩", fn: hR4200Api.queryTiL2me19s },
  { label: "能耗实绩", fn: hR4200Api.queryTiL2me12s },
  { label: "剪切PDI请求", fn: hR4200Api.queryTiP48j06s },
  { label: "钢板下线请求", fn: hR4200Api.queryTiP48j07s },
  { label: "轮廓仪测量实绩", fn: hR4200Api.queryTiP48j09s },
];
const tabCols: ColDef[][] = [
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "tableNo", field: "tableNo", headerName: "辊道号", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "spare1", field: "spare1", headerName: "预留1", width: 150 },
  { colId: "spare2", field: "spare2", headerName: "预留2", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "furNo", field: "furNo", headerName: "加热炉号", width: 150 },
  { colId: "rowNo", field: "rowNo", headerName: "列号", width: 150 },
  { colId: "spare1", field: "spare1", headerName: "预留1", width: 150 },
  { colId: "spare2", field: "spare2", headerName: "预留2", width: 150 },
  { colId: "spare3", field: "spare3", headerName: "预留3", width: 150 },
  { colId: "spare4", field: "spare4", headerName: "预留4", width: 150 },
  { colId: "spare5", field: "spare5", headerName: "预留5", width: 150 },
  { colId: "spare6", field: "spare6", headerName: "预留6", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "matNo", field: "matNo", headerName: "材料号", width: 150 },
  { colId: "planNo", field: "planNo", headerName: "计划号", width: 150 },
  { colId: "slabFurTime", field: "slabFurTime", headerName: "板坯装炉时刻", width: 150 },
  { colId: "slabFurBefTemp", field: "slabFurBefTemp", headerName: "板坯装炉前温度", width: 150 },
  { colId: "furNo", field: "furNo", headerName: "加热炉号", width: 150 },
  { colId: "furType", field: "furType", headerName: "加热炉类型", width: 150 },
  { colId: "inFurnaceShiftNo", field: "inFurnaceShiftNo", headerName: "入炉班次", width: 150 },
  { colId: "inFurnaceShiftGroup", field: "inFurnaceShiftGroup", headerName: "入炉班组", width: 150 },
  { colId: "outFurnaceShiftNo", field: "outFurnaceShiftNo", headerName: "出炉班次", width: 150 },
  { colId: "outFurnaceShiftGroup", field: "outFurnaceShiftGroup", headerName: "出炉班组", width: 150 },
  { colId: "tapSlabTempAve", field: "tapSlabTempAve", headerName: "出钢时板坯平均温度", width: 150 },
  { colId: "tapSlabTempSrfc", field: "tapSlabTempSrfc", headerName: "出钢时板坯表面温度", width: 150 },
  { colId: "tapSlabTempCt", field: "tapSlabTempCt", headerName: "出钢时板坯中心温度", width: 150 },
  { colId: "outTime", field: "outTime", headerName: "抽出时刻", width: 150 },
  { colId: "outTempAvg", field: "outTempAvg", headerName: "抽出平均温度", width: 150 },
  { colId: "inFurnaceTime", field: "inFurnaceTime", headerName: "在炉内时间", width: 150 },
  { colId: "preHtTempAve", field: "preHtTempAve", headerName: "预热段入口的平均板坯温度", width: 150 },
  { colId: "preHtHotAve", field: "preHtHotAve", headerName: "预热段入口的板坯均热温度", width: 150 },
  { colId: "preHtTempSrf", field: "preHtTempSrf", headerName: "预热段入口的板坯表面温度", width: 150 },
  { colId: "preHtTempCt", field: "preHtTempCt", headerName: "预热段入口的板坯中心温度", width: 150 },
  { colId: "preHtAveTemp", field: "preHtAveTemp", headerName: "在预热段时的平均温度", width: 150 },
  { colId: "preHtFurPerd", field: "preHtFurPerd", headerName: "预热段在炉时间", width: 150 },
  { colId: "ht1SlabTempAve", field: "ht1SlabTempAve", headerName: "加热段1入口板坯平均温度", width: 150 },
  { colId: "ht1SlabHotAve", field: "ht1SlabHotAve", headerName: "加热段1入口板坯均热度", width: 150 },
  { colId: "ht1SlabTempSrfc", field: "ht1SlabTempSrfc", headerName: "加热段1入口板坯表面温度", width: 150 },
  { colId: "ht1SlabTempCt", field: "ht1SlabTempCt", headerName: "加热段1入口板坯中心温度", width: 150 },
  { colId: "ht1AveTemp", field: "ht1AveTemp", headerName: "在加热段1时的平均温度", width: 150 },
  { colId: "ht1InFurPerd", field: "ht1InFurPerd", headerName: "加热段1在炉时段", width: 150 },
  { colId: "ht2SlabTempAve", field: "ht2SlabTempAve", headerName: "加热段2入口板坯平均温度", width: 150 },
  { colId: "ht2SlabHotAve", field: "ht2SlabHotAve", headerName: "加热段2入口板坯均热度", width: 150 },
  { colId: "ht2SlabTempSrfc", field: "ht2SlabTempSrfc", headerName: "加热段2入口板坯表面温度", width: 150 },
  { colId: "ht2SlabTempCt", field: "ht2SlabTempCt", headerName: "加热段2入口板坯中心温度", width: 150 },
  { colId: "ht2AveTemp", field: "ht2AveTemp", headerName: "在加热段2时的平均温度", width: 150 },
  { colId: "ht2InFurPerd", field: "ht2InFurPerd", headerName: "加热段2在炉时段", width: 150 },
  { colId: "eqSlabTempAve", field: "eqSlabTempAve", headerName: "均热段入口板坯平均温度", width: 150 },
  { colId: "eqSlabHotAve", field: "eqSlabHotAve", headerName: "均热段入口板坯均热度", width: 150 },
  { colId: "eqSlabTempSrfc", field: "eqSlabTempSrfc", headerName: "均热段入口板坯表面温度", width: 150 },
  { colId: "eqSlabTempCt", field: "eqSlabTempCt", headerName: "均热段入口板坯中心温度", width: 150 },
  { colId: "eqAveTemp", field: "eqAveTemp", headerName: "均热段时的平均温度", width: 150 },
  { colId: "eqInFurPerd", field: "eqInFurPerd", headerName: "均热段在炉时段", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "planNo", field: "planNo", headerName: "计划号", width: 150 },
  { colId: "slabStatus", field: "slabStatus", headerName: "BD板坯标识", width: 150 },
  { colId: "standNo", field: "standNo", headerName: "机架号", width: 150 },
  { colId: "steelGrade", field: "steelGrade", headerName: "牌号", width: 150 },
  { colId: "productCode", field: "productCode", headerName: "产品代码", width: 150 },
  { colId: "dischargeTime", field: "dischargeTime", headerName: "出炉时间", width: 150 },
  { colId: "rollingTimeStart", field: "rollingTimeStart", headerName: "轧制开始时间", width: 150 },
  { colId: "rollingTimeEnd", field: "rollingTimeEnd", headerName: "轧制结束时间", width: 150 },
  { colId: "crCode", field: "crCode", headerName: "CR代码", width: 150 },
  { colId: "totalRollingTime", field: "totalRollingTime", headerName: "总轧制时间s", width: 150 },
  { colId: "rmPass", field: "rmPass", headerName: "粗轧总轧制道次数", width: 150 },
  { colId: "fmPass", field: "fmPass", headerName: "精轧总轧制道次数", width: 150 },
  { colId: "rollingStatus", field: "rollingStatus", headerName: "误轧制标记", width: 150 },
  { colId: "exitThick", field: "exitThick", headerName: "轧制厚度（计算）", width: 150 },
  { colId: "exitWidth", field: "exitWidth", headerName: "轧制宽度（计算）", width: 150 },
  { colId: "exitLength", field: "exitLength", headerName: "轧制长度（计算）", width: 150 },
  { colId: "operateUserCode", field: "operateUserCode", headerName: "轧制操作人员代码（改规标记1）", width: 150 },
  { colId: "crownMark", field: "crownMark", headerName: "钢板凸度（实绩标记)", width: 150 },
  { colId: "meaThickWs", field: "meaThickWs", headerName: "厚度（工作侧）测厚仪", width: 150 },
  { colId: "meaThickDs", field: "meaThickDs", headerName: "厚度（传动侧）测厚仪", width: 150 },
  { colId: "hsbExitTempAvg", field: "hsbExitTempAvg", headerName: "除鳞后温度（平均）", width: 150 },
  { colId: "hsbExitTempMax", field: "hsbExitTempMax", headerName: "除鳞后温度（最大）", width: 150 },
  { colId: "rmEntTempCal", field: "rmEntTempCal", headerName: "粗轧开轧温度（计算）", width: 150 },
  { colId: "rmEntTempAvg", field: "rmEntTempAvg", headerName: "粗轧开轧温度（测量平均）", width: 150 },
  { colId: "rmEntTempMin", field: "rmEntTempMin", headerName: "粗轧开轧温度（测量最小）", width: 150 },
  { colId: "rmEntTempMax", field: "rmEntTempMax", headerName: "粗轧开轧温度（测量最大）", width: 150 },
  { colId: "rmEntTempDev", field: "rmEntTempDev", headerName: "粗轧开轧温度（测量偏差）", width: 150 },
  { colId: "rmExitTempCal", field: "rmExitTempCal", headerName: "粗轧终轧温度（计算）", width: 150 },
  { colId: "rmExitTempAvg", field: "rmExitTempAvg", headerName: "粗轧终轧温度（测量平均）", width: 150 },
  { colId: "rmExitTempMin", field: "rmExitTempMin", headerName: "粗轧终轧温度（测量最小）", width: 150 },
  { colId: "rmExitTempMax", field: "rmExitTempMax", headerName: "粗轧终轧温度（测量最大）", width: 150 },
  { colId: "rmExitTempDev", field: "rmExitTempDev", headerName: "粗轧终轧温度（测量偏差）", width: 150 },
  { colId: "rmEntThick", field: "rmEntThick", headerName: "粗轧开始厚度（计算）", width: 150 },
  { colId: "fmEntTempCal", field: "fmEntTempCal", headerName: "精轧开轧温度（计算）", width: 150 },
  { colId: "fmEntTempAvg", field: "fmEntTempAvg", headerName: "精轧开轧温度（测量平均）", width: 150 },
  { colId: "fmEntTempMin", field: "fmEntTempMin", headerName: "精轧开轧温度（测量最小）", width: 150 },
  { colId: "fmEntTempMax", field: "fmEntTempMax", headerName: "精轧开轧温度（测量最大）", width: 150 },
  { colId: "fmEntTempDev", field: "fmEntTempDev", headerName: "精轧开轧温度（测量偏差）", width: 150 },
  { colId: "fmExitTempCal", field: "fmExitTempCal", headerName: "精轧终轧温度（计算）", width: 150 },
  { colId: "fmExitTempAvg", field: "fmExitTempAvg", headerName: "精轧终轧温度（测量平均）", width: 150 },
  { colId: "fmExitTempMin", field: "fmExitTempMin", headerName: "精轧终轧温度（测量最小）", width: 150 },
  { colId: "fmExitTempMax", field: "fmExitTempMax", headerName: "精轧终轧温度（测量最大）", width: 150 },
  { colId: "fmExitTempDev", field: "fmExitTempDev", headerName: "精轧终轧温度（测量偏差）", width: 150 },
  { colId: "fmEntThick", field: "fmEntThick", headerName: "精轧开始厚度（计算）", width: 150 },
  { colId: "firstConThick", field: "firstConThick", headerName: "第一阶段控制轧制点厚度", width: 150 },
  { colId: "secondConThick", field: "secondConThick", headerName: "第二阶段控制轧制点厚度", width: 150 },
  { colId: "firstContTemp", field: "firstContTemp", headerName: "第一阶段控制轧制点温度", width: 150 },
  { colId: "secondConTemp", field: "secondConTemp", headerName: "第二阶段控制轧制点温度", width: 150 },
  { colId: "thickHp", field: "thickHp", headerName: "钢板测厚仪中部厚度", width: 150 },
  { colId: "broadbef", field: "broadbef", headerName: "展宽轧制前厚度", width: 150 },
  { colId: "broadaft", field: "broadaft", headerName: "展宽轧制后厚度", width: 150 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 150 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 150 },
  { colId: "productTime", field: "productTime", headerName: "生产时间", width: 150 },
  { colId: "author", field: "author", headerName: "责任者", width: 150 },
  { colId: "slabWeight", field: "slabWeight", headerName: "板坯实际重量", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "zone", field: "zone", headerName: "位置", width: 150 },
  { colId: "reason", field: "reason", headerName: "原因", width: 150 },
  { colId: "actPassNo", field: "actPassNo", headerName: "当前实际道次号", width: 150 },
  { colId: "actThick", field: "actThick", headerName: "当前厚度", width: 150 },
  { colId: "actWidth", field: "actWidth", headerName: "当前宽度", width: 150 },
  { colId: "actLength", field: "actLength", headerName: "当前长度", width: 150 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 150 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 150 },
  { colId: "productTime", field: "productTime", headerName: "生产时间", width: 150 },
  { colId: "author", field: "author", headerName: "责任者", width: 150 },
  { colId: "slabWeight", field: "slabWeight", headerName: "板坯实际重量", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "totalPass", field: "totalPass", headerName: "矫直总次数", width: 150 },
  { colId: "currPass", field: "currPass", headerName: "矫直当前次数", width: 150 },
  { colId: "entryTime", field: "entryTime", headerName: "进入时间", width: 150 },
  { colId: "endTime", field: "endTime", headerName: "结束时间", width: 150 },
  { colId: "entryTemp", field: "entryTemp", headerName: "钢板温度", width: 150 },
  { colId: "levelerSpeed", field: "levelerSpeed", headerName: "矫直速度", width: 150 },
  { colId: "bitSpeed", field: "bitSpeed", headerName: "咬入速度", width: 150 },
  { colId: "entryGap", field: "entryGap", headerName: "入口辊缝", width: 150 },
  { colId: "exitGap", field: "exitGap", headerName: "出口辊缝", width: 150 },
  { colId: "entrySideRollGap", field: "entrySideRollGap", headerName: "入口边辊高度", width: 150 },
  { colId: "exitSideRollGap", field: "exitSideRollGap", headerName: "出口边辊高度", width: 150 },
  { colId: "tilt1", field: "tilt1", headerName: "倾斜量", width: 150 },
  { colId: "tilt2", field: "tilt2", headerName: "倾动量", width: 150 },
  { colId: "l2Force", field: "l2Force", headerName: "矫直力", width: 150 },
  { colId: "bendPosition", field: "bendPosition", headerName: "弯辊量", width: 150 },
  { colId: "torqueMotor", field: "torqueMotor", headerName: "扭矩", width: 150 },
  { colId: "emptyFlag", field: "emptyFlag", headerName: "是否空过", width: 150 },
  { colId: "spare", field: "spare", headerName: "预留", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "id", field: "id", headerName: "主键", width: 150 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
  { colId: "dHandle", field: "dHandle", headerName: "处理时间", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "处理结果", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "steelGrade", field: "steelGrade", headerName: "牌号", width: 150 },
  { colId: "thick", field: "thick", headerName: "厚度", width: 150 },
  { colId: "width", field: "width", headerName: "宽度曲线", width: 150 },
  { colId: "length", field: "length", headerName: "长度", width: 150 },
  { colId: "coolMode", field: "coolMode", headerName: "冷却模式", width: 150 },
  { colId: "startCoolTime", field: "startCoolTime", headerName: "开冷时间", width: 150 },
  { colId: "finishCoolTime", field: "finishCoolTime", headerName: "终冷时间", width: 150 },
  { colId: "rollAveTemp", field: "rollAveTemp", headerName: "轧后平均温度", width: 150 },
  { colId: "rollMaxTemp", field: "rollMaxTemp", headerName: "轧后温度最大值", width: 150 },
  { colId: "rollMinTemp", field: "rollMinTemp", headerName: "轧后温度最小值", width: 150 },
  { colId: "entryAveTemp", field: "entryAveTemp", headerName: "开冷平均温度", width: 150 },
  { colId: "entryMaxTemp", field: "entryMaxTemp", headerName: "开冷最大温度", width: 150 },
  { colId: "entryMinTemp", field: "entryMinTemp", headerName: "开冷最小温度", width: 150 },
  { colId: "targetFinishTemp", field: "targetFinishTemp", headerName: "目标返红温度", width: 150 },
  { colId: "finishAveTemp", field: "finishAveTemp", headerName: "返红平均温度", width: 150 },
  { colId: "finishMaxTemp", field: "finishMaxTemp", headerName: "返红温度最大", width: 150 },
  { colId: "finishMinTemp", field: "finishMinTemp", headerName: "返红温度最小", width: 150 },
  { colId: "scanAveTemp", field: "scanAveTemp", headerName: "扫描高温计平均温度", width: 150 },
  { colId: "scanMaxTemp", field: "scanMaxTemp", headerName: "扫描高温计最大温度", width: 150 },
  { colId: "scanMinTemp", field: "scanMinTemp", headerName: "扫描高温计最小温度", width: 150 },
  { colId: "coolingRate", field: "coolingRate", headerName: "实际冷速", width: 150 },
  { colId: "fluxA", field: "fluxA", headerName: "A区设定流量", width: 150 },
  { colId: "fluxB", field: "fluxB", headerName: "B区设定流量", width: 150 },
  { colId: "actFluxA", field: "actFluxA", headerName: "A区实际流量", width: 150 },
  { colId: "actFluxB", field: "actFluxB", headerName: "B区实际流量", width: 150 },
  { colId: "ratioA", field: "ratioA", headerName: "A区设定水比", width: 150 },
  { colId: "ratioB", field: "ratioB", headerName: "B区设定水比", width: 150 },
  { colId: "actRatioA", field: "actRatioA", headerName: "A区实际水比", width: 150 },
  { colId: "actRatioB", field: "actRatioB", headerName: "B区实际水比", width: 150 },
  { colId: "speed", field: "speed", headerName: "设定辊速", width: 150 },
  { colId: "actSpeed", field: "actSpeed", headerName: "实际辊速", width: 150 },
  { colId: "aspd", field: "aspd", headerName: "设定加速度", width: 150 },
  { colId: "actAspd", field: "actAspd", headerName: "实际加速度", width: 150 },
  { colId: "num", field: "num", headerName: "开启集管组数", width: 150 },
  { colId: "uppipeFlow", field: "uppipeFlow", headerName: "1-28集管上流量", width: 150 },
  { colId: "botpipeFlow", field: "botpipeFlow", headerName: "1-28集管下流量", width: 150 },
  { colId: "sideCavityFlow1", field: "sideCavityFlow1", headerName: "1-10边腔流量", width: 150 },
  { colId: "sideSpary", field: "sideSpary", headerName: "侧喷", width: 150 },
  { colId: "midSpary", field: "midSpary", headerName: "中喷", width: 150 },
  { colId: "hTSIS", field: "hTSIS", headerName: "头尾遮蔽投入信号", width: 150 },
  { colId: "headUpLength", field: "headUpLength", headerName: "头上长度", width: 150 },
  { colId: "headBotLength", field: "headBotLength", headerName: "头下长度", width: 150 },
  { colId: "headUpCoef", field: "headUpCoef", headerName: "头上系数", width: 150 },
  { colId: "headBotCoef", field: "headBotCoef", headerName: "头下系数", width: 150 },
  { colId: "tailUpLength", field: "tailUpLength", headerName: "尾上长度", width: 150 },
  { colId: "tailBotLength", field: "tailBotLength", headerName: "尾下长度", width: 150 },
  { colId: "tailUpCoef", field: "tailUpCoef", headerName: "尾上系数", width: 150 },
  { colId: "tailBotCoef", field: "tailBotCoef", headerName: "尾下系数", width: 150 },
  { colId: "prh", field: "prh", headerName: "压辊高度A1-10prh", width: 150 },
  { colId: "eLPBCD", field: "eLPBCD", headerName: "电降平台bcd", width: 150 },
  { colId: "tempWater", field: "tempWater", headerName: "水温", width: 150 },
  { colId: "pressWater", field: "pressWater", headerName: "水压", width: 150 },
  { colId: "iSpare", field: "iSpare", headerName: "备用", width: 150 },
  { colId: "fSpare", field: "fSpare", headerName: "备用", width: 150 },
  { colId: "total_flow", field: "total_flow", headerName: "总水量", width: 150 },
  { colId: "finishTemp", field: "finishTemp", headerName: "反红温度曲线", width: 150 },
  { colId: "selected", field: "selected", headerName: "选择", width: 150 },,
  ],*/
  /*[
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "totalPass", field: "totalPass", headerName: "矫直总次数", width: 150 },
  { colId: "currPass", field: "currPass", headerName: "矫直当前次数", width: 150 },
  { colId: "entryTime", field: "entryTime", headerName: "进入时间", width: 150 },
  { colId: "endTime", field: "endTime", headerName: "结束时间", width: 150 },
  { colId: "entryTemp", field: "entryTemp", headerName: "钢板温度", width: 150 },
  { colId: "levelerSpeed", field: "levelerSpeed", headerName: "矫直速度", width: 150 },
  { colId: "bitSpeed", field: "bitSpeed", headerName: "咬入速度", width: 150 },
  { colId: "entryGap", field: "entryGap", headerName: "入口辊缝", width: 150 },
  { colId: "exitGap", field: "exitGap", headerName: "出口辊缝", width: 150 },
  { colId: "entrySideRollGap", field: "entrySideRollGap", headerName: "入口边辊高度", width: 150 },
  { colId: "exitSideRollGap", field: "exitSideRollGap", headerName: "出口边辊高度", width: 150 },
  { colId: "tilt1", field: "tilt1", headerName: "倾斜量", width: 150 },
  { colId: "tilt2", field: "tilt2", headerName: "倾动量", width: 150 },
  { colId: "l2Force", field: "l2Force", headerName: "矫直力", width: 150 },
  { colId: "bendPosition", field: "bendPosition", headerName: "弯辊量", width: 150 },
  { colId: "torqueMotor", field: "torqueMotor", headerName: "扭矩", width: 150 },
  { colId: "emptyFlag", field: "emptyFlag", headerName: "是否空过", width: 150 },
  { colId: "spare", field: "spare", headerName: "预留", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "inPlateNo", field: "inPlateNo", headerName: "入口钢板号", width: 150 },
  { colId: "tPlateId", field: "tPlateId", headerName: "头侧板号", width: 150 },
  { colId: "bestSurface", field: "bestSurface", headerName: "好面朝向", width: 150 },
  { colId: "csTemp", field: "csTemp", headerName: "剪切温度", width: 150 },
  { colId: "operatorId", field: "operatorId", headerName: "操作者", width: 150 },
  { colId: "csTime", field: "csTime", headerName: "CS剪切时间", width: 150 },
  { colId: "tPlateThk", field: "tPlateThk", headerName: "头侧板厚度", width: 150 },
  { colId: "tPlateWth", field: "tPlateWth", headerName: "头侧板宽度", width: 150 },
  { colId: "tPlateLth", field: "tPlateLth", headerName: "头侧板长度", width: 150 },
  { colId: "tPlateWgt", field: "tPlateWgt", headerName: "头侧板重量", width: 150 },
  { colId: "tOrdNum", field: "tOrdNum", headerName: "头侧合同数", width: 150 },
  { colId: "tPartMark", field: "tPartMark", headerName: "头侧取板记号", width: 150 },
  { colId: "tProductSum", field: "tProductSum", headerName: "头侧成品板总数", width: 150 },
  { colId: "tTdsLth", field: "tTdsLth", headerName: "头侧剪切长度(头部)", width: 150 },
  { colId: "tBdsLth", field: "tBdsLth", headerName: "头侧剪切长度(尾部)", width: 150 },
  { colId: "tLthMark", field: "tLthMark", headerName: "头侧是否余长标记", width: 150 },
  { colId: "bPlateId", field: "bPlateId", headerName: "尾侧板号", width: 150 },
  { colId: "bPlateThk", field: "bPlateThk", headerName: "尾侧板厚度", width: 150 },
  { colId: "bPlateWth", field: "bPlateWth", headerName: "尾侧板宽度", width: 150 },
  { colId: "bPlateLth", field: "bPlateLth", headerName: "尾侧板长度", width: 150 },
  { colId: "bPlateWgt", field: "bPlateWgt", headerName: "尾侧板重量", width: 150 },
  { colId: "bOrdNum", field: "bOrdNum", headerName: "尾侧合同数", width: 150 },
  { colId: "bPartMark", field: "bPartMark", headerName: "尾侧取板记号", width: 150 },
  { colId: "bProductSum", field: "bProductSum", headerName: "尾侧成品板总数", width: 150 },
  { colId: "bLthMark", field: "bLthMark", headerName: "尾侧是否余长标记", width: 150 },
  { colId: "reserved1", field: "reserved1", headerName: "切边标记（2两切4四切）", width: 150 },
  { colId: "reserved2", field: "reserved2", headerName: "喷印完成标记", width: 150 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 150 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "inPlateNo", field: "inPlateNo", headerName: "入口钢板号", width: 150 },
  { colId: "slCode", field: "slCode", headerName: "剪切线代码", width: 150 },
  { colId: "dssTemp", field: "dssTemp", headerName: "剪切温度", width: 150 },
  { colId: "operatorId", field: "operatorId", headerName: "操作者", width: 150 },
  { colId: "dssTime", field: "dssTime", headerName: "DSS剪切时间", width: 150 },
  { colId: "plateId", field: "plateId", headerName: "实物钢板号", width: 150 },
  { colId: "plateThk", field: "plateThk", headerName: "钢板厚度", width: 150 },
  { colId: "plateWth", field: "plateWth", headerName: "钢板宽度", width: 150 },
  { colId: "plateLth", field: "plateLth", headerName: "钢板长度", width: 150 },
  { colId: "plateWgt", field: "plateWgt", headerName: "钢板重量", width: 150 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 150 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "inPlateNo", field: "inPlateNo", headerName: "入口钢板号", width: 150 },
  { colId: "tPlateNo", field: "tPlateNo", headerName: "头侧板号", width: 150 },
  { colId: "bestSurface", field: "bestSurface", headerName: "好面朝向", width: 150 },
  { colId: "dsTemp", field: "dsTemp", headerName: "剪切温度", width: 150 },
  { colId: "operatorId", field: "operatorId", headerName: "操作者", width: 150 },
  { colId: "slCode", field: "slCode", headerName: "剪切线代码", width: 150 },
  { colId: "dsTime", field: "dsTime", headerName: "CS剪切时间", width: 150 },
  { colId: "tPlateThk", field: "tPlateThk", headerName: "头侧板厚度", width: 150 },
  { colId: "tPlateWth", field: "tPlateWth", headerName: "头侧板宽度", width: 150 },
  { colId: "tPlateLth", field: "tPlateLth", headerName: "头侧板长度", width: 150 },
  { colId: "tPlateWgt", field: "tPlateWgt", headerName: "头侧板重量", width: 150 },
  { colId: "tOrdNum", field: "tOrdNum", headerName: "头侧合同数", width: 150 },
  { colId: "tPartMark", field: "tPartMark", headerName: "头侧取板记号", width: 150 },
  { colId: "tProductSum", field: "tProductSum", headerName: "头侧成品板总数", width: 150 },
  { colId: "tTdsLth", field: "tTdsLth", headerName: "头侧剪切长度(头部)", width: 150 },
  { colId: "tBdsLth", field: "tBdsLth", headerName: "头侧剪切长度(尾部)", width: 150 },
  { colId: "tLthMark", field: "tLthMark", headerName: "头侧是否余长标记", width: 150 },
  { colId: "bPlateNo", field: "bPlateNo", headerName: "尾侧板号", width: 150 },
  { colId: "bPlateThk", field: "bPlateThk", headerName: "尾侧板厚度", width: 150 },
  { colId: "bPlateWth", field: "bPlateWth", headerName: "尾侧板宽度", width: 150 },
  { colId: "bPlateLth", field: "bPlateLth", headerName: "尾侧板长度", width: 150 },
  { colId: "bPlateWgt", field: "bPlateWgt", headerName: "尾侧板重量", width: 150 },
  { colId: "bOrdNum", field: "bOrdNum", headerName: "尾侧合同数", width: 150 },
  { colId: "bPartMark", field: "bPartMark", headerName: "尾侧取板记号", width: 150 },
  { colId: "bProductSum", field: "bProductSum", headerName: "尾侧成品板总数", width: 150 },
  { colId: "bLthMark", field: "bLthMark", headerName: "尾侧是否余长标记", width: 150 },
  { colId: "reserved0", field: "reserved0", headerName: "头侧板成品毛长", width: 150 },
  { colId: "reserved1", field: "reserved1", headerName: "切边标记（2两切4四切）", width: 150 },
  { colId: "reserved2", field: "reserved2", headerName: "喷印完成标记", width: 150 },
  { colId: "reserved3", field: "reserved3", headerName: "预留3", width: 150 },
  { colId: "cropCutLenTop", field: "cropCutLenTop", headerName: "CROP", width: 150 },
  { colId: "cropCutLenBottom", field: "cropCutLenBottom", headerName: "CROP", width: 150 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 150 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 150 },
  { colId: "actMaxWth", field: "actMaxWth", headerName: "头侧宽度最大值（仪表)", width: 150 },
  { colId: "actMinWth", field: "actMinWth", headerName: "头侧宽度最小值（仪表)", width: 150 },
  { colId: "actAveWth", field: "actAveWth", headerName: "头侧宽度最平均值（仪表)", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "dHandle", field: "dHandle", headerName: "处理时间", width: 150, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "处理结果", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 150 },
  { colId: "operatorId", field: "operatorId", headerName: "操作者", width: 150 },
  { colId: "bestSurface", field: "bestSurface", headerName: "好面朝向", width: 150 },
  { colId: "sampleTime", field: "sampleTime", headerName: "取样时间", width: 150 },
  { colId: "samplePos", field: "samplePos", headerName: "取样位置", width: 150 },
  { colId: "sampleLth", field: "sampleLth", headerName: "取样长度", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 150 },
  { colId: "bestSurface", field: "bestSurface", headerName: "好面朝向", width: 150 },
  { colId: "checkEmp", field: "checkEmp", headerName: "检查人员", width: 150 },
  { colId: "signEmp", field: "signEmp", headerName: "签发人员", width: 150 },
  { colId: "empId", field: "empId", headerName: "UST责任者", width: 150 },
  { colId: "ustDt", field: "ustDt", headerName: "UST测定时间", width: 150 },
  { colId: "ustResult", field: "ustResult", headerName: "UST结果", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "slabno", field: "slabno", headerName: "板坯号", width: 150 },
  { colId: "ocrslabno", field: "ocrslabno", headerName: "原始照核板坯号", width: 150 },
  { colId: "l2slabno", field: "l2slabno", headerName: "L2请求板坯号", width: 150 },
  { colId: "reason", field: "reason", headerName: "原因", width: 150 },
  { colId: "reviser", field: "reviser", headerName: "修改人", width: 150 },
  { colId: "time", field: "time", headerName: "发送时刻", width: 150 },
  { colId: "spare1", field: "spare1", headerName: "预留1", width: 150 },
  { colId: "spare2", field: "spare2", headerName: "预留2", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "plateno", field: "plateno", headerName: "钢板号", width: 150 },
  { colId: "slabno", field: "slabno", headerName: "板坯号", width: 150 },
  { colId: "planno", field: "planno", headerName: "计划号", width: 150 },
  { colId: "wedge", field: "wedge", headerName: "楔形", width: 150 },
  { colId: "centerthickness", field: "centerthickness", headerName: "中心线厚度曲线", width: 150 },
  { colId: "width", field: "width", headerName: "宽度曲线", width: 150 },
  { colId: "spare1", field: "spare1", headerName: "预留1", width: 150 },
  { colId: "spare2", field: "spare2", headerName: "预留2", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "plateno", field: "plateno", headerName: "钢板号", width: 150 },
  { colId: "slabno", field: "slabno", headerName: "板坯号", width: 150 },
  { colId: "planno", field: "planno", headerName: "计划号", width: 150 },
  { colId: "osthickness", field: "osthickness", headerName: "操作侧厚度曲线", width: 150 },
  { colId: "dsthickness", field: "dsthickness", headerName: "传动侧厚度曲线", width: 150 },
  { colId: "spare1", field: "spare1", headerName: "预留1", width: 150 },
  { colId: "spare2", field: "spare2", headerName: "预留2", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "hSBheadAveWidth", field: "hSBheadAveWidth", headerName: "HSB测宽头部平均宽度(冷态)", width: 150 },
  { colId: "hSBbodyAveWidth", field: "hSBbodyAveWidth", headerName: "HSB测宽中部平均宽度(冷态)", width: 150 },
  { colId: "hSBtailAveWidth", field: "hSBtailAveWidth", headerName: "HSB测宽尾部平均宽度(冷态)", width: 150 },
  { colId: "hSBaveWidth", field: "hSBaveWidth", headerName: "HSB测宽全长平均宽度(冷态)", width: 150 },
  { colId: "rMheadAveWidth", field: "rMheadAveWidth", headerName: "RM测宽头部平均宽度(冷态)", width: 150 },
  { colId: "rMbodyAveWidth", field: "rMbodyAveWidth", headerName: "RM测宽中部平均宽度(冷态)", width: 150 },
  { colId: "rMtailAveWidth", field: "rMtailAveWidth", headerName: "RM测宽尾部平均宽度(冷态)", width: 150 },
  { colId: "rMaveWidth", field: "rMaveWidth", headerName: "RM测宽全长平均宽度(冷态)", width: 150 },
  { colId: "rSLTmaxWidth", field: "rSLTmaxWidth", headerName: "平直度仪最大宽度(冷态)", width: 150 },
  { colId: "rSLTminWidth", field: "rSLTminWidth", headerName: "平直度仪最小宽度(冷态)", width: 150 },
  { colId: "rSLTavewidth", field: "rSLTavewidth", headerName: "平直度仪平均宽度(冷态)", width: 150 },
  { colId: "spare1", field: "spare1", headerName: "预留", width: 150, hide: true },
  { colId: "spare2", field: "spare2", headerName: "预留", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "plateno", field: "plateno", headerName: "钢板号", width: 150 },
  { colId: "slabno", field: "slabno", headerName: "板坯号", width: 150 },
  { colId: "planno", field: "planno", headerName: "计划号", width: 150 },
  { colId: "finishtemp", field: "finishtemp", headerName: "终轧温度曲线", width: 150 },
  { colId: "spare1", field: "spare1", headerName: "预留1", width: 150 },
  { colId: "spare2", field: "spare2", headerName: "预留2", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "time", field: "time", headerName: "发送时刻", width: 150 },
  { colId: "shift", field: "shift", headerName: "班次", width: 150 },
  { colId: "turn", field: "turn", headerName: "班组", width: 150 },
  { colId: "n2Flow1", field: "n2Flow1", headerName: "氮气流量1", width: 150 },
  { colId: "n2Pressure1", field: "n2Pressure1", headerName: "氮气压力1", width: 150 },
  { colId: "n2Consumption1", field: "n2Consumption1", headerName: "氮气累计消耗1", width: 150 },
  { colId: "gasFlow1", field: "gasFlow1", headerName: "煤气流量1", width: 150 },
  { colId: "gasPressure1", field: "gasPressure1", headerName: "煤气压力1", width: 150 },
  { colId: "gasConsumption1", field: "gasConsumption1", headerName: "煤气累计消耗1", width: 150 },
  { colId: "steamFlow1", field: "steamFlow1", headerName: "蒸汽流量1", width: 150 },
  { colId: "steamPressure1", field: "steamPressure1", headerName: "蒸汽压力1", width: 150 },
  { colId: "steamConsumption1", field: "steamConsumption1", headerName: "蒸汽累计消耗1", width: 150 },
  { colId: "n2Flow2", field: "n2Flow2", headerName: "氮气流量2", width: 150 },
  { colId: "n2Pressure2", field: "n2Pressure2", headerName: "氮气压力2", width: 150 },
  { colId: "n2Consumption2", field: "n2Consumption2", headerName: "氮气累计消耗2", width: 150 },
  { colId: "gasFlow2", field: "gasFlow2", headerName: "煤气流量2", width: 150 },
  { colId: "gasPressure2", field: "gasPressure2", headerName: "煤气压力2", width: 150 },
  { colId: "gasConsumption2", field: "gasConsumption2", headerName: "煤气累计消耗2", width: 150 },
  { colId: "steamFlow2", field: "steamFlow2", headerName: "蒸汽流量2", width: 150 },
  { colId: "steamPressure2", field: "steamPressure2", headerName: "蒸汽压力2", width: 150 },
  { colId: "steamConsumption2", field: "steamConsumption2", headerName: "蒸汽累计消耗2", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "spare1", field: "spare1", headerName: "预留1", width: 150, hide: true },
  { colId: "spare2", field: "spare2", headerName: "预留2", width: 150, hide: true },
  { colId: "spare3", field: "spare3", headerName: "预留3", width: 150, hide: true },
  { colId: "spare4", field: "spare4", headerName: "预留4", width: 150, hide: true },
  { colId: "spare5", field: "spare5", headerName: "预留5", width: 150, hide: true },
  { colId: "spare6", field: "spare6", headerName: "预留6", width: 150, hide: true },
  { colId: "spare7", field: "spare7", headerName: "预留7", width: 150, hide: true },
  { colId: "spare8", field: "spare8", headerName: "预留8", width: 150, hide: true },
  { colId: "spare9", field: "spare9", headerName: "预留9", width: 150, hide: true },
  { colId: "spare10", field: "spare10", headerName: "预留10", width: 150, hide: true },
  { colId: "spare11", field: "spare11", headerName: "预留11", width: 150, hide: true },
  { colId: "spare12", field: "spare12", headerName: "预留12", width: 150, hide: true },
  { colId: "spare13", field: "spare13", headerName: "预留13", width: 150, hide: true },
  { colId: "spare14", field: "spare14", headerName: "预留14", width: 150, hide: true },
  { colId: "spare15", field: "spare15", headerName: "预留15", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 150 },
  { colId: "posNo", field: "posNo", headerName: "请求位置", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 150 },
  { colId: "posCode", field: "posCode", headerName: "下线点", width: 150 },
  { colId: "unloadRsn", field: "unloadRsn", headerName: "下线原因", width: 150 },
  { colId: "unloadPos", field: "unloadPos", headerName: "下线位置", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
  /*[
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 150 },
  { colId: "subId", field: "subId", headerName: "批号", width: 150 },
  { colId: "plateLen", field: "plateLen", headerName: "钢板长度", width: 150 },
  { colId: "headCutLen", field: "headCutLen", headerName: "板头", width: 150 },
  { colId: "tailCutLen", field: "tailCutLen", headerName: "板尾", width: 150 },
  { colId: "errorCode", field: "errorCode", headerName: "异常代码", width: 150 },
  { colId: "opBend", field: "opBend", headerName: "OP侧镰刀弯量", width: 150 },
  { colId: "drBend", field: "drBend", headerName: "DR侧镰刀弯量", width: 150 },
  { colId: "opBendindex", field: "opBendindex", headerName: "OP侧镰刀弯量坐标", width: 150 },
  { colId: "drBendindex", field: "drBendindex", headerName: "DR侧镰刀弯量坐标", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },,
  ],*/
];

const activeTab = ref(0);
const tabRows = ref<unknown[][]>(tabs.map(() => []));
const tabApis = ref<(GridApi | null)[]>(tabs.map(() => null));
const tabLoading = ref(false);
function onTabReady(i: number, e: GridReadyEvent) {
  tabApis.value[i] = e.api;
}

function baseDto(): DtoQueryL2 {
  const m = currentMat!;
  return {
    planNo: m.cOrderNo ?? null,
    slabNo: m.cPieceNo ?? null,
    inPlateNo: m.cPlateNo ?? null,
    plateNo: m.cPlateNo ?? null,
    cPrintCode: m.cPrintCode ?? null,
    cBatchNo: m.cBatchNo ?? null,
  };
}

async function loadTab(i: number) {
  if (!currentMat) {
    tabRows.value[i] = [];
    return;
  }
  const t = tabs[i];
  let dto: DtoQueryL2;
  if (t.special === "batchOrder") {
    dto = { cBatchOrder: `${currentMat.cBatchNo}-${currentMat.nOrder}` };
  } else if (t.special === "slabBatch") {
    dto = { slabNo: currentMat.cPieceNo ?? null, cBatchNo: currentMat.cBatchNo ?? null };
  } else {
    dto = baseDto();
  }
  tabLoading.value = true;
  try {
    tabRows.value[i] = (await t.fn(dto)) ?? [];
    requestAnimationFrame(() => tabApis.value[i]?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    tabLoading.value = false;
  }
}

async function onMatSelected() {
  const row = (matApi.value?.getSelectedRows()[0] as Thr3010 | undefined) ?? null;
  currentMat = row;
  if (!row) {
    for (const arr of tabRows.value) arr.splice(0);
    return;
  }
  await loadTab(activeTab.value);
}

function onTabChange(v: string | number) {
  activeTab.value = Number(v);
  void loadTab(activeTab.value);
}

/* ---------- 测试（原 btnTest：定尺剪实绩焦点行 AddSj） ---------- */
const testing = ref(false);
async function btnTest() {
  if (activeTab.value !== 11) {
    toast("请切换到「定尺剪实绩」页签并选中一行", 2500, "warn");
    return;
  }
  const row = tabApis.value[11]?.getSelectedRows()[0] as Record<string, unknown> | undefined;
  if (!row) {
    toast("请选择后再操作", 2500, "warn");
    return;
  }
  testing.value = true;
  try {
    await hR4000Api.addSj(row as Parameters<typeof hR4000Api.addSj>[0]);
    toast("同步成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    testing.value = false;
  }
}

onMounted(async () => {
  try {
    const devices = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = devices.map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    if (!lineCode.value && lineOptions.value.length) lineCode.value = lineOptions.value[0].value;
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件 -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产线代码</label>
        <Select
          v-model="lineCode"
          :options="lineOptions"
          option-label="label"
          option-value="value"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批时间</label>
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
      <div class="col-span-3 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="testing" @click="btnTest">测试</Button>
      </div>
    </div>

    <!-- 上：组批计划 + 计划材料明细 -->
    <div class="flex min-h-0 flex-[5] flex-col">
      <Splitter class="min-h-0 flex-1">
        <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
          <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
            <span class="text-xs font-medium text-muted-foreground">组批计划</span>
          </div>
          <div class="min-h-0 flex-1 overflow-hidden">
            <AgGridVue
              class="hmx-ag-grid h-full w-full"
              :theme="theme"
              :locale-text="AG_GRID_LOCALE_CN"
              :default-col-def="hmxDefaultColDef"
              :column-defs="planColDefs"
              :row-data="planRows"
              :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
              :pagination="false"
              :animate-rows="false"
              :loading="loading"
              @grid-ready="onPlanReady"
              @selection-changed="onPlanSelected"
              @first-data-rendered="autoSizeOnFirstData"
            />
          </div>
        </SplitterPanel>
        <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
          <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
            <span class="text-xs font-medium text-muted-foreground">计划材料明细</span>
          </div>
          <div class="min-h-0 flex-1 overflow-hidden">
            <AgGridVue
              class="hmx-ag-grid h-full w-full"
              :theme="theme"
              :locale-text="AG_GRID_LOCALE_CN"
              :default-col-def="hmxDefaultColDef"
              :column-defs="matColDefs"
              :row-data="matRows"
              :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
              :pagination="false"
              :animate-rows="false"
              @grid-ready="onMatReady"
              @selection-changed="onMatSelected"
              @first-data-rendered="autoSizeOnFirstData"
            />
          </div>
        </SplitterPanel>
      </Splitter>
    </div>

    <!-- 下：23 个接口页签 -->
    <Tabs
      :value="activeTab"
      class="flex min-h-0 flex-[5] flex-col border-t border-border/60"
      @update:value="onTabChange"
    >
      <TabList class="flex-wrap">
        <Tab v-for="(t, i) in tabs" :key="i" :value="i">{{ t.label }}</Tab>
      </TabList>
      <TabPanels class="min-h-0 flex-1">
        <TabPanel v-for="(t, i) in tabs" :key="i" :value="i" class="h-full p-0">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="tabCols[i] ?? []"
            :row-data="tabRows[i]"
            :pagination="false"
            :animate-rows="false"
            :loading="tabLoading"
            @grid-ready="(e: GridReadyEvent) => onTabReady(i, e)"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
