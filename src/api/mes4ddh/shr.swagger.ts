/**
 * SHR 域后端接口（dDH.Service.*）：枚举 + 类型 + 请求，单文件维护。
 * 原 src/api/shr 的 enums.ts / types.d.ts / request.ts 合并。
 */

import { requestClient } from "@/api/_core/request";
import type { Tyd2000Dto } from "./syd.swagger";
import type { Tqmtpa6 } from "./sqm.swagger";

/* ---------- 枚举 ---------- */

export enum BearBoxType {
  UpOper = 0,
  DowmOper = 1,
  UpPass = 2,
  DowmPass = 3,
  Up = 4,
  Down = 5,
}
export enum BearType {
  Four = 0,
  Two = 1,
  Taper = 2,
  Bush = 3,
}
export enum CCrewCode {
  Cut1 = 1,
  Cut2 = 2,
}
export enum CastDivEnum {
  L = 0,
  M = 1,
  O = 2,
}
export enum ComplexDecideResult {
  None = 0,
  Qualified = 2,
  Unqualified = 3,
  ManualRelease = 4,
  NotNeedJudge = 5,
}
export enum EqualsFlag {
  Default = 1,
  LeftOpen = 2,
  RightOpen = 4,
  Open = 6,
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
export enum NProTypeEnum {
  P = 0,
  R = 10,
  C = 20,
}
export enum QMCZ {
  None = 0,
  Normal = 10,
  ZLFS = 101,
  ZLSF = 102,
  GGG = 103,
  CZP = 104,
  GZ = 105,
  GP = 106,
  PF = 109,
  PEJP = 301,
  PDCC = 302,
  PQTQW = 303,
  PYC = 304,
}
export enum QMLevelEnum {
  A = 0,
  A2 = 10,
  D = 20,
  Q = 30,
  Y = 40,
  B = 60,
  F = 99,
}
export enum QMStatuEnum {
  Normal = 0,
  Locked = 10,
  Handled = 20,
}
export enum SurFaceResultEnum {
  None = 0,
  Pass = 10,
  NoPass = 20,
  LetPass = 30,
}
export enum Tdm1000StatusEnum {
  Spare = 0,
  Assembly = 1,
  Repair = 2,
  Scrap = 3,
}
export enum Tdm1010AssemblyFlag {
  Not = 0,
  Already = 1,
}
export enum Tdm1020StatusEnum {
  Issue = 0,
  Finish = 1,
  Down = 2,
  Scrap = 3,
  Grind = 4,
}
export enum Thr3000FurTypeEnum {
  Cold = 0,
  Hot = 1,
  Warm = 2,
}
export enum Thr3000StatusEnum {
  Batch = 0,
  Ensure = 10,
  Issue = 20,
  Begin = 30,
  Finish = 40,
  Close = 70,
}
export enum Thr3010FurStatusEnum {
  Batch = 0,
  Wait = 10,
  RefuseBefore = 30,
  EnterFur = 40,
  Eliminate = 50,
  ExitFur = 60,
  RefuseAfter = 70,
}
export enum Thr3010HlStatusEnum {
  EnterFur = 10,
  ExitFur = 20,
}
export enum Thr3010JqStatusEnum {
  Batch = 0,
  Wait = 10,
  Finish = 20,
}
export enum Thr3010RollStatusEnum {
  Batch = 0,
  Wait = 10,
  FinishRoll = 30,
  Cut = 40,
  Waste = 90,
}
export enum Thr3010StatusEnum {
  ZZ_UNDO = 0,
  ZZ_SENDED_ERROR = 5,
  ZZ_SENDED = 10,
  ZZ_RESERVED_ERROR = 15,
  ZZ_RESERVED_SUCCESS = 20,
  JQ_SENDED = 100,
  JQ_SENDED_ERROR = 115,
  L2_DOWN = 200,
  L2_UP = 210,
  L2_DELETE = 999,
}
export enum YesNo {
  N = 0,
  Y = 1,
}

/* ---------- 类型 ---------- */


export interface BooleanStringValueTuple {

}
export interface ChyThickItemDto {
  pos?: number;
  valueMin?: number | null;
  valueMax?: number | null;
  value1?: number | null;
  value2?: number | null;
  value3?: number | null;
  value4?: number | null;
  value5?: number | null;
  value6?: number | null;
  value7?: number | null;
  value8?: number | null;
  value9?: number | null;
  value10?: number | null;
  value11?: number | null;
}
export interface ChyWidthItemDto {
  pos?: number;
  valueMin?: number | null;
  valueMax?: number | null;
  value1?: number | null;
  value2?: number | null;
  value3?: number | null;
  value4?: number | null;
}
export interface DecimalRange {
  min?: number | null;
  max?: number | null;
  equalsMethod?: EqualsFlag;
}
export interface DtoAddPlans {
  cOrderId?: string | null;
  nOrder?: number;
}
export interface DtoAddSj {
  isBcp?: boolean;
  cMxId?: string | null;
  nQua?: number;
  cShift?: string | null;
  cGroup?: string | null;
  cRemark?: string | null;
}
export interface DtoAddZp {
  cZpId?: string | null;
  slabIds?: string[] | null;
}
export interface DtoAutoZp {
  cOrderId?: string | null;
  cPieceNo?: string | null;
}
export interface DtoEnsure {
  cZpIds?: string[] | null;
  cRemark?: string | null;
  listPlan?: Thr3020[] | null;
}
export interface DtoFurWork {
  id?: string | null;
  cPieceNo?: string | null;
  cFurCode?: string | null;
  nWd?: number | null;
  dOperate?: string | null;
  cRowNo?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
}
export interface DtoInsertLog {
  cLineCode?: string | null;
  cOrderId?: string | null;
  cZpId?: string | null;
  cMxId?: string | null;
  cSlabId?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  nQua?: number;
  nWgt?: number;
  cDeviceCode?: string | null;
  cGxId?: string | null;
  cIsCancel?: string | null;
  cType?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
  cRemark?: string | null;
}
export interface DtoInsertLogs {
  cLineCode?: string | null;
  cType?: string | null;
  thr3000s?: Thr3000[] | null;
  thr3010s?: Thr3010[] | null;
  cShift?: string | null;
  cGroup?: string | null;
  cDeviceCode?: string | null;
  cRemark?: string | null;
}
export interface DtoMoveThr3000 {
  cLineCode?: string | null;
  cZpId?: string | null;
  up?: boolean;
  dCreateTimeRange?: TimeRange;
}
export interface DtoP48J03 {
  cCustName?: string | null;
  cInboundNo?: string | null;
  cFlawDesc?: string | null;
  cDelivyStatusCode?: string | null;
  cDelivyAddress?: string | null;
  cProdCode?: string | null;
  cWgtToler?: string | null;
  stoveNo?: string | null;
  slabNo?: string | null;
  plateNo?: string | null;
  batchNo?: string | null;
  planNo?: string | null;
  orderPlateId?: string | null;
  orderNo?: string | null;
  saleOrderNo?: string | null;
  customerCd?: string | null;
  productTypeCd?: string | null;
  stlGrd?: string | null;
  sgStd?: string | null;
  cutEdgeFl?: string | null;
  orderThick?: number;
  orderWidth?: number;
  orderLenType?: string | null;
  orderLenMax?: number;
  orderLenMin?: number;
  orderLen?: number;
  productOrdLth?: number;
  thkTolerMin?: number;
  thkTolerMax?: number;
  thkAdd?: number;
  wthTolerMin?: number;
  wthTolerMax?: number;
  lthTolerMin?: number;
  lthTolerMax?: number;
  productWeight?: number;
  wgtLoterMin?: number;
  wgtLoterMax?: number;
  inPlateNo?: string | null;
  tPlateNo?: string | null;
  bestSurface?: string | null;
  dsTemp?: number;
  operatorId?: string | null;
  slCode?: string | null;
  dsTime?: string | null;
  tPlateThk?: number;
  tPlateWth?: number;
  tPlateLth?: number;
  tPlateWgt?: number;
  tOrdNum?: number;
  tPartMark?: string | null;
  tProductSum?: number;
  tTdsLth?: number;
  tBdsLth?: number;
  tLthMark?: string | null;
  bPlateNo?: string | null;
  bPlateThk?: number;
  bPlateWth?: number;
  bPlateLth?: number;
  bPlateWgt?: number;
  bOrdNum?: number;
  bPartMark?: string | null;
  bProductSum?: number;
  bLthMark?: string | null;
  reserved0?: string | null;
  reserved1?: string | null;
  reserved2?: string | null;
  reserved3?: string | null;
  cropCutLenTop?: number;
  cropCutLenBottom?: number;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  actMaxWth?: number;
  actMinWth?: number;
  actAveWth?: number;
  dPrint?: string | null;
}
export interface DtoQueryL2 {
  dRange?: TimeRange;
  cBatchNo?: string | null;
  cBatchOrder?: string | null;
  planNo?: string | null;
  cOrderNo?: string | null;
  slabNo?: string | null;
  matNo?: string | null;
  cPrintCode?: string | null;
  rollNo?: string | null;
  tableNo?: string | null;
  furNo?: number | null;
  inPlateNo?: string | null;
  plateNo?: string | null;
  cpId?: string | null;
  cBc?: boolean;
  /** 加热炉状态 Thr3010FurStatusEnum */
  nFurStatus?: number | null;
  /** 拒收实绩位置 */
  zone?: string | null;
}
export interface DtoQueryLog {
  cLineCode?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  dCreateTimeRange?: TimeRange;
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
  cStoreCodes?: string[] | null;
  nProType?: number | null;
}
export interface DtoQueryTdm1000 {
  cBearNo?: string | null;
  cBearBoxNo?: string | null;
  nStatus?: Tdm1000StatusEnum | null;
  nBearType?: BearType | null;
  nBearBoxType?: BearBoxType | null;
  nAssemblyFlag?: Tdm1010AssemblyFlag | null;
}
export interface DtoQueryTdm1020 {
  cRollerNo?: string | null;
  cStandNo?: string | null;
  nRollerType?: string | null;
  nStatus?: Tdm1020StatusEnum | null;
}
export interface DtoQueryTdm1030 {
  cRollerNo?: string | null;
  nRollerType?: string | null;
  timeRange?: TimeRange;
}
export interface DtoQueryThr2000 {
  cLineCode?: string | null;
  dTimeRange?: TimeRange;
  dStart?: string | null;
  dEnd?: string | null;
  cOrderNo?: string | null;
  cOrderNos?: string[] | null;
  cSgCode?: string | null;
  nStatus?: number;
  cSpec?: string | null;
  cSgCodeTl?: string | null;
  cSpecTl?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nThickTl?: number | null;
  nWidthTl?: number | null;
  nLenTl?: number | null;
  nThickRange?: DecimalRange;
  nWthRange?: DecimalRange;
  nLenRange?: DecimalRange;
  cPieceNo?: string | null;
}
export interface DtoQueryThr3000 {
  /** 钢种范围（HR9071/HR9300 过滤） */ cSgCodes?: string[] | null;
  cId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cOrderNos?: string[] | null;
  cBatchNo?: string | null;
  cBatchNos?: string[] | null;
  cStove?: string | null;
  slabNo?: string | null;
  plateNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nStatus?: Thr3000StatusEnum | null;
  dBatchB?: string | null;
  dBatchE?: string | null;
  dStartB?: string | null;
  dStartE?: string | null;
  date?: string | null;
  dCreateTimeRange?: TimeRange;
  cFurCode?: string | null;
  nFurStatus?: Thr3010FurStatusEnum | null;
  cRollCode?: string | null;
  nRollStatus?: Thr3010RollStatusEnum | null;
  nHlStatus?: number | null;
  nJqStatus?: Thr3010JqStatusEnum | null;
  listFurStatus?: Thr3010FurStatusEnum[] | null;
}
export interface DtoSaveZp {
  cLineCode?: string | null;
  cBatchNo?: string | null;
  cStoreCode?: string | null;
  cDevice?: string | null;
  bcp?: boolean;
  nBcpThick?: number;
  nBcpWidth?: number;
  nBcpQd?: number;
  nFurType?: number;
  nHlType?: number;
  nHeatType?: number;
  qz?: boolean;
  isSp?: boolean;
  cReason?: string | null;
  cRemark?: string | null;
  cClReason?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
  cPlanId?: string | null;
  slabIds?: string[] | null;
  cFurCode?: string | null;
  nWgt?: number;
  nQua?: number;
}
export interface DtoTdaZb037Query {
  timeRange?: TimeRange;
  shiftNum?: string | null;
  teamGroup?: string | null;
}
export interface DtoTdm1020InstallRoller {
  rollerNo?: string | null;
  workBearNo?: string | null;
  tranBearNo?: string | null;
}
export interface DtoThr3010 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cZpId?: string | null;
  cSlabId?: string | null;
  nL2Status?: Thr3010StatusEnum;
  cPos?: string | null;
  cLineCode?: string | null;
  nOrder?: number | null;
  nFurStatus?: Thr3010FurStatusEnum;
  cFurCode?: string | null;
  cRowNo?: string | null;
  nRollStatus?: Thr3010RollStatusEnum;
  cRollCode?: string | null;
  cFinishEmp?: string | null;
  dRoll?: string | null;
  cRollShift?: string | null;
  cRollGroup?: string | null;
  nJqStatus?: Thr3010JqStatusEnum;
  cJqCode?: string | null;
  nStatus?: Thr3000StatusEnum;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cPlateNo?: string | null;
  cPieceNo?: string | null;
  cPrintCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nQua?: number | null;
  nWgt?: number | null;
  cSgCodePlan?: string | null;
  cSgStdPlan?: string | null;
  cSpecPlan?: string | null;
  nThickPlan?: number | null;
  nWidthPlan?: number | null;
  nLenPlan?: number | null;
  nQuaPlan?: number;
  nWgtPlan?: number;
  nWgtOrder?: number;
  nRateLl?: number;
  nRateSj?: number;
  nFurType?: Thr3000FurTypeEnum;
  nWidthWgt?: number | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  cIsGcd?: string | null;
  cOrderNo1?: string | null;
  cOrderNo2?: string | null;
  cOrderNo3?: string | null;
  cOrderNo4?: string | null;
  cInboundNo1?: string | null;
  cInboundNo2?: string | null;
  cInboundNo3?: string | null;
  cInboundNo4?: string | null;
  nLenTq1?: number | null;
  nLenTq2?: number | null;
  nLenTq3?: number | null;
  nLenTq4?: number | null;
  nWgtCz?: number | null;
  nBc?: number | null;
  cDn?: string | null;
  cSpecialMarkGy?: string | null;
  cBilletTypeCode?: string | null;
  cProRemark?: string | null;
  nOrderPlan?: number | null;
  cBatchOrder?: string | null;
  dRl?: string | null;
}
export interface DtoThr4000 {
  cLineCode?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  cTrimFlag?: string | null;
  cInboundNo?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cProdCode?: string | null;
  createTime?: string | null;
  cType?: string | null;
}
export interface DtoTi1000Query {
  timeRange?: TimeRange;
  rejectZone?: string | null;
  slabNo?: string | null;
  planNo?: string | null;
}
export interface DtoTi1010Query {
  timeRange?: TimeRange;
  cSaleCon?: string | null;
  cCustName?: string | null;
  cZpNo?: string | null;
  cSlabNo?: string | null;
  cCardNo?: string | null;
  cPlanNo?: string | null;
  cShiftNo?: number | null;
  cShiftGroup?: string | null;
  nOrderThick?: DecimalRange;
  nOrderWidth?: DecimalRange;
}
export interface DtoTi1020Query {
  timeRange?: TimeRange;
  cSaleCon?: string | null;
  cZpNo?: string | null;
  cSlabNo?: string | null;
  cPlanNo?: string | null;
  cCardNo?: string | null;
  cShiftGroup?: string | null;
  nLowSteel?: number | null;
  cTorqueBeyond?: number | null;
  nOrderThick?: DecimalRange;
  nOrderWidth?: DecimalRange;
}
export interface DtoTi1030Query {
  timeRange?: TimeRange;
  cSlabNo?: string | null;
  cZpNo?: string | null;
  cCardNo?: string | null;
  cTrimFlag?: string | null;
  cCrewCode?: CCrewCode | null;
}
export interface DtoTi1040Query {
  timeRange?: TimeRange;
  cCrewCode?: CCrewCode | null;
  cSonNo?: string | null;
}
export interface DtoTi1050Query {
  timeRange?: TimeRange;
  cSlabNo?: string | null;
  cZpNo?: string | null;
  cCardNo?: string | null;
  cTrimFlag?: string | null;
  cCrewCode?: CCrewCode | null;
  cSaleCon?: string | null;
  nOrderThick?: DecimalRange;
  nOrderWidth?: DecimalRange;
}
export interface DtoTi1060Query {
  plateNo?: string | null;
  cBatchNo?: string | null;
  timeRange?: TimeRange;
  cIfSickleBend?: string | null;
}
export interface DtoTi1070Query {
  timeRange?: TimeRange;
  slabNo?: string | null;
  cZpNo?: string | null;
  cCardNo?: string | null;
}
export interface DtoTi1080Query {
  timeRange?: TimeRange;
  slabNo?: string | null;
  cZpNo?: string | null;
  cCardNo?: string | null;
}
export interface DtoTi1210Query {
  timeRange?: TimeRange;
  cShiftGroup?: string | null;
  cOutSteelAuthorName?: string | null;
  cFmAuthorA?: string | null;
  cFmAuthorB?: string | null;
  cRmAuthorA?: string | null;
  cRmAuthorB?: string | null;
}
export interface DtoZgWork {
  cLineCode?: string | null;
  cFurCode?: string | null;
  cRollCode?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
  me02?: TiL2me02 | null;
  cMxIds?: string[] | null;
  cReason?: string | null;
  nFurStatus?: Thr3010FurStatusEnum;
}
export interface FhwdItemDto {
  pos?: number;
  value1?: number | null;
  value2?: number | null;
  value3?: number | null;
  value4?: number | null;
}
export interface HlDto {
  cStack?: string | null;
  nWd?: number;
  cIds?: string[] | null;
  cShift?: string | null;
  cGroup?: string | null;
  dOpe?: string;
}
export interface ImportHR2000Dto {
  cTlOrderNo?: string | null;
  nOrder?: number | null;
  cOrderNo1?: string | null;
  cOrderNo2?: string | null;
  cOrderNo3?: string | null;
  cOrderNo4?: string | null;
  nbc?: number | null;
}
export interface PlanCcDto {
  cLineCode?: string | null;
  cSlabNo?: string | null;
  cPlateSlab?: string | null;
  cPlateNo?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSpec?: string | null;
  nThickPlan?: number;
  nWidthPlan?: number | null;
  nLenPlan?: number | null;
  nThick?: number;
  nWidth?: number;
  nLen?: number;
  cTrimFlag?: string | null;
  cInboundNo?: string | null;
  cPrint?: string | null;
  cSlCode?: string | null;
  dProTime?: string;
  cProUser?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
}
export interface Query3030Dto {
  cMxId?: string | null;
  c3040Id?: string | null;
  cChange?: string | null;
}
export interface QueryPrintInputDto {
  cLineCode?: string | null;
  cSlCode?: string | null;
  startTime?: string;
}
export interface QueryRollDetail {
  passNo?: number | null;
  device?: string | null;
  turnFlag?: string | null;
  spray?: number | null;
  thickIn?: number | null;
  thickOut?: number | null;
  yx?: number | null;
  yxl?: number | null;
  widthEx?: number | null;
  lengthEx?: number | null;
  tempCalEn?: number | null;
  entryTemp?: number | null;
  tempCal?: number | null;
  temp?: number | null;
  forceCal?: number | null;
  forceAct?: number | null;
  torqueCal?: number | null;
  torqueAct?: number | null;
  bendForceCal?: number | null;
  bendForceAct?: number | null;
  threadSpeed?: number | null;
  runSpeed?: number | null;
  outSpeed?: number | null;
  rollTimeStart?: string;
  rollTimeStop?: string;
  dw?: number;
}
export interface QueryThr1000Dto {
  cLineCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number | null;
}
export interface SaveJqDto {
  cMxId?: string | null;
  cId?: string | null;
  cDevice?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
  addedItems?: Thr3040[] | null;
  changedItems?: Thr3040[] | null;
  deletedItems?: Thr3040[] | null;
}
export interface TdaZb001 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  sendTime?: string | null;
  shiftNum?: string | null;
  teamGroup?: string | null;
  airConsumption?: number | null;
  externalWaterConsumption?: number | null;
  groundWaterConsumption?: number | null;
  o2Consumption?: number | null;
}
export interface TdaZb037 {
  selected?: boolean;
  id?: string | null;
  sendTime?: string | null;
  water1ac?: number | null;
  water2ac?: number | null;
  water3ac?: number | null;
  water4ac?: number | null;
  water5ac?: number | null;
  water6ac?: number | null;
  shiftNum?: string | null;
  teamGroup?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
}
export interface TdaZb232 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  sendTime?: string | null;
  shiftNum?: string | null;
  teamGroup?: string | null;
  ec10201?: number | null;
}
export interface Tdm1000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cBearNo?: string | null;
  cBearBoxNo?: string | null;
  nStatus?: Tdm1000StatusEnum;
  cAssembler?: string | null;
  dAssemblyTime?: string | null;
  nBearType?: BearType;
  cFactory?: string | null;
  cRemark?: string | null;
  nOnMachineNum?: number | null;
  nRunTime?: number | null;
  nRollWgt?: number | null;
  nRollLen?: number | null;
  nAllRunTime?: number | null;
  nAllRollWgt?: number | null;
  nAllRollLen?: number | null;
}
export interface Tdm1010 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cBearNo?: string | null;
  cFourBearNo?: string | null;
  cTwoBearNo?: string | null;
  cConeBearNo?: string | null;
  cBushBearNo?: string | null;
  cAssembler?: string | null;
  dAssemblyTime?: string | null;
  nStatus?: Tdm1000StatusEnum;
  nBearSeatType?: BearBoxType;
  cFactory?: string | null;
  nOnMachineNum?: number | null;
  cRemark?: string | null;
  nRunTime?: number | null;
  nRollWgt?: number | null;
  nRollLen?: number | null;
  nAllRunTime?: number | null;
  nAllRollWgt?: number | null;
  nAllRollLen?: number | null;
  nAssemblyFlag?: Tdm1010AssemblyFlag;
  cBearId?: string | null;
  cRollerId?: string | null;
}
export interface Tdm1020 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nStatus?: Tdm1020StatusEnum;
  cRollerNo?: string | null;
  cStandNo?: string | null;
  cRollerType?: string | null;
  cAssemPosition?: string | null;
  cRollerMaterial?: string | null;
  nRollerPath?: number | null;
  nRollerCrown?: number | null;
  cRollerRollType?: string | null;
  cOperateBear?: string | null;
  cTranBear?: string | null;
  nRollNum?: number | null;
  nRollLen?: number | null;
  nRollTime?: number | null;
  nRollWgt?: number | null;
  nAllNum?: number | null;
  nAllLen?: number | null;
  nAllTime?: number | null;
  nAllWgt?: number | null;
  dPlanTime?: string | null;
  dDownTime?: string | null;
}
export interface Tdm1030 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cRollerNo?: string | null;
  nRollerType?: string | null;
  nFrontHeadPath?: number | null;
  nFrontCenterPath?: number | null;
  nFrontTailPath?: number | null;
  nLastHeadPath?: number | null;
  nLastCenterPath?: number | null;
  nLastTailPath?: number | null;
  nGrindNum?: number | null;
  nHeadRoundness?: number | null;
  nCenterRoundness?: number | null;
  nTailRoundness?: number | null;
  nRollerTol?: number | null;
  nCenterHeight?: number | null;
  dGrindStartTime?: string | null;
  dGrindEndTime?: string | null;
  nGrindNo?: string | null;
  cOperator?: string | null;
  nOrderNum?: number | null;
}
export interface Tdm1030SaveChangesData {
  addedItems?: Tdm1030[] | null;
  changedItems?: Tdm1030[] | null;
  deletedItems?: Tdm1030[] | null;
}
export interface Tdm1040 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cRollerNo?: string | null;
  cStandNo?: string | null;
  nRollerType?: string | null;
  dUpTime?: string | null;
  dDownTime?: string | null;
  nAllRollTime?: number | null;
  nRollLen?: number | null;
  nRollWgt?: number | null;
  nAllRollRow?: number | null;
  nRollNum?: number | null;
  cStartPlateNo?: string | null;
  cEndPlateNo?: string | null;
  cReason?: string | null;
  nOrderNum?: number | null;
}
export interface Tdm1040SaveChangesData {
  addedItems?: Tdm1040[] | null;
  changedItems?: Tdm1040[] | null;
  deletedItems?: Tdm1040[] | null;
}
export interface Thr1000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cLineCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWgt?: number | null;
}
export interface Thr1000SaveChangesData {
  addedItems?: Thr1000[] | null;
  changedItems?: Thr1000[] | null;
  deletedItems?: Thr1000[] | null;
}
export interface Thr2000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cConNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  cLengthType?: string | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  nPlanedWgt?: number | null;
  nPlanZpWgt?: number | null;
  nSyWgt?: number | null;
  nZpWgt?: number | null;
  nFurWgt?: number | null;
  nRollWgt?: number | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  dJhqTime?: string | null;
  cConRemark?: string | null;
  cDesignNo?: string | null;
  cMsc?: string | null;
  cMscLineNo?: string | null;
  nStatus?: number | null;
  cCloseEmp?: string | null;
  dClose?: string | null;
  cRemark?: string | null;
  nOrder?: number | null;
  cSourceTl?: string | null;
  cSgCodeTl?: string | null;
  cSgStdTl?: string | null;
  nThickTl?: number | null;
  nWidthTl?: number | null;
  nLenMinTl?: number | null;
  nLenMaxTl?: number | null;
  nQuaTl?: number | null;
  nWgtMeterTl?: number | null;
  nWgtUnitTl?: number | null;
  nWgtTl?: number | null;
  nWidthWgt?: number | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  nWgtOrder?: number;
  cIsMerge?: string | null;
  nThickTolMin?: number | null;
  nThickTolMax?: number | null;
  nWidthTolMin?: number | null;
  nWidthTolMax?: number | null;
  nLenTolMin?: number | null;
  nLenTolMax?: number | null;
  nLlCleanLen?: number | null;
  nBoarCleanLen?: number | null;
  nPlanBoarLen?: number | null;
}
export interface Thr2000Dto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cOrderNo1?: string | null;
  cOrderNo2?: string | null;
  cOrderNo3?: string | null;
  cOrderNo4?: string | null;
  nLenTq1?: number | null;
  nLenTq2?: number | null;
  nLenTq3?: number | null;
  nLenTq4?: number | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number;
  nWidth?: number | null;
  nLen?: number | null;
  cLengthType?: string | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  nPlanedWgt?: number | null;
  nPlanZpWgt?: number | null;
  nZpWgt?: number | null;
  nZpSyWgt?: number | null;
  nFurWgt?: number | null;
  nRollWgt?: number | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  dJhqTime?: string | null;
  cConRemark?: string | null;
  cDesignNo?: string | null;
  cMsc?: string | null;
  cMscLineNo?: string | null;
  nStatus?: number | null;
  cCloseEmp?: string | null;
  dClose?: string | null;
  cRemark?: string | null;
  nOrder?: number | null;
  cSourceTl?: string | null;
  cSgCodeTl?: string | null;
  cSgStdTl?: string | null;
  nThickTl?: number | null;
  nWidthTl?: number | null;
  nLenMinTl?: number | null;
  nLenMaxTl?: number | null;
  nQuaTl?: number | null;
  nWgtMeterTl?: number | null;
  nWgtUnitTl?: number | null;
  nWgtTl?: number | null;
  nWidthWgt?: number | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  cIsMerge?: string | null;
  cPlanTime?: string | null;
  cCool?: string | null;
  cIsGcd?: string | null;
  nBc?: number | null;
  nQuaZp?: number | null;
  nWgtZp?: number | null;
  cPieceNos?: string | null;
  cNeedDl?: string | null;
  cPlanPieceNos?: string | null;
  dStart?: string | null;
  dEnd?: string | null;
  nQuaPlan?: number | null;
  nQuaFinish?: number | null;
  nWgtFinish?: number | null;
  nQuaFur?: number | null;
  nWgtFur?: number | null;
  nQuaRoll?: number | null;
  nWgtRoll?: number | null;
}
export interface Thr3000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cConNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  cLengthType?: string | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  nQua?: number;
  nWgt?: number;
  nWgtOrder?: number;
  nRateLl?: number;
  nRateSj?: number;
  nFurType?: Thr3000FurTypeEnum;
  cRemark?: string | null;
  nStatus?: Thr3000StatusEnum;
  cSampleLotNo?: string | null;
  cDesignNo?: string | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  nWidthWgt?: number | null;
  cConfirmStatus?: string | null;
  cConfirmEmp?: string | null;
  dConfirm?: string | null;
  cConfirmShift?: string | null;
  cConfirmGroup?: string | null;
  cCustCode?: string | null;
  cCustName?: string | null;
  dDeliveryDate?: string | null;
  dOrdDate?: string | null;
  cSpecReqText?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cOrderCustCname?: string | null;
  cConsigneeCustCname?: string | null;
  cIsMerge?: string | null;
  nThickTolMin?: number | null;
  nThickTolMax?: number | null;
  nWidthTolMin?: number | null;
  nWidthTolMax?: number | null;
  nLenTolMin?: number | null;
  nLenTolMax?: number | null;
}
export interface Thr3000Dto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cOrderNo1?: string | null;
  cOrderNo2?: string | null;
  cOrderNo3?: string | null;
  cOrderNo4?: string | null;
  nLenTq1?: number | null;
  nLenTq2?: number | null;
  nLenTq3?: number | null;
  nLenTq4?: number | null;
  cConNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nQua?: number;
  nWgt?: number;
  nWgtOrder?: number;
  nRateLl?: number;
  nRateSj?: number;
  nFurType?: Thr3000FurTypeEnum;
  cRemark?: string | null;
  nStatus?: Thr3000StatusEnum;
  cSampleLotNo?: string | null;
  cDesignNo?: string | null;
  cTrimFlag?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cTol?: string | null;
  cOverstepBl?: string | null;
  cInboundNo?: string | null;
  cShape?: string | null;
  nWidthWgt?: number | null;
  cConfirmStatus?: string | null;
  cConfirmEmp?: string | null;
  dConfirm?: string | null;
  cConfirmShift?: string | null;
  cConfirmGroup?: string | null;
  cCustCode?: string | null;
  cCustName?: string | null;
  dDeliveryDate?: string | null;
  dOrdDate?: string | null;
  cSpecReqText?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cOrderCustCname?: string | null;
  cConsigneeCustCname?: string | null;
  cIsMerge?: string | null;
  nBc?: number | null;
}
export interface Thr3010 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cZpId?: string | null;
  cSlabId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cPlateNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number;
  nWidth?: number | null;
  nLen?: number | null;
  nNum?: number | null;
  nWgt?: number | null;
  nOrder?: number | null;
  nFurStatus?: Thr3010FurStatusEnum;
  cFurCode?: string | null;
  nRollStatus?: Thr3010RollStatusEnum;
  cRollCode?: string | null;
  cFinishEmp?: string | null;
  dRoll?: string | null;
  cRollShift?: string | null;
  cRollGroup?: string | null;
  nJqStatus?: Thr3010JqStatusEnum;
  cJqCode?: string | null;
  nStatus?: Thr3010StatusEnum;
  cRemark?: string | null;
  cRowNo?: string | null;
  cPrintCode?: string | null;
  cPos?: string | null;
  nWdRl?: number | null;
  cShiftRl?: string | null;
  cGroupRl?: string | null;
  dRl?: string | null;
  nWdCl?: number | null;
  cShiftCl?: string | null;
  cGroupCl?: string | null;
  dCl?: string | null;
  zh?: Thr3010Zh | null;
  sgd?: Thr3010Sgd | null;
  fur?: Thr3010Fur | null;
  roll?: Thr3010Roll | null;
  yc?: Thr3010Yc | null;
  yjz?: Thr3010Yjz | null;
  rjz?: Thr3010Yjz | null;
  ckl?: Thr3010Ckl | null;
}
export interface Thr3010Ckl {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  slabNo?: string | null;
  steelGrade?: string | null;
  thick?: number | null;
  width?: number | null;
  length?: number | null;
  coolMode?: number | null;
  startCoolTime?: string | null;
  finishCoolTime?: string | null;
  rollAveTemp?: number | null;
  rollMaxTemp?: number | null;
  rollMinTemp?: number | null;
  entryAveTemp?: number | null;
  entryMaxTemp?: number | null;
  entryMinTemp?: number | null;
  targetFinishTemp?: number | null;
  finishAveTemp?: number | null;
  finishMaxTemp?: number | null;
  finishMinTemp?: number | null;
  scanAveTemp?: number | null;
  scanMaxTemp?: number | null;
  scanMinTemp?: number | null;
  coolingRate?: number | null;
  fluxA?: number | null;
  fluxB?: number | null;
  actFluxA?: number | null;
  actFluxB?: number | null;
  ratioA?: number | null;
  ratioB?: number | null;
  actRatioA?: number | null;
  actRatioB?: number | null;
  speed?: number | null;
  actSpeed?: number | null;
  aspd?: number | null;
  actAspd?: number | null;
  num?: number | null;
  uppipeFlow1?: number | null;
  uppipeFlow2?: number | null;
  uppipeFlow3?: number | null;
  uppipeFlow4?: number | null;
  uppipeFlow5?: number | null;
  uppipeFlow6?: number | null;
  uppipeFlow7?: number | null;
  uppipeFlow8?: number | null;
  uppipeFlow9?: number | null;
  uppipeFlow10?: number | null;
  uppipeFlow11?: number | null;
  uppipeFlow12?: number | null;
  uppipeFlow13?: number | null;
  uppipeFlow14?: number | null;
  uppipeFlow15?: number | null;
  uppipeFlow16?: number | null;
  uppipeFlow17?: number | null;
  uppipeFlow18?: number | null;
  uppipeFlow19?: number | null;
  uppipeFlow20?: number | null;
  uppipeFlow21?: number | null;
  uppipeFlow22?: number | null;
  uppipeFlow23?: number | null;
  uppipeFlow24?: number | null;
  uppipeFlow25?: number | null;
  uppipeFlow26?: number | null;
  uppipeFlow27?: number | null;
  uppipeFlow28?: number | null;
  botpipeFlow1?: number | null;
  botpipeFlow2?: number | null;
  botpipeFlow3?: number | null;
  botpipeFlow4?: number | null;
  botpipeFlow5?: number | null;
  botpipeFlow6?: number | null;
  botpipeFlow7?: number | null;
  botpipeFlow8?: number | null;
  botpipeFlow9?: number | null;
  botpipeFlow10?: number | null;
  botpipeFlow11?: number | null;
  botpipeFlow12?: number | null;
  botpipeFlow13?: number | null;
  botpipeFlow14?: number | null;
  botpipeFlow15?: number | null;
  botpipeFlow16?: number | null;
  botpipeFlow17?: number | null;
  botpipeFlow18?: number | null;
  botpipeFlow19?: number | null;
  botpipeFlow20?: number | null;
  botpipeFlow21?: number | null;
  botpipeFlow22?: number | null;
  botpipeFlow23?: number | null;
  botpipeFlow24?: number | null;
  botpipeFlow25?: number | null;
  botpipeFlow26?: number | null;
  botpipeFlow27?: number | null;
  botpipeFlow28?: number | null;
  sideCavityFlow1?: number | null;
  sideCavityFlow2?: number | null;
  sideCavityFlow3?: number | null;
  sideCavityFlow4?: number | null;
  sideCavityFlow5?: number | null;
  sideCavityFlow6?: number | null;
  sideCavityFlow7?: number | null;
  sideCavityFlow8?: number | null;
  sideCavityFlow9?: number | null;
  sideCavityFlow10?: number | null;
  sideSpary?: string | null;
  midSpary?: string | null;
  htsis?: number | null;
  headUpLength?: number | null;
  headBotLength?: number | null;
  headUpCoef?: number | null;
  headBotCoef?: number | null;
  tailUpLength?: number | null;
  tailBotLength?: number | null;
  tailUpCoef?: number | null;
  tailBotCoef?: number | null;
  prh1?: number | null;
  prh2?: number | null;
  prh3?: number | null;
  prh4?: number | null;
  prh5?: number | null;
  prh6?: number | null;
  prh7?: number | null;
  prh8?: number | null;
  prh9?: number | null;
  prh10?: number | null;
  elpBcd1?: number | null;
  elpBcd2?: number | null;
  elpBcd3?: number | null;
  tempWater?: number | null;
  pressWater?: number | null;
  main?: Thr3010 | null;
}
export interface Thr3010Fur {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  nRowNo?: number | null;
  nLenZh?: number | null;
  nWgtZh?: number | null;
  slabFurTime?: string | null;
  slabFurBefTemp?: number | null;
  furNo?: string | null;
  furType?: string | null;
  inFurnaceShiftNo?: string | null;
  inFurnaceShiftGroup?: string | null;
  outFurnaceShiftNo?: string | null;
  outFurnaceShiftGroup?: string | null;
  tapSlabTempAve?: number | null;
  tapSlabTempSrfc?: number | null;
  tapSlabTempCt?: number | null;
  outTime?: string | null;
  outTempAvg?: number | null;
  inFurnaceTime?: number | null;
  preHtTempAve?: number | null;
  preHtHotAve?: number | null;
  preHtTempSrf?: number | null;
  preHtTempCt?: number | null;
  preHtAveTemp?: number | null;
  preHtFurPerd?: number | null;
  ht1SlabTempAve?: number | null;
  ht1SlabHotAve?: number | null;
  ht1SlabTempSrfc?: number | null;
  ht1SlabTempCt?: number | null;
  ht1AveTemp?: number | null;
  ht1InFurPerd?: number | null;
  ht2SlabTempAve?: number | null;
  ht2SlabHotAve?: number | null;
  ht2SlabTempSrfc?: number | null;
  ht2SlabTempCt?: number | null;
  ht2AveTemp?: number | null;
  ht2InFurPerd?: number | null;
  eqSlabTempAve?: number | null;
  eqSlabHotAve?: number | null;
  eqSlabTempSrfc?: number | null;
  eqSlabTempCt?: number | null;
  eqAveTemp?: number | null;
  eqInFurPerd?: number | null;
  main?: Thr3010 | null;
}
export interface Thr3010Hl {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cPieceNoSlab?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nNum?: number;
  nWgt?: number;
  nHlStatus?: Thr3010HlStatusEnum;
  cHlCode?: string | null;
  cHlStack?: string | null;
  cHlStackNum?: string | null;
  nWdIn?: number | null;
  nHlHour?: number | null;
  cHlShiftIn?: string | null;
  cHlGroupIn?: string | null;
  dHlIn?: string | null;
  cHlUserIn?: string | null;
  nWdOut?: number | null;
  cHlShiftOut?: string | null;
  cHlGroupOut?: string | null;
  dHlOut?: string | null;
  cHlUserOut?: string | null;
}
export interface Thr3010Roll {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  slabStatus?: string | null;
  standNo?: string | null;
  steelGrade?: string | null;
  productCode?: string | null;
  dischargeTime?: string | null;
  rollingTimeStart?: string | null;
  rollingTimeEnd?: string | null;
  crCode?: number | null;
  totalRollingTime?: number | null;
  rmPass?: number | null;
  fmPass?: number | null;
  rollingStatus?: string | null;
  exitThick?: number | null;
  exitWidth?: number | null;
  exitLength?: number | null;
  operateUserCode?: string | null;
  crownMark?: string | null;
  meaThickWs?: number | null;
  meaThickDs?: number | null;
  hsbExitTempAvg?: number | null;
  hsbExitTempMax?: number | null;
  rmEntTempCal?: number | null;
  rmEntTempAvg?: number | null;
  rmEntTempMin?: number | null;
  rmEntTempMax?: number | null;
  rmEntTempDev?: number | null;
  rmExitTempCal?: number | null;
  rmExitTempAvg?: number | null;
  rmExitTempMin?: number | null;
  rmExitTempMax?: number | null;
  rmExitTempDev?: number | null;
  rmEntThick?: number | null;
  fmEntTempCal?: number | null;
  fmEntTempAvg?: number | null;
  fmEntTempMin?: number | null;
  fmEntTempMax?: number | null;
  fmEntTempDev?: number | null;
  fmExitTempCal?: number | null;
  fmExitTempAvg?: number | null;
  fmExitTempMin?: number | null;
  fmExitTempMax?: number | null;
  fmExitTempDev?: number | null;
  fmEntThick?: number | null;
  firstConThick?: number | null;
  secondConThick?: number | null;
  firstContTemp?: number | null;
  secondConTemp?: number | null;
  thickHp?: number | null;
  broadbef?: number | null;
  broadaft?: number | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  productTime?: string | null;
  author?: string | null;
  slabWeight?: number | null;
  main?: Thr3010 | null;
  details?: Thr3010RollDetail[] | null;
}
export interface Thr3010RollDetail {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  cRollId?: string | null;
  passNo?: number | null;
  temp?: number | null;
  tempCal?: number | null;
  thickCal?: number | null;
  spray?: number | null;
  turnFlag?: string | null;
  forceCal?: number | null;
  forceAct?: number | null;
  torqueCal?: number | null;
  torqueAct?: number | null;
  bendForceCal?: number | null;
  bendForceAct?: number | null;
  threadSpeed?: number | null;
  runSpeed?: number | null;
  entryTemp?: number | null;
  outSpeed?: number | null;
  tempCalEn?: number | null;
  widthEn?: number | null;
  widthEx?: number | null;
  lengthEx?: number | null;
  rollTimeStart?: string | null;
  rollTimeStop?: string | null;
  falgN?: number | null;
  falgC?: string | null;
  main?: Thr3010Roll | null;
}
export interface Thr3010Sgd {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  plateNo?: string | null;
  slabNo?: string | null;
  tableNo?: string | null;
  main?: Thr3010 | null;
}
export interface Thr3010Yc {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  plateNo?: string | null;
  slabNo?: string | null;
  zone?: string | null;
  reason?: string | null;
  actPassNo?: number | null;
  actThick?: number | null;
  actWidth?: number | null;
  actLength?: number | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  productTime?: string | null;
  author?: string | null;
  slabWeight?: number | null;
  main?: Thr3010 | null;
}
export interface Thr3010Yjz {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  slabNo?: string | null;
  totalPass?: number | null;
  currPass?: number | null;
  entryTime?: string | null;
  endTime?: string | null;
  entryTemp?: number | null;
  levelerSpeed?: number | null;
  bitSpeed?: number | null;
  entryGap?: number | null;
  exitGap?: number | null;
  entrySideRollGap?: number | null;
  exitSideRollGap?: number | null;
  tilt1?: number | null;
  tilt2?: number | null;
  l2Force?: number | null;
  bendPosition?: number | null;
  torqueMotor?: number | null;
  emptyFlag?: number | null;
  spare?: number | null;
  main?: Thr3010 | null;
}
export interface Thr3010Zh {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cMxId?: string | null;
  slabNo?: string | null;
  spare1?: string | null;
  spare2?: number | null;
  main?: Thr3010 | null;
}
export interface Thr3020 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cLineCode?: string | null;
  cZpId?: string | null;
  cOrderNo?: string | null;
  cSpec?: string | null;
  nOrder?: number;
  nThick?: number;
  nWidth?: number | null;
  nLen?: number | null;
}
export interface Thr3030 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cZpId?: string | null;
  cMxId?: string | null;
  cLineCode?: string | null;
  cSlabNo?: string | null;
  cPlateSlab?: string | null;
  cPlateNo?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSpec?: string | null;
  nThick?: number;
  nWidth?: number | null;
  nLen?: number | null;
  c3040Id?: string | null;
  cId?: string | null;
}
export interface Thr3040 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cOrderId?: string | null;
  cZpId?: string | null;
  cMxId?: string | null;
  cLineCode?: string | null;
  cPieceNoSlab?: string | null;
  cPieceNo?: string | null;
  cPlateNo?: string | null;
  cSgCode?: string | null;
  nThick?: number;
  nWidth?: number | null;
  nLen?: number | null;
  nWgt?: number;
  nStatus?: number | null;
  cPid?: string | null;
  cChange?: string | null;
  dProTime?: string;
  cProUser?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  cDevice?: string | null;
  cBatchOrder?: string | null;
}
export interface Thr3040Dto {
  cLineCode?: string | null;
  cPieceNo?: string | null;
  cPlateNo?: string | null;
  cSgCode?: string | null;
  nThick?: number;
  nWidth?: number | null;
  nLen?: number | null;
  dProTime?: string;
  cProUser?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  cDevice?: string | null;
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
  /** 生产类型（原 NProTypeEnum，添加实绩默认产成品=20） */
  nProType?: NProTypeEnum;
}
export interface Thr4000Dto {
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
  printCount?: number;
  lastPrintTime?: string | null;
  lastPrintUser?: string | null;
  nOrder?: number | null;
}
export interface Thr4000Edit {
  id?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  nThick?: number;
  nWidth?: number;
  nLen?: number;
  cInboundNo?: string | null;
  /** 订单号 */
  cOrderNo?: string | null;
  /** 切边方式 */
  cTrimFlag?: string | null;
}
export interface Thr4000SaveChangesData {
  addedItems?: Thr4000[] | null;
  changedItems?: Thr4000[] | null;
  deletedItems?: Thr4000[] | null;
}
export interface ThrLog {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cLineCode?: string | null;
  cOrderId?: string | null;
  cZpId?: string | null;
  cMxId?: string | null;
  cSlabId?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nLen?: number | null;
  nQua?: number | null;
  nWgt?: number | null;
  cDeviceCode?: string | null;
  cGxId?: string | null;
  cIsCancel?: string | null;
  cType?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
  cRemark?: string | null;
  nThick?: number;
  nWidth?: number | null;
  cPlateNo?: string | null;
  nL2Status?: YesNo;
  cReadFlag?: string | null;
  dReadTime?: string | null;
  cL2Id?: string | null;
  cL2Code?: string | null;
}
export interface Ti1000Dto {
  selected?: boolean;
  tiL2me01Id?: string | null;
  slabId?: string | null;
  cZpId?: string | null;
  slabNo?: string | null;
  zpNo?: string | null;
  rejectType?: string | null;
  rejectPosition?: string | null;
  planNo?: string | null;
  cardNo?: string | null;
  rejectReason?: string | null;
  furCode?: string | null;
  shiftGroup?: string | null;
  shiftNo?: string | null;
  thick?: number;
  width?: number;
  len?: number;
  wgt?: number;
  orderThick?: number;
  orderWidth?: number;
  orderLen?: number;
  orderWgt?: number;
  createTime?: string;
  author?: string | null;
}
export interface Ti1000_1Dto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cpId?: string | null;
  passNo?: number | null;
  temp?: number | null;
  tempCal?: number | null;
  thickCal?: number | null;
  spray?: number | null;
  turnFlag?: string | null;
  forceCal?: number | null;
  forceAct?: number | null;
  torqueCal?: number | null;
  torqueAct?: number | null;
  bendForceCal?: number | null;
  bendForceAct?: number | null;
  threadSpeed?: number | null;
  runSpeed?: number | null;
  entryTemp?: number | null;
  outSpeed?: number | null;
  tempCalEn?: number | null;
  widthEn?: number | null;
  widthEx?: number | null;
  lengthEx?: number | null;
  rollTimeStart?: string | null;
  rollTimeStop?: string | null;
  falgN?: number | null;
  falgC?: string | null;
}
export interface Ti1010Dto {
  selected?: boolean;
  createTime?: string | null;
  cZpId?: string | null;
  cCustName?: string | null;
  cSaleCon?: string | null;
  cInboundNo?: string | null;
  cTqCon1?: string | null;
  nWidthTq1?: number | null;
  nLenTq1?: number | null;
  cStoreposNo1?: string | null;
  cTqCon2?: string | null;
  nWidthTq2?: number | null;
  nLenTq2?: number | null;
  cStoreposNo2?: string | null;
  cTqCon3?: string | null;
  nWidthTq3?: number | null;
  nLenTq3?: number | null;
  cStoreposNo3?: string | null;
  cTqCon4?: string | null;
  nWidthTq4?: number | null;
  nLenTq4?: number | null;
  cStoreposNo4?: string | null;
  cZpNo?: string | null;
  cSlabNo?: string | null;
  cCardNo?: string | null;
  cDelivyAddress?: string | null;
  cTrimFlag?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLen?: number | null;
  nPlanSlabWgt?: number | null;
  nSlabWgt?: number | null;
  nStoveWgt?: number | null;
  nOrderThick?: number | null;
  nOrderWidth?: number | null;
  cOrderWidth2?: string | null;
  nOrderLen?: number | null;
  cOrderLen2?: string | null;
  cTol?: string | null;
  nBc?: number;
  cPlanNo?: string | null;
  dProductTime?: string;
  dOutTime?: string;
  cAuthor?: string | null;
  cCrewCode?: string | null;
  dFurTime?: string;
  cFurCode?: string | null;
  cPassNo?: string | null;
  nFurTemp?: number | null;
  cFurShiftNo?: string | null;
  cFurShiftGroup?: string | null;
  nOutPlateAvgTemp?: number | null;
  nOutPlateCenterTemp?: number | null;
  nOutAvgTemp?: number | null;
  dInStoveTime?: number | null;
  dOutStoveTime?: string;
  cProdCode?: string | null;
  dYrSlabEvenHeatTemp?: number | null;
  dYrSlabAvgTemp?: number | null;
  dYrSlabCenterTemp?: number | null;
  dYrAvgTemp?: number | null;
  dYrInStoveTime?: number | null;
  dHeatRkSlabAvgTemp1?: number | null;
  dHeatSlabFaceTemp1?: number | null;
  dHeatSlabCenterTemp1?: number | null;
  dHeatSlabAvgTemp1?: number | null;
  dHeatInStoveTime1?: number | null;
  dHeatRkSlabAvgTemp2?: number | null;
  dHeatSlabCenterTemp2?: number | null;
  dHeatSlabFaceTemp2?: number | null;
  dHeatSlabAvgTemp2?: number | null;
  dHeatInStoveTime2?: number | null;
  dHeatAvgTemp?: number | null;
  dHeatInStoveTime?: number | null;
  dEvenHeatAvgTemp?: number | null;
  dEvenHeatCenterTemp?: number | null;
  dEvenHeatFaceTemp?: number | null;
}
export interface Ti1020Dto {
  selected?: boolean;
  tiL2me02Id?: string | null;
  cZpId?: string | null;
  cSlabId?: string | null;
  cCustName?: string | null;
  cSaleCon?: string | null;
  cCoolNo?: string | null;
  cTqCon1?: string | null;
  nWidthTq1?: number | null;
  nLenTq1?: number | null;
  cTqCon2?: string | null;
  nWidthTq2?: number | null;
  nLenTq2?: number | null;
  cTqCon3?: string | null;
  nWidthTq3?: number | null;
  nLenTq3?: number | null;
  cTqCon4?: string | null;
  nWidthTq4?: number | null;
  nLenTq4?: number | null;
  cZpNo?: string | null;
  cSlabNo?: string | null;
  cCardNo?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLen?: number | null;
  nSlabWgt?: number | null;
  nStoveWgt?: number | null;
  nPlanSlabWgt?: number | null;
  cTrimFlag?: string | null;
  cTol?: string | null;
  nCenterSlabThick?: number | null;
  nPlanSlabThick?: number | null;
  nRollThick?: number | null;
  nRollWidth?: number | null;
  nRollLen?: number | null;
  nRollWgt?: number | null;
  nOrderThick?: number | null;
  nOrderWidth?: number | null;
  nOrderLen?: number | null;
  nMeaThickWS?: number | null;
  nCenterThick?: number | null;
  nRealTranTHick?: number | null;
  cCrownMark?: string | null;
  dRollingTimeStart?: string;
  nRollingTimeEnd?: string;
  dProductTime?: string;
  nRollAllTime?: number | null;
  nRmPass?: number | null;
  nFmPass?: number | null;
  cPlanNo?: string | null;
  cRollPlateNo?: string | null;
  cCrewCode?: string | null;
  dRmEntTempCal?: number | null;
  dFmEntTempCal?: number | null;
  dFmPlanEntTempCal?: number | null;
  dEntRollEndTemp?: number | null;
  dPlanRollEndTemp?: number | null;
  cSpecialMarkGy?: string | null;
  cProdCode?: string | null;
  cRollCode?: string | null;
  cProductLineNo?: string | null;
  cLowSteel?: string | null;
  cTorqueBeyond?: string | null;
  cCollectType?: string | null;
  cShiftNo?: string | null;
  cShiftGroup?: string | null;
  cStraSlabNo?: string | null;
  dStraPlateTemp?: number | null;
  dStraLeanNum?: number | null;
  dStraInSeam?: number | null;
  dStraOutSeam?: number | null;
  dStraStrength?: number | null;
  dStraBendRollNum?: number | null;
  dStraTiltNum?: number | null;
  dStraInRollHeight?: number | null;
  dStraOutRollHeight?: number | null;
  dStraTorque?: number | null;
  dStraIntoRollSpeed?: number | null;
  dStraRollSpeed?: number | null;
  dStraRollCurrentNum?: number | null;
  dStraRollAllNum?: number | null;
  dStraIfPass?: string | null;
  dStraEndTime?: string;
  dStraIntoTime?: string;
  dHotStraSlabNo?: string | null;
  nHotStraPlateTemp?: number | null;
  nHotStraLeanNum?: number | null;
  nHotStraIntoSeam?: number | null;
  nHotStraOuttoSeam?: number | null;
  nHotStraStrength?: number | null;
  nHotStraBendNum?: number | null;
  nHotStraTiltNum?: number | null;
  nHotStraIntoHeight?: number | null;
  nHotStraOutHeight?: number | null;
  dHotStraTorque?: number | null;
  dHotStraRollCurrentNum?: number | null;
  dHotStraRollAllNum?: number | null;
  dHotStraIfPass?: string | null;
  dHotStraIntoRollSpeed?: number | null;
  dHotStraRollSpeed?: number | null;
  dHotStraIntoTime?: string;
  dHotStraEndTime?: string;
  cFastColdSlabNo?: string | null;
  cFastColdSgCode?: string | null;
  cFastColdThick?: number | null;
  cFastColdWidth?: number | null;
  cFastColdLen?: number | null;
  cFastColdWaterTemp?: number | null;
  cFastColdWaterPre?: number | null;
  cFastColdStartAvgTemp?: number | null;
  cFastColdStartMaxTemp?: number | null;
  cFastColdStartMinTemp?: number | null;
  cFastColdPlanRedTemp?: number | null;
  cFastColdRedAvgTemp?: number | null;
  cFastColdRedMaxTemp?: number | null;
  cFastColdRedMinTemp?: number | null;
  cFastColdSjSpeed?: number | null;
  cFastColdModel?: number | null;
  cFastColdStartGroupNum?: number | null;
  cFastColdSjTraA?: number | null;
  cFastColdSetTraA?: number | null;
  cFastColdSjTraB?: number | null;
  cFastColdSetTraB?: number | null;
  cFastColdSjComA?: number | null;
  cFastColdSetComA?: number | null;
  cFastColdSjComB?: number | null;
  cFastColdSetComB?: number | null;
  cFastColdSetRollSpeed?: number | null;
  cFastColdSjRollSpeed?: number | null;
  cFastColdSetAddSpeed?: number | null;
  cFastColdSjAddSpeed?: number | null;
  cFastColdCoverSignal?: number | null;
  cFastColdHeadUpCoef?: number | null;
  cFastColdHeadUpLen?: number | null;
  cFastColdHeadDownCoef?: number | null;
  cFastColdHeadDownLen?: number | null;
  cFastColdTailUpCoef?: number | null;
  cFastColdTailUpLen?: number | null;
  cFastColdTailDownCoef?: number | null;
  cFastColdTailDownLen?: number | null;
  cFastColdRollAvgTemp?: number | null;
  cFastColdRollMaxTemp?: number | null;
  cFastColdRollMinTemp?: number | null;
  cFastColdHighAvgTemp?: number | null;
  cFastColdHighMaxTemp?: number | null;
  cFastColdHighMinTemp?: number | null;
  cFastColdStartTime?: string;
  cFastColdEndTime?: string;
  cFastColdCenterSpray?: string | null;
  cFastColdUpTra1?: number | null;
  cFastColdUpTra2?: number | null;
  cFastColdUpTra3?: number | null;
  cFastColdUpTra4?: number | null;
  cFastColdUpTra5?: number | null;
  cFastColdUpTra6?: number | null;
  cFastColdUpTra7?: number | null;
  cFastColdUpTra8?: number | null;
  cFastColdUpTra9?: number | null;
  cFastColdUpTra10?: number | null;
  cFastColdUpTra11?: number | null;
  cFastColdUpTra12?: number | null;
  cFastColdUpTra13?: number | null;
  cFastColdUpTra14?: number | null;
  cFastColdUpTra15?: number | null;
  cFastColdUpTra16?: number | null;
  cFastColdUpTra17?: number | null;
  cFastColdUpTra18?: number | null;
  cFastColdUpTra19?: number | null;
  cFastColdUpTra20?: number | null;
  cFastColdUpTra21?: number | null;
  cFastColdUpTra22?: number | null;
  cFastColdUpTra23?: number | null;
  cFastColdUpTra24?: number | null;
  cFastColdUpTra25?: number | null;
  cFastColdUpTra26?: number | null;
  cFastColdUpTra27?: number | null;
  cFastColdUpTra28?: number | null;
  cFastColdDownTra1?: number | null;
  cFastColdDownTra2?: number | null;
  cFastColdDownTra3?: number | null;
  cFastColdDownTra4?: number | null;
  cFastColdDownTra5?: number | null;
  cFastColdDownTra6?: number | null;
  cFastColdDownTra7?: number | null;
  cFastColdDownTra8?: number | null;
  cFastColdDownTra9?: number | null;
  cFastColdDownTra10?: number | null;
  cFastColdDownTra11?: number | null;
  cFastColdDownTra12?: number | null;
  cFastColdDownTra13?: number | null;
  cFastColdDownTra14?: number | null;
  cFastColdDownTra15?: number | null;
  cFastColdDownTra16?: number | null;
  cFastColdDownTra17?: number | null;
  cFastColdDownTra18?: number | null;
  cFastColdDownTra19?: number | null;
  cFastColdDownTra20?: number | null;
  cFastColdDownTra21?: number | null;
  cFastColdDownTra22?: number | null;
  cFastColdDownTra23?: number | null;
  cFastColdDownTra24?: number | null;
  cFastColdDownTra25?: number | null;
  cFastColdDownTra26?: number | null;
  cFastColdDownTra27?: number | null;
  cFastColdDownTra28?: number | null;
  cFastColdDescFormBcd1?: number | null;
  cFastColdDescFormBcd2?: number | null;
  cFastColdDescFormBcd3?: number | null;
  cFastColdEdgeTra1?: number | null;
  cFastColdEdgeTra2?: number | null;
  cFastColdEdgeTra3?: number | null;
  cFastColdEdgeTra4?: number | null;
  cFastColdEdgeTra5?: number | null;
  cFastColdEdgeTra6?: number | null;
  cFastColdEdgeTra7?: number | null;
  cFastColdEdgeTra8?: number | null;
  cFastColdEdgeTra9?: number | null;
  cFastColdEdgeTra10?: number | null;
  cFastColdEdgeSpray?: string | null;
  cOutSteelAuthor?: string | null;
  cOutSteelAuthorName?: string | null;
  cFmAuthorA?: string | null;
  cFmAuthorNameA?: string | null;
  cFmAuthorB?: string | null;
  cFmAuthorNameB?: string | null;
  cRmAuthorA?: string | null;
  cRmAuthorNameA?: string | null;
  cRmAuthorB?: string | null;
  cRmAuthorNameB?: string | null;
}
export interface Ti1020_1Dto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cpId?: string | null;
  passNo?: number | null;
  temp?: number | null;
  tempCal?: number | null;
  thickCal?: number | null;
  spray?: number | null;
  turnFlag?: string | null;
  forceCal?: number | null;
  forceAct?: number | null;
  torqueCal?: number | null;
  torqueAct?: number | null;
  bendForceCal?: number | null;
  bendForceAct?: number | null;
  threadSpeed?: number | null;
  runSpeed?: number | null;
  entryTemp?: number | null;
  outSpeed?: number | null;
  tempCalEn?: number | null;
  widthEn?: number | null;
  widthEx?: number | null;
  lengthEx?: number | null;
  rollTimeStart?: string;
  rollTimeStop?: string;
  falgN?: number | null;
  falgC?: string | null;
}
export interface Ti1030Dto {
  selected?: boolean;
  cTiP48j03Id?: string | null;
  cSlabId?: string | null;
  cZpId?: string | null;
  cCustName?: string | null;
  cSaleCon?: string | null;
  cSonNo?: string | null;
  cSlabNo?: string | null;
  cZpNo?: string | null;
  cSgCode?: string | null;
  cTrimFlag?: string | null;
  dCenterThick?: number | null;
  dSonThick?: number | null;
  dSonWidth?: number | null;
  dSonLen?: number | null;
  dSonWgt?: number | null;
  dSmallWgt?: number | null;
  dPlanThick?: number | null;
  dPlanWidth?: number | null;
  dPlanLen?: number | null;
  dPlanWgt?: number | null;
  cCrewCode?: string | null;
  dDsTime?: string;
  cShiftGroup?: string | null;
  cShiftNo?: string | null;
  cInSlabNo?: string | null;
  cGlSonNo?: string | null;
  cBestSurface?: string | null;
  ctOrdNum?: number | null;
  ctPartMark?: string | null;
  ctProductSum?: number | null;
  cTdsLth?: number | null;
  cBdsLth?: number | null;
  ctLthMark?: string | null;
  cOperatorId?: string | null;
  cPosition?: string | null;
  cName?: string | null;
  dDsTemp?: number | null;
  creatTime?: string | null;
}
export interface Ti1040Dto {
  selected?: boolean;
  createTime?: string | null;
  cCustName?: string | null;
  cCon?: string | null;
  cSonNo?: string | null;
  cSgCode?: string | null;
  dSonThick?: number | null;
  dSonWidth?: number | null;
  dSonLen?: number | null;
  dSonWgt?: number | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLen?: number | null;
  nSlabWgt?: number | null;
  nLlWgt?: number | null;
  cCrewCode?: string | null;
  dDssTime?: string;
  dProductTime?: string;
  cTrimFlag?: string | null;
  cInSlabNo?: string | null;
  cInSlabWgt?: number | null;
  dDssTemp?: number | null;
  cCollectType?: string | null;
  cSlabNo?: string | null;
}
export interface Ti1050Dto {
  selected?: boolean;
  createTime?: string | null;
  cCustName?: string | null;
  cSaleCon?: string | null;
  cSonNo?: string | null;
  cSlabNo?: string | null;
  cZpNo?: string | null;
  cSgCode?: string | null;
  cTrimFlag?: string | null;
  dCenterThick?: number | null;
  dSonThick?: number | null;
  dSonWidth?: number | null;
  dSonLen?: number | null;
  dSonWgt?: number | null;
  dSmallWgt?: number | null;
  dPlanThick?: number | null;
  dPlanWidth?: number | null;
  dPlanLen?: number | null;
  dPlanWgt?: number | null;
  cCrewCode?: string | null;
  dPrintTime?: string;
  cShiftGroup?: string | null;
  cShiftNo?: string | null;
  cInSlabNo?: string | null;
  cGlSonNo?: string | null;
  cBestSurface?: string | null;
  ctOrdNum?: number | null;
  tPartMark?: string | null;
  tProductSum?: number | null;
  cTdsLth?: number | null;
  cBdsLth?: number | null;
  ctLthMark?: string | null;
  dRollingTimeStart?: string;
  nRollingTimeEnd?: string;
  cPosition?: string | null;
  cName?: string | null;
  nDsTemp?: number | null;
}
export interface Ti1060Dto {
  selected?: boolean;
  plateNo?: string | null;
  cBatchNo?: string | null;
  plateLen?: number | null;
  plateHead?: number | null;
  plateLast?: number | null;
  cYcCode?: string | null;
  nOpSickleBend?: number | null;
  nDrSickleBend?: number | null;
  cIfSickleBend?: string | null;
  nOpSicklePosition?: number | null;
  nDrSicklePosition?: number | null;
  dInsertTime?: string | null;
  cRmAuthorA?: string | null;
  cRmAuthorNameA?: string | null;
}
export interface Ti1070Dto {
  selected?: boolean;
  slabNo?: string | null;
  cSgCode?: string | null;
  cSonNo?: string | null;
  cZpNo?: string | null;
  dThick?: number | null;
  dPlanLen?: number | null;
  dSjLen?: number | null;
  dReAmount?: number | null;
  dReAmountT?: number | null;
  createTime?: string | null;
}
export interface Ti1080Dto {
  selected?: boolean;
  createTime?: string | null;
  slabNo?: string | null;
  cSgCode?: string | null;
  cSonNo?: string | null;
  cZpNo?: string | null;
  dThick?: number | null;
  dPlanLen?: number | null;
  dSjLen?: number | null;
  dReAmount?: number | null;
  dReAmountT?: number | null;
}
export interface Ti1090_InStoveDto {
  selected?: boolean;
  cZpNo?: string | null;
  cSlabNo?: string | null;
  cCardNo?: string | null;
  dFurTime?: string;
  cFurCode?: string | null;
  cPassNo?: string | null;
  nFurTemp?: number | null;
  cShiftNo?: string | null;
  cShiftGroup?: string | null;
}
export interface Ti1090_OutStoveDto {
  selected?: boolean;
  cZpNo?: string | null;
  cSlabNo?: string | null;
  cCardNo?: string | null;
  dFurTime?: string;
  nOutPlateCenterTemp?: number | null;
  dInStoveTime?: number | null;
}
export interface Ti1200Dto {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  time?: string;
  shift?: string | null;
  turn?: string | null;
  n2Consumption1?: number | null;
  gasConsumption1?: number | null;
  steamConsumption1?: number | null;
  n2Consumption2?: number | null;
  gasConsumption2?: number | null;
  steamConsumption2?: number | null;
}
export interface Ti1210Dto {
  selected?: boolean;
  cOutSteelAuthor?: string | null;
  cFmAuthorA?: string | null;
  cFmAuthorB?: string | null;
  cRmAuthorA?: string | null;
  cRmAuthorB?: string | null;
  cShiftNo?: string | null;
  cShiftGroup?: string | null;
  cZpNo?: string | null;
  cSlabNo?: string | null;
  nThickSj?: number | null;
  nOrderThick?: number | null;
  nOrderWidth?: number | null;
  nOrderLen?: number | null;
  nPlanThickMin?: number | null;
  nPlanThickMax?: number | null;
  hitRate?: string | null;
  tol?: number | null;
  tolSwitch?: number | null;
  tolType?: string | null;
  dRollEndTime?: string;
  dRollStartTime?: string;
  cOutSteelAuthorName?: string | null;
  cFmAuthorNameA?: string | null;
  cFmAuthorNameB?: string | null;
  cRmAuthorNameA?: string | null;
  cRmAuthorNameB?: string | null;
}
export interface Ti1211Dto {
  cShiftGroup?: string | null;
  nQua?: number;
  cOutSteelAuthor?: string | null;
  cFmAuthorA?: string | null;
  cFmAuthorB?: string | null;
  cRmAuthorA?: string | null;
  cRmAuthorB?: string | null;
  nOrderThickAvg?: number | null;
  nThickAvg?: number | null;
  nPlanThickMin?: number | null;
  nPlanThickMax?: number | null;
  hitRate?: number | null;
  superMax?: number | null;
  superMin?: number | null;
  dRollingTimeStart?: string;
  dRollingTimeEnd?: string;
}
export interface TiL2me01 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateNo?: string | null;
  slabNo?: string | null;
  zone?: string | null;
  reason?: string | null;
  actPassNo?: number | null;
  actThick?: number | null;
  actWidth?: number | null;
  actLength?: number | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  productTime?: string | null;
  author?: string | null;
  slabWeight?: number | null;
  dHandle?: string | null;
  nStatus?: number | null;
  discAuthor?: string | null;
  rmAuthorA?: string | null;
  rmAuthorB?: string | null;
  fmAuthorA?: string | null;
  fmAuthorB?: string | null;
}
export interface TiL2me02 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateNo?: string | null;
  slabNo?: string | null;
  planNo?: string | null;
  slabStatus?: string | null;
  standNo?: string | null;
  steelGrade?: string | null;
  productCode?: string | null;
  dischargeTime?: string | null;
  rollingTimeStart?: string | null;
  rollingTimeEnd?: string | null;
  crCode?: number | null;
  totalRollingTime?: number | null;
  rmPass?: number | null;
  fmPass?: number | null;
  rollingStatus?: string | null;
  exitThick?: number | null;
  exitWidth?: number | null;
  exitLength?: number | null;
  operateUserCode?: string | null;
  crownMark?: string | null;
  meaThickWs?: number | null;
  meaThickDs?: number | null;
  hsbExitTempAvg?: number | null;
  hsbExitTempMax?: number | null;
  rmEntTempCal?: number | null;
  rmEntTempAvg?: number | null;
  rmEntTempMin?: number | null;
  rmEntTempMax?: number | null;
  rmEntTempDev?: number | null;
  rmExitTempCal?: number | null;
  rmExitTempAvg?: number | null;
  rmExitTempMin?: number | null;
  rmExitTempMax?: number | null;
  rmExitTempDev?: number | null;
  rmEntThick?: number | null;
  fmEntTempCal?: number | null;
  fmEntTempAvg?: number | null;
  fmEntTempMin?: number | null;
  fmEntTempMax?: number | null;
  fmEntTempDev?: number | null;
  fmExitTempCal?: number | null;
  fmExitTempAvg?: number | null;
  fmExitTempMin?: number | null;
  fmExitTempMax?: number | null;
  fmExitTempDev?: number | null;
  fmEntThick?: number | null;
  firstConThick?: number | null;
  secondConThick?: number | null;
  firstContTemp?: number | null;
  secondConTemp?: number | null;
  thickHp?: number | null;
  broadbef?: number | null;
  broadaft?: number | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  productTime?: string | null;
  author?: string | null;
  slabWeight?: number | null;
  rmAuthorA?: string | null;
  rmAuthorB?: string | null;
  fmAuthorA?: string | null;
  fmAuthorB?: string | null;
  dHandle?: string | null;
  nStatus?: number | null;
}
export interface TiL2me021 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cpId?: string | null;
  passNo?: number | null;
  temp?: number | null;
  tempCal?: number | null;
  thickCal?: number | null;
  spray?: number | null;
  turnFlag?: string | null;
  forceCal?: number | null;
  forceAct?: number | null;
  torqueCal?: number | null;
  torqueAct?: number | null;
  bendForceCal?: number | null;
  bendForceAct?: number | null;
  threadSpeed?: number | null;
  runSpeed?: number | null;
  entryTemp?: number | null;
  outSpeed?: number | null;
  tempCalEn?: number | null;
  widthEn?: number | null;
  widthEx?: number | null;
  lengthEx?: number | null;
  rollTimeStart?: string | null;
  rollTimeStop?: string | null;
  falgN?: number | null;
  falgC?: string | null;
  cPid?: string | null;
}
export interface TiL2me03 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  rollNo?: string | null;
  standNo?: string | null;
  rollType?: string | null;
  rollAssemblyNo?: string | null;
  mountTime?: string | null;
  unmountTime?: string | null;
  rollingTime?: number | null;
  rollingLength?: number | null;
  rollingWeight?: number | null;
  rollingPass?: number | null;
  rollingCount?: number | null;
  startPlateNo?: string | null;
  endPlateNo?: string | null;
  reason?: string | null;
}
export interface TiL2me04 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateNo?: string | null;
  slabNo?: string | null;
  tableNo?: string | null;
  dHandle?: string | null;
  nStatus?: number | null;
}
export interface TiL2me05 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  slabNo?: string | null;
  spare1?: string | null;
  spare2?: number | null;
  dHandle?: string | null;
  nStatus?: number | null;
}
export interface TiL2me06 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  slabNo?: string | null;
  furNo?: number | null;
  rowNo?: number | null;
  spare1?: string | null;
  spare2?: number | null;
  spare3?: number | null;
  spare4?: number | null;
  spare5?: number | null;
  spare6?: number | null;
  dHandle?: string | null;
  nStatus?: number | null;
}
export interface TiL2me08 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  slabNo?: string | null;
  totalPass?: number | null;
  currPass?: number | null;
  entryTime?: string | null;
  endTime?: string | null;
  entryTemp?: number | null;
  levelerSpeed?: number | null;
  bitSpeed?: number | null;
  entryGap?: number | null;
  exitGap?: number | null;
  entrySideRollGap?: number | null;
  exitSideRollGap?: number | null;
  tilt1?: number | null;
  tilt2?: number | null;
  l2Force?: number | null;
  bendPosition?: number | null;
  torqueMotor?: number | null;
  emptyFlag?: number | null;
  spare?: number | null;
  dHandle?: string | null;
  nStatus?: number | null;
}
export interface TiL2me09 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  slabNo?: string | null;
  totalPass?: number | null;
  currPass?: number | null;
  entryTime?: string | null;
  endTime?: string | null;
  entryTemp?: number | null;
  levelerSpeed?: number | null;
  bitSpeed?: number | null;
  entryGap?: number | null;
  exitGap?: number | null;
  entrySideRollGap?: number | null;
  exitSideRollGap?: number | null;
  tilt1?: number | null;
  tilt2?: number | null;
  l2Force?: number | null;
  bendPosition?: number | null;
  torqueMotor?: number | null;
  emptyFlag?: number | null;
  spare?: number | null;
  dHandle?: string | null;
  nStatus?: number | null;
}
export interface TiL2me11 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  matNo?: string | null;
  planNo?: string | null;
  slabFurTime?: string | null;
  slabFurBefTemp?: number | null;
  furNo?: string | null;
  furType?: string | null;
  inFurnaceShiftNo?: string | null;
  inFurnaceShiftGroup?: string | null;
  outFurnaceShiftNo?: string | null;
  outFurnaceShiftGroup?: string | null;
  tapSlabTempAve?: number | null;
  tapSlabTempSrfc?: number | null;
  tapSlabTempCt?: number | null;
  outTime?: string | null;
  outTempAvg?: number | null;
  inFurnaceTime?: number | null;
  preHtTempAve?: number | null;
  preHtHotAve?: number | null;
  preHtTempSrf?: number | null;
  preHtTempCt?: number | null;
  preHtAveTemp?: number | null;
  preHtFurPerd?: number | null;
  ht1SlabTempAve?: number | null;
  ht1SlabHotAve?: number | null;
  ht1SlabTempSrfc?: number | null;
  ht1SlabTempCt?: number | null;
  ht1AveTemp?: number | null;
  ht1InFurPerd?: number | null;
  ht2SlabTempAve?: number | null;
  ht2SlabHotAve?: number | null;
  ht2SlabTempSrfc?: number | null;
  ht2SlabTempCt?: number | null;
  ht2AveTemp?: number | null;
  ht2InFurPerd?: number | null;
  eqSlabTempAve?: number | null;
  eqSlabHotAve?: number | null;
  eqSlabTempSrfc?: number | null;
  eqSlabTempCt?: number | null;
  eqAveTemp?: number | null;
  eqInFurPerd?: number | null;
  dHandle?: string | null;
  nStatus?: number | null;
}
export interface TiL2me12 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  time?: string | null;
  shift?: string | null;
  turn?: string | null;
  n2Flow1?: number | null;
  n2Pressure1?: number | null;
  n2Consumption1?: number | null;
  gasFlow1?: number | null;
  gasPressure1?: number | null;
  gasConsumption1?: number | null;
  steamFlow1?: number | null;
  steamPressure1?: number | null;
  steamConsumption1?: number | null;
  n2Flow2?: number | null;
  n2Pressure2?: number | null;
  n2Consumption2?: number | null;
  gasFlow2?: number | null;
  gasPressure2?: number | null;
  gasConsumption2?: number | null;
  steamFlow2?: number | null;
  steamPressure2?: number | null;
  steamConsumption2?: number | null;
  spare1?: number | null;
  spare2?: number | null;
  spare3?: number | null;
  spare4?: number | null;
  spare5?: number | null;
  spare6?: number | null;
  spare7?: number | null;
  spare8?: number | null;
  spare9?: number | null;
  spare10?: number | null;
  spare11?: number | null;
  spare12?: number | null;
  spare13?: number | null;
  spare14?: number | null;
  spare15?: number | null;
}
export interface TiL2me14 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  dHandle?: string | null;
  nStatus?: number | null;
  slabNo?: string | null;
  steelGrade?: string | null;
  thick?: number;
  width?: number;
  length?: number;
  coolMode?: number;
  startCoolTime?: string | null;
  finishCoolTime?: string | null;
  rollAveTemp?: number;
  rollMaxTemp?: number;
  rollMinTemp?: number;
  entryAveTemp?: number;
  entryMaxTemp?: number;
  entryMinTemp?: number;
  targetFinishTemp?: number;
  finishAveTemp?: number;
  finishMaxTemp?: number;
  finishMinTemp?: number;
  scanAveTemp?: number;
  scanMaxTemp?: number;
  scanMinTemp?: number;
  coolingRate?: number;
  fluxA?: number;
  fluxB?: number;
  actFluxA?: number;
  actFluxB?: number;
  ratioA?: number;
  ratioB?: number;
  actRatioA?: number;
  actRatioB?: number;
  speed?: number;
  actSpeed?: number;
  aspd?: number;
  actAspd?: number;
  num?: number;
  uppipeFlow?: string | null;
  botpipeFlow?: string | null;
  sideCavityFlow1?: string | null;
  sideSpary?: string | null;
  midSpary?: string | null;
  htsis?: number;
  headUpLength?: number;
  headBotLength?: number;
  headUpCoef?: number;
  headBotCoef?: number;
  tailUpLength?: number;
  tailBotLength?: number;
  tailUpCoef?: number;
  tailBotCoef?: number;
  prh?: string | null;
  elpbcd?: string | null;
  tempWater?: number;
  pressWater?: number;
  iSpare?: string | null;
  fSpare?: string | null;
  total_flow?: number;
  finishTemp?: string | null;
}
export interface TiL2me15 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  slabno?: string | null;
  ocrslabno?: string | null;
  l2slabno?: string | null;
  reason?: number | null;
  reviser?: string | null;
  time?: string | null;
  spare1?: string | null;
  spare2?: number | null;
}
export interface TiL2me16 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateno?: string | null;
  slabno?: string | null;
  planno?: string | null;
  wedge?: number | null;
  centerthickness?: string | null;
  width?: string | null;
  spare1?: string | null;
  spare2?: string | null;
}
export interface TiL2me17 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateno?: string | null;
  slabno?: string | null;
  planno?: string | null;
  osthickness?: string | null;
  dsthickness?: string | null;
  spare1?: string | null;
  spare2?: string | null;
}
export interface TiL2me18 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateid?: string | null;
  requirement?: number | null;
  nominalwidth?: number | null;
  nominallength?: number | null;
  nominalthickness?: number | null;
  nominaltemperature?: number | null;
  temperaturecompensationfactor?: number | null;
  requiredminimumwidth?: number | null;
  requiredminimumlength?: number | null;
  camberthreshold?: number | null;
  skiheadupthreshold?: number | null;
  skiheaddownthreshold?: number | null;
  skitailupthreshold?: number | null;
  skitaildownthreshold?: number | null;
  maxoutofflat?: number | null;
  waveheightthreshold?: number | null;
  crossbow?: number | null;
  state?: number | null;
  platerotationangle?: number | null;
  widthmax?: number | null;
  widthmaxpositionl?: number | null;
  widthmin?: number | null;
  widthminpositionl?: number | null;
  widthmaxhot?: number | null;
  widthmaxhotpositionl?: number | null;
  widthminhot?: number | null;
  widthminhotpositionl?: number | null;
  lengthmax?: number | null;
  lengthmaxpositionw?: number | null;
  lengthmin?: number | null;
  lengthminpositionw?: number | null;
  lengthmaxhot?: number | null;
  lengthminhot?: number | null;
  widthboundedrectangle?: number | null;
  lengthboundedrectangle?: number | null;
  widthboundedrectanglehot?: number | null;
  lengthboundedrectanglehot?: number | null;
  platefittingok?: number | null;
  platefittingwidthmargin?: number | null;
  platefittinglengthmargin?: number | null;
  platefittinglengthoptimized?: number | null;
  platefittingwidthoptimized?: number | null;
  platefittingareaoptimizedwidth?: number | null;
  platefittingareaoptimizedlength?: number | null;
  totalplatearea?: number | null;
  camberok?: number | null;
  cambermax?: number | null;
  cambermaxy?: number | null;
  cambermin?: number | null;
  camberminy?: number | null;
  camberleftok?: number | null;
  camberleftmax?: number | null;
  camberleftmaxy?: number | null;
  camberleftmin?: number | null;
  camberleftminy?: number | null;
  camberrightok?: number | null;
  camberrightmax?: number | null;
  camberrightmaxy?: number | null;
  camberrightmin?: number | null;
  camberrightminy?: number | null;
  skiok?: number | null;
  skiheadupok?: number | null;
  skiheadupmaxvalue?: number | null;
  skiheadupmaxpositionx?: number | null;
  skiheaddownok?: number | null;
  skiheaddownmaxvalue?: number | null;
  skiheaddownmaxpositionx?: number | null;
  skitailupok?: number | null;
  skitailupmaxvalue?: number | null;
  skitailupmaxpositionx?: number | null;
  skitaildownok?: number | null;
  skitaildownmaxvalue?: number | null;
  skitaildownmaxpositionx?: number | null;
  outofflatok?: number | null;
  outofflatmaxvalue?: number | null;
  outofflatmaxpositionx?: number | null;
  outofflatmaxpositiony?: number | null;
  waveheightok?: number | null;
  waveheightmax?: number | null;
  waveheightmaxpositionx?: number | null;
  waveheightmaxpositiony?: number | null;
  crossbowok?: number | null;
  crossbowmax?: number | null;
  crossbowmaxpositiony?: number | null;
  crossbowaverage?: number | null;
  crossbowstd?: number | null;
  iunitmax?: number | null;
  iunitmaxpositionx?: number | null;
  iunitmaxpositiony?: number | null;
  iunitaverage?: number | null;
  iunitstd?: number | null;
  spare1?: string | null;
  spare2?: string | null;
}
export interface TiL2me19 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateno?: string | null;
  slabno?: string | null;
  planno?: string | null;
  finishtemp?: string | null;
  spare1?: string | null;
  spare2?: string | null;
}
export interface TiP48j01 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  inPlateNo?: string | null;
  tPlateId?: string | null;
  bestSurface?: string | null;
  csTemp?: number | null;
  operatorId?: string | null;
  csTime?: string | null;
  tPlateThk?: number | null;
  tPlateWth?: number | null;
  tPlateLth?: number | null;
  tPlateWgt?: number | null;
  tOrdNum?: number | null;
  tPartMark?: string | null;
  tProductSum?: number | null;
  tTdsLth?: number | null;
  tBdsLth?: number | null;
  tLthMark?: string | null;
  bPlateId?: string | null;
  bPlateThk?: number | null;
  bPlateWth?: number | null;
  bPlateLth?: number | null;
  bPlateWgt?: number | null;
  bOrdNum?: number | null;
  bPartMark?: string | null;
  bProductSum?: number | null;
  bLthMark?: string | null;
  reserved1?: string | null;
  reserved2?: string | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
}
export interface TiP48j02 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  inPlateNo?: string | null;
  slCode?: string | null;
  dssTemp?: number | null;
  operatorId?: string | null;
  dssTime?: string | null;
  plateId?: string | null;
  plateThk?: number | null;
  plateWth?: number | null;
  plateLth?: number | null;
  plateWgt?: number | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  cutWth?: number;
  reserveD1?: string | null;
  reserveD2?: string | null;
}
export interface TiP48j031 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  inPlateNo?: string | null;
  tPlateNo?: string | null;
  bestSurface?: string | null;
  dsTemp?: number | null;
  operatorId?: string | null;
  slCode?: string | null;
  dsTime?: string | null;
  tPlateThk?: number | null;
  tPlateWth?: number | null;
  tPlateLth?: number | null;
  tPlateWgt?: number | null;
  tOrdNum?: number | null;
  tPartMark?: string | null;
  tProductSum?: number | null;
  tTdsLth?: number | null;
  tBdsLth?: number | null;
  tLthMark?: string | null;
  bPlateNo?: string | null;
  bPlateThk?: number | null;
  bPlateWth?: number | null;
  bPlateLth?: number | null;
  bPlateWgt?: number | null;
  bOrdNum?: number | null;
  bPartMark?: string | null;
  bProductSum?: number | null;
  bLthMark?: string | null;
  reserved0?: string | null;
  reserved1?: string | null;
  reserved2?: string | null;
  reserved3?: string | null;
  cropCutLenTop?: number | null;
  cropCutLenBottom?: number | null;
  shiftNo?: string | null;
  shiftGroup?: string | null;
  actMaxWth?: number | null;
  actMinWth?: number | null;
  actAveWth?: number | null;
  dHandle?: string | null;
  nStatus?: number | null;
}
export interface TiP48j04 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cBatchNo?: string | null;
  cPieceNo?: string | null;
  plateNo?: string | null;
  operatorId?: string | null;
  bestSurface?: string | null;
  sampleTime?: string | null;
  samplePos?: string | null;
  sampleLth?: number | null;
}
export interface TiP48j05 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateNo?: string | null;
  bestSurface?: string | null;
  checkEmp?: string | null;
  signEmp?: string | null;
  empId?: string | null;
  ustDt?: string | null;
  ustResult?: string | null;
}
export interface TiP48j06 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateNo?: string | null;
  posNo?: string | null;
}
export interface TiP48j07 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateNo?: string | null;
  posCode?: string | null;
  unloadRsn?: string | null;
  unloadPos?: string | null;
}
export interface TiP48j09 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  plateNo?: string | null;
  subId?: string | null;
  plateLen?: number | null;
  headCutLen?: number | null;
  tailCutLen?: number | null;
  errorCode?: string | null;
  opBend?: number | null;
  drBend?: number | null;
  opBendindex?: number | null;
  drBendindex?: number | null;
}
export interface TiRollgr {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  seqno?: number | null;
  rollno?: string | null;
  status?: number | null;
  starttime?: string | null;
  endtime?: string | null;
  rolltypedevi?: number | null;
  prehdiam?: number | null;
  premdiam?: number | null;
  pretdiam?: number | null;
  hroundness?: number | null;
  mroundness?: number | null;
  troundness?: number | null;
  afthdiam?: number | null;
  aftmdiam?: number | null;
  afttdiam?: number | null;
  midhigh?: number | null;
  specno?: string | null;
  userid?: string | null;
}
export interface TimeRange {
  min?: string | null;
  max?: string | null;
  timeSpan?: string;
  equalsMethod?: EqualsFlag;
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
export interface Tmp2020 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cLineCode?: string | null;
  cOrderId?: string | null;
  nStatus?: number | null;
  cOrderNo?: string | null;
  cTlOrderFlag?: string | null;
  cConNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nWgt?: number | null;
  nWgtSy?: number | null;
  nOrdWgt?: number | null;
  nSyWgt?: number | null;
  nPlanedWgt?: number | null;
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
  nWtMax?: number | null;
  nWtMin?: number | null;
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
  cSlabSize?: string | null;
  nSlabThick?: number | null;
  nSlabWidth?: number | null;
  nSlabLenMin?: number | null;
  nSlabLenMax?: number | null;
  nSlabQua?: number | null;
  nWgtMeter?: number | null;
  nWgtUnit?: number | null;
  nRate?: number | null;
  nSlabWgt?: number | null;
  cSlabRemark?: string | null;
  cCcmCode?: string | null;
  cStNo?: string | null;
  nOrder?: number;
  cIsMerge?: string | null;
  nThickTolMin?: number | null;
  nThickTolMax?: number | null;
  nWidthTolMin?: number | null;
  nWidthTolMax?: number | null;
  nLenTolMin?: number | null;
  nLenTolMax?: number | null;
  nLlCleanLen?: number | null;
  nBoarCleanLen?: number | null;
  nPlanBoarLen?: number | null;
}
export interface Tyd2000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  nProType?: NProTypeEnum;
  cPrintCode?: string | null;
  cLineCode?: string | null;
  cProc?: string | null;
  cMachine?: string | null;
  cPlanNo?: string | null;
  cConNo?: string | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number;
  nCalWgt?: number;
  nWgt?: number;
  dProTime?: string;
  cProUser?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dInTime?: string | null;
  cInUser?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSourceStoreCode?: string | null;
  cSourceStackNo?: string | null;
  cSourceStackNum?: string | null;
  nStatus?: InventoryStatusEnum;
  nBeforeStatus?: InventoryStatusEnum;
  cIsHot?: YesNo;
  cProRemark?: string | null;
  nCastDivCode?: CastDivEnum;
  cLockedLine?: string | null;
  cLockedPlan?: string | null;
  cMatType?: string | null;
  cProdCode?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cBatchNo?: string | null;
  cOrderNoLast?: string | null;
  cDestination?: string | null;
  cHotNo?: string | null;
  cSlabType?: string | null;
  cPieceNoSlab?: string | null;
  qm?: Tyd2000Qm | null;
  info?: Tyd2000Info | null;
  appendices?: Tyd2000Appendices[] | null;
}
export interface Tyd2000Appendices {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPieceNo?: string | null;
  cFieldCode?: string | null;
  cFiledValue?: string | null;
  main?: Tyd2000 | null;
}
export interface Tyd2000Info {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPieceNo?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cDelivyAddress?: string | null;
  cWgtToler?: string | null;
  cBilletTypeCode?: string | null;
  cCusName?: string | null;
  main?: Tyd2000 | null;
}
export interface Tyd2000Qm {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPieceNo?: string | null;
  nQmStatus?: QMStatuEnum;
  nLockReason?: string | null;
  nQmLevel?: QMLevelEnum;
  cIsSurface?: YesNo;
  cSurfaceResult?: SurFaceResultEnum;
  cSurfaceDefectCode?: string | null;
  cSurfaceDesc?: string | null;
  cSurfaceUser?: string | null;
  dSurfaceTime?: string | null;
  cDetectResultCode?: SurFaceResultEnum;
  cDetectDefectLevel?: string | null;
  cDefectDefectCode?: string | null;
  cDefectDefectMark?: string | null;
  cDefectUser?: string | null;
  dDefectTime?: string | null;
  cComplexDecideCode?: ComplexDecideResult;
  cComplexDesc?: string | null;
  cComplexUser?: string | null;
  dComplexTime?: string | null;
  cQmHandleCode?: QMCZ | null;
  cQmHandleDesc?: string | null;
  cQmHandleUser?: string | null;
  dQmHandleTime?: string | null;
  cSampleLotNo?: string | null;
  cSampleLotNoPre?: string | null;
  cQxDl?: string | null;
  cQxXl?: string | null;
  nSurfaceThick1?: number | null;
  nSurfaceThick2?: number | null;
  nSurfaceThick3?: number | null;
  nSurfaceLen?: number | null;
  cSurfaceDefectPosition?: string | null;
  nSurfaceWidth?: number | null;
  main?: Tyd2000 | null;
}
export interface ZzwdItemDto {
  pos?: number;
  value1?: number | null;
  value2?: number | null;
  value3?: number | null;
  value4?: number | null;
}

