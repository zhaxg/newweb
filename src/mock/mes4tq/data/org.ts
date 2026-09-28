import type { Factory, Material, ProductionUnit, SiloBin, Workshop } from "@/api/mes4tq/types";

/**
 * 虚拟厂「钢城钢铁」铁区的**组织骨架与主数据**——全站所有页面的公共底座。
 *
 * 规格书 B1 给了厂区布局与产能，但只给了三个工厂（FG01 烧结厂 / FG02 球团厂 / FG03 炼铁厂），
 * 而附录 A3 的功能树是**六个工序**（原料/焦化/球团/烧结/石灰/高炉）。两者对不上，
 * 这里按 A3 的六工序建六个工厂——理由：TW 的 35 个页面按工序分七组，
 * 每页的「机组」下拉都从这棵树取；三个工厂的模型装不下焦化和白灰，
 * 演示时客户问「焦化归哪个厂」会答不上来。B1 的 FG 编码是示意，不是约束。
 *
 * 厂区物流（B1）：原料场 → 混匀料场 → 烧结/球团/石灰 → 炼铁高炉 → 铁水送炼钢。
 * 所以 `seq` 字段记了工序顺序，工序统计与铁水运行图按它排序，不靠数组下标。
 *
 * ⚠️ 本文件只放**主数据**（不随时间变的东西）。产量、料位、消耗这些**会变的数**
 * 一律由 `data/model.ts` 从主数据派生——那是本域唯一允许写业务数字的地方。
 */

/* ══════════════════════════════════════════════════════════════════════════
   1. 工厂 → 车间 → 机组
   ══════════════════════════════════════════════════════════════════════════ */

export const FACTORIES: Factory[] = [
  { id: "FG01", name: "原料厂", workshopCount: 1 },
  { id: "FG02", name: "焦化厂", workshopCount: 1 },
  { id: "FG03", name: "烧结厂", workshopCount: 1 },
  { id: "FG04", name: "球团厂", workshopCount: 1 },
  { id: "FG05", name: "白灰厂", workshopCount: 1 },
  { id: "FG06", name: "炼铁厂", workshopCount: 1 },
];

/** 工序键（`process`）→ 中文名。全站筛选条件与工序列都用这一份 */
export const PROCESS_NAME: Record<string, string> = {
  raw: "原料工序",
  coke: "焦化工序",
  sinter: "烧结工序",
  pellet: "球团工序",
  lime: "石灰工序",
  blast: "高炉工序",
};

/** 工序顺序（物流方向）：原料 → 焦化 → 烧结 → 球团 → 石灰 → 高炉 */
export const PROCESS_SEQ = ["raw", "coke", "sinter", "pellet", "lime", "blast"] as const;

export const WORKSHOPS: Workshop[] = [
  { id: "CJ01", name: "原料车间", factoryId: "FG01" },
  { id: "CJ02", name: "焦化车间", factoryId: "FG02" },
  { id: "CJ03", name: "烧结车间", factoryId: "FG03" },
  { id: "CJ04", name: "球团车间", factoryId: "FG04" },
  { id: "CJ05", name: "白灰车间", factoryId: "FG05" },
  { id: "CJ06", name: "炼铁车间", factoryId: "FG06" },
];

/**
 * 机组（产线）。编码规则照 B1：`<工序助记><厂号>-<序号>`。
 * 产能与规格取自 B1 的产能表——**大屏的利用系数、成本单耗都要除它**，
 * 所以这些数不能是装饰，得与 `model.ts` 的派生公式对得上。
 */
