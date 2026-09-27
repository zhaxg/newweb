import { reactive } from "vue";

import type {
  ActualRecord,
  AlarmBoardDto,
  AlarmLevel,
  AlarmRule,
  AssessRow,
  BalanceSheet,
  CollectChannel,
  DispatchOrder,
  DispatchSuggestion,
  EnergyAlarm,
  EnergyPlan,
  EnergyMedium,
  FlowDirection,
  GasHolder,
  GasLineDto,
  GasPlantViewDto,
  GasScenarioDto,
  GasSimViewDto,
  GasViewDto,
  Instrument,
  KeyEquip,
  MediumCode,
  MeterPoint,
  PointHistoryResult,
  PointReading,
  PointSeries,
  PowerViewDto,
  PriceTemplate,
  QualityTicket,
  Quota,
  ReportTemplate,
  SettlementBill,
  SteamViewDto,
  TopoViewDto,
  UsingUnit,
} from "@/api/energy/types";

import * as M from "./data/model";
import {
  ALARM_RULES,
  CHANNELS,
  INSTRUMENTS,
  KEY_EQUIPS,
  METER_POINTS,
  POINT_ID,
  PRICE_TEMPLATES,
  REPORT_TEMPLATES,
  TOPO_GAS,
  TOPO_GASPLANT,
  TOPO_POWER,
  TOPO_STEAM,
  verifyStatusOf,
} from "./data/seed";
import type { TopoScene } from "./data/seed";

/**
 * 能源域 mock 的**唯一状态源**：实时层积分、状态机、按需落库的月账都在这里。
 *
 * 三条贯穿全文件的纪律：
 *
 * 1. **本文件不写业务数字**。产量、定额、系数、热值、电价、高低红线、放散率全在 `data/model.ts`，
 *    这里只调它的派生函数。唯一例外是**演示机制参数**（节拍 ms、序号宽度、时间偏移）和
 *    它自己导出的剧本常量（`SIM_LDG_SURGE`/`QUALITY_INJECT`/`DISPATCH_EFFECT_HOURS`）——
 *    那些常数为什么叫在 model 而不是这里，model 的注释里各有一条。
 * 2. **两层时钟严格分离**。月账层（实绩/平衡/结算/考核/"本月累计"）只在 `bootstrap()` 与各
 *    `run*` 动作里重算，tick 永远不动它；实时层（柜位、瞬时流量、负荷当前点、活动报警）每拍抖。
 *    客户追问「上月电费多少」必须永远同一个答案。
 * 3. **派生量现算、状态量落库**。柜位是状态（要承载剧本），所以存在这里；
 *    放散率、自发电率、吨钢能耗是纯函数结果，存在这里就会漂，所以每次现算（见 `overview.ts`）。
 *
 * `reactive` 只为开发期可视化与页面直读快照用；handler 每次都现读，不依赖响应式推送。
 */

/* ══════════════════════════════════════════════════════════════════════════
   0. 演示机制常量
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 实时节拍（ms）。**定时器归页面**（`onMounted` 起、`onBeforeUnmount` 清）——
 * AGENTS 点过 KeepAlive 缓存页后台轮询的问题，store 只提供 `tickRealtime()` 这个动作本体。
 */
export const TICK_MS = 3000;
/** 一拍代表的现场时长（min）：柜位积分与待补传条数的换算基数 */
const TICK_MIN = 1;
/** 柜位历史长度（实时曲线直接画它） */
const HISTORY_LEN = 60;

/**
 * 确定性伪随机。**不用 `Math.random`**：演示要求「同一场剧本演三遍，第三遍幕 2 仍在第 8 拍报警」，
 * 随机数会让销售现场碰到一次不抖就整段不可信。固定种子 + 同子步进 = 可复现的抖动。
 */
let rndState = 20260927;
function rnd(): number {
  rndState = (rndState * 1103515245 + 12345) & 0x7fffffff;
  return rndState / 0x7fffffff;
}
/** 对称抖动：[-1, 1] */
const jitter = () => rnd() * 2 - 1;

const pad = (n: number, w = 3) => String(n).padStart(w, "0");
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** 演示时戳：`DEMO_T0` + tick 推进（月账不跟着走，见文件头第 2 条） */
export function nowStamp(extraMs = 0) {
  return M.stampOf(ems.step * TICK_MS + extraMs);
}

/** 介质编码 → `gasHourlyFlows`/`holderBases` 的小写 key（三处共用，别在调用点各写一遍 toLowerCase） */
const mediaKey = (media: M.GasMedia) => media.toLowerCase() as "bfg" | "cog" | "ldg";

/* ══════════════════════════════════════════════════════════════════════════
   1. 状态
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 剧本游标：`tick` 走到 `ticks` 那一拍仍要执行（爬满才收尾），进气增量随之回落。
 *
 * ⚠️ 剧本驱动的是**整个同介质柜组**，不是单台柜。并联运行的煤气柜共用管网压力，
 * 现场不可能出现「1#柜 88%、2#柜还停在 56%」；更要命的是 `currentScenario()` 喂给仿真的
 * 是柜组**柜容加权平均**柜位，只推单柜的话仿真看到的是 72.6%，而曲线画的是 88%——
 * 幕 2 的倒计时与幕 3 的建议就建立在两个不同的数上（这正是本文开头禁止的页间矛盾）。
 * 所以起止只存一个**柜组级增量** `deltaPct`，每柜从自己的当前位起爬同样的幅度，
 * 柜组均值精确落到 `toPct`，柜间原有的落差保留。
 */
interface Surge {
  media: M.GasMedia;
  /** 已推进的拍数 */
  tick: number;
  /** 总拍数 */
  ticks: number;
  /** 柜组目标位 %（幕 2 = 88）与本次每柜的统一抬升幅度 */
  toPct: number;
  deltaPct: number;
  /** 开演时各柜自己的柜位（ramp 的起点，逐柜不同） */
  starts: Record<string, number>;
  /** 当前追加进气 m³/min */
  extraM3min: number;
  /** 爬到 `toPct` 之后峰吹再持续的拍数（见 `M.SIM_LDG_SURGE.holdTicks` 的说明） */
  holdTicks: number;
}

export interface EmsState {
  step: number;
  /** 月账可调参数（CFB 台数、产量修正）；只有 `run*` 与 `execDone` 会改它 */
  effect: M.FlowEffect;
  /** 主数据（seed/model 的数组**直接引用**：EG0002 改单元，model 的派生立刻跟着变） */
  mediums: EnergyMedium[];
  units: UsingUnit[];
  quotas: Quota[];
  meterPoints: MeterPoint[];
  channels: CollectChannel[];
  instruments: Instrument[];
  alarmRules: AlarmRule[];
  priceTemplates: PriceTemplate[];
  keyEquips: KeyEquip[];
  reportTemplates: ReportTemplate[];
  /** 单据与状态机 */
  alarms: EnergyAlarm[];
  orders: DispatchOrder[];
  suggestions: DispatchSuggestion[];
  tickets: QualityTicket[];
  plans: EnergyPlan[];
  /** 按需落库的月账 */
  actuals: ActualRecord[];
  balances: BalanceSheet[];
  settlements: SettlementBill[];
  assess: AssessRow[];
  /** 实时层 */
  holders: GasHolder[];
  surge: Surge | null;
  /** 当前负荷 MW（EM0001/EM0004/大屏的"当前点"），围绕当小时基线抖 */
  loadMw: number;
  /** 负荷近 60 拍历史（MW）：EM0001 的实时迷你曲线。与柜位 history 同理——
   *  现场只有一条会走的线，幕 8「处置后斜率真的变了」要靠它被客户肉眼看见 */
  loadHistory: number[];
  /** 各机组当前出力 MW（EM0001 机组柱图），围绕月账派生值抖 */
  unitMw: Record<string, number>;
  /** 建议 id → 生成时锁存的 scenario（`acceptSuggestion` 搬到单、`execDone` 兑现） */
  sugScenario: Record<string, M.GasScenario>;
  /** 调度令 id → 采纳时锁存的 scenario（`execDone` 兑现） */
  orderScenario: Record<string, M.GasScenario>;
  /** 检定扫描幂等闸：超期报警只在装配时发一次，避免每次开页刷屏 */
  verified: boolean;
  seq: { alarm: number; order: number; suggest: number; ticket: number; plan: number };
}

export const ems = reactive({
  step: 0,
  effect: {},
  mediums: M.MEDIUM_LIST,
  units: M.UNIT_LIST,
  quotas: M.QUOTAS,
  meterPoints: METER_POINTS,
  channels: CHANNELS,
  instruments: INSTRUMENTS,
  alarmRules: ALARM_RULES,
  priceTemplates: PRICE_TEMPLATES,
  keyEquips: KEY_EQUIPS,
  reportTemplates: REPORT_TEMPLATES,
  alarms: [],
  orders: [],
  suggestions: [],
  tickets: [],
  plans: [],
  actuals: [],
  balances: [],
  settlements: [],
  assess: [],
  holders: [],
  surge: null,
  loadMw: 0,
  loadHistory: [],
  unitMw: {},
  sugScenario: {},
  orderScenario: {},
  verified: false,
  seq: { alarm: 0, order: 0, suggest: 0, ticket: 0, plan: 0 },
}) as unknown as EmsState;

/* 柜位的实时快照不是 model 的基线：装配时先按基线铺一遍，之后只有 tick 会动它 */
function initHolders() {
  ems.holders = M.holderBases(ems.effect).map((h) => ({
    ...h,
    history: Array.from({ length: HISTORY_LEN }, () => h.basePct),
  }));
  const gen = M.selfGeneration(ems.effect);
  ems.unitMw = Object.fromEntries(gen.units.map((u) => [u.id, u.mw]));
  ems.loadMw = M.loadBaseline(new Date(M.DEMO_T0).getHours());
}

/* ══════════════════════════════════════════════════════════════════════════
   2. 通用小工具（实体定位 / 幂等 upsert / 序号）
   ══════════════════════════════════════════════════════════════════════════ */

const find = <T extends { id: string }>(list: T[], id: string) => list.find((r) => r.id === id);

export const unitName = (id: string) => M.unitName(id);
export const pointOf = (id: string) => find(ems.meterPoints, id);
export const pointName = (id: string) => pointOf(id)?.name ?? id;
export const holderOf = (id: string) => find(ems.holders, id);
/** 介质 → 计量点表号 id（报警规则挂在柜位表上，规则与柜的桥就是这一层） */
export const holderPointId = (holderId: string) => POINT_ID[`P-HOL-${holderId}`];
export const holdersOf = (media: MediumCode) => ems.holders.filter((h) => h.mediaCode === media);
/** 同介质柜组的总柜容（并联柜组的积分对象是这个和，不是单柜） */
const groupCapM3 = (media: MediumCode) => holdersOf(media).reduce((a, h) => a + h.capM3, 0);
/** 柜组加权平均柜位：`simulateGasBalance` 吃的就是这个柜组的**实时**柜位 */
export const liveLevelPct = (media: MediumCode) => {
  const list = holdersOf(media);
  const cap = list.reduce((a, h) => a + h.capM3, 0);
  return cap > 0
    ? round(
        list.reduce((a, h) => a + (h.levelPct * h.capM3) / cap, 0),
        1,
      )
    : 0;
};

/**
 * 当前瞬时情景（what-if / 规则引擎 / tick 的公共入参）。
 *
 * ⚠️ 必须带**实时柜位**：`levelPct` 用基线的话，剧本把柜位推到 88% 而倒计时仍按 62% 算，
 * 幕 2 与幕 3 就各说各话（`simulateGasBalance` 的注释里记着这个坑）。
 */
export function currentScenario(media: M.GasMedia = "LDG"): M.GasScenario {
  const s = ems.surge;
  const sc: M.GasScenario = { media, levelPct: liveLevelPct(media), holderId: focusHolderId(media) };
  if (s && s.media === media) {
    if (media === "LDG") sc.extraLdgM3min = s.extraM3min;
    if (media === "BFG") sc.extraBfgM3min = s.extraM3min;
  }
  return sc;
}

/**
 * 剧本柜 = 柜组里**柜位最高**的那台（现场就叫它「主柜」，其余是并列柜）。
 * 取最高而不是写死 1#：处置动作与倒计时看的是最紧的那口柜，取错柜会让报警比画面慢一拍。
 */
function focusHolderId(media: M.GasMedia) {
  const list = holdersOf(media);
  if (!list.length) return media === "LDG" ? "GH-LDG1" : media === "COG" ? "GH-COG1" : "GH-BFG1";
  return list.reduce((a, h) => (h.levelPct > a.levelPct ? h : a), list[0]).id;
}

/** 剧本的进气增量：柜位从 from 线性爬到 to 期间持续加，爬到顶后归零（气已经充进柜了） */
function surgeExtra(tick: number) {
  const ramp = clamp(tick / M.SIM_LDG_SURGE.ticks, 0, 1);
  return Math.round(M.SIM_LDG_SURGE.extraInM3min * ramp);
}

/* ══════════════════════════════════════════════════════════════════════════
   3. 月账层：按需生成落库
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 某月的 effect：把跨月系数只作用在产量上。
 *
 * 为什么系数乘在产量而不是结果上——`mediumFlows` 是「产量 × 定额」的唯一发生点，
 * 乘在产量上，实绩、平衡表、结算、考核四条链自动同比缩放，月份之间仍然自洽；
 * 乘在结果上就得给四张表各写一遍折算，那正是页间矛盾的产生方式。
 */
export function monthEffect(month: string): M.FlowEffect {
  const base = ems.effect;
  if (month === M.DEMO_MONTH) return base;
  const factor = month < M.DEMO_MONTH ? M.PREV_MONTH_OUTPUT_FACTOR : 1 / M.PREV_MONTH_OUTPUT_FACTOR;
  const src = { ...M.PRODUCTION, ...base.outputs };
  const outputs: Record<string, number> = {};
  for (const [k, v] of Object.entries(src)) outputs[k] = Math.round(v * factor);
  return { ...base, outputs };
}

/** 结算是否已定稿（EP0002 校正与重算的门控，energy.md B2.5） */
const finalizedMonths = () => new Set(ems.settlements.filter((b) => b.status === "已定稿").map((b) => b.month));

/**
 * 重点设备的两项数值：种子给的是占位 0，因为**折标与单耗只能从账上派生**。
 *
 * - `monthStdCoal`：所属工序该介质的月折标煤，按同工序同介质的**台数**分摊，
 *   再乘「年运行小时占比」——2#CFB 停役（runHours=0）就该是 0 tce，摊一份给它是最省事的错。
 * - `intensity`：**工序定额 × 能效等级系数**。设备铭牌单耗另写一个数，
 *   就会与 EP0001 的定额对不上（客户最爱拿这两页互查），所以宁可只用定额派生。
 */