/* ---------- 请求 ---------- */




/** 修磨作业查询入参（原 DtoQueryThr3800SlabInfo，FrmHR3800） */
export interface DtoQueryThr3800SlabInfo {
  dProTime?: TimeRange;
  cPieceNo?: string | null;
  cPieceNoSlab?: string | null;
  cSgCode?: string | null;
  nResult?: number | null;
  cStoreCode?: string | null;
}
/** 修磨录入行（原 Thr3800Dto，FrmHR3800_Add） */
export interface Thr3800Dto {
  cStoreCode?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  nThick?: number;
  nWidth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nWgt?: number | null;
  cSurfaceDesc?: string | null;
  nResult?: number;
  cInboundNo?: string | null;
  cSurfaceRemark?: string | null;
  cTol?: string | null;
  cTrimFlag?: string | null;
}
/** 修磨日志（原 Thr3800，FrmHR3800 修磨日志表） */
export interface Thr3800 {
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPieceNo?: string | null;
  cInboundNo?: string | null;
  cSgCode?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nWgt?: number | null;
  cSurfaceDesc?: string | null;
  nResult?: number | null;
  cSurfaceRemark?: string | null;
  nThickBefore?: number | null;
  nWidthBefore?: number | null;
  nLenBefore?: number | null;
  cSpecBefore?: string | null;
  nWgtBefore?: number | null;
  cSgCodeBefore?: string | null;
  nResultBefore?: number | null;
  cSurfaceDescBefore?: string | null;
  cSurfaceRemarkBefore?: string | null;
  cInboundNoBefore?: string | null;
  cTol?: string | null;
  cTolBefore?: string | null;
  cTrimFlag?: string | null;
  cTrimFlagBefore?: string | null;
  cStoreCode?: string | null;
}

