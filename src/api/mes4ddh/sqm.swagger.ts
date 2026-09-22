/**
 * SQM 域后端接口（dDH.Service.*）：枚举 + 类型 + 请求，单文件维护。
 * 原 src/api/sqm 的 enums.ts / types.d.ts / request.ts 合并。
 */

import { requestClient } from "@/api/_core/request";

/* ---------- 枚举 ---------- */

export enum AlarmLevel {
  Yellow = 1,
  Orange = 2,
  Red = 3,
}
export enum CastDivEnum {
  L = 0,
  M = 1,
  O = 2,
}
export enum CertiReq {
  A = 1,
  B = 2,
  C = 3,
}
export enum ComplexDecideResult {
  None = 0,
  Qualified = 2,
  Unqualified = 3,
  ManualRelease = 4,
  NotNeedJudge = 5,
}
export enum CompositionEnum {
  Pass = 10,
  NoPass = 20,
}
export enum CtrlMode {
  Std = 0,
  Inner = 1,
}
export enum DataStatusEnum {
  Add = 0,
  Update = 1,
  Delete = 2,
}
export enum DecideMode {
  None = 0,
  Mode1 = 1,
  Mode2 = 2,
  Mode3 = 3,
  Mode4 = 4,
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
export enum MscBasicTableType {
  None = 0,
  A = 1,
  B = 2,
  C = 3,
  D = 4,
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
export enum TableType {
  A = 1,
  B = 2,
  C = 3,
}
export enum TestJobJudgeResult {
  None = 0,
  Qualified = 2,
  Unqualified = 3,
  ManualRelease = 4,
}
export enum ValidFlag {
  Invalid = 0,
  Valid = 1,
}
export enum ValueType {
  Value = 1,
  Formula = 2,
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


export interface AddTestJobInput {
  cStove?: string | null;
  cpStove?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cStNo?: string | null;
  cDesignNo?: string | null;
  cOrderNo?: string | null;
  cLineCode?: string | null;
  cMsc?: string | null;
  cMscLineNo?: string | null;
  cWholeBacklogCode?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  cRecheckFlag?: string | null;
  cBatch?: string | null;
  prevTestNo?: string | null;
  czpFlag?: YesNo;
  czpOldTestNo?: string | null;
  ycpFlag?: string | null;
}
export interface ChemicalCompositionStdResult {
  isMatch?: boolean;
  message?: string | null;
  input?: QueryCFStdInput;
  stds?: StChemicalCompositionStd[] | null;
}
export interface ChemicalItem {
  code?: string | null;
  name?: string | null;
  desc?: string | null;
  seq?: number;
}
export interface ComplexDecideInput {
  pieceNos?: string[] | null;
  complexDecideResult?: ComplexDecideResult;
  remark?: string | null;
}
export interface DecimalRange {
  min?: number | null;
  max?: number | null;
  equalsMethod?: EqualsFlag;
}
export interface DefectDescription {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTypeId?: string | null;
  cDescCode?: string | null;
  cDescName?: string | null;
  cDescDetail?: string | null;
  nDescStatus?: string | null;
}
export interface DefectType {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTypeCode?: string | null;
  cTypeName?: string | null;
  cTypeDesc?: string | null;
  nTypeStatus?: string | null;
}
export interface DetectInput {
  pieceNos?: string[] | null;
  cDetectResultCode?: SurFaceResultEnum;
  cDetectDefectLevel?: string | null;
  cDefectDefectCode?: string | null;
  cDefectDefectMark?: string | null;
}
export interface HmxKv {
  selected?: boolean;
  id?: string | null;
  cCode?: string | null;
  cDesc?: string | null;
  cEnable?: string | null;
  cGroup?: string | null;
  cName?: string | null;
  cOrder?: string | null;
  cPid?: string | null;
  cSw01?: string | null;
  cSw02?: string | null;
  cSw03?: string | null;
  cSw04?: string | null;
  cSw05?: string | null;
  cValue?: string | null;
}
export interface IBasicIndexTable {
  idxNo?: string | null;
  id?: string | null;
  tableCode?: string | null;
}
export interface InventoryDisposalInput {
  pieceNos?: string[] | null;
  qmcz?: QMCZ;
  remark?: string | null;
  changeSgSign?: string | null;
  changeSgStd?: string | null;
  changeStdSgCode?: string | null;
  changeSteelType?: string | null;
  responsibility?: string | null;
  qxdl?: string | null;
  qxxl?: string | null;
  zzpxl?: string | null;
  zzpdl?: string | null;
}
export interface InventoryInfo {
  nProType?: NProTypeEnum;
  selected?: boolean;
  id?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
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
  testJobJudgeResult?: TestJobJudgeResult;
  cQxDl?: string | null;
  cQxXl?: string | null;
  cCutFlag?: string | null;
  cInboundNo?: string | null;
  cDelivyAddress?: string | null;
  cWgtToler?: string | null;
  cBilletTypeCode?: string | null;
  cCusName?: string | null;
}
export interface JggyEntities {
  tqmjg01?: Tqmjg01 | null;
  tqmjg02s?: Tqmjg02[] | null;
  tqmjg03s?: Tqmjg03[] | null;
  tqmjg04s?: Tqmjg04[] | null;
}
export interface MSCDto {
  tqmtm01?: Tqmtm01 | null;
  tqmtm02s?: Tqmtm02[] | null;
  tqmtm03s?: Tqmtm03[] | null;
  tqmtm04s?: Tqmtm04[] | null;
  idxData?: TsTableProValIdxTable[] | null;
  tqmtmt1s?: Tqmtmt1[] | null;
  tqmtmp0s?: Tqmtmp0[] | null;
  allIdxData?: IBasicIndexTable[] | null;
}
export interface MSCDtoPaginationResult {
  data?: MSCDto[] | null;
  dataCount?: number;
}
export interface MSCQueryPara {
  factoryId?: string | null;
  cMsc?: string | null;
  cProdClassCode?: string | null;
  cStdSgCode?: string | null;
  cSgSign?: string | null;
  cProdCode?: string | null;
  cSgStd?: string | null;
  id?: string | null;
  validFlag?: ValidFlag | null;
}
export interface MSCQueryParaPaginationQueryInput {
  pageSize?: number;
  pageIndex?: number;
  skip?: number;
  enablePaging?: boolean;
  data?: MSCQueryPara | null;
}
export interface PlateInspectionDto {
  selected?: boolean;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cBatchNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  nStatus?: InventoryStatusEnum;
  inspectionDate?: string | null;
  slabNo?: string | null;
  steelGrade?: string | null;
  slabThickness?: string | null;
  slabWidth?: string | null;
  slabLength?: string | null;
  refiningTime?: string | null;
  castingStartTime?: string | null;
  furnaceInTime?: string | null;
  furnaceInType?: string | null;
  orderNo?: string | null;
  specialRequirement?: string | null;
  inStoreFlag?: string | null;
  subPlateNo?: string | null;
  plateThickness?: string | null;
  plateWidth?: string | null;
  plateLength?: string | null;
  toleranceType?: string | null;
  cuttingMethod?: string | null;
  plateWeight?: string | null;
  responsibleDept?: string | null;
  defectDescription?: string | null;
  steelmakingReason?: string | null;
  plateReason?: string | null;
  rollingTime?: string | null;
  inspectionTime?: string | null;
  judgeResult?: string | null;
  judgeDesc?: string | null;
  placementLocation?: string | null;
  cNdtResult?: string | null;
  cNdtResultDesc?: string | null;
  team?: string | null;
  inspector?: string | null;
  processedTime?: string | null;
  processResult?: string | null;
  processedTeam?: string | null;
  processedInspector?: string | null;
  stockStackNo?: string | null;
  remark?: string | null;
}
export interface QualityDesignInput {
  orderNo: string;
}
export interface QualityDesignItemRlt {
  success?: boolean;
  cSuccsFlag?: YesNo;
  nTimeUsed?: number | null;
  cModuleName?: string | null;
  cOrderProcCont?: string | null;
  cErrorReason?: string | null;
  cException?: string | null;
}
export interface QualityDesignOutput {
  input?: QualityDesignInput | null;
  itemResult?: QualityDesignItemRlt[] | null;
  success?: boolean;
  message?: string | null;
}
export interface QueryCFStdInput {
  stlGrd?: string | null;
  std?: string | null;
  stNo?: string | null;
  isPrd?: boolean;
  orderNo?: string | null;
}
export interface QueryCriteriaDTO {
  lineCode?: string | null;
  stoveNo?: string | null;
  batchNo?: string | null;
  slabNo?: string | null;
  pieceNo?: string | null;
  orderNo?: string | null;
  surfaceResult?: string | null;
  qxdl?: string | null;
  qxxl?: string | null;
  storeCode?: string | null;
  stockStatus?: InventoryStatusEnum | null;
  txt3?: string | null;
  departmentId?: number | null;
  sortBy?: string | null;
  startTime?: string;
  endTime?: string;
}
export interface QueryInventoryInput {
  lineCode?: string | null;
  stoveNo?: string | null;
  batchNo?: string | null;
  orderNo?: string | null;
  pieceNo?: string | null;
  sgSign?: string | null;
  sgStd?: string | null;
  qmStatus?: QMStatuEnum | null;
  inTime?: TimeRange;
  prodTime?: TimeRange;
  surFaceResult?: SurFaceResultEnum | null;
  surFaces?: SurFaceResultEnum[] | null;
  cDetectResultCode?: SurFaceResultEnum | null;
  complexDecideResult?: ComplexDecideResult | null;
  isSaleBillet?: YesNo | null;
  isSaleProduct?: YesNo | null;
  lstStove?: string[] | null;
  lstOrder?: string[] | null;
  lstBatchNo?: string[] | null;
  status?: InventoryStatusEnum;
}
export interface QueryJg01Input {
  line?: string | null;
  code?: string | null;
  name?: string | null;
  sgSign?: string | null;
  sgStd?: string | null;
  validFlag?: ValidFlag | null;
  procs?: string[] | null;
}
export interface QueryMscHistoryInput {
  msc?: string | null;
  timeRange?: TimeRange;
}
export interface QueryTqmjgRecordInput {
  code?: string | null;
  timeRange?: TimeRange;
}
export interface QueryTqmtd10Input {
  sgStd?: string | null;
  sgSign?: string | null;
  nStatus?: ValidFlag | null;
}
export interface QueryTqmtdRecordInput {
  tqmtd10Id?: string | null;
  timeRange?: TimeRange;
}
export interface QueryTqmts0xHistoryInput {
  stNo?: string | null;
  timeRange?: TimeRange;
}
export interface QueryTqmylRecordInput {
  code?: string | null;
  timeRange?: TimeRange;
}
export interface QueryYl01Input {
  line?: string | null;
  code?: string | null;
  name?: string | null;
  sgSign?: string | null;
  sgStd?: string | null;
  validFlag?: ValidFlag | null;
}
export interface SaveIdxDataDto {
  addedTm09s?: Tqmtm09[] | null;
  changedTm09s?: Tqmtm09[] | null;
  deletedTm09s?: Tqmtm09[] | null;
  addedProVal?: TsTableProVal[] | null;
  changedProVal?: TsTableProVal[] | null;
  deletedProVal?: TsTableProVal[] | null;
}
export interface SelectedTableCondtionDto {
  idxNo?: string | null;
  sgStd?: string | null;
  sgSign?: string | null;
  prodClass?: string | null;
  prodType?: string | null;
  prodCode?: string | null;
  factoryId?: string | null;
  testItemType?: string | null;
  testItemCode?: string | null;
  tableCode?: string | null;
}
export interface SelectedTableDataDto {
  tM09Data?: Tqmtm09 | null;
  idxData?: TsTableProValIdxTable[] | null;
}
export interface StChemicalCompositionStd {
  ctrlFlag?: CtrlMode;
  elmCode?: string | null;
  elmName?: string | null;
  elmPos?: number | null;
  elmUnit?: string | null;
  isJudge?: YesNo;
  isPrint?: YesNo;
  mainPrec?: number | null;
  mainMin?: number | null;
  mainInterval?: EqualsFlag;
  mainMax?: number | null;
  mainAim?: number | null;
  spePrec?: number | null;
  speMin?: number | null;
  speInterval?: EqualsFlag;
  speMax?: number | null;
  speAim?: number | null;
  stdPrec?: number | null;
  stdMin?: number | null;
  stdInterval?: EqualsFlag;
  stdMax?: number | null;
  stdAim?: number | null;
  formula?: string | null;
  judgeFormula?: string | null;
  remark?: string | null;
}
export interface SteelPlateInspectionDto {
  selected?: boolean;
  pieceSequenceNumber?: string | null;
  orderNumber?: string | null;
  productionLine?: string | null;
  inventoryStatus?: InventoryStatusEnum;
  heatNumber?: string | null;
  slabNumber?: string | null;
  compositionResult?: CompositionEnum | null;
  surfaceInspectionResult?: string | null;
  compositionRejectionReason?: string | null;
  defectType?: string | null;
  surfaceRejectionReason?: string | null;
  steelGrade?: string | null;
  standard?: string | null;
  specification?: string | null;
  thickness?: string | null;
  width?: string | null;
  length?: string | null;
  count?: string | null;
  theoreticalWeight?: string | null;
  actualWeight?: string | null;
  refineStartCastTime?: string | null;
  refineEndCastTime?: string | null;
  furnaceChief?: string | null;
  machineChief?: string | null;
  shift?: string | null;
  group?: string | null;
  productionTime?: string | null;
  slabType?: string | null;
  surfaceInspectionTime?: string | null;
  surfaceInspector?: string | null;
  surfaceDisposition?: string | null;
  physicalChemicalResult?: string | null;
  physicalChemicalJudgeTime?: string | null;
  physicalChemicalJudgeUser?: string | null;
  physicalChemicalJudgeRemark?: string | null;
  qualityStatus?: string | null;
}
export interface SurfaceDetermineInput {
  pieceNos?: string[] | null;
  surfaceResult?: SurFaceResultEnum;
  cSurfaceDefectCode?: string | null;
  cSurfaceDefectPosition?: string | null;
  cSurfaceDesc?: string | null;
  length?: number | null;
  width?: number | null;
  thick1?: number | null;
  thick2?: number | null;
  thick3?: number | null;
}
export interface TestItemDto {
  testItemType?: string | null;
  testItemTypeDesc?: string | null;
  testItemCode?: string | null;
  testItemName?: string | null;
  testItemEName?: string | null;
  labGrp?: string | null;
  testItemTypePos?: number;
  testItemTypeGrp?: string | null;
  testItemTypeGrpEn?: string | null;
}
export interface TestStandard {
  cTestItemType?: string | null;
  cTestItemTypeDesc?: string | null;
  cTestItem?: string | null;
  cTestItemName?: string | null;
  cSmpThick?: string | null;
  cSmpLength?: string | null;
  cSmpWay?: string | null;
  cSmpCount?: number | null;
  nTestNum?: number;
  cSmpCountRe?: number | null;
  cSmpUnit?: string | null;
  nSmpWgt?: number | null;
  cSmpPosition?: string | null;
  cTestWay?: string | null;
  cReamrk?: string | null;
  items?: TestStandardItem[] | null;
}
export interface TestStandardItem {
  cTestItemType?: string | null;
  cTestItemTypeDesc?: string | null;
  cTestItem?: string | null;
  cTestItemName?: string | null;
  cTestSubItem?: string | null;
  cTestSubItemName?: string | null;
  cUnit?: string | null;
  nAccuracy?: number | null;
  nMinValue?: number | null;
  nMaxValue?: number | null;
  nTargetValue?: number | null;
  nValueInterval?: EqualsFlag;
  nMinValueNk?: number | null;
  nMaxValueNk?: number | null;
  nValueIntervalNk?: EqualsFlag;
  cFormula?: string | null;
  cJudgeFormula?: string | null;
  nTestTemperature?: number | null;
  cTestCondition?: string | null;
  cIsJudge?: YesNo;
  cIsPrint?: YesNo;
  cRemark?: string | null;
}
export interface TestSubItem {
  testItemType?: string | null;
  testItemTypeDesc?: string | null;
  testItemCode?: string | null;
  testItemName?: string | null;
  testSubItemCode?: string | null;
  testSubItemName?: string | null;
  dlDxFlag?: string | null;
  unit?: string | null;
  other1?: string | null;
  other2?: string | null;
  other3?: string | null;
  other4?: string | null;
  other5?: number | null;
  other6?: string | null;
  other7?: string | null;
  other8?: string | null;
  seq?: number | null;
  tableCode?: string | null;
  id?: string | null;
  displayKvs?: HmxKv[] | null;
  valueKvs?: HmxKv[] | null;
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
export interface Thr4000Details {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWidth?: number | null;
  nLen?: number | null;
  nQua?: number | null;
  nWgt?: number | null;
  cSpecReqText?: string | null;
  dInspectionDate?: string | null;
  dRefiningTime?: string | null;
  dCastingStartTime?: string | null;
  dFurnaceInTime?: string | null;
  cFurnaceInType?: string | null;
  cSubPlateNo?: string | null;
  cBatchNo?: string | null;
  nSlabThickness?: number | null;
  nSlabWidth?: number | null;
  nSlabLength?: number | null;
  cInStoreFlag?: string | null;
  cToleranceType?: string | null;
  cCuttingMethod?: string | null;
  cResponsibleDept?: string | null;
  cSteelmakingReason?: string | null;
  cPlateReason?: string | null;
  dRollingTime?: string | null;
  dInspectionTime?: string | null;
  cPlacementLocation?: string | null;
  cTeam?: string | null;
  cInspector?: string | null;
  dProcessedTime?: string | null;
  cProcessResult?: string | null;
  cProcessedTeam?: string | null;
  cProcessedInspector?: string | null;
  cStockStackNo?: string | null;
  cRemark?: string | null;
  nAddLen?: number | null;
  nAddWidth?: number | null;
  nThick1?: number | null;
  nThick2?: number | null;
  nThick3?: number | null;
  cDefectType?: string | null;
  cDefectTypeDesc?: string | null;
  cPlateJudgement?: string | null;
  cPlateJudgementDesc?: string | null;
  cNdtResult?: string | null;
  cNdtResultDesc?: string | null;
}
export interface Thr4000Zrpan {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cLineCode?: string | null;
  cOrderNo?: string | null;
  cStove?: string | null;
  cPieceNo?: string | null;
  cSubPlateNo?: string | null;
  cBatchNo?: string | null;
  cRespDept?: string | null;
  cLsReason?: string | null;
  cPlateReason?: string | null;
  cDefectType?: string | null;
  cDefectTypeDesc?: string | null;
  cInStoreFlag?: string | null;
  nStatus?: InventoryStatusEnum;
  cSlabNo?: string | null;
  cSteelGrade?: string | null;
  cSlabThk?: string | null;
  cSlabWth?: string | null;
  cSlabLen?: string | null;
  cPlateThk?: string | null;
  cPlateWth?: string | null;
  cPlateLen?: string | null;
  cPlateWgt?: string | null;
  cCutMethod?: string | null;
  cTolType?: string | null;
  cJudgeResult?: string | null;
  cJudgeResultDesc?: string | null;
  cNdtResult?: string | null;
  cNdtResultDesc?: string | null;
  dJudgementTime?: string | null;
  dDeptJudgementTime?: string | null;
}
export interface Thr4010 {
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
  nStatus?: number;
  cStoreCode?: string | null;
  cStackNo?: string | null;
  cStackNum?: string | null;
  cTrimFlag?: string | null;
  cInboundNo?: string | null;
  cFlawDesc?: string | null;
  cDelivyAddress?: string | null;
  cProdCode?: string | null;
}
export interface TimeRange {
  min?: string | null;
  max?: string | null;
  timeSpan?: string;
  equalsMethod?: EqualsFlag;
}
export interface Tmp1210 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cSteelType?: string | null;
  cSgCode?: string | null;
  nThick?: number;
  nWidth?: number;
  nWgt?: number;
  cRemark?: string | null;
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
export interface Tms3000Details {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPieceSequenceNumber?: string | null;
  cOrderNumber?: string | null;
  cProductionLine?: string | null;
  cInventoryStatus?: string | null;
  cHeatNumber?: string | null;
  cSlabNumber?: string | null;
  cCompositionResult?: CompositionEnum | null;
  cSurfaceInspectionResult?: string | null;
  cCompositionRejectionReason?: string | null;
  cDefectType?: string | null;
  cSurfaceRejectionReason?: string | null;
  cSteelGrade?: string | null;
  cStandardCode?: string | null;
  cSpecification?: string | null;
  nThickness?: string | null;
  nWidth?: string | null;
  nLength?: string | null;
  nPieces?: string | null;
  nTheoreticalWeight?: string | null;
  nActualWeight?: string | null;
  dLfStartTime?: string | null;
  dLfEndTime?: string | null;
  cFurnaceMaster?: string | null;
  cMachineMaster?: string | null;
  cProductionShift?: string | null;
  cProductionGroup?: string | null;
  dProductionTime?: string | null;
  cSlabType?: string | null;
  dSurfaceCheckTime?: string | null;
  cSurfaceCheckUser?: string | null;
  cSurfaceHandleOpinion?: string | null;
  cPhysicalResult?: string | null;
  dPhysicalJudgeTime?: string | null;
  cPhysicalJudgeUser?: string | null;
  cPhysicalJudgeRemark?: string | null;
  cQualityStatus?: string | null;
  nAddLen?: number | null;
  nAddWidth?: number | null;
  nThick1?: number | null;
  nThick2?: number | null;
  nThick3?: number | null;
  cDefectTypeDesc?: string | null;
}
export interface Tms3010 {
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
  nStatus?: number;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  dProTime?: string;
  cConfirmStatus?: string | null;
  cIsHot?: string | null;
  cMsc?: string | null;
  cMscLine?: string | null;
  cStNo?: string | null;
  cSteelType?: string | null;
  cProRemark?: string | null;
  cPieceNoQd?: string | null;
  cHeadFoot?: string | null;
  cHeadFootStove?: string | null;
  cException?: string | null;
  cShiftNoSj?: string | null;
  cGroupNoSj?: string | null;
  cSurfaceResult?: string | null;
  dSurfaceTime?: string;
  cSurfaceUser?: string | null;
  cSurfaceRemark?: string | null;
  cSurfaceAdvice?: string | null;
  dConfirmTime?: string;
  cConfirmUser?: string | null;
  cPcResult?: string | null;
  dPcTime?: string;
  cPcUser?: string | null;
  cPcRemark?: string | null;
  cQmHandleDesc?: string | null;
  nQmStatus?: number;
  cDestination?: string | null;
  cSampleLotNo?: string | null;
  cRouteCode?: string | null;
}
export interface Tqm1000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cSgCode?: string | null;
  cSgCodeNk?: string | null;
  nThickMin?: number | null;
  nThickSwitch?: EqualsFlag | null;
  nThickMax?: number | null;
}
export interface Tqmjg01 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cCode?: string | null;
  cName: string;
  cPlanRouteCode?: string | null;
  nValidFlag?: ValidFlag;
  cLineCode?: string | null;
  cPlanRouteDesc?: string | null;
  cPreRemark?: string | null;
  cRemark?: string | null;
}
export interface Tqmjg01Record {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  cCode?: string | null;
  cBackupFile?: string | null;
  cOperation?: string | null;
  cDescription?: string | null;
  cName?: string | null;
}
export interface Tqmjg02 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTqmjg01Id?: string | null;
  cGyCode?: string | null;
  cSgStd?: string | null;
  cSgSign?: string | null;
}
export interface Tqmjg03 {
  selected?: boolean;
  id?: string | null;
  cTqmjg01Id?: string | null;
  cGyCode?: string | null;
  cProc?: string | null;
  nSeq?: number;
  cProcName?: string | null;
  cRemark?: string | null;
}
export interface Tqmjg04 {
  selected?: boolean;
  id?: string | null;
  cTqmjg01Id?: string | null;
  cTqmjg01Code?: string | null;
  cProc?: string | null;
  nProcSeq?: number;
  cTqmjg03Id?: string | null;
  cClass?: string | null;
  cClassDesc?: string | null;
  cCode?: string | null;
  cName?: string | null;
  nSeq?: number;
  nValueType?: number;
  cUnit?: string | null;
  nTargetValue?: number | null;
  nMinValue?: number | null;
  nInterval?: EqualsFlag;
  nMaxValue?: number | null;
  cTextValue?: string | null;
  nMinValueYellow?: number | null;
  nIntervalYellow?: EqualsFlag;
  nMaxValueYellow?: number | null;
  nDurationYellow?: number | null;
  nMinValueOrange?: number | null;
  nIntervalOrange?: EqualsFlag;
  nMaxValueOrange?: number | null;
  nDurationOrange?: number | null;
  nMinValueRed?: number | null;
  nIntervalRed?: EqualsFlag;
  nMaxValueRed?: number | null;
  nDurationRed?: number | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  cIngotCode?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cMachine?: string | null;
  cLineCode?: string | null;
  nIngotWgtMin?: number | null;
  nIngotWgtMax?: number | null;
  nCgsjMin?: number | null;
  nCgsjMax?: number | null;
  cGyh?: string | null;
  nAlarmMin?: number | null;
  nIntervalAlarm?: EqualsFlag;
  nAlarmMax?: number | null;
  nAlarmLv?: AlarmLevel | null;
}
export interface Tqmtd10 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStd?: string | null;
  cGbStlGrd?: string | null;
  cNkStlGrd?: string | null;
  cStlGrdClass?: string | null;
  nStatus?: ValidFlag;
  cProdClass?: string | null;
  cProdCode?: string | null;
  cDelivyStatusCode?: string | null;
  cProcessPurposeCode?: string | null;
  cCustCode?: string | null;
  cRemark?: string | null;
  cCheckUser?: string | null;
  dCheckTime?: string | null;
  cLineCode?: string | null;
}
export interface Tqmtd10Record {
  selected?: boolean;
  id?: string | null;
  cTqmtd10Id?: string | null;
  cData?: string | null;
  cOperation?: string | null;
  cDescription?: string | null;
  creator?: string | null;
  createTime?: string | null;
}
export interface Tqmtd11 {
  selected?: boolean;
  id?: string | null;
  cTqmtd10Id?: string | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nThickInterval?: EqualsFlag;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nWidthInterval?: EqualsFlag;
  nLengthMin?: number | null;
  nLengthMax?: number | null;
  nLengthInterval?: EqualsFlag;
  cTestItemType?: string | null;
  cTestItemTypeDesc?: string | null;
  cTestSubItem?: string | null;
  cTestSubItemName?: string | null;
  cUnit?: string | null;
  nAccuracy?: number | null;
  nMinValue?: number | null;
  nMaxValue?: number | null;
  nTargetValue?: number | null;
  nValueInterval?: EqualsFlag;
  cFormula?: string | null;
  cJudgeFormula?: string | null;
  nTestTemperature?: number | null;
  cTestCondition?: string | null;
  cIsJudge?: YesNo;
  cIsPrint?: YesNo;
  cRemark?: string | null;
  nMinValueNk?: number | null;
  nMaxValueNk?: number | null;
  nValueIntervalNk?: EqualsFlag;
  cCtrlMode?: CtrlMode;
  cTestItem?: string | null;
  cTestItemName?: string | null;
  decimalPlaces?: number;
}
export interface Tqmtd12 {
  selected?: boolean;
  id?: string | null;
  cTqmtd10Id?: string | null;
  cTestItemType?: string | null;
  cSmpThick?: string | null;
  cSmpLength?: string | null;
  cSmpWay?: string | null;
  cSmpCount?: number | null;
  cSmpCountRe?: number | null;
  cSmpUnit?: string | null;
  nSmpWgt?: number | null;
  cSmpPosition?: string | null;
  cTestWay?: string | null;
  cReamrk?: string | null;
  cTestItemTypeDesc?: string | null;
  cTestItem?: string | null;
  cTestItemName?: string | null;
  nTestNum?: number;
}
export interface Tqmtd13 {
  selected?: boolean;
  id?: string | null;
  cTqmtd10Id?: string | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nThickInterval?: EqualsFlag;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  nWidthInterval?: EqualsFlag;
  nLengthMin?: number | null;
  nLengthMax?: number | null;
  nLengthInterval?: EqualsFlag;
  cItem?: string | null;
  cItemName?: string | null;
  cUnit?: string | null;
  nDecimalPlaces?: number | null;
  nMinValue?: number | null;
  nMaxValue?: number | null;
  nTargetValue?: number | null;
  nValueInterval?: EqualsFlag;
  cFormula?: string | null;
  cJudgeFormula?: string | null;
  nTestTemperature?: number | null;
  cTestCondition?: string | null;
  cIsJudge?: YesNo;
  cIsPrint?: YesNo;
  cRemark?: string | null;
}
export interface TqmtdEntities {
  tqmtd10?: Tqmtd10 | null;
  tqmtd11s?: Tqmtd11[] | null;
  tqmtd12s?: Tqmtd12[] | null;
  tqmtd13s?: Tqmtd13[] | null;
}
export interface Tqmtm01 {
  selected?: boolean;
  id?: string | null;
  cMsc?: string | null;
  cValidFlag?: ValidFlag;
  cProdClassCode?: string | null;
  cProdClassDesc?: string | null;
  cProdDif?: string | null;
  cProdCode?: string | null;
  cProdCName?: string | null;
  cStdSgCode?: string | null;
  cSgStd?: string | null;
  cSgSign?: string | null;
  cSgCode?: string | null;
  cSgClassCode?: string | null;
  cDelivyStatusCode?: string | null;
  cDeliveryStateDesc?: string | null;
  cHeatAndTypeCode?: string | null;
  cSurfaceStatus?: string | null;
  cTolPrecGroup?: string | null;
  cBendGroup?: string | null;
  cBendGroupDesc?: string | null;
  cTemper?: string | null;
  cCustStdCode?: string | null;
  cCustStd?: string | null;
  cSteelType?: string | null;
  cIdxProdSpec?: string | null;
  cIdxStrengthGrade?: string | null;
  cMscDesc?: string | null;
  cRemark?: string | null;
  cCheckMaker?: string | null;
  dCheckTime?: string;
  cMscSrc?: string | null;
  nRecNum?: number;
  nMinThick?: number;
  nMaxThick?: number;
  nMinWidth?: number;
  nMaxWidth?: number;
  nIndmMin?: number;
  nIndmMax?: number;
  cArchiveFlag?: string | null;
  nVersion?: number;
  cAccuGradeCode?: string | null;
  cAccuGrade?: string | null;
  cFactoryId?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
}
export interface Tqmtm01Record {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  cMsc?: string | null;
  cBackupFile?: string | null;
  cOperation?: string | null;
  cDescription?: string | null;
}
export interface Tqmtm02 {
  selected?: boolean;
  id?: string | null;
  cMsc?: string | null;
  cMscLineNo?: string | null;
  nDefaultSeq?: number;
  cHoldFlag?: YesNo;
  cIdxLineSpec?: string | null;
  cCrossShapeCode?: string | null;
  nMinThick?: number;
  nMaxThick?: number;
  nMinWidth?: number;
  nMaxWidth?: number;
  nMinLen?: number;
  nMaxLen?: number;
  nIndmMin?: number;
  nIndmMax?: number;
  cWholeBacklog?: string | null;
  cWholeBacklogDesc?: string | null;
  cStNo?: string | null;
  cStNo1?: string | null;
  cStNo2?: string | null;
  cStNo3?: string | null;
  cStNo4?: string | null;
  cStNo5?: string | null;
  cStNo6?: string | null;
  cStNo7?: string | null;
  cStNo8?: string | null;
  cStNo9?: string | null;
  cMatDesignFlag?: string | null;
  cRollLenMaxTno?: string | null;
  nPrepNum?: number;
  cRemark?: string | null;
  cArchiveFlag?: string | null;
  nVersion?: number;
  cFactoryId?: string | null;
  cTqmtm01Id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
}
export interface Tqmtm03 {
  selected?: boolean;
  id?: string | null;
  cMsc?: string | null;
  cMscLineNo?: string | null;
  nWholeBacklogSeq?: number;
  cWholeBacklogCode?: string | null;
  cWholeBacklogName?: string | null;
  cRemark?: string | null;
  cArchiveFlag?: string | null;
  nVersion?: number;
  cFactoryId?: string | null;
  cTqmtm01Id?: string | null;
  cTqmtm02Id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
}
export interface Tqmtm04 {
  selected?: boolean;
  id?: string | null;
  cBasicTableTypeCode?: MscBasicTableType;
  cBasicTableType?: string | null;
  cMsc?: string | null;
  cMscLineNo?: string | null;
  nWholeBacklogSeq?: number;
  cWholeBacklogCode?: string | null;
  cWholeBacklogName?: string | null;
  cBasicTableCode?: string | null;
  cBasicTableEName?: string | null;
  cBasicTableCName?: string | null;
  cIdxNo?: string | null;
  cRemark?: string | null;
  cArchiveFlag?: string | null;
  nVersion?: number;
  cItemMustFlag?: string | null;
  cFactoryId?: string | null;
  cTestItemCode?: string | null;
  cTestItemName?: string | null;
  nSeqNo?: number;
  cIdxFlag?: string | null;
  cTqmtm01Id?: string | null;
  cTqmtm02Id?: string | null;
  cTqmtm03Id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTqmtm09Id?: string | null;
}
export interface Tqmtm08 {
  selected?: boolean;
  id?: string | null;
  cFacCode?: string | null;
  cProdClassCode?: string | null;
  cBasicTableTypeCode?: TableType;
  cBasicTableType?: TableType;
  cWorkTypeCode?: string | null;
  cWorkTypeName?: string | null;
  cBasicTableCode?: string | null;
  cBasicTableEName?: string | null;
  cBasicTableCName?: string | null;
  cItemMustFlag?: string | null;
  cArchiveFlag?: string | null;
  nVersion?: number;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cProdCode?: string | null;
}
export interface Tqmtm09 {
  selected?: boolean;
  id?: string | null;
  cBasicTableCode?: string | null;
  cBasicTableEName?: string | null;
  cBasicTableCName?: string | null;
  cIdxNo?: string | null;
  cRemark6?: string | null;
  cProdClassCode?: string | null;
  cProdClassDesc?: string | null;
  cProdCode?: string | null;
  cProdCName?: string | null;
  cStdSgCode?: string | null;
  cStdCode?: string | null;
  cSgStd?: string | null;
  cSgCode?: string | null;
  cSgSign?: string | null;
  cCustStdCode?: string | null;
  cCustStd?: string | null;
  cTestStdCode?: string | null;
  cTestStd?: string | null;
  cArchiveFlag?: string | null;
  nVersion?: number;
  cReduNo?: string | null;
  cReduNoDesc?: string | null;
  cFactoryId?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTestItemType?: string | null;
  cTestItemCode?: string | null;
}
export interface Tqmtm104ConditionDto {
  cProdClassCode?: string | null;
  cProdCode?: string | null;
  cBasicTableTypeCode?: TableType | null;
  cWorkTypeCode?: string | null;
  cSearchIdx?: string | null;
}
export interface Tqmtm104DetailDto {
  cProdClassCode?: string | null;
  cProdCode?: string | null;
  cBasicTableTypeCode?: TableType;
  cWorkTypeCode?: string | null;
  selected?: boolean;
  validateFlag?: boolean;
  id?: string | null;
  parentID?: string | null;
  cBasicTableCode?: string | null;
  cBasicTableEName?: string | null;
  cBasicTableCName?: string | null;
  nOrder?: number;
  sourceId?: string | null;
}
export interface Tqmtm104Dto {
  cFacCode?: string | null;
  cProdClassCode?: string | null;
  cProdCode?: string | null;
  cBasicTableTypeCode?: TableType;
  cWorkTypeCode?: string | null;
  cItemMustFlag?: string | null;
  nSeq1?: number | null;
  cSearchIdx?: string | null;
  details?: Tqmtm104DetailDto[] | null;
  isChanged?: boolean;
  detailSnapshotStr?: string | null;
  sourceId?: string | null;
}
export interface Tqmtm104DtoSaveChangesData {
  addedItems?: Tqmtm104Dto[] | null;
  changedItems?: Tqmtm104Dto[] | null;
  deletedItems?: Tqmtm104Dto[] | null;
}
export interface Tqmtmp0 {
  idxNo?: string | null;
  seqNo?: number | null;
  minThick?: number | null;
  maxThick?: number | null;
  thickRange?: DecimalRange;
  minWidth?: number | null;
  maxWidth?: number | null;
  widthkRange?: DecimalRange;
  testItemType?: string | null;
  testItemTypeDesc?: string | null;
  testItemCode?: string | null;
  testItemName?: string | null;
  testSubItemEName?: string | null;
  testSubItemCode?: string | null;
  testSubItemName?: string | null;
  testSubItemUnit?: string | null;
  testItemDlDx?: string | null;
  valueMin?: number | null;
  valueRange?: DecimalRange;
  interval?: EqualsFlag;
  valueMax?: number | null;
  targetValue?: string | null;
  remark?: string | null;
  archiveFlag?: string | null;
  version?: number | null;
  factoryId?: string | null;
  decideMode?: DecideMode;
  itemAccuracy?: number | null;
  decimals?: number | null;
  formula?: string | null;
  displayText?: string | null;
  tableCode?: string | null;
  id?: string | null;
}
export interface Tqmtmt1 {
  idxNo?: string | null;
  seqNo?: number | null;
  diaFrom?: number | null;
  diaTo?: number | null;
  indmFrom?: number | null;
  indmTo?: number | null;
  thickMin?: number | null;
  thickMax?: number | null;
  thickRange?: DecimalRange;
  widthMin?: number | null;
  widthMax?: number | null;
  widthRange?: DecimalRange;
  lengthMin?: number | null;
  lengthMax?: number | null;
  lengthRange?: DecimalRange;
  pchJudgeReq?: string | null;
  testItemType?: string | null;
  testItemTypeDesc?: string | null;
  testItemCode?: string | null;
  testItemName?: string | null;
  queryTableIdxNo?: string | null;
  formNo?: string | null;
  testPurposeCode?: string | null;
  testPurpose?: string | null;
  testUnitCode?: string | null;
  testNum?: number | null;
  samplePosCode?: string | null;
  samplePos?: string | null;
  sampleLen?: string | null;
  sampleLenDesc?: string | null;
  testDirectCode?: string | null;
  testDirect?: string | null;
  testCndCode?: string | null;
  testCnd?: string | null;
  sampleReqCode?: string | null;
  sampleReq?: string | null;
  sampleProcReqCode?: string | null;
  sampleProcReq?: string | null;
  retestReqCode?: string | null;
  retestReq?: string | null;
  retestMulti?: number | null;
  replaceSampleCode?: string | null;
  meltExamineFlag?: string | null;
  tensHeatYesno?: string | null;
  tensHeatReportYesno?: string | null;
  tensHeatYesNo?: string | null;
  tensHeatReportYesNo?: string | null;
  heatReport?: string | null;
  testAdditionDesc?: string | null;
  remark?: string | null;
  certiIndicate?: YesNo;
  printSortCode?: string | null;
  certiItemCode?: string | null;
  certiItemCdesc?: string | null;
  certiItemEdesc?: string | null;
  certiItemCDesc?: string | null;
  certiItemEDesc?: string | null;
  certiItemReq?: CertiReq;
  stdTestValue?: string | null;
  certiItemNum?: number | null;
  version?: number | null;
  archiveFlag?: string | null;
  sampleNumRnd?: number | null;
  factoryId?: string | null;
  extItem3?: string | null;
  tableCode?: string | null;
  id?: string | null;
  subIdxNo?: string | null;
  subTableCode?: string | null;
  subTableEName?: string | null;
  subTableCName?: string | null;
}
export interface Tqmtp01 {
  selected?: boolean;
  id: string;
  creator: string;
  createTime: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPsc?: string | null;
  cProdCode?: string | null;
  cProdCName?: string | null;
  cStdSgCode?: string | null;
  cSgStd?: string | null;
  cSgSign?: string | null;
  cProcessPurposeCode?: string | null;
  cProcessPurposeDesc?: string | null;
  cHeatAndTypeCode?: string | null;
  cHeatAndTypeDesc?: string | null;
  cSurfaceStatus?: string | null;
  cSurfaceStatusDesc?: string | null;
  cTolPrecGroup?: string | null;
  cTolPrecGroupDesc?: string | null;
  cBendGroup?: string | null;
  cBendGroupDesc?: string | null;
  cValidFlag?: ValidFlag;
  cCheckMaker?: string | null;
  dCheckTime?: string | null;
  cProdAuth?: string | null;
  cCertiTypeCode?: string | null;
  nCertiNum?: number | null;
  cNewProductCode?: string | null;
  dChangeProductDate?: string | null;
  cPscDesc?: string | null;
  cRemark?: string | null;
  cDelivyStatusCode?: string | null;
  cDeliveryStateDesc?: string | null;
  cProdClass?: string | null;
  cProdClassText?: string | null;
  nVersion?: number | null;
  cArchiveFlag?: string | null;
  cFactoryId?: string | null;
  cRemarkDesc?: string | null;
  cLevel?: string | null;
}
export interface Tqmtp01Dto {
  tqmtp01?: Tqmtp01 | null;
  tqmtp03s?: Tqmtp03[] | null;
}
export interface Tqmtp01QueryInput {
  cPsc?: string | null;
  cSgStd?: string | null;
  cSgSign?: string | null;
  cDelivyStatusCode?: string | null;
  cProdClass?: string | null;
  factoryId?: string | null;
}
export interface Tqmtp03 {
  selected?: boolean;
  id: string;
  creator: string;
  createTime: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPsc?: string | null;
  cFinalUse1?: string | null;
  cFinCustCode?: string | null;
  cMsc?: string | null;
  cPscDesc?: string | null;
  cApnDesc?: string | null;
  cFinUserName?: string | null;
  cRemark?: string | null;
  cClientEvaluateCode?: string | null;
  cProcUseDesc?: string | null;
  cSpecialUsagec?: string | null;
  dTcTranOkTime?: string | null;
  cValidFlag?: ValidFlag;
  cCheckMaker?: string | null;
  dCheckTime?: string | null;
  nVersion?: number | null;
  cArchiveFlag?: string | null;
  cFactoryId?: string | null;
  cRemarkDesc?: string | null;
}
export interface Tqmtpa4 {
  selected?: boolean;
  id: string;
  creator: string;
  createTime: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cSgCode?: string | null;
  cOldSgCode?: string | null;
  cSgSign?: string | null;
  cSgClassCode?: string | null;
  cRemark?: string | null;
  cValidFlag?: ValidFlag;
  nVersion?: number | null;
  cArchiveFlag?: string | null;
}
export interface Tqmtpa4QueryInput {
  cSgCode?: string | null;
  cSgSign?: string | null;
}
export interface Tqmtpa4SaveChangesData {
  addedItems?: Tqmtpa4[] | null;
  changedItems?: Tqmtpa4[] | null;
  deletedItems?: Tqmtpa4[] | null;
}
export interface Tqmtpa5 {
  selected?: boolean;
  id: string;
  creator: string;
  createTime: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStdCode?: string | null;
  cStdCodeOld?: string | null;
  cSgStd?: string | null;
  cRemark?: string | null;
  cValidFlag?: ValidFlag;
  nVersion?: number | null;
  cArchiveFlag?: string | null;
}
export interface Tqmtpa5QueryInput {
  cStdCode?: string | null;
  cSgStd?: string | null;
  validFlagValue?: number | null;
}
export interface Tqmtpa5SaveChangesData {
  addedItems?: Tqmtpa5[] | null;
  changedItems?: Tqmtpa5[] | null;
  deletedItems?: Tqmtpa5[] | null;
}
export interface Tqmtpa6 {
  selected?: boolean;
  id: string;
  creator: string;
  createTime: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStdSgCode?: string | null;
  cStdCode?: string | null;
  cSgStd?: string | null;
  cSgCode?: string | null;
  cSgSign?: string | null;
  cSgClassCode?: string | null;
  cRemark?: string | null;
  nVersion?: number | null;
  cArchiveFlag?: string | null;
}
export interface Tqmtpa6QueryInput {
  cSgStd?: string | null;
  cSgSign?: string | null;
  cStdSgCode?: string | null;
}
export interface Tqmts02 {
  idxNo?: string | null;
  archiveFlag?: string | null;
  version?: number | null;
  stNo?: string | null;
  sgSign?: string | null;
  sgStd?: string | null;
  idxSort?: string | null;
  factoryId?: string | null;
  wholeBacklogSeq?: number | null;
  wholeBacklogCode?: string | null;
  ctrlFlag?: CtrlMode;
  elmCode?: string | null;
  elmName?: string | null;
  elmPos?: number | null;
  elmUnit?: string | null;
  elmFlg?: DecideMode;
  mainPrec?: number | null;
  mainMin?: number | null;
  mainInterval?: EqualsFlag;
  mainMax?: number | null;
  mainAim?: number | null;
  mainRange?: DecimalRange;
  spePrec?: number | null;
  speMin?: number | null;
  speInterval?: EqualsFlag;
  speMax?: number | null;
  speAim?: number | null;
  speRange?: DecimalRange;
  stdPrec?: number | null;
  stdMin?: number | null;
  stdInterval?: EqualsFlag;
  stdMax?: number | null;
  stdAim?: number | null;
  stdRange?: DecimalRange;
  speElmCode?: string | null;
  speElmName?: string | null;
  remark?: string | null;
  topSampleLen?: string | null;
  botSampleLen?: string | null;
  wiringPrec?: number | null;
  tableCode?: string | null;
  id?: string | null;
}
export interface Tqmts0x {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cArchiveFlag?: string | null;
  nVersion?: number;
  cStNo?: string | null;
  cIdxNoCf?: string | null;
  cFactoryId?: string | null;
  cSgClassCode?: string | null;
  cSgStd?: string | null;
  cSgSign?: string | null;
  cSpeQltyReq?: string | null;
  cCastDivCode?: CastDivEnum;
  cPlanRouteCode?: string | null;
  cPlanRouteId?: string | null;
  cActRouteId?: string | null;
  cEafFurnaceType?: string | null;
  cFinishReq?: string | null;
  cCustStdCode?: string | null;
  cCustStd?: string | null;
  cDelivyStatusCode?: string | null;
  cDeliveryStateDesc?: string | null;
  cProdClassCode?: string | null;
  cProdClassDesc?: string | null;
  cBilletType?: string | null;
  nPlanLiquidTemp?: number;
  nActLiquidTemp?: number;
  cIdxSampleReq?: string | null;
  cIdxTestItem?: string | null;
  cIfMessage?: string | null;
  dMessageTime?: string;
  cUse?: string | null;
  cRemark?: string | null;
  cChargeMode?: string | null;
  cValidFlag?: ValidFlag;
}
export interface Tqmts0x10 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTqmts0xId?: string | null;
  cStNo?: string | null;
  cFactoryId?: string | null;
  cSgStd?: string | null;
  cSgSign?: string | null;
  cStdSgCode?: string | null;
  cStdCode?: string | null;
  cSgCode?: string | null;
  cSgClassCode?: string | null;
}
export interface Tqmts0x20 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTqmts0xId?: string | null;
  cStNo?: string | null;
  cFactoryId?: string | null;
  cIngot?: string | null;
  cIngotElectrode?: string | null;
  cEquipment?: string | null;
}
export interface Tqmts0xDto {
  data?: Tqmts0x | null;
  tqmts02s?: Tqmts02[] | null;
  tqmts0X10s?: Tqmts0x10[] | null;
  tqmts0X20s?: Tqmts0x20[] | null;
}
export interface Tqmts0xQueryInput {
  factoryId?: string | null;
  stNo?: string | null;
  sgStd?: string | null;
  sgSign?: string | null;
  prodClass?: string | null;
  castDivCode?: CastDivEnum | null;
  stNos?: string[] | null;
  validFlag?: ValidFlag | null;
  fuzzySearch?: boolean;
}
export interface Tqmts0xRecord {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  cStNo?: string | null;
  cBackupFile?: string | null;
  cOperation?: string | null;
  cDescription?: string | null;
}
export interface Tqmyl01 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cCode?: string | null;
  cName?: string | null;
  cPlanRouteCode?: string | null;
  nValidFlag?: ValidFlag;
  cStNo?: string | null;
  cLineCode?: string | null;
  cPlanRouteDesc?: string | null;
  cPreRemark?: string | null;
  cRemark?: string | null;
  sgSignDesc?: string | null;
}
export interface Tqmyl01Record {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  cCode?: string | null;
  cBackupFile?: string | null;
  cOperation?: string | null;
  cDescription?: string | null;
  cName?: string | null;
}
export interface Tqmyl02 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTqmyl01Id?: string | null;
  cGyCode?: string | null;
  cSgStd?: string | null;
  cSgSign?: string | null;
}
export interface Tqmyl03 {
  selected?: boolean;
  id?: string | null;
  cGyCode?: string | null;
  cProc?: string | null;
  nSeq?: number;
  cProcName?: string | null;
  cRemark?: string | null;
  cTqmyl01Id?: string | null;
}
export interface Tqmyl04 {
  selected?: boolean;
  id?: string | null;
  cTqmyl01Id?: string | null;
  cTqmyl01Code?: string | null;
  cProc?: string | null;
  nProcSeq?: number | null;
  cTqmyl03Id?: string | null;
  cClass?: string | null;
  cClassDesc?: string | null;
  cCode?: string | null;
  cName?: string | null;
  nSeq?: number;
  nValueType?: string | null;
  cUnit?: string | null;
  nTargetValue?: number | null;
  nMinValue?: number | null;
  nInterval?: EqualsFlag;
  nMaxValue?: number | null;
  cTextValue?: string | null;
  nMinValueYellow?: number | null;
  nIntervalYellow?: EqualsFlag;
  nMaxValueYellow?: number | null;
  nDurationYellow?: number | null;
  nMinValueOrange?: number | null;
  nIntervalOrange?: EqualsFlag;
  nMaxValueOrange?: number | null;
  nDurationOrange?: number | null;
  nMinValueRed?: number | null;
  nIntervalRed?: EqualsFlag;
  nMaxValueRed?: number | null;
  nDurationRed?: number | null;
  nThickMin?: number | null;
  nThickMax?: number | null;
  nWidthMin?: number | null;
  nWidthMax?: number | null;
  cIngotCode?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cMachine?: string | null;
  cNextProc?: string | null;
  cLineCode?: string | null;
  nAccuracy?: number | null;
  nUpperPercent?: number | null;
  nLowerPercent?: number | null;
  nAlarmMin?: number | null;
  nAlarmMax?: number | null;
  nAlarmLv?: AlarmLevel | null;
  nIntervalAlarm?: EqualsFlag;
  cIsJudge?: YesNo;
  cIsPrint?: YesNo;
  cFormula?: string | null;
  cJudgeFormula?: string | null;
}
export interface Tqmyl10Dto {
  id?: string | null;
  creator?: string | null;
  createTime?: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cProc?: string | null;
  cIngot?: string | null;
  nCalcType?: ValueType;
  cName?: string | null;
  cReamrk?: string | null;
  items?: Tqmyl11Dto[] | null;
}
export interface Tqmyl11Detail {
  id?: string | null;
  cpId?: string | null;
  nBsl?: number | null;
  nLs?: number | null;
  cZone?: string | null;
  nValue?: number | null;
  cCalcExp?: string | null;
  nParam1?: number | null;
  nParam2?: number | null;
  nParam3?: number | null;
  nParam4?: number | null;
  nParam5?: number | null;
}
export interface Tqmyl11Dto {
  cpId?: string | null;
  nBsl?: number | null;
  nLs?: number | null;
  details?: Tqmyl11Detail[] | null;
}
export interface TsTableProVal {
  selected?: boolean;
  id?: string | null;
  cTbCode?: string | null;
  cValue0?: string | null;
  cValue1?: string | null;
  cValue2?: string | null;
  cValue3?: string | null;
  cValue4?: string | null;
  cValue5?: string | null;
  cValue6?: string | null;
  cValue7?: string | null;
  cValue8?: string | null;
  cValue9?: string | null;
  cValue10?: string | null;
  cValue11?: string | null;
  cValue12?: string | null;
  cValue13?: string | null;
  cValue14?: string | null;
  cValue15?: string | null;
  cValue16?: string | null;
  cValue17?: string | null;
  cValue18?: string | null;
  cValue19?: string | null;
  cValue20?: string | null;
  cValue21?: string | null;
  cValue22?: string | null;
  cValue23?: string | null;
  cValue24?: string | null;
  cValue25?: string | null;
  cValue26?: string | null;
  cValue27?: string | null;
  cValue28?: string | null;
  cValue29?: string | null;
  cValue30?: string | null;
  cValue31?: string | null;
  cValue32?: string | null;
  cValue33?: string | null;
  cValue34?: string | null;
  cValue35?: string | null;
  cValue36?: string | null;
  cValue37?: string | null;
  cValue38?: string | null;
  cValue39?: string | null;
  cValue40?: string | null;
  cValue41?: string | null;
  cValue42?: string | null;
  cValue43?: string | null;
  cValue44?: string | null;
  cValue45?: string | null;
  cValue46?: string | null;
  cValue47?: string | null;
  cValue48?: string | null;
  cValue49?: string | null;
  cValue50?: string | null;
  cValue51?: string | null;
  cValue52?: string | null;
  cValue53?: string | null;
  cValue54?: string | null;
  cValue55?: string | null;
  cValue56?: string | null;
  cValue57?: string | null;
  cValue58?: string | null;
  cValue59?: string | null;
  cValue60?: string | null;
  cValue61?: string | null;
  cValue62?: string | null;
  cValue63?: string | null;
  cValue64?: string | null;
  cValue65?: string | null;
  cValue66?: string | null;
  cValue67?: string | null;
  cValue68?: string | null;
  cValue69?: string | null;
  cValue70?: string | null;
  createTime?: string | null;
  creator?: string | null;
  lastModifyTime?: string | null;
  lastModifier?: string | null;
  cValue72?: string | null;
  cValue73?: string | null;
  cValue74?: string | null;
  cValue75?: string | null;
  cValue76?: string | null;
  cValue77?: string | null;
  cValue78?: string | null;
  cValue79?: string | null;
  cValue80?: string | null;
  cValue81?: string | null;
  cValue82?: string | null;
  cValue83?: string | null;
  cValue84?: string | null;
  cValue85?: string | null;
  cValue86?: string | null;
  cValue87?: string | null;
  cValue88?: string | null;
  cValue89?: string | null;
  cValue90?: string | null;
  cValue91?: string | null;
  cValue92?: string | null;
  cValue93?: string | null;
  cValue94?: string | null;
  cValue95?: string | null;
  cValue96?: string | null;
  cValue97?: string | null;
  cValue98?: string | null;
  cValue99?: string | null;
  cValue100?: string | null;
  cValue101?: string | null;
  cValue102?: string | null;
  cValue103?: string | null;
  cValue104?: string | null;
  cValue105?: string | null;
  cValue106?: string | null;
  cValue107?: string | null;
  cValue108?: string | null;
  cValue109?: string | null;
  cValue110?: string | null;
  cValue111?: string | null;
  cValue112?: string | null;
  cValue113?: string | null;
  cValue114?: string | null;
  cValue115?: string | null;
  cValue116?: string | null;
  cValue117?: string | null;
  cValue118?: string | null;
  cValue119?: string | null;
  cValue120?: string | null;
  cValue121?: string | null;
  cValue122?: string | null;
  cValue123?: string | null;
  cValue124?: string | null;
  cValue125?: string | null;
  cValue126?: string | null;
  cValue127?: string | null;
  cValue128?: string | null;
  cValue129?: string | null;
  cValue130?: string | null;
  cValue131?: string | null;
  cValue132?: string | null;
  cValue133?: string | null;
  cValue134?: string | null;
  cValue135?: string | null;
  cValue136?: string | null;
  cValue137?: string | null;
  cValue138?: string | null;
  cValue139?: string | null;
  cValue140?: string | null;
  cValue141?: string | null;
  cValue142?: string | null;
  cValue143?: string | null;
  cValue144?: string | null;
  cValue145?: string | null;
  cValue146?: string | null;
  cValue147?: string | null;
  cValue148?: string | null;
  cValue149?: string | null;
  cValue150?: string | null;
  cValue71?: string | null;
}
export interface TsTableProValIdxTable {
  selected?: boolean;
  id?: string | null;
  cTbCode?: string | null;
  cValue0?: string | null;
  cValue1?: string | null;
  cValue2?: string | null;
  cValue3?: string | null;
  cValue4?: string | null;
  cValue5?: string | null;
  cValue6?: string | null;
  cValue7?: string | null;
  cValue8?: string | null;
  cValue9?: string | null;
  cValue10?: string | null;
  cValue11?: string | null;
  cValue12?: string | null;
  cValue13?: string | null;
  cValue14?: string | null;
  cValue15?: string | null;
  cValue16?: string | null;
  cValue17?: string | null;
  cValue18?: string | null;
  cValue19?: string | null;
  cValue20?: string | null;
  cValue21?: string | null;
  cValue22?: string | null;
  cValue23?: string | null;
  cValue24?: string | null;
  cValue25?: string | null;
  cValue26?: string | null;
  cValue27?: string | null;
  cValue28?: string | null;
  cValue29?: string | null;
  cValue30?: string | null;
  cValue31?: string | null;
  cValue32?: string | null;
  cValue33?: string | null;
  cValue34?: string | null;
  cValue35?: string | null;
  cValue36?: string | null;
  cValue37?: string | null;
  cValue38?: string | null;
  cValue39?: string | null;
  cValue40?: string | null;
  cValue41?: string | null;
  cValue42?: string | null;
  cValue43?: string | null;
  cValue44?: string | null;
  cValue45?: string | null;
  cValue46?: string | null;
  cValue47?: string | null;
  cValue48?: string | null;
  cValue49?: string | null;
  cValue50?: string | null;
  cValue51?: string | null;
  cValue52?: string | null;
  cValue53?: string | null;
  cValue54?: string | null;
  cValue55?: string | null;
  cValue56?: string | null;
  cValue57?: string | null;
  cValue58?: string | null;
  cValue59?: string | null;
  cValue60?: string | null;
  cValue61?: string | null;
  cValue62?: string | null;
  cValue63?: string | null;
  cValue64?: string | null;
  cValue65?: string | null;
  cValue66?: string | null;
  cValue67?: string | null;
  cValue68?: string | null;
  cValue69?: string | null;
  cValue70?: string | null;
  createTime?: string | null;
  creator?: string | null;
  lastModifyTime?: string | null;
  lastModifier?: string | null;
  cValue72?: string | null;
  cValue73?: string | null;
  cValue74?: string | null;
  cValue75?: string | null;
  cValue76?: string | null;
  cValue77?: string | null;
  cValue78?: string | null;
  cValue79?: string | null;
  cValue80?: string | null;
  cValue81?: string | null;
  cValue82?: string | null;
  cValue83?: string | null;
  cValue84?: string | null;
  cValue85?: string | null;
  cValue86?: string | null;
  cValue87?: string | null;
  cValue88?: string | null;
  cValue89?: string | null;
  cValue90?: string | null;
  cValue91?: string | null;
  cValue92?: string | null;
  cValue93?: string | null;
  cValue94?: string | null;
  cValue95?: string | null;
  cValue96?: string | null;
  cValue97?: string | null;
  cValue98?: string | null;
  cValue99?: string | null;
  cValue100?: string | null;
  cValue101?: string | null;
  cValue102?: string | null;
  cValue103?: string | null;
  cValue104?: string | null;
  cValue105?: string | null;
  cValue106?: string | null;
  cValue107?: string | null;
  cValue108?: string | null;
  cValue109?: string | null;
  cValue110?: string | null;
  cValue111?: string | null;
  cValue112?: string | null;
  cValue113?: string | null;
  cValue114?: string | null;
  cValue115?: string | null;
  cValue116?: string | null;
  cValue117?: string | null;
  cValue118?: string | null;
  cValue119?: string | null;
  cValue120?: string | null;
  cValue121?: string | null;
  cValue122?: string | null;
  cValue123?: string | null;
  cValue124?: string | null;
  cValue125?: string | null;
  cValue126?: string | null;
  cValue127?: string | null;
  cValue128?: string | null;
  cValue129?: string | null;
  cValue130?: string | null;
  cValue131?: string | null;
  cValue132?: string | null;
  cValue133?: string | null;
  cValue134?: string | null;
  cValue135?: string | null;
  cValue136?: string | null;
  cValue137?: string | null;
  cValue138?: string | null;
  cValue139?: string | null;
  cValue140?: string | null;
  cValue141?: string | null;
  cValue142?: string | null;
  cValue143?: string | null;
  cValue144?: string | null;
  cValue145?: string | null;
  cValue146?: string | null;
  cValue147?: string | null;
  cValue148?: string | null;
  cValue149?: string | null;
  cValue150?: string | null;
  cValue71?: string | null;
  dataStatus?: DataStatusEnum;
  idxNo?: string | null;
  tableCode?: string | null;
}
export interface YlgyEntities {
  tqmyl01?: Tqmyl01 | null;
  tqmyl02s?: Tqmyl02[] | null;
  tqmyl03s?: Tqmyl03[] | null;
  tqmyl04s?: Tqmyl04[] | null;
  tqmts02s?: Tqmts02[] | null;
}

