import type {
  AlarmRule,
  CollectChannel,
  Instrument,
  KeyEquip,
  MeterPoint,
  Person,
  PriceTemplate,
  ReportTemplate,
} from "@/api/energy/types";
import { DEMAND_LIMIT_MW, DEMO_T0, ELEC_PRICE, HOLDER_ROWS, PEOPLE, PLANTS, UNIT_LIST, stampOf } from "./model";

/**
 * 非派生种子：`model.ts` 管「数从哪来」，这里管「厂子里有哪些东西」。
 *
 * **这里不许出现业务数值口径**（产量、定额、系数、电价、柜容、机组参数都在 model）。
 * 判断标准很简单：如果一个数字改了会让 EP0003 平衡表或 EP0004 结算跟着变，它就该住在 model；
 * 改了只影响一屏文字（仪表型号、报表维度、拓扑坐标），它才属于种子。
 * 所以本文件从 model 里 import 的只有 `PLANTS` / `HOLDER_ROWS` / `ELEC_PRICE` 这类**标识与结构**，
 * 目的是让种子与派生层引用同一批 id 与时段——计量点挂在真实用能单元上、柜位报警指向真实煤气柜、
 * 电价模板的时段与 `hourToTier()` 完全一致。写死一份副本的话，EC0001 的计量网络就会和 EP0002 实绩脱钩。
 *
 * 五张表的分工：
 * - `METER_POINTS` 计量点（EC0001 网络树的叶子、EC0005 实时曲线的来源、EP0002 重算的输入）
 * - `CHANNELS` 采集通道/无人值守站（EC0002；`pointCount` 由测点表反推，不是手填）
 * - `INSTRUMENTS` 仪表台账（EC0004；只给检定日期，**状态由 `verifyStatusOf()` 现算**，
 *   因为「临期」取决于「今天是哪天」，存成字段三天后就错了）
 * - `KEY_EQUIPS` 重点设备（EP0006；身份与铭牌在此，月折标与单耗由 store 从 flows 派生）
 * - `TOPO_*` 四张 SVG 图元坐标（EM0001/0002/0003/0004；拓扑是图形排版，不是数值口径）
 */

/* ══════════════════════════════════════════════════════════════════════════
   0. 人员名录（全站唯一的「谁能接单」名单）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 报警接收人、调度签发人、补录人、校核人、结算经办人的下拉都读这一份。
 *
 * 名字住在 `model.PEOPLE`（store 里的默认签署人要它），这里只补岗位与部门：
 * 演示叙事要求「张调签发的令、接收人还是那几个人」，页面各自写名单必然对不上，
 * 而「谁签发谁接收」对不上是 energy.md 点名的红线之一。
 */
export const PERSONS: Person[] = [
  { name: PEOPLE.dispatcher, role: "能源调度（正班）", dept: "调度中心" },
  { name: PEOPLE.dispatcherDeputy, role: "能源调度（副班）", dept: "调度中心" },
  { name: PEOPLE.sinter, role: "烧结厂接收人", dept: "烧结厂" },
  { name: PEOPLE.iron, role: "炼铁厂接收人", dept: "炼铁厂" },
  { name: PEOPLE.steel, role: "炼钢厂接收人", dept: "炼钢厂" },
  { name: PEOPLE.power, role: "动力厂值班", dept: "动力厂" },
  { name: PEOPLE.assess, role: "能耗考核", dept: "能源管理科" },
  { name: PEOPLE.settle, role: "能源结算", dept: "能源管理科" },
];

/* ══════════════════════════════════════════════════════════════════════════
   1. 计量网络与计量点（EC0001 / EC0005）
   ══════════════════════════════════════════════════════════════════════════ */

/** 采集通道 / 无人值守站所——按厂设站，与 UNIT_TREE 的厂级一一对应 */
const STATIONS: Array<{
  id: string;
  name: string;
  protocol: CollectChannel["protocol"];
  unitId: string;
  owner: string;
  note?: string;
}> = [
  {
    id: "CH-001",
    name: "110kV总降变电站站",
    protocol: "IEC 60870-5-104",
    unitId: PLANTS.POWER_AUX,
    owner: PEOPLE.power,
    note: "调度数据网 A 网，关口表专用通道",
  },
  { id: "CH-002", name: "焦化厂无人值守站", protocol: "Modbus TCP", unitId: PLANTS.COKE, owner: PEOPLE.assess },
  { id: "CH-003", name: "烧结厂无人值守站", protocol: "OPC UA", unitId: PLANTS.SINTER, owner: PEOPLE.sinter },
  { id: "CH-004", name: "炼铁厂无人值守站", protocol: "OPC UA", unitId: PLANTS.IRON, owner: PEOPLE.iron },
  {
    id: "CH-005",
    name: "炼钢厂无人值守站",
    protocol: "OPC UA",
    unitId: PLANTS.STEEL,
    owner: PEOPLE.steel,
    note: "转炉煤气回收量在此站，幕 2 剧本的数据源",
  },
  { id: "CH-006", name: "轧钢厂无人值守站", protocol: "Modbus TCP", unitId: PLANTS.ROLL, owner: PEOPLE.assess },
  { id: "CH-007", name: "动力厂水泵站", protocol: "DL/T645", unitId: PLANTS.POWER_AUX, owner: PEOPLE.power },
  {
    id: "CH-008",
    name: "气体厂空分站",
    protocol: "S7",
    unitId: PLANTS.GASPLANT,
    owner: PEOPLE.assess,
    note: "PLC 原生协议，深度为 3 的 S7 通道",
  },
  {
    id: "CH-009",
    name: "煤气发电厂站",
    protocol: "IEC 60870-5-104",
    unitId: PLANTS.GEN,
    owner: PEOPLE.power,
    note: "机组出力与柜位上送调度",
  },
  { id: "CH-010", name: "辅助公辅站", protocol: "Modbus TCP", unitId: PLANTS.OTHER, owner: PEOPLE.dispatcherDeputy },
];

/**
 * 计量点表：`[表号, 名称, 介质, 挂载单元, 通道, 数据形态, 方向, 精度, 是否结算点, 上级表表号[]]`
 *
 * 两个刻意的写法：
 * - **`upperPoints` 用表号引用、不在这里展开成 id**。`总管 = 分支和` 是 EC0003 的互斥校验规则，
 *   写在同一张表里才能一眼看出谁归谁；直接写 id 的话，新增一行分支还得反查编号。
 * - **柜位表由 `HOLDER_ROWS` 生成**（下面 `holderPoints`），不在这里手抄五遍——
 *   柜名/介质/容量口径只能有一个来源，否则 EM0002 的柜列表和 EC0001 树上会出现两个「1# 转炉煤气柜」。
 */
type PointRow = [
  key: string,
  name: string,
  media: MeterPoint["mediaCode"],
  unit: string,
  ch: string,
  kind: MeterPoint["dataKind"],
  dir: MeterPoint["direction"],
  acc: string,
  settle: boolean,
  uppers?: string[],
];

