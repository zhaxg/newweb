import { requestClient } from "@/api/request";

import type { RbacRescType } from "./enums";
import type {
  CaptchaInfo,
  FetchTokenInput,
  GenerateInput,
  GenerateOutput,
  GetUserResourceListInput,
  HmxBackgroudJobInfo,
  HmxBackgroundJobTypeInfo,
  HmxDept,
  HmxKv,
  HmxNotify,
  HmxRes,
  HmxRole,
  HmxSchedulerStatusInfo,
  HmxUser,
  HmxUserRole,
  HmxUserSession,
  KvEditInput,
  KvFiledItem,
  ResetButtonRoleDto,
  RestrictDataResouce,
  RestrictDataResource,
  RoleEditRescInput,
  RoleEditRescTreeItem,
  RolePermissionInput,
  RolePermissionOfRestrictDataItem,
  RolePermissionOfViewAndWidgets,
  RoleUserDto,
  SaveChangesInput,
  SaveChangesInputV2,
  SaveRolePermissionInput,
  SendNewNotificationInput,
  SystemSettingInfo,
  UpdateUserRoleListInput,
} from "./types";

const API_BASE = "/hmx.Service.Admin.Services";

export const adminApi = {
  getUsers(keywords?: string) {
    return requestClient.request<HmxUser[]>(`${API_BASE}/admin/getUsers`, {
      method: "post",
      params: { keywords },
    });
  },
  addOrEditUser(data: HmxUser) {
    return requestClient.request<any>(`${API_BASE}/admin/addOrEditUser`, {
      method: "post",
      data,
    });
  },
  deleteUser(userid?: string) {
    return requestClient.request<any>(`${API_BASE}/admin/deleteUser`, {
      method: "post",
      params: { userid },
    });
  },
  modifyPassword(userid?: string, oldpasswd?: string, newpasswd?: string) {
    return requestClient.request<any>(`${API_BASE}/admin/modifyPassword`, {
      method: "post",
      params: { userid, oldpasswd, newpasswd },
    });
  },
  resetPassword(userid?: string) {
    return requestClient.request<string>(`${API_BASE}/admin/resetPassword`, {
      method: "post",
      params: { userid },
    });
  },
  getUserRoleList(userId?: string) {
    return requestClient.request<HmxRole[]>(
      `${API_BASE}/admin/getUserRoleList`,
      {
        method: "post",
        params: { userId },
      },
    );
  },
  updateUserRoleList(data: UpdateUserRoleListInput) {
    return requestClient.request<any>(`${API_BASE}/admin/updateUserRoleList`, {
      method: "post",
      data,
    });
  },
  getResourceNamespaceList() {
    return requestClient.request<HmxKv[]>(
      `${API_BASE}/admin/getResourceNamespaceList`,
      {
        method: "post",
      },
    );
  },
  getResources(ns?: string) {
    return requestClient.request<HmxRes[]>(`${API_BASE}/admin/getResources`, {
      method: "post",
      params: { ns },
    });
  },
  getAllResouces(ns?: string, data?: RbacRescType[]) {
    return requestClient.request<HmxRes[]>(`${API_BASE}/admin/getAllResouces`, {
      method: "post",
      params: { ns },
      data,
    });
  },
  getAllUserRoles() {
    return requestClient.request<HmxUserRole[]>(
      `${API_BASE}/admin/getAllUserRoles`,
      {
        method: "post",
      },
    );
  },
  deleteResource(id?: string) {
    return requestClient.request<any>(`${API_BASE}/admin/deleteResource`, {
      method: "post",
      params: { id },
    });
  },
  addOrEditResource(data: HmxRes) {
    return requestClient.request<HmxRes>(
      `${API_BASE}/admin/addOrEditResource`,
      {
        method: "post",
        data,
      },
    );
  },
  queryButtonsResc(parentRescId?: string) {
    return requestClient.request<HmxRes[]>(
      `${API_BASE}/admin/queryButtonsResc`,
      {
        method: "post",
        params: { parentRescId },
      },
    );
  },
  queryUserListForRole(roleid?: string) {
    return requestClient.request<RoleUserDto[]>(
      `${API_BASE}/admin/queryUserListForRole`,
      {
        method: "post",
        params: { roleid },
      },
    );
  },
  saveUserListForRole(roleid?: string, data?: RoleUserDto[]) {
    return requestClient.request<any>(`${API_BASE}/admin/saveUserListForRole`, {
      method: "post",
      params: { roleid },
      data,
    });
  },
  getRoleList(keywords?: string) {
    return requestClient.request<HmxRole[]>(`${API_BASE}/admin/getRoleList`, {
      method: "post",
      params: { keywords },
    });
  },
  checkBeforeRemoveRole(roleId?: string) {
    return requestClient.request<any>(
      `${API_BASE}/admin/checkBeforeRemoveRole`,
      {
        method: "post",
        params: { roleId },
      },
    );
  },
  getRescByRole(roleId?: string, nsResc?: string) {
    return requestClient.request<RoleEditRescTreeItem[]>(
      `${API_BASE}/admin/getRescByRole`,
      {
        method: "post",
        params: { roleId, nsResc },
      },
    );
  },
  updatePermissionByRole(data: RoleEditRescInput) {
    return requestClient.request<any>(
      `${API_BASE}/admin/updatePermissionByRole`,
      {
        method: "post",
        data,
      },
    );
  },
  queryRolePermissionOfViewAndWidgets(data: RolePermissionInput) {
    return requestClient.request<RolePermissionOfViewAndWidgets[]>(
      `${API_BASE}/admin/queryRolePermissionOfViewAndWidgets`,
      {
        method: "post",
        data,
      },
    );
  },
  saveRolePermissionOfViewAndWidgets(data: SaveRolePermissionInput) {
    return requestClient.request<any>(
      `${API_BASE}/admin/saveRolePermissionOfViewAndWidgets`,
      {
        method: "post",
        data,
      },
    );
  },
  addOrEditRole(data: HmxRole) {
    return requestClient.request<any>(`${API_BASE}/admin/addOrEditRole`, {
      method: "post",
      data,
    });
  },
  deleteRole(id?: string) {
    return requestClient.request<any>(`${API_BASE}/admin/deleteRole`, {
      method: "post",
      params: { id },
    });
  },
  getAllKeyvalueLevelone(keywords?: string) {
    return requestClient.request<HmxKv[]>(
      `${API_BASE}/admin/getAllKeyvalueLevelone`,
      {
        method: "post",
        params: { keywords },
      },
    );
  },
  getAllKeyvalueItems(parentId?: string) {
    return requestClient.request<HmxKv[]>(
      `${API_BASE}/admin/getAllKeyvalueItems`,
      {
        method: "post",
        params: { parentId },
      },
    );
  },
  addOrEditKeyValue(data: HmxKv) {
    return requestClient.request<HmxKv>(`${API_BASE}/admin/addOrEditKeyValue`, {
      method: "post",
      data,
    });
  },
  deleteKeyValue(id?: string) {
    return requestClient.request<any>(`${API_BASE}/admin/deleteKeyValue`, {
      method: "post",
      params: { id },
    });
  },
  queryButtons(resourceId?: string) {
    return requestClient.request<ResetButtonRoleDto>(
      `${API_BASE}/admin/queryButtons`,
      {
        method: "post",
        params: { resourceId },
      },
    );
  },
  setButtonRoles(data: ResetButtonRoleDto) {
    return requestClient.request<any>(`${API_BASE}/admin/setButtonRoles`, {
      method: "post",
      data,
    });
  },
};

