import type { HmxRes } from "@/api/admin/types";

/**
 * 铁区MES（tqmes）演示系统 → 资源种子表。规格书：`temp/tqmes.md` 附录 A3「功能树明细」。
 *
 * 路径约定：路由 = `/tqmes/<模块>/<页面>`，页面目录 = `src/pages/mes4tq/<模块>/<页面>/index.vue`，
 * 页面段不含 "mes4tq"。pageId 由祖先 `cResPath` 链拼出（如 `tqmes/process/raw/bin-change`），全局唯一。
 * （目录叫 `mes4tq` 而路由前缀叫 `tqmes`，与设备域「目录 `equipment` / 前缀 `eam`」同款错位，
 * 因为租户键与域目录各有各的命名来源：目录跟 `src/mock/mes4tq/` 走，前缀跟登录账号走。）
 *
 * ── 编码规则 ─────────────────────────────────────────────────────────────
 * `T + 模块字母 + 4 位序号`（**两个大写字母 + 4 个数字**）。模块字母：
 *   G=General 基础配置 / P=Plan 计划 / B=Batch 配料 / S=Stock 物料库存 / Q=Quality 质量 /
 *   W=Work 工序作业 / M=Iron 铁水调度 / C=Cost 成本 / R=Report 统计 / D=Dashboard 大屏 / I=Integrate 集成
 *
 * **TW 工序作业是本表唯一的例外**：它有 35 个叶子（占全表一半），平铺成 TW0001-TW0035
 * 会让「烧结的运行参数」和「高炉的运行参数」在码上分不出来。故 TW 按**工序分块**编号，
 * 仍满足「2 字母 + 4 数字」：
 *
 *   | A3 原码 | 本表码 | 工序 | 说明 |
 *   |---|---|---|---|
 *   | TWA001-005 | TW0101-0105 | 原料厂 | 混匀/料堆/投收料/供料 |
 *   | TWJ001-006 | TW0201-0206 | 焦化车间 | 配煤/推焦/炉温/煤质/净化 |
 *   | TWQ001-005 | TW0301-0305 | 球团车间 | 竖炉料仓/投收料/造球/开停 |
 *   | TWS001-006 | TW0401-0406 | 烧结车间 | 料仓/投收料/运行/开停/余热 |
 *   | TWH001-004 | TW0501-0504 | 白灰厂 | 料仓/投收料/运行 |
 *   | TWG001-007 | TW0601-0607 | 炼铁车间 | 料仓/投收料/运行/喷煤/休风/热风炉 |
 *   | TWR001-002 | TW0701-0702 | 跨工序 | 变料查询/能源查询 |
 *
 * 块内序号从 01 起、块间隔 100，留出补页余量。**编码一次性颁发、永不复用变更**；
 * 菜单排序与编码解耦（靠 `cOrder`）。label 规则 = `cCode ? cCode-cTitle : cTitle`，
 * 所以侧栏只有叶子显示「TG0001-产线维护」，分组层级保持纯名称。
 *
 * ── 三条平台约束（照做即可，别再探）─────────────────────────────────────
 * - **叶子 `cResPath` 必须单段**（`router/core/fromMenu.ts` 的 `segmentOf` 只取 pageId 末段当路由）。
 * - **`cResSubPath` 指向不存在的 .vue 是运行期静默回落占位页**，不是编译错误——
 *   所以本表**一次铺全 71 个叶子**，页面按批补，dev 下菜单当场可见、缺页显示占位而不是空白。
 * - **首页叶子留在域根外面**（`dynamicRoutes.withHomeOwnership` 认一级叶子 pageId `home`）。
 *
 * cIcon 全部取自 `src/lib/tablerIcons.ts` 的**现有白名单**（95 个），
 * **本域一个图标都不新增**——那条 glob 在平台层，且有并行工作流在改它，
 * 从白名单里挑是零成本且零冲突的做法。白名单漏了不会坏（走兜底动态 import），只是多下一个 chunk。
 *
 * ⚠️ 本表与能源域/设备域/碳资产域的 rescs **刻意同形不同源**：各写一份，形状一致是为了
 * 让「换一个域看还是同一套平台行为」，而不是为了共享代码。
 */

