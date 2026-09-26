import type { QuotaTradeRow } from "@/api/carbon/types";

/**
 * 配额账户 / 交易账户（/business/accountQuotaTrade/*）。
 *
 * 抓取自线上 https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets（2026-09-26，只读 GET 查询）。
 * 两接口同构（同一张表按 accountType 区分：2=配额、1=交易）；列映射见 src/pages/carbon/carbonAccount 各页 colDefs 注释。
 */

export const seedQuotaAccounts: QuotaTradeRow[] = [
  {
    tenantId: "0",
    creatorTime: "2026-08-26 16:31:00",
    creatorUserId: "gyy_2073942459746979842",
    creatorUserName: "bxqy",
    lastModifyTime: "2026-08-31 14:43:01",
    lastModifyUserId: "gyy_2073942459746979842",
    lastModifyUserName: "bxqy",
    deleteMark: 0,
    id: "2092530234106290178",
    enterId: "96240625-934F-490B-8AA6-0BC775B18468",
    enterName: "红河谷钢铁事业部",
    tradeAccountNo: "202608261630592",
    tradeSurplusSum: 1150000,
    buySum: 1700000,
    sellSum: 600000,
    markOffSum: 0,
    cutInSum: 50000,
    inspectSum: 600000,
    accountStatus: 0,
    accountType: 2,
  },
];

export const seedTradeAccounts: QuotaTradeRow[] = [
  {
    tenantId: "0",
    creatorTime: "2026-08-26 16:31:00",
    creatorUserId: "gyy_2073942459746979842",
    creatorUserName: "bxqy",
    lastModifyTime: "2026-08-31 14:47:16",
    lastModifyUserId: "gyy_2073942459746979842",
    lastModifyUserName: "bxqy",
    deleteMark: 0,
    id: "2092530234064347137",
    enterId: "96240625-934F-490B-8AA6-0BC775B18468",
    enterName: "红河谷钢铁事业部",
    tradeAccountNo: "202608261630591",
    tradeSurplusSum: 0,
    buySum: 150000,
    sellSum: 100000,
    markOffSum: 50000,
    cutInSum: 0,
    inspectSum: 0,
    accountStatus: 0,
    accountType: 1,
  },
];
