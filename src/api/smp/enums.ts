export enum CastDivEnum {
  L = 0,
  M = 1,
  O = 2,
}
export enum EqualsFlag {
  Default = 1,
  LeftOpen = 2,
  RightOpen = 4,
  Open = 6,
}
export enum FhCompareFalgEnum {
  Succeed = 0,
  Fail = 1,
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
export enum JcStatusEnum {
  NoJc = 0,
  NoDown = 10,
  DownLg = 30,
}
export enum LengthTypeEnum {
  F = 0,
  D = 1,
}
export enum LgPlanStatusEnum {
  NoPlan = 0,
  YesPlan = 20,
}
export enum LgProdStatusEnum {
  NoPlan = 0,
  Finish = 20,
}
export enum OrderFlagEnum {
  XS = 0,
  YL = 1,
  BC = 2,
  LT = 3,
}
export enum OrderProcEnum {
  NoDone = 0,
  Doing = 1,
  Success = 8,
  Fail = -1,
}
export enum OrderReviewEnum {
  NoReview = 0,
  YesReview = 10,
}
export enum OrderStatusEnum {
  WaitPlan = 0,
  FinshPlan = 10,
  ProductClose = 30,
  ReturnSale = 40,
  CloseCase = 50,
  Complete = 60,
  CF = -1,
}
export enum OrderTlEnum {
  NoTl = 0,
  YesTl = 10,
  Checked = 20,
}
export enum SwlxEnum {
  XSCK = 80,
  XSTH = 89,
}
export enum Thr3010HlStatusEnum {
  EnterFur = 10,
  ExitFur = 20,
}
export enum WeighStausEnum {
  Not = 1,
  Ready = 2,
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
export enum ZcStatusEnum {
  Ready = 0,
  Ok = 1,
  DownWeigh = 2,
  Finish = 3,
  Invalid = 98,
  Out = 99,
}