/* ---------- 请求 ---------- */



export const formulaTempleteApi = {
  query(testItemType?: string) {
    return requestClient.request<string[]>(
      "/dDH.Service.SQM.Services/formulaTemplete/query",
      {
        method: "post",
        params: { testItemType },
      },
    );
  },
  queryTsys() {
    return requestClient.request<string[]>(
      "/dDH.Service.SQM.Services/formulaTemplete/queryTsys",
      {
        method: "post",
      },
    );
  },
};

export const inventoryJudgeApi = {
  queryInventory(data?: QueryInventoryInput) {
    return requestClient.request<InventoryInfo[]>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/queryInventory",
      {
        method: "post",
        data,
      },
    );
  },
  complexDecide(data?: ComplexDecideInput) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/complexDecide",
      {
        method: "post",
        data,
      },
    );
  },
  productDisposal(data?: InventoryDisposalInput) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/productDisposal",
      {
        method: "post",
        data,
      },
    );
  },
  surfaceDetermine(data?: SurfaceDetermineInput) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/surfaceDetermine",
      {
        method: "post",
        data,
      },
    );
  },
  detect(data?: DetectInput) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.QualityDisposition/inventoryJudge/detect",
      {
        method: "post",
        data,
      },
    );
  },
};

export const mSCApi = {
  queryTm08s() {
    return requestClient.request<Tqmtm08[]>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryTm08s",
      {
        method: "post",
      },
    );
  },
  saveMsc(data?: MSCDto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/saveMsc",
      {
        method: "post",
        data,
      },
    );
  },
  buildMSCNo(shape?: string, stlType?: string, stdType?: string, fac?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/buildMSCNo",
      {
        method: "post",
        params: { shape, stlType, stdType, fac },
      },
    );
  },
  queryMscId(factoryId?: string, mscNo?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryMscId",
      {
        method: "post",
        params: { factoryId, mscNo },
      },
    );
  },
  deleteMsc(mscId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/deleteMsc",
      {
        method: "post",
        params: { mscId },
      },
    );
  },
  effectMsc(mscId?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/effectMsc",
      {
        method: "post",
        params: { mscId },
        data,
      },
    );
  },
  queryMSC(msc?: string) {
    return requestClient.request<MSCDto>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryMSC",
      {
        method: "post",
        params: { msc },
      },
    );
  },
  queryMSCs(data?: MSCQueryParaPaginationQueryInput) {
    return requestClient.request<MSCDtoPaginationResult>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryMSCs",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryMscHistoryInput) {
    return requestClient.request<Tqmtm01Record[]>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<MSCDto>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  queryTqmtm01s(data?: MSCQueryPara) {
    return requestClient.request<Tqmtm01[]>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryTqmtm01s",
      {
        method: "post",
        data,
      },
    );
  },
  queryMSCById(tm01Id?: string) {
    return requestClient.request<MSCDto>(
      "/dDH.Service.SQM.Services.Tqmtm/mSC/queryMSCById",
      {
        method: "post",
        params: { tm01Id },
      },
    );
  },
};

