import type { CollectPoint, CollectResult, EnergyInterfaceRow, InterfaceLog } from "@/api/mes4tq/types";
import { PROCESS_SEQ, UNITS, WORKSHOPS, unitsOfProcess } from "./org";
import { DEMO_DATE, between, dayOffset, pick, rng, stamp } from "./model";

/**
 * TI 系统集成的种子数据（4 页：采集点位 / 采集结果 / 接口日志 / 能源数据接口）。
 *
 * 这一屏是客户**第一个追问的地方**——「我厂里的东西你怎么接进来」。
 * 所以三类数据都要能对得上真实钢铁厂的对接面（规格书 B10 的 13 个接口 + B1 的 7 个自控系统），
 * 编得像不像，看的就是这两张表。
 *
 * ⚠️ 业务数字（产量、成本、系数）不在这儿；本文件只放**主数据与事件流水**：
 * 点位表、日志流水、EMS 推来的能耗行。
 */

/* ══════════════════════════════════════════════════════════════════════════
   1. 自控系统分区（规格书 B1 真实数据）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * B1「自控系统现状」的七个分区。
 *
 * `total` 是**该分区的点位总数**（B1 给的），`protocol`/`system` 逐字照 B1——
 * 客户一眼能看出「西屋 Ovation / 施耐德 / 和利时」这些是他厂里真实跑着的系统。
 * `sampled` 是本表实际铺出来的样本点数（全铺 16000 多个点只会拖慢菜单），
 * 所以统计卡显示的是 `total`，表里展示的是样本，**两个数要分清**——
 * 页面上的统计卡用 `total`，表头写「样本点位」，否则客户会以为 16000 个点只接进来 60 个。
 */
export interface Area {
  area: string;
  system: string;
  protocol: string;
  /** 总点数（B1 原值） */
  total: number;
  /** 对应机组（挂不上具体机组的给空） */
  unitId?: string;
  /** 样本点数 */
  sampled: number;
}

export const AREAS: Area[] = [
  { area: "高炉主工艺", system: "西屋 Ovation", protocol: "FDDI", total: 4263, unitId: "GL01-01", sampled: 8 },
  { area: "高炉辅助", system: "施耐德", protocol: "MBE", total: 5000, unitId: "GL01-02", sampled: 7 },
  { area: "烧结", system: "施耐德", protocol: "MBE", total: 3300, unitId: "SJ01-01", sampled: 7 },
  { area: "焦化煤气净化", system: "和利时 DCS", protocol: "OPC-DA", total: 1300, unitId: "JL01-01", sampled: 5 },
  { area: "焦化焦炉", system: "和利时 DCS", protocol: "OPC-DA", total: 336, unitId: "JL01-02", sampled: 5 },
  { area: "焦化煤焦", system: "施耐德", protocol: "MBE", total: 1480, unitId: "PM01-01", sampled: 5 },
  { area: "球团", system: "浙大中控 ICS-3000", protocol: "非标TCP", total: 480, unitId: "QT01-01", sampled: 5 },
  { area: "原料与白灰", system: "施耐德", protocol: "MB+", total: 420, unitId: "HY01-01", sampled: 5 },
];

/* ══════════════════════════════════════════════════════════════════════════
   2. 采集点位（TI0001）
   ══════════════════════════════════════════════════════════════════════════ */

/** 每个分区铺几类典型点位（温度/压力/流量/电流/液位/状态），保证表里不是一屏同名 */
const POINT_KINDS = [
  { name: "温度", unit: "℃", type: "AI", lo: 80, hi: 1350, digits: 0 },
  { name: "压力", unit: "kPa", type: "AI", lo: 10, hi: 420, digits: 0 },
  { name: "流量", unit: "m³/h", type: "AI", lo: 200, hi: 8000, digits: 0 },
  { name: "电流", unit: "A", type: "AI", lo: 50, hi: 520, digits: 0 },
  { name: "液位", unit: "mm", type: "AI", lo: 0, hi: 1000, digits: 0 },
  { name: "运行状态", unit: "", type: "DI", lo: 0, hi: 1, digits: 0 },
  { name: "联锁状态", unit: "", type: "DI", lo: 0, hi: 1, digits: 0 },
  { name: "阀门开度", unit: "%", type: "AI", lo: 0, hi: 100, digits: 0 },
];