function refreshKeyEquipCoal(effect: M.FlowEffect) {
  const flows = M.flows(effect);
  /**
   * 该设备折标煤的**归集层**：账记在厂级（`flows` 的 unitId 只有厂），设备挂在车间/工序。
   * 直接按 `k.unitId` 等值匹配的话，3/4 级单元的设备一律摊到 0 tce——
   * EP0006 上「空压组」那行月折标 0 就是这么来的。沿祖先链上溯到第一个有账的层，
   * 与 `quotaIntensityOf()` 同向，两列才来自同一个工序。
   */
  const rollupOf = (unitId: string, media: MediumCode) => {
    let p: UsingUnit | undefined = M.UNIT_MAP[unitId];
    while (p) {
      const coal = flows
        .filter((f) => f.unitId === p!.id && f.mediaCode === media && f.direction === "消耗")
        .reduce((a, f) => a + f.stdCoal, 0);
      if (coal > 0) return { id: p.id, coal };
      p = p.parentId ? M.UNIT_MAP[p.parentId] : undefined;
    }
    return { id: unitId, coal: 0 };
  };
  const rolls = ems.keyEquips.map((k) => rollupOf(k.unitId, k.energyMedia));
  /** 同层同介质的台数——分摊的分母必须与分子同层，否则两台机摊一份厂量却各算各的 */
  const peers = new Map<string, number>();
  rolls.forEach((r, i) => {
    const key = `${r.id}|${ems.keyEquips[i].energyMedia}`;
    peers.set(key, (peers.get(key) ?? 0) + 1);
  });
  ems.keyEquips.forEach((k, i) => {
    const n = peers.get(`${rolls[i].id}|${k.energyMedia}`) ?? 1;
    const runRatio = clamp(k.runHours / M.YEAR_HOURS, 0, 1);
    k.monthStdCoal = round(((rolls[i].coal / n) * runRatio) / 1000, 1);
    k.intensity = round(quotaIntensityOf(k.unitId, k.energyMedia) * M.EFF_GRADE_FACTOR[k.effGrade], 2);
  });
}

/** 本单元没有该介质定额行时，沿祖先链找厂级定额（设备挂在车间/工序，定额表只到厂级） */
function quotaIntensityOf(unitId: string, media: MediumCode) {
  let p: UsingUnit | undefined = M.UNIT_MAP[unitId];
  while (p) {
    const hit = ems.quotas.find((q) => q.unitId === p!.id && q.mediaCode === media && q.direction === "消耗");
    if (hit) return hit.intensity;
    p = p.parentId ? M.UNIT_MAP[p.parentId] : undefined;
  }
  return 0;
}

/**
 * 计划：把账上的流向搬成计划量。
 *
 * 计划量与实绩**同源同口径**（同一批 `flows()`，只是月份不同）——这是 EP0001「计划 vs 实绩」
 * 两列能并排放在同一张表里的唯一前提。产量列取该月的产量系数（`monthEffect`），
 * 单位一律**实物量原值**，页面上要「万 t」自己按 `DISP` 换算，不在这里预先缩小量级。
 */
