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
