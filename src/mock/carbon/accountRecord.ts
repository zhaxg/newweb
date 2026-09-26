import { getParams, ok, type RouteMap } from "../admin/core";
import {
  seedEmissionDetails,
  seedEmissionRecords,
  seedQuotaDetails,
  seedQuotaRecords,
  seedReductionDetails,
  seedReductionRecords,
  seedTradeDetails,
  seedTradeRecords,
} from "./data/accountRecord";
import { allOf, dateRange, fuzzy, paged } from "./query";

/**
 * 账户记录子表 + 记录详情（/business/accountRecord/*）。
 *
 * 列表与详情都是查询，真实现：列表按 enterId + 来源/变动类型过滤再分页，详情按 id 取。
 * 详情种子与列表行**逐条对应**（同一次抓取，id 是从原始响应文本里提的精确字符串）。
 *
 * ⚠️ 详情端点线上是 `getEmissionInfo/{id}` 这种带路径参数的写法，但 `mock/mockAdapter.ts`
 * 是**精确键匹配**（`routes[key]`，不解析 `:param`），所以这里**按每个具体 id 注册一条**，
 * 而不是写 `get .../getEmissionInfo/:id`——那样永远匹配不上、点开详情会 404「mock 未注册的端点」。
 */

const P = "/business/accountRecord";

/** 碳排/减排：enterId + 来源 + 变动类型（参数名沿用响应字段名，与线上 enterName/mainAccountNo 同一命名法） */
const REC_PAIRS = [
  ["enterId", "enterId"],
  ["sourceName", "sourceName"],
  ["serviceName", "serviceName"],
] as const;

/** 配额/交易：enterId + 变动类型（线上只给一个筛选下拉，参数名未在演示系统实测，按同规则命名） */
const TRADE_REC_PAIRS = [
  ["enterId", "enterId"],
  ["changeFlagName", "changeFlagName"],
] as const;

/** 按具体 id 注册详情路由（见文件头 ⚠️） */
function detailRoutes<T extends { id: string }>(action: string, rows: T[]): RouteMap {
  const map: RouteMap = {};
  for (const row of rows) {
    map[`get ${P}/${action}/${row.id}`] = (config) => ok(config, row);
  }
  return map;
}

export const accountRecordRoutes: RouteMap = {
  [`get ${P}/emissionList`]: (config) => {
    const q = getParams(config);
    return ok(config, paged(seedEmissionRecords, q, fuzzy(q, REC_PAIRS)));
  },
  [`get ${P}/reductionList`]: (config) => {
    const q = getParams(config);
    return ok(config, paged(seedReductionRecords, q, fuzzy(q, REC_PAIRS)));
  },
  [`get ${P}/quotaAccList`]: (config) => {
    const q = getParams(config);
    return ok(config, paged(seedQuotaRecords, q, allOf(fuzzy(q, TRADE_REC_PAIRS), dateRange(q, "recordTime"))));
  },
  [`get ${P}/tradeAccList`]: (config) => {
    const q = getParams(config);
    return ok(config, paged(seedTradeRecords, q, allOf(fuzzy(q, TRADE_REC_PAIRS), dateRange(q, "recordTime"))));
  },

  /* 详情（配额与交易线上共用 getTradeAccInfo，两份种子合并注册） */
  ...detailRoutes("getEmissionInfo", seedEmissionDetails),
  ...detailRoutes("getReductionInfo", seedReductionDetails),
  ...detailRoutes("getTradeAccInfo", [...seedQuotaDetails, ...seedTradeDetails]),

  /* 导出：只插桩（回成功，不生成文件） */
  [`post ${P}/emissionExportList`]: (config) => ok(config, null),
  [`post ${P}/reductionExportList`]: (config) => ok(config, null),
};
