import type { ColDef } from "ag-grid-community";

import type { PageResult } from "@/api/mes4tq/types";

/**
 * 铁区MES 列表页的声明式规格（`ListPage.vue` 的入参）。形状源自能源域的同名文件，
 * 但**刻意自带一份、不跨域 import**——两个域互不相干，跨域引用会让一个域的改动抖到另一个域，
 * 重复是这个决定的已知代价，不是待清理的技术债。
 *
 * ⚠️ **本域是「只查桩」范围，所以比能源域少了两大块，这不是漏写**：
 * - 没有 `EditField` / `edit` / `writeFn` / `deleteFn`——本域 mock 只提供查询端点，
 *   一个写端点都没有（规格书里的「▶ 模拟触发」走 `toolbar.extraButtons`，点了只提示待接入）。
 * - `RowAct.kind` 只剩 `detail` / `link` / `stub` 三种**读动作**，`run` / `form` 那两个
 *   「调接口改状态」的钩子一并去掉：留着就是没人验证过的死代码。
 *
 * 补写操作时**照能源域的 `src/pages/energy/listTypes.ts` 把缺的钩子搬回来**，
 * 别在页面里各写一遍管道——`ListPage` 那一层的价值就是「一个页面只声明、不写管道」。
 *
 * 不适合这套骨架的页面（三张全屏大屏、工序实时运行盘、料场图、成本对比图、月结矩阵）
 * 不套它，各自写 index.vue——spec 不为它们留钩子，避免变成万能参数袋。
 */

/** 查询条件 */
export interface QueryField {
  /** 请求参数名；`range` 类型忽略它、固定送 `startTime`/`endTime`（与 mock 的 dateRange/dayRange 对齐） */
  key: string;
  label: string;
  kind: "input" | "select" | "date" | "range";
  /**
   * 静态候选。运行时拉的（机组、物料、料仓、班组、人名）由页面自己 `onMounted` 取回来后
   * 放进 computed spec——不提供 `optionsFrom` 钩子：spec 是 computed，候选到货自然重算，
   * 多一层回调只是把同一件事做两遍。
   */
  options?: string[];
  placeholder?: string;
  /**
   * 取值形态：
   * - 不给：`range` 送带时分的 `YYYY-MM-DD HH:mm:ss`（开停机、推焦、出铁的时间要精确到分钟）
   * - `"date"`：只送 `YYYY-MM-DD`（生产日期、检验日期这类行里本来就没有时分的字段）
   * - `"year"`：只送 `YYYY`（技经指标的年计划）
   */
  as?: "year" | "date";
  /**
   * 展示文案 → 请求值。行里存布尔或编码、下拉显示中文时用
   * （「是/否」→ `"true"/"false"`；mock 的 `eq()` 对布尔字段两种都认）。
   */
  valueMap?: Record<string, string>;
}

/** 行内动作（本域只有读动作，见文件头说明） */
export interface RowAct {
  label: string;
  /**
   * detail=只读描述弹窗；link=跳另一个站内页（按 pageId，如 `/tqmes/quality/order`）；
   * stub=只提示「待接入」（规格书里那些需要写端点的动作走这里）
   */
  kind: "detail" | "link" | "stub";
  /** kind=link 的目标路由 */
  to?: string;
  /** 弹窗标题，默认取 `label` */
  title?: string;
  /** 该行是否提供此动作（按状态收敛按钮） */
  shown?: (row: any) => boolean;
}

/** 详情弹窗的一段 */
export interface DetailSection {
  title?: string;
  fields: Array<{
    label: string;
    /** 取行/详情对象上的字段名 */
    from: string;
    suffix?: string;
    /** 编码 → 展示文案 */
    map?: Record<string, string>;
  }>;
}

export interface ListPageSpec {
  /** 页面代号（资源表 cCode，如 `TG0001`），写进来源注释；导出时同时作为实体名（`/tqmes/export` 的 `entity`） */
  code: string;
  /**
   * 导出实体名，只在**一页多表**时需要：一张 TG0003 上有料仓台账和变料记录两张表，
   * 它们的页面代号相同，导出文件名却必须不同（toast 念错表名就是本域红线意义上的"页间矛盾"）。
   */
  exportEntity?: string;
  query: QueryField[];
  /** 列（不含序号列——行号由平台 agGrid 内置 rowNumbers 给；也不含操作列，由 actions 决定） */
  columns: ColDef[];
  actions?: RowAct[];
  toolbar?: {
    /**
     * 只插桩的按钮（「▶ 模拟上料」「▶ 模拟推焦」这类规格书 B7 要求的演示触发点，
     * 以及打印、模板下载这类后端确实没提供的）。点了统一提示「待接入」——
     * 本域没有写端点，但按钮**必须画出来**：B7 的剧本是销售走查的抓手，
     * 少一个按钮客户会以为这功能没做，多一个提示反而说明了「后端待接」的真实状态。
     */
    extraButtons?: string[];
  };
  detail?: { sections: DetailSection[] };
  /** 详情数据要不要单独请求；不给就直接用行数据 */
  detailFetch?: (id: string) => Promise<any>;
  fetch: (q: Record<string, any>) => Promise<PageResult<any>>;
  /**
   * 工具栏右侧的统计提示。给函数可基于当前页数据现算（「在线 12 · 异常 2 · 离线 1」这类）；
   * 不给则回退到默认的「共 N 条」。
   */
  summary?: string | ((ctx: { total: number; rows: any[] }) => string);
  /**
   * 点中一行（L3 主从双表的「选主行 → 带出下表」）。
   *
   * 为什么是回调而不是让页面自己去 `AgGridVue` 上绑 `rowClicked`：
   * 那样页面就得拿到 ListPage 内部的表格实例，**把管道摊到每个页面**——
   * 这个骨架存在的意义就是页面只声明、不写管道。
   *
   * 只给 L3 用。L1 的行点击语义是「打开详情」，那走 `actions` 里的 `detail`。
   */
  onRowClick?: (row: any) => void;
  /**
   * 查询条件 label 宽度（默认 `w-16`）。ui-rules §6 要求**同一页内统一**，
   * 默认档只放得下 ≤5 字；有长 label 时整页放宽并在该页来源注释里写明原因。
   */
  queryLabelWidth?: string;
}