export const authApi = {
  token(data: FetchTokenInput) {
    return requestClient.request<string>(`${API_BASE}/auth/token`, {
      method: "post",
      data,
    });
  },
  logout(token?: string) {
    // 服务端 SmartFindToken 支持 query token；显式传入避免清会话后拦截器取不到 Authorization
    return requestClient.request<any>(`${API_BASE}/auth/logout`, {
      method: "post",
      params: { token },
    });
  },
  hasPermission(token?: string, resourceKey?: string) {
    return requestClient.request<boolean>(`${API_BASE}/auth/hasPermission`, {
      method: "post",
      params: { token, resourceKey },
    });
  },
  getUserInfo(token?: string) {
    return requestClient.request<HmxUserSession>(
      `${API_BASE}/auth/getUserInfo`,
      {
        method: "post",
        params: { token },
      },
    );
  },
  getUserRescList(data: GetUserResourceListInput) {
    return requestClient.request<HmxRes[]>(`${API_BASE}/auth/getUserRescList`, {
      method: "post",
      data,
    });
  },
  getCaptchaImage() {
    return requestClient.request<CaptchaInfo>(
      `${API_BASE}/auth/getCaptchaImage`,
      {
        method: "post",
      },
    );
  },
  getCaptchaChallenge() {
    return requestClient.request<CaptchaInfo>(
      `${API_BASE}/auth/getCaptchaChallenge`,
      {
        method: "post",
      },
    );
  },
};