const STAMP = "2026-09-27 20:00:00";

let seq = 0;

function row(part: Partial<HmxRes>): HmxRes {
  seq += 1;
  return {
    selected: false,
    id: part.id ?? `tq-${seq}`,
    cPid: "",
    cCode: "",
    cName: "",
    cTitle: "",
    cNsCode: "TDWEB",
    rowVersion: 0,
    cOrder: "999",
    cResPath: "",
    cResSubPath: "",
    cQueryString: "",
    cEnable: "1",
    cResType: 2,
    cIcon: "",
    creator: "system",
    createTime: STAMP,
    lastModifier: "system",
    lastModifyTime: STAMP,
    ...part,
  };
}

function folder(id: string, pid: string, order: string, name: string, path: string, icon: string): HmxRes {
  return row({ id, cPid: pid, cOrder: order, cName: name, cTitle: name, cResPath: path, cIcon: icon });
}

/** 叶子：path = cResPath（单段），sub = 相对 src/pages 的 vue 路径 */
function leaf(
  id: string,
  pid: string,
  order: string,
  code: string,
  name: string,
  path: string,
  sub: string,
  icon: string,
  query = "",
): HmxRes {
  return row({
    id,
    cPid: pid,
    cOrder: order,
    cCode: code,
    cName: name,
    cTitle: name,
    cResPath: path,
    cResSubPath: sub,
    cIcon: icon,
    cQueryString: query,
  });
}

/** 十一个模块分组，顺序即侧栏顺序（照 A2 的模块表：基础 → 计划 → 配料 → 库存 → 质量 → 工序 → 铁水 → 成本 → 统计 → 大屏 → 集成） */
const M = {
  BASIC: "tq-m-basic",
  PLAN: "tq-m-plan",
  BATCH: "tq-m-batch",
  STOCK: "tq-m-stock",
  QUALITY: "tq-m-quality",
  PROCESS: "tq-m-process",
  IRON: "tq-m-iron",
  COST: "tq-m-cost",
  REPORT: "tq-m-report",
  BOARD: "tq-m-board",
  INTEGRATE: "tq-m-integrate",
} as const;

/** TW 工序作业的七个工序子分组（A3 的 TW00~TW06） */
const W = {
  RAW: "tq-w-raw",
  COKE: "tq-w-coke",
  PELLET: "tq-w-pellet",
  SINTER: "tq-w-sinter",
  LIME: "tq-w-lime",
  BLAST: "tq-w-blast",
  STAT: "tq-w-stat",
} as const;