export const bxApi = {
  addP48j03(data?: DtoP48J03[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bx/addP48j03",
      {
        method: "post",
        data,
      },
    );
  },
  test() {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bx/test",
      {
        method: "post",
      },
    );
  },
  getUnHandleHRLog() {
    return requestClient.request<ThrLog[]>(
      "/dDH.Service.Interface.Services.BX/bx/getUnHandleHRLog",
      {
        method: "post",
      },
    );
  },
  handleHRLog(data?: ThrLog) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bx/handleHRLog",
      {
        method: "post",
        data,
      },
    );
  },
  receiveL2ME02Mtrl(data?: TiL2me02) {
    return requestClient.request<BooleanStringValueTuple>(
      "/dDH.Service.Interface.Services.BX/bx/receiveL2ME02Mtrl",
      {
        method: "post",
        data,
      },
    );
  },
};

export const dM1000Api = {
  queryBear(data?: DtoQueryTdm1000) {
    return requestClient.request<Tdm1000[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/queryBear",
      {
        method: "post",
        data,
      },
    );
  },
  queryBearBox(data?: DtoQueryTdm1000) {
    return requestClient.request<Tdm1010[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/queryBearBox",
      {
        method: "post",
        data,
      },
    );
  },
  tmd1000Add(data?: Tdm1000) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tmd1000Add",
      {
        method: "post",
        data,
      },
    );
  },
  tmd1010Add(data?: Tdm1010) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tmd1010Add",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1000Del(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Del",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1010Del(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Del",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1000Repair(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Repair",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1010Repair(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Repair",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1000Finish(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Finish",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1010Finish(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Finish",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1000Scrap(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1000Scrap",
      {
        method: "post",
        data,
      },
    );
  },
  tdm1010Scrap(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/tdm1010Scrap",
      {
        method: "post",
        data,
      },
    );
  },
  installBear(bearNo?: string, bearBoxNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/installBear",
      {
        method: "post",
        params: { bearNo, bearBoxNo },
      },
    );
  },
  outBear(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1000/outBear",
      {
        method: "post",
        data,
      },
    );
  },
};

export const dM1020Api = {
  queryTdm1020s(data?: DtoQueryTdm1020) {
    return requestClient.request<Tdm1020[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/queryTdm1020s",
      {
        method: "post",
        data,
      },
    );
  },
  addTdm1020(data?: Tdm1020) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/addTdm1020",
      {
        method: "post",
        data,
      },
    );
  },
  delTdm1020(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/delTdm1020",
      {
        method: "post",
        data,
      },
    );
  },
  resetTdm1020(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/resetTdm1020",
      {
        method: "post",
        data,
      },
    );
  },
  scrapTdm1020(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/scrapTdm1020",
      {
        method: "post",
        data,
      },
    );
  },
  installRoller(data?: DtoTdm1020InstallRoller) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/installRoller",
      {
        method: "post",
        data,
      },
    );
  },
  outBear(cId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/outBear",
      {
        method: "post",
        params: { cId },
      },
    );
  },
  queryBearBox(cId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/queryBearBox",
      {
        method: "post",
        params: { cId },
      },
    );
  },
  queryWorkBox(UpOrDown?: string) {
    return requestClient.request<Tdm1010[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/queryWorkBox",
      {
        method: "post",
        params: { UpOrDown },
      },
    );
  },
  queryTranBox(UpOrDown?: string) {
    return requestClient.request<Tdm1010[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/queryTranBox",
      {
        method: "post",
        params: { UpOrDown },
      },
    );
  },
  sendBx(cId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1020/sendBx",
      {
        method: "post",
        params: { cId },
      },
    );
  },
};

export const dM1030Api = {
  queryTdm1030(data?: DtoQueryTdm1030) {
    return requestClient.request<Tdm1030[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1030/queryTdm1030",
      {
        method: "post",
        data,
      },
    );
  },
  saveTdm1030Changes(data?: Tdm1030SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1030/saveTdm1030Changes",
      {
        method: "post",
        data,
      },
    );
  },
};

export const dM1040Api = {
  queryTdm1040s(data?: DtoQueryTdm1030) {
    return requestClient.request<Tdm1040[]>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1040/queryTdm1040s",
      {
        method: "post",
        data,
      },
    );
  },
  updateTdm1040(data?: Tdm1040SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.WorkPiece/dM1040/updateTdm1040",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR1000Api = {
  queryList(key?: string) {
    return requestClient.request<Thr1000[]>(
      "/dDH.Service.SHR.Services/hR1000/queryList",
      {
        method: "post",
        params: { key },
      },
    );
  },
  saveChange(data?: Thr1000SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR1000/saveChange",
      {
        method: "post",
        data,
      },
    );
  },
  getWgt(data?: QueryThr1000Dto) {
    return requestClient.request<number>(
      "/dDH.Service.SHR.Services/hR1000/getWgt",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR2000Api = {
  queryTmp2020s(data?: DtoQueryThr2000) {
    return requestClient.request<Tmp2020[]>(
      "/dDH.Service.SHR.Services/hR2000/queryTmp2020s",
      {
        method: "post",
        data,
      },
    );
  },
  queryThr2000s(data?: DtoQueryThr2000) {
    return requestClient.request<Thr2000[]>(
      "/dDH.Service.SHR.Services/hR2000/queryThr2000s",
      {
        method: "post",
        data,
      },
    );
  },
  closeThr2000s(cRemark?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR2000/closeThr2000s",
      {
        method: "post",
        params: { cRemark },
        data,
      },
    );
  },
  addPlans(cLineCode?: string, cRemark?: string, data?: DtoAddPlans[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR2000/addPlans",
      {
        method: "post",
        params: { cLineCode, cRemark },
        data,
      },
    );
  },
  generatePlanNo(cLineCode?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services/hR2000/generatePlanNo",
      {
        method: "post",
        params: { cLineCode },
      },
    );
  },
  queryThr2000Dtos(data?: DtoQueryThr2000) {
    return requestClient.request<Thr2000Dto[]>(
      "/dDH.Service.SHR.Services/hR2000/queryThr2000Dtos",
      {
        method: "post",
        data,
      },
    );
  },
  updateThr2000(cId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR2000/updateThr2000",
      {
        method: "post",
        params: { cId },
      },
    );
  },
  importHR2000(data?: ImportHR2000Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR2000/importHR2000",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR3000Api = {
  queryThr3000s(data?: DtoQueryThr3000) {
    return requestClient.request<Thr3000[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3000s",
      {
        method: "post",
        data,
      },
    );
  },
  queryThr3010s(cZpId?: string) {
    return requestClient.request<Thr3010[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3010s",
      {
        method: "post",
        params: { cZpId },
      },
    );
  },
  queryThr3020s(cZpId?: string) {
    return requestClient.request<Thr3020[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3020s",
      {
        method: "post",
        params: { cZpId },
      },
    );
  },
  queryThr3030s(data?: Query3030Dto) {
    return requestClient.request<Thr3030[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3030s",
      {
        method: "post",
        data,
      },
    );
  },
  getSlabs(data?: DtoQuerySlabs) {
    return requestClient.request<Tyd2000[]>(
      "/dDH.Service.SHR.Services/hR3000/getSlabs",
      {
        method: "post",
        data,
      },
    );
  },
  saveZp(data?: DtoSaveZp) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/saveZp",
      {
        method: "post",
        data,
      },
    );
  },
  addZp(data?: DtoAddZp) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/addZp",
      {
        method: "post",
        data,
      },
    );
  },
  cancelZp(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/cancelZp",
      {
        method: "post",
        data,
      },
    );
  },
  ensureZps(data?: DtoEnsure) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/ensureZps",
      {
        method: "post",
        data,
      },
    );
  },
  issueZps(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/issueZps",
      {
        method: "post",
        data,
      },
    );
  },
  generateBacthNo(cLineCode?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services/hR3000/generateBacthNo",
      {
        method: "post",
        params: { cLineCode },
      },
    );
  },
  autoSaveZp(data?: DtoAutoZp) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/autoSaveZp",
      {
        method: "post",
        data,
      },
    );
  },
  autoSaveZpNew(cOrderNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/autoSaveZpNew",
      {
        method: "post",
        params: { cOrderNo },
      },
    );
  },
  moveThr3000(data?: DtoMoveThr3000) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/moveThr3000",
      {
        method: "post",
        data,
      },
    );
  },
  updateThr2000(COrderId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/updateThr2000",
      {
        method: "post",
        params: { COrderId },
      },
    );
  },
  queryThr3000Dtos(data?: DtoQueryThr3000) {
    return requestClient.request<Thr3000Dto[]>(
      "/dDH.Service.SHR.Services/hR3000/queryThr3000Dtos",
      {
        method: "post",
        data,
      },
    );
  },
  changePlan(cOrderId?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/changePlan",
      {
        method: "post",
        params: { cOrderId },
        data,
      },
    );
  },
  changeJQPlan(cOrderId?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/changeJQPlan",
      {
        method: "post",
        params: { cOrderId },
        data,
      },
    );
  },
  /** 生成代表样（system 用户） */
  buildPlateQy(batchNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3000/buildPlateQy",
      { method: "post", params: { batchNo } },
    );
  },
  /** 校验是否需取样（system 用户） */
  testIsNeedQY(batchNo?: string, plateSeq?: number, pieceNo?: string) {
    return requestClient.request<boolean>(
      "/dDH.Service.SHR.Services/hR3000/testIsNeedQY",
      { method: "post", params: { batchNo, plateSeq, pieceNo } },
    );
  },
};

