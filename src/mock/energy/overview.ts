import type { RouteMap } from "../admin/core";
import { ems, unitTree } from "./store";
import { getHandler, listAll } from "./query";
import { PERSONS } from "./data/seed";

/**
 * 能源域的无分页聚合读取（下拉候选、树、看板数字）。
 *
 * 这一层的存在理由不是"少写一次分页"，而是**候选项必须和账同源**：
 * 介质、用能单元、人名如果在各页 `import` 常量表，EG0001 改一条介质系数、EG0002 加一个单元，
 * 页面下拉还是老那份——本域所有主数据都是 `ems` 里的活数组，走接口才拿得到改动后的结果。
 *
 * `getHandler` 读的是 `config.params`（axios `params`），与 `listHandler` 读 body 是两条路，
 * 别在 GET 端点上写 `getBody`：真接后端时 query 与 body 的解析位置不一样，改了会当场失效。
 */
export const energyOverviewRoutes: RouteMap = {
  /* 人名候选：报警接收人、调度签发人、补录人、校核人共用同一批人（见 seed.PERSONS 的说明） */
  "get /ems/person/list": listAll(() => PERSONS),

  /* 介质下拉（几乎每页的过滤器都要它，也是 emsTheme 的专色来源） */
  "get /ems/medium/list": listAll(() => ems.mediums),

  "get /ems/unit/list": listAll(() => ems.units),
  /** 层级树：`rootId` 不给就是全厂；给了则连子树一起返回、已按 path 深度优先排序 */
  "get /ems/unit/tree": getHandler((q) => unitTree(q.rootId ? String(q.rootId) : undefined)),
};