const POINT_ROWS: PointRow[] = [
  /* 焦化 */
  [
    "P-COKE-T01",
    "焦化厂总电耗表",
    "ELEC",
    PLANTS.COKE,
    "CH-002",
    "累计量",
    "消耗",
    "0.5S",
    true,
    ["P-COKE-01", "P-COKE-02", "P-COKE-03", "P-COKE-04"],
  ],
  ["P-COKE-01", "1#焦炉电耗表", "ELEC", "EU-0100-1", "CH-002", "累计量", "消耗", "2.0", false],
  ["P-COKE-02", "2#焦炉电耗表", "ELEC", "EU-0100-2", "CH-002", "累计量", "消耗", "2.0", false],
  ["P-COKE-03", "化产回收系统电耗表", "ELEC", "EU-0100-1-2", "CH-002", "累计量", "消耗", "2.0", false],
  ["P-COKE-04", "煤气净化系统电耗表", "ELEC", "EU-0100-3", "CH-002", "累计量", "消耗", "2.0", false],
  ["P-COKE-B1", "1#焦炉高炉煤气消耗表", "BFG", "EU-0100-1", "CH-002", "累计量", "消耗", "2.0", false],
  ["P-COKE-B2", "2#焦炉高炉煤气消耗表", "BFG", "EU-0100-2", "CH-002", "累计量", "消耗", "2.0", false],
  ["P-COKE-C1", "1#焦炉煤气发生表", "COG", "EU-0100-1", "CH-002", "累计量", "自产", "2.0", true],
  ["P-COKE-C2", "2#焦炉煤气发生表", "COG", "EU-0100-2", "CH-002", "累计量", "自产", "2.0", true],
  ["P-COKE-S1", "1#干熄焦蒸汽发生表", "STEAM", "EU-0100-1-1", "CH-002", "累计量", "自产", "2.0", false],
  ["P-COKE-S2", "2#干熄焦蒸汽发生表", "STEAM", "EU-0100-2-1", "CH-002", "累计量", "自产", "2.0", false],

  /* 烧结 */
  [
    "P-SINT-T01",
    "烧结厂总电耗表",
    "ELEC",
    PLANTS.SINTER,
    "CH-003",
    "累计量",
    "消耗",
    "0.5S",
    true,
    ["P-SINT-01", "P-SINT-02", "P-SINT-03"],
  ],
  ["P-SINT-01", "1#主抽风机电耗表", "ELEC", "EU-0200-1-1", "CH-003", "累计量", "消耗", "2.0", false],
  ["P-SINT-02", "2#主抽风机电耗表", "ELEC", "EU-0200-2-1", "CH-003", "累计量", "消耗", "2.0", false],
  ["P-SINT-03", "烧结余热发电上网表", "ELEC", "EU-0200-4", "CH-003", "累计量", "自产", "0.5S", true],
  ["P-SINT-B1", "1#点火炉高炉煤气表", "BFG", "EU-0200-1-2", "CH-003", "累计量", "消耗", "2.0", false],
  ["P-SINT-B2", "球团竖炉煤气表", "BFG", "EU-0200-3", "CH-003", "累计量", "消耗", "2.0", false],
  ["P-SINT-W1", "烧结厂新水总表", "WATER", PLANTS.SINTER, "CH-003", "累计量", "消耗", "2.0", false],

  /* 炼铁 */
  [
    "P-IRON-T01",
    "炼铁厂总电耗表",
    "ELEC",
    PLANTS.IRON,
    "CH-004",
    "累计量",
    "消耗",
    "0.5S",
    true,
    ["P-IRON-01", "P-IRON-02", "P-IRON-03", "P-IRON-04"],
  ],
  ["P-IRON-01", "7#高炉鼓风电耗表", "ELEC", "EU-0300-1-2", "CH-004", "累计量", "消耗", "0.5", false],
  ["P-IRON-02", "8#高炉鼓风电耗表", "ELEC", "EU-0300-2-2", "CH-004", "累计量", "消耗", "0.5", false],
  ["P-IRON-03", "喷煤制粉系统电耗表", "ELEC", "EU-0300-5", "CH-004", "累计量", "消耗", "2.0", false],
  [
    "P-IRON-04",
    "TRT 上网电量合计表",
    "ELEC",
    PLANTS.IRON,
    "CH-004",
    "累计量",
    "自产",
    "0.5S",
    true,
    ["P-IRON-41", "P-IRON-42"],
  ],
  ["P-IRON-41", "1#TRT 发电量表", "ELEC", "EU-0300-3", "CH-004", "累计量", "自产", "0.5S", true],
  ["P-IRON-42", "2#TRT 发电量表", "ELEC", "EU-0300-4", "CH-004", "累计量", "自产", "0.5S", true],
  [
    "P-IRON-B0",
    "高炉炉顶煤气发生总表",
    "BFG",
    PLANTS.IRON,
    "CH-004",
    "累计量",
    "自产",
    "2.0",
    true,
    ["P-IRON-B1", "P-IRON-B2"],
  ],
  ["P-IRON-B1", "7#高炉炉顶煤气表", "BFG", "EU-0300-1", "CH-004", "累计量", "自产", "2.0", false],
  ["P-IRON-B2", "8#高炉炉顶煤气表", "BFG", "EU-0300-2", "CH-004", "累计量", "自产", "2.0", false],
  ["P-IRON-B3", "7#热风炉煤气消耗表", "BFG", "EU-0300-1-1", "CH-004", "累计量", "消耗", "2.0", false],
  ["P-IRON-B4", "8#热风炉煤气消耗表", "BFG", "EU-0300-2-1", "CH-004", "累计量", "消耗", "2.0", false],
  ["P-IRON-P1", "高炉喷煤煤粉计量表", "PULV", "EU-0300-5", "CH-004", "累计量", "消耗", "1.0", true],
  ["P-IRON-K1", "石灰窑煤气消耗表", "BFG", "EU-0300-6", "CH-004", "累计量", "消耗", "2.0", false],
  ["P-IRON-W1", "炼铁厂新水总表", "WATER", PLANTS.IRON, "CH-004", "累计量", "消耗", "2.0", false],

  /* 炼钢 */
  [
    "P-STEL-T01",
    "炼钢厂总电耗表",
    "ELEC",
    PLANTS.STEEL,
    "CH-005",
    "累计量",
    "消耗",
    "0.5S",
    true,
    ["P-STEL-01", "P-STEL-02", "P-STEL-03"],
  ],
  ["P-STEL-01", "1#连铸机电耗表", "ELEC", "EU-0400-1-1", "CH-005", "累计量", "消耗", "2.0", false],
  ["P-STEL-02", "1#LF 精炼炉电耗表", "ELEC", "EU-0400-1-2", "CH-005", "累计量", "消耗", "2.0", false],
  ["P-STEL-03", "精炼与除尘系统电耗表", "ELEC", "EU-0400-4", "CH-005", "累计量", "消耗", "2.0", false],
  [
    "P-STEL-L0",
    "转炉煤气回收总表",
    "LDG",
    PLANTS.STEEL,
    "CH-005",
    "累计量",
    "自产",
    "2.0",
    true,
    ["P-STEL-L1", "P-STEL-L2", "P-STEL-L3"],
  ],
  ["P-STEL-L1", "1#转炉煤气回收表", "LDG", "EU-0400-1", "CH-005", "累计量", "自产", "2.0", false],
  ["P-STEL-L2", "2#转炉煤气回收表", "LDG", "EU-0400-2", "CH-005", "累计量", "自产", "2.0", false],
  ["P-STEL-L3", "3#转炉煤气回收表", "LDG", "EU-0400-3", "CH-005", "累计量", "自产", "2.0", false],
  [
    "P-STEL-O0",
    "炼钢氧耗总管表",
    "O2",
    PLANTS.STEEL,
    "CH-005",
    "累计量",
    "消耗",
    "1.5",
    false,
    ["P-STEL-O1", "P-STEL-O2"],
  ],
  ["P-STEL-O1", "1#转炉氧耗表", "O2", "EU-0400-1", "CH-005", "累计量", "消耗", "1.5", false],
  ["P-STEL-O2", "2#转炉氧耗表", "O2", "EU-0400-2", "CH-005", "累计量", "消耗", "1.5", false],
  ["P-STEL-B1", "钢包烘烤煤气表", "BFG", "EU-0400-3-2", "CH-005", "累计量", "消耗", "2.0", false],
  ["P-STEL-W1", "炼钢厂新水总表", "WATER", PLANTS.STEEL, "CH-005", "累计量", "消耗", "2.0", false],

  /* 轧钢 */
  [
    "P-ROLL-T01",
    "轧钢厂总电耗表",
    "ELEC",
    PLANTS.ROLL,
    "CH-006",
    "累计量",
    "消耗",
    "0.5S",
    true,
    ["P-ROLL-01", "P-ROLL-02", "P-ROLL-03"],
  ],
  ["P-ROLL-01", "1#粗轧区电耗表", "ELEC", "EU-0500-1-1", "CH-006", "累计量", "消耗", "2.0", false],
  ["P-ROLL-02", "1#精轧区电耗表", "ELEC", "EU-0500-1-2", "CH-006", "累计量", "消耗", "2.0", false],
  ["P-ROLL-03", "1780 产线电耗表", "ELEC", "EU-0500-3", "CH-006", "累计量", "消耗", "0.5", false],
  ["P-ROLL-M1", "1#棒线加热炉混合煤气表", "MIG", "EU-0500-1", "CH-006", "累计量", "消耗", "2.0", false],
  ["P-ROLL-M2", "2#棒线加热炉混合煤气表", "MIG", "EU-0500-2", "CH-006", "累计量", "消耗", "2.0", false],
  ["P-ROLL-N1", "1780 步进式加热炉天然气表", "NG", "EU-0500-3-1", "CH-006", "累计量", "消耗", "1.5", true],
  ["P-ROLL-W1", "1780 层流冷却水表", "WATER", "EU-0500-3-2", "CH-006", "累计量", "消耗", "2.0", false],

  /* 动力（含外购电关口） */
  ["P-POW-G0", "110kV 外购电关口表", "ELEC", "EU-0600-3", "CH-001", "累计量", "购入", "0.5S", true],
  ["P-POW-G1", "35kV 配电所出线表", "ELEC", "EU-0600-3-1", "CH-001", "累计量", "消耗", "1.0", false],
  ["P-POW-01", "中心循环水泵站电耗表", "ELEC", "EU-0600-1", "CH-007", "累计量", "消耗", "2.0", false],
  ["P-POW-02", "浊环水泵组电耗表", "ELEC", "EU-0600-1-2", "CH-007", "累计量", "消耗", "2.0", false],
  ["P-POW-S1", "高炉汽化冷却蒸汽表", "STEAM", "EU-0600-2", "CH-007", "累计量", "自产", "2.0", false],
  ["P-POW-W1", "全厂新水总表", "WATER", PLANTS.POWER_AUX, "CH-007", "累计量", "购入", "1.5", true],

  /* 发电 */
  ["P-GEN-01", "CCPP 上网电量表", "ELEC", "EU-0700-1", "CH-009", "累计量", "自产", "0.5S", true],
  ["P-GEN-02", "1#CFB 汽机发电量表", "ELEC", "EU-0700-2-1", "CH-009", "累计量", "自产", "0.5S", true],
  ["P-GEN-B1", "CCPP 高炉煤气消耗表", "BFG", "EU-0700-1", "CH-009", "累计量", "消耗", "1.5", false],
  ["P-GEN-B2", "1#CFB 锅炉高炉煤气表", "BFG", "EU-0700-2", "CH-009", "累计量", "消耗", "1.5", false],
  ["P-GEN-B3", "2#CFB 锅炉高炉煤气表", "BFG", "EU-0700-3", "CH-009", "累计量", "消耗", "1.5", false],
  ["P-GEN-V1", "煤气放散计量表", "MIG", "EU-0700-4", "CH-009", "累计量", "损失", "2.0", false],

  /* 气体厂 */
  ["P-GAS-01", "1#离心空压机电耗表", "ELEC", "EU-0800-1-3", "CH-008", "累计量", "消耗", "2.0", false],
  ["P-GAS-02", "2#离心空压机电耗表", "ELEC", "EU-0800-2-1", "CH-008", "累计量", "消耗", "2.0", false],
  ["P-GAS-03", "螺杆空压站电耗表", "ELEC", "EU-0800-3", "CH-008", "累计量", "消耗", "2.0", false],
  ["P-GAS-O1", "1#制氧机氧气产量表", "O2", "EU-0800-1-1", "CH-008", "累计量", "自产", "1.5", false],
  ["P-GAS-O2", "2#空分氧气产量表", "O2", "EU-0800-2", "CH-008", "累计量", "自产", "1.5", false],
  ["P-GAS-N1", "氮气总管表", "N2", PLANTS.GASPLANT, "CH-008", "累计量", "自产", "2.0", false],
  ["P-GAS-A1", "1#氩塔氩气产量表", "AR", "EU-0800-1-2", "CH-008", "累计量", "自产", "1.5", false],
  ["P-GAS-A2", "氩气外供计量表", "AR", PLANTS.GASPLANT, "CH-008", "累计量", "外供", "1.5", true],

  /* 辅助公辅 */
  ["P-OTH-01", "厂区照明与暖通电耗表", "ELEC", "EU-0900-1", "CH-010", "累计量", "消耗", "2.0", false],
  ["P-OTH-02", "运输与修造电耗表", "ELEC", "EU-0900-2", "CH-010", "累计量", "消耗", "2.0", false],
  ["P-OTH-03", "办公楼宇电耗表", "ELEC", "EU-0900-3", "CH-010", "累计量", "消耗", "2.0", false],
];

