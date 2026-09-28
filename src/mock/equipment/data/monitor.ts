import type {
  Alarm,
  AlarmRule,
  InspectionTask,
  PointCommState,
  PointDataType,
  PointMetric,
  PointProtocol,
  SensorPoint,
} from "@/api/equipment/types";

/**
 * 监测域种子（附录 B3：设备 30 台、测点 ~200 个、报警 15 条）。
 *
 * **一台设备配多少个点，由现场决定，不是固定的五六个。** 一台 1400kW 主传动电机就能配到
 * 15 个点（轴承 6：DE/NDE × 水平/垂直/轴向；绕组 3：U/V/W 相温度；主回路 3：三相电流；
 * 转速；冷却风温；编码器温度）。所以这里按「设备 → 二级采集位号 → 指标编码」三层写下来，
 * `dev()` 负责把三层展开成 `SensorPoint` 与配套的 `AlarmRule`——
 * **一张表就是三级标签树本身**，而不是先造点位再回头补标签。
 *
 * 原始值由现场采集服务写进 **InfluxDB**，本页只登记「按哪个 tagId 取值」，所以点位必须带齐写入侧配置：
 * `measurement` 按物理量分表、`eq`/`part`/`point` 三级 tag、值写进 `field`、
 * 采集周期 `sampleMs` 决定分辨率、`retention` 决定留多久（按秒采的振动留一年，盘先满）。
 * 采集协议与通讯地址都退场了——库里已经有数，寻址就是 tagId 本身，再让人填一遍只会填错。
 */

/** 指标类别 → 默认量纲、解码类型与 InfluxDB 写入目标（measurement / field / 采集周期） */
const METRIC_DEF: Record<PointMetric, { unit: string; type: PointDataType; meas: string; field: string; ms: number }> =
  {
    振动: { unit: "mm/s", type: "Float", meas: "vibration", field: "rms", ms: 1000 },
    温度: { unit: "℃", type: "Float", meas: "temperature", field: "value", ms: 5000 },
    位移: { unit: "mm", type: "Float", meas: "displacement", field: "value", ms: 1000 },
    转速: { unit: "r/min", type: "Int", meas: "speed", field: "value", ms: 1000 },
    电流: { unit: "A", type: "Float", meas: "motor_current", field: "value", ms: 2000 },
    压力: { unit: "MPa", type: "Float", meas: "pressure", field: "value", ms: 2000 },
    油液: { unit: "℃", type: "Float", meas: "oil_quality", field: "value", ms: 300000 },
  };

/** 三档阈值的兜底倍率：没显式给 `th` 时按指标类别的工程惯例从基线推 */
function defTh(metric: string, base: number): [number, number, number] {
  const r = (n: number) => Number(n.toFixed(Math.abs(base) < 10 ? 2 : 1));
  switch (metric) {
    case "振动":
      return base <= 4.5 ? [4.5, 7.1, 11.2] : [r(base * 1.3), r(base * 1.9), r(base * 2.8)];
    case "温度":
      return [Math.round(base + 9), Math.round(base + 19), Math.round(base + 30)];
    case "油液":
      return [Math.round(base + 8), Math.round(base + 16), Math.round(base + 26)];
    case "位移":
      return [
        r(base + Math.max(0.1, base * 0.15)),
        r(base + Math.max(0.2, base * 0.35)),
        r(base + Math.max(0.35, base * 0.6)),
      ];
    case "转速":
      return [Math.round(base * 1.05), Math.round(base * 1.12), Math.round(base * 1.2)];
    case "电流":
      return [Math.round(base * 1.1), Math.round(base * 1.25), Math.round(base * 1.4)];
    case "压力":
      return [r(base * 1.12), r(base * 1.25), r(base * 1.4)];
    default: {
      /* 手工新增又认不出类别：按工程上通用的 1.2/1.5/2 倍基线给三档，至少递增、分级不倒挂。
         基线为 0（还没接数的新点）时给一组绝对值，否则产出 0/0/0 等于一点值就全线报警。 */
      if (base <= 0) return [1, 2, 3];
      return [r(base * 1.2), r(base * 1.5), r(base * 2)];
    }
  }
}

/** 采集周期决定保留策略：高频原始数据短留、低频量长留（真实 InfluxDB 都这么配 RP） */
const retentionOf = (ms: number) => (ms <= 1000 ? "rp_30d" : ms <= 5000 ? "rp_90d" : "rp_1y");

/**
 * 从「指标名称 + 指标编码」里认出类别。新增表单不再让人从固定指标里选（客户现场的量纲远不止那七个词，
 * 名字替代了它），于是类别退回成一个**派生值**：认出来才给默认量纲与写入表，认不出来就用人填的那几栏，
 * 不猜。顺序有讲究——「齿轮油温」既像油液也像温度，按现场报表口径先判油液。
 */
const KIND_HINTS: Array<[PointMetric, string[]]> = [
  ["振动", ["振动", "振值", "VIB"]],
  ["油液", ["油液", "油品", "油温", "油压", "颗粒", "水分"]],
  ["温度", ["温度", "风温", "壁温", "水温", "TEMP"]],
  ["位移", ["位移", "间隙", "开度", "膨胀", "POS"]],
  ["转速", ["转速", "SPEED"]],
  ["电流", ["电流", "安培", "_I"]],
  ["压力", ["压力", "压强"]],
];
function kindOf(name = "", code = ""): PointMetric | "" {
  const text = `${name} ${code.toUpperCase()}`;
  for (const [kind, words] of KIND_HINTS) if (words.some((w) => text.includes(w))) return kind;
  return "";
}

/** 全部由时序库供数：这一栏不再是配置项，只是告诉看的人「数是从哪一路来的」 */
const POINT_SOURCE: PointProtocol = "InfluxDB";

