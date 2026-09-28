import type { Equipment, LifecycleEvent, Line, TechDoc } from "@/api/equipment/types";

/**
 * 资产域种子（附录 B3：产线 6 条、设备 30 台）。
 *
 * 命名全部照钢铁厂区口径，客户一看就懂——这是演示真实感的关键，
 * 比字段是否完备重要得多。结构树用 `parentId` 自关联：
 * F4 精轧机 → 主传动电机 → 电机轴承 是主线剧本要现场展开的那一条。
 *
 * `health` 是手工编排的：主线设备（F4 电机 61、其轴承 55、吐丝机 65、铸造吊 68）落在黄/红区，
 * 大屏和健康看板的色块分布、寿命排行榜才有故事可讲；其余铺在 70~95 之间做出层次。
 */

export const seedLines: Line[] = [
  { id: "LN-SJ01", name: "1#烧结机", area: "烧结", deviceCount: 5 },
  { id: "LN-LT02", name: "2#高炉(2800m³)", area: "炼铁", deviceCount: 5 },
  { id: "LN-LG02", name: "转炉-连铸", area: "炼钢", deviceCount: 4 },
  { id: "LN-BX01", name: "1#高速线材", area: "棒线轧制", deviceCount: 6 },
  { id: "LN-BR01", name: "1780热连轧", area: "板材轧制", deviceCount: 7 },
  { id: "LN-GG01", name: "340 PQF 钢管", area: "管材轧制", deviceCount: 3 },
];

/** 便捷构造：位置/厂商/投运日/健康度/运行小时按 B3 台账逐台给，其余走默认 */
function eq(
  id: string,
  name: string,
  model: string,
  lineId: string,
  position: string,
  level: Equipment["level"],
  status: Equipment["status"],
  health: number,
  vendor: string,
  commissionedAt: string,
  runHours: number,
  parentId?: string,
): Equipment {
  return {
    id,
    name,
    model,
    lineId,
    position,
    level,
    status,
    health,
    vendor,
    commissionedAt,
    qrCode: id,
    runHours,
    parentId,
  };
}

