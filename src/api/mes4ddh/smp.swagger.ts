/**
 * SMP 域后端接口（dDH.Service.*）：枚举 + 类型 + 请求，单文件维护。
 * 原 src/api/smp 的 enums.ts / types.d.ts / request.ts 合并。
 */

import { requestClient } from "@/api/_core/request";
import type { Tyd2000Dto } from "./syd.swagger";

/* ---------- 枚举 ---------- */

export enum CastDivEnum {
  L = 0,
  M = 1,
  O = 2,
}
export enum EqualsFlag {
  Default = 1,
  LeftOpen = 2,
  RightOpen = 4,
  Open = 6,
}
export enum FhCompareFalgEnum {
  Succeed = 0,
  Fail = 1,
}
export enum InventoryStatusEnum {
  NotIn = 0,
  Normal = 1,
  Locked = 10,
  ConsumeLocked = 20,
  Ing = 50,
  ZC = 90,
  Consume = 98,
  Out = 99,
}
export enum JcStatusEnum {
  NoJc = 0,
  NoDown = 10,
  DownLg = 30,
}
export enum LengthTypeEnum {
  F = 0,
  D = 1,
}
export enum LgPlanStatusEnum {
  NoPlan = 0,
  YesPlan = 20,
}
export enum LgProdStatusEnum {
  NoPlan = 0,
  Finish = 20,
}
export enum OrderFlagEnum {
  XS = 0,
  YL = 1,
  BC = 2,
  LT = 3,
}
export enum OrderProcEnum {
  NoDone = 0,
  Doing = 1,
  Success = 8,
  Fail = -1,
}
export enum OrderReviewEnum {
  NoReview = 0,
  YesReview = 10,
}
export enum OrderStatusEnum {
  WaitPlan = 0,
  FinshPlan = 10,
  ProductClose = 30,
  ReturnSale = 40,
  CloseCase = 50,
  Complete = 60,
  CF = -1,
}
export enum OrderTlEnum {
  NoTl = 0,
  YesTl = 10,
  Checked = 20,
}
export enum SwlxEnum {
  XSCK = 80,
  XSTH = 89,
}
export enum Thr3010HlStatusEnum {
  EnterFur = 10,
  ExitFur = 20,
}
export enum WeighStausEnum {
  Not = 1,
  Ready = 2,
}
export enum YesNo {
  N = 0,
  Y = 1,
}
export enum YesNoDefault {
  N = 0,
  Y = 1,
  Default = 255,
}
export enum ZcStatusEnum {
  Ready = 0,
  Ok = 1,
  DownWeigh = 2,
  Finish = 3,
  Invalid = 98,
  Out = 99,
}

/* ---------- 类型 ---------- */


export interface ApiCarMessage {
  code?: string | null;
  message?: string | null;
}
export interface ApiCardDto {
  cardid?: string | null;
  carno?: string | null;
  frommanid?: number;
  driver?: string | null;
  tel?: string | null;
  idnumber?: string | null;
}
export interface ApiCardInput {
  cardid?: string | null;
  carno?: string | null;
  sendCarItem?: SendCarItem[] | null;
}
export interface ApiCustDto {
  cCustCode?: string | null;
  cCustName?: string | null;
  cStatus?: string | null;
}
export interface ApiJL2000Dto {
  cTaskId?: string | null;
  cBillOfLadingNo?: string | null;
  cMatchId?: string | null;
  cVehicleNo?: string | null;
  cPlanId?: string | null;
  cOrderNo?: string | null;
  nWgt?: number;
  nNum?: number;
  nLenMin?: number;
  nLenMax?: number;
  cMatCode?: string | null;
  nStatus?: number;
  cQualityNo?: string | null;
  cOutStockCode?: string | null;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cTargetPlace?: string | null;
  cShipName?: string | null;
  cPort?: string | null;
  cTelEmp?: string | null;
  cTelNum?: string | null;
  cRemark?: string | null;
  nTare?: number;
  dTareTime?: string;
  cSwlx?: string | null;
}
export interface ApiJL2001Dto {
  cTaskId?: string | null;
  cBillOfLadingNo?: string | null;
  cMatchId?: string | null;
  cCarNo?: string | null;
  nSuttle?: number;
  dSuttleTime?: string;
  nValidFlag?: number;
  dDelivyTime?: string;
  nCompareFalg?: number;
  cRemark?: string | null;
}
export interface ApiVehicleResultDto {
  cBillOfLadingNo?: string | null;
  nStatus?: number;
  cResult?: string | null;
}
export interface ApiXSMatrlDto {
  cMatCode?: string | null;
  cMatName?: string | null;
  cSgCode?: string | null;
  cSpec?: string | null;
  nThick?: number;
  nWidth?: number;
  nLen?: number;
  nWeight?: number;
  nStatus?: number;
}
export interface BxOrder {
  ordeR_NUM?: number | null;
  ordeR_CUST_ENAME?: string | null;
  pagehelpeR_ROW_ID?: number | null;
  bacK_3?: string | null;
  bacK_2?: string | null;
  ordeR_NO?: string | null;
  delivY_NUM_TOL_PLUS?: number | null;
  bacK_1?: string | null;
  jQ_SPEC_NO?: string | null;
  banD_PROD_CODE?: string | null;
  salE_ORDER_NO?: string | null;
  bacK_5?: string | null;
  delivY_DATE?: string | null;
  bacK_4?: string | null;
  reC_CREATE_TIME?: string | null;
  remarK_10?: string | null;
  remarK_11?: string | null;
  delivY_NUM_TOL_MINUS?: number | null;
  triM_FLAG?: string | null;
  companY_CODE?: string | null;
  ordeR_WIDTH_TOL_MIN?: number | null;
  ordeR_STATUS?: string | null;
  ordeR_THICK_TOL_MIN?: number;
  gF_SPEC_NO?: string | null;
  delivY_WT_MAX?: number | null;
  sG_CODE?: string | null;
  ordeR_MAX_LEN?: number | null;
  priM_SHEET_CODE?: string | null;
  sG_SIGN?: string | null;
  proD_CODE?: string | null;
  ordeR_CUST_CNAME?: string | null;
  ordeR_UNIT_CODE?: string | null;
  ordeR_THICK_TOL_MAX?: number;
  ordeR_WIDTH?: number | null;
  fiN_CUST_CODE?: string | null;
  ordeR_WIDTH_TOL_MAX?: number | null;
  remarK_14?: string | null;
  remarK_15?: string | null;
  remarK_12?: string | null;
  sG_STD?: string | null;
  remarK_13?: string | null;
  ordeR_LEN?: number | null;
  ordeR_MIN_LEN?: number | null;
  delivY_WT_MIN?: number | null;
  ordeR_WT?: number | null;
  ordeR_THICK?: number | null;
  ordeR_CUST_CODE?: string | null;
  rolL_SPEC_NO?: string | null;
}
export interface DtoQuerySlabs {
  cLineCode?: string | null;
  cSlCode?: string | null;
  cInboundNo?: string | null;
  cStoreCode?: string | null;
  cDestination?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cPieceNo?: string | null;
  cPieceNoSlab?: string | null;
  cStove?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nStatus?: InventoryStatusEnum | null;
  nQmLevel?: number | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nHlStatus?: Thr3010HlStatusEnum | null;
  dProTime?: TimeRange;
  timeRange?: TimeRange;
  cStack?: string | null;
}
export interface Fh1000 {
  selected?: boolean;
  cBillOfLadingNo?: string | null;
  cConNo?: string | null;
  nNetWgt?: number;
  nDiscrepWgt?: number;
  nGrossWgt?: number;
  nActWgt?: number;
  nNum?: number;
  nPiece?: number;
  nStackingStatus?: WeighStausEnum;
  cOutStockCode?: string | null;
  dDelivyTime?: string | null;
  cVehicleNo?: string | null;
  cBoxNo?: string | null;
  cDelivyRemark?: string | null;
  cShipLotNo?: string | null;
  nAmountTax?: number;
  dWeighTime?: string | null;
  nCompareFalg?: FhCompareFalgEnum | null;
  nStatus?: ZcStatusEnum;
  cStackingFlag?: string;
  cKhzd?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  id?: string | null;
  cPort?: string | null;
  cShipName?: string | null;
  cTaskId?: string | null;
  cMatchId?: string | null;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  cTrnpcodeact?: string | null;
  /* 补齐自 C# DTO（原 swagger 生成缺字段） */
  cWgtMethod?: string | null;
  cArea?: string | null;
  nPlanNum?: number | null;
}
export interface Fh1002 {
  selected?: boolean;
  cBatchNo?: string | null;
  cMatNo?: string | null;
  cStove?: string | null;
  nMatNetWgt?: number;
  nMatActWgt?: number;
  nMatDiscrepWgt?: number;
  nMatThick?: number;
  nMatWidth?: number;
  nMatLen?: number;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cStockCode?: string | null;
  cStockRoomNo?: string | null;
  cLayerno?: string | null;
  cOrderNo?: string | null;
  cConNo?: string | null;
  cBillOfLadingNo?: string | null;
  nMatNum?: number;
  cSpec?: string | null;
  cTrnpcodeact?: string | null;
  nSelectMode?: number;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  id?: string | null;
  nMatCount?: number;
  cTaskId?: string | null;
  cPlanId?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cMatchId?: string | null;
  cTrimFlag?: string | null;
  cDelivyStatusCode?: string | null;
  cDestination?: string | null;
  cInboundNo?: string | null;
  cWgtToler?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  /* 补齐自 C# DTO（原 swagger 生成缺字段） */
  cGcStd?: string | null;
  cTsStd?: string | null;
  cDetectDefectLevel?: string | null;
  cZStd?: string | null;
  cComplexDecideCode?: number | null;
  cDetectResultCode?: number | null;
  cInterfaceId?: string | null;
  cArer?: string | null;
  cReserveField1?: string | null;
  cReserveField2?: string | null;
  cReserveField3?: string | null;
}
export interface HmxDept {
  selected?: boolean;
  id?: string | null;
  cDeptPid?: string | null;
  cDeptName?: string | null;
  cDeptDesc?: string | null;
  cCompany?: string | null;
  cClassify?: string | null;
  cSw01?: string | null;
  cSw02?: string | null;
  cSw03?: string | null;
  cSw04?: string | null;
  cSw05?: string | null;
}
export interface ImportTL2000Dto {
  cCustCname?: string | null;
  cNo1?: string | null;
  cNo2?: string | null;
  cNo3?: string | null;
  cNo4?: string | null;
  cSgCode?: string | null;
  nOrderNThick?: number;
  nBoardNWidth1?: number;
  nBoardNWidth2?: string | null;
  nWidthWgt?: number;
  nBoardNLen1?: number;
  nBoardNLen2?: string | null;
  cDelivyStatusCode?: string | null;
  nSignNum?: number;
  cConNum?: number;
  cTrimFlag?: string | null;
  cOrderSpec?: string | null;
  cTlSgCode?: string | null;
  nSlabThick?: number;
  nSlabWidth?: number;
  nColdSlabLen?: number;
  nPlanSlabNum?: number;
  nSlabSingleWgt?: number;
  nProduceSlabWgt?: number;
  nProduceBoardThick?: number;
  nProduceBoardWidth?: number;
  nProduceBoardLen?: number;
  nBc?: number;
  nSteelSingleWgt?: number;
  nPlanedBoardNum?: number;
  nPlanedWgt?: number;
  nConSteelKS?: number;
  nConSteelNum?: number;
  nTlTol?: number;
  nLlBoardWgt?: number;
  nLlBoardEndWgt?: number;
  nLlBoardEdge?: number;
  nLlBoardEnd?: number;
  nLlBurnLoss?: number;
  nLlCleanLen?: number;
  nBoarCleanLen?: number;
  cThickRange?: string | null;
  cDelivyQtyFlag?: string | null;
  cTolType?: string | null;
  cFlawStand?: string | null;
  cFlawDesc?: string | null;
  cSgStd?: string | null;
  cTransType?: string | null;
  cStoreRoom?: string | null;
  cRzFlag?: string | null;
  cSampleSpec?: string | null;
  cSpecialMarkGy?: string | null;
  cSpecialGy?: string | null;
  cAddress?: string | null;
  cThickRangeDis?: string | null;
  cSingleSlab?: string | null;
  cThreading1?: string | null;
  cThreading2?: string | null;
  cThreading3?: string | null;
  cThreading4?: string | null;
  cVirtualStoreCode?: string | null;
  cStoreShift?: string | null;
  nRate?: number;
  nZlWgt?: number;
  nPlanBoarLen?: number;
  cYcAlert?: string | null;
  cRollType?: string | null;
  nLlProduceKs?: number;
  nDcLen?: number;
  dJhTime?: string;
  czWidth?: string | null;
  cRollNo?: string | null;
  nColdSlabLen2?: number;
  nColdSlabKs?: number;
  nColdSlabNum?: number;
  cInboundNo?: string | null;
  dPlanTime?: string;
  cDelivyAddress?: string | null;
  cRepairProduce?: string | null;
}
export interface ImportTmp2000Dto {
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cOrderNo?: string | null;
  cSteelType?: string | null;
  cSgCode?: string | null;
  nThick?: number | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nWidthWgt?: number | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cDelivyStatusDesc?: string | null;
  nNum?: number | null;
  nWgt?: number | null;
  cTrimFlag?: string | null;
  cOverstepBl?: string | null;
  cDelivyQtyFlag?: string | null;
  cTol?: string | null;
  cFlawDesc?: string | null;
  cSgStd?: string | null;
  cConNO?: string | null;
  dJhqTime?: string | null;
  cDelivyAddress?: string | null;
  cSpecialMarkGy?: string | null;
  nWtMin?: number | null;
  nWtMax?: number | null;
  cSpec?: string | null;
  cConRemark?: string | null;
  cInboundNo?: string | null;
  cExitem1?: string | null;
  dTimeShipment?: string | null;
}
export interface ImportTmp2000FlagDto {
  flag?: OrderFlagEnum;
  orderLst?: ImportTmp2000Dto[] | null;
  orderNo?: string | null;
}
export interface InputFh1000Dto {
  cMatchId?: string | null;
  cVehicleNo?: string | null;
  cMatCode?: string | null;
  nOutLen?: number | null;
  cKhzd?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  matLst?: MatDto[] | null;
}
export interface InputFh2000Dto {
  cBillOfLadingNo?: string | null;
  cTaskId?: string | null;
  cMatchId?: string | null;
  cShipName?: string | null;
  cVehicleNo?: string | null;
  cPort?: string | null;
  cOrderCustCname?: string | null;
  dBegin?: string | null;
  dEnd?: string | null;
  nZcStatus?: ZcStatusEnum | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  nThick?: number;
  nWidth?: number;
  cStove?: string | null;
  cOutStockCode?: string | null;
  nNum?: number;
  cPlanId?: string | null;
  flag?: string | null;
  cardId?: string | null;
  cQualityNo?: string | null;
  cInboundNo?: string | null;
  cStackNo?: string | null;
  cPieceNo?: string | null;
  cCutFlag?: string | null;
  cWgtToler?: string | null;
  creator?: string | null;
  tclass?: string | null;
  cInterfaceid?: string | null;
}
/** 装车出厂/质保书材料明细（原 QueryMatOutDto） */
export interface QueryMatOutDto {
  selected?: boolean;
  cMatchId?: string | null;
  cOrderCustCname?: string | null;
  cVehicleNo?: string | null;
  nStatus?: number;
  cMatNo?: string | null;
  nMatCount?: number;
  cSgCode?: string | null;
  nMatActWgt?: number;
  nMatThick?: number;
  nMatWidth?: number | null;
  nMatLen?: number | null;
  cTrimFlag?: string | null;
  cWgtToler?: string | null;
  cDelivyStatusCode?: string | null;
  cInboundNo?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  creator?: string | null;
  createTime?: string | null;
  cShipName?: string | null;
  cPort?: string | null;
  nSelectMode?: number;
  cBillOfLadingNo?: string | null;
  cTaskId?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cRemark?: string | null;
  cComplexDecideCode?: number;
  cDetectResultCode?: number;
  cStove?: string | null;
  cSgStd?: string | null;
  cGcStd?: string | null;
  cTsStd?: string | null;
  cZStd?: string | null;
  cArer?: string | null;
  cStockRoomNo?: string | null;
  cReserveField1?: string | null;
}
/** 退货录入行（原 QueryTsd3000Dto，FH4000） */
export interface QueryTsd3000Dto {
  selected?: boolean;
  cCustName?: string | null;
  cMatNo?: string | null;
  cStove?: string | null;
  nMatWgt?: number | null;
  nMatNum?: number | null;
  nMatThick?: number | null;
  nMatWidth?: number | null;
  nMatLen?: number | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cOrderNo?: string | null;
  cMatName?: string | null;
  cMatchId?: string | null;
  cBillOfLadingNo?: string | null;
  cTaskId?: string | null;
}
/** 装车异常日志（原 Tsd1000Log，FH3010） */
export interface Tsd1000Log {
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMatchId?: string | null;
  cTaskId?: string | null;
  cBillOfLadingNo?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cRemark?: string | null;
  nStatus?: number;
  nZcStatus?: number;
  nSwlx?: number;
  nWgt?: number;
  nNum?: number;
  cMatNo?: string | null;
  cVehicleNo?: string | null;
  cErrorCode?: string | null;
}
/** 派车计划查询入参（原 ApiBillDetailInput，FH3000） */
export interface ApiBillDetailInput {
  pageIndex?: number;
  pageSize?: number;
  orderNo?: string | null;
  dealersName?: string | null;
  entrustDealerName?: string | null;
  carNo?: string | null;
  shipNo?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}
