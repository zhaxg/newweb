import type { RouteMap } from "../admin/core";
import { ems } from "./store";
import * as M from "./data/model";
import { allOf, dayRange, eq, like, listHandler, numRange, postHandler } from "./query";
import {
  correctActual,
  planStatus,
  recalcActual,
  recalcPlan,
  runAssess,
  runBalance,
  runSettlement,
  settleStatus,
} from "./store";

/**
 * EP 能源管理的端点（P4：EP0001-0006 六页）。
 *
 * ── 写操作全部转发给 `store` ─────────────────────────────────────────
 * `recalcActual` / `runBalance` / `runSettlement` / `settleStatus` / `runAssess` /
 * `planStatus` / `recalcPlan` / `correctActual` **都已经写好了**（P1 数值底座那批），
 * 本文件只做「HTTP body → 参数」的搬运。
 * **任何一处在端点里自己算数都是越权**：本域红线是「只有 model 允许出现业务数字」，
 * 而连状态推进都得走 store——否则页面与平衡表会各自持有一份状态。
 *
 * ── 路由前缀必须是 `/ems` ───────────────────────────────────────────
 * 接口层 `B = "/ems"`（`api/energy/index.ts`），`withApiPrefix()` 统一补 `/api`。
 * 早期草稿用过 `/eps/...`，那与 api 层对不上——**打出去就是静默 404**，
 * 页面看着正常、数据永远是空的（本域已有的教训：见 P3 的导入路径）。
 *
 * ── 幂等与门控都在 store 里判 ───────────────────────────────────────
 * 「已定稿禁改实绩」「已平衡提示无残差」「计划状态非法转移」这些拒绝都由 store 返回
 * `{ok:false, msg}`（HTTP 200 信封），端点原样透传——页面 `applyResult` 统一弹。
 * 端点自己不判断，是因为判断规则随业务变，只许有一处定义。
 *
 * `listHandler` 的 `filter` 是**谓词合取器**，所以每个筛选键都要 `eq`/`like` 显式登记；
 * 参数名与页面的 `query` 条件 key 逐字同名（两端同一份 spec 约束）。
 */