export const qualityDesignApi = {
  designZHB(data?: QualityDesignInput) {
    return requestClient.request<QualityDesignOutput>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/designZHB",
      {
        method: "post",
        data,
      },
    );
  },
  matchZHBJrzzGy(orderNo?: string) {
    return requestClient.request<Tqmjg01[]>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/matchZHBJrzzGy",
      {
        method: "post",
        params: { orderNo },
      },
    );
  },
  matchZHBJqGy(orderNo?: string) {
    return requestClient.request<Tqmjg01[]>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/matchZHBJqGy",
      {
        method: "post",
        params: { orderNo },
      },
    );
  },
  assignZHBJrzzJqGy(orderNo?: string, jrzz?: string, jq?: string) {
    return requestClient.request<number>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/assignZHBJrzzJqGy",
      {
        method: "post",
        params: { orderNo, jrzz, jq },
      },
    );
  },
  queryJggyDesignResult(orderNo?: string) {
    return requestClient.request<JggyEntities>(
      "/dDH.Service.SQM.Services.QualityDesign/qualityDesign/queryJggyDesignResult",
      {
        method: "post",
        params: { orderNo },
      },
    );
  },
};

export const testItemApi = {
  queryTestItems() {
    return requestClient.request<TestItemDto[]>(
      "/dDH.Service.SQM.Services/testItem/queryTestItems",
      {
        method: "post",
      },
    );
  },
  querySubItems() {
    return requestClient.request<TestSubItem[]>(
      "/dDH.Service.SQM.Services/testItem/querySubItems",
      {
        method: "post",
      },
    );
  },
  query(keyword?: string) {
    return requestClient.request<TestSubItem[]>(
      "/dDH.Service.SQM.Services/testItem/query",
      {
        method: "post",
        params: { keyword },
      },
    );
  },
  insertOrUpdate(data?: TestSubItem) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services/testItem/insertOrUpdate",
      {
        method: "post",
        data,
      },
    );
  },
  delete(data?: TestSubItem) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services/testItem/delete",
      {
        method: "post",
        data,
      },
    );
  },
  queryChemicalItems() {
    return requestClient.request<ChemicalItem[]>(
      "/dDH.Service.SQM.Services/testItem/queryChemicalItems",
      {
        method: "post",
      },
    );
  },
};

