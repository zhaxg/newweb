/**
 * LIMS 域后端接口（dDH.Service.*）：枚举 + 类型 + 请求，单文件维护。
 * 原 src/api/lims 的 enums.ts / types.d.ts / request.ts 合并。
 */

import { requestClient } from "@/api/_core/request";

/* ---------- 枚举 ---------- */

export enum CtrlMode {
  Std = 0,
  Inner = 1,
}
export enum EqualsFlag {
  Default = 1,
  LeftOpen = 2,
  RightOpen = 4,
  Open = 6,
}
export enum SampleJudgeResult {
  None = 0,
  NoNeedForJudgement = 1,
  Qualified = 2,
  Unqualified = 3,
}
export enum StoveChemResult {
  None = 0,
  Qualified = 2,
  Unqualified = 3,
  ManualRelease = 4,
  Waste = 5,
}
export enum TestJobCheckStatus {
  NotComplete = 0,
  NotCheck = 1,
  Pass = 2,
  NotPass = 3,
}
export enum TestJobJudgeResult {
  None = 0,
  Qualified = 2,
  Unqualified = 3,
  ManualRelease = 4,
}
export enum TestJobStatus {
  NotSend = 0,
  Sent = 10,
  Received = 20,
  Finished = 30,
}
export enum TqlCFCollectNstatus {
  Failure = 0,
  Normal = 1,
  Abnormal = 2,
  UnHandle = 3,
  NStatusAbnormal = 4,
}
export enum YesNo {
  N = 0,
  Y = 1,
}

/* ---------- 类型 ---------- */