/** 派车计划明细（原 ApiBillDetail，FH3000） */
export interface ApiBillDetail {
  orderNo?: string | null;
  dealersName?: string | null;
  entrustDealerName?: string | null;
  carNo?: string | null;
  shipNo?: string | null;
  bcArea?: string | null;
  wharfName?: string | null;
  orderRemark?: string | null;
  firstAuTime?: string | null;
  stateName?: string | null;
  performanceMark?: string | null;
  goodsName?: string | null;
  nC_GoodsCode?: string | null;
  goodsTypeName?: string | null;
  materialName?: string | null;
  goodsSpec?: string | null;
  count?: number | null;
  weight?: number | null;
  amtWeight?: number | null;
  gYText?: string | null;
  gCText?: string | null;
  qCNo?: string | null;
  lengthMin?: string | null;
  lengthMax?: string | null;
  gyQb?: string | null;
  gyTs?: string | null;
  gyRcl?: string | null;
  gC?: string | null;
  gCJJ?: string | null;
  recordId?: string | null;
  zcNum?: number | null;
  zcWgt?: number | null;
}
/** 质保书打印记录（原 ZbsPrintDto） */
export interface ZbsPrintDto {
  cPieceNo?: string | null;
  cZbsCode?: string | null;
  creator?: string | null;
  createTime?: string | null;
}
export interface InputPlanDto {
  dTimeStart?: string;
  dTimeEnd?: string;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cOrderNo?: string | null;
  cCcmCode?: string | null;
  cLineCode?: string | null;
  jcStatus?: JcStatusEnum | null;
}
export interface InputTmp2000Dto {
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cOrderCustCname?: string | null;
  dBegin?: string | null;
  dEnd?: string | null;
  cLineCode?: string | null;
  orderStatus?: OrderStatusEnum | null;
  cOrderNoLst?: string[] | null;
  nFlag?: OrderFlagEnum | null;
}
export interface InputTmp2010Dto {
  dTimeStart?: string;
  dTimeEnd?: string;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cLineCode?: string | null;
  cLineCodes?: string[] | null;
  cStaId?: string | null;
  nOrderStatus?: OrderStatusEnum | null;
  nTlStatus?: OrderTlEnum | null;
  nReviewStatus?: OrderReviewEnum | null;
  lgPlanStatus?: LgProdStatusEnum | null;
  cOrderNo?: string | null;
  orderLst?: string[] | null;
  conNo?: string | null;
  timeRange?: TimeRange;
  cBatchNo?: string | null;
  batchLst?: string[] | null;
  cStove?: string | null;
  pMonth?: string | null;
  proType?: string | null;
  cStoreCode?: string | null;
  cIsTlOrder?: string | null;
}
export interface InputTmp2020Dto {
  timeRange?: TimeRange;
  dTimeStart?: string;
  dTimeEnd?: string;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nStatus?: number | null;
}
export interface InsertPlanDto {
  listOrder?: OrderDto[] | null;
  cRemark?: string | null;
}
export interface LSendcarItemTDto {
  id?: string | null;
  carno?: string | null;
  planid?: string | null;
  memo13?: string | null;
  code?: string | null;
  name?: string | null;
  snumber?: number;
  suttleapp?: number;
  orderCust?: string | null;
  taskId?: string | null;
  td?: string | null;
  flag?: number;
}
export interface MatDto {
  cPieceNo?: string | null;
}
export interface OrderDto {
  cId?: string | null;
  nOrder?: number;
}
export interface QueryCarDto {
  cVehicleNo?: string | null;
  cMatchId?: string | null;
  cBillOfLadingNo?: string | null;
  nTare?: number;
  dTareTime?: string | null;
  materialname?: string | null;
  remark?: string | null;
}
export interface QueryCptTmp2010Dto {
  id?: string | null;
  selected?: boolean;
  cOrderCustCname?: string | null;
  cOrderNo?: string | null;
  cSteelType?: string | null;
  cSgCode?: string | null;
  nThick?: number | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidth?: number | null;
  nWidthMax?: number | null;
  nWidthWgt?: number | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cDelivyStatusDesc?: string | null;
  nNum?: number | null;
  nWgt?: number | null;
  cTrimFlag?: string | null;
  cOverstepBl?: string | null;
  cDelivyQtyFlag?: string | null;
  cTol?: string | null;
  cFlawDesc?: string | null;
  cSgStd?: string | null;
  cConNo?: string | null;
  dJhqTime?: string | null;
  cDelivyAddress?: string | null;
  cSpecialMarkGy?: string | null;
  nWtMin?: number | null;
  nWtMax?: number | null;
  cSpec?: string | null;
  cConRemark?: string | null;
  cInboundNo?: string | null;
}
export interface QueryCustDto {
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
}
export interface QueryFhJl2000Dto {
  selected?: boolean;
  cTaskId?: string | null;
  cBillOfLadingNo?: string | null;
  cMatchId?: string | null;
  cVehicleNo?: string | null;
  nZcStatus?: ZcStatusEnum;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cOutStockCode?: string | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  nNum?: number;
  nWgt?: number;
  nZcNum?: number;
  nZcWgt?: number;
  nSyNum?: number;
  nSyWgt?: number;
  cSgCode?: string | null;
  cSpec?: string | null;
  nThick?: number;
  nWidth?: number;
  cLengthType?: string | null;
  nLenMin?: string | null;
  nLenMax?: string | null;
  cQualityNo?: string | null;
  cPlanId?: string | null;
  nTare?: number;
  dTareTime?: string | null;
  cRemark?: string | null;
  nOutLen?: number | null;
  cTargetPlace?: string | null;
  cShipName?: string | null;
  cPort?: string | null;
  nSwlx?: SwlxEnum;
  cKhzd?: string | null;
  createTime?: string | null;
  nBillitemid?: string | null;
  cInterfaceid?: string | null;
  nSourceid?: number;
  nSourceplaceid?: number;
  cSourcememo?: string | null;
  nTargetplaceid?: number;
  targetid?: number;
  targetmemo?: string | null;
  planbegintime?: string;
  planendtime?: string;
  settlementmodes?: number;
  accountstype?: number;
  operatype?: string | null;
  nClassindex?: number;
  nClasstype?: number;
  cItemFree1?: string | null;
  cItemFree2?: number;
  cItemFree3?: string | null;
  /* 补齐自 C# DTO（原 swagger 生成缺字段） */
  suttleapp?: number;
  gyqb?: string | null;
  gyqbDesc?: string | null;
  gyts?: string | null;
  gyrcl?: string | null;
  cDelivyStatusCode?: string | null;
  gc?: string | null;
  performancemark?: string | null;
  qualitygrade?: string | null;
  qualitygradeDesc?: string | null;
  bcarea?: string | null;
  sysRemark?: string | null;
  tclass?: string | null;
}
export interface QueryFhTyd2000Dto {
  selected?: boolean;
  cOrderNo?: string | null;
  cPieceNo?: string | null;
  cStove?: string | null;
  cBatchNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number;
  nCalWgt?: number;
  nWgt?: number;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  /* 补齐自 C# DTO（原 swagger 生成缺字段） */
  nQmLevel?: number | null;
  cDelivyStatusCode?: string | null;
  cWgtToler?: string | null;
  cCutFlag?: string | null;
  cCutFlagDesc?: string | null;
  cInboundNo?: string | null;
  cDelivyAddress?: string | null;
  cCustName?: string | null;
  cDetectDefectLevel?: string | null;
  nQmStatus?: number | null;
  nLockReason?: string | null;
  cSurfaceResult?: number | null;
  cDetectResultCode?: number | null;
  cComplexDecideCode?: number | null;
  cSpecialMarkGy?: string | null;
  cProdCode?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cPlanId?: string | null;
  cInterfaceId?: string | null;
  cArer?: string | null;
  cProdClass?: string | null;
}
export interface QueryOrderTqmtd10Dto {
  cGbStlGrd?: string | null;
  cStd?: string | null;
  cProdCode?: string | null;
  cProdCodeDesc?: string | null;
  cDelivyStatusCode?: string | null;
  cDelivyStatusCodeDesc?: string | null;
}
export interface QueryOrdersForDesignInputParameter {
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cOrderCustCname?: string | null;
  dBegin?: string | null;
  dEnd?: string | null;
  cLineCode?: string | null;
  orderStatus?: OrderStatusEnum | null;
  orderProcFlag?: OrderProcEnum | null;
  cOrderNoLst?: string[] | null;
}
export interface QueryTmp2000Dto {
  selected?: boolean;
  id?: string | null;
  cOrderNo?: string | null;
  nStatus?: OrderStatusEnum | null;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cSteelType?: string | null;
  cSgCode?: string | null;
  nThick?: number | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidth?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nWidthWgt?: number | null;
  cLengthType?: LengthTypeEnum;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cDelivyStatusCode?: string | null;
  cDelivyStatusDesc?: string | null;
  nNum?: number | null;
  nWgt?: number | null;
  cTrimFlag?: string | null;
  cOverstepBl?: string | null;
  cDelivyQtyFlag?: string | null;
  cTol?: string | null;
  cFlawDesc?: string | null;
  cConNo?: string | null;
  cSgStd?: string | null;
  dJhqTime?: string | null;
  cDelivyAddress?: string | null;
  cSpecialMarkGy?: string | null;
  nWtMax?: number | null;
  nWtMin?: number | null;
  cSpec?: string | null;
  cConRemark?: string | null;
  cInboundNo?: string | null;
  nThickTolMin?: number | null;
  nThickTolMax?: number | null;
  nWidthTolMin?: number | null;
  nWidthTolMax?: number | null;
  nLenTolMin?: number | null;
  nLenTolMax?: number | null;
  dTimeShipment?: string | null;
  cSgCodeNk?: string | null;
  cJrzzgyCode?: string | null;
  cJqgyCode?: string | null;
  cExitem1?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cLineCode?: string | null;
  cDeptCode?: string | null;
  cOrderProcFlag?: number;
  cOrderProcUserId?: string | null;
  dOrderProcTime?: string | null;
  cZgGyCode?: string | null;
  cSendUserId?: string | null;
  dSendTime?: string | null;
  cPushUserId?: string | null;
  dPushTime?: string | null;
  nSfpj?: OrderReviewEnum | null;
  cPjName?: string | null;
  nFlag?: OrderFlagEnum;
}
export interface QueryTmp2016Dto {
  cOrderNo?: string | null;
  cTlOrderNo?: string | null;
  cLineCode?: string | null;
  dCreateTimeRange?: TimeRange;
}
export interface SendCarItem {
  id?: string | null;
  taskId?: string | null;
  td?: string | null;
  flag?: number;
}
export interface SlabInfoDto {
  id?: string | null;
  nThickPlan?: number | null;
  nWidthPlan?: number | null;
  nPlanBoarLen?: number | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLenMin?: number | null;
  nSlabLenMax?: number | null;
  nWgtUnit?: number | null;
  nSlabQua?: number | null;
  nSlabWgt?: number | null;
  cSlabSource?: string | null;
  cSlabRemark?: string | null;
  cTlName?: string | null;
  dTlTime?: string | null;
  nWgtMeter?: number | null;
}
export interface SlabPcDto {
  selected?: boolean;
  tmp2010Id?: string | null;
  cOrderNo?: string | null;
  cCcmCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSteelType?: string | null;
  cSpec?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLenMin?: number | null;
  nSlabLenMax?: number | null;
  nSlabQua?: number | null;
  nSlabWgt?: number | null;
  nSlabWgtSy?: number | null;
  cSpecOrder?: string | null;
  nQua?: number | null;
  nWgtLcPlan?: number | null;
  nWgtUnit?: number | null;
  nOrder?: number | null;
}
export interface TLDto {
  ids?: string[] | null;
  slabInfoDto?: SlabInfoDto | null;
  tmp2016s?: Tmp2016[] | null;
}
export interface Thr4000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPlanId?: string | null;
  cZpId?: string | null;
  cMxId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number;
  nWidth?: number;
  nLen?: number;
  nQua?: number;
  nWgt?: number;
  cTrimFlag?: string | null;
  cInboundNo?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cLengthType?: string | null;
  nLenMin?: number;
  nLenMax?: number;
  cEngMinThick?: string | null;
  cEngMaxThick?: string | null;
  cEngMinWidth?: string | null;
  cEngMaxWidth?: string | null;
  cEngMinLen?: string | null;
  cEngMaxLen?: string | null;
  cCustCode?: string | null;
  cCustName?: string | null;
  dDeliveryDate?: string;
  dOrdDate?: string;
  cSpecReqText?: string | null;
  cConNo?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cOrderCustCname?: string | null;
  cConsigneeCustCname?: string | null;
  cPieceNoSlab?: string | null;
  cSgCodeSlab?: string | null;
  cSgStdSlab?: string | null;
  cSpecSlab?: string | null;
  nThickSlab?: number;
  nWidthSlab?: number;
  nLenSlab?: number;
  nQuaSlab?: number;
  nWgtSlab?: number;
  cMatCodeSlab?: string | null;
  cMatNameSlab?: string | null;
  nFurType?: number;
  cFurCode?: string | null;
  cRollCode?: string | null;
  dFinish?: string;
  cFinishShift?: string | null;
  cFinishGroup?: string | null;
  cFinishEmp?: string | null;
  cConfirmStatus?: string | null;
  cConfirmShift?: string | null;
  cConfirmGroup?: string | null;
  cConfirmEmp?: string | null;
  dConfirm?: string;
  cSurfaceResult?: string | null;
  dSurfaceTime?: string;
  cSurfaceUser?: string | null;
  cSurfaceRemark?: string | null;
  cRespDept?: string | null;
  cFaceHandleAdvice?: string | null;
  cSampleLotNo?: string | null;
  cSampleLotNoSlab?: string | null;
  cQmHandleDesc?: string | null;
  nStatus?: InventoryStatusEnum;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cProdCode?: string | null;
  cWgtToler?: string | null;
  nOrderThick?: number | null;
  nOrderWidth?: number | null;
  cOrderLenType?: string | null;
  nOrderLenMax?: number | null;
  nOrderLenMin?: number | null;
  nOrderLen?: number | null;
  nCalWgt?: number | null;
  cPrint?: string | null;
  cSlCode?: string | null;
  dPrint?: string | null;
}
export interface TimeRange {
  min?: string | null;
  max?: string | null;
  timeSpan?: string;
  equalsMethod?: EqualsFlag;
}
export interface Tmp1220 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cRollTypeOne?: string | null;
  nSlabThickMin?: number | null;
  nSlabThickSwitch?: EqualsFlag;
  nSlabThickMax?: number | null;
  nWidthSwitchMin?: number | null;
  nWidthSwitch?: EqualsFlag;
  nWidthSwitchMax?: number | null;
  nLenSwitchMin?: number | null;
  nLenSwitch?: EqualsFlag;
  nLenSwitchMax?: number | null;
  nSlabEdgeMin?: number | null;
  nSlabEdgeMax?: number | null;
  nSlabHeadMin?: number | null;
  nSlabHeadMax?: number | null;
  nThickSwitchMin?: number | null;
  nThickSwitchMax?: number | null;
  cRollTypeTwo?: string | null;
  cTrimFlag?: string | null;
  cCcl?: string | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  nSlabEdge?: number | null;
  nSlabHead?: number | null;
  nStatus?: number | null;
}
export interface Tmp1220SaveChangesData {
  addedItems?: Tmp1220[] | null;
  changedItems?: Tmp1220[] | null;
  deletedItems?: Tmp1220[] | null;
}
export interface Tmp2000 {
  selected?: boolean;
  id?: string | null;
  nStatus?: OrderStatusEnum;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderNo?: string | null;
  cConNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nWgt?: number | null;
  nThick?: number | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidth?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nLen?: number | null;
  cLengthType?: LengthTypeEnum;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cSteelType?: string | null;
  cProdCode?: string | null;
  cLineCode?: string | null;
  nDbc?: number | null;
  nNum?: number | null;
  cMsc?: string | null;
  cPsc?: string | null;
  cMscLineNo?: string | null;
  cMscLineDesc?: string | null;
  cWholeBacklog?: string | null;
  cWholeBacklogDesc?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cOrderCustEname?: string | null;
  cProductH?: string | null;
  cOrderTypeCode?: string | null;
  cExportFlag?: string | null;
  dOrderTime?: string | null;
  dJhqTime?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cSlabType?: string | null;
  cConRemark?: string | null;
  cSpecialMarkGy?: string | null;
  cWarrantyDesc?: string | null;
  cPackCode?: string | null;
  nOrderProcFlag?: OrderProcEnum;
  cDelivyQtyFlag?: string | null;
  cDeptCode?: string | null;
  nFlag?: OrderFlagEnum;
  cProdName?: string | null;
  cDelivyStatusDesc?: string | null;
  cCustStdDesc?: string | null;
  nApplyCloseStatus?: number | null;
  cApplyCloseEmp?: string | null;
  dApplyCloseDt?: string | null;
  cApplyCloseRemark?: string | null;
  cDesignNo?: string | null;
  cDesignDesc?: string | null;
  nWtMax?: number | null;
  nWtMin?: number | null;
  nSendNum?: number | null;
  nWidthWgt?: number | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  cSgCodeNk?: string | null;
  cOrderProcUserid?: string | null;
  dOrderProcTime?: string | null;
  cZggyCode?: string | null;
  cPushUserid?: string | null;
  dPushTime?: string | null;
  cSendUserid?: string | null;
  dSendTime?: string | null;
  nThickTolMin?: number | null;
  nThickTolMax?: number | null;
  nWidthTolMin?: number | null;
  nWidthTolMax?: number | null;
  nLenTolMin?: number | null;
  nLenTolMax?: number | null;
  dTimeShipment?: string | null;
  cJrzzgyCode?: string | null;
  cJqgyCode?: string | null;
  cExitem1?: string | null;
  nExitem2?: number | null;
  cExitem3?: string | null;
}
export interface Tmp2000Log {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderNo?: string | null;
  cSwlx?: string | null;
  cRemark?: string | null;
}
export interface Tmp2005Dto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nStatus?: OrderStatusEnum | null;
  cOrderNo?: string | null;
  cTlOrderNo?: string | null;
  cLineCode?: string | null;
  cConNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nWgt?: number | null;
  nWgtSy?: number | null;
  nThick?: number;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidth?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nLen?: number | null;
  cLengthType?: string | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cSteelType?: string | null;
  cProdCode?: string | null;
  nDbc?: number | null;
  nNum?: number | null;
  cMsc?: string | null;
  cPsc?: string | null;
  cMscLineNo?: string | null;
  cMscLineDesc?: string | null;
  cWholeBacklog?: string | null;
  cWholeBacklogDesc?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cOrderCustEname?: string | null;
  cProductH?: string | null;
  cOrderTypeCode?: string | null;
  cExportFlag?: string | null;
  dOrderTime?: string | null;
  dJhqTime?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cSlabType?: string | null;
  cConRemark?: string | null;
  cSpecialMarkGy?: string | null;
  cWarrantyDesc?: string | null;
  cPackCode?: string | null;
  cOrderProcFlag?: number | null;
  cDelivyQtyFlag?: string | null;
  cDeptCode?: string | null;
  nFlag?: number | null;
  cProdName?: string | null;
  cDelivyStatusDesc?: string | null;
  cCustStdDesc?: string | null;
  nApplyCloseStatus?: number | null;
  cApplyCloseEmp?: string | null;
  dApplyCloseDt?: string | null;
  cApplyCloseRemark?: string | null;
  cDesignNo?: string | null;
  cDesignDesc?: string | null;
  nWtMax?: number | null;
  nWtMin?: number | null;
  nSendNum?: number | null;
  nWidthWgt?: number | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  cSlabSource?: string | null;
  cTlSgCode?: string | null;
  cTlSgStd?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLenMin?: number | null;
  nSlabLenMax?: number | null;
  nSlabQua?: number | null;
  nWgtMeter?: number | null;
  nWgtUnit?: number | null;
  nRate?: number | null;
  nSlabWgt?: number | null;
  nSlabWgtSy?: number | null;
  cSlabRemark?: string | null;
  nTlStatus?: OrderTlEnum | null;
  cTlRemark?: string | null;
  cTlName?: string | null;
  dTlTime?: string | null;
  cTlOrderFlag?: string | null;
  cCcmCode?: string | null;
  nSfpj?: OrderReviewEnum | null;
  cPjName?: string | null;
  dPjTime?: string | null;
  cPjRemark?: string | null;
  cSlabSize?: string | null;
  cStNo?: string | null;
  cIsMerge?: string | null;
  cZggyCode?: string | null;
  nLenPlan?: number | null;
  nThickPlan?: number | null;
  nWidthPlan?: number | null;
  nLgPlanStatus?: LgPlanStatusEnum | null;
  nSteelSingleWgt?: number | null;
  nPlanedBoardNum?: number | null;
  nPlanedWgt?: number | null;
  nConSteelKs?: number | null;
  nConSteelNum?: number | null;
  nLlBoardWgt?: number | null;
  nLlBoardEndWgt?: number | null;
  nLlBoardEdge?: number | null;
  nLlBoardEnd?: number | null;
  nLlBurnLoss?: number | null;
  nLlCleanLen?: number | null;
  nBoarCleanLen?: number | null;
  cThickRange?: string | null;
  nTlTol?: number | null;
  cFlawStand?: string | null;
  cTransType?: string | null;
  cStoreRoom?: string | null;
  cRzFlag?: string | null;
  cSampleSpec?: string | null;
  cAddress?: string | null;
  cThickRangeDis?: string | null;
  cSingleSlab?: string | null;
  cThreading1?: string | null;
  cThreading2?: string | null;
  cThreading3?: string | null;
  cThreading4?: string | null;
  cVirtualStoreCode?: string | null;
  cStoreShift?: string | null;
  nZlWgt?: number | null;
  nPlanBoarLen?: number | null;
  cYcAlert?: string | null;
  cRollType?: string | null;
  nLlProduceKs?: number | null;
  nDcLen?: number | null;
  czWidth?: string | null;
  cRollNo?: string | null;
  nColdSlabKs?: number | null;
  nColdSlabNum?: number | null;
  cRepairProduce?: string | null;
  nThickTolMin?: number | null;
  nThickTolMax?: number | null;
  nWidthTolMin?: number | null;
  nWidthTolMax?: number | null;
  nLenTolMin?: number | null;
  nLenTolMax?: number | null;
  dTimeShipment?: string | null;
  cJrzzgyCode?: string | null;
  cJqgyCode?: string | null;
  cSpecPlan?: string | null;
  cOrderNoOld?: string | null;
  cOrderNo1?: string | null;
  cOrderNo2?: string | null;
  cOrderNo3?: string | null;
  cOrderNo4?: string | null;
  cOrderNo5?: string | null;
  cOrderNo6?: string | null;
  nLenPlan1?: number | null;
  nLenPlan2?: number | null;
  nLenPlan3?: number | null;
  nLenPlan4?: number | null;
  nLenPlan5?: number | null;
  nLenPlan6?: number | null;
}
export interface Tmp2010 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nStatus?: OrderStatusEnum | null;
  cOrderNo?: string | null;
  cTlOrderNo?: string | null;
  cLineCode?: string | null;
  cConNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nWgt?: number | null;
  nWgtSy?: number | null;
  nThick?: number;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidth?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nLen?: number | null;
  cLengthType?: string | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cSteelType?: string | null;
  cProdCode?: string | null;
  nDbc?: number | null;
  nNum?: number | null;
  cMsc?: string | null;
  cPsc?: string | null;
  cMscLineNo?: string | null;
  cMscLineDesc?: string | null;
  cWholeBacklog?: string | null;
  cWholeBacklogDesc?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cOrderCustEname?: string | null;
  cProductH?: string | null;
  cOrderTypeCode?: string | null;
  cExportFlag?: string | null;
  dOrderTime?: string | null;
  dJhqTime?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cSlabType?: string | null;
  cConRemark?: string | null;
  cSpecialMarkGy?: string | null;
  cWarrantyDesc?: string | null;
  cPackCode?: string | null;
  cOrderProcFlag?: number | null;
  cDelivyQtyFlag?: string | null;
  cDeptCode?: string | null;
  nFlag?: number | null;
  cProdName?: string | null;
  cDelivyStatusDesc?: string | null;
  cCustStdDesc?: string | null;
  nApplyCloseStatus?: number | null;
  cApplyCloseEmp?: string | null;
  dApplyCloseDt?: string | null;
  cApplyCloseRemark?: string | null;
  cDesignNo?: string | null;
  cDesignDesc?: string | null;
  nWtMax?: number | null;
  nWtMin?: number | null;
  nSendNum?: number | null;
  nWidthWgt?: number | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  cSlabSource?: string | null;
  cTlSgCode?: string | null;
  cTlSgStd?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLenMin?: number | null;
  nSlabLenMax?: number | null;
  nSlabQua?: number | null;
  nWgtMeter?: number | null;
  nWgtUnit?: number | null;
  nRate?: number | null;
  nSlabWgt?: number | null;
  nSlabWgtSy?: number | null;
  cSlabRemark?: string | null;
  nTlStatus?: OrderTlEnum | null;
  cTlRemark?: string | null;
  cTlName?: string | null;
  dTlTime?: string | null;
  cTlOrderFlag?: string | null;
  cCcmCode?: string | null;
  nSfpj?: OrderReviewEnum | null;
  cPjName?: string | null;
  dPjTime?: string | null;
  cPjRemark?: string | null;
  cSlabSize?: string | null;
  cStNo?: string | null;
  cIsMerge?: string | null;
  cZggyCode?: string | null;
  nLenPlan?: number | null;
  nThickPlan?: number | null;
  nWidthPlan?: number | null;
  nLgPlanStatus?: LgPlanStatusEnum | null;
  nSteelSingleWgt?: number | null;
  nPlanedBoardNum?: number | null;
  nPlanedWgt?: number | null;
  nConSteelKs?: number | null;
  nConSteelNum?: number | null;
  nLlBoardWgt?: number | null;
  nLlBoardEndWgt?: number | null;
  nLlBoardEdge?: number | null;
  nLlBoardEnd?: number | null;
  nLlBurnLoss?: number | null;
  nLlCleanLen?: number | null;
  nBoarCleanLen?: number | null;
  cThickRange?: string | null;
  nTlTol?: number | null;
  cFlawStand?: string | null;
  cTransType?: string | null;
  cStoreRoom?: string | null;
  cRzFlag?: string | null;
  cSampleSpec?: string | null;
  cAddress?: string | null;
  cThickRangeDis?: string | null;
  cSingleSlab?: string | null;
  cThreading1?: string | null;
  cThreading2?: string | null;
  cThreading3?: string | null;
  cThreading4?: string | null;
  cVirtualStoreCode?: string | null;
  cStoreShift?: string | null;
  nZlWgt?: number | null;
  nPlanBoarLen?: number | null;
  cYcAlert?: string | null;
  cRollType?: string | null;
  nLlProduceKs?: number | null;
  nDcLen?: number | null;
  czWidth?: string | null;
  cRollNo?: string | null;
  nColdSlabKs?: number | null;
  nColdSlabNum?: number | null;
  cRepairProduce?: string | null;
  nThickTolMin?: number | null;
  nThickTolMax?: number | null;
  nWidthTolMin?: number | null;
  nWidthTolMax?: number | null;
  nLenTolMin?: number | null;
  nLenTolMax?: number | null;
  dTimeShipment?: string | null;
  cJrzzgyCode?: string | null;
  cJqgyCode?: string | null;
  cSpecPlan?: string | null;
  cOrderNoOld?: string | null;
  cOrderNo1?: string | null;
  cOrderNo2?: string | null;
  cOrderNo3?: string | null;
  cOrderNo4?: string | null;
  cOrderNo5?: string | null;
  cOrderNo6?: string | null;
  nLenPlan1?: number | null;
  nLenPlan2?: number | null;
  nLenPlan3?: number | null;
  nLenPlan4?: number | null;
  nLenPlan5?: number | null;
  nLenPlan6?: number | null;
  cExitem1?: string | null;
}
export interface Tmp2010Dto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nStatus?: OrderStatusEnum | null;
  cOrderNo?: string | null;
  cTlOrderNo?: string | null;
  cLineCode?: string | null;
  cConNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nWgt?: number | null;
  nWgtSy?: number | null;
  nThick?: number;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidth?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nLen?: number | null;
  cLengthType?: string | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cSteelType?: string | null;
  cProdCode?: string | null;
  nDbc?: number | null;
  nNum?: number | null;
  cMsc?: string | null;
  cPsc?: string | null;
  cMscLineNo?: string | null;
  cMscLineDesc?: string | null;
  cWholeBacklog?: string | null;
  cWholeBacklogDesc?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cOrderCustEname?: string | null;
  cProductH?: string | null;
  cOrderTypeCode?: string | null;
  cExportFlag?: string | null;
  dOrderTime?: string | null;
  dJhqTime?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cSlabType?: string | null;
  cConRemark?: string | null;
  cSpecialMarkGy?: string | null;
  cWarrantyDesc?: string | null;
  cPackCode?: string | null;
  cOrderProcFlag?: number | null;
  cDelivyQtyFlag?: string | null;
  cDeptCode?: string | null;
  nFlag?: number | null;
  cProdName?: string | null;
  cDelivyStatusDesc?: string | null;
  cCustStdDesc?: string | null;
  nApplyCloseStatus?: number | null;
  cApplyCloseEmp?: string | null;
  dApplyCloseDt?: string | null;
  cApplyCloseRemark?: string | null;
  cDesignNo?: string | null;
  cDesignDesc?: string | null;
  nWtMax?: number | null;
  nWtMin?: number | null;
  nSendNum?: number | null;
  nWidthWgt?: number | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  cSlabSource?: string | null;
  cTlSgCode?: string | null;
  cTlSgStd?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLenMin?: number | null;
  nSlabLenMax?: number | null;
  nSlabQua?: number | null;
  nWgtMeter?: number | null;
  nWgtUnit?: number | null;
  nRate?: number | null;
  nSlabWgt?: number | null;
  nSlabWgtSy?: number | null;
  cSlabRemark?: string | null;
  nTlStatus?: OrderTlEnum | null;
  cTlRemark?: string | null;
  cTlName?: string | null;
  dTlTime?: string | null;
  cTlOrderFlag?: string | null;
  cCcmCode?: string | null;
  nSfpj?: OrderReviewEnum | null;
  cPjName?: string | null;
  dPjTime?: string | null;
  cPjRemark?: string | null;
  cSlabSize?: string | null;
  cStNo?: string | null;
  cIsMerge?: string | null;
  cZggyCode?: string | null;
  nLenPlan?: number | null;
  nThickPlan?: number | null;
  nWidthPlan?: number | null;
  nLgPlanStatus?: LgPlanStatusEnum | null;
  nSteelSingleWgt?: number | null;
  nPlanedBoardNum?: number | null;
  nPlanedWgt?: number | null;
  nConSteelKs?: number | null;
  nConSteelNum?: number | null;
  nLlBoardWgt?: number | null;
  nLlBoardEndWgt?: number | null;
  nLlBoardEdge?: number | null;
  nLlBoardEnd?: number | null;
  nLlBurnLoss?: number | null;
  nLlCleanLen?: number | null;
  nBoarCleanLen?: number | null;
  cThickRange?: string | null;
  nTlTol?: number | null;
  cFlawStand?: string | null;
  cTransType?: string | null;
  cStoreRoom?: string | null;
  cRzFlag?: string | null;
  cSampleSpec?: string | null;
  cAddress?: string | null;
  cThickRangeDis?: string | null;
  cSingleSlab?: string | null;
  cThreading1?: string | null;
  cThreading2?: string | null;
  cThreading3?: string | null;
  cThreading4?: string | null;
  cVirtualStoreCode?: string | null;
  cStoreShift?: string | null;
  nZlWgt?: number | null;
  nPlanBoarLen?: number | null;
  cYcAlert?: string | null;
  cRollType?: string | null;
  nLlProduceKs?: number | null;
  nDcLen?: number | null;
  czWidth?: string | null;
  cRollNo?: string | null;
  nColdSlabKs?: number | null;
  nColdSlabNum?: number | null;
  cRepairProduce?: string | null;
  nThickTolMin?: number | null;
  nThickTolMax?: number | null;
  nWidthTolMin?: number | null;
  nWidthTolMax?: number | null;
  nLenTolMin?: number | null;
  nLenTolMax?: number | null;
  dTimeShipment?: string | null;
  cJrzzgyCode?: string | null;
  cJqgyCode?: string | null;
  cSpecPlan?: string | null;
  cOrderNoOld?: string | null;
  cOrderNo1?: string | null;
  cOrderNo2?: string | null;
  cOrderNo3?: string | null;
  cOrderNo4?: string | null;
  cOrderNo5?: string | null;
  cOrderNo6?: string | null;
  nLenPlan1?: number | null;
  nLenPlan2?: number | null;
  nLenPlan3?: number | null;
  nLenPlan4?: number | null;
  nLenPlan5?: number | null;
  nLenPlan6?: number | null;
}
export interface Tmp2016 {
  selected?: boolean;
  id?: string | null;
  cOrderNo?: string | null;
  cTlOrderNo?: string | null;
  cOrderNoOld?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cSpec?: string | null;
  nQua?: number | null;
  nOrder?: number;
  nThick?: number;
  nWidth?: number | null;
  nLen?: number | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  nLenPlan?: number | null;
  nThickPlan?: number;
  nWidthPlan?: number | null;
}
export interface Tmp2016Dto {
  selected?: boolean;
  id?: string | null;
  corderId?: string | null;
  cOrderNo?: string | null;
  cTlOrderNo?: string | null;
  cOrderNoOld?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cSpec?: string | null;
  nQua?: number | null;
  nStatus?: OrderStatusEnum | null;
  cLineCode?: string | null;
  cConNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nWgt?: number | null;
  nWgtSy?: number | null;
  nThick?: number | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidth?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nLen?: number | null;
  cLengthType?: string | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cSteelType?: string | null;
  cProdCode?: string | null;
  nDbc?: number | null;
  nNum?: number | null;
  cMsc?: string | null;
  cPsc?: string | null;
  cMscLineNo?: string | null;
  cMscLineDesc?: string | null;
  cWholeBacklog?: string | null;
  cWholeBacklogDesc?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cOrderCustEname?: string | null;
  cProductH?: string | null;
  cOrderTypeCode?: string | null;
  cExportFlag?: string | null;
  dOrderTime?: string | null;
  dJhqTime?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cSlabType?: string | null;
  cConRemark?: string | null;
  cSpecialMarkGy?: string | null;
  cWarrantyDesc?: string | null;
  cPackCode?: string | null;
  cOrderProcFlag?: number | null;
  cDelivyQtyFlag?: string | null;
  cDeptCode?: string | null;
  nFlag?: number | null;
  cProdName?: string | null;
  cDelivyStatusDesc?: string | null;
  cCustStdDesc?: string | null;
  nApplyCloseStatus?: number | null;
  cApplyCloseEmp?: string | null;
  dApplyCloseDt?: string | null;
  cApplyCloseRemark?: string | null;
  cDesignNo?: string | null;
  cDesignDesc?: string | null;
  nWtMax?: number | null;
  nWtMin?: number | null;
  nSendNum?: number | null;
  nWidthWgt?: number | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  cSlabSource?: string | null;
  cTlSgCode?: string | null;
  cTlSgStd?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLenMin?: number | null;
  nSlabLenMax?: number | null;
  nSlabQua?: number | null;
  nWgtMeter?: number | null;
  nWgtUnit?: number | null;
  nRate?: number | null;
  nSlabWgt?: number | null;
  nSlabWgtSy?: number | null;
  cSlabRemark?: string | null;
  nTlStatus?: OrderTlEnum | null;
  cTlRemark?: string | null;
  cTlName?: string | null;
  dTlTime?: string | null;
  cTlOrderFlag?: string | null;
  cCcmCode?: string | null;
  nSfpj?: OrderReviewEnum | null;
  cPjName?: string | null;
  dPjTime?: string | null;
  cPjRemark?: string | null;
  cSlabSize?: string | null;
  cStNo?: string | null;
  cIsMerge?: string | null;
  cZgGyCode?: string | null;
}
export interface Tmp2021 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTlOrderNo?: string | null;
  cOrderNo?: string | null;
  cSpec?: string | null;
  nOrder?: number | null;
}
export interface Tmp2030Dto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nStatus?: JcStatusEnum | null;
  cJcNo?: string | null;
  cSgStd?: string | null;
  cSgCode?: string | null;
  cCcmCode?: string | null;
  nLsNum?: number | null;
  nSort?: number | null;
  nWgt?: number | null;
  dJhqTime?: string | null;
  cLev?: string | null;
  dStartTime?: string | null;
  dEndTime?: string | null;
  cRh?: string | null;
  dOrderTime?: string | null;
  cSlabSize?: string | null;
  cMatType?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  cLen?: string | null;
  cRemark?: string | null;
  nLsMin?: number | null;
  nLsMax?: number | null;
  cSgCodeStd?: string | null;
  dDownDdTime?: string | null;
  cDownDdUser?: string | null;
  dDownLgTime?: string | null;
  cDownLgUser?: string | null;
  cLineCode?: string | null;
}
export interface Tmp2040Dto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  nStatus?: JcStatusEnum | null;
  cJcFk?: string | null;
  cJcNo?: string | null;
  cPono?: string | null;
  cLineCode?: string | null;
  cStove?: string | null;
  cSgStd?: string | null;
  cSgCode?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nQua?: number | null;
  nWgt?: number | null;
  nSort?: number | null;
  nSortJc?: number | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cCcCode?: string | null;
  cRhCode?: string | null;
  cLfCode?: string | null;
  cLdCode?: string | null;
  cOrderNo?: string | null;
  cIsZb?: string | null;
  dUseTime?: string | null;
  cRoute?: string | null;
  dJhqTime?: string | null;
  cCustName?: string | null;
  cTsyq?: string | null;
  nLgCn?: number | null;
  cRemark?: string | null;
  cLenMx?: string | null;
  cSgCodeStd?: string | null;
  cStNo?: string | null;
  dDownDdTime?: string | null;
  cDownDdUser?: string | null;
  dDownLgsc?: string | null;
  cDownLgscUser?: string | null;
  nWgtMeter?: number | null;
  cSpecOrder?: string | null;
}
export interface Tmp2042 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nStatus?: OrderStatusEnum | null;
  cOrderNo?: string | null;
  cLcFk?: string | null;
  cSgStd?: string | null;
  cSgCode?: string | null;
  cCcmCode?: string | null;
  nQua?: number | null;
  nWgtPlan?: number | null;
  nWgtOrder?: number | null;
  cSpec?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLen?: number | null;
  cSlabSize?: string | null;
}
export interface Tms3000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cFactoryId?: string | null;
  cLineCode?: string | null;
  cMachine?: string | null;
  cStrandNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cPono?: string | null;
  cPlanId?: string | null;
  cConNo?: string | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number;
  nWth?: number;
  nLen?: number;
  cSpec?: string | null;
  nNum?: number;
  nCalWgt?: number;
  nWgt?: number;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  nStatus?: InventoryStatusEnum;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dProTime?: string;
  cConfirmStatus?: string | null;
  cIsHot?: YesNoDefault;
  cMsc?: string | null;
  cMscLine?: string | null;
  cStNo?: string | null;
  cSteelType?: string | null;
  cProRemark?: string | null;
  cPieceNoQd?: string | null;
  cBilletTypeCode?: string | null;
  cShiftNoSj?: string | null;
  cGroupNoSj?: string | null;
  cSurfaceResult?: string | null;
  dSurfaceTime?: string | null;
  cSurfaceUser?: string | null;
  cSurfaceRemark?: string | null;
  cSurfaceAdvice?: string | null;
  dConfirmTime?: string | null;
  cConfirmUser?: string | null;
  cPcResult?: string | null;
  dPcTime?: string | null;
  cPcUser?: string | null;
  cPcRemark?: string | null;
  cQmHandleDesc?: string | null;
  nQmStatus?: number;
  cDestination?: string | null;
  cSampleLotNo?: string | null;
  cRouteCode?: string | null;
  cPrintCode?: string | null;
  nCastDivCode?: CastDivEnum;
}
export interface TsAppVersion {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  nCode?: number;
  cName?: string | null;
  cNote?: string | null;
  nType?: number;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
}
export interface TsCust001 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cCustEname?: string | null;
  cInboundNo?: string | null;
  cRemark?: string | null;
  cCustNo?: string | null;
  cStatus?: string | null;
  cCustFlow?: string | null;
}
export interface TsCustFl {
  selected?: boolean;
  id?: string | null;
  cCustFid?: string | null;
  cCustZid?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cCustZname?: string | null;
}
export interface TsCustomer {
  selected?: boolean;
  cCustCode?: string | null;
  cCustName?: string | null;
  cRemark?: string | null;
  cStatus?: string | null;
  cType?: string | null;
  cAddress?: string | null;
  cTel?: string | null;
  cFax?: string | null;
  cEmail?: string | null;
  cBank?: string | null;
  cTax?: string | null;
  cLegalPerson?: string | null;
  cContacts?: string | null;
  cCurrency?: string | null;
  cArea?: string | null;
  cCustClass?: string | null;
  cSaleEmp?: string | null;
  cAccount?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cJsfs?: string | null;
  cAbcd?: string | null;
  cPostCode?: string | null;
  cSaleUserNum?: string | null;
  cDept?: string | null;
  cEnCustName?: string | null;
  cEnShortCustName?: string | null;
  cEnAddr?: string | null;
  creator?: string | null;
  id?: string | null;
}
export interface TsMatrl {
  selected?: boolean;
  id?: string | null;
  cMatId?: string | null;
  cMatCode?: string | null;
  cMatName?: string | null;
  cMatGroupCode?: string | null;
  cMatGroupName?: string | null;
  cSgCode?: string | null;
  cSpec?: string | null;
  nThick?: number;
  nWidth?: number;
  nLen?: number | null;
  nWeight?: number;
  nStatus?: YesNo;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
}
export interface ZgPlanDto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cLineCode?: string | null;
  nStatus?: number | null;
  cOrderNo?: string | null;
  cIsMerge?: string | null;
  cOrderNo1?: string | null;
  cOrderNo2?: string | null;
  cOrderNo3?: string | null;
  cOrderNo4?: string | null;
  cSgCode?: string | null;
  nThick?: number | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidthWgt?: number | null;
  nWidth?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nLen?: number | null;
  cLengthType?: string | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cDelivyStatusCode?: string | null;
  nNum?: number | null;
  nPlanedWgt?: number | null;
  cTrimFlag?: string | null;
  cSpec?: string | null;
  cTlSgCode?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLen?: number | null;
  nSlabQua?: number | null;
  nWgtMeter?: number | null;
  nWgtUnit?: number | null;
  nRate?: number | null;
  nSlabWgt?: number | null;
  nLenTq1?: number | null;
  nLenTq2?: number | null;
  nLenTq3?: number | null;
  nLenTq4?: number | null;
  nOrder?: number;
  cSgStd?: string | null;
  cSteelType?: string | null;
  cProdCode?: string | null;
  nDbc?: number | null;
  nBc?: number | null;
  cSlabSource?: string | null;
  cTlSgStd?: string | null;
  cSlabSize?: string | null;
  cCustStdCode?: string | null;
  cOrderCustNo?: string | null;
  cOrderCustCname?: string | null;
  cOrderCustEname?: string | null;
  cProductH?: string | null;
  cOrderTypeCode?: string | null;
  cExportFlag?: string | null;
  dOrderTime?: string | null;
  dJhqTime?: string | null;
  cSlabType?: string | null;
  cConRemark?: string | null;
  cSpecialMarkGy?: string | null;
  cWarrantyDesc?: string | null;
  cPackCode?: string | null;
  cDelivyQtyFlag?: string | null;
  cDeptCode?: string | null;
  nFlag?: number | null;
  cProdName?: string | null;
  cDelivyStatusDesc?: string | null;
  cCustStdDesc?: string | null;
  nWtMax?: number | null;
  nWtMin?: number | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  cSlabRemark?: string | null;
  cTlOrderFlag?: string | null;
  cStNo?: string | null;
  cPlanTime?: string | null;
  cCool?: string | null;
  nBoarCleanLen?: number | null;
  nLlCleanLen?: number | null;
  nPlanBoarLen?: number | null;
}

