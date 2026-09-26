import { getParams, ok, type RouteMap } from "../admin/core";
import { seedEmissionAccounts, seedMainAccounts, seedReductionAccounts } from "./data/carbonAccount";
import { fuzzy, paged } from "./query";

/**
 * 碳账户主表域（/business/carbonAccount/*）。
 * 查询真实现（分页 + 企业名称/账户号模糊），导出只插桩——导出是 POST + blob 的后端能力，
 * 本次范围只 mock 查询，见 src/api/carbon/index.ts 尾注。
 */

const P = "/business/carbonAccount";

export const carbonAccountRoutes: RouteMap = {
  [`get ${P}/list`]: (config) => {
    const q = getParams(config);
    return ok(
      config,
      paged(
        seedMainAccounts,
        q,
        fuzzy(q, [
          ["enterName", "enterName"],
          ["mainAccountNo", "mainAccountNo"],
        ]),
      ),
    );
  },
  [`get ${P}/emissionList`]: (config) => {
    const q = getParams(config);
    return ok(
      config,
      paged(
        seedEmissionAccounts,
        q,
        fuzzy(q, [
          ["enterName", "enterName"],
          ["emissionAccountNo", "emissionAccountNo"],
        ]),
      ),
    );
  },
  [`get ${P}/reductionList`]: (config) => {
    const q = getParams(config);
    return ok(
      config,
      paged(
        seedReductionAccounts,
        q,
        fuzzy(q, [
          ["enterName", "enterName"],
          ["reductionAccountNo", "reductionAccountNo"],
        ]),
      ),
    );
  },

  /* 导出：只插桩（回成功，不生成文件） */
  [`post ${P}/exportMainList`]: (config) => ok(config, null),
  [`post ${P}/exportEmissionList`]: (config) => ok(config, null),
  [`post ${P}/exportReductionList`]: (config) => ok(config, null),
};
