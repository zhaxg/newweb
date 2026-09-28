import type { PageResult } from "@/api/equipment/types";
import type { Handler } from "../admin/core";
import { getBody, ok } from "../admin/core";

/**
 * 设备域 mock 的查询小工具。
 *
 * 与 `src/mock/carbon/query.ts` 的**唯一实质差异**：这里的 `rows` 是 **getter**（`() => T[]`）而不是数组。
 * carbon 的种子是抓包来的静态快照，切片就是全部；设备域演示要求「领完料库存立刻少、关完工单健康度立刻升」，
 * handler 必须每次现读 `eam` 当前态——把数组传进来就等于在模块求值时拍了张快照，之后永远看到旧值。
 *
 * 放在 mock/equipment 而不是复用 carbon 那份：两个域的过滤语义不同（本域多一个「枚举精确匹配」），
 * 且跨域 import 会让「carbon 改一刀、设备跟着抖」。
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
 * 枚举精确匹配（状态/等级/类型这类下拉）。
 * 与 like 分开是刻意的：「运行」若走模糊，会把「故障停机」之外的行也留在结果里说不通，
 * 而 `状态=检` 这种半个词的输入本来就不该命中。
 */
export function eq<T>(params: AnyObj, pairs: readonly (readonly [string, string])[]) {
  return (row: T): boolean =>
    pairs.every(([param, field]) => {
      const needle = String(params[param] ?? "").trim();
      if (!needle) return true;
      const v = (row as AnyObj)[field];
      /* 布尔字段（enabled / lifeManaged）线上收 "true"/"false" 字符串，这里两种都认 */
      if (typeof v === "boolean") return String(v) === needle;
      return String(v ?? "") === needle;
    });
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

/** 纯日期（`YYYY-MM-DD`）区间：设备投运日期、履历事件日期这类没有时分的字段用这个 */
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

/** 谓词合取 */
export function allOf<T>(...preds: Array<(row: T) => boolean>) {
  return (row: T): boolean => preds.every((p) => p(row));
}

/**
 * 列表端点工厂：`POST /eam/<entity>/listPage`。
 * `filter` 拿到请求参数、返回一个谓词；不给就是全量分页。
 */
export function listHandler<T>(rows: () => readonly T[], filter?: (q: AnyObj) => (row: T) => boolean): Handler {
  return (config) => {
    const q = getBody<AnyObj>(config) ?? {};
    const keep = filter ? filter(q) : undefined;
    return ok(config, paged(rows(), q, keep));
  };
}

/** 不分页的取全量（下拉候选、树、卡片墙） */
export function listAll<T>(rows: () => readonly T[]): Handler {
  return (config) => ok(config, rows());
}