/* ---------- 请求 ---------- */

/** 十进制区间（原 DecimalRange，SMP 域本地副本） */
export interface DecimalRange {
  min?: number | null;
  max?: number | null;
}
/** 成品库存查询条件（原 InputStockDto，SD2061/SD3010） */
export interface InputStockDto {
  cOrderNo?: string | null;
  cSettleCust?: string | null;
  cConsignee?: string | null;
  cBatchNo?: string | null;
  cStackNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: DecimalRange | null;
  nWth?: DecimalRange | null;
  nLen?: DecimalRange | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cInboundNo?: string | null;
  dProTime?: TimeRange | null;
  cStoreCode?: string | null;
  cCutFlag?: string | null;
  cWgtToler?: string | null;
  cDetectDefectLevel?: string | null;
  cSpecialMarkGy?: string | null;
  nQmLevel?: number | null;
  qCNo?: string | null;
  nQmStatus?: number | null;
}
/** 成品库存行（原 QueryTyd2000Dto，SD2061/SD3010） */
export interface QueryTyd2000Dto {
  selected?: boolean;
  cPieceNo?: string | null;
  cStove?: string | null;
  cBatchNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cProdCode?: string | null;
  cSpec?: string | null;
  nNum?: number;
  nCalWgt?: number;
  nWgt?: number;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  cOrderNo?: string | null;
  cConsignee?: string | null;
  cOrderNo2?: string | null;
  cSettleCust?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  nQmStatus?: number | null;
  nLockReason?: string | null;
  cWgtToler?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cDelivyAddress?: string | null;
  cPrintCode?: string | null;
  nStatus?: number | null;
  cProRemark?: string | null;
  dProTime?: string | null;
  dInTime?: string | null;
  cDetectDefectLevel?: string | null;
  cSpecialMarkGy?: string | null;
  cDelivyStatusCode?: string | null;
  nQmLevel?: number | null;
  cSurfaceResult?: string | null;
  cDetectResultCode?: string | null;
  cComplexDecideCode?: string | null;
  cSaleEmp?: string | null;
  cProdClass?: string | null;
  cArer?: string | null;
}
/** 调配日志查询（原 InputTyd2000AllocationDto，SD3000） */
export interface InputTyd2000AllocationDto {
  cOrderNo?: string | null;
  cSettleCust?: string | null;
  cPieceNo?: string | null;
  dBegin?: string | null;
  dEnd?: string | null;
}
/** 资源调配日志（原 Tyd2000Allocation，SD3000） */
export interface Tyd2000Allocation {
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSettleCust?: string | null;
  cQcNo?: string | null;
  cInboundNo?: string | null;
  cInboundNo2?: string | null;
  cCustName?: string | null;
  nNum?: number | null;
}
/** 销售预约单模板（原 OrderTemplateDto，SD2061） */
export interface OrderTemplateDto {
  cProdName?: string | null;
  cMateriel?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nMinLen?: number | null;
  nMaxLen?: number | null;
  cCutFlag?: string | null;
  cDetect?: string | null;
  cHeatTreat?: string | null;
  cZPerformance?: string | null;
  cIsStandard?: string | null;
  cWgtToler?: string | null;
  cTolerPrice?: string | null;
  nQty?: number | null;
  cRemark?: string | null;
}
/** 浇次产出坯料（原 QueryCptJC，MP3100） */
export interface QueryCptJC {
  dProTime?: string | null;
  cPlanNo?: string | null;
  cCool?: string | null;
  cOrderNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number;
  nCalWgt?: number;
  cStackNo?: string | null;
  cStackNum?: string | null;
  nQmStatus?: number | null;
  nLockReason?: string | null;
  cPrintCode?: string | null;
  nStatus?: number | null;
  cProRemark?: string | null;
}
/** 坯料计划查询（原 TLSlabDto，SD2020DG） */
export interface TLSlabDto {
  cCode?: string | null;
  cName?: string | null;
  cDesc?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLenMin?: number | null;
  nWgtUnit?: number | null;
}
/** 插入提料 ZG02（原 InsertTlZG02Dto） */
export interface InsertTlZG02Dto {
  cLineCode?: string | null;
}
/** MP2033 查询参数（原 QueryParamDto : InputTmp2010Dto） */
export interface QueryParamDto extends InputTmp2010Dto {
  zGLineCode?: string | null;
  stovePlanWgt?: number;
  ccmCode?: string | null;
  widths?: string | null;
  _selList?: FrmMS2033Dto_PlanInfo[] | null;
}
/** MP2033 生产部下发计划行（原 FrmMS2033Dto_PlanInfo : SlabPcDto） */
export type FrmMS2033Dto_PlanInfo = SlabPcDto;
/** MP2033 炉次切割计划集（原 FrmMS2033Dto_StoveCutInfoAll） */
export interface FrmMS2033Dto_StoveCutInfoAll {
  dataSourceLeft?: FrmMS2033Dto_StoveCutInfo[] | null;
  dataSourceRight?: FrmMS2033Dto_StoveCutInfo[] | null;
}
/** MP2033 炉次切割行（原 FrmMS2033Dto_StoveCutInfo） */
export interface FrmMS2033Dto_StoveCutInfo {
  [key: string]: unknown;
  id?: string | null;
  index?: number;
  stoveSgCode?: string | null;
  cPlanTime?: string | null;
  nSortJc?: number | null;
  stoveHaveMoreSgCode?: boolean;
  cPieceNo?: string | null;
  cStove?: string | null;
  cSgCode?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
}
/** MP2033 添加件次参数（原 FrmMS2033Dto_AddPieceParamDto） */
export interface FrmMS2033Dto_AddPieceParamDto {
  _stoveCutInfo?: FrmMS2033Dto_StoveCutInfo | null;
  liu?: string | null;
  nThick?: number;
  nWidth?: number;
  nLen?: number;
  backUp?: string | null;
}
/** MP2033 增删件次入参（原 FrmMS2033Dto_AddOrRemovePieceDto） */
export interface FrmMS2033Dto_AddOrRemovePieceDto {
  paramDto?: QueryParamDto | null;
  stoveCutInfoAll?: FrmMS2033Dto_StoveCutInfoAll | null;
  addOrRemoveData?: FrmMS2033Dto_AddPieceParamDto | null;
  dataOperateTypeEnum?: number;
  dragSourceData?: FrmMS2033Dto_StoveCutInfo | null;
  dragTragetUpData?: FrmMS2033Dto_StoveCutInfo | null;
}
/** MP2033 保存入参（原 SaveDataDto） */
export interface SaveDataDto {
  paramDto?: QueryParamDto | null;
  datas?: FrmMS2033Dto_StoveCutInfoAll | null;
  _removeDatas?: FrmMS2033Dto_StoveCutInfo[] | null;
  planInfo?: FrmMS2033Dto_PlanInfo | null;
}
/** 钢种执行标准（原 SgCodeAndStdDto，MP2033） */
export interface SgCodeAndStdDto {
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  operationButtonText?: string | null;
}