/** 柜位表：从 model 的柜清单生成，一行柜一台就地仪表（EM0002 的曲线就画这些点） */
const holderPoints: PointRow[] = HOLDER_ROWS.map((h) => [
  `P-HOL-${h.id}`,
  `${h.name}柜位`,
  h.media,
  PLANTS.GEN,
  "CH-009",
  "瞬时值",
  undefined,
  "1.0",
  false,
]);

/** 表号 → 计量点 id（`upperPoints` 的引用在这一层解算） */
const ALL_ROWS: PointRow[] = [...POINT_ROWS, ...holderPoints];
export const POINT_ID: Record<string, string> = Object.fromEntries(
  ALL_ROWS.map((r, i) => [r[0], `MP-${String(i + 1).padStart(5, "0")}`]),
);

export const METER_POINTS: MeterPoint[] = ALL_ROWS.map((r) => {
  const [key, name, mediaCode, unitId, channelId, dataKind, direction, accuracy, isSettlement, uppers] = r;
  /** 计量体系级别 = 挂载单元在树里的层深（一~四级），与 `UsingUnit.level` 同向 */
  return {
    id: POINT_ID[key],
    name,
    mediaCode,
    unitId,
    level: (UNIT_LIST.find((u) => u.id === unitId)?.level ?? 2) as 1 | 2 | 3 | 4,
    accuracy,
    isSettlement,
    /** `instId` 在 INSTRUMENTS 建好后回填——仪表与计量点是两张表，引用只能单向生成一次 */
    channelId,
    dataKind,
    upperPoints: uppers?.map((k) => POINT_ID[k]),
    direction,
  };
});