/** [指标编码, 指标名称, 类别（只用于取默认量纲与阈值，见 `kindOf`）, 基线值, 可选项（单位/三档阈值/周期/通知渠道/停用/通讯状态/类型）] */
type PtRow = [code: string, name: string, metric: PointMetric, base: number, opt?: PtOpt];
interface PtOpt {
  unit?: string;
  th?: [number, number, number];
  ms?: number;
  ch?: AlarmRule["channels"];
  /** 该点的规则先停用（探头拆下校验、备用设备这类现场真实状态） */
  off?: boolean;
  /** 通讯状态。不给就跟着 `off` 走——链路断了和规则停用在现场是同一件事的两面 */
  state?: PointCommState;
  /** 原始数据类型。不给取该指标的惯例（转速是 Int，其余 Float） */
  type?: PointDataType;
}
/** [二级短码, 部件名, 该部件下的点位] */
type PartRow = [code: string, name: string, rows: PtRow[]];

const seedPoints: SensorPoint[] = [];
const seedAlarmRules: AlarmRule[] = [];

/* 网关按产线区段轮询分配：一台边缘网关带两三条主体的从站，同设备的点必在同一台网关下 */
const gwSeq = new Map<string, number>();
function gwOf(eqId: string) {
  const area = eqId.split("-")[1] ?? "XX";
  const n = (gwSeq.get(area) ?? 0) + 1;
  gwSeq.set(area, n);
  return `GW-${area}-${String(((n - 1) % 3) + 1).padStart(2, "0")}`;
}

/**
 * 把「人在配置页上填的几栏」展开成取值服务能直接读的一整行。
 *
 * 种子展开（`dev`）与手工新增（AM0001 的新增表单）走同一套约定：`measurement`/`fieldKey`/保留策略
 * 跟着指标类别与采集周期走、三级 tagId 跟着「二级采集位号 + 指标编码」走、`gwId` 跟着设备区段走。
 * **两边各写一遍的下场是配置页新加的点一到实时页就是半个点**——列表看着齐全，曲线取不到 measurement。
 * 对已经完整的行再展开一次是幂等的（每一栏都是「给了就尊重，没给才补」），所以编辑走也可以过这里。
 */
export function expandPoint(draft: Partial<SensorPoint> & { id: string; seq?: number }): SensorPoint {
  const eqId = draft.eqId ?? "";
  /* 输入框被清空时线上送来的是空串而不是 undefined，所以判「有没有给」用 `||` 而不是 `??`——
     一个清空的二级位号若落库成 ""，三级 tagId 当场变成 ".DE_TEMP" 这种库里查不到的键。 */
  /* 二级位号允许只填部件短码（现场口头就说「MOTOR」），补全成全路径才与库里的 tag 对得上 */
  const given2 = (draft.tag2Id || `${eqId}.${draft.partCode?.trim() || "BODY"}`).trim();
  const tag2Id = given2.includes(".") ? given2 : `${eqId}.${given2}`;
  const partCode = tag2Id.slice(tag2Id.indexOf(".") + 1);
  /* 没给指标编码时拿位号末尾序号兜一个，保证三级 tagId 仍然唯一、还能反查到位号 */
  const nn = draft.seq ?? (Number(draft.id.replace(/\D/g, "").slice(-2)) || 1);
  const metricCode = draft.metricCode?.trim() || `P${nn}`;
  const metric = draft.metric || kindOf(draft.name, metricCode);
  /* 类别认不出就是 undefined：量纲/写入表/默认周期一律退回人填的值，不拿「振动」的惯例去套一个压力点 */
  const d = METRIC_DEF[metric as PointMetric];
  const gw = draft.gwId?.trim() || gwOf(eqId);
  const ms = Number(draft.sampleMs) > 0 ? Number(draft.sampleMs) : (d?.ms ?? 5000);
  return {
    id: draft.id,
    eqId,
    partCode,
    partName: draft.partName?.trim() || (partCode === "BODY" ? "设备本体" : partCode),
    tag2Id,
    metricCode,
    name: draft.name?.trim() || metricCode,
    tag3Id: `${tag2Id}.${metricCode}`,
    metric,
    protocol: POINT_SOURCE,
    dataType: draft.dataType || d?.type || "Float",
    unit: draft.unit?.trim() || d?.unit || "",
    value: Number.isFinite(Number(draft.value)) ? Number(draft.value) : 0,
    commState: draft.commState || "在线",
    sampleMs: ms,
    measurement: draft.measurement?.trim() || d?.meas || "sensor_value",
    fieldKey: draft.fieldKey?.trim() || d?.field || "value",
    retention: draft.retention?.trim() || retentionOf(ms),
    gwId: gw,
  };
}

/**
 * 展开一台设备的三级标签树（逐点交给 `expandPoint`，与配置页手工新增共用一套派生规则）。
 *
 * 测点编号 `nn` 是**设备内序号**，与标签层级无关——报警、规则、历史曲线全都挂 `id`，
 * 所以改标签树、挪部件归属都不会打断已有的报警链（这是把 tagId 做成派生量而不是主键的原因）。
 */
function dev(eqId: string, parts: PartRow[]) {
  const short = eqId.replace(/[^A-Z0-9]/g, "").slice(2);
  const gw = gwOf(eqId);
  let nn = 0;
  for (const [partCode, partName, rows] of parts) {
    for (const [code, name, metric, base, opt = {}] of rows) {
      nn += 1;
      const id = `PT-${short}-${String(nn).padStart(2, "0")}`;
      seedPoints.push(
        expandPoint({
          id,
          seq: nn,
          eqId,
          gwId: gw,
          partCode,
          partName,
          metricCode: code,
          name,
          metric,
          dataType: opt.type,
          unit: opt.unit,
          value: base,
          commState: opt.state ?? (opt.off ? "离线" : "在线"),
          sampleMs: opt.ms,
        }),
      );
      const [warn, alarm, trip] = opt.th ?? defTh(metric, base);
      seedAlarmRules.push({
        id: `AR-${id}`,
        pointId: id,
        warn,
        alarm,
        trip,
        channels: opt.ch ?? ["站内"],
        enabled: opt.off !== true,
      });
    }
  }
}

