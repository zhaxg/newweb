import type { RouteMap } from "../admin/core";
import { accountQuotaTradeRoutes } from "./accountQuotaTrade";
import { accountRecordRoutes } from "./accountRecord";
import { carbonAccountRoutes } from "./carbonAccount";
import { carbonListRoutes } from "./lists";
import { carbonWriteRoutes } from "./writes";

/**
 * 碳资产域 mock 的路由汇总。`mock/mockAdapter.ts` 只 `...carbonRoutes` 这一句——
 * 以后加模块/加端点都在本域内改，不再动适配器（与 mes4ddh 六域各出一个 *Routes 同构，
 * 只是碳是一个域，故先在本文件合并再对外暴露一个名字）。
 *
 * 分工：
 *   data/*.ts    查询种子（线上真实返回，抓取脚本 temp/capture-carbon-account.mjs）
 *   query.ts     分页 + 模糊过滤
 *   <controller> 按线上 controller 分文件的 RouteMap
 */
export const carbonRoutes: RouteMap = {
  /* 查询在前：写/导出占位里若有与查询同名的路径，查询必须赢（当前没有同名，顺序是防御性的） */
  ...carbonListRoutes,
  ...carbonAccountRoutes,
  ...accountQuotaTradeRoutes,
  ...accountRecordRoutes,
  ...carbonWriteRoutes,
};