export interface AddStoveChemSampleInput {
  stoveInfo?: AddStoveChemTestInput | null;
  id: string;
  cSampleNo: string;
  cGw?: string | null;
  cSendUser?: string | null;
  dSendTime?: string | null;
  cRecheckFlag?: YesNo;
  cFinalFlag?: YesNo;
}
export interface AddStoveChemTestInput {
  cPoNo?: string | null;
  cStove: string;
  cpStove?: string | null;
  cSgSign: string;
  cSgStd: string;
  cStNo?: string | null;
  cOrderNo?: string | null;
  cOrderTsyq?: string | null;
  cLineCode: string;
  cMachine?: string | null;
  cRouteCode?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  nPlanWgt?: number | null;
  cSpec?: string | null;
  cIngotCode?: string | null;
  dProdTime?: string;
}
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
export interface ChangeTestJobBatchNoInput {
  testNo1?: string | null;
  newBatchNo1?: string | null;
  testNo2?: string | null;
  newBatchNo2?: string | null;
}
export interface ChemItemInfo {
  cCode?: string | null;
  cName?: string | null;
  nValue?: number | null;
  cJudgeFlag?: CtrlMode;
  judgeResult?: SampleJudgeResult;
  judgeInResult?: string | null;
  cFormula?: string | null;
  cJudgeFormula?: string | null;
  formula?: Formula | null;
  judgeFormula?: Formula | null;
  mainRange?: DecimalRange;
  mainAccuracy?: number | null;
  speRange?: DecimalRange;
  speAccuracy?: number | null;
  stdRange?: DecimalRange;
  stdAccuracy?: number | null;
  valueDisplay?: string | null;
  roundValue?: number | null;
  formulaResult?: boolean | null;
  seq?: number;
  isJudge?: YesNo;
  isPrint?: YesNo;
}
export interface CompleteItemInput {
  tql3100Id?: string | null;
  testItemType?: string | null;
  testItems?: string[] | null;
}
export interface DecimalRange {
  min?: number | null;
  max?: number | null;
  equalsMethod?: EqualsFlag;
}
export interface Formula {
  formulaString?: string | null;
  hasError?: boolean;
  errorMsg?: string | null;
  expression?: IExpression | null;
}
export interface IExpression {

}
export interface QueryCFStdInput {
  stlGrd?: string | null;
  std?: string | null;
  stNo?: string | null;
  isPrd?: boolean;
  orderNo?: string | null;
}
export interface QueryStoveChemInfoInput {
  stoveNo?: string | null;
  stdInput?: QueryCFStdInput[] | null;
}
export interface QueryStoveChemicalCompositionInput {
  lineCode?: string | null;
  stove?: string | null;
  poNo?: string | null;
  planNo?: string | null;
  sgSign?: string | null;
  sgStd?: string | null;
  prdTime?: TimeRange;
  createTime?: TimeRange;
  stNo?: string | null;
  recheckFlag?: YesNo | null;
  stoveChemResult?: StoveChemResult | null;
  confirmFlag?: YesNo | null;
}
export interface QueryTestJobInput {
  cLineCode?: string | null;
  lines?: string[] | null;
  cTestNo?: string | null;
  cStove?: string | null;
  cBatch?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cOrderNo?: string | null;
  cStatus?: TestJobStatus | null;
  statuses?: TestJobStatus[] | null;
  cRecheckFlag?: YesNo | null;
  createTime?: TimeRange;
  dReceiveTime?: TimeRange;
  dCheckTime?: TimeRange;
  testItemType?: string | null;
  testItems?: string[] | null;
  useTestItemType?: boolean;
  checkStatus?: TestJobCheckStatus | null;
  completeFlag?: boolean | null;
  printTime?: TimeRange;
  lstStove?: string[] | null;
  lstOrder?: string[] | null;
  lstPNo?: string[] | null;
  hasItems?: boolean;
  needSend?: string | null;
}
export interface QueryTqlCFCollectDto {
  timeRange?: TimeRange;
  heatNo?: string | null;
  cSampNo?: string | null;
  steelGrade?: string | null;
  nStatus?: TqlCFCollectNstatus | null;
}
export interface QueryTqlLXCollectDto {
  timeRange?: TimeRange;
  cTestNo?: string | null;
  cTestItem?: string | null;
  cSampleNo?: string | null;
  nStatus?: TqlCFCollectNstatus | null;
}
export interface SampleRequires {
  id?: string | null;
  creator?: string | null;
  createTime?: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  fId?: string | null;
  cTestNo?: string | null;
  cTestItemType?: string | null;
  cTestItemTypeDesc?: string | null;
  cCompleteFlag?: YesNo;
  dCompleteTime?: string | null;
  cCompleteUser?: string | null;
  cJudgeResult?: SampleJudgeResult;
  cJudgeRemark?: string | null;
  cTestItem?: string | null;
  cTestItemName?: string | null;
  cWholeBacklogCode?: string | null;
  cSamplePos?: string | null;
  cSamplePosDesc?: string | null;
  cSampleLen?: string | null;
  cSampleLenDesc?: string | null;
  cTestDirectDesc?: string | null;
  cTestCndCode?: string | null;
  nSampleNumRnd?: number | null;
  nTestNum?: number | null;
  cTestPurpose?: string | null;
  cTestPurposeDesc?: string | null;
  cFinishedPrdFlag?: string | null;
  cIdxNo?: string | null;
  cTestDirect?: string | null;
  cReplaceSampleCode?: string | null;
  nRetestMulti?: number | null;
  cCheckStatus?: TestJobCheckStatus;
  cCheckUser?: string | null;
  dCheckTime?: string | null;
  selected?: boolean;
  nTestTimes?: number;
  cNeedSend?: YesNo;
  cTestAdditionDesc?: string | null;
}
export interface StoveChemInfo {
  stoveNo?: string | null;
  std?: QueryCFStdInput;
  chemDetails?: ChemItemInfo[] | null;
  isOK?: boolean;
  result?: StoveChemResultStringValueTuple;
}
export interface StoveChemResultStringValueTuple {

}
export interface StoveChemicalCompositionResult {
  sampleId?: string | null;
  cSampleNo?: string | null;
  cCode?: string | null;
  cName?: string | null;
  nValue?: number | null;
}
export interface StoveInfo {
  id?: string | null;
  cPoNo?: string | null;
  cStove?: string | null;
  cpStove?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cStNo?: string | null;
  cOrderNo?: string | null;
  cOrderTsyq?: string | null;
  cLineCode?: string | null;
  cMachine?: string | null;
  cRouteCode?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  nPlanWgt?: number | null;
  cSpec?: string | null;
  cIngotCode?: string | null;
  dProdTime?: string;
  recheckFlag?: YesNo;
  cJudgeUser?: string | null;
  dJudgeTime?: string | null;
  cJudgeResult?: StoveChemResult;
  cJudgeRemark?: string | null;
  cConfirmFlag?: YesNo;
  cConfirmUser?: string | null;
  dConfirmTime?: string | null;
  samples?: StoveTestSample[] | null;
}
export interface StoveSampleTestItem {
  cCode?: string | null;
  cName?: string | null;
  nValue?: number | null;
  cCtrlFlag?: CtrlMode;
  judgeResult?: SampleJudgeResult;
  cFormula?: string | null;
  cJudgeFormula?: string | null;
  judgeFormula?: Formula | null;
  formula?: Formula | null;
  mainRange?: DecimalRange;
  speRange?: DecimalRange;
  stdRange?: DecimalRange;
  stdAccuracy?: number | null;
  valueDisplay?: string | null;
  roundValue?: number | null;
  formulaResult?: boolean | null;
  seq?: number;
  isJudge?: YesNo;
  isPrint?: YesNo;
}
export interface StoveTestSample {
  id?: string | null;
  cStove?: string | null;
  cStNo?: string | null;
  cSampleNo?: string | null;
  cGw?: string | null;
  cSendUser?: string | null;
  dSendTime?: string | null;
  cJudgeResult?: SampleJudgeResult;
  dJudgeTime?: string | null;
  cJudgeRemark?: string | null;
  cRecheckFlag?: YesNo;
  cFinalFlag?: YesNo;
  cConfirmFlag?: YesNo;
  testItems?: StoveSampleTestItem[] | null;
  cTestUser?: string | null;
  dTestTime?: string | null;
  cDisable?: YesNo;
  lastSampleId?: string | null;
}
export interface TestItemValue {
  id?: string | null;
  creator?: string | null;
  createTime?: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTestNo?: string | null;
  cStove?: string | null;
  cpStove?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cStNo?: string | null;
  cOrderNo?: string | null;
  cLineCode?: string | null;
  cMsc?: string | null;
  cMscLineNo?: string | null;
  cWholeBacklogCode?: string | null;
  fId?: string | null;
  cSampleNo?: string | null;
  cTestItemType?: string | null;
  cTestItemTypeDesc?: string | null;
  cTestItem?: string | null;
  cTestItemName?: string | null;
  cTestSubItem?: string | null;
  cTestSubItemName?: string | null;
  cTestSubItemDisplayName?: string | null;
  nItemAccuracy?: number | null;
  cValue?: string | null;
  cJudgeResult?: SampleJudgeResult;
  cRecheckFlag?: YesNo;
  judgeRange?: DecimalRange;
  judgeRangeNk?: DecimalRange;
  ctrlMode?: CtrlMode;
  isJudge?: YesNo;
  isPrint?: YesNo;
  needTest?: YesNo;
  seq?: number;
  cBatch?: string | null;
  cDesignNo?: string | null;
  cTargetValue?: string | null;
  cFormula?: string | null;
  formula?: Formula | null;
  cJudgeFormula?: string | null;
  judgeFormula?: Formula | null;
  formulaResult?: boolean | null;
  valueDisplay?: string | null;
}
export interface TestJob {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTestNo?: string | null;
  cStove?: string | null;
  cpStove?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cStNo?: string | null;
  cOrderNo?: string | null;
  cLineCode?: string | null;
  cMsc?: string | null;
  cMscLineNo?: string | null;
  cWholeBacklogCode?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  cAutoJudgeResult?: TestJobJudgeResult;
  cJudgeUser?: string | null;
  dJudgeTime?: string | null;
  cJudgeResult?: TestJobJudgeResult;
  cJudgeRemark?: string | null;
  cStatus?: TestJobStatus;
  cRecheckFlag?: YesNo;
  dReceiveTime?: string | null;
  dReceiveUser?: string | null;
  cConfirmUser?: string | null;
  dConfirmTime?: string | null;
  cSendUser?: string | null;
  dSendTime?: string | null;
  currentItemCompleteFlag?: YesNo;
  pId?: string | null;
  nTestTimes?: number;
  cBatch?: string | null;
  cDesignNo?: string | null;
  cConfirmStatus?: string | null;
  cDelivyStatusCode?: string | null;
  cDeliveryStateDesc?: string | null;
  cCustStdCode?: string | null;
  cCustStd?: string | null;
  cInternalNo?: string | null;
  cPlanRemark?: string | null;
  cSpecialDesc?: string | null;
  nCastDivCode?: number | null;
  cCzpFlag?: YesNo;
  cPrevTestNo?: string | null;
  cCzpOldTestNo?: string | null;
  wgt?: number | null;
  count?: number | null;
  cJiaJi?: YesNo;
  cHeadFoot?: string | null;
  cHeadFootStove?: string | null;
  cException?: string | null;
  orderCustCName?: string | null;
  cMatShape?: string | null;
  cSpecialMarkHt?: string | null;
  cWarrantyDesc?: string | null;
  cSpecialPackDesc?: string | null;
}
export interface TestSample {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  fId?: string | null;
  tql3110Id?: string | null;
  cTestNo?: string | null;
  cStove?: string | null;
  cpStove?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cStNo?: string | null;
  cOrderNo?: string | null;
  cLineCode?: string | null;
  cMsc?: string | null;
  cMscLineNo?: string | null;
  cWholeBacklogCode?: string | null;
  cSampleNo?: string | null;
  cTestItemType?: string | null;
  cTestItemTypeDesc?: string | null;
  cTestItem?: string | null;
  cTestItemName?: string | null;
  cSamplePos?: string | null;
  cSamplePosDesc?: string | null;
  cSampleLen?: string | null;
  cSampleLenDesc?: string | null;
  cTestDirect?: string | null;
  cTestDirectDesc?: string | null;
  dJudgeTime?: string | null;
  cJudgeResult?: SampleJudgeResult;
  cJudgeRemark?: string | null;
  cRecheckFlag?: YesNo;
  cTestUser?: string | null;
  dTestTime?: string | null;
  cShiftNo?: string | null;
  cGroupNo?: string | null;
  nTestTimes?: number;
  cDisable?: YesNo;
  testItems?: TestItemValue[] | null;
  cBatch?: string | null;
  cDesignNo?: string | null;
  labRemark?: string | null;
  cRemarkUser?: string | null;
  dRemarkTime?: string | null;
  cTestAdditionDesc?: string | null;
  cIdxNo?: string | null;
}
export interface TimeRange {
  min?: string | null;
  max?: string | null;
  timeSpan?: string;
  equalsMethod?: EqualsFlag;
}
export interface Tql2000 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cPoNo?: string | null;
  cStove?: string | null;
  cpStove?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cStNo?: string | null;
  cOrderNo?: string | null;
  cOrderTsyq?: string | null;
  cLineCode?: string | null;
  cMachine?: string | null;
  cRouteCode?: string | null;
  cSpec?: string | null;
  nThick?: number | null;
  nWth?: number | null;
  nLen?: number | null;
  cIngotCode?: string | null;
  nPlanWgt?: number | null;
  dProdTime?: string | null;
  cJudgeUser?: string | null;
  dJudgeTime?: string | null;
  cJudgeResult?: StoveChemResult;
  cJudgeRemark?: string | null;
  cConfirmFlag?: YesNo;
  cRecheckFlag?: YesNo;
  cLastSampleId?: string | null;
  cConfirmUser?: string | null;
  dConfirmTime?: string | null;
}
export interface Tql2001 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cStove?: string | null;
  cpStove?: string | null;
  cSgSign?: string | null;
  cSgStd?: string | null;
  cStNo?: string | null;
  cOrderNo?: string | null;
  cLineCode?: string | null;
  cJudgeUser?: string | null;
  dJudgeTime?: string | null;
  cJudgeResult?: StoveChemResult;
  cJudgeRemark?: string | null;
  cAutoJudgeResult?: StoveChemResult;
}
export interface Tql3200 {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  cTestNo?: string | null;
  cTestItemType?: string | null;
  cTestItemTypeDesc?: string | null;
  cTestItem?: string | null;
  cTestItemName?: string | null;
  cWholeBacklogCode?: string | null;
  cSamplePos?: string | null;
  cSampleLen?: string | null;
  cSampleLenDesc?: string | null;
  cTestDirect?: string | null;
  cTestCndCode?: string | null;
  cTestPurpose?: string | null;
  cFinishedPrdFlag?: string | null;
  cReplaceSampleCode?: string | null;
  cTestSubItemCode?: string | null;
  cTestSubItemName?: string | null;
  cTestSubItemUnit?: string | null;
  cTestItemDlDx?: string | null;
  nValueMin?: number | null;
  cInterval?: EqualsFlag;
  nValueMax?: number | null;
  cTargetValue?: string | null;
  nMinValueNk?: number | null;
  nMaxValueNk?: number | null;
  nValueIntervalNk?: EqualsFlag;
  cRemark?: string | null;
  cIsJudge?: YesNo;
  cIsPrint?: YesNo;
  cNeedTest?: YesNo;
  nItemAccuracy?: number | null;
  cFormula?: string | null;
  cDisplayText?: string | null;
  cSamplePosDesc?: string | null;
  cTestDirectDesc?: string | null;
  cTestPurposeDesc?: string | null;
  cIdxNo?: string | null;
  cCtrlMode?: CtrlMode;
}
export interface Tql4100History {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  cTestNo?: string | null;
  cTql4000Id?: string | null;
  cSampleNo?: string | null;
  cTestItemType?: string | null;
  cTestItemTypeDesc?: string | null;
  cTestItem?: string | null;
  cTestItemName?: string | null;
  cTestSubItem?: string | null;
  cTestSubItemName?: string | null;
  cValue?: string | null;
  cIp?: string | null;
}
export interface TqlCfCollect {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nStatus?: number | null;
  cStove?: string | null;
  cSgCode?: string | null;
  cSgStd?: string | null;
  cStaCode?: string | null;
  cSampNo?: string | null;
  cMeltingNo?: string | null;
  cCheckTime?: string | null;
  cShift?: string | null;
  cGroup?: string | null;
  c?: number | null;
  si?: number | null;
  mn?: number | null;
  p?: number | null;
  s?: number | null;
  cr?: number | null;
  ni?: number | null;
  mo?: number | null;
  cu?: number | null;
  al?: number | null;
  ti?: number | null;
  nb?: number | null;
  v?: number | null;
  als?: number | null;
  ca?: number | null;
  ceq?: number | null;
  b?: number | null;
  alins?: number | null;
  w?: number | null;
  as?: number | null;
  sn?: number | null;
  co?: number | null;
  pb?: number | null;
  sb?: number | null;
  ta?: number | null;
  zr?: number | null;
  bi?: number | null;
  se?: number | null;
  te?: number | null;
  ce?: number | null;
  la?: number | null;
  n?: number | null;
  cRemark?: string | null;
}
export interface TqlImpactCollect {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nOrder?: number | null;
  cSampleNo?: string | null;
  cLength?: string | null;
  cWidth?: string | null;
  cThickness?: string | null;
  cRemark?: string | null;
  nStatus?: number | null;
  cNotchDepth?: string | null;
  cEnergy1?: string | null;
  cEnergy2?: string | null;
  cEnergy3?: string | null;
  cAveEnergy?: string | null;
  cSendDevice?: string | null;
}
export interface TqlLxCollect {
  selected?: boolean;
  id?: string | null;
  creator?: string | null;
  createTime?: string | null;
  lastModifier?: string | null;
  lastModifyTime?: string | null;
  nOrder?: number | null;
  cTestNo?: string | null;
  cTestItem?: string | null;
  cItemTable?: string | null;
  cSampleNo?: string | null;
  cOperatorName?: string | null;
  nCurOrder?: number | null;
  nTestCount?: number | null;
  nMaxLoad?: number | null;
  nMaxDistort?: number | null;
  nMaxStrength?: number | null;
  nYieLdUpLoad?: number | null;
  nYieLdUpStrength?: number | null;
  nYieLdLoad?: number | null;
  nYieLdStrength?: number | null;
  nFpLoad?: number | null;
  nFpStrength?: number | null;
  nFtLoad?: number | null;
  nFtStrength?: number | null;
  nFinalLength?: number | null;
  nFinalRate?: number | null;
  nFinalShrink?: number | null;
  nFinalDia?: number | null;
  nFinalWidth?: number | null;
  nFinalThick?: number | null;
  nFinalBorder?: number | null;
  nElasticity?: number | null;
  nDuration?: number | null;
  nMaxSpeed?: number | null;
  nTemperature?: number | null;
  nHumidity?: number | null;
  cTestTime?: string | null;
  nFinalPosition?: number | null;
  cFinalState?: string | null;
  cBendResult?: string | null;
  nMotherLength?: number | null;
  nMotherWeight?: number | null;
  nOrgGaugeLength?: number | null;
  nExtGaugeLength?: number | null;
  nDia?: number | null;
  nSpan?: number | null;
  nLength?: number | null;
  nWidth?: number | null;
  nThickness?: number | null;
  nBorder?: number | null;
  nOutDia?: number | null;
  nInnerDia?: number | null;
  nArea?: number | null;
  cEquipCode?: string | null;
  nMeasureRange?: number | null;
  cIdentifier?: string | null;
  cCategory?: string | null;
  nIsFinished?: number | null;
  cTestId?: string | null;
  cSaveFileName?: string | null;
  cCtrlMode?: string | null;
  nDistanceBeforeTest?: number | null;
  nDistanceAfterTest?: number | null;
  nMaxGaugeLength?: number | null;
  nMaxFinalLength?: number | null;
  nWeightLenght1?: number | null;
  nWeightLenght2?: number | null;
  nWeightLenght3?: number | null;
  nWeightLenght4?: number | null;
  nWeightLenght5?: number | null;
  nTotalWeight?: number | null;
  nDiameter1?: number | null;
  nDiameter2?: number | null;
  nDiameter3?: number | null;
  nDiameter4?: number | null;
  nDiameter5?: number | null;
  cSampleInfo1?: string | null;
  cSampleInfo2?: string | null;
  cSampleInfo3?: string | null;
  cSampleInfo4?: string | null;
  cSampleInfo5?: string | null;
  cSampleInfo6?: string | null;
  cSampleInfo7?: string | null;
  cSampleInfo8?: string | null;
  cSampleInfo9?: string | null;
  cSampleInfo10?: string | null;
  cCurvePicture?: string | null;
  cRemark?: string | null;
  nStatus?: number | null;
  cSendDevice?: string | null;
}

