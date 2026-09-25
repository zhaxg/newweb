<script setup lang="ts">
/** 对应 FrmHR5400_JC（棒材收料管理）：DDH.Winforms.SHR.Forms.ThrBar.FrmHR5400_JC
 *  已接入：tPa1000Api.queryLines / hR5400JCApi.getThr3000s / getThr3010s / getThr4000s / canelZp / addJcSj / saveChange
 *  待接入：二级弹窗 FrmHR5400_JCAdd（补充组批选料，OK 后回刷组批计划/材料明细）
 *  偏差：产线下拉默认值 = 菜单 cQueryString（缺省回落产线接口第一项）；
 *        原 colCTrimFlag 走 KV 字典 KeyValueFormatters.CUTFLAG 翻译，web 暂无该字典接口，显示原值；
 *        收料实绩行内编辑（gridView3 未设 ReadOnly），增删改经 saveChange 提交（原 dpc.Proxy<IHR5400JCAppService>().SaveChange） */

import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { TrackableList } from "@/api/common/trackableList";
import {
  hR5400JCApi,
  tPa1000Api,
  Thr3000StatusEnum,
  type Thr3000,
  type Thr3010,
  type Thr4000,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 时间范围（原 ucTimeRange2，默认本月 1 号 0 点 ~ 下月 1 号前 1 秒） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 产线下拉（原 imageComboBoxEdit1，ITpa1000AppService.QueryLines；默认产线 = 菜单 cQueryString） ---------- */
const { parts: menuQs } = useMenuQuery();
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string>(menuQs[0] ?? "");

/* ---------- 组批计划查询条件（DtoHR5400JcQuery） ---------- */
const query = reactive({
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  cBatchNo: "",
  dates: monthRange() as Date[] | null,
});
const nQua = ref<number>(0);

/* ---------- 组批计划（gridView1 / Thr3000，聚焦行=单选） ---------- */
const planRows = ref<Thr3000[]>([]);
const planLoading = ref(false);
const planApi = ref<GridApi | null>(null);
const planCurrent = ref<Thr3000 | null>(null);
function onPlanReady(e: GridReadyEvent) {
  planApi.value = e.api;
}
function onPlanSelectionChanged() {
  const row = (planApi.value?.getSelectedRows()[0] as Thr3000 | undefined) ?? null;
  planCurrent.value = row;
  void onPlanFocused(row);
}
async function onPlanFocused(row: Thr3000 | null) {
  await dataBindThr3010(row);
  await dataBindThr4000(row);
}

/* ---------- 材料明细（gridView2 / Thr3010，勾选=Selected 多选） ---------- */
const mxRows = ref<Thr3010[]>([]);
const mxLoading = ref(false);
const mxApi = ref<GridApi | null>(null);
function onMxReady(e: GridReadyEvent) {
  mxApi.value = e.api;
}

/* ---------- 收料实绩（gridView3 / Thr4000，行内编辑 TrackableList） ---------- */
const trackList = shallowRef<TrackableList<Thr4000>>(new TrackableList<Thr4000>());
const sjLoading = ref(false);
const sjApi = ref<GridApi | null>(null);
const sjCurrent = ref<Thr4000 | null>(null);
function onSjReady(e: GridReadyEvent) {
  sjApi.value = e.api;
}
function onSjSelectionChanged() {
  sjCurrent.value = (sjApi.value?.getSelectedRows()[0] as Thr4000 | undefined) ?? null;
}

/* ---------- 列定义 ---------- */
const statusFmt = (p: ValueFormatterParams) => {
  const m: Record<string, string> = {
    [String(Thr3000StatusEnum.Batch)]: "已组批",
    [String(Thr3000StatusEnum.Ensure)]: "已确认",
    [String(Thr3000StatusEnum.Issue)]: "已下发",
    [String(Thr3000StatusEnum.Begin)]: "开始生产",
    [String(Thr3000StatusEnum.Finish)]: "轧制完成",
    [String(Thr3000StatusEnum.Close)]: "计划关闭",
  };
  return m[String(p.value)] ?? "";
};
const lengthTypeFmt = (p: ValueFormatterParams) =>
  (({ F: "范围尺", D: "定尺" }) as Record<string, string>)[String(p.value)] ?? "";

const planColDefs: ColDef[] = [
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "计划母板长", width: 125 },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 112, valueFormatter: lengthTypeFmt },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112 },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 125 },
  { colId: "nRateSj", field: "nRateSj", headerName: "实际成材率", width: 125 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 112 },
  { colId: "cRemark", field: "cRemark", headerName: "生产备注", width: 112 },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 112, valueFormatter: statusFmt },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 112, hide: true },
  { colId: "nWgtOrder", field: "nWgtOrder", headerName: "排产量", width: 112, hide: true },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 112, hide: true },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 125, hide: true },
  { colId: "cConfirmGroup", field: "cConfirmGroup", headerName: "收料班组", width: 112, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
];

const mxColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 112 },
  /* 以下 Designer 未排 VisibleIndex，以 hide 迁入 */
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 150, hide: true },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112, hide: true },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 125, hide: true },
  { colId: "nFurStatus", field: "nFurStatus", headerName: "加热炉状态", width: 125, hide: true },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 125, hide: true },
  { colId: "nRollStatus", field: "nRollStatus", headerName: "轧制状态", width: 112, hide: true },
  { colId: "cRollCode", field: "cRollCode", headerName: "轧机编号", width: 112, hide: true },
  { colId: "cFinishEmp", field: "cFinishEmp", headerName: "轧制完成人", width: 125, hide: true },
  { colId: "dRoll", field: "dRoll", headerName: "轧制完成时间", width: 138, hide: true },
  { colId: "cRollShift", field: "cRollShift", headerName: "轧制完成班次", width: 138, hide: true },
  { colId: "cRollGroup", field: "cRollGroup", headerName: "轧制完成班组", width: 138, hide: true },
  { colId: "nJqStatus", field: "nJqStatus", headerName: "剪切计划状态", width: 138, hide: true },
  { colId: "cJqCode", field: "cJqCode", headerName: "剪切设备", width: 112, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "L2计划状态", width: 125, hide: true },
  { colId: "cRowNo", field: "cRowNo", headerName: "道号", width: 112, hide: true },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 112, hide: true },
  { colId: "cPos", field: "cPos", headerName: "当前位置", width: 112, hide: true },
  { colId: "nWdRl", field: "nWdRl", headerName: "入炉温度", width: 112, hide: true },
  { colId: "cShiftRl", field: "cShiftRl", headerName: "入炉班次", width: 112, hide: true },
  { colId: "cGroupRl", field: "cGroupRl", headerName: "入炉班组", width: 112, hide: true },
  { colId: "dRl", field: "dRl", headerName: "入炉时间", width: 140, hide: true },
  { colId: "nWdCl", field: "nWdCl", headerName: "出炉温度", width: 112, hide: true },
  { colId: "cShiftCl", field: "cShiftCl", headerName: "出炉班次", width: 112, hide: true },
  { colId: "cGroupCl", field: "cGroupCl", headerName: "出炉班组", width: 112, hide: true },
  { colId: "dCl", field: "dCl", headerName: "出炉时间", width: 140, hide: true },
  { colId: "nOrderPlan", field: "nOrderPlan", headerName: "计划生产顺序", width: 138, hide: true },
  { colId: "nOrderSj", field: "nOrderSj", headerName: "实际生产顺序", width: 138, hide: true },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 112, hide: true },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112, hide: true },
  { colId: "cFlag", field: "cFlag", headerName: "材料标记", width: 112, hide: true },
  { colId: "zh", field: "zh", headerName: "照核信息", width: 112, hide: true },
  { colId: "sgd", field: "sgd", headerName: "上辊道信息", width: 125, hide: true },
  { colId: "fur", field: "fur", headerName: "加热信息", width: 112, hide: true },
  { colId: "roll", field: "roll", headerName: "轧制信息", width: 112, hide: true },
  { colId: "yc", field: "yc", headerName: "轧制异常信息", width: 138, hide: true },
  { colId: "yjz", field: "yjz", headerName: "预矫直信息", width: 125, hide: true },
  { colId: "rjz", field: "rjz", headerName: "热矫直信息", width: 125, hide: true },
  { colId: "ckl", field: "ckl", headerName: "超快冷信息", width: 125, hide: true },
];

