import type { PageResult } from "@/api/energy/types";
import type { Handler } from "../admin/core";
import { getBody, ok } from "../admin/core";

/**
 * 能源域 mock 的查询小工具（**自带一份，不 import 其他域**）。
 *
 * 与 `carbon`/`equipment` 的同名文件差别在两处：
 * 1. `rows` 是 **getter**（`() => T[]`）而不是数组。本域柜位、负荷、报警每 3s 抖一次，
 *    handler 必须每次现读 `ems` 当前态；把数组传进来等于在模块求值时拍了张快照。
 * 2. `inRange` 多出来：本域大量「数值 + 区间」筛选（柜位 ≥85%、评分 <70、负载率 0.8~1）。
 *
 * 为什么不跨域复用：三个域的过滤语义不同（本域要吃布尔、要吃数组字段 `mediaCodes`），
 * 跨域 import 会让「carbon 改一刀、能源跟着抖」。重复是刻意的代价，不是待清理的债。
 */

type AnyObj = Record<string, any>;

/** 服务端分页切片；越界回落到第 1 页（与平台其他域一致） */
export function paged<T>(all: readonly T[], params: AnyObj, keep?: (row: T) => boolean): PageResult<T> {
  const rows = keep ? all.filter(keep) : [...all];
  const size = Math.min(500, Math.max(1, Number(params.pageSize) || 20));
  const page = Math.max(1, Number(params.currentPage) || 1);
  const start = (page - 1) * size;
  return { total: rows.length, rows: rows.slice(start, start + size) };
}

/** 文本模糊（大小写不敏感、空参数不过滤） */
export function like<T>(params: AnyObj, pairs: readonly (readonly [string, string])[]) {
  return (row: T): boolean =>
    pairs.every(([param, field]) => {
      const needle = String(params[param] ?? "")
        .trim()
        .toLowerCase();
      if (!needle) return true;
      return String((row as AnyObj)[field] ?? "")
        .toLowerCase()
        .includes(needle);
    });
}

/**
 * 枚举/布尔精确匹配（状态、等级、介质编码、是否结算点这类下拉）。
 * 与 `like` 分开是刻意的：「活动」若走模糊会把别的行也留下，而 `状态=已` 这种半截输入本来就不该命中。
 */
export function eq<T>(params: AnyObj, pairs: readonly (readonly [string, string])[]) {
  return (row: T): boolean =>
    pairs.every(([param, field]) => {
      const needle = String(params[param] ?? "").trim();
      if (!needle) return true;
      const v = (row as AnyObj)[field];
      /* 布尔字段（enabled / isSettlement / forcedVerify）线上收 "true"/"false" 字符串，两种都认 */
      if (typeof v === "boolean") return String(v) === needle;
      return String(v ?? "") === needle;
    });
}

/**
 * 数组字段包含匹配：`mediaCodes`（用能单元涉及介质）这类列的筛选。
 * 走 `eq` 会要求整串相等（没人会去输 `["ELEC","BFG"]`），走 `like` 又会命中 `[...]` 的方括号噪声。
 */
export function hasOne<T>(params: AnyObj, param: string, field: string) {
  return (row: T): boolean => {
    const needle = String(params[param] ?? "").trim();
    if (!needle) return true;
    const v = (row as AnyObj)[field];
    return Array.isArray(v) ? v.map(String).includes(needle) : String(v ?? "") === needle;
  };
}

/** 日期区间（定长 `YYYY-MM-DD HH:mm:ss` → 字典序即时间序，不 new Date、不踩时区） */
export function dateRange<T>(params: AnyObj, field: string) {
  return (row: T): boolean => {
    const v = String((row as AnyObj)[field] ?? "");
    if (!v) return true;
    const s = String(params.startTime ?? "");
    if (s && v < s) return false;
    const e = String(params.endTime ?? "");
    if (e) {
      const end = e.length <= 10 || e.endsWith("00:00:00") ? `${e.slice(0, 10)} 23:59:59` : e;
      if (v > end) return false;
    }
    return true;
  };
}

/** 纯日期（`YYYY-MM-DD`）区间：实绩日期、下次检定日、生效月份这类没有时分的字段用这个 */
export function dayRange<T>(params: AnyObj, field: string) {
  return (row: T): boolean => {
    const v = String((row as AnyObj)[field] ?? "").slice(0, 10);
    if (!v) return true;
    const s = String(params.startTime ?? "").slice(0, 10);
    if (s && v < s) return false;
    const e = String(params.endTime ?? "").slice(0, 10);
    if (e && v > e) return false;
    return true;
  };
}

/** 数值区间：任一端为空则该侧不设限 */
export function numRange<T>(params: AnyObj, field: string, minKey = "min", maxKey = "max") {
  return (row: T): boolean => {
    const v = Number((row as AnyObj)[field]);
    if (!Number.isFinite(v)) return true;
    const lo = params[minKey];
    if (lo !== undefined && lo !== "" && Number.isFinite(Number(lo)) && v < Number(lo)) return false;
    const hi = params[maxKey];
    if (hi !== undefined && hi !== "" && Number.isFinite(Number(hi)) && v > Number(hi)) return false;
    return true;
  };
}

/** 单值比较（柜位「≥85%」、评分「<70」这种只有一端的筛选，比凑一对 min/max 语义清楚） */
export function cmp<T>(params: AnyObj, param: string, field: string, op: ">=" | "<=") {
  return (row: T): boolean => {
    const raw = String(params[param] ?? "").trim();
    if (!raw) return true;
    const limit = Number(raw);
    if (!Number.isFinite(limit)) return true;
    const v = Number((row as AnyObj)[field]);
    if (!Number.isFinite(v)) return true;
    return op === ">=" ? v >= limit : v <= limit;
  };
}

/** 谓词合取 */
export function allOf<T>(...preds: Array<(row: T) => boolean>) {
  return (row: T): boolean => preds.every((p) => p(row));
}

/**
 * 列表端点工厂：`POST /ems/<entity>/listPage`。
 * `filter` 拿到请求参数、返回一个谓词；不给就是全量分页。
 */
export function listHandler<T>(rows: () => readonly T[], filter?: (q: AnyObj) => (row: T) => boolean): Handler {
  return (config) => {
    const q = getBody<AnyObj>(config);
    const keep = filter ? filter(q) : undefined;
    return ok(config, paged(rows(), q, keep));
  };
}

/** 不分页的取全量（下拉候选、树、卡片墙） */
export function listAll<T>(rows: () => readonly T[]): Handler {
  return (config) => ok(config, rows());
}

/** GET 带 params 的视图端点 */
export function getHandler<T>(pick: (q: AnyObj) => T): Handler {
  return (config) => {
    const params = ((config.params ?? {}) as AnyObj) || {};
    return ok(config, pick(params));
  };
}

/** POST 动作端点：把 body 交给 `run`，返回值原样进信封（`ActionResult` 或纯数据） */
export function postHandler<T>(run: (body: AnyObj) => T): Handler {
  return (config) => ok(config, run(getBody<AnyObj>(config)));
}