/* ══════════════════════════════════════════════════════════════════════════
   2. 采集通道（EC0002）
   ══════════════════════════════════════════════════════════════════════════ */

const DAY_MS = 86_400_000;
/** 日期串 `YYYY-MM-DD`（检定日不带时分，与 EC0004 的筛选口径一致） */
const fmtDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * `pointCount` 从测点表反推、不手填：通道掉线的影响面（`commBreak` 置「缺失」的实绩行数）
 * 就是它挂着的测点数，写死的数字一旦与树上不一致，EC0003 的异常条数就对不上 EC0001 的网络。
 */
export const CHANNELS: CollectChannel[] = STATIONS.map((s, i) => ({
  id: s.id,
  stationName: s.name,
  protocol: s.protocol,
  pointCount: METER_POINTS.filter((p) => p.channelId === s.id).length,
  status: "在线",
  heartbeatAt: stampOf(-i * 40_000),
  cacheMode: true,
  pendingUpload: 0,
  owner: s.owner,
  note: s.note,
}));

/* ══════════════════════════════════════════════════════════════════════════
   3. 仪表台账（EC0004）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 仪表表：`[对应表号, 名称, 型式, 量程, 安装位置, 检定周期天, 上次检定距今天数]`
 *
 * 「距今天数」与「检定周期」的差就是剩余天数，故意铺成三档：**超期 2 块**（−15、−60 天）、
 * **临期 3 块**（≤30 天）、其余 13 块正常。超期那两行是 `scanVerifyDeadlines()` 当场造级别 4 报警的
 * 唯一素材，全给正常的话 EC0004 就是一屏假太平、EG0003 的周检报警也演示不出来。
 * 偏移按「相对演示基准时刻 `DEMO_T0`」算，所以明天打开还是同样的状态——演示结果不随真实日历漂。
 */
const INST_ROWS: Array<[string, string, string, string, string, number, number]> = [
  ["P-POW-G0", "多功能电力仪表", "0.5S 级三相电能表", "3×(1)6A / 110kV", "110kV 总降变电站 1#主变低压侧", 365, 210],
  [
    "P-IRON-B0",
    "差压式孔板流量计",
    "标准孔板 + 一体式差压变送器",
    "DN1200 / 0–60 万 m³/h",
    "7#、8#高炉炉顶煤气总管",
    730,
    745,
  ],
  ["P-STEL-L0", "超声波煤气流量计", "时差式双声道", "DN900 / 0–20 万 m³/h", "转炉煤气回收总管", 730, 358],
  ["P-COKE-C1", "科里奥利质量流量计", "科里奥利", "DN150 / 0–8000 kg/h", "1#焦炉煤气净化后出口", 730, 700],
  ["P-SINT-01", "多功能电力仪表", "0.5 级三相电能表", "3×(10)60A / 6kV", "1#主抽风机高压开关柜", 365, 120],
  ["P-GAS-O1", "涡街流量计", "单声道涡街", "DN700 / 0–12 万 Nm³/h", "1#制氧机氧气出口", 730, 715],
  ["P-ROLL-N1", "涡轮流量计", "轴流涡轮", "DN200 / 0–4000 Nm³/h", "1780 步进式加热炉煤气阀组前", 365, 95],
  ["P-POW-W1", "电磁流量计", "衬里电磁", "DN600 / 0–3000 m³/h", "全厂新水进水总管", 730, 300],
  ["P-IRON-P1", "失重式皮带秤", "称重式皮带", "0–60 t/h", "喷煤制粉系统母管分配器", 180, 170],
  ["P-GEN-B1", "差压式流量计", "标准孔板 + 差压变送器", "DN1600 / 0–25 万 m³/h", "CCPP 高炉煤气调节阀组前", 730, 140],
  ["P-HOL-GH-LDG1", "雷达物位计", "调频连续波雷达", "0–60 m 量程", "1# 转炉煤气柜顶部", 365, 356],
  ["P-HOL-GH-BFG1", "围板机械式柜位计", "机械接触式", "0–60 m 量程", "1# 高炉煤气柜围板", 365, 60],
  ["P-STEL-O0", "涡街流量计", "单声道涡街", "DN500 / 0–3 万 Nm³/h", "炼钢氧耗总管", 730, 790],
  ["P-COKE-S1", "涡街流量计（蒸汽）", "温压补偿涡街", "DN300 / 0–120 t/h", "1#干熄焦锅炉出口", 365, 88],
  ["P-SINT-03", "多功能电力仪表", "0.5S 级三相电能表", "3×(1)5A / 35kV", "烧结余热发电并网柜", 365, 250],
  ["P-GAS-A2", "质量流量计", "科里奥利", "DN80 / 0–2000 Nm³/h", "氩气外供计量撬", 730, 132],
  ["P-IRON-41", "多功能电力仪表", "0.5S 级三相电能表", "3×(1)5A / 6.3kV", "1#TRT 发电出线柜", 365, 44],
  ["P-ROLL-M1", "孔板流量计（混合煤气）", "标准孔板 + 三阀组", "DN800 / 0–9 万 m³/h", "1#棒线加热炉阀组前", 730, 361],
];

/**
 * 种子的结构自检：只在 DEV 抛。计量点/仪表/报警/拓扑全靠**表号字符串**互相引用，
 * 写错一个字母不会编译报错，只会在页面上少一行数据（最难查的那种）。
 * 同 `model.ts` 的用能单元 id 唯一性检查一个道理：**把静默失效变成当场崩**。
 */
function assertSeed(holderIds: string[]) {
  const bad: string[] = [];
  if (new Set(ALL_ROWS.map((r) => r[0])).size !== ALL_ROWS.length) bad.push("计量点表号重复");
  for (const r of ALL_ROWS) {
    if (r.length < 9) bad.push(`计量点 ${r[0]} 列数不足`);
    if (!UNIT_LIST.some((u) => u.id === r[3])) bad.push(`计量点 ${r[0]} 挂了不存在的用能单元 ${r[3]}`);
    if (!STATIONS.some((c) => c.id === r[4])) bad.push(`计量点 ${r[0]} 挂了不存在的通道 ${r[4]}`);
  }
  const known = new Set(Object.keys(POINT_ID));
  for (const r of INST_ROWS) if (r.length !== 7) bad.push(`仪表 ${r[0]} 列数 ${r.length}（应为 7）`);
  for (const r of RULE_ROWS) if (!known.has(r[3])) bad.push(`报警规则 ${r[0]} 引用了未知计量点 ${r[3]}`);
  for (const k of known) if (!METER_POINTS.some((m) => m.id === POINT_ID[k])) bad.push(`表号 ${k} 未生成计量点`);
  for (const sc of [TOPO_POWER, TOPO_GAS, TOPO_STEAM, TOPO_GASPLANT]) {
    const ids = new Set(sc.nodes.map((n) => n.id));
    for (const e of sc.edges)
      if (!ids.has(e.from) || !ids.has(e.to)) bad.push(`拓扑图元连线 ${e.from}→${e.to} 引用了不存在的节点`);
    for (const n of sc.nodes)
      if (n.ref && !known.has(n.ref) && !holderIds.includes(n.ref))
        bad.push(`拓扑图元 ${n.id} 引用了未知表号 ${n.ref}`);
  }
  for (const k of KEY_EQUIPS)
    if (!UNIT_LIST.some((u) => u.id === k.unitId)) bad.push(`重点设备 ${k.name} 挂了不存在的单元 ${k.unitId}`);
  if (bad.length) throw new Error(`[energy] 种子表引用不一致：\n  ${bad.join("\n  ")}`);
}

