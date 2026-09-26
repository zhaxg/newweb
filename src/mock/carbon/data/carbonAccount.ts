import type { EmissionAccountRow, MainAccountRow, ReductionAccountRow } from "@/api/carbon/types";

/**
 * 碳账户主表 / 碳排账户 / 减排账户 三张账户表（/business/carbonAccount/*）。
 *
 * 抓取自线上 https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets（2026-09-26，只读 GET 查询）。
 * 三表字段同构、仅账户号与金额字段名不同（mainAccountNo / emissionAccountNo / reductionAccountNo）。
 * id 线上是超 2^53 的 JSON 数字，JS 解析会取整导致详情接口 404——本层一律存原始字符串。
 */

export const seedMainAccounts: MainAccountRow[] = [
  {
    tenantId: "0",
    creatorTime: "2026-08-21 11:48:02",
    creatorUserId: "349057407209541",
    creatorUserName: "管理员",
    lastModifyTime: "2026-09-02 16:22:15",
    lastModifyUserId: "gyy_2073942459746979842",
    lastModifyUserName: "bxqy",
    deleteMark: 0,
    id: "2090647086141849601",
    enterId: "96240625-934F-490B-8AA6-0BC775B18468",
    enterName: "红河谷钢铁事业部",
    mainAccountNo: "202608211148021",
    mainSum: 1444915.9858,
    emissionSum: 1563467.3758,
    reductionSum: 118551.39,
    accountStatus: 0,
  },
];

export const seedEmissionAccounts: EmissionAccountRow[] = [
  {
    tenantId: "0",
    creatorTime: "2026-08-21 11:48:02",
    creatorUserId: "349057407209541",
    creatorUserName: "管理员",
    lastModifyTime: "2026-09-02 16:22:15",
    lastModifyUserId: "gyy_2073942459746979842",
    lastModifyUserName: "bxqy",
    deleteMark: 0,
    id: "2090647086141849601",
    enterId: "96240625-934F-490B-8AA6-0BC775B18468",
    enterName: "红河谷钢铁事业部",
    emissionAccountNo: "202608211148022",
    emissionSum: 1563467.3758,
    accountStatus: 0,
  },
];

export const seedReductionAccounts: ReductionAccountRow[] = [
  {
    tenantId: "0",
    creatorTime: "2026-08-21 11:48:02",
    creatorUserId: "349057407209541",
    creatorUserName: "管理员",
    lastModifyTime: "2026-09-02 16:22:15",
    lastModifyUserId: "gyy_2073942459746979842",
    lastModifyUserName: "bxqy",
    deleteMark: 0,
    id: "2090647086141849601",
    enterId: "96240625-934F-490B-8AA6-0BC775B18468",
    enterName: "红河谷钢铁事业部",
    reductionAccountNo: "202608211148023",
    reductionSum: 118551.39,
    accountStatus: 0,
  },
];
