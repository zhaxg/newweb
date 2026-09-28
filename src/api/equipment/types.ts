/**
 * 设备管理（EAM/PHM）演示域的数据契约（附录 B1 的 12 个核心实体逐个翻译）。
 *
 * 与 carbon 域的两点有意差异：
 * 1. **这里是前端与 mock「后端」共享的唯一类型真源**（carbon 的字段是从线上抓包抄的，类型即接口契约）。
 *    设备域没有线上系统，字段由本文件定义，`src/mock/equipment/**` 与页面都 import 它——
 *    方向是 **mock 实现契约**，不是页面依赖 mock（和真实后端接进来时的依赖方向一致）。
 * 2. **id 一律 string**，与平台其他域一致（真实后端接进来时长整型不会被 JS 取整）。
 *
 * 命名即语义：状态/等级类字段全部用**中文字面量联合类型**，不引入数字枚举。
 * 理由：演示系统里这些值要直接进表格单元格、色标 map 的 key 和大屏文案，
 * 数字枚举会让每一层都多一张翻译表，而客户话术（「紧急报警」「超期」）本来就是中文。
 *
 * 引用约束：`src/api/equipment/*` 与 `src/pages/equipment/**` 都用它，
 * 因此本文件**不 import 任何运行时代码**（纯类型），避免页面 chunk 拖进 mock。
 */

/* ── 通用 ─────────────────────────────────────────────────────────────── */

/** 列表端点的 data 形状（平台 mock 统一 `{total, rows}`，分页在服务端） */
export interface PageResult<T> {
  total: number;
  rows: T[];
}

/**
 * 所有动作端点共同的返回壳。
 *
 * 放在 types 而不是 `index.ts`：它是**契约**的一部分（页面要靠 `ok` 区分「业务拒绝」和成功），
 * 而 `index.ts` 是会带进请求运行时的地方——纯类型留在本文件，页面 import 它不会拖进 axios。
 */
export interface ActionResult<T = unknown> {
  ok: boolean;
  /** `ok=false` 时这就是给用户看的拒绝原因（「库存不足，请先请购」这类） */
  msg: string;
  data?: T;
}

/** 设备 ABC 分级（A 关键 / B 重要 / C 一般）——决定巡检与维修策略 */
export type EqLevel = "A" | "B" | "C";

/** 设备运行状态 */
export type EqStatus = "运行" | "备用" | "检修" | "故障停机" | "报废";

/** 报警等级（三级阈值，与 AlarmRule 的 warn/alarm/trip 一一对应） */
export type AlarmLevel = "预警" | "报警" | "紧急";

/** 报警状态机：活动 → 已确认 → 已转工单 → 已关闭 */
export type AlarmStatus = "活动" | "已确认" | "已转工单" | "已关闭";

/** 工单状态机（B2）：待派工 → 已派工 → 执行中 → 待验证 → 已关闭 */
export type WoStatus = "待派工" | "已派工" | "执行中" | "待验证" | "已关闭";

/** 工单来源——主线演示的关键：报警转单/PdM诊断/PM计划 都是系统自动生成的 */
export type WoSource = "报警转单" | "故障报修" | "PM计划" | "PdM诊断" | "人工";

export type WoPriority = "紧急" | "高" | "中" | "低";

/* ── 1. 产线 / 2. 设备 ────────────────────────────────────────────────── */

/** 钢铁厂区口径的产线名（客户一看就懂），area 即「谁家的哪条线」 */
export interface Line {
  id: string; // LN-<区>nn
  name: string;
  area: "烧结" | "炼铁" | "炼钢" | "棒线轧制" | "板材轧制" | "管材轧制";
  /** 统计值，由设备表派生；种子给死是为了大屏少一次聚合 */
  deviceCount: number;
}