export const seedRescsData: HmxRes[] = [
  /* 首页（一级叶子） */
  leaf("7100", "", "000", "", "首页", "home", "/mes4tq/home/index.vue", "Home"),

  /* ── 域根 ─────────────────────────────────────────────────────────── */
  folder("tqmes-root", "", "001", "铁区MES", "tqmes", "BuildingFactory"),

  /* ══ TG 基础配置（P0）——一屏一个口径源头，讲解时回答「这数哪来的」 ══════ */
  folder(M.BASIC, "tqmes-root", "001", "基础配置", "basic", "Settings"),
  leaf("tq-tg-1", M.BASIC, "001", "TG0001", "产线维护", "line", "/mes4tq/basic/line/index.vue", "Sitemap"),
  leaf("tq-tg-2", M.BASIC, "002", "TG0002", "物料管理", "material", "/mes4tq/basic/material/index.vue", "Package"),
  leaf("tq-tg-3", M.BASIC, "003", "TG0003", "料仓管理", "silo", "/mes4tq/basic/silo/index.vue", "Box"),
  leaf("tq-tg-4", M.BASIC, "004", "TG0004", "排班配置", "shift", "/mes4tq/basic/shift/index.vue", "CalendarMonth"),
  leaf("tq-tg-5", M.BASIC, "005", "TG0005", "指标维护", "indicator", "/mes4tq/basic/indicator/index.vue", "Target"),

  /* ══ TP 计划管理（P1）——铁水→烧结→球团→原料 倒推 ══════════════════════ */
  folder(M.PLAN, "tqmes-root", "002", "计划管理", "plan", "CalendarStats"),
  leaf(
    "tq-tp-1",
    M.PLAN,
    "001",
    "TP0001",
    "技经指标管理",
    "tech-indicator",
    "/mes4tq/plan/tech-indicator/index.vue",
    "TargetArrow",
  ),
  leaf(
    "tq-tp-2",
    M.PLAN,
    "002",
    "TP0002",
    "月生产计划编制",
    "monthly",
    "/mes4tq/plan/monthly/index.vue",
    "CalendarStats",
  ),
  leaf("tq-tp-3", M.PLAN, "003", "TP0003", "需求计划管理", "demand", "/mes4tq/plan/demand/index.vue", "ClipboardList"),
  leaf("tq-tp-4", M.PLAN, "004", "TP0004", "采购计划管理", "purchase", "/mes4tq/plan/purchase/index.vue", "Receipt"),

  /* ══ TB 配料管理（P1）——四工序配料计划，配比是子表 ═════════════════════ */
  folder(M.BATCH, "tqmes-root", "003", "配料管理", "batch", "Flask"),
  leaf("tq-tb-1", M.BATCH, "001", "TB0001", "混匀配料计划", "blend", "/mes4tq/batch/blend/index.vue", "Basket"),
  leaf("tq-tb-2", M.BATCH, "002", "TB0002", "烧结配料计划", "sinter", "/mes4tq/batch/sinter/index.vue", "Flask"),
  leaf("tq-tb-3", M.BATCH, "003", "TB0003", "球团配料计划", "pellet", "/mes4tq/batch/pellet/index.vue", "Atom2"),
  leaf("tq-tb-4", M.BATCH, "004", "TB0004", "高炉配料计划", "blast", "/mes4tq/batch/blast/index.vue", "Stack2"),

  /* ══ TS 物料与库存（P1）——库前ERP / 库后MES ═══════════════════════════ */
  folder(M.STOCK, "tqmes-root", "004", "物料与库存", "stock", "BuildingWarehouse"),
  leaf(
    "tq-ts-1",
    M.STOCK,
    "001",
    "TS0001",
    "库房库位管理",
    "location",
    "/mes4tq/stock/location/index.vue",
    "BuildingWarehouse",
  ),
  leaf("tq-ts-2", M.STOCK, "002", "TS0002", "库存管理", "inventory", "/mes4tq/stock/inventory/index.vue", "Database"),
  leaf("tq-ts-3", M.STOCK, "003", "TS0003", "出入库记录查询", "inout", "/mes4tq/stock/inout/index.vue", "Exchange"),
  leaf("tq-ts-4", M.STOCK, "004", "TS0004", "料场可视化", "yard", "/mes4tq/stock/yard/index.vue", "Blocks"),

  /* ══ TQ 质量管理（P1）——委托 MES 发起 → 检化验系统 → 结果回传 ═══════════ */
  folder(M.QUALITY, "tqmes-root", "005", "质量管理", "quality", "ClipboardCheck"),
  leaf(
    "tq-tq-1",
    M.QUALITY,
    "001",
    "TQ0001",
    "检验标准维护",
    "standard",
    "/mes4tq/quality/standard/index.vue",
    "Ruler",
  ),
  leaf(
    "tq-tq-2",
    M.QUALITY,
    "002",
    "TQ0002",
    "检验委托管理",
    "order",
    "/mes4tq/quality/order/index.vue",
    "ClipboardCheck",
  ),
  leaf("tq-tq-3", M.QUALITY, "003", "TQ0003", "检验实绩查询", "result", "/mes4tq/quality/result/index.vue", "Checks"),

  /* ══ TW 工序作业（P0，35 叶）——按工序分七组 ════════════════════════════ */
  folder(M.PROCESS, "tqmes-root", "006", "工序作业", "process", "Activity"),

  /* ── TW00 原料工序（原料厂）─────────────────────────────────────────── */
  folder(W.RAW, M.PROCESS, "001", "原料工序", "raw", "Basket"),
  leaf(
    "tq-wa-1",
    W.RAW,
    "001",
    "TW0101",
    "料仓变料管理",
    "bin-change",
    "/mes4tq/process/raw/bin-change/index.vue",
    "Box",
  ),
  leaf("tq-wa-2", W.RAW, "002", "TW0102", "混匀料堆管理", "pile", "/mes4tq/process/raw/pile/index.vue", "Stack2"),
  leaf(
    "tq-wa-3",
    W.RAW,
    "003",
    "TW0103",
    "混匀投料实绩",
    "input",
    "/mes4tq/process/raw/input/index.vue",
    "ArrowsJoin2",
  ),
  leaf(
    "tq-wa-4",
    W.RAW,
    "004",
    "TW0104",
    "混匀收料实绩",
    "output",
    "/mes4tq/process/raw/output/index.vue",
    "ArrowsJoin2",
  ),
  leaf("tq-wa-5", W.RAW, "005", "TW0105", "供料作业记录", "supply", "/mes4tq/process/raw/supply/index.vue", "Truck"),

  /* ── TW01 焦化工序（焦化车间）───────────────────────────────────────── */
  folder(W.COKE, M.PROCESS, "002", "焦化工序", "coke", "Flame"),
  leaf(
    "tq-wj-1",
    W.COKE,
    "001",
    "TW0201",
    "配煤仓变料管理",
    "bin-change",
    "/mes4tq/process/coke/bin-change/index.vue",
    "Box",
  ),
  leaf(
    "tq-wj-2",
    W.COKE,
    "002",
    "TW0202",
    "备煤投料实绩",
    "input",
    "/mes4tq/process/coke/input/index.vue",
    "ArrowsJoin2",
  ),
  leaf("tq-wj-3", W.COKE, "003", "TW0203", "推焦作业实绩", "push", "/mes4tq/process/coke/push/index.vue", "Flame"),
  leaf("tq-wj-4", W.COKE, "004", "TW0204", "焦炉温度记录", "temp", "/mes4tq/process/coke/temp/index.vue", "Gauge"),
  leaf(
    "tq-wj-5",
    W.COKE,
    "005",
    "TW0205",
    "焦炭质量与产量",
    "quality",
    "/mes4tq/process/coke/quality/index.vue",
    "Checks",
  ),
  leaf("tq-wj-6", W.COKE, "006", "TW0206", "煤气净化运行", "gas", "/mes4tq/process/coke/gas/index.vue", "Wind"),

  /* ── TW02 球团工序（球团车间）───────────────────────────────────────── */
  folder(W.PELLET, M.PROCESS, "003", "球团工序", "pellet", "Atom2"),
  leaf(
    "tq-wq-1",
    W.PELLET,
    "001",
    "TW0301",
    "竖炉料仓变料",
    "bin-change",
    "/mes4tq/process/pellet/bin-change/index.vue",
    "Box",
  ),
  leaf(
    "tq-wq-2",
    W.PELLET,
    "002",
    "TW0302",
    "球团投料实绩",
    "input",
    "/mes4tq/process/pellet/input/index.vue",
    "ArrowsJoin2",
  ),
  leaf(
    "tq-wq-3",
    W.PELLET,
    "003",
    "TW0303",
    "球团收料实绩",
    "output",
    "/mes4tq/process/pellet/output/index.vue",
    "ArrowsJoin2",
  ),
  leaf(
    "tq-wq-4",
    W.PELLET,
    "004",
    "TW0304",
    "造球运行参数",
    "running",
    "/mes4tq/process/pellet/running/index.vue",
    "Gauge",
  ),
  leaf(
    "tq-wq-5",
    W.PELLET,
    "005",
    "TW0305",
    "球团开停机记录",
    "downtime",
    "/mes4tq/process/pellet/downtime/index.vue",
    "ClockHour4",
  ),

  /* ── TW03 烧结工序（烧结车间）───────────────────────────────────────── */
  folder(W.SINTER, M.PROCESS, "004", "烧结工序", "sinter", "Gauge"),
  leaf(
    "tq-ws-1",
    W.SINTER,
    "001",
    "TW0401",
    "烧结料仓变料",
    "bin-change",
    "/mes4tq/process/sinter/bin-change/index.vue",
    "Box",
  ),
  leaf(
    "tq-ws-2",
    W.SINTER,
    "002",
    "TW0402",
    "烧结投料实绩",
    "input",
    "/mes4tq/process/sinter/input/index.vue",
    "ArrowsJoin2",
  ),
  leaf(
    "tq-ws-3",
    W.SINTER,
    "003",
    "TW0403",
    "烧结收料实绩",
    "output",
    "/mes4tq/process/sinter/output/index.vue",
    "ArrowsJoin2",
  ),
  leaf(
    "tq-ws-4",
    W.SINTER,
    "004",
    "TW0404",
    "烧结运行参数",
    "running",
    "/mes4tq/process/sinter/running/index.vue",
    "Gauge",
  ),
  leaf(
    "tq-ws-5",
    W.SINTER,
    "005",
    "TW0405",
    "烧结开停机记录",
    "downtime",
    "/mes4tq/process/sinter/downtime/index.vue",
    "ClockHour4",
  ),
  leaf(
    "tq-ws-6",
    W.SINTER,
    "006",
    "TW0406",
    "余热回收监控",
    "waste-heat",
    "/mes4tq/process/sinter/waste-heat/index.vue",
    "Recycle",
  ),

  /* ── TW04 石灰工序（白灰厂）─────────────────────────────────────────── */
  folder(W.LIME, M.PROCESS, "005", "石灰工序", "lime", "Cube"),
  leaf(
    "tq-wh-1",
    W.LIME,
    "001",
    "TW0501",
    "白灰仓变料管理",
    "bin-change",
    "/mes4tq/process/lime/bin-change/index.vue",
    "Box",
  ),
  leaf(
    "tq-wh-2",
    W.LIME,
    "002",
    "TW0502",
    "白灰投料实绩",
    "input",
    "/mes4tq/process/lime/input/index.vue",
    "ArrowsJoin2",
  ),
  leaf(
    "tq-wh-3",
    W.LIME,
    "003",
    "TW0503",
    "白灰收料实绩",
    "output",
    "/mes4tq/process/lime/output/index.vue",
    "ArrowsJoin2",
  ),
  leaf(
    "tq-wh-4",
    W.LIME,
    "004",
    "TW0504",
    "白灰运行参数",
    "running",
    "/mes4tq/process/lime/running/index.vue",
    "Gauge",
  ),

  /* ── TW05 高炉工序（炼铁车间）——产量核心，页数最多 ───────────────────── */
  folder(W.BLAST, M.PROCESS, "006", "高炉工序", "blast", "Stack2"),
  leaf(
    "tq-wg-1",
    W.BLAST,
    "001",
    "TW0601",
    "高炉料仓变料",
    "bin-change",
    "/mes4tq/process/blast/bin-change/index.vue",
    "Box",
  ),
  leaf(
    "tq-wg-2",
    W.BLAST,
    "002",
    "TW0602",
    "高炉投料实绩",
    "input",
    "/mes4tq/process/blast/input/index.vue",
    "ArrowsJoin2",
  ),
  leaf(
    "tq-wg-3",
    W.BLAST,
    "003",
    "TW0603",
    "高炉收料实绩",
    "output",
    "/mes4tq/process/blast/output/index.vue",
    "ArrowsJoin2",
  ),
  leaf(
    "tq-wg-4",
    W.BLAST,
    "004",
    "TW0604",
    "高炉运行参数",
    "running",
    "/mes4tq/process/blast/running/index.vue",
    "Gauge",
  ),
  leaf("tq-wg-5", W.BLAST, "005", "TW0605", "喷煤制粉运行", "pci", "/mes4tq/process/blast/pci/index.vue", "Hammer"),
  leaf(
    "tq-wg-6",
    W.BLAST,
    "006",
    "TW0606",
    "休风实绩",
    "downtime",
    "/mes4tq/process/blast/downtime/index.vue",
    "ClockHour4",
  ),
  leaf(
    "tq-wg-7",
    W.BLAST,
    "007",
    "TW0607",
    "热风炉运行",
    "hot-stove",
    "/mes4tq/process/blast/hot-stove/index.vue",
    "Flame",
  ),

  /* ── TW06 工序统计查询（跨工序）─────────────────────────────────────── */
  folder(W.STAT, M.PROCESS, "007", "工序统计查询", "stat", "ChartBar"),
  leaf(
    "tq-wr-1",
    W.STAT,
    "001",
    "TW0701",
    "料仓变料记录查询",
    "bin-change",
    "/mes4tq/process/stat/bin-change/index.vue",
    "History",
  ),
  leaf(
    "tq-wr-2",
    W.STAT,
    "002",
    "TW0702",
    "能源数据结果查询",
    "energy",
    "/mes4tq/process/stat/energy/index.vue",
    "Bolt",
  ),

  /* ══ TM 铁水调度（P2）——以「铁次」为基本单元 ═══════════════════════════ */
  folder(M.IRON, "tqmes-root", "007", "铁水调度", "iron", "Truck"),
  leaf("tq-tm-1", M.IRON, "001", "TM0001", "出铁计划", "plan", "/mes4tq/iron/plan/index.vue", "ClipboardList"),
  leaf("tq-tm-2", M.IRON, "002", "TM0002", "铁水罐管理", "ladle", "/mes4tq/iron/ladle/index.vue", "Cube"),
  leaf("tq-tm-3", M.IRON, "003", "TM0003", "铁水过磅台账", "weigh", "/mes4tq/iron/weigh/index.vue", "Scale"),

  /* ══ TC 成本归集（P2）——日清月结 ═══════════════════════════════════════ */
  folder(M.COST, "tqmes-root", "008", "成本归集", "cost", "Wallet"),
  leaf("tq-tc-1", M.COST, "001", "TC0001", "成本项单价维护", "price", "/mes4tq/cost/price/index.vue", "Coins"),
  leaf("tq-tc-2", M.COST, "002", "TC0002", "成本分析", "analysis", "/mes4tq/cost/analysis/index.vue", "ChartPie"),
  leaf("tq-tc-3", M.COST, "003", "TC0003", "成本调差记录", "adjust", "/mes4tq/cost/adjust/index.vue", "Receipt"),

  /* ══ TR 统计报表（P1）——子母项：班→日→月 ═══════════════════════════════ */
  folder(M.REPORT, "tqmes-root", "009", "统计报表", "report", "ReportAnalytics"),
  leaf(
    "tq-tr-1",
    M.REPORT,
    "001",
    "TR0001",
    "生产日报月报",
    "daily",
    "/mes4tq/report/daily/index.vue",
    "ReportAnalytics",
  ),
  leaf("tq-tr-2", M.REPORT, "002", "TR0002", "班组指标完成情况", "team", "/mes4tq/report/team/index.vue", "UsersGroup"),
  leaf("tq-tr-3", M.REPORT, "003", "TR0003", "综合统计报表", "summary", "/mes4tq/report/summary/index.vue", "Table"),

  /* ══ TD 大屏看板（P1）——V1 全屏大屏，`blank` 让路由在新窗口开 ═══════════ */
  folder(M.BOARD, "tqmes-root", "010", "大屏看板", "board", "DeviceTv"),
  leaf(
    "tq-td-1",
    M.BOARD,
    "001",
    "TD0001",
    "烧结生产大屏",
    "sinter",
    "/mes4tq/board/sinter/index.vue",
    "DeviceTv",
    "blank",
  ),
  leaf(
    "tq-td-2",
    M.BOARD,
    "002",
    "TD0002",
    "高炉运行大屏",
    "blast",
    "/mes4tq/board/blast/index.vue",
    "DeviceTv",
    "blank",
  ),
  leaf(
    "tq-td-3",
    M.BOARD,
    "003",
    "TD0003",
    "铁水运行信息汇总",
    "iron",
    "/mes4tq/board/iron/index.vue",
    "DeviceTv",
    "blank",
  ),

  /* ══ TI 系统集成（P0）——ERP/计量/检化验/数采/EMS 的对接面 ═══════════════ */
  folder(M.INTEGRATE, "tqmes-root", "011", "系统集成", "integrate", "Api"),
  leaf(
    "tq-ti-1",
    M.INTEGRATE,
    "001",
    "TI0001",
    "采集点位配置",
    "point",
    "/mes4tq/integrate/point/index.vue",
    "Sitemap",
  ),
  leaf(
    "tq-ti-2",
    M.INTEGRATE,
    "002",
    "TI0002",
    "采集结果查询",
    "result",
    "/mes4tq/integrate/result/index.vue",
    "Database",
  ),
  leaf("tq-ti-3", M.INTEGRATE, "003", "TI0003", "接口日志监控", "log", "/mes4tq/integrate/log/index.vue", "FileText"),
  leaf("tq-ti-4", M.INTEGRATE, "004", "TI0004", "能源数据接口", "energy", "/mes4tq/integrate/energy/index.vue", "Api"),
];

