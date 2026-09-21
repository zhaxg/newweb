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
