/**
 * 能源管理（EMS）演示域契约类型。
 *
 * **mock 实现这个契约，而不是反过来**（`src/api/energy/index.ts` 文件头）。
 * 页面一律从这里取类型、不做 `any` 兜底，这样将来接真实后端时，字段口径的分歧会在编译期
 * 而不是演示现场暴露。实体清单源自 `temp/energy.md` 附录 B1，编号前缀照该表：
 * `MT-` 介质 / `EU-` 用能单元 / `MP-` 计量点 / `CH-` 采集通道 / `INST-` 仪表 /
 * `ALM-` 报警 / `DD-` 调度令 / `QT-` 定额 / `PLAN-` 计划 / `ACT-` 实绩 / `BLN-` 平衡表 /
 * `ST-` 结算单 / `KE-` 重点设备 / `QUAL-` 质量工单。
 *
 * ⚠️ **本域刻意没有"折碳"参与计算**：`EnergyMedium.carbonFactor` 只是 EG0001 屏上的一列展示值，
 * 没有任何派生函数读它——能碳一体化归碳系统管（energy.md 附录 A 的边界声明）。
 * 看到这张表里有折碳因子就在别处算碳排放，是越界。
 */

/* ── 通用信封 ─────────────────────────────────────────────────────────── */

/** 列表分页返回（服务端分页，见 `src/mock/energy/query.ts` 的 `paged()`） */
export interface PageResult<T> {
  total: number;
  rows: T[];
}

/**
 * 写操作返回。**业务拒绝不走 HTTP 错误**：
 * 「结算已定稿，禁止校正实绩」这类结果回的是 `HTTP 200 + ok:false + msg`，
 * 由页面 `applyResult` 弹 toast——真实后端也是这个形状，拦截层只处理传输与权限错误。
 */
export interface ActionResult<T = unknown> {
  ok: boolean;
  msg: string;
  data?: T;
}

/* ── 介质 ─────────────────────────────────────────────────────────────── */

/**
 * 能源介质编码。
 *
 * `COAL`（洗精煤）、`COKE`（焦炭）与 `PULV`（喷吹煤粉）**是 B1 清单之外的三行**，理由见
 * `src/mock/energy/data/model.ts` 文件头：没有固体燃料，烧结与炼铁工序就算不出可信的吨钢能耗
 * （懂行客户第一个追问就是这个数）。它们在 EG0001 屏上正好充当「介质字典可扩展」的活样本。
 */
export type MediumCode =
  | "ELEC"
  | "BFG"
  | "COG"
  | "LDG"
  | "MIG"
  | "STEAM"
  | "O2"
  | "N2"
  | "AR"
  | "AIR"
  | "WATER"
  | "NG"
  | "COAL"
  | "COKE"
  | "PULV";

export interface EnergyMedium {
  id: string; // MT-01
  name: string; // 高炉煤气
  code: MediumCode;
  unit: string; // kWh / m³ / t
  /** 折标煤系数 kgce/单位 */
  stdCoal: number;
  /** 低位热值 MJ/单位（气体与燃料类才有） */
  calorific?: number;
  /** 折碳因子——**仅展示**，本域不参与任何计算 */
  carbonFactor: number;
  /** 内部结算价 元/单位（电力走分时，见 `PriceTemplate`） */
  innerPrice?: number;
  /** 是否进能源平衡表（EP0003） */
  balanceParticipate: boolean;
  /** 图表专色，全站同介质同色（`emsTheme.ts` 与本字段同源） */
  color: string;
  remark?: string;
}

/* ── 用能单元与计量 ───────────────────────────────────────────────────── */

/** 四级用能单元：公司 / 厂 / 车间 / 工序(设备) */
export interface UsingUnit {
  id: string; // EU-0301
  name: string; // 7#高炉
  level: 1 | 2 | 3 | 4;
  parentId: string | null;
  /** `1/2/5/11` 形式的祖先链，树查询与面包屑用 */
  path: string;
  mediaCodes: MediumCode[];
  /** 成本中心：结算单挂在这一层（EP0004） */
  isCostCenter: boolean;
  /** 排序号，同级按它排 */
  order: number;
  note?: string;
}

