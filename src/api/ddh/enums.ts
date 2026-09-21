export enum EqualsFlag {
  Default = 1,
  LeftOpen = 2,
  RightOpen = 4,
  Open = 6,
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
export enum TransferStatus {
  Pending = 0,
  TransSuccess = 1,
  TransFailed = 2,
  CommitDone = 3,
}
export enum YesNo {
  N = 0,
  Y = 1,
}
