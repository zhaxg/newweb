import { requestClient } from "@/api/_core/request";

import type {
  AssetTransferInput,
  EmissionAccountRow,
  EmissionRecordDetail,
  MainAccountRow,
  PageResult,
  QuotaTradeRecordRow,
  QuotaTradeRow,
  ReductionAccountRow,
  ReductionRecordDetail,
  AccountRecordRow,
  TradeAccDetail,
} from "./types";

/**
 * 碳账户域接口（JNPF 碳资产 /business/** 的抄录）。
 *
 * 端点清单**不是猜的**——线上 chunk 里 `["'`](/api/business/...)["'`]` 全量正则抽出来的 21 条，
 * 再逐页挂 network 监听核对过请求与响应（2026-09-26）：
 *   查询 12 条（本文件全部实现）· 导出 7 条 · 划拨写 2 条（后两类只插桩，见文件尾）。
 *
 * url 写**去掉 /api 的原路径**，`withApiPrefix()` 统一补前缀（见 api/_core/request.ts）；
 * GET 带 query 用 `params`，与线上一致。
 */

/** 账户号参数名——线上每页不同，逐页实测确认（mainAccountNo / emissionAccountNo / ...） */
export type AccountNoKey = "mainAccountNo" | "emissionAccountNo" | "reductionAccountNo" | "tradeAccountNo";

/** 列表查询公共参数：分页 + 企业名称/账户号模糊（参数名 enterName 与上者，均实测确认） */
export interface AccountListQuery {
  currentPage?: number;
  pageSize?: number;
  enterName?: string;
  mainAccountNo?: string;
  emissionAccountNo?: string;
  reductionAccountNo?: string;
  tradeAccountNo?: string;
}

/** 记录子表查询参数：enterId 必填（线上如此），其余为可选筛选 */
export interface AccountRecordQuery extends AccountListQuery {
  enterId?: string;
  /** 来源（人工录入 / 系统对接）——线上参数名待核，按响应字段 sourceName 命名 */
  sourceName?: string;
  /** 变动类型（碳排/减排侧：增加/删除/修改）——同上，按响应字段 serviceName 命名 */
  serviceName?: string;
  /** 变动类型（配额/交易侧：新增/减少）——同上，按响应字段 changeFlagName 命名 */
  changeFlagName?: string;
  /** 日期范围起点（配额/交易记录面板的「日期」，ui-rules 要求区间拆成两个参数） */
  startTime?: string;
  /** 日期范围终点 */
  endTime?: string;
}

const B = "/business";

export const carbonApi = {
  /* ── 主列表（5 页） ───────────────────────────────────── */
  getMainAccounts(q?: AccountListQuery) {
    return requestClient.request<PageResult<MainAccountRow>>(`${B}/carbonAccount/list`, { method: "get", params: q });
  },
  getEmissionAccounts(q?: AccountListQuery) {
    return requestClient.request<PageResult<EmissionAccountRow>>(`${B}/carbonAccount/emissionList`, {
      method: "get",
      params: q,
    });
  },
  getReductionAccounts(q?: AccountListQuery) {
    return requestClient.request<PageResult<ReductionAccountRow>>(`${B}/carbonAccount/reductionList`, {
      method: "get",
      params: q,
    });
  },
  getQuotaAccounts(q?: AccountListQuery) {
    return requestClient.request<PageResult<QuotaTradeRow>>(`${B}/accountQuotaTrade/quotaList`, {
      method: "get",
      params: q,
    });
  },
  getTradeAccounts(q?: AccountListQuery) {
    return requestClient.request<PageResult<QuotaTradeRow>>(`${B}/accountQuotaTrade/tradeList`, {
      method: "get",
      params: q,
    });
  },

  /* ── 账户记录子表（4 页，点行展开） ─────────────────────── */
  getEmissionRecords(q?: AccountRecordQuery) {
    return requestClient.request<PageResult<AccountRecordRow>>(`${B}/accountRecord/emissionList`, {
      method: "get",
      params: q,
    });
  },
  getReductionRecords(q?: AccountRecordQuery) {
    return requestClient.request<PageResult<AccountRecordRow>>(`${B}/accountRecord/reductionList`, {
      method: "get",
      params: q,
    });
  },
  getQuotaRecords(q?: AccountRecordQuery) {
    return requestClient.request<PageResult<QuotaTradeRecordRow>>(`${B}/accountRecord/quotaAccList`, {
      method: "get",
      params: q,
    });
  },
  getTradeRecords(q?: AccountRecordQuery) {
    return requestClient.request<PageResult<QuotaTradeRecordRow>>(`${B}/accountRecord/tradeAccList`, {
      method: "get",
      params: q,
    });
  },

  /* ── 记录详情（子表行「详情」） ────────────────────────── */
  getEmissionRecordDetail(id: string) {
    return requestClient.request<EmissionRecordDetail>(`${B}/accountRecord/getEmissionInfo/${id}`, { method: "get" });
  },
  getReductionRecordDetail(id: string) {
    return requestClient.request<ReductionRecordDetail>(`${B}/accountRecord/getReductionInfo/${id}`, {
      method: "get",
    });
  },
  /** 配额与交易共用同一个端点，按 accountType 返回不同额外字段（见 types.ts 的 TradeAccDetail） */
  getTradeAccDetail(id: string) {
    return requestClient.request<TradeAccDetail>(`${B}/accountRecord/getTradeAccInfo/${id}`, { method: "get" });
  },

  /* ── 写操作：只插桩，不实现 ────────────────────────────────
     端点路径取自线上 chunk（静态提取），**没有在演示系统点过「确 定」**，避免产生真实写入。
     mock 侧回 `ok(config, null)` 表示成功，不落库、不校验。 */
  quotaTransfer(data: AssetTransferInput) {
    return requestClient.request<null>(`${B}/accountQuotaTrade/quotaTransfer`, { method: "post", data });
  },
  tradeTransfer(data: AssetTransferInput) {
    return requestClient.request<null>(`${B}/accountQuotaTrade/tradeTransfer`, { method: "post", data });
  },

  /* ── 导出：只插桩（POST + blob，mock 回空成功） ────────────── */
  exportMainList(data?: unknown) {
    return requestClient.request<null>(`${B}/carbonAccount/exportMainList`, { method: "post", data });
  },
  exportEmissionList(data?: unknown) {
    return requestClient.request<null>(`${B}/carbonAccount/exportEmissionList`, { method: "post", data });
  },
  exportReductionList(data?: unknown) {
    return requestClient.request<null>(`${B}/carbonAccount/exportReductionList`, { method: "post", data });
  },
  exportQuotaList(data?: unknown) {
    return requestClient.request<null>(`${B}/accountQuotaTrade/exportQuotaList`, { method: "post", data });
  },
  exportTradeList(data?: unknown) {
    return requestClient.request<null>(`${B}/accountQuotaTrade/exportTradeList`, { method: "post", data });
  },
  exportEmissionRecords(data?: unknown) {
    return requestClient.request<null>(`${B}/accountRecord/emissionExportList`, { method: "post", data });
  },
  exportReductionRecords(data?: unknown) {
    return requestClient.request<null>(`${B}/accountRecord/reductionExportList`, { method: "post", data });
  },
};