/** 计量点（EC0001） */
export interface MeterPoint {
  id: string; // MP-00001
  name: string; // 1#烧结机主抽电耗
  mediaCode: MediumCode;
  unitId: string; // 所属最末级用能单元
  /** 计量体系级别（一~四级），与 `UsingUnit.level` 同向 */
  level: 1 | 2 | 3 | 4;
  /** 精度等级：电力 0.5S / 关键节点 0.5 / 一般 2.0 */
  accuracy: string;
  /** 结算点（进强制检定目录） */
  isSettlement: boolean;
  instId?: string;
  channelId: string;
  dataKind: "累计量" | "瞬时值" | "状态量";
  /** 逻辑父点：质量校验「总管=分支和」比的就是这组（EC0003） */
  upperPoints?: string[];
  /** 该点对应的定额方向（实绩/平衡归集用），状态量点可为空 */
  direction?: FlowDirection;
}

/** 采集通道 / 无人值守站所（EC0002） */
export interface CollectChannel {
  id: string; // CH-001
  stationName: string; // 110kV北区变电站
  protocol: "OPC UA" | "Modbus TCP" | "IEC 60870-5-104" | "DL/T645" | "S7";
  pointCount: number;
  status: "在线" | "通讯异常" | "离线";
  /** `YYYY-MM-DD HH:mm:ss`，演示时钟口径（`store.ts` 的 `nowStamp()`） */
  heartbeatAt: string;
  /** 边缘网关本地缓存断点续传 */
  cacheMode: boolean;
  /** 待补传条数，中断期间随 tick 累积 */
  pendingUpload: number;
  owner: string;
  note?: string;
}

/** 计量仪表台账（EC0004） */
export interface Instrument {
  id: string; // INST-0001
  name: string; // 孔板流量计
  type: string;
  pointId: string;
  rangeVal: string; // 量程
  installPos: string;
  verifyCycleDays: number;
  lastVerifyAt: string;
  nextVerifyAt: string;
  status: "正常" | "临期" | "超期" | "故障";
  /** 强检目录标记 */
  forcedVerify: boolean;
}

/* ── 实时监控域 ───────────────────────────────────────────────────────── */

export type AlarmLevel = 1 | 2 | 3 | 4 | 5;

/** 能源报警（EM0005）——状态机见 energy.md B2.1 */
export interface EnergyAlarm {
  id: string; // ALM-20260927-001
  time: string;
  mediaCode: MediumCode;
  pointId?: string;
  unitId: string;
  /** 1事故 2重大 3一般 4提示 5告知 */
  level: AlarmLevel;
  type: "越限" | "柜位高危" | "允许放散" | "需量超限" | "通讯中断" | "数据异常" | "质量超标";
  message: string; // 「LDG柜位 92%，18min后触顶」
  status: "活动" | "已确认" | "已转调度令" | "已关闭";
  ackBy?: string;
  ackAt?: string;
  dispatchId?: string;
  closedAt?: string;
}

/** 调度令（EM0006）——状态机见 energy.md B2.2 */
export interface DispatchOrder {
  id: string; // DD-20260927-03
  type: "放散许可" | "加减负荷" | "机组启停" | "停复役" | "运行方式变更" | "降压限用";
  reason: string;
  /** 关联报警 id（由报警转来时带上） */
  alarmId?: string;
  actions: Array<{ unitId: string; instruction: string; expectEffect?: string }>;
  issuer: string;
  receiver: string;
  status: "草拟" | "已下达" | "执行中" | "已完成" | "已回执";
  createdAt: string;
  issuedAt?: string;
  deadline?: string;
  doneAt?: string;
  receiptAt?: string;
  /** 逾期标红（B2.2 分支） */
  overdue?: boolean;
}