export const seedEquipments: Equipment[] = [
  /* 1#烧结机 */
  eq(
    "EQ-SJ-FJ-01",
    "主抽风机",
    "M4-73-2No28F",
    "LN-SJ01",
    "烧结机东侧主抽风机房",
    "A",
    "运行",
    88,
    "陕鼓动力",
    "2016-05-20",
    61230,
  ),
  eq(
    "EQ-SJ-FJ-02",
    "主抽风机同步电机",
    "YKS500-4-1000kW",
    "LN-SJ01",
    "烧结机东侧主抽风机房",
    "A",
    "运行",
    90,
    "哈尔滨电机",
    "2016-06-10",
    60980,
    "EQ-SJ-FJ-01",
  ),
  eq(
    "EQ-SJ-HL-01",
    "环冷机",
    "HL-3800",
    "LN-SJ01",
    "烧结机尾部环冷区",
    "B",
    "运行",
    82,
    "中冶京诚",
    "2016-05-20",
    41230,
  ),
  eq(
    "EQ-SJ-YH-01",
    "一混筒",
    "Φ5500×11000",
    "LN-SJ01",
    "混合料制备跨",
    "B",
    "运行",
    79,
    "大连重工",
    "2016-05-20",
    58900,
  ),
  eq(
    "EQ-SJ-DC-01",
    "电除尘风机",
    "4-72-12C",
    "LN-SJ01",
    "脱硫电除尘平台",
    "C",
    "运行",
    93,
    "山东鸿丰",
    "2017-03-15",
    47650,
  ),

  /* 2#高炉 */
  eq(
    "EQ-LT-NP-01",
    "泥炮机",
    "NP-4.0MPa",
    "LN-LT02",
    "高炉出铁场平台",
    "A",
    "运行",
    85,
    "中国一重",
    "2015-09-18",
    66420,
  ),
  eq(
    "EQ-LT-TR-01",
    "TRT 透平",
    "W-N25/0.85",
    "LN-LT02",
    "煤气余压发电跨",
    "A",
    "运行",
    76,
    "西安陕鼓",
    "2015-09-18",
    65330,
  ),
  eq(
    "EQ-LT-YA-01",
    "炉顶卷扬机",
    "JM2.5×3",
    "LN-LT02",
    "高炉炉顶框架",
    "A",
    "运行",
    71,
    "太原重工",
    "2015-09-18",
    66100,
  ),
  eq("EQ-LT-RF-01", "3#热风炉", "HSV-3", "LN-LT02", "高炉热风炉区", "B", "运行", 89, "中冶华天", "2015-09-18", 64880),
  eq(
    "EQ-LT-JL-01",
    "高炉给料机",
    "SZ-18",
    "LN-LT02",
    "高炉上料斜桥",
    "C",
    "运行",
    91,
    "潍坊矿山机械",
    "2016-01-05",
    59770,
  ),

  /* 转炉-连铸 */
  eq(
    "EQ-LG-YQ-01",
    "120t 转炉氧枪卷扬",
    "YG-120T",
    "LN-LG02",
    "转炉主跨 12m 平台",
    "A",
    "运行",
    74,
    "中国二重",
    "2018-04-22",
    45210,
  ),
  eq(
    "EQ-LG-JJ-01",
    "连铸结晶器振动台",
    "M-1650",
    "LN-LG02",
    "连铸零米平台",
    "A",
    "运行",
    81,
    "大连重工",
    "2018-04-22",
    44980,
  ),
  eq(
    "EQ-LG-DZ-01",
    "80t 铸造吊",
    "QY80-26A",
    "LN-LG02",
    "转炉加料跨",
    "A",
    "运行",
    68,
    "太原重工",
    "2018-05-10",
    43660,
  ),
  eq("EQ-LG-LZ-01", "连铸二冷段", "SL-2", "LN-LG02", "连铸切割区", "B", "运行", 87, "中冶南方", "2018-04-22", 44120),

  /* 1#高速线材 */
  eq("EQ-BX-CZ-01", "粗轧机组 4F", "VHS-450", "LN-BX01", "高线粗轧跨", "A", "运行", 83, "达涅利", "2019-07-01", 33450),
  eq("EQ-BX-ZZ-01", "中轧机组", "VHS-400", "LN-BX01", "高线中轧跨", "A", "运行", 80, "达涅利", "2019-07-01", 33210),
  eq("EQ-BX-JZ-01", "精轧机组", "VHS-350", "LN-BX01", "高线精轧跨", "A", "运行", 72, "达涅利", "2019-07-01", 32980),
  eq("EQ-BX-TS-01", "吐丝机", "Lay-600", "LN-BX01", "高线吐丝区", "A", "检修", 65, "达涅利", "2019-07-01", 32870),
  eq(
    "EQ-BX-GL-01",
    "风冷辊道",
    "AC-800",
    "LN-BX01",
    "斯太尔摩冷却线",
    "B",
    "运行",
    78,
    "中国重型机械",
    "2019-07-01",
    32540,
  ),
  eq(
    "EQ-BX-KS-01",
    "收集链式冷床",
    "CC-120",
    "LN-BX01",
    "冷床剪切跨",
    "C",
    "运行",
    90,
    "中冶京诚",
    "2019-08-12",
    31980,
  ),

  /* 1780 热连轧（主线剧本发生地） */
  eq(
    "EQ-BR-TG-01",
    "加热炉推钢机",
    "TT-30T",
    "LN-BR01",
    "加热炉出料跨",
    "B",
    "运行",
    84,
    "中冶南方",
    "2014-03-20",
    71230,
  ),
  eq(
    "EQ-BR-R1-01",
    "R1 可逆粗轧机",
    "R1-Φ1250",
    "LN-BR01",
    "粗轧跨",
    "A",
    "运行",
    79,
    "西门子VAI",
    "2014-03-20",
    70980,
  ),
  eq(
    "EQ-BR-F4-01",
    "F4 精轧机",
    "F4-Φ1700",
    "LN-BR01",
    "精轧跨 F4 机架",
    "A",
    "运行",
    70,
    "西门子VAI",
    "2014-03-20",
    70450,
  ),
  eq(
    "EQ-BR-F4-02",
    "F4 主传动电机",
    "Z4-1400kW",
    "LN-BR01",
    "精轧跨 F4 电机底座",
    "A",
    "运行",
    61,
    "西安电机",
    "2014-03-20",
    70120,
    "EQ-BR-F4-01",
  ),
  eq(
    "EQ-BR-F4-03",
    "F4 电机驱动端轴承",
    "NUP 318",
    "LN-BR01",
    "精轧跨 F4 电机驱动端",
    "A",
    "运行",
    55,
    "SKF",
    "2024-03-15",
    2130,
    "EQ-BR-F4-02",
  ),
  eq("EQ-BR-QQ-01", "卷取机", "JC-Φ610", "LN-BR01", "卷取跨", "A", "运行", 76, "西门子VAI", "2014-03-20", 69870),
  eq(
    "EQ-BR-AG-01",
    "液压 AGC 系统",
    "AGC-28MPa",
    "LN-BR01",
    "精轧跨 F4 液压站",
    "B",
    "运行",
    82,
    "力士乐",
    "2014-03-20",
    69540,
  ),

  /* 340 PQF 钢管 */
  eq(
    "EQ-GG-JR-01",
    "环形加热炉",
    "RH-Φ1000",
    "LN-GG01",
    "管坯加热跨",
    "B",
    "运行",
    86,
    "中冶赛迪",
    "2020-11-08",
    26540,
  ),
  eq(
    "EQ-GG-CK-01",
    "穿孔机顶头",
    "CT-Φ340",
    "LN-GG01",
    "穿孔机平台",
    "A",
    "故障停机",
    69,
    "天工国际",
    "2020-11-08",
    25980,
  ),
  eq(
    "EQ-GG-PQ-01",
    "PQF 轧机管芯棒",
    "MB-Φ180",
    "LN-GG01",
    "PQF 定径区",
    "A",
    "运行",
    73,
    "中钢洛耐",
    "2020-11-08",
    25670,
  ),
];