export const codeGenApi = {
  generatedCode(data: GenerateInput) {
    return requestClient.request<GenerateOutput[]>(
      `${API_BASE}/codeGen/generatedCode`,
      {
        method: "post",
        data,
      },
    );
  },
  generateVueFiles(swaggerJsonUri?: string) {
    return requestClient.request<GenerateOutput[]>(
      `${API_BASE}/codeGen/generateVueFiles`,
      {
        method: "post",
        params: { swaggerJsonUri },
      },
    );
  },
};

export const crudApi = {
  saveChanges(data: SaveChangesInput) {
    return requestClient.request<string>(`${API_BASE}/crud/saveChanges`, {
      method: "post",
      data,
    });
  },
  insertOrUpdate(data: SaveChangesInput) {
    return requestClient.request<string>(`${API_BASE}/crud/insertOrUpdate`, {
      method: "post",
      data,
    });
  },
  saveChangesV2(data: SaveChangesInputV2) {
    return requestClient.request<string>(`${API_BASE}/crud/saveChangesV2`, {
      method: "post",
      data,
    });
  },
};

export const demoApi = {
  getDataBaseTime() {
    return requestClient.request<string>(`${API_BASE}/demo/getDataBaseTime`, {
      method: "post",
    });
  },
};

export const departmentApi = {
  queryAllDepartments() {
    return requestClient.request<HmxDept[]>(
      `${API_BASE}/department/queryAllDepartments`,
      {
        method: "post",
      },
    );
  },
  save(data: HmxDept) {
    return requestClient.request<any>(`${API_BASE}/department/save`, {
      method: "post",
      data,
    });
  },
  delete(data: HmxDept) {
    return requestClient.request<any>(`${API_BASE}/department/delete`, {
      method: "post",
      data,
    });
  },
};

export const notificationApi = {
  queryMyRecv(userId?: string) {
    return requestClient.request<HmxNotify[]>(
      `${API_BASE}/notification/queryMyRecv`,
      {
        method: "post",
        params: { userId },
      },
    );
  },
  queryMyLastestRecv(userId?: string) {
    return requestClient.request<HmxNotify>(
      `${API_BASE}/notification/queryMyLastestRecv`,
      {
        method: "post",
        params: { userId },
      },
    );
  },
  queryMySended(userId?: string) {
    return requestClient.request<HmxNotify[]>(
      `${API_BASE}/notification/queryMySended`,
      {
        method: "post",
        params: { userId },
      },
    );
  },
  updateToReaded(userId?: string, data?: any) {
    return requestClient.request<any>(
      `${API_BASE}/notification/updateToReaded`,
      {
        method: "post",
        params: { userId },
        data,
      },
    );
  },
  sendNewNotification(data: SendNewNotificationInput) {
    return requestClient.request<any>(
      `${API_BASE}/notification/sendNewNotification`,
      {
        method: "post",
        data,
      },
    );
  },
};

