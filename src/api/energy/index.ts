import { requestClient } from "@/api/_core/request";

import type {
  ActionResult,
  AlarmBoardDto,
  AlarmLevel,
  AlarmRule,
  CollectChannel,
  RegionStatDto,
  SettlementBill,
  Quota,
  ReportTemplate,
  KeyEquip,
  EnergyPlan,
  BalanceSheet,
  AssessRow,
  ActualRecord,
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
  KpiBoardDto,
  SankeyDto,
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

/* ══════════════════════════════════════════════════════════════════════════
   EP 能源管理（P4 六页）。写操作**全部转发给 store**（见 mock/energy/plan.ts），
   端点只做 HTTP body → 参数的搬运；拒绝（已定稿/已平衡/状态非法）由 store 判。
   ══════════════════════════════════════════════════════════════════════════ */

/** EP0001 产品能源定额（工序 × 介质 单耗定额） */
export const quotaApi = {
  page: emsList<Quota>("/quota"),
};

/** 月度能源计划（B2-3：编制中→已提交→已批准→执行中→已归档） */
export const planApi = {
  page: emsList<EnergyPlan>("/plan"),
  /** 状态流转；非法转移回 `HTTP 200 + {ok:false,msg}`，页面 applyResult 弹 */
  status: (id: string, to: EnergyPlan["status"], by?: string) =>
    emsPost<ActionResult<EnergyPlan>>("/plan/status", by ? { id, to, by } : { id, to }),
  /** 按预测产量重算计划明细（只对「编制中」开放，须先退回编制） */
  recalc: (id: string, factor?: number) =>
    emsPost<ActionResult<EnergyPlan>>("/plan/recalc", factor === undefined ? { id } : { id, factor }),
};

/** EP0002 能源实绩（计量点 + 统计节点，公式追溯在 `formulaTrace` 上） */
export const actualApi = {
  page: emsList<ActualRecord>("/actual"),
  /** 人工校正留痕；该月已定稿则被 store 拒绝 */
  correct: (id: string, value: number, by?: string, reason?: string) =>
    emsPost<ActionResult<ActualRecord>>("/actual/correct", { id, value, by, reason }),
  /** ▶重算昨日实绩（幕 6 第一步） */
  recalc: (date?: string) => emsPost<ActionResult>("/actual/recalc", date ? { date } : {}),
};

/** EP0003 能源平衡表（月度必出报表） */
export const balanceApi = {
  page: emsList<BalanceSheet>("/balance"),
  /** ▶执行平衡分摊（幕 6）：只动「损失/平衡差」，已平的表回「无残差可摊」 */
  run: (month?: string) => emsPost<ActionResult<BalanceSheet>>("/balance/run", month ? { month } : {}),
};

/** EP0004 结算单（已生成→已核对→已定稿；定稿后锁死该月实绩） */
export const settlementApi = {
  page: emsList<SettlementBill>("/settlement"),
  /** ▶生成本月结算（幕 7） */
  generate: (month?: string) => emsPost<ActionResult<SettlementBill[]>>("/settlement/generate", month ? { month } : {}),
  status: (id: string, to: SettlementBill["status"], by?: string) =>
    emsPost<ActionResult<SettlementBill>>("/settlement/status", by ? { id, to, by } : { id, to }),
};

/** EP0005 能耗考核与对标 */
export const assessApi = {
  page: emsList<AssessRow>("/assess"),
  /** ▶生成考核月报（基准分 − 超标扣分 + 节能加分 + 排名） */
  generate: (month?: string) => emsPost<ActionResult<AssessRow[]>>("/assess/generate", month ? { month } : {}),
};

/** EP0006 重点用能设备（九大类 + 能效评级） */
export const keyEquipApi = {
  page: emsList<KeyEquip>("/keyEquip"),
  /** 单机能耗曲线（近 6 月，由 `model.monthSeries` 派生，页面不自己抖） */
  curve: (id: string) => emsPost<Array<{ monthStdCoal: number; intensity: number }>>("/keyEquip/curve", { id }),
};

/* ══════════════════════════════════════════════════════════════════════════
   ER 报表统计（P5 四页）。读的是 model 的派生函数，页面不直连 mock（红线：分层）。
   ══════════════════════════════════════════════════════════════════════════ */

/** ER0001 能耗统计报表 */
export const reportApi = {
  /** 区域能耗（工序 × 介质），`model.regionStat` 已派生产量/折标/成本 */
  regionStat: () => emsPost<RegionStatDto[]>("/report/region-stat", {}),
  /**
   * 分项能耗。
   *
   * ⚠️ 回**对象不是数组**：`mediumCost()` 的形状是
   * `{rows, byMedium, byUnit, total, perTonSteel, fixed, elecTotal}`——
   * 一个端点喂三处（表、图、页脚）。早期声明成 `Array`，页面 `.rows` 直接
   * `Property does not exist`（`rows` 只存在于对象上）。
   */
  subStat: () =>
    emsPost<{
      rows: Array<{ unitId: string; mediaCode: string; qty: number; price: number; amount: number; priceType: string }>;
      byMedium: Record<string, number>;
      byUnit: Record<string, number>;
      total: number;
      perTonSteel: number;
      fixed: number;
      elecTotal: number;
    }>("/report/sub-stat", {}),
  /**
   * 峰平谷电能。
   *
   * ⚠️ 返回**对象**不是数组：`tiers`（四时段合计）与 `hourlyKWh`（24 点负荷形状）
   * 是**两个量纲**，页面各画各的图。早期声明成 `Array` 会让页面 `.map` 一个对象，
   * 运行期才炸。
   */
  elecTimeUse: () =>
    emsPost<{
      totalKWh: number;
      purchaseKWh: number;
      avgPrice: number;
      innerPrice: number;
      tiers: Array<{ tier: string; price: number; hours: string; qtyKWh: number; amount: number }>;
      hourlyKWh: number[];
      energyAmount: number;
      demandCharge: number;
      pfAdjCharge: number;
      totalAmount: number;
      maxMw: number;
      minMw: number;
    }>("/report/elec-time-use", {}),
  /** 分区域报表的介质下拉（只列进平衡表的） */
  mediaOptions: () => emsGet<Array<{ code: string; name: string; color: string }>>("/report/mediaOptions"),
  /** 分区域报表的用能单元下拉（只给厂级——报表行就是厂级粒度） */
  unitOptions: () => emsGet<Array<{ id: string; name: string }>>("/report/unitOptions"),
  /** 排名：基于吨钢综合能耗/成本的口径 */
  ranking: () => emsPost<Record<string, any>>("/report/ranking", {}),
  /** ER0002 单耗多维对比——与 `subStat` **同源同形状**（同一批账的两个切面，见端点注释） */
  efficiency: () =>
    emsPost<{
      rows: Array<{ unitId: string; mediaCode: string; qty: number; price: number; amount: number; priceType: string }>;
      byMedium: Record<string, number>;
      byUnit: Record<string, number>;
      total: number;
      perTonSteel: number;
      fixed: number;
      elecTotal: number;
    }>("/report/efficiency", {}),
  /** ER0002 损耗分析（供水−用 的不平衡量与线损，按 日×介质 分组） */
  lossAnalysis: () =>
    emsPost<Array<{ date: string; mediaCode: string; supply: number; use: number; loss: number; lossPct: number }>>(
      "/report/loss-analysis",
      {},
    ),
};

/** ER0003 负荷与煤气预测 */
export const forecastApi = {
  /**
   * 负荷预测。`band` 是**置信带宽度**：页面按「值 ± band」画带——
   * 只画中线答不了「预测可不可信」，而 ER0003 的原话是「证明预测可用是调度可信的前提」。
   */
  load: (hours = 24) =>
    emsPost<Array<{ hour: number; mw: number; tier: string; band: number }>>("/report/load-forecast", { hours }),
  gas: (hours = 24) =>
    emsPost<Array<{ hour: number; bfg: number; cog: number; ldg: number }>>("/report/gas-forecast", { hours }),
  /**
   * 预测精度（MAPE + 按周趋势）。
   * MAPE **从置信带反推**（端点算好，页面不另算），`note` 是「模型自评非实测」那句——
   * 页面必须显示它，把自评写成实测是最坏的一种说谎。
   */
  accuracy: () =>
    emsPost<{
      loadMape: number;
      gasMape: number;
      weeks: Array<{ week: string; loadMape: number; gasMape: number }>;
      note: string;
    }>("/report/forecast-accuracy", {}),
};

/** ER0004 自定义报表 */
export const templateApi = {
  /**
   * 模板列表（真源 `ems.reportTemplates`，EG 里维护）。
   * **回裸数组不是 `{data:[…]}`**——`postHandler` 已放进信封，再包一层页面就得
   * `res.data` 解两次，写错一层就是「undefined 不是数组」在运行期炸。
   */
  list: () => emsPost<ReportTemplate[]>("/report/templates", {}),
  /** 简易组态预览：只回表格骨架（columns/metrics/granularity），**行留空**（见端点注释） */
  config: (dimensions: string[], metrics: string[], granularity: "时" | "日" | "月") =>
    emsPost<{ columns: string[]; metrics: string[]; granularity: string; rows: any[] }>("/report/config", {
      dimensions,
      metrics,
      granularity,
    }),
  /** 日报发布（模拟：回单号） */
  publish: () => emsPost<{ success: boolean; id: string }>("/report/publish", {}),
};

/* ══════════════════════════════════════════════════════════════════════════
   EO 总览（P6）。三处读同一个 `refreshKpiBoard()`，永远同数。
   ══════════════════════════════════════════════════════════════════════════ */

export const overviewApi = {
  /** EO0001 大屏 / EO0002 看板共用（月账现算 + 实时态，两边都不存字段） */
  kpi: () => emsPost<KpiBoardDto>("/overview/kpi", {}),
  /** EO0003 能流桑基；`media` 是介质编码，非法值服务端回落 BFG */
  sankey: (media: string) => emsPost<SankeyDto>("/overview/sankey", { media }),
  /** 首页顶栏四个实时口径（从 kpi 里取子集，不重复算） */
  home: () =>
    emsGet<{
      month: string;
      ventRatePct: number;
      ventTarget: number;
      selfGenRatePct: number;
      selfGenTarget: number;
      activeAlarms: number;
      urgentAlarms: number;
      openOrders: number;
      pendingTickets: number;
      compositeKgce: number;
      compositeTarget: number;
      at: string;
    }>("/overview/home"),
};