/**
 * 采集点位表。
 *
 * 编码 `CP-<区>-<序号>`，地址按真实系统的编址习惯分段
 * （OPC 走 `ns=1;s=`、MBE 走 `%MW100` 这种 modicon 风格、FDDI 与 TCP 走 IP:Port）——
 * 地址编得像真的，客户才会拿它去核对现场点表。
 */
export const COLLECT_POINTS: CollectPoint[] = AREAS.flatMap((area, ai) =>
  Array.from({ length: area.sampled }, (_, i) => {
    const kind = POINT_KINDS[i % POINT_KINDS.length];
    const seq = String(i + 1).padStart(3, "0");
    const base = `${area.area}-${kind.name}`;
    const addr = area.protocol.startsWith("OPC")
      ? `ns=1;s=.${(area.unitId ?? "SITE").replace("-", "_")}.${kind.name}${seq}`
      : area.protocol.startsWith("MB")
        ? `%MW${100 + ai * 40 + i * 4}`
        : area.protocol === "FDDI"
          ? `10.20.${ai}.${10 + i}:4840`
          : `192.168.${ai}.${10 + i}:6000`;
    /* 上下限按量程的 60%~80% 收，中间留出越限空间——限值贴着量程，永远不会报警 */
    const span = kind.hi - kind.lo;
    return {
      id: `CP-${String(ai + 1).padStart(2, "0")}${seq}`,
      unitId: area.unitId ?? "",
      pointName: `${area.area}${kind.name}${seq}`,
      dataType: kind.type,
      protocol: area.protocol,
      address: addr,
      description: `${area.system} · ${area.area} · ${base}`,
      lowerLimit: Math.round(kind.lo + span * 0.1),
      upperLimit: Math.round(kind.lo + span * 0.9),
      enabled: true,
      area: area.area,
      unit: kind.unit,
    } satisfies CollectPoint;
  }),
);

/**
 * 采样量程（生成 `CollectResult.value` 用）。
 * 按点位名里的关键词给基准值，避免「温度点显示 1500」这种和上下限对不上的数。
 */
/**
 * 点位 id → 点位（`collectResult/history` 要用它取该点的上下限——
 * 没有它，历史曲线的限值参考线就画不出来）。
 * ⚠️ 与 `routes/integrate.ts` **同名文件**，改动时别只看 basename。
 */
export const POINT_BY_ID: Record<string, CollectPoint> = Object.fromEntries(COLLECT_POINTS.map((p) => [p.id, p]));

function pointRange(p: CollectPoint): [number, number] {
  const name = p.pointName;
  if (name.includes("温度")) return p.unitId.startsWith("GL") ? [1150, 1250] : [300, 520];
  if (name.includes("压力")) return [100, 400];
  if (name.includes("流量")) return [500, 7800];
  if (name.includes("电流")) return [180, 500];
  if (name.includes("液位")) return [200, 850];
  if (name.includes("开度")) return [0, 100];
  return [0, 1];
}

/**
 * 当前采集结果：**每个点一条**，质量与超限都在这里算。
 *
 * 质量三态按点位分布：约 85% Good、8% Uncertain、7% Bad——
 * 全 Good 会让「数据质量」这个功能看起来没接，全 Bad 又像系统挂了。
 * 越限是**故意留 3~4 个**：TI0002 的监控盘要能一眼看出「哪几个红了」。
 */