/** 煤气柜——demo 里唯一随 tick 积分的实时对象（EM0002 / EM0007） */
export interface GasHolder {
  id: string;
  name: string;
  mediaCode: "BFG" | "COG" | "LDG";
  capM3: number;
  /** 当前柜位 %（均值回归到 `basePct`，见 `model.holderBase`） */
  levelPct: number;
  inFlow: number; // m³/min
  outFlow: number; // m³/min
  hiLimit: number;
  loLimit: number;
  /** 回归基线：处置动作见效就是把它推下来（`execDone` 的 pendingEffect） */
  basePct: number;
  /** 近 60 拍柜位历史，实时曲线直接画它 */
  history: number[];
}

/** 调度建议（EM0007 规则引擎产物） */
export interface DispatchSuggestion {
  id: string;
  /** 规则编号，讲解时能指出「这条为什么出」 */
  rule: string;
  title: string;
  detail: string;
  /** 预计削减放散量 m³/h；柜位未触顶时为 0（气先入柜），看 `absorbM3h` */
  expectCutM3: number;
  /** 本手新增的消纳量 m³/h——柜位没满时建议卡上唯一有量级的数，来自 `scenarioGain` */
  absorbM3h: number;
  /** 触顶倒计时被延后多少分钟；算不出倒计时时为 null */
  delayHighMin: number | null;
  /** 见效时滞 min（点炉 40min 这类，是调度建议最真实的地方） */
  delayMin: number;
  /** 采纳后生成的调度令 id；未采纳为空 */
  acceptedId?: string;
  createdAt: string;
}

/* ── 监控域（EM0001~0004 / EM0007） ─────────────────────────────────────── */

/**
 * 一个数该不该变色。**阈值在 `model.monitorStats()` 里，不在这份契约里，更不在页面里**——
 * 页面写 `v > 90 ? "bad" : "ok"` 就是给同一个量造第二个真源，EM0001 的黄条与大屏的红条立刻不同步。
 */
export type StatTone = "ok" | "warn" | "bad";

/** 画布图元：几何 + 已经解析成数值的监测量 + （柜类图元）实时柜位 */
export interface TopoNodeDto {
  id: string;
  label: string;
  kind: "bus" | "box" | "gen" | "load" | "holder" | "valve";
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** 关联的计量点 id 或煤气柜 id */
  ref?: string;
  /** `ref` 指到柜时带的实时柜位（%），页面据此画柜体填充高度 */
  holder?: GasHolder;
  value?: number;
  unit?: string;
  tone: StatTone;
}

export interface TopoEdgeDto {
  from: string;
  to: string;
  style?: "solid" | "dash" | "thick";
  via?: Array<[number, number]>;
  /** 介质专色。颜色真源是 `model.MEDIUMS[].color`，在这里解析完，页面不再查介质表 */
  color?: string;
}

export interface TopoViewDto {
  viewBox: string;
  nodes: TopoNodeDto[];
  edges: TopoEdgeDto[];
}

/** 一张监控页共用的右侧信息 */
export interface MonitorBaseDto {
  scene: TopoViewDto;
  /** 当前活动报警（未关闭），按级别升序、时间降序 */
  alarms: EnergyAlarm[];
  /** 演示时钟 */
  stamp: string;
  step: number;
}

/** EM0001 供配电一次图 */
export interface PowerViewDto extends MonitorBaseDto {
  nowMw: number;
  hour: number;
  /** 负荷近 60 拍历史（MW），页面直接画实时折线 */
  history: number[];
  curve: Array<{ hour: number; mw: number; tier: string; price: number }>;
  feeders: Array<{ unitId: string; name: string; kw: number; sharePct: number; tone: StatTone }>;
  transformers: Array<{
    id: string;
    name: string;
    ratedMVA: number;
    loadMVA: number;
    ratioPct: number;
    tone: StatTone;
  }>;
  demand: { declaredKVA: number; limitMw: number; appMva: number; utilPct: number; maxUtilPct: number; tone: StatTone };
  pf: { actual: number; target: number; tone: StatTone };
  selfGen: { mw: number; ratePct: number; purchaseKw: number; tone: StatTone };
  genUnits: Array<{
    id: string;
    name: string;
    media: MediumCode;
    running: boolean;
    mw: number;
    maxMw: number;
    loadRatioPct: number;
    fuelM3h: number;
    tone: StatTone;
  }>;
  recoveries: Array<{ id: string; name: string; kwh: number; mw: number }>;
  price: { tier: string; now: number; avg: number };
}

