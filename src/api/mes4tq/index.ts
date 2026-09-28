import { requestClient } from "@/api/_core/request";

import type {
  ActionResult,
  BatchingPlan,
  CokeQualityRecord,
  BinChangeRecord,
  BlendPile,
  BoardData,
  CollectPoint,
  CollectResult,
  CostAdjust,
  CostAnalysis,
  CostItemPrice,
  DemandPlan,
  DowntimeRecord,
  EnergyInterfaceRow,
  Factory,
  InspectionOrder,
  InterfaceLog,
  IronLadle,
  Material,
  MonthlyPlan,
  PageResult,
  Person,
  ProcessCollectData,
  ProcessParam,
  ProductionInput,
  ProductionOutput,
  ProductionUnit,
  PushCokeRecord,
  PurchasePlan,
  QualityBatch,
  QualityStandard,
  SiloBin,
  StatRow,
  StockBalance,
  StockRecord,
  StockTxn,
  StoreLocation,
  StoreRoom,
  TankStock,
  TappingActual,
  TappingPlan,
  TechIndicatorDef,
  TechIndicatorPlan,
  WasteHeatRecord,
  Workshop,
} from "./types";

/**
 * 铁区MES（tqmes）演示域接口层。
 *
 * **命名空间 `/tqmes`**：接口前缀是租户识别的一部分——碳资产占用 `/business/**`、
 * 设备域占用 `/eam/**`、能源域占用 `/ems/**`，本域再共用任一都会让 mock 路由表出现同名键、
 * 将来接真实后端时两套端点互相遮蔽。`tqmes` 与登录账号同名（见 `src/mock/tenants.ts`）。
 *
 * ── 本域是「只查桩」范围，所以这里**只有读方法** ──────────────────────────
 * 没有 `save` / `remove` / `xxxAction`。规格书 B7 要求的那批「▶ 模拟触发」按钮
 * 在页面上以 `toolbar.extraButtons` 画出来、点了提示待接入（见 `listTypes.ts` 的说明），
 * 所以这里也不需要为它们留占位方法——**没人调用的方法等于没人验证过的代码**。
 *
 * 三条约定（与平台其他演示域同形，但**代码各自一份、不跨域 import**）：
 * 1. 列表统一 **POST `listPage`**，参数 `{currentPage,pageSize,...条件}`，回 `{total,rows}`；
 * 2. 不分页的取全量（树、下拉候选、大屏整屏）走 **GET**，参数进 `params`；
 * 3. 返回体一律是 `./types` 里声明的契约类型。
 *
 * url 写**去掉 `/api` 的原路径**，`withApiPrefix()` 统一补前缀（`src/api/_core/request.ts`）。
 */
const B = "/tqmes";

/* ── 通用工厂 ─────────────────────────────────────────────────────────── */

/** 列表查询：`tqList<Material>("/material")` → 打 `/tqmes/material/listPage` */
export function tqList<T>(entity: string): (q?: Record<string, any>) => Promise<PageResult<T>> {
  return (q = {}) => requestClient.request<PageResult<T>>(`${B}${entity}/listPage`, { method: "post", data: q });
}

/** 无分页取全量（下拉候选、树、卡片墙、大屏整屏） */
export function tqGet<T>(path: string, params?: Record<string, any>): Promise<T> {
  return requestClient.request<T>(`${B}${path}`, { method: "get", params });
}

/**
 * 导出（模拟）。
 *
 * 刻意回一个**文件名**而不是 `null`：页面 toast 里念出「生产日报_2026-09.csv 已提交导出队列」，
 * 比一句干巴巴的「操作成功」像真的。不落盘、不生成内容——演示到此为止，
 * 真接后端时这个端点换成返回下载链接，页面零改动。
 *
 * 这是本域**唯一的非 GET 端点**，但它不改任何数据，所以不违反「只查桩」的范围。
 */
export function exportRows(entity: string, params: Record<string, any> = {}): Promise<ActionResult> {
  return requestClient.request<ActionResult>(`${B}/export`, { method: "post", data: { entity, ...params } });
}

/* ── 共用候选（几乎每页的过滤器都要它们）───────────────────────────────── */