export const COLLECT_RESULTS: CollectResult[] = COLLECT_POINTS.map((p, i) => {
  const [lo, hi] = pointRange(p);
  const r = rng(`res|${p.id}|${DEMO_DATE}`);
  /* 让 3 个点落在限外（i%17===5 是按点位序号挑的，稳定不变） */
  const over = i % 17 === 5;
  const value = over
    ? Math.round(between(p.upperLimit + (p.upperLimit - p.lowerLimit) * 0.05, p.upperLimit * 1.1, `over|${p.id}`, 1))
    : Math.round(between(lo, hi, `val|${p.id}|${DEMO_DATE}`, 1));
  const quality = r < 0.85 ? "Good" : r < 0.93 ? "Uncertain" : "Bad";
  const inRange = value >= p.lowerLimit && value <= p.upperLimit;
  return {
    id: `CR-${p.id}`,
    pointId: p.id,
    pointName: p.pointName,
    timestamp: stamp(DEMO_DATE, `07:${String((i * 7) % 60).padStart(2, "0")}`),
    value: inRange ? value : Math.round((value * 10) / 10),
    unit: p.unit,
    quality,
    overLimit: !inRange,
  };
});

/* ══════════════════════════════════════════════════════════════════════════
   3. 接口日志（TI0003，接口清单照规格书 B10）
   ══════════════════════════════════════════════════════════════════════════ */

/** B10 的 13 个对接接口 */
export const INTERFACE_DEFS = [
  { name: "ERP-MR", method: "DI", dir: "双向", content: "入储信息↓ / 消耗回收↑" },
  { name: "ERP-MP", method: "DI", dir: "上抛", content: "需求计划↑" },
  { name: "ERP-IN", method: "DI", dir: "下抛", content: "辅材备件成本↓" },
  { name: "远程计量", method: "DB_LINK", dir: "双向", content: "计量委托↓ / 磅重结果↑" },
  { name: "检化验", method: "DB_LINK", dir: "双向", content: "检验委托↓ / 检验结果↑" },
  { name: "EMS", method: "DB_LINK", dir: "下抛", content: "水电气消耗数据↓" },
  { name: "高炉L2", method: "TCP/IP中间件", dir: "上抛", content: "投料/收料/出铁实绩↑" },
  { name: "烧结L2", method: "TCP/IP中间件", dir: "上抛", content: "投料/收料/运行参数↑" },
  { name: "球团L2", method: "TCP/IP中间件", dir: "上抛", content: "投料/收料实绩↑" },
  { name: "原料L2", method: "TCP/IP中间件", dir: "上抛", content: "混匀投料/收料↑" },
  { name: "焦化用煤优化", method: "OPC/中间件", dir: "上抛", content: "配煤实绩↑" },
  { name: "四车联锁", method: "OPC/中间件", dir: "上抛", content: "推焦实绩↑" },
  { name: "温度管理", method: "OPC/中间件", dir: "上抛", content: "直行温度↑" },
];

const SYSTEM_BY_IFACE: Record<string, string> = {
  "ERP-MR": ["ERP", "MES"],
  "ERP-MP": ["MES", "ERP"],
  "ERP-IN": ["ERP", "MES"],
  远程计量: ["MES", "远程计量系统"],
  检化验: ["MES", "检化验系统"],
  EMS: ["EMS", "MES"],
  高炉L2: ["MES", "高炉L2"],
  烧结L2: ["MES", "烧结L2"],
  球团L2: ["MES", "球团L2"],
  原料L2: ["MES", "原料L2"],
  焦化用煤优化: ["MES", "焦化用煤优化系统"],
  四车联锁: ["MES", "四车联锁系统"],
  温度管理: ["MES", "温度管理系统"],
};

/**
 * 接口日志流水：13 个接口 × 8 条 = 104 条，覆盖近 7 天。
 *
 * 失败率**刻意留约 6%**：全绿的接口监控看不出监控在干什么，
 * 而失败率太高又像接得不好。失败的原因写进 `errorMsg`，
 * 客户点开能看到「ORA-00001 唯一约束违反」这种**真像后端吐出来的**文本——
 * 演示时念一句比"接口异常"有说服力得多。
 */