const sjColDefs: ColDef[] = [
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, editable: true },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112, editable: true },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112, editable: true },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112, editable: true },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112, editable: true },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112, editable: true },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112, editable: true },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112, editable: true },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112, editable: true },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112, editable: true },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112, editable: true },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112, editable: true },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112, editable: true },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112, editable: true },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态代码", width: 138, editable: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125, editable: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112, editable: true },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112, editable: true },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112, editable: true },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名", width: 112, editable: true },
  { colId: "cWgtToler", field: "cWgtToler", headerName: "重量偏差等级", width: 138, editable: true },
  /* 以下 Designer 未排 VisibleIndex，以 hide 迁入 */
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cPlanId", field: "cPlanId", headerName: "THR2000", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000", width: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 150, hide: true },
  { colId: "nOrder", field: "nOrder", headerName: "支数", width: 112, hide: true },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 112, hide: true },
  { colId: "cMatCode", field: "cMatCode", headerName: "物料编码", width: 112, hide: true },
  { colId: "cMatName", field: "cMatName", headerName: "物料描述", width: 112, hide: true },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 112, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112, hide: true },
  { colId: "cEngMinThick", field: "cEngMinThick", headerName: "厚度下偏差", width: 125, hide: true },
  { colId: "cEngMaxThick", field: "cEngMaxThick", headerName: "厚度上偏差", width: 125, hide: true },
  { colId: "cEngMinWidth", field: "cEngMinWidth", headerName: "宽度下偏差", width: 125, hide: true },
  { colId: "cEngMaxWidth", field: "cEngMaxWidth", headerName: "宽度上偏差", width: 125, hide: true },
  { colId: "cEngMinLen", field: "cEngMinLen", headerName: "长度下偏差", width: 125, hide: true },
  { colId: "cEngMaxLen", field: "cEngMaxLen", headerName: "长度上偏差", width: 125, hide: true },
  { colId: "cCustCode", field: "cCustCode", headerName: "客户编码", width: 112, hide: true },
  { colId: "cCustName", field: "cCustName", headerName: "客户名称", width: 112, hide: true },
  { colId: "dDeliveryDate", field: "dDeliveryDate", headerName: "交货日期", width: 140, hide: true },
  { colId: "dOrdDate", field: "dOrdDate", headerName: "订单日期", width: 140, hide: true },
  { colId: "cSpecReqText", field: "cSpecReqText", headerName: "客户特殊要求", width: 138, hide: true },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 112, hide: true },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 164, hide: true },
  {
    colId: "cConsigneeCustCname",
    field: "cConsigneeCustCname",
    headerName: "收货客户中文名称",
    width: 164,
    hide: true,
  },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "坯料件次号", width: 125, hide: true },
  { colId: "cSgCodeSlab", field: "cSgCodeSlab", headerName: "坯料钢种", width: 112, hide: true },
  { colId: "cSgStdSlab", field: "cSgStdSlab", headerName: "坯料执行标准", width: 138, hide: true },
  { colId: "cSpecSlab", field: "cSpecSlab", headerName: "坯料规格", width: 112, hide: true },
  { colId: "nThickSlab", field: "nThickSlab", headerName: "坯料厚度", width: 112, hide: true },
  { colId: "nWidthSlab", field: "nWidthSlab", headerName: "坯料宽度", width: 112, hide: true },
  { colId: "nLenSlab", field: "nLenSlab", headerName: "坯料长度", width: 112, hide: true },
  { colId: "nQuaSlab", field: "nQuaSlab", headerName: "坯料支数", width: 112, hide: true },
  { colId: "nWgtSlab", field: "nWgtSlab", headerName: "坯料重量", width: 112, hide: true },
  { colId: "cMatCodeSlab", field: "cMatCodeSlab", headerName: "坯料物料编码", width: 138, hide: true },
  { colId: "cMatNameSlab", field: "cMatNameSlab", headerName: "坯料物料名称", width: 138, hide: true },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 112, hide: true },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 125, hide: true },
  { colId: "cRollCode", field: "cRollCode", headerName: "轧机编号", width: 112, hide: true },
  { colId: "dFinish", field: "dFinish", headerName: "完成时间", width: 140, hide: true },
  { colId: "cFinishShift", field: "cFinishShift", headerName: "完成班次", width: 112, hide: true },
  { colId: "cFinishGroup", field: "cFinishGroup", headerName: "完成班组", width: 112, hide: true },
  { colId: "cFinishEmp", field: "cFinishEmp", headerName: "收料完成人", width: 125, hide: true },
  { colId: "cConfirmStatus", field: "cConfirmStatus", headerName: "收料状态", width: 112, hide: true },
  { colId: "cConfirmShift", field: "cConfirmShift", headerName: "收料班次", width: 112, hide: true },
  { colId: "cConfirmGroup", field: "cConfirmGroup", headerName: "收料班组", width: 112, hide: true },
  { colId: "cConfirmEmp", field: "cConfirmEmp", headerName: "收料完成人", width: 125, hide: true },
  { colId: "dConfirm", field: "dConfirm", headerName: "收料完成时间", width: 138, hide: true },
  { colId: "cSurfaceResult", field: "cSurfaceResult", headerName: "表检结果", width: 112, hide: true },
  { colId: "dSurfaceTime", field: "dSurfaceTime", headerName: "表检时间", width: 140, hide: true },
  { colId: "cSurfaceUser", field: "cSurfaceUser", headerName: "表检人", width: 112, hide: true },
  { colId: "cSurfaceRemark", field: "cSurfaceRemark", headerName: "表检说明", width: 112, hide: true },
  { colId: "cRespDept", field: "cRespDept", headerName: "责任部门", width: 112, hide: true },
  { colId: "cFaceHandleAdvice", field: "cFaceHandleAdvice", headerName: "处置意见", width: 112, hide: true },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 112, hide: true },
  { colId: "cSampleLotNoSlab", field: "cSampleLotNoSlab", headerName: "坯料试批号", width: 125, hide: true },
  { colId: "cQmHandleDesc", field: "cQmHandleDesc", headerName: "处置注释", width: 112, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "入库状态", width: 112, hide: true },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 112, hide: true },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 112, hide: true },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 112, hide: true },
];

