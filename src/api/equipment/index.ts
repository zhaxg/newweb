import { requestClient } from "@/api/_core/request";

import type {
  ActionResult,
  Alarm,
  AlarmRule,
  Assessment,
  DashboardOverview,
  Equipment,
  EquipmentDetail,
  HandoverRecord,
  HealthBoard,
  InspectionTask,
  KpiSet,
  LifeRecord,
  LifecycleEvent,
  Line,
  MeteringDevice,
  PageResult,
  PhmView,
  PmPlan,
  PurchaseRequest,
  RealtimeView,
  SensorPoint,
  SpecialEquipment,
  StockTxn,
  TechDoc,
  WorkOrder,
  WorkPermit,
  Hazard,
  IntegrationApi,
  SparePart,
  WoPriority,
  WoSource,
} from "./types";

/**
 * 设备管理（EAM/PHM）演示域接口层。
 *
 * **命名空间 `/eam`**（不是 carbon 的 `/business`）：接口前缀是租户识别的一部分——
 * 碳资产那套 `/business/**` 已经在线上跑，设备域用独立前缀，将来接真实后端时
 * 两套端点不会互相遮蔽，mock 路由表也不会有同名键。
 *
 * 三条与 carbon 页不同的约定，都源于「本域的 mock 会真的落库」：
 * 1. 列表统一 **POST `listPage`**，参数 `{currentPage,pageSize,...条件}`，回 `{total,rows}`；
 * 2. 写操作**不叫 stub**——它们调 store 的联动方法并**返回受影响的行**，
 *    页面拿到返回值就能立刻刷新，不用猜后端这次到底改没改；
 * 3. 返回体一律是 `@/api/equipment/types` 里声明的契约类型，页面不做 `any` 兜底。
 *
 * url 写**去掉 `/api` 的原路径**，`withApiPrefix()` 统一补前缀（见 `api/_core/request.ts`）。
 */
const B = "/eam";

/* ── 通用工厂 ─────────────────────────────────────────────────────────── */

/** 列表查询：`eamList<T>("/sparePart")` → 打 `/eam/sparePart/listPage` */
export function eamList<T>(entity: string): (q?: Record<string, any>) => Promise<PageResult<T>> {
  return (q = {}) => requestClient.request<PageResult<T>>(`${B}${entity}/listPage`, { method: "post", data: q });
}

/** 无参/单参 GET（聚合视图、树、详情） */
export function eamGet<T>(path: string, params?: Record<string, any>): Promise<T> {
  return requestClient.request<T>(`${B}${path}`, { method: "get", params });
}

/** 动作类 POST：请求体原样送，响应是「受影响的数据 + 可读结果」 */
export function eamPost<T>(path: string, data?: Record<string, any>): Promise<T> {
  return requestClient.request<T>(`${B}${path}`, { method: "post", data });
}

/* ── 主数据 / 台账（下拉候选与共用列表）───────────────────────────────── */

export const lineApi = {
  list: () => eamGet<Line[]>("/line/list"),
};

/**
 * 人名候选（派工、验证、领料、点检录入的下拉都读它）。
 *
 * 为什么走接口而不是页面里写死一份名单：equipment.md 模块八要求「人员与组织架构由 HR 同步」，
 * 写死名单会让 AG0001 那条 `HR → EAM` 集成记录变成一句空话；走接口之后，
 * 「AS0005 折算页把某人标成离职 → 派工下拉立刻没有他」这条链是当场可演示的。
 */
export const orgApi = {
  assignees: () => eamGet<string[]>("/org/assignees"),
  people: () => eamGet<Array<{ name: string; role: string; dept: string; active: boolean }>>("/org/people"),
};