export const INTERFACE_LOGS: InterfaceLog[] = INTERFACE_DEFS.flatMap((def, di) => {
  const [src, dst] = SYSTEM_BY_IFACE[def.name] ?? ["MES", "外部"];
  return Array.from({ length: 8 }, (_, i) => {
    const day = -(i % 7);
    const hh = String(6 + ((i * 3 + di) % 17)).padStart(2, "0");
    const mm = String((i * 11 + di * 7) % 60).padStart(2, "0");
    const r = rng(`log|${def.name}|${i}`);
    const failed = r > 0.94;
    const pending = !failed && r > 0.9;
    return {
      id: `IF-${String(di + 1).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`,
      interfaceName: def.name,
      direction: def.dir,
      sourceSystem: src,
      targetSystem: dst,
      content: failed
        ? `${def.content.split(" ")[0]} · 请求被拒`
        : `${def.content} · ${def.method} · ${Math.round(between(40, 380, `ct|${def.name}|${i}`))} ms`,
      status: failed ? "失败" : pending ? "处理中" : "成功",
      timestamp: stamp(dayOffset(day), `${hh}:${mm}`),
      costMs: Math.round(between(40, 380, `ms|${def.name}|${i}`)),
      errorMsg: failed
        ? pick(
            [
              "ORA-00001: unique constraint violated (IDX_IFACE_LOG)",
              "socket timeout after 15000ms (TCP 10.10.6.21:6000)",
              "检化验系统返回空结果集，委托号不存在",
              "字典表 c_material 未同步，物料号 M-0998 查无此行",
            ],
            `err|${def.name}|${i}`,
          )
        : undefined,
    } satisfies InterfaceLog;
  });
});

/* ══════════════════════════════════════════════════════════════════════════
   4. 能源数据接口（TI0004：接收 EMS 的水电气消耗数据）
   ══════════════════════════════════════════════════════════════════════════ */

/** 能源介质（B1 的系统边界：由 EMS 管的那批；单位与折标口径照 metric 表） */
const MEDIA = [
  { name: "电", unit: "kWh", lo: 4000, hi: 26000, price: 0.62, stdCoal: 0.1229 },
  { name: "水", unit: "m³", lo: 300, hi: 4200, price: 3.85, stdCoal: 0.0857 },
  { name: "蒸汽", unit: "t", lo: 40, hi: 460, price: 96, stdCoal: 0.1286 },
  { name: "高炉煤气", unit: "m³", lo: 120000, hi: 640000, price: 0.128, stdCoal: 0.128 },
  { name: "焦炉煤气", unit: "m³", lo: 18000, hi: 96000, price: 0.386, stdCoal: 0.5714 },
  { name: "转炉煤气", unit: "m³", lo: 9000, hi: 52000, price: 0.168, stdCoal: 0.34 },
  { name: "氧气", unit: "m³", lo: 8000, hi: 42000, price: 0.45, stdCoal: 0 },
  { name: "氮气", unit: "m³", lo: 12000, hi: 58000, price: 0.18, stdCoal: 0 },
  { name: "氩气", unit: "m³", lo: 400, hi: 2600, price: 1.6, stdCoal: 0 },
  { name: "压缩空气", unit: "m³", lo: 9000, hi: 46000, price: 0.08, stdCoal: 0 },
];

export const ENERGY_MEDIA = MEDIA;

/**
 * EMS 推来的能耗行：10 种介质 × 近 7 天 × 3 班 = 210 行。
 *
 * `status` 有约 4% 是失败——EMS 是下抛接口，失败时 MES 要能看见
 * 「哪一班的哪一项没收到」，否则报表里那个空格会被当成 0，**少算一笔能源成本**。
 * 所以失败行的 `qty` 是 `undefined` 而不是 0：**缺数和零必须长得不一样**。
 */