/** 一条煤气总管的月均口径 + 实时柜位 */
export interface GasLineDto {
  media: MediumCode;
  name: string;
  color: string;
  incomeM3h: number;
  processUseM3h: number;
  genUseM3h: number;
  exportM3h: number;
  ventM3h: number;
  ventRatePct: number;
  /** 该介质柜组的柜容加权平均柜位（%） */
  levelPct: number;
  tone: StatTone;
}

/** EM0002 煤气管网 */
export interface GasViewDto extends MonitorBaseDto {
  lines: GasLineDto[];
  holders: GasHolder[];
  ventTotalM3h: number;
  ventRatePct: number;
  /** 当前剧本场景（what-if 的初始值），滑杆改的是它、不是落库数据 */
  scenario: GasScenarioDto;
  /** 该场景的仿真结果 */
  sim: GasSimDto;
  suggestions: DispatchSuggestion[];
  /** 未确认报警条数（大屏与角标用） */
  unacked: number;
}

/** 煤气 what-if 场景参数（对应 `model.GasScenario`，页面只发这份 JSON） */
export interface GasScenarioDto {
  media?: "BFG" | "COG" | "LDG";
  /** 追加转炉煤气瞬时进气 m³/min */
  extraLdgM3min?: number;
  /** 追加高炉煤气瞬时发生 m³/min */
  extraBfgM3min?: number;
  /** CCPP 目标出力 MW */
  ccppMw?: number;
  /** CFB 投运台数 0/1/2 */
  cfbUnits?: number;
  /** 烧结点火用气变化 %：正=多用气（消纳富余） */
  sinterUsePct?: number;
  /** 关注的柜 id */
  holderId?: string;
}

/** 仿真结果（EM0002 / EM0007 共用一份，两页的倒计时因此是同一个数） */
export interface GasSimDto {
  media: "BFG" | "COG" | "LDG";
  holderId: string;
  holderName: string;
  levelPct: number;
  hiLimitPct: number;
  ventM3min: number;
  ventM3h: number;
  netFillM3min: number;
  /** 触顶倒计时 min；`null` = 柜位不在上涨 */
  minutesToHigh: number | null;
  baseVentM3min: number;
  surplusM3min: number;
  fillCapM3min: number;
  headroomM3: number;
  ccppMw: number;
  ccppMaxMw: number;
  cfbUnits: number;
  cfbNewSinkM3min: number;
  sinterDeltaM3min: number;
  gainMonth: number;
}

/** EM0003 蒸汽与水平衡 */
export interface SteamViewDto extends MonitorBaseDto {
  sources: Array<{
    id: string;
    name: string;
    tier: string;
    offNetwork: boolean;
    note: string;
    perUnitTph: number;
    units: number;
    totalTph: number;
    value: number;
    tone: StatTone;
  }>;
  uses: Array<{ unitId: string; dir: string; name: string; tph: number; sharePct: number }>;
  tiers: Array<{ id: string; name: string; mpa: number; tempC: number; prodTph: number }>;
  header: { mpa: number; tempC: number; tph: number };
  drums: Array<{ id: string; name: string; pct: number; mpa: number }>;
  total: { producedTph: number; usedTph: number; lossTph: number; lossPct: number; tone: StatTone };
  water: {
    newWaterM3h: number;
    lossPct: number;
    circTotalM3h: number;
    loops: Array<{ id: string; name: string; circM3h: number; makeupM3h: number; supplyC: number; returnC: number }>;
    users: Array<{ unitId: string; name: string; m3h: number }>;
  };
}

/** EM0004 氧氮氩 */
export interface GasPlantViewDto extends MonitorBaseDto {
  units: Array<{
    id: string;
    name: string;
    o2Nm3h: number;
    capLoadPct: number;
    kwhPerNm3: number;
    kw: number;
    tone: StatTone;
  }>;
  purity: Record<"O2" | "N2" | "AR", { pct: number; specPct: number }>;
  products: Array<{
    media: MediumCode;
    name: string;
    color: string;
    selfNm3h: number;
    useNm3h: number;
    exportNm3h: number;
    kwhPerNm3: number;
    lossPct: number;
  }>;
  headers: Array<{
    id: string;
    media: MediumCode;
    name: string;
    mpa: number;
    loMpa: number;
    hiMpa: number;
    flowNm3h: number;
  }>;
  tanks: Array<{ id: string; media: MediumCode; name: string; capM3: number; pct: number }>;
  exportArNm3h: number;
}