export const equipmentApi = {
  page: eamList<Equipment>("/equipment"),
  list: () => eamGet<Equipment[]>("/equipment/list"),
  tree: () => eamGet<unknown[]>("/equipment/tree"),
  detail: (id: string) => eamGet<EquipmentDetail | null>("/equipment/detail", { id }),
  /** H5 扫码：按设备编码/名称取档案，查不到回 null（页面给「未登记」提示） */
  scan: (code: string) => eamGet<EquipmentDetail | null>("/equipment/scan", { code }),
  save: (data: Partial<Equipment>) => eamPost<ActionResult<Equipment>>("/equipment/save", data),
};

export const lifecycleApi = { page: eamList<LifecycleEvent>("/lifecycle") };
export const docApi = {
  page: eamList<TechDoc>("/doc"),
  save: (data: Partial<TechDoc>) => eamPost<ActionResult<TechDoc>>("/doc/save", data),
  remove: (id: string) => eamPost<ActionResult>("/doc/remove", { id }),
};

/* ── 状态监测（AM）────────────────────────────────────────────────────── */

export const pointApi = {
  page: eamList<SensorPoint>("/point"),
  save: (data: Partial<SensorPoint>) => eamPost<ActionResult<SensorPoint>>("/point/save", data),
  remove: (id: string) => eamPost<ActionResult>("/point/remove", { id }),
};

export const alarmRuleApi = {
  page: eamList<AlarmRule>("/alarmRule"),
  save: (data: Partial<AlarmRule>) => eamPost<ActionResult<AlarmRule>>("/alarmRule/save", data),
  remove: (id: string) => eamPost<ActionResult>("/alarmRule/remove", { id }),
};

export const alarmApi = {
  page: eamList<Alarm>("/alarm"),
  ack: (id: string, by?: string) => eamPost<ActionResult<Alarm>>("/alarm/ack", { id, by }),
  close: (id: string) => eamPost<ActionResult<Alarm>>("/alarm/close", { id }),
  /** 报警转工单（主线第 4 幕）：回生成的工单 */
  toWorkOrder: (id: string, assignee?: string) =>
    eamPost<ActionResult<WorkOrder>>("/alarm/toWorkOrder", { id, assignee }),
};

export const inspectionApi = {
  page: eamList<InspectionTask>("/inspection"),
  /** `by` 是点检人：移动端签到后可能不是任务上原本派的那个人（现场换班） */
  submit: (data: Partial<InspectionTask> & { id: string; by?: string }) =>
    eamPost<ActionResult<InspectionTask>>("/inspection/submit", data),
};

/** 实时监控一次拉全设备的全部测点曲线（服务端只有内存滚动窗，翻页没有意义） */
export const realtimeApi = {
  view: (eqId: string) => eamGet<RealtimeView>("/monitor/realtime", { eqId }),
  /** 演示「推进一拍」：mock 侧按 SIM_PARAM 抖动写值并按规则产警 */
  tick: (eqId: string) => eamPost<RealtimeView>("/monitor/tick", { eqId }),
  /** 剧本触发：把 F4 电机轴承温度在 20 拍里从 61℃ 拉到 88℃，回最后一次的视图 */
  script: (eqId: string) =>
    eamPost<{ done: boolean; step: number; value: number; alarm: Alarm | null }>("/monitor/script", { eqId }),
  /** 手动推进运行小时（寿命/Pm 计数器联动的演示入口） */
  runHours: (eqId: string, hours: number) =>
    eamPost<{ health: number; alarmed: string[] }>("/monitor/runHours", { eqId, hours }),
};

export const phmApi = {
  view: (eqId: string) => eamGet<PhmView>("/monitor/phm", { eqId }),
  /** 一键生成诊断工单（PdM 来源） */
  toWorkOrder: (eqId: string) => eamPost<ActionResult<WorkOrder>>("/monitor/phmToWorkOrder", { eqId }),
};

/* ── 维修工单（AW）────────────────────────────────────────────────────── */