function buildPlan(month: string, createdBy: string, status: EnergyPlan["status"]): EnergyPlan {
  const effect = monthEffect(month);
  const flows = M.flows(effect);
  const factor =
    month === M.DEMO_MONTH ? 1 : month < M.DEMO_MONTH ? M.PREV_MONTH_OUTPUT_FACTOR : M.NEXT_PLAN_OUTPUT_FACTOR;
  const products = M.PLANT_UNITS.map((u) => {
    const key = M.PLANT_PRODUCT[u.id];
    const tons = key ? (effect.outputs?.[key] ?? M.PRODUCTION[key]) : 0;
    return { unitId: u.id, product: M.productName(key ?? "AUX"), outputT: round(tons / 1e4, 2) };
  }).filter((p) => p.outputT > 0);
  return {
    id: `PLAN-${month.replace("-", "")}`,
    month,
    status,
    createdBy,
    approvedBy: status === "执行中" || status === "已归档" ? M.PEOPLE.assess : undefined,
    products,
    items: flows.map((f) => ({
      unitId: f.unitId,
      mediaCode: f.mediaCode,
      direction: f.direction,
      qty: round(f.qty, 0),
    })),
    remark: `${month} 检修计划与预测产量（系数 ×${round(factor, 2)}）编制｜定额口径同 EP0001`,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   4. 装配
   ══════════════════════════════════════════════════════════════════════════ */

/** 报警流水号：`ALM-20260927-001` */
const alarmId = () => `ALM-${M.DEMO_TODAY.replace(/-/g, "")}-${pad(++ems.seq.alarm)}`;
const orderId = () => `DD-${M.DEMO_TODAY.replace(/-/g, "")}-${pad(++ems.seq.order, 2)}`;
const ticketId = () => `QUAL-${M.DEMO_TODAY.replace(/-/g, "")}-${pad(++ems.seq.ticket, 2)}`;

/**
 * 历史报警种子：让 EM0005/大屏在**没有剧本**时也不空。
 * 状态分布刻意铺满四态（活动/已确认/已转调度令/已关闭），五级级别也各有一条——
 * 客户第一眼要看的是「这系统能管到几种报警」，不是数量。
 */
function seedAlarms() {
  /** `[表号, 介质, 单元, 级别, 类型, 文案, 状态, 距今分钟]` */
  const rows: Array<
    [string, MediumCode, string, AlarmLevel, EnergyAlarm["type"], string, EnergyAlarm["status"], number]
  > = [
    ["P-HOL-GH-LDG1", "LDG", M.PLANTS.STEEL, 1, "柜位高危", "1#转炉煤气柜位 87.4%，接近放散高限", "已关闭", 430],
    ["P-POW-G0", "ELEC", M.PLANTS.POWER_AUX, 2, "需量超限", "申报需量利用率 96%，正向超限逼近", "已关闭", 400],
    ["P-SINT-B1", "BFG", M.PLANTS.SINTER, 4, "越限", "烧结点火炉高炉煤气瞬时超定额 12%", "已关闭", 340],
    ["P-STEL-O0", "O2", M.PLANTS.STEEL, 2, "越限", "氧气总管压力瞬时低限", "已关闭", 300],
    ["P-IRON-01", "ELEC", M.PLANTS.IRON, 4, "通讯中断", "高炉鼓风计量通讯掉线 3 分钟，已续传", "已关闭", 260],
    ["P-POW-W1", "WATER", M.PLANTS.POWER_AUX, 3, "数据异常", "新水管网流量突增，疑似夜间泄漏", "已转调度令", 200],
    ["P-STEL-L0", "LDG", M.PLANTS.STEEL, 3, "数据异常", "转炉煤气回收量骤降 34%", "已确认", 150],
    ["P-HOL-GH-BFG1", "BFG", M.PLANTS.IRON, 2, "柜位高危", "1#高炉煤气柜位 84%，上升中", "已确认", 90],
    ["P-COK-C1", "COG", M.PLANTS.COKE, 3, "越限", "焦炉煤气柜出口压力偏高", "活动", 60],
    ["P-GAS-O1", "O2", M.PLANTS.GASPLANT, 5, "越限", "1#制氧机氧气产量低于计划曲线", "活动", 40],
    ["P-GEN-01", "ELEC", M.PLANTS.GEN, 3, "越限", "CCPP 出力逼近上限，余气消纳能力见顶", "活动", 20],
  ];
  ems.alarms = rows.map(([pointKey, mediaCode, unitId, level, type, message, status, agoMin]) => {
    const at = -agoMin * 60_000;
    const base: EnergyAlarm = {
      id: `ALM-${M.DEMO_MONTH.replace("-", "")}-${pad(ems.seq.alarm + 1)}`,
      time: M.stampOf(at),
      mediaCode,
      pointId: POINT_ID[pointKey],
      unitId,
      level,
      type,
      message,
      status,
    };
    ems.seq.alarm += 1;
    if (status === "已确认" || status === "已转调度令") {
      base.ackBy = M.PEOPLE.dispatcher;
      base.ackAt = M.stampOf(at + 180_000);
    }
    if (status === "已关闭") base.closedAt = M.stampOf(at + 900_000);
    return base;
  });
}

/** 种子调度令的一行：五态的时间戳规则集中在这里，避免五条字面量各写一遍 */
function mkOrder(
  id: string,
  type: DispatchOrder["type"],
  reason: string,
  status: DispatchOrder["status"],
  actions: DispatchOrder["actions"],
  agoMin: number,
  receiver: string,
  alarmIdRef?: string,
): DispatchOrder {
  const created = -agoMin * 60_000;
  const o: DispatchOrder = {
    id,
    type,
    reason,
    alarmId: alarmIdRef,
    actions,
    issuer: M.PEOPLE.dispatcher,
    receiver,
    status,
    createdAt: M.stampOf(created),
  };
  if (status !== "草拟") {
    o.issuedAt = M.stampOf(created + 120_000);
    o.deadline = M.stampOf(created + 120_000 + 45 * 60_000);
  }
  if (status === "已完成" || status === "已回执") o.doneAt = M.stampOf(created + 30 * 60_000);
  if (status === "已回执") o.receiptAt = M.stampOf(created + 40 * 60_000);
  return o;
}

/** 历史调度令：草拟/已下达/执行中/已完成/已回执五态各一条，状态机页面才有东西可点 */
function seedOrders() {
  const to = ems.alarms.find((a) => a.status === "已转调度令");
  if (to) to.dispatchId = "DD-20260927-02";
  ems.orders = [
    mkOrder(
      "DD-20260927-01",
      "机组启停",
      "2#CFB 中修后复役，恢复两台炉并列运行",
      "已回执",
      [
        {
          unitId: M.PLANTS.GEN,
          instruction: "2#CFB 点火升负荷至 130t/h，并网带煤气",
          expectEffect: "多消纳煤气 4.5万m³/h",
        },
      ],
      600,
      M.PEOPLE.power,
    ),
    mkOrder(
      "DD-20260927-02",
      "降压限用",
      "新水管网流量突增，先降压排查",
      "执行中",
      [{ unitId: M.PLANTS.POWER_AUX, instruction: "北区新水主管压力降至 0.35MPa，组织巡线", expectEffect: "查漏管段" }],
      200,
      M.PEOPLE.power,
      to?.id,
    ),
    mkOrder(
      "DD-20260927-03",
      "加减负荷",
      "1#高炉柜位持续上涨，CCPP 提负荷消纳",
      "已完成",
      [{ unitId: M.PLANTS.GEN, instruction: "CCPP 负荷提至 150MW 满出力", expectEffect: "多消纳 BFG 约 12万m³/h" }],
      120,
      M.PEOPLE.power,
    ),
  ];
  ems.seq.order = 3;
}

/** 一次性装配（`index.ts` 在路由表装配时调用） */
export function bootstrap() {
  initHolders();
  seedAlarms();
  seedOrders();
  /* 当月账：本月全部「已生成」，上月整月定稿。
     这样「▶重算昨日实绩」当月可用（否则演示第一步就被门控挡死），
     而 B2.5 的门控照样能演：生成当月结算 → 定稿 → 再校正就被拒。 */
  const effect = monthEffect(M.DEMO_MONTH);
  ems.actuals = M.buildActualRecords(M.DEMO_MONTH, effect);
  ems.balances = M.buildBalanceSheet(M.DEMO_MONTH, effect);
  ems.assess = M.computeAssess(effect);
  ems.settlements = [
    ...M.computeSettlement("2026-08", monthEffect("2026-08")).map((b) => ({
      ...b,
      /** 上月整月定稿（演示"历史账不可动"）；当月一律已生成，否则重算/结算两条链第一天就被门控挡死 */
      status: "已定稿" as const,
      confirmedBy: M.PEOPLE.assess,
      finalizedBy: M.PEOPLE.settle,
      createdAt: M.stampOf(-M.MONTH_ELAPSED_DAYS * 86_400_000),
    })),
    ...M.computeSettlement(M.DEMO_MONTH, effect),
  ];
  refreshKeyEquipCoal(effect);
  initLoad();
  ems.plans = [buildPlan("2026-09", M.PEOPLE.assess, "执行中"), buildPlan("2026-10", M.PEOPLE.assess, "编制中")];
  ems.seq.plan = 2;
  /* 质量工单先跑一遍「当日异常」：EC0003 打开就有待补录的单据可点，
     而不是先要求演示者去按一次「▶生成当日异常」（`genQualityIssues` 按 点+日+规则 去重，
     再按一次只会补上新组合，不会把同一张单开两遍）。 */
  genQualityIssues();
}

/* ══════════════════════════════════════════════════════════════════════════
   5. 实时层：tick 与剧本
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 一拍实时刷新：柜位积分 → 瞬时流量 → 负荷与机组出力 → 掉线补传累积 → 越限报警。
 *
 * 柜位分两种驱动：
 * - **剧本中**（`surge` 未走完）：直接按线性 ramp 写 `levelPct`，并把 `basePct` 顶到同一位置。
 *   为什么不靠均值回归爬：κ=0.15 十拍只能走完 80%，幕 2 要求 30 秒内到 88%，
 *   而 ramp 走完把 `basePct` 留在高位，处置前的放散才会一直存在（剧本需要它一直响）。
 * - **自由运行**：`nextLevelPct` 的均值回归 + 硬钳位，`u` 由瞬时富余折算，
 *   数学上不可能发散（对照 equipment 的 `jitter(center,half)`——积分对象那样用会漂走）。
 */
export function tickRealtime() {
  ems.step += 1;
  stepSurge();
  const sims: Partial<Record<M.GasMedia, ReturnType<typeof M.simulateGasBalance>>> = {};
  for (const h of ems.holders) {
    const sim = (sims[h.mediaCode] ??= simulateMedia(h.mediaCode));
    const cap = groupCapM3(h.mediaCode);
    if (ems.surge && ems.surge.media === h.mediaCode) {
      const s = ems.surge;
      const start = s.starts[h.id] ?? h.levelPct;
      h.levelPct = round(clamp(start + s.deltaPct * clamp(s.tick / s.ticks, 0, 1), h.loLimit, h.hiLimit), 1);
      h.basePct = h.levelPct;
    } else {
      /* 一拍的物理柜位变化（%）：柜组净吸收量 ÷ 柜容。除以拍长换成 %/拍再喂给 η */
      const drift = cap > 0 ? (sim.netFillM3min * TICK_MIN * 100) / cap : 0;
      h.levelPct = M.nextLevelPct(h, clamp(drift / M.HOLDER_ETA, -1, 1) + jitter() * 0.25);
      /* 剧本之外仍要回到本介质基线：净吸收为 0 时均值回归自然把柜位收回 basePct */
    }
    h.history = [...h.history.slice(-(HISTORY_LEN - 1)), h.levelPct];
    const pool = M.gasHourlyFlows(ems.effect)[mediaKey(h.mediaCode)];
    const share = h.capM3 / (holdersOf(h.mediaCode).reduce((a, x) => a + x.capM3, 0) || 1);
    const extra = ems.surge && ems.surge.media === h.mediaCode ? ems.surge.extraM3min * share : 0;
    h.inFlow = Math.round(((pool.out + pool.vent) * share) / 60 + extra);
    h.outFlow = Math.round(((pool.out + pool.vent) * share) / 60);
  }
  tickLoad();
  tickChannels();
  for (const media of ["LDG", "BFG", "COG"] as M.GasMedia[]) checkHolderAlarms(media, sims[media]!);
  checkDemandAlarm();
  return { step: ems.step, ldgPct: liveLevelPct("LDG") };
}

/**
 * 剧本游标推进：`ticks` 拍里线性爬到 `toPct`，随后**再顶 `holdTicks` 拍峰吹**才收场。
 * 收尾条件必须是 `tick > ticks + holdTicks`，而不是爬到顶就归零——归零的那一拍
 * `simulateGasBalance` 的富余立刻跌回月均水平，放散量、三条建议的削减量、触顶倒计时
 * 全部同时清零，幕 3 之后没有东西可播（详见 `M.SIM_LDG_SURGE.holdTicks` 的注释）。
 */
function stepSurge() {
  const s = ems.surge;
  if (!s) return;
  s.tick += 1;
  /* 晚一拍再收尾，柜位才停得在 `toPct`：早一拍 ramp 只走到 `to − (to−from)/ticks`
   * （88% 变 85.4%），阈值 88% 的 AR-006 永远不响——「告急 → 建议 → 转令」这条链在第一环就断。 */
  if (s.tick > s.ticks + s.holdTicks) {
    s.extraM3min = 0;
    ems.surge = null;
  } else {
    s.extraM3min = surgeExtra(s.tick);
  }
}

/**
 * 模拟转炉吹炼高峰（8 幕剧本的幕 2）。
 * 只改瞬时层：`extraM3min` 喂 `simulateGasBalance`、ramp 喂柜位，**一个字都不写月账**。
 * 抬升幅度按**主柜**（柜位最高的那台）算，柜组里其余柜跟着抬同样的百分点——
 * 目标 88% 说的是主柜，让柜组平均去够 88% 会把主柜推过红线。
 */
export function ldgSurge(media: M.GasMedia = "LDG") {
  const focus = holderOf(focusHolderId(media));
  const from = focus?.levelPct ?? M.SIM_LDG_SURGE.fromPct;
  const toPct = Math.min(M.SIM_LDG_SURGE.toPct, focus?.hiLimit ?? 90);
  ems.surge = {
    media,
    tick: 0,
    ticks: M.SIM_LDG_SURGE.ticks,
    holdTicks: M.SIM_LDG_SURGE.holdTicks,
    toPct,
    deltaPct: round(toPct - from, 1),
    starts: Object.fromEntries(holdersOf(media).map((h) => [h.id, h.levelPct])),
    extraM3min: surgeExtra(0),
  };
  const sim = simulateMedia(media);
  return {
    ok: true,
    msg: `${M.MEDIUMS[media].name}瞬时进气 +${M.SIM_LDG_SURGE.extraInM3min}m³/min，主柜 ${focus?.name ?? media} ${from}% 起爬至 ${toPct}%`,
    data: sim,
  };
}

export function stopSurge() {
  if (!ems.surge) return { ok: true, msg: "当前没有在途剧本" };
  ems.surge = null;
  return { ok: true, msg: "剧本已停止，柜位按均值回归回落基线" };
}

/** 介质 → 当前瞬时仿真（tick、建议引擎、EM0007 的预测曲线三处共用同一次计算） */
export function simulateMedia(media: M.GasMedia) {
  return M.simulateGasBalance(currentScenario(media));
}

/**
 * 装配时先把实时层铺平：负荷当前点、迷你曲线、机组出力各就各位。
 *
 * 不在 `bootstrap` 里铺的话，页面打开的头 3 秒（一拍都没走）会看到「外购负荷 0 MW」——
 * 而 0 MW 会让需量那条判据以为一切正常，正好在最该显示基线的一刻显示一个假绿。
 */
function initLoad() {
  ems.loadMw = round(M.loadBaseline(new Date(M.DEMO_T0).getHours()), 1);
  ems.loadHistory = Array.from({ length: HISTORY_LEN }, () => ems.loadMw);
  for (const u of M.selfGeneration(ems.effect).units) ems.unitMw[u.id] = u.mw;
}

/** 负荷与机组出力的当前点：围绕**当小时基线**抖（非积分对象，裸 jitter 就够） */
function tickLoad() {
  const hour = new Date(M.DEMO_T0 + ems.step * TICK_MS).getHours();
  ems.loadMw = round(M.loadBaseline(hour) * (1 + jitter() * 0.012), 1);
  ems.loadHistory = [...ems.loadHistory.slice(-(HISTORY_LEN - 1)), ems.loadMw];
  const gen = M.selfGeneration(ems.effect);
  for (const u of gen.units) ems.unitMw[u.id] = round(u.mw * (1 + jitter() * 0.008), 1);
}

/** 通道心跳与断点续传：只有掉线中的通道在累积，恢复后归零 */
function tickChannels() {
  for (const c of ems.channels) {
    if (c.status === "在线") {
      c.heartbeatAt = nowStamp();
      continue;
    }
    c.pendingUpload += c.pointCount;
    if (c.status === "离线") c.heartbeatAt = c.heartbeatAt || nowStamp();
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   6. 报警状态机
   ══════════════════════════════════════════════════════════════════════════ */

/** 柜位越限对应的规则（高限/低限按柜的介质与红线找，阈值取规则表，不在这里另写一个数） */
function holderRule(media: MediumCode, kind: AlarmRule["kind"], holderIdRef: string) {
  const pid = holderPointId(holderIdRef);
  return (
    ems.alarmRules.find((r) => r.pointId === pid && r.kind === kind && r.enabled) ??
    ems.alarmRules.find((r) => r.mediaCode === media && r.kind === kind && r.enabled)
  );
}

/**
 * 发一条报警。**去重**：同测点同类型且未关闭的不再新增，级别跃升才把原条升级。
 * 没有这条闸，剧本期间每 3s 一条重复报警，报警中心 30 秒就被自己刷爆了——
 * 而「报警刷屏」恰是客户判断一个 EMS 好不好的第一直觉。
 */
export function alarmFire(input: {
  mediaCode: MediumCode;
  unitId: string;
  level: AlarmLevel;
  type: EnergyAlarm["type"];
  message: string;
  pointId?: string;
}) {
  const open = ems.alarms.find(
    (a) => a.pointId === input.pointId && a.type === input.type && a.unitId === input.unitId && a.status !== "已关闭",
  );
  if (open) {
    /* 只认「跃升」：级别数字越小越严重，所以是 `<` */
    if (input.level < open.level) {
      open.level = input.level;
      open.message = input.message;
      open.status = "活动";
      open.ackBy = undefined;
      open.ackAt = undefined;
      open.time = nowStamp();
      return { alarm: open, created: false, upgraded: true };
    }
    return { alarm: open, created: false, upgraded: false };
  }
  const alarm: EnergyAlarm = {
    id: alarmId(),
    time: nowStamp(),
    mediaCode: input.mediaCode,
    pointId: input.pointId,
    unitId: input.unitId,
    level: input.level,
    type: input.type,
    message: input.message,
    status: "活动",
  };
  ems.alarms.unshift(alarm);
  return { alarm, created: true, upgraded: false };
}

/** 柜位越红线 → 柜位高危 / 允许放散两条 */
function checkHolderAlarms(media: M.GasMedia, sim: ReturnType<typeof M.simulateGasBalance>) {
  for (const h of holdersOf(media)) {
    const hi = holderRule(media, "高限", h.id);
    const lo = holderRule(media, "低限", h.id);
    const unitId = media === "LDG" ? M.PLANTS.STEEL : media === "COG" ? M.PLANTS.COKE : M.PLANTS.IRON;
    if (hi && h.levelPct >= hi.threshold) {
      alarmFire({
        mediaCode: media,
        unitId,
        pointId: holderPointId(h.id),
        level: hi.level,
        type: "柜位高危",
        message: `${h.name}柜位 ${h.levelPct}%，超警戒线 ${hi.threshold}%${sim.minutesToHigh !== null ? `，约 ${sim.minutesToHigh}min 后触顶` : ""}`,
      });
      if (sim.ventM3min > 0 && h.id === sim.holderId) {
        alarmFire({
          mediaCode: media,
          unitId,
          pointId: holderPointId(h.id),
          level: 2,
          type: "允许放散",
          message: `${h.name}柜组已到高限、吸纳能力用尽，放散塔现行放散 ${M.fmtNum(sim.ventM3h)}m³/h`,
        });
      }
    } else if (lo && h.levelPct <= lo.threshold) {
      alarmFire({
        mediaCode: media,
        unitId,
        pointId: holderPointId(h.id),
        level: lo.level,
        type: "越限",
        message: `${h.name}柜位 ${h.levelPct}%，低于低限 ${lo.threshold}%（空柜风险）`,
      });
    }
  }
}

/** 需量超限：负荷当前点比申报需量折算的 MW 上限（阈值来自 `DEMAND_LIMIT_MW`，不是这里写的数） */
function checkDemandAlarm() {
  const limit = M.DEMAND_LIMIT_MW;
  if (ems.loadMw > limit) {
    const rule = ems.alarmRules.find((r) => r.pointId === POINT_ID["P-POW-G0"] && r.kind === "高限");
    alarmFire({
      mediaCode: "ELEC",
      unitId: M.PLANTS.POWER_AUX,
      pointId: rule?.pointId,
      level: rule?.level ?? 2,
      type: "需量超限",
      message: `全厂负荷 ${ems.loadMw}MW，超申报需量折算上限 ${round(limit, 1)}MW`,
    });
  }
}

export function ackAlarm(id: string, by = M.PEOPLE.dispatcher) {
  const a = find(ems.alarms, id);
  if (!a) return { ok: false, msg: "报警不存在" };
  if (a.status !== "活动") return { ok: false, msg: `该报警状态为「${a.status}」，只有活动报警可确认` };
  a.status = "已确认";
  a.ackBy = by;
  a.ackAt = nowStamp();
  return { ok: true, msg: `报警 ${a.id} 已由 ${by} 确认` };
}

export function closeAlarm(id: string) {
  const a = find(ems.alarms, id);
  if (!a) return { ok: false, msg: "报警不存在" };
  if (a.status === "已关闭") return { ok: false, msg: "该报警已关闭" };
  a.status = "已关闭";
  a.closedAt = nowStamp();
  return { ok: true, msg: `报警 ${a.id} 已关闭` };
}

/** 批量确认（值班室交接班的一键清屏） */
export function ackAllAlarms(by = M.PEOPLE.dispatcher) {
  const rows = ems.alarms.filter((a) => a.status === "活动");
  for (const a of rows) {
    a.status = "已确认";
    a.ackBy = by;
    a.ackAt = nowStamp();
  }
  return { ok: true, msg: rows.length ? `${rows.length} 条活动报警已确认` : "当前没有活动报警" };
}

/**
 * 报警转调度令（幕 3）。转出去就**不再是"待处理"**：报警状态与调度单同时挂着引用，
 * 回执核销时两边一起闭环——这是本域最有说服力的一条联动。
 */
export function alarmToDispatch(alarmIdRef: string, receiver = M.PEOPLE.power) {
  const a = find(ems.alarms, alarmIdRef);
  if (!a) return { ok: false, msg: "报警不存在" };
  if (a.status === "已关闭") return { ok: false, msg: "已关闭的报警不能再转调度令" };
  if (a.dispatchId) {
    const exist = find(ems.orders, a.dispatchId);
    if (exist) return { ok: true, msg: `该报警已关联调度令 ${exist.id}`, data: exist };
  }
  const type: DispatchOrder["type"] =
    a.type === "柜位高危" || a.type === "允许放散"
      ? "放散许可"
      : a.type === "需量超限"
        ? "加减负荷"
        : a.type === "通讯中断"
          ? "停复役"
          : "运行方式变更";
  const order: DispatchOrder = {
    id: orderId(),
    type,
    reason: a.message,
    alarmId: a.id,
    actions: [{ unitId: a.unitId, instruction: `处置 ${a.message}`, expectEffect: "柜位/负荷回到受控区间" }],
    issuer: M.PEOPLE.dispatcher,
    receiver,
    status: "草拟",
    createdAt: nowStamp(),
  };
  ems.orders.unshift(order);
  a.status = "已转调度令";
  a.dispatchId = order.id;
  return { ok: true, msg: `报警 ${a.id} 已转调度令 ${order.id}，待下达`, data: order };
}

/* ══════════════════════════════════════════════════════════════════════════
   7. 调度建议与调度令状态机
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 生成调度建议（幕 3）。**每次都按当前实时柜位重算**，已采纳的保留 `acceptedId`。
 * 规则本体在 `model.dispatchRules`（含时滞与预计削减量），这里只做"落到单据"这一段。
 */
export function suggestDispatch(media: M.GasMedia = "LDG") {
  const base = currentScenario(media);
  const rules = M.dispatchRules(base);
  const kept = new Map(ems.suggestions.filter((s) => s.acceptedId).map((s) => [s.rule, s]));
  ems.suggestions = rules.map((r) => {
    const old = kept.get(r.rule);
    const id = old?.id ?? `SUG-${M.DEMO_TODAY.replace(/-/g, "")}-${pad(++ems.seq.suggest, 2)}`;
    /* scenario 必须在这一次就锁进状态：柜位在抖，等点「采纳」时再算一遍规则，
       很可能给出另一条情景（甚至因为柜位回落而出不了这条建议），建议卡与调度令就对不上了 */
    ems.sugScenario[id] = r.scenario;
    return {
      id,
      rule: r.rule,
      title: r.title,
      detail: r.detail,
      expectCutM3: r.expectCutM3,
      absorbM3h: r.absorbM3h,
      delayHighMin: r.delayHighMin,
      delayMin: r.delayMin,
      acceptedId: old?.acceptedId,
      createdAt: old?.createdAt ?? nowStamp(),
    };
  });
  const sim = simulateMedia(media);
  return {
    ok: true,
    msg: `${M.MEDIUMS[media].name}富余 ${M.fmtNum(sim.surplusM3min)}m³/min，出 ${ems.suggestions.length} 条建议`,
    data: ems.suggestions,
  };
}

/**
 * 建议落到调度令上的「预期效果」一句话。三个数按可信度递减排列：
 * 有放散可削就说放散（那是真金白银），柜位没满就说消纳与延后触顶（此刻放散本来就是 0，
 * 写「削减 0」等于当着客户的面摆一张空卡）。
 */
function effectOfSuggestion(s: DispatchSuggestion) {
  const cut = s.expectCutM3 > 0 ? `削减放散约 ${M.fmtNum(s.expectCutM3)}m³/h` : "";
  const absorb = s.absorbM3h > 0 ? `多消纳 ${M.fmtNum(s.absorbM3h)}m³/h` : "";
  const delay = s.delayHighMin !== null && s.delayHighMin > 0 ? `触顶延后 ${s.delayHighMin}min` : "";
  const text = [absorb, cut, delay].filter(Boolean).join("、");
  return text || "柜位增速回落（本手不直接削减富余，用于争取处置时间）";
}

/**
 * 采纳建议 → 生成草拟调度令，并把该建议的 scenario 锁存到 `orderScenario`。
 * **此刻还不改任何数**——柜位/机组的改变发生在 `execDone`（下达 ≠ 执行到位，
 * 调度员最烦的就是系统"一下令就完事"）。
 */
export function acceptSuggestion(id: string, receiver?: string) {
  const s = find(ems.suggestions, id);
  if (!s) return { ok: false, msg: "建议不存在" };
  if (s.acceptedId)
    return { ok: true, msg: `该建议已生成调度令 ${s.acceptedId}`, data: find(ems.orders, s.acceptedId) };
  const scenario = ems.sugScenario[id] ?? currentScenario("LDG");
  const media = scenario.media ?? "LDG";
  const order: DispatchOrder = {
    id: orderId(),
    type: scenario.cfbUnits !== undefined ? "机组启停" : scenario.ccppMw !== undefined ? "加减负荷" : "运行方式变更",
    reason: s.title,
    actions: [
      {
        unitId: unitOfSuggestion(s, media),
        instruction: s.title.split("（")[0],
        expectEffect: effectOfSuggestion(s),
      },
    ],
    issuer: M.PEOPLE.dispatcher,
    receiver: receiver || receiverOfSuggestion(s),
    status: "草拟",
    createdAt: nowStamp(),
    deadline: nowStamp(s.delayMin * 60_000 + 30 * 60_000),
  };
  ems.orders.unshift(order);
  ems.orderScenario[order.id] = scenario;
  s.acceptedId = order.id;
  return { ok: true, msg: `建议已转调度令 ${order.id}（草拟），须下达后生效`, data: order };
}

/** 建议落在哪个单元：R1/R2 在发电厂、R3 在烧结、R4 在炼钢（规则号前缀是唯一可靠的判据） */
function unitOfSuggestion(s: DispatchSuggestion, media: M.GasMedia) {
  if (s.rule.startsWith("R1") || s.rule.startsWith("R2")) return M.PLANTS.GEN;
  if (s.rule.startsWith("R3")) return M.PLANTS.SINTER;
  if (s.rule.startsWith("R4")) return M.PLANTS.STEEL;
  return media === "LDG" ? M.PLANTS.STEEL : M.PLANTS.GEN;
}
/** 接收人：点炉/提负荷找电气值班主任，提掺烧找烧结，放缓吹炼找炼钢班长 */
function receiverOfSuggestion(s: DispatchSuggestion) {
  if (s.rule.startsWith("R3")) return M.PEOPLE.sinter;
  if (s.rule.startsWith("R4")) return M.PEOPLE.steel;
  if (s.rule.startsWith("R1") || s.rule.startsWith("R2")) return M.PEOPLE.power;
  return M.PEOPLE.dispatcher;
}

export function issueDispatch(id: string) {
  const o = find(ems.orders, id);
  if (!o) return { ok: false, msg: "调度令不存在" };
  if (o.status !== "草拟") return { ok: false, msg: `状态「${o.status}」不可下达（只有草拟可下达）` };
  o.status = "已下达";
  o.issuedAt = nowStamp();
  if (!o.deadline) o.deadline = nowStamp(45 * 60_000);
  return { ok: true, msg: `${o.id} 已下达 ${o.receiver}，时限 ${o.deadline.slice(11, 16)}`, data: o };
}

/**
 * 执行完毕（幕 4）。**这一步才兑现锁存的 scenario**：
 * - CFB 台数写进 `effect` → 月账自发电量跟着变（EP0004 的电费、大屏的自发电率同时动）；
 * - 放散削减量折成柜位基线下压 → 实时层回落到新基线，`EM0002`/`EO0001` 的曲线斜率真的变了。
 *
 * 后者是整条剧本的"证据"：没有它，各页只是各自演自己的数，联动闭环无从证明。
 */
export function execDone(id: string, by?: string) {
  const o = find(ems.orders, id);
  if (!o) return { ok: false, msg: "调度令不存在" };
  if (o.status === "草拟") return { ok: false, msg: "调度令尚未下达，不能报执行完毕" };
  if (o.status === "已完成" || o.status === "已回执") return { ok: false, msg: "该调度令已执行完毕" };
  const sc = ems.orderScenario[id];
  const parts: string[] = [];
  if (sc) {
    if (sc.cfbUnits !== undefined && sc.cfbUnits !== ems.effect.cfbRunning) {
      const before = ems.effect.cfbRunning ?? M.CFB_RUNNING_BASE;
      ems.effect = { ...ems.effect, cfbRunning: sc.cfbUnits };
      parts.push(`CFB 投运 ${before} 台→${sc.cfbUnits} 台`);
      syncHolderFlows();
      buildMonthFrom(ems.effect);
    }
    const media = sc.media ?? "LDG";
    const sim = M.simulateGasBalance(sc);
    const raw = M.simulateGasBalance(currentScenario(media));
    /** 削减量 = 未处置放散 − 处置后放散；气还在往柜里充（放散 0）时为 0，这时只推 CCPP 负荷 */
    const cutM3h = Math.max(0, (raw.ventM3min - sim.ventM3min) * 60);
    if (cutM3h > 0) {
      const cap = groupCapM3(media);
      const dropPct = round((cutM3h * M.DISPATCH_EFFECT_HOURS * 100) / cap, 1);
      for (const h of holdersOf(media)) h.basePct = round(clamp(h.basePct - dropPct, h.loLimit + 1, h.hiLimit - 1), 1);
      parts.push(`柜位基线下压 ${dropPct}%`);
    } else if (raw.ventM3min === 0 && sim.ventM3min === 0) {
      parts.push("气量已被柜组吸收，放散未起");
    }
    if (sc.sinterUsePct) parts.push(`烧结点火炉提掺烧 ${sc.sinterUsePct}%`);
    /**
     * 放缓加料 = 把在途剧本的瞬时进气**只降不升**地拉回锁存时的水位。
     * 用 `min` 而不是直接赋值：锁存值是建议生成那一刻的快照，之后 ramp 还在往上走，
     * 直接赋值会把已经爬起来的进气增量**又抬上去**（处置动作反而加剧告急，是最难看的翻车）。
     */
    if (sc.extraLdgM3min !== undefined && ems.surge && ems.surge.media === "LDG") {
      const before = ems.surge.extraM3min;
      ems.surge.extraM3min = Math.min(before, sc.extraLdgM3min);
      if (before !== ems.surge.extraM3min)
        parts.push(`炼钢放缓加料，瞬时进气回落 ${before - ems.surge.extraM3min}m³/min`);
    }
  }
  o.status = "已完成";
  o.doneAt = nowStamp();
  if (by) o.receiver = o.receiver || by;
  return { ok: true, msg: `${o.id} 执行完毕${parts.length ? "：" + parts.join("、") : ""}`, data: o };
}

/** 回执核销（幕 5 收口）：调度令终结 + 关联报警一起关闭 */
export function receiptClose(id: string) {
  const o = find(ems.orders, id);
  if (!o) return { ok: false, msg: "调度令不存在" };
  if (o.status !== "已完成") return { ok: false, msg: `状态「${o.status}」不可回执（须先执行完毕）` };
  o.status = "已回执";
  o.receiptAt = nowStamp();
  let closed = 0;
  if (o.alarmId) {
    const a = find(ems.alarms, o.alarmId);
    if (a && a.status !== "已关闭") {
      a.status = "已关闭";
      a.closedAt = o.receiptAt;
      closed = 1;
    }
  }
  return { ok: true, msg: `${o.id} 已回执${closed ? "，关联报警同步核销关闭" : ""}`, data: o };
}

/** effect 变了要重推柜的瞬时流量（基线仍保留：处置过的柜不能被打回原形） */
function syncHolderFlows() {
  const bases = M.holderBases(ems.effect);
  for (const h of ems.holders) {
    const b = bases.find((x) => x.id === h.id);
    if (!b) continue;
    h.inFlow = b.inFlow;
    h.outFlow = b.outFlow;
  }
}

/** effect 变更后重建当月四张表（柜位/报警不动，只动账） */
function buildMonthFrom(effect: M.FlowEffect) {
  ems.actuals = M.buildActualRecords(M.DEMO_MONTH, effect);
  ems.balances = M.buildBalanceSheet(M.DEMO_MONTH, effect);
  ems.assess = M.computeAssess(effect);
  refreshKeyEquipCoal(effect);
  /**
   * 保留定稿状态时**必须按月过滤**。原来只按 `unitId` 匹配，于是「焦化厂 2026-08 已定稿」
   * 会把重生成的 2026-09 那张一并标成定稿——任何一次 effect 变更（幕 3 的 `execDone`
   * 点炉就是一例）之后，当月账第一天就锁死，EP0002 的「▶ 重算昨日实绩」与 EP0004 的
   * 「▶ 生成本月结算」全被 B2.5 门控拒掉，八幕剧本演到第 6 幕就没账可算了。
   */
  const settled = new Set(
    ems.settlements.filter((b) => b.month === M.DEMO_MONTH && b.status === "已定稿").map((b) => b.unitId),
  );
  ems.settlements = [
    ...ems.settlements.filter((b) => b.month !== M.DEMO_MONTH),
    ...M.computeSettlement(M.DEMO_MONTH, effect).map((b) =>
      settled.has(b.unitId) ? { ...b, status: "已定稿" as const, finalizedBy: M.PEOPLE.settle } : b,
    ),
  ];
}

/* ══════════════════════════════════════════════════════════════════════════
   8. 采集通道（EC0002）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 模拟通道中断：掉线 → 待补传累积 → 关联计量点的日实绩置「缺失」→ 发通讯中断报警。
 * 三处连带动作就是 EC0003「生成当日异常」和 EP0002「数据缺失」标记的来源，
 * 缺任何一处，客户都会觉得"点了个按钮只改了个状态字段"。
 */
export function commBreak(channelId: string) {
  const c = find(ems.channels, channelId);
  if (!c) return { ok: false, msg: "通道不存在" };
  if (c.status === "离线") return { ok: false, msg: `${c.stationName} 已处于离线状态` };
  c.status = "离线";
  const pts = ems.meterPoints.filter((p) => p.channelId === c.id);
  const allOfTuple = new Map<string, number>();
  for (const p of ems.meterPoints) allOfTuple.set(tupleOf(p), (allOfTuple.get(tupleOf(p)) ?? 0) + 1);
  const downOfTuple = new Map<string, number>();
  for (const p of pts) downOfTuple.set(tupleOf(p), (downOfTuple.get(tupleOf(p)) ?? 0) + 1);
  let marked = 0;
  let partial = 0;
  for (const [tuple, down] of downOfTuple) {
    const [unitId, mediaCode, direction] = tuple.split("|") as [string, MediumCode, FlowDirection];
    const full = (allOfTuple.get(tuple) ?? 0) === down;
    for (const r of ems.actuals) {
      if (r.granularity === "day" && r.unitId === unitId && r.mediaCode === mediaCode && r.direction === direction) {
        if (full && !r.missing) {
          r.missing = true;
          marked += 1;
        } else if (!full) partial += 1;
      }
    }
  }
  for (const p of pts) {
    const rule = ems.alarmRules.find((r) => r.pointId === p.id && r.kind === "通讯");
    if (rule)
      alarmFire({
        mediaCode: p.mediaCode,
        unitId: p.unitId,
        pointId: p.id,
        level: rule.level,
        type: "通讯中断",
        message: `${c.stationName} 通讯中断，${p.name} 数据缺失（边缘缓存在传）`,
      });
  }
  if (!pts.some((p) => ems.alarmRules.some((r) => r.pointId === p.id && r.kind === "通讯"))) {
    alarmFire({
      mediaCode: pts[0]?.mediaCode ?? "ELEC",
      unitId: pts[0]?.unitId ?? M.PLANTS.POWER_AUX,
      level: 4,
      type: "通讯中断",
      message: `${c.stationName}（${c.protocol}）通讯中断，影响 ${pts.length} 个计量点`,
    });
  }
  return {
    ok: true,
    msg: `${c.stationName} 已中断：${pts.length} 个计量点掉线，${marked} 条统计节点实绩置缺失${partial ? `、${partial} 条部分缺失（同节点仍有其它点在传）` : ""}`,
  };
}

/** 一键恢复：补传条数归零、缺失实绩清标、通讯报警自动关闭 */
export function commRestore() {
  const down = ems.channels.filter((c) => c.status !== "在线");
  if (!down.length) return { ok: false, msg: "当前没有中断通道" };
  let upload = 0;
  for (const c of down) {
    upload += c.pendingUpload;
    c.pendingUpload = 0;
    c.status = "在线";
    c.heartbeatAt = nowStamp();
  }
  let fixed = 0;
  for (const r of ems.actuals) {
    if (r.missing) {
      r.missing = false;
      fixed += 1;
    }
  }
  for (const a of ems.alarms) {
    if (a.type === "通讯中断" && a.status !== "已关闭") {
      a.status = "已关闭";
      a.closedAt = nowStamp();
    }
  }
  return { ok: true, msg: `${down.length} 个通道恢复，补传 ${M.fmtNum(upload)} 点、回填 ${fixed} 条实绩` };
}

/** 通道半断（抖动）：状态置通讯异常，心跳滞后，是比离线更常见的现场工况 */
export function commFlap(channelId: string) {
  const c = find(ems.channels, channelId);
  if (!c) return { ok: false, msg: "通道不存在" };
  c.status = c.status === "通讯异常" ? "在线" : "通讯异常";
  return { ok: true, msg: `${c.stationName} → ${c.status}` };
}

/* ══════════════════════════════════════════════════════════════════════════
   9. 数据质量工单（EC0003）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 该计量点的「应有值」：账是 单元×介质×方向 一条日行，粒度比计量点粗，
 * 所以要 ① 从该点所属单元**往上走到有这个元组日行的那一级**（3/4 级设备自己不上账，
 * 走到厂级才有数——不走上溯的话这些点的应有值恒为 undefined，工单直接开不出来），
 * ② 再按**该级下同介质同方向的点数**均摊到点。均摊值是演示基准，不是表计读数，
 * 所以工单上写的是「建议值」并允许人工改。
 */
function dayValueOf(pointId: string): number | undefined {
  const p = pointOf(pointId);
  if (!p) return undefined;
  const direction = p.direction ?? "消耗";
  let id: string | undefined = p.unitId;
  let total = 0;
  while (id) {
    total = ems.actuals
      .filter(
        (x) => x.granularity === "day" && x.unitId === id && x.mediaCode === p.mediaCode && x.direction === direction,
      )
      .reduce((a, x) => a + x.value, 0);
    if (total > 0) break;
    id = M.UNIT_MAP[id]?.parentId;
  }
  if (!id || total <= 0) return undefined;
  const prefix = `${M.UNIT_MAP[id].path}/`;
  const peers =
    ems.meterPoints.filter(
      (x) =>
        x.mediaCode === p.mediaCode &&
        (x.direction ?? "消耗") === direction &&
        (x.unitId === id || (M.UNIT_MAP[x.unitId]?.path.startsWith(prefix) ?? false)),
    ).length || 1;
  return round(total / peers, 2);
}

/**
 * 生成当日异常工单（幕 6 的前半）。
 * 判据与倍率全在 `model.QUALITY_INJECT`，建议值取该点日均——
 * 「自动补录取前后均值」这句话在页面上要有一个数能对应上，否则补录值像凭空给的。
 */
export function genQualityIssues(date = M.DEMO_YESTERDAY) {
  const targets = ems.meterPoints.filter((p) => p.isSettlement).slice(0, 6);
  const rules: Array<Omit<QualityTicket, "id" | "pointId" | "date" | "status">> = [];
  targets.forEach((p, i) => {
    const day = dayValueOf(p.id);
    if (day === undefined || day <= 0) return;
    const kind = (["量程越界", "恒值死数", "突变跳"] as const)[i % 3];
    const raw =
      kind === "量程越界" ? day * M.QUALITY_INJECT.overRange : kind === "突变跳" ? day * M.QUALITY_INJECT.spike : 0;
    rules.push({
      pointId: p.id,
      date,
      rule: kind,
      rawValue: round(raw, 2),
      suggestValue: round(day, 2),
      suspect: true,
      deviation: `${round((Math.abs(raw - day) / day) * 100, 1)}%`,
    });
  });
  let created = 0;
  for (const r of rules) {
    if (
      ems.tickets.some((t) => t.pointId === r.pointId && t.date === r.date && t.rule === r.rule && t.status !== "作废")
    )
      continue;
    ems.tickets.unshift({ ...r, id: ticketId(), status: "待补录" } as QualityTicket);
    created += 1;
    const p = pointOf(r.pointId)!;
    alarmFire({
      mediaCode: p.mediaCode,
      unitId: p.unitId,
      pointId: p.id,
      level: 3,
      type: "数据异常",
      message: `${p.name} ${r.date} ${r.rule}（原始 ${M.fmtQty(p.mediaCode, r.rawValue)}，建议 ${M.fmtQty(p.mediaCode, r.suggestValue)}）`,
    });
  }
  return { ok: true, msg: created ? `生成 ${created} 张质量工单（${date}），待补录` : "当日未发现新的异常数据" };
}

export function fillTicket(id: string, value?: number, by = M.PEOPLE.assess) {
  const t = find(ems.tickets, id);
  if (!t) return { ok: false, msg: "工单不存在" };
  if (t.status === "作废") return { ok: false, msg: "作废工单不可补录" };
  const v = value ?? t.suggestValue;
  if (!Number.isFinite(v) || v < 0) return { ok: false, msg: "补录值必须是非负数" };
  t.fillValue = round(v, 2);
  t.fillBy = by;
  t.fillAt = nowStamp();
  t.status = "已补录";
  return { ok: true, msg: `${t.id} 已补录 ${M.fmtNum(t.fillValue)}，待校核`, data: t };
}

/** 校核通过才写实绩（`source:"补录"`）——未校核的数据不能进账，这是质量链的门 */
export function checkTicket(id: string, by = M.PEOPLE.settle) {
  const t = find(ems.tickets, id);
  if (!t) return { ok: false, msg: "工单不存在" };
  if (t.status !== "已补录") return { ok: false, msg: `状态「${t.status}」不可校核（须先补录）` };
  t.checkBy = by;
  t.checkAt = nowStamp();
  t.status = "已校核";
  const p = pointOf(t.pointId);
  if (p) {
    const month = t.date.slice(0, 7);
    const std = M.MEDIUMS[p.mediaCode].stdCoal;
    ems.actuals.push({
      id: `ACT-${month.replace("-", "")}-Q${pad(ems.seq.ticket, 3)}-${p.id.slice(-5)}`,
      date: t.date,
      granularity: "day",
      pointId: p.id,
      unitId: p.unitId,
      mediaCode: p.mediaCode,
      direction: p.direction ?? "消耗",
      value: t.fillValue ?? 0,
      stdCoal: round((t.fillValue ?? 0) * std, 2),
      source: "补录",
      formulaTrace: `质量工单 ${t.id}：${t.rule} → 人工确认值 ${M.fmtQty(p.mediaCode, t.fillValue ?? 0)}（${by} 校核）`,
    });
  }
  const a = ems.alarms.find((x) => x.pointId === t.pointId && x.type === "数据异常" && x.status !== "已关闭");
  if (a) {
    a.status = "已关闭";
    a.closedAt = t.checkAt;
  }
  return { ok: true, msg: `${t.id} 已校核，补录值已计入 ${t.date} 实绩` };
}

export function voidTicket(id: string, reason = "") {
  const t = find(ems.tickets, id);
  if (!t) return { ok: false, msg: "工单不存在" };
  if (t.status === "已校核") return { ok: false, msg: "已校核工单不可作废（请走实绩校正）" };
  t.status = "作废";
  return { ok: true, msg: `${t.id} 作废${reason ? "：" + reason : ""}` };
}

/* ══════════════════════════════════════════════════════════════════════════
   10. 月账动作（EP0002/0003/0004/0005）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 重算实绩：计量点 → 统计节点，把公式快照写进行里（追溯弹窗直接显示它）。
 *
 * **门控**：该月结算已定稿即拒绝（B2.5）。这是本域唯一一个「按钮会明确告诉你为什么点不动」的地方。
 */
export function recalcActual(date = M.DEMO_YESTERDAY) {
  const month = date.slice(0, 7);
  if (finalizedMonths().has(month))
    return { ok: false, msg: `${month} 结算已定稿，禁止重算实绩（请先在 EP0004 走校正审批）` };
  const effect = monthEffect(month);
  const fresh = M.buildActualRecords(month, effect);
  /**
   * 只重生成**模型口径**的日行（采集/公式）。补录与校正是人的决定，重算把它们冲掉的话，
   * EC0003 刚填完的值会在 EP0002 凭空消失，两页当场对不上——那是比"少算一条"更重的翻车。
   */
  const human = new Set(
    ems.actuals
      .filter((r) => r.granularity === "day" && r.date === date && (r.source === "补录" || r.source === "校正"))
      .map((r) => `${r.unitId}|${r.mediaCode}|${r.direction}`),
  );
  const stamped = fresh
    .filter((r) => r.granularity === "day" && !human.has(`${r.unitId}|${r.mediaCode}|${r.direction}`))
    .map((r) => ({
      ...r,
      date,
      formulaTrace: `${unitName(r.unitId)}·${M.MEDIUMS[r.mediaCode].name}·${r.direction} = Σ计量点日均（${M.MONTH_ELAPSED_DAYS}d）｜${date} 由 ${M.PEOPLE.assess} 重算`,
    }));
  ems.actuals = [
    ...ems.actuals.filter(
      (r) => !(r.granularity === "day" && r.date === date && !human.has(`${r.unitId}|${r.mediaCode}|${r.direction}`)),
    ),
    ...stamped,
  ];
  /** 平衡表的收入/消耗列与实绩同源，重算完必须一起重建，否则 EP0002 与 EP0003 当场对不上 */
  ems.balances = M.buildBalanceSheet(month, effect);
  return { ok: true, msg: `${date} 实绩重算完成，${stamped.length} 条统计节点记录，平衡表同步刷新` };
}

/** 实绩校正（单条改值 + 留痕）。已定稿月份同样拒绝。 */
export function correctActual(id: string, value: number, by = M.PEOPLE.assess, reason = "") {
  const r = ems.actuals.find((x) => x.id === id);
  if (!r) return { ok: false, msg: "实绩记录不存在" };
  if (finalizedMonths().has(r.date.slice(0, 7)))
    return { ok: false, msg: `${r.date.slice(0, 7)} 结算已定稿，禁止校正实绩` };
  if (!Number.isFinite(value) || value < 0) return { ok: false, msg: "校正值必须是非负数" };
  r.correctedFrom = r.value;
  r.value = round(value, 2);
  r.stdCoal = round(r.value * M.MEDIUMS[r.mediaCode].stdCoal, 2);
  r.source = "校正";
  r.correctBy = by;
  r.correctReason = reason || "人工核校";
  r.missing = false;
  return {
    ok: true,
    msg: `${r.id} 校正为 ${M.fmtQty(r.mediaCode, r.value)}（原 ${M.fmtQty(r.mediaCode, r.correctedFrom ?? 0)}）`,
  };
}

/**
 * 平衡分摊：只摊 `loss`、末行取余数（数学在 `model.distributeBalance`）。
 * 这里只负责把结果写回状态，**不碰 income/consume、不碰实绩**。
 */
export function runBalance(month = M.DEMO_MONTH) {
  const targets = ems.balances.filter((b) => b.month === month && !b.balanced);
  if (!targets.length) return { ok: false, msg: `${month} 平衡表已平（无残差可摊）` };
  const before = targets.reduce((a, b) => a + b.rows.reduce((s, r) => s + Math.abs(r.diff), 0), 0);
  ems.balances = ems.balances.map((b) => (b.month === month && !b.balanced ? M.distributeBalance(b) : b));
  const after = ems.balances
    .filter((b) => b.month === month)
    .reduce((a, b) => a + b.rows.reduce((s, r) => s + Math.abs(r.diff), 0), 0);
  return {
    ok: true,
    msg: `${month} ${targets.length} 张平衡表分摊完成：|平衡差| 合计 ${M.fmtNum(before)} → ${M.fmtNum(after)}`,
    data: targets.map((b) => b.id),
  };
}

/** 生成结算单（重算当月；已有单据保留状态，不把人核对过的东西冲掉） */
export function runSettlement(month = M.DEMO_MONTH) {
  if (month === M.DEMO_MONTH && ems.settlements.some((b) => b.month === month && b.status === "已定稿"))
    return { ok: false, msg: `${month} 已有定稿结算单，不再整批重生成（个别校正请走校正审批）` };
  const kept = new Map(
    ems.settlements.filter((b) => b.month === month && b.status !== "已生成").map((b) => [b.unitId, b]),
  );
  const fresh = M.computeSettlement(month, monthEffect(month)).map((b) => {
    const old = kept.get(b.unitId);
    return old
      ? {
          ...b,
          status: old.status,
          confirmedBy: old.confirmedBy,
          finalizedBy: old.finalizedBy,
          createdAt: old.createdAt,
        }
      : b;
  });
  ems.settlements = [...ems.settlements.filter((b) => b.month !== month), ...fresh];
  const total = fresh.reduce((a, b) => a + b.total + b.extraFee, 0);
  return { ok: true, msg: `生成 ${fresh.length} 张 ${month} 结算单，内结合计 ${M.fmtMoney(total)} 元`, data: fresh };
}

/** 结算单状态推进：已生成 → 已核对 → 已定稿（终态） */
export function settleStatus(id: string, to: SettlementBill["status"], by = M.PEOPLE.settle) {
  const b = find(ems.settlements, id);
  if (!b) return { ok: false, msg: "结算单不存在" };
  const flow: Record<SettlementBill["status"], SettlementBill["status"][]> = {
    已生成: ["已核对"],
    已核对: ["已定稿", "已生成"],
    已定稿: [],
  };
  if (!flow[b.status].includes(to)) return { ok: false, msg: `${b.status} → ${to} 不是允许的状态转移` };
  b.status = to;
  if (to === "已核对") b.confirmedBy = by;
  if (to === "已定稿") b.finalizedBy = by;
  return { ok: true, msg: `${b.id} ${to === "已定稿" ? "已定稿，该月实绩与结算锁定" : to}` };
}

/** 考核重算（实绩 vs 定额/标杆）；`month` 只影响取哪个月的产量系数 */
export function runAssess(month = M.DEMO_MONTH) {
  ems.assess = M.computeAssess(monthEffect(month));
  const worst = ems.assess.reduce((a, r) => (r.score < a.score ? r : a), ems.assess[0]);
  const comp = M.computeCompositeAssess(monthEffect(month));
  return {
    ok: true,
    msg: worst
      ? `${month} 考核排名刷新：最低 ${M.unitName(worst.unitId)} ${worst.score} 分；全厂综合 ${comp.actual}kgce/t（标杆 ${comp.benchmark}）`
      : `${month} 考核无可评工序`,
    data: ems.assess,
  };
}

/** 计划状态机（B2.3）：编制中 → 已提交 → 已批准 → 执行中 → 已归档 */
const PLAN_FLOW: Record<EnergyPlan["status"], EnergyPlan["status"][]> = {
  编制中: ["已提交"],
  已提交: ["已批准", "编制中"],
  已批准: ["执行中"],
  执行中: ["已归档"],
  已归档: [],
};

export function planStatus(id: string, to: EnergyPlan["status"], by = M.PEOPLE.assess) {
  const p = ems.plans.find((x) => x.id === id);
  if (!p) return { ok: false, msg: "计划不存在" };
  if (!PLAN_FLOW[p.status].includes(to)) return { ok: false, msg: `${p.status} → ${to} 不是允许的状态转移` };
  p.status = to;
  if (to === "已批准") p.approvedBy = by;
  return { ok: true, msg: `${p.id} ${to}${to === "已批准" ? "，按批准产量锁定" : ""}` };
}

/** 按预测产量重算计划：`factor` 只作用在产量上，与实绩口径同源 */
export function recalcPlan(id: string, factor = M.NEXT_PLAN_OUTPUT_FACTOR) {
  const p = ems.plans.find((x) => x.id === id);
  if (!p) return { ok: false, msg: "计划不存在" };
  if (p.status === "已批准" || p.status === "执行中" || p.status === "已归档")
    return { ok: false, msg: `${p.status} 的计划不可重算（须先退回编制）` };
  const outputs: Record<string, number> = {};
  for (const [k, v] of Object.entries(M.PRODUCTION)) outputs[k] = Math.round(v * factor);
  const flows = M.flows({ ...ems.effect, outputs });
  p.items = flows.map((f) => ({
    unitId: f.unitId,
    mediaCode: f.mediaCode,
    direction: f.direction,
    qty: round(f.qty, 0),
  }));
  p.products = p.products.map((x) => ({
    ...x,
    outputT: round(((M.PRODUCTION[M.PLANT_PRODUCT[x.unitId]] ?? 0) * factor) / 1e4, 2),
  }));
  p.remark = `按预测产量 ×${round(factor, 2)} 重算（${M.DEMO_TODAY} ${M.PEOPLE.assess}）｜定额口径同 EP0001`;
  return { ok: true, msg: `${p.id} 已按预测产量重算 ${p.items.length} 条`, data: p };
}

/* ══════════════════════════════════════════════════════════════════════════
   11. 检定扫描与通用行操作（仪表的增删改在 §13）
   ══════════════════════════════════════════════════════════════════════════ */

/** 幂等：仪表检定到期扫描（装配时跑一次，之后只有 `refreshVerify` 会主动触发） */
export function scanVerifyDeadlines() {
  const today = M.DEMO_T0 + ems.step * TICK_MS;
  let overdue = 0;
  let soon = 0;
  for (const ins of ems.instruments) {
    if (ins.status === "故障") continue;
    const st = verifyStatusOf(ins, today);
    ins.status = st;
    if (st === "超期") {
      overdue += 1;
      if (!ems.verified)
        alarmFire({
          mediaCode: ems.meterPoints.find((p) => p.id === ins.pointId)?.mediaCode ?? "ELEC",
          unitId: ems.meterPoints.find((p) => p.id === ins.pointId)?.unitId ?? M.PLANTS.POWER_AUX,
          pointId: ins.pointId,
          level: 4,
          type: "数据异常",
          message: `${ins.name}（${ins.id}）检定超期 ${Math.round((today - Date.parse(ins.nextVerifyAt)) / 86_400_000)} 天，数据可信度待确认`,
        });
    } else if (st === "临期") soon += 1;
  }
  ems.verified = true;
  return { ok: true, msg: `检定扫描：超期 ${overdue} 台、临期 ${soon} 台`, data: { overdue, soon } };
}

export function toggleInstrumentFault(id: string) {
  const ins = find(ems.instruments, id);
  if (!ins) return { ok: false, msg: "仪表不存在" };
  const next = ins.status === "故障" ? verifyStatusOf(ins, M.DEMO_T0 + ems.step * TICK_MS) : "故障";
  ins.status = next;
  if (next === "故障")
    alarmFire({
      mediaCode: ems.meterPoints.find((p) => p.id === ins.pointId)?.mediaCode ?? "ELEC",
      unitId: ems.meterPoints.find((p) => p.id === ins.pointId)?.unitId ?? M.PLANTS.POWER_AUX,
      pointId: ins.pointId,
      level: 3,
      type: "数据异常",
      message: `${ins.name}（${ins.id}）报故障，该计量点数据待复核`,
    });
  return { ok: true, msg: `${ins.name} → ${next}` };
}

/** 通用 upsert / remove（EG 与 EC 三张配置表共用） */
export function upsertRow<T extends Record<string, any>>(list: T[], data: Partial<T> & { id?: string }): T {
  if (data.id) {
    const hit = list.find((r) => r.id === data.id);
    if (hit) {
      Object.assign(hit, data);
      return hit;
    }
  }
  const row = { ...(data as T) };
  list.unshift(row);
  return row;
}

export function removeRow<T extends { id: string }>(list: T[], id: string) {
  const i = list.findIndex((r) => r.id === id);
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}

export function toggleIn<T extends { id: string; enabled: boolean }>(list: T[], id: string) {
  const row = list.find((r) => r.id === id);
  if (!row) return { ok: false, msg: "记录不存在" };
  row.enabled = !row.enabled;
  return { ok: true, msg: `${row.name} 已${row.enabled ? "启用" : "停用"}`, data: row };
}

/**
 * 电价模板启停：同一时刻只允许一个生效模板。
 * 两个都"生效"是电价页最丢人的错误，所以互斥做在端点里、不交给页面自觉。
 */
export function togglePriceTemplate(id: string) {
  const hit = ems.priceTemplates.find((r) => r.id === id);
  if (!hit) return { ok: false, msg: "模板不存在" };
  const turningOn = !hit.enabled;
  if (turningOn) for (const r of ems.priceTemplates) r.enabled = r.id === id;
  else hit.enabled = false;
  return {
    ok: true,
    msg: turningOn ? `${hit.name} 已设为生效模板（${hit.effectiveMonth} 起）` : `${hit.name} 已停用（当前无生效模板）`,
    data: hit,
  };
}

/**
 * 电价模板保存。新建一律**不生效**：生效权只属于 `togglePriceTemplate`，
 * 否则「存了个草稿」和「换了一套电价」在数据上是同一件事，EP0004 结算会悄悄跟着改口径。
 */
export function savePriceTemplate(data: Partial<PriceTemplate> & { id?: string }) {
  if (data.id) {
    const hit = find(ems.priceTemplates, data.id);
    if (hit) {
      Object.assign(hit, data);
      return { ok: true, msg: `${hit.name} 已保存（生效模板不变）`, data: hit };
    }
  }
  const row: PriceTemplate = {
    id: data.id ?? `PT-${pad(ems.priceTemplates.length + 1, 3)}`,
    name: data.name ?? "未命名电价模板",
    tiers:
      data.tiers ?? (ems.priceTemplates.find((r) => r.enabled) ?? ems.priceTemplates[0]).tiers.map((t) => ({ ...t })),
    demandPrice: data.demandPrice ?? M.ELEC_PRICE.demandPrice,
    demandKVA: data.demandKVA ?? M.ELEC_PRICE.demandKVA,
    powerFactorAdj: data.powerFactorAdj ?? true,
    pfTarget: data.pfTarget ?? M.ELEC_PRICE.pfTarget,
    enabled: false,
    effectiveMonth: data.effectiveMonth ?? M.DEMO_MONTH,
  };
  ems.priceTemplates.push(row);
  return { ok: true, msg: `已新增电价模板 ${row.name}（未生效）`, data: row };
}

/**
 * 用能单元：新增/改名。改的是 model 的 `UNIT_LIST` 本体（`registerUnit`），派生立刻跟上。
 *
 * ⚠️ id 与 path 必须续上 `flatten()` 的编号方案，不能拿 `Date.now()` 拼：
 * 方案是「L2 = `EU-0X00`、更深层 = `父id-序号`」+「path = 同级序号链 `/1/2/5`」。
 * 造出 `EU-178632` 这种 id，树上看着正常，但 `PLANT_UNITS`/祖先遍历/`path` 前缀匹配
 * 全都按不上，EG0002 新增一页就把 EP0006 与 EC0003 的归集逻辑捅了个洞。
 */
export function saveUnit(data: Partial<UsingUnit> & { id?: string }) {
  if (data.id) {
    const hit = find(ems.units, data.id);
    if (hit) {
      Object.assign(hit, data);
      return { ok: true, msg: `${hit.name} 已保存`, data: hit };
    }
  }
  const parent = data.parentId ? find(ems.units, data.parentId) : undefined;
  const level = (data.level ?? (parent ? parent.level + 1 : 2)) as UsingUnit["level"];
  if (level === 1) return { ok: false, msg: "全厂根节点唯一，不支持新增一级" };
  if (level > 4) return { ok: false, msg: "单元树最深四级（厂→工序→设备→功能件）" };
  if (level === 2 && !parent) return { ok: false, msg: "新增厂级单元必须挂在 钢城钢铁 之下" };
  const sibs = ems.units.filter((x) => x.parentId === (parent?.id ?? null));
  /** 同级里最大的那个序号 + 1（编号方案见 `unitSeq`） */
  const seq = sibs.reduce((a, x) => Math.max(a, unitSeq(x)), 0) + 1;
  const id = level === 2 ? `EU-${String(seq).padStart(2, "0")}00` : `${parent!.id}-${seq}`;
  const row: UsingUnit = {
    id,
    name: data.name ?? "未命名单元",
    level,
    parentId: parent?.id ?? null,
    path: `${parent?.path ?? ""}/${seq}`,
    mediaCodes: data.mediaCodes ?? [],
    isCostCenter: data.isCostCenter ?? level === 2,
    order: data.order ?? sibs.reduce((a, x) => Math.max(a, x.order), 0) + 1,
    note: data.note,
  };
  ems.units.push(row);
  M.registerUnit(row);
  return { ok: true, msg: `已新增用能单元 ${row.name}（${row.id}）`, data: row };
}

/** 同级序号：L2 藏在 `EU-0X00` 的中间两位，更深层在 id 末段（`flatten()` 的编号方案） */
const unitSeq = (x: UsingUnit) =>
  x.level === 2 ? Number(/^EU-(\d{2})00$/.exec(x.id)?.[1] ?? 0) : Number(x.id.split("-").pop() ?? 0);

/**
 * 换父级：只改 `parentId / level / path`，**id 不动**。
 * id 是创建时按编号方案生成的稳定代理键，改挂重编号会把它名下已有的计量点、
 * 重点设备、实绩行全部变成孤儿——那是"看着更整齐、实际把账搞坏"的典型。
 */
function reparentUnit(u: UsingUnit, newParent: UsingUnit) {
  const oldPath = u.path;
  const sibs = ems.units.filter((x) => x.parentId === newParent.id && x.id !== u.id);
  const seq = sibs.reduce((a, x) => Math.max(a, unitSeq(x)), 0) + 1;
  u.parentId = newParent.id;
  u.level = (newParent.level + 1) as UsingUnit["level"];
  u.order = sibs.reduce((a, x) => Math.max(a, x.order), 0) + 1;
  const newPath = `${newParent.path}/${seq}`;
  for (const x of ems.units) {
    if (x.path === oldPath || x.path.startsWith(`${oldPath}/`)) x.path = newPath + x.path.slice(oldPath.length);
  }
  return { ok: true, msg: `${u.name} 已挂到 ${newParent.name} 下（第 ${u.level} 级）` };
}

/** 层级移动：上移/下移交换同级 order，换父级改 parentId/path（EG0002 的拖拽简化版） */
export function moveUnit(id: string, dir: "up" | "down" | "in" | "out") {
  const u = find(ems.units, id);
  if (!u) return { ok: false, msg: "单元不存在" };
  if (dir === "up" || dir === "down") {
    const sibs = ems.units.filter((x) => x.parentId === u.parentId).toSorted((a, b) => a.order - b.order);
    const i = sibs.indexOf(u);
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= sibs.length) return { ok: false, msg: "已到边界，无法移动" };
    const tmp = u.order;
    u.order = sibs[j].order;
    sibs[j].order = tmp;
    return { ok: true, msg: `${u.name} 已与 ${sibs[j].name} 交换次序` };
  }
  if (u.level <= 2) return { ok: false, msg: "厂级及以上单元不允许换父级（会破坏定额表的归集口径）" };
  const parent = u.parentId ? find(ems.units, u.parentId) : undefined;
  if (dir === "in") {
    /**
     * 下沉 = 挂到**上一个同级**名下（树编辑器的常规语义）。
     * 原实现是 `u.parentId = parent.id`——把自己重新挂到自己当前的父级下面，
     * 什么也没改却回一句「层级已调整为第 3 级」，这种假成功比拒绝更糟：
     * 客户会以为这棵树支持拖拽，实际点十次都是原地。
     */
    const prev = ems.units
      .filter((x) => x.parentId === u.parentId && x.id !== u.id && x.order < u.order)
      .toSorted((a, b) => a.order - b.order)
      .pop();
    if (!prev) return { ok: false, msg: "它已是同级第一个，没有可下沉到的单元" };
    if (prev.level >= 4) return { ok: false, msg: "四级单元不再挂子节点，无法继续下沉" };
    return reparentUnit(u, prev);
  }
  const grand = parent?.parentId ? find(ems.units, parent.parentId) : undefined;
  if (!grand) return { ok: false, msg: "它已经挂在厂级上了，再往上就出定额口径" };
  return reparentUnit(u, grand);
}

/** 介质保存：折标/热值/内结价一改，全站派生立刻跟着动（这就是单源层的意义） */
export function saveMedium(data: Partial<EnergyMedium> & { id?: string; code?: MediumCode }) {
  if (data.id || data.code) {
    const hit = ems.mediums.find((m) => m.id === data.id || m.code === data.code);
    if (hit) {
      /**
       * **编码不可改**：`code` 是全套派生的连接键（定额表、`mediumFlows` 的流向、平衡表的列
       * 都按它对上），把它从 BFG 改成别的值等于让这三张表指向一个不存在的介质——
       * 那是"页面上改成功了、账变烂了"的典型。要换介质就删掉重建（删除另有定额守卫）。
       */
      if (data.code && data.code !== hit.code)
        return { ok: false, msg: `介质编码不可改（${hit.code} → ${data.code} 会让定额与平衡表指向不存在的介质）` };
      Object.assign(hit, data);
      return { ok: true, msg: `${hit.name} 系数已更新，实绩/结算/考核随之重算`, data: hit };
    }
  }
  const code = (data.code ?? "ELEC") as MediumCode;
  const row: EnergyMedium = {
    id: data.id ?? `MT-${pad(ems.mediums.length + 1, 2)}`,
    name: data.name ?? "新介质",
    code,
    unit: data.unit ?? "m³",
    stdCoal: data.stdCoal ?? 0,
    calorific: data.calorific,
    carbonFactor: data.carbonFactor ?? 0,
    innerPrice: data.innerPrice,
    balanceParticipate: data.balanceParticipate ?? true,
    color: data.color ?? "#64748b",
    remark: data.remark,
  };
  ems.mediums.push(row);
  return { ok: true, msg: `已新增介质 ${row.name}`, data: row };
}

export function removeMedium(id: string) {
  const m = find(ems.mediums, id);
  if (!m) return { ok: false, msg: "介质不存在" };
  if (ems.quotas.some((q) => q.mediaCode === m.code))
    return { ok: false, msg: `${m.name} 已挂定额，禁止删除（否则 EP0003 平衡表会缺一列）` };
  return removeRow(ems.mediums, id) ? { ok: true, msg: `${m.name} 已删除` } : { ok: false, msg: "删除失败" };
}

/** 报警规则保存/删除（级别与阈值改动会立刻影响下一次 tick 的判定，因为是现读规则表） */
export function saveAlarmRule(data: Partial<AlarmRule> & { id?: string }) {
  if (data.id) {
    const hit = find(ems.alarmRules, data.id);
    if (hit) {
      Object.assign(hit, data);
      return { ok: true, msg: `${hit.name} 已保存（下一次越限即按新阈值判定）`, data: hit };
    }
  }
  const row: AlarmRule = {
    id: data.id ?? `AR-${pad(ems.alarmRules.length + 1, 3)}`,
    name: data.name ?? "未命名规则",
    mediaCode: data.mediaCode ?? "ELEC",
    pointId: data.pointId ?? ems.meterPoints[0]?.id ?? "",
    kind: data.kind ?? "高限",
    threshold: data.threshold ?? 0,
    deadband: data.deadband ?? 0,
    level: data.level ?? 3,
    receivers: data.receivers ?? [M.PEOPLE.dispatcher],
    channels: data.channels ?? ["站内"],
    enabled: data.enabled ?? true,
  };
  ems.alarmRules.push(row);
  return { ok: true, msg: `已新增报警规则 ${row.name}`, data: row };
}

/* ══════════════════════════════════════════════════════════════════════════
   12. 视图聚合
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * KPI 看板（EO0001/EO0002/home 三处同一个函数）。
 * 月账部分现算于 model，实时部分（柜位/活动报警）现读状态——**两边都不是存字段**。
 */
export function refreshKpiBoard() {
  const kpi = M.kpiBoard(ems.effect);
  const open = ems.alarms.filter((a) => a.status === "活动");
  return {
    ...kpi,
    holderLevels: ems.holders.map((h) => ({
      id: h.id,
      name: h.name,
      mediaCode: h.mediaCode,
      levelPct: h.levelPct,
      hiLimit: h.hiLimit,
      loLimit: h.loLimit,
    })),
    activeAlarms: open.length,
    urgentAlarms: open.filter((a) => a.level <= 2).length,
    loadMw: ems.loadMw,
    openOrders: ems.orders.filter((o) => o.status === "草拟" || o.status === "已下达" || o.status === "执行中").length,
    pendingTickets: ems.tickets.filter((t) => t.status === "待补录").length,
    step: ems.step,
    at: nowStamp(),
  };
}

/**
 * 用能单元树（EG0002 / EC0001 网络树 / EC0005 测点选择器共用同一种层级视图）。
 *
 * 回**平铺节点、按 path 深度优先排好序**，而不是带 `children` 的嵌套结构：
 * `UsingUnit` 是要落库的主数据实体，给它挂一个 `children` 字段，编辑单元时
 * `Object.assign(hit, data)` 会把整棵子树写进一行（`saveUnit` 无法区分"改名"和"换子级"）。
 * 页面按 `parentId` 组树只要三行代码，这个代价放在服务端而不是契约上。
 */
export function unitTree(rootId?: string): UsingUnit[] {
  const root = rootId ? find(ems.units, rootId) : undefined;
  const pool = root ? ems.units.filter((u) => u.id === root.id || u.path.startsWith(`${root.path}/`)) : ems.units;
  return pool.toSorted((a, b) => comparePath(a.path, b.path));
}

/** `path` 是同级序号链（`/1/2/10`）：按字符串比会把 10 排在 2 前面，必须逐段比数值 */
function comparePath(a: string, b: string) {
  const x = a.split("/").map(Number);
  const y = b.split("/").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    /* 短的那条是父级，先出现（x 越界取 -1，父永远小于子） */
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * 计量点 → 统计节点记录的元组键（`channelId` 之外唯一能把「点」映射到「账上行」的关系）。
 *
 * 为什么判据是**整条记录**而不是单个计量点：账上的日行是 单元×介质×方向 一条
 * （`buildActualRecords` 的粒度），它覆盖挂在同一元组上的所有点。断掉 30 个点里的 1 个
 * 就把整条记录标缺失，EP0002 会显示「节点无数据」而 EC0002 明明还在跳数——这是页间矛盾，
 * 比不标更糟。所以只有该元组的点**全部**落在中断通道上才标缺失，其余计入「部分缺失」如实报数。
 */
const tupleOf = (p: MeterPoint) => `${p.unitId}|${p.mediaCode}|${p.direction ?? "消耗"}`;

/** 方向常量（EP 系列的列头与筛选候选，从 model 的七向联合派生，不在页面各写一遍） */
export const FLOW_DIRECTIONS: FlowDirection[] = ["购入", "自产", "转换", "消耗", "回收", "损失", "外供"];

/* ══════════════════════════════════════════════════════════════════════════
   13. 采集层（EC0001/0002/0004 写操作 · EC0005 实时读数与历史）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 序号型主键的下一个值：取**现有最大号 + 1**，不是 `length + 1`。
 * 删掉中间一行之后 `length+1` 会重新发已存在的 id，而 EC0005 的曲线、EP0002 的实绩
 * 全按 id 找点——撞号的表现是"两条曲线重叠"，比报错更难查。
 */
function nextId(list: Array<{ id: string }>, prefix: string, width: number) {
  const max = list.reduce((a, r) => {
    const n = Number(r.id.slice(prefix.length));
    return Number.isFinite(n) && n > a ? n : a;
  }, 0);
  return `${prefix}${pad(max + 1, width)}`;
}

/**
 * 通道的挂点数一律从测点表反推（seed 也是这么算的）。
 * 新增/删除计量点后不回写，EC0002 显示的「影响 12 个点」就和 EC0001 树上的数不一致，
 * 而 `commBreak` 判定"整条元组是否全断"用的正是这个关系。
 */
function syncChannelPointCounts() {
  for (const c of ems.channels) c.pointCount = ems.meterPoints.filter((p) => p.channelId === c.id).length;
}

/** 计量点新增/改名（EC0001） */
export function saveMeterPoint(data: Partial<MeterPoint> & { id?: string }) {
  const missing = ["name", "mediaCode", "unitId", "channelId", "dataKind", "accuracy"].filter(
    (k) => data[k as keyof MeterPoint] === undefined || data[k as keyof MeterPoint] === "",
  );
  if (missing.length) return { ok: false, msg: `请填：${missing.join("、")}` };
  if (!find(ems.units, String(data.unitId))) return { ok: false, msg: `用能单元 ${data.unitId} 不存在` };
  if (!find(ems.channels, String(data.channelId))) return { ok: false, msg: `采集通道 ${data.channelId} 不存在` };

  if (data.id) {
    const hit = find(ems.meterPoints, data.id);
    if (hit) {
      const moved = hit.channelId !== data.channelId;
      Object.assign(hit, data);
      /* 计量体系级别跟着挂载单元走（seed 同一口径），否则树上的 3 级点会去筛 4 级的账 */
      hit.level = (M.UNIT_MAP[hit.unitId]?.level ?? hit.level) as MeterPoint["level"];
      if (moved) syncChannelPointCounts();
      return { ok: true, msg: `${hit.name} 已保存${moved ? "（挂点数已重算）" : ""}`, data: hit };
    }
  }
  const row: MeterPoint = {
    id: data.id ?? nextId(ems.meterPoints, "MP-", 5),
    name: String(data.name),
    mediaCode: data.mediaCode as MediumCode,
    unitId: String(data.unitId),
    level: (M.UNIT_MAP[String(data.unitId)]?.level ?? 3) as MeterPoint["level"],
    accuracy: String(data.accuracy),
    isSettlement: data.isSettlement ?? false,
    channelId: String(data.channelId),
    dataKind: data.dataKind as MeterPoint["dataKind"],
    direction: data.direction,
  };
  ems.meterPoints.unshift(row);
  syncChannelPointCounts();
  return { ok: true, msg: `已新增计量点 ${row.name}（${row.id}）`, data: row };
}

/**
 * 删除计量点。**挂着报警规则或仪表就拒绝**：
 * 规则会指向一个不存在的表号（EM0005 报警中心当场少一条能解释的报警），
 * 仪表的 `pointId` 会悬空（EC0004 台账上那台表的"对应计量点"变空白）。
 * 宁可让人先去解绑，也不留一张缺角的网络图。
 */
export function removeMeterPoint(id: string) {
  const p = find(ems.meterPoints, id);
  if (!p) return { ok: false, msg: "计量点不存在" };
  const rules = ems.alarmRules.filter((r) => r.pointId === id);
  if (rules.length) return { ok: false, msg: `${p.name} 挂着 ${rules.length} 条报警规则，先在 EG0003 删除规则` };
  const insts = ems.instruments.filter((i) => i.pointId === id);
  if (insts.length) return { ok: false, msg: `${p.name} 已绑定仪表 ${insts[0].id}，先在 EC0004 改绑` };
  removeRow(ems.meterPoints, id);
  syncChannelPointCounts();
  return { ok: true, msg: `${p.name} 已删除（通道挂点数已重算）` };
}

/** 采集通道新增/编辑（EC0002） */
export function saveChannel(data: Partial<CollectChannel> & { id?: string }) {
  if (!data.stationName || !data.protocol || !data.owner) return { ok: false, msg: "请填站所名称、通讯规约与责任人" };
  if (data.id) {
    const hit = find(ems.channels, data.id);
    if (hit) {
      Object.assign(hit, data);
      return { ok: true, msg: `${hit.stationName} 已保存`, data: hit };
    }
  }
  const row: CollectChannel = {
    id: data.id ?? nextId(ems.channels, "CH-", 3),
    stationName: String(data.stationName),
    protocol: data.protocol as CollectChannel["protocol"],
    pointCount: 0,
    status: "在线",
    heartbeatAt: nowStamp(),
    cacheMode: data.cacheMode ?? true,
    pendingUpload: 0,
    owner: String(data.owner),
    note: data.note,
  };
  ems.channels.push(row);
  return { ok: true, msg: `已新增通道 ${row.stationName}（${row.id}，暂无挂点）`, data: row };
}

export function removeChannel(id: string) {
  const c = find(ems.channels, id);
  if (!c) return { ok: false, msg: "通道不存在" };
  const pts = ems.meterPoints.filter((p) => p.channelId === id);
  if (pts.length) return { ok: false, msg: `${c.stationName} 还挂着 ${pts.length} 个计量点，先在 EC0001 改通道` };
  removeRow(ems.channels, id);
  return { ok: true, msg: `${c.stationName} 已删除` };
}

/** 仪表台账新增/编辑（EC0004） */
export function saveInstrument(data: Partial<Instrument> & { id?: string }) {
  const missing = ["name", "type", "pointId", "verifyCycleDays", "lastVerifyAt", "installPos"].filter(
    (k) => !data[k as keyof Instrument],
  );
  if (missing.length) return { ok: false, msg: `请填：${missing.join("、")}` };
  if (!find(ems.meterPoints, String(data.pointId))) return { ok: false, msg: `计量点 ${data.pointId} 不存在` };
  const last = Date.parse(String(data.lastVerifyAt));
  const next = data.nextVerifyAt ? Date.parse(String(data.nextVerifyAt)) : NaN;
  if (data.nextVerifyAt && !Number.isFinite(next)) return { ok: false, msg: "下次检定日格式应为 YYYY-MM-DD" };
  if (Number.isFinite(next) && next <= last) return { ok: false, msg: "下次检定日必须晚于上次检定日" };

  if (data.id) {
    const hit = find(ems.instruments, data.id);
    if (hit) {
      Object.assign(hit, data);
      hit.status = verifyStatusOf(hit, M.DEMO_T0 + ems.step * TICK_MS);
      return { ok: true, msg: `${hit.name} 已保存（状态按检定日重算为 ${hit.status}）`, data: hit };
    }
  }
  const cycle = Number(data.verifyCycleDays);
  const row: Instrument = {
    id: data.id ?? nextId(ems.instruments, "INST-", 4),
    name: String(data.name),
    type: String(data.type),
    pointId: String(data.pointId),
    rangeVal: data.rangeVal ?? "—",
    installPos: String(data.installPos),
    verifyCycleDays: cycle,
    lastVerifyAt: String(data.lastVerifyAt),
    nextVerifyAt: data.nextVerifyAt ? String(data.nextVerifyAt) : M.stampOf(last + cycle * 86_400_000).slice(0, 10),
    status: "正常",
    forcedVerify: data.forcedVerify ?? false,
  };
  row.status = verifyStatusOf(row, M.DEMO_T0 + ems.step * TICK_MS);
  ems.instruments.push(row);
  /* 计量点上的 `instId` 是反方向的引用（seed 里也是仪表建完再回填），补上它 EC0001 才看得到表 */
  const p = find(ems.meterPoints, row.pointId);
  if (p && !p.instId) p.instId = row.id;
  return { ok: true, msg: `已新增仪表 ${row.name}（${row.id}，${row.status}）`, data: row };
}

/**
 * 检定登记。**下次检定日可省**：省下去按 `lastVerifyAt + 检定周期` 自己算——
 * 现场检定证书上给的就是周期，让页面去猜这个日期等于把强检周期的口径搬出账本。
 */
export function verifyInstrument(id: string, nextVerifyAt?: string, by = M.PEOPLE.assess) {
  const ins = find(ems.instruments, id);
  if (!ins) return { ok: false, msg: "仪表不存在" };
  let next = nextVerifyAt;
  if (!next) next = M.stampOf(Date.parse(ins.lastVerifyAt) + ins.verifyCycleDays * 86_400_000).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return { ok: false, msg: "下次检定日期格式应为 YYYY-MM-DD" };
  ins.lastVerifyAt = M.DEMO_TODAY;
  ins.nextVerifyAt = next;
  ins.status = verifyStatusOf(ins, M.DEMO_T0 + ems.step * TICK_MS);
  return { ok: true, msg: `${ins.name} 检定登记完成（${by}），下次 ${next}`, data: ins };
}

/* ── EC0005 实时读数与历史曲线 ──────────────────────────────────────────── */

/** 24 小时负荷基线的均值：实时读数只取**比值**，于是绝对规模仍由 model 说了算 */
const LOAD_MEAN = M.LOAD_CURVE_MW.reduce((a, b) => a + b, 0) / M.LOAD_CURVE_MW.length;

/** 演示时钟的当前小时（含分钟小数）。tick 每拍推进一分钟，所以它自己就是单调的 */
function demoHour() {
  const d = new Date(M.DEMO_T0 + ems.step * TICK_MS);
  return d.getHours() + d.getMinutes() / 60;
}

/**
 * 该点应有日均 ÷ 同元组挂点数 = 这个点摊到的量（`dayValueOf` 已经做完这件事）。
 * 在它之上只乘两类系数：**日累积比例**（累计量表盘的物理定义）和**当小时负荷系数**
 * （瞬时率跟着全厂负荷走，凌晨与吹炼高峰不是一个数）。
 * 通道非在线的点直接给 `null`——把最后一次读数冒充当前值，是实时页最丢人的假数据。
 */
export function liveReadings(pointIds?: string[]): PointReading[] {
  const hour = demoHour();
  const loadRatio = M.LOAD_CURVE_MW[Math.floor(hour) % 24] / LOAD_MEAN;
  const ids = pointIds?.length ? new Set(pointIds) : null;
  const at = nowStamp();
  return ems.meterPoints
    .filter((p) => !ids || ids.has(p.id))
    .map((p) => {
      const ch = find(ems.channels, p.channelId);
      const status: CollectChannel["status"] = ch?.status ?? "离线";
      const base: PointReading = {
        pointId: p.id,
        name: p.name,
        mediaCode: p.mediaCode,
        unitId: p.unitId,
        dataKind: p.dataKind,
        value: null,
        unit: "",
        channelStatus: status,
        pendingUpload: ch?.pendingUpload ?? 0,
        at,
      };
      if (status !== "在线") return base;
      if (p.dataKind === "状态量") {
        /* 状态量没有"量"的口径：运行/停止就是它的全部信息，硬算一个数反而假 */
        return { ...base, value: 1, unit: "", on: true };
      }
      const day = dayValueOf(p.id);
      if (day === undefined || day <= 0) return base;
      if (p.dataKind === "累计量") {
        /* 表盘读数 = 日量 × 今日已过比例：只增不减，所以**不加抖动**（加了会倒退，表盘打脸） */
        const d = M.toDisp(p.mediaCode, (day * hour) / 24);
        return { ...base, value: d.value, unit: d.unit };
      }
      const r = M.toRateDisp(p.mediaCode, (day / 24) * loadRatio * (1 + jitter() * 0.01));
      return { ...base, value: r.value, unit: r.unit };
    });
}

/**
 * 逐日历史曲线。**日份额一律出自 `M.daySplit`**，也就是 EP0002 那条日实行的同一个算法：
 * 曲线最后一天与实绩表的日行、以及人工校正/补录改过的值完全一致（`daySplit` 的末位覆盖），
 * 两处若各摊一遍，客户把曲线和表格并排打开就看出矛盾——这是本域唯一红线。
 *
 * 均摊到点的比例与 `dayValueOf` 同一条逻辑（同元组挂点数），所以树上看到的点和曲线是一条线。
 */
export function pointHistory(pointIds: string[], days = M.MONTH_ELAPSED_DAYS): PointHistoryResult {
  const dates = M.DAY_DATES.slice(-days);
  const series: PointSeries[] = [];
  for (const id of pointIds) {
    const p = find(ems.meterPoints, id);
    if (!p) continue;
    const direction = p.direction ?? "消耗";
    let unitId: string | undefined = p.unitId;
    let monthQty = 0;
    let lastDay: number | null = null;
    let missing = false;
    while (unitId) {
      const rows = ems.actuals.filter(
        (x) => x.unitId === unitId && x.mediaCode === p.mediaCode && x.direction === direction,
      );
      const m = rows.find((x) => x.granularity === "month");
      const d = rows.find((x) => x.granularity === "day");
      if (m) {
        monthQty = m.value;
        lastDay = d ? (d.missing ? null : d.value) : null;
        missing = d?.missing ?? false;
        break;
      }
      unitId = M.UNIT_MAP[unitId]?.parentId;
    }
    const unit = M.DISP[p.mediaCode].unit;
    if (!monthQty) {
      series.push({
        pointId: id,
        name: p.name,
        mediaCode: p.mediaCode,
        unit,
        values: dates.map(() => null),
        stats: { avg: null, max: null, min: null, std: null },
      });
      continue;
    }
    const peers =
      ems.meterPoints.filter(
        (x) =>
          x.mediaCode === p.mediaCode &&
          (x.direction ?? "消耗") === direction &&
          (x.unitId === unitId || (M.UNIT_MAP[x.unitId]?.path.startsWith(`${M.UNIT_MAP[unitId!].path}/`) ?? false)),
      ).length || 1;
    const daily = M.daySplit(monthQty, lastDay ?? undefined).map((v) => round(v / peers, M.DISP[p.mediaCode].digits));
    /* 中断那天的数不存在（不是 0）：补 0 会把日均拉低，客户拿计算器一复核就露馅 */
    if (missing) daily[daily.length - 1] = null;
    const vals = daily.slice(-days);
    const have = vals.filter((v): v is number => v !== null);
    const avg = have.length ? round(have.reduce((a, b) => a + b, 0) / have.length, M.DISP[p.mediaCode].digits) : null;
    series.push({
      pointId: id,
      name: p.name,
      mediaCode: p.mediaCode,
      unit,
      values: vals,
      stats: {
        avg,
        max: have.length ? round(Math.max(...have), M.DISP[p.mediaCode].digits) : null,
        min: have.length ? round(Math.min(...have), M.DISP[p.mediaCode].digits) : null,
        std:
          avg === null || have.length < 2
            ? null
            : round(Math.sqrt(have.reduce((a, b) => a + (b - avg) ** 2, 0) / have.length), M.DISP[p.mediaCode].digits),
      },
    });
  }
  return { dates, series };
}

/* ══════════════════════════════════════════════════════════════════════════
   14. 监控视图装配（EM0001~0004 / EM0005 / EM0007）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 端点回给页面的**一张画布**：几何来自 seed、数值来自 model、柜位来自实时层。
 *
 * 三层在这里汇成一份 DTO，页面因此拿到的是「已经能画的东西」——它自己不 import model、
 * 不 import seed、不查介质色表、不判阈值。这条边界是「只有 model 允许出现业务数字」
 * 在**页面侧**的落地方式：不是靠自觉不写数，而是页面根本拿不到写数所需的东西。
 */
function buildScene(scene: TopoScene, stats: Record<string, M.MonitorStat>): TopoViewDto {
  return {
    viewBox: scene.viewBox,
    nodes: scene.nodes.map((n) => {
      const s = n.stat ? stats[n.stat] : undefined;
      const holder = n.ref && n.kind === "holder" ? holderOf(n.ref) : undefined;
      return {
        id: n.id,
        label: n.label,
        kind: n.kind,
        x: n.x,
        y: n.y,
        w: n.w,
        h: n.h,
        ref: n.ref,
        holder,
        value: s ? round(s.value, 2) : undefined,
        unit: s?.unit,
        tone: s?.tone ?? "ok",
      };
    }),
    /* 连线只带颜色、不带流量：管线上标数字会把图元挤成一团表格，
       而「哪路在放散」这件事柜体和放散塔已经用颜色说了 */
    edges: scene.edges.map((e) => ({
      from: e.from,
      to: e.to,
      style: e.style,
      via: e.via,
      color: e.media ? M.MEDIUMS[e.media].color : undefined,
    })),
  };
}

/** 活动报警（未关闭）：级别升序、时间降序。监控页右栏与大屏的报警流共用这一个排序口径 */
export function activeAlarms(media?: MediumCode) {
  return ems.alarms
    .filter((a) => a.status !== "已关闭" && (!media || a.mediaCode === media))
    .toSorted((a, b) => a.level - b.level || (a.time < b.time ? 1 : -1));
}

const base = () => ({ stamp: nowStamp(), step: ems.step, alarms: activeAlarms() });

/** EM0001 供配电：外购负荷用**实时点**覆盖月账派生值，其余（主变、需量、机组）仍是 model 的口径 */
export function powerMonitorView(): PowerViewDto {
  const mw = ems.loadMw;
  const p = M.powerMonitor(mw, ems.effect);
  const stats = M.monitorStats({ power: p });
  const toneOfStat = (key: string) => stats[key]?.tone ?? "ok";
  /* 机组出力画实时点，不画月均值：月均那根柱在演示中一动不动，客户会以为页面没在刷 */
  const liveMw = (id: string) => ems.unitMw[id] ?? 0;
  return {
    ...base(),
    scene: buildScene(TOPO_POWER, stats),
    nowMw: round(mw, 1),
    hour: p.hour,
    history: ems.loadHistory,
    curve: p.curve.map((c) => ({ hour: c.hour, mw: round(c.mw, 1), tier: c.tier, price: c.price })),
    feeders: p.feeders.map((f) => ({ ...f, kw: round(f.kw, 0), sharePct: round(f.sharePct, 1) })),
    transformers: p.transformers.map((t) => ({
      ...t,
      loadMVA: round(t.loadMVA, 1),
      ratioPct: round(t.ratioPct, 1),
      tone: toneOfStat(`p-${t.id}`),
    })),
    demand: {
      declaredKVA: p.demand.declaredKVA,
      limitMw: round(p.demand.limitMw, 1),
      appMva: round(p.demand.appMva, 1),
      utilPct: round(p.demand.utilPct, 1),
      maxUtilPct: round(p.demand.maxUtilPct, 1),
      tone: toneOfStat("p-demand"),
    },
    /** `tone` 全部来自 `monitorStats`：**页面拿到什么色就画什么色**。
       若这里不给，页面就得自己写 `pf >= target ? ok : warn`——同一个量两个地方判色，
       调一档阈值要改两个文件，那正是本域红线要挡住的"页间矛盾"。 */
    pf: { ...p.pf, tone: toneOfStat("p-pf") },
    selfGen: {
      mw: round(p.selfGen.mw, 1),
      ratePct: round(p.selfGen.ratePct, 1),
      purchaseKw: round(mw * 1000, 0),
      tone: toneOfStat("p-self"),
    },
    genUnits: p.genUnits.map((u) => ({
      id: u.id,
      name: u.name,
      media: u.media,
      running: u.running,
      mw: round(liveMw(u.id), 1),
      maxMw: u.maxMw,
      loadRatioPct: round(u.maxMw > 0 ? (liveMw(u.id) / u.maxMw) * 100 : 0, 1),
      fuelM3h: round(u.fuelM3h, 0),
      tone: u.running ? (toneOfStat(`p-${u.id}`) === "warn" ? "warn" : "ok") : "bad",
    })),
    recoveries: p.recoveries.map((r) => ({ ...r, mw: round(r.mw, 1) })),
    price: { tier: p.price.tier, now: p.price.now, avg: round(p.price.avg, 3) },
  };
}

/**
 * EM0002 煤气管网。三路的月均量 + 五口柜的实时柜位 + 当班放散。
 *
 * ⚠️ `lines[].ventM3h` 是**月均**（来自蒸汽/煤气账的残差），`sim.ventM3h` 是**当班**（瞬时富余）。
 * 两个数并存是刻意的：文件头「月均放散 vs 当班放散」那条说了为什么不能合成一个。
 * 页面上它们各占一格、各标各的口径，谁也不会把 416 m³/min 当成 1916 去复核。
 */
export function gasMonitorView(media: M.GasMedia = "LDG"): GasViewDto {
  const g = M.gasBalance(ems.effect);
  const stats = M.monitorStats({ gas: M.gasHourlyFlows(ems.effect) });
  const lines: GasLineDto[] = (
    [
      ["BFG", g.bfg],
      ["COG", g.cog],
      ["LDG", g.ldg],
    ] as const
  ).map(([code, l]) => ({
    media: code,
    name: l.name,
    color: l.color,
    incomeM3h: round(l.incomeM3h, 0),
    processUseM3h: round(l.processUseM3 / M.MONTH_HOURS, 0),
    genUseM3h: round(l.genUseM3 / M.MONTH_HOURS, 0),
    exportM3h: round(l.exportM3 / M.MONTH_HOURS, 0),
    ventM3h: round(l.ventM3 / M.MONTH_HOURS, 0),
    ventRatePct: round(l.ventRatePct, 2),
    levelPct: liveLevelPct(code),
    tone: liveLevelPct(code) >= 88 ? "bad" : liveLevelPct(code) >= 80 ? "warn" : "ok",
  }));
  const sc = currentScenario(media);
  const sim = M.simulateGasBalance(sc);
  return {
    ...base(),
    scene: buildScene(TOPO_GAS, stats),
    lines,
    holders: ems.holders,
    ventTotalM3h: round(g.ventTotalM3 / M.MONTH_HOURS, 0),
    ventRatePct: round(g.ventTotalRatePct, 2),
    scenario: sc,
    sim,
    suggestions: ems.suggestions,
    unacked: ems.alarms.filter((a) => a.status === "活动").length,
  };
}

/** EM0003 蒸汽与水：产源/用汽两张表直接给 model 的行，画布数值走 `stat` */
export function steamMonitorView(): SteamViewDto {
  const s = M.steamMonitor(ems.effect);
  const stats = M.monitorStats({ steam: s });
  return {
    ...base(),
    scene: buildScene(TOPO_STEAM, stats),
    sources: s.sources.map((x) => ({
      id: x.id,
      name: x.name,
      tier: x.tier,
      offNetwork: x.offNetwork,
      note: x.note,
      perUnitTph: round(x.perUnitTph, 1),
      units: x.units,
      totalTph: round(x.totalTph, 1),
      /** 画布上并联锅炉显示自己那份，合计行显示总量：一个来源、两种摊法，不另算一遍 */
      value: round(x.units > 1 ? x.perUnitTph : x.totalTph, 1),
      tone: "ok" as const,
    })),
    uses: s.uses.map((u) => ({
      unitId: u.unitId,
      dir: u.dir,
      name: u.name,
      tph: round(u.tph, 1),
      sharePct: round(u.sharePct, 1),
    })),
    tiers: s.tiers.map((t) => ({ ...t, prodTph: round(t.prodTph, 1) })),
    header: { mpa: s.header.mpa, tempC: s.header.tempC, tph: round(s.header.tph, 1) },
    drums: s.drums.map((d) => ({ id: d.id, name: d.name, pct: d.basePct, mpa: d.mpa })),
    total: {
      producedTph: round(s.total.producedTph, 1),
      usedTph: round(s.total.usedTph, 1),
      lossTph: round(s.total.lossTph, 1),
      lossPct: round(s.total.lossPct, 1),
      tone: stats["s-loss"]?.tone ?? "ok",
    },
    water: {
      newWaterM3h: round(s.water.newWaterM3h, 0),
      lossPct: s.water.lossPct,
      circTotalM3h: round(s.water.circTotalM3h, 0),
      loops: s.water.loops.map((w) => ({ ...w, circM3h: round(w.circM3h, 0), makeupM3h: round(w.makeupM3h, 0) })),
      users: s.water.users.map((u) => ({ ...u, m3h: round(u.m3h, 0) })),
    },
  };
}

/** EM0004 氧氮氩 */
export function gasPlantMonitorView(): GasPlantViewDto {
  const g = M.gasPlantMonitor(ems.effect);
  const stats = M.monitorStats({ gasPlant: g });
  return {
    ...base(),
    scene: buildScene(TOPO_GASPLANT, stats),
    units: g.units.map((u) => ({
      id: u.id,
      name: u.name,
      o2Nm3h: round(u.o2Nm3h, 0),
      capLoadPct: round(u.capLoadPct, 1),
      kwhPerNm3: u.kwhPerNm3,
      kw: round(u.kw, 0),
      tone: stats[`g-${u.id}`]?.tone ?? "ok",
    })),
    purity: g.purity,
    products: g.products.map((p) => ({
      media: p.media,
      name: p.name,
      color: M.MEDIUMS[p.media].color,
      selfNm3h: round(p.selfNm3h, 0),
      useNm3h: round(p.useNm3h, 0),
      exportNm3h: round(p.exportNm3h, 0),
      kwhPerNm3: p.kwhPerNm3,
      lossPct: p.lossPct,
    })),
    headers: g.headers.map((h) => ({ ...h, flowNm3h: round(h.flowNm3h, 0) })),
    tanks: g.tanks.map((t) => ({ id: t.id, media: t.media, name: t.name, capM3: t.capM3, pct: t.basePct })),
    exportArNm3h: round(g.exportArNm3h, 0),
  };
}

/**
 * EM0007 煤气平衡仿真：预测曲线 + what-if + 未处置基线。
 *
 * ⚠️ `sim` 与 `unmitigated` 必须是**同一次请求里的两次纯函数调用**。
 * 未处置基线若从 `sc` 反推（早期实现就是这样），R4「放缓吹炼」改的正是进气量，
 * 反推回去会把进气增量一起采纳，得到 cut=0 —— 建议卡说省 4.5 万、仿真说省 0。
 */
export function gasSimView(sc: GasScenarioDto = {}): GasSimViewDto {
  const media = (sc.media ?? "LDG") as M.GasMedia;
  /** 柜位永远取实时值：滑杆里没有 `levelPct`，页面也不该能伪造它 */
  const live: M.GasScenario = {
    ...sc,
    media,
    levelPct: liveLevelPct(media),
    holderId: sc.holderId ?? focusHolderId(media),
  };
  const unmit: M.GasScenario = {
    media,
    levelPct: live.levelPct,
    holderId: live.holderId,
    extraLdgM3min: currentScenario(media).extraLdgM3min,
    extraBfgM3min: currentScenario(media).extraBfgM3min,
  };
  const sim = M.simulateGasBalance(live);
  const unmitigated = M.simulateGasBalance(unmit);
  /** 月增效由「本手 vs 未处置」的放散差额折电算出（`scenarioGain` 的注释说了为什么不能从 `sc` 反推） */
  sim.gainMonth = M.scenarioGain(live, unmit).amount * 24 * 30;
  return {
    stamp: nowStamp(),
    step: ems.step,
    load: M.loadForecast(24),
    gas: M.gasForecast(24),
    scenario: sc,
    sim,
    unmitigated,
    suggestions: ems.suggestions,
    holders: ems.holders,
    levelPct: live.levelPct,
    bounds: M.whatIfBounds(),
  };
}

/** EM0005 报警中心：五级分桶 + 状态计数（看板与统计条一次给全，页面不再自己 group by） */
export function alarmBoard(level: AlarmLevel | 0 = 0, status = ""): AlarmBoardDto {
  const all = ems.alarms;
  const active = all.filter((a) => a.status !== "已关闭");
  const levels = ([1, 2, 3, 4, 5] as AlarmLevel[]).map((lv) => {
    const rows = active.filter((a) => a.level === lv).toSorted((a, b) => (a.time < b.time ? 1 : -1));
    return { level: lv, total: rows.length, unacked: rows.filter((a) => a.status === "活动").length, rows };
  });
  let rows = level ? all.filter((a) => a.level === level) : [...all];
  if (status) rows = rows.filter((a) => a.status === status);
  rows.toSorted((a, b) => a.level - b.level || (a.time < b.time ? 1 : -1));
  return {
    stamp: nowStamp(),
    step: ems.step,
    levels,
    rows: rows.slice(0, 200),
    stats: {
      total: all.length,
      unacked: all.filter((a) => a.status === "活动").length,
      acked: all.filter((a) => a.status === "已确认").length,
      closed: all.filter((a) => a.status === "已关闭").length,
      today: all.filter((a) => a.time.startsWith(M.DEMO_TODAY)).length,
      toDispatch: all.filter((a) => a.status === "已转调度令").length,
    },
  };
}