export const hR3010Api = {
  enterFur(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/enterFur",
      {
        method: "post",
        data,
      },
    );
  },
  cancelEnter(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/cancelEnter",
      {
        method: "post",
        data,
      },
    );
  },
  exitFur(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/exitFur",
      {
        method: "post",
        data,
      },
    );
  },
  elimFur(data?: DtoZgWork) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services/hR3010/elimFur",
      {
        method: "post",
        data,
      },
    );
  },
  cancelExit(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/cancelExit",
      {
        method: "post",
        data,
      },
    );
  },
  finishRoll(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/finishRoll",
      {
        method: "post",
        data,
      },
    );
  },
  waste(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/waste",
      {
        method: "post",
        data,
      },
    );
  },
  cancelFinish(data?: DtoZgWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/cancelFinish",
      {
        method: "post",
        data,
      },
    );
  },
  querySlabs(data?: DtoQueryThr3000) {
    return requestClient.request<DtoThr3010[]>(
      "/dDH.Service.SHR.Services/hR3010/querySlabs",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me021s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me021[]>(
      "/dDH.Service.SHR.Services/hR3010/queryTiL2me021s",
      {
        method: "post",
        data,
      },
    );
  },
  enter(data?: DtoFurWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/enter",
      {
        method: "post",
        data,
      },
    );
  },
  exit(data?: DtoFurWork) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/exit",
      {
        method: "post",
        data,
      },
    );
  },
  /** 查询待入炉材料 */
  queryNotInSlabs(data?: DtoQueryThr3000) {
    return requestClient.request<DtoThr3010[]>(
      "/dDH.Service.SHR.Services/hR3010/queryNotInSlabs",
      { method: "post", data },
    );
  },
  /** 生产顺序导入（Excel 行集） */
  importOrder(data?: ImportHROrder[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3010/importOrder",
      { method: "post", data },
    );
  },
};

export const hR3400Api = {
  queryList(data?: DtoQueryThr3000) {
    return requestClient.request<Thr3040[]>(
      "/dDH.Service.SHR.Services/hR3400/queryList",
      {
        method: "post",
        data,
      },
    );
  },
  saveQt(data?: TiP48j01) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3400/saveQt",
      {
        method: "post",
        data,
      },
    );
  },
  saveQb(data?: TiP48j02) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3400/saveQb",
      {
        method: "post",
        data,
      },
    );
  },
  saveDc(data?: TiP48j031) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3400/saveDc",
      {
        method: "post",
        data,
      },
    );
  },
  saveJq(data?: SaveJqDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3400/saveJq",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR3600Api = {
  querySlabs(data?: DtoQuerySlabs) {
    return requestClient.request<Tyd2000[]>(
      "/dDH.Service.SHR.Services/hR3600/querySlabs",
      {
        method: "post",
        data,
      },
    );
  },
  queryHls(data?: DtoQuerySlabs) {
    return requestClient.request<Thr3010Hl[]>(
      "/dDH.Service.SHR.Services/hR3600/queryHls",
      {
        method: "post",
        data,
      },
    );
  },
  startHl(data?: HlDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3600/startHl",
      {
        method: "post",
        data,
      },
    );
  },
  endHl(data?: HlDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3600/endHl",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR3700Api = {
  queryJQPlans(cOrderNo?: string) {
    return requestClient.request<Tmp2016[]>(
      "/dDH.Service.SHR.Services/hR3700/queryJQPlans",
      {
        method: "post",
        params: { cOrderNo },
      },
    );
  },
  createSjByPlan(cSlabId?: string) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SHR.Services/hR3700/createSjByPlan",
      {
        method: "post",
        params: { cSlabId },
      },
    );
  },
  /** 查询火切材料 */
  getHqSlabs(data?: DtoQuerySlabs) {
    return requestClient.request<HqDto[]>(
      "/dDH.Service.SHR.Services/hR3700/getHqSlabs",
      { method: "post", data },
    );
  },
  /** 检查试坯是否已取样 */
  checkIsQy(cPieceNo?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services/hR3700/checkIsQy",
      { method: "post", params: { cPieceNo } },
    );
  },
  /** 保存火切剪切实绩 */
  saveJq(data?: SaveTyd2000JqDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3700/saveJq",
      { method: "post", data },
    );
  },
  /** 查询库存材料（剪切） */
  getSlabs(data?: DtoQuerySlabs) {
    return requestClient.request<import("./syd.swagger").Tyd2000[]>(
      "/dDH.Service.SHR.Services/hR3700/getSlabs",
      { method: "post", data },
    );
  },
};

export const hR4000Api = {
  queryThr4000s(data?: DtoQuerySlabs) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SHR.Services/hR4000/queryThr4000s",
      {
        method: "post",
        data,
      },
    );
  },
  queryPrintSjs(data?: DtoQuerySlabs) {
    return requestClient.request<Thr4000Dto[]>(
      "/dDH.Service.SHR.Services/hR4000/queryPrintSjs",
      {
        method: "post",
        data,
      },
    );
  },
  addSjs(data?: DtoP48J03[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addSjs",
      {
        method: "post",
        data,
      },
    );
  },
  deleteSjs(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/deleteSjs",
      {
        method: "post",
        data,
      },
    );
  },
  queryPrints(cLineCode?: string, cSlCode?: string) {
    return requestClient.request<DtoThr4000[]>(
      "/dDH.Service.SHR.Services/hR4000/queryPrints",
      {
        method: "post",
        params: { cLineCode, cSlCode },
      },
    );
  },
  queryPrintsByInput(data?: QueryPrintInputDto) {
    return requestClient.request<DtoThr4000[]>(
      "/dDH.Service.SHR.Services/hR4000/queryPrintsByInput",
      {
        method: "post",
        data,
      },
    );
  },
  addSjsByPiece(data?: DtoAddSj) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addSjsByPiece",
      {
        method: "post",
        data,
      },
    );
  },
  insertTyd2000s(data?: Thr4000[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/insertTyd2000s",
      {
        method: "post",
        data,
      },
    );
  },
  deleteTyd2000s(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/deleteTyd2000s",
      {
        method: "post",
        data,
      },
    );
  },
  getPieceNo(cBatchNo?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services/hR4000/getPieceNo",
      {
        method: "post",
        params: { cBatchNo },
      },
    );
  },
  deleteSjsByPiece(cPieceNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/deleteSjsByPiece",
      {
        method: "post",
        params: { cPieceNo },
      },
    );
  },
  saveChange(data?: Thr4000SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/saveChange",
      {
        method: "post",
        data,
      },
    );
  },
  addPrintLog(data?: DtoThr4000[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addPrintLog",
      {
        method: "post",
        data,
      },
    );
  },
  cancelZc(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/cancelZc",
      {
        method: "post",
        data,
      },
    );
  },
  cptk(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/cptk",
      {
        method: "post",
        data,
      },
    );
  },
  editSj(data?: Thr4000Edit) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/editSj",
      {
        method: "post",
        data,
      },
    );
  },
  addSj(data?: TiP48j031) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addSj",
      {
        method: "post",
        data,
      },
    );
  },
  addSjByPlan(cZpId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addSjByPlan",
      {
        method: "post",
        params: { cZpId },
      },
    );
  },
  /** 轧制计划完成确认 */
  confirm(cZpId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/confirm",
      { method: "post", params: { cZpId } },
    );
  },
  /** 取消完成确认 */
  cancelConfirm(cZpId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/cancelConfirm",
      { method: "post", params: { cZpId } },
    );
  },
  /** 查询钢种标准列表（钢种下拉） */
  querySg() {
    return requestClient.request<Tqmtpa6[]>(
      "/dDH.Service.SHR.Services/hR4000/querySg",
      { method: "post" },
    );
  },
  /** 手动收料（原手动同步） */
  sdsl() {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/sdsl",
      { method: "post" },
    );
  },
  /** 手动添加实绩（原 FrmHR4000New 保存） */
  addSjByManual(data?: Thr4000) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR4000/addSjByManual",
      { method: "post", data },
    );
  },
  /** 遗留台账查询（HR4010） */
  queryYl(data?: DtoQuerySlabs) {
    return requestClient.request<QueryYcDto>(
      "/dDH.Service.SHR.Services/hR4000/queryYl",
      { method: "post", data },
    );
  },
  /** 遗留台账保存（HR4010） */
  saveYc(data?: SaveYcDto) {
    return requestClient.request<void>(
      "/dDH.Service.SHR.Services/hR4000/saveYc",
      { method: "post", data },
    );
  },
};

export const hR4200Api = {
  queryTiL2me01s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me01[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me01s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me02s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me02[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me02s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me021s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me021[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me021s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me03s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me03[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me03s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me04s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me04[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me04s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me05s(data?: DtoQueryL2) {
    return requestClient.request<TiL2ME05ItemDto[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me05s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me06s(data?: DtoQueryL2) {
    return requestClient.request<TiL2ME06ItemDto[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me06s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me08s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me08[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me08s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me09s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me09[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me09s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me11s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me11[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me11s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me12s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me12[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me12s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me14s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me14[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me14s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me15s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me15[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me15s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me16s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me16[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me16s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me17s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me17[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me17s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me18s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me18Dto[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me18s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me19s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me19[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me19s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j01s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j01[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j01s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j02s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j02[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j02s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j031s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j031[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j031s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j04s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j04[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j04s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j05s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j05[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j05s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j06s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j06[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j06s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j07s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j07[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j07s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiP48j09s(data?: DtoQueryL2) {
    return requestClient.request<TiP48j09[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiP48j09s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiRollgrs(data?: DtoQueryL2) {
    return requestClient.request<TiRollgr[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiRollgrs",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR4300Api = {
  queryCc(data?: DtoQuerySlabs) {
    return requestClient.request<PlanCcDto[]>(
      "/dDH.Service.SHR.Services/hR4300/queryCc",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR4400Api = {
  queryZjps(data?: DtoQuerySlabs) {
    return requestClient.request<Thr3040Dto[]>(
      "/dDH.Service.SHR.Services/hR4400/queryZjps",
      {
        method: "post",
        data,
      },
    );
  },
};

export const hR9000Api = {
  queryThickHz(data?: DtoQueryL2) {
    return requestClient.request<ChyThickItemDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryThickHz",
      {
        method: "post",
        data,
      },
    );
  },
  queryWidthHz(data?: DtoQueryL2) {
    return requestClient.request<ChyWidthItemDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryWidthHz",
      {
        method: "post",
        data,
      },
    );
  },
  queryFhHz(data?: DtoQueryL2) {
    return requestClient.request<FhwdItemDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryFhHz",
      {
        method: "post",
        data,
      },
    );
  },
  queryZzHz(data?: DtoQueryL2) {
    return requestClient.request<ZzwdItemDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryZzHz",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me021s(data?: DtoQueryL2) {
    return requestClient.request<QueryRollDetail[]>(
      "/dDH.Service.SHR.Services/hR9000/queryTiL2me021s",
      {
        method: "post",
        data,
      },
    );
  },
  /** 查询板坯实绩（HR9070） */
  querySlabs(data?: DtoQueryThr3000) {
    return requestClient.request<Thr3010Dto[]>(
      "/dDH.Service.SHR.Services/hR9000/querySlabs",
      { method: "post", data },
    );
  },
  /** 加热实绩电文 */
  queryTiL2me11s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me11Dto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryTiL2me11s",
      { method: "post", data },
    );
  },
  /** 超快冷实绩 */
  queryTiL2me14s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me14Dto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryTiL2me14s",
      { method: "post", data },
    );
  },
  /** 预矫直实绩 */
  queryTiL2me08s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me08Dto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryTiL2me08s",
      { method: "post", data },
    );
  },
  /** 热矫直实绩 */
  queryTiL2me09s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me09Dto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryTiL2me09s",
      { method: "post", data },
    );
  },
  /** 轧制计划板坯（HR9200 主表） */
  queryZpSlabs(data?: DtoQueryThr3000) {
    return requestClient.request<DtoThr3010[]>(
      "/dDH.Service.SHR.Services/hR9000/queryZpSlabs",
      { method: "post", data },
    );
  },
  /** 轧制计划异常实绩 */
  queryTiL2me01s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me01Dto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryTiL2me01s",
      { method: "post", data },
    );
  },
  /** 超快冷实绩-组汇总 */
  queryTiL2me14sGroupHz(data?: TiL2me14Dto[]) {
    return requestClient.request<QueryHR9060HzDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryTiL2me14sGroupHz",
      { method: "post", data },
    );
  },
  /** 超快冷实绩-责任者汇总 */
  queryTiL2me14sAuthorHz(data?: TiL2me14Dto[]) {
    return requestClient.request<QueryHR9060HzDto[]>(
      "/dDH.Service.SHR.Services/hR9000/queryTiL2me14sAuthorHz",
      { method: "post", data },
    );
  },
  /** 船板钢生产工艺报表（HR9071） */
  query9071s(data?: DtoQueryThr3000) {
    return requestClient.request<Thr3010Dto[]>(
      "/dDH.Service.SHR.Services/hR9000/query9071s",
      { method: "post", data },
    );
  },
  /** 取样记录查询（HR9072） */
  query9072s(data?: DtoQueryThr3000) {
    return requestClient.request<Thr3010Dto[]>(
      "/dDH.Service.SHR.Services/hR9000/query9072s",
      { method: "post", data },
    );
  },
};

export const hRLogApi = {
  insertLog(data?: DtoInsertLog) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hRLog/insertLog",
      {
        method: "post",
        data,
      },
    );
  },
  insertLogs(data?: DtoInsertLogs) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hRLog/insertLogs",
      {
        method: "post",
        data,
      },
    );
  },
  updateThr3000(cZpId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hRLog/updateThr3000",
      {
        method: "post",
        params: { cZpId },
      },
    );
  },
  queryLogs(data?: DtoQueryLog) {
    return requestClient.request<ThrLog[]>(
      "/dDH.Service.SHR.Services/hRLog/queryLogs",
      {
        method: "post",
        data,
      },
    );
  },
};

export const influxdbReportApi = {
  exportZB037ToInfluxdb(startDate?: string, endDate?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/influxdbReport/exportZB037ToInfluxdb",
      {
        method: "post",
        params: { startDate, endDate },
      },
    );
  },
  exportZB232ToInfluxdb(startDate?: string, endDate?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/influxdbReport/exportZB232ToInfluxdb",
      {
        method: "post",
        params: { startDate, endDate },
      },
    );
  },
  exportZB001ToInfluxdb(startDate?: string, endDate?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/influxdbReport/exportZB001ToInfluxdb",
      {
        method: "post",
        params: { startDate, endDate },
      },
    );
  },
};

export const tI1000Api = {
  queryTiL2me01(data?: DtoTi1000Query) {
    return requestClient.request<Ti1000Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1000/queryTiL2me01",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2Me011s(CId?: string) {
    return requestClient.request<Ti1000_1Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1000/queryTiL2Me011s",
      {
        method: "post",
        params: { CId },
      },
    );
  },
};

export const tI1010Api = {
  queryTi1010(data?: DtoTi1010Query) {
    return requestClient.request<Ti1010Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1010/queryTi1010",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1010/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1020Api = {
  ti1020Query(data?: DtoTi1020Query) {
    return requestClient.request<Ti1020Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1020/ti1020Query",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1020/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
  queryTi10201(CId?: string) {
    return requestClient.request<Ti1020_1Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1020/queryTi10201",
      {
        method: "post",
        params: { CId },
      },
    );
  },
};

export const tI1030Api = {
  ti1030Query(data?: DtoTi1030Query) {
    return requestClient.request<Ti1030Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1030/ti1030Query",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1030/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1040Api = {
  queryTi1040(data?: DtoTi1040Query) {
    return requestClient.request<Ti1040Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1040/queryTi1040",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1040/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1050Api = {
  queryTi1050(data?: DtoTi1050Query) {
    return requestClient.request<Ti1050Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1050/queryTi1050",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1050/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1060Api = {
  queryTi1060(data?: DtoTi1060Query) {
    return requestClient.request<Ti1060Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1060/queryTi1060",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tI1070Api = {
  queryDS(data?: DtoTi1070Query) {
    return requestClient.request<Ti1070Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1070/queryDS",
      {
        method: "post",
        data,
      },
    );
  },
  queryDSS(data?: DtoTi1080Query) {
    return requestClient.request<Ti1080Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1070/queryDSS",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tI1090Api = {
  queryInStove(data?: TimeRange) {
    return requestClient.request<Ti1090_InStoveDto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1090/queryInStove",
      {
        method: "post",
        data,
      },
    );
  },
  queryOutStove(data?: TimeRange) {
    return requestClient.request<Ti1090_OutStoveDto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1090/queryOutStove",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1090/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1200Api = {
  getL2me12s(data?: DtoTdaZb037Query) {
    return requestClient.request<Ti1200Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1200/getL2me12s",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1200/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
};

export const tI1210Api = {
  getTi1210Dtos(data?: DtoTi1210Query) {
    return requestClient.request<Ti1210Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1210/getTi1210Dtos",
      {
        method: "post",
        data,
      },
    );
  },
  getDate(str?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1210/getDate",
      {
        method: "post",
        params: { str },
      },
    );
  },
  getHitRate(thick?: number, thickSj?: number, thickMin?: number, thickMax?: number) {
    return requestClient.request<string>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1210/getHitRate",
      {
        method: "post",
        params: { thick, thickSj, thickMin, thickMax },
      },
    );
  },
  getTi1211Dtos(data?: DtoTi1210Query) {
    return requestClient.request<Ti1211Dto[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tI1210/getTi1211Dtos",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tdaZb001Api = {
  getTdaZb001s(data?: DtoTdaZb037Query) {
    return requestClient.request<TdaZb001[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tdaZb001/getTdaZb001s",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tdaZb037Api = {
  queryTdaZb037(data?: DtoTdaZb037Query) {
    return requestClient.request<TdaZb037[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tdaZb037/queryTdaZb037",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tdaZb232Api = {
  getTdaZb232s(data?: DtoTdaZb037Query) {
    return requestClient.request<TdaZb232[]>(
      "/dDH.Service.SHR.Services.InterInfoQuery/tdaZb232/getTdaZb232s",
      {
        method: "post",
        data,
      },
    );
  },
};

/** 日计划状态（DDH.Service.SHR.Enums.Thr2000StatusEnum） */
export enum Thr2000StatusEnum {
  /** 已开启 */
  Open = 0,
  /** 已关闭 */
  Close = 10,
}

/* ---------- ThrBar 棒材作业（HR5200_JC ~ HR5400_JC）手工补齐 ---------- */

/** 剔炉/轧废记录类型（DDH.Service.SHR.Entities.ThrLogJcEnum） */
export enum ThrLogJcEnum {
  /** 剔炉 */
  Tl = 10,
  /** 轧废 */
  Zf = 20,
  /** 撤销 */
  Canle = 30,
}

/** 组批计划状态（DDH.Service.SHR.Dtos.Thr5400Status） */
export enum Thr5400Status {
  /** 已组批 */
  Batch = 0,
  /** 未组批 */
  NotBatch = 10,
}

/** 建材剔炉轧废记录表 Thr5200 */
export interface Thr5200 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cPieceNo?: string | null;
  cStove?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nNum?: number | null;
  nWgt?: number | null;
  nType?: ThrLogJcEnum | null;
  cRemark?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
  cCanleUser?: string | null;
  cCanleTime?: string | null;
}

/** 可剔炉/可轧废材料查询结果 QueryHR5200_JCDto */
export interface QueryHR5200_JCDto {
  cLineCode?: string | null;
  cStove?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nQua?: number | null;
  nWgt?: number | null;
  nFinishQua?: number | null;
  nFinishWgt?: number | null;
  nQuaTL?: number | null;
  nWgtTL?: number | null;
  nQuaZf?: number | null;
  nWgtZf?: number | null;
}

/** 材料明细查询结果 QueryHR5310JCDto */
export interface QueryHR5310JCDto {
  selected?: boolean;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cStove?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nNum?: number | null;
  nWgt?: number | null;
  nUseNum?: number | null;
  nUseWgt?: number | null;
  cRemark?: string | null;
}

/** 剔炉/出炉执行入参 Thr3010TlDto */
export interface Thr3010TlDto {
  pieceNos?: string[] | null;
  reason?: string | null;
  cLineCode?: string | null;
  cStoveNo?: string | null;
  cSgCode?: string | null;
  cSpec?: string | null;
  nQuaTL?: number;
  nQua?: number;
  cOrderNo?: string | null;
}

/** 剔炉查询条件 Thr3010TlQueryDto */
export interface Thr3010TlQueryDto {
  timeRange?: TimeRange;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cPlateNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
}

/** 轧废/轧制完成执行入参 Thr3010ZFDto */
export interface Thr3010ZFDto {
  pieceNos?: string[] | null;
  reason?: string | null;
  cLineCode?: string | null;
  cStoveNo?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSpec?: string | null;
  nQuaZf?: number;
  nQua?: number;
}

/** 轧废查询条件 Thr3010ZFQueryDto */
export interface Thr3010ZFQueryDto {
  timeRange?: TimeRange;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cPlateNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
}

/** 组批/收料查询条件 DtoHR5400JcQuery */
export interface DtoHR5400JcQuery {
  cZpId?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  slabNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nStatus?: Thr5400Status | null;
  dCreateTimeRange?: TimeRange;
  cZpIds?: string[] | null;
  cMxIds?: string[] | null;
  cStoveNos?: string[] | null;
  slabList?: QueryHR5310JCDto[] | null;
}

/** 组批执行入参 DtoHR5310Jc */
export interface DtoHR5310Jc {
  cStove?: string | null;
  thr3010s?: Thr3010[] | null;
  slabList?: QueryHR5310JCDto[] | null;
  cMxIds?: string[] | null;
  cStoveNos?: string[] | null;
  stoveInfo?: Thr3010 | null;
  thr3000?: Thr3000 | null;
  thr4000s?: Thr4000[] | null;
  addThr4000?: DtoAddThr4000 | null;
}

/** 添加小棒收料实绩入参 DtoAddThr4000 */
export interface DtoAddThr4000 {
  cZpId?: string | null;
  cOrderId?: string | null;
  cMxIds?: string[] | null;
  cLineCode?: string | null;
  nQua?: number;
  cShift?: string | null;
  cGroup?: string | null;
  cRemark?: string | null;
}

/** 工厂产线设备（Hmx.Service.Widgets.Entities.Tpa1000，产线下拉用） */
export interface Tpa1000 {
  id?: string | null;
  cCode?: string | null;
  cName?: string | null;
  cSimpName?: string | null;
  cSimpCode?: string | null;
  cSimpNo?: string | null;
  cPid?: string | null;
  nLevel?: number;
  cOldCode?: string | null;
  cWorkCenter?: string | null;
  cProc?: string | null;
  cType?: string | null;
  nOrder?: number;
  cLineCode?: string | null;
  cMatType?: string | null;
  cGyydSta?: string | null;
}

export const tPa1000Api = {
  /** 获取产线（原 ITpa1000AppService.QueryLines） */
  queryLines() {
    return requestClient.request<Tpa1000[]>(
      "/hmx.Service.Widgets.Services/tPa1000/queryLines",
      { method: "post" },
    );
  },
};

export const hR5200JCTLApi = {
  /** 查询可剔炉数据 */
  getListAsync1(data?: Thr3010TlQueryDto) {
    return requestClient.request<QueryHR5200_JCDto[]>(
      "/dDH.Service.SHR.Services.ThrBar/hR5200JCTL/getListAsync1",
      { method: "post", data },
    );
  },
  /** 查询剔炉记录 */
  getListAsync2(data?: Thr3010TlQueryDto) {
    return requestClient.request<Thr5200[]>(
      "/dDH.Service.SHR.Services.ThrBar/hR5200JCTL/getListAsync2",
      { method: "post", data },
    );
  },
  /** 执行剔炉 */
  furOutAsync(data?: Thr3010TlDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5200JCTL/furOutAsync",
      { method: "post", data },
    );
  },
  /** 加热完成（出炉） */
  outFur(data?: Thr3010TlDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5200JCTL/outFur",
      { method: "post", data },
    );
  },
  /** 撤销加热完成（撤销出炉） */
  canleOutFur(data?: Thr3010TlDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5200JCTL/canleOutFur",
      { method: "post", data },
    );
  },
  /** 撤销剔炉/轧废（标量枚举走 params，件次号数组走 data） */
  canleHR5200(thrLogJcEnum?: ThrLogJcEnum, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5200JCTL/canleHR5200",
      { method: "post", params: { thrLogJcEnum }, data },
    );
  },
};

export const hR5300JCZFApi = {
  /** 查询可轧废数据 */
  getListAsync1(data?: Thr3010ZFQueryDto) {
    return requestClient.request<QueryHR5200_JCDto[]>(
      "/dDH.Service.SHR.Services.ThrBar/hR5300JCZF/getListAsync1",
      { method: "post", data },
    );
  },
  /** 查询轧废记录 */
  getListAsync2(data?: Thr3010ZFQueryDto) {
    return requestClient.request<Thr5200[]>(
      "/dDH.Service.SHR.Services.ThrBar/hR5300JCZF/getListAsync2",
      { method: "post", data },
    );
  },
  /** 执行轧废 */
  rollOutAsync(data?: Thr3010ZFDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5300JCZF/rollOutAsync",
      { method: "post", data },
    );
  },
  /** 轧制完成 */
  finishRoll(data?: Thr3010ZFDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5300JCZF/finishRoll",
      { method: "post", data },
    );
  },
  /** 撤销轧制完成 */
  canleFinishRoll(data?: Thr3010ZFDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5300JCZF/canleFinishRoll",
      { method: "post", data },
    );
  },
};

export const hR5310JCApi = {
  /** 查询材料明细 */
  getThr3010s(data?: DtoHR5400JcQuery) {
    return requestClient.request<QueryHR5310JCDto[]>(
      "/dDH.Service.SHR.Services.ThrBar/hR5310JC/getThr3010s",
      { method: "post", data },
    );
  },
  /** 生成组批信息 */
  addZpInfo(data?: DtoHR5400JcQuery) {
    return requestClient.request<Thr3000>(
      "/dDH.Service.SHR.Services.ThrBar/hR5310JC/addZpInfo",
      { method: "post", data },
    );
  },
  /** 组批时添加建材收料实绩 */
  addZpJcSj(data?: DtoHR5310Jc) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SHR.Services.ThrBar/hR5310JC/addZpJcSj",
      { method: "post", data },
    );
  },
  /** 保存组批时添加的建材收料实绩 */
  saveZp(data?: DtoHR5310Jc) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5310JC/saveZp",
      { method: "post", data },
    );
  },
};

export const hR5400JCApi = {
  /** 查询组批计划 */
  getThr3000s(data?: DtoHR5400JcQuery) {
    return requestClient.request<Thr3000[]>(
      "/dDH.Service.SHR.Services.ThrBar/hR5400JC/getThr3000s",
      { method: "post", data },
    );
  },
  /** 查询材料明细 */
  getThr3010s(data?: DtoHR5400JcQuery) {
    return requestClient.request<Thr3010[]>(
      "/dDH.Service.SHR.Services.ThrBar/hR5400JC/getThr3010s",
      { method: "post", data },
    );
  },
  /** 查询产出实绩 */
  getThr4000s(data?: DtoQueryThr3000) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SHR.Services.ThrBar/hR5400JC/getThr4000s",
      { method: "post", data },
    );
  },
  /** 撤销组批 */
  canelZp(data?: DtoHR5400JcQuery) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5400JC/canelZp",
      { method: "post", data },
    );
  },
  /** 补充组批 */
  addZp(data?: DtoHR5400JcQuery) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5400JC/addZp",
      { method: "post", data },
    );
  },
  /** 添加收料实绩 */
  addJcSj(data?: DtoAddThr4000) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5400JC/addJcSj",
      { method: "post", data },
    );
  },
  /** 保存产出实绩增删改 */
  saveChange(data?: Thr4000SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services.ThrBar/hR5400JC/saveChange",
      { method: "post", data },
    );
  },
};

/* ---------- HR3100~HR3700 中厚板作业补齐类型 ---------- */

/** 火切材料 HqDto（DDH.Service.SHR.Dtos.HqDto） */
export interface HqDto {
  id?: string | null;
  cLineCode?: string | null;
  cIsGcd?: string | null;
  cIsQy?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cBatchOrder?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number | null;
  nCalWgt?: number | null;
  nWgt?: number | null;
  cProRemark?: string | null;
  cConRemark?: string | null;
  cInboundNo?: string | null;
  cTrimFlag?: string | null;
  nProType?: number | null;
}

/** 火切剪切计划 OrderDto（DDH.Service.SHR.Dtos.OrderDto） */
export interface OrderDto {
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSpec?: string | null;
  nThickPlan?: number | null;
  nWidthPlan?: number | null;
  nLenPlan?: number | null;
  cInboundNo?: string | null;
  cConRemark?: string | null;
}

/** 火切实绩保存入参 SaveTyd2000JqDto */
export interface SaveTyd2000JqDto {
  cSlabId?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
  cIsQy?: string | null;
  cIsNew?: string | null;
  thr4000s?: Thr4000SaveChangesData | null;
}

/** 生产顺序导入行 ImportHROrder */
export interface ImportHROrder {
  cPieceNo?: string | null;
  cSgCode?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
}

/* ---------- 批次2 补齐（HR2200/HR3030/HR3110） ---------- */

/** 作业计划调整入参 ChangePlanDto（DDH.Service.SHR.Services.ChangePlanDto） */
export interface ChangePlanDto {
  cZpIds?: string[] | null;
  cOrderId?: string | null;
}

export const hR2200Api = {
  /** 查询库存材料（改切） */
  getSlabs(data?: DtoQuerySlabs) {
    return requestClient.request<import("./syd.swagger").Tyd2000Dto[]>(
      "/dDH.Service.SHR.Services/hR2200/getSlabs",
      { method: "post", data },
    );
  },
  /** 材料按提料计划生成改切计划 */
  saveJQPlan(cSlabId?: string, cOrderId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR2200/saveJQPlan",
      { method: "post", params: { cSlabId, cOrderId } },
    );
  },
};

export const hR3030Api = {
  /** 查询材料现剪切计划 */
  queryThr3030s(cPlateSlab?: string, cSlabNo?: string) {
    return requestClient.request<Thr3030[]>(
      "/dDH.Service.SHR.Services/hR3030/queryThr3030s",
      { method: "post", params: { cPlateSlab, cSlabNo } },
    );
  },
};

export const hR3130Api = {
  /** 作业计划改单（材料轧制计划订单号变更） */
  changePlans(data?: ChangePlanDto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3130/changePlans",
      { method: "post", data },
    );
  },
};

/* ---------- StripSteel 带钢作业（SS1000 ~ SS8080）手工补齐 ---------- */

