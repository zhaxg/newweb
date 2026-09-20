import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";

import type { Result } from "@/api/types";

/**
 * mock「服务端」核心：信封/响应包装、路由表类型与请求解析助手。
 * 各业务域在 src/api/mock/*.ts 里导出 RouteMap，由 mockAdapter.ts 合并为一张路由表。
 */

export const API_BASE = "/hmx.Service.Admin.Services";

export function envelope<T>(success: boolean, code: number, message: string, data: T): Result<T> {
  return { success, code, message, data };
}

export function respond<T>(
  config: InternalAxiosRequestConfig,
  status: number,
  body: Result<T>,
): AxiosResponse<Result<T>> {
  return { data: body, status, statusText: "", headers: {}, config };
}

export type Handler = (config: InternalAxiosRequestConfig) => AxiosResponse<Result<any>>;
export type RouteMap = Record<string, Handler>;

/** query 参数（adminApi 统一用 axios `params`，mock 下直接读 config.params） */
export function getParams(config: InternalAxiosRequestConfig): Record<string, any> {
  return (config.params ?? {}) as Record<string, any>;
}

/** JSON 请求体（data 经 request 拦截层后仍是原始对象/字符串） */
export function getBody<T>(config: InternalAxiosRequestConfig): T {
  const raw = config.data;
  if (typeof raw === "string") return JSON.parse(raw || "{}") as T;
  return (raw ?? {}) as T;
}

export function ok<T>(config: InternalAxiosRequestConfig, data: T): AxiosResponse<Result<T>> {
  return respond(config, 200, envelope(true, 0, "", data));
}

export function fail(
  config: InternalAxiosRequestConfig,
  code: number,
  message: string,
): AxiosResponse<Result<null>> {
  return respond(config, 200, envelope(false, code, message, null));
}

/** 关键字过滤（对给定字段列表做不区分大小写 includes） */
export function matchKeyword(row: Record<string, any>, keywords: string | undefined, fields: string[]): boolean {
  const kw = (keywords ?? "").trim().toLowerCase();
  if (!kw) return true;
  return fields.some((f) => String(row[f] ?? "").toLowerCase().includes(kw));
}
