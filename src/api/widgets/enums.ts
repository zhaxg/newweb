export enum DataItemType {
  SUM = 0,
  AVG = 1,
  MAX = 2,
  MIN = 3,
}
export enum DataStatusEnum {
  Add = 0,
  Update = 1,
  Delete = 2,
}
export enum EqualsFlag {
  Default = 1,
  LeftOpen = 2,
  RightOpen = 4,
  Open = 6,
}
export enum FormulaStatusEnum {
  Normal = 0,
  Error = 1,
}
export enum RbacRescType {
  /** 菜单 */
  Menu = 2,
  /** 界面元素 */
  Widget = 4,
  /** 后台服务（动作） */
  Action = 8,
  /** 数据项 */
  DataItem = 16,
  /** 数据列 */
  DataColumn = 32,
}
export enum ReportShiftType {
  None = 0,
  Shift = 3,
}
export enum ReportStyle {
  H = 0,
  V = 1,
}
export enum ReportTimeType {
  Day = 0,
  Month = 1,
  Year = 3,
}
export enum TemplateType {
  SnapControl = 1,
  XtraReport = 2,
}
export enum TransferStatus {
  Pending = 0,
  TransSuccess = 1,
  TransFailed = 2,
  CommitDone = 3,
}
export enum UserType {
  /** 普通用户 */
  Nomral = 0,
  /** 普通管理员 */
  Admin = 7,
  /** 超级管理员 */
  Root = 9,
}