export interface Equipment {
  id: string; // EQ-<产线>-<工序>-nn
  name: string;
  model: string;
  lineId: string;
  /** 安装位置（「1780线精轧区 F4 机架东侧」这类） */
  position: string;
  level: EqLevel;
  /** 结构树自关联（轧机→主传动电机→轴承），顶层设备为 undefined */
  parentId?: string;
  status: EqStatus;
  /** 0-100 健康度，AM 模块算出后写回；大屏和热力图都读它 */
  health: number;
  vendor: string;
  /** 投运日期 YYYY-MM-DD */
  commissionedAt: string;
  /** 扫码内容 = 设备编码，H5 档案页按它查设备 */
  qrCode: string;
  /** 累计运行小时（寿命件 usedHours 的来源） */
  runHours: number;
}

/** 生命周期事件（AE0003 时间轴）；维修/大修事件由工单关闭时自动追加 */
export interface LifecycleEvent {
  id: string;
  eqId: string;
  type: "采购" | "安装" | "调试" | "投运" | "维修" | "大修" | "改造" | "报废";
  at: string;
  /** 关联单据号（工单号/合同号），可点回源 */
  refDocNo?: string;
  note: string;
}

/** 技术文档（AE0004）——静态条目即可，演示不真下载 */
export interface TechDoc {
  id: string;
  name: string;
  type: "图纸" | "说明书" | "操作SOP" | "故障案例";
  eqId: string;
  author: string;
  at: string;
  size: string;
}

/* ── 3~6. 测点 / 报警规则 / 报警 ───────────────────────────────────────── */

/**
 * 指标类别。**它不是录入项**：新增点位填的是「指标编码 + 指标名称」，类别由
 * `mock/equipment/data/monitor.ts` 从名称/编码的关键词推出来（种子则按登记值直接给）。
 * 留着它是因为三处逻辑要按物理量分档：报表分组、三级阈值的默认倍率、PHM 雷达的五个维度。
 * 推不出来就是空串——归到「其他」，阈值退化成基线的固定倍率，而不是硬塞一个假类别。
 */
export type PointMetric = "振动" | "温度" | "位移" | "转速" | "电流" | "压力" | "油液";

/**
 * 数据来源。现场全部由时序库供数（采集服务已经把原始值写进 InfluxDB），
 * 所以采集协议**不再是配置项**、通讯地址也没有意义：这里只登记「按哪个 tagId 去库里取值」。
 * 保留这一个值而不是删掉字段，是为了让列表/详情还能说清数据是从哪一路来的。
 */
export type PointProtocol = "InfluxDB";

/**
 * 原始数据类型——采集服务按它解码，配错了就是「温度 300 万」这种数量级灾难。
 * 现场只有三类：浮点、整型、布尔（干接点/到位信号）。
 */
export type PointDataType = "Float" | "Int" | "Bool";

/**
 * 通讯状态：采集服务每拍写回，配置页**只读**（在线/离线/超时）。
 * 它是「这条采集链路活着吗」，与设备本身运行还是停机无关——备用设备的点照样是在线。
 */
export type PointCommState = "在线" | "离线" | "超时";

/**
 * 采集点位（AM0001）——一台设备下面配多少个点由现场定，没有固定档位。
 *
 * **这张表是取值服务直接读的，完全基于位号 TagID。** 现场的数据已经全部落在时序库里，
 * 所以配置一行只需要回答三件事：**取哪个二级位号下的哪个指标编码、这个指标叫什么、按什么频率与量纲取**。
 *
 * ```
 * 指标编码       DE_TEMP         指标在这个位号下的编码（库里 point 维度的取值）
 * 指标名称       驱动端轴承温度   给人看的名字，报表/曲线/报警文案都读它
 * 二级采集位号   EQ-BR-F4-02.MOTOR  设备.部件/测量部位，一个位号下可以挂多个指标编码
 * ```
 *
 * 三级 tagId = `二级采集位号 + "." + 指标编码`，全库唯一，于是「二级 down 到三级」就是
 * `GROUP BY part` 与 `GROUP BY point` 的差别——部件级健康度、点位级曲线才都能算。
 * 位号 `id`（`PT-<设备短码>-<nn>`）是这套标签之上的**业务主键**：报警、阈值规则、历史曲线全挂它，
 * 因为 tagId 会随部件归属改动，位号不改就不会打断已有的报警链。
 *
 * 采集协议/通讯地址已退场（全部从 InfluxDB 取值），剩下的六栏是取值与解码约定：
 *
 * ```
 * 采集频率       1000(ms)       轮询或订阅频率，也是保留策略的取值依据
 * 原始数据类型   Float          按它解码，配错就是数量级灾难
 * 原始单位       mm/s           现场仪表传上来的原始单位（不换算）
 * 当前原始值     3.2            实时值，落在时序库/Redis
 * 通讯状态       在线           在线 / 离线 / 超时
 * ```
 */
