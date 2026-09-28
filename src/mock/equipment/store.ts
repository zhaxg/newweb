import { reactive } from "vue";

import type {
  Alarm,
  Assessment,
  DashboardOverview,
  Equipment,
  HandoverRecord,
  Hazard,
  HealthBoard,
  InspectionTask,
  IntegrationApi,
  KpiSet,
  LifeRecord,
  LifeSettlement,
  MeteringDevice,
  PhmView,
  PmPlan,
  PurchaseRequest,
  RealtimeView,
  SensorPoint,
  SparePart,
  SpecialEquipment,
  StockTxn,
  WorkOrder,
  WorkPermit,
} from "@/api/equipment/types";
import { seedDocs, seedEquipments, seedLifecycleEvents, seedLines } from "./data/asset";
import { seedAlarmRules, seedAlarms, seedInspections, seedPoints } from "./data/monitor";
import { seedPmPlans, seedWorkOrders } from "./data/work";
import { seedLifeRecords, seedPurchaseRequests, seedSpareParts, seedStockTxns } from "./data/spare";
import {
  seedHazards,
  seedIntegrations,
  seedMeteringDevices,
  seedSpecialEquipments,
  seedWorkPermits,
} from "./data/compliance";
import { EAM_PARAMS, KPI_HISTORY, KPI_MONTHS, seedPeople } from "./data/org";
import { SIM_STEP_MS, nextAlarmId, nextPurchaseId, nextWorkOrderId, simParam } from "./data/sim";

/**
 * 设备域**唯一事实源**：一个 `reactive()` 内存态单例 + 跨模块联动方法（附录 B6）。
 *
 * 为什么必须是单例、且联动只能走这里的方法：演示主线的说服力全在「一处操作、多处跟着变」——
 * 报警转工单 → 工单列表 +1 → 领料扣库存 → 低于安全库存自动请购 → 关单回写设备履历与健康度 →
 * 大屏警报条与待办数同步。如果每个页面各自维护状态，这条链就断了，样板系统立刻退化成 31 张静态表格。
 *
 * 三条纪律：
 * 1. **页面不直接改状态**，只调 mock 端点（`src/api/equipment/*`），由这里落库；
 *    mock 端点再薄也是一道边界，保证将来换真实后端时页面零改动。
 * 2. **派生量一律现算、不落库**（奖惩金额、健康排行榜、待办数、OEE 当月值）——
 *    参数（奖罚系数/达标率）改了要立刻反映，存了字段就会漂。
 * 3. 时钟走 `nowStamp()`，见下面 DEMO_T0 的注释。
 */

/**
 * 演示时钟。**刻意不用 `new Date()`**：
 * 种子里「临期 3 条 / 超期 2 条 / 特种待检 1 台 / 计量超期 1 台」的分布是按 2026-09-27 编排的，
 * 用墙上时钟会让这些红线随真实日期推移一条条变成超期、把演示口径泡烂。
 * 新记录的时间戳从这一刻**单调递增**（每次调用 +7s），所以现场操作完的时间轴顺序仍然合理。
 */
const DEMO_T0 = new Date("2026-09-27T09:30:00").getTime();
let clockCursor = DEMO_T0;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtFull(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 演示日的 YYYY-MM-DD（页面默认查询区间、单据归属月都读它） */
export const DEMO_TODAY = fmtDate(new Date(DEMO_T0));
export const DEMO_MONTH = DEMO_TODAY.slice(0, 7);

/** 生成下一个「现在」的时间戳 */
export function nowStamp(stepMs = 7000): string {
  clockCursor += stepMs;
  return fmtFull(new Date(clockCursor));
}

/**
 * 到期天数：后端算，**绝不让页面 `Date.now()` 自己减**。
 *
 * 这个演示的今天是 `DEMO_T0`（种子里的报警、工单、检验日期全是围着它编的）。
 * 页面上任何「临期黄 / 超期红」如果自己按真实时钟算，那么**2026-09-27 之后演示的那天，
 * 颜色会集体错位**：本来该黄的压力容器变成「还有 300 天」，客户当场看出数据是假的。
 * 所以由 `listPage` 现算 `daysLeft` 随行走（同 `special` / `metering` 两个端点）。
 */
export function deadlineOf<T extends { nextInspectAt?: string; nextVerifyAt?: string }>(
  row: T,
): T & { daysLeft: number; deadlineState: "正常" | "临期" | "超期" } {
  const daysLeft = daysTo(row.nextInspectAt ?? row.nextVerifyAt ?? "");
  return {
    ...row,
    daysLeft,
    deadlineState: daysLeft < 0 ? "超期" : daysLeft <= eam.params.warnDays ? "临期" : "正常",
  };
}

/** 距目标日还有几天（负数=已过期），按整天算 */
export function daysTo(dateStr: string): number {
  const target = new Date(`${dateStr.slice(0, 10)}T00:00:00`).getTime();
  const base = new Date(fmtDate(new Date(DEMO_T0)) + "T00:00:00").getTime();
  return Math.round((target - base) / 86400000);
}

/** 往日期上加 n 天（YYYY-MM-DD） */
export function addDays(dateStr: string, n: number): string {
  return fmtDate(new Date(new Date(`${dateStr.slice(0, 10)}T00:00:00`).getTime() + n * 86400000));
}

export const eam = reactive({
  lines: seedLines,
  equipments: seedEquipments,
  lifecycleEvents: seedLifecycleEvents,
  docs: seedDocs,

  points: seedPoints,
  alarmRules: seedAlarmRules,
  alarms: seedAlarms,
  inspections: seedInspections,

  workOrders: seedWorkOrders,
  pmPlans: seedPmPlans,

  spareParts: seedSpareParts,
  stockTxns: seedStockTxns,
  lifeRecords: seedLifeRecords,
  purchaseRequests: seedPurchaseRequests,

  specialEquipments: seedSpecialEquipments,
  meteringDevices: seedMeteringDevices,
  workPermits: seedWorkPermits,
  hazards: seedHazards,
  integrations: seedIntegrations,

  /** 月度考核结算单（runAssessment 生成后可反复查看） */
  assessments: [] as Assessment[],
  /** 离职交接折算单 */
  handovers: [] as HandoverRecord[],
  /** 报修/新增类表单的暂存（演示不落真库，只回列表） */
  /** 实时监控的滚动曲线：测点 → 最近 60 个采样值 */
  history: {} as Record<string, number[]>,
  /** 与 history 对齐的时间刻度 */
  times: [] as string[],
  params: { ...EAM_PARAMS },
});

/* ── 索引与取值 ───────────────────────────────────────────────────────── */

function find<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((x) => x.id === id);
}

export const eqOf = (id: string): Equipment | undefined => find(eam.equipments, id);
export const eqName = (id: string): string => eqOf(id)?.name ?? id;
export const lineOf = (id: string) => find(eam.lines, id);
export const partOf = (id: string) => find(eam.spareParts, id);
export const partName = (id: string): string => partOf(id)?.name ?? id;
export const pointOf = (id: string): SensorPoint | undefined => find(eam.points, id);
export const ruleOf = (pointId: string) => eam.alarmRules.find((r) => r.pointId === pointId);

/**
 * 测点当前值相对**预警阈值**的倍数（>1 即已越线）。
 * PHM 的五维雷达、劣化发现都按这一个口径打分，规则缺失时给 0.4 当「正常」。
 */
export function pointWarnRatio(p: SensorPoint): number {
  const r = ruleOf(p.id);
  return r && r.warn > 0 ? Math.min(1.6, p.value / r.warn) : 0.4;
}
export const lifeOf = (serial: string) => eam.lifeRecords.find((r) => r.serial === serial);

/* ── 寿命判定（派生量，不落库）─────────────────────────────────────────── */

