import type { RouteMap } from "../../admin/core";
import { ok } from "../../admin/core";
import { allOf, eq, getHandler, like, listAll, numRange } from "../query";
import { DAILY_STATS, REPORT_MONTHS, REPORT_TEAMS, REPORT_UNITS, SUMMARY_STATS, TEAM_STATS } from "../data/report";
import { outputTree } from "../data/model";

/**
 * TR 统计报表的只读端点（3 页，**只查桩**）。
 *
 * **子母项的钻取是这一组的核心端点**（`/stat/drill`）：
 * 给一个 `StatRow` 的 id，回它的子项明细——日值拆到班、月值拆到日。
 * 没有这个端点，客户问「这个月产量怎么来的」只能翻原始表自己加，
 * 而「能点开看算式」正是这套报表区别于一张 Excel 的地方。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const reportRoutes: RouteMap = {
  /* ── 三张统计表共用一个分页（`kind` 区分）───────────────────────────── */

  /**
   * 统计行分页。`kind` 决定读哪张表——三张表的字段形状完全相同（`StatRow`），
   * 所以**一个端点够了**；拆三个端点会让页面对着同一个形状写三遍参数。
   * 不给 `kind` 回日报（默认那一张），首屏不至于空着。
   */
  "post /tqmes/stat/listPage": (config) => {
    const q = (config.data ?? {}) as Record<string, any>;
    const kind = String(q.kind ?? "daily");
    const pool = kind === "team" ? TEAM_STATS : kind === "summary" ? SUMMARY_STATS : DAILY_STATS;
    /* 过滤器按三种表各自的维度给，多余的维度对当前表自然不命中（`eq` 空值放行） */
    const keep = allOf(
      like(pool as any, [
        ["keyword", "target"],
        ["keyword", "indicator"],
        ["keyword", "period"],
        ["keyword", "remark"],
      ]),
      eq(pool as any, [
        ["process", "process"],
        ["indicator", "indicator"],
        ["granularity", "granularity"],
        ["target", "target"],
        ["period", "period"],
      ]),
      numRange(pool as any, "value"),
    );
    const size = Math.min(500, Math.max(1, Number(q.pageSize) || 20));
    const page = Math.max(1, Number(q.currentPage) || 1);
    const rows = pool.filter(keep as any);
    /* 导入 `paged` 才是正路，但三种表形状相同、`listHandler` 只吃 getter，
       所以这里手写切片（与 `paged` 的语义逐字一致：越界回落到第 1 页） */
    const start = (page - 1) * size;
    /* 手写而不是用 `listHandler`：`kind` 要在**调用时**才知道读哪张表，
       而 `listHandler` 的 getter 在构造时就固定了。语义与 `paged()` 逐字一致。 */
    return ok(config, { total: rows.length, rows: rows.slice(start, start + size) });
  },

  /**
   * 子母项钻取：给 `id`，回这一行的子项与算式。
   *
   * **三种表都要能钻**——日报钻到班、班组表钻到四班明细、综合表钻到收支明细。
   * 所以端点在三张表里都找一遍，而不是只在日报里找：
   * 页面不知道当前是哪张表（它只知道自己在看 TR 的某一页）。
   */
  "get /tqmes/stat/drill": getHandler((q) => {
    const id = String(q.id ?? "");
    const all = [...DAILY_STATS, ...TEAM_STATS, ...SUMMARY_STATS];
    const row = all.find((r) => r.id === id);
    if (!row) return null;
    /* 日报的子项是「班组/机组 → 值」；再往下是 model 的班层树 */
    const tree =
      row.granularity === "日"
        ? outputTree(String(row.target.split("·").pop() ?? "").trim(), String(row.period).replace(/-/g, "").slice(0, 6))
        : null;
    return {
      ...row,
      /* 子项明细：`childItems` 是「名字 → 值」，这里展开成带算式的行 */
      children: Object.entries(row.childItems ?? {}).map(([name, value]) => ({
        name,
        value,
        unit: row.unit,
        /* 子项的算式比母项简单：它就是那一台机组当日的值，没有再往下一层 */
        formula: `${row.indicator} · ${name} 在 ${row.period} 的子项值`,
      })),
      /* 班层树只在「日」粒度给——它是 model 算出来的真树（日 → 三班），
         其余粒度没有班层，硬造一棵会与实际口径冲突 */
      levelTree: tree,
    };
  }),

  /* ── TR0002 班组排名 ───────────────────────────────────────────────── */

  /**
   * 班组竞赛排名：**按指标方向排**（`rankBy` 为 `lower` 时升序）。
   *
   * 端点直接给排好的序，页面不再排一次——两处排序规则不同就会出现
   * 「表上第一名叫 A、榜单上第一名叫 B」，那正是竞赛榜最要不得的矛盾。
   */
  "get /tqmes/stat/teamRank": getHandler((q) => {
    const indicator = q.indicator ? String(q.indicator) : "产量";
    const period = q.period ? String(q.period) : "";
    const pool = TEAM_STATS.filter((r) => r.indicator === indicator && (!period || r.period === period));
    const lower = pool.some((r) => r.rankBy === "lower");
    const byTeam = new Map<string, { target: string; values: number[]; pass: number; total: number }>();
    for (const r of pool) {
      const cur = byTeam.get(r.target) ?? { target: r.target, values: [], pass: 0, total: 0 };
      cur.values.push(r.value);
      cur.pass += Number(r.passRate) >= 60 ? 1 : 0;
      cur.total += 1;
      byTeam.set(r.target, cur);
    }
    const rows = [...byTeam.values()].map((x) => ({
      target: x.target,
      indicator,
      /* 平均值 = 这几天的均值（母项是子项的算术平均，与 B4 的加权在同权时一致） */
      value: Math.round((x.values.reduce((s, v) => s + v, 0) / Math.max(1, x.values.length)) * 100) / 100,
      /* 达标率 = 达标天数 / 总天数 × 100%（A3 的原话「指标达标率」） */
      passRate: Math.round((x.pass / Math.max(1, x.total)) * 10000) / 100,
      days: x.total,
      rankBy: lower ? "lower" : "higher",
    }));
    const sorted = rows.toSorted((a, b) => (lower ? a.value - b.value : b.value - a.value));
    return sorted.map((r, i) => ({ ...r, rank: i + 1 }));
  }),

  /* ── 候选（三页共用，不写死在页面）──────────────────────────────────── */

  "get /tqmes/report/periods": listAll(() => REPORT_MONTHS),
  "get /tqmes/report/dates": listAll(() =>
    [...new Set([...DAILY_STATS, ...TEAM_STATS].map((r) => r.period))].toReversed(),
  ),
  "get /tqmes/report/teams": listAll(() => REPORT_TEAMS),
  "get /tqmes/report/units": listAll(() => REPORT_UNITS.map((u) => ({ id: u.id, name: u.name, type: u.type }))),
  "get /tqmes/report/indicators": listAll(() => [
    ...new Set([...DAILY_STATS, ...TEAM_STATS, ...SUMMARY_STATS].map((r) => r.indicator)),
  ]),
};
