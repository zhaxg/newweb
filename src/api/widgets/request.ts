import { requestClient } from "@/api/_core/request";

import type {
  TemplateType,
} from "./enums";
import type {
  DataItem,
  DataItemResultList,
  HmxRes,
  HmxRole,
  HmxUser,
  LockedItemDto,
  LoginDto,
  PrintReportServiceDTO,
  ReportInput,
  ReportResult,
  ResetButtonRoleDto,
  Tpa1000,
  Tpf1010,
  Tpf1010Report,
  Tpf1010ReportItem,
  TsAppVersion,
  TsPrintTemplate,
  TsTableConfigDto,
  TsTablePro,
  TsTableProVal,
  TsTableProValDto,
  TsTableSettingDto,
  TsiCallLog,
  TsiConfig,
  ZgyCallLogViewDto,
  ZgyInputDto,
} from "./types";

export const calculateApi = {
  queryAllDataSource() {
    return requestClient.request<DataItem[]>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculate/queryAllDataSource",
      {
        method: "post",
      },
    );
  },
  queryTpf1010() {
    return requestClient.request<Tpf1010[]>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculate/queryTpf1010",
      {
        method: "post",
      },
    );
  },
  queryTpf1010ByKeywords(keywords?: string) {
    return requestClient.request<Tpf1010[]>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculate/queryTpf1010ByKeywords",
      {
        method: "post",
        params: { keywords },
      },
    );
  },
  saveTpf1010(data?: Tpf1010) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculate/saveTpf1010",
      {
        method: "post",
        data,
      },
    );
  },
  deleteTpf1010(data?: string[]) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculate/deleteTpf1010",
      {
        method: "post",
        data,
      },
    );
  },
  clearResult(data?: DataItemResultList) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculate/clearResult",
      {
        method: "post",
        data,
      },
    );
  },
  saveResult(data?: DataItemResultList) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculate/saveResult",
      {
        method: "post",
        data,
      },
    );
  },
  execute(begDate?: string, endDate?: string) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculate/execute",
      {
        method: "post",
        params: { begDate, endDate },
      },
    );
  },
};

export const calculateReportApi = {
  saveReport(data?: Tpf1010Report) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculateReport/saveReport",
      {
        method: "post",
        data,
      },
    );
  },
  queryReportData(data?: ReportInput) {
    return requestClient.request<ReportResult[]>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculateReport/queryReportData",
      {
        method: "post",
        data,
      },
    );
  },
  queryReportList(keyWords?: string) {
    return requestClient.request<Tpf1010Report[]>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculateReport/queryReportList",
      {
        method: "post",
        params: { keyWords },
      },
    );
  },
  queryReportItems(reportId?: string) {
    return requestClient.request<Tpf1010[]>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculateReport/queryReportItems",
      {
        method: "post",
        params: { reportId },
      },
    );
  },
  saveReportItems(data?: Tpf1010ReportItem[]) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculateReport/saveReportItems",
      {
        method: "post",
        data,
      },
    );
  },
  deleteReportById(reportId?: string) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services.ICalculateItem/calculateReport/deleteReportById",
      {
        method: "post",
        params: { reportId },
      },
    );
  },
};

export const lockedSequenceApi = {
  addLocked(data?: LockedItemDto) {
    return requestClient.request<boolean>(
      "/hmx.Service.Widgets.Services/lockedSequence/addLocked",
      {
        method: "post",
        data,
      },
    );
  },
  getLockedItem(lockedKey?: string) {
    return requestClient.request<LockedItemDto>(
      "/hmx.Service.Widgets.Services/lockedSequence/getLockedItem",
      {
        method: "post",
        params: { lockedKey },
      },
    );
  },
  releaseLock(id?: string) {
    return requestClient.request<boolean>(
      "/hmx.Service.Widgets.Services/lockedSequence/releaseLock",
      {
        method: "post",
        params: { id },
      },
    );
  },
  saveIfUnLocked(data?: LockedItemDto) {
    return requestClient.request<boolean>(
      "/hmx.Service.Widgets.Services/lockedSequence/saveIfUnLocked",
      {
        method: "post",
        data,
      },
    );
  },
};

export const loginApi = {
  loginApp(account?: string, password?: string) {
    return requestClient.request<LoginDto>(
      "/hmx.Service.Widgets.Services/login/loginApp",
      {
        method: "post",
        params: { account, password },
      },
    );
  },
  getAppVersion(nType?: number) {
    return requestClient.request<TsAppVersion>(
      "/hmx.Service.Widgets.Services/login/getAppVersion",
      {
        method: "post",
        params: { nType },
      },
    );
  },
};