export function lifeRatio(r: LifeRecord): number {
  return r.lifeLimitHours > 0 ? r.usedHours / r.lifeLimitHours : 0;
}

/** 状态由 usedHours 现算；已更换/已折算归档后不再改 */
export function refreshLifeStatus(r: LifeRecord): LifeRecord["status"] {
  if (r.status === "已更换" || r.status === "已折算") return r.status;
  const ratio = lifeRatio(r);
  r.status = ratio >= 1 ? "超期" : ratio >= eam.params.nearRatio ? "临期" : "正常";
  return r.status;
}

/** 结算金额：正=超期奖励，负=未达线处罚（附录 B1 第 10 条的公式） */
export function settlementOf(r: LifeRecord): LifeSettlement {
  const p = eam.params;
  const over = r.usedHours - r.lifeLimitHours;
  const short = r.lifeLimitHours * p.passRate - r.usedHours;
  let amount = 0;
  let result: LifeSettlement["result"] = "达标";
  if (r.status === "已更换") {
    if (short > 0) {
      amount = -Math.round(short * p.punishRate);
      result = "未达线处罚";
    }
  } else if (over > 0) {
    amount = Math.round(over * p.rewardRate);
    result = "超期奖励";
  }
  return {
    serial: r.serial,
    spId: r.spId,
    spName: partName(r.spId),
    holder: r.holder,
    lifeLimitHours: r.lifeLimitHours,
    usedHours: Math.round(r.usedHours),
    overHours: Math.round(over),
    amount,
    result,
  };
}

/* ── 采样与报警（在线监测侧）───────────────────────────────────────────── */

const HISTORY_LEN = 60;

function initHistory() {
  if (Object.keys(eam.history).length) return;
  /* 时间刻度按采样节拍倒推，保证曲线 X 轴是连续的过去 HISTORY_LEN 拍；
     节拍与 AM0002 推进用的 SIM_STEP_MS 同一个常量，否则刻度与真实写入间隔会漂 */
  eam.times = Array.from({ length: HISTORY_LEN }, (_, i) => {
    const d = new Date(DEMO_T0 - (HISTORY_LEN - 1 - i) * SIM_STEP_MS);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  });
  for (const p of eam.points) {
    const [center, half] = simParam(p);
    eam.history[p.id] = Array.from({ length: HISTORY_LEN }, () => jitter(center, half));
    eam.history[p.id][HISTORY_LEN - 1] = Number(center.toFixed(1));
  }
}

function jitter(center: number, half: number): number {
  const v = center + (Math.random() * 2 - 1) * half;
  return Number(v.toFixed(Math.abs(center) < 10 ? 1 : 0));
}

/**
 * 写入一个采样值并按规则产警。
 *
 * 产警去重规则值得说明：**同一测点存在同级或更高级的未关闭报警时不再重复产生**，
 * 只在等级跃升时把原报警升级。真实系统都这么做——否则 500ms 一拍会把报警中心刷成
 * 几百条「温度 85.1/85.2/85.0」的噪声，客户一眼就觉得不专业。
 */
export function pushSample(pointId: string, value: number, at = nowStamp()): Alarm | null {
  initHistory();
  const p = pointOf(pointId);
  if (!p) return null;
  p.value = value;
  const arr = eam.history[pointId];
  if (arr) {
    arr.push(value);
    if (arr.length > HISTORY_LEN) arr.shift();
  }
  eam.times.push(at.slice(11));
  if (eam.times.length > HISTORY_LEN) eam.times.shift();

  const rule = ruleOf(pointId);
  if (!rule || !rule.enabled) return null;
  const level = value >= rule.trip ? "紧急" : value >= rule.alarm ? "报警" : value >= rule.warn ? "预警" : null;
  const rank = { 预警: 1, 报警: 2, 紧急: 3 } as const;

  const open = eam.alarms.find((a) => a.pointId === pointId && (a.status === "活动" || a.status === "已确认"));
  if (!level) return null;
  if (open) {
    if (rank[level] > rank[open.level]) {
      open.level = level;
      open.value = Number(value.toFixed(1));
      open.occurredAt = at;
      open.status = "活动";
      open.msg = `${eqName(open.eqId)} ${p.name}越界（当前 ${value}${p.unit} ≥ ${level === "紧急" ? "紧急" : "报警"}阈值 ${level === "紧急" ? rule.trip : rule.alarm}${p.unit}）`;
    }
    return open;
  }
  const alarm: Alarm = {
    id: nextAlarmId(eam.alarms, at),
    pointId,
    eqId: p.eqId,
    source: "在线监测",
    level,
    value: Number(value.toFixed(1)),
    msg: `${eqName(p.eqId)} ${p.name}越过${level}阈值（当前 ${value}${p.unit}）`,
    occurredAt: at,
    status: "活动",
  };
  eam.alarms.unshift(alarm);
  bumpHealth(p.eqId, level === "紧急" ? -8 : level === "报警" ? -5 : -2);
  return alarm;
}

/** 健康度回调/下调，5~99 夹紧 */
function bumpHealth(eqId: string, delta: number) {
  const e = eqOf(eqId);
  if (!e) return;
  e.health = Math.max(5, Math.min(99, Math.round(e.health + delta)));
}

/* ── 报警状态机 ───────────────────────────────────────────────────────── */

export function ackAlarm(id: string, by = "刘工"): Alarm | undefined {
  const a = find(eam.alarms, id);
  if (!a || a.status !== "活动") return a;
  a.status = "已确认";
  a.ackBy = by;
  return a;
}

export function closeAlarm(id: string): Alarm | undefined {
  const a = find(eam.alarms, id);
  if (a && a.status !== "已关闭") a.status = "已关闭";
  return a;
}

/** 报警转工单（主线第 4 幕）：生成待派工工单、报警回填工单号 */
export function alarmToWorkOrder(almId: string, assignee = ""): WorkOrder | undefined {
  const a = find(eam.alarms, almId);
  if (!a || a.woId) return a ? eam.workOrders.find((w) => w.id === a.woId) : undefined;
  const at = nowStamp();
  const wo = createWorkOrder({
    eqId: a.eqId,
    title: `${eqName(a.eqId)} ${a.msg.replace(/^[^ ]+ /, "")}`.slice(0, 40),
    faultDesc: `[${a.level}] ${a.msg}（发生时间 ${a.occurredAt}）`,
    priority: a.level === "紧急" ? "紧急" : a.level === "报警" ? "高" : "中",
    source: "报警转单",
    assignee,
    by: "系统",
    note: `报警 ${a.id} 自动转单`,
    at,
  });
  a.status = "已转工单";
  a.woId = wo.id;
  return wo;
}

/* ── 工单状态机（B2）──────────────────────────────────────────────────── */

interface CreateWoInput {
  eqId: string;
  title: string;
  faultDesc: string;
  priority: WorkOrder["priority"];
  source: WorkOrder["source"];
  assignee?: string;
  by?: string;
  note?: string;
  at?: string;
  planHours?: number;
}

export function createWorkOrder(input: CreateWoInput): WorkOrder {
  const at = input.at ?? nowStamp();
  const wo: WorkOrder = {
    id: nextWorkOrderId(eam.workOrders, at),
    title: input.title,
    eqId: input.eqId,
    source: input.source,
    faultDesc: input.faultDesc,
    priority: input.priority,
    status: input.assignee ? "已派工" : "待派工",
    assignee: input.assignee ?? "",
    planHours: input.planHours ?? 8,
    actualHours: 0,
    materials: [],
    photos: [],
    steps: [{ status: "待派工", at, by: input.by ?? "系统", note: input.note ?? "工单下达" }],
    createdAt: at,
  };
  if (input.assignee) wo.steps.push({ status: "已派工", at, by: input.by ?? "刘工", note: `派给 ${input.assignee}` });
  eam.workOrders.unshift(wo);
  return wo;
}