/* ── 1#烧结机 LN-SJ01 ─────────────────────────────────────────────────── */

dev("EQ-SJ-FJ-01", [
  [
    "IMP",
    "叶轮转子",
    [
      ["DE_VIB_X", "叶轮驱动端水平振动", "振动", 3.2, { th: [4.5, 7.1, 11.2], ch: ["站内", "App"] }],
      ["DE_VIB_Y", "叶轮驱动端垂直振动", "振动", 2.9],
      ["NDE_VIB_X", "叶轮非驱动端水平振动", "振动", 2.6],
    ],
  ],
  [
    "BRG",
    "主轴承座",
    [
      ["DE_TEMP", "驱动端轴承温度", "温度", 52.4],
      ["NDE_TEMP", "非驱动端轴承温度", "温度", 49.8],
      ["HOUSING_VIB", "轴承座振动", "振动", 3.4],
    ],
  ],
  [
    "LUB",
    "润滑系统",
    [
      ["OIL_T", "润滑油温", "油液", 46.0],
      ["OIL_P", "润滑油压", "压力", 0.28],
    ],
  ],
  [
    "HYD",
    "液压站",
    [
      ["ACC_P", "蓄能器压力", "压力", 6.3],
      ["PUMP_I", "油泵电机电流", "电流", 42],
    ],
  ],
]);

dev("EQ-SJ-FJ-02", [
  [
    "BRG",
    "电机轴承",
    [
      ["DE_TEMP", "驱动端轴承温度", "温度", 58.4],
      ["NDE_TEMP", "非驱动端轴承温度", "温度", 56.2],
      ["DE_VIB_X", "驱动端水平振动", "振动", 3.1],
      ["NDE_VIB_X", "非驱动端水平振动", "振动", 2.7],
      ["AX_VIB", "轴向振动", "振动", 2.2],
    ],
  ],
  [
    "WND",
    "定子绕组",
    [
      ["U_TEMP", "U 相绕组温度", "温度", 68.5],
      ["V_TEMP", "V 相绕组温度", "温度", 67.2],
      ["W_TEMP", "W 相绕组温度", "温度", 69.0],
    ],
  ],
  [
    "CU",
    "定子回路",
    [
      ["U_I", "U 相电流", "电流", 262],
      ["V_I", "V 相电流", "电流", 258],
      ["W_I", "W 相电流", "电流", 264],
    ],
  ],
  [
    "COOL",
    "冷却与转速",
    [
      ["SPEED", "电机转速", "转速", 1497],
      ["FAN_T", "冷却风温", "温度", 38.6],
    ],
  ],
]);

dev("EQ-SJ-HL-01", [
  [
    "DRIVE",
    "台车驱动装置",
    [
      ["DRIVE_VIB", "驱动装置振动", "振动", 4.1],
      ["GB_OIL_T", "减速机油温", "油液", 47.5],
      ["DRIVE_I", "驱动电机电流", "电流", 96],
    ],
  ],
  [
    "ROLLER",
    "支承滚轮",
    [
      ["ROLLER_T", "滚轮轴承温度", "温度", 41.2],
      ["ROLLER_VIB", "滚轮振动", "振动", 2.4],
    ],
  ],
]);

dev("EQ-SJ-YH-01", [
  [
    "GB",
    "主齿轮箱",
    [
      ["OIL_T", "齿轮油温", "油液", 52.0],
      ["CASE_VIB_X", "壳体水平振动", "振动", 3.6],
      ["CASE_VIB_Y", "壳体垂直振动", "振动", 3.3],
    ],
  ],
  [
    "MOTOR",
    "筒体驱动电机",
    [
      ["M_I", "电机电流", "电流", 214],
      ["M_T", "轴承温度", "温度", 61.5],
    ],
  ],
]);

dev("EQ-SJ-DC-01", [
  [
    "MOTOR",
    "风机电机",
    [
      ["M_T", "轴承温度", "温度", 47.5],
      ["M_I", "电机电流", "电流", 58],
      ["M_VIB", "机体振动", "振动", 2.1],
    ],
  ],
]);

/* ── 2#高炉 LN-LT02 ───────────────────────────────────────────────────── */

dev("EQ-LT-NP-01", [
  [
    "HYD",
    "液压缸与管路",
    [
      ["CYL_P", "打击油压", "压力", 28.5],
      ["ACC_P", "蓄能器压力", "压力", 21.0],
    ],
  ],
  [
    "PUMP",
    "液压泵站",
    [
      ["OIL_T", "油温", "油液", 44.5],
      ["PUMP_I", "电机电流", "电流", 88],
    ],
  ],
  ["ROT", "回转机构", [["ROT_VIB", "回转减速机振动", "振动", 2.3]]],
]);

dev("EQ-LT-TR-01", [
  [
    "ROT",
    "透平转子",
    [
      ["DE_VIB_X", "驱动端轴振动", "振动", 6.8, { th: [5.6, 8.0, 11.0], ch: ["站内", "短信"] }],
      ["SPEED", "透平转速", "转速", 11230, { th: [11400, 11600, 11800] }],
      ["NDE_VIB_X", "非驱动端轴振动", "振动", 5.2],
      ["AX_POS", "轴向位移", "位移", 0.32, { th: [0.45, 0.6, 0.8] }],
    ],
  ],
  [
    "BRG",
    "支撑与推力轴承",
    [
      ["DE_TEMP", "驱动端轴承温度", "温度", 71.2],
      ["NDE_TEMP", "非驱动端轴承温度", "温度", 68.4],
      ["THRUST_TEMP", "推力轴承温度", "温度", 74.6],
    ],
  ],
  [
    "STEAM",
    "蒸汽与调节汽门",
    [
      ["MAIN_P", "主蒸汽压力", "压力", 1.15],
      ["EXH_T", "排汽温度", "温度", 88.5],
      ["GOV_POS", "调节汽门开度", "位移", 62.5, { unit: "%" }],
    ],
  ],
]);