export const testStandardApi = {
  queryCfStds(data?: QueryCFStdInput[]) {
    return requestClient.request<ChemicalCompositionStdResult[]>(
      "/dDH.Service.SQM.Services/testStandard/queryCfStds",
      {
        method: "post",
        data,
      },
    );
  },
  queryCfStd(data?: QueryCFStdInput) {
    return requestClient.request<ChemicalCompositionStdResult>(
      "/dDH.Service.SQM.Services/testStandard/queryCfStd",
      {
        method: "post",
        data,
      },
    );
  },
  queryTestStd(data?: AddTestJobInput) {
    return requestClient.request<TestStandard[]>(
      "/dDH.Service.SQM.Services/testStandard/queryTestStd",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tmp1210Api = {
  addTmp1210(data?: Tmp1210) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tmp1210/addTmp1210",
      {
        method: "post",
        data,
      },
    );
  },
  getTmp1210List(steelType?: string, steelGrade?: string) {
    return requestClient.request<Tmp1210[]>(
      "/dDH.Service.SQM.Services.Tmptp/tmp1210/getTmp1210List",
      {
        method: "post",
        params: { steelType, steelGrade },
      },
    );
  },
  removeTmp1210(data?: Tmp1210) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tmp1210/removeTmp1210",
      {
        method: "post",
        data,
      },
    );
  },
  updateTmp1210(data?: Tmp1210) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tmp1210/updateTmp1210",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tql1015Api = {
  addThr4010(data?: Thr4010) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/addThr4010",
      {
        method: "post",
        data,
      },
    );
  },
  addThr4010Batch(data?: Thr4010[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/addThr4010Batch",
      {
        method: "post",
        data,
      },
    );
  },
  getThr4000List(data?: QueryCriteriaDTO) {
    return requestClient.request<Thr4000[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/getThr4000List",
      {
        method: "post",
        data,
      },
    );
  },
  getThr4010List() {
    return requestClient.request<Thr4010[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/getThr4010List",
      {
        method: "post",
      },
    );
  },
  savetql4010(result?: string, details?: Thr4010[], data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1015/savetql4010",
      {
        method: "post",
        params: { result, details },
        data,
      },
    );
  },
};

