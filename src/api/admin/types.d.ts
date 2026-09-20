import type {
  CaptchaType,
  HmxJobMisfiredEnums,
  NotificationTargetType,
  RbacRescType,
  UserType,
  YesNo,
} from "./enums";

export interface CaptchaInfo {
  challengeString?: string;
  signature?: string;
  captchaType: CaptchaType;
}
export interface FetchTokenInput {
  userId?: string;
  password?: string;
  captchaType: CaptchaType;
  captchaCode?: string;
  captchaSignature?: string;
}
export interface GenerateInput {
  databaseKey?: string;
  nameSpace?: string;
  tableName?: string;
  tplGruop?: string;
}
export interface GenerateOutput {
  fileName?: string;
  content?: string;
}
export interface GetUserResourceListInput {
  groupId?: string;
  rescType: RbacRescType;
}
export interface HmxBackgroudJobInfo {
  id?: string;
  cName?: string;
  cTrigerName?: string;
  cSetupTime: string;
  cCronExp?: string;
  nIntervalMinutes: number;
  nRepetCount: number;
  nDelayMinutes: number;
  cNextTime: string;
  cLastTime: string;
  cLastMessage?: string;
  cScheduler?: string;
  cAssemblyQualifiedName?: string;
  enable: YesNo;
  enablePaiallel: YesNo;
  cFlagMisfired: HmxJobMisfiredEnums;
}
export interface HmxBackgroundJobTypeInfo {
  assemblyQualifiedName?: string;
  description?: string;
}
export interface HmxDept {
  selected: boolean;
  id?: string;
  cDeptPid?: string;
  cDeptName?: string;
  cDeptDesc?: string;
  cCompany?: string;
  cClassify?: string;
  cSw01?: string;
  cSw02?: string;
  cSw03?: string;
  cSw04?: string;
  cSw05?: string;
}
export interface HmxKv {
  selected: boolean;
  id?: string;
  cCode?: string;
  cDesc?: string;
  cEnable?: string;
  cGroup?: string;
  cName?: string;
  cOrder?: string;
  cPid?: string;
  cSw01?: string;
  cSw02?: string;
  cSw03?: string;
  cSw04?: string;
  cSw05?: string;
  cValue?: string;
}
export interface HmxNotify {
  selected: boolean;
  id?: string;
  cContent?: string;
  creator?: string;
  cExpiredTime: string;
  lastModifier?: string;
  cTargetList?: string;
  cTargetType: number;
  cTargetUserList?: string;
  cTitle?: string;
  createTime?: string;
  lastModifyTime?: string;
}
export interface HmxRes {
  selected: boolean;
  id?: string;
  cCode?: string;
  creator?: string;
  cEnable?: string;
  cIcon?: string;
  lastModifier?: string;
  cName?: string;
  cTitle?: string;
  cNsCode?: string;
  cOrder?: string;
  cPid?: string;
  cQueryString?: string;
  cResPath?: string;
  cResSubPath?: string;
  cResType: RbacRescType;
  createTime?: string;
  lastModifyTime?: string;
  rowVersion: number;
}
export interface HmxRole {
  selected: boolean;
  id?: string;
  creator?: string;
  cDescription?: string;
  lastModifier?: string;
  cRoleName?: string;
  cState?: string;
  createTime?: string;
  lastModifyTime?: string;
}
export interface HmxRolePermission {
  selected: boolean;
  id?: string;
  cNsCode?: string;
  cRescId?: string;
  cRescType: RbacRescType;
  cRoleId?: string;
}
export interface HmxSchedulerStatusInfo {
  enable: boolean;
  schedulerName?: string;
  lastUpdateTime: string;
}
export interface HmxUser {
  selected: boolean;
  id?: string;
  creator?: string;
  cDepartment?: string;
  cEducation?: string;
  cEmail?: string;
  cIdCardNo?: string;
  lastModifier?: string;
  cMaster?: string;
  cNation?: string;
  cNativePlace?: string;
  cPassword?: string;
  cPhone?: string;
  cPoliticsStatus?: string;
  cPosition?: string;
  cPost?: string;
  cSbcard?: string;
  cSex?: string;
  cStatus?: string;
  cTimestamp: string;
  cUserName?: string;
  cUserType: UserType;
  createTime?: string;
  lastModifyTime?: string;
}
export interface HmxUserRole {
  selected: boolean;
  id?: string;
  cRoleid?: string;
  cUserid?: string;
}
export interface HmxUserSession {
  userId?: string;
  userName?: string;
  token?: string;
  isAuthenticated: boolean;
  userType: UserType;
  roles: string[];
}
export interface KvEditInput {
  classA?: string;
  classB?: string;
  classC?: string;
  code?: string;
  name?: string;
  useClassfy: boolean;
  filedItems?: KvFiledItem[];
}
export interface KvFiledItem {
  filedName?: string;
  caption?: string;
  visible: boolean;
  maskType: number;
  editMask?: string;
}
export interface ResetButtonRoleDto {
  buttons?: HmxRes[];
  roles?: HmxRole[];
  permissions?: HmxRolePermission[];
}
export interface RestrictDataResouce {
  resouceId?: string;
  resouceCode?: string;
  resouceName?: string;
  keyColumn?: string;
  nameColumn?: string;
}
export interface RestrictDataResource {
  tableName?: string;
  description?: string;
  columns?: RestrictDataResourceItem[];
}
export interface RestrictDataResourceItem {
  columnName?: string;
  description?: string;
}
export interface RoleEditRescInput {
  roleId?: string;
  groupId?: string;
  rescIds?: string[];
}
export interface RoleEditRescTreeItem {
  id?: string;
  isChecked: boolean;
  hasChildren: boolean;
  expanded: boolean;
  text?: string;
  icon?: string;
  parentID?: string;
  isMenu: boolean;
}
export interface RolePermissionInput {
  roleId?: string;
  groupId?: string;
}
export interface RolePermissionOfRestrictDataItem {
  selected: boolean;
  code?: string;
  name?: string;
}
export interface RolePermissionOfViewAndWidgets {
  selected: boolean;
  id?: string;
  cpId?: string;
  cCode?: string;
  cName?: string;
  cType: RbacRescType;
  cIcon?: string;
}
export interface RoleUserDto {
  userId?: string;
  userName?: string;
  marked: boolean;
}
export interface SaveChangesInput {
  dataTypeFullName?: string;
  dataBytesBase64String?: string;
}
export interface SaveChangesInputV2 {
  dataTypeName?: string;
  batchDataBytesBase64String?: string;
  singleDataBytesBase64String?: string;
}
export interface SaveRolePermissionInput {
  roleId?: string;
  groupId?: string;
  permissions?: RolePermissionOfViewAndWidgets[];
}
export interface SendNewNotificationInput {
  userId?: string;
  title?: string;
  targetType: NotificationTargetType;
  targetList?: string;
  content?: string;
  expiredTime: string;
}
export interface SystemSettingInfo {
  reportBaseAddress?: string;
  productVersion?: string;
  dataBaseSignkey?: string;
  serverSignKey?: string;
  productName?: string;
  copyRight?: string;
  customer?: string;
  telephone?: string;
  syncClientTime: boolean;
  imageFolder?: string;
  isDemoModel: boolean;
  allowAdminUseNormalModule: boolean;
  allowNormalUseSystemModule: boolean;
  defaultLogFolder?: string;
  retainLogDays: number;
  checkAutoUpdateInterval: number;
  forceToUseDateBaseServerTime: boolean;
  timeoutOfLogin: number;
  allowShowTopBanner: boolean;
  enableCustomSkins: boolean;
  enableNotifications: boolean;
  allowAddUserWithSystemManager: boolean;
}
export interface UpdateUserRoleListInput {
  userId?: string;
  roleIds?: string[];
}