dev("EQ-LT-YA-01", [
  [
    "GB",
    "卷扬减速机",
    [
      ["DE_TEMP", "驱动端温度", "温度", 62.0, { th: [65, 75, 85] }],
      ["NDE_TEMP", "非驱动端温度", "温度", 57.5],
      ["CASE_VIB", "减速机壳体振动", "振动", 3.8],
      ["OIL_T", "齿轮油温", "油液", 49.0],
    ],
  ],
  [
    "MOTOR",
    "卷扬电机",
    [
      ["M_T", "轴承温度", "温度", 58.8],
      ["M_I", "电机电流", "电流", 158],
    ],
  ],
  ["BRK", "制动器", [["GAP", "闸瓦间隙", "位移", 1.8, { th: [2.2, 2.8, 3.5] }]]],
]);

dev("EQ-LT-RF-01", [
  [
    "DOM",
    "炉顶",
    [
      ["TOP_T", "拱顶温度", "温度", 1180, { th: [1200, 1215, 1250] }],
      ["TOP_P", "炉顶压力", "压力", 0.08, { th: [0.1, 0.13, 0.16] }],
    ],
  ],
  [
    "FLUE",
    "烟道与燃烧",
    [
      ["EXH_T", "烟气出口温度", "温度", 148],
      ["GAS_P", "煤气总管压力", "压力", 0.12],
    ],
  ],
]);

dev("EQ-LT-JL-01", [
  [
    "MOTOR",
    "给料驱动",
    [
      ["M_I", "电机电流", "电流", 68],
      ["GB_T", "减速机温度", "温度", 45.6],
      ["CASE_VIB", "机体振动", "振动", 2.0],
    ],
  ],
]);

/* ── 转炉-连铸 LN-LG02 ────────────────────────────────────────────────── */

dev("EQ-LG-YQ-01", [
  [
    "MOTOR",
    "提升电机",
    [
      ["M_T", "轴承温度", "温度", 64.5],
      ["M_I", "电机电流", "电流", 242],
      ["M_VIB_X", "驱动端水平振动", "振动", 4.2],
    ],
  ],
  [
    "GB",
    "卷扬减速机",
    [
      ["GB_T", "减速机温度", "温度", 58.0],
      ["CASE_VIB", "壳体振动", "振动", 3.6],
      ["OIL_T", "齿轮油温", "油液", 47.2],
    ],
  ],
  ["BRK", "工作制动器", [["GAP", "闸瓦间隙", "位移", 1.6, { th: [2.0, 2.6, 3.2] }]]],
  [
    "HOO",
    "氧枪本体",
    [
      ["GUN_T", "枪身表面温度", "温度", 96.0],
      ["WATER_P", "冷却水压力", "压力", 0.85],
    ],
  ],
]);

dev("EQ-LG-JJ-01", [
  [
    "TBL",
    "振动台体",
    [
      ["HORIZ_VIB", "台体水平振动", "振动", 5.4],
      ["VERT_VIB", "台体垂直振动", "振动", 4.6],
      ["SWAY", "台体偏摆", "位移", 0.6, { th: [0.8, 1.2, 1.6] }],
    ],
  ],
  [
    "MOTOR",
    "激振电机",
    [
      ["M_I", "电机电流", "电流", 62],
      ["M_T", "轴承温度", "温度", 59.5],
    ],
  ],
  [
    "HYD",
    "液压压紧",
    [
      ["H_P", "压紧油压", "压力", 8.5],
      ["OIL_T", "油温", "油液", 43.5],
    ],
  ],
]);

dev("EQ-LG-DZ-01", [
  [
    "HOIST",
    "起升机构",
    [
      ["HOIST_VIB", "起升机构振动", "振动", 4.9],
      ["DRUM_T", "卷筒轴承温度", "温度", 61.2],
      ["M_I", "起升电机电流", "电流", 312],
      ["BRK_GAP", "起升制动器间隙", "位移", 1.5, { th: [1.8, 2.4, 3.0] }],
    ],
  ],
  [
    "TROLLY",
    "小车运行",
    [
      ["T_VIB", "小车振动", "振动", 2.8],
      ["T_I", "小电机电流", "电流", 88],
    ],
  ],
  [
    "ROT",
    "回转支承",
    [
      ["R_T", "回转支承温度", "温度", 48.6],
      ["R_VIB", "回转振动", "振动", 2.2],
    ],
  ],
]);

dev("EQ-LG-LZ-01", [
  [
    "MOTOR",
    "拉矫电机",
    [
      ["M_I", "电机电流", "电流", 148],
      ["M_T", "轴承温度", "温度", 54.0],
    ],
  ],
  [
    "WATER",
    "二冷却水",
    [
      ["SPR_P", "喷水压力", "压力", 0.45],
      ["OUT_T", "出水温度", "温度", 48.5],
    ],
  ],
]);

/* ── 1#高速线材 LN-BX01 ───────────────────────────────────────────────── */