export const tql1016Api = {
  addTms3010(data?: Tms3010) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/addTms3010",
      {
        method: "post",
        data,
      },
    );
  },
  addTms3010Batch(data?: Tms3010[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/addTms3010Batch",
      {
        method: "post",
        data,
      },
    );
  },
  getTms3000List(data?: QueryCriteriaDTO) {
    return requestClient.request<Tms3000[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/getTms3000List",
      {
        method: "post",
        data,
      },
    );
  },
  getTms3010List() {
    return requestClient.request<Tms3010[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/getTms3010List",
      {
        method: "post",
      },
    );
  },
  saveTms3010(result?: string, details?: Tms3010[], data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1016/saveTms3010",
      {
        method: "post",
        params: { result, details },
        data,
      },
    );
  },
};

export const tql1120Api = {
  addTql1120(data?: DefectType) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/addTql1120",
      {
        method: "post",
        data,
      },
    );
  },
  addTql1121(data?: DefectDescription) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/addTql1121",
      {
        method: "post",
        data,
      },
    );
  },
  getTql1120List(keyword?: string) {
    return requestClient.request<DefectType[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/getTql1120List",
      {
        method: "post",
        params: { keyword },
      },
    );
  },
  queryDefectType() {
    return requestClient.request<DefectType[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/queryDefectType",
      {
        method: "post",
      },
    );
  },
  getTql1121List(keyword?: string) {
    return requestClient.request<DefectDescription[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/getTql1121List",
      {
        method: "post",
        params: { keyword },
      },
    );
  },
  queryDefectDescription() {
    return requestClient.request<DefectDescription[]>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/queryDefectDescription",
      {
        method: "post",
      },
    );
  },
  removeTql1120(data?: DefectType) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/removeTql1120",
      {
        method: "post",
        data,
      },
    );
  },
  removeTql1121(data?: DefectDescription) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/removeTql1121",
      {
        method: "post",
        data,
      },
    );
  },
  updateTql1120(data?: DefectType) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/updateTql1120",
      {
        method: "post",
        data,
      },
    );
  },
  updateTql1121(data?: DefectDescription) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/updateTql1121",
      {
        method: "post",
        data,
      },
    );
  },
  tql1120ByCode(code?: string, editId?: string) {
    return requestClient.request<boolean>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/tql1120ByCode",
      {
        method: "post",
        params: { code, editId },
      },
    );
  },
  tql1121ByCode(code?: string, editId?: string) {
    return requestClient.request<boolean>(
      "/dDH.Service.SQM.Services.Tmptp/tql1120/tql1121ByCode",
      {
        method: "post",
        params: { code, editId },
      },
    );
  },
};