/**
 * 工序字典（原料/焦化/烧结/球团/石灰/高炉）。
 *
 * 为什么是端点而不是页面 `import` 常量：工序名要同时出现在下拉、表头标签、
 * 详情弹窗、大屏图例四处，页面各写一份字典，改一个工序名要改六处页面。
 * 候选走端点后，`data/org.ts` 的 `PROCESS_NAME` 是唯一真源。
 */
export const processApi = {
  list: () => tqGet<Array<{ code: string; name: string; unitCount: number; siloCount: number }>>("/process/list"),
  /** 某工序的机组（TW 各页的机组下拉只列本工序，不给会把高炉列到烧结页上） */
  units: (process: string) => tqGet<Array<{ id: string; name: string; spec?: string }>>("/process/units", { process }),
};

/** 人名候选（取样人、判定人、操作人、签发人的下拉都读它） */
export const personApi = {
  list: () => tqGet<Person[]>("/person/list"),
};

/** 组织树：工厂 → 车间 → 机组（TG0001 产线维护的左树、各页的机组下拉共用） */
export const orgApi = {
  /** 扁平的组织节点（工厂 + 车间 + 机组同表，靠 `level` 区分），nameMaps 的车间/工厂翻译读它 */
  list: () => tqGet<Array<Factory | Workshop | ProductionUnit>>("/org/list"),
  /** 机组全量（最常用的下拉候选） */
  units: () => tqGet<ProductionUnit[]>("/unit/list"),
};

/** 机组（产线） */
export const unitApi = {
  list: () => tqGet<ProductionUnit[]>("/unit/list"),
  page: tqList<ProductionUnit>("/unit"),
};

/* ══════════════════════════════════════════════════════════════════════════
   TG 基础配置
   ══════════════════════════════════════════════════════════════════════════ */

/** TG0001 产线维护（L2 左树右表：树是组织、表是机组） */
export const lineApi = {
  page: tqList<ProductionUnit>("/unit"),
  detail: (id: string) => tqGet<ProductionUnit>("/unit/detail", { id }),
};

/** TG0002 物料管理 */
export const materialApi = {
  list: () => tqGet<Material[]>("/material/list"),
  page: tqList<Material>("/material"),
  detail: (id: string) => tqGet<Material>("/material/detail", { id }),
};

/** TG0003 料仓管理（料仓台账 + 当前料种/料位；变料记录见 `binChangeApi`） */
export const siloApi = {
  list: () => tqGet<SiloBin[]>("/silo/list"),
  page: tqList<SiloBin>("/silo"),
  /** 按机组取料仓（TG0001 的树展开、TW 各工序料仓页共用） */
  byUnit: (unitId: string) => tqGet<SiloBin[]>("/silo/byUnit", { unitId }),
};

/** TG0004 排班配置（班组/班次/排班规则/排班结果四张表同页） */
export const shiftApi = {
  /** 班组（甲/乙/丙/丁） */
  teams: () => tqGet<Array<{ id: string; name: string; leader?: string; members?: number }>>("/shift/teams"),
  /** 班次（A 08:00-16:00 / B 16:00-00:00 / C 00:00-08:00） */
  shifts: () =>
    tqGet<Array<{ id: string; code: string; name: string; beginTime: string; endTime: string }>>("/shift/shifts"),
  /** 排班规则 */
  rules: () => tqGet<Array<Record<string, any>>>("/shift/rules"),
  /** 排班结果（按日期区间的班次安排） */
  page: tqList<Record<string, any>>("/shift"),
};

/** TG0005 指标维护（技经指标定义） */
export const indicatorApi = {
  page: tqList<TechIndicatorDef>("/indicator"),
  list: () => tqGet<TechIndicatorDef[]>("/indicator/list"),
};

/* ══════════════════════════════════════════════════════════════════════════
   TP 计划管理
   ══════════════════════════════════════════════════════════════════════════ */

/** TP0001 技经指标管理（年/月技经指标录入与对比） */
export const techIndicatorApi = {
  page: tqList<TechIndicatorPlan>("/techIndicator"),
  /** 指标对比：计划 vs 实际（TP0001 的对比列） */
  compare: (period: string) => tqGet<TechIndicatorPlan[]>("/techIndicator/compare", { period }),
};

/** TP0002 月生产计划编制（铁水→烧结→球团→原料 倒推） */
export const monthlyPlanApi = {
  page: tqList<MonthlyPlan>("/monthlyPlan"),
  /** 倒推链：给一个 period 回整棵倒推树（TP0002 的树形展示） */
  chain: (period: string) => tqGet<MonthlyPlan[]>("/monthlyPlan/chain", { period }),
};

