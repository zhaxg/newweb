import type { RouteMap } from "../admin/core";

import type { AlarmLevel, DispatchOrder, GasScenarioDto } from "@/api/energy/types";

import { gasForecast, loadForecast, type GasMedia } from "./data/model";
import {
  ackAlarm,
  ackAllAlarms,
  activeAlarms,
  alarmBoard,
  alarmToDispatch,
  closeAlarm,
  ems,
  execDone,
  gasMonitorView,
  gasPlantMonitorView,
  gasSimView,
  issueDispatch,
  ldgSurge,
  nowStamp,
  powerMonitorView,
  receiptClose,
  acceptSuggestion,
  stopSurge,
  steamMonitorView,
  suggestDispatch,
} from "./store";
import { allOf, eq, getHandler, like, listAll, listHandler, postHandler } from "./query";

/**
 * 请求体里的介质码 → 仿真入参。只认三种煤气，其余（含缺省、拼错）一律回落 `LDG`。
 *
 * 回落而不是报错：柜位剧本的主角就是转炉煤气，一个手滑的 `media:"lgd"`
 * 不该让演示台上那个「▶模拟吹炼高峰」按钮失灵。
 */
function simScenario(media: unknown): GasMedia {
  return media === "BFG" || media === "COG" ? media : "LDG";
}

/**
 * EM 监控与调度层的端点（EM0001~0007）。
 *
 * 单独一个文件而不是塞进 `lists.ts` / `overview.ts` / `actions.ts`，理由是这一层的**读端点形状特殊**：
 * `/ems/monitor/*` 回的不是一张表，而是「画布几何 + 已解析的监测量 + 右侧表格」一份组合 DTO。
 * 把它放进 `overview.ts`（那里全是下拉候选）会让两种语义混在一张表里，
 * 而它是 P3 唯一会随 tick 每 3 秒变一次内容的读取端点。
 *
 * 三条约定：
 * 1. **monitor 端点全是 POST**。它们要带 what-if 场景参数，GET 的 query 表达不了嵌套对象；
 *    本仓真实后端也是「查询走 POST」（AGENTS §6 网络层那条），形状先对齐。
 * 2. **剧本按钮回的是 `ActionResult`**，`data` 里带新的仿真快照，
 *    点完立刻能拿到「柜位爬到哪、倒计时多少」，不必再发一次读请求（两次请求之间会插进一拍 tick，
 *    页面上就会出现「按钮回 88%、随后读到 87.6%」这种对不上）。
 * 3. `unmitigated` 由服务端算，页面**不能**自己构造未处置基线（见 `store.gasSimView` 的注释）。
 */
