import { getBody, getParams, ok, type Handler } from "../admin/core";
import { dateRange, fuzzy, numRange, paged } from "./query";

/**
 * 碳域 48 个列表端点的**通用 handler 工厂**。
 *
 * 这些端点形状完全一致：读分页参数 → 按若干条件过滤 → 切片 → 回 `{total, rows}`。
 * 逐个手写 handler 只是把同一段代码抄 57 遍，且分页/过滤的 bug 要修 57 处；
 * 所以只把「种子 + 过滤字段映射 + 方法/区间/日期这几个真正不同的东西」作为参数。
 *
 * 写操作与导出不用它——那些走 `stubRoute()`（回成功、不落库）。
 */
export interface ListOpts {
  /** 线上是 POST 就填 post（请求体读 getBody，否则读 query 参数） */
  method?: "get" | "post";
  /** 该端点的固定参数（线上就有：日历的 date、年份状态的 year、企业授权的 type） */
  defaults?: Record<string, any>;
  /** 支持 startTime/endTime 区间过滤的时间字段名 */
  dateField?: string;
  /** 数值区间：[下限参数名, 上限参数名, 行字段名] */
  ranges?: Array<[string, string, string]>;
}

export function listRoute(
  seed: any[],
  pairs: ReadonlyArray<readonly [string, string]> = [],
  opts: ListOpts = {},
): Handler {
  const method = opts.method ?? "get";
  /* 行里根本没有的维度不参与过滤：种子数据没有这一列时，
     过滤会把整表搜成空（明明有数据却查不出），比不过滤更让人困惑。 */
  const fields = new Set<string>();
  for (const row of seed.slice(0, 50)) for (const k of Object.keys(row)) fields.add(k);
  const livePairs = pairs.filter(([, field]) => fields.has(field));
  const liveRanges = (opts.ranges ?? []).filter(([, , field]) => fields.has(field));

  return (config) => {
    const q = {
      ...opts.defaults,
      ...((method === "post" ? getBody(config) : getParams(config)) as Record<string, any>),
    };
    const preds: Array<(row: any) => boolean> = [fuzzy(q, livePairs)];
    if (opts.dateField) preds.push(dateRange(q, opts.dateField));
    for (const [minKey, maxKey, field] of liveRanges) preds.push(numRange(q, field, minKey, maxKey));
    return ok(
      config,
      paged(seed, q, (row) => preds.every((p) => p(row))),
    );
  };
}

/** 写操作 / 导出插桩：回成功信封，不落库、不校验（本次约定：只 mock 查询） */
export function stubRoute(): Handler {
  return (config) => ok(config, null);
}