export interface SensorPoint {
  /** 位号 TagID `PT-<设备短码>-<nn>`：报警/规则/历史曲线都挂它（tagId 会变，位号不改） */
  id: string;
  /** 一级 tagId = 设备编码 */
  eqId: string;
  /** 二级短码（部件/部位），如 `MOTOR`——由 `tag2Id` 的点号后段得出 */
  partCode: string;
  /** 二级中文名，如「主传动电机」——列表和下拉读它 */
  partName: string;
  /** 二级采集位号 `<eqId>.<partCode>`：配置页填的就是它 */
  tag2Id: string;
  /** 指标编码（库里 point 维度的取值），如 `DE_TEMP` */
  metricCode: string;
  /** 指标名称，如「驱动端轴承温度」 */
  name: string;
  /** 三级 tagId 全路径 `<tag2Id>.<metricCode>`，InfluxDB 里唯一点位 */
  tag3Id: string;
  /** 指标类别：派生值，不是录入项（见 `PointMetric`）；推不出来是空串 */
  metric: string;
  protocol: PointProtocol;
  /** 原始数据类型：采集服务按它解码 */
  dataType: PointDataType;
  /** 原始单位（现场仪表传上来的量纲，不做换算） */
  unit: string;
  /** 当前原始值（realtime 页的定时器写这里） */
  value: number;
  /** 通讯状态：采集服务每拍写回，配置页只读 */
  commState: PointCommState;
  /** 采集周期（毫秒）：决定原始序列的分辨率与存储量级，也是保留策略的取值依据 */
  sampleMs: number;
  /** InfluxDB measurement（按物理量分表） */
  measurement: string;
  /** InfluxDB field 名（振动走 `rms`，其余走 `value`） */
  fieldKey: string;
  /** 保留策略：高频点短保留、低频点长保留，否则 200 个点按秒采会把盘写满 */
  retention: string;
  /** 采集网关 / 边缘节点编号（一台网关带一条产线的若干个从站，写数进库的那一跳） */
  gwId: string;
}

export interface AlarmRule {
  id: string;
  pointId: string;
  warn: number;
  alarm: number;
  trip: number;
  channels: Array<"站内" | "App" | "短信">;
  enabled: boolean;
}

/** 报警来源：在线监测（测点越阈）、到期扫描（特种/计量/寿命红线）、人工点检（点检录入） */
export type AlarmSource = "在线监测" | "到期扫描" | "人工点检";

export interface Alarm {
  id: string; // ALM-yyyyMMdd-nn
  /** 触发测点；到期扫描类报警没有测点，留空串（eqId 仍在，可定位设备） */
  pointId: string;
  /** 不填即按在线监测处理（历史种子都来自测点） */
  source?: AlarmSource;
  eqId: string;
  level: AlarmLevel;
  value: number;
  msg: string;
  occurredAt: string;
  status: AlarmStatus;
  /** 转单后回填，报警↔工单双向可追 */
  woId?: string;
  ackBy?: string;
}

/* ── 7. 工单（系统枢纽实体） ───────────────────────────────────────────── */

/** 领料明细：寿命件必须带序列号，这是「备件绑定寿命」能算账的前提 */
export interface WoMaterial {
  spId: string;
  qty: number;
  lifeSerial?: string;
}