export const energyMonitorRoutes: RouteMap = {
  /* ── 四张画布 ─────────────────────────────────────────────────────── */
  "post /ems/monitor/power": postHandler(() => powerMonitorView()),
  "post /ems/monitor/gas": postHandler((b) => gasMonitorView(simScenario(b.media))),
  "post /ems/monitor/steam": postHandler(() => steamMonitorView()),
  "post /ems/monitor/gasplant": postHandler(() => gasPlantMonitorView()),

  /* ── EM0007 煤气平衡仿真与预测 ────────────────────────────────────── */
  "post /ems/gas/simulate": postHandler((b) => gasSimView((b.scenario ?? {}) as GasScenarioDto)),
  /** 24 点负荷预测：EM0001 也要用，所以是独立端点而不是嵌在 monitor/power 里。
   *  这里**不走 `gasSimView`**——那一次调用要为 what-if 跑两套完整仿真，而预测线只是形状 */
  "get /ems/gas/forecast": getHandler(() => ({ load: loadForecast(24), gas: gasForecast(24) })),

  /* ── 柜与实时层 ───────────────────────────────────────────────────── */
  "get /ems/holder/list": listAll(() => ems.holders),

  /* ── 剧本入口（8 幕的幕 2） ───────────────────────────────────────── */
  "post /ems/gas/surge": postHandler((b) => ldgSurge(simScenario(b.media))),
  "post /ems/gas/surgeStop": postHandler(() => stopSurge()),
  /** 手动跑一次规则引擎（幕 3）；正常路径由 `tickRealtime` 在柜位越线时自动跑 */
  "post /ems/suggestion/gen": postHandler((b) => suggestDispatch(simScenario(b.media))),
  "post /ems/suggestion/accept": postHandler((b) => acceptSuggestion(String(b.id))),

  /* ── EM0005 报警中心 ──────────────────────────────────────────────── */
  "post /ems/alarm/listPage": listHandler(
    () => ems.alarms,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "message"],
          ["keyword", "pointId"],
        ]),
        eq(q, [
          ["level", "level"],
          ["status", "status"],
          ["mediaCode", "mediaCode"],
          ["type", "type"],
        ]),
      ),
  ),
  "post /ems/alarm/board": postHandler((b) =>
    alarmBoard((Number(b.level) || 0) as AlarmLevel | 0, String(b.status ?? "")),
  ),
  /** 活动报警流：监控四页右侧那一列，只给未关闭的，按级别升序 */
  "get /ems/alarm/active": listAll(activeAlarms),
  "post /ems/alarm/ack": postHandler((b) => ackAlarm(String(b.id))),
  "post /ems/alarm/ackAll": postHandler(() => ackAllAlarms()),
  "post /ems/alarm/close": postHandler((b) => closeAlarm(String(b.id))),
  /** 幕 4→5：报警直接转成调度令草拟单（自动填动作与接收人） */
  "post /ems/alarm/toDispatch": postHandler((b) => alarmToDispatch(String(b.alarmId ?? b.id))),

  /* ── EM0006 调度令（幕 5→7 的五态闭环） ───────────────────────────── */
  "post /ems/dispatch/listPage": listHandler(
    () => {
      const now = nowStamp();
      return ems.orders.map((o) => ({ ...o, overdue: isOverdue(o, now) }));
    },
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "reason"],
          ["keyword", "receiver"],
        ]),
        eq(q, [
          ["status", "status"],
          ["type", "type"],
        ]),
      ),
  ),
  "post /ems/dispatch/issue": postHandler((b) => issueDispatch(String(b.id))),
  "post /ems/dispatch/exec": postHandler((b) => execDone(String(b.id))),
  "post /ems/dispatch/receipt": postHandler((b) => receiptClose(String(b.id))),
  /** 看板态与列表态切换用：一次给全五态的计数 */
  "get /ems/dispatch/stat": getHandler(() => dispatchStat()),
};

/** 按状态数调度令。五态计数是 EM0006 看板顶那一排卡的全部原料 */
const countOrders = (st: DispatchOrder["status"]) => ems.orders.filter((o) => o.status === st).length;

/**
 * 逾期判定。**读时算、不落库**：`deadline` 是死线，"过没过"是它与演示时钟的关系，
 * 写进单据就变成一句会在下一拍过期的谎话（而幕 7 要清掉的正是这句话）。
 * 时间串是 `YYYY-MM-DD HH:mm:ss`，字典序即时间序，所以直接比字符串。
 */
const isOverdue = (o: DispatchOrder, now: string) =>
  Boolean(o.deadline) && o.status !== "已回执" && (o.deadline ?? "") < now;

/** 调度令五态计数（EM0006 看板顶那一排卡） */
function dispatchStat() {
  /** 演示时钟而不是真实墙上时间：逾期判断必须和 `deadline` 同一把尺，
   *  用 `Date.now()` 会让 2026 的种子单据永远不逾期 */
  const now = nowStamp();
  return {
    total: ems.orders.length,
    draft: countOrders("草拟"),
    issued: countOrders("已下达"),
    running: countOrders("执行中"),
    done: countOrders("已完成"),
    receipt: countOrders("已回执"),
    /** 逾期未回执：EM0006 顶部那条红色提示，也是幕 7「回执核销」要清掉的数 */
    overdue: ems.orders.filter((o) => isOverdue(o, now)).length,
  };
}