export const quartzNetApi = {
  insertOrReplaceBackgroudJob(data: HmxBackgroudJobInfo) {
    return requestClient.request<any>(
      `${API_BASE}/quartzNet/insertOrReplaceBackgroudJob`,
      {
        method: "post",
        data,
      },
    );
  },
  getSchedulerStatus() {
    return requestClient.request<HmxSchedulerStatusInfo>(
      `${API_BASE}/quartzNet/getSchedulerStatus`,
      {
        method: "post",
      },
    );
  },
  manualExcuteJob(data: HmxBackgroudJobInfo) {
    return requestClient.request<any>(`${API_BASE}/quartzNet/manualExcuteJob`, {
      method: "post",
      data,
    });
  },
  queryAllBackgroudJobs() {
    return requestClient.request<HmxBackgroudJobInfo[]>(
      `${API_BASE}/quartzNet/queryAllBackgroudJobs`,
      {
        method: "post",
      },
    );
  },
  removeBackgroudJob(data: HmxBackgroudJobInfo) {
    return requestClient.request<any>(
      `${API_BASE}/quartzNet/removeBackgroudJob`,
      {
        method: "post",
        data,
      },
    );
  },
  startScheduler() {
    return requestClient.request<any>(`${API_BASE}/quartzNet/startScheduler`, {
      method: "post",
    });
  },
  stopScheduler() {
    return requestClient.request<any>(`${API_BASE}/quartzNet/stopScheduler`, {
      method: "post",
    });
  },
  getAvaliableBackgroudJobs() {
    return requestClient.request<HmxBackgroundJobTypeInfo[]>(
      `${API_BASE}/quartzNet/getAvaliableBackgroudJobs`,
      {
        method: "post",
      },
    );
  },
  getNextCronTimes(cronExp?: string, times?: string) {
    return requestClient.request<any>(
      `${API_BASE}/quartzNet/getNextCronTimes`,
      {
        method: "post",
        params: { cronExp, times },
      },
    );
  },
};

export const restrictDataApi = {
  queryRestrictData(roleIds?: string, data?: RestrictDataResouce) {
    return requestClient.request<RolePermissionOfRestrictDataItem[]>(
      `${API_BASE}/restrictData/queryRestrictData`,
      {
        method: "post",
        params: { roleIds },
        data,
      },
    );
  },
  queryDataGroupsNew(keywords?: string) {
    return requestClient.request<RestrictDataResource[]>(
      `${API_BASE}/restrictData/queryDataGroupsNew`,
      {
        method: "post",
        params: { keywords },
      },
    );
  },
  anyAssignedPermissionForResource(resourceId?: string) {
    return requestClient.request<boolean>(
      `${API_BASE}/restrictData/anyAssignedPermissionForResource`,
      {
        method: "post",
        params: { resourceId },
      },
    );
  },
  deleeteAllAssignedPermissionForResource(resourceCode?: string) {
    return requestClient.request<any>(
      `${API_BASE}/restrictData/deleeteAllAssignedPermissionForResource`,
      {
        method: "post",
        params: { resourceCode },
      },
    );
  },
  queryRestrictColumn(entityTypeFullName?: string, data?: any) {
    return requestClient.request<any>(
      `${API_BASE}/restrictData/queryRestrictColumn`,
      {
        method: "post",
        params: { entityTypeFullName },
        data,
      },
    );
  },
  saveRoleRestrictDataItem(
    roleId?: string,
    dataId?: string,
    resourceCode?: string,
    checkedState?: string,
    data?: RbacRescType,
  ) {
    return requestClient.request<any>(
      `${API_BASE}/restrictData/saveRoleRestrictDataItem`,
      {
        method: "post",
        params: { roleId, dataId, resourceCode, checkedState },
        data,
      },
    );
  },
  queryRestrictDataResource() {
    return requestClient.request<RestrictDataResouce[]>(
      `${API_BASE}/restrictData/queryRestrictDataResource`,
      {
        method: "post",
      },
    );
  },
  insertNewRestrictDataResouce(data: RestrictDataResouce) {
    return requestClient.request<any>(
      `${API_BASE}/restrictData/insertNewRestrictDataResouce`,
      {
        method: "post",
        data,
      },
    );
  },
  queryRestrictColumnAssignedCount(resourceId?: string) {
    return requestClient.request<number>(
      `${API_BASE}/restrictData/queryRestrictColumnAssignedCount`,
      {
        method: "post",
        params: { resourceId },
      },
    );
  },
  removeRestrictColumn(resourceId?: string) {
    return requestClient.request<any>(
      `${API_BASE}/restrictData/removeRestrictColumn`,
      {
        method: "post",
        params: { resourceId },
      },
    );
  },
};