/** what-if 滑杆的一档量程（真源是 `model.whatIfBounds()`，页面照它摆控件） */
export interface SimBoundDto {
  min: number;
  max: number;
  step: number;
}

/** EM0007 煤气平衡仿真：预测曲线 + 建议 + what-if */
export interface GasSimViewDto {
  stamp: string;
  step: number;
  load: Array<{ hour: number; mw: number; tier: string; band: number }>;
  gas: Array<{ hour: number; bfg: number; cog: number; ldg: number }>;
  scenario: GasScenarioDto;
  sim: GasSimDto;
  /** 未处置基线（同一柜位、同样的旋钮全部归零），建议卡的削减量与它比 */
  unmitigated: GasSimDto;
  suggestions: DispatchSuggestion[];
  holders: GasHolder[];
  levelPct: number;
  /** 五支滑杆的量程。页面一个 min/max 都不写：满量程是机组参数派生的物理上限，
   *  抄在页面上就会出现「滑杆拖到头、仿真说超许可」的页间矛盾（见 `model.whatIfBounds()`） */
  bounds: Record<"extraLdgM3min" | "extraBfgM3min" | "ccppMw" | "cfbUnits" | "sinterUsePct", SimBoundDto>;
}

/** EM0005 报警中心看板 */
export interface AlarmBoardDto {
  stamp: string;
  step: number;
  /** 按级别 1..5 分桶（措辞在展示层 `cells.ALARM_LEVEL_NAME`，这里只给级别与数） */
  levels: Array<{ level: AlarmLevel; total: number; unacked: number; rows: EnergyAlarm[] }>;
  rows: EnergyAlarm[];
  stats: { total: number; unacked: number; acked: number; closed: number; today: number; toDispatch: number };
}

/* ── 管理域 ───────────────────────────────────────────────────────────── */

/**
 * 流向。**七向不是笔误**：`转换` 与 `损失` 是能源平衡表（EP0003）的两列，
 * 也是 GB 32045 工序能耗口径的组成——`混合煤气` 由 BFG+COG 掺出记 `转换`、
 * 管网跑冒滴漏记 `损失`。少了这两向，轧钢的消耗列会缺一大块、平衡表的 diff 列恒为 0。
 * 五个「常见向」与两个「平衡表专用向」的口径差别见 `data/model.ts` 的 `plantEnergyBalance()` 文件头。
 */
export type FlowDirection = "购入" | "自产" | "转换" | "消耗" | "回收" | "损失" | "外供";

/** 工序单耗定额（EP0001） */
export interface Quota {
  id: string; // QT-0001
  unitId: string;
  mediaCode: MediumCode;
  direction: FlowDirection;
  product: string; // 烧结矿
  /** 单位产品定额；方向=购入/自产 且该单元无主产品时为绝对量（万/月） */
  intensity: number;
  /** 定额量纲后缀，如 `m³/t铁` */
  intensityUnit: string;
  note: string;
}

/** 能源计划（EP0001）——状态机见 energy.md B2.3 */
export interface EnergyPlan {
  id: string; // PLAN-202610
  month: string;
  status: "编制中" | "已提交" | "已批准" | "执行中" | "已归档";
  createdBy: string;
  approvedBy?: string;
  /** 产量计划（万t），驱动 items 重算 */
  products: Array<{ unitId: string; product: string; outputT: number }>;
  items: Array<{
    unitId: string;
    mediaCode: MediumCode;
    direction: FlowDirection;
    qty: number;
  }>;
  remark?: string;
}