export const tqm1000Api = {
  getTqm1000List() {
    return requestClient.request<Tqm1000[]>(
      "/dDH.Service.SQM.Services.Tmptp/tqm1000/getTqm1000List",
      {
        method: "post",
      },
    );
  },
  addTqm1000(data?: Tqm1000) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tqm1000/addTqm1000",
      {
        method: "post",
        data,
      },
    );
  },
  removeTqm1000(data?: Tqm1000) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tqm1000/removeTqm1000",
      {
        method: "post",
        data,
      },
    );
  },
  updateTqm1000(data?: Tqm1000) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tqm1000/updateTqm1000",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmjgApi = {
  query(data?: QueryJg01Input) {
    return requestClient.request<Tqmjg01[]>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/query",
      {
        method: "post",
        data,
      },
    );
  },
  queryById(id?: string) {
    return requestClient.request<JggyEntities>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/queryById",
      {
        method: "post",
        params: { id },
      },
    );
  },
  save(data?: JggyEntities) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/save",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryTqmjgRecordInput) {
    return requestClient.request<Tqmjg01Record[]>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<JggyEntities>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
  updateValidFlag(id?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmjg/tqmjg/updateValidFlag",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
};

export const tqmtdApi = {
  queryTqmtd10(data?: QueryTqmtd10Input) {
    return requestClient.request<Tqmtd10[]>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryTqmtd10",
      {
        method: "post",
        data,
      },
    );
  },
  queryTqmtd11By10Id(tqmtd10Id?: string) {
    return requestClient.request<Tqmtd11[]>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryTqmtd11By10Id",
      {
        method: "post",
        params: { tqmtd10Id },
      },
    );
  },
  queryTqmtd12By10Id(tqmtd10Id?: string) {
    return requestClient.request<Tqmtd12[]>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryTqmtd12By10Id",
      {
        method: "post",
        params: { tqmtd10Id },
      },
    );
  },
  queryById(id?: string) {
    return requestClient.request<TqmtdEntities>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryById",
      {
        method: "post",
        params: { id },
      },
    );
  },
  save(data?: TqmtdEntities) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/save",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryTqmtdRecordInput) {
    return requestClient.request<Tqmtd10Record[]>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<TqmtdEntities>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  updateStatus(tqmtd10Id?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/updateStatus",
      {
        method: "post",
        params: { tqmtd10Id },
        data,
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtd/tqmtd/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
};

export const tqmtm09Api = {
  saveTm09AndIdxTable(data?: SaveIdxDataDto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm09/saveTm09AndIdxTable",
      {
        method: "post",
        data,
      },
    );
  },
  checkIdxNoExists(data?: Tqmtm09) {
    return requestClient.request<boolean>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm09/checkIdxNoExists",
      {
        method: "post",
        data,
      },
    );
  },
  queryTm09AndIdxData(data?: SelectedTableCondtionDto) {
    return requestClient.request<SelectedTableDataDto[]>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm09/queryTm09AndIdxData",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmtm104Api = {
  queryTreeSource() {
    return requestClient.request<Tqmtm104DetailDto[]>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/queryTreeSource",
      {
        method: "post",
      },
    );
  },
  queryGrp(data?: Tqmtm104ConditionDto) {
    return requestClient.request<Tqmtm104Dto[]>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/queryGrp",
      {
        method: "post",
        data,
      },
    );
  },
  addNew(data?: Tqmtm104Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/addNew",
      {
        method: "post",
        data,
      },
    );
  },
  update(data?: Tqmtm104Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/update",
      {
        method: "post",
        data,
      },
    );
  },
  delete(data?: Tqmtm104Dto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/delete",
      {
        method: "post",
        data,
      },
    );
  },
  import(data?: Tqmtm08[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/import",
      {
        method: "post",
        data,
      },
    );
  },
  save(data?: Tqmtm104DtoSaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtm/tqmtm104/save",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmtp01Api = {
  query(data?: Tqmtp01QueryInput) {
    return requestClient.request<Tqmtp01Dto[]>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/query",
      {
        method: "post",
        data,
      },
    );
  },
  queryForEdit(id?: string) {
    return requestClient.request<Tqmtp01>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/queryForEdit",
      {
        method: "post",
        params: { id },
      },
    );
  },
  save(data?: Tqmtp01) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/save",
      {
        method: "post",
        data,
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
  addMsc(data?: Tqmtp03) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/addMsc",
      {
        method: "post",
        data,
      },
    );
  },
  deleteMsc(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/deleteMsc",
      {
        method: "post",
        params: { id },
      },
    );
  },
  setValidFlag(id?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtp01/setValidFlag",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
};