/** 查询条件（DDH.Service.SHR.Services.PlanQueryDto） */
export interface PlanQueryDto {
  /** 关键字 */
  planKeyword?: string | null;
  /** 时间区间 */
  timeRange?: TimeRange;
  /** 计划开始时间 */
  planStartTime?: string | null;
  /** 计划结束时间 */
  planEndTime?: string | null;
}
/** TiE1000（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE1000 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 钢种 */
  cSgCode?: string | null;
  /** 钢种大类 */
  cSteelType?: string | null;
  /** 厚度下限 */
  nThickMin?: number;
  /** 厚度上限 */
  nThickMax?: number;
  /** 厚度区间 */
  nThickSwitch?: EqualsFlag;
  /** 宽度下限 */
  nWidthMin?: number;
  /** 宽度上限 */
  nWidthMax?: number;
  /** 宽度区间 */
  nWidthSwitch?: EqualsFlag;
  /** 板坯出炉目标温度 */
  exttempAim?: number;
  /** 成品凸度 */
  crownAim?: number;
  /** 粗轧目标厚度 */
  rmthkAim?: number;
  /** 粗轧目标宽度与成品宽度偏差 */
  rmwidAimDev?: number;
  /** 设定策略 */
  passno?: number;
  /** 粗轧出口目标温度 */
  rdtAim?: number;
  /** 精轧目标温度 */
  fdtAim?: number;
  /** 精轧入口目标温度 */
  fetAim?: number;
  /** 精轧厚度紧急变更值 */
  fmthkalt?: number;
  /** 粗轧温度紧急变更值 */
  fmtmpalt?: number;
  /** 凸度紧急变更值 */
  crnalt?: number;
  /** 剪切方式 */
  cutMode?: any;
  /** 卷取目标温度 */
  ctAim?: number;
  /** CTC控制方式 */
  ctcctmode?: any;
  /** 热头热尾标志 */
  heathdtail?: any;
  /** 热头长度 */
  hotheadlng?: number;
  /** 热尾长度 */
  hottaillng?: number;
  /** 头部温升温度 */
  hotheadtmp?: number;
  /** 尾部温升温度 */
  hottailtmp?: number;
  /** 精轧除鳞是否投入 */
  fmdsccode?: any;
  /** 凸度上公差 */
  crownTolup?: number;
  /** 凸度下公差 */
  crownTollow?: number;
  /** 阀开启位置：大于1小于13的整数 */
  opengrp?: number;
  /** 平直度目标值 */
  flatAim?: number;
  /** CTC中间温度目标值 */
  itaim?: number;
  /** CTC中间温度上公差 */
  itaimpostol?: number;
  /** CTC中间温度下公差 */
  itaimnegtol?: number;
  /** 前段冷却速率 */
  fnfcoolrateaim?: number;
  /** 后段冷却速率 */
  fndcoolrateaim?: number;
  /** 使用热卷箱 */
  coilboxflag?: any;
  /** 干头长度 */
  dryheadlng?: number;
  /** 干尾长度 */
  drytaillng?: number;
  /** 上下喷水阀比例(上/(上+下)) */
  coolrattgt?: number;
  /** 花纹板高度[%] */
  hwheight?: number;
}


/** TiE2000（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE2000 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 消息排序号 */
  nOrder?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: number;
  /** 计划日期 */
  planDate?: string | null;
  /** 计划日期内的计划排序号 */
  nPlanOrder?: number;
  /** 发送时间 */
  sendTime?: string | null;
  /** 操作标识 */
  operateFlag?: any;
  /** 计划提料号 */
  planId?: string | null;
  /** 计划块数 */
  planCount?: number;
  /** 用户订单号 */
  customerOrdNo?: string | null;
  /** 用户代码 */
  customerCode?: number;
  /** 材质代码 */
  steelGrade?: string | null;
  /** 目标成品厚度 */
  cthkAim?: number;
  /** 目标成品宽度 */
  cwidAim?: number;
  /** 成品类型 */
  prodType?: number;
  /** 花纹板高度 */
  hwHeight?: number;
  /** 板坯厚度 */
  sthk?: number;
  /** 板坯宽度 */
  swid?: number;
  /** 板坯长度 */
  slng?: number;
  /** 板坯重量 */
  swet?: number;
  /** 热坯标记 */
  hotFlag?: number;
  /** 短坯标记 */
  shortFlag?: number;
  /** 目标出炉温度 */
  extTempAim?: number;
  /** 粗轧出口目标温度 */
  rdtAim?: number;
  /** 粗轧目标厚度 */
  rmthkAim?: number;
  /** 粗轧目标宽度 */
  rmwidAim?: number;
  /** 粗轧道次 */
  rmPass?: number;
  /** 粗轧使用最小道次轧制标记 */
  rmPassMin?: number;
  /** 粗轧缩颈补偿值 */
  targetWidthAdjust?: number;
  /** 飞剪剪切方式：0 */
  cutMode?: number;
  /** 精轧入口目标温度 */
  fetAim?: number;
  /** 精轧目标温度 */
  fdtAim?: number;
  /** 卷取目标温度 */
  ctAim?: number;
  /** 目标凸度 */
  crownAim?: number;
  /** 目标平直度 */
  flatnessAim?: number;
  /** 目标楔形 */
  wedgeAim?: number;
  /** 精轧厚度紧急变更值 */
  fmthkalt?: number;
  /** 精轧温度紧急变更值 */
  fmtmpalt?: number;
  /** 热卷箱使用标记 */
  coilboxFlag?: number;
  /** CTC控制方式 */
  ctcCtMode?: number;
  /** CTC热头热尾标志 */
  heathdtail?: number;
  /** CTC热头长度 */
  hotheadlng?: number;
  /** CTC热尾长度 */
  hottaillng?: number;
  /** CTC热头温升 */
  hotheadtmp?: number;
  /** CTC热尾温升 */
  hottailtmp?: number;
  /** CTC干头长度 */
  dryheadlng?: number;
  /** CTC干尾长度 */
  drytaillng?: number;
  /** 上下喷水阀比例 */
  coolrattgt?: number;
  /** 目标成品厚度上公差 */
  cthkTolup?: number;
  /** 目标成品厚度下公差 */
  cthkTollow?: number;
  /** 目标成品宽度上公差 */
  cwidTolup?: number;
  /** 目标成品宽度下公差 */
  cwidTollow?: number;
  /** 目标凸度上公差 */
  crownTolup?: number;
  /** 目标凸度下公差 */
  crownTollow?: number;
  /** 目标平直度上公差 */
  flatnessTolup?: number;
  /** 目标平直度下公差 */
  flatnessTollow?: number;
  /** 目标楔形上公差 */
  wedgeTolup?: number;
  /** 目标楔形下公差 */
  wedgeTollow?: number;
  /** 精轧目标温度上公差 */
  fdtTolup?: number;
  /** 精轧目标温度下公差 */
  fdtTollow?: number;
  /** 卷取目标温度上公差 */
  ctTolup?: number;
  /** 卷取目标温度下公差 */
  ctTollow?: number;
  /** 粗轧出口目标温度上公差 */
  rdtTolup?: number;
  /** 粗轧出口目标温度下公差 */
  rdtTollow?: number;
  /** 精轧入口目标温度上公差 */
  fetTolup?: number;
  /** 精轧入口目标温度下公差 */
  fetTollow?: number;
  /** CTC中间温度目标值 */
  itaim?: number;
  /** CTC中间温度上公差 */
  itaimpostol?: number;
  /** CTC中间温度下公差 */
  itaimnegtol?: number;
  /** 精轧凸度紧急变更值 */
  crnalt?: number;
  /** 铁素体轧制标记 */
  ferriteRollFlag?: number;
  /** 精轧机组间中间温度 */
  fmStdTemp?: number;
  /** CTC头部过渡段长度 */
  headtransitionlng?: number;
  /** CTC尾部过渡段长度 */
  tailtransitionlng?: number;
  /** CTC前段冷却速率 */
  fnfcoolrateaim?: number;
  /** CTC后段冷却速率 */
  fndcoolrateaim?: number;
  /** CTC空冷时间 */
  airCoolTime?: number;
  /** 双相或者三相钢轧制标识 */
  reqDivQuench?: number;
  /** 备用字段1 */
  standby1?: string | null;
  /** 备用字段2 */
  standby2?: string | null;
  /** 备用字段3 */
  standby3?: string | null;
  /** 备用字段4 */
  standby4?: string | null;
  /** 备用字段5 */
  standby5?: string | null;
}


/** TiE2051（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE2051 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 消息排序号 */
  nOrder?: number;
  /** 机组代码 */
  plantCode?: string | null;
  /** 板坯号 */
  slabNo?: string | null;
  /** 材质代码 */
  steelGrade?: string | null;
  /** 板坯厚度 */
  sthk?: number;
  /** 板坯宽度 */
  swid?: number;
  /** 板坯长度 */
  slng?: number;
  /** 板坯重量 */
  swet?: number;
  /** 热坯标记 */
  hotFlag?: number;
  /** 短坯标记 */
  shortFlag?: number;
  /** 炼钢炉号 */
  heatNo?: string | null;
  /** 板坯理论重量 */
  calcSwet?: number;
  /** 铸机号 */
  castNo?: string | null;
  /** 铸机流号 */
  castExt?: number;
  /** 锥形坯标记 */
  slabTapFlag?: number;
  /** 锥形坯头尾宽度差 */
  slabTapVal?: number;
  /** 锥形坯头部厚度 */
  slabTapHeadthk?: number;
  /** 锥形坯尾部厚度 */
  slabTapTailthk?: number;
  /** 锥形坯头部厚度开始距离 */
  slabTapThkstartpos?: number;
  /** 锥形坯头部厚度结束距离 */
  slabTapThkendpos?: number;
  /** 锥形坯头部宽度 */
  slabTapHeadwid?: number;
  /** 锥形坯尾部宽度 */
  slabTapTailwid?: number;
  /** 锥形坯头部宽度开始距离 */
  slabTapWidstartpos?: number;
  /** 锥形坯尾部宽度开始距离 */
  slabTapWidendpos?: number;
  /** 化学成分有效标记 */
  chemValidFlag?: number;
  /** 铝百分比 */
  fPcntal?: number;
  /** 砷百分比 */
  fPcntas?: number;
  /** 硼百分比 */
  fPcntb?: number;
  /** 铍百分比 */
  fPcntbe?: number;
  /** 铋百分比 */
  fPcntbi?: number;
  /** 碳百分比 */
  fPcntc?: number;
  /** 钙百分比 */
  fPcntca?: number;
  /** 铌(Nb)百分比 */
  fPcntnb?: number;
  /** 镉百分比 */
  fPcntcd?: number;
  /** 铈百分比 */
  fPcntce?: number;
  /** 钴百分比 */
  fPcntco?: number;
  /** 铬百分比 */
  fPcntcr?: number;
  /** 铜百分比 */
  fPcntcu?: number;
  /** 铁百分比 */
  fPcntfe?: number;
  /** 镓百分比 */
  fPcntga?: number;
  /** 锗百分比 */
  fPcntge?: number;
  /** 氢百分比 */
  fPcnth?: number;
  /** 锂百分比 */
  fPcntli?: number;
  /** 镁百分比 */
  fPcntmg?: number;
  /** 锰百分比 */
  fPcntmn?: number;
  /** 钼百分比 */
  fPcntmo?: number;
  /** 氮百分比 */
  fPcntn?: number;
  /** 钠百分比 */
  fPcntna?: number;
  /** 镍百分比 */
  fPcntni?: number;
  /** 氧百分比 */
  fPcnto?: number;
  /** 磷百分比 */
  fPcntp?: number;
  /** 铅百分比 */
  fPcntpb?: number;
  /** 稀土百分比 */
  fPcntr?: number;
  /** 硫百分比 */
  fPcnts?: number;
  /** 锑百分比 */
  fPcntsb?: number;
  /** 硒百分比 */
  fPcntse?: number;
  /** 硅百分比 */
  fPcntsi?: number;
  /** 锡百分比 */
  fPcntsn?: number;
  /** 钽百分比 */
  fPcntta?: number;
  /** 碲百分比 */
  fPcntte?: number;
  /** 钛百分比 */
  fPcntti?: number;
  /** 钒百分比 */
  fPcntv?: number;
  /** 钨百分比 */
  fPcntw?: number;
  /** 锌百分比 */
  fPcntzn?: number;
  /** 锆百分比 */
  fPcntzr?: number;
  /** 酸溶铝百分比 */
  fPcntsolal?: number;
  /** 酸溶硼百分比 */
  fPcntsolb?: number;
  /** 碳当量百分比 */
  fPcntceq?: number;
  /** 稀土百分比 */
  fPcntre?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: any;
}


/** TiE3000（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE3000 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 消息排序号 */
  nOrder?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: number;
  /** 机组代码 */
  plantCode?: string | null;
  /** 计划提料号 */
  planId?: string | null;
  /** 照合的板坯号 */
  slabNo?: string | null;
  /** 实测板坯宽度 */
  measWidth?: number;
  /** 实测板坯长度 */
  measLength?: number;
  /** 实测板坯重量 */
  measWeight?: number;
  /** 实测板坯温度 */
  measTemp?: number;
  /** 分配加热炉号 */
  furNo?: number;
  /** 分配加热炉列 */
  furRow?: number;
  /** 自动照合标记 */
  autoCheckFlag?: number;
  /** 照合时间 */
  checkTime?: string | null;
}


/** TiE3020（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE3020 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 消息排序号 */
  nOrder?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: number;
  /** 机组代码 */
  plantCode?: string | null;
  /** 计划提料号 */
  planId?: string | null;
  /** 板坯号 */
  slabNo?: string | null;
  /** 出炉时刻 */
  extractTime?: string | null;
  /** 在炉时间 */
  inFurTime?: number;
  /** 出炉温度 */
  extractTemp?: number;
  /** 炉号 */
  furNo?: number;
  /** 炉列 */
  fueRow?: number;
}


/** TiE3030（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE3030 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 消息排序号 */
  nOrder?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: number;
  /** 机组代码 */
  plantCode?: string | null;
  /** 计划提料号 */
  planId?: string | null;
  /** 板坯号 */
  slabNo?: string | null;
  /** 剔料标志 */
  deleteFlag?: number;
}


/** TiE3040（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE3040 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 消息排序号 */
  nOrder?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: number;
  /** 机组代码 */
  plantCode?: string | null;
  /** 板坯号 */
  slabNo?: string | null;
  /** 钢卷号 */
  coilNo?: string | null;
  /** 钢卷重量 */
  coilWeight?: number;
}


/** TiE4000（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE4000 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 消息排序号 */
  nOrder?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: number;
  /** 机组代码 */
  plantCode?: string | null;
  /** 计划提料号 */
  planId?: string | null;
  /** 板坯号 */
  slabNo?: string | null;
  /** 钢卷号 */
  coilNo?: string | null;
  /** 炉次号 */
  heatNo?: string | null;
  /** 钢种名称 */
  steelGrade?: string | null;
  /** 钢种序号 */
  sgId?: number;
  /** 钢族序号 */
  sgFamily?: number;
  /** 钢卷状态 */
  completeStatus?: number;
  /** 钢卷类型 */
  coilType?: number;
  /** 班组 */
  groupName?: number;
  /** 班次 */
  shiftName?: number;
  /** 加热炉号 */
  fceNo?: number;
  /** 加热炉列 */
  fceRow?: number;
  /** 出炉实际温度 */
  extractTemp?: number;
  /** 粗轧道次 */
  rmPass?: number;
  /** 粗轧中间坯目标厚度 */
  rmthkAim?: number;
  /** 成品目标厚度 */
  cthkAim?: number;
  /** 成品实际厚度 */
  cthkAct?: number;
  /** 成品目标宽度 */
  cwidAim?: number;
  /** 成品实绩宽度 */
  cwidAct?: number;
  /** 精轧目标温度 */
  fmtempAim?: number;
  /** 精轧实测温度 */
  fmtempAct?: number;
  /** 成品目标凸度 */
  ccrnAim?: number;
  /** 成品实测凸度 */
  ccrnAct?: number;
  /** 成品目标平直度 */
  cflatAim?: number;
  /** 成品实测平直度 */
  cflatAct?: number;
  /** 成品目标楔形 */
  cwedgeAim?: number;
  /** 成品实测楔形 */
  cwedgeAct?: number;
  /** 卷取目标温度 */
  ctAim?: number;
  /** 卷取实测温度 */
  ctAct?: number;
  /** 卷取机号 */
  dcNo?: number;
  /** 钢卷理论长度 */
  coilLength?: number;
  /** 钢卷理论重量 */
  calcWeight?: number;
  /** 入炉时刻 */
  chargeTime?: string | null;
  /** 出炉时刻 */
  extractTime?: string | null;
  /** 进入粗轧时刻，粗轧第一道次咬钢 */
  rmputime?: string | null;
  /** 离开粗轧时刻，粗轧最后一道次抛钢 */
  rmdotime?: string | null;
  /** f1咬钢时刻 */
  f1putime?: string | null;
  /** f7抛钢时刻 */
  f7dotime?: string | null;
  /** 卷取开始时刻 */
  dcputime?: string | null;
  /** 卷取结束时刻 */
  dcdotime?: string | null;
  /** 轧制完成时刻 */
  completeTime?: string | null;
  /** 热卷箱使用标记 */
  coilboxUseflag?: number;
  /** 冷却模式 */
  coolingMode?: number;
  /** 粗轧入口温度 */
  rmEntrytemp?: number;
  /** 粗轧出口温度 */
  rmExtemp?: number;
  /** 粗轧出口宽度 */
  rmExwidth?: number;
  /** 精轧入口温度 */
  fmEntrytemp?: number;
  /** 立辊1道次实绩轧制力 */
  frIndep1?: number;
  /** 立辊3道次实绩轧制力 */
  frIndep2?: number;
  /** 立辊5道次实绩轧制力 */
  frIndep3?: number;
  /** 立辊7道次实绩轧制力 */
  frIndep4?: number;
  /** 粗轧1道次实绩轧制力 */
  frIndrmp1?: number;
  /** 粗轧2道次实绩轧制力 */
  frIndrmp2?: number;
  /** 粗轧3道次实绩轧制力 */
  frIndrmp3?: number;
  /** 粗轧4道次实绩轧制力 */
  frIndrmp4?: number;
  /** 粗轧5道次实绩轧制力 */
  frIndrmp5?: number;
  /** 粗轧6道次实绩轧制力 */
  frIndrmp6?: number;
  /** 粗轧7道次实绩轧制力 */
  frIndrmp7?: number;
  /** f1实绩轧制力 */
  frIndf1?: number;
  /** f2实绩轧制力 */
  frIndf2?: number;
  /** f3实绩轧制力 */
  frIndf3?: number;
  /** f4实绩轧制力 */
  frIndf4?: number;
  /** f5实绩轧制力 */
  frIndf5?: number;
  /** f6实绩轧制力 */
  frIndf6?: number;
  /** f7实绩轧制力 */
  frIndf7?: number;
  /** f1实绩弯辊力 */
  fbIndf1?: number;
  /** f2实绩弯辊力 */
  fbIndf2?: number;
  /** f3实绩弯辊力 */
  fbIndf3?: number;
  /** f4实绩弯辊力 */
  fbIndf4?: number;
  /** f5实绩弯辊力 */
  fbIndf5?: number;
  /** f6实绩弯辊力 */
  fbIndf6?: number;
  /** f7实绩弯辊力 */
  fbIndf7?: number;
}


/** TiE5000（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE5000 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 机组代码 */
  plantCode?: string | null;
  /** 机架号 */
  standNo?: string | null;
  /** 轧辊类型er */
  rollType?: string | null;
  /** 换上换下辊 */
  rollOperateFlag?: number;
  /** 卸辊原因 */
  rollChangeReason?: string | null;
  /** 卸辊时刻 */
  rollChangeTime?: string | null;
  /** 班次 */
  shiftNo?: string | null;
  /** 班组 */
  groupNo?: string | null;
  /** 上辊号 */
  upRollId?: string | null;
  /** 上辊轧制公里数 */
  upRolledLength?: number;
  /** 上辊轧制吨数 */
  upRolledWeight?: number;
  /** 上辊生产时间 */
  upTime?: string | null;
  /** 上辊轧制块数 */
  upRolledNum?: number;
  /** 下辊号 */
  lowRollId?: string | null;
  /** 下辊轧制公里数 */
  lowRolledLength?: number;
  /** 下辊轧制吨数 */
  lowRolledWeight?: number;
  /** 下辊生产时间 */
  lowTime?: string | null;
  /** 下辊轧制块数 */
  lowRolledNum?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: number;
}


/** TiE5010（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE5010 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 机组代码 */
  plantCode?: string | null;
  /** 机架号 */
  standNo?: string | null;
  /** 轧辊类型er */
  rollType?: string | null;
  /** 轧辊号（上辊） */
  upRollId?: string | null;
  /** 轧辊材质（上辊） */
  upMat?: number;
  /** 轧辊辊型（上辊） */
  upShape?: number;
  /** 是否高速辊（上辊） */
  upFlag?: number;
  /** 轧辊辊径（上辊） */
  upDiameter?: number;
  /** 轧辊凸度（上辊） */
  upCrown?: number;
  /** 轧辊号（下辊） */
  lowRollId?: string | null;
  /** 轧辊材质（下辊） */
  lowMat?: number;
  /** 轧辊辊型（下辊） */
  lowShape?: number;
  /** 是否高速辊（下辊） */
  lowFlag?: number;
  /** 轧辊辊径（下辊） */
  lowDiameter?: number;
  /** 轧辊凸度（下辊） */
  lowCrown?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: number;
}


/** TiE8080（DDH.Service.Interface.Entities.BKMSK） */
export interface TiE8080 {
  selected?: boolean;
  /** 主键 */
  id?: string | null;
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 传动IN102 */
  e35N102?: number;
  /** 传动IIN202 */
  e35N202?: number;
  /** 动力IIN402 */
  e35N402?: number;
  /** 动力IN302 */
  e35N302?: number;
  /** 加热炉煤气 */
  fceTotGas?: number;
  /** 水耗总管 */
  wpLfpsIfw?: number;
  /** 浊环中水 */
  wpTurbMak?: number;
  /** 西皋水 */
  wpLfpsXgMak?: number;
  /** 生活补水 */
  wpLfpsLifeMak?: number;
  /** 层流中水 */
  wpLfpsMak?: number;
  /** 加热炉氮气 */
  fceNitrogen?: number;
  /** 加热炉压缩空气 */
  fceCompAir?: number;
  /** 时间 */
  dHour?: string | null;
}


/** Tie3010Dto（DDH.Service.SMP.Dto） */
export interface Tie3010Dto {
  /** 创建人 */
  creator?: string | null;
  /** 创建时间 */
  createTime?: string | null;
  /** 最后修改人 */
  lastModifier?: string | null;
  /** 最后修改时间 */
  lastModifyTime?: string | null;
  /** 消息排序号 */
  nOrder?: number;
  /** 读取时间 */
  readTime?: string | null;
  /** 读取状态 */
  readStatus?: number;
  /** 机组代码 */
  plantCode?: string | null;
  /** 计划提料号 */
  planId?: string | null;
  /** 板坯号 */
  slabNo?: string | null;
  /** 装炉时刻 */
  chargeTime?: string | null;
  /** 炉号 */
  furNo?: number;
  /** 炉列 */
  furRow?: number;
  /** 喷印号 */
  c_PRINT_CODE?: string | null;
  /** 钢种 */
  c_SG_CODE?: string | null;
  /** 执行标准 */
  c_SG_STD?: string | null;
  /** 厚度 */
  n_THICK?: number;
  /** 宽度 */
  n_WTH?: number;
  /** 长度 */
  n_LEN?: number;
  /** 规格 */
  c_SPEC?: string | null;
  /** 支数 */
  n_NUM?: number;
  /** 理重 */
  n_CAL_WGT?: number;
  /** 实重 */
  n_WGT?: number;
  /** 板坯号 */
  c_PIECE_NO_SLAB?: string | null;
  /** 炉号 */
  c_STOVE?: string | null;
  /** 件次号 */
  c_PIECE_NO?: string | null;
  /** 产线 */
  c_LINE_CODE?: string | null;
  /** 工序代码 */
  c_PROC?: string | null;
  /** 机台号 */
  c_MACHINE?: string | null;
}


export const e1000Api = {
  /** 查询工艺列表（原 Svc<IE1000AppService>.Proxy.QueryList(key)） */
  queryList(key?: string) {
    return requestClient.request<TiE1000[]>(
      "/dDH.Service.SHR.Services/e1000/queryList",
      { method: "post", params: { key } },
    );
  },
  /** 查询轧制计划 */
  queryTiE2000List(data?: PlanQueryDto) {
    return requestClient.request<TiE2000[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE2000List",
      { method: "post", data },
    );
  },
  /** 查询板坯数据 */
  queryTiE2051List(data?: PlanQueryDto) {
    return requestClient.request<TiE2051[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE2051List",
      { method: "post", data },
    );
  },
  /** 查询板坯照合实绩 */
  queryTiE3000List(data?: PlanQueryDto) {
    return requestClient.request<TiE3000[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE3000List",
      { method: "post", data },
    );
  },
  /** 查询装炉实绩 */
  queryTiE3010List(data?: PlanQueryDto) {
    return requestClient.request<Tie3010Dto[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE3010List",
      { method: "post", data },
    );
  },
  /** 查询出炉实绩 */
  queryTiE3020List(data?: PlanQueryDto) {
    return requestClient.request<TiE3020[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE3020List",
      { method: "post", data },
    );
  },
  /** 查询剔料实绩 */
  queryTiE3030List(data?: PlanQueryDto) {
    return requestClient.request<TiE3030[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE3030List",
      { method: "post", data },
    );
  },
  /** 查询钢卷称重实绩 */
  queryTiE3040List(data?: PlanQueryDto) {
    return requestClient.request<TiE3040[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE3040List",
      { method: "post", data },
    );
  },
  /** 查询钢卷生产实绩 */
  queryTiE4000List(data?: PlanQueryDto) {
    return requestClient.request<TiE4000[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE4000List",
      { method: "post", data },
    );
  },
  /** 查询轧辊实绩 */
  queryTiE5000List(data?: PlanQueryDto) {
    return requestClient.request<TiE5000[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE5000List",
      { method: "post", data },
    );
  },
  /** 查询备辊数据 */
  queryTiE5010List(data?: PlanQueryDto) {
    return requestClient.request<TiE5010[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE5010List",
      { method: "post", data },
    );
  },
  /** 查询称重（能耗）实绩 */
  queryTiE8080List(data?: PlanQueryDto) {
    return requestClient.request<TiE8080[]>(
      "/dDH.Service.SHR.Services/e1000/queryTiE8080List",
      { method: "post", data },
    );
  },
};

export const bkmskApi = {
  /** 处理产出实绩（原 Svc<IBkmskAppService>.Proxy.HandleSSLog） */
  handleSSLog(data?: TiE3040) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BKMSK/bkmsk/handleSSLog",
      { method: "post", data },
    );
  },
};

/* ===================== 批次3 HR9xxx 实绩查询组 ===================== */

export interface Thr3010Dto {
  /** 选择 */ selected: boolean;
  /** 主键 */ id: string;
  /** 创建人 */ creator: string;
  /** 创建时间 */ createTime?: string;
  /** 最后修改人 */ lastModifier: string;
  /** 最后修改时间 */ lastModifyTime?: string;
  /** THR2000主键 */ cOrderId: string;
  /** THR3000主键 */ cZpId: string;
  /** TYD2000主键 */ cSlabId: string;
  /** 产线代码 */ cLineCode: string;
  /** L2计划状态 */ nL2Status: number;
  /** 当前位置 */ cPos: string;
  /** 生产顺序号 */ nOrder?: number;
  /** 提料计划号 */ cOrderNo: string;
  /** 批号 */ cBatchNo: string;
  /** 炉号 */ cStove: string;
  /** 组批号 */ cBatchOrder: string;
  /** 钢板号 */ cPlateNo: string;
  /** 件次号 */ cPieceNo: string;
  /** 喷印号 */ cPrintCode: string;
  /** 是否取样板 */ cIsQy: string;
  /** 取样时间 */ sampleTime: string;
  /** 取样位置 */ samplePos: string;
  /** 取样长度 */ sampleLth?: number;
  /** 坯料钢种 */ cSgCode: string;
  /** 坯料标准 */ cSgStd: string;
  /** 坯料规格 */ cSpec: string;
  /** 坯厚 */ nThick?: number;
  /** 坯宽 */ nWidth?: number;
  /** 坯长 */ nLen?: number;
  /** 坯重 */ nWgt?: number;
  /** 称重重量 */ nWgtCz?: number;
  /** 铸坯标识 */ cBilletTypeCode: string;
  /** 装炉方式 */ nFurType: number;
  /** 装炉温度 */ slabFurBefTemp?: number;
  /** 加热1段平均温度 */ ht1AveTemp?: number;
  /** 加热2段平均温度 */ ht2AveTemp?: number;
  /** 均热段平均温度 */ eqAveTemp?: number;
  /** 装炉时间 */ dSlabFurTime?: string;
  /** 抽出时间 */ dOutTime?: string;
  /** 在炉时间 */ nInFur?: number;
  /** 生产备注 */ cProRemark: string;
  /** 特殊要求 */ cConRemark: string;
  /** 订单钢种 */ cSgCodePlan: string;
  /** 订单标准 */ cSgStdPlan: string;
  /** 轧制规格 */ cSpecPlan: string;
  /** 轧制厚度 */ nThickPlan?: number;
  /** 轧制宽度 */ nWidthPlan?: number;
  /** 轧制长度 */ nLenPlan?: number;
  /** 客户名称 */ cCustName: string;
  /** 订单号1 */ cOrderNo1: string;
  /** 订单号2 */ cOrderNo2: string;
  /** 订单号3 */ cOrderNo3: string;
  /** 订单号4 */ cOrderNo4: string;
  /** 套切1 */ nLenTq1?: number;
  /** 套切2 */ nLenTq2?: number;
  /** 套切3 */ nLenTq3?: number;
  /** 套切4 */ nLenTq4?: number;
  /** 入库标识1 */ cInboundNo1: string;
  /** 入库标识2 */ cInboundNo2: string;
  /** 入库标识3 */ cInboundNo3: string;
  /** 入库标识4 */ cInboundNo4: string;
  /** 倍尺 */ nBc?: number | null;
  /** 是否工程单 */ cIsGcd: string;
  /** 计划支数 */ nQuaPlan: number;
  /** 计划重量 */ nWgtPlan: number;
  /** 订单重量 */ nWgtOrder: number;
  /** 边部宽度余量 */ nWidthWgt?: number;
  /** 切边方式 */ cTrimFlag: string;
  /** 探伤等级 */ cFlawDesc: string;
  /** 性能要求 */ cSpecialMarkGy: string;
  /** 流向 */ cDelivyAddress: string;
  /** 公差 */ cTol: string;
  /** 厚度下限 */ nThickMin?: number;
  /** 厚度上限 */ nThickMax?: number;
  /** 需要堆冷 */ cDn: string;
  /** 牌号 */ steelGrade: string;
  /** 出炉时间 */ dischargeTime: string;
  /** 轧制开始时间 */ rollingTimeStart: string;
  /** 轧制结束时间 */ rollingTimeEnd: string;
  /** 出炉时间 */ dDischargeTime?: string;
  /** 轧制开始时间 */ dRollingTimeStart?: string;
  /** 轧制结束时间 */ dRollingTimeEnd?: string;
  /** 生产时间 */ dProductTime?: string;
  /** CR代码 */ crCode?: number;
  /** 总轧制时间s */ totalRollingTime?: number;
  /** 粗轧总轧制道次数 */ rmPass?: number;
  /** 精轧总轧制道次数 */ fmPass?: number;
  /** 误轧制标记 */ rollingStatus: string;
  /** 轧制厚度（计算） */ exitThick?: number;
  /** 待温厚度 */ dwThick?: number;
  /** 轧制宽度（计算） */ exitWidth?: number;
  /** 轧制长度（计算） */ exitLength?: number;
  /** 轧制操作人员代码（改规标记1） */ operateUserCode: string;
  /** 钢板凸度（um) */ crownMark: string;
  /** 厚度（工作侧）测厚仪 */ meaThickWs?: number;
  /** 厚度（传动侧）测厚仪 */ meaThickDs?: number;
  /** 厚度（中部）测厚仪 */ thickHp?: number;
  /** 除鳞后温度（平均） */ hsbExitTempAvg?: number;
  /** 除鳞后温度（最大） */ hsbExitTempMax?: number;
  /** 粗轧开轧温度目标 */ rmEntTempTar?: number;
  /** 粗轧开轧温度（计算） */ rmEntTempCal?: number;
  /** 粗轧开轧温度（测量平均） */ rmEntTempAvg?: number;
  /** 粗轧开轧温度（测量最小） */ rmEntTempMin?: number;
  /** 粗轧开轧温度（测量最大） */ rmEntTempMax?: number;
  /** 粗轧开轧温度（测量偏差） */ rmEntTempDev?: number;
  /** 粗轧终轧温度（计算） */ rmExitTempCal?: number;
  /** 粗轧终轧温度（测量平均） */ rmExitTempAvg?: number;
  /** 粗轧终轧温度（测量最小） */ rmExitTempMin?: number;
  /** 粗轧终轧温度（测量最大） */ rmExitTempMax?: number;
  /** 粗轧终轧温度（测量偏差） */ rmExitTempDev?: number;
  /** 粗轧开始厚度（计算） */ rmEntThick?: number;
  /** 精轧开轧温度目标 */ fmEntTempTar?: number;
  /** 精轧开轧温度（计算） */ fmEntTempCal?: number;
  /** 精轧开轧温度（测量平均） */ fmEntTempAvg?: number;
  /** 精轧开轧温度（测量最小） */ fmEntTempMin?: number;
  /** 精轧开轧温度（测量最大） */ fmEntTempMax?: number;
  /** 精轧开轧温度（测量偏差） */ fmEntTempDev?: number;
  /** 终轧温度目标 */ fmExitTempTar?: number;
  /** 精轧终轧温度（计算） */ fmExitTempCal?: number;
  /** 精轧终轧温度（测量平均） */ fmExitTempAvg?: number;
  /** 精轧终轧温度（测量最小） */ fmExitTempMin?: number;
  /** 精轧终轧温度（测量最大） */ fmExitTempMax?: number;
  /** 精轧终轧温度（测量偏差） */ fmExitTempDev?: number;
  /** 精轧开始厚度（计算） */ fmEntThick?: number;
  /** 班次 */ shiftNo: string;
  /** 班组 */ shiftGroup: string;
  /** 生产时间 */ productTime: string;
  /** 责任者 */ author: string;
  /** 板坯实际重量 */ slabWeight?: number;
  /** 粗轧责任者A */ rmAuthorA: string;
  /** 粗轧责任者B */ rmAuthorB: string;
  /** 精轧责任者A */ fmAuthorA: string;
  /** 精轧责任者B */ fmAuthorB: string;
  /** 理论成材率 */ nCcl?: number;
  /** 预矫总次数 */ totalPass?: number;
  /** 预矫进入时间 */ entryTime: string;
  /** 预矫结束时间 */ endTime: string;
  /** 预矫钢板温度 */ entryTemp?: number;
  /** 预矫速度 */ levelerSpeed?: number;
  /** 预矫咬入速度 */ bitSpeed?: number;
  /** 预矫入口辊缝 */ entryGap?: number;
  /** 预矫出口辊缝 */ exitGap?: number;
  /** 预矫入口边辊高度 */ entrySideRollGap?: number;
  /** 预矫出口边辊高度 */ exitSideRollGap?: number;
  /** 预矫倾斜量 */ tilt1?: number;
  /** 预矫倾动量 */ tilt2?: number;
  /** 预矫预矫力 */ l2Force?: number;
  /** 预矫弯辊量 */ bendPosition?: number;
  /** 预矫扭矩 */ torqueMotor?: number;
  /** 预矫是否空过 */ emptyFlag?: number;
  /** 冷却模式 */ coolMode: number;
  /** 开冷时间 */ startCoolTime: string;
  /** 终冷时间 */ finishCoolTime: string;
  /** 轧后平均温度 */ rollAveTemp: number;
  /** 轧后温度最大值 */ rollMaxTemp: number;
  /** 轧后温度最小值 */ rollMinTemp: number;
  /** 开冷平均温度 */ entryAveTemp: number;
  /** 开冷最大温度 */ entryMaxTemp: number;
  /** 开冷最小温度 */ entryMinTemp: number;
  /** 目标返红温度 */ targetFinishTemp: number;
  /** 实测下表返红温度 */ nTempXb?: number;
  /** 返红平均温度 */ finishAveTemp: number;
  /** 返红温度最大 */ finishMaxTemp: number;
  /** 返红温度最小 */ finishMinTemp: number;
  /** 扫描高温计平均温度 */ scanAveTemp: number;
  /** 扫描高温计最大温度 */ scanMaxTemp: number;
  /** 扫描高温计最小温度 */ scanMinTemp: number;
  /** 实际冷速 */ coolingRate: number;
  /** A区设定流量 */ fluxA: number;
  /** B区设定流量 */ fluxB: number;
  /** A区实际流量 */ actFluxA: number;
  /** B区实际流量 */ actFluxB: number;
  /** A区设定水比 */ ratioA: number;
  /** B区设定水比 */ ratioB: number;
  /** A区实际水比 */ actRatioA: number;
  /** B区实际水比 */ actRatioB: number;
  /** 设定辊速 */ speed: number;
  /** 实际辊速 */ actSpeed: number;
  /** 设定加速度 */ aspd?: number;
  /** 实际加速度 */ actAspd?: number;
  /** 开启集管组数 */ num: number;
  /** 1-28集管上流量 */ uppipeFlow: number[];
  /** 1-28集管下流量 */ botpipeFlow: number[];
  /** 1-10边腔流量 */ sideCavityFlow1: number[];
  /** 侧喷 */ sideSpary: string;
  /** 中喷 */ midSpary: string;
  /** 头尾遮蔽投入信号 */ hTSIS: number;
  /** 头上长度 */ headUpLength: number;
  /** 头下长度 */ headBotLength: number;
  /** 头上系数 */ headUpCoef: number;
  /** 头下系数 */ headBotCoef: number;
  /** 尾上长度 */ tailUpLength: number;
  /** 尾下长度 */ tailBotLength: number;
  /** 尾上系数 */ tailUpCoef: number;
  /** 尾下系数 */ tailBotCoef: number;
  /** 压辊高度A1-10prh */ prh: number[];
  /** 电降平台bcd */ eLPBCD: number[];
  /** 水温 */ tempWater: number;
  /** 水压 */ pressWater: number;
  /** 备用 */ iSpare: number[];
  /** 备用 */ fSpare: number[];
  /** 总水量 */ total_flow: number;
  /** 是否投用自动 */ isAutoUse?: number;
  /** 热矫总次数 */ totalPassRj?: number;
  /** 热矫进入时间 */ entryTimeRj: string;
  /** 热矫结束时间 */ endTimeRj: string;
  /** 热矫钢板温度 */ entryTempRj?: number;
  /** 热矫速度 */ levelerSpeedRj?: number;
  /** 热矫咬入速度 */ bitSpeedRj?: number;
  /** 热矫入口辊缝 */ entryGapRj?: number;
  /** 热矫出口辊缝 */ exitGapRj?: number;
  /** 热矫入口边辊高度 */ entrySideRollGapRj?: number;
  /** 热矫出口边辊高度 */ exitSideRollGapRj?: number;
  /** 热矫倾斜量 */ tilt1Rj?: number;
  /** 热矫倾动量 */ tilt2Rj?: number;
  /** 热矫矫直力 */ l2ForceRj?: number;
  /** 热矫弯辊量 */ bendPositionRj?: number;
  /** 热矫扭矩 */ torqueMotorRj?: number;
  /** 热矫是否空过 */ emptyFlagRj?: number;
}

