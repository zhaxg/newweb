<script setup lang="ts">
/** 对应 FrmHR4100（轧钢收料管理）：DDH.Winforms.SHR.Forms.FrmHR4100
 *  已接入：tPa1000Api.queryLines / hR3000Api.queryThr3000s / queryThr3010s / hR4000Api.queryThr4000s / addSjsByPiece / addSjByPlan / saveChange
 *  待接入：原「收料完成/撤销完成」按钮 Designer Visible=false（画面不显示），未迁（confirm/cancelConfirm 已备好）
 *  偏差：colCTrimFlag KV 翻译缺省显示原值；产线下拉默认取产线接口第一项（原 SelectedIndex=0），查询产线随下拉 */

import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
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
  hR3000Api,
  hR4000Api,
  tPa1000Api,
  Thr3000StatusEnum,
  Thr3010FurStatusEnum,
  Thr3010RollStatusEnum,
  Thr3010JqStatusEnum,
  Thr3010StatusEnum,
  type Thr3000,
  type Thr3010,
  type Thr4000,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();

/* ---------- 产线下拉（原 CLineCodeTextEdit，默认第一项） ---------- */
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string>(menuQs[0] ?? "ZG01");

/* ---------- 时间（原 ucTimeRange，默认本月） ---------- */
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

/* ---------- 查询条件（DtoQueryThr3000） ---------- */
const input = reactive({
  cBatchNo: "",
  cStove: "",
  cOrderNo: "",
  cSgCode: "",
  slabNo: "",
  dates: monthRange() as Date[] | null,
});
const isBcp = ref(false);
const nQua = ref<number>(0);
const sjRemark = ref("");

/* ---------- 上左：组批计划（gridView1 / Thr3000） ---------- */
const zpRows = ref<Thr3000[]>([]);
const zpLoading = ref(false);
const zpApi = ref<GridApi | null>(null);
const zpCurrent = ref<Thr3000 | null>(null);
function onZpReady(e: GridReadyEvent) {
  zpApi.value = e.api;
}
function onZpSelectionChanged() {
  const row = (zpApi.value?.getSelectedRows()[0] as Thr3000 | undefined) ?? null;
  zpCurrent.value = row;
  void bindChildren(row);
}

/* ---------- 上右：计划材料明细（gridView2 / Thr3010） ---------- */
const mxRows = ref<Thr3010[]>([]);
const mxLoading = ref(false);
const mxApi = ref<GridApi | null>(null);
const mxCurrent = ref<Thr3010 | null>(null);
function onMxReady(e: GridReadyEvent) {
  mxApi.value = e.api;
}
function onMxSelectionChanged() {
  mxCurrent.value = (mxApi.value?.getSelectedRows()[0] as Thr3010 | undefined) ?? null;
}

/* ---------- 下：收料实绩（gridView3 / Thr4000，TrackableList） ---------- */
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
function onSjCellValueChanged(e: CellValueChangedEvent) {
  sjApi.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}