dev("EQ-BX-CZ-01", [
  [
    "ROLL",
    "轧辊与轴承",
    [
      ["FRAME_VIB_X", "机架水平振动", "振动", 3.8],
      ["ROLL_DE_T", "工作辊轴承温度", "温度", 57.8],
      ["ROLL_NDE_T", "非驱动端轴承温度", "温度", 55.2],
    ],
  ],
  [
    "MOTOR",
    "主传动电机",
    [
      ["M_I", "电机电流", "电流", 690],
      ["M_T", "轴承温度", "温度", 63.5],
      ["M_VIB_X", "驱动端水平振动", "振动", 3.4],
    ],
  ],
  [
    "GB",
    "减速机与导卫",
    [
      ["OIL_T", "齿轮油温", "油液", 46.8],
      ["GB_VIB", "减速机振动", "振动", 3.0],
    ],
  ],
]);

dev("EQ-BX-ZZ-01", [
  [
    "ROLL",
    "轧机机架",
    [
      ["FRAME_VIB", "机架振动", "振动", 4.6],
      ["ROLL_T", "工作辊轴承温度", "温度", 59.0],
    ],
  ],
  [
    "MOTOR",
    "主传动电机",
    [
      ["M_I", "电机电流", "电流", 470],
      ["M_T", "轴承温度", "温度", 62.4],
      ["M_VIB", "机体振动", "振动", 4.1],
    ],
  ],
  [
    "GUIDE",
    "导卫装置",
    [
      ["GD_T", "导卫温度", "温度", 68.5],
      ["GD_VIB", "导卫振动", "振动", 2.6],
    ],
  ],
]);

dev("EQ-BX-JZ-01", [
  [
    "FRAME",
    "12# 机架",
    [
      ["F12_VIB_X", "12# 机架水平振动", "振动", 7.2, { th: [6.0, 8.5, 9.5], ch: ["站内", "App", "短信"] }],
      ["F12_SPEED", "12# 机架转速", "转速", 1850, { th: [1900, 2000, 2100] }],
      ["F12_VIB_Y", "12# 机架垂直振动", "振动", 6.4],
      ["ROLL_T", "工作辊轴承温度", "温度", 66.5],
    ],
  ],
  [
    "MOTOR",
    "主传动电机",
    [
      ["M_I", "电机电流", "电流", 1240],
      ["M_T", "轴承温度", "温度", 71.8],
      ["M_VIB", "机体振动", "振动", 5.0],
    ],
  ],
  [
    "AGC",
    "液压 AGC 与油膜",
    [
      ["AGC_P", "AGC 油压", "压力", 21.5],
      ["FILM_P", "油膜轴承油压", "压力", 1.6],
      ["OIL_T", "润滑油温", "油液", 48.5],
    ],
  ],
]);

dev("EQ-BX-TS-01", [
  [
    "SPIT",
    "吐丝盘与导辊",
    [
      ["DSB_TEMP", "吐丝主轴轴承温度", "温度", 82.6, { th: [75, 85, 95], ch: ["站内", "App"] }],
      ["GUIDE_VIB", "导辊振动", "振动", 8.1, { state: "超时" }],
      ["DISC_T", "吐丝盘温度", "温度", 145, { th: [160, 180, 200] }],
      ["DISC_VIB", "吐丝盘振动", "振动", 6.2, { off: true }],
    ],
  ],
  [
    "MOTOR",
    "驱动电机",
    [
      ["M_I", "电机电流", "电流", 168],
      ["M_T", "轴承温度", "温度", 65.4],
      ["M_VIB", "机体振动", "振动", 4.4],
    ],
  ],
  [
    "LUB",
    "润滑与冷却",
    [
      ["OIL_T", "润滑油温", "油液", 45.8],
      ["WATER_P", "冷却水压力", "压力", 0.55],
    ],
  ],
  ["FRAME", "机组底座", [["BASE_VIB", "底座振动", "振动", 3.2]]],
]);

dev("EQ-BX-GL-01", [
  [
    "MOTOR",
    "风机变频电机",
    [
      ["M_I", "电机电流", "电流", 88],
      ["M_VIB", "机体振动", "振动", 2.5],
      ["M_T", "轴承温度", "温度", 51.2],
    ],
  ],
  ["ROLLER", "辊道传动", [["RKR_VIB", "辊道振动", "振动", 2.0]]],
]);

dev("EQ-BX-KS-01", [
  [
    "DRIVE",
    "收集链驱动",
    [
      ["D_I", "驱动电机电流", "电流", 46],
      ["GB_T", "减速机温度", "温度", 47.5],
      ["CASE_VIB", "链条箱振动", "振动", 2.1],
    ],
  ],
]);

/* ── 1780 热连轧 LN-BR01 ──────────────────────────────────────────────── */

dev("EQ-BR-TG-01", [
  [
    "HYD",
    "推钢液压",
    [
      ["PUSH_P", "推钢油压", "压力", 12.5],
      ["OIL_T", "液压站油温", "油液", 44.0],
    ],
  ],
  [
    "FRAME",
    "机体与滑道",
    [
      ["BODY_VIB", "机体振动", "振动", 3.0],
      ["RAIL_T", "滑道温度", "温度", 62.5],
    ],
  ],
]);

dev("EQ-BR-R1-01", [
  [
    "ROLL",
    "轧辊与轴承",
    [
      ["DE_VIB_X", "驱动端水平振动", "振动", 5.1],
      ["NDE_VIB_X", "非驱动端水平振动", "振动", 4.5],
      ["ROLL_DE_T", "工作辊轴承温度", "温度", 66.3],
      ["GAP_POS", "辊缝位移", "位移", 42.5, { unit: "mm", th: [46, 50, 55] }],
    ],
  ],
  [
    "MOTOR",
    "主传动电机",
    [
      ["M_I", "电机电流", "电流", 2150],
      ["M_T", "轴承温度", "温度", 69.8],
      ["M_VIB", "机体振动", "振动", 4.6],
      ["WND_T", "绕组温度", "温度", 78.5],
    ],
  ],
  ["AGC", "液压 AGC", [["AGC_P", "AGC 油压", "压力", 19.5]]],
]);