/* ---------- 数据绑定 ---------- */
async function dataBindThr3000() {
  planLoading.value = true;
  try {
    const list =
      (await hR5400JCApi.getThr3000s({
        cLineCode: lineCode.value || undefined,
        cOrderNo: query.cOrderNo.trim() || undefined,
        cSgCode: query.cSgCode.trim() || undefined,
        cSgStd: query.cSgStd.trim() || undefined,
        cBatchNo: query.cBatchNo.trim() || undefined,
        dCreateTimeRange: toTimeRange(query.dates),
      })) ?? [];
    planRows.value = list;
    planCurrent.value = null;
    mxRows.value = [];
    trackList.value = new TrackableList<Thr4000>();
    requestAnimationFrame(() => planApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    planLoading.value = false;
  }
}

async function dataBindThr3010(thr3000: Thr3000 | null) {
  mxLoading.value = true;
  try {
    if (!thr3000) {
      mxRows.value = [];
      return;
    }
    const list =
      (await hR5400JCApi.getThr3010s({
        cLineCode: thr3000.cLineCode,
        cBatchNo: thr3000.cBatchNo,
      })) ?? [];
    mxRows.value = list;
    requestAnimationFrame(() => mxApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    mxLoading.value = false;
  }
}

async function dataBindThr4000(thr3000?: Thr3000 | null) {
  const row = thr3000 ?? planCurrent.value;
  sjLoading.value = true;
  try {
    if (!row) {
      trackList.value = new TrackableList<Thr4000>();
      return;
    }
    const list =
      (await hR5400JCApi.getThr4000s({
        cLineCode: row.cLineCode,
        cBatchNo: row.cBatchNo,
      })) ?? [];
    trackList.value = new TrackableList<Thr4000>(list);
    sjCurrent.value = null;
    requestAnimationFrame(() => sjApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    sjLoading.value = false;
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

/* ---------- 撤销组批 ---------- */
async function doCanelZp() {
  const thr3000 = planCurrent.value;
  if (!thr3000) return;
  const sel = (mxApi.value?.getSelectedRows() ?? []) as Thr3010[];
  const cMxIds = sel.map((x) => x.id).filter((x): x is string => !!x);
  try {
    await hR5400JCApi.canelZp({
      cLineCode: thr3000.cLineCode,
      cBatchNo: thr3000.cBatchNo,
      cMxIds,
    });
    toast("数据提交成功！", 2000, "success");
    await dataBindThr3000();
    await dataBindThr3010(planCurrent.value);
  } catch {
    /* 拦截层已 toast */
  }
}
function btnCanelZp() {
  if (planRows.value.length === 0) return;
  const thr3000 = planCurrent.value;
  if (!thr3000) {
    toast("请选择组批计划！", 2000, "warn");
    return;
  }
  if (mxRows.value.length === 0) return;
  const sel = (mxApi.value?.getSelectedRows() ?? []) as Thr3010[];
  if (sel.length === 0) {
    toast("请选择材料明细进行操作！", 2000, "warn");
    return;
  }
  askConfirm("是否确认撤销组批所选材料！", doCanelZp);
}

/* ---------- 补充组批（二级弹窗待接入） ---------- */
function btnAddSlab() {
  if (planRows.value.length === 0) return;
  const thr3000 = planCurrent.value;
  if (!thr3000) {
    toast("请选择组批计划进行操作！", 2000, "warn");
    return;
  }
  // 原 FrmHR5400_JCAdd：弹窗选料补充组批，OK 后回刷组批计划/材料明细
  toast("补充组批弹窗 FrmHR5400_JCAdd 待接入", 2500, "warn");
}

/* ---------- 添加收料实绩 ---------- */
async function doAdd() {
  const thr3000 = planCurrent.value;
  if (!thr3000) return;
  try {
    await hR5400JCApi.addJcSj({
      cLineCode: thr3000.cLineCode,
      nQua: nQua.value ?? 0,
      cZpId: thr3000.id,
    });
    toast("数据提交成功！", 2000, "success");
    await dataBindThr4000(thr3000);
  } catch {
    /* 拦截层已 toast */
  }
}
function btnAdd() {
  if (planRows.value.length === 0) return;
  const thr3000 = planCurrent.value;
  if (!thr3000) {
    toast("请选择组批计划！", 2000, "warn");
    return;
  }
  const n = nQua.value ?? 0;
  if (n <= 0) {
    toast("请输入添加数量！", 2000, "warn");
    return;
  }
  askConfirm(`是否确认添加批号${thr3000.cBatchNo}的${n}件收料实绩`, doAdd);
}

/* ---------- 删除 / 保存（TrackableList 跟踪增删改，经 hR5400JC.saveChange 提交） ---------- */
function btnDel() {
  const row = sjCurrent.value;
  if (!row) {
    toast("请选择实绩进行操作！", 2000, "warn");
    return;
  }
  trackList.value.remove((r) => r.id === row.id);
  sjApi.value?.applyTransaction({ remove: [row] });
  sjCurrent.value = null;
}

function onSjCellValueChanged(e: CellValueChangedEvent) {
  sjApi.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}

async function doSave() {
  const thr3000 = planCurrent.value;
  if (!thr3000) return;
  try {
    await hR5400JCApi.saveChange(trackList.value.SaveChangesData);
    toast("数据提交成功！", 2000, "success");
    sjApi.value?.refreshCells({ force: true });
    await dataBindThr4000(thr3000);
  } catch {
    /* 拦截层已 toast */
  }
}
function btnSave() {
  const thr3000 = planCurrent.value;
  if (!thr3000) return;
  const diff = trackList.value.SaveChangesData;
  // 只要不发生更改就不保存
  if (diff.changedItems.length === 0 && diff.deletedItems.length === 0) return;
  askConfirm(`是否确认保存批号${thr3000.cBatchNo}的产出实绩？`, doSave);
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
    <!-- 条件区 2 行 × 6 列：行1=订单号/钢种/执行标准；行2=时间范围+产线+批号+三按钮 -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <!-- 行 1 -->
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="query.cOrderNo" class="min-w-0 flex-1" @keydown.enter="dataBindThr3000" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="query.cSgCode" class="min-w-0 flex-1" @keydown.enter="dataBindThr3000" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="query.cSgStd" class="min-w-0 flex-1" @keydown.enter="dataBindThr3000" />
      </div>
      <div />
      <div />
      <div />
      <!-- 行 2：时间范围(1–2) → 产线 → 批号 → 查询等三按钮 -->
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
        <DatePicker
          v-model="query.dates"
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
        <Select
          v-model="lineCode"
          :options="lineOptions"
          option-label="label"
          option-value="value"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="query.cBatchNo" class="min-w-0 flex-1" @keydown.enter="dataBindThr3000" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="planLoading" @click="dataBindThr3000">
          <IconSearch class="h-3 w-3" />查询
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnAddSlab">补充组批</Button>
        <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="btnCanelZp">
          撤销组批
        </Button>
      </div>
    </div>

    <!-- 上（左右分栏）下分栏：原 splitContainerControl1 552/857≈64%、splitContainerControl2 1081/1794≈60% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="64" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel :size="60" :minSize="20" class="flex flex-col overflow-hidden">
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
                :loading="planLoading"
                @grid-ready="onPlanReady"
                @selection-changed="onPlanSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">材料明细</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="mxColDefs"
                :row-data="mxRows"
                :row-selection="{
                  mode: 'multiRow',
                  checkboxes: true,
                  headerCheckbox: true,
                  enableClickSelection: true,
                  enableSelectionWithoutKeys: true,
                }"
                :pagination="false"
                :animate-rows="false"
                :loading="mxLoading"
                @grid-ready="onMxReady"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 收料实绩工具栏（原 stackPanel2）：件数+按钮靠左，标题「收料实绩」靠右共用 h-9 -->
        <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">件数</label>
          <InputNumber
            v-model="nQua"
            :min="0"
            :max="99999"
            :show-buttons="false"
            :use-grouping="false"
            class="w-24 shrink-0"
            input-class="w-full text-right"
          />
          <div class="flex shrink-0 items-center gap-1">
            <Button variant="outlined" class="whitespace-nowrap" @click="btnAdd">
              <IconPlus class="h-3 w-3" />添加
            </Button>
            <Button variant="outlined" severity="danger" class="whitespace-nowrap" @click="btnDel">
              <IconTrash class="h-3 w-3" />删除
            </Button>
            <Button variant="outlined" class="whitespace-nowrap" @click="btnSave">
              <IconDeviceFloppy class="h-3 w-3" />保存
            </Button>
          </div>
          <span class="ml-auto text-xs font-medium text-muted-foreground">收料实绩</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="sjColDefs"
            :row-data="trackList"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="sjLoading"
            @grid-ready="onSjReady"
            @selection-changed="onSjSelectionChanged"
            @cell-value-changed="onSjCellValueChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

    <!-- ShowYesNo 受控确认 -->
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