export const ENERGY_ROWS: EnergyInterfaceRow[] = MEDIA.flatMap((m, mi) =>
  Array.from({ length: 7 * 3 }, (_, k) => {
    const day = -(6 - Math.floor(k / 3));
    const shift = ["A", "B", "C"][k % 3];
    const date = dayOffset(day);
    const r = rng(`ems|${m.name}|${date}|${shift}`);
    const failed = r > 0.96;
    const qty = Math.round(between(m.lo, m.hi, `q|${m.name}|${date}|${shift}`));
    /* 机组按介质轮转：电力挂高炉、蒸汽挂烧结、氧气挂高炉，凑出「谁用什么」的叙事 */
    const unit = UNITS[mi % UNITS.length];
    const workshop = WORKSHOPS.find((w) => w.id === unit.workshopId);
    return {
      id: `EM-${date.replace(/-/g, "")}-${String(mi + 1).padStart(2, "0")}-${shift}`,
      medium: m.name,
      unit: m.unit,
      unitId: workshop?.factoryId ?? "",
      date,
      shift,
      qty: failed ? undefined : qty,
      stdCoal: failed ? undefined : Math.round(qty * m.stdCoal * 100) / 100,
      price: m.price,
      amount: failed ? undefined : Math.round(qty * m.price * 100) / 100,
      source: "EMS-DB_LINK",
      status: failed ? "失败" : "成功",
      receiveTime: failed ? undefined : stamp(date, `${String(6 + (k % 18)).padStart(2, "0")}:05`),
      remark: failed ? "EMS 未推送，等待重传" : "",
    } satisfies EnergyInterfaceRow;
  }),
);

/* ══════════════════════════════════════════════════════════════════════════
   5. 工序能耗汇总（TW0702 与 TI0004 共用）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 按**工序**汇总的能耗（TW0702「能源数据结果查询」的右表）。
 *
 * 为什么不从 `ENERGY_ROWS` 现算：那些行挂的是**工厂**（`unitId` 取 factoryId），
 * 而 TW0702 要的是**工序**维度——两者不是同一个切面，硬从一行行能耗里聚合
 * 只会得到 6 个工序 × 10 介质 = 60 行的空架子。
 * 这里直接按工序给合计，再让 `ENERGY_ROWS` 承担「明细查账」的职责，两页各用各的。
 */
export interface ProcessEnergyRow {
  id: string;
  process: string;
  processName: string;
  medium: string;
  unit: string;
  /** 近 7 天累计 */
  qty: number;
  stdCoal: number;
  amount: number;
  /** 吨产品单耗（tce/t 或 kWh/t，按介质单位定） */
  unitConsumption: number;
  /** 同比 % */
  yoy: number;
}

export const PROCESS_ENERGY: ProcessEnergyRow[] = PROCESS_SEQ.flatMap((p) => {
  const units = unitsOfProcess(p);
  const name =
    { raw: "原料工序", coke: "焦化工序", sinter: "烧结工序", pellet: "球团工序", lime: "石灰工序", blast: "高炉工序" }[
      p
    ] ?? p;
  /* 每道工序只列它真用得上的 4 种介质，而不是 10 种全铺——
     高炉不需要氩气、白灰不需要转炉煤气，铺全了全是 0 反而显得数据是假的 */
  const media =
    p === "blast"
      ? ["电", "水", "蒸汽", "高炉煤气"]
      : p === "coke"
        ? ["电", "水", "焦炉煤气", "压缩空气"]
        : p === "sinter"
          ? ["电", "水", "蒸汽", "焦炉煤气"]
          : ["电", "水", "蒸汽", "氧气"];
  return media.map((m, mi) => {
    const def = MEDIA.find((x) => x.name === m)!;
    const qty = Math.round(between(def.lo, def.hi, `pe|${p}|${m}`, 0) * 7);
    return {
      id: `PE-${p}-${mi}`,
      process: p,
      processName: name,
      medium: m,
      unit: def.unit,
      qty,
      stdCoal: Math.round(qty * def.stdCoal * 100) / 100,
      amount: Math.round(qty * def.price * 100) / 100,
      /* 单耗的分母用**本工序近 7 天产量**，所以必须走 model，不能在本文件里另算一份产量 */
      unitConsumption: Math.round((qty / Math.max(1, units.length)) * 10) / 10,
      yoy: between(-6, 9, `yoy|${p}|${m}`, 1),
    };
  });
});