export const energyPlanRoutes: RouteMap = {
  /* ── EP0001 定额与能源计划（V5 矩阵：工序 × 介质 单耗定额）───────────── */
  "post /ems/quota/listPage": listHandler(
    () => ems.quotas,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "unitId"],
          ["keyword", "product"],
        ]),
        eq(q, [
          ["mediaCode", "mediaCode"],
          ["direction", "direction"],
          ["unitId", "unitId"],
        ]),
      ),
  ),

  /* ── 月度能源计划（B2-3 状态机：编制中→已提交→已批准→执行中→已归档）── */
  "post /ems/plan/listPage": listHandler(
    () => ems.plans,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "month"],
          ["keyword", "createdBy"],
        ]),
        eq(q, [
          ["month", "month"],
          ["status", "status"],
        ]),
      ),
  ),
  /** 计划状态流转（退回编制 / 提交 / 批准 / 归档），拒绝由 store 判 */
  "post /ems/plan/status": postHandler((b) => planStatus(String(b.id), b.to as never, b.by ? String(b.by) : undefined)),
  /** 按预测产量重算计划明细（只对「编制中」开放，须先退回编制） */
  "post /ems/plan/recalc": postHandler((b) => recalcPlan(String(b.id), Number(b.factor) || 1)),

  /* ── EP0002 能源实绩管理（V3 台账 + 公式追溯）───────────────────────── */
  "post /ems/actual/listPage": listHandler(
    () => ems.actuals,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "pointId"],
          ["keyword", "unitId"],
          ["keyword", "mediaCode"],
        ]),
        eq(q, [
          ["granularity", "granularity"],
          ["date", "date"],
          ["source", "source"],
          ["mediaCode", "mediaCode"],
          ["direction", "direction"],
          ["unitId", "unitId"],
        ]),
        /* 通道中断期的「缺失」行是演示重点（EC0002 中断的后果区），单独可筛 */
        eq(q, [["missing", "missing"]]),
        /* 日期区间：EP0002 顶部那个区间选择器送的就是它 */
        dayRange(q, "date"),
      ),
  ),
  /** 人工校正留痕（校正人/原因/前后值全写回行上）；已定稿的月由 store 拒绝 */
  "post /ems/actual/correct": postHandler((b) =>
    correctActual(String(b.id), Number(b.value), b.by ? String(b.by) : undefined, String(b.reason ?? "")),
  ),
  /** ▶重算昨日实绩（幕 6 的第一步）：由计量点实绩 + 公式汇总统计节点实绩 */
  "post /ems/actual/recalc": postHandler((b) => recalcActual(b.date ? String(b.date) : M.DEMO_YESTERDAY)),

  /* ── EP0003 能源平衡表（V5 矩阵，月度必出报表）──────────────────────── */
  "post /ems/balance/listPage": listHandler(
    () => ems.balances,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "month"],
        ]),
        eq(q, [
          ["month", "month"],
          ["mediaCode", "mediaCode"],
          ["balanced", "balanced"],
        ]),
      ),
  ),
  /**
   * ▶执行平衡分摊（幕 6 的落点）。
   *
   * 两条审计红线都在 store 里守：
   * ① 分摊只动「损失 / 平衡差」两列，**收入与消耗是计量来的硬数不许改**；
   * ② 已 `balanced=true` 的表再点回「已平，无残差可摊」——不会二次分摊把差改成负的。
   */
  "post /ems/balance/run": postHandler((b) => runBalance(b.month ? String(b.month) : M.DEMO_MONTH)),

  /* ── EP0004 成本与结算（V6 流程工单：已生成→已核对→已定稿）────────── */
  "post /ems/settlement/listPage": listHandler(
    () => ems.settlements,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "month"],
          ["keyword", "unitId"],
        ]),
        eq(q, [
          ["month", "month"],
          ["unitId", "unitId"],
          ["status", "status"],
        ]),
      ),
  ),
  /** ▶生成本月结算（幕 7）：实绩 × 单价（峰谷按分时段电量）→ 成本中心结算单 */
  "post /ems/settlement/generate": postHandler((b) => runSettlement(b.month ? String(b.month) : M.DEMO_MONTH)),
  /** 核对 / 定稿。**定稿后门控：该月实绩禁止再校正**（store 判，页面只弹 msg） */
  "post /ems/settlement/status": postHandler((b) =>
    settleStatus(String(b.id), b.to as never, b.by ? String(b.by) : undefined),
  ),

  /* ── EP0005 能耗考核与对标（V4 分析：实绩 vs 标杆/准入/设计）───────── */
  "post /ems/assess/listPage": listHandler(
    () => ems.assess,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "unitId"],
          ["keyword", "product"],
        ]),
        eq(q, [
          ["unitId", "unitId"],
          ["product", "product"],
          ["mediaCode", "mediaCode"],
        ]),
        /* 名次区间（「前几名」是考核页最常用的筛选，给它一个直接的键） */
        numRange(q, "rank"),
      ),
  ),
  /** ▶生成考核月报（基准分 − 超标扣分 + 节能加分，排名一次出齐） */
  "post /ems/assess/generate": postHandler((b) => runAssess(b.month ? String(b.month) : M.DEMO_MONTH)),

  /* ── EP0006 重点用能设备（V3 台账：九大类 + 能效评级 1~3 级）────────── */
  "post /ems/keyEquip/listPage": listHandler(
    () => ems.keyEquips,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "name"],
          ["keyword", "model"],
        ]),
        eq(q, [
          ["category", "category"],
          ["unitId", "unitId"],
          ["effGrade", "effGrade"],
          ["energyMedia", "energyMedia"],
        ]),
        numRange(q, "monthStdCoal"),
      ),
  ),
  /** 单机能耗曲线（点行「看能效曲线」时给近 6 月序列） */
  "post /ems/keyEquip/curve": postHandler((b) => {
    const k = ems.keyEquips.find((x) => x.id === String(b.id));
    if (!k) return [];
    /* 用 monthSeries 派生——它是「当前值 + 6 期波动」的唯一口径，页面不自己抖 */
    return M.monthSeries({ monthStdCoal: k.monthStdCoal, intensity: k.intensity }, 6);
  }),
};