/** 实绩记录（EP0002） */
export interface ActualRecord {
  id: string; // ACT-...
  date: string;
  granularity: "day" | "month";
  /** 计量点实绩与统计节点实绩二选一：pointId 有值即计量点 */
  pointId?: string;
  unitId?: string;
  mediaCode: MediumCode;
  direction: FlowDirection;
  /** 实物量 */
  value: number;
  /** 派生折标 kgce */
  stdCoal: number;
  source: "采集" | "公式" | "补录" | "校正";
  /** 统计节点公式快照，追溯弹窗直接显示它 */
  formulaTrace?: string;
  correctedFrom?: number;
  correctBy?: string;
  correctReason?: string;
  /** 通道中断期间置缺失（`commBreak` 的连带效果） */
  missing?: boolean;
}

/** 能源平衡表（EP0003）——行=工序，列=收入/转换/消耗/外供/损失/平衡差 */
export interface BalanceSheet {
  id: string; // BLN-202609-BFG
  month: string;
  mediaCode: MediumCode;
  rows: Array<{
    unitId: string;
    /**
     * **分配获得量**（入网量按受入占比分到本工序）——不是本工序自产量，理由见
     * `data/model.ts` 的 `buildBalanceSheet()` 文件头。逐行相减要读得出「拿到多少、用了多少」，
     * 供应侧口径只能出现在 `supply` 那一列。
     */
    income: number;
    /** 本工序入网量（自产+购入+回收），信息列，不参与平衡差 */
    supply: number;
    convert: number;
    consume: number;
    /** 外供（出厂到厂界外），支出侧，漏了它综合能耗就少一块 */
    exportOut: number;
    loss: number;
    diff: number;
  }>;
  balanced: boolean;
  /** 分摊规则描述，分摊后写进来，让"差值归零"这件事可解释 */
  balanceRule?: string;
  unit: string;
}

/** 结算单（EP0004）——状态机见 energy.md B2.5 */
export interface SettlementBill {
  id: string; // ST-202609-EU0012
  month: string;
  unitId: string;
  items: Array<{
    mediaCode: MediumCode;
    qty: number;
    price: number;
    priceType: "峰谷" | "阶梯" | "内结" | "均价";
    amount: number;
  }>;
  /** 需量电费 + 力调电费（电力成本中心才有） */
  extraFee: number;
  total: number;
  status: "已生成" | "已核对" | "已定稿";
  createdBy: string;
  confirmedBy?: string;
  finalizedBy?: string;
  createdAt: string;
}

/** 重点用能设备（EP0006） */
export interface KeyEquip {
  id: string; // KE-001
  name: string;
  category: "空压机" | "变压器" | "水泵" | "煤气加压机" | "锅炉" | "鼓风机" | "TRT" | "煤气柜" | "透平机";
  unitId: string;
  model: string;
  ratedPower?: string;
  energyMedia: MediumCode;
  /** 月折标煤 tce，由 model 派生 */
  monthStdCoal: number;
  /** 单位产品电耗/气耗（能效曲线弹窗的 y 轴） */
  intensity: number;
  intensityUnit: string;
  effGrade: "1级" | "2级" | "3级" | "落后";
  runHours: number;
}

/** 数据质量 / 补录工单（EC0003）——状态机见 energy.md B2.4 */
export interface QualityTicket {
  id: string; // QUAL-20260927-01
  pointId: string;
  date: string;
  rule: "量程越界" | "恒值死数" | "突变跳" | "平衡互斥超差";
  rawValue: number;
  /** 建议值（自动补录时取前后均值）——`fillTicket` 的默认入参，页面不自己猜 */
  suggestValue: number;
  suspect: boolean;
  status: "待补录" | "已补录" | "已校核" | "作废";
  fillValue?: number;
  fillBy?: string;
  fillAt?: string;
  checkBy?: string;
  checkAt?: string;
  deviation?: string;
}

/** 考核评分行（EP0005） */
export interface AssessRow {
  unitId: string;
  /**
   * `STD` 是「折标煤综合口径」的记号、**不是介质**：考核算的是工序吨钢（吨产品）综合能耗，
   * 它跨所有介质，没有单一 `MediumCode` 可挂。声明成联合而不是 `"STD" as MediumCode`，
   * 是为了让「拿它去查 `MEDIUMS`」这种写法在类型上就过不去（EP0005 的行没有介质色、也没有介质单位列）。
   */
  mediaCode: MediumCode | "STD";
  product: string;
  actual: number;
  quota: number;
  benchmark: number;
  /** 基准分 − 超标扣分 + 节能加分 */
  score: number;
  rank: number;
  deduction: number;
  bonus: number;
}