export const castStoveApi = {
  getUnitWgt(data?: SlabPcDto) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/castStove/getUnitWgt",
      {
        method: "post",
        data,
      },
    );
  },
  getSlabOrderList(data?: InputTmp2010Dto) {
    return requestClient.request<SlabPcDto[]>(
      "/dDH.Service.SMP.Services/castStove/getSlabOrderList",
      {
        method: "post",
        data,
      },
    );
  },
  getLcList(data?: InputPlanDto) {
    return requestClient.request<Tmp2040Dto[]>(
      "/dDH.Service.SMP.Services/castStove/getLcList",
      {
        method: "post",
        data,
      },
    );
  },
  getLcOrderList(lcId?: string) {
    return requestClient.request<Tmp2042[]>(
      "/dDH.Service.SMP.Services/castStove/getLcOrderList",
      {
        method: "post",
        params: { lcId },
      },
    );
  },
  deleteLc(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/deleteLc",
      {
        method: "post",
        data,
      },
    );
  },
  addLc(ccmCode?: string, numLs?: number, wgtLc?: number, numZs?: number, data?: SlabPcDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/addLc",
      {
        method: "post",
        params: { ccmCode, numLs, wgtLc, numZs },
        data,
      },
    );
  },
  addLcNew(ccmCode?: string, numLs?: number, data?: SlabPcDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/addLcNew",
      {
        method: "post",
        params: { ccmCode, numLs },
        data,
      },
    );
  },
  creatJc(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/creatJc",
      {
        method: "post",
        data,
      },
    );
  },
  getJcList(data?: InputPlanDto) {
    return requestClient.request<Tmp2030Dto[]>(
      "/dDH.Service.SMP.Services/castStove/getJcList",
      {
        method: "post",
        data,
      },
    );
  },
  getLcListByJc(jcNo?: string) {
    return requestClient.request<Tmp2040Dto[]>(
      "/dDH.Service.SMP.Services/castStove/getLcListByJc",
      {
        method: "post",
        params: { jcNo },
      },
    );
  },
  deleteJc(jcId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/deleteJc",
      {
        method: "post",
        params: { jcId },
      },
    );
  },
  downJc(jcId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/downJc",
      {
        method: "post",
        params: { jcId },
      },
    );
  },
  updateSort(data?: Tmp2030Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/updateSort",
      {
        method: "post",
        data,
      },
    );
  },
  generateJcNo(staCode?: string, num?: number) {
    return requestClient.request<string[]>(
      "/dDH.Service.SMP.Services/castStove/generateJcNo",
      {
        method: "post",
        params: { staCode, num },
      },
    );
  },
  getSelectSlabOrderList(data?: InputTmp2010Dto) {
    return requestClient.request<SlabPcDto[]>(
      "/dDH.Service.SMP.Services/castStove/getSelectSlabOrderList",
      {
        method: "post",
        data,
      },
    );
  },
  /** 浇次作废前校验（原 CheckJCInvalid，MP2050） */
  checkJCInvalid(jcId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/checkJCInvalid",
      {
        method: "post",
        params: { jcId },
      },
    );
  },
  /** 浇次作废（原 JCInvalid，MP2050） */
  jCInvalid(jcId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/castStove/jCInvalid",
      {
        method: "post",
        params: { jcId },
      },
    );
  },
};

