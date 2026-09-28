import type { ColDef } from "ag-grid-community";

import type { ActionResult, PageResult } from "@/api/equipment/types";

/**
 * 设备域列表页的声明式规格（`ListPage.vue` 的入参）。形状源自 `src/pages/carbon/listTypes.ts`，
 * 但**不是照抄**——设备域的 mock 会真的落库，所以本域多了三处 carbon 没有的东西：
 *
 * 1. `RowAct.run` / `ToolAct.run`：carbon 的行内动作只有「详情/编辑/删除」三种固定语义，
 *    动作按钮点了只是弹窗；本域一个页面上同时有「派工」「领料」「验证」「转工单」「结算」「折算」
 *    这些**改变状态机**的动作，必须能把「调哪个接口、成功后说什么」写进 spec。
 * 2. `RowAct.shown`：状态机页面的动作是**按行状态出现**的（待派工的行才给「派工」），
 *    全部常显会让客户以为点得动，反而像 bug。
 * 3. `EditField.kind` 多一个 `bool`：本域有 `lifeManaged`/`enabled`/`mandatoryVerify` 这类
 *    **真布尔**字段。用 `select` + `valueMap` 翻成 `"true"/"false"` 字符串会把布尔列写成字符串
 *    （`saveRow` 原样落库），台账页与筛选（`eq` 认 boolean）都会错位。
 *
 * 不适合这套骨架的页面（寿命结算单、离职折算、驾驶舱、实时监控、结构树…）不套它，
 * 各自写 index.vue——spec 不为它们留钩子，避免变成万能参数袋。
 */

/** 查询条件 */
export interface QueryField {
  /** 请求参数名；`range` 类型忽略它、固定送 `startTime`/`endTime`（与 mock 的 dateRange/dayRange 对齐） */
  key: string;
  label: string;
  kind: "input" | "select" | "date" | "range";
  /**
   * 静态候选。运行时拉的（设备、人名）由页面自己 `onMounted` 取回来后放进 computed spec——
   * 不提供 `optionsFrom` 钩子：spec 是 computed，候选到货自然重算，多一层回调只是把同一件事做两遍。
   */
  options?: string[];
  placeholder?: string;
  /**
   * 取值形态：
   * - 不给：`range` 送带时分的 `YYYY-MM-DD HH:mm:ss`（报警/工单的创建时间要精确到分钟）
   * - `"date"`：只送 `YYYY-MM-DD`（投运日期、点检计划日这类行里本来就没有时分的字段）
   * - `"year"`：只送 `YYYY`
   */
  as?: "year" | "date";
  /**
   * 展示文案 → 请求值。行里存布尔或编码、下拉显示中文时用
   * （「是/否」→ `"true"/"false"`；mock 的 `eq()` 对布尔字段两种都认）。
   */
  valueMap?: Record<string, string>;
}

/** 表单字段（编辑弹窗与动作表单弹窗共用） */
export interface EditField {
  key: string;
  label: string;
  kind: "input" | "select" | "multi" | "date" | "number" | "textarea" | "bool";
  options?: string[];
  unit?: string;
  /** date 字段：值里带不带时分秒（报警/工单时间戳要带，投运日期不要） */
  withTime?: boolean;
  /** 展示文案 → 落库值，见 `QueryField.valueMap` 的同款说明 */
  valueMap?: Record<string, string>;
  /** 表单里占整行（默认半行）；长文本、说明类字段用 */
  full?: boolean;
  placeholder?: string;
  /** 打开弹窗时的初值（动作表单里常见「数量默认 1」「日期默认今天」） */
  initial?: any;
}

/** 行内动作 */
export interface RowAct {
  label: string;
  /**
   * detail=只读描述弹窗；edit=表单弹窗（提交走 `spec.writeFn`）；delete=确认删除（走 `spec.deleteFn`）；
   * form=先弹 `fields` 表单再走 `run`（派工选人、领料填数量）；
   * run=直接调 `run`（确认、关闭这类无入参动作）；link=跳另一个站内页；stub=只提示
   */
  kind: "detail" | "edit" | "delete" | "form" | "run" | "link" | "stub";
  /** kind=link 的目标路由（按 pageId，如 `/equipment/spare/stock`） */
  to?: string;
  /** kind=form 的表单字段 */
  fields?: EditField[];
  /** 弹窗标题，默认取 `label` */
  title?: string;
  /**
   * 动作本体。返回值若是 `ActionResult`，由 `ListPage` 统一判定：
   * `ok=false` → warn toast 报出 `msg`（业务拒绝）且不刷新；`ok=true` → success toast + 刷新列表。
   */
  run?: (row: any, form: Record<string, any>) => Promise<ActionResult<any> | unknown>;
  /** `run` 成功但后端没给 msg 时的兜底文案 */
  okMsg?: string;
  /** 该行是否提供此动作（按状态机当前态收敛按钮） */
  shown?: (row: any) => boolean;
  /** 动作成功后要不要重查列表；默认要。导出、纯提示类动作给 `false` */
  refresh?: boolean;
}

/** 工具栏动作（不针对某一行：生成当月结算单、手工入库、批量触发…） */
export interface ToolAct {
  label: string;
  fields?: EditField[];
  run?: (form: Record<string, any>) => Promise<ActionResult<any> | unknown>;
  okMsg?: string;
  /** 无表单时的二次确认文案；给了就弹确认框，避免误点 */
  confirm?: string;
  /** 动作成功后要不要重查列表（默认要——本域写操作真的落库）。导出这类无状态变更的动作给 `false` */
  refresh?: boolean;
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
  /** 页面代号（资源表 cCode，如 `AS0001`），写进来源注释与导出参数 */
  code: string;
  query: QueryField[];
  /** 列（不含序号列——行号由平台 agGrid 内置 rowNumbers 给；也不含操作列，由 actions 决定） */
  columns: ColDef[];
  actions?: RowAct[];
  toolbar?: {
    /** 顶部「新增」（有 edit spec 时通常要开） */
    add?: boolean;
    /** 工具栏动作（`run`/表单），点完自动刷新 */
    acts?: ToolAct[];
    /** 只插桩的按钮（打印、模板下载这类后端确实没提供的） */
    extraButtons?: string[];
  };
  detail?: { sections: DetailSection[] };
  /** 详情数据要不要单独请求；不给就直接用行数据 */
  detailFetch?: (id: string) => Promise<any>;
  edit?: { title?: string; fields: EditField[] };
  fetch: (q: Record<string, any>) => Promise<PageResult<any>>;
  /** 新增/编辑提交 */
  writeFn?: (data: Record<string, any>) => Promise<unknown>;
  deleteFn?: (id: string) => Promise<unknown>;
  /**
   * 工具栏右侧的统计提示。给函数可基于当前页数据现算（「临期 3 · 超期 2」这类）；
   * 不给则回退到默认的「共 N 条」。
   */
  summary?: string | ((ctx: { total: number; rows: any[] }) => string);
  /**
   * 查询条件 label 宽度（默认 `w-16`）。ui-rules §6 要求**同一页内统一**，
   * 默认档只放得下 ≤5 字；有长 label 时整页放宽并在该页来源注释里写明原因。
   */
  queryLabelWidth?: string;
}