/** TP0003 需求计划管理 */
export const demandPlanApi = {
  page: tqList<DemandPlan>("/demandPlan"),
};

/** TP0004 采购计划管理 */
export const purchasePlanApi = {
  page: tqList<PurchasePlan>("/purchasePlan"),
};

/** 供方候选（TP0004 的供应商下拉）——**与订单同源**，所以不会筛出 0 行 */
export const supplierApi = {
  list: () => tqGet<Array<{ id: string; name: string }>>("/supplier/list"),
};

/* ══════════════════════════════════════════════════════════════════════════
   TB 配料管理（四工序共用一张主表，靠 `process` 分页）
   ══════════════════════════════════════════════════════════════════════════ */

export const batchingApi = {
  page: tqList<BatchingPlan>("/batching"),
  /** 配比明细（L3 主从双表的下表） */
  items: (planId: string) => tqGet<BatchingPlan["ratio"]>("/batching/items", { planId }),
  detail: (id: string) => tqGet<BatchingPlan>("/batching/detail", { id }),
};

/** TB0001 混匀配料计划专用的料堆视图（混匀料堆管理在 TW0102，这里只取计划侧的堆信息） */
export const blendPileApi = {
  page: tqList<BlendPile>("/blendPile"),
  detail: (id: string) => tqGet<BlendPile>("/blendPile/detail", { id }),
};

/* ══════════════════════════════════════════════════════════════════════════
   TS 物料与库存
   ══════════════════════════════════════════════════════════════════════════ */

/** TS0001 库房库位管理（左树：库房 → 库位；右表：库位明细） */
export const storeApi = {
  rooms: () => tqGet<StoreRoom[]>("/store/rooms"),
  locations: (roomCode?: string) => tqGet<StoreLocation[]>("/store/locations", roomCode ? { roomCode } : undefined),
  locationPage: tqList<StoreLocation>("/storeLocation"),
};

/** TS0002 库存管理（实物库存 + 收发存） */
export const stockApi = {
  page: tqList<StockRecord>("/stock"),
  /** 收发存汇总（按料号+库位聚合） */
  balance: (q: Record<string, any> = {}) => tqGet<StockBalance[]>("/stock/balance", q),
  detail: (id: string) => tqGet<StockRecord>("/stock/detail", { id }),
};

/** TS0003 出入库记录查询（流水账） */
export const stockTxnApi = {
  page: tqList<StockTxn>("/stockTxn"),
};

/** TS0004 料场可视化（料条/堆号/料位图） */
export const yardApi = {
  piles: () => tqGet<Array<Record<string, any>>>("/yard/piles"),
  page: tqList<Record<string, any>>("/yard"),
};

/* ══════════════════════════════════════════════════════════════════════════
   TQ 质量管理
   ══════════════════════════════════════════════════════════════════════════ */

/** TQ0001 检验标准维护（按品名+检验项展开的标准明细） */
export const qualityStandardApi = {
  page: tqList<QualityStandard>("/qualityStandard"),
  /**
   * 按品名取该品名的全部检验项（L3 主从双表：左选品名、右看标准）。
   *
   * ⚠️ 参数名是 **`proName`**（品名），与行里的 `proName` 字段同名——
   * 早先写成 `proCode` 而 mock 侧读 `proName`，两边对不上会**静默返回第一种品名**的项：
   * 页面看着正常、数据全错。参数名一律与行字段同名，不另立翻译。
   */
  byProduct: (proName: string) => tqGet<QualityStandard[]>("/qualityStandard/byProduct", { proName }),
  /** 品名候选（TQ0001 的品名下拉与 TQ0003 同源，不会出现筛出 0 行的选项） */
  products: () => tqGet<string[]>("/qualityStandard/products"),
};

/** TQ0002 检验委托管理（L7 流程看板：创建→取样→制样→检验→判定→报出） */
export const inspectionApi = {
  page: tqList<InspectionOrder>("/inspection"),
  detail: (id: string) => tqGet<InspectionOrder>("/inspection/detail", { id }),
  /** 委托流转统计（流程看板每列的头数） */
  flow: () => tqGet<Record<string, number>>("/inspection/flow"),
};