dev("EQ-BR-F4-01", [
  [
    "FRAME",
    "F4 牌坊",
    [
      ["VIB_X", "牌坊水平振动", "振动", 6.2],
      ["VIB_Y", "牌坊垂直振动", "振动", 5.5],
      ["ROLL_F", "轧制力", "压力", 21.5, { unit: "MN", th: [24, 26, 28] }],
    ],
  ],
  [
    "ROLL",
    "工作辊与油膜轴承",
    [
      ["DE_T", "工作辊轴承温度", "温度", 68.5],
      ["NDE_T", "非驱动端轴承温度", "温度", 65.2],
      ["DE_VIB", "轧辊端振动", "振动", 5.8],
    ],
  ],
  [
    "AGC",
    "液压 AGC",
    [
      ["AGC_P", "AGC 油压", "压力", 22.4],
      ["OIL_T", "油温", "油液", 49.5],
    ],
  ],
  ["LUB", "油膜轴承润滑", [["FILM_P", "油膜压力", "压力", 1.8]]],
]);

/* ★ 主线剧本设备：F4 主传动电机（健康度 61），一台电机 15 个点 */
dev("EQ-BR-F4-02", [
  [
    "BRG",
    "电机轴承",
    [
      ["DE_TEMP", "驱动端轴承温度", "温度", 74.8, { ch: ["站内", "App"] }],
      ["NDE_TEMP", "非驱动端轴承温度", "温度", 70.2],
      ["DE_VIB_X", "驱动端水平振动", "振动", 5.6],
      ["DE_VIB_Y", "驱动端垂直振动", "振动", 5.1],
      ["DE_VIB_Z", "驱动端轴向振动", "振动", 4.3],
      ["NDE_VIB_X", "非驱动端水平振动", "振动", 4.8],
    ],
  ],
  [
    "WND",
    "定子绕组",
    [
      ["U_TEMP", "U 相绕组温度", "温度", 88.5],
      ["V_TEMP", "V 相绕组温度", "温度", 86.2],
      ["W_TEMP", "W 相绕组温度", "温度", 89.4],
    ],
  ],
  [
    "CU",
    "主回路",
    [
      ["U_I", "U 相电流", "电流", 1486, { th: [1500, 1650, 1800], ch: ["站内", "App"] }],
      ["V_I", "V 相电流", "电流", 1462],
      ["W_I", "W 相电流", "电流", 1505],
    ],
  ],
  ["REV", "转速", [["SPEED", "电机转速", "转速", 985]]],
  [
    "COOL",
    "冷却与编码器",
    [
      ["FAN_T", "冷却风温", "温度", 42.6],
      ["ENC_T", "编码器温度", "温度", 45.0],
    ],
  ],
]);

/* ★ 主线剧本第 3 幕的测点在这台下面：`PT-BRF403-01` 温度 61.2 → 剧本推到 88.4 */
dev("EQ-BR-F4-03", [
  [
    "BRG",
    "轴承本体",
    [
      ["DE_TEMP", "驱动端轴承外圈温度", "温度", 61.2, { th: [70, 80, 90], ch: ["站内", "App", "短信"] }],
      ["DE_VIB_X", "外圈水平振动", "振动", 5.9],
      ["DE_VIB_Y", "外圈垂直振动", "振动", 5.2],
      ["DE_VIB_Z", "外圈轴向振动", "振动", 4.6],
      ["BPFO_ENV", "外圈缺陷包络值", "振动", 1.8, { unit: "g", th: [2.2, 3.0, 4.0] }],
    ],
  ],
  [
    "HSG",
    "轴承座",
    [
      ["HSG_T", "轴承座温度", "温度", 58.4],
      ["HSG_VIB", "轴承座振动", "振动", 4.9],
    ],
  ],
  [
    "LUB",
    "油气润滑",
    [
      ["OIL_T", "润滑油温", "油液", 44.2],
      ["OIL_P", "供油压力", "压力", 0.35],
      ["PARTICLE", "颗粒度", "油液", 7, { unit: "NAS", th: [9, 11, 13], ms: 3600000 }],
    ],
  ],
  ["SHFT", "轴系", [["AX_POS", "轴位移", "位移", 0.18, { th: [0.25, 0.35, 0.5] }]]],
]);

dev("EQ-BR-QQ-01", [
  [
    "DRUM",
    "卷筒",
    [
      ["D_VIB", "卷筒振动", "振动", 4.4],
      ["D_T", "卷筒轴承温度", "温度", 59.8],
    ],
  ],
  [
    "MOTOR",
    "主电机",
    [
      ["M_I", "电机电流", "电流", 980],
      ["M_T", "轴承温度", "温度", 67.2],
      ["M_VIB", "机体振动", "振动", 4.8],
    ],
  ],
  ["BND", "助卷辊", [["BND_T", "助卷辊温度", "温度", 63.5]]],
  [
    "HYD",
    "液压与润滑",
    [
      ["ACC_P", "蓄能器压力", "压力", 14.5],
      ["OIL_T", "润滑油温", "油液", 45.2],
    ],
  ],
]);

dev("EQ-BR-AG-01", [
  [
    "PUMP",
    "主油泵组",
    [
      ["PUMP_I", "电机电流", "电流", 132],
      ["PUMP_VIB", "油泵机组振动", "振动", 3.6],
    ],
  ],
  [
    "SYS",
    "通路与蓄能器",
    [
      ["SYS_P", "系统压力", "压力", 21.8],
      ["ACC_P", "蓄能器氮气压力", "压力", 12.6],
    ],
  ],
  [
    "OIL",
    "油液品质",
    [
      ["OIL_T", "油温", "油液", 44.0],
      ["MOIST", "水分", "油液", 180, { unit: "ppm", th: [300, 500, 800], ms: 3600000 }],
    ],
  ],
]);

