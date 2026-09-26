/**
 * 碳资产「carbonWarning」组查询种子（2 个端点）
 *
 * 抓取自线上 https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets（2026-09-26，只读查询）。
 * 每个端点最多存 50 行，超出部分的 total 记在下方注释里（mock 用实际条数返回 total，保证分页自洽）。
 * id 类超 2^53 的数字已存成原始字符串（JS 解析会取整，回查会 404，见 api/carbon/types.ts）。
 */

/** `GET /business/warningSetting/list` 线上 total=1 */
export const seedWarningSettings: any[] = [
  {
    tenantId: null,
    creatorTime: "2026-08-29 08:53:55",
    creatorUserId: "gyy_2073942459746979842",
    creatorUserName: null,
    lastModifyTime: "2026-08-29 08:53:55",
    lastModifyUserId: "gyy_2073942459746979842",
    lastModifyUserName: "bxqy",
    deleteMark: 0,
    deleteTime: null,
    deleteUserId: null,
    deleteUserName: null,
    enterId: "96240625-934F-490B-8AA6-0BC775B18468",
    enterName: "天津示例钢铁企业有限公司",
    warningType: "设备预警",
    statusFlag: 0,
    statusFlagName: "启用",
    factoryName: null,
    processName: null,
    fdeleteMark: null,
    ftenantId: null,
    fcreatorTime: null,
    fcreatorUserId: null,
    fcreatorUserName: null,
    flastModifyTime: null,
    flastModifyUserId: null,
    flastModifyUserName: null,
    fdeleteTime: null,
    fdeleteUserId: null,
    fdeleteUserName: null,
  },
];

/** `GET /business/warningRecord/list` 线上 total=0 */
export const seedWarningRecords: any[] = [];