export const fh2000Api = {
  getCarLst(data?: InputFh2000Dto) {
    return requestClient.request<QueryCarDto[]>(
      "/dDH.Service.SMP.Services/fh2000/getCarLst",
      {
        method: "post",
        data,
      },
    );
  },
  getFhJl2000Lst(data?: InputFh2000Dto) {
    return requestClient.request<QueryFhJl2000Dto[]>(
      "/dDH.Service.SMP.Services/fh2000/getFhJl2000Lst",
      {
        method: "post",
        data,
      },
    );
  },
  getFhTyd2000(data?: InputFh2000Dto) {
    return requestClient.request<QueryFhTyd2000Dto[]>(
      "/dDH.Service.SMP.Services/fh2000/getFhTyd2000",
      {
        method: "post",
        data,
      },
    );
  },
  getFh1000Lst(data?: InputFh2000Dto) {
    return requestClient.request<Fh1000[]>(
      "/dDH.Service.SMP.Services/fh2000/getFh1000Lst",
      {
        method: "post",
        data,
      },
    );
  },
  getFh1002Lst(data?: InputFh2000Dto) {
    return requestClient.request<Fh1002[]>(
      "/dDH.Service.SMP.Services/fh2000/getFh1002Lst",
      {
        method: "post",
        data,
      },
    );
  },
  addFhMat(data?: InputFh1000Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/addFhMat",
      {
        method: "post",
        data,
      },
    );
  },
  delMat(data?: Fh1002[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/delMat",
      {
        method: "post",
        data,
      },
    );
  },
  getJLSeqID() {
    return requestClient.request<string>(
      "/dDH.Service.SMP.Services/fh2000/getJLSeqID",
      {
        method: "post",
      },
    );
  },
  sendJL(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/sendJL",
      {
        method: "post",
        data,
      },
    );
  },
  sendJLCancel(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/sendJLCancel",
      {
        method: "post",
        data,
      },
    );
  },
  sendJLSync() {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/fh2000/sendJLSync",
      {
        method: "post",
      },
    );
  },
  /** 装车明细/质保书材料（原 GetZcDetailLst，FH3030/FH3031） */
  getZcDetailLst(data?: InputFh2000Dto) {
    return requestClient.request<QueryMatOutDto[]>(
      "/dDH.Service.SMP.Services/fh2000/getZcDetailLst",
      {
        method: "post",
        data,
      },
    );
  },
  /** 质保书打印记录（原 GetZbsDetailLst） */
  getZbsDetailLst(cPieceNo?: string) {
    return requestClient.request<ZbsPrintDto[]>(
      "/dDH.Service.SMP.Services/fh2000/getZbsDetailLst",
      {
        method: "post",
        params: { cPieceNo },
      },
    );
  },
  /** 异常处理计量材料号（原 SendJL2，FH1000 simpleButton1） */
  sendJL2(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/fh2000/sendJL2",
      {
        method: "post",
        data,
      },
    );
  },
  /** 装车异常日志（原 GetTsd1000Log，FH3010） */
  getTsd1000Log(data?: InputFh2000Dto) {
    return requestClient.request<Tsd1000Log[]>(
      "/dDH.Service.SMP.Services/fh2000/getTsd1000Log",
      {
        method: "post",
        data,
      },
    );
  },
  /** 退货记录查询（原 GetTsd3000Lst，FH4000） */
  getTsd3000Lst(data?: QueryTsd3000Dto) {
    return requestClient.request<QueryTsd3000Dto[]>(
      "/dDH.Service.SMP.Services/fh2000/getTsd3000Lst",
      {
        method: "post",
        data,
      },
    );
  },
  /** 确认退货（原 InsertTsd3000，FH4000） */
  insertTsd3000(data?: QueryTsd3000Dto[], remark?: string) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/fh2000/insertTsd3000",
      {
        method: "post",
        data,
        params: { remark },
      },
    );
  },
};