export interface TiL2me01Dto {
  /** 主键 */ id: string;
  /** 创建人 */ creator: string;
  /** 创建时间 */ createTime?: string;
  /** 最后修改人 */ lastModifier: string;
  /** 最后修改时间 */ lastModifyTime?: string;
  /** 钢板号 */ plateNo: string;
  /** 板坯号 */ slabNo: string;
  /** 位置 */ zone: string;
  /** 异常原因 */ reason: string;
  /** 当前实际道次号 */ actPassNo?: number;
  /** 当前厚度 */ actThick?: number;
  /** 当前宽度 */ actWidth?: number;
  /** 当前长度 */ actLength?: number;
  /** 班次 */ shiftNo: string;
  /** 班组 */ shiftGroup: string;
  /** 生产时间 */ productTime: string;
  /** 责任者 */ author: string;
  /** 板坯实际重量 */ slabWeight?: number;
  /** 处理时间 */ dHandle?: string;
  /** 处理结果 */ nStatus?: number;
  /** 责任者 */ discAuthor: string;
  /** 粗轧责任者A */ rmAuthorA: string;
  /** 粗轧责任者B */ rmAuthorB: string;
  /** 精轧责任者A */ fmAuthorA: string;
  /** 精轧责任者B */ fmAuthorB: string;
  /** 生产时间 */ dProductTime?: string;
  /** 坯料钢种 */ cSgCode: string;
  /** 坯料标准 */ cSgStd: string;
  /** 坯料规格 */ cSpec: string;
  /** 坯厚 */ nThick?: number;
  /** 坯宽 */ nWidth?: number;
  /** 坯长 */ nLen?: number;
  /** 加热炉号 */ furNo?: number;
  /** 列号 */ rowNo?: number;
  /** 预留（照核长度） */ spare2?: number;
  /** 预留（炉前称重） */ spare3?: number;
  /** 照核长度 */ spare4?: number;
  /** 照核宽度 */ spare5?: number;
  /** 照核厚度 */ spare6?: number;
  /** 计划钢种 */ cSgCodePlan: string;
  /** 计划标准 */ cSgStdPlan: string;
  /** 轧制规格 */ cSpecPlan: string;
  /** 轧制厚度 */ nThickPlan?: number;
  /** 轧制宽度 */ nWidthPlan?: number;
  /** 轧制长度 */ nLenPlan?: number;
  /** 订单号1 */ cOrderNo1: string;
  /** 订单号2 */ cOrderNo2: string;
  /** 订单号3 */ cOrderNo3: string;
  /** 订单号4 */ cOrderNo4: string;
  /** 订单号5 */ cOrderNo5: string;
  /** 订单号6 */ cOrderNo6: string;
  /** 套切长度1 */ nLenPlan1?: number;
  /** 套切长度2 */ nLenPlan2?: number;
  /** 套切长度3 */ nLenPlan3?: number;
  /** 套切长度4 */ nLenPlan4?: number;
  /** 套切长度5 */ nLenPlan5?: number;
  /** 套切长度6 */ nLenPlan6?: number;
  /** 入库标识1 */ cInboundNo1: string;
  /** 入库标识2 */ cInboundNo2: string;
  /** 入库标识3 */ cInboundNo3: string;
  /** 入库标识4 */ cInboundNo4: string;
  /** 入库标识5 */ cInboundNo5: string;
  /** 入库标识6 */ cInboundNo6: string;
  /** 倍尺 */ nBc?: number;
  /** 是否工程单 */ cIsGcd: string;
  /** 切边方式 */ cTrimFlag: string;
  /** 探伤等级 */ cFlawDesc: string;
  /** 性能要求 */ cSpecialMarkGy: string;
  /** 流向 */ cDelivyAddress: string;
  /** 公差 */ cTol: string;
  /** 合同备注 */ cConRemark: string;
}

export interface TiL2me08Dto {
  /** 选择 */ selected?: boolean;
  /** 主键 */ id: string;
  /** 创建人 */ creator: string;
  /** 创建时间 */ createTime?: string;
  /** 最后修改人 */ lastModifier: string;
  /** 最后修改时间 */ lastModifyTime?: string;
  /** 板坯号 */ slabNo: string;
  /** 矫直总次数 */ totalPass?: number;
  /** 矫直当前次数 */ currPass?: number;
  /** 进入时间 */ entryTime: string;
  /** 结束时间 */ endTime: string;
  /** 钢板温度 */ entryTemp?: number;
  /** 矫直速度 */ levelerSpeed?: number;
  /** 咬入速度 */ bitSpeed?: number;
  /** 入口辊缝 */ entryGap?: number;
  /** 出口辊缝 */ exitGap?: number;
  /** 入口边辊高度 */ entrySideRollGap?: number;
  /** 出口边辊高度 */ exitSideRollGap?: number;
  /** 倾斜量 */ tilt1?: number;
  /** 倾动量 */ tilt2?: number;
  /** 矫直力 */ l2Force?: number;
  /** 弯辊量 */ bendPosition?: number;
  /** 扭矩 */ torqueMotor?: number;
  /** 是否空过 */ emptyFlag?: number;
  /** 预留 */ spare?: number;
  /** 处理时间 */ dHandle?: string;
  /** 处理结果 */ nStatus?: number;
  /** 组批号 */ cBatchOrder: string;
  /** 铸坯标识 */ cBilletTypeCode: string;
  /** 生产备注 */ cProRemark: string;
}

export interface TiL2me09Dto {
  /** 选择 */ selected?: boolean;
  /** 主键 */ id: string;
  /** 创建人 */ creator: string;
  /** 创建时间 */ createTime?: string;
  /** 最后修改人 */ lastModifier: string;
  /** 最后修改时间 */ lastModifyTime?: string;
  /** 板坯号 */ slabNo: string;
  /** 矫直总次数 */ totalPass?: number;
  /** 矫直当前次数 */ currPass?: number;
  /** 进入时间 */ entryTime: string;
  /** 结束时间 */ endTime: string;
  /** 钢板温度 */ entryTemp?: number;
  /** 矫直速度 */ levelerSpeed?: number;
  /** 咬入速度 */ bitSpeed?: number;
  /** 入口辊缝 */ entryGap?: number;
  /** 出口辊缝 */ exitGap?: number;
  /** 入口边辊高度 */ entrySideRollGap?: number;
  /** 出口边辊高度 */ exitSideRollGap?: number;
  /** 倾斜量 */ tilt1?: number;
  /** 倾动量 */ tilt2?: number;
  /** 矫直力 */ l2Force?: number;
  /** 弯辊量 */ bendPosition?: number;
  /** 扭矩 */ torqueMotor?: number;
  /** 是否空过 */ emptyFlag?: number;
  /** 预留 */ spare?: number;
  /** 处理时间 */ dHandle?: string;
  /** 处理结果 */ nStatus?: number;
  /** 进入时间 */ dEntryTime?: string;
  /** 结束时间 */ dEndTime?: string;
  /** 组批号 */ cBatchOrder: string;
  /** 铸坯标识 */ cBilletTypeCode: string;
  /** 生产备注 */ cProRemark: string;
}

export interface TiL2me11Dto {
  /** 订货客户中文名称 */ cOrderCustCname: string;
  /** 合同备注 */ cConRemark: string;
  /** 组批号 */ cBatchOrder: string;
  /** 材料号 */ matNo: string;
  /** 坯厚 */ nThick?: number;
  /** 坯宽 */ nWidth?: number;
  /** 坯长 */ nLen?: number;
  /** 坯重 */ nWgt?: number;
  /** 炉前称重 */ spare3?: number;
  /** 照核长度 */ spare4?: number;
  /** 照核宽度 */ spare5?: number;
  /** 照核厚度 */ spare6?: number;
  /** 订单钢种 */ cSgCodePlan: string;
  /** 订单标准 */ cSgStdPlan: string;
  /** 轧制厚度 */ nThickPlan?: number;
  /** 轧制宽度 */ nWidthPlan?: number;
  /** 轧制长度 */ nLenPlan?: number;
  /** 铸坯标识 */ cBilletTypeCode: string;
  /** 订单号1 */ cOrderNo1: string;
  /** 订单号2 */ cOrderNo2: string;
  /** 订单号3 */ cOrderNo3: string;
  /** 订单号4 */ cOrderNo4: string;
  /** 订单号5 */ cOrderNo5: string;
  /** 订单号6 */ cOrderNo6: string;
  /** 套切1 */ nLenTq1?: number;
  /** 套切2 */ nLenTq2?: number;
  /** 套切3 */ nLenTq3?: number;
  /** 套切4 */ nLenTq4?: number;
  /** 套切5 */ nLenTq5?: number;
  /** 套切6 */ nLenTq6?: number;
  /** 入库标识1 */ cInboundNo1: string;
  /** 入库标识2 */ cInboundNo2: string;
  /** 入库标识3 */ cInboundNo3: string;
  /** 入库标识4 */ cInboundNo4: string;
  /** 入库标识5 */ cInboundNo5: string;
  /** 入库标识6 */ cInboundNo6: string;
  /** 是否工程单 */ cIsGcd: string;
  /** 生产备注 */ cProRemark: string;
  /** 装炉方式 */ nFurType: number;
  /** 板坯装炉时刻 */ slabFurTime: string;
  /** 板坯装炉前温度 */ slabFurBefTemp?: number;
  /** 加热炉号 */ furNo: string;
  /** 道次 */ furType: string;
  /** 入炉班次 */ inFurnaceShiftNo: string;
  /** 入炉班组 */ inFurnaceShiftGroup: string;
  /** 出炉班次 */ outFurnaceShiftNo: string;
  /** 出炉班组 */ outFurnaceShiftGroup: string;
  /** 出钢时板坯平均温度 */ tapSlabTempAve?: number;
  /** 出钢时板坯表面温度 */ tapSlabTempSrfc?: number;
  /** 出钢时板坯中心温度 */ tapSlabTempCt?: number;
  /** 抽出时刻 */ outTime: string;
  /** 抽出平均温度 */ outTempAvg?: number;
  /** 在炉内时间 */ inFurnaceTime?: number;
  /** 预热段入口的平均板坯温度 */ preHtTempAve?: number;
  /** 预热段入口的板坯均热温度 */ preHtHotAve?: number;
  /** 预热段入口的板坯表面温度 */ preHtTempSrf?: number;
  /** 预热段入口的板坯中心温度 */ preHtTempCt?: number;
  /** 在预热段时的平均温度 */ preHtAveTemp?: number;
  /** 预热段在炉时间 */ preHtFurPerd?: number;
  /** 加热段1入口板坯平均温度 */ ht1SlabTempAve?: number;
  /** 加热段1入口板坯均热度 */ ht1SlabHotAve?: number;
  /** 加热段1入口板坯表面温度 */ ht1SlabTempSrfc?: number;
  /** 加热段1入口板坯中心温度 */ ht1SlabTempCt?: number;
  /** 在加热段1时的平均温度 */ ht1AveTemp?: number;
  /** 加热段1在炉时段 */ ht1InFurPerd?: number;
  /** 加热段2入口板坯平均温度 */ ht2SlabTempAve?: number;
  /** 加热段2入口板坯均热度 */ ht2SlabHotAve?: number;
  /** 加热段2入口板坯表面温度 */ ht2SlabTempSrfc?: number;
  /** 加热段2入口板坯中心温度 */ ht2SlabTempCt?: number;
  /** 在加热段2时的平均温度 */ ht2AveTemp?: number;
  /** 加热段2在炉时段 */ ht2InFurPerd?: number;
  /** 均热段入口板坯平均温度 */ eqSlabTempAve?: number;
  /** 均热段入口板坯均热度 */ eqSlabHotAve?: number;
  /** 均热段入口板坯表面温度 */ eqSlabTempSrfc?: number;
  /** 均热段入口板坯中心温度 */ eqSlabTempCt?: number;
  /** 均热段时的平均温度 */ eqAveTemp?: number;
  /** 均热段在炉时段 */ eqInFurPerd?: number;
}

export interface TiL2me14Dto {
  /** 选择 */ selected?: boolean;
  /** 主键 */ id: string;
  /** 创建人 */ creator: string;
  /** 创建时间 */ createTime?: string;
  /** 最后修改人 */ lastModifier: string;
  /** 最后修改时间 */ lastModifyTime?: string;
  /** 处理时间 */ dHandle?: string;
  /** 处理结果 */ nStatus?: number;
  /** 板坯号 */ slabNo: string;
  /** 钢种 */ steelGrade: string;
  /** 厚度 */ thick: number;
  /** 宽度 */ width: number;
  /** 长度 */ length: number;
  /** 冷却模式 */ coolMode: number;
  /** 开冷时间 */ startCoolTime: string;
  /** 终冷时间 */ finishCoolTime: string;
  /** 轧后平均温度 */ rollAveTemp: number;
  /** 轧后温度最大值 */ rollMaxTemp: number;
  /** 轧后温度最小值 */ rollMinTemp: number;
  /** 开冷平均温度 */ entryAveTemp: number;
  /** 开冷最大温度 */ entryMaxTemp: number;
  /** 开冷最小温度 */ entryMinTemp: number;
  /** 目标返红温度 */ targetFinishTemp: number;
  /** 返红平均温度 */ finishAveTemp: number;
  /** 返红温度最大 */ finishMaxTemp: number;
  /** 返红温度最小 */ finishMinTemp: number;
  /** 实测下表返红温度 */ nTempXb?: number;
  /** 扫描高温计平均温度 */ scanAveTemp: number;
  /** 扫描高温计最大温度 */ scanMaxTemp: number;
  /** 扫描高温计最小温度 */ scanMinTemp: number;
  /** 实际冷速 */ coolingRate: number;
  /** A区设定流量 */ fluxA: number;
  /** B区设定流量 */ fluxB: number;
  /** A区实际流量 */ actFluxA: number;
  /** B区实际流量 */ actFluxB: number;
  /** A区设定水比 */ ratioA: number;
  /** B区设定水比 */ ratioB: number;
  /** A区实际水比 */ actRatioA: number;
  /** B区实际水比 */ actRatioB: number;
  /** 设定辊速 */ speed: number;
  /** 实际辊速 */ actSpeed: number;
  /** 设定加速度 */ aspd?: number;
  /** 实际加速度 */ actAspd?: number;
  /** 开启集管组数 */ num: number;
  /** 1-28集管上流量 */ uppipeFlow: number[];
  /** 1-28集管下流量 */ botpipeFlow: number[];
  /** 1-10边腔流量 */ sideCavityFlow1: number[];
  /** 侧喷 */ sideSpary: string;
  /** 中喷 */ midSpary: string;
  /** 头尾遮蔽投入信号 */ hTSIS: number;
  /** 头上长度 */ headUpLength: number;
  /** 头下长度 */ headBotLength: number;
  /** 头上系数 */ headUpCoef: number;
  /** 头下系数 */ headBotCoef: number;
  /** 尾上长度 */ tailUpLength: number;
  /** 尾下长度 */ tailBotLength: number;
  /** 尾上系数 */ tailUpCoef: number;
  /** 尾下系数 */ tailBotCoef: number;
  /** 压辊高度A1-10prh */ prh: number[];
  /** 电降平台bcd */ eLPBCD: number[];
  /** 水温 */ tempWater: number;
  /** 水压 */ pressWater: number;
  /** 备用 */ iSpare: number[];
  /** 备用 */ fSpare: number[];
  /** 总水量 */ total_flow: number;
  /** 反红温度曲线 */ finishTemp: number[];
  /** 责任者 */ cAuthor: string;
  /** 是否投用自动 */ nIsAutoUse?: number;
  /** 组批号 */ cBatchOrder: string;
  /** 铸坯标识 */ cBilletTypeCode: string;
  /** 生产备注 */ cProRemark: string;
  /** 班组 */ cShiftGroup: string;
  /** 冷却模式 */ cCoolMode: string;
}

export interface QueryHR9060HzDto {
  /** 块数 */ nQua?: number;
  /** 班组 */ cShiftGroup: string;
  /** 责任者 */ author: string;
  /** 块数 */ nKLQua?: number;
  /** 比例 */ nKLRate?: number;
  /** 块数 */ nSLQua?: number;
  /** 比例 */ nSLRate?: number;
  /** 块数 */ nDQQua?: number;
  /** 比例 */ nDQRate?: number;
}

export interface TiL2ME06ItemDto {
  /** 选择 */ selected: boolean;
  /** 组批号（计算列：批号-顺序号） */ zPNo: string;
  /** 主键 */ id: string;
  /** 创建人 */ creator: string;
  /** 最后修改人 */ lastModifier: string;
  /** 最后修改时间 */ lastModifyTime?: string;
  /** 炉号 */ cStove: string;
  /** 件次号 */ cPieceNo: string;
  /** 组批号 */ cBatchOrder: string;
  /** 库存分类 */ nProType: number;
  /** 喷号 */ cPrintCode: string;
  /** 产线 */ cLineCode: string;
  /** 工序代码 */ cProc: string;
  /** 机台号 */ cMachine: string;
  /** 流号 */ cStrandNo: string;
  /** 计划号 */ cPlanId: string;
  /** 合同号 */ cConNo: string;
  /** 订单号 */ cOrderNo: string;
  /** 物料编码 */ cMatCode: string;
  /** 钢种 */ cSgCode: string;
  /** 炼钢钢种 */ cTlSgCode: string;
  /** 执行标准 */ cSgStd: string;
  /** 厚度 */ nThick: number;
  /** 宽度 */ nWth?: number;
  /** 长度 */ nLen?: number;
  /** 规格 */ cSpec: string;
  /** 支数 */ nNum: number;
  /** 理重 */ nCalWgt: number;
  /** 实重 */ nWgt: number;
  /** 产出时间 */ dProTime: string;
  /** 产出人 */ cProUser: string;
  /** 产出班次 */ cShiftNo: string;
  /** 产出班组 */ cGroupNo: string;
  /** 入库时间 */ dInTime?: string;
  /** 入库人 */ cInUser: string;
  /** 出库时间 */ dOutTime?: string;
  /** 出库人 */ cOutUser: string;
  /** 库区号 */ cStoreCode: string;
  /** 垛位号 */ cStackNo: string;
  /** 层号 */ cStackNum: string;
  /** 层号 */ nStackNum?: number;
  /** 吊号 */ nTransferNo?: number;
  /** 原库区号 */ cSourceStoreCode: string;
  /** 原垛位号 */ cSourceStackNo: string;
  /** 原层号 */ cSourceStackNum: string;
  /** 库存状态 */ nStatus: number;
  /** 热送区分 */ cIsHot: string;
  /** 生产备注 */ cProRemark: string;
  /** 模连铸标识 */ nCastDivCode: number;
  /** 占用产线 */ cLockedLine: string;
  /** 占用计划 */ cLockedPlan: string;
  /** 产品大类 */ cMatType: string;
  /** 品名 */ cProdCode: string;
  /** 钢类 */ cSteelType: string;
  /** 交货状态 */ cDelivyStatusCode: string;
  /** 加工用途代码 */ cCustStdCode: string;
  /** 批号 */ cBatchNo: string;
  /** 原始订单号 */ cOrderNoLast: string;
  /** 去向 */ cDestination: string;
  /** 退火炉回号 */ cHotNo: string;
  /** 坯类 */ cSlabType: string;
  /** 板坯号 */ cPieceNoSlab: string;
  /** 取样板标记 */ cIsQy: string;
  /** 钢板分类 */ typeValues: string;
  /** 钢板分类代码 */ typeCodeValues: string[];
  /** 是否满足订单要求 */ cIsMatchOrder: string;
  /** 质量状态 */ nQmStatus: number;
  /** 质量封锁原因 */ nLockReason: string;
  /** 质量等级 */ nQmLevel: number;
  /** 是否表检 */ cIsSurface: string;
  /** 表检结果 */ cSurfaceResult: number;
  /** 表面缺陷代码 */ cSurfaceDefectCode: string;
  /** 表检描述 */ cSurfaceDesc: string;
  /** 表面判定人 */ cSurfaceUser: string;
  /** 表面判定时间 */ dSurfaceTime?: string;
  /** 探伤判定结果 */ cDetectResultCode: number;
  /** 探伤等级 */ cDetectDefectLevel: string;
  /** 探伤判定缺陷代码 */ cDefectDefectCode: string;
  /** 探伤判定缺陷描述 */ cDefectDefectMark: string;
  /** 表面判定人 */ cDefectUser: string;
  /** 表面判定时间 */ dDefectTime?: string;
  /** 委托自动判定结果 */ cAutoJudgeResult: string;
  /** 委托判定人 */ cJudgeUser: string;
  /** 委托判定时间 */ dJudgeTime?: string;
  /** 委托最终判定结果 */ cJudgeResult: string;
  /** 委托判定备注 */ cJudgeRemark: string;
  /** 委托单状态 */ cStatus: string;
  /** 复验标记 */ cRecheckFlag: string;
  /** 综判结果 */ cComplexDecideCode: string;
  /** 综判描述 */ cComplexDesc: string;
  /** 综判人 */ cComplexUser: string;
  /** 综判时间 */ dComplexTime?: string;
  /** 处置结果 */ cQmHandleCode?: string;
  /** 处置注释 */ cQmHandleDesc: string;
  /** 处置人 */ cQmHandleUser: string;
  /** 处置时间 */ dQmHandleTime?: string;
  /** 试批号 */ cSampleLotNo: string;
  /** 前试批号 */ cSampleLotNoPre: string;
  /** 切边方式 */ cCutFlag: string;
  /** 计划日期 */ cPlanTime: string;
  /** 入库标识 */ cInboundNo: string;
  /** 流向 */ cDelivyAddress: string;
  /** 公差等级 */ cWgtToler: string;
  /** 铸坯标识 */ cBilletTypeCode: string;
  /** 客户名称 */ cCusName: string;
  /** 剪切计划规格 */ pLAN_CSpec: string;
  /** 轧制厚 */ pLAN_NThickPlan?: number;
  /** 轧制宽 */ pLAN_NWidthPlan?: number;
  /** 轧制长 */ pLAN_NLlCleanLen?: number;
  /** 订货客户中文名称 */ cOrderCustCname: string;
  /** 订单号1 */ pLAN_COrderNo1: string;
  /** 订单号2 */ pLAN_COrderNo2: string;
  /** 订单号3 */ pLAN_COrderNo3: string;
  /** 订单号4 */ pLAN_COrderNo4: string;
  /** 订单号5 */ pLAN_COrderNo5: string;
  /** 订单号6 */ pLAN_COrderNo6: string;
  /** 套切长度1 */ pLAN_NLenPlan1?: number;
  /** 套切长度2 */ pLAN_NLenPlan2?: number;
  /** 套切长度3 */ pLAN_NLenPlan3?: number;
  /** 套切长度4 */ pLAN_NLenPlan4?: number;
  /** 套切长度5 */ pLAN_NLenPlan5?: number;
  /** 套切长度6 */ pLAN_NLenPlan6?: number;
  /** 入库标识1 */ cInboundNo1: string;
  /** 入库标识2 */ cInboundNo2: string;
  /** 入库标识3 */ cInboundNo3: string;
  /** 入库标识4 */ cInboundNo4: string;
  /** 入库标识5 */ cInboundNo5: string;
  /** 入库标识6 */ cInboundNo6: string;
  /** 国标钢种 */ nKSgCode: string;
  /** 工艺/性能要求 */ cSpecialMarkGy: string;
  /** 母板净长 */ nBoarCleanLen?: number;
  /** 公差 */ cTol: string;
  /** 厚度下限 */ nThickMin?: number;
  /** 厚度上限 */ nThickMax?: number;
  /** 倍尺 */ nDbc?: number;
  /** 是否冷坯计划 */ cCool: string;
  /** 装炉温度 */ slabFurBefTemp?: number;
  /** 装炉方式 */ nFurType?: number;
  /** 生产顺序号 */ nOrderSj?: number;
  /** 客户名称 */ cCustName: string;
  /** 板坯号 */ slabNo: string;
  /** 炉号 */ furNo?: number;
  /** 装炉时间 */ createTime?: string;
  /** 计划钢种 */ cSgCodePlan: string;
  /** 列号 */ rowNo?: number;
  /** 预留（照核长度） */ spare2?: number;
  /** 预留（炉前称重） */ spare3?: number;
  /** 照核长度 */ spare4?: number;
  /** 照核宽度 */ spare5?: number;
  /** 照核厚度 */ spare6?: number;
  /** 长度差 */ nLenDiff?: number;
  /** 重量差 */ nwgtDiff?: number;
  /** 需要堆冷 */ cDn: string;
  /** 特殊要求 */ cConRemark: string;
  /** 是否工程单 */ cIsGcd: string;
}