export const INSTRUMENTS: Instrument[] = INST_ROWS.map(
  ([pointKey, name, type, rangeVal, installPos, cycle, ago], i) => {
    const point = METER_POINTS.find((p) => p.id === POINT_ID[pointKey]);
    const last = DEMO_T0 - ago * DAY_MS;
    return {
      id: `INST-${String(i + 1).padStart(4, "0")}`,
      name,
      type,
      pointId: POINT_ID[pointKey],
      rangeVal,
      installPos,
      verifyCycleDays: cycle,
      lastVerifyAt: fmtDay(last),
      nextVerifyAt: fmtDay(last + cycle * DAY_MS),
      /** 落库状态只是快照，真值由 `verifyStatusOf()` 现算（见下面那条纪律） */
      status: "正常",
      forcedVerify: point?.isSettlement === true,
    };
  },
);

/* 计量点上的仪表引用反查回填：一张表只配一块表具，配了几块就是 INST_ROWS 里的那几行 */
const instByPoint: Record<string, string> = Object.fromEntries(INSTRUMENTS.map((it) => [it.pointId, it.id]));
for (const p of METER_POINTS) p.instId = instByPoint[p.id];

/**
 * 检定状态**按天现算**：状态是「距今天还剩几天」的函数，存成字段就会随真实日历过期。
 * 临期阈值取 30 天——与月度检定计划的提前量一致（EG0003 的报警规则里同源）。
 */
export function verifyStatusOf(inst: Instrument, todayMs: number): Instrument["status"] {
  const left = Date.parse(inst.nextVerifyAt) - todayMs;
  if (left < 0) return "超期";
  if (left <= 30 * DAY_MS) return "临期";
  return "正常";
}

/* ══════════════════════════════════════════════════════════════════════════
   4. 报警规则与电价模板（EG0003）
   ══════════════════════════════════════════════════════════════════════════ */

/** `[编号, 名称, 介质, 计量点表号, 类型, 阈值, 死区, 级别, 接收人]`。级别口径见 energy.md B2.1 */
type RuleRow = [
  string,
  string,
  MeterPoint["mediaCode"],
  string,
  AlarmRule["kind"],
  number,
  number,
  AlarmRule["level"],
  string[],
];
const RULE_ROWS: RuleRow[] = [
  ["AR-001", "CCPP 出力上限越限", "ELEC", "P-GEN-01", "高限", 150, 2, 3, [PEOPLE.power]],
  [
    "AR-002",
    "外购电需量超限",
    "ELEC",
    "P-POW-G0",
    "高限",
    Math.round(DEMAND_LIMIT_MW),
    5,
    2,
    [PEOPLE.power, PEOPLE.dispatcher],
  ],
  ["AR-003", "110kV 母线电压低限", "ELEC", "P-POW-G0", "低限", 105, 2, 3, [PEOPLE.power]],
  ["AR-004", "高炉煤气柜位高限", "BFG", "P-HOL-GH-BFG1", "高限", 90, 1, 2, [PEOPLE.dispatcher, PEOPLE.iron]],
  ["AR-005", "高炉煤气柜位低限", "BFG", "P-HOL-GH-BFG1", "低限", 15, 1, 2, [PEOPLE.dispatcher]],
  [
    "AR-006",
    "转炉煤气柜位高限（放散前哨）",
    "LDG",
    "P-HOL-GH-LDG1",
    "高限",
    88,
    1,
    1,
    [PEOPLE.dispatcher, PEOPLE.steel, PEOPLE.power],
  ],
  ["AR-007", "焦炉煤气柜位高限", "COG", "P-HOL-GH-COG1", "高限", 90, 1, 2, [PEOPLE.dispatcher, PEOPLE.assess]],
  ["AR-008", "转炉煤气回收量骤降", "LDG", "P-STEL-L0", "变化率", 30, 5, 3, [PEOPLE.steel]],
  ["AR-009", "氧气总管流量低限", "O2", "P-STEL-O0", "低限", 4500, 200, 2, [PEOPLE.assess]],
  ["AR-010", "高炉鼓风计量通讯中断", "ELEC", "P-IRON-01", "通讯", 0, 0, 4, [PEOPLE.iron, PEOPLE.dispatcher]],
  ["AR-011", "烧结点火炉煤气超定额", "BFG", "P-SINT-B1", "高限", 45, 3, 4, [PEOPLE.sinter]],
  ["AR-012", "新水管网流量突增（疑似泄漏）", "WATER", "P-POW-W1", "变化率", 20, 5, 3, [PEOPLE.power]],
];

export const ALARM_RULES: AlarmRule[] = RULE_ROWS.map(
  ([id, name, mediaCode, pointKey, kind, threshold, deadband, level, receivers]) => ({
    id,
    name,
    mediaCode,
    pointId: POINT_ID[pointKey],
    kind,
    threshold,
    deadband,
    level,
    receivers,
    /** 级别 1/2 才打电话——级别越高越要人立刻接住，4/5 级刷屏语音反而会把值班室埋掉 */
    channels: level <= 2 ? ["站内", "短信", "语音"] : level <= 3 ? ["站内", "短信"] : ["站内"],
    enabled: true,
  }),
);

/**
 * 分时电价模板。四个时段的**价格与小时区间全部从 `ELEC_PRICE` 取**（model 的派生表），
 * 页面里出现第二个「1.20 元」就等于埋了一处页间矛盾——EM0001 的峰谷底色、EP0004 的分时电费
 * 和这张表必须同时改得动，只能靠同源。
 */
/** 小时数组 → 连续区间文案：`[8,9,10,17,20,21,22]` → `08-11、17-18、20-23` */
function hourRanges(hours: number[]) {
  const sorted = [...new Set(hours)].toSorted((a, b) => a - b);
  const out: string[] = [];
  let from = sorted[0];
  let prev = sorted[0];
  for (const h of [...sorted.slice(1), Number.NaN]) {
    if (h !== prev + 1) {
      out.push(`${String(from).padStart(2, "0")}-${String(prev + 1).padStart(2, "0")}`);
      from = h;
    }
    prev = h;
  }
  return out.join("、");
}