export const workOrderApi = {
  page: eamList<WorkOrder>("/workOrder"),
  detail: (id: string) => eamGet<WorkOrder | null>("/workOrder/detail", { id }),
  create: (data: {
    eqId: string;
    title: string;
    faultDesc: string;
    priority: WoPriority;
    source: WoSource;
    assignee?: string;
    planHours?: number;
  }) => eamPost<ActionResult<WorkOrder>>("/workOrder/create", data),
  assign: (id: string, assignee: string) => eamPost<ActionResult<WorkOrder>>("/workOrder/assign", { id, assignee }),
  accept: (id: string) => eamPost<ActionResult<WorkOrder>>("/workOrder/accept", { id }),
  submit: (id: string, payload: { actualHours?: number; photos?: string[]; note?: string }) =>
    eamPost<ActionResult<WorkOrder>>("/workOrder/submit", { id, ...payload }),
  verify: (id: string, pass: boolean) => eamPost<ActionResult<WorkOrder>>("/workOrder/verify", { id, pass }),
  close: (id: string) => eamPost<ActionResult<WorkOrder>>("/workOrder/close", { id }),
  /** 领料：扣库存 + 记流水 + 绑寿命序列号 + 低于安全库存自动请购 */
  issue: (woId: string, spId: string, qty: number, lifeSerial?: string) =>
    eamPost<ActionResult<WorkOrder>>("/workOrder/issue", { woId, spId, qty, lifeSerial }),
};

export const pmPlanApi = {
  page: eamList<PmPlan>("/pmPlan"),
  save: (data: Partial<PmPlan>) => eamPost<ActionResult<PmPlan>>("/pmPlan/save", data),
  toggle: (id: string, enabled: boolean) => eamPost<ActionResult<PmPlan>>("/pmPlan/toggle", { id, enabled }),
  /** 手动触发一次（演示「到期即生成工单」） */
  fire: (id: string) => eamPost<ActionResult<WorkOrder>>("/pmPlan/fire", { id }),
};

/* ── 备品备件（AS）────────────────────────────────────────────────────── */

export const sparePartApi = {
  page: eamList<SparePart>("/sparePart"),
  list: () => eamGet<SparePart[]>("/sparePart/list"),
  save: (data: Partial<SparePart>) => eamPost<ActionResult<SparePart>>("/sparePart/save", data),
  remove: (id: string) => eamPost<ActionResult>("/sparePart/remove", { id }),
  /** 出入库（手工调整库存，写流水） */
  stockIn: (spId: string, qty: number, person: string, note?: string) =>
    eamPost<ActionResult<StockTxn>>("/sparePart/stockIn", { spId, qty, person, note }),
};

export const stockTxnApi = { page: eamList<StockTxn>("/stockTxn") };
export const lifeRecordApi = { page: eamList<LifeRecord>("/lifeRecord") };

export const assessmentApi = {
  page: eamList<Assessment>("/assessment"),
  /** 生成/重算某月考核结算单 */
  run: (month: string) => eamPost<ActionResult<Assessment>>("/assessment/run", { month }),
};

export const handoverApi = {
  page: eamList<HandoverRecord>("/handover"),
  /** 离职交接折算：名下寿命件按剩余寿命折价回库 */
  run: (person: string) => eamPost<ActionResult<HandoverRecord>>("/handover/run", { person }),
  /** 可折算的人（在岗且名下有寿命件）：连预估金额一起给，选人时就能看出折多少 */
  candidates: () =>
    eamGet<Array<{ name: string; role: string; dept: string; records: number; total: number }>>("/handover/candidates"),
  /** 折算**前**的逐件明细（只读）：页面上的金额与 `run` 生成的单据同源 */
  preview: (person: string) => eamGet<{ rows: HandoverRecord["rows"]; total: number }>("/handover/preview", { person }),
};

export const purchaseApi = {
  page: eamList<PurchaseRequest>("/purchaseRequest"),
  approve: (id: string) => eamPost<ActionResult<PurchaseRequest>>("/purchaseRequest/approve", { id }),
  /** 到货入库（库存 +qty、流水、状态推进） */
  receive: (id: string, qty?: number) =>
    eamPost<ActionResult<PurchaseRequest>>("/purchaseRequest/receive", { id, qty }),
};