export const jLApi = {
  deliveryItem(data?: ApiJL2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/deliveryItem",
      {
        method: "post",
        data,
      },
    );
  },
  vehicleResult(data?: ApiJL2001Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/vehicleResult",
      {
        method: "post",
        data,
      },
    );
  },
  getCard(data?: ApiCardDto) {
    return requestClient.request<ApiCarMessage>(
      "/dDH.Service.Interface.Services.JL/jL/getCard",
      {
        method: "post",
        data,
      },
    );
  },
  checkCardID(data?: ApiCardDto) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/checkCardID",
      {
        method: "post",
        data,
      },
    );
  },
  setCard(data?: ApiCardDto) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/setCard",
      {
        method: "post",
        data,
      },
    );
  },
  getSendCarItem(data?: ApiCardDto) {
    return requestClient.request<LSendcarItemTDto[]>(
      "/dDH.Service.Interface.Services.JL/jL/getSendCarItem",
      {
        method: "post",
        data,
      },
    );
  },
  getJLSeqID() {
    return requestClient.request<string>(
      "/dDH.Service.Interface.Services.JL/jL/getJLSeqID",
      {
        method: "post",
      },
    );
  },
  setTaskCard(data?: ApiCardInput) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.JL/jL/setTaskCard",
      {
        method: "post",
        data,
      },
    );
  },
  getMatchId(operatype?: string) {
    return requestClient.request<string>(
      "/dDH.Service.Interface.Services.JL/jL/getMatchId",
      {
        method: "post",
        params: { operatype },
      },
    );
  },
};

export const tLApi = {
  generateTlOrderNo(matType?: string, num?: number) {
    return requestClient.request<string[]>(
      "/dDH.Service.SMP.Services/tL/generateTlOrderNo",
      {
        method: "post",
        params: { matType, num },
      },
    );
  },
  queryOrder(data?: InputTmp2010Dto) {
    return requestClient.request<Tmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tL/queryOrder",
      {
        method: "post",
        data,
      },
    );
  },
  queryOrderNew(data?: InputTmp2010Dto) {
    return requestClient.request<Tmp2005Dto[]>(
      "/dDH.Service.SMP.Services/tL/queryOrderNew",
      {
        method: "post",
        data,
      },
    );
  },
  updateTl(Id?: string, NThickPlan?: number, NWidthPlan?: number, NPlanBoarLen?: number, CSgCode?: string, CSgStd?: string, NSlabThick?: number, NSlabWidth?: number, NSlabLenMin?: number, NSlabLenMax?: number, NWgtUnit?: number, NSlabQua?: number, NSlabWgt?: number, CSlabSource?: string, CSlabRemark?: string, CTlName?: string, DTlTime?: string, NWgtMeter?: number, tLType?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/updateTl",
      {
        method: "post",
        params: { Id, NThickPlan, NWidthPlan, NPlanBoarLen, CSgCode, CSgStd, NSlabThick, NSlabWidth, NSlabLenMin, NSlabLenMax, NWgtUnit, NSlabQua, NSlabWgt, CSlabSource, CSlabRemark, CTlName, DTlTime, NWgtMeter, tLType },
        data,
      },
    );
  },
  checkedTl(lineCode?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/checkedTl",
      {
        method: "post",
        params: { lineCode },
        data,
      },
    );
  },
  checkedTlNew(lineCode?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/checkedTlNew",
      {
        method: "post",
        params: { lineCode },
        data,
      },
    );
  },
  cancleCheckedTl(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/cancleCheckedTl",
      {
        method: "post",
        data,
      },
    );
  },
  cancleCheckedTlNew(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/cancleCheckedTlNew",
      {
        method: "post",
        data,
      },
    );
  },
  delTl(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/delTl",
      {
        method: "post",
        data,
      },
    );
  },
  cancleCheckedTlOld(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/cancleCheckedTl_old",
      {
        method: "post",
        data,
      },
    );
  },
  cancleTl(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/cancleTl",
      {
        method: "post",
        data,
      },
    );
  },
  setLength(data?: Tmp2010Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/setLength",
      {
        method: "post",
        data,
      },
    );
  },
  orderCF(cOrderNo?: string, data?: Tmp2010Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/orderCF",
      {
        method: "post",
        params: { cOrderNo },
        data,
      },
    );
  },
  importTl2000(data?: ImportTL2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/importTl2000",
      {
        method: "post",
        data,
      },
    );
  },
  hbTl(data?: TLDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/hbTl",
      {
        method: "post",
        data,
      },
    );
  },
  setSlabSize(Id?: string, CCode?: string, CDesc?: string, CEnable?: string, CGroup?: string, CName?: string, COrder?: string, CPid?: string, CSw01?: string, CSw02?: string, CSw03?: string, CSw04?: string, CSw05?: string, CValue?: string, Selected?: boolean, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/setSlabSize",
      {
        method: "post",
        params: { Id, CCode, CDesc, CEnable, CGroup, CName, COrder, CPid, CSw01, CSw02, CSw03, CSw04, CSw05, CValue, Selected },
        data,
      },
    );
  },
  autoMatched(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/autoMatched",
      {
        method: "post",
        data,
      },
    );
  },
  existOrderNoS(data?: ImportTL2000Dto[]) {
    return requestClient.request<string[]>(
      "/dDH.Service.SMP.Services/tL/existOrderNoS",
      {
        method: "post",
        data,
      },
    );
  },
  importTl2000New(data?: ImportTL2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/importTl2000New",
      {
        method: "post",
        data,
      },
    );
  },
  importTmp2005(data?: ImportTL2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tL/importTmp2005",
      {
        method: "post",
        data,
      },
    );
  },
  /** 订单提料查询（原 GetOrderLst2，TL2000/MP2016） */
  getOrderLst2(data?: InputTmp2000Dto) {
    return requestClient.request<QueryTmp2000Dto[]>(
      "/dDH.Service.SMP.Services/tL/getOrderLst2",
      {
        method: "post",
        data,
      },
    );
  },
  /** 提料生产关闭（原 TLProdClose，TL2000/TL2000DG） */
  tlProdClose(data?: Tmp2005Dto[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tL/tlProdClose",
      {
        method: "post",
        data,
      },
    );
  },
};