/* ── 340 PQF 钢管 LN-GG01 ─────────────────────────────────────────────── */

dev("EQ-GG-JR-01", [
  [
    "FURN",
    "炉膛",
    [
      ["SOAK_T", "均热段炉内温度", "温度", 1240, { th: [1220, 1245, 1260] }],
      ["WALL_T", "炉墙外表面温度", "温度", 168],
    ],
  ],
  [
    "GAS",
    "燃料与助燃",
    [
      ["GAS_P", "煤气总管压力", "压力", 0.15],
      ["FAN_I", "助燃风机电流", "电流", 76],
    ],
  ],
]);

dev("EQ-GG-CK-01", [
  [
    "HYD",
    "液压系统",
    [
      ["SYS_P", "主液压站系统压力", "压力", 21.4, { th: [23, 25, 27] }],
      ["ACC_P", "蓄能器压力", "压力", 18.6, { off: true }],
    ],
  ],
  [
    "ROLL",
    "穿孔机主辊与顶头",
    [
      ["NOSE_T", "顶头冷却座温度", "温度", 96.5, { th: [110, 130, 150] }],
      ["ROLL_VIB", "机架振动", "振动", 6.8],
    ],
  ],
  [
    "MOTOR",
    "主传动",
    [
      ["M_I", "电机电流", "电流", 620],
      ["M_T", "轴承温度", "温度", 72.4],
    ],
  ],
]);

dev("EQ-GG-PQ-01", [
  [
    "MANDREL",
    "芯棒本体",
    [
      ["SURF_T", "芯棒表面温度", "温度", 168, { th: [180, 190, 210], ch: ["站内"] }],
      ["COOL_P", "内冷水压力", "压力", 0.62],
    ],
  ],
  [
    "ROLL",
    "三辊轧机",
    [
      ["ROLL_VIB", "机架振动", "振动", 5.0],
      ["ROLL_T", "轧辊轴承温度", "温度", 68.4],
    ],
  ],
  [
    "MOTOR",
    "主传动",
    [
      ["M_I", "电机电流", "电流", 415],
      ["M_T", "轴承温度", "温度", 63.2],
    ],
  ],
]);

export { seedPoints, seedAlarmRules };

/**
 * 历史报警 15 条（附录 B3/B4）。
 *
 * 状态分布刻意为「活动 3 / 已确认 4 / 已转工单 4 / 已关闭 4」——
 * 报警中心要能演示三个动作（确认 / 转工单 / 关闭），每种状态都得有样本；
 * 且**已转工单的四条与工单表的 4 张 `source=报警转单` 工单号一一对应**，
 * 客户点开通道能看到闭环，这是演示最有说服力的地方。
 */
function alm(
  id: string,
  pointId: string,
  eqId: string,
  level: Alarm["level"],
  value: number,
  msg: string,
  occurredAt: string,
  status: Alarm["status"],
  woId?: string,
  ackBy?: string,
): Alarm {
  return { id, pointId, eqId, level, value, msg, occurredAt, status, woId, ackBy };
}

export const seedAlarms: Alarm[] = [
  alm(
    "ALM-20260920-01",
    "PT-SJFJ01-01",
    "EQ-SJ-FJ-01",
    "报警",
    7.6,
    "主抽风机驱动端振动超标（粉尘环境，疑似叶轮结垢）",
    "2026-09-20 07:42:11",
    "已关闭",
    "WO-20260920-01",
    "李强",
  ),
  alm(
    "ALM-20260921-01",
    "PT-LTTR01-01",
    "EQ-LT-TR-01",
    "预警",
    6.4,
    "TRT 透平 1# 轴承振动缓慢上升",
    "2026-09-21 14:08:53",
    "已确认",
    undefined,
    "王涛",
  ),
  alm(
    "ALM-20260922-01",
    "PT-BXTS01-01",
    "EQ-BX-TS-01",
    "报警",
    86.3,
    "吐丝机主轴轴承温度高",
    "2026-09-22 09:31:20",
    "已转工单",
    "WO-20260922-02",
    "李强",
  ),
  alm(
    "ALM-20260922-02",
    "PT-BXJZ01-01",
    "EQ-BX-JZ-01",
    "紧急",
    9.8,
    "精轧机组 12# 机架振动突升，疑似轧辊掉肉",
    "2026-09-22 21:05:07",
    "已转工单",
    "WO-20260922-05",
    "刘工",
  ),
  alm(
    "ALM-20260923-01",
    "PT-GGCK01-01",
    "EQ-GG-CK-01",
    "报警",
    18.9,
    "穿孔机液压系统压力跌落（密封泄漏）",
    "2026-09-23 06:19:44",
    "已转工单",
    "WO-20260923-01",
    "王涛",
  ),
  alm(
    "ALM-20260923-02",
    "PT-LGDZ01-01",
    "EQ-LG-DZ-01",
    "预警",
    5.2,
    "80t 铸造吊起升机构振动偏高",
    "2026-09-23 11:47:02",
    "已确认",
    undefined,
    "刘工",
  ),
  alm(
    "ALM-20260924-01",
    "PT-BRF402-02",
    "EQ-BR-F4-02",
    "预警",
    1520,
    "F4 主传动电机电流超额定包络",
    "2026-09-24 08:12:36",
    "活动",
  ),
  alm(
    "ALM-20260924-02",
    "PT-LTYA01-01",
    "EQ-LT-YA-01",
    "预警",
    66.8,
    "炉顶卷扬减速机温升偏快（点检发现）",
    "2026-09-24 15:26:41",
    "已确认",
    undefined,
    "李强",
  ),
  alm(
    "ALM-20260925-01",
    "PT-SJHL01-01",
    "EQ-SJ-HL-01",
    "预警",
    5.0,
    "环冷机台车振动轻微超标",
    "2026-09-25 03:58:19",
    "已关闭",
    "WO-20260925-03",
    "王涛",
  ),
  alm(
    "ALM-20260925-02",
    "PT-LTRF01-01",
    "EQ-LT-RF-01",
    "报警",
    1216,
    "3# 热风炉拱顶温度超设定上限",
    "2026-09-25 10:14:55",
    "已确认",
    undefined,
    "王涛",
  ),
  alm(
    "ALM-20260925-03",
    "PT-BRQQ01-01",
    "EQ-BR-QQ-01",
    "预警",
    4.9,
    "卷取机 2# 导板振动趋势上升",
    "2026-09-25 19:33:08",
    "活动",
  ),
  alm(
    "ALM-20260926-01",
    "PT-GGPQ01-01",
    "EQ-GG-PQ-01",
    "报警",
    196,
    "PQF 芯棒表面温度异常（高值消耗件，关注寿命）",
    "2026-09-26 07:02:47",
    "活动",
  ),
  alm(
    "ALM-20260926-02",
    "PT-BRTS01-02",
    "EQ-BX-TS-01",
    "紧急",
    11.6,
    "吐丝机导辊振动突变，建议立即停机检查",
    "2026-09-26 13:41:29",
    "已转工单",
    "WO-20260926-02",
    "刘工",
  ),
  alm(
    "ALM-20260926-03",
    "PT-LGJJ01-01",
    "EQ-LG-JJ-01",
    "预警",
    5.6,
    "结晶器振动台偏摆异常",
    "2026-09-26 20:55:13",
    "已关闭",
    "WO-20260926-05",
    "李强",
  ),
  /* 主线剧本第 3 幕由「实时监控」页的定时器生成，这里预置一条同族历史报警做对比 */
  alm(
    "ALM-20260919-01",
    "PT-BRF403-01",
    "EQ-BR-F4-03",
    "预警",
    72.4,
    "F4 主传动电机轴承温度偏高（历史）",
    "2026-09-19 05:22:31",
    "已关闭",
    "WO-20260919-04",
    "李强",
  ),
];