export const tqmtpa4Api = {
  query(data?: Tqmtpa4QueryInput) {
    return requestClient.request<Tqmtpa4[]>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa4/query",
      {
        method: "post",
        data,
      },
    );
  },
  save(data?: Tqmtpa4SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa4/save",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmtpa5Api = {
  query(data?: Tqmtpa5QueryInput) {
    return requestClient.request<Tqmtpa5[]>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa5/query",
      {
        method: "post",
        data,
      },
    );
  },
  save(data?: Tqmtpa5SaveChangesData) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa5/save",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmtpa6Api = {
  insertOrReplace(data?: Tqmtpa6) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa6/insertOrReplace",
      {
        method: "post",
        data,
      },
    );
  },
  delete(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa6/delete",
      {
        method: "post",
        data,
      },
    );
  },
  query(data?: Tqmtpa6QueryInput) {
    return requestClient.request<Tqmtpa6[]>(
      "/dDH.Service.SQM.Services.Tqmtp/tqmtpa6/query",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmts0xApi = {
  query(data?: Tqmts0xQueryInput) {
    return requestClient.request<Tqmts0xDto[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/query",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryTqmts0xHistoryInput) {
    return requestClient.request<Tqmts0xRecord[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<Tqmts0xDto>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  queryWithTs02(data?: Tqmts0xQueryInput) {
    return requestClient.request<Tqmts0xDto[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/queryWithTs02",
      {
        method: "post",
        data,
      },
    );
  },
  queryTqmts02s(idxNo?: string) {
    return requestClient.request<TsTableProVal[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/queryTqmts02s",
      {
        method: "post",
        params: { idxNo },
      },
    );
  },
  save(data?: Tqmts0xDto) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/save",
      {
        method: "post",
        data,
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
  buildNewStNo(lm?: string, qma5?: string, qma6?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/buildNewStNo",
      {
        method: "post",
        params: { lm, qma5, qma6 },
      },
    );
  },
  buildNewJMStNo(head?: string) {
    return requestClient.request<string>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/buildNewJMStNo",
      {
        method: "post",
        params: { head },
      },
    );
  },
  getUsedMsc(stno?: string) {
    return requestClient.request<string[]>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/getUsedMsc",
      {
        method: "post",
        params: { stno },
      },
    );
  },
  editValidFlag(stNo?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmts/tqmts0x/editValidFlag",
      {
        method: "post",
        params: { stNo },
        data,
      },
    );
  },
};

export const tqmylApi = {
  queryYl01(data?: QueryYl01Input) {
    return requestClient.request<Tqmyl01[]>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryYl01",
      {
        method: "post",
        data,
      },
    );
  },
  queryById(id?: string) {
    return requestClient.request<YlgyEntities>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryById",
      {
        method: "post",
        params: { id },
      },
    );
  },
  save(data?: YlgyEntities) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/save",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(data?: QueryTqmylRecordInput) {
    return requestClient.request<Tqmyl01Record[]>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryHistory",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistoryDetail(id?: string) {
    return requestClient.request<YlgyEntities>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryHistoryDetail",
      {
        method: "post",
        params: { id },
      },
    );
  },
  delete(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/delete",
      {
        method: "post",
        params: { id },
      },
    );
  },
  updateValidFlag(id?: string, data?: ValidFlag) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/updateValidFlag",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
  queryPublicIdxes() {
    return requestClient.request<Tqmyl04[]>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/queryPublicIdxes",
      {
        method: "post",
      },
    );
  },
  savePublicIdxes(data?: Tqmyl04[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl/savePublicIdxes",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqmyl10Api = {
  query() {
    return requestClient.request<Tqmyl10Dto[]>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl10/query",
      {
        method: "post",
      },
    );
  },
  save(proc?: string, data?: Tqmyl10Dto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tqmyl/tqmyl10/save",
      {
        method: "post",
        params: { proc },
        data,
      },
    );
  },
};