/** 库存坯料挂单/转挂（原 ITLZG02AppService） */
export const tLZG02Api = {
  getSlabCodeList() {
    return requestClient.request<TLSlabDto[]>(
      "/dDH.Service.SMP.Services/tLZG02/getSlabCodeList",
      {
        method: "post",
      },
    );
  },
  insertTLZG02(data?: InsertTlZG02Dto, lst?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tLZG02/insertTLZG02",
      {
        method: "post",
        params: { lst },
        data,
      },
    );
  },
  checkedTlNew(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tLZG02/checkedTlNew",
      {
        method: "post",
        data,
      },
    );
  },
  cancleCheckedTlNew(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tLZG02/cancleCheckedTlNew",
      {
        method: "post",
        data,
      },
    );
  },
  delTl(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tLZG02/delTl",
      {
        method: "post",
        data,
      },
    );
  },
};

/** 中厚板计划排产（原 IFrmMP2033AppService） */
export const frmMP2033Api = {
  getSlabOrderList(data?: QueryParamDto) {
    return requestClient.request<FrmMS2033Dto_PlanInfo[]>(
      "/dDH.Service.SMP.Services/frmMP2033/getSlabOrderList",
      {
        method: "post",
        data,
      },
    );
  },
  getGPWidthInfo(data?: QueryParamDto) {
    return requestClient.request<number[]>(
      "/dDH.Service.SMP.Services/frmMP2033/getGPWidthInfo",
      {
        method: "post",
        data,
      },
    );
  },
  checkCreateStoveCunInfo(data?: QueryParamDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/frmMP2033/checkCreateStoveCunInfo",
      {
        method: "post",
        data,
      },
    );
  },
  createStoveCunInfo(data?: QueryParamDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/frmMP2033/createStoveCunInfo",
      {
        method: "post",
        data,
      },
    );
  },
  calcuateNewData(data?: FrmMS2033Dto_AddOrRemovePieceDto) {
    return requestClient.request<FrmMS2033Dto_StoveCutInfoAll>(
      "/dDH.Service.SMP.Services/frmMP2033/calcuateNewData",
      {
        method: "post",
        data,
      },
    );
  },
  checkRemoveStoveCunInfo(data?: QueryParamDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/frmMP2033/checkRemoveStoveCunInfo",
      {
        method: "post",
        data,
      },
    );
  },
  removeStoveCunInfo(data?: QueryParamDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/frmMP2033/removeStoveCunInfo",
      {
        method: "post",
        data,
      },
    );
  },
  queryStoveCutInfo(data?: QueryParamDto) {
    return requestClient.request<FrmMS2033Dto_StoveCutInfoAll>(
      "/dDH.Service.SMP.Services/frmMP2033/queryStoveCutInfo",
      {
        method: "post",
        data,
      },
    );
  },
  createStoveCutData(data?: FrmMS2033Dto_AddPieceParamDto) {
    return requestClient.request<FrmMS2033Dto_StoveCutInfo>(
      "/dDH.Service.SMP.Services/frmMP2033/createStoveCutData",
      {
        method: "post",
        data,
      },
    );
  },
  updateStoveSgCodeInfo(stoveInfo?: FrmMS2033Dto_StoveCutInfo, sgCodeInfo?: SgCodeAndStdDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/frmMP2033/updateStoveSgCodeInfo",
      {
        method: "post",
        params: { sgCodeInfo },
        data: stoveInfo,
      },
    );
  },
  saveDatas(data?: SaveDataDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/frmMP2033/saveDatas",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tmp1220Api = {
  queryTmp1220() {
    return requestClient.request<Tmp1220[]>(
      "/dDH.Service.SMP.Services/tmp1220/queryTmp1220",
      {
        method: "post",
      },
    );
  },
  changeTmp1220(data?: Tmp1220SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp1220/changeTmp1220",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tmp2000Api = {
  getOrderTqmtd10Lst(cLineCode?: string) {
    return requestClient.request<QueryOrderTqmtd10Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getOrderTqmtd10Lst",
      {
        method: "post",
        params: { cLineCode },
      },
    );
  },
  getSaleDept() {
    return requestClient.request<HmxDept[]>(
      "/dDH.Service.SMP.Services/tmp2000/getSaleDept",
      {
        method: "post",
      },
    );
  },
  getCustomer() {
    return requestClient.request<QueryCustDto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getCustomer",
      {
        method: "post",
      },
    );
  },
  getOrderLst(data?: InputTmp2000Dto) {
    return requestClient.request<QueryTmp2000Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getOrderLst",
      {
        method: "post",
        data,
      },
    );
  },
  getOrderLst2(data?: InputTmp2000Dto) {
    return requestClient.request<QueryTmp2000Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getOrderLst2",
      {
        method: "post",
        data,
      },
    );
  },
  saveOrder(flag?: string, data?: QueryTmp2000Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2000/saveOrder",
      {
        method: "post",
        params: { flag },
        data,
      },
    );
  },
  delOrder(data?: QueryTmp2000Dto[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/delOrder",
      {
        method: "post",
        data,
      },
    );
  },
  importTmp2000(data?: ImportTmp2000FlagDto) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/importTmp2000",
      {
        method: "post",
        data,
      },
    );
  },
  importByBx(data?: BxOrder[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2000/importByBx",
      {
        method: "post",
        data,
      },
    );
  },
  getConNo(line?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SMP.Services/tmp2000/getConNo",
      {
        method: "post",
        params: { line },
      },
    );
  },
  fillVacancy2(serNum?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SMP.Services/tmp2000/fillVacancy2",
      {
        method: "post",
        params: { serNum },
      },
    );
  },
  fillVacancy3(serNum?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SMP.Services/tmp2000/fillVacancy3",
      {
        method: "post",
        params: { serNum },
      },
    );
  },
  downOrderPlan(data?: QueryTmp2000Dto[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/downOrderPlan",
      {
        method: "post",
        data,
      },
    );
  },
  pushOrderPlan(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/pushOrderPlan",
      {
        method: "post",
        data,
      },
    );
  },
  addYLOrder(Selected?: boolean, Id?: string, COrderNo?: string, NStatus?: OrderStatusEnum, COrderCustNo?: string, COrderCustCname?: string, CSteelType?: string, CSgCode?: string, NThick?: number, NThickMin?: number, NThickMax?: number, NWidth?: number, NWidthMin?: number, NWidthMax?: number, NWidthWgt?: number, CLengthType?: LengthTypeEnum, NLenMin?: number, NLenMax?: number, CDelivyStatusCode?: string, CDelivyStatusDesc?: string, NNum?: number, NWgt?: number, CTrimFlag?: string, COverstepBl?: string, CDelivyQtyFlag?: string, CTol?: string, CFlawDesc?: string, CConNo?: string, CSgStd?: string, DJhqTime?: string, CDelivyAddress?: string, CSpecialMarkGy?: string, NWtMax?: number, NWtMin?: number, CSpec?: string, CConRemark?: string, CInboundNo?: string, NThickTolMin?: number, NThickTolMax?: number, NWidthTolMin?: number, NWidthTolMax?: number, NLenTolMin?: number, NLenTolMax?: number, DTimeShipment?: string, CSgCodeNk?: string, CJrzzgyCode?: string, CJqgyCode?: string, CExitem1?: string, Creator?: string, CreateTime?: string, LastModifier?: string, LastModifyTime?: string, CLineCode?: string, CDeptCode?: string, COrderProcFlag?: number, COrderProcUserId?: string, DOrderProcTime?: string, CZgGyCode?: string, CSendUserId?: string, DSendTime?: string, CPushUserId?: string, DPushTime?: string, NSfpj?: OrderReviewEnum, CPjName?: string, NFlag?: OrderFlagEnum, data?: ImportTmp2000FlagDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2000/addYLOrder",
      {
        method: "post",
        params: { Selected, Id, COrderNo, NStatus, COrderCustNo, COrderCustCname, CSteelType, CSgCode, NThick, NThickMin, NThickMax, NWidth, NWidthMin, NWidthMax, NWidthWgt, CLengthType, NLenMin, NLenMax, CDelivyStatusCode, CDelivyStatusDesc, NNum, NWgt, CTrimFlag, COverstepBl, CDelivyQtyFlag, CTol, CFlawDesc, CConNo, CSgStd, DJhqTime, CDelivyAddress, CSpecialMarkGy, NWtMax, NWtMin, CSpec, CConRemark, CInboundNo, NThickTolMin, NThickTolMax, NWidthTolMin, NWidthTolMax, NLenTolMin, NLenTolMax, DTimeShipment, CSgCodeNk, CJrzzgyCode, CJqgyCode, CExitem1, Creator, CreateTime, LastModifier, LastModifyTime, CLineCode, CDeptCode, COrderProcFlag, COrderProcUserId, DOrderProcTime, CZgGyCode, CSendUserId, DSendTime, CPushUserId, DPushTime, NSfpj, CPjName, NFlag },
        data,
      },
    );
  },
  delYLOrderPlan(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/delYLOrderPlan",
      {
        method: "post",
        data,
      },
    );
  },
  getTmp2000Log(data?: Tmp2000Log) {
    return requestClient.request<Tmp2000Log[]>(
      "/dDH.Service.SMP.Services/tmp2000/getTmp2000Log",
      {
        method: "post",
        data,
      },
    );
  },
  queryOrdersForDesign(data?: QueryOrdersForDesignInputParameter) {
    return requestClient.request<Tmp2000[]>(
      "/dDH.Service.SMP.Services/tmp2000/queryOrdersForDesign",
      {
        method: "post",
        data,
      },
    );
  },
  getTmp2010(data?: InputTmp2000Dto) {
    return requestClient.request<QueryCptTmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getTmp2010",
      {
        method: "post",
        data,
      },
    );
  },
  /** 试验料订单查询（原 GetSylOrderLst，SD2000SYL） */
  getSylOrderLst(data?: InputTmp2000Dto) {
    return requestClient.request<QueryTmp2000Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getSylOrderLst",
      { method: "post", data },
    );
  },
  /** 商品坯订单删除（原 DelGPOrder，SD2000DG_SYL） */
  delGPOrder(data?: QueryTmp2000Dto[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/delGPOrder",
      { method: "post", data },
    );
  },
  /** 退回排产（原 BackOrderPlan，SD2000） */
  backOrderPlan(data?: QueryTmp2000Dto[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/backOrderPlan",
      { method: "post", data },
    );
  },
  /** 商品坯计划下发（原 PushSlabOrderPlan，SD2020GP） */
  pushSlabOrderPlan(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/pushSlabOrderPlan",
      { method: "post", data },
    );
  },
  /** 退回销售订单（原 BackSaleOrder，SD2020 系列） */
  backSaleOrder(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/backSaleOrder",
      { method: "post", data },
    );
  },
  /** 退回销售订单2（原 BackSaleOrder2，SD2020GP） */
  backSaleOrder2(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/backSaleOrder2",
      { method: "post", data },
    );
  },
  /** 订单结案/取消结案（原 FinishOrder，flag=Y/N） */
  finishOrder(flag?: string, data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/finishOrder",
      { method: "post", params: { flag }, data },
    );
  },
  /** 未提料长度查询（原 GetTmp2010Len，SD2050） */
  getTmp2010Len(data?: InputTmp2000Dto) {
    return requestClient.request<QueryCptTmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getTmp2010Len",
      { method: "post", data },
    );
  },
  /** 板长变更申请列表（原 GetTmp2010ApplyLen，SD2050Check） */
  getTmp2010ApplyLen() {
    return requestClient.request<QueryCptTmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getTmp2010ApplyLen",
      { method: "post" },
    );
  },
  /** 提交板长变更（原 InsertOrderLenPlan，SD2050） */
  insertOrderLenPlan(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/insertOrderLenPlan",
      { method: "post", data },
    );
  },
  /** 板长变更审核（原 CheckTmp2010ApplyLen，SD2050Check） */
  checkTmp2010ApplyLen(checkApply?: number, data?: QueryCptTmp2010Dto[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/checkTmp2010ApplyLen",
      { method: "post", params: { checkApply }, data },
    );
  },
  /** 拆分订单列表（原 GetOrderCF，SD2020CheckCf） */
  getOrderCF() {
    return requestClient.request<QueryTmp2000Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getOrderCF",
      { method: "post" },
    );
  },
  /** 拆分订单审核（原 CheckOrderCFApply，SD2020CheckCf） */
  checkOrderCFApply(checkApply?: number, data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/checkOrderCFApply",
      { method: "post", params: { checkApply }, data },
    );
  },
  /** 提料计划订单（原 GetTmp2005，MP3100） */
  getTmp2005(data?: InputTmp2000Dto) {
    return requestClient.request<Tmp2005Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getTmp2005",
      { method: "post", data },
    );
  },
  /** 炉次库存件次（原 GetTmp2005Storages，MP3100） */
  getTmp2005Storages(data?: InputTmp2010Dto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getTmp2005Storages",
      { method: "post", data },
    );
  },
  /** 浇次产出坯料（原 GetCptJc，MP3100） */
  getCptJc(data?: InputTmp2000Dto) {
    return requestClient.request<QueryCptJC[]>(
      "/dDH.Service.SMP.Services/tmp2000/getCptJc",
      { method: "post", data },
    );
  },
  /** 成品库存资源调配（原 GetStockList，SD2061/SD3010） */
  getStockList(data?: InputStockDto) {
    return requestClient.request<QueryTyd2000Dto[]>(
      "/dDH.Service.SMP.Services/tmp2000/getStockList",
      { method: "post", data },
    );
  },
  /** 确认资源调配（原 UpdateStockAllocation，SD2061） */
  updateStockAllocation(cSettleCust?: string, cInboundNo?: string, data?: InputStockDto) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/updateStockAllocation",
      { method: "post", params: { cSettleCust, cInboundNo }, data },
    );
  },
  /** 取消订单匹配（原 CancelMatchOrder，SD2061/SD3010） */
  cancelMatchOrder(data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/cancelMatchOrder",
      { method: "post", data },
    );
  },
  /** 资源调配日志（原 GetTyd2000AllocationLogsAsync，SD3000） */
  getTyd2000AllocationLogsAsync(data?: InputTyd2000AllocationDto) {
    return requestClient.request<Tyd2000Allocation[]>(
      "/dDH.Service.SMP.Services/tmp2000/getTyd2000AllocationLogsAsync",
      { method: "post", data },
    );
  },
  /** 生成销售预约单模板（原 GenerateOrderTemplate，SD2061） */
  generateOrderTemplate(data?: QueryTyd2000Dto[]) {
    return requestClient.request<OrderTemplateDto[]>(
      "/dDH.Service.SMP.Services/tmp2000/generateOrderTemplate",
      { method: "post", data },
    );
  },
  /** 批量修改订单（原 BatchUpdateOrder，SD2000） */
  batchUpdateOrder(
    dJhqTime?: string,
    cInboundNo?: string,
    cOrderCustEname?: string,
    cSgStd?: string,
    data?: QueryTmp2000Dto[],
  ) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/batchUpdateOrder",
      { method: "post", params: { dJhqTime, cInboundNo, cOrderCustEname, cSgStd }, data },
    );
  },
  /** 冶金规范钢种匹配（原 MatchNkSgCode，SD2000DG_SYL） */
  matchNkSgCode(cLineCode?: string, data?: string[]) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tmp2000/matchNkSgCode",
      { method: "post", params: { cLineCode }, data },
    );
  },

  getCptSlabNo(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMP.Services/tmp2000/getCptSlabNo", {
      method: "post",
      data,
    });
  },};

