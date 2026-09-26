import type { PageResult } from "@/api/carbon/types";

/**
 * 碳域 mock 的查询小工具（分页 + 模糊过滤），三个域路由文件共用。
 * 放这儿而不是 data/ ——它是路由侧逻辑，不是数据（README「Mock 目录规范」把数据与路由分开的同一条理由）。
 */

type AnyObj = Record<string, any>;

/** 按 currentPage/pageSize 切片（线上就是服务端分页，参数名相同）；越界回落到第 1 页 */
export function paged<T>(all: T[], params: AnyObj, keep?: (row: T) => boolean): PageResult<T> {
  const rows = keep ? all.filter(keep) : all;
  const size = Math.min(500, Math.max(1, Number(params.pageSize) || 20));
  const page = Math.max(1, Number(params.currentPage) || 1);
  const start = (page - 1) * size;
  return { total: rows.length, rows: rows.slice(start, start + size) };
}

/**
 * 生成模糊过滤器：`pairs` 是 [query 参数名, 行字段名]。
 * 参数名与线上一致（实测确认：enterName / mainAccountNo / emissionAccountNo / reductionAccountNo / tradeAccountNo）。
 * 空参数不过滤；全部命中才算（AND）。
 */
export function fuzzy<T>(params: AnyObj, pairs: readonly (readonly [string, string])[]) {
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

/** 谓词合取：把 fuzzy / dateRange 这类片段拼成一个 keep */
export function allOf<T>(...preds: Array<(row: T) => boolean>) {
  return (row: T): boolean => preds.every((p) => p(row));
}

/**
 * 日期区间过滤（配额/交易记录面板的「日期」）。时间字段形如 "2026-08-31 14:49:46"，
 * 定长同格式 → 字典序即时间序，直接比字符串，不 new Date（省一次解析、也不会踩时区）。
 *
 * DatePicker 带 show-time，用户只选日期时时分秒是 00:00:00——那样「8/1~8/31」会把 8/31 当天的
 * 记录全滤掉，所以终点若正好是 00:00:00 就补到当天 23:59:59。
 */
export function dateRange<T>(params: AnyObj, field: keyof T & string) {
  return (row: T): boolean => {
    const v = String(row[field] ?? "");
    const s = String(params.startTime ?? "");
    if (s && v && v < s) return false;
    const e = String(params.endTime ?? "");
    if (e && v) {
      const end = e.length <= 10 || e.endsWith("00:00:00") ? `${e.slice(0, 10)} 23:59:59` : e;
      if (v > end) return false;
    }
    return true;
  };
}

/** 数值区间过滤（生产用料页的「排放因子 MIN/MAX」）：任一端为空则该侧不设限 */
export function numRange<T>(params: AnyObj, field: keyof T & string, minKey: string, maxKey: string) {
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

/** 按 id 取详情；查不到由调用方回 fail（线上同场景回 HTTP 200 + code 400「系统异常」） */
export function findById<T extends { id: string }>(rows: T[], id: string | undefined): T | undefined {
  if (!id) return undefined;
  return rows.find((r) => r.id === id);
}
