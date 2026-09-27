import { requestClient } from "@/api/_core/request";

import type { ActionResult, AlarmRule, EnergyMedium, PageResult, Person, PriceTemplate, UsingUnit } from "./types";

/**
 * 能源管理（EMS）演示域接口层。
 *
 * **命名空间 `/ems`**：接口前缀是租户识别的一部分——碳资产占用 `/business/**`、
 * 设备域占用 `/eam/**`，能源域再共用任一都会让 mock 路由表出现同名键、
 * 将来接真实后端时两套端点互相遮蔽。`/ems` 是钢铁行业 Energy Management System 的通用缩写。
 *
 * 三条约定（与平台其他演示域同形，但**代码各自一份、不跨域 import**）：
 * 1. 列表统一 **POST `listPage`**，参数 `{currentPage,pageSize,...条件}`，回 `{total,rows}`；
 * 2. 写操作调 store 的联动方法并**返回受影响的行**，页面拿到返回值即可刷新；
 *    业务拒绝走 `HTTP 200 + {ok:false,msg}`（见 `ActionResult`），不走 HTTP 错误；
 * 3. 返回体一律是 `./types` 里声明的契约类型。
 *
 * url 写**去掉 `/api` 的原路径**，`withApiPrefix()` 统一补前缀（`src/api/_core/request.ts`）。
 */
const B = "/ems";

/* ── 通用工厂 ─────────────────────────────────────────────────────────── */

/** 列表查询：`emsList<EnergyMedium>("/medium")` → 打 `/ems/medium/listPage` */
export function emsList<T>(entity: string): (q?: Record<string, any>) => Promise<PageResult<T>> {
  return (q = {}) => requestClient.request<PageResult<T>>(`${B}${entity}/listPage`, { method: "post", data: q });
}

/** 无分页取全量（下拉候选、树、卡片墙） */
export function emsGet<T>(path: string, params?: Record<string, any>): Promise<T> {
  return requestClient.request<T>(`${B}${path}`, { method: "get", params });
}

/** 动作类 POST：请求体原样送，响应是「受影响的数据 + 可读结果」 */
export function emsPost<T>(path: string, data?: Record<string, any>): Promise<T> {
  return requestClient.request<T>(`${B}${path}`, { method: "post", data });
}

/* ── 共用候选 ─────────────────────────────────────────────────────────── */

/**
 * 人名候选（报警接收人、补录人、校核人、调度签发人的下拉都读它）。
 *
 * 为什么走接口而不是页面写死名单：energy.md B3 给了一套人名（张调/刘调/老周/陈值星…），
 * 演示叙事要求「谁签发、谁接收」在全站是同一批人。写死在页面里就会出现调度令页的接收人
 * 和报警页的接收人对不上，而这种不一致正是这份规格书点名的唯一硬红线。
 */
export const personApi = {
  list: () => emsGet<Person[]>("/person/list"),
};

/** 介质下拉（几乎每页的过滤器都要它） */
export const mediumApi = {
  list: () => emsGet<EnergyMedium[]>("/medium/list"),
  page: emsList<EnergyMedium>("/medium"),
  save: (d: Record<string, any>) => emsPost<ActionResult<EnergyMedium>>("/medium/save", d),
  remove: (id: string) => emsPost<ActionResult>("/medium/remove", { id }),
};

/**
 * 导出（模拟）。
 *
 * 刻意回一个**文件名**而不是 `null`：页面 toast 里念出「能耗实绩_2026-09.csv 已提交导出队列」，
 * 比一句干巴巴的「操作成功」像真的。不落盘、不生成内容——演示到此为止，
 * 真接后端时这个端点换成返回下载链接，页面零改动。
 */
export function exportRows(entity: string, params: Record<string, any> = {}): Promise<ActionResult> {
  return emsPost<ActionResult>("/export", { entity, ...params });
}

/* ── EG 基础配置 ──────────────────────────────────────────────────────── */

export const unitApi = {
  list: () => emsGet<UsingUnit[]>("/unit/list"),
  /** 四级树（EC0001 计量网络、EG0002 单元维护、EC0005 测点选择器共用同一份） */
  tree: (rootId?: string) => emsGet<UsingUnit[]>("/unit/tree", rootId ? { rootId } : undefined),
  page: emsList<UsingUnit>("/unit"),
  save: (d: Record<string, any>) => emsPost<ActionResult<UsingUnit>>("/unit/save", d),
  /** 层级移动（EG0002 把拖拽简化成上移/下移/换父级三个按钮） */
  move: (d: { id: string; dir: "up" | "down" | "in" | "out" }) => emsPost<ActionResult>("/unit/move", d),
};

export const alarmRuleApi = {
  page: emsList<AlarmRule>("/alarmRule"),
  save: (d: Record<string, any>) => emsPost<ActionResult<AlarmRule>>("/alarmRule/save", d),
  remove: (id: string) => emsPost<ActionResult>("/alarmRule/remove", { id }),
  toggle: (id: string) => emsPost<ActionResult<AlarmRule>>("/alarmRule/toggle", { id }),
};

export const priceTemplateApi = {
  page: emsList<PriceTemplate>("/priceTemplate"),
  save: (d: Record<string, any>) => emsPost<ActionResult<PriceTemplate>>("/priceTemplate/save", d),
  /** 启停：同一时刻只允许一个生效模板，端点里做互斥（两个都"生效"是电价页最丢人的错误） */
  toggle: (id: string) => emsPost<ActionResult<PriceTemplate>>("/priceTemplate/toggle", { id }),
};