/** TQ0003 检验实绩查询（铁水/烧结矿/球团/原燃料质量） */
export const qualityBatchApi = {
  page: tqList<QualityBatch>("/qualityBatch"),
  detail: (id: string) => tqGet<QualityBatch>("/qualityBatch/detail", { id }),
  /** 来源候选（进厂 / 工序产出 / 铁水 三档，B2 的 `source` 字段） */
  sources: () => tqGet<string[]>("/qualityBatch/sources"),
};

/* ══════════════════════════════════════════════════════════════════════════
   TW 工序作业（35 页共用下面这组端点，靠 `process` 参数分流）
   ══════════════════════════════════════════════════════════════════════════ */

/** 料仓变料（TW0101/0201/0301/0401/0501/0601 + TW0701 跨工序查询共用一张表） */
export const binChangeApi = {
  page: tqList<BinChangeRecord>("/binChange"),
  /** 当前料仓状态（各工序「料仓变料」页的上半屏：料仓卡片墙） */
  current: (unitId?: string) => tqGet<SiloBin[]>("/binChange/current", unitId ? { unitId } : undefined),
};

/** 投料实绩（TW0103/0202/0302/0402/0502/0602） */
export const inputApi = {
  page: tqList<ProductionInput>("/input"),
  detail: (id: string) => tqGet<ProductionInput>("/input/detail", { id }),
  /** 按料批汇总（高炉料批管理：TW0602 的料批视图） */
  byBatch: (q: Record<string, any>) => tqGet<Array<Record<string, any>>>("/input/byBatch", q),
};

/** 收料实绩（TW0104/0303/0403/0503/0603） */
export const outputApi = {
  page: tqList<ProductionOutput>("/output"),
  detail: (id: string) => tqGet<ProductionOutput>("/output/detail", { id }),
};

/** 停机记录（TW0305/0405/0606 三页共用） */
export const downtimeApi = {
  page: tqList<DowntimeRecord>("/downtime"),
  detail: (id: string) => tqGet<DowntimeRecord>("/downtime/detail", { id }),
};

/** 工艺采集数据（投收料的采集侧来源，TW 各页的「采集明细」下钻） */
export const collectDataApi = {
  page: tqList<ProcessCollectData>("/collectData"),
};

/** 槽存（TW0401 烧结料仓变料的槽存列、TW0701 的槽存查询） */
export const tankStockApi = {
  page: tqList<TankStock>("/tankStock"),
};

/** 工序运行参数（TW 各工序「运行参数」页 / L5 实时监控盘） */
export const processParamApi = {
  /**
   * 某机组的当前参数快照（监控盘轮询取数；定时器归页面，见 AGENTS 的 KeepAlive 约定）。
   * `paramKey` 同 `defs`——焦化的三页各看一套参数，不能只按机组推。
   */
  current: (unitId: string, paramKey?: string) =>
    tqGet<ProcessParam>("/processParam/current", paramKey ? { unitId, paramKey } : { unitId }),
  /** 参数历史曲线。`keys` 给了就只取那几条，不给就是该套的全部参数 */
  history: (unitId: string, keys: string[] = [], hours = 8, paramKey?: string) =>
    tqGet<{
      times: string[];
      series: Array<{ name: string; unit?: string; data: number[] }>;
      defs: Array<{ key: string; label: string; unit: string; lo: number; hi: number }>;
    }>("/processParam/history", {
      unitId,
      keys: keys.join(","),
      hours,
      ...(paramKey ? { paramKey } : {}),
    }),
  /**
   * 参数定义（键 → 中文名/单位/上下限），页面不写死阈值。
   *
   * `paramKey` 只在焦化要用（那里有三套参数：`coke` 主参数、`coke-oven` 炉温、
   * `coke-gas` 煤气净化），其余工序 `paramKey` 省略即回落到 `process`。
   */
  defs: (process: string, paramKey?: string) =>
    tqGet<Array<Record<string, any>>>("/processParam/defs", paramKey ? { process, paramKey } : { process }),
};

/** 推焦作业实绩（TW0203） */
export const pushCokeApi = {
  page: tqList<PushCokeRecord>("/pushCoke"),
};

/**
 * 焦炭质量与产量（TW0205）。
 *
 * 与 `qualityBatchApi`（TQ 的检验批次）是**两套**：那张是「一批一个检验值」，
 * 这张是「一天一个日均值 + 当日产量」，粒度不同所以各开一个端点。
 */
