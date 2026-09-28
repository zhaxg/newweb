import type { RouteMap } from "../../admin/core";
import { allOf, dayRange, eq, getHandler, like, listAll, listHandler } from "../query";
import { PROCESS_PARAMS, DEMO_DATE, between, paramSnapshot } from "../data/model";
import { PROCESS_SEQ, UNITS, processOf } from "../data/org";
import { COKE_QUALITY, HOT_STOVES, PCI_RUNS, PUSH_COKE, WASTE_HEAT } from "../data/monitor";

/**
 * TW 运行与作业类的只读端点（**只查桩**）。
 *
 * 分工：`work.ts` 管**量的流水**（投料/收料/变料/停机，六道工序同构），
 * 这里管**单机的作业与参数**（推焦、余热、喷煤、热风炉、运行参数快照）。
 *
 * `processParam/*` 是 L5 监控盘那五个页面的数据源，**三端点各管一段**：
 * - `defs`    → 参数定义（键/中文名/单位/上下限），**页面不写死阈值**；
 * - `current` → 当前快照（`model.paramSnapshot()` 现算），`alarms` 由 model 判定；
 * - `history` → 近 N 小时的曲线（围绕快照的确定性抖动）。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const monitorRoutes: RouteMap = {
  /* ── 运行参数（TW0204/0206/0304/0404/0504/0604 六个 L5 监控盘）────────── */

  /**
   * 参数定义。
   *
   * `paramKey` 不给就回落到 `process`（大多数工序一个 key 对应一套参数）；
   * 焦化有三页各一套（`coke` / `coke-oven` / `coke-gas`），页面按入参指名要哪套。
   * 定义里带**上下限与基准**，页面据此把超限的参数标红——**判定只在 model 做一次**，
   * 页面各判一次就会出现两页对同一条给出不同结论。
   */
  "get /tqmes/processParam/defs": getHandler((q) => {
    const key = q.paramKey ? String(q.paramKey) : q.process ? String(q.process) : "";
    const defs = PROCESS_PARAMS[key] ?? [];
    return defs.map((d) => ({
      key: d.key,
      label: d.label,
      unit: d.unit,
      lo: d.range[0],
      hi: d.range[1],
      digits: d.digits,
      base: d.base,
    }));
  }),

  /** 该工序全部可看的参数 key 列表（曲线选择器用） */
  /**
   * 某机组的当前参数快照（监控盘轮询取数）。
   *
   * `clock` 由页面送来（页面用 `DEMO_DATE` + 整分钟拼，**不许 `new Date()`**），
   * 所以同一分钟内重复取快照是同一批数——否则 3s 轮询会让数字乱跳，看着像数据不稳。
   */
  "get /tqmes/processParam/current": getHandler((q) => {
    const unitId = String(q.unitId ?? "");
    /* `paramKey` 优先：焦化三页各看一套参数，`processOf(unitId)` 只能推出 `coke`，
       推不出是炉温还是煤气净化——页面指名要哪套就用哪套 */
    const paramKey = q.paramKey ? String(q.paramKey) : "";
    const process = paramKey || String(q.process ?? (unitId ? processOf(unitId) : ""));
    const clock = q.clock ? String(q.clock) : `${DEMO_DATE} 08:00`;
    const { params, alarms } = paramSnapshot(unitId, process, clock);
    const unit = UNITS.find((u) => u.id === unitId);
    return {
      id: `PP-${unitId}`,
      unitId,
      unitName: unit?.name ?? "",
      process,
      clock,
      params,
      alarms,
      status: alarms.length ? "报警" : "运行",
    };
  }),

  /**
   * 某机组的参数历史曲线（近 `hours` 小时，最多 48）。
   *
   * 每个参数一条序列；历史值是**围绕当前快照值的确定性抖动**，
   * 不真去维护一份时序库——演示要看的是「曲线长什么样」，
   * 不是精确回放。越限点会看到它冲出上下限再回落（与 `current` 的 `alarms` 自洽）。
   */
  "get /tqmes/processParam/history": getHandler((q) => {
    const unitId = String(q.unitId ?? "");
    const paramKey = q.paramKey ? String(q.paramKey) : "";
    const process = paramKey || String(q.process ?? (unitId ? processOf(unitId) : ""));
    const defs = PROCESS_PARAMS[process] ?? [];
    const keys = String(q.keys ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const hours = Math.min(48, Math.max(1, Number(q.hours) || 8));
    const use = keys.length ? defs.filter((d) => keys.includes(d.key)) : defs;
    const times: string[] = [];
    for (let i = hours - 1; i >= 0; i -= 1) times.push(`${String((24 - i) % 24).padStart(2, "0")}:00`);
    const series = use.map((d) => ({
      name: d.label,
      unit: d.unit,
      /* 与当前快照同源的基准，加一个按小时确定的抖动，所以曲线的中心就是当前值 */
      data: times.map((_, hi) => {
        const jitter = between(-(d.jitter * d.base), d.jitter * d.base, `hs|${unitId}|${d.key}|${hi}`, d.digits);
        return Math.round((d.base + jitter) * 10 ** d.digits) / 10 ** d.digits;
      }),
    }));
    return {
      times,
      series,
      defs: use.map((d) => ({ key: d.key, label: d.label, unit: d.unit, lo: d.range[0], hi: d.range[1] })),
    };
  }),

  /* ── 推焦作业实绩（TW0203）────────────────────────────────────────────── */

  "post /tqmes/pushCoke/listPage": listHandler(
    () => PUSH_COKE,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "ovenNo"],
          ["keyword", "remark"],
          ["keyword", "team"],
        ]),
        eq(q, [
          ["ovenNo", "ovenNo"],
          ["shift", "shift"],
          ["team", "team"],
          ["process", "process"],
        ]),
        dayRange(q, "pushTime"),
      ),
  ),

  /* ── 焦炭质量与产量（TW0205）────────────────────────────────────────── */

  "post /tqmes/cokeQuality/listPage": listHandler(
    () => COKE_QUALITY,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "ovenNo"],
          ["keyword", "date"],
          ["keyword", "remark"],
        ]),
        eq(q, [
          ["ovenNo", "ovenNo"],
          ["shift", "shift"],
          ["process", "process"],
        ]),
        dayRange(q, "date"),
      ),
  ),

  /* ── 余热回收监控（TW0406）─────────────────────────────────────────────── */

  "post /tqmes/wasteHeat/listPage": listHandler(
    () => WASTE_HEAT,
    (q) =>
      allOf(
        like(q, [["keyword", "unitId"]]),
        eq(q, [
          ["unitId", "unitId"],
          ["status", "status"],
          ["process", "process"],
        ]),
        dayRange(q, "clock"),
      ),
  ),

  /** 某烧结机的当前余热快照（监控盘轮询） */
  "get /tqmes/wasteHeat/current": getHandler((q) => {
    const unitId = String(q.unitId ?? "");
    const rows = WASTE_HEAT.filter((w) => !unitId || w.unitId === unitId);
    return rows.toSorted((a, b) => (a.clock < b.clock ? 1 : -1))[0] ?? null;
  }),

  /* ── 喷煤制粉运行（TW0605）─────────────────────────────────────────────── */

  "post /tqmes/pci/listPage": listHandler(
    () => PCI_RUNS,
    (q) =>
      allOf(
        like(q, [["keyword", "unitId"]]),
        eq(q, [
          ["unitId", "unitId"],
          ["status", "status"],
          ["process", "process"],
        ]),
        dayRange(q, "clock"),
      ),
  ),

  "get /tqmes/pci/current": getHandler((q) => {
    const unitId = String(q.unitId ?? "");
    const rows = PCI_RUNS.filter((w) => !unitId || w.unitId === unitId);
    return rows.toSorted((a, b) => (a.clock < b.clock ? 1 : -1))[0] ?? null;
  }),

  /* ── 热风炉运行（TW0607）───────────────────────────────────────────────── */

  "post /tqmes/hotStove/listPage": listHandler(
    () => HOT_STOVES,
    (q) =>
      allOf(
        like(q, [["keyword", "unitId"]]),
        eq(q, [
          ["unitId", "unitId"],
          ["mode", "mode"],
          ["stoveNo", "stoveNo"],
          ["process", "process"],
        ]),
        dayRange(q, "clock"),
      ),
  ),

  /**
   * 某高炉四座热风炉的当前状态（换炉表按**炉号**而不是时间排——
   * 一屏要能读出「这会儿哪两座在送风」）。
   */
  "get /tqmes/hotStove/current": getHandler((q) => {
    const unitId = String(q.unitId ?? "");
    const pool = HOT_STOVES.filter((h) => !unitId || h.unitId === unitId);
    const latest = pool.toSorted((a, b) => (a.clock < b.clock ? 1 : -1))[0]?.clock;
    return pool.filter((h) => h.clock === latest).toSorted((a, b) => a.stoveNo.localeCompare(b.stoveNo));
  }),

  /* ── 工序六道的机组（运行参数页的机组切换）─────────────────────────────── */

  "get /tqmes/process/allUnits": listAll(() =>
    PROCESS_SEQ.map((p) => ({
      process: p,
      units: UNITS.filter((u) => processOf(u.id) === p).map((u) => ({ id: u.id, name: u.name, spec: u.spec ?? "" })),
    })),
  ),
};
