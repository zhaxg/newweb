/**
 * SYD 域后端接口（dDH.Service.*）：枚举 + 类型 + 请求，单文件维护。
 * 原 src/api/syd 的 enums.ts / types.d.ts / request.ts 合并。
 */

import { requestClient } from "@/api/_core/request";

/* ---------- 枚举 ---------- */

export enum CPStorageInWayEnum {
  ScanInStorage = 0,
  ManualInStorage = 1,
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
export enum InventoryPlanStatusEnum {
  NotStarted = 0,
  InProgress = 10,
  Completed = 20,
  Del = 99,
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
export enum PdResultEnum {
  NotChecked = 0,
  Overage = 10,
  Shortage = 20,
  Normal = 30,
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
export enum RoomTypeEnum {
  P = 0,
  C = 10,
  UnKnow = 99,
}
export enum StorageInOutTypeEnum {
  SL = 0,
  SLRK = 1,
  DBRK = 3,
  ZZRK = 4,
  CPRK = 5,
  DDRK = 6,
  GPRK = 7,
  CancelXHRK = 8,
  FHCK = 100,
  TKCK = 101,
  DBCK = 103,
  ZZCK = 104,
  CPTK = 105,
  DDCK = 106,
  GPCK = 107,
  XHCK = 108,
  THRK = 201,
}
export enum SurFaceResultEnum {
  None = 0,
  Pass = 10,
  NoPass = 20,
  LetPass = 30,
}
export enum Tyd2010TypeEnum {
  DB201 = 201,
  DB202 = 202,
  DB203 = 203,
}
export enum Tyd2011StatusEnum {
  Request = 0,
  Cancel = 10,
  Out = 30,
  Accpet = 50,
  UnAccept = 99,
}
export enum UserType {
  /** 普通用户 */
  Nomral = 0,
  /** 普通管理员 */
  Admin = 7,
  /** 超级管理员 */
  Root = 9,
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

/* ---------- 类型 ---------- */


export interface AppQueryStorageDto {
  dProTime?: TimeRange;
  nStatus?: InventoryStatusEnum | null;
  cLineCode?: string | null;
  cStoreCode?: string | null;
  cBatchNo?: string | null;
  cStackNo?: string | null;
  cStove?: string | null;
  cPieceNoSlab?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: DecimalRange;
  nWth?: DecimalRange;
  nLen?: DecimalRange;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  customerName?: string | null;
  cInboundNo?: string | null;
}
export interface CPStoragePosition {
  cStore?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cPieceNo?: string | null;
  inWay?: CPStorageInWayEnum;
}
export interface ConsumeStorageDto {
  beforeStatus?: InventoryStatusEnum | null;
  afterStatus?: InventoryStatusEnum | null;
  planNo?: string | null;
  pieceNos?: string[] | null;
}
export interface DBDto {
  nBusinsType?: Tyd2010TypeEnum;
  target?: StoragePosition | null;
  pieceNos?: string[] | null;
  remark?: string | null;
  carNo?: string | null;
}
export interface DBRKDto {
  yd2020Id?: string | null;
  target?: StoragePosition | null;
  isAutoStackNum?: boolean;
}
export interface DDDto {
  cStore?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSgCode?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cPieceNo?: string | null;
  isAuto?: boolean;
}
export interface DecimalRange {
  min?: number | null;
  max?: number | null;
  equalsMethod?: EqualsFlag;
}
export interface EntruckingStorageDto {
  cStoreCode?: string | null;
  pieceNos?: string[] | null;
}
export interface InventoryPlanQueryDto {
  inventoryPlanNo?: string | null;
  lineCode?: string | null;
  startDate?: string | null;
  endDate?: string;
  pieceNo?: string | null;
  stackNum?: string | null;
  storeCode?: string | null;
  stackNo?: string | null;
}
export interface InventoryResult {
  selected?: boolean;
  id?: string | null;
  cLineCode?: string | null;
  cInventoryPlanNo?: string | null;
  dPlanStartTime?: string | null;
  dPlanEndTime?: string | null;
  cPlanStatus?: InventoryPlanStatusEnum;
  cInventoryType?: string | null;
  cPlanDescription?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackType?: number | null;
  cRemark?: string | null;
  nMaxNum?: number | null;
  nMaxWgt?: number | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cHallNo?: string | null;
  nRow?: number | null;
  nColv?: number | null;
  cArer?: string | null;
  cDefault?: string | null;
  cStoreDes?: string | null;
  nType?: number | null;
  cStoreType?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cProc?: string | null;
  cMachine?: string | null;
  cPlanNo?: string | null;
  cConNo?: string | null;
  cOrderNo?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  cSpec?: string | null;
  nNum?: number | null;
  nCalWgt?: number | null;
  nWgt?: number | null;
  dProTime?: string;
  cProUser?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dInTime?: string | null;
  cInUser?: string | null;
  cStackNum?: string | null;
  cSourceStoreCode?: string | null;
  cSourceStackNo?: string | null;
  cSourceStackNum?: string | null;
  nStatus?: InventoryStatusEnum | null;
  cIsHot?: string | null;
  cProRemark?: string | null;
  nCastDivCode?: number | null;
  cLockedLine?: string | null;
  cLockedPlan?: string | null;
  cMatType?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cBatchNo?: string | null;
  cOrderNoLast?: string | null;
  cDestination?: string | null;
  cHotNo?: string | null;
  cSlabType?: string | null;
  cPieceNoSlab?: string | null;
  cPrintCode?: string | null;
  cProdCode?: string | null;
}
export interface MatchPlanStorageDto {
  beforeStatus?: InventoryStatusEnum | null;
  afterStatus?: InventoryStatusEnum | null;
  cLineCode?: string | null;
  planNo?: string | null;
  pieceNos?: string[] | null;
}
export interface QueryDBDto {
  cStore?: string | null;
  cTarStore?: string | null;
  timeRange?: TimeRange;
  dbStatus?: number | null;
  cStatus?: string | null;
  cBusinsNo?: string | null;
  cCarNo?: string | null;
  cPieceNo?: string | null;
}
export interface QueryInOrOutInputDto {
  cStoreCode?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: DecimalRange;
  nWth?: DecimalRange;
  nLen?: DecimalRange;
  dTime?: TimeRange;
}
export interface QueryNotInStorageDto {
  dProTime?: TimeRange;
  cLineCode?: string | null;
  cStoreCode?: string | null;
  cBatchNo?: string | null;
  cStackNo?: string | null;
  cStove?: string | null;
  cPieceNoSlab?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: DecimalRange;
  nWth?: DecimalRange;
  nLen?: DecimalRange;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  customerName?: string | null;
  cInboundNo?: string | null;
  nProType?: number | null;
  nStatus?: number | null;
}
export interface RKDBDto {
  cStore?: string | null;
  carNo?: string | null;
  /** 备注 */
  remark?: string | null;
  pieceNos?: string[] | null;
}
export interface SlSjInfoDto {
  productUser?: string | null;
  productTime?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  records?: Tyd2000Dto[] | null;
}
export interface StorageDDDto {
  operateUser?: string | null;
  operateTime?: string;
  ddType?: string | null;
  cPieceNo?: string | null;
  cStore?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
}
export interface StorageGPDto {
  operateUser?: string | null;
  operateTime?: string;
  cPieceNo?: string | null;
  cStore?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
}
export interface StorageInOutDto {
  beforeStatus?: InventoryStatusEnum | null;
  afterStatus?: InventoryStatusEnum | null;
  inOutUser?: string | null;
  inOutTime?: string;
  inOutType?: string | null;
  busNo?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  inOutTypeEnum?: StorageInOutTypeEnum;
  pieceNos?: string[] | null;
}
export interface StorageInputDto {
  storeCodeRange?: string[] | null;
  cStoreCode?: string | null;
  cBatchNo?: string | null;
  cStackNo?: string | null;
  cStove?: string | null;
  cPieceNoSlab?: string | null;
  cPieceNo?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: DecimalRange;
  nWth?: DecimalRange;
  nLen?: DecimalRange;
  dProTime?: TimeRange;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  customerName?: string | null;
  cInboundNo?: string | null;
  dInTime?: TimeRange;
  cInUser?: string | null;
}
export interface StoragePosition {
  cStore?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSgCode?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
}
export interface StorageRecordDto {
  operateUser?: string | null;
  operateTime?: string;
  remark?: string | null;
  pieceNos?: string[] | null;
}
export interface StorageSearchInput {
  cStove?: string | null;
  cBatchNo?: string | null;
  cPieceNo?: string | null;
}
export interface StoreMapInputDto {
  roomId?: string | null;
  stackNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cCon?: string | null;
  cOrderNo?: string | null;
  customerName?: string | null;
  thick?: DecimalRange;
  width?: DecimalRange;
  len?: DecimalRange;
}
export interface StoreMapItemDto {
  mapId?: string | null;
  mapName?: string | null;
  templateByte?: string | null;
  tyd1003s?: Tyd1003[] | null;
}
export interface TestUser {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  cDepartment?: string | null;
  cEducation?: string | null;
  cEmail?: string | null;
  cIdCardNo?: string | null;
  lastModifier?: string | null;
  cMaster?: string | null;
  cNation?: string | null;
  cNativePlace?: string | null;
  cPassword?: string | null;
  cPhone?: string | null;
  cPoliticsStatus?: string | null;
  cPosition?: string | null;
  cPost?: string | null;
  cSbcard?: string | null;
  cSex?: string | null;
  cStatus?: string | null;
  cTimestamp?: string;
  cUserName?: string | null;
  cUserType?: UserType;
  createTime?: string | null;
  lastModifyTime?: string | null;
}
export interface TimeRange {
  min?: string | null;
  max?: string | null;
  timeSpan?: string;
  equalsMethod?: EqualsFlag;
}
export interface Tyd1000 {
  selected?: boolean;
  id?: string | null;
  cStoreCode?: string | null;
  cStoreDes?: string | null;
  cStoreType?: string | null;
  cRemark?: string | null;
  cValidFlag?: number;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nType?: RoomTypeEnum;
}
export interface Tyd1002 {
  selected?: boolean;
  id?: string | null;
  cStoreCode?: string | null;
  listStoreCode?: string[] | null;
  cTemplateData?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cName?: string | null;
}
export interface Tyd1003 {
  selected?: boolean;
  id?: string | null;
  cpId?: string | null;
  cStoreCode?: string | null;
  cArer?: string | null;
  nRow?: number | null;
  nCol?: number | null;
  cRange?: string | null;
  cName?: string | null;
}
export interface Tyd1010 {
  selected?: boolean;
  id?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackType?: number;
  cRemark?: string | null;
  nMaxNum?: number;
  nMaxWgt?: number;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cHallNo?: string | null;
  nRow?: number;
  nCol?: number;
  cArer?: string | null;
  cDefault?: string | null;
}
export interface Tyd1010Dto {
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackType?: number;
  cHallNo?: string | null;
  cArer?: string | null;
  cStackNum?: string | null;
  cSgCode?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cSpec?: string | null;
}
export interface Tyd1100 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStoreCode?: string | null;
  cCarNo?: string | null;
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
  cStrandNo?: string | null;
  cPlanId?: string | null;
  cPono?: string | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cRemark?: string | null;
  cMsc?: string | null;
  cMscLine?: string | null;
  cStNo?: string | null;
  cIsFinishPath?: string | null;
  cRouteCode?: string | null;
  cCcfs?: string | null;
  cSlabSource?: string | null;
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
export interface Tyd2000Dto {
  selected?: boolean;
  id?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  nProType?: NProTypeEnum;
  cPrintCode?: string | null;
  cLineCode?: string | null;
  cProc?: string | null;
  cMachine?: string | null;
  cStrandNo?: string | null;
  cPlanId?: string | null;
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
  cIsHot?: YesNoDefault;
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
  nQmStatus?: QMStatuEnum;
  nLockReason?: string | null;
  nQmLevel?: QMLevelEnum;
  cIsSurface?: YesNoDefault;
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
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cDelivyAddress?: string | null;
  cWgtToler?: string | null;
  cBilletTypeCode?: string | null;
  cCusName?: string | null;
  cAutoJudgeResult?: string | null;
  cJudgeUser?: string | null;
  dJudgeTime?: string | null;
  cJudgeResult?: string | null;
  cJudgeRemark?: string | null;
  cStatus?: string | null;
  cRecheckFlag?: string | null;
  cBatchOrder?: string | null;
  cTlSgCode?: string | null;
  dOutTime?: string | null;
  cIsQy?: string | null;
  cPlanTime?: string | null;
  cOrderCustCname?: string | null;
  cInboundNo1?: string | null;
  cInboundNo2?: string | null;
  cInboundNo3?: string | null;
  cInboundNo4?: string | null;
  cInboundNo5?: string | null;
  cInboundNo6?: string | null;
  nKSgCode?: string | null;
  cSpecialMarkGy?: string | null;
  nBoarCleanLen?: number | null;
  cTol?: string | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nDbc?: number | null;
  cIsFinishPath?: string | null;
  cRouteCode?: string | null;
  cPono?: string | null;
  cCcfs?: string | null;
  cMsc?: string | null;
  cMscLine?: string | null;
  cStNo?: string | null;
  cRemark?: string | null;
  cArer?: string | null;
}
export interface Tyd2000InOutRecord {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cLineCode?: string | null;
  cMatCode?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number;
  nWth?: number | null;
  nLen?: number | null;
  nLenMin?: number | null;
  nLenMax?: number | null;
  cSpec?: string | null;
  nNum?: number;
  nWgt?: number;
  cOrderNo?: string | null;
  nBusinsType?: StorageInOutTypeEnum;
  dTime?: string;
  cUser?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cSourceStoreCode?: string | null;
  cSourceStackNo?: string | null;
  cSourceStackNum?: string | null;
  cType?: string | null;
  cBusNo?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  cIsDisable?: YesNo;
  nProType?: NProTypeEnum;
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
export interface Tyd2000PdPlan {
  selected?: boolean;
  id?: string | null;
  cLineCode?: string | null;
  cInventoryPlanNo?: string | null;
  dPlanStartTime?: string | null;
  dPlanEndTime?: string | null;
  cPlanStatus?: InventoryPlanStatusEnum;
  cInventoryType?: string | null;
  cPlanDescription?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  inventoryAreas?: Tyd2000PdPlanArea[] | null;
}
export interface Tyd2000PdPlanArea {
  selected?: boolean;
  id?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cInventoryPlanNo?: string | null;
}
export interface Tyd2000PdResult {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cPrintCode?: string | null;
  cOrderNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  nCalWgt?: number | null;
  nWgt?: number | null;
  cInventoryPlanNo?: string | null;
  cPdResult?: PdResultEnum;
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
export interface Tyd2000Record {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cRecordRemark?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
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
  cIsHot?: string | null;
  cProRemark?: string | null;
  nCastDivCode?: CastDivEnum;
  cLockedLine?: string | null;
  cLockedPlan?: string | null;
  cMatType?: string | null;
  cSteelType?: string | null;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  cBatchNo?: string | null;
  cOrderNoLast?: string | null;
  cDestination?: string | null;
  cHotNo?: string | null;
  cSlabType?: string | null;
  cPieceNoSlab?: string | null;
  cPrintCode?: string | null;
  cProdCode?: string | null;
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
  cDetectDefectLevel?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cDelivyAddress?: string | null;
  cWgtToler?: string | null;
  dTimestamp?: string;
  cBilletTypeCode?: string | null;
  cCusName?: string | null;
  nSurfaceThick1?: number | null;
  nSurfaceThick2?: number | null;
  nSurfaceThick3?: number | null;
  nSurfaceLen?: number | null;
  cSurfaceDefectPosition?: string | null;
  nSurfaceWidth?: number | null;
}
export interface Tyd2020 {
  selected?: boolean;
  id?: string | null;
  cBusinsNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cBatchNo?: string | null;
  cMachine?: string | null;
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
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dProTime?: string;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTarStoreCode?: string | null;
  cTarStackNo?: string | null;
  cTarStackNum?: string | null;
  nStatus?: Tyd2011StatusEnum;
  cIngotCode?: string | null;
  cReason?: string | null;
  cReqUser?: string | null;
  dReqTime?: string;
  cOutUser?: string | null;
  dOutTime?: string | null;
  cFinishUser?: string | null;
  dFinishTime?: string | null;
  nBusinsType?: Tyd2010TypeEnum;
  cUnacceptBusinsNo?: string | null;
  nUnacceptBusinsType?: number;
  nProType?: number;
  cDelivyStatusCode?: string | null;
  cCustStdCode?: string | null;
  nWgtP?: number;
  nWgtD?: number;
  cpStove?: string | null;
  cSteelType?: string | null;
  nCastDivCode?: number;
  cCarNo?: string | null;
  cInboundNo?: string | null;
  cCutFlag?: string | null;
}
export interface Tyd2020Dto {
  cBusinsNo?: string | null;
  nStatus?: string | null;
  cStoreCode?: string | null;
  dReqTime?: string;
  cReqUser?: string | null;
  nBusinsType?: Tyd2010TypeEnum;
  totalNum?: number;
  totalNWgt?: number;
  totalAccept?: number;
  totalAcceptWgt?: number;
  totalFinishNum?: number;
  totalFinishNWgt?: number;
  cTarStoreCode?: string | null;
  cTarStackNo?: string | null;
  cTarStackNum?: string | null;
  details?: Tyd2020[] | null;
  cCarNo?: string | null;
}

/* ---------- 请求 ---------- */



export const cPStorageApi = {
  cPInStorage(data?: CPStoragePosition[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/cPStorage/cPInStorage",
      {
        method: "post",
        data,
      },
    );
  },
  cPOutStorage(data?: CPStoragePosition[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/cPStorage/cPOutStorage",
      {
        method: "post",
        data,
      },
    );
  },
  queryStack(data?: StoragePosition) {
    return requestClient.request<Tyd1010Dto[]>(
      "/dDH.Service.SYD.Services/cPStorage/queryStack",
      {
        method: "post",
        data,
      },
    );
  },
  xnfh(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/cPStorage/xnfh",
      {
        method: "post",
        data,
      },
    );
  },
};

export const inventoryApi = {
  addInventoryArea(data?: Tyd2000PdPlanArea[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/addInventoryArea",
      {
        method: "post",
        data,
      },
    );
  },
  addInventoryList(data?: Tyd2000PdResult[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/addInventoryList",
      {
        method: "post",
        data,
      },
    );
  },
  addPlan(data?: Tyd2000PdPlan) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/addPlan",
      {
        method: "post",
        data,
      },
    );
  },
  delPlan(planId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/delPlan",
      {
        method: "post",
        params: { planId },
      },
    );
  },
  addInventoryResult(data?: InventoryResult[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/addInventoryResult",
      {
        method: "post",
        data,
      },
    );
  },
  queryInventoryArea(invList?: string) {
    return requestClient.request<Tyd2000PdPlanArea[]>(
      "/dDH.Service.SYD.Services.Inven/inventory/queryInventoryArea",
      {
        method: "post",
        params: { invList },
      },
    );
  },
  queryInventoryList(invPlan?: string) {
    return requestClient.request<Tyd2000PdResult[]>(
      "/dDH.Service.SYD.Services.Inven/inventory/queryInventoryList",
      {
        method: "post",
        params: { invPlan },
      },
    );
  },
  queryInventoryPlan(data?: InventoryPlanQueryDto) {
    return requestClient.request<Tyd2000PdPlan[]>(
      "/dDH.Service.SYD.Services.Inven/inventory/queryInventoryPlan",
      {
        method: "post",
        data,
      },
    );
  },
  queryInventoryResult(invResult?: string) {
    return requestClient.request<Tyd2000PdResult[]>(
      "/dDH.Service.SYD.Services.Inven/inventory/queryInventoryResult",
      {
        method: "post",
        params: { invResult },
      },
    );
  },
  startInventoryPlan(inventoryPlanNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/startInventoryPlan",
      {
        method: "post",
        params: { inventoryPlanNo },
      },
    );
  },
  updateInventoryResults(data?: InventoryPlanQueryDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/updateInventoryResults",
      {
        method: "post",
        data,
      },
    );
  },
  editInventoryResults(inventoryPlanNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services.Inven/inventory/editInventoryResults",
      {
        method: "post",
        params: { inventoryPlanNo },
      },
    );
  },
};

