import { requestClient } from "@/api/_core/request";

import type {
  ActionResult,
  AlarmBoardDto,
  AlarmLevel,
  AlarmRule,
  CollectChannel,
  DispatchOrder,
  DispatchSuggestion,
  EnergyAlarm,
  EnergyMedium,
  GasHolder,
  GasPlantViewDto,
  GasScenarioDto,
  GasSimViewDto,
  GasViewDto,
  Instrument,
  MeterPoint,
  PageResult,
  Person,
  PointHistoryResult,
  PointReading,
  PowerViewDto,
  PriceTemplate,
  QualityTicket,
  SteamViewDto,
  UsingUnit,
} from "./types";

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

/* ── EC 采集层 ──────────────────────────────────────────────────────────── */

/** 计量点（EC0001 网络树叶子、EC0005 曲线来源、EP0002 重算输入） */
export const meterPointApi = {
  list: () => emsGet<MeterPoint[]>("/meterPoint/list"),
  page: emsList<MeterPoint>("/meterPoint"),
  save: (d: Record<string, any>) => emsPost<ActionResult<MeterPoint>>("/meterPoint/save", d),
  remove: (id: string) => emsPost<ActionResult>("/meterPoint/remove", { id }),
};

export const channelApi = {
  list: () => emsGet<CollectChannel[]>("/channel/list"),
  page: emsList<CollectChannel>("/channel"),
  save: (d: Record<string, any>) => emsPost<ActionResult<CollectChannel>>("/channel/save", d),
  remove: (id: string) => emsPost<ActionResult>("/channel/remove", { id }),
  /** ▶模拟中断：整站影响面最大的一个按钮（关联实绩置缺失、待补传累积、发级别3报警） */
  break: (id: string) => emsPost<ActionResult>("/channel/break", { id }),
  /** ▶瞬间抖动：掉一拍立刻自恢复，走的是"恢复回填"那条支路 */
  flap: (id: string) => emsPost<ActionResult>("/channel/flap", { id }),
  /** 一键复归：所有非在线通道恢复 + 回填中断期间的缺失实绩 */
  restore: () => emsPost<ActionResult>("/channel/restore", {}),
};

export const instrumentApi = {
  page: emsList<Instrument>("/instrument"),
  save: (d: Record<string, any>) => emsPost<ActionResult<Instrument>>("/instrument/save", d),
  /** 检定登记：`nextVerifyAt` 省略则按台账上的强检周期自己推算（周期只在 EC0004 一处） */
  verify: (id: string, nextVerifyAt?: string) =>
    emsPost<ActionResult<Instrument>>("/instrument/verify", nextVerifyAt ? { id, nextVerifyAt } : { id }),
  fault: (id: string) => emsPost<ActionResult<Instrument>>("/instrument/fault", { id }),
  /**
   * 手动重扫检定有效期：逐台按下次检定日**重算状态**并回计数。
   * 超期报警在装配时已由 `scanVerifyDeadlines()` 发过一轮（同点同级的未关闭报警不重复发），
   * 所以这个按钮给的是「现在扫一遍是什么结果」，不是「再制造一批报警」。
   */
  scan: () => emsPost<ActionResult<{ overdue: number; soon: number }>>("/instrument/scan", {}),
};

export const qualityApi = {
  page: emsList<QualityTicket>("/quality"),
  /** ▶生成当日异常：判据与倍率在 `model.QUALITY_INJECT`，页面不给数 */
  gen: (date?: string) => emsPost<ActionResult>("/quality/gen", date ? { date } : {}),
  fill: (id: string, value?: number) => emsPost<ActionResult<QualityTicket>>("/quality/fill", { id, value }),
  check: (id: string) => emsPost<ActionResult<QualityTicket>>("/quality/check", { id }),
  invalid: (id: string, reason?: string) => emsPost<ActionResult>("/quality/void", { id, reason }),
};

/**
 * 实时读数与历史曲线（EC0005）。三个都是 POST：测点 id 列表可能上百个，塞 query 会撞 URL 长度。
 *
 * `tick`（推进演示时钟一拍）与 `realtime`（读当前读数）**刻意是两个端点**：
 * 合并成一个的话，任何"只想看一眼"的调用都在偷偷推全站时钟——柜位、负荷、待补传一起走，
 * EP0002 的"当日"会在客户眼皮底下变成第二天。月账层不受影响（`tickRealtime` 只动实时层）。
 */
export const pointApi = {
  tick: () => emsPost<{ step: number; ldgPct: number }>("/point/tick", {}),
  realtime: (pointIds: string[] = []) => emsPost<PointReading[]>("/point/realtime", { pointIds }),
  history: (pointIds: string[], days?: number) =>
    emsPost<PointHistoryResult>("/point/history", days ? { pointIds, days } : { pointIds }),
};

/* ── EM 监控与调度 ──────────────────────────────────────────────────────── */