export const UNITS: ProductionUnit[] = [
  /* 原料厂：3 套配料系统共 22 台配料秤，演示里收成 2 条混匀线 */
  {
    id: "HY01-01",
    name: "1#混匀线",
    workshopId: "CJ01",
    type: "混匀线",
    capacity: 200,
    spec: "22台配料秤",
    onlineDate: "2018-06-01",
    enabled: true,
    remark: "一次料场 + 二次料场 + 新混匀，混匀料产能 400 万 t/年",
  },
  {
    id: "HY01-02",
    name: "2#混匀线",
    workshopId: "CJ01",
    type: "混匀线",
    capacity: 200,
    spec: "直供烧结",
    onlineDate: "2020-03-01",
    enabled: true,
    remark: "产出可作直供烧结的虚拟堆",
  },

  /* 焦化厂：10 个配煤仓 + 6 座焦炉（B7 剧本提到「5#焦炉」） */
  {
    id: "PM01-01",
    name: "配煤系统",
    workshopId: "CJ02",
    type: "配煤仓",
    capacity: 130,
    spec: "10个配煤仓",
    onlineDate: "2017-09-01",
    enabled: true,
    remark: "配煤圆盘称 10 台，每仓 1 台",
  },
  {
    id: "JL01-01",
    name: "1#焦炉",
    workshopId: "CJ02",
    type: "焦炉",
    capacity: 22,
    spec: "65孔",
    onlineDate: "2017-09-01",
    enabled: true,
  },
  {
    id: "JL01-02",
    name: "2#焦炉",
    workshopId: "CJ02",
    type: "焦炉",
    capacity: 22,
    spec: "65孔",
    onlineDate: "2017-09-01",
    enabled: true,
  },
  {
    id: "JL01-03",
    name: "3#焦炉",
    workshopId: "CJ02",
    type: "焦炉",
    capacity: 22,
    spec: "65孔",
    onlineDate: "2018-11-01",
    enabled: true,
  },
  {
    id: "JL01-04",
    name: "4#焦炉",
    workshopId: "CJ02",
    type: "焦炉",
    capacity: 22,
    spec: "65孔",
    onlineDate: "2018-11-01",
    enabled: true,
  },
  {
    id: "JL01-05",
    name: "5#焦炉",
    workshopId: "CJ02",
    type: "焦炉",
    capacity: 25,
    spec: "72孔",
    onlineDate: "2021-05-01",
    enabled: true,
    remark: "B7 剧本「模拟推焦」的落点",
  },
  {
    id: "JL01-06",
    name: "6#焦炉",
    workshopId: "CJ02",
    type: "焦炉",
    capacity: 25,
    spec: "72孔",
    onlineDate: "2021-05-01",
    enabled: true,
  },

  /* 烧结厂：2×360m²，合计 700 万 t/年 */
  {
    id: "SJ01-01",
    name: "1#烧结机",
    workshopId: "CJ03",
    type: "烧结机",
    capacity: 350,
    spec: "360m²",
    onlineDate: "2016-04-01",
    enabled: true,
    remark: "施耐德 PLC + iFix，约 3300 点",
  },
  {
    id: "SJ01-02",
    name: "2#烧结机",
    workshopId: "CJ03",
    type: "烧结机",
    capacity: 350,
    spec: "360m²",
    onlineDate: "2019-08-01",
    enabled: true,
  },

  /* 球团厂：3 座竖炉（8m²×2 + 10m²×1），180 万 t/年 */
  {
    id: "QT01-01",
    name: "1#竖炉",
    workshopId: "CJ04",
    type: "竖炉",
    capacity: 55,
    spec: "8m²",
    onlineDate: "2015-10-01",
    enabled: true,
    remark: "浙大中控 ICS-3000",
  },
  {
    id: "QT01-02",
    name: "2#竖炉",
    workshopId: "CJ04",
    type: "竖炉",
    capacity: 55,
    spec: "8m²",
    onlineDate: "2015-10-01",
    enabled: true,
    remark: "B7 剧本「模拟球团产出」的落点",
  },
  {
    id: "QT01-03",
    name: "3#竖炉",
    workshopId: "CJ04",
    type: "竖炉",
    capacity: 70,
    spec: "10m²",
    onlineDate: "2020-07-01",
    enabled: true,
  },

  /* 白灰厂：2 座竖窑 */
  {
    id: "BH01-01",
    name: "1#竖窑",
    workshopId: "CJ05",
    type: "竖窑",
    capacity: 18,
    spec: "600t/d",
    onlineDate: "2016-12-01",
    enabled: true,
  },
  {
    id: "BH01-02",
    name: "2#竖窑",
    workshopId: "CJ05",
    type: "竖窑",
    capacity: 18,
    spec: "600t/d",
    onlineDate: "2016-12-01",
    enabled: true,
  },

  /* 炼铁厂：3×1800m³，500 万 t/年 */
  {
    id: "GL01-01",
    name: "1#高炉",
    workshopId: "CJ06",
    type: "高炉",
    capacity: 167,
    spec: "1800m³",
    onlineDate: "2013-05-01",
    enabled: true,
    remark: "西屋 Ovation DCS，主工艺 4263 点",
  },
  {
    id: "GL01-02",
    name: "2#高炉",
    workshopId: "CJ06",
    type: "高炉",
    capacity: 167,
    spec: "1800m³",
    onlineDate: "2013-05-01",
    enabled: true,
    remark: "B7 剧本「模拟休风」的落点",
  },
  {
    id: "GL01-03",
    name: "3#高炉",
    workshopId: "CJ06",
    type: "高炉",
    capacity: 167,
    spec: "1800m³",
    onlineDate: "2018-01-01",
    enabled: true,
    remark: "B7 剧本「模拟高炉波动」的落点",
  },
];