/* ---------- 列定义 ---------- */
const zpStatusFmt = (p: ValueFormatterParams) => {
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
const l2StatusFmt = (p: ValueFormatterParams) => {
  const m: Record<string, string> = {
    [String(Thr3010StatusEnum.ZZ_UNDO)]: "轧制计划-待下发L2",
    [String(Thr3010StatusEnum.ZZ_SENDED_ERROR)]: "轧制计划-下发L2失败",
    [String(Thr3010StatusEnum.ZZ_SENDED)]: "轧制计划-已下发L2",
    [String(Thr3010StatusEnum.ZZ_RESERVED_ERROR)]: "轧制计划-L2反馈失败",
    [String(Thr3010StatusEnum.ZZ_RESERVED_SUCCESS)]: "轧制计划-L2反馈成功",
    [String(Thr3010StatusEnum.JQ_SENDED)]: "剪切计划-已下发L2",
    [String(Thr3010StatusEnum.JQ_SENDED_ERROR)]: "剪切计划-下发L2失败",
    [String(Thr3010StatusEnum.L2_DOWN)]: "L2-钢板下线",
    [String(Thr3010StatusEnum.L2_UP)]: "L2-钢板上线",
    [String(Thr3010StatusEnum.L2_DELETE)]: "L2计划删除",
  };
  return m[String(p.value)] ?? "";
};
const furStatusFmt = (p: ValueFormatterParams) =>
  (
    ({
      [String(Thr3010FurStatusEnum.Batch)]: "已组批",
      [String(Thr3010FurStatusEnum.Wait)]: "待入炉",
      [String(Thr3010FurStatusEnum.RefuseBefore)]: "炉前拒收",
      [String(Thr3010FurStatusEnum.EnterFur)]: "入炉",
      [String(Thr3010FurStatusEnum.Eliminate)]: "剔炉",
      [String(Thr3010FurStatusEnum.ExitFur)]: "出炉",
      [String(Thr3010FurStatusEnum.RefuseAfter)]: "炉后拒收",
    }) as Record<string, string>
  )[String(p.value)] ?? "";
const rollStatusFmt = (p: ValueFormatterParams) =>
  (
    ({
      [String(Thr3010RollStatusEnum.Batch)]: "已组批",
      [String(Thr3010RollStatusEnum.Wait)]: "待入轧",
      [String(Thr3010RollStatusEnum.FinishRoll)]: "轧制完成",
      [String(Thr3010RollStatusEnum.Cut)]: "切断",
      [String(Thr3010RollStatusEnum.Waste)]: "轧废",
    }) as Record<string, string>
  )[String(p.value)] ?? "";
const jqStatusFmt = (p: ValueFormatterParams) =>
  (
    ({
      [String(Thr3010JqStatusEnum.Batch)]: "已组批",
      [String(Thr3010JqStatusEnum.Wait)]: "待剪切",
      [String(Thr3010JqStatusEnum.Finish)]: "剪切完成",
    }) as Record<string, string>
  )[String(p.value)] ?? "";

const zpColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 112 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
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
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 112, valueFormatter: zpStatusFmt },
  { colId: "cConfirmStatus", field: "cConfirmStatus", headerName: "收料状态", width: 112 },
  { colId: "cConfirmEmp", field: "cConfirmEmp", headerName: "收料人", width: 112 },
  { colId: "dConfirm", field: "dConfirm", headerName: "收料时间", width: 140 },
  { colId: "cConfirmShift", field: "cConfirmShift", headerName: "收料班次", width: 112 },
  { colId: "cConfirmGroup", field: "cConfirmGroup", headerName: "收料班组", width: 112 },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 112 },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 125 },
  { colId: "cTlOrderNo", field: "cTlOrderNo", headerName: "提料订单号", width: 120 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
];

const mxColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 125 },
  { colId: "nFurStatus", field: "nFurStatus", headerName: "加热炉状态", width: 125, valueFormatter: furStatusFmt },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 125 },
  { colId: "nRollStatus", field: "nRollStatus", headerName: "轧制状态", width: 112, valueFormatter: rollStatusFmt },
  { colId: "cRollCode", field: "cRollCode", headerName: "轧机编号", width: 112 },
  { colId: "cFinishEmp", field: "cFinishEmp", headerName: "轧制完成人", width: 125 },
  { colId: "dRoll", field: "dRoll", headerName: "轧制完成时间", width: 138 },
  { colId: "cRollShift", field: "cRollShift", headerName: "轧制完成班次", width: 138 },
  { colId: "cRollGroup", field: "cRollGroup", headerName: "轧制完成班组", width: 138 },
  { colId: "nJqStatus", field: "nJqStatus", headerName: "剪切计划状态", width: 138, valueFormatter: jqStatusFmt },
  { colId: "cJqCode", field: "cJqCode", headerName: "剪切设备", width: 112 },
  { colId: "nStatus", field: "nStatus", headerName: "L2计划状态", width: 125, valueFormatter: l2StatusFmt },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 112 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 112 },
  { colId: "cFlag", field: "cFlag", headerName: "材料标记", width: 112 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120, hide: true },
];

const sjColDefs: ColDef[] = [
  { colId: "cSlCode", field: "cSlCode", headerName: "剪切线代码", width: 125, editable: true },
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
  { colId: "nQua", field: "nQua", headerName: "支数", width: 112, editable: true },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 112, editable: true },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112, editable: true },
  { colId: "nProType", field: "nProType", headerName: "库存分类", width: 112, editable: true },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112, editable: true },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态代码", width: 138, editable: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125, editable: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112, editable: true },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112, editable: true },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112, editable: true },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名", width: 112, editable: true },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112, editable: true },
  { colId: "cWgtToler", field: "cWgtToler", headerName: "重量偏差等级", width: 138, editable: true },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cPlanId", field: "cPlanId", headerName: "THR2000", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000", width: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
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
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
];