/* ── 安全合规（AC）────────────────────────────────────────────────────── */

export const workPermitApi = {
  page: eamList<WorkPermit>("/workPermit"),
  create: (data: Partial<WorkPermit>) => eamPost<ActionResult<WorkPermit>>("/workPermit/create", data),
  /** 逐级审批（A 级多一道厂级）；pass=false 即驳回 */
  approve: (id: string, pass: boolean) => eamPost<ActionResult<WorkPermit>>("/workPermit/approve", { id, pass }),
  start: (id: string) => eamPost<ActionResult<WorkPermit>>("/workPermit/start", { id }),
  close: (id: string) => eamPost<ActionResult<WorkPermit>>("/workPermit/close", { id }),
};

export const hazardApi = {
  page: eamList<Hazard>("/hazard"),
  create: (data: Partial<Hazard>) => eamPost<ActionResult<Hazard>>("/hazard/create", data),
  rectify: (id: string, measure: string, by?: string) =>
    eamPost<ActionResult<Hazard>>("/hazard/rectify", { id, measure, by }),
  accept: (id: string) => eamPost<ActionResult<Hazard>>("/hazard/accept", { id }),
};

export const specialApi = {
  page: eamList<SpecialEquipment>("/special"),
  save: (data: Partial<SpecialEquipment>) => eamPost<ActionResult<SpecialEquipment>>("/special/save", data),
  /** 登记一次检验，下次到期日按检验周期外推 */
  inspect: (id: string, nextInspectAt: string) =>
    eamPost<ActionResult<SpecialEquipment>>("/special/inspect", { id, nextInspectAt }),
};

export const meteringApi = {
  page: eamList<MeteringDevice>("/metering"),
  /** `certNo` 可空：检定证书号是所里给的，来不及拿到的行先只推下次检定日 */
  verify: (id: string, nextVerifyAt: string, certNo?: string) =>
    eamPost<ActionResult<MeteringDevice>>("/metering/verify", { id, nextVerifyAt, certNo }),
};

/* ── 总览与分析（AO / AR）─────────────────────────────────────────────── */

export const overviewApi = {
  dashboard: () => eamGet<DashboardOverview>("/overview/dashboard"),
  health: () => eamGet<HealthBoard>("/overview/health"),
};

export const analysisApi = {
  kpi: () => eamGet<KpiSet>("/analysis/kpi"),
  /** 设备报表：每行一台设备的工单/报警/工时/费用。`range` 给 `YYYY-MM` 是月报、给 `YYYY` 是年报 */
  report: (range: string) => eamGet<Array<Record<string, any>>>("/analysis/report", { month: range }),
  /** 报表目录（AR0002 左栏）：名称/周期/归口部门/保存年限，来自系统配置不是页面写死 */
  reportDefs: () =>
    eamGet<Array<{ id: string; name: string; period: string; owner: string; retention: string }>>(
      "/analysis/reportDefs",
    ),
  /** 系统参数（奖罚系数、达标率、预警天数）——考核页与折算页要显示公式 */
  params: () => eamGet<Record<string, any>>("/analysis/params"),
};

/* ── 集成（AG）────────────────────────────────────────────────────────── */

export const integrationApi = {
  page: eamList<IntegrationApi>("/integration"),
  /** 模拟一次同步：把 lastSyncAt 推到当前、回条数 */
  sync: (id: string) => eamPost<ActionResult<IntegrationApi>>("/integration/sync", { id }),
};

/* ── 通用导出占位 ─────────────────────────────────────────────────────── */

/** 导出：接口链路照走，mock 回成功 + 文件名（演示不做真电子表格） */
export function exportRows(entity: string, q?: Record<string, any>): Promise<ActionResult<string>> {
  return eamPost<ActionResult<string>>("/export", { entity, ...q });
}