function step(wo: WorkOrder, status: WorkOrder["status"] | "挂起" | "退料" | "验证不通过", by: string, note: string) {
  wo.steps.push({ status, at: nowStamp(), by, note });
}

export function getWorkOrder(id: string): WorkOrder | undefined {
  return eam.workOrders.find((w) => w.id === id || w.title === id);
}

export function assignWorkOrder(id: string, assignee: string, by = "刘工"): WorkOrder | undefined {
  const wo = getWorkOrder(id);
  if (!wo || wo.status !== "待派工") return wo;
  wo.assignee = assignee;
  wo.status = "已派工";
  step(wo, "已派工", by, `派给 ${assignee}`);
  return wo;
}

/** 移动端接单 */
export function acceptWorkOrder(id: string): WorkOrder | undefined {
  const wo = getWorkOrder(id);
  if (!wo || wo.status !== "已派工") return wo;
  wo.status = "执行中";
  step(wo, "执行中", wo.assignee || "维修工", "移动端接单，到达现场");
  const e = eqOf(wo.eqId);
  if (e && e.status === "运行" && wo.priority === "紧急") e.status = "检修";
  return wo;
}

/** 完工提交（附工时/照片/领料），进入待验证 */
export function submitWorkOrder(
  id: string,
  payload: { actualHours?: number; photos?: string[]; note?: string },
): WorkOrder | undefined {
  const wo = getWorkOrder(id);
  if (!wo || (wo.status !== "执行中" && wo.status !== "已派工")) return wo;
  if (wo.status === "已派工") acceptWorkOrder(id);
  if (payload.actualHours != null) wo.actualHours = payload.actualHours;
  if (payload.photos?.length) wo.photos = [...wo.photos, ...payload.photos];
  wo.status = "待验证";
  step(wo, "待验证", wo.assignee || "维修工", payload.note ?? "现场作业完成，提交验证");
  return wo;
}

/** 主管验证：通过即关闭（跑关闭副作用），不通过退回执行中 */
export function verifyWorkOrder(id: string, pass: boolean, by = "刘工"): WorkOrder | undefined {
  const wo = getWorkOrder(id);
  if (!wo || wo.status !== "待验证") return wo;
  if (!pass) {
    wo.status = "执行中";
    step(wo, "验证不通过", by, "验证不通过，退回现场继续处理");
    return wo;
  }
  return closeWorkOrder(id, by);
}

/**
 * 关闭工单——**全系统最重的一次副作用**（附录 B6 第 3 行）：
 * 追加设备履历、健康度回升、寿命件 usedHours 归零并开始新一轮累计、
 * 库存扣减确认（领料时已扣，这里只把借用类回库）、报警自动关闭、请购状态推进。
 * 演示第 7 幕客户就是来看这一串「连锁反应」的，所以每一步都留痕在 steps 里。
 */
export function closeWorkOrder(id: string, by = "刘工"): WorkOrder | undefined {
  const wo = getWorkOrder(id);
  if (!wo || wo.status === "已关闭") return wo;
  const at = nowStamp();
  wo.status = "已关闭";
  wo.closedAt = at;
  step(wo, "已关闭", by, "验证通过，工单关闭并回写设备履历");

  /* 1. 设备履历 */
  eam.lifecycleEvents.push({
    id: `LE-${wo.id}`,
    eqId: wo.eqId,
    type: wo.source === "PM计划" ? "大修" : "维修",
    at: at.slice(0, 10),
    refDocNo: wo.id,
    note: `${wo.title}；实际工时 ${wo.actualHours || wo.planHours}h`,
  });

  /* 2. 健康度回升：修完就该变好，这是大屏「数字活了」的来源 */
  bumpHealth(wo.eqId, wo.priority === "紧急" ? 28 : wo.priority === "高" ? 20 : 12);
  const e = eqOf(wo.eqId);
  if (e && (e.status === "故障停机" || e.status === "检修")) e.status = "运行";

  /* 3. 寿命件：新件开始累计，旧件归档 */
  for (const m of wo.materials) {
    if (!m.lifeSerial) continue;
    const old = lifeOf(m.lifeSerial);
    if (!old) continue;
    if (old.mountedEqId === wo.eqId && old.status !== "已更换") {
      old.status = "已更换";
      old.replacedAt = at.slice(0, 10);
    }
  }

  /* 4. 关联报警自动关闭 */
  for (const a of eam.alarms) {
    if (a.woId === wo.id && a.status !== "已关闭") a.status = "已关闭";
  }

  /* 5. 工时计入设备与在装寿命件 */
  if (wo.actualHours > 0) tickRunHours(wo.eqId, 0, wo.actualHours);
  return wo;
}

/**
 * 领料（附录 B6 第 2 行）：扣库存 + 记流水 + 绑定寿命序列号 + 低于安全库存自动请购。
 * 「维修领料必须绑定工单」是客户明确的要求，所以这里刻意**不接受没有工单的领料**。
 */
export function issueMaterial(
  woId: string,
  spId: string,
  qty: number,
  lifeSerial?: string,
  person?: string,
): { ok: boolean; msg: string; txn?: StockTxn; prId?: string } {
  const wo = getWorkOrder(woId);
  const part = partOf(spId);
  if (!wo) return { ok: false, msg: `工单 ${woId} 不存在` };
  if (!part) return { ok: false, msg: `备件 ${spId} 不存在` };
  if (qty <= 0) return { ok: false, msg: "领用数量必须大于 0" };
  if (part.qty < qty) return { ok: false, msg: `${part.name} 库存不足（在库 ${part.qty} ${part.unit}）` };

  const at = nowStamp();
  const who = person || wo.assignee || "维修工";
  part.qty -= qty;
  const txn: StockTxn = {
    id: `ST-${String(eam.stockTxns.length + 1).padStart(4, "0")}`,
    spId,
    type: "领用",
    qty,
    woId: wo.id,
    person: who,
    at,
    balance: part.qty,
  };
  eam.stockTxns.unshift(txn);
  wo.materials.push({ spId, qty, lifeSerial });

  /* 寿命件绑定：序列号存在则挂到本工单设备，开始为这个人累计使用小时 */
  let prId: string | undefined;
  if (part.lifeManaged) {
    const rec = lifeSerial ? lifeOf(lifeSerial) : undefined;
    if (rec) {
      rec.mountedEqId = wo.eqId;
      rec.mountedAt = at.slice(0, 10);
      rec.holder = who;
      rec.status = "正常";
    }
  }

  /* 低于安全库存 → 自动请购（同备件已有未结的请购单就不重复开） */
  if (part.qty < part.safetyQty) {
    const pending = eam.purchaseRequests.find((p) => p.spId === spId && p.status !== "已到货");
    if (!pending) {
      const pr = {
        id: nextPurchaseId(eam.purchaseRequests),
        spId,
        qty: Math.max(part.safetyQty * 2 - part.qty, part.safetyQty),
        reason: `工单 ${wo.id} 领用 ${qty}${part.unit} 后库存 ${part.qty} < 安全库存 ${part.safetyQty}，系统自动请购`,
        status: "待审核" as const,
        createdAt: at,
      };
      eam.purchaseRequests.unshift(pr);
      prId = pr.id;
    }
  }
  return { ok: true, msg: `领料成功：${part.name} × ${qty}${part.unit}，余额 ${part.qty}`, txn, prId };
}

/**
 * 运行小时推进（附录 B6 第 4 行）。`woHours` 是工单实际工时——
 * 真实系统里 usedHours 的来源就这两条：设备连续运行（MES 采集）+ 工单作业工时。
 * 递减 PM 计数器、重判寿命状态、临期/超期自动产提醒报警。
 */