/** 状态流转留痕，驱动工单详情页的时间轴 */
export interface WoStep {
  status: WoStatus | "挂起" | "退料" | "验证不通过";
  at: string;
  by: string;
  note: string;
}

export interface WorkOrder {
  id: string; // WO-yyyyMMdd-nn
  title: string;
  eqId: string;
  source: WoSource;
  faultDesc: string;
  priority: WoPriority;
  status: WoStatus;
  assignee: string;
  planHours: number;
  actualHours: number;
  materials: WoMaterial[];
  photos: string[];
  steps: WoStep[];
  createdAt: string;
  closedAt?: string;
}

/** 预防性维护计划（AW0001）；「▶ 手动触发」按它的规则生成工单 */
export interface PmPlan {
  id: string;
  name: string;
  eqId: string;
  /** 周期型按日、计数型按运行小时 */
  cycleType: "日" | "周" | "月" | "季度" | "计数器";
  cycleValue: number;
  /** 计数器型的基准运行小时 */
  baseRunHours: number;
  /** 距下次触发的余量（tickRunHours 递减） */
  nextIn: number;
  owner: string;
  enabled: boolean;
  lastAt: string;
}

/* ── 8~10. 备件 / 库存流水 / 寿命记录 ─────────────────────────────────── */

export interface SparePart {
  id: string; // SP-nnnn
  name: string;
  spec: string;
  unit: string;
  category: EqLevel;
  /** 库位（「备件库 A 区 3 排 5 层」） */
  loc: string;
  qty: number;
  safetyQty: number;
  /** 单价（元），离职折算与考核金额都基于它 */
  price: number;
  /** 是否纳入寿命考核——**配置项**，客户口中的「B类」在系统里就是这个开关 */
  lifeManaged: boolean;
  lifeLimitHours?: number;
}

/** 库存状态（B2）：在库 ⇄ 在手 → 损坏 → 维修 → 在库，任一状态 → 报废 */
export type StockState = "在库" | "在手" | "损坏" | "维修" | "报废";

export interface StockTxn {
  id: string;
  spId: string;
  type: "入库" | "出库" | "领用" | "借出" | "归还" | "调拨" | "盘点" | "报废";
  qty: number;
  woId?: string;
  person: string;
  at: string;
  /** 动账后余额：流水页可自证账实相符 */
  balance: number;
  /** 手工入库/调拨这类无工单动账的备注（领料类流水由工单号自证，不填） */
  note?: string;
}

/** 寿命记录——客户核心要求的数据核心，一条 = 一个实物 */
export interface LifeRecord {
  id: string;
  spId: string;
  serial: string; // LR-nnnnnn
  /** 责任人（考核到人是客户机制的精髓） */
  holder: string;
  mountedEqId?: string;
  mountedAt: string;
  /** 由工单工时 / MES mock 累计 */
  usedHours: number;
  lifeLimitHours: number;
  status: "正常" | "临期" | "超期" | "已更换" | "已折算";
  /** 更换日期：月度结算按它把「未达线处罚」归到对应月份（只给已更换的记录） */
  replacedAt?: string;
}

/** 结算时算出的金额（不落库，由 store 的 computed 给） */
export interface LifeSettlement {
  serial: string;
  spId: string;
  spName: string;
  holder: string;
  lifeLimitHours: number;
  usedHours: number;
  /** >0 超期小时数，<0 未达线小时数 */
  overHours: number;
  /** 奖为正、罚为负（元） */
  amount: number;
  result: "超期奖励" | "未达线处罚" | "达标";
}

/** 月度考核结算单（AS0004 的单据主体，可打印） */
export interface Assessment {
  id: string;
  month: string; // YYYY-MM
  createdAt: string;
  rows: LifeSettlement[];
  rewardTotal: number;
  punishTotal: number;
}