/** 机组 id → 机组（高频查询，做成表省一次 find） */
export const UNIT_BY_ID: Record<string, ProductionUnit> = Object.fromEntries(UNITS.map((u) => [u.id, u]));

/** 机组 id → 工序键（TW 各页按工序筛、TR 按工序汇总都要它） */
export function processOf(unitId: string): string {
  const ws = UNIT_BY_ID[unitId]?.workshopId;
  const found = PROCESS_SEQ.find((p) => WORKSHOPS.find((w) => w.id === ws)?.factoryId === factoryOfProcess(p));
  return found ?? "raw";
}

/** 工序键 → 工厂 id */
function factoryOfProcess(p: string): string {
  return { raw: "FG01", coke: "FG02", sinter: "FG03", pellet: "FG04", lime: "FG05", blast: "FG06" }[p] ?? "FG01";
}

/** 取某工序下的全部机组（TW 各页的机组下拉只列自己工序的） */
export function unitsOfProcess(p: string): ProductionUnit[] {
  const wsId = WORKSHOPS.find((w) => w.factoryId === factoryOfProcess(p))?.id;
  return UNITS.filter((u) => u.workshopId === wsId);
}

/* ══════════════════════════════════════════════════════════════════════════
   2. 物料主数据（TG0002）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 物料：料号 `M-XXXX`，与 ERP-MR 一致（B11 第 1 条：库前在 ERP、库后在 MES）。
 *
 * `group` 是物料组（矿石/煤炭/焦炭/熔剂/燃料/辅料），`type` 是物料类型
 * （原料/辅料/燃料/产品/副产品/回收品）——两个维度都留着，因为配料页按组筛、成本页按类型归集。
 * `costPrice` 是成本单价，TC0002 的原料成本就是「投料量 × 这个价」，
 * 所以它必须与 `model.ts` 的成本派生对得上。
 */