export const tyd2000DSApi = {
  getThr4000List(data?: QueryCriteriaDTO) {
    return requestClient.request<PlateInspectionDto[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getThr4000List",
      {
        method: "post",
        data,
      },
    );
  },
  getTms3000List(data?: QueryCriteriaDTO) {
    return requestClient.request<SteelPlateInspectionDto[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getTms3000List",
      {
        method: "post",
        data,
      },
    );
  },
  getThr4000DetailsList(data?: QueryCriteriaDTO) {
    return requestClient.request<Thr4000Details[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getThr4000DetailsList",
      {
        method: "post",
        data,
      },
    );
  },
  getTms3000DetailsList(data?: QueryCriteriaDTO) {
    return requestClient.request<Tms3000Details[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getTms3000DetailsList",
      {
        method: "post",
        data,
      },
    );
  },
  saveSurfaceResult(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: PlateInspectionDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveSurfaceResult",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  saveSurfaceResultS(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: SteelPlateInspectionDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveSurfaceResultS",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  saveThr4000Details(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: Thr4000Details[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveThr4000Details",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  saveTms3000Details(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: Tms3000Details[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveTms3000Details",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  revertThr4000Details(data?: Thr4000Details[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/revertThr4000Details",
      {
        method: "post",
        data,
      },
    );
  },
  revertTms3000Details(data?: Tms3000Details[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/revertTms3000Details",
      {
        method: "post",
        data,
      },
    );
  },
  getFrm03List(data?: QueryCriteriaDTO) {
    return requestClient.request<PlateInspectionDto[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getFrm03List",
      {
        method: "post",
        data,
      },
    );
  },
  getTht4000ZrpanList(data?: QueryCriteriaDTO) {
    return requestClient.request<Thr4000Zrpan[]>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/getTht4000ZrpanList",
      {
        method: "post",
        data,
      },
    );
  },
  saveResponsibleDept(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: PlateInspectionDto[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveResponsibleDept",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  saveResponsibleDeptS(PieceNos?: string[], SurfaceResult?: string, DeterminationDesc?: string, DefectMinor?: string, DefectMajor?: string, ResponsibleDept?: string, DisposalOpinion?: string, DisposalOpinion2?: string, DefectDescrip?: string, CompResult?: CompositionEnum, CompRemark?: string, Len?: string, Wth?: string, Thk1?: string, Thk2?: string, Thk3?: string, CNdtResult?: string, CNdtResultDesc?: string, data?: Thr4000Zrpan[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/saveResponsibleDeptS",
      {
        method: "post",
        params: { PieceNos, SurfaceResult, DeterminationDesc, DefectMinor, DefectMajor, ResponsibleDept, DisposalOpinion, DisposalOpinion2, DefectDescrip, CompResult, CompRemark, Len, Wth, Thk1, Thk2, Thk3, CNdtResult, CNdtResultDesc },
        data,
      },
    );
  },
  revertThr4000Zrpan(data?: Thr4000Zrpan[]) {
    return requestClient.request<any>(
      "/dDH.Service.SQM.Services.Tmptp/tyd2000DS/revertThr4000Zrpan",
      {
        method: "post",
        data,
      },
    );
  },
};