/* ── 基础配置（EG0003）────────────────────────────────────────────────── */

export interface AlarmRule {
  id: string; // AR-001
  name: string;
  mediaCode: MediumCode;
  pointId: string;
  /** 高限/低限/变化率 */
  kind: "高限" | "低限" | "变化率" | "通讯";
  threshold: number;
  /** 死区，防止在阈值附近反复报警 */
  deadband: number;
  level: AlarmLevel;
  receivers: string[];
  /** 通知渠道 */
  channels: string[];
  enabled: boolean;
}

/** 分时电价模板（EG0003 右） */
export interface PriceTemplate {
  id: string; // PT-001
  name: string;
  /** 尖峰/峰/平/谷 四段，元/kWh */
  tiers: Array<{ tier: "尖峰" | "峰" | "平" | "谷"; price: number; hours: string }>;
  /** 需量电价 元/kVA·月 */
  demandPrice: number;
  /** 申报需量 kVA */
  demandKVA: number;
  powerFactorAdj: boolean;
  /** 力调标准功率因数 */
  pfTarget: number;
  enabled: boolean;
  effectiveMonth: string;
}

/** 报表模板（ER0004） */
export interface ReportTemplate {
  id: string; // RT-001
  name: string;
  /** 维度 / 指标 / 时间粒度 */
  dims: string[];
  metrics: string[];
  granularity: "时" | "日" | "月";
  owner: string;
  lastPublishAt?: string;
  status: "已发布" | "草稿";
}

/* ── 集成接口（energy.md 第五节 / 演示系统的"底座说明"页复用）─────────── */

export interface Person {
  name: string;
  role: string;
  dept: string;
}

/* ── 采集层的读数与历史（EC0005）───────────────────────────────────────── */

/**
 * 计量点实时读数。**只有「点 + 通道状态」两件事是查表得来的，数值全是现算的**：
 *
 * 实时值不配落库——存了就有两份账，tick 抖一次改一次，月账和它迟早分叉。
 * 所以这个对象是 `dayValueOf()`（该点应有日均）÷ 24h × 当前小时的负荷系数现算出来的，
 * 通道离线的点 `value` 给 `null`（画面画断点），并把断点续传的待补条数一起回，
 * 免得 EC0005 拿最后一次读数冒充"当前值"、而 EC0002 那边写着离线。
 */
export interface PointReading {
  pointId: string;
  name: string;
  mediaCode: MediumCode;
  unitId: string;
  dataKind: MeterPoint["dataKind"];
  /** 展示值，已过 `model.DISP` 换算（页面不再自己乘一万）；断点时为 `null` */
  value: number | null;
  /** 展示单位，与 `value` 同级（万kWh / m³/h / …） */
  unit: string;
  /** 通道状态原样带出来：读数的可信度是它的一部分，不是另开一张表查的事 */
  channelStatus: CollectChannel["status"];
  pendingUpload: number;
  /** `YYYY-MM-DD HH:mm:ss`，演示时钟口径 */
  at: string;
  /** 状态量点的 1/0；非状态量点为 `undefined` */
  on?: boolean;
}

/** 一个计量点的历史序列 + 三个统计量（EC0005 下半区那张小表） */
export interface PointSeries {
  pointId: string;
  name: string;
  mediaCode: MediumCode;
  unit: string;
  /** 与 `days` 等长；缺失日为 `null`（断点续传期间没数，画断线而不是补 0——补 0 会把日均拉低） */
  values: Array<number | null>;
  stats: { avg: number | null; max: number | null; min: number | null; std: number | null };
}

/** `POST /ems/point/history` 的响应：日期轴给一次，各点只给等长数组 */
export interface PointHistoryResult {
  dates: string[];
  series: PointSeries[];
}
