import { requestClient } from "@/api/_core/request";

import type { PageResult } from "./types";

/**
 * 碳域剩余 48 页的通用查询/插桩入口。
 *
 * 为什么不给每个端点写一个具名方法：碳资产的查询端点有 57 个、形状高度一致
 * （要么 `GET ?currentPage=&pageSize=`，要么 `POST {currentPage,pageSize}`，回 `{total,rows}`），
 * 逐个铺开只是把同一段代码抄 57 遍，还得在 spec 里再引一遍。这里把差异收敛到
 * 「路径 + 方法 + 默认参数」，端点路径在各页 spec 里**原样写出**（即线上路径），可读性没有损失。
 *
 * url 写去掉 `/api` 的原路径，`withApiPrefix()` 统一补前缀（见 api/_core/request.ts）。
 */
const B = "/business";

/**
 * 生成一个查询函数。`defaults` 是该端点的固定参数
 * （线上就有，如日历的 `date`、年份状态的 `year`、企业授权的 `type`）。
 */
export function carbonQuery(
  path: string,
  method: "get" | "post" = "get",
  defaults?: Record<string, any>,
): (params?: Record<string, any>) => Promise<PageResult<any>> {
  return (params = {}) => {
    const merged = { ...defaults, ...params };
    return method === "post"
      ? requestClient.request<PageResult<any>>(`${B}${path}`, { method: "post", data: merged })
      : requestClient.request<PageResult<any>>(`${B}${path}`, { method: "get", params: merged });
  };
}

/**
 * 不带分页的查询：返回后端 data 本身（不是 `{total,rows}`）。
 * 目前只有领导驾驶舱那两个接口是这个形状——大屏不翻页，一次把汇总值全拿回来。
 */
export function carbonGet<T>(
  path: string,
  defaults?: Record<string, any>,
): (params?: Record<string, any>) => Promise<T> {
  return (params = {}) =>
    requestClient.request<T>(`${B}${path}`, { method: "get", params: { ...defaults, ...params } });
}

/**
 * 写操作 / 导出的**插桩**：请求照发（让接口链路是通的），mock 侧回成功信封但不落库。
 * 本次约定「只 mock 查询，增删改只插桩，不实现」。
 */
export function carbonStub(path: string, method: "get" | "post" = "post"): (data?: any) => Promise<unknown> {
  return (data) =>
    method === "get"
      ? requestClient.request<unknown>(`${B}${path}`, { method: "get" })
      : requestClient.request<unknown>(`${B}${path}`, { method: "post", data });
}