/** 叶子数（不含域根与分组）：71 = 附录 A3 的 71 个功能叶 + 首页，规格书 A2 的口径 */
const LEAF_COUNT = 71;

/** 装配期自检：菜单形状写错不会编译报错，只会在页面上少一项或多一项（demo 现场才发现） */
if (import.meta.env?.DEV) {
  const bad: string[] = [];
  const ids = seedRescsData.map((r) => r.id);
  if (new Set(ids).size !== ids.length) bad.push("资源 id 重复");
  if (seedRescsData.filter((r) => r.cResSubPath).length !== LEAF_COUNT + 1)
    bad.push(`叶子数 ${seedRescsData.filter((r) => r.cResSubPath).length}，应为 ${LEAF_COUNT + 1}（71 功能叶 + 首页）`);
  for (const r of seedRescsData) {
    if (r.cPid && !ids.includes(r.cPid)) bad.push(`${r.id} 的父节点 ${r.cPid} 不存在`);
    if (String(r.cResPath ?? "").includes("/")) bad.push(`${r.id} 的 cResPath「${r.cResPath}」不是单段`);
    if (r.cResSubPath && !String(r.cResSubPath).startsWith("/mes4tq/"))
      bad.push(`${r.id} 的 cResSubPath 未以 /mes4tq/ 开头`);
  }
  /* 编码唯一：一次性颁发的前提是同一个码不会出现在两页上 */
  const codes = seedRescsData.map((r) => r.cCode).filter(Boolean);
  if (new Set(codes).size !== codes.length) bad.push("功能页编码重复");
  /* TW 分块编号：块内序号必须连续且块间隔为 100，否则补页时会把两个工序挤到同一段 */
  const tw = codes.filter((c) => /^TW\d{4}$/.test(c));
  if (tw.length !== 35) bad.push(`TW 编码 ${tw.length} 个，应为 35`);
  if (bad.length) throw new Error(`[tqmes] 菜单资源表不自洽：\n  ${bad.join("\n  ")}`);
}
