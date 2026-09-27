/**
 * 能源管理（EMS）演示域 —— **唯一数值推导源**。
 *
 * ## 本域的结构纪律（最重要的一条）
 *
 * **全 energy 域只有这个文件允许出现业务数字字面量。** 页面、store、seed、种子 grid 一律只读这里的派生函数。
 * 销售在 EG0001 看到的折标系数、EP0002 的实绩、EP0003 平衡表消耗列、EO0001 大屏的吨钢综合能耗，
 * 全是同一次乘法的结果——它们**不可能**对不上，因为页间矛盾需要有人手写第二个数字才能出现，而这条路被禁了。
 * 规格书（`temp/energy.md`）的原话是「系数允许口径争议，但不允许页间矛盾」；
 * 这里把这句话从「靠自觉」降级成「结构上写不出来」。
 *
 * ## 与规格书 B3 的九处偏离（都是「照抄就露馅」的地方）
 *
 * 规格书的表是给人读的功能清单，量级对、加和不封闭。要**当场算给客户看**就必须改：
 *
 * 1. **补三行固体燃料介质** `COAL`（洗精煤）/`COKE`（焦炭）/`PULV`（喷吹煤粉）。
 *    缺了燃料，炼铁工序能耗只有 60 kgce/t（真实 ~380）、吨钢综合能耗 250（真实 ~570），第 4 幕必断。
 * 2. **焦炭由焦比推**，不取 B3 的 44 万 t/月：44 万 t 焦配 42 万 t 铁 → 焦比 1.05 t/t（真实 0.30–0.37）。
 *    这里 `焦炭 = 铁水 × 0.35 = 14.7 万 t`。
 * 3. **粗钢由铁钢比推**，不取 B3 的 30 万 t/月。B3 自己就矛盾：铁水 42 万 t/月是 500 万吨级，
 *    文档头却写「年产钢约 300 万吨」。**押在设备上**（煤气平衡是演示主线，柜位流量必须与机组规模匹配）：
 *    `粗钢 = 铁水 ÷ 0.85 = 49.4 万 t`、`钢材 = 粗钢 × 0.94 = 46.4 万 t`。
 * 4. **机组出力由燃料量派生**，不写死 kWh，也不用 B3 的「CCPP BFG 耗 ~11 万 m³/h」——
 *    按 BFG 低位热值 3.35 MJ/m³、150MW、净效率 42% 反推是 **2.56 m³/kWh**，B3 那个数对应约 43MW。
 *    写死 kWh 就切断了「少放散 → 多发电」这条因果；幕 8 的增效金额要靠它才算得出来。
 * 5. **O₂ 折标 0.16 → 0.08**：B3 自己给制氧电耗 0.65 kWh/Nm³，×0.1229 = 0.0799，差一倍。
 *    N₂ 同理 0.045。**电力系介质的折碳一律 = 电耗 × 电网因子**，介质表内部才自洽。
 * 6. **两套能耗口径分开算**（不是笔误，是行业惯例）：
 *    - 吨钢**综合**能耗 = 净购入折标法（厂界外购煤/电/气折标 − 外供），节能监察与碳核查口径；
 *    - **工序**能耗 = 消耗−回收加和法（GB 32045 口径）。
 *    用同一把尺子量两件事，必然一边对、另一边错。两条公式都在本文件，各自注释标口径。
 * 7. **蒸汽与水的自产量由消耗反推**。B3 给的空分 2×32000 Nm³/h、新水规模等是容量口径，
 *    不是月度平衡量；直接抄会让平衡表出现 60% 的「管损」这种一看就假的数量。
 *    本文件里 `O2/N2/AR/AIR/WATER` 的自产 = 消耗 + 外供 + 目标管损，**由定额反推**。
 * 8. **成本也是两套口径**：`mediumCost()` 是**内结价**（每个厂每笔消耗都乘一遍内结价），
 *    给 EP0004 出厂级结算单，合计是「全厂能源产值」量级；`purchaseCost()` 是**外购−外供**，
 *    给客户口中的「吨钢能源成本」用。合成一个函数必然有一边是错的数。
 * 9. **CFB 按「燃煤锅炉掺烧高炉煤气」建模**。B3 给的三个数两两冲突：4.5万m³/h BFG 只有
 *    约 42MW 热输入（折 12MW 电），撑不起 25MW 汽机；130t/h 产汽又对应 13万m³/h。
 *    按掺烧解释才互洽：煤气只贡献约一半电量（`per=3.57`），其余是煤粉——所以
 *    **CFB 的调度指标是煤气消纳率、不是 kwh/铭牌出力**（见 `selfGeneration()`），
 *    而煤粉那部分电量**不进自发电率**（它烧的是外购煤，记成余能回收就是把成本算成收益）。
 *
 * ## 两层时钟（严格分离）
 *
 * - **月账层**：本文件全部函数。**tick 永不动它们**，客户追问「上月电费多少」永远同一答案。
 * - **实时层**：柜位 %、瞬时进出流量、负荷当前点、当班放散率。它们围绕本文件的
 *   `holderBases()` / `loadBaseline()` 抖动——**抖动中心来自月账**，所以两时钟在边界上仍自洽。
 *   柜位是**积分对象**，不能照设备域那样 `jitter(center, half)`（随机游走会漂出去），
 *   用均值回归 + 硬钳位：`p' = clamp(p + κ(base − p) + η·u, lo, hi)`，κ=0.15、η=1.5%。
 *
 * ⚠️ **月均放散 vs 当班放散是两件事，别混**。放散本质是**瞬时**现象（转炉集中吹炼、高炉休风时
 * 用气端掉下去），月均放散率是这些事件的累积。所以：
 * - 月账：放散量是**输出**——`residualGasGen()` 先把富余煤气按 CFB→CCPP 的顺序喂到铭牌，吃不下的一记放散。
 *   「少放散 → 多发电」这条因果因此是结构性的：幕 8 要演示的正是「机组已顶满，只能动需求侧」；
 * - 实时：`simulateGasBalance()` 用「瞬时富余 vs 可消纳能力」算当班放散，EM0007 的 what-if 滑杆走它，
 *   **纯函数、不改月账**（滑杆拖一下就把结算污染了，这页就废了）。
 *
 * ## 命名
 *
 * 流量一律**实物量**（电 kWh、气 m³、固/液 t 或 m³）；展示缩放只在 `DISP` 定义一次。
 */

import type {
  ActualRecord,
  AssessRow,
  BalanceSheet,
  EnergyMedium,
  FlowDirection,
  GasHolder,
  MediumCode,
  Quota,
  SettlementBill,
  UsingUnit,
} from "@/api/energy/types";

/* ══════════════════════════════════════════════════════════════════════════
   0. 演示时钟与厂别常量
   ══════════════════════════════════════════════════════════════════════════ */

export const PLANT_NAME = "钢城钢铁";
/** 演示基准时刻：心跳、报警、单据时间都从这里推，同一场次数据可复现 */
export const DEMO_T0 = Date.parse("2026-09-27T09:00:00");
export const DEMO_MONTH = "2026-09";
/** 月账小时数（30d 口径）：月量 ↔ 小时量 的唯一分母 */
export const MONTH_HOURS = 720;
const MONTH_DAYS = 30;
/**
 * 月账**已过天数**：演示时钟 09-27 上午，完整数据只到 09-26，所以是 26 天。
 * 它只有一个用途——日实绩 = 月量 ÷ 它（`buildActualRecords`）。
 * 先前用 30 并把日实绩标在 09-30：客户一眼看到「今天 27 号怎么有 30 号的实绩」，
 * 这种低级不一致比口径争议致命得多。
 */
