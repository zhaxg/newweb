/**
 * SHR 域后端接口（dDH.Service.*）：枚举 + 类型 + 请求，单文件维护。
 * 原 src/api/shr 的 enums.ts / types.d.ts / request.ts 合并。
 */

import { requestClient } from "@/api/_core/request";

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
}
export interface DtoQueryThr3000 {
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
}
export interface Thr4000Edit {
  id?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  nThick?: number;
  nWidth?: number;
  nLen?: number;
  cInboundNo?: string | null;
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
    return requestClient.request<TiL2me05[]>(
      "/dDH.Service.SHR.Services/hR4200/queryTiL2me05s",
      {
        method: "post",
        data,
      },
    );
  },
  queryTiL2me06s(data?: DtoQueryL2) {
    return requestClient.request<TiL2me06[]>(
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
    return requestClient.request<TiL2me18[]>(
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