export const MATERIALS: Material[] = [
  /* ── 矿石组：混匀与烧结/球团/高炉的含铁料 ─────────────────────────── */
  { id: "M-0101", name: "混匀矿", group: "矿石", type: "原料", unit: "t", costPrice: 812.5, enabled: true },
  { id: "M-0102", name: "澳粉", group: "矿石", type: "原料", unit: "t", costPrice: 845.0, enabled: true },
  { id: "M-0103", name: "巴西粉", group: "矿石", type: "原料", unit: "t", costPrice: 918.0, enabled: true },
  { id: "M-0104", name: "精粉", group: "矿石", type: "原料", unit: "t", costPrice: 962.0, enabled: true },
  { id: "M-0105", name: "块矿", group: "矿石", type: "原料", unit: "t", costPrice: 986.0, enabled: true },
  { id: "M-0106", name: "返矿", group: "矿石", type: "回收品", unit: "t", costPrice: 420.0, enabled: true },
  { id: "M-0107", name: "烧结矿", group: "矿石", type: "产品", unit: "t", costPrice: 1120.0, enabled: true },
  { id: "M-0108", name: "球团矿", group: "矿石", type: "产品", unit: "t", costPrice: 1256.0, enabled: true },
  { id: "M-0109", name: "混匀料", group: "矿石", type: "产品", unit: "t", costPrice: 830.0, enabled: true },

  /* ── 煤炭组：焦化配煤与高炉喷吹 ───────────────────────────────────── */
  { id: "M-0201", name: "焦煤", group: "煤炭", type: "原料", unit: "t", costPrice: 1680.0, enabled: true },
  { id: "M-0202", name: "肥煤", group: "煤炭", type: "原料", unit: "t", costPrice: 1520.0, enabled: true },
  { id: "M-0203", name: "气煤", group: "煤炭", type: "原料", unit: "t", costPrice: 1180.0, enabled: true },
  { id: "M-0204", name: "瘦煤", group: "煤炭", type: "原料", unit: "t", costPrice: 1340.0, enabled: true },
  { id: "M-0205", name: "1/3焦煤", group: "煤炭", type: "原料", unit: "t", costPrice: 1420.0, enabled: true },
  { id: "M-0206", name: "无烟煤", group: "煤炭", type: "燃料", unit: "t", costPrice: 1080.0, enabled: true },
  { id: "M-0207", name: "喷吹煤", group: "煤炭", type: "燃料", unit: "t", costPrice: 1020.0, enabled: true },

  /* ── 焦炭组 ─────────────────────────────────────────────────────── */
  { id: "M-0301", name: "焦炭", group: "焦炭", type: "产品", unit: "t", costPrice: 1980.0, enabled: true },
  { id: "M-0302", name: "焦丁", group: "焦炭", type: "产品", unit: "t", costPrice: 1520.0, enabled: true },
  { id: "M-0303", name: "焦粉", group: "焦炭", type: "副产品", unit: "t", costPrice: 880.0, enabled: true },

  /* ── 熔剂组：烧结与高炉的造渣料 ─────────────────────────────────── */
  { id: "M-0401", name: "石灰石", group: "熔剂", type: "原料", unit: "t", costPrice: 386.0, enabled: true },
  { id: "M-0402", name: "生石灰", group: "熔剂", type: "原料", unit: "t", costPrice: 528.0, enabled: true },
  { id: "M-0403", name: "白云石", group: "熔剂", type: "原料", unit: "t", costPrice: 412.0, enabled: true },
  { id: "M-0404", name: "白灰块", group: "熔剂", type: "产品", unit: "t", costPrice: 596.0, enabled: true },

  /* ── 辅料组 ─────────────────────────────────────────────────────── */
  { id: "M-0501", name: "膨润土", group: "辅料", type: "辅料", unit: "t", costPrice: 620.0, enabled: true },

  /* ── 燃料组：煤气与煤粉（高炉/热风炉烧的）──────────────────────────── */
  { id: "M-0601", name: "高炉煤气", group: "燃料", type: "燃料", unit: "m³", costPrice: 0.128, enabled: true },
  { id: "M-0602", name: "焦炉煤气", group: "燃料", type: "燃料", unit: "m³", costPrice: 0.386, enabled: true },
  { id: "M-0603", name: "煤粉", group: "燃料", type: "燃料", unit: "t", costPrice: 1020.0, enabled: true },

  /* ── 产品与副产品 ───────────────────────────────────────────────── */
  { id: "M-0701", name: "铁水", group: "产品", type: "产品", unit: "t", costPrice: 2860.0, enabled: true },
  { id: "M-0702", name: "水渣", group: "产品", type: "副产品", unit: "t", costPrice: 180.0, enabled: true },
  { id: "M-0703", name: "瓦斯灰", group: "产品", type: "副产品", unit: "t", costPrice: 260.0, enabled: true },
];

