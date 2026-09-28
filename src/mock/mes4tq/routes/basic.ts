import type { RouteMap } from "../../admin/core";
import {
  FACTORIES,
  MATERIALS,
  PROCESS_NAME,
  SILO_BINS,
  UNITS,
  WORKSHOPS,
  processOf,
  unitsOfProcess,
} from "../data/org";
import { siloState } from "../data/model";
import { SHIFTS, SHIFT_NAME, TEAMS, PERSON_BY_ID } from "../data/people";
import { SHIFT_RULES, SHIFT_PLAN_CACHE, TECH_INDICATORS } from "../data/basic";
import { allOf, dayRange, eq, getHandler, like, listAll, listHandler } from "../query";

/**
 * TG 基础配置的查询端点（5 页，P0）。
 *
 * **只查桩**：全部是 `listPage` / `list` / `detail`，没有一个写端点——
 * 规格范围是「增删改不做」，所以连 `save`/`remove` 都不定义
 * （定义了没人调用等于没人验证过的代码）。
 *
 * 分工：
 * - `unit` / `material` / `silo` 三组的种子在 `data/org.ts`（它们是全站主数据，
 *   TW/TB/TS 都要读，不能埋在 TG 模块里）；
 * - `shift` / `indicator` 两组的种子在 `data/basic.ts`（只有 TG 用）；
 * - 料仓的**当前料位**在响应时才调 `siloState()` 算——它依赖演示日，
 *   放进种子就会在装配那一刻固化，改了 `DEMO_T0` 也刷不出来。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const basicRoutes: RouteMap = {
  /* ── TG0001 产线维护（L2 左树右表）─────────────────────────────────── */

  /**
   * 机组列表（右表）。`workshopId` 精确匹配是"点了车间只看本车间"，
   * 但点**工厂**时 `workshopId` 匹配不到——工厂下有多个车间。
   * 所以这里额外认 `factoryId`，两维都能筛（右表标题会显示当前选中层级）。
   */
  "post /tqmes/unit/listPage": listHandler(
    () => UNITS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "name"],
          ["keyword", "spec"],
        ]),
        eq(q, [
          ["workshopId", "workshopId"],
          ["type", "type"],
          ["enabled", "enabled"],
        ]),
        (row) => {
          if (!q.factoryId) return true;
          const ws = WORKSHOPS.find((w) => w.id === row.workshopId);
          return ws?.factoryId === q.factoryId;
        },
      ),
  ),

  /**
   * 组织扁平表（左树的数据源，一次拉全，前端按 `parentId` 组树）。
   * 为什么不给一个 `tree` 端点：树的三级深度是固定的（工厂→车间→机组），
   * 前端组一次比后端递归省事，而且本域还有 `silo`/`store` 两棵树，
   * 一套「拉平表 + 前端组树」的写法比每个树各写一个端点更好复用。
   */
  "get /tqmes/org/list": getHandler(() => [
    ...FACTORIES.map((f) => ({ id: f.id, name: f.name, parentId: "", level: 1, kind: "factory" })),
    ...WORKSHOPS.map((w) => ({ id: w.id, name: w.name, parentId: w.factoryId, level: 2, kind: "workshop" })),
    ...UNITS.map((u) => ({
      id: u.id,
      name: u.name,
      parentId: u.workshopId,
      level: 3,
      kind: "unit",
      type: u.type,
      spec: u.spec ?? "",
      workshopId: u.workshopId,
      factoryId: WORKSHOPS.find((w) => w.id === u.workshopId)?.factoryId ?? "",
      enabled: u.enabled ?? true,
      capacity: u.capacity ?? 0,
      onlineDate: u.onlineDate ?? "",
      remark: u.remark ?? "",
    })),
  ]),

  /** 机组全量（各页机组下拉；工序下拉由 `process=` 传进来才按工序过滤） */
  "get /tqmes/unit/list": listAll(() => UNITS),

  "get /tqmes/unit/detail": getHandler((q) => UNITS.find((u) => u.id === String(q.id)) ?? null),

  /* ── TG0002 物料管理 ───────────────────────────────────────────────── */

  "post /tqmes/material/listPage": listHandler(
    () => MATERIALS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "name"],
          ["keyword", "group"],
          ["keyword", "unit"],
        ]),
        eq(q, [
          ["group", "group"],
          ["type", "type"],
          ["enabled", "enabled"],
        ]),
      ),
  ),

  "get /tqmes/material/list": listAll(() => MATERIALS),

  "get /tqmes/material/detail": getHandler((q) => MATERIALS.find((m) => m.id === String(q.id)) ?? null),

  /* ── TG0003 料仓管理（L2 左树右表）──────────────────────────────────── */

  /**
   * 料仓台账（右表）。**料位与当前存量是响应时现算的**（见文件头说明）。
   *
   * `unitId` 是 TG0003 左树的选中条件；TW 各工序的料仓页也走这一条，
   * 靠 `unitId` 限定到本工序的机组——同一个实体、同一份台账，六个工序各看各的。
   */
  "post /tqmes/silo/listPage": listHandler(
    () =>
      SILO_BINS.map((b) => {
        const st = siloState(b.binCode);
        return {
          ...b,
          /* 列名按语义给，不照 `binCode` 需要前端再翻译一次 */
          unitName: UNITS.find((u) => u.id === b.workstationCode)?.name ?? "",
          workshopName: WORKSHOPS.find((w) => w.id === b.workshopCode)?.name ?? "",
          levelPct: st.levelPct,
          stock: st.stock,
          hiLimit: st.hiLimit,
          loLimit: st.loLimit,
          /* 料位危险状态供行内标签直接取色（高/低都危险，见 cells.ts 的 levelBarRenderer） */
          levelState: st.levelPct >= st.hiLimit || st.levelPct <= st.loLimit ? "报警" : "正常",
        };
      }),
    (q) =>
      allOf(
        like(q, [
          ["keyword", "binCode"],
          ["keyword", "binName"],
          ["keyword", "matrlId"],
          ["keyword", "product"],
        ]),
        eq(q, [
          ["workstationCode", "workstationCode"],
          ["workshopCode", "workshopCode"],
          ["factoryCode", "factoryCode"],
          ["matrlId", "matrlId"],
        ]),
        (row) => {
          /* 料位区间筛（TG0003 的「料位 ≥90%」）——只给 min 就是 ≥，只给 max 就是 ≤ */
          const min = q.minLevel === undefined || q.minLevel === "" ? null : Number(q.minLevel);
          const max = q.maxLevel === undefined || q.maxLevel === "" ? null : Number(q.maxLevel);
          if (min !== null && row.levelPct < min) return false;
          if (max !== null && row.levelPct > max) return false;
          return true;
        },
      ),
  ),

  "get /tqmes/silo/list": listAll(() => SILO_BINS),

  /** 按机组取料仓（左树选中某个机组时用；不带 unitId 就回全量） */
  "get /tqmes/silo/byUnit": getHandler((q) =>
    SILO_BINS.filter((b) => !q.unitId || b.workstationCode === String(q.unitId)),
  ),

  /* ── TG0004 排班配置（四张表同屏）─────────────────────────────────── */

  /**
   * 班组（含班长姓名）。**姓名冗余进响应**：班表是给人看的，
   * 让页面再按 `leaderId` 查一次人名是白费一次请求，而且离线时班表会显示成一串 U-01。
   */
  "get /tqmes/shift/teams": listAll(() =>
    TEAMS.map((t) => ({
      ...t,
      leaderName: PERSON_BY_ID[t.leader]?.name ?? "",
      postName: PERSON_BY_ID[t.leader]?.post ?? "",
    })),
  ),

  /** 班次（A/B/C）。`SHIFT_NAME` 一起给，省页面再翻一次字典 */
  "get /tqmes/shift/shifts": listAll(() => SHIFTS.map((s) => ({ ...s, label: `${s.code} ${SHIFT_NAME[s.code]}` }))),

  "get /tqmes/shift/rules": listAll(() => SHIFT_RULES),

  /**
   * 排班结果（L1 右表）。日期区间筛走 `dayRange`（纯日期字段、没有时分）。
   * 结果缓存在模块级：`shiftSchedules()` 每次调用都铺 14 天，
   * 但排班表在一次会话里不会变，缓存它避免每次翻页重铺。
   */
  "post /tqmes/shift/listPage": listHandler(
    () => SHIFT_PLAN_CACHE,
    (q) =>
      allOf(
        dayRange(q, "date"),
        eq(q, [
          ["shift", "shift"],
          ["teamId", "teamId"],
          ["date", "date"],
        ]),
      ),
  ),

  /* ── TG0005 指标维护（技经指标定义）────────────────────────────────── */

  "post /tqmes/indicator/listPage": listHandler(
    () => TECH_INDICATORS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "indicatorName"],
          ["keyword", "unit"],
          ["keyword", "formula"],
        ]),
        eq(q, [
          ["process", "process"],
          ["granularity", "granularity"],
          ["enabled", "enabled"],
        ]),
      ),
  ),

  "get /tqmes/indicator/list": listAll(() => TECH_INDICATORS),

  /* ── 工序字典（TG0001 / TG0003 / TW 各页的工序下拉共用一条）────────── */

  /**
   * 六道工序的字典。**为什么是端点而不是页面 `import` 常量**：
   * 工序名要同时出现在下拉、表头标签、详情弹窗、大屏图例四处，
   * 页面各 import 一份常量，改一个工序名要改六处页面
   * —— 候选走端点后，`data/org.ts` 的 `PROCESS_NAME` 是唯一真源。
   */
  "get /tqmes/process/list": listAll(() =>
    Object.entries(PROCESS_NAME).map(([code, name]) => ({
      code,
      name,
      /* 机组数与料仓数随工序带出来，下拉的**尾随文本**能直接显示「烧结工序 · 2机组 · 8仓」 */
      unitCount: unitsOfProcess(code).length,
      siloCount: SILO_BINS.filter((b) => processOf(b.workstationCode ?? "") === code).length,
    })),
  ),

  /** 某工序的机组（TW 各页的机组下拉只列本工序，不给会把高炉列到烧结页上） */
  "get /tqmes/process/units": getHandler((q) =>
    q.process ? unitsOfProcess(String(q.process)).map((u) => ({ id: u.id, name: u.name, spec: u.spec ?? "" })) : UNITS,
  ),
};
