import type {
  CtrlMode,
  EqualsFlag,
  SampleJudgeResult,
  StoveChemResult,
  TestJobCheckStatus,
  TestJobJudgeResult,
  TestJobStatus,
  TqlCFCollectNstatus,
  YesNo,
} from "./enums";

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