/** 离职交接折算单（AS0005） */
export interface HandoverRecord {
  id: string;
  person: string;
  at: string;
  rows: Array<{
    serial: string;
    spName: string;
    spec: string;
    lifeLimitHours: number;
    usedHours: number;
    /** 剩余寿命占比 0-1 */
    restRatio: number;
    /** 备件单价（元）：单据要能逐行手算核对，所以单价随行落库而不是只留个结果 */
    price: number;
    /** 折算金额 = 单价 × 剩余比例 */
    amount: number;
  }>;
  total: number;
}

/** 请购单（AS0006）——库存低于 safetyQty 自动生成 */
export interface PurchaseRequest {
  id: string; // PR-nnn
  spId: string;
  qty: number;
  /** 触发来源，演示时要点给客户看（「工单 WO-xxx 领料后低于安全库存」） */
  reason: string;
  status: "待审核" | "已请购" | "已到货";
  createdAt: string;
}

/* ── 11~12. 特种设备 / 计量器具（法务红线） ───────────────────────────── */

export interface SpecialEquipment {
  id: string; // SE-nnn
  name: string;
  type: "起重机械" | "压力容器" | "锅炉" | "电梯" | "场内专用车辆";
  /** 使用登记证号 */
  regNo: string;
  eqId?: string;
  nextInspectAt: string;
  inspectCycleMonths: number;
  status: "在用" | "停用" | "待检";
  /** 距下次检验天数（负数=已超期）。列表接口按演示日现算，见 `mock/equipment/store.ts` 的 `deadlineOf` */
  daysLeft?: number;
  /** 到期分档（阈值同报警扫描的 `warnDays`）：页面只按它上色，不自己拿日历算 */
  deadlineState?: "正常" | "临期" | "超期";
}

export interface MeteringDevice {
  id: string; // MI-nnn
  name: string;
  accuracy: string;
  /** 强制检定 */
  mandatoryVerify: boolean;
  nextVerifyAt: string;
  verifyCycleMonths: number;
  certNo?: string;
  status: "合格" | "临检" | "超期";
  /** 同 `SpecialEquipment.daysLeft` / `deadlineState` */
  daysLeft?: number;
  deadlineState?: "正常" | "临期" | "超期";
}

/* ── 轻量实体（字段从表格列反推） ─────────────────────────────────────── */

export interface InspectionTask {
  id: string;
  name: string;
  eqId: string;
  route: string;
  person: string;
  planDate: string;
  doneAt?: string;
  result: "正常" | "异常" | "待检";
  note: string;
}

/** 作业票：申请→班组审批→安全部门审批→厂级审批→已签发→作业中→已关闭 */
export type PermitStatus = "申请" | "班组审批" | "安全部门审批" | "厂级审批" | "已签发" | "作业中" | "已关闭";

export interface WorkPermit {
  id: string; // WP-nnn
  type: "动火作业" | "高处作业" | "受限空间" | "临时用电" | "吊装作业";
  /** A 级作业才需要厂级审批（状态机分支） */
  grade: "A" | "B";
  eqId: string;
  area: string;
  applicant: string;
  workContent: string;
  status: PermitStatus;
  /** 已走过的审批节点，驱动 p-stepper */
  approvedBy: Array<{ node: string; by: string; at: string }>;
  planStart: string;
  planEnd: string;
}

export interface Hazard {
  id: string;
  title: string;
  eqId: string;
  level: "一般" | "较大" | "重大";
  source: string;
  reportedAt: string;
  /** 上报→整改→验收闭环 */
  status: "待整改" | "整改中" | "待验收" | "已闭环";
  owner: string;
  measure: string;
  /**
   * 闭环留痕：整改填报人 / 验收人 / 验收时间。
   * 只在动作发生后才出现（故可选），种子数据没有——列表页用「—」表示还没走到这一步，
   * 客户要的「闭环可追溯」是这三列，不是状态字段本身。
   */
  rectifiedBy?: string;
  acceptedBy?: string;
  closedAt?: string;
}

