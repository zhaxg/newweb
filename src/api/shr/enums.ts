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
