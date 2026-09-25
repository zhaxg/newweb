<script setup lang="ts">
/** 对应 FrmHR9071（船板钢生产工艺报表）：DDH.Winforms.SHR.Forms.FrmHR9071
 *  已接入：hR9000Api.query9071s(DtoQueryThr3000) + systemKeyValueApi.querySysKvItemList(菜单参数=钢种集)
 *  偏差：班次/班组/装炉方式等 KV/枚举列显示原值；加权平均以底部横条呈现（原页脚汇总行）；行双击原 FrmHR9201 弹窗本就已注释 */
import { computed, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClassParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { systemKeyValueApi } from "@/api/admin/request";
import { hR9000Api, type DtoQueryThr3000, type Thr3010Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { raw: menuRaw } = useMenuQuery();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
function defaultRange(): Date[] {
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  begin.setDate(begin.getDate() - 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [begin, end];
}

const input = reactive({
  cOrderNo: "",
  cBatchNo: "",
  cStove: "",
  cSgCode: "",
  cSgStd: "",
  slabNo: "",
  dates: defaultRange() as Date[] | null,
});

const rows = shallowRef<Thr3010Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  /*  { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 200 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 200 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 200 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 200 },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 200 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 200 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 200 },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 200 },
  { colId: "cSgCode", field: "cSgCode", headerName: "坯料钢种", width: 200 },
  { colId: "cSgStd", field: "cSgStd", headerName: "坯料标准", width: 200 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 200 },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 200 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "订单钢种", width: 200 },
  { colId: "cSgStdPlan", field: "cSgStdPlan", headerName: "订单标准", width: 200 },
  { colId: "cSpecPlan", field: "cSpecPlan", headerName: "轧制规格", width: 200 },
  { colId: "nThickPlan", field: "nThickPlan", headerName: "轧制厚度", width: 200 },
  { colId: "nWidthPlan", field: "nWidthPlan", headerName: "轧制宽度", width: 200 },
  { colId: "nLenPlan", field: "nLenPlan", headerName: "轧制长度", width: 200 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 100 },
  { colId: "slabFurBefTemp", field: "slabFurBefTemp", headerName: "装炉温度", width: 150 },
  { colId: "ht1AveTemp", field: "ht1AveTemp", headerName: "加热1段平均温度", width: 150 },
  { colId: "ht2AveTemp", field: "ht2AveTemp", headerName: "加热2段平均温度", width: 150 },
  { colId: "eqAveTemp", field: "eqAveTemp", headerName: "均热段平均温度", width: 150 },
  { colId: "dSlabFurTime", field: "dSlabFurTime", headerName: "装炉时间", width: 150 },
  { colId: "dOutTime", field: "dOutTime", headerName: "抽出时间", width: 150 },
  { colId: "nInFur", field: "nInFur", headerName: "在炉时间", width: 150 },
  { colId: "cCustName", field: "cCustName", headerName: "客户名称", width: 200 },
  { colId: "cConRemark", field: "cConRemark", headerName: "特殊要求", width: 150 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 150 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 200 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 200 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 200 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 200 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 200 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 200 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 200 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 200 },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 200 },
  { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 200 },
  { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 200 },
  { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 200 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 200 },
  { colId: "nQuaPlan", field: "nQuaPlan", headerName: "计划支数", width: 200 },
  { colId: "nWgtPlan", field: "nWgtPlan", headerName: "计划重量", width: 200 },
  { colId: "nWgtOrder", field: "nWgtOrder", headerName: "订单重量", width: 200 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 200 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 200 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 200 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 200 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 200 },
  { colId: "nThickMin", field: "nThickMin", headerName: "厚度下限", width: 150 },
  { colId: "nThickMax", field: "nThickMax", headerName: "厚度上限", width: 150 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "性能要求", width: 200 },
  { colId: "cDn", field: "cDn", headerName: "需要堆冷", width: 200 },
  { colId: "steelGrade", field: "steelGrade", headerName: "牌号", width: 200 },
  { colId: "dDischargeTime", field: "dDischargeTime", headerName: "出炉时间", width: 100 },
  { colId: "dRollingTimeStart", field: "dRollingTimeStart", headerName: "轧制开始时间", width: 100 },
  { colId: "dRollingTimeEnd", field: "dRollingTimeEnd", headerName: "轧制结束时间", width: 100 },
  { colId: "crCode", field: "crCode", headerName: "CR代码", width: 200 },
  { colId: "totalRollingTime", field: "totalRollingTime", headerName: "总轧制时间s", width: 200 },
  { colId: "fmPass", field: "fmPass", headerName: "精轧总轧制道次数", width: 200 },
  { colId: "rollingStatus", field: "rollingStatus", headerName: "误轧制标记", width: 200 },
  { colId: "dwThick", field: "dwThick", headerName: "待温厚度", width: 200 },
  { colId: "exitThick", field: "exitThick", headerName: "轧制厚度（计算）", width: 200 },
  { colId: "exitWidth", field: "exitWidth", headerName: "轧制宽度（计算）", width: 200 },
  { colId: "exitLength", field: "exitLength", headerName: "轧制长度（计算）", width: 200 },
  { colId: "operateUserCode", field: "operateUserCode", headerName: "轧制操作人员代码（改规标记1）", width: 200 },
  { colId: "crownMark", field: "crownMark", headerName: "钢板凸度（um)", width: 200 },
  { colId: "meaThickWs", field: "meaThickWs", headerName: "厚度（工作侧）测厚仪", width: 200 },
  { colId: "meaThickDs", field: "meaThickDs", headerName: "厚度（传动侧）测厚仪", width: 200 },
  { colId: "thickHp", field: "thickHp", headerName: "厚度（中部）测厚仪", width: 200 },
  { colId: "hsbExitTempAvg", field: "hsbExitTempAvg", headerName: "除鳞后温度（平均）", width: 200 },
  { colId: "rmPass", field: "rmPass", headerName: "粗轧总轧制道次数", width: 200 },
  { colId: "rmEntTempTar", field: "rmEntTempTar", headerName: "粗轧开轧温度目标", width: 200 },
  { colId: "rmEntTempCal", field: "rmEntTempCal", headerName: "粗轧开轧温度（计算）", width: 200 },
  { colId: "rmEntTempAvg", field: "rmEntTempAvg", headerName: "粗轧开轧温度（测量平均）", width: 200 },
  { colId: "rmExitTempCal", field: "rmExitTempCal", headerName: "粗轧终轧温度（计算）", width: 200 },
  { colId: "rmExitTempAvg", field: "rmExitTempAvg", headerName: "粗轧终轧温度（测量平均）", width: 200 },
  { colId: "rmEntThick", field: "rmEntThick", headerName: "粗轧开始厚度（计算）", width: 200 },
  { colId: "fmEntThick", field: "fmEntThick", headerName: "精轧开始厚度（计算）", width: 200 },
  { colId: "fmEntTempCal", field: "fmEntTempCal", headerName: "精轧开轧温度（计算）", width: 200 },
  { colId: "fmEntTempTar", field: "fmEntTempTar", headerName: "精轧开轧温度目标", width: 200 },
  { colId: "fmEntTempAvg", field: "fmEntTempAvg", headerName: "精轧开轧温度（测量平均）", width: 200 },
  { colId: "fmExitTempTar", field: "fmExitTempTar", headerName: "终轧温度目标", width: 200 },
  { colId: "fmExitTempCal", field: "fmExitTempCal", headerName: "精轧终轧温度（计算）", width: 200 },
  { colId: "fmExitTempAvg", field: "fmExitTempAvg", headerName: "精轧终轧温度（测量平均）", width: 200 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 200 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 200 },
  { colId: "dProductTime", field: "dProductTime", headerName: "生产时间", width: 100 },
  { colId: "author", field: "author", headerName: "责任者", width: 200 },
  { colId: "slabWeight", field: "slabWeight", headerName: "板坯实际重量", width: 200 },
  { colId: "rmAuthorA", field: "rmAuthorA", headerName: "粗轧责任者A", width: 200 },
  { colId: "rmAuthorB", field: "rmAuthorB", headerName: "粗轧责任者B", width: 200 },
  { colId: "fmAuthorA", field: "fmAuthorA", headerName: "精轧责任者A", width: 200 },
  { colId: "fmAuthorB", field: "fmAuthorB", headerName: "精轧责任者B", width: 200 },
  { colId: "nCcl", field: "nCcl", headerName: "理论成材率", width: 200 },
  { colId: "totalPass", field: "totalPass", headerName: "预矫总次数", width: 200 },
  { colId: "entryTime", field: "entryTime", headerName: "预矫进入时间", width: 200 },
  { colId: "endTime", field: "endTime", headerName: "预矫结束时间", width: 200 },
  { colId: "entryTemp", field: "entryTemp", headerName: "预矫钢板温度", width: 200 },
  { colId: "levelerSpeed", field: "levelerSpeed", headerName: "预矫速度", width: 200 },
  { colId: "bitSpeed", field: "bitSpeed", headerName: "预矫咬入速度", width: 200 },
  { colId: "entryGap", field: "entryGap", headerName: "预矫入口辊缝", width: 200 },
  { colId: "exitGap", field: "exitGap", headerName: "预矫出口辊缝", width: 200 },
  { colId: "entrySideRollGap", field: "entrySideRollGap", headerName: "预矫入口边辊高度", width: 200 },
  { colId: "exitSideRollGap", field: "exitSideRollGap", headerName: "预矫出口边辊高度", width: 200 },
  { colId: "tilt1", field: "tilt1", headerName: "预矫倾斜量", width: 200 },
  { colId: "tilt2", field: "tilt2", headerName: "预矫倾动量", width: 200 },
  { colId: "l2Force", field: "l2Force", headerName: "预矫预矫力", width: 200 },
  { colId: "bendPosition", field: "bendPosition", headerName: "预矫弯辊量", width: 200 },
  { colId: "torqueMotor", field: "torqueMotor", headerName: "预矫扭矩", width: 200 },
  { colId: "emptyFlag", field: "emptyFlag", headerName: "预矫是否空过", width: 200 },
  { colId: "coolMode", field: "coolMode", headerName: "冷却模式", width: 200 },
  { colId: "startCoolTime", field: "startCoolTime", headerName: "开冷时间", width: 200 },
  { colId: "finishCoolTime", field: "finishCoolTime", headerName: "终冷时间", width: 200 },
  { colId: "entryAveTemp", field: "entryAveTemp", headerName: "开冷平均温度", width: 200 },
  { colId: "targetFinishTemp", field: "targetFinishTemp", headerName: "目标返红温度", width: 200 },
  { colId: "nTempXb", field: "nTempXb", headerName: "实测下表返红温度", width: 150 },
  { colId: "finishAveTemp", field: "finishAveTemp", headerName: "返红平均温度", width: 200 },
  { colId: "coolingRate", field: "coolingRate", headerName: "实际冷速", width: 200 },
  { colId: "fluxA", field: "fluxA", headerName: "A区设定流量", width: 200 },
  { colId: "fluxB", field: "fluxB", headerName: "B区设定流量", width: 200 },
  { colId: "actFluxA", field: "actFluxA", headerName: "A区实际流量", width: 200 },
  { colId: "actFluxB", field: "actFluxB", headerName: "B区实际流量", width: 200 },
  { colId: "ratioA", field: "ratioA", headerName: "A区设定水比", width: 200 },
  { colId: "ratioB", field: "ratioB", headerName: "B区设定水比", width: 200 },
  { colId: "actRatioA", field: "actRatioA", headerName: "A区实际水比", width: 200 },
  { colId: "actRatioB", field: "actRatioB", headerName: "B区实际水比", width: 200 },
  { colId: "speed", field: "speed", headerName: "设定辊速", width: 200 },
  { colId: "actSpeed", field: "actSpeed", headerName: "实际辊速", width: 200 },
  { colId: "aspd", field: "aspd", headerName: "设定加速度", width: 200 },
  { colId: "actAspd", field: "actAspd", headerName: "实际加速度", width: 200 },
  { colId: "num", field: "num", headerName: "开启集管组数", width: 200 },
  { colId: "hTSIS", field: "hTSIS", headerName: "头尾遮蔽投入信号", width: 200 },
  { colId: "headUpLength", field: "headUpLength", headerName: "头上长度", width: 200 },
  { colId: "headBotLength", field: "headBotLength", headerName: "头下长度", width: 200 },
  { colId: "headUpCoef", field: "headUpCoef", headerName: "头上系数", width: 200 },
  { colId: "headBotCoef", field: "headBotCoef", headerName: "头下系数", width: 200 },
  { colId: "tailUpLength", field: "tailUpLength", headerName: "尾上长度", width: 200 },
  { colId: "tailBotLength", field: "tailBotLength", headerName: "尾下长度", width: 200 },
  { colId: "tailUpCoef", field: "tailUpCoef", headerName: "尾上系数", width: 200 },
  { colId: "tailBotCoef", field: "tailBotCoef", headerName: "尾下系数", width: 200 },
  { colId: "tempWater", field: "tempWater", headerName: "水温", width: 200 },
  { colId: "pressWater", field: "pressWater", headerName: "水压", width: 200 },
  { colId: "total_flow", field: "total_flow", headerName: "总水量", width: 200 },
  { colId: "totalPassRj", field: "totalPassRj", headerName: "热矫总次数", width: 200 },
  { colId: "entryTimeRj", field: "entryTimeRj", headerName: "热矫进入时间", width: 200 },
  { colId: "endTimeRj", field: "endTimeRj", headerName: "热矫结束时间", width: 200 },
  { colId: "entryTempRj", field: "entryTempRj", headerName: "热矫钢板温度", width: 200 },
  { colId: "levelerSpeedRj", field: "levelerSpeedRj", headerName: "热矫速度", width: 200 },
  { colId: "bitSpeedRj", field: "bitSpeedRj", headerName: "热矫咬入速度", width: 200 },
  { colId: "entryGapRj", field: "entryGapRj", headerName: "热矫入口辊缝", width: 200 },
  { colId: "exitGapRj", field: "exitGapRj", headerName: "热矫出口辊缝", width: 200 },
  { colId: "entrySideRollGapRj", field: "entrySideRollGapRj", headerName: "热矫入口边辊高度", width: 200 },
  { colId: "exitSideRollGapRj", field: "exitSideRollGapRj", headerName: "热矫出口边辊高度", width: 200 },
  { colId: "tilt1Rj", field: "tilt1Rj", headerName: "热矫倾斜量", width: 200 },
  { colId: "tilt2Rj", field: "tilt2Rj", headerName: "热矫倾动量", width: 200 },
  { colId: "l2ForceRj", field: "l2ForceRj", headerName: "热矫矫直力", width: 200 },
  { colId: "bendPositionRj", field: "bendPositionRj", headerName: "热矫弯辊量", width: 200 },
  { colId: "torqueMotorRj", field: "torqueMotorRj", headerName: "热矫扭矩", width: 200 },
  { colId: "emptyFlagRj", field: "emptyFlagRj", headerName: "热矫是否空过", width: 200 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 200 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 200 },
  { colId: "cIsQy", field: "cIsQy", headerName: "是否取样板", width: 150 },
  { colId: "selected", field: "selected", headerName: "选择", width: 200, hide: true },
  { colId: "id", field: "id", headerName: "主键", width: 200, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 200, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 200, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 200, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 200, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 200, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 200, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 200, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 200, hide: true },
  { colId: "nL2Status", field: "nL2Status", headerName: "L2计划状态", width: 200, hide: true },
  { colId: "cPos", field: "cPos", headerName: "当前位置", width: 200, hide: true },
  { colId: "cSpec", field: "cSpec", headerName: "坯料规格", width: 200, hide: true },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 200, hide: true },
  { colId: "nWgt", field: "nWgt", headerName: "坯重", width: 200, hide: true },
  { colId: "nWgtCz", field: "nWgtCz", headerName: "称重重量", width: 200, hide: true },
  { colId: "dischargeTime", field: "dischargeTime", headerName: "出炉时间", width: 200, hide: true },
  { colId: "rollingTimeStart", field: "rollingTimeStart", headerName: "轧制开始时间", width: 200, hide: true },
  { colId: "rollingTimeEnd", field: "rollingTimeEnd", headerName: "轧制结束时间", width: 200, hide: true },
  { colId: "hsbExitTempMax", field: "hsbExitTempMax", headerName: "除鳞后温度（最大）", width: 200, hide: true },
  { colId: "rmEntTempMin", field: "rmEntTempMin", headerName: "粗轧开轧温度（测量最小）", width: 200, hide: true },
  { colId: "rmEntTempMax", field: "rmEntTempMax", headerName: "粗轧开轧温度（测量最大）", width: 200, hide: true },
  { colId: "rmEntTempDev", field: "rmEntTempDev", headerName: "粗轧开轧温度（测量偏差）", width: 200, hide: true },
  { colId: "rmExitTempMin", field: "rmExitTempMin", headerName: "粗轧终轧温度（测量最小）", width: 200, hide: true },
  { colId: "rmExitTempMax", field: "rmExitTempMax", headerName: "粗轧终轧温度（测量最大）", width: 200, hide: true },
  { colId: "rmExitTempDev", field: "rmExitTempDev", headerName: "粗轧终轧温度（测量偏差）", width: 200, hide: true },
  { colId: "fmEntTempMin", field: "fmEntTempMin", headerName: "精轧开轧温度（测量最小）", width: 200, hide: true },
  { colId: "fmEntTempMax", field: "fmEntTempMax", headerName: "精轧开轧温度（测量最大）", width: 200, hide: true },
  { colId: "fmEntTempDev", field: "fmEntTempDev", headerName: "精轧开轧温度（测量偏差）", width: 200, hide: true },
  { colId: "fmExitTempMin", field: "fmExitTempMin", headerName: "精轧终轧温度（测量最小）", width: 200, hide: true },
  { colId: "fmExitTempMax", field: "fmExitTempMax", headerName: "精轧终轧温度（测量最大）", width: 200, hide: true },
  { colId: "fmExitTempDev", field: "fmExitTempDev", headerName: "精轧终轧温度（测量偏差）", width: 200, hide: true },
  { colId: "productTime", field: "productTime", headerName: "生产时间", width: 200, hide: true },
  { colId: "rollAveTemp", field: "rollAveTemp", headerName: "轧后平均温度", width: 200, hide: true },
  { colId: "rollMaxTemp", field: "rollMaxTemp", headerName: "轧后温度最大值", width: 200, hide: true },
  { colId: "rollMinTemp", field: "rollMinTemp", headerName: "轧后温度最小值", width: 200, hide: true },
  { colId: "entryMaxTemp", field: "entryMaxTemp", headerName: "开冷最大温度", width: 200, hide: true },
  { colId: "entryMinTemp", field: "entryMinTemp", headerName: "开冷最小温度", width: 200, hide: true },
  { colId: "finishMaxTemp", field: "finishMaxTemp", headerName: "返红温度最大", width: 200, hide: true },
  { colId: "finishMinTemp", field: "finishMinTemp", headerName: "返红温度最小", width: 200, hide: true },
  { colId: "scanAveTemp", field: "scanAveTemp", headerName: "扫描高温计平均温度", width: 200, hide: true },
  { colId: "scanMaxTemp", field: "scanMaxTemp", headerName: "扫描高温计最大温度", width: 200, hide: true },
  { colId: "scanMinTemp", field: "scanMinTemp", headerName: "扫描高温计最小温度", width: 200, hide: true },
  { colId: "uppipeFlow", field: "uppipeFlow", headerName: "1-28集管上流量", width: 200, hide: true },
  { colId: "botpipeFlow", field: "botpipeFlow", headerName: "1-28集管下流量", width: 200, hide: true },
  { colId: "sideCavityFlow1", field: "sideCavityFlow1", headerName: "1-10边腔流量", width: 200, hide: true },
  { colId: "sideSpary", field: "sideSpary", headerName: "侧喷", width: 200, hide: true },
  { colId: "midSpary", field: "midSpary", headerName: "中喷", width: 200, hide: true },
  { colId: "prh", field: "prh", headerName: "压辊高度A1-10prh", width: 200, hide: true },
  { colId: "eLPBCD", field: "eLPBCD", headerName: "电降平台bcd", width: 200, hide: true },
  { colId: "iSpare", field: "iSpare", headerName: "备用", width: 200, hide: true },
  { colId: "fSpare", field: "fSpare", headerName: "备用", width: 200, hide: true },*/
];

/* 原 RowStyle：订单号1-4 含 -B 或 特殊要求含「加急」→ 红底 */
function rowRed(p: RowClassParams<Thr3010Dto>) {
  const r = p.data;
  if (!r) return undefined;
  const hit =
    [r.cOrderNo1, r.cOrderNo2, r.cOrderNo3, r.cOrderNo4].some((x) => String(x ?? "").includes("-B")) ||
    String(r.cConRemark ?? "").includes("加急");
  return hit ? { backgroundColor: "#fee2e2", color: "#b91c1c" } : undefined;
}

/* 原 CustomSummary：加权平均 = Σ(轧制厚度×坯重)/Σ坯重 */
const weightedAvg = computed(() => {
  let wgt = 0;
  let wgt1 = 0;
  for (const r of rows.value) {
    const cz = r.nWgt ?? 0;
    wgt += cz;
    wgt1 += (r.nThickPlan ?? 0) * cz;
  }
  return wgt === 0 ? "0" : (Math.round((wgt1 / wgt) * 100) / 100).toFixed(2);
});

async function query() {
  loading.value = true;
  try {
    // 原 Load：钢种范围来自菜单参数 kv 组（如 010100:ZG_BOATDECK_SGCODE）
    let sgCodes: string[] | null = null;
    if (menuRaw) {
      try {
        const items = (await systemKeyValueApi.querySysKvItemList(menuRaw)) ?? [];
        sgCodes = items.map((x) => x.cCode ?? "").filter(Boolean);
      } catch {
        /* kv 拉取失败按不过滤 */
      }
    }
    const dto: DtoQueryThr3000 = {
      cLineCode: "ZG01",
      cSgCodes: sgCodes,
      dCreateTimeRange: toTimeRange(input.dates),
      cOrderNo: input.cOrderNo.trim() || null,
      cBatchNo: input.cBatchNo.trim() || null,
      cStove: input.cStove.trim() || null,
      cSgCode: input.cSgCode.trim() || null,
      cSgStd: input.cSgStd.trim() || null,
      slabNo: input.slabNo.trim() || null,
    };
    rows.value = (await hR9000Api.query9071s(dto)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">出炉时间</label>
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
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        :get-row-style="rowRed"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
    <div class="flex h-7 shrink-0 items-center gap-2 border-t border-border/60 px-3">
      <span class="text-xs text-muted-foreground">加权平均：{{ weightedAvg }}</span>
    </div>
  </div>
</template>