export const printReportApi = {
  queryAllTemplates(data?: TemplateType) {
    return requestClient.request<TsPrintTemplate[]>(
      "/hmx.Service.Widgets.Services/printReport/queryAllTemplates",
      {
        method: "post",
        data,
      },
    );
  },
  readFromTemplate(templateID?: string) {
    return requestClient.request<PrintReportServiceDTO>(
      "/hmx.Service.Widgets.Services/printReport/readFromTemplate",
      {
        method: "post",
        params: { templateID },
      },
    );
  },
  readTemplateDataSourceType(templateID?: string) {
    return requestClient.request<string>(
      "/hmx.Service.Widgets.Services/printReport/readTemplateDataSourceType",
      {
        method: "post",
        params: { templateID },
      },
    );
  },
  saveOrUpdateTemplate(data?: PrintReportServiceDTO) {
    return requestClient.request<string>(
      "/hmx.Service.Widgets.Services/printReport/saveOrUpdateTemplate",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tableConfigApi = {
  effect(id?: string) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/tableConfig/effect",
      {
        method: "post",
        params: { id },
      },
    );
  },
  initConfig(data?: TsTableSettingDto[]) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/tableConfig/initConfig",
      {
        method: "post",
        data,
      },
    );
  },
  queryData(tableCode?: string, data?: string[]) {
    return requestClient.request<TsTableProValDto[]>(
      "/hmx.Service.Widgets.Services/tableConfig/queryData",
      {
        method: "post",
        params: { tableCode },
        data,
      },
    );
  },
  queryAllTableConfig(keyWords?: string) {
    return requestClient.request<TsTableSettingDto[]>(
      "/hmx.Service.Widgets.Services/tableConfig/queryAllTableConfig",
      {
        method: "post",
        params: { keyWords },
      },
    );
  },
  queryTableConfig(tableCode?: string) {
    return requestClient.request<TsTableSettingDto>(
      "/hmx.Service.Widgets.Services/tableConfig/queryTableConfig",
      {
        method: "post",
        params: { tableCode },
      },
    );
  },
  save(data?: TsTableProValDto[]) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/tableConfig/save",
      {
        method: "post",
        data,
      },
    );
  },
  removeAllAndSave(data?: TsTableProVal[]) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/tableConfig/removeAllAndSave",
      {
        method: "post",
        data,
      },
    );
  },
  saveConfig(data?: TsTableConfigDto[]) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/tableConfig/saveConfig",
      {
        method: "post",
        data,
      },
    );
  },
  savePro(data?: TsTablePro[]) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/tableConfig/savePro",
      {
        method: "post",
        data,
      },
    );
  },
};

export const tpa1000Api = {
  queryTpa1000() {
    return requestClient.request<Tpa1000[]>(
      "/hmx.Service.Widgets.Services/tpa1000/queryTpa1000",
      {
        method: "post",
      },
    );
  },
  queryLines() {
    return requestClient.request<Tpa1000[]>(
      "/hmx.Service.Widgets.Services/tpa1000/queryLines",
      {
        method: "post",
      },
    );
  },
  saveTpa1000(data?: Tpa1000) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/tpa1000/saveTpa1000",
      {
        method: "post",
        data,
      },
    );
  },
  deleteTpa1000(id?: string) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/tpa1000/deleteTpa1000",
      {
        method: "post",
        params: { id },
      },
    );
  },
  queryMachine(lineCode?: string) {
    return requestClient.request<Tpa1000[]>(
      "/hmx.Service.Widgets.Services/tpa1000/queryMachine",
      {
        method: "post",
        params: { lineCode },
      },
    );
  },
};