/** 点巡检任务（AM0005）——移动端 H5 扫码签到的待办来源 */
export const seedInspections: InspectionTask[] = [
  {
    id: "IT-20260927-01",
    name: "烧结主抽风机日常点检",
    eqId: "EQ-SJ-FJ-01",
    route: "烧结巡检线 A",
    person: "李强",
    planDate: "2026-09-27",
    doneAt: "2026-09-27 08:12:40",
    result: "正常",
    note: "振动 3.2 mm/s、油温 46 ℃，均在预警线内",
  },
  {
    id: "IT-20260927-02",
    name: "高炉 TRT 精密点检",
    eqId: "EQ-LT-TR-01",
    route: "炼铁巡检线 B",
    person: "王涛",
    planDate: "2026-09-27",
    result: "待检",
    note: "计划 09:30 携蓝牙振动仪上炉顶",
  },
  {
    id: "IT-20260927-03",
    name: "1780 精轧跨 F4 点检",
    eqId: "EQ-BR-F4-01",
    route: "板材巡检线 A",
    person: "李强",
    planDate: "2026-09-27",
    result: "异常",
    note: "电机驱动端轴承温度手感偏热，已录入 72.4 ℃ 待复核",
  },
  {
    id: "IT-20260927-04",
    name: "高线吐丝机专项点检",
    eqId: "EQ-BX-TS-01",
    route: "棒线巡检线 A",
    person: "王涛",
    planDate: "2026-09-27",
    result: "异常",
    note: "导辊表面可见磨痕，建议本班次加测温一次",
  },
  {
    id: "IT-20260927-05",
    name: "转炉氧枪卷扬点检",
    eqId: "EQ-LG-YQ-01",
    route: "炼钢巡检线 A",
    person: "李强",
    planDate: "2026-09-27",
    doneAt: "2026-09-27 07:45:11",
    result: "正常",
    note: "钢丝绳无断丝，卷扬制动可靠",
  },
  {
    id: "IT-20260927-06",
    name: "80t 铸造吊月度检查",
    eqId: "EQ-LG-DZ-01",
    route: "炼钢巡检线 B",
    person: "王涛",
    planDate: "2026-09-27",
    result: "待检",
    note: "结合特种设备检验到期项一并核查",
  },
  {
    id: "IT-20260927-07",
    name: "PQF 芯棒冷却水路点检",
    eqId: "EQ-GG-PQ-01",
    route: "管材巡检线 A",
    person: "李强",
    planDate: "2026-09-27",
    result: "异常",
    note: "表面温度 196 ℃，接近报警阈值，已联动报警中心",
  },
  {
    id: "IT-20260927-08",
    name: "加热炉推钢机润滑点检",
    eqId: "EQ-BR-TG-01",
    route: "板材巡检线 B",
    person: "王涛",
    planDate: "2026-09-27",
    doneAt: "2026-09-27 06:30:02",
    result: "正常",
    note: "自动润滑泵压力正常",
  },
  {
    id: "IT-20260926-09",
    name: "环冷机台车周检",
    eqId: "EQ-SJ-HL-01",
    route: "烧结巡检线 A",
    person: "王涛",
    planDate: "2026-09-26",
    doneAt: "2026-09-26 15:20:33",
    result: "正常",
    note: "台车运转平稳",
  },
  {
    id: "IT-20260926-10",
    name: "炉顶卷扬减速机点检",
    eqId: "EQ-LT-YA-01",
    route: "炼铁巡检线 B",
    person: "李强",
    planDate: "2026-09-26",
    doneAt: "2026-09-26 09:11:47",
    result: "异常",
    note: "温升偏快，需补充油液样品送检",
  },
];