export const tmp2010Api = {
  queryOrder(data?: InputTmp2010Dto) {
    return requestClient.request<Tmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tmp2010/queryOrder",
      {
        method: "post",
        data,
      },
    );
  },
  reviewOrder(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2010/reviewOrder",
      {
        method: "post",
        data,
      },
    );
  },
  cancleReviewOrder(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2010/cancleReviewOrder",
      {
        method: "post",
        data,
      },
    );
  },
  setStaCode(code?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2010/setStaCode",
      {
        method: "post",
        params: { code },
        data,
      },
    );
  },
  /** 更新规格（原 UpdateSpec，MP2010） */
  updateSpec(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2010/updateSpec",
      {
        method: "post",
        data,
      },
    );
  },
  /** 修改计划日期（原 ChangePlanDate，MP2010） */
  changePlanDate(cPlanTime?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2010/changePlanDate",
      {
        method: "post",
        params: { cPlanTime },
        data,
      },
    );
  },
};

export const tmp2016Api = {
  queryTmp2016(data?: QueryTmp2016Dto) {
    return requestClient.request<Tmp2016Dto[]>(
      "/dDH.Service.SMP.Services/tmp2016/queryTmp2016",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tmp2020Api = {
  queryOrder(data?: InputTmp2010Dto) {
    return requestClient.request<ZgPlanDto[]>(
      "/dDH.Service.SMP.Services/tmp2020/queryOrder",
      {
        method: "post",
        data,
      },
    );
  },
  queryPlanOrder(cOrderNo?: string) {
    return requestClient.request<Tmp2016[]>(
      "/dDH.Service.SMP.Services/tmp2020/queryPlanOrder",
      {
        method: "post",
        params: { cOrderNo },
      },
    );
  },
  queryPlanJQ(cOrderNo?: string) {
    return requestClient.request<Tmp2021[]>(
      "/dDH.Service.SMP.Services/tmp2020/queryPlanJQ",
      {
        method: "post",
        params: { cOrderNo },
      },
    );
  },
  queryPlans(data?: InputTmp2020Dto) {
    return requestClient.request<ZgPlanDto[]>(
      "/dDH.Service.SMP.Services/tmp2020/queryPlans",
      {
        method: "post",
        data,
      },
    );
  },
  addTmp2020s(data?: InsertPlanDto) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/addTmp2020s",
      {
        method: "post",
        data,
      },
    );
  },
  deleteTmp2020s(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/deleteTmp2020s",
      {
        method: "post",
        data,
      },
    );
  },
  downTmp2020s(cLineCode?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/downTmp2020s",
      {
        method: "post",
        params: { cLineCode },
        data,
      },
    );
  },
  /** 下发计划关闭（原 CloseDownPlan，MP2021） */
  closeDownPlan(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/closeDownPlan",
      {
        method: "post",
        data,
      },
    );
  },
  closeTmp2020s(reason?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/closeTmp2020s",
      {
        method: "post",
        params: { reason },
        data,
      },
    );
  },
  updateTmp2010s(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/updateTmp2010s",
      {
        method: "post",
        data,
      },
    );
  },
  checkJQ(ListOrder?: Tmp2021[], data?: Tmp2010) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tmp2020/checkJQ",
      {
        method: "post",
        params: { ListOrder },
        data,
      },
    );
  },
};

export const tmp3000Api = {
  queryTmp2010Dtos(data?: InputTmp2010Dto) {
    return requestClient.request<Tmp2010Dto[]>(
      "/dDH.Service.SMP.Services/tmp3000/queryTmp2010Dtos",
      {
        method: "post",
        data,
      },
    );
  },
  queryTms3000s(CLineCode?: string, COrderNo?: string) {
    return requestClient.request<Tms3000[]>(
      "/dDH.Service.SMP.Services/tmp3000/queryTms3000s",
      {
        method: "post",
        params: { CLineCode, COrderNo },
      },
    );
  },
  queryThr4000s(data?: DtoQuerySlabs) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SMP.Services/tmp3000/queryThr4000s",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tsAVersionApi = {
  queryByVersion(creator?: string) {
    return requestClient.request<TsAppVersion[]>(
      "/dDH.Service.Widgets.Services/tsAVersion/queryByVersion",
      {
        method: "post",
        params: { creator },
      },
    );
  },
  insert(data?: TsAppVersion) {
    return requestClient.request<any>(
      "/dDH.Service.Widgets.Services/tsAVersion/insert",
      {
        method: "post",
        data,
      },
    );
  },
  update(data?: TsAppVersion) {
    return requestClient.request<any>(
      "/dDH.Service.Widgets.Services/tsAVersion/update",
      {
        method: "post",
        data,
      },
    );
  },
  delete(Id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.Widgets.Services/tsAVersion/delete",
      {
        method: "post",
        params: { Id },
      },
    );
  },
  getMaxNCode() {
    return requestClient.request<number>(
      "/dDH.Service.Widgets.Services/tsAVersion/getMaxNCode",
      {
        method: "post",
      },
    );
  },
  getMaxNCodeByNType(ntype?: number) {
    return requestClient.request<number>(
      "/dDH.Service.Widgets.Services/tsAVersion/getMaxNCodeByNType",
      {
        method: "post",
        params: { ntype },
      },
    );
  },
  existsByNTypeAndNCode(ntype?: number, ncode?: number) {
    return requestClient.request<boolean>(
      "/dDH.Service.Widgets.Services/tsAVersion/existsByNTypeAndNCode",
      {
        method: "post",
        params: { ntype, ncode },
      },
    );
  },
};

export const tsCust001Api = {
  custQuery(CustNo?: string, CustName?: string) {
    return requestClient.request<TsCust001[]>(
      "/dDH.Service.SMP.Services/tsCust001/custQuery",
      {
        method: "post",
        params: { CustNo, CustName },
      },
    );
  },
  deleteCust(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCust001/deleteCust",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tsCustomerApi = {
  syncCust(data?: TsCustomer) {
    return requestClient.request<number>(
      "/dDH.Service.SMP.Services/tsCustomer/syncCust",
      {
        method: "post",
        data,
      },
    );
  },
  addTsCustomer(data?: TsCustomer) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/addTsCustomer",
      {
        method: "post",
        data,
      },
    );
  },
  addTsCustFl(data?: TsCustFl) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/addTsCustFl",
      {
        method: "post",
        data,
      },
    );
  },
  updateTsCustomer(data?: TsCustomer) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/updateTsCustomer",
      {
        method: "post",
        data,
      },
    );
  },
  updateTsCustFl(data?: TsCustFl) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/updateTsCustFl",
      {
        method: "post",
        data,
      },
    );
  },
  getTsCustomerList(data?: TsCustomer) {
    return requestClient.request<TsCustomer[]>(
      "/dDH.Service.SMP.Services/tsCustomer/getTsCustomerList",
      {
        method: "post",
        data,
      },
    );
  },
  getTsCustFlList(code?: string, keywords?: string) {
    return requestClient.request<TsCustFl[]>(
      "/dDH.Service.SMP.Services/tsCustomer/getTsCustFlList",
      {
        method: "post",
        params: { code, keywords },
      },
    );
  },
  removeTsCustomer(data?: TsCustomer) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/removeTsCustomer",
      {
        method: "post",
        data,
      },
    );
  },
  removeTsCustFl(data?: TsCustFl) {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsCustomer/removeTsCustFl",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tsMatrlApi = {
  queryMatrl(data?: TsMatrl) {
    return requestClient.request<TsMatrl[]>(
      "/dDH.Service.SMP.Services/tsMatrl/queryMatrl",
      {
        method: "post",
        data,
      },
    );
  },
  syncMatrl() {
    return requestClient.request<any>(
      "/dDH.Service.SMP.Services/tsMatrl/syncMatrl",
      {
        method: "post",
      },
    );
  },
};

export const xSApi = {
  getMatrl(data?: ApiXSMatrlDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.XS/xS/getMatrl",
      {
        method: "post",
        data,
      },
    );
  },
  getTruckLoading(billofLadingNo?: string) {
    return requestClient.request<ApiVehicleResultDto>(
      "/dDH.Service.Interface.Services.XS/xS/getTruckLoading",
      {
        method: "post",
        params: { billofLadingNo },
      },
    );
  },
  getCust(data?: ApiCustDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.XS/xS/getCust",
      {
        method: "post",
        data,
      },
    );
  },
  /** 派车/提货单计划明细（原 GetBillDetailList，FH3000） */
  getBillDetailList(data?: ApiBillDetailInput) {
    return requestClient.request<ApiBillDetail[]>(
      "/dDH.Service.Interface.Services.XS/xS/getBillDetailList",
      {
        method: "post",
        data,
      },
    );
  },
};

/* ---------- 炼钢作业 MP3200 补齐 ---------- */
/** frmMP3200Api（炼钢作业迁移补齐） */
export const frmMP3200Api = {
  query(data?: unknown) {
    return requestClient.request<any>("/dDH.Service.SMP.Services/frmMP3200/query", {
      method: "post",
      data,
    });
  },
};