export function tickRunHours(eqId: string, runHours: number, woHours = 0): { alarmed: string[] } {
  const e = eqOf(eqId);
  if (!e) return { alarmed: [] };
  const total = runHours + woHours;
  if (total <= 0) return { alarmed: [] };
  e.runHours = Math.round(e.runHours + runHours);

  const alarmed: string[] = [];
  for (const r of eam.lifeRecords) {
    if (r.mountedEqId !== eqId || r.status === "已更换" || r.status === "已折算") continue;
    /* 备件寿命按设备运行小时同步推进（工单工时另加 20%——现场口径：检修时间也算磨损） */
    r.usedHours = Math.round((r.usedHours + runHours + woHours * 1.2) * 10) / 10;
    const before = r.status;
    const after = refreshLifeStatus(r);
    if (after !== before && (after === "临期" || after === "超期")) {
      const at = nowStamp();
      const part = partOf(r.spId);
      const alarm: Alarm = {
        id: nextAlarmId(eam.alarms, at),
        pointId: "",
        source: "到期扫描",
        eqId,
        level: after === "超期" ? "报警" : "预警",
        value: Math.round(lifeRatio(r) * 100),
        msg: `${part?.name ?? r.spId}（序列号 ${r.serial}）${after === "超期" ? "已超期" : "临期"}：已用 ${Math.round(r.usedHours)}h / 限期 ${r.lifeLimitHours}h，责任人 ${r.holder}`,
        occurredAt: at,
        status: "活动",
      };
      eam.alarms.unshift(alarm);
      alarmed.push(alarm.id);
      bumpHealth(eqId, after === "超期" ? -6 : -2);
    }
  }

  /* PM 计数器：余量清零即自动生成预防工单 */
  for (const plan of eam.pmPlans) {
    if (plan.eqId !== eqId || !plan.enabled) continue;
    plan.nextIn = Math.max(0, plan.nextIn - total);
    if (plan.nextIn <= 0) {
      firePm(plan.id, "系统");
      plan.nextIn = plan.cycleType === "计数器" ? plan.cycleValue : plan.cycleValue * 720;
    }
  }
  return { alarmed };
}

/** PM 计划触发（AW0001 的「▶ 手动触发」也走这里，保证两条路径同构） */
export function firePm(planId: string, by = "系统"): WorkOrder | undefined {
  const plan = eam.pmPlans.find((p) => p.id === planId);
  if (!plan) return undefined;
  const wo = createWorkOrder({
    eqId: plan.eqId,
    title: plan.name,
    faultDesc: `预防性维护计划 ${plan.id}（${plan.cycleType}${plan.cycleValue}）到期自动生成。作业内容：按标准卡执行并回收工时。`,
    priority: "中",
    source: "PM计划",
    by,
    note: `PM 计划 ${plan.id} 触发`,
    planHours: plan.cycleType === "计数器" ? 8 : 6,
  });
  plan.lastAt = nowStamp().slice(0, 10);
  return wo;
}

/* ── 考核结算与离职折算（附录 B6 第 5、6 行）───────────────────────────── */

/** 生成（或重算）某月考核结算单 */
export function runAssessment(month: string): Assessment {
  const exists = eam.assessments.find((a) => a.month === month);
  const rows: LifeSettlement[] = [];
  for (const r of eam.lifeRecords) {
    const inMonth =
      (r.status === "超期" && month <= DEMO_MONTH) ||
      (r.status === "已更换" && (r.replacedAt ?? r.mountedAt).slice(0, 7) === month);
    if (!inMonth) continue;
    const s = settlementOf(r);
    if (s.result !== "达标") rows.push(s);
  }
  const a: Assessment = {
    id: exists?.id ?? `AS-${month.replace("-", "")}`,
    month,
    createdAt: nowStamp(),
    rows: rows.toSorted((x, y) => Math.abs(y.amount) - Math.abs(x.amount)),
    rewardTotal: rows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0),
    punishTotal: rows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0),
  };
  if (exists) Object.assign(exists, a);
  else eam.assessments.unshift(a);
  return a;
}

/** 人名下未归档的寿命件（正常/临期/超期都算在手，已更换与已折算的不重复折钱）。 */
function inHandOf(person: string): LifeRecord[] {
  return eam.lifeRecords.filter(
    (r) => r.holder === person && (r.status === "正常" || r.status === "临期" || r.status === "超期"),
  );
}

/**
 * 折算一行寿命件 → 单据行。**附录 B1 第 10 条的公式在这里，全站只此一处**：
 * `金额 = 备件单价 × 剩余寿命占比`。
 *
 * 抽出来的原因不是复用方便，而是**预览和落库必须是同一个数**——页面在「选人」这一步
 * 就报金额（`handoverCandidates`/`handoverPreview`），点下「折算」后又生成一遍明细，
 * 两边各自手算迟早会因为四舍五入或口径漂移差出几百块，而客户正是盯着这个数看系统算得对不对。
 */
function handoverRowOf(r: LifeRecord): HandoverRecord["rows"][number] {
  const part = partOf(r.spId);
  const restRatio = Math.max(0, 1 - lifeRatio(r));
  return {
    serial: r.serial,
    spName: part?.name ?? r.spId,
    spec: part?.spec ?? "",
    lifeLimitHours: r.lifeLimitHours,
    usedHours: Math.round(r.usedHours),
    restRatio: Math.round(restRatio * 1000) / 1000,
    // 单价随行给出：纸面单据要能逐行手算核对，只给合计客户不敢签
    price: part?.price ?? 0,
    amount: Math.round((part?.price ?? 0) * restRatio),
  };
}

/**
 * 离职交接折算（AS0005）：列出人名下在手寿命件 → 按剩余寿命折算金额 →
 * 记录归档为「已折算」、实物回库（归还流水）。
 */
export function handover(person: string): HandoverRecord | undefined {
  const mine = inHandOf(person);
  if (!mine.length) return undefined;
  const at = nowStamp();
  const rows = mine.map(handoverRowOf);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  for (const r of mine) {
    const part = partOf(r.spId);
    r.status = "已折算";
    r.mountedEqId = undefined;
    if (part) {
      part.qty += 1;
      eam.stockTxns.unshift({
        id: `ST-${String(eam.stockTxns.length + 1).padStart(4, "0")}`,
        spId: part.id,
        type: "归还",
        qty: 1,
        person: "离职交接",
        at,
        balance: part.qty,
      });
    }
  }
  const rec: HandoverRecord = { id: `HO-${at.slice(0, 10).replace(/-/g, "")}-${person}`, person, at, rows, total };
  eam.handovers.unshift(rec);
  const p = seedPeople.find((x) => x.name === person);
  if (p) p.active = false;
  return rec;
}

/**
 * 折算前预览：只读，不改状态、不动库存。
 *
 * 单独开一个端点是因为 AS0005 这一页要演示的动作是「**先看清折多少，再决定折**」——
 * 交互式演示里如果只有点下「折算」才出数字，用户根本没法在客户面前回答「这个 7.56 万怎么算的」。
 * 金额口径与 `handover()` 完全一致（同一个 `handoverRowOf`），预览和成单不会打架。
 */
export function handoverPreview(person: string): { rows: HandoverRecord["rows"]; total: number } {
  const rows = inHandOf(person).map(handoverRowOf);
  return { rows, total: rows.reduce((s, r) => s + r.amount, 0) };
}

/**
 * 可折算的人：在岗 + 名下有未归档寿命件。
 * 金额在这里先按剩余寿命估一遍，页面就能在「选人」这一步告诉用户大概折多少——
 * 折算页真正要演示的是「系统算得清钱」，等点下去才看到数字就晚了。
 */
export function handoverCandidates(): Array<{
  name: string;
  role: string;
  dept: string;
  records: number;
  total: number;
}> {
  return seedPeople
    .filter((p) => p.active)
    .map((p) => {
      const mine = inHandOf(p.name);
      const total = mine.reduce((s, r) => s + handoverRowOf(r).amount, 0);
      return { name: p.name, role: p.role, dept: p.dept, records: mine.length, total };
    })
    .filter((x) => x.records > 0)
    .toSorted((a, b) => b.total - a.total);
}