export const storageApi = {
  insertReceivingActual(data?: SlSjInfoDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/insertReceivingActual",
      {
        method: "post",
        data,
      },
    );
  },
  deleteReceivingActual(data?: StorageRecordDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/deleteReceivingActual",
      {
        method: "post",
        data,
      },
    );
  },
  inStorage(data?: StorageInOutDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/inStorage",
      {
        method: "post",
        data,
      },
    );
  },
  outStorage(data?: StorageInOutDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/outStorage",
      {
        method: "post",
        data,
      },
    );
  },
  matchPlan(data?: MatchPlanStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/matchPlan",
      {
        method: "post",
        data,
      },
    );
  },
  cancelMatchPlan(data?: MatchPlanStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/cancelMatchPlan",
      {
        method: "post",
        data,
      },
    );
  },
  consumeLocked(data?: ConsumeStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/consumeLocked",
      {
        method: "post",
        data,
      },
    );
  },
  cancelConsumeLocked(data?: ConsumeStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/cancelConsumeLocked",
      {
        method: "post",
        data,
      },
    );
  },
  consumeFinish(data?: ConsumeStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/consumeFinish",
      {
        method: "post",
        data,
      },
    );
  },
  cancelConsumeFinish(data?: ConsumeStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/cancelConsumeFinish",
      {
        method: "post",
        data,
      },
    );
  },
  entrucking(data?: EntruckingStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/entrucking",
      {
        method: "post",
        data,
      },
    );
  },
  cancelEntrucking(data?: EntruckingStorageDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/cancelEntrucking",
      {
        method: "post",
        data,
      },
    );
  },
  writeRecord(data?: StorageRecordDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/writeRecord",
      {
        method: "post",
        data,
      },
    );
  },
  dDStorage(data?: StorageDDDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/dDStorage",
      {
        method: "post",
        data,
      },
    );
  },
  gPStorage(data?: StorageGPDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/storage/gPStorage",
      {
        method: "post",
        data,
      },
    );
  },
};