/* ---------- 请求 ---------- */



export const qL3000Api = {
  queryTestJob(data?: QueryTestJobInput) {
    return requestClient.request<TestJob[]>(
      "/dDH.Service.LIMS.Services/qL3000/queryTestJob",
      {
        method: "post",
        data,
      },
    );
  },
};

export const qL3100Api = {
  queryTestJob(data?: QueryTestJobInput) {
    return requestClient.request<TestJob[]>(
      "/dDH.Service.LIMS.Services/qL3100/queryTestJob",
      {
        method: "post",
        data,
      },
    );
  },
  complete(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/qL3100/complete",
      {
        method: "post",
        data,
      },
    );
  },
};

export const qL3200Api = {
  queryTestSamplesBySampleRequires(data?: SampleRequires) {
    return requestClient.request<TestSample[]>(
      "/dDH.Service.LIMS.Services/qL3200/queryTestSamplesBySampleRequires",
      {
        method: "post",
        data,
      },
    );
  },
  check(status?: TestJobCheckStatus, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/qL3200/check",
      {
        method: "post",
        params: { status },
        data,
      },
    );
  },
  passMulti(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/qL3200/passMulti",
      {
        method: "post",
        data,
      },
    );
  },
  revertCheck(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/qL3200/revertCheck",
      {
        method: "post",
        data,
      },
    );
  },
};