/** 集成接口注册（AG0001）——体现开放性，mock 几条成功记录即可 */
export interface IntegrationApi {
  id: string;
  name: string;
  target: "MES" | "ERP" | "HR" | "LIMS" | "能源管控";
  protocol: "REST" | "Webservice" | "MQ";
  /** 最近一次同步状态 */
  lastStatus: "成功" | "失败" | "未启用";
  lastAt: string;
  frequency: string;
}

/* ── 聚合端点的返回形状（无分页，一次拿全） ───────────────────────────── */

/** 单设备档案聚合：结构树详情、生命周期档案、扫码查询三处共用同一个形状 */
export interface EquipmentDetail {
  eq: Equipment;
  line?: Line;
  parent?: Equipment;
  children: Array<Pick<Equipment, "id" | "name" | "model" | "health" | "status">>;
  events: LifecycleEvent[];
  points: SensorPoint[];
  alarms: Alarm[];
  workOrders: WorkOrder[];
  lifeRecords: LifeRecord[];
  docs: TechDoc[];
  inspections: InspectionTask[];
}

/** 领导驾驶舱（AO0001） */
export interface DashboardOverview {
  plant: string;
  deviceTotal: number;
  running: number;
  faultStop: number;
  avgHealth: number;
  activeAlarm: number;
  urgentAlarm: number;
  openWorkOrder: number;
  /** 备件库存金额（万元）与周转率 */
  spareValue: number;
  spareTurnover: number;
  oee: number;
  faultRate: number;
  /** 待办：到期扫描结果分类计数 */
  todo: { 寿命超期: number; 寿命临期: number; 特种待检: number; 计量临检: number; 活动报警: number };
  alarms: Array<Pick<Alarm, "id" | "level" | "msg" | "eqId" | "occurredAt" | "status">>;
  /** 设备健康度近 7 日趋势（多条线） */
  healthTrend: { days: string[]; series: Array<{ name: string; data: number[] }> };
  /** 备件寿命排行榜（Top 10 用满度高） */
  lifeRank: Array<{ serial: string; spName: string; holder: string; ratio: number; status: LifeRecord["status"] }>;
  /** 产线维度健康度（热力图/条形） */
  lines: Array<{ name: string; health: number; deviceCount: number; alarms: number }>;
}

/** 健康看板（AO0002）：产线 → 设备色块 */
export interface HealthBoard {
  lines: Array<{
    id: string;
    name: string;
    area: Line["area"];
    avgHealth: number;
    devices: Array<Pick<Equipment, "id" | "name" | "model" | "health" | "status" | "level">>;
  }>;
  buckets: Array<{ label: string; color: string; count: number }>;
}

/** KPI 指标（AR0001） */
export interface KpiSet {
  cards: Array<{ label: string; value: string; unit: string; delta: number; hint: string }>;
  months: string[];
  /** 故障率 %、OEE %、备件周转率次/年、人均绩效分 */
  faultRate: number[];
  oee: number[];
  turnover: number[];
  performance: number[];
  /** 工单来源构成（饼图） */
  sourceMix: Array<{ name: string; value: number }>;
  /** 维修人员绩效排行 */
  personRank: Array<{ name: string; orders: number; hours: number; score: number }>;
}

/** 实时监控（AM0002）：一张设备卡 + 各测点曲线 */
export interface RealtimeView {
  eqId: string;
  eqName: string;
  health: number;
  status: EqStatus;
  times: string[];
  series: Array<{ pointId: string; name: string; unit: string; data: number[]; warn: number; alarm: number }>;
  activeAlarms: Array<{ id: string; level: AlarmLevel; msg: string; occurredAt: string }>;
}

/** PHM 诊断（AM0004） */
export interface PhmView {
  eqId: string;
  eqName: string;
  health: number;
  /** 雷达五维 */
  radar: Array<{ name: string; value: number; ref: number }>;
  /** 剩余寿命预测 */
  rulDays: number;
  rulConfidence: number;
  degrade: { days: string[]; health: number[]; forecast: number[] };
  findings: Array<{ part: string; symptom: string; level: AlarmLevel; advice: string }>;
}