export const userRoleResourceApi = {
  queryAllUsers(data?: string[]) {
    return requestClient.request<HmxUser[]>(
      "/hmx.Service.Widgets.Services/userRoleResource/queryAllUsers",
      {
        method: "post",
        data,
      },
    );
  },
  queryButtons(resourceId?: string) {
    return requestClient.request<ResetButtonRoleDto>(
      "/hmx.Service.Widgets.Services/userRoleResource/queryButtons",
      {
        method: "post",
        params: { resourceId },
      },
    );
  },
  queryResource(keyWord?: string) {
    return requestClient.request<HmxRes[]>(
      "/hmx.Service.Widgets.Services/userRoleResource/queryResource",
      {
        method: "post",
        params: { keyWord },
      },
    );
  },
  qUeryResourceByRole(roleId?: string) {
    return requestClient.request<HmxRes[]>(
      "/hmx.Service.Widgets.Services/userRoleResource/qUeryResourceByRole",
      {
        method: "post",
        params: { roleId },
      },
    );
  },
  queryResourceByUser(userId?: string) {
    return requestClient.request<HmxRes[]>(
      "/hmx.Service.Widgets.Services/userRoleResource/queryResourceByUser",
      {
        method: "post",
        params: { userId },
      },
    );
  },
  queryRole(keyWord?: string) {
    return requestClient.request<HmxRole[]>(
      "/hmx.Service.Widgets.Services/userRoleResource/queryRole",
      {
        method: "post",
        params: { keyWord },
      },
    );
  },
  queryRoleByResource(resourceId?: string) {
    return requestClient.request<HmxRole[]>(
      "/hmx.Service.Widgets.Services/userRoleResource/queryRoleByResource",
      {
        method: "post",
        params: { resourceId },
      },
    );
  },
  queryRoleByUser(userId?: string) {
    return requestClient.request<HmxRole[]>(
      "/hmx.Service.Widgets.Services/userRoleResource/queryRoleByUser",
      {
        method: "post",
        params: { userId },
      },
    );
  },
  queryUser(keyWord?: string) {
    return requestClient.request<HmxUser[]>(
      "/hmx.Service.Widgets.Services/userRoleResource/queryUser",
      {
        method: "post",
        params: { keyWord },
      },
    );
  },
  queryUserByRole(roleId?: string) {
    return requestClient.request<HmxUser[]>(
      "/hmx.Service.Widgets.Services/userRoleResource/queryUserByRole",
      {
        method: "post",
        params: { roleId },
      },
    );
  },
  setButtonRoles(data?: ResetButtonRoleDto) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/userRoleResource/setButtonRoles",
      {
        method: "post",
        data,
      },
    );
  },
};

export const zgyCallLogApi = {
  checkInterfaceStatus(data?: TsiConfig) {
    return requestClient.request<string>(
      "/hmx.Service.Widgets.Services/zgyCallLog/checkInterfaceStatus",
      {
        method: "post",
        data,
      },
    );
  },
  getById(data?: ZgyCallLogViewDto) {
    return requestClient.request<TsiCallLog>(
      "/hmx.Service.Widgets.Services/zgyCallLog/getById",
      {
        method: "post",
        data,
      },
    );
  },
  getConfig(interfaceCode?: string) {
    return requestClient.request<TsiConfig>(
      "/hmx.Service.Widgets.Services/zgyCallLog/getConfig",
      {
        method: "post",
        params: { interfaceCode },
      },
    );
  },
  query(dtBeg?: string, dtEnd?: string, interfaceName?: string) {
    return requestClient.request<TsiCallLog[]>(
      "/hmx.Service.Widgets.Services/zgyCallLog/query",
      {
        method: "post",
        params: { dtBeg, dtEnd, interfaceName },
      },
    );
  },
  queryAllInterfaceNames() {
    return requestClient.request<string[]>(
      "/hmx.Service.Widgets.Services/zgyCallLog/queryAllInterfaceNames",
      {
        method: "post",
      },
    );
  },
  queryConfig() {
    return requestClient.request<TsiConfig[]>(
      "/hmx.Service.Widgets.Services/zgyCallLog/queryConfig",
      {
        method: "post",
      },
    );
  },
  queryView(data?: ZgyInputDto) {
    return requestClient.request<ZgyCallLogViewDto[]>(
      "/hmx.Service.Widgets.Services/zgyCallLog/queryView",
      {
        method: "post",
        data,
      },
    );
  },
  reCall(data?: ZgyCallLogViewDto) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/zgyCallLog/reCall",
      {
        method: "post",
        data,
      },
    );
  },
  saveChanges(data?: TsiConfig[]) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/zgyCallLog/saveChanges",
      {
        method: "post",
        data,
      },
    );
  },
  write(data?: TsiCallLog) {
    return requestClient.request<any>(
      "/hmx.Service.Widgets.Services/zgyCallLog/write",
      {
        method: "post",
        data,
      },
    );
  },
};