/* ── 到期扫描（app 启动/首次进设备域跑一遍，附录 B6 第 7 行）────────────── */

let scanned = false;

/**
 * 特种设备检验、计量检定、备件寿命三类红线统一到这一条规则：
 * `daysTo(deadline) < warnDays` → 提醒；已过 → 升级。
 *
 * 刻意**只在服务端扫一次**（幂等），并且把扫出来的报警写进 `eam.alarms`，
 * 而不是让每个页面各自 `if (days < 30)`：否则 AC 页标黄、大屏不标，客户一眼就看穿是拼的。
 */
export function scanDeadlines(): { created: number } {
  if (scanned) return { created: 0 };
  scanned = true;
  initHistory();
  let created = 0;
  const warn = eam.params.warnDays;

  for (const s of eam.specialEquipments) {
    const d = daysTo(s.nextInspectAt);
    if (d > warn) continue;
    eam.alarms.unshift({
      id: nextAlarmId(eam.alarms, nowStamp()),
      pointId: "",
      source: "到期扫描",
      eqId: s.eqId ?? "",
      level: d < 0 ? "报警" : "预警",
      value: d,
      msg: `特种设备「${s.name}」定期检验${d < 0 ? `已超期 ${-d} 天` : `将在 ${d} 天后到期`}（登记 ${s.regNo}，下次检验 ${s.nextInspectAt}）`,
      occurredAt: nowStamp(0),
      status: "活动",
    });
    created += 1;
    if (d < 0) s.status = "待检";
  }

  for (const m of eam.meteringDevices) {
    const d = daysTo(m.nextVerifyAt);
    if (d > warn) continue;
    m.status = d < 0 ? "超期" : "临检";
    eam.alarms.unshift({
      id: nextAlarmId(eam.alarms, nowStamp()),
      pointId: "",
      source: "到期扫描",
      eqId: "",
      level: d < 0 ? "报警" : "预警",
      value: d,
      msg: `计量器具「${m.name}」周期检定${d < 0 ? `已超期 ${-d} 天` : `将在 ${d} 天后到期`}${m.mandatoryVerify ? "（强制检定）" : ""}`,
      occurredAt: nowStamp(0),
      status: "活动",
    });
    created += 1;
  }

  for (const r of eam.lifeRecords) {
    refreshLifeStatus(r);
    if (r.status === "超期") bumpHealth(r.mountedEqId ?? "", -4);
  }
  return { created };
}

/* ── 通用行级增删改（主数据类端点：备件/测点/规则/设备/文档/特种）──────── */

/**
 * 取同前缀行的最大序号 +1。`prefix` **不含结尾的 `-`**，`width` 要和种子一致
 * （种子编号是 `SP-0001`/`PM-001`/`WP-001` 三种位数，写死 width 会生成 `PM-0001` 这种混排）。
 */