export const systemKeyValueApi = {
  getSysKvListByGroup(group?: string) {
    return requestClient.request<HmxKv[]>(
      `${API_BASE}/systemKeyValue/getSysKvListByGroup`,
      {
        method: "post",
        params: { group },
      },
    );
  },
  initializeSysKvList(pcode?: string) {
    return requestClient.request<HmxKv[]>(
      `${API_BASE}/systemKeyValue/initializeSysKvList`,
      {
        method: "post",
        params: { pcode },
      },
    );
  },
  querySysKvList(root?: string, code?: string, name?: string) {
    return requestClient.request<HmxKv[]>(
      `${API_BASE}/systemKeyValue/querySysKvList`,
      {
        method: "post",
        params: { root, code, name },
      },
    );
  },
  querySysKvItemList(parentCode?: string) {
    return requestClient.request<HmxKv[]>(
      `${API_BASE}/systemKeyValue/querySysKvItemList`,
      {
        method: "post",
        params: { parentCode },
      },
    );
  },
  querySystemSettingInfos() {
    return requestClient.request<HmxKv[]>(
      `${API_BASE}/systemKeyValue/querySystemSettingInfos`,
      {
        method: "post",
      },
    );
  },
  querySystemSettingInfosV2() {
    return requestClient.request<SystemSettingInfo>(
      `${API_BASE}/systemKeyValue/querySystemSettingInfosV2`,
      {
        method: "post",
      },
    );
  },
  saveSystemSettingInfosV2(data: SystemSettingInfo) {
    return requestClient.request<any>(
      `${API_BASE}/systemKeyValue/saveSystemSettingInfosV2`,
      {
        method: "post",
        data,
      },
    );
  },
  saveChangesOfSystemSettingInfos(data: HmxKv[]) {
    return requestClient.request<any>(
      `${API_BASE}/systemKeyValue/saveChangesOfSystemSettingInfos`,
      {
        method: "post",
        data,
      },
    );
  },
  prepareNewKvEditInput() {
    return requestClient.request<KvEditInput>(
      `${API_BASE}/systemKeyValue/prepareNewKvEditInput`,
      {
        method: "post",
      },
    );
  },
  insertOrUpdateParentKvItem(data: KvEditInput) {
    return requestClient.request<HmxKv>(
      `${API_BASE}/systemKeyValue/insertOrUpdateParentKvItem`,
      {
        method: "post",
        data,
      },
    );
  },
  insertOrUpdateKvFileds(key?: string, data?: KvFiledItem[]) {
    return requestClient.request<any>(
      `${API_BASE}/systemKeyValue/insertOrUpdateKvFileds`,
      {
        method: "post",
        params: { key },
        data,
      },
    );
  },
  queryKvFileds(key?: string) {
    return requestClient.request<KvFiledItem[]>(
      `${API_BASE}/systemKeyValue/queryKvFileds`,
      {
        method: "post",
        params: { key },
      },
    );
  },
  removeParentKvItem(kvItemId?: string) {
    return requestClient.request<any>(
      `${API_BASE}/systemKeyValue/removeParentKvItem`,
      {
        method: "post",
        params: { kvItemId },
      },
    );
  },
  saveChangesForChildKvItems(data: HmxKv[]) {
    return requestClient.request<any>(
      `${API_BASE}/systemKeyValue/saveChangesForChildKvItems`,
      {
        method: "post",
        data,
      },
    );
  },
};