export interface TiL2ME05ItemDto {
  /** 选择 */ selected: boolean;
  /** 主键 */ id: string;
  /** 最后修改人 */ lastModifier: string;
  /** 最后修改时间 */ lastModifyTime?: string;
  /** 炉号 */ cStove: string;
  /** 件次号 */ cPieceNo: string;
  /** 组批号 */ cBatchOrder: string;
  /** 库存分类 */ nProType: number;
  /** 喷号 */ cPrintCode: string;
  /** 产线 */ cLineCode: string;
  /** 工序代码 */ cProc: string;
  /** 机台号 */ cMachine: string;
  /** 流号 */ cStrandNo: string;
  /** 计划号 */ cPlanId: string;
  /** 合同号 */ cConNo: string;
  /** 订单号 */ cOrderNo: string;
  /** 物料编码 */ cMatCode: string;
  /** 钢种 */ cSgCode: string;
  /** 炼钢钢种 */ cTlSgCode: string;
  /** 执行标准 */ cSgStd: string;
  /** 厚度 */ nThick: number;
  /** 宽度 */ nWth?: number;
  /** 长度 */ nLen?: number;
  /** 规格 */ cSpec: string;
  /** 支数 */ nNum: number;
  /** 理重 */ nCalWgt: number;
  /** 实重 */ nWgt: number;
  /** 产出时间 */ dProTime: string;
  /** 产出人 */ cProUser: string;
  /** 产出班次 */ cShiftNo: string;
  /** 产出班组 */ cGroupNo: string;
  /** 入库时间 */ dInTime?: string;
  /** 入库人 */ cInUser: string;
  /** 出库时间 */ dOutTime?: string;
  /** 出库人 */ cOutUser: string;
  /** 库区号 */ cStoreCode: string;
  /** 垛位号 */ cStackNo: string;
  /** 层号 */ cStackNum: string;
  /** 层号 */ nStackNum?: number;
  /** 吊号 */ nTransferNo?: number;
  /** 原库区号 */ cSourceStoreCode: string;
  /** 原垛位号 */ cSourceStackNo: string;
  /** 原层号 */ cSourceStackNum: string;
  /** 库存状态 */ nStatus: number;
  /** 热送区分 */ cIsHot: string;
  /** 生产备注 */ cProRemark: string;
  /** 模连铸标识 */ nCastDivCode: number;
  /** 占用产线 */ cLockedLine: string;
  /** 占用计划 */ cLockedPlan: string;
  /** 产品大类 */ cMatType: string;
  /** 品名 */ cProdCode: string;
  /** 钢类 */ cSteelType: string;
  /** 交货状态 */ cDelivyStatusCode: string;
  /** 加工用途代码 */ cCustStdCode: string;
  /** 批号 */ cBatchNo: string;
  /** 原始订单号 */ cOrderNoLast: string;
  /** 去向 */ cDestination: string;
  /** 退火炉回号 */ cHotNo: string;
  /** 坯类 */ cSlabType: string;
  /** 板坯号 */ cPieceNoSlab: string;
  /** 取样板标记 */ cIsQy: string;
  /** 钢板分类 */ typeValues: string;
  /** 钢板分类代码 */ typeCodeValues: string[];
  /** 是否满足订单要求 */ cIsMatchOrder: string;
  /** 质量状态 */ nQmStatus: number;
  /** 质量封锁原因 */ nLockReason: string;
  /** 质量等级 */ nQmLevel: number;
  /** 是否表检 */ cIsSurface: string;
  /** 表检结果 */ cSurfaceResult: number;
  /** 表面缺陷代码 */ cSurfaceDefectCode: string;
  /** 表检描述 */ cSurfaceDesc: string;
  /** 表面判定人 */ cSurfaceUser: string;
  /** 表面判定时间 */ dSurfaceTime?: string;
  /** 探伤判定结果 */ cDetectResultCode: number;
  /** 探伤等级 */ cDetectDefectLevel: string;
  /** 探伤判定缺陷代码 */ cDefectDefectCode: string;
  /** 探伤判定缺陷描述 */ cDefectDefectMark: string;
  /** 表面判定人 */ cDefectUser: string;
  /** 表面判定时间 */ dDefectTime?: string;
  /** 委托自动判定结果 */ cAutoJudgeResult: string;
  /** 委托判定人 */ cJudgeUser: string;
  /** 委托判定时间 */ dJudgeTime?: string;
  /** 委托最终判定结果 */ cJudgeResult: string;
  /** 委托判定备注 */ cJudgeRemark: string;
  /** 委托单状态 */ cStatus: string;
  /** 复验标记 */ cRecheckFlag: string;
  /** 综判结果 */ cComplexDecideCode: string;
  /** 综判描述 */ cComplexDesc: string;
  /** 综判人 */ cComplexUser: string;
  /** 综判时间 */ dComplexTime?: string;
  /** 处置结果 */ cQmHandleCode?: string;
  /** 处置注释 */ cQmHandleDesc: string;
  /** 处置人 */ cQmHandleUser: string;
  /** 处置时间 */ dQmHandleTime?: string;
  /** 试批号 */ cSampleLotNo: string;
  /** 前试批号 */ cSampleLotNoPre: string;
  /** 切边方式 */ cCutFlag: string;
  /** 计划日期 */ cPlanTime: string;
  /** 入库标识 */ cInboundNo: string;
  /** 流向 */ cDelivyAddress: string;
  /** 公差等级 */ cWgtToler: string;
  /** 铸坯标识 */ cBilletTypeCode: string;
  /** 客户名称 */ cCusName: string;
  /** 剪切计划规格 */ pLAN_CSpec: string;
  /** 轧制厚 */ pLAN_NThickPlan?: number;
  /** 轧制宽 */ pLAN_NWidthPlan?: number;
  /** 轧制长 */ pLAN_NLlCleanLen?: number;
  /** 订货客户中文名称 */ cOrderCustCname: string;
  /** 订单号1 */ pLAN_COrderNo1: string;
  /** 订单号2 */ pLAN_COrderNo2: string;
  /** 订单号3 */ pLAN_COrderNo3: string;
  /** 订单号4 */ pLAN_COrderNo4: string;
  /** 订单号5 */ pLAN_COrderNo5: string;
  /** 订单号6 */ pLAN_COrderNo6: string;
  /** 套切长度1 */ pLAN_NLenPlan1?: number;
  /** 套切长度2 */ pLAN_NLenPlan2?: number;
  /** 套切长度3 */ pLAN_NLenPlan3?: number;
  /** 套切长度4 */ pLAN_NLenPlan4?: number;
  /** 套切长度5 */ pLAN_NLenPlan5?: number;
  /** 套切长度6 */ pLAN_NLenPlan6?: number;
  /** 入库标识1 */ cInboundNo1: string;
  /** 入库标识2 */ cInboundNo2: string;
  /** 入库标识3 */ cInboundNo3: string;
  /** 入库标识4 */ cInboundNo4: string;
  /** 入库标识5 */ cInboundNo5: string;
  /** 入库标识6 */ cInboundNo6: string;
  /** 国标钢种 */ nKSgCode: string;
  /** 工艺/性能要求 */ cSpecialMarkGy: string;
  /** 母板净长 */ nBoarCleanLen?: number;
  /** 公差 */ cTol: string;
  /** 厚度下限 */ nThickMin?: number;
  /** 厚度上限 */ nThickMax?: number;
  /** 倍尺 */ nDbc?: number;
  /** 创建人 */ creator: string;
  /** 照核时间 */ createTime?: string;
  /** 板坯号 */ slabNo: string;
  /** 喷印号 */ printCode: string;
  /** MES反馈 */ mesCallBack: string;
  /** L2反馈 */ l2CallBack: string;
}


/* ===================== 批次4 台账报表组 ===================== */

export interface QueryYcDto {
  /** GroupHzs */ groupHzs: GroupYcDto[];
  /** Thr4000Dtos */ thr4000Dtos: Thr4000Dto[];
}

export interface GroupYcDto {
  /** 日期 */ cDate: string;
  /** 班组 */ cGroup: string;
  /** 待入库支数 */ nQuaNotIn?: number;
  /** 待精整支数 */ nQuaJz?: number;
}

export interface SaveYcDto {
  /** CPieceNos */ cPieceNos?: string[];
  /** CReason */ cReason?: string | null;
  /** CArea */ cArea?: string | null;
  /** CStack */ cStack?: string | null;
  /** CRemark */ cRemark?: string | null;
}

export interface ClHzDto {
  /** 日期 */ date: string;
  /** 班组 */ shiftGroup: string;
  /** 出炉支数 */ nQuaCl?: number;
  /** 出炉重量 */ nWgtCl?: number;
  /** 轧制支数 */ nQuaRoll?: number;
  /** 轧制重量 */ nWgtRoll?: number;
  /** 剪切支数 */ nQuaJq?: number;
  /** 剪切重量 */ nWgtJq?: number;
  /** 成品支数 */ nQuaCp?: number;
  /** 非尺支数 */ nQuaFc?: number;
  /** 非尺比例 */ nPerFc?: number;
  /** 入库支数 */ nQuaRk?: number;
  /** 未入库支数 */ nQuaWRk?: number;
  /** 火切支数 */ nQuaHq?: number;
  /** 火切重量 */ nWgtHq?: number;
}

export interface Hr4500HzDto {
  /** 日期 */ date: string;
  /** 班组 */ shiftGroup: string;
  /** 总数量 */ nAllDlQua?: number;
  /** 总重量 */ nAllDlWgt?: number;
  /** 到期数量 */ nDlFinishQua?: number;
  /** 到期重量 */ nDlFinishWgt?: number;
  /** 未到期数量 */ nDlNotQua?: number;
  /** 未到期重量 */ nDlNotWgt?: number;
  /** 火切支数 */ nQuaHq?: number;
  /** 火切重量 */ nWgtHq?: number;
  /** 待入库支数 */ nQuaDrk?: number;
  /** 待入库重量 */ nWgtDrk?: number;
}

export interface RslDto {
  /** 日期 */ date: string;
  /** 热送块数 */ nQua?: number;
  /** 总块数 */ nQuaTotal?: number;
  /** 热送率 */ nRsl?: number;
}

export interface RzlDto {
  /** 日期 */ date: string;
  /** 班组 */ group: string;
  /** 总块数 */ nQuaTotal?: number;
  /** 500℃以下块数 */ nQua500?: number;
  /** 500℃以下比率 */ nRzl500?: number;
  /** 500℃~600℃块数 */ nQua600?: number;
  /** 500℃~600 */ nRzl600?: number;
  /** 600℃~700℃块数 */ nQua700?: number;
  /** 600℃~700℃比率 */ nRzl700?: number;
  /** 700℃~800℃块数 */ nQua800?: number;
  /** 700℃~800℃比率 */ nRzl800?: number;
  /** 800℃以上块数 */ nQua800Zs?: number;
  /** 800℃以上比率 */ nRzl800Zs?: number;
  /** 温装块数 */ nQua?: number;
  /** 温装率 */ nRzl?: number;
}

export interface StoveRslDto {
  /** 炉号 */ cStove: string;
  /** 块数 */ nQua?: number;
  /** 重量 */ nWgt?: number;
  /** 热送块数 */ nHotQua?: number;
  /** 热送重量 */ nHotWgt?: number;
  /** 热送率 */ nRsl?: number;
  /** 下线块数 */ nDownQua?: number;
  /** 下线重量 */ nDownWgt?: number;
  /** 备注 */ cRemark: string;
}

export interface QueryThickHzDto {
  /** 板坯号 */ cSlabNo: string;
  /** 组批号 */ cBatchOrder: string;
  /** 钢种 */ cSgCode: string;
  /** 执行标准 */ cSgStd: string;
  /** 工作侧厚度 */ cThickWs: string;
  /** 传动侧厚度 */ cThickDs: string;
  /** 中部厚度 */ cThickHp: string;
  /** 轧制结束时间 */ dRollingTimeEnd?: string;
  /** 班次 */ shiftNo: string;
  /** 班组 */ shiftGroup: string;
  /** 精轧责任者A */ fmAuthorA: string;
  /** 精轧责任者B */ fmAuthorB: string;
  /** 销售订单号 */ cOrderNo: string;
  /** 客户名称 */ cOrderCustCname: string;
  /** 公差 */ cTol: string;
  /** 入库标识 */ cInboundNo: string;
  /** 厚度 */ nThick: number;
  /** 宽度 */ nWidth?: number;
  /** 长度 */ nLen?: number;
  /** 厚度下偏差 */ nThickTolMin?: number;
  /** 厚度上偏差 */ nThickTolMax?: number;
  /** 轧制厚度 */ exitThick?: number;
  /** 测厚仪工作侧mm */ meaThickWs?: number;
  /** 测厚仪中部mm */ thickHp?: number;
  /** 测厚仪传动侧mm  */ meaThickDs?: number;
}

export interface QueryLenHzDto {
  /** 板坯号 */ cSlabNo: string;
  /** 组批号 */ cBatchOrder: string;
  /** 钢种 */ cSgCode: string;
  /** 轧制结束时间 */ dRollingTimeEnd?: string;
  /** 销售订单号 */ cOrderNo: string;
  /** 公差 */ cTol: string;
  /** 入库标识 */ cInboundNo: string;
  /** 坯厚 */ nThickSlab?: number;
  /** 坯宽 */ nWidthSlab?: number;
  /** 坯长 */ nLenSlab?: number;
  /** 坯重 */ nWgtSlab?: number;
  /** 照核厚度 */ nThickZh?: number;
  /** 照核宽度 */ nWidthZh?: number;
  /** 照核长度 */ nLenZh?: number;
  /** 称重重量 */ nWgtZh?: number;
  /** 磅差 */ nWgtBc?: number;
  /** 产出长度 */ nLen?: number;
  /** 订单厚度 */ nThickOrder?: number;
  /** 订单宽度 */ nWidthOrder?: number;
  /** 订单长度下限 */ nLenMinOrder?: number;
  /** 订单长度上限 */ nLenMaxOrder?: number;
  /** 轧制厚度 */ nThickRoll?: number;
  /** 轧制宽度 */ nWidthRoll?: number;
  /** 班次 */ shiftNo: string;
  /** 班组 */ shiftGroup: string;
  /** 测厚仪工作侧mm */ meaThickWs?: number;
  /** 测厚仪中部mm */ thickHp?: number;
  /** 测厚仪传动侧mm  */ meaThickDs?: number;
  /** 厚度下偏差 */ nThickTolMin?: number;
  /** 厚度上偏差 */ nThickTolMax?: number;
  /** 粗轧前测宽仪全长平均宽度[mm](冷态) */ nWidthBefore?: number;
  /** 粗轧后测宽仪全长平均宽度[mm](冷态) */ nWidthAfter?: number;
}

export interface QueryWidthHzDto {
  /** 板坯号 */ cSlabNo: string;
  /** 组批号 */ cBatchOrder: string;
  /** 钢种 */ cSgCode: string;
  /** 轧制完成时间 */ dRollingTimeEnd?: string;
  /** 销售订单号 */ cOrderNo: string;
  /** 公差 */ cTol: string;
  /** 坯厚 */ nThickSlab?: number;
  /** 坯宽 */ nWidthSlab?: number;
  /** 坯长 */ nLenSlab?: number;
  /** 坯重 */ nWgtSlab?: number;
  /** 称重重量 */ nWgtZh?: number;
  /** 磅差 */ nWgtBc?: number;
  /** 订单厚度 */ nThickOrder?: number;
  /** 订单宽度 */ nWidthOrder?: number;
  /** 照核厚度 */ nThickZh?: number;
  /** 照核宽度 */ nWidthZh?: number;
  /** 照核长度 */ nLenZh?: number;
  /** 粗轧前测宽仪头部平均宽度[mmm](冷态) */ nWidthBeforeHead?: number;
  /** 粗轧前测宽仪中部平均宽度[mm](冷态) */ nWidthBeforeBody?: number;
  /** 粗轧前测宽仪尾部平均宽度[mm](冷态) */ nWidthBeforeTail?: number;
  /** 粗轧前测宽仪全长平均宽度[mm](冷态) */ nWidthBefore?: number;
  /** 粗轧后测宽仪头部平均宽度[mmm](冷态) */ nWidthAfterHead?: number;
  /** 粗轧后测宽仪中部平均宽度[mm](冷态) */ nWidthAfterBody?: number;
  /** 粗轧后测宽仪尾部平均宽度[mm](冷态) */ nWidthAfterTail?: number;
  /** 粗轧后测宽仪全长平均宽度[mm](冷态) */ nWidthAfter?: number;
  /** 测宽仪宽度 */ nWidthRoll?: number;
  /** 平直度仪平均宽度 */ nWidthAvg?: number;
  /** 平直度仪最大宽度值（冷态） */ nWidthMax?: number;
  /** 平直度仪最小宽度值（冷态） */ nWidthMin?: number;
  /** 双边剪剪切宽度 */ nWidthSbj: string;
  /** 喷印宽度 */ nWidthPy?: number;
}

export interface CclDto {
  /** 日期 */ date: string;
  /** 班组 */ group: string;
  /** 板坯块数 */ nQua?: number;
  /** 板坯重量 */ nWgt?: number;
  /** 成品块数 */ nQuaCp?: number;
  /** 成品重量 */ nWgtCp?: number;
  /** 理论成材率 */ nRate?: number;
  /** 板坯块数 */ nQua4?: number;
  /** 板坯重量 */ nWgt4?: number;
  /** 成品块数 */ nQuaCp4?: number;
  /** 成品重量 */ nWgtCp4?: number;
  /** 理论成材率 */ nRate4?: number;
  /** 板坯块数 */ nQua2?: number;
  /** 板坯重量 */ nWgt2?: number;
  /** 成品块数 */ nQuaCp2?: number;
  /** 成品重量 */ nWgtCp2?: number;
  /** 理论成材率 */ nRate2?: number;
  /** 板坯块数 */ nQua0?: number;
  /** 板坯重量 */ nWgt0?: number;
  /** 成品块数 */ nQuaCp0?: number;
  /** 成品重量 */ nWgtCp0?: number;
  /** 理论成材率 */ nRate0?: number;
}

export interface Thr4810Dto {
  /** 日期 */ date?: string;
  /** 班组 */ group: string;
  /** 板坯号 */ cPieceSlabNo: string;
  /** 件次号 */ cPieceNo: string;
  /** 钢坯钢种 */ cSgCodeSlab: string;
  /** 成品钢种 */ cSgCodeCp: string;
  /** 切边方式 */ cTrimFlag: string;
  /** 公差 */ cTol: string;
  /** 长度类型 */ cLengthType: string;
  /** 长度下限 */ nLenMin?: number;
  /** 长度上限 */ nLenMax?: number;
  /** 照核厚度 */ nThickFur?: number;
  /** 照核宽度 */ nWidthFur?: number;
  /** 照核长度 */ nLenFur?: number;
  /** 炉前称重 */ nWgtFur?: number;
  /** 轧制厚度 */ nThickRoll?: number;
  /** 轧制宽度 */ nWidthRoll?: number;
  /** 轧制长度 */ nLenRoll?: number;
  /** 轧制重量 */ nWgtRoll?: number;
  /** 剪切厚度 */ nThickJq?: number;
  /** 剪切宽度 */ nWidthJq?: number;
  /** 订单厚度 */ nThick: number;
  /** 订单宽度 */ nWidth: number;
  /** 厚度（工作侧）测厚仪 */ meaThickWs?: number;
  /** 厚度（传动侧）测厚仪 */ meaThickDs?: number;
  /** 钢板测厚仪中部厚度 */ thickHp?: number;
  /** 成品厚度 */ nThickSj?: number;
  /** 成品宽度 */ nWidthSj?: number;
  /** 剪切长度 */ nLenJq?: number;
  /** 成品重量 */ nWgtCp?: number;
  /** 理论成材率 */ nCclLl?: number;
  /** 理论重量 */ nWgtLl?: number;
  /** 质计部重量 */ nWgtZjb?: number;
}

export interface DtoQueryThr4810 {
  /** 时间范围 */ timeRange?: TimeRange;
  /** 板坯号 */ cPieceNoSlab?: string | null;
  /** 班组 */ cShiftGroup?: string | null;
  /** 件次号 */ cPieceNo?: string | null;
  /** 切边方式 */ cTrimFlag?: string | null;
  /** 钢种 */ cSgCode?: string | null;
}

export interface Thr4810CclHzDto {
  /** 班组 */ group: string;
  /** 日期 */ dDateTime: string;
  /** 钢种 */ cSgCode: string;
  /** 厚度 */ nOrderThick: string;
  /** 顺序号 */ nOrder?: number;
  /** 钢坯总支数 */ nQuaSlab?: number;
  /** 成品总支数 */ nQuaCp?: number;
  /** 钢坯支数 */ nQuaSjSlab2?: number;
  /** 钢坯支数比例 */ nQuaSjSlabRate2?: number;
  /** 成品支数 */ nQuaSjCp2?: number;
  /** 入炉坯重 */ nFurWgtSj2?: number;
  /** 轧制坯重 */ nRollWgtSj2?: number;
  /** 成品重量 */ nWgtCpSj2?: number;
  /** 实际成材率 */ nRateSj2?: number;
  /** 理论重量 */ nWgtLl2?: number;
  /** 理论成材率 */ nRateLl2?: number;
  /** 质计部重量 */ nWgtZjb2?: number;
  /** 质计部成材率 */ nRateZjb2?: number;
  /** 钢坯支数 */ nQuaSjSlab4?: number;
  /** 钢坯支数比例 */ nQuaSjSlabRate4?: number;
  /** 成品支数 */ nQuaSjCp4?: number;
  /** 入炉坯重 */ nFurWgtSj4?: number;
  /** 轧制坯重 */ nRollWgtSj4?: number;
  /** 成品重量 */ nWgtCpSj4?: number;
  /** 实际成材率 */ nRateSj4?: number;
  /** 理论重量 */ nWgtLl4?: number;
  /** 理论成材率 */ nRateLl4?: number;
  /** 质计部重量 */ nWgtZjb4?: number;
  /** 质计部成材率 */ nRateZjb4?: number;
  /** 钢坯支数 */ nQuaSjSlab0?: number;
  /** 钢坯支数比例 */ nQuaSjSlabRate0?: number;
  /** 成品支数 */ nQuaSjCp0?: number;
  /** 入炉坯重 */ nFurWgtSj0?: number;
  /** 轧制坯重 */ nRollWgtSj0?: number;
  /** 成品重量 */ nWgtCpSj0?: number;
  /** 实际成材率 */ nRateSj0?: number;
  /** 理论重量 */ nWgtLl0?: number;
  /** 理论成材率 */ nRateLl0?: number;
  /** 质计部重量 */ nWgtZjb0?: number;
  /** 质计部成材率 */ nRateZjb0?: number;
  /** 入炉坯重 */ nFurWgtSj?: number;
  /** 轧制坯重 */ nRollWgtSj?: number;
  /** 成品重量 */ nWgtCpSj?: number;
  /** 实际成材率 */ nRateSj?: number;
  /** 理论重量 */ nWgtLl?: number;
  /** 理论成材率 */ nRateLl?: number;
  /** 质计部重量 */ nWgtZjb?: number;
  /** 质计部成材率 */ nRateZjb?: number;
}

export interface QueryHR4830Dto {
  /** 日期 */ cDateTime: string;
  /** 浇次 */ cJc?: number;
  /** 钢种 */ cSgCode: string;
  /** 倍尺 */ nbc: string;
  /** 切割方式 */ cTrimFlagBC: string;
  /** 提料成材率 */ nBCTLRate?: number;
  /** 块数 */ nQua?: number;
  /** 总块数 */ nQuaAll?: number;
  /** 切割方式 */ cTrimFlag: string;
  /** 浇次比例 */ cQgJcRate?: number;
  /** 提料成材率 */ nQgTLRate?: number;
  /** 轧制规格 */ nRoll: string;
  /** 浇次比例 */ cRollJcRate?: number;
  /** 提料成材率 */ nRollTLRate?: number;
}

export interface QueryHR4900Dto {
  /** 板坯装炉时间 */ dSlabFurTime?: string;
  /** 订单号 */ cNorderNo: string;
  /** 组批号 */ cBatchNo: string;
  /** 订单钢种 */ cSgCode: string;
  /** 不平度 */ cNoPD: string;
  /** 下线温度 */ nDownTemp?: number;
  /** 在炉内时间 */ inFurnaceTime?: number;
  /** 在加热段1时的平均温度 */ ht1AveTemp?: number;
  /** 加热段1在炉时段 */ ht1InFurPerd?: number;
  /** 在加热段2时的平均温度 */ ht2AveTemp?: number;
  /** 加热段2在炉时段 */ ht2InFurPerd?: number;
  /** 均热段时的平均温度 */ eqAveTemp?: number;
  /** 均热段在炉时段 */ eqInFurPerd?: number;
  /** 中间坯厚度 */ nSlabThick?: number;
  /** 厚度 */ nThick?: number;
  /** 宽度 */ nWidth?: number;
  /** 长度 */ nLen?: number;
  /** 粗轧开轧温度 */ rmEntTempAvg?: number;
  /** 精轧开轧温度 */ fmEntTempAvg?: number;
  /** 精轧终轧温度 */ fmExitTempAvg?: number;
  /** 预矫钢板温度 */ entryTemp?: number;
  /** 预矫速度 */ levelerSpeed?: number;
  /** 预矫咬入速度 */ bitSpeed?: number;
  /** 预矫入口辊缝 */ entryGap?: number;
  /** 预矫出口辊缝 */ exitGap?: number;
  /** 预矫预矫力 */ l2Force?: number;
  /** 热矫结束时间 */ endTimeRj?: string;
  /** 热矫钢板温度 */ entryTempRj?: number;
  /** 热矫速度 */ levelerSpeedRj?: number;
  /** 热矫咬入速度 */ bitSpeedRj?: number;
  /** 热矫入口辊缝 */ entryGapRj?: number;
  /** 热矫出口辊缝 */ exitGapRj?: number;
  /** 热矫矫直力 */ l2ForceRj?: number;
  /** 冷床停留时间 */ nColdStopTime?: number;
  /** 堆冷开始时间 */ dHlIn?: string;
  /** 计划堆冷时间 */ nHlHour?: number;
  /** 实际堆冷时间 */ nHlHourSj?: number;
  /** 剩余堆冷时间 */ nHlHourSy?: number;
  /** 堆冷结束时间 */ dHlOut?: string;
  /** 开冷平均温度 */ entryAveTemp: number;
  /** 目标返红温度 */ targetFinishTemp: number;
  /** 实测下表返红温度 */ nTempXb?: number;
  /** 返红平均温度 */ finishAveTemp: number;
  /** 实际冷速 */ coolingRate: number;
  /** B区实际流量 */ actFluxB: number;
  /** B区实际水比 */ actRatioB: number;
  /** 实际辊速 */ actSpeed: number;
  /** 实际加速度 */ actAspd?: number;
  /** 开启集管组数 */ num: number;
  /** 头尾遮蔽投入信号 */ hTSIS: number;
  /** 头上长度 */ headUpLength: number;
  /** 头下长度 */ headBotLength: number;
  /** 头上系数 */ headUpCoef: number;
  /** 头下系数 */ headBotCoef: number;
  /** 尾上长度 */ tailUpLength: number;
  /** 尾下长度 */ tailBotLength: number;
  /** 尾上系数 */ tailUpCoef: number;
  /** 尾下系数 */ tailBotCoef: number;
  /** 水温 */ tempWater: number;
  /** 水压 */ pressWater: number;
  /** 总水量 */ total_flow: number;
  /** 是否投用自动 */ isAutoUse?: number;
}

export interface QueryHR9300Dto {
  /** 订单号1 */ cOrderNo1: string;
  /** 组批号 */ cBatchOrder: string;
  /** 板坯号 */ cPieceNoSlab: string;
  /** 钢种 */ cSgCode: string;
  /** 厚度 */ nThick?: number;
  /** 宽度 */ nWidth?: number;
  /** 长度 */ nLen?: number;
  /** 粗轧开轧温度目标 */ rmEntTempTar?: number;
  /** 粗轧开轧温度 */ rmEntTempAvg?: number;
  /** 粗轧开轧温度判定 */ rmEntTempPd: string;
  /** 精轧开轧温度目标 */ fmEntTempTar?: number;
  /** 精轧开轧温度 */ fmEntTempAvg?: number;
  /** 精轧开轧温度判定 */ fmEntTempPd: string;
  /** 精轧终轧温度目标 */ fmExitTempTar?: number;
  /** 精轧终轧温度 */ fmExitTempAvg?: number;
  /** 精轧终轧温度判定 */ fmExitTempPd: string;
  /** 目标开冷温度 */ targetEntryTemp: number;
  /** 开冷平均温度 */ entryAveTemp: number;
  /** 开冷平均温度判定 */ entryAveTempPd: string;
  /** 返红目标温度 */ targetFinishTemp: number;
  /** 返红平均温度 */ finishAveTemp: number;
  /** 返红平均温度判定 */ finishAveTempPd: string;
  /** 加热时间目标 */ inFurTimePlan?: number;
  /** 加热时间 */ inFurTime?: number;
  /** 加热时间判定 */ inFurTimePd: string;
  /** 出炉温度目标 */ outFurTempPlan?: number;
  /** 出炉温度 */ outFurTemp?: number;
  /** 出炉温度判定 */ outFurTempPd: string;
  /** 生产时间 */ dProductTime?: string;
  /** 责任者 */ author: string;
  /** 精轧责任者A */ cFmAuthorA: string;
  /** 精轧责任者B */ cFmAuthorB: string;
  /** 粗轧责任者A */ cRmAuthorA: string;
  /** 粗轧责任者B */ cRmAuthorB: string;
  /** ACC责任者 */ cAuthorACC: string;
  /** 班组 */ shiftGroup: string;
  /** 性能要求 */ cSpecialMarkGy: string;
  /** 精轧总轧制道次数 */ fmPass?: number;
  /** 粗轧总轧制道次数 */ rmPass?: number;
  /** 待温厚度 */ dwThick?: number;
  /** 精轧开始厚度（计算） */ fmEntThick?: number;
  /** 是否取样板 */ cIsQy: string;
  /** 轧制规格 */ cSpecPlan: string;
  /** 压下率判定 */ cYxl: string;
  /** 是否投用自动 */ isAutoUse?: number;
  /** 板坯厚度 */ nThickSlab?: number;
  /** 装炉方式 */ nFurType: number;
}

export interface QueryHR9300HzDto {
  /** 块数 */ nQua?: number;
  /** 日期 */ date?: string;
  /** 班组 */ cShiftGroup: string;
  /** 责任者 */ author: string;
  /** 块数 */ nZcQua?: number;
  /** 比例 */ nZcRate?: number;
  /** 块数 */ nYbLowQua?: number;
  /** 比例 */ nYbLowRate?: number;
  /** 块数 */ nYzLowQua?: number;
  /** 比例 */ nYzLowRate?: number;
  /** 块数 */ nYbHotQua?: number;
  /** 比例 */ nYbHotRate?: number;
  /** 块数 */ nYzHotQua?: number;
  /** 比例 */ nYzHotRate?: number;
  /** 块数 */ nZcQua2?: number;
  /** 比例 */ nZcRate2?: number;
}

export interface QueryHR9320Dto {
  /** Tql4000Id */ tql4000Id: string;
  /** Tql3100Id */ tql3100Id: string;
  /** 委托单号 */ cTestNo: string;
  /** 订单号 */ cOrderNo: string;
  /** 交货状态代码 */ cDelivyStatusCode: string;
  /** 交货状态描述 */ cDeliveryStateDesc: string;
  /** 炉号 */ cStove: string;
  /** 批号 */ cBatch: string;
  /** 板坯号 */ cPieceNoSlab: string;
  /** 钢种 */ cSgSign: string;
  /** 轧制厚度 */ nRollThick?: number;
  /** 执行标准 */ cSgStd: string;
  /** 规格 */ cSpec: string;
  /** 最终判定结果 */ cJudgeResult: string;
  /** 检验时间 */ jyTime?: string;
  /** 试样号 */ cSampleNo: string;
  /** 复验标记 */ cRecheckFlag: string;
  /** 试验次数 */ nTestTimes: number;
  /** 上屈服强度 */ nYieLdUpStrength: string;
  /** 下屈服强度 */ nYieLdStrength: string;
  /** 抗拉强度 */ nMaxStrength: string;
  /** 断后伸长率 */ nFinalRate: string;
  /** 断面收缩率 */ nFinalShrink: string;
  /** 断面收缩率1 */ nFinalShrink1: string;
  /** 断面收缩率2 */ nFinalShrink2: string;
  /** 断面收缩率3 */ nFinalShrink3: string;
  /** 平均断面收缩率 */ nFinalShrinkAvg: string;
  /** 弯曲结果 */ cBendResult: string;
  /** 冲击功1 */ cImpact1: string;
  /** 冲击功2 */ cImpact2: string;
  /** 冲击功3 */ cImpact3: string;
  /** 平均冲击功 */ cAveImpact: string;
  /** 试验方向 */ cDirection: string;
  /** 试验温度 */ cTemperature: string;
  /** C */ c: string;
  /** Si */ si: string;
  /** Mn */ mn: string;
  /** P */ p: string;
  /** S */ s: string;
  /** Cr */ cr: string;
  /** Ni */ ni: string;
  /** Cu */ cu: string;
  /** Mo */ mo: string;
  /** Ti */ ti: string;
  /** Al */ al: string;
  /** Pb */ pb: string;
  /** Sn */ sn: string;
  /** Sb */ sb: string;
  /** As */ as: string;
  /** Ca */ ca: string;
  /** B */ b: string;
  /** Nb */ nb: string;
  /** N */ n: string;
  /** V */ v: string;
  /** Co */ co: string;
  /** Zr */ zr: string;
  /** Ta */ ta: string;
  /** Ce */ ce: string;
  /** La */ la: string;
  /** Se */ se: string;
  /** W */ w: string;
  /** Bi */ bi: string;
  /** Te */ te: string;
  /** Cev */ cev: string;
  /** Ceq */ ceq: string;
  /** Als */ als: string;
  /** Alins */ alins: string;
  /** 班次 */ cShiftNo: string;
  /** 班组 */ cGroupNo: string;
  /** 生产时间 */ dProTime?: string;
  /** 一加热段平均温度 */ htAveTemp1?: number;
  /** 二加热段平均温度 */ htAveTemp2?: number;
  /** 均热段平均温度 */ eqAveTemp?: number;
  /** 在炉时间 */ eqInFurPerd?: number;
  /** 粗轧开轧温度目标 */ rmEntTempTar?: number;
  /** 粗轧开轧温度（测量平均） */ rmEntTempAvg?: number;
  /** 粗轧终轧温度（测量平均） */ rmExitTempAvg?: number;
  /** 中间坯厚度 */ fmEntThick?: number;
  /** 精轧开轧温度目标 */ fmEntTempTar?: number;
  /** 精轧开轧温度（测量平均） */ fmEntTempAvg?: number;
  /** 精轧终轧温度目标 */ fmExitTempTar?: number;
  /** 精轧终轧温度（测量平均） */ fmExitTempAvg?: number;
  /** 开冷平均温度 */ entryAveTemp: number;
  /** 目标返红温度 */ targetFinishTemp: number;
  /** 返红平均温度 */ finishAveTemp: number;
  /** 实测下表返红温度 */ nTempXb?: number;
  /** 实际冷速 */ coolingRate: number;
  /** A区实际流量 */ actFluxA: number;
  /** B区实际流量 */ actFluxB: number;
  /** A区实际水比 */ actRatioA: number;
  /** B区实际水比 */ actRatioB: number;
  /** 实际辊速 */ actSpeed: number;
  /** 实际加速度 */ actAspd?: number;
  /** 开启集管组数 */ num: number;
  /** 水温 */ tempWater: number;
  /** 水压 */ pressWater: number;
  /** 总水量 */ total_flow: number;
  /** 是否投用自动 */ isAutoUse?: number;
  /** 生产备注 */ cProRemark: string;
}

