import type { ColDef } from "ag-grid-community";

import type { ActionResult, PageResult } from "@/api/energy/types";

/**
 * 能源域列表页的声明式规格（`ListPage.vue` 的入参）。形状源自设备域的同名文件，
 * 但**刻意自带一份、不跨域 import**——两个域互不相干，跨域引用会让一个域的改动抖到另一个域，
 * 重复是这个决定的已知代价，不是待清理的技术债。
 *
 * 能源域的 mock 会真的落库，所以保留了设备域因「动作改状态」而多出的三处：
 *
 * 1. `RowAct.run` / `ToolAct.run`：本域一个页面上同时有「确认」「转调度令」「下达」
 *    「执行完毕」「核对」「定稿」「校正审批」这些**改变状态机**的动作，
 *    必须能把「调哪个接口、成功后说什么」写进 spec。
 * 2. `RowAct.shown`：状态机页面的动作是**按行状态出现**的（活动报警才给「确认」，
 *    已生成的结算单才给「核对」），全部常显会让客户以为点得动，反而像 bug。
 * 3. `EditField.kind` 的 `bool`：本域有 `isSettlement`/`forcedVerify`/`enabled`/`powerFactorAdj`
 *    这类**真布尔**字段。用 `select` + `valueMap` 翻成 `"true"/"false"` 字符串会把布尔列写成字符串
 *    （`saveRow` 原样落库），配置页与筛选都会错位。
 *
 * 不适合这套骨架的页面（能源平衡表矩阵、实时监测大屏、潮流图、考核排名矩阵…）不套它，
 * 各自写 index.vue——spec 不为它们留钩子，避免变成万能参数袋。
 */

/** 查询条件 */
export interface QueryField {
  /** 请求参数名；`range` 类型忽略它、固定送 `startTime`/`endTime`（与 mock 的 dateRange/dayRange 对齐） */
  key: string;
  label: string;
  kind: "input" | "select" | "date" | "range";
  /**
   * 静态候选。运行时拉的（用能单元、介质、人名）由页面自己 `onMounted` 取回来后放进 computed spec——
   * 不提供 `optionsFrom` 钩子：spec 是 computed，候选到货自然重算，多一层回调只是把同一件事做两遍。
   */
  options?: string[];
  placeholder?: string;
  /**
   * 取值形态：
   * - 不给：`range` 送带时分的 `YYYY-MM-DD HH:mm:ss`（报警/通道心跳的时间要精确到分钟）
   * - `"date"`：只送 `YYYY-MM-DD`（实绩日期、下次检定日这类行里本来就没有时分的字段）
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
  /** date 字段：值里带不带时分秒（调度令时限要带，实绩日期、生效月份不要） */
  withTime?: boolean;
  /** 展示文案 → 落库值，见 `QueryField.valueMap` 的同款说明。`select` 与 `multi` 都吃（后者逐元素翻） */
  valueMap?: Record<string, string>;
  /** 表单里占整行（默认半行）；长文本、说明类字段用 */
  full?: boolean;
  placeholder?: string;
  /** 打开弹窗时的初值（动作表单里常见「校正值默认建议值」「日期默认今天」） */
  initial?: any;
}

/** 行内动作 */
export interface RowAct {
  label: string;
  /**
   * detail=只读描述弹窗；edit=表单弹窗（提交走 `spec.writeFn`）；delete=确认删除（走 `spec.deleteFn`）；
   * form=先弹 `fields` 表单再走 `run`（转调度令选接收人、实绩校正填新值与原因）；
   * run=直接调 `run`（确认、核对这类无入参动作）；link=跳另一个站内页；stub=只提示
   */
  kind: "detail" | "edit" | "delete" | "form" | "run" | "link" | "stub";
  /** kind=link 的目标路由（按 pageId，如 `/energy/ep/settlement`） */
  to?: string;
  /** kind=form 的表单字段 */
  fields?: EditField[];
  /** 弹窗标题，默认取 `label` */
  title?: string;
  /**
   * `kind=run` 的二次确认文案：给了就先弹确认框再调 `run`。
   * 状态机页面上「模拟中断」「下达调度令」这类**一按就改到别的页**的动作必须给——
   * 客户点完才发现画面变了，会以为是误触，而不是"这个系统会连带做什么"。
   */
  confirm?: string;
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

/** 工具栏动作（不针对某一行：生成当月结算单、手工触发平衡、按产量重算计划…） */
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
  /** 页面代号（资源表 cCode，如 `EP0002`），写进来源注释；导出时同时作为实体名（`/ems/export` 的 `entity`） */
  code: string;
  /**
   * 导出实体名，只在**一页多表**时需要：一张 EG0003 上有报警规则和电价模板两张表，
   * 它们的页面代号相同，导出文件名却必须不同（toast 念错表名就是本域红线意义上的"页间矛盾"）。
   */
  exportEntity?: string;
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
   * 工具栏右侧的统计提示。给函数可基于当前页数据现算（「通讯异常 2 · 离线 1」这类）；
   * 不给则回退到默认的「共 N 条」。
   */
  summary?: string | ((ctx: { total: number; rows: any[] }) => string);
  /**
   * 查询条件 label 宽度（默认 `w-16`）。ui-rules §6 要求**同一页内统一**，
   * 默认档只放得下 ≤5 字；有长 label 时整页放宽并在该页来源注释里写明原因。
   */
  queryLabelWidth?: string;
}
