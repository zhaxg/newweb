import type { ColDef } from "ag-grid-community";
import type { PageResult } from "@/api/carbon/types";

/**
 * 碳域列表页的声明式规格（`ListPage.vue` 的入参）。
 *
 * 为什么要这一层：碳资产 48 个页面里有 40+ 是同一骨架——查询条件区 + h-9 工具栏 + 表格 +
 * 分页 + 行内「详情/编辑/删除」。逐页抄 48 遍既容易漂移（ui-rules 的字阶/工具栏高度/label 宽度
 * 每处手抄都可能走样），也让后续批量修订要改 48 个文件。差异（查哪些字段、有哪些列、
 * 弹窗里是什么）全部收进 spec；布局纪律只在 `ListPage.vue` 里写一次。
 *
 * 不适合这套骨架的页面（排放明细的 34 列宽表、月度存证的年历卡片、碳分析的上传清空）
 * 不套它，各自写独立 index.vue——spec 不为它们留钩子，避免变成万能参数袋。
 */

/** 查询条件（控件类型只有这四种，来自线上 48 页实测） */
export interface QueryField {
  /** 请求参数名 */
  key: string;
  label: string;
  kind: "input" | "select" | "date" | "range";
  /** select 的候选（照线上下拉实测抄） */
  options?: string[];
  placeholder?: string;
  /**
   * date/range 的取值形态：
   * - 不给 = 完整日期时间 `YYYY-MM-DD HH:mm:ss`（线上默认）
   * - `"year"` = 只送年份 `YYYY`（年度类筛选：目标完成情况的「开始年度」、报表的年份）
   *   不这么处理的话 `2026` 会被拿去和 `2026-01-01 00:00:00` 做包含匹配，永远搜不到行。
   */
  as?: "year";
  /**
   * 展示文案 → 请求值的反查表。线上不少筛选下拉显示中文、行数据里存编码
   * （配额履约的「履约/配额」= serverType 1/2），不翻译就会拿中文去匹配数字，永远搜不到。
   */
  valueMap?: Record<string, string>;
}

/** 行内动作 */
export interface RowAct {
  label: string;
  /**
   * detail=只读描述弹窗；edit=表单弹窗（提交只插桩）；delete=确认删除（只插桩）；
   * link=跳另一个站内页（预警设置行内的「预警记录」）；stub=无弹窗仅提示
   */
  kind: "detail" | "edit" | "delete" | "link" | "stub";
  /** kind=link 时的目标路由（按 pageId，如 `/carbonWarning/records`） */
  to?: string;
}

/** 详情弹窗的一段（原弹窗「账户变动信息」「业务信息」这类分组） */
export interface DetailSection {
  title?: string;
  fields: Array<{
    label: string;
    /** 取行/详情对象上的字段名 */
    from: string;
    suffix?: string;
    /** 编码 → 展示文案（线上存 enter_target 这类 code、显示中文） */
    map?: Record<string, string>;
  }>;
}

/** 编辑表单字段 */
export interface EditField {
  key: string;
  label: string;
  kind: "input" | "select" | "date" | "number" | "textarea";
  options?: string[];
  unit?: string;
  /** 展示文案 → 落库值（行里存字典序号、下拉显示中文时用），见 QueryField.valueMap 的同款说明 */
  valueMap?: Record<string, string>;
}

export interface ListPageSpec {
  /** 页面代号（cResSubPath 的最后一段，用于来源注释与日志） */
  code: string;
  /** 查询条件（0 个也合法：排放明细这类全靠固定期间的页面） */
  query: QueryField[];
  /** 列（不含序号列，ListPage 统一加；也不含操作列，由 actions 决定） */
  columns: ColDef[];
  actions?: RowAct[];
  toolbar?: {
    /** 顶部「新增」（有 edit spec 时通常要开） */
    add?: boolean;
    /** 顶部「导出」（配 exportFn） */
    export?: boolean;
    /** 额外的只插桩按钮，如「模板下载」「上传」 */
    extraButtons?: string[];
  };
  /** 详情弹窗分段；无 detail 动作时不需要 */
  detail?: { sections: DetailSection[] };
  /** 详情数据是否要单独请求（线上 getXxxInfo/:id）；不给就直接用行数据 */
  detailFetch?: (id: string) => Promise<any>;
  /** 编辑/新增表单 */
  edit?: { title?: string; fields: EditField[] };
  /** 查询 */
  fetch: (q: Record<string, any>) => Promise<PageResult<any>>;
  /** 导出（只插桩） */
  exportFn?: (q?: Record<string, any>) => Promise<unknown>;
  /** 新增/编辑提交（只插桩） */
  writeFn?: (data: Record<string, any>) => Promise<unknown>;
  /** 删除（只插桩） */
  deleteFn?: (id: string) => Promise<unknown>;
  /**
   * 表格右上角的统计提示（原页面「减排量：118551.39 tCO2」这类）。
   * 给函数可基于当前页数据现算；不给则回退到默认的「共 N 条」。
   */
  summary?: string | ((ctx: { total: number; rows: any[] }) => string);
  /**
   * 查询条件 label 的宽度（默认 `w-16`）。ui-rules §6 的 label 宽度硬规则要求**同一页内统一**，
   * 且默认档只放得下 ≤5 字；某页有 6+ 字的长 label 时按「单页让步放行」整页放宽，
   * 并在该页来源注释里写明放宽到多少、因为什么。
   */
  queryLabelWidth?: string;
  /** 原表没有序号列（碳信息页就是），关掉默认加的那根 */
  noSeq?: boolean;
}