export interface HR9400Dto {
  /** 计划日期 */ cPlanTime: string;
  /** 提料计划号 */ cOrderNo: string;
  /** 订货客户中文名称 */ cOrderCustCname: string;
  /** 炉号 */ cStoveNo: string;
  /** 组批号 */ cBatchNo: string;
  /** 板坯号 */ cPieceNoSlab: string;
  /** 订单号1 */ cOrderNo1: string;
  /** 订单号2 */ cOrderNo2: string;
  /** 订单号3 */ cOrderNo3: string;
  /** 订单号4 */ cOrderNo4: string;
  /** 是否堆冷 */ cIsNotDl: string;
  /** 倍尺 */ nBc?: number;
  /** 是否套切 */ cIsNotTq: string;
  /** 是否宽套切 */ cIsNotWidthTq: string;
  /** 装炉方式 */ nFurType: number;
  /** 订单钢种 */ cSgCodeOrder: string;
  /** 厚度 */ nThick?: number;
  /** 宽度1 */ nWidth1?: number;
  /** 宽度2 */ nWidth2: string;
  /** 宽度套切1 */ nWidthTq1?: number;
  /** 宽度套切2 */ nWidthTq2?: number;
  /** 宽度套切3 */ nWidthTq3?: number;
  /** 长度1 */ nLen1?: number;
  /** 长度2 */ nLen2: string;
  /** 长度套切1 */ nLenTq1?: number;
  /** 长度套切2 */ nLenTq2?: number;
  /** 长度套切3 */ nLenTq3?: number;
  /** 长度类型 */ cLengthType: string;
  /** 钢板理重1 */ nCalWgt1?: number;
  /** 钢板理重2 */ nCalWgt2?: number;
  /** 钢板理重3 */ nCalWgt3?: number;
  /** 钢板理重4 */ nCalWgt4?: number;
  /** 钢板合计重量 */ nCalWgtSum?: number;
  /** 提料成材率 */ nCclTL?: number;
  /** 实际成材率 */ nCclSj?: number;
  /** 入库标识1 */ cInboundNo1: string;
  /** 交货状态 */ cDelivyStatus: string;
  /** 切边方式 */ cTrimFlag: string;
  /** 炼钢钢种 */ cSgCodeLg: string;
  /** 钢坯厚 */ nSlabThick?: number;
  /** 钢坯宽 */ nSlabWidth?: number;
  /** 钢坯长 */ nSlabLen?: number;
  /** 钢坯重量 */ nSlabWgtCal?: number;
  /** 钢坯实重 */ nSlabWgtSj?: number;
  /** 轧制厚 */ nThickRoll?: number;
  /** 轧制宽 */ nWidthRoll?: number;
  /** 轧制长 */ nLenRoll?: number;
  /** 计重方式 */ cDelivyQtyFlag: string;
  /** 公差 */ cTol: string;
  /** 执行标准 */ cSgStd: string;
  /** 探伤要求 */ cFlawStand: string;
  /** 探伤等级 */ cFlawDesc: string;
  /** 性能要求 */ cSpecialMarkGy: string;
  /** 是否取样 */ cIsQY: string;
  /** 入炉时间 */ dFurTime?: string;
  /** 轧制时间 */ dRollTime?: string;
  /** 轧制块数 */ dRollQua?: number;
  /** 轧制规格 */ cRollSpec: string;
  /** 总轧制时间s */ totalRollingTime?: number;
  /** 合同要求 */ cConRemark: string;
  /** 表面重点 */ cFaceKeyPoint: string;
  /** 表面类别 */ cFaceClass: string;
  /** 理论板边 */ nLenLlB?: number;
  /** 理论板头 */ nLenLlT?: number;
  /** 理论烧损 */ nLlSc?: number;
  /** 理论毛长 */ nLenLlMc?: number;
  /** 母板净长 */ nLenMbJc?: number;
  /** 成材率差值 */ nRateCz?: number;
  /** C */ c?: number;
  /** SI */ si?: number;
  /** MN */ mn?: number;
  /** P */ p?: number;
  /** S */ s?: number;
  /** CR */ cr?: number;
  /** NI */ ni?: number;
  /** MO */ mo?: number;
  /** CU */ cu?: number;
  /** AL */ al?: number;
  /** TI */ ti?: number;
  /** NB */ nb?: number;
  /** V */ v?: number;
  /** ALS */ als?: number;
  /** CA */ ca?: number;
  /** CEQ */ ceq?: number;
  /** B */ b?: number;
  /** ALINS */ alins?: number;
  /** W */ w?: number;
  /** AS */ as?: number;
  /** SN */ sn?: number;
  /** CO */ co?: number;
  /** PB */ pb?: number;
  /** SB */ sb?: number;
  /** TA */ ta?: number;
  /** ZR */ zr?: number;
  /** BI */ bi?: number;
  /** SE */ se?: number;
  /** TE */ te?: number;
  /** CE */ ce?: number;
  /** LA */ la?: number;
  /** N */ n?: number;
}

export interface DtoQueryHR9400 {
  /** 时间范围 */ timeRange?: TimeRange;
  /** 提料计划号 */ cOrderNoTl?: string | null;
  /** 订单号 */ cOrderNo?: string | null;
  /** 组批号 */ cBatchOrder?: string | null;
  /** 板坯号 */ cSlabNo?: string | null;
  /** 切边方式 */ cTrimFlag?: string | null;
  /** 炼钢钢种 */ cSgCodeLg?: string | null;
  /** 厚度区间 */ nThickRange?: DecimalRange;
  /** 宽度区间 */ nWidthRange?: DecimalRange;
  /** 倍尺 */ nBc?: number | null;
}

export interface Thr9410Dto {
  /** 生产顺序号 */ nOrder?: number;
  /** 提料计划号 */ cOrderNo: string;
  /** 批号 */ cBatchNo: string;
  /** 炉号 */ cStove: string;
  /** 组批号 */ cBatchOrder: string;
  /** 是否取样 */ cIsQY: string;
  /** 钢板号 */ cPlateNo: string;
  /** 件次号 */ cPieceNo: string;
  /** 喷印号 */ cPrintCode: string;
  /** 坯料钢种 */ cSgCode: string;
  /** 坯料标准 */ cSgStd: string;
  /** 坯料规格 */ cSpec: string;
  /** 坯厚 */ nThick?: number;
  /** 坯宽 */ nWidth?: number;
  /** 坯长 */ nLen?: number;
  /** 订单钢种 */ cSgCodePlan: string;
  /** 订单标准 */ cSgStdPlan: string;
  /** 轧制规格 */ cSpecRoll: string;
  /** 轧制厚度 */ nThickRoll?: number;
  /** 轧制宽度 */ nWidthRoll?: number;
  /** 轧制长度 */ nLenRoll?: number;
  /** 装炉方式 */ nFurType: number;
  /** 客户名称 */ cCustName: string;
  /** 特殊要求 */ cConRemark: string;
  /** 是否工程单 */ cIsGcd: string;
  /** 订单号1 */ cOrderNo1: string;
  /** 入库标识1 */ cInboundNo1: string;
  /** 倍尺 */ nBc?: number;
  /** 计划支数 */ nQuaPlan: number;
  /** 边部宽度余量 */ nWidthWgt?: number;
  /** 切边方式 */ cTrimFlag: string;
  /** 探伤等级 */ cFlawDesc: string;
  /** 流向 */ cDelivyAddress: string;
  /** 公差 */ cTol: string;
  /** 性能要求 */ cSpecialMarkGy: string;
  /** 需要堆冷 */ cDn: string;
  /** 牌号 */ steelGrade: string;
  /** 出炉时间 */ dDischargeTime?: string;
  /** 轧制开始时间 */ dRollingTimeStart?: string;
  /** 轧制结束时间 */ dRollingTimeEnd?: string;
  /** CR代码 */ crCode?: number;
  /** 总轧制时间s */ totalRollingTime?: number;
  /** 精轧总轧制道次数 */ fmPass?: number;
  /** 误轧制标记 */ rollingStatus: string;
  /** 待温厚度 */ dwThick?: number;
  /** 轧制厚度（计算） */ exitThick?: number;
  /** 轧制宽度（计算） */ exitWidth?: number;
  /** 轧制长度（计算） */ exitLength?: number;
  /** 入炉温度 */ nWdRl?: number;
  /** 出炉温度 */ nWdCl?: number;
  /** 在炉内时间 */ inFurnaceTime?: number;
  /** 除鳞后温度（平均） */ hsbExitTempAvg?: number;
  /** 除鳞后温度（最大） */ hsbExitTempMax?: number;
  /** 厚度（工作侧）测厚仪 */ meaThickWs?: number;
  /** 厚度（传动侧）测厚仪 */ meaThickDs?: number;
  /** 厚度（中部）测厚仪 */ thickHp?: number;
  /** 粗轧总轧制道次数 */ rmPass?: number;
  /** 粗轧开轧温度目标 */ rmEntTempTar?: number;
  /** 粗轧开轧温度（计算） */ rmEntTempCal?: number;
  /** 粗轧开轧温度（测量平均） */ rmEntTempAvg?: number;
  /** 粗轧开轧温度（测量最小） */ rmEntTempMin?: number;
  /** 粗轧开轧温度（测量最大） */ rmEntTempMax?: number;
  /** 粗轧终轧温度（计算） */ rmExitTempCal?: number;
  /** 粗轧终轧温度（测量平均） */ rmExitTempAvg?: number;
  /** 粗轧终轧温度（测量最小） */ rmExitTempMin?: number;
  /** 粗轧终轧温度（测量最大） */ rmExitTempMax?: number;
  /** 粗轧开始厚度（计算） */ rmEntThick?: number;
  /** 精轧开轧温度（计算） */ fmEntTempCal?: number;
  /** 精轧开轧温度目标 */ fmEntTempTar?: number;
  /** 精轧开轧温度（测量平均） */ fmEntTempAvg?: number;
  /** 精轧开轧温度（测量最小） */ fmEntTempMin?: number;
  /** 精轧开轧温度（测量最大） */ fmEntTempMax?: number;
  /** 终轧温度目标 */ fmExitTempTar?: number;
  /** 精轧终轧温度（计算） */ fmExitTempCal?: number;
  /** 精轧终轧温度（测量平均） */ fmExitTempAvg?: number;
  /** 精轧终轧温度（测量最小） */ fmExitTempMin?: number;
  /** 精轧终轧温度（测量最大） */ fmExitTempMax?: number;
  /** 班次 */ shiftNo: string;
  /** 班组 */ shiftGroup: string;
  /** 生产时间 */ dProductTime?: string;
  /** 理论成材率 */ nCcl?: number;
  /** 预矫总次数 */ totalPass?: number;
  /** 预矫进入时间 */ entryTime: string;
  /** 预矫结束时间 */ endTime: string;
  /** 预矫钢板温度 */ entryTemp?: number;
  /** 预矫速度 */ levelerSpeed?: number;
  /** 预矫咬入速度 */ bitSpeed?: number;
  /** 开冷时间 */ startCoolTime: string;
  /** 终冷时间 */ finishCoolTime: string;
  /** 开冷平均温度 */ entryAveTemp: number;
  /** 开冷最大温度 */ entryMaxTemp: number;
  /** 开冷最小温度 */ entryMinTemp: number;
  /** 目标返红温度 */ targetFinishTemp: number;
  /** 实测下表返红温度 */ nTempXb?: number;
  /** 返红平均温度 */ finishAveTemp: number;
  /** 返红温度最大 */ finishMaxTemp: number;
  /** 返红温度最小 */ finishMinTemp: number;
  /** 实际冷速 */ coolingRate: number;
  /** 热矫进入时间 */ entryTimeRj: string;
  /** 热矫结束时间 */ endTimeRj: string;
  /** 热矫钢板温度 */ entryTempRj?: number;
  /** 热矫是否空过 */ emptyFlagRj?: number;
  /** 铸坯标识 */ cBilletTypeCode: string;
  /** C */ c?: number;
  /** SI */ si?: number;
  /** MN */ mn?: number;
  /** P */ p?: number;
  /** S */ s?: number;
  /** CR */ cr?: number;
  /** NI */ ni?: number;
  /** MO */ mo?: number;
  /** CU */ cu?: number;
  /** AL */ al?: number;
  /** TI */ ti?: number;
  /** NB */ nb?: number;
  /** V */ v?: number;
  /** ALS */ als?: number;
  /** CA */ ca?: number;
  /** CEQ */ ceq?: number;
  /** B */ b?: number;
  /** ALINS */ alins?: number;
  /** W */ w?: number;
  /** AS */ as?: number;
  /** SN */ sn?: number;
  /** CO */ co?: number;
  /** PB */ pb?: number;
  /** SB */ sb?: number;
  /** TA */ ta?: number;
  /** ZR */ zr?: number;
  /** BI */ bi?: number;
  /** SE */ se?: number;
  /** TE */ te?: number;
  /** CE */ ce?: number;
  /** LA */ la?: number;
  /** N */ n?: number;
}

export interface DtoQueryHR9410 {
  /** 时间范围 */ timeRange?: TimeRange;
  /** 提料计划号 */ cOrderNo?: string | null;
  /** 组批号 */ cBatchOrder?: string | null;
  /** 炉号 */ cStoveNo?: string | null;
  /** 切边方式 */ cTrimFlag?: string | null;
  /** 订单钢种 */ cSgCodeOrder?: string | null;
  /** 坯料钢种 */ cSgCodeLg?: string | null;
}

export interface QueryHR9420Dto {
  /** 日期 */ date?: string;
  /** 总块数 */ nQuaAll?: number;
  /** 班组 */ group: string;
  /** 班组火切块数 */ nQuaGroup?: number;
  /** 责任者 */ cAuthor: string;
  /** 个人火切块数 */ nQuaAuthor?: number;
  /** 当班入库量 */ nQuaGroupRK?: number;
  /** 当天入库量 */ nQuaDayRK?: number;
}

export interface Tmp2000HzDto {
  /** 主键 */ id: string;
  /** 订单状态 */ nStatus: number;
  /** 创建人 */ creator: string;
  /** 创建时间 */ createTime?: string;
  /** 最后修改人 */ lastModifier: string;
  /** 最后修改时间 */ lastModifyTime?: string;
  /** 订单号 */ cOrderNo: string;
  /** 合同号 */ cConNo: string;
  /** 钢种 */ cSgCode: string;
  /** 执行标准 */ cSgStd: string;
  /** 规格 */ cSpec: string;
  /** 订单重量 */ nWgt?: number;
  /** 厚度目标值 */ nThick?: number;
  /** 厚度下限 */ nThickMin?: number;
  /** 厚度上限 */ nThickMax?: number;
  /** 宽度目标值 */ nWidth?: number;
  /** 宽度下限 */ nWidthMin?: number;
  /** 宽度上限 */ nWidthMax?: number;
  /** 长度目标值 */ nLen?: number;
  /** 长度类型 */ cLengthType: number;
  /** 长度下限 */ nLenMin?: number;
  /** 长度上限 */ nLenMax?: number;
  /** 钢类 */ cSteelType: string;
  /** 品名代码 */ cProdCode: string;
  /** 产线代码 */ cLineCode: string;
  /** 单倍尺 */ nDbc?: number;
  /** 订货件数 */ nNum?: number;
  /** 冶金规范 */ cMsc: string;
  /** 产品规范码 */ cPsc: string;
  /** 冶金规范产线号 */ cMscLineNo: string;
  /** 产线描述 */ cMscLineDesc: string;
  /** 全程工序码 */ cWholeBacklog: string;
  /** 全程工序说明 */ cWholeBacklogDesc: string;
  /** 交货状态 */ cDelivyStatusCode: string;
  /** 加工用途代码 */ cCustStdCode: string;
  /** 订货客户编码 */ cOrderCustNo: string;
  /** 订货客户中文名称 */ cOrderCustCname: string;
  /** 结算单位 */ cOrderCustEname: string;
  /** 重点品种 */ cProductH: string;
  /** 合同性质QAA期货 */ cOrderTypeCode: string;
  /** 出口标志 */ cExportFlag: string;
  /** 订单日期 */ dOrderTime?: string;
  /** 合同交货期 */ dJhqTime?: string;
  /** 物料编码 */ cMatCode: string;
  /** 物料名称 */ cMatName: string;
  /** 自备坯R */ cSlabType: string;
  /** 合同备注 */ cConRemark: string;
  /** 工艺/性能要求 */ cSpecialMarkGy: string;
  /** 质保书要求 */ cWarrantyDesc: string;
  /** 特殊包装要求 */ cPackCode: string;
  /** 合同处理标志（ */ nOrderProcFlag: number;
  /** 计重方式 */ cDelivyQtyFlag: string;
  /** 部门编码 */ cDeptCode: string;
  /** 计划类型 */ nFlag: number;
  /** 品名名称 */ cProdName: string;
  /** 交货状态说明 */ cDelivyStatusDesc: string;
  /** 加工用途说明 */ cCustStdDesc: string;
  /** 1待封锁 */ nApplyCloseStatus?: number;
  /** 申请关闭人 */ cApplyCloseEmp: string;
  /** 申请关闭时间 */ dApplyCloseDt?: string;
  /** 申请关闭说明 */ cApplyCloseRemark: string;
  /** 质量设计号 */ cDesignNo: string;
  /** 质量设计失败说明 */ cDesignDesc: string;
  /** 单量上限 */ nWtMax?: number;
  /** 单量下限 */ nWtMin?: number;
  /** 发送次数 */ nSendNum?: number;
  /** 边部宽度余量 */ nWidthWgt?: number;
  /** 切边方式 */ cTrimFlag: string;
  /** 探伤等级 */ cFlawDesc: string;
  /** 流向 */ cDelivyAddress: string;
  /** 公差标准 */ cTol: string;
  /** 短溢装比例 */ cOverstepBl: string;
  /** 入库标识 */ cInboundNo: string;
  /** 形状代码 */ cShape: string;
  /** 内控钢种 */ cSgCodeNk: string;
  /** 合同处理操作人 */ cOrderProcUserid: string;
  /** 合同处理时间 */ dOrderProcTime?: string;
  /** 轧钢工艺编码 */ cZggyCode: string;
  /** 下发生产人 */ cPushUserid: string;
  /** 下发生产时间 */ dPushTime?: string;
  /** 销售下提报人 */ cSendUserid: string;
  /** 销售提报时间 */ dSendTime?: string;
  /** 厚度下偏差 */ nThickTolMin?: number;
  /** 厚度上偏差 */ nThickTolMax?: number;
  /** 宽度下偏差 */ nWidthTolMin?: number;
  /** 宽度上偏差 */ nWidthTolMax?: number;
  /** 长度下偏差 */ nLenTolMin?: number;
  /** 长度上偏差 */ nLenTolMax?: number;
  /** 预计船期 */ dTimeShipment?: string;
  /** 加热轧制工艺编码 */ cJrzzgyCode: string;
  /** 剪切工艺编码 */ cJqgyCode: string;
  /** 是否工程单 */ cExitem1: string;
  /** 申请通知 */ nExitem2?: number;
  /** 原始订单号 */ cExitem3: string;
  /** 生产退回销售订单原因 */ cBackRemark: string;
  /** 变更原因 */ cExitem4: string;
  /** 合同备注2 */ cConRemark2: string;
  /** 平直度 */ cGf: string;
  /** 公差标准 */ cGcStd: string;
  /** 探伤标准 */ cTsStd: string;
  /** Z性能标准 */ cZStd: string;
  /** 生产长度变更标记 */ cLengthFlag: string;
  /** 是否带走余量材 */ cIFYlc: string;
  /** 销售业务员 */ cSaleEmp: string;
  /** 是否已提料 */ isTl: string;
  /** 是否生成日计划 */ isDaliy: string;
  /** 炼钢产出块数 */ nQuaLg?: number;
  /** 炼钢产出重量 */ nWgtLg?: number;
  /** 轧制完成块数 */ nQuaZz?: number;
  /** 轧制完成重量 */ nWgtZz?: number;
  /** 堆冷中块数 */ nQuaDl?: number;
  /** 堆冷中重量 */ nWgtDl?: number;
  /** 剪切完成块数 */ nQuaJq?: number;
  /** 剪切完成重量 */ nWgtJq?: number;
  /** 计划生产块数 */ nQuaJh?: number;
  /** 允许非计划块数 */ nQuaYxFjh?: number;
  /** 短尺块数 */ nQuaDc?: number;
  /** 超长块数 */ nQuaCc?: number;
  /** 非计划比例 */ nPerFjh?: number;
  /** 精整中块数 */ nQuaJz?: number;
  /** 精整中重量 */ nWgtJz?: number;
  /** 成品入库块数 */ nQuaCp?: number;
  /** 成品入库重量 */ nWgtCp?: number;
  /** 发货块数 */ nQuaFh?: number;
  /** 发货重量 */ nWgtFh?: number;
}

export interface Tyd2000OrderDto {
  /** 产线 */ cLineCode: string;
  /** 订单号 */ cOrderNo: string;
  /** 批号 */ cBatchNo: string;
  /** 炉号 */ cStove: string;
  /** 件次号 */ cPieceNo: string;
  /** 是否超长 */ cIsCc: string;
  /** 是否短尺 */ cIsDc: string;
  /** 库存分类 */ nProType: number;
  /** 板坯号 */ cPieceNoSlab: string;
  /** 钢种 */ cSgCode: string;
  /** 执行标准 */ cSgStd: string;
  /** 规格 */ cSpec: string;
  /** 支数 */ nNum: number;
  /** 实重 */ nWgt: number;
  /** 产出时间 */ dProTime: string;
  /** 产出人 */ cProUser: string;
  /** 产出班次 */ cShiftNo: string;
  /** 产出班组 */ cGroupNo: string;
  /** 入库时间 */ dInTime?: string;
  /** 入库人 */ cInUser: string;
  /** 库区号 */ cStoreCode: string;
  /** 垛位号 */ cStackNo: string;
  /** 层号 */ cStackNum: string;
  /** 库存状态 */ nStatus: number;
  /** 生产备注 */ cProRemark: string;
}

export interface QueryOrderDto {
  /** 时间区间 */ timeRange?: TimeRange;
  /** 产线 */ cLineCode?: string | null;
  /** 订单号 */ cOrderNo?: string | null;
  /** 批量订单号 */ cOrderNos?: string[];
  /** 钢种 */ cSgCode?: string | null;
  /** 执行标准 */ cSgStd?: string | null;
  /** 客户名称 */ cCustName?: string | null;
  /** 入库标识 */ cInboundNo?: string | null;
}

export interface FrmQL8100QueryInputDto {
  /** 委托单号 */ cTestNo?: string | null;
  /** 炉号 */ cStove?: string | null;
  /** 批号 */ cBatch?: string | null;
  /** 钢种 */ cSgSign?: string | null;
  /** 执行标准 */ cSgStd?: string | null;
  /** 试验项目种类 */ testItemType?: string | null;
  /** 检验时间 */ completeTime?: TimeRange;
}


/* ---------- 批次4 台账报表组：新服务 ---------- */

export const hR4500Api = {
  /** 班次分组初始化（HR4500 Load） */
  createShiftGroup() {
    return requestClient.request<void>(
      "/dDH.Service.SHR.Services/hR4500/createShiftGroup",
      { method: "post" },
    );
  },
  /** 日产量汇总 */
  queryDayCl(data?: TimeRange) {
    return requestClient.request<ClHzDto[]>(
      "/dDH.Service.SHR.Services/hR4500/queryDayCl",
      { method: "post", data },
    );
  },
  /** 日产量明细 */
  queryDayHz(data?: TimeRange) {
    return requestClient.request<Hr4500HzDto[]>(
      "/dDH.Service.SHR.Services/hR4500/queryDayHz",
      { method: "post", data },
    );
  },
};

export const hR4600Api = {
  /** 炼钢热送统计 */
  queryRsl(data?: TimeRange) {
    return requestClient.request<RslDto[]>(
      "/dDH.Service.SHR.Services/hR4600/queryRsl",
      { method: "post", data },
    );
  },
  /** 热装率统计 */
  queryRzl(data?: TimeRange) {
    return requestClient.request<RzlDto[]>(
      "/dDH.Service.SHR.Services/hR4600/queryRzl",
      { method: "post", data },
    );
  },
  /** 热送-按炉 */
  queryStoveRslDtos(data?: TimeRange) {
    return requestClient.request<StoveRslDto[]>(
      "/dDH.Service.SHR.Services/hR4600/queryStoveRslDtos",
      { method: "post", data },
    );
  },
};

export const hR4700Api = {
  /** 厚不合台账（HR4700） */
  queryThickHz(data?: TimeRange) {
    return requestClient.request<QueryThickHzDto[]>(
      "/dDH.Service.SHR.Services/hR4700/queryThickHz",
      { method: "post", data },
    );
  },
  /** 长不合台账（HR4710） */
  queryLenHz(data?: TimeRange) {
    return requestClient.request<QueryLenHzDto[]>(
      "/dDH.Service.SHR.Services/hR4700/queryLenHz",
      { method: "post", data },
    );
  },
  /** 宽不合台账（HR4720） */
  queryWidthHz(data?: TimeRange) {
    return requestClient.request<QueryWidthHzDto[]>(
      "/dDH.Service.SHR.Services/hR4700/queryWidthHz",
      { method: "post", data },
    );
  },
};

export const hR4800Api = {
  /** 理论成材率查询（HR4800） */
  queryLlCcl(data?: TimeRange) {
    return requestClient.request<CclDto[]>(
      "/dDH.Service.SHR.Services/hR4800/queryLlCcl",
      { method: "post", data },
    );
  },
};

export const hR4810Api = {
  /** 实际成材率明细（HR4810） */
  get4810Dtos(data?: DtoQueryThr4810) {
    return requestClient.request<Thr4810Dto[]>(
      "/dDH.Service.SHR.Services/hR4810/get4810Dtos",
      { method: "post", data },
    );
  },
  get4810CclHzDtos(data?: Thr4810Dto[]) {
    return requestClient.request<Thr4810CclHzDto[]>(
      "/dDH.Service.SHR.Services/hR4810/get4810CclHzDtos",
      { method: "post", data },
    );
  },
  get4810CclSgCodeHzDtos(data?: Thr4810Dto[]) {
    return requestClient.request<Thr4810CclHzDto[]>(
      "/dDH.Service.SHR.Services/hR4810/get4810CclSgCodeHzDtos",
      { method: "post", data },
    );
  },
  get4810CclThickHzDtos(data?: Thr4810Dto[]) {
    return requestClient.request<Thr4810CclHzDto[]>(
      "/dDH.Service.SHR.Services/hR4810/get4810CclThickHzDtos",
      { method: "post", data },
    );
  },
  get4810CclGroupHzDtos(data?: Thr4810Dto[]) {
    return requestClient.request<Thr4810CclHzDto[]>(
      "/dDH.Service.SHR.Services/hR4810/get4810CclGroupHzDtos",
      { method: "post", data },
    );
  },
  get4810CclDayHzDtos(data?: Thr4810Dto[]) {
    return requestClient.request<Thr4810CclHzDto[]>(
      "/dDH.Service.SHR.Services/hR4810/get4810CclDayHzDtos",
      { method: "post", data },
    );
  },
};

export const hR4830Api = {
  /** 生产计划成材率统计汇总（HR4830） */
  queryHR4830Dtos(data?: TimeRange) {
    return requestClient.request<QueryHR4830Dto[]>(
      "/dDH.Service.SHR.Services/hR4830/queryHR4830Dtos",
      { method: "post", data },
    );
  },
};

export const hR4900Api = {
  /** 防瓢曲台账（HR4900） */
  get4900Dtos(data?: TimeRange) {
    return requestClient.request<QueryHR4900Dto[]>(
      "/dDH.Service.SHR.Services/hR4900/get4900Dtos",
      { method: "post", data },
    );
  },
};

export const hR9300Api = {
  /** 工艺判定报表主查询（HR9300） */
  query9300(data?: DtoQueryThr3000) {
    return requestClient.request<QueryHR9300Dto[]>(
      "/dDH.Service.SHR.Services/hR9300/query9300",
      { method: "post", data },
    );
  },
  get9300HzRm(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzRm",
      { method: "post", data },
    );
  },
  get9300HzFmStart(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzFmStart",
      { method: "post", data },
    );
  },
  get9300HzFmEnd(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzFmEnd",
      { method: "post", data },
    );
  },
  get9300HzRmGroupHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzRmGroupHz",
      { method: "post", data },
    );
  },
  get9300HzFmStGroupHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzFmStGroupHz",
      { method: "post", data },
    );
  },
  get9300HzFmEndGroupHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzFmEndGroupHz",
      { method: "post", data },
    );
  },
  get9300HzInFurTimeGroupHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzInFurTimeGroupHz",
      { method: "post", data },
    );
  },
  get9300HzOutFurTempGroupHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzOutFurTempGroupHz",
      { method: "post", data },
    );
  },
  get9300HzFinishTempGroupHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzFinishTempGroupHz",
      { method: "post", data },
    );
  },
  get9300HzFinishTempAuthorHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzFinishTempAuthorHz",
      { method: "post", data },
    );
  },
  get9300HzEntryTempGroupHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzEntryTempGroupHz",
      { method: "post", data },
    );
  },
  get9300HzEntryTempAuthorHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzEntryTempAuthorHz",
      { method: "post", data },
    );
  },
  get9300HzFmTempAuthorHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzFmTempAuthorHz",
      { method: "post", data },
    );
  },
  get9300HzFmTempGroupHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzFmTempGroupHz",
      { method: "post", data },
    );
  },
  get9300HzRollTempHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzRollTempHz",
      { method: "post", data },
    );
  },
  get9300HzACCTempGroupHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzACCTempGroupHz",
      { method: "post", data },
    );
  },
  get9300HzACCTempAuthorHz(data?: QueryHR9300Dto[]) {
    return requestClient.request<QueryHR9300HzDto[]>(
      "/dDH.Service.SHR.Services/hR9300/get9300HzACCTempAuthorHz",
      { method: "post", data },
    );
  },
};

export const hR9320Api = {
  /** 性能台账（HR9320） */
  get9320Dtos(data?: FrmQL8100QueryInputDto) {
    return requestClient.request<QueryHR9320Dto[]>(
      "/dDH.Service.SHR.Services/hR9320/get9320Dtos",
      { method: "post", data },
    );
  },
};

export const hR9400Api = {
  /** 中厚板轧制台账（HR9400） */
  getHR9400Dtos(data?: DtoQueryHR9400) {
    return requestClient.request<HR9400Dto[]>(
      "/dDH.Service.SHR.Services/hR9400/getHR9400Dtos",
      { method: "post", data },
    );
  },
  /** 性能判定台账（HR9410） */
  getHR9410Dtos(data?: DtoQueryHR9410) {
    return requestClient.request<Thr9410Dto[]>(
      "/dDH.Service.SHR.Services/hR9400/getHR9410Dtos",
      { method: "post", data },
    );
  },
};

export const hR9420Api = {
  /** 中厚板火切台账（HR9420） */
  get9420Dtos(data?: TimeRange) {
    return requestClient.request<QueryHR9420Dto[]>(
      "/dDH.Service.SHR.Services/hR9420/get9420Dtos",
      { method: "post", data },
    );
  },
};

export const hR9500Api = {
  /** 销售订单跟踪查询（HR9500） */
  queryOrderGz(data?: QueryOrderDto) {
    return requestClient.request<Tmp2000HzDto[]>(
      "/dDH.Service.SHR.Services/hR9500/queryOrderGz",
      { method: "post", data },
    );
  },
  /** 订单库存查询（HR9500） */
  queryOrderKc(cOrderNo?: string) {
    return requestClient.request<Tyd2000OrderDto[]>(
      "/dDH.Service.SHR.Services/hR9500/queryOrderKc",
      { method: "post", params: { cOrderNo } },
    );
  },
};

export interface TiL2me18Dto {
  /** 板坯号 */ slabNo: string;
  /** HSB测宽头部平均宽度(冷态) */ hSBheadAveWidth?: number;
  /** HSB测宽中部平均宽度(冷态) */ hSBbodyAveWidth?: number;
  /** HSB测宽尾部平均宽度(冷态) */ hSBtailAveWidth?: number;
  /** HSB测宽全长平均宽度(冷态) */ hSBaveWidth?: number;
  /** RM测宽头部平均宽度(冷态) */ rMheadAveWidth?: number;
  /** RM测宽中部平均宽度(冷态) */ rMbodyAveWidth?: number;
  /** RM测宽尾部平均宽度(冷态) */ rMtailAveWidth?: number;
  /** RM测宽全长平均宽度(冷态) */ rMaveWidth?: number;
  /** 平直度仪最大宽度(冷态) */ rSLTmaxWidth?: number;
  /** 平直度仪最小宽度(冷态) */ rSLTminWidth?: number;
  /** 平直度仪平均宽度(冷态) */ rSLTavewidth?: number;
  /** 预留 */ spare1: number[];
  /** 预留 */ spare2: number[];
}


export const hR3800Api = {
  /** 在制品材料查询（原 QuerySlab，FrmHR3800 DataBind） */
  querySlab(data?: DtoQueryThr3800SlabInfo) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SHR.Services/hR3800/querySlab",
      {
        method: "post",
        data,
      },
    );
  },
  /** 修磨日志查询（原 QueryThr3800s，FrmHR3800 DataBindXM） */
  queryThr3800s(timeRange?: TimeRange) {
    return requestClient.request<Thr3800[]>(
      "/dDH.Service.SHR.Services/hR3800/queryThr3800s",
      {
        method: "post",
        data: timeRange,
      },
    );
  },
  /** 修磨提交（原 FrmHR3800_Add 内部保存） */
  addThr3800(data?: Thr3800Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SHR.Services/hR3800/addThr3800",
      {
        method: "post",
        data,
      },
    );
  },
};