export const storageRecordApi = {
  queryPLineCPReocrds(data?: QueryInOrOutInputDto) {
    return requestClient.request<Tyd2000InOutRecord[]>(
      "/dDH.Service.SYD.Services/storageRecord/queryPLineCPReocrds",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tyd1000Api = {
  queryRoom(keyword?: string) {
    return requestClient.request<Tyd1000[]>(
      "/dDH.Service.SYD.Services/tyd1000/queryRoom",
      {
        method: "post",
        params: { keyword },
      },
    );
  },
  queryStacks(room?: string) {
    return requestClient.request<Tyd1010[]>(
      "/dDH.Service.SYD.Services/tyd1000/queryStacks",
      {
        method: "post",
        params: { room },
      },
    );
  },
  queryManyStacks(data?: string[]) {
    return requestClient.request<Tyd1010[]>(
      "/dDH.Service.SYD.Services/tyd1000/queryManyStacks",
      {
        method: "post",
        data,
      },
    );
  },
  queryMap() {
    return requestClient.request<Tyd1002[]>(
      "/dDH.Service.SYD.Services/tyd1000/queryMap",
      {
        method: "post",
      },
    );
  },
  addMap(data?: Tyd1002) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1000/addMap",
      {
        method: "post",
        data,
      },
    );
  },
  queryMapData(tyd1002Id?: string) {
    return requestClient.request<StoreMapItemDto>(
      "/dDH.Service.SYD.Services/tyd1000/queryMapData",
      {
        method: "post",
        params: { tyd1002Id },
      },
    );
  },
  saveMap(data?: StoreMapItemDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1000/saveMap",
      {
        method: "post",
        data,
      },
    );
  },
  delMap(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1000/delMap",
      {
        method: "post",
        params: { id },
      },
    );
  },
};