export const MONTH_ELAPSED_DAYS = 26;
/** 昨日（EP0002「▶重算昨日实绩」与 EC0003「生成当日异常」的日期锚点） */
export const DEMO_YESTERDAY = "2026-09-26";
/** 今日（演示时钟当天，日期选择器的默认上界） */
export const DEMO_TODAY = "2026-09-27";

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 演示时戳：基准 + stepMs，让列表里的时间有先后而不是同一秒 */
export function stampOf(stepMs = 0) {
  const d = new Date(DEMO_T0 + stepMs);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

/**
 * 千分位（**不带单位**）。给 `msg` / `formulaTrace` 这类**字符串里**的数用——
 * 那两处套不上 `DISP` 的介质单位，但也不能直接把浮点原始值拼进文案
 * （`放散 18723.400000000001 m³/h` 是演示系统最容易露馅的地方）。
 * 列展示一律走 `pages/energy/cells.ts` 的 `numFmt/qtyFmt`，单位口径仍只在 `DISP` 一处。
 */
export function fmtNum(v: number) {
  return Number.isFinite(v) ? Math.round(v).toLocaleString("en-US") : "—";
}
/** 金额（元）千分位 + 两位小数，结算/电费文案用 */
export function fmtMoney(v: number) {
  return Number.isFinite(v) ? v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
}

/** 煤气三路：本域的瞬时主线（柜位、放散、调度建议）只发生在这三路上 */
export type GasMedia = "BFG" | "COG" | "LDG";

/* ══════════════════════════════════════════════════════════════════════════
   1. 输入层 ① 介质系数表
   ══════════════════════════════════════════════════════════════════════════ */

/** 电网折碳因子 kgCO₂e/kWh */
const GRID_CARBON = 0.5703;
/** 制氧/制氮/制氩/制气/制水的电耗 kWh/Nm³（折标与折碳都从这里推，见文件头第 5 条） */
export const ELECTRICITY_PER_MEDIUM = { O2: 0.65, N2: 0.366, AR: 5.45, AIR: 0.1025, WATER: 0.7 };
/** 空分凝结器与循环水补水量 m³/Nm³氧（气体厂的水耗全部由制氧量派生，不单独给定额行） */
export const SEPARATION_WATER_PER_O2 = 0.05;

/**
 * 介质表。固体燃料的折标/折碳以 **t 为单位**，故系数写成 kgce/t（0.9714 tce/t → 971.4）。
 * `carbonFactor` **只给 EG0001 展示**，没有任何派生函数读它——能碳一体化归碳系统管。
 */
const MEDIUM_ROWS: Array<Omit<EnergyMedium, "id">> = [
  {
    name: "电力",
    code: "ELEC",
    unit: "kWh",
    stdCoal: 0.1229,
    carbonFactor: GRID_CARBON,
    balanceParticipate: true,
    color: "#FBBF24",
    remark: "当量值口径；外购电走分时电价，见 ELEC_PRICE",
  },
  {
    name: "高炉煤气",
    code: "BFG",
    unit: "m³",
    stdCoal: 0.114,
    calorific: 3.35,
    carbonFactor: 0.158,
    innerPrice: 0.062,
    balanceParticipate: true,
    color: "#60A5FA",
    remark: "全厂量最大、单价最低的副产煤气，平衡表的主战场",
  },
  {
    name: "焦炉煤气",
    code: "COG",
    unit: "m³",
    stdCoal: 0.571,
    calorific: 16.74,
    carbonFactor: 0.454,
    innerPrice: 0.38,
    balanceParticipate: true,
    color: "#F472B6",
    remark: "热值最高，优先供焦炉自加热与高要求加热炉",
  },
  {
    name: "转炉煤气",
    code: "LDG",
    unit: "m³",
    stdCoal: 0.286,
    calorific: 8.37,
    carbonFactor: 0.228,
    innerPrice: 0.19,
    balanceParticipate: true,
    color: "#A78BFA",
    remark: "间歇发生（吹炼期 20min 急涨），回收率是考核项",
  },
  {
    name: "混合煤气",
    code: "MIG",
    unit: "m³",
    stdCoal: 0.3,
    calorific: 8.8,
    carbonFactor: 0.24,
    innerPrice: 0.21,
    balanceParticipate: true,
    color: "#FB923C",
    remark: `BFG+COG 掺混的中间介质，平衡表里以「转换」列出现，配比见 MIG_BLEND`,
  },
  {
    name: "蒸汽(中压)",
    code: "STEAM",
    unit: "t",
    stdCoal: 90.4,
    calorific: 2640,
    carbonFactor: 290,
    innerPrice: 120,
    balanceParticipate: true,
    color: "#2DD4BF",
    remark: "汽化冷却/干熄焦/余热/锅炉产汽，管损是不平衡的主要来源",
  },
  {
    name: "氧气",
    code: "O2",
    unit: "m³",
    stdCoal: 0.65 * 0.1229,
    calorific: undefined,
    carbonFactor: 0.65 * GRID_CARBON,
    innerPrice: 0.42,
    balanceParticipate: true,
    color: "#38BDF8",
    remark: "折标由制氧电耗 0.65 kWh/Nm³ 推得（偏离 B3 的 0.16，见文件头第 5 条）",
  },
  {
    name: "氮气",
    code: "N2",
    unit: "m³",
    stdCoal: 0.366 * 0.1229,
    carbonFactor: 0.366 * GRID_CARBON,
    innerPrice: 0.28,
    balanceParticipate: true,
    color: "#7DD3FC",
    remark: "折标由制氮电耗 0.366 kWh/Nm³ 推得",
  },
  {
    name: "氩气",
    code: "AR",
    unit: "m³",
    stdCoal: 5.45 * 0.1229,
    carbonFactor: 5.45 * GRID_CARBON,
    innerPrice: 1.9,
    balanceParticipate: true,
    color: "#818CF8",
    remark: "空分氩塔抽出量小、单耗高",
  },
  {
    name: "压缩空气",
    code: "AIR",
    unit: "m³",
    stdCoal: 0.1025 * 0.1229,
    carbonFactor: 0.1025 * GRID_CARBON,
    innerPrice: 0.05,
    balanceParticipate: false,
    color: "#94A3B8",
    remark: "量小、不进月度平衡表（节能监察口径），但考核看气电比",
  },
  {
    name: "新水",
    code: "WATER",
    unit: "m³",
    stdCoal: 0.0857,
    carbonFactor: 0.7 * GRID_CARBON,
    innerPrice: 2.6,
    balanceParticipate: true,
    color: "#22D3EE",
    remark: "B3 的 0.0857（含取制水与循环水补水摊算口径），实施时按企业制度替换",
  },
  {
    name: "天然气",
    code: "NG",
    unit: "m³",
    stdCoal: 1.214,
    calorific: 38.9,
    carbonFactor: 2.02,
    innerPrice: 3.2,
    balanceParticipate: true,
    color: "#F87171",
    remark: "检修期点火保压与冬季调峰，唯一外购气体燃料",
  },
  {
    name: "洗精煤",
    code: "COAL",
    unit: "t",
    stdCoal: 900,
    calorific: 28450,
    carbonFactor: 2600,
    innerPrice: 1290,
    balanceParticipate: true,
    color: "#A1A1AA",
    remark: "炼焦入炉煤——厂界唯一外购固体燃料，吨钢综合能耗的主体从这里来",
  },
  {
    name: "焦炭",
    code: "COKE",
    unit: "t",
    stdCoal: 971.4,
    calorific: 28400,
    carbonFactor: 2860,
    innerPrice: 1900,
    balanceParticipate: true,
    color: "#F59E0B",
    remark: "焦化产品、高炉主料燃料；折碳 2.86 t/t 为国内清单常用值",
  },
  {
    name: "喷吹煤粉",
    code: "PULV",
    unit: "t",
    stdCoal: 714,
    calorific: 26000,
    carbonFactor: 2200,
    innerPrice: 1180,
    balanceParticipate: true,
    color: "#78716C",
    remark: "高炉喷煤，等量置换焦炭——「降焦比=降能耗」这条叙事的主角",
  },
];

/** 介质 code → 完整记录（含 id）。全站唯一介质属性来源。 */
export const MEDIUMS: Record<MediumCode, EnergyMedium> = Object.fromEntries(
  MEDIUM_ROWS.map((m, i) => [m.code, { ...m, id: `MT-${String(i + 1).padStart(2, "0")}` }]),
) as Record<MediumCode, EnergyMedium>;

export const MEDIUM_LIST: EnergyMedium[] = MEDIUM_ROWS.map((m, i) => ({
  ...m,
  id: `MT-${String(i + 1).padStart(2, "0")}`,
}));

/** 展示缩放：内部一律实物量，只有这里定义「万kWh / 万m³ / t」。 */
export const DISP: Record<MediumCode, { unit: string; scale: number; digits: number }> = {
  ELEC: { unit: "万kWh", scale: 1e4, digits: 1 },
  BFG: { unit: "万m³", scale: 1e4, digits: 0 },
  COG: { unit: "万m³", scale: 1e4, digits: 0 },
  LDG: { unit: "万m³", scale: 1e4, digits: 0 },
  MIG: { unit: "万m³", scale: 1e4, digits: 0 },
  AIR: { unit: "万m³", scale: 1e4, digits: 0 },
  O2: { unit: "万m³", scale: 1e4, digits: 0 },
  N2: { unit: "万m³", scale: 1e4, digits: 0 },
  AR: { unit: "万m³", scale: 1e4, digits: 1 },
  STEAM: { unit: "t", scale: 1, digits: 0 },
  WATER: { unit: "万m³", scale: 1e4, digits: 1 },
  NG: { unit: "万m³", scale: 1e4, digits: 1 },
  COAL: { unit: "t", scale: 1, digits: 0 },
  COKE: { unit: "t", scale: 1, digits: 0 },
  PULV: { unit: "t", scale: 1, digits: 0 },
};

/** 实物量 → 展示值 */
export function toDisp(media: MediumCode, qty: number) {
  const d = DISP[media];
  return { value: Math.round((qty / d.scale) * 10 ** d.digits) / 10 ** d.digits, unit: d.unit };
}

/**
 * 实物量 → 一句能直接进文案的量（「92.9 万kWh」）。
 * ⚠️ 拼接展示单位前**必须过这一层**：`fmtNum(实物量) + DISP.unit` 会印出
 * 「928,846 万kWh」这种数量级错一万倍的话，客户在补录工单上第一眼就能撞见。
 */
export function fmtQty(media: MediumCode, qty: number) {
  const d = toDisp(media, qty);
  return `${d.value.toLocaleString("en-US")} ${d.unit}`;
}

/* ══════════════════════════════════════════════════════════════════════════
   2. 输入层 ② 用能单元树
   ══════════════════════════════════════════════════════════════════════════ */

/** 厂级节点 id——平衡表行、结算成本中心、考核对象都用这一层 */
export const PLANTS = {
  COKE: "EU-0100",
  SINTER: "EU-0200",
  IRON: "EU-0300",
  STEEL: "EU-0400",
  ROLL: "EU-0500",
  POWER_AUX: "EU-0600",
  GEN: "EU-0700",
  GASPLANT: "EU-0800",
  OTHER: "EU-0900",
} as const;

/**
 * 树节点：裸字符串 = 无子节点的叶子；`[名称, 子节点[]]` = 带子节点。
 * 写成 `["1#TRT发电", "2#TRT发电"]` 想表达「两个同级叶子」是不行的——第二个元素会被当成 children，
 * 所以同级叶子直接并列在父级数组里，别多套一层。
 */
type UnitRow = string | [name: string, children?: UnitRow[]];

/** 三级树骨架（公司 → 厂 → 车间/设备）；id 规则 `EU-<厂序号>` / `<厂id><兄弟序号>` */
const UNIT_TREE: UnitRow[] = [
  [
    PLANT_NAME,
    [
      ["焦化厂", [["1#焦炉", ["1#干熄焦站", "化产回收系统"]], ["2#焦炉", ["2#干熄焦站"]], "煤气净化系统"]],
      [
        "烧结厂",
        [
          ["1#带式烧结机", ["1#主抽风机室", "1#点火炉"]],
          ["2#带式烧结机", ["2#主抽风机室"]],
          "球团竖炉",
          "烧结余热发电站",
        ],
      ],
      [
        "炼铁厂",
        [
          ["7#高炉", ["7#热风炉", "7#高炉鼓风机", "出铁场除尘"]],
          ["8#高炉", ["8#热风炉", "8#高炉鼓风机"]],
          "1#TRT发电",
          "2#TRT发电",
          "喷煤制粉系统",
          "石灰窑",
        ],
      ],
      [
        "炼钢厂",
        [
          ["1#转炉", ["1#连铸机", "1#LF精炼炉"]],
          ["2#转炉", ["2#连铸机"]],
          ["3#转炉", ["3#连铸机", "钢包烘烤"]],
          "精炼与除尘系统",
        ],
      ],
      [
        "轧钢厂",
        [["1#棒线加热炉", ["1#粗轧区", "1#精轧区"]], "2#棒线加热炉", ["1780热连轧", ["步进式加热炉", "层流冷却"]]],
      ],
      [
        "动力厂",
        [["中心循环水泵站", ["净环水系统", "浊环水系统"]], "高炉汽化冷却站", ["110kV总降变电站", ["35kV配电所"]]],
      ],
      [
        "煤气发电厂",
        [["150MW CCPP", ["CCPP汽轮机"]], ["1#CFB锅炉", ["1#25MW汽机"]], ["2#CFB锅炉", ["2#25MW汽机"]], "放散塔"],
      ],
      [
        "气体厂",
        [["1#空分装置", ["1#制氧机", "1#氩塔", "1#离心空压机"]], ["2#空分装置", ["2#离心空压机"]], "2#螺杆空压站"],
      ],
      ["辅助公辅", ["厂区照明与暖通", "运输与修造", "办公楼宇"]],
    ],
  ],
];

export const UNIT_LIST: UsingUnit[] = [];

/**
 * 展平用能单元树。id 规则：公司 `EU-0001`、厂 `EU-0X00`、
 * 车间/设备 = **父 id** + `-兄弟序号`（`EU-0100-1` → `EU-0100-1-1`）。
 *
 * ⚠️ 前缀必须是**直接父 id**，不能一律用厂 id。曾经写成「厂 id + 序号」，
 * 于是 1#焦炉（EU-0100-1）和它的子节点 1#干熄焦站 都是 EU-0100-1，
 * `UNIT_MAP` 被后者覆盖后 `parentId` 指回自己——祖先链遍历（`mediaCodes` 聚合）当场死循环，
 * 模块求值卡住、页面白屏。id 撞车在树形数据里是最难查的一类，因为两层看起来都"对"。
 */
function flatten(rows: UnitRow[], parentId: string | null, pathPrefix: string, level: 1 | 2 | 3 | 4) {
  rows.forEach((row, i) => {
    const name = typeof row === "string" ? row : row[0];
    const children = typeof row === "string" ? undefined : row[1];
    const id =
      level === 1 ? "EU-0001" : level === 2 ? `EU-${String(i + 1).padStart(2, "0")}00` : `${parentId}-${i + 1}`;
    const path = `${pathPrefix}/${i + 1}`;
    UNIT_LIST.push({
      id,
      name,
      level,
      parentId,
      path,
      mediaCodes: [],
      /** 成本中心定在厂级：EP0004 结算挂这一层，与「按工序/成本中心分摊」口径一致 */
      isCostCenter: level === 2,
      order: i + 1,
    });
    if (children) flatten(children, id, path, (level + 1) as 2 | 3 | 4);
  });
}
flatten(UNIT_TREE, null, "", 1);
/** id 唯一性自检：撞车不会编译报错，只会让上面的祖先遍历静默死循环 */
if (import.meta.env?.DEV && new Set(UNIT_LIST.map((u) => u.id)).size !== UNIT_LIST.length) {
  throw new Error("[energy] 用能单元 id 重复——检查 UNIT_TREE 的层级写法");
}

export const UNIT_MAP: Record<string, UsingUnit> = Object.fromEntries(UNIT_LIST.map((u) => [u.id, u]));
/**
 * 页面新增的单元必须同时登记进 `UNIT_LIST` / `UNIT_MAP`：派生层（`unitName`、
 * `refreshKeyEquipCoal` 的祖先上卷、`dayValueOf` 的 path 前缀匹配）只认这两个结构，
 * 只 push 进 store 的数组会让新节点在算账时"不存在"，在树上却看得见。
 */
export function registerUnit(u: UsingUnit) {
  UNIT_LIST.push(u);
  UNIT_MAP[u.id] = u;
}
export const unitName = (id: string) => UNIT_MAP[id]?.name ?? id;
/** 设备级叶子（计量点与重点设备挂这一层） */
export const EQUIP_UNITS: UsingUnit[] = UNIT_LIST.filter(
  (u) => u.level >= 3 && !UNIT_LIST.some((c) => c.parentId === u.id),
);
/** 工序行（厂级） */
export const PLANT_UNITS: UsingUnit[] = UNIT_LIST.filter((u) => u.level === 2);

/* ── 主产品与月产量 ─────────────────────────────────────────────────────── */

export const COKE_RATIO = 0.35;
export const PULV_RATIO = 0.15;
export const COAL_RATIO = 1.33;
export const IRON_TO_STEEL = 0.85;
export const STEEL_TO_ROLL = 0.94;
export const SINTER_RATIO = 1.5;
export const PELLET_RATIO = 0.1;
/** 棒线 19 万 t，其余给 1780 热连轧（两条产线定额不同，必须分开） */
const BAR_WAN_T = 19;

/** 产量锚点：铁水 42 万 t/月（B3 原值），其余由比率派生，见文件头第 2/3 条 */
const IRON_T = 42 * 1e4;
const STEEL_T = Math.round(IRON_T / IRON_TO_STEEL);

/** product key → 月产量（**t**） */
export const PRODUCTION: Record<string, number> = {
  IRON: IRON_T,
  STEEL: STEEL_T,
  COKE: Math.round(IRON_T * COKE_RATIO),
  PULV: Math.round(IRON_T * PULV_RATIO),
  COAL: Math.round(IRON_T * COKE_RATIO * COAL_RATIO),
  SINTER: Math.round(IRON_T * SINTER_RATIO),
  PELLET: Math.round(IRON_T * PELLET_RATIO),
  BAR: BAR_WAN_T * 1e4,
  HRZ: Math.round(STEEL_T * STEEL_TO_ROLL - BAR_WAN_T * 1e4),
};
PRODUCTION.ROLL = PRODUCTION.BAR + PRODUCTION.HRZ;

/** 厂级主产品（单耗除数、考核对象） */
export const PLANT_PRODUCT: Record<string, string> = {
  [PLANTS.COKE]: "COKE",
  [PLANTS.SINTER]: "SINTER",
  [PLANTS.IRON]: "IRON",
  [PLANTS.STEEL]: "STEEL",
  [PLANTS.ROLL]: "ROLL",
  [PLANTS.POWER_AUX]: "WATER",
  [PLANTS.GEN]: "POWER",
  [PLANTS.GASPLANT]: "O2",
  [PLANTS.OTHER]: "AUX",
};

/* ══════════════════════════════════════════════════════════════════════════
   3. 输入层 ③ 定额表（单源核心）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * `[单元, 介质, 方向, 主产品key, 定额, 量纲, 备注]`
 *
 * - 量纲：电 kWh/产品t、气 m³/产品t、固体与蒸汽 t/产品t。
 * - `product=""` ⇒ **绝对量**（该单元无对应产品，定额即月实物量）。
 * - `回收` = 余能回收（TRT/CDQ/余热发电/LDG/蒸汽），工序能耗的抵扣项。
 * - `外供` = 供厂界外，综合能耗要减它（文件头第 6 条）。
 * - **自产行只登记「不由消耗反推」的介质**（煤气、焦炭、MIG）；
 *   O₂/N₂/Ar/AIR/新水/电力的自产量由 `deriveSupply()` 反推（文件头第 7 条），不写在表里。
 * - 发电厂燃料消耗不写在表里：它由 `residualGasGen()` 用「富余量 − 放散」算出，
 *   这样「少放散 → 多消纳 → 多发电」是算出来的、不是抄来的。
 */
const QUOTA_ROWS: Array<[string, MediumCode, FlowDirection, string, number, string, string]> = [
  /* ── 焦化厂 ── */
  [
    PLANTS.COKE,
    "COKE",
    "自产",
    "COAL",
    1 / COAL_RATIO,
    "t/t煤",
    "= 铁水×焦比 派生（B3 的 44 万t/月 与之矛盾，见文件头第 2 条）",
  ],
  [PLANTS.COKE, "COG", "自产", "COKE", 420, "m³/t焦", "干熄焦工艺产气率"],
  [PLANTS.COKE, "ELEC", "消耗", "COKE", 58, "kWh/t焦", "煤气净化、化产、鼓冷"],
  [PLANTS.COKE, "COG", "消耗", "COKE", 115, "m³/t焦", "焦炉自身加热（本厂最大用能项，不再另计混合煤气）"],
  [PLANTS.COKE, "STEAM", "自产", "COKE", 0.065, "t/t焦", "干熄焦锅炉产汽"],
  [
    PLANTS.COKE,
    "ELEC",
    "回收",
    "COKE",
    30,
    "kWh/t焦",
    "干熄焦（CDQ）余热发电：上一行那 0.065 t汽/t焦 抽汽做功，两行同源",
  ],
  [PLANTS.COKE, "STEAM", "消耗", "COKE", 0.02, "t/t焦", "化产精馏用汽"],
  [PLANTS.COKE, "WATER", "消耗", "COKE", 0.9, "m³/t焦", "熄焦与化产用水"],
  [PLANTS.COKE, "N2", "消耗", "COKE", 15, "m³/t焦", "化产管网吹扫保护氮"],

  /* ── 烧结厂 ── */
  [PLANTS.SINTER, "ELEC", "消耗", "SINTER", 46, "kWh/t矿", "主抽风机为大头"],
  [PLANTS.SINTER, "ELEC", "消耗", "PELLET", 33, "kWh/t球", "竖炉球团电耗"],
  [PLANTS.SINTER, "COAL", "消耗", "SINTER", 0.045, "t/t矿", "固体燃料（无烟煤+焦粉，按外购煤计）"],
  [PLANTS.SINTER, "BFG", "消耗", "SINTER", 12, "m³/t矿", "点火炉高炉煤气"],
  [PLANTS.SINTER, "LDG", "消耗", "SINTER", 6, "m³/t矿", "点火炉掺烧转炉煤气（转炉气的主要用户之一）"],
  [PLANTS.SINTER, "WATER", "消耗", "SINTER", 0.35, "m³/t矿", "制粒与除尘用水"],
  [PLANTS.SINTER, "AIR", "消耗", "SINTER", 1.2, "m³/t矿", "气动与除尘反吹"],
  [PLANTS.SINTER, "ELEC", "回收", "SINTER", 40, "kWh/t矿", "烧结余热发电（大烟气温差发电）"],

  /* ── 炼铁厂 ── */
  [PLANTS.IRON, "COKE", "消耗", "IRON", COKE_RATIO, "t/t铁", "焦比——高炉燃料结构的主变量"],
  [PLANTS.IRON, "PULV", "消耗", "IRON", PULV_RATIO, "t/t铁", "喷煤比，等量置换焦炭"],
  [PLANTS.IRON, "ELEC", "消耗", "IRON", 115, "kWh/t铁", "鼓风机、上料、除尘（毛电耗，TRT 在回收列抵扣）"],
  [PLANTS.IRON, "BFG", "消耗", "IRON", 400, "m³/t铁", "热风炉烧炉（本工序最大煤气用户）"],
  [
    PLANTS.IRON,
    "BFG",
    "自产",
    "IRON",
    1150,
    "m³/t铁",
    "副产煤气——全厂平衡表最大发生项（焦比 0.35 + 喷煤 0.15 的燃料结构对应 1150）",
  ],
  [
    PLANTS.IRON,
    "LDG",
    "消耗",
    "IRON",
    72,
    "m³/t铁",
    "热风炉掺烧转炉煤气（转炉气的第一用户，吃掉回收量的六成——正因如此富余放散才只剩两成出头）",
  ],
  [PLANTS.IRON, "O2", "消耗", "IRON", 45, "m³/t铁", "高炉富氧"],
  [PLANTS.IRON, "AIR", "消耗", "IRON", 45, "m³/t铁", "炉前除尘与气动"],
  [PLANTS.IRON, "WATER", "消耗", "IRON", 1.6, "m³/t铁", "净环+浊环补水"],
  [PLANTS.IRON, "STEAM", "回收", "IRON", 0.06, "t/t铁", "高炉汽化冷却产汽"],
  [PLANTS.IRON, "ELEC", "回收", "IRON", 19, "kWh/t铁", "TRT 余压发电"],
  [PLANTS.IRON, "BFG", "消耗", "", 1.05e7, "m³/月", "石灰窑烧石灰（绝对量，无主产品）"],

  /* ── 炼钢厂 ── */
  [PLANTS.STEEL, "ELEC", "消耗", "STEEL", 36, "kWh/t钢", "转炉本体、连铸、除尘"],
  [PLANTS.STEEL, "LDG", "回收", "STEEL", 95, "m³/t钢", "转炉煤气回收（B3 标杆 90，本厂已超）"],
  [PLANTS.STEEL, "COG", "消耗", "STEEL", 8, "m³/t钢", "钢包/中间包烘烤"],
  [PLANTS.STEEL, "O2", "消耗", "STEEL", 55, "m³/t钢", "顶底复吹"],
  [PLANTS.STEEL, "N2", "消耗", "STEEL", 40, "m³/t钢", "溅渣护炉与气封"],
  [PLANTS.STEEL, "AR", "消耗", "STEEL", 2.5, "m³/t钢", "LF 精炼氩封"],
  [PLANTS.STEEL, "WATER", "消耗", "STEEL", 2.4, "m³/t钢", "连铸浊环水"],
  [PLANTS.STEEL, "STEAM", "回收", "STEEL", 0.008, "t/t钢", "转炉汽化冷却（固定管+烟罩）"],

  /* ── 轧钢厂（两档产品各一套定额；加热炉煤气按 MIG 计）── */
  [PLANTS.ROLL, "ELEC", "消耗", "BAR", 98, "kWh/t材", "棒线电耗高在轧机与飞剪"],
  [PLANTS.ROLL, "MIG", "消耗", "BAR", 150, "m³/t材", "棒线加热炉（约 1.3 GJ/t材）"],
  [PLANTS.ROLL, "WATER", "消耗", "BAR", 1.8, "m³/t材", "浊环水补水"],
  [PLANTS.ROLL, "AIR", "消耗", "BAR", 3.5, "m³/t材", "气动与辊道冷却"],
  [PLANTS.ROLL, "ELEC", "消耗", "HRZ", 66, "kWh/t材", "热连轧成材率高、电耗低"],
  [PLANTS.ROLL, "MIG", "消耗", "HRZ", 120, "m³/t材", "1780 步进梁式加热炉（约 1.05 GJ/t材）"],
  [PLANTS.ROLL, "WATER", "消耗", "HRZ", 2.2, "m³/t材", "层流冷却与除磷"],
  [PLANTS.ROLL, "STEAM", "回收", "HRZ", 0.008, "t/t材", "加热炉汽化冷却产汽"],

  /* ── 动力厂（无主产品 ⇒ 绝对量）── */
  [PLANTS.POWER_AUX, "ELEC", "消耗", "", 2.7e7, "kWh/月", "循环水泵群、汽化冷却泵、除盐水箱伴热"],
  [PLANTS.POWER_AUX, "STEAM", "消耗", "", 2.0e4, "t/月", "除氧器与采暖换热站用汽"],
  [PLANTS.POWER_AUX, "WATER", "外供", "", 80 * 1e4, "m³/月", "厂外协作单位供水"],

  /* ── 气体厂（电力与冷却水消耗由自产量派生，见 deriveSecondarySupply）── */

  /* ── 煤气发电厂 ── */
  [PLANTS.GEN, "ELEC", "消耗", "POWER", 0.025, "kWh/kWh电", "厂用电率 2.5%（分母是自发电量）"],
  [PLANTS.GEN, "COG", "消耗", "POWER", 0.24, "m³/kWh电", "CCPP 掺烧高热值煤气稳燃"],

  /* ── 辅助公辅 ── */
  [PLANTS.OTHER, "ELEC", "消耗", "", 6.0e6, "kWh/月", "厂区照明、暖通、运输、修造"],
  [PLANTS.OTHER, "WATER", "消耗", "", 1.2e6, "m³/月", "杂用水"],
  [PLANTS.OTHER, "COG", "消耗", "", 3.0e6, "m³/月", "修造管式炉与冬季供暖调峰"],
  [PLANTS.OTHER, "NG", "购入", "", 1.0e6, "m³/月", "高炉/焦炉检修期点火保压用外购天然气"],

  /* ── 厂界外供（综合能耗要减掉）── */
  [PLANTS.COKE, "COG", "外供", "COKE", 40, "m³/t焦", "周边民用管廊出口"],
  [PLANTS.GEN, "STEAM", "外供", "POWER", 1.8, "m³/kWh电", "工业供热与冬季采暖外供汽"],
];

/**
 * MIG 掺混比：8.8 MJ/m³ 由 BFG(3.35) + COG(16.74) 配出，
 * `x·3.35 + (1−x)·16.74 = 8.8` ⇒ x=0.593。即每 m³ 混合煤气耗 0.593 m³ BFG + 0.407 m³ COG。
 * 这是平衡表「转换」列的实质内容，也是客户最爱追问「混合煤气哪来的」的地方。
 */
export const MIG_BLEND = { bfg: 0.593, cog: 0.407 };

/** 外供蒸汽量（t/月）由发电量派生，见 QUOTA_ROWS 末行；此处只提供系数 */
const STEAM_EXPORT_PER_KWH = 1.8e-6;

const PRODUCT_CN: Record<string, string> = {
  COAL: "洗精煤",
  COKE: "焦炭",
  PULV: "喷吹煤粉",
  SINTER: "烧结矿",
  PELLET: "球团矿",
  IRON: "铁水",
  STEEL: "粗钢",
  BAR: "棒线材",
  HRZ: "热轧卷",
  ROLL: "钢材",
  O2: "氧气",
  N2: "氮气",
  AR: "氩气",
  AIR: "压缩空气",
  WATER: "新水",
  POWER: "电量",
  STEAM: "蒸汽",
  MIG: "混合煤气",
  /** 辅助公辅没有可对标的主产品；给它一个键，是为了让它的工序能耗**不参与对标**而不是除以粗钢 */
  AUX: "辅助生产",
};
export const productName = (key: string) => PRODUCT_CN[key] ?? key;

/** 定额表（EP0001 直接展示这张表，id 稳定） */
export const QUOTAS: Quota[] = QUOTA_ROWS.map((r, i) => ({
  id: `QT-${String(i + 1).padStart(4, "0")}`,
  unitId: r[0],
  mediaCode: r[1],
  direction: r[2],
  product: r[3] ? productName(r[3]) : "（绝对量）",
  intensity: r[4],
  intensityUnit: r[5],
  note: r[6],
}));

/** 单元涉及介质（EG0002 的「涉及介质」列由定额表派生，不另写一遍） */
PLANT_UNITS.forEach((u) => {
  const codes = new Set<MediumCode>();
  QUOTA_ROWS.forEach((r) => {
    if (r[0] === u.id) codes.add(r[1]);
  });
  u.mediaCodes = [...codes];
  u.note = `成本中心｜主产品 ${productName(PLANT_PRODUCT[u.id])}`;
});
UNIT_LIST.filter((u) => u.level >= 3).forEach((u) => {
  const acc = new Set<MediumCode>();
  let p: UsingUnit | undefined = u;
  while ((p = p?.parentId ? UNIT_MAP[p.parentId] : undefined)) acc.add(...p.mediaCodes);
  u.mediaCodes = [...acc];
});

/* ══════════════════════════════════════════════════════════════════════════
   4. 输入层 ④⑤⑥⑦ 电价 / 机组与柜位 / 负荷曲线 / 标杆
   ══════════════════════════════════════════════════════════════════════════ */

/** 分时电价（河北大工业口径示意）。尖峰只有 19-20 一小时，与 B3 的时段一致。 */
export const ELEC_PRICE = {
  tiers: [
    { tier: "尖峰" as const, price: 1.2, hours: [19] },
    { tier: "峰" as const, price: 0.85, hours: [8, 9, 10, 17, 20, 21, 22] },
    { tier: "平" as const, price: 0.55, hours: [7, 11, 12, 13, 14, 15, 23] },
    { tier: "谷" as const, price: 0.32, hours: [0, 1, 2, 3, 4, 5, 6, 16, 18] },
  ],
  demandPrice: 38,
  /** 申报最大需量 kVA。B3 的 42000 与它自己给的 142MW 双峰矛盾（142MW ÷ 0.93 ≈ 153MVA），
   *  照抄会让 EM0001 的「需量利用率」永远是 360%。这里按负荷峰值留 5% 裕量取整。 */
  demandKVA: 175000,
  pfTarget: 0.9,
  pfActual: 0.92,
};

export function hourToTier(h: number): "尖峰" | "峰" | "平" | "谷" {
  return ELEC_PRICE.tiers.find((x) => x.hours.includes(h % 24))?.tier ?? "平";
}
export function tierPrice(h: number) {
  return ELEC_PRICE.tiers.find((x) => x.hours.includes(h % 24))?.price ?? 0.55;
}

/** 需量电费 元/月（申报需量 × 需量电价，与实际负荷无关，是「移峰」之外的固定项） */
export function demandCharge() {
  return ELEC_PRICE.demandPrice * ELEC_PRICE.demandKVA;
}
/** 力调电费 元/月（实际 pf 高于标准 → 奖励，故为负） */
export function pfAdjCharge() {
  return -Math.round(demandCharge() * 0.05);
}

/**
 * 24 点逐时负荷基线（MW）。B3：日最低 ~98MW(03:00)、双峰 ~142MW(10:00/19:00)。
 * EM0001 的峰谷底色、需量告警与 ER0003 的负荷预测都读这条曲线——同一形状、同一个真源。
 *
 * ⚠️ 这张表只给**形状**，幅值由 `loadBaseline()` 缩放到账上的外购电量。
 * 直接拿它当 MW 读数会与 EP0004 的分时 kWh 差 ~11%（B3 的两个数本来就没对上），
 * 客户把曲线积分一下除回月电量就看到矛盾了。
 */
export const LOAD_CURVE_MW = [
  108, 102, 99, 98, 100, 104, 112, 122, 134, 139, 142, 138, 131, 128, 126, 124, 118, 128, 136, 142, 140, 134, 126, 116,
];
const CURVE_SUM_MW = LOAD_CURVE_MW.reduce((s, x) => s + x, 0);
/** 形状 → 电量 的换算：`ΣMW × (MONTH_HOURS/24) × 1000` kWh（每个小时点代表 30 个自然小时） */
function loadScaleOf(kwh: number) {
  return kwh / 1e3 / (MONTH_HOURS / 24) / CURVE_SUM_MW;
}
/**
 * 月账外购电量决定负荷幅值。**只算一次**：月账是冻结快照（两时钟分离），
 * 若每次 tick 都重算，实时层的抖动中心会跟着漂。
 */
let cachedBaseScale: number | undefined;
function baseLoadScale() {
  if (cachedBaseScale === undefined)
    cachedBaseScale = loadScaleOf(get(buildLedger(), PLANTS.POWER_AUX, "ELEC", "购入"));
  return cachedBaseScale;
}
/** 某小时的负荷基线（MW，已缩放到月账） */
export const loadBaseline = (hour: number) => LOAD_CURVE_MW[hour % 24] * baseLoadScale();

/** 申报需量对应的最大允许负荷（MW），EM0001 需量告警条的红线 */
export const DEMAND_LIMIT_MW = (ELEC_PRICE.demandKVA * 0.93) / 1000;

/** 机组：`per` 是气耗率 m³/kWh，`maxMw` 是铭牌出力；**电量一律由燃料量派生** */
export const GEN_UNITS = [
  {
    id: "GU-CCPP",
    name: "150MW CCPP 燃煤气机组",
    media: "BFG" as MediumCode,
    per: 3.6 / (3.35 * 0.42),
    maxMw: 150,
    minRatio: 0.6,
    ramp: "分钟级",
    note: "消纳 BFG 大户，最低技术出力 60%",
  },
  {
    id: "GU-CFB1",
    name: "1#CFB 锅炉 + 25MW 汽机",
    media: "BFG" as MediumCode,
    per: 3.57,
    maxMw: 25,
    minRatio: 0.4,
    ramp: "40min 升负荷",
    note: "点炉到时滞 40min——调度建议里最真实的一条",
  },
  {
    id: "GU-CFB2",
    name: "2#CFB 锅炉 + 25MW 汽机",
    media: "BFG" as MediumCode,
    per: 3.57,
    maxMw: 25,
    minRatio: 0.4,
    ramp: "40min 升负荷",
    note: "与 1# 错峰点炉是常见处置手段",
  },
];
/** 基线投运台数：2# CFB 备用，所以建议②「点起 2#CFB」在基线里必须是可执行的 */
export const CFB_RUNNING_BASE = 1;
/** CFB 单炉煤气耗量（B3 的 4.5 万 m³/h），也是它 130t/h 产汽对应的燃料量 */
export const CFB_GAS_M3_H = 45000;
export const CFB_STEAM_T_H = 130;
/** 机组气耗率 m³/kWh：月账电量与瞬时出力曲线共用，两处只在这里定义一次 */
export const CCPP_BFG_PER_KWH = GEN_UNITS[0].per;
export const CFB_GAS_PER_KWH = GEN_UNITS[1].per;
/** CCPP 稳燃掺烧 COG 份额（= 定额表里 `m³/kWh电` 那行，口径必须同源，不能两处各写 0.24） */
export const COG_PER_KWH_CCPP = QUOTA_ROWS.find((r) => r[0] === PLANTS.GEN && r[1] === "COG")![4];
/** LDG 柜存与管损率：回收量里扣掉这部分才是可用的，剩下的就是放散 */
export const LDG_HOLDING_PCT = 0.01;

/** 余能回收发电装置（电量由「回收」方向定额给出，不经过煤气） */
export const RECOVERY_GEN = [
  { id: "RG-TRT", name: "TRT×2 余压发电", unitId: PLANTS.IRON },
  { id: "RG-CDQ", name: "干熄焦余热发电", unitId: PLANTS.COKE },
  { id: "RG-SJW", name: "烧结余热发电", unitId: PLANTS.SINTER },
];

/** 煤气柜基线（B3 的容量与红线）。柜容合计决定瞬时缓冲，是幕 2 倒计时的分母。 */
export const HOLDER_ROWS = [
  { id: "GH-BFG1", name: "1# 高炉煤气柜", media: "BFG", capM3: 100000, base: 55, hi: 90, lo: 15 },
  { id: "GH-BFG2", name: "2# 高炉煤气柜", media: "BFG", capM3: 100000, base: 58, hi: 90, lo: 15 },
  { id: "GH-COG1", name: "焦炉煤气柜", media: "COG", capM3: 50000, base: 48, hi: 90, lo: 15 },
  { id: "GH-LDG1", name: "1# 转炉煤气柜", media: "LDG", capM3: 100000, base: 62, hi: 90, lo: 15 },
  { id: "GH-LDG2", name: "2# 转炉煤气柜", media: "LDG", capM3: 100000, base: 56, hi: 90, lo: 15 },
] as const;

/** LDG 吹炼高峰剧本：N 拍线性把 1#LDG 柜从 62% 推到 88%。幕 2 的曲线形状写死，随机数据会让剧本变抽奖 */
export const SIM_LDG_SURGE = {
  ticks: 10,
  fromPct: 62,
  toPct: 88,
  extraInM3min: 1500,
  /**
   * 爬到 `toPct` 之后**峰吹再持续多少拍**才自然退去（3s/拍 → 2min）。
   * 为什么需要它：柜位一旦停在 88% 而进气立刻回落，`simulateGasBalance` 的富余就只剩
   * 月均那 299m³/min，柜组的吸收上限（1.2%/min × 20万m³）远大于它——**放散恒为 0**。
   * 于是幕 3 的放散报警不会响、EM0007 的 what-if 滑杆没有可归零的东西、
   * 三条建议上的「预计削减」全是 0，八幕剧本第二幕就把后面六幕的道具收走了。
   * 现场语义也正是这样：吹炼高峰是持续十几分钟的过程，不是 30 秒的尖峰；
   * 30 秒只是演示加速，爬完之后气还在往柜里顶。退路是处置（`execDone` 削掉 extra），
   * 不是等它自己走完——所以这个值要足够长到覆盖一次完整的「报警→转令→下达→执行」走查。
   */
  holdTicks: 40,
};

/**
 * 一条调度令执行到位后，柜位基线下压多少的折算口径：「每小时消纳掉 `cutM3h`」× 这个小时数
 * ÷ 柜组容量。`execDone` 用它把处置效果落到实时层（基线动、柜位随后回落到新基线），
 * 所以常数放在 model 而不是 store——它是**演示叙事的量纲**，改了它等于改剧本，两处必须同步。
 */
export const DISPATCH_EFFECT_HOURS = 1;

/**
 * 数据质量异常的注入倍率（EC0003「▶生成当日异常」）：`rawValue = 日均实绩 × 倍率`。
 * 放在 model 是为了让「量程越界 / 突变跳」这两条判据与工单建议值同源——
 * 页面自己乘一个 1.9、mock 再乘一个 2.0，异常值和补录值就对不上了。
 */
export const QUALITY_INJECT = { overRange: 1.9, spike: 3.4, tolerancePct: 8 };

/**
 * 跨月产量系数。同一批定额下，**上月必须与本月数不同**（客户切月份看到两个完全一样的合计，
 * 第一反应是「这系统是假的」），但同一个月内各页必须同数。所以系数只作用在产量上、
 * 由 `store.monthEffect()` 统一注入，实绩/平衡/结算/考核四条链共用同一个 effect。
 */
export const PREV_MONTH_OUTPUT_FACTOR = 0.97;
/** 次月计划的上浮幅度（EP0001「按预测产量重算计划」的默认口径） */
export const NEXT_PLAN_OUTPUT_FACTOR = 1.02;

/**
 * 能效等级的单耗修正系数（EP0006 重点设备台账）。基准是**工序定额**（EP0001 那张表），
 * 同一定额下 1 级机组略优、3 级略差——设备能效曲线要有对标线，只能从定额派生；
 * 另写一台设备的铭牌单耗，就会与 EP0001 的定额对不上（客户最爱拿这两页互查）。
 */
export const EFF_GRADE_FACTOR: Record<"1级" | "2级" | "3级" | "落后", number> = {
  "1级": 0.94,
  "2级": 1,
  "3级": 1.08,
  落后: 1.2,
};

/** 年运行小时（设备台账的 `runHours` 是年口径，折到月份额除以它） */
export const YEAR_HOURS = 8760;

/** 柜位均值回归参数与钳位：见文件头「两层时钟」 */
export const HOLDER_KAPPA = 0.15;
export const HOLDER_ETA = 1.5;
/**
 * 柜位升降速率上限（%/min）。10 万 m³ 的转炉煤气柜现场一般限到 1~1.5%/min，
 * 它是「瞬时富余 → 先充柜、充不动才放散」这条因果的物理依据（`simulateGasBalance`）。
 * 没有它，富余量会全部记成放散、柜位永远不涨，幕 2 的触顶倒计时恒为 null。
 */
export const HOLDER_RATE_PCT_MIN = 1.2;
/**
 * 放散联锁的柜位退坡带（百分点）。柜位从 `hiLimit − 本值` 起到 `hiLimit`，进柜能力线性关到 0。
 * 现场不是「充到满柜才放散」：高限之前就必须留出迎接下一炉吹炼高峰的缓冲，
 * 所以 88% 的柜位配上吹炼峰值进气是**真的在放散**（幕 2 的放散倒计时、幕 3 的削减量、
 * 幕 8 的「放散率 2.1%→1.3%」全建在这条带上）。
 */
export const HOLDER_VENT_TAPER_PCT = 5;
const clampPct = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export function nextLevelPct(h: Pick<GasHolder, "levelPct" | "basePct" | "loLimit" | "hiLimit">, u: number) {
  const p = h.levelPct + HOLDER_KAPPA * (h.basePct - h.levelPct) + HOLDER_ETA * u;
  /**
   * 钳位钳在**红线本身**上，不是红线内一格。钳成 `hiLimit − 1` 会让实时层的柜位永远够不到
   * 88%~90% 这段放散带，`ventM3min` 恒为 0——剧本爬完 88% 后大屏的放散数字就再也不动。
   */
  return Math.round(clampPct(p, h.loLimit, h.hiLimit) * 10) / 10;
}

/** 焦炉化产品（焦油/粗苯/硫酸铵）折标能量扣减，kgce/t 焦。
 *  真实 55–65；本域不建化产介质，所以它只作为**工序能耗口径的扣减项**存在，
 *  不进任何介质平衡表（进了就会破坏 selfCheck 的守恒等式）。 */
const CHEM_PRODUCT_CREDIT_KGCE_T = 58;

/** 工序能耗与综合能耗对标（kgce/t 产品）。炼钢为负是真实工况（转炉余能回收 > 消耗）。 */
export const BENCHMARKS: Record<string, { benchmark: number; access: number; design: number }> = {
  /* GB 32045 焦化工序能耗等级：1 级 ≤100、5 级 ≤150（湿熄焦口径） */
  COKE: { benchmark: 100, access: 150, design: 120 },
  SINTER: { benchmark: 46, access: 54, design: 48 },
  IRON: { benchmark: 361, access: 420, design: 390 },
  STEEL: { benchmark: -30, access: 10, design: -20 },
  ROLL: { benchmark: 46, access: 63, design: 52 },
  COMPOSITE: { benchmark: 545, access: 600, design: 565 },
};

/**
 * 考核量程（EP0005 的打分口径，见 `computeAssess` 文件头）：
 * 偏差一个「设计值 → 标杆值」档记 10 分，总分封底 60、封顶 110。
 * 这三个数是**管理办法参数**不是行业数据，所以集中放在这里，页面上作为表头说明展示。
 */
export const ASSESS_STEP_SCORE = 10;
export const ASSESS_FLOOR = 60;
export const ASSESS_CEIL = 110;

/** KPI 目标线（EO0002 每卡的目标值）。只有 `KPI_TARGETS` 是「管理层承诺值」，
 *  和 BENCHMARKS 的国家标杆/准入是两个用途——考核算分走 BENCHMARKS，别混。 */
export const KPI_TARGETS = {
  ventRatePct: 1.5,
  selfGenRatePct: 52,
  ldgRecoveryM3: 90,
  compositeKgce: 545,
  /** 刻意压在实测（≈860）之下一档：大屏上留一个「未达标」的 amber，
   *  正是「为什么要上 EMS」的商务理由。放散那条红是剧本要现场灭掉的。 */
  costPerTonSteel: 820,
  elecPerTonSteel: 520,
};

/** 人员（B3 话术人名），报警接收人/调度签发人/结算经办人从这里取，不要在各页手写 */
export const PEOPLE = {
  dispatcher: "张调",
  dispatcherDeputy: "刘调",
  sinter: "老周",
  iron: "陈值星",
  steel: "孙班长",
  power: "吴工",
  assess: "赵工",
  settle: "李工",
};

/* ══════════════════════════════════════════════════════════════════════════
   5. 派生层 (A) buildLedger —— 全站唯一的「能源发生」点
   ══════════════════════════════════════════════════════════════════════════ */

export interface Flow {
  unitId: string;
  mediaCode: MediumCode;
  direction: FlowDirection;
  /** 实物量：kWh / m³ / t */
  qty: number;
  /** 派生折标煤 kgce */
  stdCoal: number;
  quotaId?: string;
  formula: string;
}

/** 月账层的可调入参（`recalcActual`/计划情景用；实时 what-if 走 `simulateGasBalance`，不走这里） */
export interface FlowEffect {
  /** 产量修正（product key → t），EP0001 编计划时按预测产量重算 */
  outputs?: Record<string, number>;
  /** CFB 投运台数（0/1/2），默认基线 1 台 */
  cfbRunning?: number;
}

const keyOf = (unitId: string, media: MediumCode, dir: FlowDirection) => `${unitId}|${media}|${dir}`;

interface Ledger {
  flows: Map<string, Flow>;
  prod: Record<string, number>;
  cfbRunning: number;
}

function put(
  l: Ledger,
  unitId: string,
  media: MediumCode,
  dir: FlowDirection,
  qty: number,
  formula: string,
  quotaId?: string,
) {
  if (!(qty > 0)) return;
  const k = keyOf(unitId, media, dir);
  const prev = l.flows.get(k);
  if (prev) {
    prev.qty += qty;
    prev.formula += ` + ${formula}`;
  } else l.flows.set(k, { unitId, mediaCode: media, direction: dir, qty, stdCoal: 0, quotaId, formula });
}

const get = (l: Ledger, unitId: string, media: MediumCode, dir: FlowDirection) =>
  l.flows.get(keyOf(unitId, media, dir))?.qty ?? 0;
/** 同介质同方向的全站合计 */
function sumMedia(l: Ledger, media: MediumCode, dir: FlowDirection) {
  let s = 0;
  for (const f of l.flows.values()) if (f.mediaCode === media && f.direction === dir) s += f.qty;
  return s;
}

/**
 * 建账顺序（**单向，绝不反向**）：
 * 定额展开 → MIG 转换展开 → 二次能源自产反推 → 煤气发电残差 → 蒸汽管损残差 → 外购电残差 → 折标。
 * 每一步只读上一步的结果，所以任何一页的数字都能沿这条链回溯到「产量 × 定额」。
 */
function buildLedger(effect: FlowEffect = {}): Ledger {
  const prod = { ...PRODUCTION, ...effect.outputs };
  /** 轧材是 BAR+HRZ 的合计口径，产量被覆盖时必须重算，否则 ROLL 单耗除数还是旧值 */
  prod.ROLL = (prod.BAR ?? 0) + (prod.HRZ ?? 0);
  const l: Ledger = {
    flows: new Map(),
    prod,
    cfbRunning: effect.cfbRunning ?? CFB_RUNNING_BASE,
  };

  /* (A0) 定额展开：产量 × 定额（product="" ⇒ 绝对量） */
  QUOTA_ROWS.forEach((r, i) => {
    const [unitId, media, dir, product, intensity] = r;
    const id = `QT-${String(i + 1).padStart(4, "0")}`;
    const prodKey = product;
    /* 发电厂三行（厂用电、掺烧 COG、外供汽）分母是「自发电量」，由 residualGasGen 给，不在这里落 */
    if (prodKey === "POWER") return;
    if (!prodKey) {
      put(
        l,
        unitId,
        media,
        dir,
        intensity,
        `${UNIT_MAP[unitId]?.name ?? unitId} ${MEDIUMS[media].name}${dir}（绝对量定额）`,
        id,
      );
      return;
    }
    /* 派生行的分母不在 PRODUCTION 里（自发电量、制氧量由后面的步骤给）：
     * 这里必须**响**，不能让它算出 NaN 再一路静默传进平衡表。 */
    const base = l.prod[prodKey];
    if (base === undefined) {
      throw new Error(
        `[energy] 定额 ${id} 的主产品 "${prodKey}" 不在产量表里——它要么补进 PRODUCTION，要么改由派生步骤给`,
      );
    }
    const qty = base * intensity;
    put(
      l,
      unitId,
      media,
      dir,
      qty,
      `${UNIT_MAP[unitId]?.name ?? unitId}：${productName(prodKey)} ${fmt(base)} t × 定额 ${intensity} ${r[5]}`,
      id,
    );
  });

  /* (A1) 炼焦配煤消耗：焦炭产量 × 煤比。注意落的是**消耗**，购入量由
   *      `residualPurchaseSolid()` 按「Σ消耗 − Σ自产」补——固体燃料一律走这条路，
   *      烧结用煤、喷吹煤粉才不会漏在账外（曾经把配煤直接记成购入，烧结那 3.5 万 t
   *      固体燃料就无处可去，COKE 行当场负差）。 */
  put(
    l,
    PLANTS.COKE,
    "COAL",
    "消耗",
    l.prod.COKE * COAL_RATIO,
    `焦炭 ${fmt(l.prod.COKE)} t × 入炉煤比 ${COAL_RATIO} t煤/t焦`,
  );

  /* (A2) MIG 转换展开：加热炉的混合煤气由 BFG+COG 掺出。MIG 是**中间介质**，
   *      在平衡表上「收入=掺混产出、支出=加热炉消耗」等量出现（净差为 0），
   *      BFG/COG 侧则以「转换」列离开管网——convert 列的实质内容就是这笔。
   *      ⚠️ 别只写自产不写消耗（或反过来）：MIG 行的平衡差会等于全量。 */
  const migDemand = sumMedia(l, "MIG", "消耗");
  if (migDemand > 0) {
    for (const u of [PLANTS.ROLL, PLANTS.COKE]) {
      const own = get(l, u, "MIG", "消耗");
      if (!own) continue;
      put(l, u, "MIG", "自产", own, `${UNIT_MAP[u]?.name} 混合煤气发生（掺混产出）`);
      put(l, u, "BFG", "转换", own * MIG_BLEND.bfg, `→ MIG ${fmt(own)} m³ × BFG 配比 ${MIG_BLEND.bfg}`);
      put(l, u, "COG", "转换", own * MIG_BLEND.cog, `→ MIG ${fmt(own)} m³ × COG 配比 ${MIG_BLEND.cog}`);
    }
  }

  deriveSecondarySupply(l);
  residualGasGen(l);
  residualSteam(l);
  residualPurchaseSolid(l);
  residualPurchaseGas(l);
  residualPurchasePower(l);
  finalize(l);
  return l;
}

/**
 * (A3) 二次能源与「电当量介质」的自产量反推：消耗 + 外供 + 目标损耗。
 * 空分/取制水的铭牌容量（2×32000 Nm³/h、新水规模）只用于「容量负荷率」展示，不等于月度产量。
 * 水的损耗率最高（5.5%）：浊环/净环的循环量不计入新水平衡，这里算的是补水，漏损全在新水侧。
 */
function deriveSecondarySupply(l: Ledger) {
  /** 气体介质的目标管损/放散率（%）——Ar 抽出量小、损耗率高 */
  const LOSS_PCT: Partial<Record<MediumCode, number>> = { O2: 2, N2: 3, AR: 5, AIR: 4, WATER: 5.5 };
  const putSupply = (media: MediumCode, unitId: string) => {
    const use = sumMedia(l, media, "消耗") + sumMedia(l, media, "转换");
    const exp = sumMedia(l, media, "外供");
    const pct = (LOSS_PCT[media] ?? 2) / 100;
    /* 自产与损失**成对写入**：只放大收入不记损耗，平衡恒等式当场破掉
     * （selfCheck 会报「收入−用+损 = 那个损耗率」，而不是报出真正的错处） */
    put(
      l,
      unitId,
      media,
      "自产",
      (use + exp) * (1 + pct),
      `${MEDIUMS[media].name}自产 = (Σ消耗 ${fmt(use)} + 外供 ${fmt(exp)}) × (1 + 损耗 ${(pct * 100).toFixed(1)}%)`,
    );
    put(
      l,
      unitId,
      media,
      "损失",
      (use + exp) * pct,
      `${MEDIUMS[media].name}管网损耗（${(pct * 100).toFixed(1)}% 口径）`,
    );
  };
  /* 先算气体（空分的水耗是它们派生出来的），再算新水自产——顺序反了新水就漏掉空分补水 */
  (
    [
      ["O2", PLANTS.GASPLANT],
      ["N2", PLANTS.GASPLANT],
      ["AR", PLANTS.GASPLANT],
      ["AIR", PLANTS.GASPLANT],
    ] as Array<[MediumCode, string]>
  ).forEach(([media, unitId]) => putSupply(media, unitId));

  /* 气体厂的制氧/制氮/制氩/制气电耗与空分补水：系数与介质折标同源（文件头第 5 条），
   * 分母是**自产量**（含管损），不是消耗量——不然损耗那部分能量没人承担。 */
  const gasSelf = (media: MediumCode) => get(l, PLANTS.GASPLANT, media, "自产");
  put(
    l,
    PLANTS.GASPLANT,
    "ELEC",
    "消耗",
    gasSelf("O2") * ELECTRICITY_PER_MEDIUM.O2 +
      gasSelf("N2") * ELECTRICITY_PER_MEDIUM.N2 +
      gasSelf("AR") * ELECTRICITY_PER_MEDIUM.AR +
      gasSelf("AIR") * ELECTRICITY_PER_MEDIUM.AIR,
    "Σ(气体自产量 × 单位电耗：O2 0.65 / N2 0.366 / Ar 5.45 / AIR 0.1025 kWh/Nm³)",
  );
  put(
    l,
    PLANTS.GASPLANT,
    "WATER",
    "消耗",
    gasSelf("O2") * SEPARATION_WATER_PER_O2,
    `空分凝结器与循环水补水 = 制氧 ${fmt(gasSelf("O2"))} Nm³ × ${SEPARATION_WATER_PER_O2} m³/Nm³`,
  );
  putSupply("WATER", PLANTS.POWER_AUX);

  /* LDG 回收量已由定额给出（95 m³/t钢），热风炉掺烧 + 放散在 residualGasGen 里与回收量对齐 */
}

/**
 * 各介质的「发生量」= 自产 + 购入 + **回收**，也就是平衡表的收入列口径。
 * 必须含回收：转炉煤气、汽化冷却产汽这些**副产介质**在定额表里记的就是「回收」方向
 * （回收率本身是考核项），漏掉它 LDG 行的收入会是 0、蒸汽管损算错、selfCheck 集体报错。
 */
function incomeOf(l: Ledger, media: MediumCode) {
  return sumMedia(l, media, "自产") + sumMedia(l, media, "购入") + sumMedia(l, media, "回收");
}
/** 除发电厂外的真实用气（消耗 + 转换 + 外供） */
function useOf(l: Ledger, media: MediumCode, excludeUnit?: string) {
  let s = 0;
  for (const f of l.flows.values()) {
    if (f.mediaCode !== media || f.unitId === excludeUnit) continue;
    if (f.direction === "消耗" || f.direction === "转换" || f.direction === "外供") s += f.qty;
  }
  return s;
}

/**
 * (A4) 煤气消纳与放散：机组吃不下多少，放散就是多少——**放散是输出，不是输入**。
 *
 * 电量**由每台机组自己的气耗率算**，不套一个全厂平均效率：CCPP 2.56 m³/kWh、
 * CFB 3.57 m³/kWh 差 40%，用同一个 42% 净效率去乘总量，客户拿铭牌一除就露馅。
 * 投运顺序 CFB 先占位（它是「点炉消纳」这条调度的物理载体），剩余给 CCPP；
 * CCPP 顶到 150MW 还有富余，那部分**真的放散**，`selfCheck` 同时把它报出来——
 * 月账有放散 ⟺ 机组已顶满，两者必须同真同假，否则数就是凑的。
 */
function residualGasGen(l: Ledger) {
  const cfbRunning = Math.min(l.cfbRunning, CFB_UNITS);

  const cfbFuelM3 = cfbRunning * CFB_GAS_M3_H * MONTH_HOURS;
  const bfgSurplus = Math.max(0, incomeOf(l, "BFG") - useOf(l, "BFG", PLANTS.GEN));
  const cogSurplus = Math.max(0, incomeOf(l, "COG") - useOf(l, "COG", PLANTS.GEN));

  /* CFB 只烧 BFG；富余不够就按可用量退让，发电量同比例回落（不假想满发） */
  const cfbFuelReal = Math.min(cfbFuelM3, bfgSurplus);
  const cfbKwh = Math.min(cfbFuelReal / CFB_GAS_PER_KWH, GEN_UNITS[1].maxMw * 1000 * MONTH_HOURS);

  /* CCPP 按 BFG 单烧定出力（2.56 m³/kWh = 3.6MJ ÷ (3.35MJ/m³ × 42% 净效率)）。
   * 掺烧的 COG 是**稳燃**份额、已含在铭牌气耗里，不再额外计电量——
   * 否则一度电被两笔燃料能量各算一次，发电量虚高约 47%，这是本函数最容易写错的地方。 */
  const bfgForCcpp = Math.max(0, bfgSurplus - cfbFuelReal);
  const ccppCapKwh = GEN_UNITS[0].maxMw * 1000 * MONTH_HOURS;
  const ccppKwh = Math.min(ccppCapKwh, bfgForCcpp / CCPP_BFG_PER_KWH);
  const ccppBfgM3 = ccppKwh * CCPP_BFG_PER_KWH;
  /* 稳燃 COG 按实际出力扣；厂内焦炉气不够时按可用量退让（CCPP 降负荷，不凭空造气） */
  const ccppCogM3 = Math.min(ccppKwh * COG_PER_KWH_CCPP, cogSurplus);

  const genKwh = cfbKwh + ccppKwh;

  put(
    l,
    PLANTS.GEN,
    "ELEC",
    "自产",
    genKwh,
    `煤气发电量 = CCPP ${fmt(ccppKwh)} + CFB×${cfbRunning} ${fmt(cfbKwh)} kWh（按各自气耗率派生）`,
  );
  put(
    l,
    PLANTS.GEN,
    "BFG",
    "消耗",
    cfbFuelReal + ccppBfgM3,
    `CCPP ${fmt(ccppBfgM3)} + CFB×${cfbRunning} ${fmt(cfbFuelReal)} m³（富余量残差消纳，铭牌出力封顶）`,
  );
  put(
    l,
    PLANTS.GEN,
    "COG",
    "消耗",
    ccppCogM3,
    `CCPP 稳燃掺烧焦炉煤气（${COG_PER_KWH_CCPP} m³/kWh × 出力 ${fmt(ccppKwh)} kWh）`,
  );

  /* LDG：热风炉掺烧 + 烧结点火之外没有稳定用户，回收量−全部用量即富余 ⇒ 计放散。
   * 这笔就是「转炉煤气回收率」考核项的缺口，也是幕 2 柜位倒计时的月账对应物。
   * 分母必须是 `useOf` 全厂口径：只扣热风炉那一行，烧结点火的 378 万 m³ 会被重复计入放散，
   * selfCheck 当场报 LDG 负差（曾经就是这么露馅的）。 */
  const ldgUse = useOf(l, "LDG", undefined);
  const ldgIncome = incomeOf(l, "LDG");
  const ldgHold = ldgIncome * LDG_HOLDING_PCT;
  const ldgVent = Math.max(0, ldgIncome - ldgUse - ldgHold);
  /* 两条 put 落在同一个 (厂, 介质, 方向) 键上会累加成一笔损失——**必须都记**。
   * 只记放散、把柜存管损从算式里减掉却不入账，LDG 行就永久差 1%（selfCheck 抓到的就是这个）。 */
  put(
    l,
    PLANTS.STEEL,
    "LDG",
    "损失",
    ldgVent,
    `转炉煤气回收 ${fmt(ldgIncome)} − 热风炉与点火掺烧 ${fmt(ldgUse)} − 柜存与管损 ${fmt(ldgHold)}`,
  );
  put(l, PLANTS.STEEL, "LDG", "损失", ldgHold, "柜存与管损");

  /* BFG/COG 放散 = 机组消纳后仍剩的富余，挂在发生工序 */
  put(
    l,
    PLANTS.IRON,
    "BFG",
    "损失",
    Math.max(0, bfgSurplus - cfbFuelReal - ccppBfgM3),
    `高炉煤气放散 = 富余 ${fmt(bfgSurplus)} − CFB ${fmt(cfbFuelReal)} − CCPP ${fmt(ccppBfgM3)}`,
  );
  put(l, PLANTS.COKE, "COG", "损失", Math.max(0, cogSurplus - ccppCogM3), "焦炉煤气放散（安全放散，计入考核）");

  /* 厂用电 2.5% × 自发电量；CFB 产汽进全厂蒸汽网，CCPP 产汽全部供本厂汽机 */
  put(l, PLANTS.GEN, "ELEC", "消耗", genKwh * 0.025, `厂用电 = 自发电量 ${fmt(genKwh)} kWh × 厂用电率 2.5%`);
  put(
    l,
    PLANTS.GEN,
    "STEAM",
    "自产",
    cfbRunning * CFB_STEAM_T_H * MONTH_HOURS,
    `CFB×${cfbRunning} 产汽 ${CFB_STEAM_T_H} t/h × ${MONTH_HOURS} h`,
  );
  put(
    l,
    PLANTS.GEN,
    "STEAM",
    "外供",
    genKwh * STEAM_EXPORT_PER_KWH,
    "外供汽 = 发电量 × 1.8 m³/kWh（工业供热与冬季采暖）",
  );
}

/** (A5) 蒸汽管损残差：产汽 − 用汽 − 外供 = 管损及放空 */
function residualSteam(l: Ledger) {
  const produced = incomeOf(l, "STEAM");
  const used = useOf(l, "STEAM", undefined);
  const loss = Math.max(0, produced - used);
  put(
    l,
    PLANTS.POWER_AUX,
    "STEAM",
    "损失",
    loss,
    `蒸汽管损及放空 = 产汽 ${fmt(produced)} − 用汽与外供 ${fmt(used)}（残差项）`,
  );
}

/**
 * (A5b) 固体燃料外购残差：煤粉、洗精煤这类**没有自产**的介质，购入量 = Σ消耗。
 * 没有自产却也没有购入行的介质，selfCheck 会直接报负差（喷吹煤粉就是这么露馅的）。
 */
function residualPurchaseSolid(l: Ledger) {
  const HOME: Partial<Record<MediumCode, string>> = { COAL: PLANTS.COKE, PULV: PLANTS.IRON };
  (Object.keys(HOME) as MediumCode[]).forEach((media) => {
    const unitId = HOME[media]!;
    const need = sumMedia(l, media, "消耗") - incomeOf(l, media);
    put(
      l,
      unitId,
      media,
      "购入",
      need,
      `${MEDIUMS[media].name}外购 = Σ消耗 ${fmt(sumMedia(l, media, "消耗"))} − 自产 ${fmt(incomeOf(l, media) - get(l, unitId, media, "购入"))}（厂界无自产）`,
    );
  });
}

/**
 * (A5c) 外购气体残差：天然气这类**只在厂界采购、厂内不产不供**的介质，消耗 = 购入。
 * 检修期点火保压用的气没有单独的计量分支（烧完就完了），所以它的量由采购侧唯一确定。
 * 不写这一笔的后果不是「差一点」而是**两处同时错**：NG 行的平衡差 = 全量（收入 100 万、
 * 受入 0，分摊还摊不动），EP0004 结算单里天然没有天然气成本（`mediumCost` 只走消耗口径）。
 */
function residualPurchaseGas(l: Ledger) {
  const bought = sumMedia(l, "NG", "购入");
  const metered = sumMedia(l, "NG", "消耗");
  put(
    l,
    PLANTS.OTHER,
    "NG",
    "消耗",
    bought - metered,
    `检修点火与保压用天然气 = 厂界购入 ${fmt(bought)} − 已计量消耗 ${fmt(metered)}（无回收无外供）`,
  );
}

/**
 * (A6) 外购电残差：Σ全站耗电 − 自发电量 − 余能回收电量。
 * 扣的是**毛发电量**而不是扣厂用电后的供电量：厂用电本身已经在 Σ耗电里了，
 * 再扣一次就会凭空多出「厂用电」那笔负差（这个 bug 会让 ELEC 行差出 2800 万 kWh）。
 */
function residualPurchasePower(l: Ledger) {
  const used = sumMedia(l, "ELEC", "消耗");
  const gen = get(l, PLANTS.GEN, "ELEC", "自产");
  const recover = sumMedia(l, "ELEC", "回收");
  const gap = used - gen - recover;
  put(
    l,
    PLANTS.POWER_AUX,
    "ELEC",
    "购入",
    gap,
    `外购电量 = Σ耗电 ${fmt(used)} − 煤气发电 ${fmt(gen)} − 余能回收 ${fmt(recover)}（残差项）`,
  );
}

function finalize(l: Ledger) {
  for (const f of l.flows.values()) f.stdCoal = f.qty * MEDIUMS[f.mediaCode].stdCoal;
}

const fmt = (v: number) => (Math.abs(v) >= 1e4 ? `${Math.round(v / 1e4)}万` : v.toFixed(0));

/* ══════════════════════════════════════════════════════════════════════════
   6. 派生层 (B)(C) 流量表 / 折标 / 工序能耗
   ══════════════════════════════════════════════════════════════════════════ */

export function flows(effect: FlowEffect = {}): Flow[] {
  return [...buildLedger(effect).flows.values()];
}

/* ══════════════════════════════════════════════════════════════════════════
   9b. 工序能耗账（stdCoalByPlant 与 EP0005 / ER0002 的唯一算法）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 厂级「能源收支 + 工序能耗」账。**两个口径同行给出、各页各取一个，绝不相减**：
 *
 * - `inKgce` / `outKgce`：能量收入与支出，给 ER0001 的收支表用（收入 = 外购 + 自产二次能源 + 回收；
 *   支出 = 消耗 + 转换 + 损失 + 外供）。这两列**相差不等于工序能耗**，别在页面上做减法。
 * - `netKgce` / `intensity`：GB 32045 的**工序能耗**，公式是
 *   `消耗 + 转换 + 损失 − 回收 − 离界能源产品`。
 *
 * 「离界能源产品」= 本工序自产、且没有在本工序烧掉的那部分折标（焦炭、外送的高炉/转炉煤气、
 * 外供汽、自发电）。它必须扣，否则精煤的能量会在「焦化消耗」和「炼铁消耗焦炭」两处各算一次，
 * 焦化会得出 1225 kgce/t 而标杆 75——客户拿行业公开值一比，整页就废了。
 *
 * ⚠️ `损失`（放散、管损）**留在本工序**：它计入消耗侧，也不进 `selfUse` 的抵减。
 * 把它一起扣走等于奖励放散——炼钢会假装很省、EP0005 的排名直接反转。
 */
export function plantEnergyBalance(effect: FlowEffect = {}) {
  const l = buildLedger(effect);
  return PLANT_UNITS.map((u) => {
    const acc = { income: 0, consume: 0, convert: 0, loss: 0, recover: 0, exported: 0 };
    const own = new Map<MediumCode, number>();
    const selfUse = new Map<MediumCode, number>();
    for (const f of l.flows.values()) {
      if (f.unitId !== u.id) continue;
      if (f.direction === "消耗") acc.consume += f.stdCoal;
      else if (f.direction === "转换") acc.convert += f.stdCoal;
      else if (f.direction === "损失") acc.loss += f.stdCoal;
      else if (f.direction === "回收") acc.recover += f.stdCoal;
      else if (f.direction === "外供") acc.exported += f.stdCoal;
      else acc.income += f.stdCoal;
      if (f.direction === "自产") own.set(f.mediaCode, (own.get(f.mediaCode) ?? 0) + f.stdCoal);
      if (f.direction === "消耗" || f.direction === "转换")
        selfUse.set(f.mediaCode, (selfUse.get(f.mediaCode) ?? 0) + f.stdCoal);
    }
    let credit = 0;
    own.forEach((v, m) => {
      credit += Math.max(0, v - (selfUse.get(m) ?? 0));
    });
    /* 焦炉化产品（焦油/粗苯/硫酸铵）同样是离开焦化的能源产品，但本域不建化产介质：
       只在焦化的扣减项里按每 t 焦的系数补一笔，不进任何介质平衡表。 */
    if (u.id === PLANTS.COKE) credit += l.prod.COKE * CHEM_PRODUCT_CREDIT_KGCE_T;
    /* MIG 是**中间介质**：(A2) 在烧它的厂里就地掺混、就地烧掉，BFG/COG 已按「转换」记过折标，
     * 而配比 0.593×0.114 + 0.407×0.571 ≡ 0.300 = MIG.stdCoal（见 MIG_BLEND 注释）——
     * 「消耗 MIG」与那两行「转换」是同一份能量。再计一遍，轧钢就是 88.8 kgce/t 而标杆 46。
     * 只抵减「本厂自产过的那部分」，所以将来若真出现纯购入 MIG 的厂也不会漏计。
     * 注意抵减项独立于 `acc.consume`：消耗列要照实反映账上流水，不能在页面上对不上平衡表。 */
    const migDouble = Math.min(own.get("MIG") ?? 0, selfUse.get("MIG") ?? 0);
    const product = PLANT_PRODUCT[u.id];
    /** 产量取**账上的** `l.prod`（含 `effect.outputs` 覆盖），不是静态 PRODUCTION——
     * 否则 EP0001 改了计划产量，单耗分子变了分母没变，工序能耗当场自相矛盾。 */
    const qtyT = l.prod[product] ?? 0;
    const netKgce = acc.consume + acc.convert + acc.loss - acc.recover - credit - migDouble;
    return {
      unitId: u.id,
      name: u.name,
      product,
      productName: productName(product),
      qtyT,
      ...acc,
      credit,
      migDouble,
      inKgce: acc.income + acc.recover,
      outKgce: acc.consume + acc.convert + acc.loss + acc.exported,
      netKgce,
      /** kgce/t 产品；无主产品的公辅厂为 0（不参与工序对标） */
      intensity: qtyT > 0 && BENCHMARKS[product] ? netKgce / qtyT : 0,
    };
  });
}

/** 厂级折标账（EP0005 考核、ER0001 统计、ER0002 对标的唯一算法） */
export function stdCoalByPlant(effect: FlowEffect = {}) {
  return plantEnergyBalance(effect);
}

/**
 * 吨钢综合能耗（kgce/t）：**净购入折标法**——厂界外购（洗精煤/电/天然气）折标 − 外供折标。
 * 这是节能监察与碳核查的口径，也是为什么必须补 `COAL` 这行介质（文件头第 1 条）。
 */
export function compositeIntensity(effect: FlowEffect = {}) {
  const l = buildLedger(effect);
  let purchased = 0;
  let exported = 0;
  for (const f of l.flows.values()) {
    if (f.direction === "购入") purchased += f.stdCoal;
    else if (f.direction === "外供") exported += f.stdCoal;
  }
  const steel = l.prod.STEEL;
  return {
    kgcePerTonSteel: (purchased - exported) / steel,
    purchasedTce: purchased / 1000,
    exportedTce: exported / 1000,
    steelT: steel,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   7. 派生层 (D)(E)(G) 煤气平衡 / 放散 / 自发电
   ══════════════════════════════════════════════════════════════════════════ */

export interface GasLine {
  media: MediumCode;
  name: string;
  color: string;
  incomeM3: number;
  /** 工序消耗（不含发电与放散） */
  processUseM3: number;
  genUseM3: number;
  exportM3: number;
  ventM3: number;
  ventRatePct: number;
  incomeM3h: number;
  /** 管网净可用（发生 − 放散），柜位瞬时流量的月账基准 */
  availM3h: number;
}

function gasLine(l: Ledger, media: MediumCode): GasLine {
  const ventUnit = media === "BFG" ? PLANTS.IRON : media === "COG" ? PLANTS.COKE : PLANTS.STEEL;
  const income = incomeOf(l, media);
  const genUse = get(l, PLANTS.GEN, media, "消耗");
  const vent = [...l.flows.values()]
    .filter((f) => f.mediaCode === media && f.direction === "损失" && f.unitId === ventUnit)
    .reduce((s, f) => s + f.qty, 0);
  const exportM3 = sumMedia(l, media, "外供");
  const processUse =
    [...l.flows.values()]
      .filter(
        (f) => f.mediaCode === media && (f.direction === "消耗" || f.direction === "转换") && f.unitId !== PLANTS.GEN,
      )
      .reduce((s, f) => s + f.qty, 0) - exportM3;
  return {
    media,
    name: MEDIUMS[media].name,
    color: MEDIUMS[media].color,
    incomeM3: income,
    processUseM3: processUse,
    genUseM3: genUse,
    exportM3,
    ventM3: vent,
    ventRatePct: income > 0 ? (vent / income) * 100 : 0,
    incomeM3h: income / MONTH_HOURS,
    availM3h: (income - vent) / MONTH_HOURS,
  };
}

export function gasBalance(effect: FlowEffect = {}) {
  const l = buildLedger(effect);
  const bfg = gasLine(l, "BFG");
  const cog = gasLine(l, "COG");
  const ldg = gasLine(l, "LDG");
  const income = bfg.incomeM3 + cog.incomeM3 + ldg.incomeM3;
  const vent = bfg.ventM3 + cog.ventM3 + ldg.ventM3;
  return {
    bfg,
    cog,
    ldg,
    ventTotalM3: vent,
    ventTotalRatePct: income > 0 ? (vent / income) * 100 : 0,
    incomeTotalM3: income,
  };
}

/** 全口径煤气小时流量（EM0002 管网示意的基线） */
export function gasHourlyFlows(effect: FlowEffect = {}) {
  const g = gasBalance(effect);
  return {
    bfg: { in: g.bfg.incomeM3h, out: g.bfg.availM3h, vent: g.bfg.ventM3 / MONTH_HOURS },
    cog: { in: g.cog.incomeM3h, out: g.cog.availM3h, vent: g.cog.ventM3 / MONTH_HOURS },
    ldg: { in: g.ldg.incomeM3h, out: g.ldg.availM3h, vent: g.ldg.ventM3 / MONTH_HOURS },
  };
}

/**
 * 柜位基线与瞬时流量（实时层的「中心」）。
 * 同介质多柜按柜容比例分流量——两柜并联运行就是这个行为。
 */
export function holderBases(effect: FlowEffect = {}): GasHolder[] {
  const f = gasHourlyFlows(effect);
  return HOLDER_ROWS.map((r) => {
    const pool = f[r.media.toLowerCase() as "bfg" | "cog" | "ldg"];
    const share = r.capM3 / HOLDER_ROWS.filter((x) => x.media === r.media).reduce((s, x) => s + x.capM3, 0);
    return {
      id: r.id,
      name: r.name,
      mediaCode: r.media as GasHolder["mediaCode"],
      capM3: r.capM3,
      levelPct: r.base,
      /* 月均口径下柜位是稳态的：进 ≡ 出。放散阀就在柜顶，**放散是柜的一条出口**，
       * 所以出气 = 用户可用 + 放散。若只算「可用量」，LDG 柜会永远净进 208 m³/min，
       * 与均值回归的基线自相矛盾——客户拿管网示意两页一减就看出这个洞。 */
      inFlow: Math.round(((pool.out + pool.vent) * share) / 60),
      outFlow: Math.round(((pool.out + pool.vent) * share) / 60),
      hiLimit: r.hi,
      loLimit: r.lo,
      basePct: r.base,
      history: Array.from({ length: 60 }, () => r.base),
    };
  });
}

/** 自发电明细（EM0001 机组柱图、EO0001 自发电率、EP0004 电费的对账都读它） */
export function selfGeneration(effect: FlowEffect | Ledger = {}) {
  const l = isLedger(effect) ? effect : buildLedger(effect);
  /* ⚠️ 电量**从账上读**，不在这里重算一遍效率。
   * 先前版本用「燃料 × 42% ÷ 3.6」现算，与 residualGasGen 的分机组气耗率是两套口径，
   * 于是 EM0001 的机组柱图与 EP0004 的自发电量对不上（差 15%）。
   * 现在唯一真源是账：CCPP = GEN 的 BFG 消耗 − CFB 燃料，各除各的气耗率。 */
  const genBfgTotal = get(l, PLANTS.GEN, "BFG", "消耗");
  const runCfb = Math.min(l.cfbRunning, CFB_UNITS);
  const ccf = runCfb * CFB_GAS_M3_H * MONTH_HOURS;
  const cfbFuelReal = Math.min(ccf, genBfgTotal);
  const cfbPer = GEN_UNITS[1].per;
  const cfbCapKwh = GEN_UNITS[1].maxMw * 1000 * MONTH_HOURS * runCfb;
  const cfbKwh = Math.min(cfbFuelReal / cfbPer, cfbCapKwh);
  const ccppFuel = Math.max(0, genBfgTotal - cfbFuelReal);
  const ccppKwh = ccppFuel / CCPP_BFG_PER_KWH;
  /* GEN_UNITS 的下标 1、2 才是 CFB（0 是 CCPP），所以「第 i 台在转」的条件是 `i <= runCfb`。
   * 曾写成 `i <= cfbRunning - 1`：投 1 台时 1#CFB 恰好落在 i=1 > 0 被判停役，
   * 账上有燃料、明细里 0MW——EM0001 的机组柱图和自发电量当场对不上。 */
  const units = GEN_UNITS.map((u, i) => {
    const isCcpp = i === 0;
    const kwh = isCcpp ? ccppKwh : i <= runCfb ? cfbKwh / Math.max(1, runCfb) : 0;
    const fuel = isCcpp ? ccppFuel : i <= runCfb ? cfbFuelReal / Math.max(1, runCfb) : 0;
    /* 「负荷率」在两类机组上不是一回事，别拿同一个公式套：
     *  · CCPP 是纯燃煤气机组 ⇒ 煤气消纳率与 `kwh ÷ 铭牌出力` 恒等（气电一体，看哪个都一样）。
     *  · CFB 是**燃煤锅炉掺烧高炉煤气**：25MW 铭牌里只有约一半由煤气贡献，其余是煤粉，
     *    所以它的调度指标只能是「掺烧消纳率」= 实际煤气量 ÷ 单炉掺烧上限。
     *  B3 同时给了 4.5万m³/h、130t/h 汽、25MW 三个数，只有按掺烧解释才互洽（文件头第 9 条）。
     *  煤粉那部分的电量**不进自发电率**——它烧的是外购煤，记成余能回收就是把成本算成收益。 */
    const gasCapM3 =
      (isCcpp ? u.maxMw * 1000 * MONTH_HOURS * u.per : CFB_GAS_M3_H * MONTH_HOURS) * (isCcpp || i <= runCfb ? 1 : 0);
    return {
      id: u.id,
      name: u.name,
      media: u.media,
      running: isCcpp || i <= runCfb,
      fuelM3: fuel,
      gasCapM3,
      cogM3: isCcpp ? get(l, PLANTS.GEN, "COG", "消耗") : 0,
      kwh,
      mw: kwh / MONTH_HOURS / 1000,
      maxMw: u.maxMw,
      loadRatio: gasCapM3 ? fuel / gasCapM3 : 0,
      per: u.per,
      note: u.ramp,
    };
  });
  const recoveries = RECOVERY_GEN.map((r) => {
    const kwh = [...l.flows.values()]
      .filter((f) => f.unitId === r.unitId && f.mediaCode === "ELEC" && f.direction === "回收")
      .reduce((a, f) => a + f.qty, 0);
    return { id: r.id, name: r.name, kwh };
  });
  const gasKwh = get(l, PLANTS.GEN, "ELEC", "自产");
  const recoverKwh = recoveries.reduce((a, r) => a + r.kwh, 0);
  const plantUse = get(l, PLANTS.GEN, "ELEC", "消耗");
  const consume = sumMedia(l, "ELEC", "消耗");
  return {
    units,
    recoveries,
    gasKwh,
    recoverKwh,
    grossKwh: gasKwh + recoverKwh,
    /** 供电量（扣厂用电）——自发电率用它，B3 的「供电 1.1 亿 kWh」同口径 */
    totalKwh: gasKwh + recoverKwh - plantUse,
    plantUseKwh: plantUse,
    purchaseKwh: get(l, PLANTS.POWER_AUX, "ELEC", "购入"),
    consumeKwh: consume,
    selfGenRatePct: consume > 0 ? ((gasKwh + recoverKwh - plantUse) / consume) * 100 : 0,
  };
}

/** CFB 总台数（2# 备用是「点炉消纳」这条调度的前提，见 CFB_RUNNING_BASE） */
const CFB_UNITS = 2;

function isLedger(x: FlowEffect | Ledger): x is Ledger {
  return x instanceof Object && "flows" in x && "prod" in x;
}

/* ══════════════════════════════════════════════════════════════════════════
   8. 派生层 (F) 分时电量
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 分时电量：把**当月外购电量**按 24 点负荷曲线的形状摊到各小时，再按时段计价。
 * 摊的是外购量而不是全厂耗电量——总降表计量的就是外购，自发电不过电表、不产生电费。
 * 曲线形状（`LOAD_CURVE_MW`）× 时段表（`ELEC_PRICE`）共同决定结果，
 * 所以 EM0001 的峰谷底色、需量告警与 EP0004 的分时电费明细天然一致。
 */
export function elecTimeUse(effect: FlowEffect = {}) {
  const l = buildLedger(effect);
  const total = sumMedia(l, "ELEC", "消耗");
  const purchase = get(l, PLANTS.POWER_AUX, "ELEC", "购入");
  const scale = loadScaleOf(purchase);
  const tiers = ELEC_PRICE.tiers.map((t) => ({
    tier: t.tier,
    price: t.price,
    hours: t.hours.join("、"),
    qtyKWh: 0,
    amount: 0,
  }));
  /** 每个小时点代表当月 30 个自然小时；Σ 恰等于 `purchase`，所以电价表与曲线不会各说各话 */
  const hourlyKWh = LOAD_CURVE_MW.map((mw) => mw * 1000 * scale * (MONTH_HOURS / 24));
  hourlyKWh.forEach((kwh, h) => {
    const t = tiers.find((x) => x.tier === hourToTier(h))!;
    t.qtyKWh += kwh;
    t.amount += kwh * t.price;
  });
  const energyAmount = tiers.reduce((s, t) => s + t.amount, 0);
  const maxMw = Math.max(...LOAD_CURVE_MW) * scale;
  return {
    /** 全厂耗电量（含自发自用），给「吨钢电耗」这类口径用 */
    totalKWh: total,
    /** 外购电量——电费与需量的分母 */
    purchaseKWh: purchase,
    /** 外购度电均价（元/kWh）：分时加权，不含需量与力调 */
    avgPrice: purchase > 0 ? energyAmount / purchase : 0,
    /** 内结单价：全厂耗电统一按外购均价折算（自发电也照它内结，EP0004 的口径） */
    innerPrice: purchase > 0 ? energyAmount / purchase : 0,
    tiers,
    hourlyKWh,
    energyAmount,
    demandCharge: demandCharge(),
    pfAdjCharge: pfAdjCharge(),
    /** 电费合计 = 分时电量费 + 需量费 + 力调费 */
    totalAmount: energyAmount + demandCharge() + pfAdjCharge(),
    maxMw,
    minMw: Math.min(...LOAD_CURVE_MW) * scale,
    /** 最大负荷对应的需量利用率（EM0001 的需量告警条） */
    demandRatioPct: (maxMw * 1000) / ELEC_PRICE.demandKVA / 0.93,
  };
}

/** 加权电价（元/kWh），供成本与结算复用；含需量与力调摊薄 */
export function elecPrice(effect: FlowEffect = {}) {
  const e = elecTimeUse(effect);
  return { energy: e.avgPrice, allIn: e.totalAmount / (e.purchaseKWh || 1) };
}

/* ══════════════════════════════════════════════════════════════════════════
   9. 派生层 (H) 介质成本
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 厂 × 介质 成本（元）。电走分时加权均价并把需量/力调按电量摊到各厂；
 * 煤气/蒸汽/水走内结价；MIG 不算（它的成本由 BFG+COG 的转换行给出，算两次就重复了）。
 * EP0004 结算单、ER0001 成本报表、EO0001 大屏「吨钢能源成本」三处同源。
 */
export function mediumCost(effect: FlowEffect = {}) {
  const l = buildLedger(effect);
  const e = elecTimeUse(effect);
  const elecUse = sumMedia(l, "ELEC", "消耗");
  const fixed = e.demandCharge + e.pfAdjCharge;
  const rows: Array<{
    unitId: string;
    mediaCode: MediumCode;
    qty: number;
    price: number;
    amount: number;
    priceType: SettlementBill["items"][number]["priceType"];
  }> = [];
  for (const f of l.flows.values()) {
    if (f.direction !== "消耗" && f.direction !== "转换") continue;
    if (f.mediaCode === "MIG") continue;
    if (f.mediaCode === "ELEC") {
      const amount = f.qty * e.avgPrice + (elecUse > 0 ? (fixed * f.qty) / elecUse : 0);
      rows.push({ unitId: f.unitId, mediaCode: "ELEC", qty: f.qty, price: amount / f.qty, amount, priceType: "峰谷" });
    } else {
      const price = MEDIUMS[f.mediaCode].innerPrice ?? 0;
      rows.push({
        unitId: f.unitId,
        mediaCode: f.mediaCode,
        qty: f.qty,
        price,
        amount: f.qty * price,
        priceType: "内结",
      });
    }
  }
  const byMedium = new Map<MediumCode, number>();
  const byUnit = new Map<string, number>();
  rows.forEach((r) => {
    byMedium.set(r.mediaCode, (byMedium.get(r.mediaCode) ?? 0) + r.amount);
    byUnit.set(r.unitId, (byUnit.get(r.unitId) ?? 0) + r.amount);
  });
  const total = [...byUnit.values()].reduce((s, x) => s + x, 0);
  return {
    rows,
    byMedium,
    byUnit,
    total,
    perTonSteel: total / l.prod.STEEL,
    fixed,
    elecTotal: byMedium.get("ELEC") ?? 0,
  };
}

/**
 * 外购口径成本（元）：厂界**购入 × 价 − 厂界外供 × 价**。电走分时含费全单价
 * （即 `elecTimeUse().totalAmount`，需量与力调已经在里面），其余介质走内结价当外供结算价。
 *
 * 为什么单独一个函数：`mediumCost` 是**内结口径**——它把每一家厂的每一笔消耗都按内结价
 * 乘一遍，用来给 EP0004 出厂级结算单，合计必然是「全厂能源产值」量级（≈1800 元/t）。
 * 而客户口中的「吨钢能源成本」是**花出去的真钱**（≈860 元/t），只有外购−外供这一种算法。
 * 两者混在一个函数里，ER0001 与 EO0001 就会一个说 1801、一个说 860，正是文档禁止的页间矛盾。
 */
export function purchaseCost(effect: FlowEffect = {}) {
  const l = buildLedger(effect);
  const e = elecTimeUse(effect);
  let purchase = 0;
  let exported = 0;
  const byMedium = new Map<MediumCode, number>();
  for (const f of l.flows.values()) {
    if (f.direction !== "购入" && f.direction !== "外供") continue;
    /* 电只有一个真值：账单。用 `totalAmount` 而不是「购入量 × 均价」，
     * 免得均价的分母与这条 购入 行的口径差一点、电费就对不上 EP0004。 */
    const amount = f.mediaCode === "ELEC" ? e.totalAmount : f.qty * (MEDIUMS[f.mediaCode].innerPrice ?? 0);
    if (f.direction === "购入") purchase += amount;
    else exported += amount;
    byMedium.set(f.mediaCode, (byMedium.get(f.mediaCode) ?? 0) + (f.direction === "购入" ? amount : -amount));
  }
  const total = purchase - exported;
  return {
    purchase,
    export: exported,
    byMedium,
    elec: e.totalAmount,
    total,
    perTonSteel: total / l.prod.STEEL,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   10. 派生层 (I)(J)(K)(L) 实绩 / 平衡表 / 结算 / 考核
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 月实绩：厂 × 介质 × 方向 一条；日实绩 = 月量 ÷ 当月天数。
 * 日值**故意不叠加随机**——`recalcActual()` 重算的是统计节点层，
 * 若日值随机，重算一次页面就跳一遍数，客户会觉得数据不可靠。
 */
export function buildActualRecords(month = DEMO_MONTH, effect: FlowEffect = {}): ActualRecord[] {
  const l = buildLedger(effect);
  const out: ActualRecord[] = [];
  let seq = 0;
  const push = (f: Flow, granularity: "day" | "month", date: string, qty: number, source: ActualRecord["source"]) => {
    out.push({
      id: `ACT-${month.replace("-", "")}-${String(++seq).padStart(4, "0")}`,
      date,
      granularity,
      unitId: f.unitId,
      mediaCode: f.mediaCode,
      direction: f.direction,
      value: round(qty, 2),
      stdCoal: round(qty * MEDIUMS[f.mediaCode].stdCoal, 2),
      source,
      formulaTrace: granularity === "month" ? f.formula : undefined,
    });
  };
  for (const f of l.flows.values()) {
    const source: ActualRecord["source"] = f.quotaId ? "采集" : "公式";
    push(f, "month", `${month}-01`, f.qty, source);
    /* 日实绩 = 月量 ÷ **已过天数**（不是 ÷30）：除以 30 会让「日均 × 30 = 月量」在页面上对不上，
       而日行的日期标在 09-30 更是直接穿过演示时钟。 */
    push(
      f,
      "day",
      month === DEMO_MONTH ? DEMO_YESTERDAY : `${month}-${String(MONTH_DAYS).padStart(2, "0")}`,
      f.qty / (month === DEMO_MONTH ? MONTH_ELAPSED_DAYS : MONTH_DAYS),
      source,
    );
  }
  return out;
}

/**
 * 月度平衡表：行=工序，列=收入/转换/消耗/外供/损失/平衡差。
 *
 * **收入列是「分配获得量」，不是本工序的自产量**——这是本函数唯一需要解释的口径选择：
 * 供应侧（自产/购入/回收）全站只有一个计量口径，用户侧是各工序各自的受入计量，
 * 所以「焦化厂 COG 收入 = 它自己产的那 6174 万」和「烧结厂 COG 收入 = 它烧掉的 378 万」
 * 不在同一个网络上，逐行相减得到的负数（曾经就是这么算的：烧结 −378 万、电厂 +9577 万）
 * 既不是损失也不是误差，客户一眼就看穿。**入网量按受入占比分配到各工序**，逐行才读得出
 * 「这个工序拿到了多少、用了多少、差多少」。本工序自己的入网量单列在 `supply`，
 * 谁供的气一目了然，合计行仍满足 Σsupply = Σ收入。
 *
 * **损失列建表时恒为 0，平衡差 = 收入 − 转换 − 消耗 − 外供**。放散与管损在现场是**估算量**
 * （柜存差、机组消纳差），ledger 里它们以残差形式记在损失方向；平衡表不预设归属，
 * 而是让它整列显形为「平衡差」，再由 `distributeBalance` 按受入占比摊进损失列——
 * 「▶ 执行平衡分摊」这个动作因此有真实的可演示内容（LDG ≈ 1796 万 m³、蒸汽 ≈ 8 万 t、
 * 氧氮氩与新水各是它的管损），而不是把 0 摊成 0。
 * 没有管网损失的介质（电、混合煤气、固体燃料）供受两侧闭合，平衡差恒为 0，
 * 分摊按钮在那些页回「无需分摊」——**这也是对的**，硬造一个非零差值才会被追问。
 */
export function buildBalanceSheet(month = DEMO_MONTH, effect: FlowEffect = {}): BalanceSheet[] {
  const l = buildLedger(effect);
  const all = [...l.flows.values()];
  return MEDIUM_LIST.filter((m) => m.balanceParticipate).map((m) => {
    const mc = m.code;
    const at = (unitId: string, dir: FlowDirection) =>
      all
        .filter((f) => f.unitId === unitId && f.mediaCode === mc && f.direction === dir)
        .reduce((s, f) => s + f.qty, 0);
    /** 受入量 = 该工序从这个网络上取走的一切（含掺烧转换与出厂外供） */
    const raw = PLANT_UNITS.map((u) => {
      const consume = at(u.id, "消耗");
      const convert = at(u.id, "转换");
      const exportOut = at(u.id, "外供");
      return {
        unitId: u.id,
        supply: at(u.id, "自产") + at(u.id, "购入") + at(u.id, "回收"),
        draw: consume + convert + exportOut,
        consume,
        convert,
        exportOut,
      };
    });
    const supplyTotal = raw.reduce((s, r) => s + r.supply, 0);
    const drawTotal = raw.reduce((s, r) => s + r.draw, 0);
    const rows: BalanceSheet["rows"] = raw.map((r) => {
      const income = drawTotal > 0 ? (supplyTotal * r.draw) / drawTotal : r.supply;
      return {
        unitId: r.unitId,
        supply: round(r.supply, 2),
        income: round(income, 2),
        convert: round(r.convert, 2),
        consume: round(r.consume, 2),
        exportOut: round(r.exportOut, 2),
        loss: 0,
        /** 差值在**取整后**的展示值上算，页面里的横式才逐行成立（先减后舍会出现 0.01 的假差） */
        diff: round(round(income, 2) - r.convert - r.consume - r.exportOut, 2),
      };
    });
    return {
      id: `BLN-${month.replace("-", "")}-${mc}`,
      month,
      mediaCode: mc,
      rows,
      balanced: false,
      unit: DISP[mc].unit,
    };
  });
}

/** 受入量（分摊权重）：损失跟着「谁用得多」走，不跟着「谁产得多」走 */
const drawOf = (r: BalanceSheet["rows"][number]) => r.consume + r.convert + r.exportOut;

/**
 * 平衡分摊：**把总残差按受入量占比摊进损失列，逐行取整后由末位有用量行兜余数**。
 *
 * 本表收入即按受入占比分配，所以各工序平衡差与它的受入量**本就同比例**
 * （`diff_i = draw_i·(ΣS/Σdraw − 1)`），逐行归入损失列 = 按占比分摊，两者数值一致。
 * 写成 `share_i = diff_i` 而不是 `R·w_i/W` 是为了**消掉舍入噪声**：按占比逐行取整后，
 * 各行之和与 R 会差 1e-2 量级，客户把表放大一格就看到「摊完还差 0.01」，可信度当场崩；
 * 而行差已经是 2 位小数，它们的和就是 R，整表一次闭合、每行 `diff` 精确为 0。
 * 收入 ≤ 受入的行（残差为 0 的闭合介质）摊完还是 0，等于没动——所以那几页回「无需分摊」。
 *
 * 三条禁令（code review 卡点）：
 * 1. 禁止写 `income` / `consume` / `convert` / `exportOut`——它们是「产量 × 定额」的恒等结果，
 *    动了就破坏与 EP0002 的一致性；
 * 2. 禁止写 `ActualRecord.value`——实绩是账，平衡表是账的另一种看法，分摊只是把损失归位；
 * 3. 受入量合计 ≤ 0 时**不许**摊（无管网介质硬摊会把残差塞给唯一一行），直接回原表并标未平衡。
 * 结果：每行 diff=0 且 Σ 收入/消耗/转换/外供分毫不动，Σ损失 增加量恰等于原 Σ平衡差。
 */
export function distributeBalance(sheet: BalanceSheet): BalanceSheet {
  const R = round(
    sheet.rows.reduce((s, r) => s + r.diff, 0),
    2,
  );
  const weight = sheet.rows.reduce((s, r) => s + drawOf(r), 0);
  if (weight <= 0) {
    return {
      ...sheet,
      balanced: false,
      balanceRule: `该介质无受入计量工序，${fmtNum(R)} ${sheet.unit} 残差无法按用量分摊——需先补消耗侧计量`,
    };
  }
  const lastUser = sheet.rows.findLastIndex((r) => drawOf(r) > 0);
  let others = 0;
  const rows = sheet.rows.map((r, i) => {
    if (drawOf(r) <= 0) return { ...r, diff: round(r.diff, 2) };
    const share = i === lastUser ? round(R - others, 2) : r.diff;
    if (i !== lastUser) others = round(others + share, 2);
    return { ...r, loss: round(r.loss + share, 2), diff: round(r.diff - share, 2) };
  });
  return {
    ...sheet,
    rows,
    balanced: true,
    balanceRule:
      R === 0
        ? "供受两侧计量闭合，平衡差为 0，无需分摊"
        : `总残差 ${fmtNum(round(R / DISP[sheet.mediaCode].scale, 2))} ${sheet.unit}（= 本月放散与管损估算量）按各工序受入量占比摊入损失列，末位有用量行兜余数；收入、转换、消耗、外供四列锁定`,
  };
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** 成本中心结算单。定稿后门控实绩校正由 store 的状态位实现，这里只出账。 */
export function computeSettlement(month = DEMO_MONTH, effect: FlowEffect = {}): SettlementBill[] {
  const c = mediumCost(effect);
  return PLANT_UNITS.filter((u) => (c.byUnit.get(u.id) ?? 0) > 0).map((u, i) => {
    const items = c.rows
      .filter((r) => r.unitId === u.id)
      .map((r) => ({
        mediaCode: r.mediaCode,
        qty: round(r.qty, 2),
        price: round(r.price, 4),
        priceType: r.priceType,
        amount: round(r.amount, 2),
      }));
    return {
      id: `ST-${month.replace("-", "")}-${u.id.replace("EU-", "")}`,
      month,
      unitId: u.id,
      items,
      extraFee: round(
        items.some((x) => x.mediaCode === "ELEC") ? (c.fixed * (c.byUnit.get(u.id) ?? 0)) / (c.total || 1) : 0,
        2,
      ),
      total: round(
        items.reduce((s, it) => s + it.amount, 0),
        2,
      ),
      /**
       * 新算出来的结算单一律是「已生成」。**这里是状态机的起点，不是演示数据的编排处**：
       * 曾经按 `i<2` 把前两张直接标成已定稿，于是 bootstrap 出来的当月账第一天就锁死——
       * 「▶ 重算昨日实绩」「▶ 生成本月结算」全被 B2.5 的门控拒在第一步，演示最想看的那句
       * 「结算已定稿，禁止校正实绩」反而**没有场景能演**。定稿状态由 `store.settleStatus()`
       * 走三步流程给，上月账整月定稿由 bootstrap 显式覆盖。
       */
      status: "已生成" as const,
      createdBy: PEOPLE.settle,
      confirmedBy: undefined,
      finalizedBy: undefined,
      createdAt: stampOf(i * 3600_000),
    };
  });
}

/**
 * 考核评分：基准分 100 ± 偏差档数 × 10，**一个档 = 设计值到标杆值的那段跨度**。
 *
 * 为什么用跨度而不是 `|design|` 当分母（原实现）：
 *  - 转炉工序的能耗**本来就是负的**（回收煤气折标 > 消耗），GB 32045 给的设计值 −20、
 *    标杆值 −30。拿 `|−20|` 当 100% 的话，多耗 16.65 kgce 就是「超标 83%」，
 *    炼钢厂被判 −66.5 分——分数量程直接爆掉，而现场这条偏差只值一次考核谈话。
 *  - 焦化同理：实际 61 优于设计 120 一半，按比值算是 +73.7 加分、总分 173.7，
 *    没有任何企业的考核办法会给出一百七十几分。
 *  - `design → benchmark` 正是国标里「合格」到「先进」的那一档，跨度是有物理含义的，
 *    拿它当尺子既能跨工序横向比较（负能耗工序与正能耗工序同一把尺），也讲得出依据。
 *
 * 量程封顶 110 / 封底 60：考核办法都设封顶，不然一个异常低的月份能把排名彻底拉花。
 * 定额来自 `QUOTAS`、标杆来自 `BENCHMARKS`，EP0001 / EP0005 / ER0002 三页共用同一批数。
 */
export function computeAssess(effect: FlowEffect = {}): AssessRow[] {
  const rows: AssessRow[] = stdCoalByPlant(effect)
    .filter((p) => BENCHMARKS[p.product])
    .map((p) => {
      const bm = BENCHMARKS[p.product];
      const actual = round(p.intensity, 2);
      /** 设计值到标杆值的跨度；两者相等（或写反）时退化成 1，避免除零 */
      const span = Math.abs(bm.design - bm.benchmark) || 1;
      /** 偏差档数：正 = 优于设计值，负 = 劣于设计值 */
      const steps = (bm.design - actual) / span;
      const deduction = round(Math.max(0, -steps) * ASSESS_STEP_SCORE, 1);
      const bonus = round(Math.max(0, steps) * ASSESS_STEP_SCORE, 1);
      return {
        unitId: p.unitId,
        mediaCode: "STD" as const,
        product: p.productName,
        actual,
        quota: bm.design,
        benchmark: bm.benchmark,
        score: round(clampPct(100 - deduction + bonus, ASSESS_FLOOR, ASSESS_CEIL), 1),
        rank: 0,
        deduction,
        bonus,
      };
    });
  const ranked = rows.toSorted((a, b) => b.score - a.score);
  ranked.forEach((r, i) => {
    r.rank = i + 1;
  });
  return ranked;
}

/** 全厂综合能耗对标行（EP0005 顶部的「全厂」一行） */
export function computeCompositeAssess(effect: FlowEffect = {}) {
  const c = compositeIntensity(effect);
  const bm = BENCHMARKS.COMPOSITE;
  return {
    actual: round(c.kgcePerTonSteel, 1),
    benchmark: bm.benchmark,
    access: bm.access,
    design: bm.design,
    gapPct: round(((c.kgcePerTonSteel - bm.benchmark) / bm.benchmark) * 100, 1),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   11. 派生层 (M) KPI 聚合
   ══════════════════════════════════════════════════════════════════════════ */

/** 大屏 / KPI 看板 / 能源首页的唯一聚合口 */
export function kpiBoard(effect: FlowEffect = {}) {
  const l = buildLedger(effect);
  const g = gasBalance(effect);
  const s = selfGeneration(l);
  const e = elecTimeUse(effect);
  const net = purchaseCost(effect);
  const comp = compositeIntensity(effect);
  return {
    month: DEMO_MONTH,
    ventRatePct: round(g.ventTotalRatePct, 2),
    bfgVentRatePct: round(g.bfg.ventRatePct, 2),
    ventTotalM3: Math.round(g.ventTotalM3),
    selfGenRatePct: round(s.selfGenRatePct, 1),
    selfGenKwh: Math.round(s.totalKwh),
    purchaseKwh: Math.round(s.purchaseKwh),
    genMw: Math.round(s.units.reduce((a, u) => a + u.mw, 0)),
    compositeKgce: round(comp.kgcePerTonSteel, 1),
    elecPerTonSteel: round((l && sumMedia(l, "ELEC", "消耗")) / l.prod.STEEL, 1),
    /** 外购口径（真金白银），不是 EP0004 那张内结结算单的合计；见文件头第 8 条 */
    costPerTonSteel: round(net.perTonSteel, 1),
    costInnerPerTonSteel: round(mediumCost(effect).perTonSteel, 1),
    ldgRecoveryM3PerTon: round(get(l, PLANTS.STEEL, "LDG", "回收") / l.prod.STEEL, 1),
    elecAmount: Math.round(e.totalAmount),
    energyPurchasedTce: round(comp.purchasedTce, 0),
    maxMw: e.maxMw,
    demandRatioPct: round(e.demandRatioPct * 100, 1),
    steelT: l.prod.STEEL,
    targets: KPI_TARGETS,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   12. 瞬时层：what-if 与调度建议（纯函数，绝不写月账）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 瞬时煤气情景。`simulateGasBalance()` 是**纯函数 + 自己的瞬时口径**：读月账基线、
 * 叠加假设量、返回结果，**不写 flows / 不写实绩 / 不写结算**——滑杆拖一下就把月账污染了，
 * 是 EM0007 这页最大的翻车风险（文件头「两层时钟」第 3 条）。
 */
export interface GasScenario {
  /** 关注介质；省略时按增量落在哪一路推断（默认 LDG——本域的富余主线在转炉气上） */
  media?: GasMedia;
  /** 追加转炉煤气瞬时进气 m³/min（吹炼高峰） */
  extraLdgM3min?: number;
  /** 追加 BFG 瞬时发生 m³/min（高炉坐料/休风恢复） */
  extraBfgM3min?: number;
  /** CCPP 目标出力 MW（默认当前派生值） */
  ccppMw?: number;
  /** CFB 投运台数 0/1/2 */
  cfbUnits?: number;
  /** 烧结点火炉用气变化 %：**正=多用气（消纳富余、减放散）**，负=减量（缺气时保高炉保序）。
   *  限时 30min，是需求侧最快的一条。 */
  sinterUsePct?: number;
  /** **实时柜位**（%）。tick 与剧本驱动的是 store 里的柜位，不是月账基线，
   *  所以 what-if 必须把它传进来——用基线算，柜位涨到 88% 时倒计时仍按 62% 给，幕 2 就假了。 */
  levelPct?: number;
  /** 关注的柜 id（默认 1#LDG 柜） */
  holderId?: string;
}

export function simulateGasBalance(sc: GasScenario = {}) {
  const base = gasBalance();
  const s = selfGeneration();
  const ccpp = s.units.find((u) => u.id === "GU-CCPP")!;
  const per = GEN_UNITS[0].per;
  const ccppMw = sc.ccppMw ?? ccpp.mw;
  const cfbUnits = sc.cfbUnits ?? CFB_RUNNING_BASE;
  const sinterDeltaPct = (sc.sinterUsePct ?? 0) / 100;

  /* 关注介质：给了显式 `media` 就照它，否则按增量落在哪一路推断。只靠 extraLdgM3min 推断的话，
   * 「看基线状态下 LDG 柜」这种情景根本表达不出来，EM0007 的介质切换器也就没法工作。 */
  const media: GasMedia = sc.media ?? (sc.extraBfgM3min ? "BFG" : "LDG");
  const holderId = sc.holderId ?? (media === "LDG" ? "GH-LDG1" : media === "COG" ? "GH-COG1" : "GH-BFG1");
  const holder = holderBases().find((h) => h.id === holderId)!;
  const line = media === "BFG" ? base.bfg : media === "COG" ? base.cog : base.ldg;
  const extra = media === "LDG" ? (sc.extraLdgM3min ?? 0) : media === "BFG" ? (sc.extraBfgM3min ?? 0) : 0;

  /* 消纳增量：CCPP 只对 BFG 有效（燃气轮机的燃烧室吃不下 LDG 这种低热值气）；
   * 备用 CFB 点起来烧哪一路，由「谁在放散」决定——LDG 除了热风炉/烧结点火没有别的用户，
   * 新增那台就优先吃 LDG（与 BFG 混合进炉，现场正是这么消化转炉富余气的）。
   * 已在运行的那台仍烧账上的 BFG，所以只算**超出基线台数**的增量：把 1# 的消纳能力
   * 重复许给 LDG，等于凭空多出一倍消纳量，幕 7 的倒计时就成假的。 */
  const newCfbM3min = (Math.max(0, cfbUnits - CFB_RUNNING_BASE) * CFB_GAS_M3_H) / 60;
  const inM3min = line.incomeM3h / 60 + extra;
  const useM3min = line.processUseM3 / MONTH_MINUTES + (line.processUseM3 / MONTH_MINUTES) * sinterDeltaPct;
  const runBaseM3min = (Math.min(cfbUnits, CFB_RUNNING_BASE) * CFB_GAS_M3_H) / 60;
  /* 新点的那台烧谁的气，取决于**本情景关注哪一路在放散**（COG 例外：它由 CCPP 稳燃与外供消化，
     CFB 不用焦炉气）。把备用能力只许给 LDG，BFG 侧的 R2 就会算成 0 削减——建议与仿真对不上。 */
  const extraSinkM3min = media === "COG" ? 0 : newCfbM3min;
  const sinkM3min = (media === "BFG" ? (ccppMw * 1000 * per) / 60 + runBaseM3min : 0) + extraSinkM3min;
  const surplusM3min = inM3min - useM3min - sinkM3min;

  /* 富余不等于立刻放散：柜组先按升降速率上限吸收，超出这条线的气才去烧放散塔。
   * 同介质的柜是并联的，速率与可充容量都按**整组**算——按单柜算会把一半富余直接推给放散，
   * `netFillM3min` 恒为 0、`minutesToHigh` 恒为 null，幕 2 的触顶倒计时就没东西可播了。 */
  const group = holderBases().filter((h) => h.mediaCode === media);
  const levelPct = sc.levelPct ?? holder.levelPct;
  /**
   * 进柜能力随柜位**线性退坡**，不是「到 100% 才关」。放散阀由柜位高位与管网压力联锁开启，
   * 现场不会等柜充到物理满柜才放散——那已经没有缓冲迎接下一炉吹炼高峰了。
   * 从 `hiLimit − HOLDER_VENT_TAPER_PCT` 起关小，到高限完全不进柜。
   * 这条退坡线就是幕 2 里「柜位 88% 已经开始放散」的全部依据；写成 `>= hiLimit ? 0 : 满速`
   * 的阶跃，剧本爬到 88% 时 `ventM3min` 恒为 0，幕 3 的削减量与幕 8 的「放散率下降」就都无从算起。
   */
  const taper = clampPct((holder.hiLimit - levelPct) / HOLDER_VENT_TAPER_PCT, 0, 1);
  const fillCapM3min = (group.reduce((a, h) => a + h.capM3, 0) * HOLDER_RATE_PCT_MIN * taper) / 100;
  const headroomM3 = group.reduce((a, h) => a + Math.max(0, h.hiLimit - levelPct) * 0.01 * h.capM3, 0);
  const fillM3min = Math.max(0, Math.min(surplusM3min, fillCapM3min));
  const ventM3min = Math.max(0, surplusM3min - fillM3min);
  return {
    media,
    holderId,
    holderName: holder.name,
    levelPct,
    hiLimitPct: holder.hiLimit,
    ventM3min: Math.round(ventM3min),
    ventM3h: Math.round(ventM3min * 60),
    /** 柜组正在吸收的量（m³/min）：为正=柜位在涨，为负=柜位在落（吃空柜存） */
    netFillM3min: Math.round(fillM3min),
    /** 柜组多久触顶（`null` = 不在上涨）。R2 的 40min 升负荷时滞就是和它比。
     *  用取整后的值判正负：BFG 侧的富余是浮点残差（≈1e-9），不取整会给出一个 3.8e16 分钟的倒计时 */
    minutesToHigh: Math.round(fillM3min) > 0 ? Math.round(headroomM3 / Math.round(fillM3min)) : null,
    /** 月均放散——实时层的对照线，别与当班放散混（文件头「两层时钟」） */
    baseVentM3min: Math.round(
      media === "LDG" ? Math.max(0, base.ldg.incomeM3h / 60 - base.ldg.processUseM3 / MONTH_MINUTES) : bfgVentBase(),
    ),
    /** 瞬时富余（= 柜吸收 + 放散），EM0007 的「富余」条 */
    surplusM3min: Math.round(surplusM3min),
    fillCapM3min: Math.round(fillCapM3min),
    headroomM3: Math.round(headroomM3),
    ccppMw,
    ccppMaxMw: ccpp.maxMw,
    cfbUnits,
    /** 点起的备用 CFB 带来的新增消纳量（m³/min）——建议卡「点炉后每小时多消纳 4.5万m³」读它 */
    cfbNewSinkM3min: Math.round(extraSinkM3min),
    /** 需求侧增减量（m³/min，正=多用气）：建议卡 R3 的预计削减量读它 */
    sinterDeltaM3min: Math.round((line.processUseM3 / MONTH_MINUTES) * sinterDeltaPct),
    /** 该情景相对基线的月度增益（元）：由 `scenarioGain` 填，页面不自己算 */
    gainMonth: 0,
  };
}

function bfgVentBase() {
  const g = gasBalance();
  return Math.max(0, g.bfg.incomeM3h / 60 - g.bfg.processUseM3 / MONTH_MINUTES - g.bfg.genUseM3 / MONTH_MINUTES);
}

/**
 * 情景增益：同一个富余状态下「处置 vs 不处置」的放散差额，折成可发电量 × 分时均价
 * （幕 8「月增效」的算法，全站在这一处）。
 *
 * ⚠️ 基线必须是**同情景的未处置状态**，不是月均：拿 416 m³/min 的月均去比 1916 的峰吹放散，
 * 差额恒为 0（原实现就是这样，`scenarioGain()` 永远返回 0 度电 0 元），
 * 而剧本真正要展示的正是「这一手把多少气救了回来」。
 * 折算用**消纳它的那台机组的气耗率**（LDG 只有 CFB 这条路、BFG 优先顶 CCPP），
 * 不用统一净效率 42%——理由与 `residualGasGen` 里那条一样：铭牌一除就露馅。
 */
export function scenarioGain(sc: GasScenario = {}, unmitigated: GasScenario = sc) {
  /* 未处置基线由调用方给，默认就是本情景本身（滑杆只动处置旋钮时二者只差那几个参数）。
     ⚠️ 不能从 `sc` 反推：R4「放缓吹炼」改的正是**进气量**，从 sc 推基线会连进气一起
     采纳，得到 cut=0 —— 建议卡说省 4.5万、仿真说省 0，就是这种自相矛盾。
     柜位也必须一起给：放散只在柜满之后发生，拿 62% 的基线去比 90% 的情景恒为 0 增益。 */
  const base = simulateGasBalance(unmitigated);
  const sim = simulateGasBalance(sc);
  const cutM3h = Math.max(0, (base.ventM3min - sim.ventM3min) * 60);
  /**
   * 本手能多消纳多少气 = **富余量的下降幅度**，不是柜位变化的折算。
   * 为什么必须单独给这一列：柜组没满时 `ventM3min` 恒为 0（气先进柜），于是
   * 「放散削减」在幕 2 那 30 秒里三条建议齐刷刷是 0，而柜位的上涨速率确实在被这三手把手改掉。
   * 用富余差表达既能覆盖"入柜"和"放散"两段，又不会在柜满之后重复计量
   * （那时 surplus 的降幅 == vent 的降幅，两个数自然合流）。
   */
  const absorbM3h = Math.max(0, (base.surplusM3min - sim.surplusM3min) * 60);
  const per = sim.media === "LDG" ? CFB_GAS_PER_KWH : CCPP_BFG_PER_KWH;
  const kwh = cutM3h / per;
  const delayHighMin =
    base.minutesToHigh !== null && sim.minutesToHigh !== null
      ? Math.round((sim.minutesToHigh - base.minutesToHigh) * 10) / 10
      : null;
  return {
    media: sim.media,
    cutVentM3h: Math.round(cutM3h),
    absorbM3h: Math.round(absorbM3h),
    delayHighMin,
    extraKwh: Math.round(kwh),
    amount: Math.round(kwh * elecPrice().energy),
  };
}

/**
 * 一条调度建议。`⚠️ expectCutM3 / absorbM3h / gainAmount 不是铭牌能力，而是把这条建议的
 * scenario 叠加到**同一个未处置基线**上、用 `scenarioGain` 算出来的实际效果`——
 * 柜位没满时放散削减是 0（气还在往柜里充，本来就没放散），此时**能拿出手的数是
 * `absorbM3h`（本手多消纳多少气）与 `delayHighMin`（触顶倒计时被延后多久）**。
 * 这样建议卡上的数字与 EM0007 的 what-if 滑杆天然同源，不会出现「建议说省 4.5万、
 * 仿真说省 0」这种页间矛盾。
 */
export interface DispatchRule {
  rule: string;
  title: string;
  detail: string;
  /** 采纳后的放散削减量 m³/h（柜位未满时为 0，见 `absorbM3h`） */
  expectCutM3: number;
  /** 采纳后本手新增的消纳量 m³/h = 富余量下降幅度；柜位满之后与 `expectCutM3` 合流 */
  absorbM3h: number;
  /** 触顶倒计时被延后多少分钟；两态都算不出倒计时时为 null */
  delayHighMin: number | null;
  /** 采纳后的增效（元/小时） */
  gainAmount: number;
  delayMin: number;
  unitId: string;
  instruction: string;
  receiver: string;
  /** 采纳时叠加的增量；store 兑现 `pendingEffect` 与页面复算都读它 */
  scenario: GasScenario;
}

/**
 * 调度建议规则引擎（EM0007 / `suggestDispatch`）。规则号写进返回值，讲解时能指出「这条为什么出」。
 * 时滞是这条表的灵魂：CFB 点炉 40min——调度员最怕的就是「建议没错、下晚了」。
 *
 * `base` 就是当前的富余状态（含实时柜位与剧本增量），每条建议只是它的一个补丁。
 */
export function dispatchRules(base: GasScenario) {
  const sim = simulateGasBalance(base);
  const s = selfGeneration();
  const ccpp = s.units.find((u) => u.id === "GU-CCPP")!;
  const spareMw = Math.max(0, ccpp.maxMw - ccpp.mw);
  const out: DispatchRule[] = [];
  const mk = (
    rule: string,
    title: string,
    detail: string,
    delayMin: number,
    unitId: string,
    instruction: string,
    receiver: string,
    patch: GasScenario,
  ) => {
    const g = scenarioGain({ ...base, ...patch }, base);
    return {
      rule,
      title,
      detail,
      expectCutM3: g.cutVentM3h,
      absorbM3h: g.absorbM3h,
      delayHighMin: g.delayHighMin,
      gainAmount: g.amount,
      delayMin,
      unitId,
      instruction,
      receiver,
      scenario: { ...base, ...patch },
    };
  };
  /* R1 只对 BFG：燃气轮机的燃烧室吃不下低热值的转炉煤气，把它列为 LDG 的出路是外行话 */
  if (base.media === "BFG" && spareMw > 3)
    out.push(
      mk(
        "R1 柜位逼近高限且 CCPP 未满发",
        `CCPP 提负荷至满出力（+${Math.round(spareMw)}MW）`,
        `按气耗率 ${CCPP_BFG_PER_KWH.toFixed(2)} m³/kWh，满发可多消纳约 ${fmt(spareMw * 1000 * CCPP_BFG_PER_KWH)} m³/h；分钟级响应，最先执行`,
        5,
        PLANTS.GEN,
        `CCPP 负荷提至 ${ccpp.maxMw}MW 满出力`,
        PEOPLE.power,
        { ccppMw: ccpp.maxMw },
      ),
    );
  if ((base.media === "LDG" || base.media === "BFG") && CFB_RUNNING_BASE < CFB_UNITS)
    out.push(
      mk(
        "R2 存在备用 CFB 可点炉",
        `点起 ${CFB_RUNNING_BASE + 1}#CFB 锅炉（掺烧${base.media === "LDG" ? "转炉" : "高炉"}煤气）`,
        `投运后每小时多消纳 ${fmt(CFB_GAS_M3_H)} m³；升负荷时滞 40min，${sim.minutesToHigh !== null && sim.minutesToHigh < 40 ? `触顶倒计时 ${sim.minutesToHigh}min 已短于时滞，须同时执行 R1 并联系炼钢放缓加料` : "须在柜位触顶前下达"}`,
        40,
        PLANTS.GEN,
        `${CFB_RUNNING_BASE + 1}#CFB 锅炉点火升负荷至 130t/h`,
        PEOPLE.power,
        { cfbUnits: CFB_RUNNING_BASE + 1 },
      ),
    );
  /* R3 需求侧：点火炉提掺烧（正数=多用气）。方向别写反——富余告急时「减量」只会放散更多。 */
  out.push(
    mk(
      "R3 可调节用户提掺烧",
      `通知烧结厂点火炉提高${MEDIUMS[base.media].name}掺烧 20%（限时 30min）`,
      `点火炉按 ${MEDIUMS[base.media].name} 定额 ${QUOTA_ROWS.find((r) => r[0] === PLANTS.SINTER && r[1] === base.media)?.[4] ?? 0} ${MEDIUMS[base.media].unit}/t，提 20% 即时生效；比点炉快、比限产轻`,
      10,
      PLANTS.SINTER,
      `烧结点火炉${MEDIUMS[base.media].name}掺烧量提高 20%，限时 30 分钟`,
      PEOPLE.sinter,
      { sinterUsePct: 20 },
    ),
  );
  /* R4 源头削减：转炉煤气的富余只能靠吹炼节奏，机组和用戶都顶到头之后的最后一条 */
  if (base.media === "LDG" && (base.extraLdgM3min ?? 0) > 0)
    out.push(
      mk(
        "R4 源头削减（放缓吹炼）",
        "联系炼钢厂放缓加料节奏，下一炉推迟 10min",
        `按当前峰吹增量 ${fmt((base.extraLdgM3min ?? 0) * 60)} m³/h 减半估算；影响生产节奏，须与炼钢厂值班主任确认后下达`,
        15,
        PLANTS.STEEL,
        "放缓加料节奏，下一炉吹炼推迟 10 分钟，直至柜位回到 80% 以下",
        PEOPLE.steel,
        { extraLdgM3min: (base.extraLdgM3min ?? 0) / 2 },
      ),
    );
  return out;
}

/** 预测曲线（ER0003 / EM0007）：负荷曲线外推 + 置信带宽度，形状与月账同源 */
export function loadForecast(hours = 24, startHour = new Date(DEMO_T0).getHours()) {
  return Array.from({ length: hours }, (_, i) => {
    const h = (startHour + i) % 24;
    const v = LOAD_CURVE_MW[h];
    return { hour: h, mw: v, tier: hourToTier(h), band: Math.round(v * 0.04 * 10) / 10 };
  });
}

/** 煤气发生量预测（EM0007 的 4h 预测线）：小时基线 + 班制波动形状 */
export function gasForecast(hours = 24, startHour = new Date(DEMO_T0).getHours()) {
  const g = gasBalance();
  return Array.from({ length: hours }, (_, i) => {
    const h = (startHour + i) % 24;
    /** 吹炼是班制间歇过程：双峰时刻用气高、凌晨低，形状沿用负荷曲线，量级用煤气自身 */
    const shape = LOAD_CURVE_MW[h] / LOAD_CURVE_MW[12];
    return {
      hour: h,
      bfg: Math.round(g.bfg.incomeM3h * (0.96 + 0.02 * shape)),
      cog: Math.round(g.cog.incomeM3h * (0.98 + 0.02 * shape)),
      ldg: Math.round(g.ldg.incomeM3h * (0.7 + 0.6 * shape)),
    };
  });
}

const MONTH_MINUTES = MONTH_HOURS * 60;

/* ══════════════════════════════════════════════════════════════════════════
   13. 桑基 / 报表 / 计量点的派生入口（页面不自己算，一律走这里）
   ══════════════════════════════════════════════════════════════════════════ */

/** 能流网络（EO0003 桑基）：购入/自产 → 转换 → 消耗 → 回收/放散/外供，节点值全部来自 flows() */
const sankeyNodeName = (id: string, dir: FlowDirection) => `${UNIT_MAP[id]?.name ?? id}·${dir}`;

export function sankeyData(media: MediumCode, effect: FlowEffect = {}) {
  const l = buildLedger(effect);
  const nodes: Array<{ name: string; itemStyle?: { color: string } }> = [];
  const links: Array<{ source: string; target: string; value: number }> = [];
  for (const f of l.flows.values()) {
    if (f.mediaCode !== media) continue;
    if (f.direction === "自产" || f.direction === "购入") {
      nodes.push({ name: sankeyNodeName(f.unitId, f.direction) });
      links.push({
        source: MEDIUMS[media].name,
        target: sankeyNodeName(f.unitId, f.direction),
        value: Math.round(f.qty),
      });
    } else {
      const dirName = sankeyNodeName(f.unitId, f.direction);
      if (!nodes.some((n) => n.name === dirName)) nodes.push({ name: dirName });
      links.push({ source: MEDIUMS[media].name, target: dirName, value: Math.round(f.qty) });
    }
  }
  return {
    nodes: [{ name: MEDIUMS[media].name }, ...nodes],
    links,
    unit: DISP[media].unit,
    scale: DISP[media].scale,
  };
}

/** 区域能耗统计（ER0001 / EP0002 明细）：厂 × 介质 的月量与折标，直接给 grid 用。
 *  ⚠️ 折标与单耗**必须转调 `plantEnergyBalance`**，不能在这里再推一遍：本函数原来是
 *  「消耗+转换+损失−回收」，而工序能耗还要扣离界能源产品与 MIG 重复计量，
 *  于是 ER0001 说轧钢 88.8、EP0005 说 49.2——同一指标两个数，正是文档禁止的页间矛盾。 */
export function regionStat(effect: FlowEffect = {}) {
  const l = buildLedger(effect);
  const c = mediumCost(effect);
  const bal = new Map(plantEnergyBalance(effect).map((p) => [p.unitId, p]));
  return PLANT_UNITS.map((u) => {
    const own = [...l.flows.values()].filter((f) => f.unitId === u.id);
    const mediaAgg = new Map<MediumCode, number>();
    own.forEach((f) => {
      if (f.direction === "消耗" || f.direction === "转换")
        mediaAgg.set(f.mediaCode, (mediaAgg.get(f.mediaCode) ?? 0) + f.qty);
    });
    const p = bal.get(u.id)!;
    return {
      unitId: u.id,
      unitName: u.name,
      productName: p.productName,
      outputT: p.qtyT,
      mediaList: [...mediaAgg.entries()].map(([m, q]) => ({
        mediaCode: m,
        mediaName: MEDIUMS[m].name,
        qty: q,
        color: MEDIUMS[m].color,
      })),
      stdCoalTce: p.netKgce / 1000,
      intensity: p.intensity,
      cost: c.byUnit.get(u.id) ?? 0,
    };
  });
}

/** 同比/环比演示序列：月账快照 × 固定的历史偏移形状（历史不重算，避免每页刷新一遍数） */
export function monthSeries<T extends Record<string, number | string>>(current: T, months = 6) {
  /** 历史偏移：产能爬坡 + 冬季用汽，形状写死，讲解时「上月」永远是同一个数 */
  const HIST = [0.94, 0.96, 0.99, 1.01, 0.98, 1];
  return HIST.slice(-months).map((k, i) => {
    const row: Record<string, number | string> = { label: monthAgo(months - 1 - i) };
    Object.entries(current).forEach(([key, v]) => {
      row[key] = typeof v === "number" ? round(v * k, 2) : v;
    });
    return row;
  });
}

function monthAgo(back: number) {
  const [y, m] = DEMO_MONTH.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - back, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** 当前月（演示时钟） */
export const currentMonth = () => DEMO_MONTH;
export const monthList = () => ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

/* ══════════════════════════════════════════════════════════════════════════
   14. 自检（开发期跑；页面不调用）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 恒等式检查。`buildLedger()` 是全站唯一的「发生」点，所以这些断言同时覆盖了
 * 「平衡表收入列 ≡ 产量×定额」与「柜位中心 ≡ 月账流量」两件事。
 * 返回空数组 = 通过；非空说明某条定额被改坏了——**改数值后的第一道闸**。
 */
export function selfCheck(effect: FlowEffect = {}): string[] {
  const l = buildLedger(effect);
  const bad: string[] = [];
  const g = gasBalance(effect);
  const s = selfGeneration(l);
  const comp = compositeIntensity(effect);

  (
    ["BFG", "COG", "LDG", "STEAM", "WATER", "ELEC", "O2", "N2", "AR", "AIR", "COKE", "PULV", "MIG"] as MediumCode[]
  ).forEach((mc) => {
    const inc = incomeOf(l, mc);
    const out = useOf(l, mc, undefined) + sumMedia(l, mc, "损失");
    const gap = inc - out;
    const tol = Math.max(1, inc * 0.005);
    if (Math.abs(gap) > tol)
      bad.push(`${mc} 不平衡：收入 ${Math.round(inc)} − 用+损 ${Math.round(out)} = ${Math.round(gap)}`);
  });
  if (g.bfg.genUseM3 + g.cog.genUseM3 <= 0) bad.push("发电厂未分到任何煤气：CCPP 燃料残差算错，自发电率会是 0");
  const ccpp = s.units.find((u) => u.id === "GU-CCPP");
  if (ccpp && ccpp.mw > ccpp.maxMw * 1.01)
    bad.push(`CCPP 派生出力 ${ccpp.mw.toFixed(0)}MW 超铭牌 ${ccpp.maxMw}MW：消纳能力不足，放散量将不可信`);
  if (s.selfGenRatePct < 40 || s.selfGenRatePct > 65)
    bad.push(`自发电率 ${s.selfGenRatePct.toFixed(1)}% 出圈（演示合理区间 40–65%）`);
  if (comp.kgcePerTonSteel < 450 || comp.kgcePerTonSteel > 700)
    bad.push(`吨钢综合能耗 ${comp.kgcePerTonSteel.toFixed(0)} kgce/t 出圈（合理 450–700）`);
  const elecInt = sumMedia(l, "ELEC", "消耗") / l.prod.STEEL;
  if (elecInt < 380 || elecInt > 640) bad.push(`吨钢综合电耗 ${elecInt.toFixed(0)} kWh/t 出圈（合理 380–640）`);
  /* 放散率是**输出**（发生量 − 机组铭牌消纳能力），不再和某个输入旋钮比对；
     只卡两件事：总放散落在行业合理带内，且「BFG/COG 有放散 ⟹ 机组顶满」这条因果没写反。
     LDG 不算进后者——转炉煤气没有第二个稳定用户，它放散时 CCPP 本来就可以不满。 */
  if (g.ventTotalRatePct < 0.3 || g.ventTotalRatePct > 5)
    bad.push(`月均放散率 ${g.ventTotalRatePct.toFixed(2)}% 出圈（合理 0.3–5%）：定额或机组能力需要重新标定`);
  if (g.bfg.ventM3 + g.cog.ventM3 > 1 && ccpp && ccpp.loadRatio < 0.97)
    bad.push(
      `BFG/COG 有放散但 CCPP 只带 ${(ccpp.loadRatio * 100).toFixed(0)}% 负荷：高炉/焦炉煤气放散必须是机组顶到铭牌之后的残差，否则数就是凑的`,
    );
  const net = purchaseCost(effect);
  /* 400–1000 而不是「行业常见的 400–700」：本厂外购额里洗精煤 + 喷吹煤粉占八成五
   * （煤 1290 / 煤粉 1180 是 B3 给的内结价，也是厂界价），焦比 0.35 + 煤比 1.33 一乘，
   * 吨钢就是 0.58 t 燃料煤。煤价主导的长流程厂，860 元/t 是真实区间的高位而不是错数。
   * 出圈只有一种可能：定额或产量被改飞了。 */
  if (net.perTonSteel < 400 || net.perTonSteel > 1000)
    bad.push(`吨钢能源成本（外购口径） ${net.perTonSteel.toFixed(0)} 元/t 出圈（合理 400–1000）：定额或产量被改飞了`);

  /* ── 三条结构性不变量：都不涉及具体数值，专抓「改了常数却悄悄破坏自洽」这一类 ── */
  /* ① 用能单元 id 唯一。flatten() 的分段规则一旦改坏（曾生成 EU-00100 而 PLANTS.COKE 是
   *    EU-0100），PLANT_PRODUCT 查表全部静默失配，工序能耗会整列变 0 而不报错。 */
  const seen = new Set<string>();
  PLANT_UNITS.forEach((u) => {
    if (seen.has(u.id)) bad.push(`用能单元 id 重复：${u.id} —— 查表会静默失配，检查 flatten() 的分段规则`);
    seen.add(u.id);
  });
  /* ② MIG 折标恒等于掺混配比的加权和。不等就说明 (A2) 展开的「转换」与「消耗 MIG」
   *    不再是同一份能量，`plantEnergyBalance` 的 migDouble 抵不平，工序能耗静默重复计量。 */
  const migSum = MIG_BLEND.bfg * MEDIUMS.BFG.stdCoal + MIG_BLEND.cog * MEDIUMS.COG.stdCoal;
  if (Math.abs(migSum - MEDIUMS.MIG.stdCoal) > 0.001)
    bad.push(
      `MIG 折标 ${MEDIUMS.MIG.stdCoal} ≠ 配比加权和 ${migSum.toFixed(4)}：混合煤气的转换与消耗对不上，工序能耗必然重复计量`,
    );
  /* ③ 单工序不得离谱到准入值的 1.6 倍——焦化曾算出 1225 kgce/t（标杆 100），就是「离界产品未抵扣」。 */
  plantEnergyBalance(effect).forEach((p) => {
    const bm = BENCHMARKS[p.product];
    if (bm && p.qtyT > 0 && p.intensity > Math.max(bm.access, 50) * 1.6)
      bad.push(
        `${p.name} 工序能耗 ${p.intensity.toFixed(1)} kgce/t 离谱（准入 ${bm.access} 的 1.6 倍以上）：能量重复计量或离界产品未抵扣`,
      );
  });
  return bad;
}

/** 开发期诊断：`node --experimental-strip-types temp/ems-model-check.ts` 打印它，逐轮调定额 */
export function modelDiag() {
  const k = kpiBoard();
  const g = gasBalance();
  const s = selfGeneration();
  const e = elecTimeUse();
  const c = mediumCost();
  return {
    selfCheck: selfCheck(),
    production: Object.fromEntries(Object.entries(PRODUCTION).map(([k2, v]) => [k2, +(v / 1e4).toFixed(2)])),
    plants: stdCoalByPlant().map(
      (p) => `${p.name} ${p.intensity.toFixed(1)}kgce/t (标杆${BENCHMARKS[p.product]?.benchmark ?? "-"})`,
    ),
    gas: {
      bfg: `发生 ${(g.bfg.incomeM3 / 1e8).toFixed(2)}亿m³｜工序 ${(g.bfg.processUseM3 / 1e8).toFixed(2)}亿｜发电 ${(g.bfg.genUseM3 / 1e8).toFixed(2)}亿｜放散 ${g.bfg.ventRatePct.toFixed(2)}%`,
      cog: `发生 ${(g.cog.incomeM3 / 1e8).toFixed(2)}亿｜工序 ${(g.cog.processUseM3 / 1e8).toFixed(2)}亿｜发电 ${(g.cog.genUseM3 / 1e8).toFixed(2)}亿｜外供 ${(g.cog.exportM3 / 1e4).toFixed(0)}万｜放散 ${g.cog.ventRatePct.toFixed(2)}%`,
      ldg: `发生 ${(g.ldg.incomeM3 / 1e8).toFixed(2)}亿｜工序 ${(g.ldg.processUseM3 / 1e8).toFixed(2)}亿｜放散 ${g.ldg.ventRatePct.toFixed(2)}%`,
      ventTotal: `${g.ventTotalRatePct.toFixed(2)}%`,
    },
    gen: s.units.map(
      (u) =>
        `${u.name} ${u.mw.toFixed(1)}MW/${u.maxMw}MW (${(u.loadRatio * 100).toFixed(0)}%) 燃料${(u.fuelM3 / 1e8).toFixed(2)}亿m³`,
    ),
    recovery: s.recoveries.map((r) => `${r.name} ${(r.kwh / 1e4).toFixed(0)}万kWh`),
    selfGenRatePct: k.selfGenRatePct,
    elec: `耗电 ${(e.totalKWh / 1e8).toFixed(2)}亿kWh｜外购 ${(e.purchaseKWh / 1e8).toFixed(2)}亿｜均价 ${e.avgPrice.toFixed(3)}元｜电费 ${(e.totalAmount / 1e8).toFixed(3)}亿`,
    cost: `总 ${(c.total / 1e8).toFixed(3)}亿元｜吨钢 ${c.perTonSteel.toFixed(0)}元`,
    kpi: k,
    holders: holderBases().map((h) => `${h.name} 基准${h.basePct}% 进${h.inFlow} 出${h.outFlow} m³/min`),
    sim: simulateGasBalance({ extraLdgM3min: SIM_LDG_SURGE.extraInM3min }),
    gain: scenarioGain({ ccppMw: 150, cfbUnits: 2 }),
  };
}