export const stoveChemicalCompositionTestApi = {
  addStoveChemicalCompositionTestJob(data?: AddStoveChemTestInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/addStoveChemicalCompositionTestJob",
      {
        method: "post",
        data,
      },
    );
  },
  deleteStoveChemicalCompositionTestJob(stoveNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/deleteStoveChemicalCompositionTestJob",
      {
        method: "post",
        params: { stoveNo },
      },
    );
  },
  addStoveChemicalCompositionSample(data?: AddStoveChemSampleInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/addStoveChemicalCompositionSample",
      {
        method: "post",
        data,
      },
    );
  },
  saveStoveChemicalCompositionTestResult(data?: StoveChemicalCompositionResult[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/saveStoveChemicalCompositionTestResult",
      {
        method: "post",
        data,
      },
    );
  },
  addONHSample(stove?: string, data?: ChemItemInfo[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/addONHSample",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  setFinalSample(sampleId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/setFinalSample",
      {
        method: "post",
        params: { sampleId },
      },
    );
  },
  queryStoveSamples(data?: QueryStoveChemicalCompositionInput) {
    return requestClient.request<StoveInfo[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryStoveSamples",
      {
        method: "post",
        data,
      },
    );
  },
  getSamplesItems(sampleId?: string) {
    return requestClient.request<StoveSampleTestItem[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/getSamplesItems",
      {
        method: "post",
        params: { sampleId },
      },
    );
  },
  getStoveTestStds(stove?: string, data?: QueryCFStdInput) {
    return requestClient.request<StoveSampleTestItem[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/getStoveTestStds",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  addSample(data?: StoveTestSample) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/addSample",
      {
        method: "post",
        data,
      },
    );
  },
  deleteSample(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/deleteSample",
      {
        method: "post",
        params: { id },
      },
    );
  },
  saveItemResult(data?: StoveTestSample) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/saveItemResult",
      {
        method: "post",
        data,
      },
    );
  },
  stoveConfirm(data?: StoveInfo) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/stoveConfirm",
      {
        method: "post",
        data,
      },
    );
  },
  stoveAutoJudge(stoveNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/stoveAutoJudge",
      {
        method: "post",
        params: { stoveNo },
      },
    );
  },
  unqualified(stoveNo?: string, remark?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/unqualified",
      {
        method: "post",
        params: { stoveNo, remark },
      },
    );
  },
  release(data?: Tql2000) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/release",
      {
        method: "post",
        data,
      },
    );
  },
  waste(data?: StoveInfo) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/waste",
      {
        method: "post",
        data,
      },
    );
  },
  queryFinalOrDisableSamples(stove?: string, data?: QueryCFStdInput) {
    return requestClient.request<StoveTestSample[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryFinalOrDisableSamples",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  queryFinalSample(stove?: string, data?: QueryCFStdInput) {
    return requestClient.request<StoveTestSample>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryFinalSample",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  queryOrignStoveChem(stove?: string) {
    return requestClient.request<StoveInfo>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryOrignStoveChem",
      {
        method: "post",
        params: { stove },
      },
    );
  },
  queryStoveChemInfo(data?: QueryStoveChemInfoInput) {
    return requestClient.request<StoveChemInfo[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryStoveChemInfo",
      {
        method: "post",
        data,
      },
    );
  },
  recheck(data?: StoveTestSample) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/recheck",
      {
        method: "post",
        data,
      },
    );
  },
  queryAllSamples(stove?: string, data?: QueryCFStdInput) {
    return requestClient.request<StoveTestSample[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/queryAllSamples",
      {
        method: "post",
        params: { stove },
        data,
      },
    );
  },
  getStoveTestSample(stoveNo?: string) {
    return requestClient.request<StoveTestSample[]>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/getStoveTestSample",
      {
        method: "post",
        params: { stoveNo },
      },
    );
  },
  syncStoveCf(data?: AddStoveChemTestInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/stoveChemicalCompositionTest/syncStoveCf",
      {
        method: "post",
        data,
      },
    );
  },
};