/* ---------- 查询 ---------- */
async function queryZp() {
  zpLoading.value = true;
  try {
    const list =
      (await hR3000Api.queryThr3000s({
        cLineCode: lineCode.value || undefined,
        cBatchNo: input.cBatchNo.trim() || undefined,
        cStove: input.cStove.trim() || undefined,
        cOrderNo: input.cOrderNo.trim() || undefined,
        cSgCode: input.cSgCode.trim() || undefined,
        slabNo: input.slabNo.trim() || undefined,
        dCreateTimeRange: toTimeRange(input.dates),
      })) ?? [];
    zpRows.value = list;
    zpCurrent.value = null;
    mxRows.value = [];
    trackList.value = new TrackableList<Thr4000>();
    requestAnimationFrame(() => zpApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    zpLoading.value = false;
  }
}

async function bindChildren(thr3000: Thr3000 | null) {
  if (!thr3000) {
    mxRows.value = [];
    trackList.value = new TrackableList<Thr4000>();
    return;
  }
  mxLoading.value = true;
  sjLoading.value = true;
  try {
    const [mx, sj] = await Promise.all([
      hR3000Api.queryThr3010s(thr3000.id ?? undefined),
      hR4000Api.queryThr4000s({ cLineCode: thr3000.cLineCode, cBatchNo: thr3000.cBatchNo }),
    ]);
    mxRows.value = mx ?? [];
    trackList.value = new TrackableList<Thr4000>(sj ?? []);
    sjCurrent.value = null;
    requestAnimationFrame(() => {
      mxApi.value?.autoSizeAllColumns();
      sjApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    mxLoading.value = false;
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

/* ---------- 添加 / 按计划添加 / 删除 / 保存 ---------- */
async function doAdd() {
  const thr3010 = mxCurrent.value;
  if (!thr3010) return;
  try {
    await hR4000Api.addSjsByPiece({
      isBcp: isBcp.value,
      cMxId: thr3010.id,
      nQua: nQua.value ?? 0,
      cShift: "",
      cGroup: "",
      cRemark: sjRemark.value,
    });
    toast("数据提交成功！", 2000, "success");
    await queryZp();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnAdd() {
  if (!zpCurrent.value) return;
  const thr3010 = mxCurrent.value;
  if (!thr3010) return;
  const n = nQua.value ?? 0;
  if (n <= 0) {
    toast("件数必须大于0！", 2000, "warn");
    return;
  }
  askConfirm(`是否确认添加材料${thr3010.cPieceNo}的${n}件实绩？`, doAdd);
}

async function doAddByPlan() {
  const thr3000 = zpCurrent.value;
  if (!thr3000) return;
  try {
    await hR4000Api.addSjByPlan(thr3000.id ?? undefined);
    toast("数据提交成功！", 2000, "success");
    await queryZp();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnAddByPlan() {
  if (!zpCurrent.value) return;
  askConfirm("是否确认按照剪切计划添加实绩？", doAddByPlan);
}

function btnDelete() {
  const row = sjCurrent.value;
  if (!row) return;
  trackList.value.remove((r) => r.id === row.id);
  sjApi.value?.applyTransaction({ remove: [row] });
  sjCurrent.value = null;
}

async function doSave() {
  const thr3000 = zpCurrent.value;
  if (!thr3000) return;
  try {
    await hR4000Api.saveChange(trackList.value.SaveChangesData);
    toast("数据保存成功！", 2000, "success");
    await queryZp();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnSave() {
  const thr3000 = zpCurrent.value;
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
    <!-- 查询条件区（批号/炉号/订单号/钢种/板坯号/产线代码/组批时间 + 查询） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="queryZp" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="queryZp" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="queryZp" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="queryZp" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="queryZp" />
      </div>
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
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="zpLoading" @click="queryZp">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 上下分栏：原 split1 500/976 ≈ 51% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="51" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <Splitter class="min-h-0 flex-1" layout="vertical">
          <SplitterPanel :size="50" :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">组批计划</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="zpColDefs"
                :row-data="zpRows"
                :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
                :pagination="false"
                :animate-rows="false"
                :loading="zpLoading"
                @grid-ready="onZpReady"
                @selection-changed="onZpSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">计划材料明细</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="mxColDefs"
                :row-data="mxRows"
                :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
                :pagination="false"
                :animate-rows="false"
                :loading="mxLoading"
                @grid-ready="onMxReady"
                @selection-changed="onMxSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">收料实绩</span>
        </div>
        <!-- 实绩工具栏：半成品勾选 / 件数 / 备注 + 添加/按计划添加/删除/保存 -->
        <div class="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
          <Checkbox v-model="isBcp" binary inputId="checkBcp" />
          <label for="checkBcp" class="text-xs text-muted-foreground">半成品</label>
          <label class="ml-2 shrink-0 text-xs text-muted-foreground">件数</label>
          <InputNumber
            v-model="nQua"
            :min="0"
            :max="99999"
            :show-buttons="true"
            :use-grouping="false"
            class="w-28 shrink-0"
          />
          <label class="shrink-0 text-xs text-muted-foreground">备注</label>
          <InputText v-model="sjRemark" class="w-40 shrink-0" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnAdd">
            <IconPlus class="h-3 w-3" />添加
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnAddByPlan">按计划添加</Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="btnDelete">
            <IconTrash class="h-3 w-3" />删除
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnSave">
            <IconDeviceFloppy class="h-3 w-3" />保存
          </Button>
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
