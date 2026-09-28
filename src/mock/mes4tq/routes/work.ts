import type { RouteMap } from "../../admin/core";
import { allOf, dayRange, eq, getHandler, like, listAll, listHandler, numRange } from "../query";
import {
  BLEND_PILES,
  BIN_CHANGES,
  COLLECT_DATA,
  DOWNTIMES,
  INPUTS,
  OUTPUTS,
  SUPPLIES,
  TANK_STOCKS,
} from "../data/work";
import { PROCESS_NAME, UNITS, WORKSHOPS, unitsOfProcess } from "../data/org";
import { silosWithState } from "../store";

/**
 * TW 工序作业的共享查询端点（35 页共用，**只查桩**）。
 *
 * 六道工序的料仓变料、投料、收料、停机、槽存、供料、采集数据**都在这里**，
 * 页面靠 `process` 参数分流——同一张表、同一套端点、六个工序各看各的切片。
 * 拆成六个端点会让 `TW0101` 与 `TW0601` 打两个路径却读同一张表，
 * 而工序统计页 `TW0701` 要的是**六个工序混在一起**的流水，那正是一个端点的证据。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const workRoutes: RouteMap = {
  /* ── 料仓变料（TW0101/0201/0301/0401/0501/0601 + TW0701 + TG0003 下钻）───── */

  "post /tqmes/binChange/listPage": listHandler(
    () => BIN_CHANGES,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "binCode"],
          ["keyword", "matrlId"],
          ["keyword", "operator"],
          ["keyword", "batchNo"],
        ]),
        eq(q, [
          ["process", "process"],
          ["binCode", "binCode"],
          ["matrlId", "matrlId"],
          ["operator", "operator"],
        ]),
        dayRange(q, "feedTime"),
      ),
  ),

  /**
   * 当前料仓状态（各工序「料仓变料」页的上半屏卡片墙）。
   *
   * **当前料种 = 初始料种 + 变料记录里最后一条改掉的品种**——
   * 这条链不能只看台账的 `matrlId`：那是一行静态配置，
   * 而演示要的正是「1#高炉 3#仓从焦炭切成了焦丁」这个**变化**。
   * 所以这里先取 `silosWithState()` 的台账状态，再用变料流水把料种覆盖一遍。
   *
   * `unitId` 不给就回全量；给了回该机组的仓（TW 各页按左树选中的机组取）。
   */
  "get /tqmes/binChange/current": getHandler((q) => {
    const unitId = q.unitId ? String(q.unitId) : "";
    const silos = unitId ? silosWithState(unitId) : UNITS.flatMap((u) => silosWithState(u.id));
    return silos.map((s) => {
      /* 该仓最近一次变料（按 `feedTime` 字典序，即时间序） */
      /* 用 reduce 取最新一条而不是 filter+sort：只要**最大值**，
         排一次全表是 O(n log n) 换一个序号，而本域全表 180 行 × 78 个仓会跑 14000 次 */
      const last = BIN_CHANGES.reduce(
        (acc, b) => (b.binCode === s.binCode && (!acc || b.feedTime > acc.feedTime) ? b : acc),
        undefined as (typeof BIN_CHANGES)[number] | undefined,
      );
      const matId = last?.matrlId || s.matrlId;
      return {
        ...s,
        matrlId: matId,
        feedTime: last?.feedTime ?? "",
        /* 变料占比：有配比的仓显示它，单料仓给 100 */
        nPercent: last?.nPercent ?? 100,
        workshopName: WORKSHOPS.find((w) => w.id === s.workshopCode)?.name ?? "",
      };
    });
  }),

  /* ── 投料实绩（TW0103/0202/0302/0402/0502/0602）─────────────────────────── */

  "post /tqmes/input/listPage": listHandler(
    () => INPUTS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "materialId"],
          ["keyword", "batchNo"],
          ["keyword", "lbId"],
          ["keyword", "stoveNo"],
        ]),
        eq(q, [
          ["process", "process"],
          ["unitId", "unitId"],
          ["workshopId", "workshopId"],
          ["materialId", "materialId"],
          ["shift", "shift"],
          ["team", "team"],
          ["dataType", "dataType"],
          ["dataStatus", "dataStatus"],
          ["bizState", "bizState"],
        ]),
        dayRange(q, "inputTime"),
        (row) => {
          const min = q.min === undefined || q.min === "" ? null : Number(q.min);
          const max = q.max === undefined || q.max === "" ? null : Number(q.max);
          if (min !== null && row.wetWeight < min) return false;
          if (max !== null && row.wetWeight > max) return false;
          return true;
        },
      ),
  ),

  "get /tqmes/input/detail": getHandler((q) => INPUTS.find((r) => r.id === String(q.id)) ?? null),

  /**
   * 按料批汇总（TW0602 的「料批视图」）。
   *
   * 高炉投料以**料批**为基本单元（规格书 B11 第 5 条：每次投入一罐原燃料），
   * 所以要有「按批聚合」的视图——一行看一个班的总投料量，而不是几十行明细。
   * `pljhId`（配料计划）为空的行不算进任何一批（那是补录，没有对应的计划）。
   */
  "get /tqmes/input/byBatch": getHandler((q) => {
    const process = q.process ? String(q.process) : "blast";
    const shift = q.shift ? String(q.shift) : "";
    const pool = INPUTS.filter((r) => r.process === process && (!shift || r.shift === shift));
    const by = new Map<string, { batchNo: string; qty: number; count: number; unitIds: string[]; team: string }>();
    for (const r of pool) {
      const cur = by.get(r.batchNo) ?? { batchNo: r.batchNo, qty: 0, count: 0, unitIds: [], team: "" };
      /* `dataStatus=1`（作废）的行**不计入合计**——作废的数据看得见、但算不进去，
         这正是 `dataType`/`dataStatus` 两列存在的意义 */
      if (r.dataStatus !== 1) {
        cur.qty += r.dryWeight;
        cur.count += 1;
      }
      if (!cur.unitIds.includes(r.unitId)) cur.unitIds.push(r.unitId);
      cur.team = r.team;
      by.set(r.batchNo, cur);
    }
    return [...by.values()]
      .map((x) => ({ ...x, qty: Math.round(x.qty * 100) / 100, unitId: x.unitIds.join("、") }))
      .toSorted((a, b) => b.qty - a.qty);
  }),

  /* ── 收料实绩（TW0104/0303/0403/0503/0603）─────────────────────────────── */

  "post /tqmes/output/listPage": listHandler(
    () => OUTPUTS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "materialId"],
          ["keyword", "batchNo"],
          ["keyword", "stoveNo"],
          ["keyword", "testNo"],
        ]),
        eq(q, [
          ["process", "process"],
          ["unitId", "unitId"],
          ["workshopId", "workshopId"],
          ["materialId", "materialId"],
          ["shift", "shift"],
          ["team", "team"],
          ["direction", "direction"],
          ["dataType", "dataType"],
          ["dataStatus", "dataStatus"],
        ]),
        dayRange(q, "outputTime"),
      ),
  ),

  "get /tqmes/output/detail": getHandler((q) => OUTPUTS.find((r) => r.id === String(q.id)) ?? null),

  /* ── 混匀料堆（TW0102 料堆管理 + TB0001 混匀配料计划的堆信息）─────────── */

  "post /tqmes/blendPile/listPage": listHandler(
    () => BLEND_PILES,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "pileNo"],
          ["keyword", "planId"],
          ["keyword", "storePositionId"],
          ["keyword", "remark"],
        ]),
        eq(q, [
          ["unitId", "unitId"],
          ["status", "status"],
          ["isVirtual", "isVirtual"],
          ["flagDel", "flagDel"],
        ]),
        dayRange(q, "begTime"),
      ),
  ),

  "get /tqmes/blendPile/detail": getHandler((q) => BLEND_PILES.find((r) => r.id === String(q.id)) ?? null),

  /* ── 停机记录（TW0305/0405/0606）───────────────────────────────────────── */

  "post /tqmes/downtime/listPage": listHandler(
    () => DOWNTIMES,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "unitId"],
          ["keyword", "remark"],
          ["keyword", "reason"],
        ]),
        eq(q, [
          ["process", "process"],
          ["unitId", "unitId"],
          ["type", "type"],
          ["reason", "reason"],
          ["status", "status"],
        ]),
        dayRange(q, "startTime"),
      ),
  ),

  "get /tqmes/downtime/detail": getHandler((q) => DOWNTIMES.find((r) => r.id === String(q.id)) ?? null),

  /* ── 槽存（TW0401 的右表「槽存」页签）────────────────────────────────────── */

  "post /tqmes/tankStock/listPage": listHandler(
    () => TANK_STOCKS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "matrlId"],
          ["keyword", "batchNo"],
        ]),
        eq(q, [
          ["workstationId", "workstationId"],
          ["workshopId", "workshopId"],
          ["matrlId", "matrlId"],
          ["shift", "shift"],
        ]),
        dayRange(q, "date"),
        numRange(q, "tankStock"),
      ),
  ),

  /* ── 供料作业记录（TW0105）─────────────────────────────────────────────── */

  "post /tqmes/supply/listPage": listHandler(
    () => SUPPLIES,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "toUnit"],
          ["keyword", "materialName"],
          ["keyword", "operator"],
        ]),
        eq(q, [
          ["shift", "shift"],
          ["status", "status"],
          ["fromUnit", "fromUnit"],
          ["toUnit", "toUnit"],
        ]),
        dayRange(q, "date"),
      ),
  ),

  /* ── 工艺采集数据（各工序页的「采集明细」下钻）───────────────────────────── */

  "post /tqmes/collectData/listPage": listHandler(
    () => COLLECT_DATA,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "lbId"],
          ["keyword", "batchNo"],
          ["keyword", "matrlId"],
        ]),
        eq(q, [
          ["process", "process"],
          ["workstationId", "workstationId"],
          ["tslSign", "tslSign"],
          ["status", "status"],
        ]),
        dayRange(q, "beginDate"),
      ),
  ),

  /* ── 质量明细下钻（实绩行点「检验项」时按业务 id 取）─────────────────────── */

  /* ── 工序字典（TW 各页的工序下拉与工序统计页的分组）─────────────────────── */

  "get /tqmes/twProcess/list": listAll(() =>
    Object.entries(PROCESS_NAME).map(([code, name]) => ({
      code,
      name,
      unitCount: unitsOfProcess(code).length,
    })),
  ),
};