export const testJobApi = {
  addTestJob(data?: AddTestJobInput) {
    return requestClient.request<string>(
      "/dDH.Service.LIMS.Services/testJob/addTestJob",
      {
        method: "post",
        data,
      },
    );
  },
  changeBatchNo(data?: ChangeTestJobBatchNoInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/changeBatchNo",
      {
        method: "post",
        data,
      },
    );
  },
  deleteTestJob(testNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/deleteTestJob",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  remark(remark?: string, data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/remark",
      {
        method: "post",
        params: { remark },
        data,
      },
    );
  },
  querySampleRequires(tql3100Id?: string, needSendLab?: boolean) {
    return requestClient.request<SampleRequires[]>(
      "/dDH.Service.LIMS.Services/testJob/querySampleRequires",
      {
        method: "post",
        params: { tql3100Id, needSendLab },
      },
    );
  },
  query3200s(testNo?: string) {
    return requestClient.request<Tql3200[]>(
      "/dDH.Service.LIMS.Services/testJob/query3200s",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  jiaJi(tql3100Id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/jiaJi",
      {
        method: "post",
        params: { tql3100Id },
      },
    );
  },
  saveSampleRequires(data?: SampleRequires[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/saveSampleRequires",
      {
        method: "post",
        data,
      },
    );
  },
  addSampleRequires(data?: SampleRequires) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/addSampleRequires",
      {
        method: "post",
        data,
      },
    );
  },
  deleteSampleRequires(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/deleteSampleRequires",
      {
        method: "post",
        params: { id },
      },
    );
  },
  sendTestJob(id?: string, data?: SampleRequires[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/sendTestJob",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
  sendTestJobJiaJi(id?: string, data?: SampleRequires[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/sendTestJobJiaJi",
      {
        method: "post",
        params: { id },
        data,
      },
    );
  },
  cancelSendTestJob(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/cancelSendTestJob",
      {
        method: "post",
        params: { id },
      },
    );
  },
  receive(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/receive",
      {
        method: "post",
        data,
      },
    );
  },
  print(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/print",
      {
        method: "post",
        data,
      },
    );
  },
  reversePrint(id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/reversePrint",
      {
        method: "post",
        params: { id },
      },
    );
  },
  cancelReceive(tql3100Id?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/cancelReceive",
      {
        method: "post",
        params: { tql3100Id },
      },
    );
  },
  queryTestJob(data?: QueryTestJobInput) {
    return requestClient.request<TestJob[]>(
      "/dDH.Service.LIMS.Services/testJob/queryTestJob",
      {
        method: "post",
        data,
      },
    );
  },
  queryTestSample(tql3100Id?: string, testItemType?: string, data?: string[]) {
    return requestClient.request<TestSample[]>(
      "/dDH.Service.LIMS.Services/testJob/queryTestSample",
      {
        method: "post",
        params: { tql3100Id, testItemType },
        data,
      },
    );
  },
  queryTestStds(testNo?: string) {
    return requestClient.request<Tql3200[]>(
      "/dDH.Service.LIMS.Services/testJob/queryTestStds",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  saveSample(data?: TestSample) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/saveSample",
      {
        method: "post",
        data,
      },
    );
  },
  saveSamples(data?: TestSample[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/saveSamples",
      {
        method: "post",
        data,
      },
    );
  },
  completeItem(data?: CompleteItemInput) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/completeItem",
      {
        method: "post",
        data,
      },
    );
  },
  queryHistory(testNo?: string) {
    return requestClient.request<Tql4100History[]>(
      "/dDH.Service.LIMS.Services/testJob/queryHistory",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  hasTestNo(data?: string[]) {
    return requestClient.request<boolean>(
      "/dDH.Service.LIMS.Services/testJob/hasTestNo",
      {
        method: "post",
        data,
      },
    );
  },
  queryAllSamples(testNo?: string) {
    return requestClient.request<TestSample[]>(
      "/dDH.Service.LIMS.Services/testJob/queryAllSamples",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  querySamplesByTestNo(testNo?: string) {
    return requestClient.request<TestSample[]>(
      "/dDH.Service.LIMS.Services/testJob/querySamplesByTestNo",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  queryTestJobMainForJudge(data?: QueryTestJobInput) {
    return requestClient.request<TestJob[]>(
      "/dDH.Service.LIMS.Services/testJob/queryTestJobMainForJudge",
      {
        method: "post",
        data,
      },
    );
  },
  checkComplexDecide(testNo?: string) {
    return requestClient.request<boolean>(
      "/dDH.Service.LIMS.Services/testJob/checkComplexDecide",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  changeJudgeResult(tql3000Id?: string, remark?: string, data?: TestJobJudgeResult) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/changeJudgeResult",
      {
        method: "post",
        params: { tql3000Id, remark },
        data,
      },
    );
  },
  queryRecheckSampleRequires(testNo?: string) {
    return requestClient.request<SampleRequires[]>(
      "/dDH.Service.LIMS.Services/testJob/queryRecheckSampleRequires",
      {
        method: "post",
        params: { testNo },
      },
    );
  },
  labRecheck(testNo?: string, data?: SampleRequires[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/labRecheck",
      {
        method: "post",
        params: { testNo },
        data,
      },
    );
  },
  qMRecheck(data?: TestSample[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/testJob/qMRecheck",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tql2001Api = {
  queryStoveInfo(data?: QueryStoveChemicalCompositionInput) {
    return requestClient.request<Tql2000[]>(
      "/dDH.Service.LIMS.Services/tql2001/queryStoveInfo",
      {
        method: "post",
        data,
      },
    );
  },
  queryStoveData(stove?: string) {
    return requestClient.request<Tql2001[]>(
      "/dDH.Service.LIMS.Services/tql2001/queryStoveData",
      {
        method: "post",
        params: { stove },
      },
    );
  },
  aPPQueryStoveData(stove?: string) {
    return requestClient.request<Tql2001[]>(
      "/dDH.Service.LIMS.Services/tql2001/aPPQueryStoveData",
      {
        method: "post",
        params: { stove },
      },
    );
  },
  queryLastSampleId(stove?: string) {
    return requestClient.request<StoveSampleTestItem[]>(
      "/dDH.Service.LIMS.Services/tql2001/queryLastSampleId",
      {
        method: "post",
        params: { stove },
      },
    );
  },
};

export const tqlCFCollectApi = {
  consumeMsg(jsonMsg?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlCFCollect/consumeMsg",
      {
        method: "post",
        params: { jsonMsg },
      },
    );
  },
  tqlCfCollectHandle(data?: TqlCfCollect) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlCFCollect/tqlCfCollectHandle",
      {
        method: "post",
        data,
      },
    );
  },
  getUnHandleCfqlCollect() {
    return requestClient.request<TqlCfCollect[]>(
      "/dDH.Service.LIMS.Services/tqlCFCollect/getUnHandleCfqlCollect",
      {
        method: "post",
      },
    );
  },
  queryTqlCfCollects(data?: QueryTqlCFCollectDto) {
    return requestClient.request<TqlCfCollect[]>(
      "/dDH.Service.LIMS.Services/tqlCFCollect/queryTqlCfCollects",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tqlLXCollectApi = {
  consumeMsg(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/consumeMsg",
      {
        method: "post",
        data,
      },
    );
  },
  tqlLxCollectHandle(data?: TqlLxCollect) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/tqlLxCollectHandle",
      {
        method: "post",
        data,
      },
    );
  },
  getUnHandleLxTqlCollect() {
    return requestClient.request<TqlLxCollect[]>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/getUnHandleLxTqlCollect",
      {
        method: "post",
      },
    );
  },
  queryTqlLxCollects(data?: QueryTqlLXCollectDto) {
    return requestClient.request<TqlLxCollect[]>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/queryTqlLxCollects",
      {
        method: "post",
        data,
      },
    );
  },
  saveLxMsg(josnMsg?: string, msgId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/saveLxMsg",
      {
        method: "post",
        params: { josnMsg, msgId },
      },
    );
  },
  saveImpactMsg(josnMsg?: string, msgId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/saveImpactMsg",
      {
        method: "post",
        params: { josnMsg, msgId },
      },
    );
  },
  saveUnresolvedMsg(josnMsg?: string, msgId?: string) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/saveUnresolvedMsg",
      {
        method: "post",
        params: { josnMsg, msgId },
      },
    );
  },
  queryTqlImpactCollects(data?: QueryTqlLXCollectDto) {
    return requestClient.request<TqlImpactCollect[]>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/queryTqlImpactCollects",
      {
        method: "post",
        data,
      },
    );
  },
  tqlImpactCollectHandle(data?: TqlImpactCollect) {
    return requestClient.request<any>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/tqlImpactCollectHandle",
      {
        method: "post",
        data,
      },
    );
  },
  getUnHandleImpactTqlCollect() {
    return requestClient.request<TqlImpactCollect[]>(
      "/dDH.Service.LIMS.Services/tqlLXCollect/getUnHandleImpactTqlCollect",
      {
        method: "post",
      },
    );
  },
};
