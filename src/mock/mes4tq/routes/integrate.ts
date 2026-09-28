import type { RouteMap } from "../../admin/core";
import { between } from "../data/model";
import {
  AREAS,
  COLLECT_POINTS,
  COLLECT_RESULTS,
  ENERGY_ROWS,
  INTERFACE_DEFS,
  INTERFACE_LOGS,
  POINT_BY_ID,
} from "../data/integrate";
import { allOf, eq, getHandler, like, listAll, listHandler, postHandler } from "../query";

/**
 * TI 系统集成的查询端点（4 页，P0）。**只查桩**，没有一个写端点。
 *
 * 这四页对外讲的是「我厂里的东西你怎么接进来、接得稳不稳、接错了谁负责」——
 * 所以数据必须能对上规格书 B10 的 13 个接口与 B1 的 7 个自控系统，
 * 客户拿自己的点表来核对时，得认得出西屋 Ovation、施耐德 MBE、和利时 OPC 这些。
 *
 * 路由键与 `src/api/mes4tq/index.ts` 已声明的方法**逐个对上**，那文件是契约。
 */
export const integrateRoutes: RouteMap = {
  /* ── TI0001 采集点位配置 ──────────────────────────────────────────── */

  "post /tqmes/collectPoint/listPage": listHandler(
    () => COLLECT_POINTS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "pointName"],
          ["keyword", "address"],
          ["keyword", "area"],
        ]),
        eq(q, [
          ["area", "area"],
          ["protocol", "protocol"],
          ["dataType", "dataType"],
          ["enabled", "enabled"],
        ]),
        (row) => {
          /* 上下限区间筛：`min`/`max` 只给一端就是单边 */
          const lo = q.min === undefined || q.min === "" ? null : Number(q.min);
          const hi = q.max === undefined || q.max === "" ? null : Number(q.max);
          if (lo !== null && row.upperLimit < lo) return false;
          if (hi !== null && row.lowerLimit > hi) return false;
          return true;
        },
      ),
  ),

  "get /tqmes/collectPoint/list": listAll(() => COLLECT_POINTS),

  /**
   * 按自控系统分区统计（统计卡）。
   *
   * `total` 是 B1 给的**该分区点位总数**、`sampled` 是本表实际铺的样本数。
   * 统计卡显示 `total`（4263 / 5000 / 3300…），表头注明「样本点位」——
   * 两个数不分开写，客户会以为 16000 多个点只接进来了 60 个。
   */
  "get /tqmes/collectPoint/byArea": listAll(() =>
    AREAS.map((a) => ({
      area: a.area,
      system: a.system,
      protocol: a.protocol,
      total: a.total,
      sampled: a.sampled,
      unitId: a.unitId ?? "",
      enabled: true,
    })),
  ),

  /* ── TI0002 采集结果查询（L5 实时监控盘）──────────────────────────── */

  "post /tqmes/collectResult/listPage": listHandler(
    () => COLLECT_RESULTS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "pointId"],
          ["keyword", "pointName"],
        ]),
        eq(q, [
          ["quality", "quality"],
          ["unitId", "unitId"],
        ]),
        (row) => {
          /* 「只看越限」是监控盘最常用的筛选——点它要比在 60 行里找红的快 */
          if (q.overLimit === "true" && !row.overLimit) return false;
          if (q.overLimit === "false" && row.overLimit) return false;
          return true;
        },
      ),
  ),

  /**
   * 一批点位的当前值（监控盘 5s 轮询）。
   *
   * **不带 `pointIds` 就回全量**：监控盘刚打开时还没选点，
   * 要求必填会让首屏空一拍。POST 是因为点位 id 可能上百个，塞 query 会撞 URL 长度。
   */
  "post /tqmes/collectResult/realtime": postHandler((body) => {
    const ids = Array.isArray(body.pointIds) && body.pointIds.length ? new Set(body.pointIds as string[]) : null;
    return ids ? COLLECT_RESULTS.filter((r) => ids.has(r.pointId)) : COLLECT_RESULTS;
  }),

  /**
   * 单点历史曲线（近 `hours` 小时）。
   *
   * 序列是**围绕该点当前值的确定性抖动**，越限点的历史会在越过上下限后回升
   * ——这样曲线看起来像「曾经冲出去又被拉回来」，比恒定一条直线有说服力，
   * 也不用真的维护一份时序库。
   */
  "get /tqmes/collectResult/history": getHandler((q) => {
    const pointId = String(q.pointId ?? "");
    const point = POINT_BY_ID[pointId];
    const current = COLLECT_RESULTS.find((r) => r.pointId === pointId);
    const hours = Math.min(48, Math.max(1, Number(q.hours) || 8));
    if (!point || !current) return { times: [], data: [] };
    const times: string[] = [];
    const data: number[] = [];
    for (let i = hours - 1; i >= 0; i -= 1) {
      const h = i % 24;
      times.push(`${String(h).padStart(2, "0")}:00`);
      /* 越限点在 3 小时前越限，随后回落——与 `overLimit` 的现状自洽 */
      const spike = current.overLimit && i <= 3;
      data.push(Math.round(between(current.value * 0.94, current.value * 1.06, `hist|${pointId}|${h}|${i}`, 1)));
      if (spike) data[data.length - 1] = Math.round(current.value * 1.04);
    }
    return { times, data };
  }),

  /* ── TI0003 接口日志监控 ──────────────────────────────────────────── */

  "post /tqmes/interfaceLog/listPage": listHandler(
    () => INTERFACE_LOGS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "id"],
          ["keyword", "interfaceName"],
          ["keyword", "sourceSystem"],
          ["keyword", "errorMsg"],
        ]),
        eq(q, [
          ["interfaceName", "interfaceName"],
          ["direction", "direction"],
          ["status", "status"],
        ]),
        (row) => {
          const s = String(q.startTime ?? "");
          const e = String(q.endTime ?? "");
          /* 日志只按日筛（`dayRange` 语义），带时分的区间也先截到日——
             否则「9-26 08:00 ~ 9-26 19:00」会把当天凌晨的日志全筛掉，看着像没数据 */
          const d = row.timestamp.slice(0, 10);
          if (s && d < s.slice(0, 10)) return false;
          if (e && d > e.slice(0, 10)) return false;
          return true;
        },
      ),
  ),

  "get /tqmes/interfaceLog/detail": getHandler((q) => INTERFACE_LOGS.find((l) => l.id === String(q.id)) ?? null),

  /**
   * 各接口的成功率（统计卡与顶部健康条）。
   * `rate` 只算到两位小数——104 条样本给 99.999% 是假精度。
   */
  "get /tqmes/interfaceLog/health": listAll(() =>
    INTERFACE_DEFS.map((d) => {
      const logs = INTERFACE_LOGS.filter((l) => l.interfaceName === d.name);
      const fail = logs.filter((l) => l.status === "失败").length;
      return {
        interfaceName: d.name,
        method: d.method,
        dir: d.dir,
        total: logs.length,
        fail,
        rate: Math.round(((logs.length - fail) / Math.max(1, logs.length)) * 10000) / 100,
      };
    }),
  ),

  /* ── TI0004 能源数据接口（接收 EMS 下抛的水电气）────────────────────── */

  "post /tqmes/energyInterface/listPage": listHandler(
    () => ENERGY_ROWS,
    (q) =>
      allOf(
        like(q, [
          ["keyword", "medium"],
          ["keyword", "id"],
          ["keyword", "remark"],
        ]),
        eq(q, [
          ["medium", "medium"],
          ["date", "date"],
          ["shift", "shift"],
          ["status", "status"],
        ]),
        (row) => {
          const s = String(q.startTime ?? "");
          const e = String(q.endTime ?? "");
          if (s && row.date < s.slice(0, 10)) return false;
          if (e && row.date > e.slice(0, 10)) return false;
          return true;
        },
      ),
  ),

  /**
   * 按介质汇总（TI0004 顶部汇总卡 + TW0702 的工序汇总共用一条读取）。
   *
   * `status="失败"` 的行**不计入合计**：EMS 没推到的那班数据在明细里是「缺」不是 0，
   * 合计里也必须缺——把它当 0 会悄悄少算一笔能源成本，而客户对账时第一个发现的
   * 就是这类「看起来对得上、其实少了一笔」的账。
   */
  "get /tqmes/energyInterface/byMedium": getHandler((q) => {
    const from = q.startTime ? String(q.startTime).slice(0, 10) : "";
    const to = q.endTime ? String(q.endTime).slice(0, 10) : "";
    const pool = ENERGY_ROWS.filter((r) => r.status === "成功" && (!from || r.date >= from) && (!to || r.date <= to));
    const by = new Map<string, { medium: string; unit: string; qty: number; stdCoal: number; amount: number }>();
    for (const r of pool) {
      const cur = by.get(r.medium) ?? { medium: r.medium, unit: r.unit, qty: 0, stdCoal: 0, amount: 0 };
      cur.qty += r.qty ?? 0;
      cur.stdCoal += r.stdCoal ?? 0;
      cur.amount += r.amount ?? 0;
      by.set(r.medium, cur);
    }
    return [...by.values()].map((x) => ({
      ...x,
      qty: Math.round(x.qty * 10) / 10,
      stdCoal: Math.round(x.stdCoal * 100) / 100,
      amount: Math.round(x.amount * 100) / 100,
    }));
  }),
};