export const cokeQualityApi = {
  page: tqList<CokeQualityRecord>("/cokeQuality"),
};

/** 余热回收监控（TW0406） */
export const wasteHeatApi = {
  page: tqList<WasteHeatRecord>("/wasteHeat"),
  /** 当前值 + 曲线（L5 监控盘） */
  current: (unitId: string) => tqGet<WasteHeatRecord>("/wasteHeat/current", { unitId }),
};

/** 供料作业记录（TW0105：向烧结/球团/高炉供料的品种/数量/时间） */
export const supplyApi = {
  page: tqList<Record<string, any>>("/supply"),
};

/** 喷煤制粉运行（TW0605） */
export const pciApi = {
  page: tqList<Record<string, any>>("/pci"),
  current: (unitId: string) => tqGet<Record<string, any>>("/pci/current", { unitId }),
};

/** 热风炉运行（TW0607） */
export const hotStoveApi = {
  page: tqList<Record<string, any>>("/hotStove"),
  current: (unitId: string) => tqGet<Record<string, any>>("/hotStove/current", { unitId }),
};

/* ══════════════════════════════════════════════════════════════════════════
   TM 铁水调度
   ══════════════════════════════════════════════════════════════════════════ */

/** TM0001 出铁计划（L7 流程看板） */
export const tappingPlanApi = {
  page: tqList<TappingPlan>("/tappingPlan"),
  detail: (id: string) => tqGet<TappingPlan>("/tappingPlan/detail", { id }),
  /**
   * 出铁计划的流转统计（看板四列的列头计数）。
   * **必须与行同源**——列头数与卡片数对不上，客户一眼看出看板是假的。
   */
  flow: () => tqGet<Record<string, number>>("/tappingPlan/flow"),
  /** 三座高炉的候选（出铁计划与过磅台账共用同一个下拉） */
  furnaces: () => tqGet<Array<{ id: string; name: string; spec: string }>>("/tappingPlan/furnaces"),
};

/** TM0002 铁水罐管理 */
export const ladleApi = {
  page: tqList<IronLadle>("/ladle"),
  /** 罐位分布（L5/大屏的罐位图：位置 → 罐列表） */
  byLocation: () => tqGet<Record<string, IronLadle[]>>("/ladle/byLocation"),
};

/** TM0003 铁水过磅台账（计量系统回传的磅重+温度+成分） */
export const tappingActualApi = {
  page: tqList<TappingActual>("/tappingActual"),
  detail: (id: string) => tqGet<TappingActual>("/tappingActual/detail", { id }),
};

/* ══════════════════════════════════════════════════════════════════════════
   TC 成本归集
   ══════════════════════════════════════════════════════════════════════════ */

/** TC0001 成本项单价维护 */
export const costPriceApi = {
  page: tqList<CostItemPrice>("/costPrice"),
  /** 成本项字典（单价页与成本分析页共用同一批项） */
  items: () => tqGet<Array<{ itemNo: string; itemName: string; category: string; unit: string }>>("/costPrice/items"),
};

/** TC0002 成本分析（L4 图表分析：工序成本对比 + 趋势） */
export const costAnalysisApi = {
  page: tqList<CostAnalysis>("/costAnalysis"),
  /** 成本构成（饼图） */
  structure: (period: string, unitId?: string) =>
    tqGet<Array<{ name: string; value: number }>>("/costAnalysis/structure", unitId ? { period, unitId } : { period }),
  /** 工序成本对比 + 趋势（柱线混排） */
  compare: (period: string) => tqGet<Record<string, any>>("/costAnalysis/compare", { period }),
};

/** TC0003 成本调差记录 */
export const costAdjustApi = {
  page: tqList<CostAdjust>("/costAdjust"),
};

/* ══════════════════════════════════════════════════════════════════════════
   TR 统计报表
   ══════════════════════════════════════════════════════════════════════════ */