export const MATERIAL_BY_ID: Record<string, Material> = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

/** 品名 → 物料（种子数据里常按品名写，靠它回料号） */
export function materialByName(name: string): Material | undefined {
  return MATERIALS.find((m) => m.name === name);
}

/* ══════════════════════════════════════════════════════════════════════════
   3. 料仓（TG0003 料仓台账 / TW 各工序料仓变料页）
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 料仓台账（真实表 TPA_1040）。
 *
 * 为什么是**按机组程序化铺**而不是手写几十条：料仓是「每个机组都有一批」的结构化数据，
 * 手写既冗长又容易漏（漏一个仓，TG0003 的料仓数和 TW 的变料页对不上）。
 * 各机组的仓数与料种按工艺实际配（高炉 5 个矿焦仓、烧结 4 个配料仓…），
 * 所以下面用一张「机组 → 仓规格」的表来描述，再展开成台账行。
 *
 * ⚠️ 料仓的**当前料种与料位是会变的**（料仓变料页演示的就是它变），
 * 所以这里只给**初始料种**，当前值由 `model.ts` 的 `siloState()` 派生。
 */
interface SiloSpec {
  unitId: string;
  /** 仓名前缀，如「矿仓」 */
  label: string;
  count: number;
  /** 初始料种（循环取），品名 */
  materials: string[];
  /** 单仓容量 t */
  capacity: number;
  /** 料仓号前缀，如 `GL01-01-C` */
  prefix: string;
}

const SILO_SPECS: SiloSpec[] = [
  {
    unitId: "HY01-01",
    label: "配料仓",
    count: 8,
    materials: ["澳粉", "巴西粉", "精粉", "返矿"],
    capacity: 600,
    prefix: "HY01-01-C",
  },
  {
    unitId: "HY01-02",
    label: "配料仓",
    count: 6,
    materials: ["澳粉", "巴西粉", "返矿"],
    capacity: 600,
    prefix: "HY01-02-C",
  },
  {
    unitId: "PM01-01",
    label: "配煤仓",
    count: 10,
    materials: ["焦煤", "肥煤", "气煤", "瘦煤", "1/3焦煤"],
    capacity: 500,
    prefix: "PM01-01-C",
  },
  {
    unitId: "SJ01-01",
    label: "配料仓",
    count: 4,
    materials: ["混匀矿", "石灰石", "焦粉", "返矿"],
    capacity: 400,
    prefix: "SJ01-01-C",
  },
  {
    unitId: "SJ01-02",
    label: "配料仓",
    count: 4,
    materials: ["混匀矿", "石灰石", "焦粉", "返矿"],
    capacity: 400,
    prefix: "SJ01-02-C",
  },
  {
    unitId: "QT01-01",
    label: "配料仓",
    count: 3,
    materials: ["精粉", "膨润土", "返矿"],
    capacity: 300,
    prefix: "QT01-01-C",
  },
  {
    unitId: "QT01-02",
    label: "配料仓",
    count: 3,
    materials: ["精粉", "膨润土", "返矿"],
    capacity: 300,
    prefix: "QT01-02-C",
  },
  {
    unitId: "QT01-03",
    label: "配料仓",
    count: 3,
    materials: ["精粉", "膨润土", "返矿"],
    capacity: 300,
    prefix: "QT01-03-C",
  },
  { unitId: "BH01-01", label: "窑前仓", count: 2, materials: ["石灰石", "白灰块"], capacity: 250, prefix: "BH01-01-C" },
  { unitId: "BH01-02", label: "窑前仓", count: 2, materials: ["石灰石", "白灰块"], capacity: 250, prefix: "BH01-02-C" },
  /* 高炉：5 个矿焦仓，与 B9 的 1#高炉种子数据逐条对应（矿/球团/焦炭/焦丁/块矿） */
  {
    unitId: "GL01-01",
    label: "矿仓",
    count: 5,
    materials: ["烧结矿", "球团矿", "焦炭", "焦丁", "块矿"],
    capacity: 800,
    prefix: "GL01-01-C",
  },
  {
    unitId: "GL01-02",
    label: "矿仓",
    count: 5,
    materials: ["烧结矿", "球团矿", "焦炭", "焦丁", "块矿"],
    capacity: 800,
    prefix: "GL01-02-C",
  },
  {
    unitId: "GL01-03",
    label: "矿仓",
    count: 5,
    materials: ["烧结矿", "球团矿", "焦炭", "焦丁", "块矿"],
    capacity: 800,
    prefix: "GL01-03-C",
  },
];

