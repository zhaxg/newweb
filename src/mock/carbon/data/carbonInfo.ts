/**
 * 碳资产「carbonInfo」组查询种子（1 个端点）
 *
 * 抓取自线上 https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets（2026-09-26，只读查询）。
 * 每个端点最多存 50 行，超出部分的 total 记在下方注释里（mock 用实际条数返回 total，保证分页自洽）。
 * id 类超 2^53 的数字已存成原始字符串（JS 解析会取整，回查会 404，见 api/carbon/types.ts）。
 */

/** `GET /business/carbonInfo/getCarbonInfoList` 线上 total=1 */
export const seedCarbonInfos: any[] = [
  {
    tenantId: null,
    creatorTime: "2026-04-24 13:08:01",
    creatorUserId: null,
    creatorUserName: "管理员",
    lastModifyTime: null,
    lastModifyUserId: null,
    lastModifyUserName: null,
    deleteMark: 0,
    deleteTime: null,
    deleteUserId: null,
    deleteUserName: null,
    id: 1,
    title: "国务院：积极发展这些“双碳”服务！",
    carbonInfoType: "1",
    lastPublishTime: "2026-04-24 15:12:43",
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