export const tyd1100Api = {
  tyd1100Query(CarNo?: string, CStoreCode?: string) {
    return requestClient.request<Tyd1100[]>(
      "/dDH.Service.SYD.Services/tyd1100/tyd1100Query",
      {
        method: "post",
        params: { CarNo, CStoreCode },
      },
    );
  },
  delTyd1100(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1100/delTyd1100",
      {
        method: "post",
        data,
      },
    );
  },
  addTyd1100(data?: Tyd1100) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1100/addTyd1100",
      {
        method: "post",
        data,
      },
    );
  },
  saveTyd1100(data?: Tyd1100) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd1100/saveTyd1100",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tyd2000Api = {
  queryStorage(data?: StorageInputDto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryStorage",
      {
        method: "post",
        data,
      },
    );
  },
  queryStorageByMap(data?: StoreMapInputDto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryStorageByMap",
      {
        method: "post",
        data,
      },
    );
  },
  storageDD(data?: DDDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2000/storageDD",
      {
        method: "post",
        data,
      },
    );
  },
  setStackNum(data?: StoragePosition[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2000/setStackNum",
      {
        method: "post",
        data,
      },
    );
  },
  addProRemark(data?: Tyd2000[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2000/addProRemark",
      {
        method: "post",
        data,
      },
    );
  },
  queryRecords(pieceNo?: string) {
    return requestClient.request<Tyd2000Record[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryRecords",
      {
        method: "post",
        params: { pieceNo },
      },
    );
  },
  queryStorageRecord(data?: StorageSearchInput) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryStorageRecord",
      {
        method: "post",
        data,
      },
    );
  },
  queryNotInStorage(data?: QueryNotInStorageDto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/queryNotInStorage",
      {
        method: "post",
        data,
      },
    );
  },
  appQueryStorage(data?: AppQueryStorageDto) {
    return requestClient.request<Tyd2000Dto[]>(
      "/dDH.Service.SYD.Services/tyd2000/appQueryStorage",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tyd2020Api = {
  generateNo(data?: Tyd2010TypeEnum) {
    return requestClient.request<string>(
      "/dDH.Service.SYD.Services/tyd2020/generateNo",
      {
        method: "post",
        data,
      },
    );
  },
  createDB(data?: DBDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/createDB",
      {
        method: "post",
        data,
      },
    );
  },
  queryDB(data?: QueryDBDto) {
    return requestClient.request<Tyd2020Dto[]>(
      "/dDH.Service.SYD.Services/tyd2020/queryDB",
      {
        method: "post",
        data,
      },
    );
  },
  cancelDB(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/cancelDB",
      {
        method: "post",
        data,
      },
    );
  },
  dBCK(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/dBCK",
      {
        method: "post",
        data,
      },
    );
  },
  dBRK(data?: DBRKDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/dBRK",
      {
        method: "post",
        data,
      },
    );
  },
  createCPRKDB(data?: RKDBDto) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/createCPRKDB",
      {
        method: "post",
        data,
      },
    );
  },
  rk(data?: CPStoragePosition[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/rk",
      {
        method: "post",
        data,
      },
    );
  },
  cPDBRK(data?: DBRKDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/cPDBRK",
      {
        method: "post",
        data,
      },
    );
  },
  cancelCPDBRK(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SYD.Services/tyd2020/cancelCPDBRK",
      {
        method: "post",
        data,
      },
    );
  },
  queryDBDetail(data?: QueryDBDto) {
    return requestClient.request<Tyd2020[]>(
      "/dDH.Service.SYD.Services/tyd2020/queryDBDetail",
      {
        method: "post",
        data,
      },
    );
  },
};

export const userApi = {
  queryUser() {
    return requestClient.request<TestUser[]>(
      "/dDH.Service.SYD.Services/user/queryUser",
      {
        method: "post",
      },
    );
  },
};