/**
 * 生命周期事件（AE0003 时间轴）。
 *
 * 采购→安装→调试→投运四步对每台设备都同构，且日期可由投运日反推，
 * 所以由 `baseEvents()` 生成；**维修/大修/改造**是演示要看的内容，逐条手写。
 * 工单关闭时 store 会自动追加「维修」事件（refDocNo=工单号），与本表合流。
 */
export const seedLifecycleEvents: LifecycleEvent[] = [];

/** 手写事件（主线设备的履历，剧本第 7 幕会在这里多出一条） */
const handWritten: Array<[string, LifecycleEvent["type"], string, string | undefined, string]> = [
  ["EQ-BR-F4-03", "采购", "2024-02-10", "PO-2024-0213", "SKF 授权渠道采购 NUP318 轴承 2 套"],
  ["EQ-BR-F4-03", "安装", "2024-03-12", "WO-20240312-01", "F4 主传动电机驱动端轴承更换"],
  ["EQ-BR-F4-03", "投运", "2024-03-15", undefined, "空载试运行 8h、负载试运行 24h 合格"],
  ["EQ-BR-F4-02", "大修", "2023-04-18", "WO-20230418-03", "定转子动平衡、绝缘处理、轴瓦研刮"],
  ["EQ-BR-F4-02", "维修", "2024-09-02", "WO-20240902-05", "冷却风机更换，绕组温度偏高处理"],
  ["EQ-BX-TS-01", "维修", "2025-01-15", "WO-20250115-02", "吐丝管磨损更换"],
  ["EQ-BX-TS-01", "改造", "2025-08-20", undefined, "导辊材质升级为碳化钨，寿命由 800h 提至 1500h"],
  ["EQ-LG-DZ-01", "维修", "2025-11-08", "WO-20251108-01", "起升机构制动器调整"],
  ["EQ-LT-TR-01", "大修", "2022-10-11", "WO-20221011-04", "透平叶片抽检、静叶汽封更换"],
  ["EQ-GG-CK-01", "维修", "2026-06-19", "WO-20260619-02", "穿孔机液压密封泄漏处理"],
  ["EQ-SJ-FJ-01", "改造", "2021-05-06", undefined, "加装油液在线监测与变频节能改造"],
];

let evSeq = 0;
for (const [eqId, type, at, refDocNo, note] of handWritten) {
  evSeq += 1;
  seedLifecycleEvents.push({ id: `LE-h${evSeq}`, eqId, type, at, refDocNo, note });
}