/** 料仓台账：由规格展开。`binName` 按「序号+品种」起名，与 B9 的种子数据同款（「1#矿仓」） */
export const SILO_BINS: SiloBin[] = SILO_SPECS.flatMap((spec) => {
  const unit = UNIT_BY_ID[spec.unitId];
  const ws = WORKSHOPS.find((w) => w.id === unit?.workshopId);
  return Array.from({ length: spec.count }, (_, i) => {
    const seq = i + 1;
    const matName = spec.materials[i % spec.materials.length];
    const mat = materialByName(matName);
    return {
      id: `${spec.prefix}${String(seq).padStart(2, "0")}`,
      factoryCode: ws?.factoryId ?? "",
      workshopCode: ws?.id ?? "",
      workstationCode: spec.unitId,
      binCode: `${spec.prefix}${String(seq).padStart(2, "0")}`,
      binName: `${seq}#${spec.label}`,
      capacity: spec.capacity,
      mtrlConsumeType: 1,
      product: mat?.group,
      matrlId: mat?.id,
      batchNo: "",
      suppId: "",
      feedTime: "",
    } satisfies SiloBin;
  });
});

/** 某机组的料仓 */
export function silosOfUnit(unitId: string): SiloBin[] {
  return SILO_BINS.filter((s) => s.workstationCode === unitId);
}

/* ══════════════════════════════════════════════════════════════════════════
   4. 库房与库位（TS0001）
   ══════════════════════════════════════════════════════════════════════════ */

/** 库房：原料场按料条分区，成品按品种分库（B11 第 1 条：库前在 ERP、库后消耗在 MES） */
export const STORE_ROOMS = [
  { id: "SR-01", name: "一次料场", workshopId: "CJ01", remark: "进厂原燃料堆放，库前归 ERP-MR" },
  { id: "SR-02", name: "二次料场", workshopId: "CJ01", remark: "混匀配料用" },
  { id: "SR-03", name: "混匀料场", workshopId: "CJ01", remark: "混匀料堆" },
  { id: "SR-04", name: "烧结成品库", workshopId: "CJ03", remark: "烧结矿" },
  { id: "SR-05", name: "球团成品库", workshopId: "CJ04", remark: "球团矿" },
  { id: "SR-06", name: "焦炭仓", workshopId: "CJ02", remark: "焦炭/焦丁/焦粉" },
  { id: "SR-07", name: "熔剂库", workshopId: "CJ05", remark: "石灰石/白灰块" },
];

/** 库位：每库按料条/堆位展开 */
export const STORE_LOCATIONS = STORE_ROOMS.flatMap((room, ri) => {
  const count = ri === 0 ? 12 : 6;
  return Array.from({ length: count }, (_, i) => {
    const seq = i + 1;
    const id = `${room.id}-P${String(seq).padStart(2, "0")}`;
    return {
      id,
      name: `${room.name}${seq}#料条`,
      storeRoomCode: room.id,
      capacity: ri === 0 ? 8000 : 5000,
      stock: 0,
      remark: "",
    };
  });
});