export function nextSeqId(prefix: string, rows: Array<{ id: string }>, width = 4): string {
  let max = 0;
  for (const r of rows) {
    const n = Number(r.id.slice(prefix.length + 1));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

/**
 * 新测点/新规则/新设备的编号沿用种子的**构词规则**，不用 `PT-NEW-01` 这类占位名。
 * 客户在演示里新增一行，看到的编号如果与其余 40 行不是一个格式，
 * 系统立刻显得「只是个壳」——这三条是 `data/monitor.ts`、`data/asset.ts` 的 builder 规则的镜像。
 */
export function nextPointId(eqId: string): string {
  const short = eqId.replace(/[^A-Z0-9]/g, "").slice(2);
  const prefix = `PT-${short}-`;
  const nn = eam.points.reduce(
    (m, p) => (p.id.startsWith(prefix) ? Math.max(m, Number(p.id.slice(prefix.length)) || 0) : m),
    0,
  );
  return `${prefix}${String(nn + 1).padStart(2, "0")}`;
}

/** 报警规则与测点一一对应（种子就是 `AR-<pointId>`），所以新规则的编号由测点决定 */
export function nextRuleId(pointId: string): string {
  return `AR-${pointId}`;
}

/** 设备编号 `EQ-<产线短码>-<nn>`：产线短码取自 `LN-SJ01` 这类 lineId，新增的设备天然挂在对的产线下 */
export function nextEquipmentId(lineId: string): string {
  const short = lineId.replace(/[^A-Z0-9]/g, "").slice(3) || "NEW";
  const prefix = `EQ-${short}-`;
  const nn = eam.equipments.reduce(
    (m, e) => (e.id.startsWith(prefix) ? Math.max(m, Number(e.id.slice(prefix.length)) || 0) : m),
    0,
  );
  return `${prefix}${String(nn + 1).padStart(2, "0")}`;
}

/**
 * 有 `id` 就地改、没有就新建并补 id。
 *
 * 为什么合并成一个：演示里「新增」和「编辑」在客户眼里是同一个动作（点保存就该在列表里看到它），
 * 拆成两个端点只是让 mock 多写一半重复代码。返回最终行，页面直接用它刷新。
 */
export function upsertRow<T extends { id: string }>(rows: T[], data: Partial<T>): T {
  const hit = data.id ? rows.find((r) => r.id === data.id) : undefined;
  if (hit) {
    Object.assign(hit, data);
    return hit;
  }
  const rest: Partial<T> = { ...data };
  delete rest.id;
  const created = { ...rest, id: data.id ?? "" } as T;
  rows.unshift(created);
  return created;
}

/** 按 id 删除，回是否删掉（回 false 时调用方给「记录不存在」而不是静默成功） */
export function removeRow<T extends { id: string }>(rows: T[], id: string): boolean {
  const i = rows.findIndex((r) => r.id === id);
  if (i < 0) return false;
  rows.splice(i, 1);
  return true;
}

/* ── 其余状态机（AC 作业票/隐患、AS 请购/出入库、AM 点检、AG 同步）──────── */

/**
 * 作业票的审批节点序列。A 级比 B 级多一道厂级审批——这条分支是附录 B2 状态机里
 * 唯一需要当场解释给客户的设计（「A 级动火要厂长签」）。
 *
 * 状态 = 「下一个待办的节点名」，所以不给一份独立的 status 数组：
 * `申请` 之后依次是各节点，节点走完即 `已签发`；最后一个节点叫「签发」，它的完成态写成 `已签发`。
 */
const PERMIT_FLOW = {
  A: ["班组审批", "安全部门审批", "厂级审批", "签发"],
  B: ["班组审批", "安全部门审批", "签发"],
} as const;

function permitStatus(grade: keyof typeof PERMIT_FLOW, done: number): WorkPermit["status"] {
  if (done <= 0) return "申请";
  const nodes = PERMIT_FLOW[grade];
  if (done >= nodes.length) return "已签发";
  return nodes[done] === "签发" ? "已签发" : (nodes[done] as WorkPermit["status"]);
}

/** `pass=false` 即驳回：审批节点砍回「申请」之后，留一条驳回痕迹（不静默回退） */
export function approvePermit(id: string, pass = true, by = "安环部 何敏"): WorkPermit | undefined {
  const p = find(eam.workPermits, id);
  if (!p || p.status === "作业中" || p.status === "已关闭") return p;
  const nodes = PERMIT_FLOW[p.grade];
  const done = p.approvedBy.length - 1;
  const at = nowStamp();
  if (!pass) {
    p.approvedBy = [...p.approvedBy.slice(0, 1), { node: "驳回", by, at }];
    p.status = "申请";
    return p;
  }
  if (done < 0 || done >= nodes.length) return p;
  p.approvedBy.push({ node: nodes[done], by, at });
  p.status = permitStatus(p.grade, done + 1);
  return p;
}

export function startPermit(id: string): WorkPermit | undefined {
  const p = find(eam.workPermits, id);
  if (p && p.status === "已签发") {
    p.status = "作业中";
    p.approvedBy.push({ node: "开始作业", by: p.applicant, at: nowStamp() });
  }
  return p;
}

export function closePermit(id: string): WorkPermit | undefined {
  const p = find(eam.workPermits, id);
  if (p && (p.status === "作业中" || p.status === "已签发")) {
    p.status = "已关闭";
    p.approvedBy.push({ node: "作业关闭", by: p.applicant, at: nowStamp() });
  }
  return p;
}

/**
 * 隐患整改填报：→ 待验收。
 *
 * `by` 记进 `rectifiedBy`：闭环页只有措施文本、没有「谁改的、谁验的」，
 * 那这套流程就只是把状态字段推了一格，客户不会认它是**隐患闭环**。
 */
export function rectifyHazard(id: string, measure: string, by = "张伟"): Hazard | undefined {
  const h = find(eam.hazards, id);
  if (!h || h.status === "已闭环") return h;
  if (measure) h.measure = measure;
  h.rectifiedBy = by;
  h.status = "待验收";
  return h;
}

export function acceptHazard(id: string, by = "安环部 何敏"): Hazard | undefined {
  const h = find(eam.hazards, id);
  if (h && h.status !== "已闭环") {
    h.status = "已闭环";
    h.acceptedBy = by;
    h.closedAt = nowStamp();
  }
  return h;
}

/** 请购单：待审核 → 已请购 → 已到货（到货即入库，写一条入库流水） */
export function approvePurchase(id: string): PurchaseRequest | undefined {
  const p = find(eam.purchaseRequests, id);
  if (p && p.status === "待审核") p.status = "已请购";
  return p;
}

export function receivePurchase(id: string): { pr?: PurchaseRequest; msg: string } {
  const p = find(eam.purchaseRequests, id);
  if (!p) return { msg: `请购单 ${id} 不存在` };
  if (p.status === "已到货") return { pr: p, msg: "该请购单已到货，未重复入库" };
  const part = partOf(p.spId);
  if (!part) return { msg: `备件 ${p.spId} 主数据缺失` };
  const at = nowStamp();
  part.qty += p.qty;
  p.status = "已到货";
  eam.stockTxns.unshift({
    id: `ST-${String(eam.stockTxns.length + 1).padStart(4, "0")}`,
    spId: p.spId,
    type: "入库",
    qty: p.qty,
    person: "采购到货",
    at,
    balance: part.qty,
  });
  return { pr: p, msg: `${part.name} 入库 ${p.qty}${part.unit}，现库存 ${part.qty}${part.unit}` };
}

/** 手工入库（AS0002 的「入库」按钮）：只动库存 + 记流水，不碰寿命记录 */
export function stockIn(spId: string, qty: number, person: string, note = ""): SparePart | undefined {
  const part = partOf(spId);
  if (!part || qty <= 0) return part;
  part.qty += qty;
  eam.stockTxns.unshift({
    id: `ST-${String(eam.stockTxns.length + 1).padStart(4, "0")}`,
    spId,
    type: "入库",
    qty,
    person: person || "库管员 陈明",
    at: nowStamp(),
    balance: part.qty,
    note,
  });
  return part;
}

/** 点检结果录入：异常即产一条「人工点检」报警（AM0005 → AO0003 的联动） */
export function submitInspection(
  id: string,
  result: InspectionTask["result"],
  note: string,
  by = "李强",
): InspectionTask | undefined {
  const t = find(eam.inspections, id);
  if (!t) return undefined;
  t.result = result;
  t.doneAt = nowStamp();
  if (note) t.note = note;
  if (result === "异常" && !eam.alarms.some((a) => a.msg.includes(t.id))) {
    const at = nowStamp();
    eam.alarms.unshift({
      id: nextAlarmId(eam.alarms, at),
      pointId: "",
      source: "人工点检",
      eqId: t.eqId,
      level: "报警",
      value: 0,
      msg: `点检「${t.name}」发现异常：${note || "详见点检记录"}（记录 ${t.id}，点检人 ${by}）`,
      occurredAt: at,
      status: "活动",
    });
    bumpHealth(t.eqId, -4);
  }
  return t;
}

export function togglePmPlan(id: string, enabled: boolean): PmPlan | undefined {
  const plan = eam.pmPlans.find((p) => p.id === id);
  if (plan) plan.enabled = enabled;
  return plan;
}

/**
 * 登记一次特种设备定期检验：状态回「在用」、下次到期日按检验周期外推。
 *
 * **不撤销已产生的到期报警**——真实安监口径里「超期未检」这条记录要留痕，
 * 补检之后是「已整改」而不是「当没发生过」。演示时客户问起这一条，答得上来。
 */
export function inspectSpecial(id: string, nextInspectAt: string): SpecialEquipment | undefined {
  const s = find(eam.specialEquipments, id);
  if (!s) return undefined;
  s.nextInspectAt = nextInspectAt || addDays(s.nextInspectAt, s.inspectCycleMonths * 30);
  s.status = "在用";
  return s;
}

/** 计量器具周期检定：同上，回写下次检定日 */
export function verifyMetering(id: string, nextVerifyAt: string, certNo?: string): MeteringDevice | undefined {
  const m = find(eam.meteringDevices, id);
  if (!m) return undefined;
  m.nextVerifyAt = nextVerifyAt || addDays(m.nextVerifyAt, m.verifyCycleMonths * 30);
  if (certNo) m.certNo = certNo;
  m.status = "合格";
  return m;
}

/** 集成接口模拟同步：推进 lastAt/lastStatus，同步条数由调用方按实体数现算 */
export function syncIntegration(id: string): IntegrationApi | undefined {
  const api = find(eam.integrations, id);
  if (!api) return undefined;
  api.lastAt = nowStamp();
  api.lastStatus = api.id === "IF-006" ? "未启用" : "成功";
  return api;
}

/**
 * PHM 一键转诊断工单（AM0004 → AW0003）。
 *
 * 取**最严重的那条发现**而不是第一条：诊断页列的是「各测点距预警线的程度」，
 * 工单要写清「怀疑什么、建议做什么」，客户问「这单子凭什么开」时两页能当场对上。
 */
export function phmToWorkOrder(eqId: string, assignee = ""): WorkOrder | undefined {
  const e = eqOf(eqId);
  if (!e) return undefined;
  const view = phmView(eqId);
  const top = view.findings.find((f) => f.level === "报警") ?? view.findings[0];
  return createWorkOrder({
    eqId,
    title: `${e.name} 预测性检修（${top.part}）`,
    faultDesc: `${top.symptom}。诊断建议：${top.advice}`,
    priority: top.level === "报警" ? "高" : "中",
    source: "PdM诊断",
    assignee,
    by: "PHM 诊断",
    note: `健康度 ${view.health}，预测剩余寿命 ${view.rulDays} 天`,
    planHours: 6,
  });
}

/* ── 聚合视图（无分页端点，页面一次拿全）──────────────────────────────── */

export function dashboard(): DashboardOverview {
  scanDeadlines();
  const eqs = eam.equipments;
  const active = eam.alarms.filter((a) => a.status === "活动");
  const urgent = active.filter((a) => a.level === "紧急");
  const lifeSpan = eam.lifeRecords.filter((r) => r.status !== "已更换" && r.status !== "已折算");
  const spareValue = eam.spareParts.reduce((s, p) => s + p.qty * p.price, 0) / 10000;
  /* 近 7 天刻度按演示时钟倒推，不读墙上时间（见 DEMO_T0 注释） */
  const days = Array.from({ length: 7 }, (_, i) => addDays(DEMO_TODAY, i - 6).slice(5));
  return {
    plant: `${eam.params.plantName} 设备全生命周期管理`,
    deviceTotal: eqs.length,
    running: eqs.filter((e) => e.status === "运行").length,
    faultStop: eqs.filter((e) => e.status === "故障停机").length,
    avgHealth: Math.round(eqs.reduce((s, e) => s + e.health, 0) / eqs.length),
    activeAlarm: active.length,
    urgentAlarm: urgent.length,
    openWorkOrder: eam.workOrders.filter((w) => w.status !== "已关闭").length,
    spareValue: Math.round(spareValue * 10) / 10,
    spareTurnover: KPI_HISTORY.turnover[KPI_HISTORY.turnover.length - 1],
    oee: KPI_HISTORY.oee[KPI_HISTORY.oee.length - 1],
    faultRate: Math.round((active.length / eqs.length) * 1000) / 10,
    todo: {
      寿命超期: lifeSpan.filter((r) => r.status === "超期").length,
      寿命临期: lifeSpan.filter((r) => r.status === "临期").length,
      特种待检: eam.specialEquipments.filter((s) => daysTo(s.nextInspectAt) < eam.params.warnDays).length,
      计量临检: eam.meteringDevices.filter((m) => daysTo(m.nextVerifyAt) < eam.params.warnDays).length,
      活动报警: active.length,
    },
    alarms: active
      .toSorted((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
      .slice(0, 12)
      .map((a) => ({ id: a.id, level: a.level, msg: a.msg, eqId: a.eqId, occurredAt: a.occurredAt, status: a.status })),
    healthTrend: {
      days,
      /* 趋势线以「当前均值」为终点往回铺——剧本改完健康度后整条曲线会平移，
         这是大屏「数字活了」的来源，也是不做真历史存档的取巧处（见 equipment.md 附录 B4）。 */
      series: eam.lines.map((l, li) => {
        const list = eam.equipments.filter((e) => e.lineId === l.id);
        const avg = list.length ? list.reduce((s, e) => s + e.health, 0) / list.length : 80;
        return {
          name: l.name,
          data: days.map((_, di) => Number((avg - (days.length - 1 - di) * (1.2 + (li % 3) * 0.5)).toFixed(1))),
        };
      }),
    },
    lifeRank: lifeSpan
      .toSorted((a, b) => lifeRatio(b) - lifeRatio(a))
      .slice(0, 10)
      .map((r) => ({
        serial: r.serial,
        spName: partName(r.spId),
        holder: r.holder,
        ratio: Math.round(lifeRatio(r) * 100),
        status: r.status,
      })),
    lines: eam.lines.map((l) => {
      const list = eam.equipments.filter((e) => e.lineId === l.id);
      return {
        name: l.name,
        health: list.length ? Math.round(list.reduce((s, e) => s + e.health, 0) / list.length) : 0,
        deviceCount: list.length,
        alarms: eam.alarms.filter((a) => list.some((e) => e.id === a.eqId) && a.status === "活动").length,
      };
    }),
  };
}

export function healthBoard(): HealthBoard {
  scanDeadlines();
  const buckets: HealthBoard["buckets"] = [
    { label: "≥90 优", color: "var(--color-green-500, #22c55e)", count: 0 },
    { label: "80-89 良", color: "var(--color-lime-500, #84cc16)", count: 0 },
    { label: "70-79 中", color: "var(--color-amber-500, #f59e0b)", count: 0 },
    { label: "60-69 差", color: "var(--color-orange-500, #f97316)", count: 0 },
    { label: "<60 危险", color: "var(--color-red-500, #ef4444)", count: 0 },
  ];
  for (const e of eam.equipments) {
    const i = e.health >= 90 ? 0 : e.health >= 80 ? 1 : e.health >= 70 ? 2 : e.health >= 60 ? 3 : 4;
    buckets[i].count += 1;
  }
  return {
    lines: eam.lines.map((l) => {
      const list = eam.equipments.filter((e) => e.lineId === l.id);
      return {
        id: l.id,
        name: l.name,
        area: l.area,
        avgHealth: list.length ? Math.round(list.reduce((s, e) => s + e.health, 0) / list.length) : 0,
        devices: list.map((e) => ({
          id: e.id,
          name: e.name,
          model: e.model,
          health: e.health,
          status: e.status,
          level: e.level,
        })),
      };
    }),
    buckets,
  };
}

export function kpiSet(): KpiSet {
  scanDeadlines();
  const openWo = eam.workOrders.filter((w) => w.status !== "已关闭");
  const closedThisMonth = eam.workOrders.filter((w) => (w.closedAt ?? w.createdAt).slice(0, 7) === DEMO_MONTH);
  const hours = eam.workOrders.reduce((s, w) => s + w.actualHours, 0);
  const perPerson: Record<string, { orders: number; hours: number }> = {};
  for (const w of eam.workOrders) {
    if (!w.assignee) continue;
    const rec = (perPerson[w.assignee] ??= { orders: 0, hours: 0 });
    rec.orders += 1;
    rec.hours += w.actualHours;
  }
  const rank = Object.entries(perPerson)
    .map(([name, v]) => ({
      name,
      orders: v.orders,
      hours: v.hours,
      score: Math.min(99, Math.round(70 + v.hours * 1.6 + v.orders * 2)),
    }))
    .toSorted((a, b) => b.score - a.score);
  const faultRateNow =
    Math.round((eam.alarms.filter((a) => a.status === "活动").length / eam.equipments.length) * 1000) / 10;
  const months = [...KPI_MONTHS];
  const last = months.length - 1;
  const oee = [...KPI_HISTORY.oee];
  const turnover = [...KPI_HISTORY.turnover];
  const perf = [...KPI_HISTORY.performance];
  const rate = [...KPI_HISTORY.faultRate];
  /* 当月按真实数据现算——剧本走完，大屏/分析页当月那一根会真的动 */
  rate[last] = faultRateNow;
  oee[last] = Math.round((86.8 - faultRateNow * 0.6 + closedThisMonth.length * 0.1) * 10) / 10;
  turnover[last] = Math.round((2.4 + eam.stockTxns.filter((t) => t.type === "领用").length * 0.02) * 100) / 100;
  perf[last] = rank.length ? Math.round(rank.reduce((s, r) => s + r.score, 0) / rank.length) : perf[last];

  return {
    cards: [
      {
        label: "设备综合效率 OEE",
        value: String(oee[last]),
        unit: "%",
        delta: Math.round((oee[last] - oee[last - 1]) * 10) / 10,
        hint: "较上月",
      },
      {
        label: "故障率",
        value: String(rate[last]),
        unit: "%",
        delta: Math.round((rate[last] - rate[last - 1]) * 10) / 10,
        hint: "较上月",
      },
      {
        label: "未闭合工单",
        value: String(openWo.length),
        unit: "张",
        delta: openWo.length - closedThisMonth.length,
        hint: "本月已闭环比",
      },
      { label: "维修工时（本月）", value: String(Math.round(hours)), unit: "h", delta: 8.5, hint: "同比" },
      {
        label: "备件库存金额",
        value: String(Math.round((eam.spareParts.reduce((s, p) => s + p.qty * p.price, 0) / 10000) * 10) / 10),
        unit: "万元",
        delta: -2.1,
        hint: "较上月",
      },
      {
        label: "活动报警",
        value: String(eam.alarms.filter((a) => a.status === "活动").length),
        unit: "条",
        delta: 0,
        hint: "实时",
      },
    ],
    months,
    faultRate: rate,
    oee,
    turnover,
    performance: perf,
    sourceMix: (["报警转单", "PM计划", "故障报修", "PdM诊断", "人工"] as const)
      .map((name) => ({ name, value: eam.workOrders.filter((w) => w.source === name).length }))
      .filter((x) => x.value > 0),
    personRank: rank,
  };
}

export function realtimeView(eqId: string): RealtimeView {
  initHistory();
  const e = eqOf(eqId);
  const pts = eam.points.filter((p) => p.eqId === eqId);
  return {
    eqId,
    eqName: e ? `${e.name}（${e.model}）` : eqId,
    health: e?.health ?? 0,
    status: e?.status ?? "运行",
    times: [...eam.times],
    series: pts.map((p) => {
      const rule = ruleOf(p.id);
      return {
        pointId: p.id,
        name: `${p.name}（${p.metricCode}）`,
        unit: p.unit,
        data: [...(eam.history[p.id] ?? [])],
        warn: rule?.warn ?? 0,
        alarm: rule?.alarm ?? 0,
      };
    }),
    activeAlarms: eam.alarms
      .filter((a) => a.eqId === eqId && a.status === "活动")
      .map((a) => ({ id: a.id, level: a.level, msg: a.msg, occurredAt: a.occurredAt })),
  };
}

export function phmView(eqId: string): PhmView {
  scanDeadlines();
  const e = eqOf(eqId);
  const health = e?.health ?? 80;
  const pts = eam.points.filter((p) => p.eqId === eqId);
  const dims = ["振动", "温度", "电流", "油液", "绝缘"];
  const radar = dims.map((name, i) => {
    const hit = pts.find((p) => p.metric === name);
    const base = hit ? Math.max(0, 100 - (pointWarnRatio(hit) - 0.6) * 90) : 70 + i * 4;
    return { name, value: Math.round(Math.max(20, Math.min(99, base + (health - 80) * 0.5))), ref: 90 };
  });
  /* 劣化外推：健康度按近 30 天线性下降，跌到 50 即建议更换——这就是「RUL 预测」的全部机理，
     演示要的是一条能自圆其说的曲线，不是真模型（见 equipment.md「Demo 取巧」）。 */
  const span = Math.max(6, Math.round(((health - 50) / Math.max(0.6, (92 - health) / 30)) * 1));
  const days = Array.from({ length: 30 + span }, (_, i) => addDays(DEMO_TODAY, i - 29));
  const perDay = (92 - health) / 30;
  const degrade = {
    days: days.map((d) => d.slice(5)),
    health: days.map((_, i) => (i < 30 ? Number((92 - perDay * i).toFixed(1)) : NaN)),
    forecast: days.map((_, i) =>
      i >= 28 ? Number((health - ((i - 29) / Math.max(span, 1)) * (health - 48)).toFixed(1)) : NaN,
    ),
  };
  const findings = pts
    .filter((p) => pointWarnRatio(p) > 0.85)
    .map((p) => ({
      part: `${p.partName}（${p.name}）`,
      symptom: `当前 ${p.value}${p.unit}，已达预警阈值的 ${Math.round(pointWarnRatio(p) * 100)}%`,
      level: (pointWarnRatio(p) >= 1.2 ? "报警" : "预警") as PhmView["findings"][number]["level"],
      advice:
        p.metric === "温度"
          ? "检查润滑与冷却水路，建议本旬检修窗口更换润滑脂并复测"
          : p.metric === "振动"
            ? "疑似轴承初期剥落，建议安排精密点检（频谱 + 包络解调）"
            : "结合工单工时评估更换周期，纳入寿命考核台账",
    }));
  return {
    eqId,
    eqName: e ? `${e.name}（${e.model}）` : eqId,
    health,
    radar,
    rulDays: Math.max(3, span),
    rulConfidence: Math.min(95, 60 + pts.length * 4),
    degrade,
    findings: findings.length
      ? findings
      : [{ part: "整体", symptom: "各测点均在预警线以内", level: "预警", advice: "维持当前巡检频次即可" }],
  };
}

/**
 * 供报表中心（AR0002）现算的设备/工单汇总。
 *
 * 入参既接受 `YYYY-MM` 也接受 `YYYY`（报表目录里 `period=年` 的那几张要年报口径），
 * 按**前缀长度**决定比到第几位而不是判字符串等号：年报 `2026` 要能圈进全年十二个月，
 * 而写死 `.slice(0, 7)` 会让年报查出来是空表——空表在演示里等于"报表功能坏了"。
 */
export function monthlyReport(range: string) {
  const n = range.length >= 7 ? 7 : 4;
  const hit = (at?: string) => !!at && at.slice(0, n) === range.slice(0, n);
  const wos = eam.workOrders.filter((w) => hit(w.closedAt ?? w.createdAt));
  const eqs = eam.equipments;
  return eqs.map((e) => {
    const mine = wos.filter((w) => w.eqId === e.id);
    const alarms = eam.alarms.filter((a) => a.eqId === e.id && hit(a.occurredAt));
    const line = lineOf(e.lineId);
    return {
      eqId: e.id,
      eqName: e.name,
      model: e.model,
      lineName: line?.name ?? "",
      level: e.level,
      health: e.health,
      runHours: e.runHours,
      alarmCount: alarms.length,
      urgentCount: alarms.filter((a) => a.level === "紧急").length,
      woCount: mine.length,
      workHours: Math.round(mine.reduce((s, w) => s + w.actualHours, 0) * 10) / 10,
      materialCost: Math.round(
        mine.reduce((s, w) => s + w.materials.reduce((m, x) => m + (partOf(x.spId)?.price ?? 0) * x.qty, 0), 0),
      ),
      stopMinutes: mine.reduce((s, w) => s + (w.priority === "紧急" ? 120 : 40), 0),
    };
  });
}

/** 单设备详情（结构树 / 档案 / 移动端 H5 共用） */
export function equipmentDetail(eqId: string) {
  const e = eqOf(eqId);
  if (!e) return null;
  const children = eam.equipments.filter((x) => x.parentId === eqId);
  const parent = e.parentId ? eqOf(e.parentId) : undefined;
  return {
    eq: e,
    line: lineOf(e.lineId),
    parent,
    children: children.map((c) => ({ id: c.id, name: c.name, model: c.model, health: c.health, status: c.status })),
    events: eam.lifecycleEvents.filter((l) => l.eqId === eqId).toSorted((a, b) => (a.at < b.at ? -1 : 1)),
    points: eam.points.filter((p) => p.eqId === eqId),
    alarms: eam.alarms.filter((a) => a.eqId === eqId).toSorted((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)),
    workOrders: eam.workOrders.filter((w) => w.eqId === eqId),
    lifeRecords: eam.lifeRecords.filter((r) => r.mountedEqId === eqId),
    docs: eam.docs.filter((d) => d.eqId === eqId),
    inspections: eam.inspections.filter((i) => i.eqId === eqId),
  };
}

/** 结构树节点（AE0002 的 Tree 组件形状；children 递归，叶子为空数组而不是 undefined，
 * 否则 PrimeVue Tree 会把空数组渲染成「可展开但没内容」的假节点） */
interface EqTreeNode {
  id: string;
  label: string;
  health: number;
  status: Equipment["status"];
  level: Equipment["level"];
  children: EqTreeNode[];
}

function eqTreeNode(pid?: string): EqTreeNode[] {
  return eam.equipments
    .filter((e) => (pid ? e.parentId === pid : !e.parentId))
    .map((e) => ({
      id: e.id,
      label: `${e.name}（${e.model}）`,
      health: e.health,
      status: e.status,
      level: e.level,
      children: eqTreeNode(e.id),
    }));
}

/** 全量结构树（AE0002）：顶层设备 + children 递归 */
export function equipmentTree(): EqTreeNode[] {
  return eqTreeNode();
}

/** 供「设备不存在」的 H5 扫码路径给出可读结果 */
export function scanQr(code: string) {
  const hit = eam.equipments.find((e) => e.qrCode === code || e.id === code || e.name === code);
  return hit ? equipmentDetail(hit.id) : null;
}
