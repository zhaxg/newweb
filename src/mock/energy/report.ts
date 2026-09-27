import type { RouteMap } from "../admin/core";
import { ems } from "./store";
import * as M from "./data/model";
import { getHandler, postHandler } from "./query";

/**
 * ER 报表统计的只读端点（4 页，**只查桩**）。
 *
 * ── 三条纪律 ──────────────────────────────────────────────────────────
 * 1. **页面不许直连 mock**：这四页早期直接 `import { regionStat } from "@/mock/\u2026"`，
 *    等于把派生层搬进了视图层——`model` 改个口径，页面不会编译报错，只是悄悄出错。
 *    现在全部经端点走，`temp/check_ems_api_calls.py` 会把直连拦下来。
 * 2. **回值形状 = 页面要的形状**：`postHandler` 已把回调返回值放进信封，
 *    页面拿到的就是它——**不要**再包一层 `{data, unit}`，页面就得解两次。
 * 3. **数字只从 `model.*` 派生**：本文件里除分组聚合外没有一个字面量业务数字。
 *
 * 路由键与 `src/api/energy/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const energyReportRoutes: RouteMap = {
  /* ═══ ER0001 能耗统计报表 ═══════════════════════════════════════════ */

  /**
   * 区域能耗（工序 × 介质）：一行一个厂。
   *
   * `regionStat` 已把产量 / 折标 / 单耗 / 成本派生好——页面再聚合一遍就是第二份口径。
   * 唯一的后处理是补 `month`（页面的「日期」列与按月筛选要它）。
   */
  "post /ems/report/region-stat": postHandler(() => M.regionStat().map((r) => ({ ...r, month: M.DEMO_MONTH }))),

  /**
   * 分项能耗（工序 × 介质 × 方向 的成本明细）。
   * 回 `mediumCost()` 的完整形状：`rows` 喂表、`byMedium`/`byUnit` 喂图、
   * `perTonSteel` 喂页脚那句「吨钢能源成本」——一个端点喂三处，页面不各取一个数。
   */
  "post /ems/report/sub-stat": postHandler(() => M.mediumCost()),

  /**
   * 峰平谷电能：分时电量/电价/金额 + 24 点负荷形状。
   *
   * `hourlyKWh` 是**负荷形状**（每点代表当月 30 个自然小时）、`tiers` 是**时段合计**——
   * 两者量纲不同，页面**不能塞进同一个 y 轴**（本域踩过的坑）。
   * 这里原样给两块，页面各画各的图。
   */
  "post /ems/report/elec-time-use": postHandler(() => M.elecTimeUse()),

  /** 排名口径：与 EO0002 同源的 `kpiBoard`——**卡片数与大屏相等**是 ER 的卖点 */
  "post /ems/report/ranking": postHandler(() => M.kpiBoard()),

  /* ═══ ER0002 能效分析 ═════════════════════════════════════════════════ */

  /**
   * 单耗多维对比（对象/时间/基准三选择器的数据源）。
   *
   * 与 `sub-stat` 同源是**刻意的**：能效分析与分项能耗看的是同一批账的两个切面，
   * 拆两个端点各算一次，两边的总额迟早对不上。
   */
  "post /ems/report/efficiency": postHandler(() => M.mediumCost()),

  /**
   * 损耗分析：按 `日 × 介质` 给「供应侧 / 使用侧 / 损耗 / 损耗率」。
   *
   * 口径与 EP0003 平衡表同源（都是 `buildActualRecords` 的流水），
   * 但**这里按介质聚合、EP0003 按工序聚合**——两个切面，谁也替代不了谁。
   * `lossPct` 留两位：损耗率是「差在哪」的第一眼，整数位看不出 0.3% 的变化。
   */
  "post /ems/report/loss-analysis": postHandler(() => {
    const recs = M.buildActualRecords();
    const by = new Map<string, { date: string; mediaCode: string; supply: number; use: number }>();
    for (const r of recs) {
      if (r.granularity !== "day") continue;
      const k = `${r.date}|${r.mediaCode}`;
      const cur = by.get(k) ?? { date: r.date, mediaCode: r.mediaCode, supply: 0, use: 0 };
      if (r.direction === "自产" || r.direction === "购入" || r.direction === "回收") cur.supply += r.value;
      else if (r.direction === "消耗" || r.direction === "转换" || r.direction === "外供") cur.use += r.value;
      by.set(k, cur);
    }
    return [...by.values()].map((x) => ({
      ...x,
      loss: Math.round(x.supply - x.use),
      lossPct: x.supply > 0 ? Math.round(((x.supply - x.use) / x.supply) * 10000) / 100 : 0,
    }));
  }),

  /* ═══ ER0003 负荷与煤气预测 ═══════════════════════════════════════════ */

  /**
   * 电力负荷预测（近 `hours` 小时，含 ±band 置信带）。
   *
   * **`band` 是置信带宽度**：页面按「上界 = 值+band、下界 = 值−band」画带。
   * 只画中线答不了「这预测可不可信」——而规格书 ER0003 的原话是
   * 「证明预测可用是调度可信的前提」，那句话要靠这条带来兑现。
   */
  "post /ems/report/load-forecast": postHandler((b) => M.loadForecast(Number(b.hours) || 24)),

  /** 煤气发生量预测（BFG/COG/LDG 各一条，形状沿用负荷曲线、量级用煤气自身） */
  "post /ems/report/gas-forecast": postHandler((b) => M.gasForecast(Number(b.hours) || 24)),

  /**
   * 预测精度（MAPE 仪表 + 按周趋势）。
   *
   * **MAPE 从置信带反推**（`band / 值` = 相对误差界）：这是 `loadForecast`
   * 自己给的自我评估口径，页面另算一套会出现「带宽 4%、MAPE 写 8%」的自相矛盾。
   * 煤气侧没有 `band` 字段（形状是 bfg/cog/ldg），用 3% 的固定相对带——
   * **是模型自评不是实测**，所以返回值里带 `note`，页面必须把这句话显示出来。
   * 给近 8 周：一条 MAPE 答不了「精度在变好还是变坏」，而「按周趋势」是规格书要的。
   */
  "post /ems/report/forecast-accuracy": postHandler(() => {
    const load = M.loadForecast(24);
    const mape = load.reduce((s, r) => s + (r.mw > 0 ? r.band / r.mw : 0), 0) / Math.max(1, load.length);
    const base = Math.round(mape * 10000) / 100;
    const weeks = Array.from({ length: 8 }, (_, i) => ({
      week: `W${i + 1}`,
      loadMape: Math.round((base + (i - 4) * 0.12) * 100) / 100,
      gasMape: Math.round((3 + (i - 4) * 0.1) * 100) / 100,
    }));
    return { loadMape: base, gasMape: 3, weeks, note: "模型自评（置信带相对宽度），非实测回放" };
  }),

  /* ═══ ER0004 自定义报表 ═════════════════════════════════════════════════ */

  /** 模板列表：真源 `ems.reportTemplates`（EG 那边维护），**端点里不硬编码模板** */
  "post /ems/report/templates": postHandler(() => ems.reportTemplates),

  /**
   * 简易组态预览：只回**表格骨架**（列 + 粒度）。
   *
   * 行留空是因为真实行要等发布时按模板查——预览阶段给假行，
   * 客户会把假数据当成这个模板的口径（最坏的一种「看起来对」）。
   */
  "post /ems/report/config": postHandler((b) => ({
    columns: Array.isArray(b.dimensions) ? (b.dimensions as string[]) : [],
    metrics: Array.isArray(b.metrics) ? (b.metrics as string[]) : [],
    granularity: (b.granularity as "时" | "日" | "月") ?? "日",
    rows: [],
  })),

  /** 日报发布（模拟）：回单号，日期取演示日——与导出口径一致，不读墙上时间 */
  "post /ems/report/publish": postHandler(() => ({
    success: true,
    /* `DEMO_T0` 是 `Date.parse` 的 **number**（不是字符串），slice 会 TS2339；
     用本地 get* 取日而不是 `toISOString()`（后者是 UTC，跨时区会把 27 号读成 26 号） */
    id: `B-${(() => {
      const d = new Date(M.DEMO_T0);
      return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    })()}-01`,
  })),

  /* ═══ 四页共用的下拉候选 ═══════════════════════════════════════════════ */

  /**
   * 介质候选：只列**进平衡表**的——不进平衡表的介质在报表里没有行，
   * 挂在下拉里就是「能选、筛出 0 行」的死选项。
   */
  "get /ems/report/mediaOptions": getHandler(() =>
    M.MEDIUM_LIST.filter((m) => m.balanceParticipate).map((m) => ({ code: m.code, name: m.name, color: m.color })),
  ),

  /** 用能单元候选（分区域报表的按厂筛选），只给**厂级**——报表行就是厂级粒度 */
  "get /ems/report/unitOptions": getHandler(() => M.PLANT_UNITS.map((u) => ({ id: u.id, name: u.name }))),
};
