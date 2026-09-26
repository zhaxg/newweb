import { getParams, ok, type RouteMap } from "../admin/core";
import { seedQuotaAccounts, seedTradeAccounts } from "./data/accountQuotaTrade";
import { fuzzy, paged } from "./query";

/**
 * 配额/交易账户域（/business/accountQuotaTrade/*）。
 *
 * ⚠️ **写操作只插桩**：`quotaTransfer` / `tradeTransfer`（资产划拨·确定）只回成功信封，
 * 不落库、不校验、不计算余额——按本次约定「只 mock 查询，增删改只插桩」。
 * 端点路径来自线上 chunk 的静态抽取（`[...].accountQuotaTrade...` 正则），
 * **没有在演示系统点过「确 定」**，避免产生真实写入；线上真实签名未逐字段核对。
 */

const P = "/business/accountQuotaTrade";

export const accountQuotaTradeRoutes: RouteMap = {
  [`get ${P}/quotaList`]: (config) => {
    const q = getParams(config);
    return ok(
      config,
      paged(
        seedQuotaAccounts,
        q,
        fuzzy(q, [
          ["enterName", "enterName"],
          ["tradeAccountNo", "tradeAccountNo"],
        ]),
      ),
    );
  },
  [`get ${P}/tradeList`]: (config) => {
    const q = getParams(config);
    return ok(
      config,
      paged(
        seedTradeAccounts,
        q,
        fuzzy(q, [
          ["enterName", "enterName"],
          ["tradeAccountNo", "tradeAccountNo"],
        ]),
      ),
    );
  },

  /* 资产划拨：只插桩 */
  [`post ${P}/quotaTransfer`]: (config) => ok(config, null),
  [`post ${P}/tradeTransfer`]: (config) => ok(config, null),

  /* 导出：只插桩 */
  [`post ${P}/exportQuotaList`]: (config) => ok(config, null),
  [`post ${P}/exportTradeList`]: (config) => ok(config, null),
};