/** 由投运日反推「采购→安装→调试→投运」四步（间隔天数为工程惯例） */
function baseEvents(list: Equipment[]): LifecycleEvent[] {
  const out: LifecycleEvent[] = [];
  for (const e of list) {
    const t = new Date(`${e.commissionedAt}T00:00:00`).getTime();
    const day = 86400000;
    const steps: Array<[LifecycleEvent["type"], number, string]> = [
      ["采购", -150, `${e.vendor} 合同签订，设备到厂验收`],
      ["安装", -60, `${e.position} 基础与本体安装`],
      ["调试", -20, "单机试车与联动试车"],
      ["投运", 0, "移交生产，纳入 A/B/C 分级管控"],
    ];
    for (const [type, offset, note] of steps) {
      out.push({ id: `LE-${e.id}-${type}`, eqId: e.id, type, at: isoDate(t + offset * day), note });
    }
  }
  return out;
}

/** 零填充两位（日期与编号都用它） */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function isoDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

seedLifecycleEvents.push(...baseEvents(seedEquipments));

/** 技术文档（AE0004）——静态条目，演示不真下载 */
export const seedDocs: TechDoc[] = [
  {
    id: "DOC-001",
    name: "F4 精轧机机械安装图（总装）",
    type: "图纸",
    eqId: "EQ-BR-F4-01",
    author: "西门子VAI",
    at: "2014-01-08",
    size: "18.4 MB",
  },
  {
    id: "DOC-002",
    name: "Z4-1400kW 直流电机使用说明书",
    type: "说明书",
    eqId: "EQ-BR-F4-02",
    author: "西安电机",
    at: "2014-02-11",
    size: "6.2 MB",
  },
  {
    id: "DOC-003",
    name: "NUP318 轴承装配与力矩规范",
    type: "说明书",
    eqId: "EQ-BR-F4-03",
    author: "SKF",
    at: "2024-02-20",
    size: "1.8 MB",
  },
  {
    id: "DOC-004",
    name: "F4 主传动电机轴承更换 SOP",
    type: "操作SOP",
    eqId: "EQ-BR-F4-03",
    author: "设备部 刘工",
    at: "2024-09-18",
    size: "0.9 MB",
  },
  {
    id: "DOC-005",
    name: "高线吐丝机导辊更换作业指导书",
    type: "操作SOP",
    eqId: "EQ-BX-TS-01",
    author: "高线作业区",
    at: "2025-09-02",
    size: "1.1 MB",
  },
  {
    id: "DOC-006",
    name: "主抽风机振动超标故障案例分析",
    type: "故障案例",
    eqId: "EQ-SJ-FJ-01",
    author: "点检组 李强",
    at: "2025-12-14",
    size: "0.6 MB",
  },
  {
    id: "DOC-007",
    name: "TRT 透平叶片结垢导致振动预警案例",
    type: "故障案例",
    eqId: "EQ-LT-TR-01",
    author: "炼铁作业区",
    at: "2026-03-08",
    size: "0.7 MB",
  },
  {
    id: "DOC-008",
    name: "2#高炉炉顶卷扬点检标准卡",
    type: "操作SOP",
    eqId: "EQ-LT-YA-01",
    author: "点检组 王涛",
    at: "2026-04-22",
    size: "0.4 MB",
  },
  {
    id: "DOC-009",
    name: "PQF 芯棒使用与修复技术协议",
    type: "说明书",
    eqId: "EQ-GG-PQ-01",
    author: "中钢洛耐",
    at: "2020-12-01",
    size: "2.6 MB",
  },
  {
    id: "DOC-010",
    name: "液压 AGC 系统原理图",
    type: "图纸",
    eqId: "EQ-BR-AG-01",
    author: "力士乐",
    at: "2014-01-30",
    size: "11.3 MB",
  },
  {
    id: "DOC-011",
    name: "80t 铸造吊定期检验报告（2025）",
    type: "故障案例",
    eqId: "EQ-LG-DZ-01",
    author: "省特检院",
    at: "2025-10-16",
    size: "3.2 MB",
  },
  {
    id: "DOC-012",
    name: "穿孔机顶头烧损原因分析与改善",
    type: "故障案例",
    eqId: "EQ-GG-CK-01",
    author: "钢管作业区",
    at: "2026-07-11",
    size: "0.8 MB",
  },
];

/** 设备名索引（页面里到处要显示「设备名 + 型号」，集中一份，避免每页各建 map） */
export const equipmentName = new Map(seedEquipments.map((e) => [e.id, `${e.name}（${e.model}）`] as const));