/**
 * 四张画布。一个端点回「几何 + 已解析的数值 + 右侧表格」一整份，页面不发第二个请求。
 *
 * 为什么读端点全是 POST：`/gas` 要带介质，`/gas/simulate` 要带嵌套的 what-if 场景对象，
 * query 表达不了；本仓真实后端也是「查询走 POST」（AGENTS §6 网络层）。
 */
export const monitorApi = {
  power: () => emsPost<PowerViewDto>("/monitor/power", {}),
  gas: (media?: string) => emsPost<GasViewDto>("/monitor/gas", media ? { media } : {}),
  steam: () => emsPost<SteamViewDto>("/monitor/steam", {}),
  gasPlant: () => emsPost<GasPlantViewDto>("/monitor/gasplant", {}),
  /** 柜与柜位（下拉与柜体填充用；画布里的柜位已随 scene 给出） */
  holders: () => emsGet<GasHolder[]>("/holder/list"),
  /** 24 点负荷/煤气预测线（EM0001 的次日计划线与 EM0007 的预测图同一个来源） */
  forecast: () => emsGet<{ load: GasSimViewDto["load"]; gas: GasSimViewDto["gas"] }>("/gas/forecast"),
  /**
   * 推进实时层一拍。**刻意复用 `/point/tick` 而不是新开一个端点**：
   * 全站只有一个演示时钟，多一个名字就是多一处「谁在推时钟」的疑问（AGENTS 网络层那条也说了查询走 POST）。
   */
  tick: () => emsPost<{ step: number; ldgPct: number }>("/point/tick", {}),
};

/**
 * EM0007 煤气平衡仿真 + 8 幕剧本的入口。
 *
 * `simulate` 是**纯读**：它按传入场景跑一遍 `model.simulateGasBalance`，不写柜位、不写落库数据，
 * 所以滑杆可以任意拖。只有 `surge`（剧本）和 `accept`（采纳建议）才有副作用，
 * 且两者都直接回一份新快照——按钮与随后的画面必须是同一个数，不能靠两次请求碰运气对齐。
 */
export const gasSimApi = {
  simulate: (scenario: GasScenarioDto = {}) => emsPost<GasSimViewDto>("/gas/simulate", { scenario }),
  /** ▶模拟转炉吹炼高峰（幕 2）：柜位 30s 内爬到触顶 */
  surge: (media?: string) => emsPost<ActionResult<GasSimViewDto>>("/gas/surge", media ? { media } : {}),
  /** 提前收剧本：柜位停在当前值，交给均值回归 */
  surgeStop: () => emsPost<ActionResult>("/gas/surgeStop", {}),
};

/** 调度建议（规则引擎的产物，EM0002 右栏与 EM0007 共用） */
export const suggestionApi = {
  /** ▶生成调度建议：手动跑一次规则引擎（正常路径由 tick 在柜位越线时自动跑） */
  gen: (media?: string) => emsPost<ActionResult<DispatchSuggestion[]>>("/suggestion/gen", media ? { media } : {}),
  /** 采纳 → 调度令草拟单，自动填动作与接收人（幕 3→5） */
  accept: (id: string) => emsPost<ActionResult<DispatchOrder>>("/suggestion/accept", { id }),
};

/** EM0005 报警中心 */
export const alarmApi = {
  page: emsList<EnergyAlarm>("/alarm"),
  /** 五级分桶 + 状态计数：看板一次给全，页面不再自己 group by */
  board: (level?: AlarmLevel | 0, status?: string) =>
    emsPost<AlarmBoardDto>("/alarm/board", { level: level ?? 0, status: status ?? "" }),
  /** 活动报警流：监控四页右栏那一列 */
  active: () => emsGet<EnergyAlarm[]>("/alarm/active"),
  ack: (id: string) => emsPost<ActionResult<EnergyAlarm>>("/alarm/ack", { id }),
  ackAll: () => emsPost<ActionResult>("/alarm/ackAll", {}),
  close: (id: string) => emsPost<ActionResult<EnergyAlarm>>("/alarm/close", { id }),
  /** 报警转调度令（幕 4→5）：带级别与柜位上下文，不用人再抄一遍 */
  toDispatch: (alarmId: string) => emsPost<ActionResult<DispatchOrder>>("/alarm/toDispatch", { alarmId }),
};

/** EM0006 调度令五态闭环：草拟 → 已下达 → 执行中 → 已完成 → 已回执 */
export const dispatchApi = {
  page: emsList<DispatchOrder>("/dispatch"),
  stat: () =>
    emsGet<{
      total: number;
      draft: number;
      issued: number;
      running: number;
      done: number;
      receipt: number;
      overdue: number;
    }>("/dispatch/stat"),
  issue: (id: string) => emsPost<ActionResult<DispatchOrder>>("/dispatch/issue", { id }),
  /** 执行完毕：**在这里兑现采纳时挂上的柜位基线**，幕 7 之后回 EM0002/大屏才看得到数字回落 */
  exec: (id: string) => emsPost<ActionResult<DispatchOrder>>("/dispatch/exec", { id }),
  receipt: (id: string) => emsPost<ActionResult<DispatchOrder>>("/dispatch/receipt", { id }),
};