export const PRICE_TEMPLATES: PriceTemplate[] = [
  {
    id: "PT-001",
    name: "2026 年两部制（现行）",
    tiers: ELEC_PRICE.tiers.map((t) => ({ tier: t.tier, price: t.price, hours: hourRanges(t.hours) })),
    demandPrice: ELEC_PRICE.demandPrice,
    demandKVA: ELEC_PRICE.demandKVA,
    powerFactorAdj: true,
    pfTarget: ELEC_PRICE.pfTarget,
    enabled: true,
    effectiveMonth: "2026-01",
  },
  {
    id: "PT-002",
    name: "2025 年两部制（历史方案）",
    tiers: ELEC_PRICE.tiers.map((t) => ({
      tier: t.tier,
      price: Math.round(t.price * 0.92 * 100) / 100,
      hours: hourRanges(t.hours),
    })),
    demandPrice: 34,
    demandKVA: ELEC_PRICE.demandKVA,
    powerFactorAdj: true,
    pfTarget: ELEC_PRICE.pfTarget,
    enabled: false,
    effectiveMonth: "2025-01",
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   5. 重点设备台账（EP0006）
   ══════════════════════════════════════════════════════════════════════════ */

/** `[名称, 九大分类, 挂载单元, 型号, 铭牌, 主能源介质, 能效等级, 年累计运行小时, 单耗单位]` */
const KE_ROWS: Array<
  [string, KeyEquip["category"], string, string, string, KeyEquip["energyMedia"], KeyEquip["effGrade"], number, string]
> = [
  ["1#离心空压机", "空压机", "EU-0800-1-3", "EGP450-7", "45000 kW", "ELEC", "1级", 7200, "kWh/Nm³氧"],
  ["2#离心空压机", "空压机", "EU-0800-2-1", "EGP450-7", "45000 kW", "ELEC", "2级", 6900, "kWh/Nm³氧"],
  ["螺杆空压机组", "空压机", "EU-0800-3", "SA-250A", "250 kW ×4", "ELEC", "3级", 5200, "kWh/Nm³气"],
  ["1#主抽风机", "鼓风机", "EU-0200-1-1", "YGG4-130", "5600 kW", "ELEC", "2级", 6600, "kWh/t矿"],
  ["7#高炉鼓风机", "鼓风机", "EU-0300-1-2", "AV90-6", "28000 kW", "ELEC", "1级", 7000, "kWh/t铁"],
  ["8#高炉鼓风机", "鼓风机", "EU-0300-2-2", "AV90-6", "28000 kW", "ELEC", "2级", 6800, "kWh/t铁"],
  ["1#TRT 机组", "TRT", "EU-0300-3", "TRT-25", "18 MW", "ELEC", "1级", 6400, "kWh/t铁"],
  ["2#TRT 机组", "TRT", "EU-0300-4", "TRT-25", "18 MW", "ELEC", "2级", 6100, "kWh/t铁"],
  ["1#高炉煤气加压机", "煤气加压机", "EU-0100-3", "MM-BP-300", "1250 kW", "ELEC", "3级", 7100, "kWh/万m³"],
  ["转炉煤气加压机组", "煤气加压机", "EU-0400-4", "MM-LP-900", "2×900 kW", "ELEC", "2级", 5800, "kWh/万m³"],
  ["150MW CCPP 机组", "透平机", "EU-0700-1", "CCPP-150", "150 MW", "ELEC", "1级", 6500, "m³/kWh"],
  ["1#25MW 汽轮机组", "透平机", "EU-0700-2-1", "N25-8.8", "25 MW", "ELEC", "2级", 6000, "m³/kWh"],
  ["1#CFB 锅炉", "锅炉", "EU-0700-2", "YG-130/9.8", "130 t/h汽", "BFG", "2级", 6300, "m³/t汽"],
  ["2#CFB 锅炉", "锅炉", "EU-0700-3", "YG-130/9.8", "130 t/h汽", "BFG", "3级", 0, "m³/t汽"],
  ["1#干熄焦装置", "锅炉", "EU-0100-1-1", "CDQ-140", "140 t/h焦", "STEAM", "1级", 7000, "t汽/t焦"],
  ["110kV 1#主变", "变压器", "EU-0600-3", "SFZ11-63000", "63 MVA", "ELEC", "1级", 8760, "—"],
  ["35kV 2#主变", "变压器", "EU-0600-3-1", "SZ11-20000", "20 MVA", "ELEC", "2级", 8760, "—"],
  ["净环水泵组", "水泵", "EU-0600-1-1", "QY-1200", "1200 kW ×6", "ELEC", "2级", 7300, "kWh/m³"],
  ["浊环水泵组", "水泵", "EU-0600-1-2", "QY-900", "900 kW ×4", "ELEC", "3级", 6700, "kWh/m³"],
  ["1#转炉煤气柜", "煤气柜", "EU-0700-4", "MAN-100000", "10 万 m³", "LDG", "1级", 8760, "—"],
];

export const KEY_EQUIPS: KeyEquip[] = KE_ROWS.map((r, i) => ({
  id: `KE-${String(i + 1).padStart(3, "0")}`,
  name: r[0],
  category: r[1],
  unitId: r[2],
  model: r[3],
  ratedPower: r[4],
  energyMedia: r[5],
  /** 下面两个由 store 从 `flows()` 派生（折标与单耗是数值口径，种子无权定值） */
  monthStdCoal: 0,
  intensity: 0,
  intensityUnit: r[8],
  effGrade: r[6],
  runHours: r[7],
}));

/* ══════════════════════════════════════════════════════════════════════════
   6. 报表模板（ER0004）
   ══════════════════════════════════════════════════════════════════════════ */

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "RT-001",
    name: "工序能耗月报",
    dims: ["用能单元", "介质"],
    metrics: ["实物量", "折标煤", "单位产品能耗"],
    granularity: "月",
    owner: PEOPLE.assess,
    lastPublishAt: stampOf(-6 * DAY_MS),
    status: "已发布",
  },
  {
    id: "RT-002",
    name: "分时电费日报",
    dims: ["时段"],
    metrics: ["电量", "电费", "需量"],
    granularity: "日",
    owner: PEOPLE.settle,
    lastPublishAt: stampOf(-1 * DAY_MS),
    status: "已发布",
  },
  {
    id: "RT-003",
    name: "煤气放散统计周报",
    dims: ["介质", "用能单元"],
    metrics: ["放散量", "放散率", "折碳量"],
    granularity: "时",
    owner: PEOPLE.dispatcher,
    status: "草稿",
  },
  {
    id: "RT-004",
    name: "自发电率对标表",
    dims: ["机组", "月份"],
    metrics: ["发电量", "自发电率", "气耗率"],
    granularity: "月",
    owner: PEOPLE.power,
    lastPublishAt: stampOf(-3 * DAY_MS),
    status: "已发布",
  },
  {
    id: "RT-005",
    name: "计量器具周检台账",
    dims: ["仪表", "用能单元"],
    metrics: ["检定周期", "临期天数"],
    granularity: "月",
    owner: PEOPLE.assess,
    status: "草稿",
  },
  {
    id: "RT-006",
    name: "能源成本中心分摊表",
    dims: ["成本中心", "介质"],
    metrics: ["内结成本", "外购成本"],
    granularity: "月",
    owner: PEOPLE.settle,
    lastPublishAt: stampOf(-8 * DAY_MS),
    status: "已发布",
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   7. SVG 拓扑图元（EM0001 / EM0002 / EM0003 / EM0004）
   ══════════════════════════════════════════════════════════════════════════ */

export interface TopoNode {
  id: string;
  label: string;
  /** `bus` 母线（横条）·`box` 设备框 ·`gen` 电源/机组 ·`load` 用户 ·`holder` 柜 ·`valve` 阀/放散 */
  kind: "bus" | "box" | "gen" | "load" | "holder" | "valve";
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** 关联的计量点/柜 id：实时数值就地刷进图元（页面按此取 store 的实时层） */
  ref?: string;
}
export interface TopoEdge {
  from: string;
  to: string;
  /** 实线=主通路，虚线=备用/可切，粗线=大管径 */
  style?: "solid" | "dash" | "thick";
  /** 折线拐点（不含两端图元的中心点） */
  via?: Array<[number, number]>;
  /** 关联介质，决定线色（介质专色唯一真源是 `model.MEDIUMS[].color`） */
  media?: MeterPoint["mediaCode"];
}
export interface TopoScene {
  viewBox: string;
  nodes: TopoNode[];
  edges: TopoEdge[];
}

/** 供配电一次图：外网 → 110kV 母线 → 两台主变 → 35kV 母线 → 各厂 + 三台自发电并网 */
export const TOPO_POWER: TopoScene = {
  viewBox: "0 0 1000 620",
  nodes: [
    { id: "grid", label: "电力系统 110kV", kind: "box", x: 80, y: 30, w: 180, h: 46, ref: "P-POW-G0" },
    { id: "bus110", label: "110kV 单母分段", kind: "bus", x: 300, y: 120, w: 400, ref: "P-POW-G0" },
    { id: "t1", label: "1#主变 63MVA", kind: "box", x: 340, y: 190, w: 150, h: 44 },
    { id: "t2", label: "2#主变 63MVA", kind: "box", x: 530, y: 190, w: 150, h: 44 },
    { id: "bus35", label: "35kV 配电所母线", kind: "bus", x: 250, y: 290, w: 500, ref: "P-POW-G1" },
    { id: "l-coke", label: "焦化厂", kind: "load", x: 180, y: 370, w: 110, h: 40, ref: "P-COKE-T01" },
    { id: "l-sinter", label: "烧结厂", kind: "load", x: 310, y: 370, w: 110, h: 40, ref: "P-SINT-T01" },
    { id: "l-iron", label: "炼铁厂", kind: "load", x: 440, y: 370, w: 110, h: 40, ref: "P-IRON-T01" },
    { id: "l-steel", label: "炼钢厂", kind: "load", x: 570, y: 370, w: 110, h: 40, ref: "P-STEL-T01" },
    { id: "l-roll", label: "轧钢厂", kind: "load", x: 700, y: 370, w: 110, h: 40, ref: "P-ROLL-T01" },
    { id: "l-aux", label: "动力/公辅", kind: "load", x: 830, y: 370, w: 110, h: 40, ref: "P-OTH-01" },
    { id: "g-ccpp", label: "CCPP 150MW", kind: "gen", x: 210, y: 500, w: 150, h: 44, ref: "P-GEN-01" },
    { id: "g-cfb", label: "1#CFB 25MW", kind: "gen", x: 400, y: 500, w: 150, h: 44, ref: "P-GEN-02" },
    { id: "g-trt", label: "TRT×2 36MW", kind: "gen", x: 590, y: 500, w: 150, h: 44, ref: "P-IRON-41" },
    { id: "g-sjw", label: "烧结余热 30MW", kind: "gen", x: 780, y: 500, w: 150, h: 44, ref: "P-SINT-03" },
  ],
  edges: [
    { from: "grid", to: "bus110", style: "thick", via: [[170, 120]] },
    { from: "bus110", to: "t1", via: [[415, 120]] },
    { from: "bus110", to: "t2", via: [[605, 120]] },
    { from: "t1", to: "bus35", via: [[415, 290]] },
    { from: "t2", to: "bus35", via: [[605, 290]] },
    ...["l-coke", "l-sinter", "l-iron", "l-steel", "l-roll", "l-aux"].map((id) => ({ from: "bus35", to: id })),
    ...["g-ccpp", "g-cfb", "g-trt", "g-sjw"].map((id) => ({ from: id, to: "bus35", style: "dash" as const })),
  ],
};

/** 煤气管网：三个总管的 产 → 柜 → 用户 → 放散，柜位实时刷在 holder 图元上 */
export const TOPO_GAS: TopoScene = {
  viewBox: "0 0 1000 620",
  nodes: [
    { id: "src-bfg", label: "高炉煤气总管", kind: "box", x: 40, y: 60, w: 160, h: 44, ref: "P-IRON-B0" },
    { id: "src-cog", label: "焦炉煤气总管", kind: "box", x: 40, y: 210, w: 160, h: 44, ref: "P-COKE-C1" },
    { id: "src-ldg", label: "转炉煤气总管", kind: "box", x: 40, y: 360, w: 160, h: 44, ref: "P-STEL-L0" },
    { id: "h-bfg1", label: "1#高炉柜", kind: "holder", x: 270, y: 40, w: 130, h: 54, ref: "GH-BFG1" },
    { id: "h-bfg2", label: "2#高炉柜", kind: "holder", x: 270, y: 110, w: 130, h: 54, ref: "GH-BFG2" },
    { id: "h-cog1", label: "焦炉柜", kind: "holder", x: 270, y: 220, w: 130, h: 54, ref: "GH-COG1" },
    { id: "h-ldg1", label: "1#转炉柜", kind: "holder", x: 270, y: 340, w: 130, h: 54, ref: "GH-LDG1" },
    { id: "h-ldg2", label: "2#转炉柜", kind: "holder", x: 270, y: 410, w: 130, h: 54, ref: "GH-LDG2" },
    { id: "u-ccpp", label: "CCPP", kind: "gen", x: 560, y: 40, w: 150, h: 44, ref: "P-GEN-B1" },
    { id: "u-cfb", label: "1#/2#CFB", kind: "gen", x: 560, y: 110, w: 150, h: 44, ref: "P-GEN-B2" },
    { id: "u-coke", label: "焦炉加热", kind: "load", x: 560, y: 190, w: 150, h: 40, ref: "P-COKE-B1" },
    { id: "u-sinter", label: "烧结点火", kind: "load", x: 560, y: 255, w: 150, h: 40, ref: "P-SINT-B1" },
    { id: "u-roll", label: "加热炉（MIG）", kind: "load", x: 560, y: 330, w: 150, h: 40, ref: "P-ROLL-M1" },
    { id: "u-ladle", label: "钢包烘烤", kind: "load", x: 560, y: 395, w: 150, h: 40, ref: "P-STEL-B1" },
    { id: "vent", label: "放散塔", kind: "valve", x: 830, y: 340, w: 130, h: 44, ref: "P-GEN-V1" },
  ],
  edges: [
    { from: "src-bfg", to: "h-bfg1", style: "thick", media: "BFG" },
    {
      from: "src-bfg",
      to: "h-bfg2",
      media: "BFG",
      via: [
        [230, 82],
        [230, 137],
      ],
    },
    { from: "src-cog", to: "h-cog1", style: "thick", media: "COG" },
    { from: "src-ldg", to: "h-ldg1", style: "thick", media: "LDG" },
    {
      from: "src-ldg",
      to: "h-ldg2",
      media: "LDG",
      via: [
        [230, 382],
        [230, 437],
      ],
    },
    { from: "h-bfg1", to: "u-ccpp", style: "thick", media: "BFG" },
    {
      from: "h-bfg2",
      to: "u-cfb",
      media: "BFG",
      via: [
        [470, 137],
        [470, 132],
      ],
    },
    {
      from: "h-bfg1",
      to: "u-sinter",
      media: "BFG",
      via: [
        [470, 67],
        [470, 275],
      ],
    },
    { from: "h-cog1", to: "u-coke", style: "thick", media: "COG" },
    {
      from: "h-cog1",
      to: "u-roll",
      media: "MIG",
      via: [
        [500, 247],
        [500, 350],
      ],
    },
    { from: "h-ldg1", to: "u-ladle", style: "thick", media: "LDG" },
    { from: "h-ldg1", to: "vent", style: "dash", media: "LDG", via: [[760, 367]] },
    {
      from: "h-bfg1",
      to: "vent",
      style: "dash",
      media: "BFG",
      via: [
        [780, 67],
        [780, 352],
      ],
    },
  ],
};

/** 蒸汽与水平衡：余能产汽 → 蒸汽母管 → 用户；新水 → 净环/浊环 → 用户 */
export const TOPO_STEAM: TopoScene = {
  viewBox: "0 0 1000 620",
  nodes: [
    { id: "s-cdq1", label: "1#干熄焦", kind: "gen", x: 40, y: 50, w: 150, h: 44, ref: "P-COKE-S1" },
    { id: "s-cdq2", label: "2#干熄焦", kind: "gen", x: 40, y: 115, w: 150, h: 44, ref: "P-COKE-S2" },
    { id: "s-sjw", label: "烧结余热锅炉", kind: "gen", x: 40, y: 180, w: 150, h: 44, ref: "P-SINT-03" },
    { id: "s-evap", label: "高炉汽化冷却", kind: "gen", x: 40, y: 245, w: 150, h: 44, ref: "P-POW-S1" },
    { id: "s-header", label: "3.8MPa 蒸汽母管", kind: "bus", x: 300, y: 160, w: 300, ref: "P-COKE-S1" },
    { id: "s-use1", label: "汽机发电", kind: "load", x: 690, y: 60, w: 150, h: 44, ref: "P-GEN-02" },
    { id: "s-use2", label: "采暖与制冷", kind: "load", x: 690, y: 135, w: 150, h: 44 },
    { id: "s-use3", label: "工艺用汽", kind: "load", x: 690, y: 210, w: 150, h: 44 },
    { id: "w-new", label: "全厂新水", kind: "box", x: 40, y: 400, w: 150, h: 44, ref: "P-POW-W1" },
    { id: "w-clean", label: "净环水系统", kind: "bus", x: 300, y: 380, w: 260, ref: "P-POW-01" },
    { id: "w-dirty", label: "浊环水系统", kind: "bus", x: 300, y: 470, w: 260, ref: "P-POW-02" },
    { id: "w-use1", label: "高炉冷却", kind: "load", x: 690, y: 340, w: 150, h: 40 },
    { id: "w-use2", label: "轧钢层冷", kind: "load", x: 690, y: 405, w: 150, h: 40, ref: "P-ROLL-W1" },
    { id: "w-use3", label: "炼钢除尘", kind: "load", x: 690, y: 470, w: 150, h: 40 },
  ],
  edges: [
    { from: "s-cdq1", to: "s-header", media: "STEAM" },
    { from: "s-cdq2", to: "s-header", media: "STEAM" },
    { from: "s-sjw", to: "s-header", media: "STEAM" },
    { from: "s-evap", to: "s-header", media: "STEAM" },
    { from: "s-header", to: "s-use1", style: "thick", media: "STEAM" },
    { from: "s-header", to: "s-use2", media: "STEAM" },
    { from: "s-header", to: "s-use3", media: "STEAM" },
    { from: "w-new", to: "w-clean", media: "WATER" },
    {
      from: "w-new",
      to: "w-dirty",
      media: "WATER",
      via: [
        [250, 422],
        [250, 492],
      ],
    },
    { from: "w-clean", to: "w-use1", style: "thick", media: "WATER" },
    { from: "w-clean", to: "w-use2", media: "WATER" },
    { from: "w-dirty", to: "w-use3", media: "WATER" },
  ],
};

/** 氧氮氩管网：两套空分 → 三种气体总管 → 用户 + 外供 */
export const TOPO_GASPLANT: TopoScene = {
  viewBox: "0 0 1000 500",
  nodes: [
    { id: "as1", label: "1#空分 2×32000", kind: "gen", x: 40, y: 60, w: 180, h: 48, ref: "P-GAS-O1" },
    { id: "as2", label: "2#空分", kind: "gen", x: 40, y: 150, w: 180, h: 48, ref: "P-GAS-O2" },
    { id: "bo1", label: "1#离心空压机", kind: "box", x: 40, y: 250, w: 180, h: 44, ref: "P-GAS-01" },
    { id: "bus-o2", label: "氧气总管 0.6MPa", kind: "bus", x: 330, y: 70, w: 300, ref: "P-STEL-O0" },
    { id: "bus-n2", label: "氮气总管", kind: "bus", x: 330, y: 190, w: 300, ref: "P-GAS-N1" },
    { id: "bus-ar", label: "氩气总管", kind: "bus", x: 330, y: 310, w: 300, ref: "P-GAS-A1" },
    { id: "u-steel", label: "转炉吹氧", kind: "load", x: 720, y: 50, w: 150, h: 40, ref: "P-STEL-O1" },
    { id: "u-blast", label: "高炉富氧", kind: "load", x: 720, y: 110, w: 150, h: 40 },
    { id: "u-cover", label: "连铸保护气", kind: "load", x: 720, y: 175, w: 150, h: 40 },
    { id: "u-purge", label: "管网吹扫", kind: "load", x: 720, y: 235, w: 150, h: 40 },
    { id: "u-weld", label: "氩弧焊与保护", kind: "load", x: 720, y: 300, w: 150, h: 40 },
    { id: "u-export", label: "氩气外供", kind: "valve", x: 720, y: 360, w: 150, h: 40, ref: "P-GAS-A2" },
  ],
  edges: [
    { from: "as1", to: "bus-o2", style: "thick", media: "O2" },
    {
      from: "as2",
      to: "bus-o2",
      media: "O2",
      via: [
        [270, 174],
        [270, 82],
      ],
    },
    {
      from: "as1",
      to: "bus-n2",
      media: "N2",
      via: [
        [290, 82],
        [290, 202],
      ],
    },
    {
      from: "bo1",
      to: "bus-n2",
      style: "dash",
      media: "AIR",
      via: [
        [250, 272],
        [250, 202],
      ],
    },
    {
      from: "as1",
      to: "bus-ar",
      media: "AR",
      via: [
        [310, 82],
        [310, 322],
      ],
    },
    { from: "bus-o2", to: "u-steel", media: "O2" },
    { from: "bus-o2", to: "u-blast", media: "O2" },
    { from: "bus-n2", to: "u-cover", media: "N2" },
    { from: "bus-n2", to: "u-purge", media: "N2" },
    { from: "bus-ar", to: "u-weld", media: "AR" },
    { from: "bus-ar", to: "u-export", style: "dash", media: "AR" },
  ],
};

/* 拓扑图元的引用检查在四张 TOPO_* 定义之后，所以自检放在文件末尾（函数声明可提前用，常量不行） */
if (import.meta.env?.DEV) assertSeed(HOLDER_ROWS.map((h) => h.id));