export const statApi = {
  page: tqList<StatRow>("/stat"),
  /** 子母项钻取：给一个统计行的 id，回它的子项明细（TR0001 的「这个数怎么来的」） */
  drill: (id: string) => tqGet<StatRow>("/stat/drill", { id }),
  /** 班组竞赛排名（TR0002） */
  teamRank: (period: string) => tqGet<StatRow[]>("/stat/teamRank", { period }),
  /** 候选：三页共用（期别 / 日期 / 班组 / 机组 / 指标名），页面不写死下拉 */
  periods: () => tqGet<string[]>("/report/periods"),
  dates: () => tqGet<string[]>("/report/dates"),
  teams: () => tqGet<Array<{ id: string; name: string; leader: string; members: number }>>("/report/teams"),
  units: () => tqGet<Array<{ id: string; name: string; type: string }>>("/report/units"),
  indicators: () => tqGet<string[]>("/report/indicators"),
};

/* ══════════════════════════════════════════════════════════════════════════
   TD 大屏看板（三张屏各一个整屏端点，形状统一是 `BoardData`）
   ══════════════════════════════════════════════════════════════════════════ */

export const boardApi = {
  /**
   * 屏的**外壳**（标题 + 工艺色键 + 口径说明），**不含数据**。
   * 外壳挂载时取一次就够——数据每 5s 刷，外壳不该跟着一起刷。
   */
  shell: (kind: "sinter" | "blast" | "iron") =>
    tqGet<{ kind: string; title: string; areaKey: string; footer: string }>("/board/shell", { kind }),
  /** TD0001 烧结生产大屏 */
  sinter: () => tqGet<BoardData>("/board/sinter"),
  /** TD0002 高炉运行大屏 */
  blast: () => tqGet<BoardData>("/board/blast"),
  /** TD0003 铁水运行信息汇总 */
  iron: () => tqGet<BoardData>("/board/iron"),
};

/* ══════════════════════════════════════════════════════════════════════════
   TI 系统集成
   ══════════════════════════════════════════════════════════════════════════ */

/** TI0001 采集点位配置 */
export const collectPointApi = {
  page: tqList<CollectPoint>("/collectPoint"),
  list: () => tqGet<CollectPoint[]>("/collectPoint/list"),
  /** 按区域统计点位数（B1 的自控系统表：高炉主工艺 4263 点、烧结 3300 点…） */
  byArea: () => tqGet<Array<{ area: string; protocol: string; system: string; total: number }>>("/collectPoint/byArea"),
};

/** TI0002 采集结果查询（L5 实时监控盘：实时值/历史值/报警记录） */
export const collectResultApi = {
  page: tqList<CollectResult>("/collectResult"),
  /** 一批点位的当前值（监控盘轮询） */
  realtime: (pointIds: string[] = []) =>
    requestClient.request<CollectResult[]>(`${B}/collectResult/realtime`, { method: "post", data: { pointIds } }),
  /** 单点历史曲线 */
  history: (pointId: string, hours = 8) =>
    tqGet<{ times: string[]; data: number[] }>("/collectResult/history", { pointId, hours }),
};

/** TI0003 接口日志监控 */
export const interfaceLogApi = {
  page: tqList<InterfaceLog>("/interfaceLog"),
  detail: (id: string) => tqGet<InterfaceLog>("/interfaceLog/detail", { id }),
  /** 各接口的成功率汇总（顶部统计条） */
  health: () =>
    tqGet<Array<{ interfaceName: string; total: number; fail: number; rate: number }>>("/interfaceLog/health"),
};

/** TI0004 能源数据接口（接收 EMS 的水电气消耗数据） */
export const energyInterfaceApi = {
  page: tqList<EnergyInterfaceRow>("/energyInterface"),
  /** 按介质汇总（TI0004 的介质汇总卡）——**只算推送成功的行**，失败的在明细里是「缺」不是 0 */
  byMedium: (q: Record<string, any> = {}) =>
    tqGet<Array<{ medium: string; unit: string; qty: number; stdCoal: number; amount: number }>>(
      "/energyInterface/byMedium",
      q,
    ),
  /**
   * 按**工序**汇总的能耗（TW0702「能源数据结果查询」的右表）。
   *
   * 与 `byMedium` 是两个不同的切面：那条按介质 × 日期算，这条按工序 × 介质算。
   * 从 `byMedium` 的明细里聚合不出工序维度（那批行挂的是工厂不是工序），所以各一条。
   */
  processEnergy: (q: Record<string, any> = {}) =>
    tqGet<
      Array<{
        id: string;
        process: string;
        processName: string;
        medium: string;
        unit: string;
        qty: number;
        stdCoal: number;
        amount: number;
        unitConsumption: number;
        yoy: number;
      }>
    >("/processEnergy/list", q),
};
