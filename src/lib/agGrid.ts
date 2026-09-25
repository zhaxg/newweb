/**
 * HMX 通用 ag-grid 基建：模块注册 + License + 全局默认 gridOptions（本模块求值即装齐：
 * 中文 locale / 默认列定义 / 关列虚拟化 / 划选 / 右键菜单等，见注册段）、统一主题、空值格式化。
 * 本模块只应被表格页（路由懒加载）引入，不得回到 main.ts 的静态 import 链——原因见下方注册段注释。
 */
import { computed, type ComputedRef } from "vue";
import {
  AllCommunityModule,
  ModuleRegistry,
  provideGlobalGridOptions,
  themeQuartz,
  type ColDef,
  type DefaultColumnMenuItem,
  type DefaultMenuItem,
  type FirstDataRenderedEvent,
  type GetColumnMenuItemsParams,
  type GetContextMenuItemsParams,
  type GridApi,
  type MenuItemDef,
  type Theme,
  type ValueFormatterParams,
} from "ag-grid-community";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";
/* 中文文案表：曾是 283 页逐页 import + :locale-text 的样板（451 处同值绑定），上提为全局默认 localeText */
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { useSettingsStore } from "@/stores/settingsStore";
/* 网格配套样式随本模块（即首个表格页）加载，不进 main.ts 首屏 CSS 链 */
import "../styles/agGrid.css";

/* 全局右键菜单：树形（treeData/分组）网格在默认项前追加"展开所有/折叠所有"，平铺网格保持默认。
   所有网格追加"高级筛选"（企业版条件组合筛选面板）——ag-grid 中高级筛选与列头筛选互斥，
   故 enableAdvancedFilter 不全局开，右键按需对该网格切换，面板打开时列头漏斗暂时隐藏、关闭后还原。
   经 provideGlobalGridOptions 注入，页面未显式传 getContextMenuItems 即生效。 */
export function hmxGetContextMenuItems(params: GetContextMenuItemsParams): (DefaultMenuItem | MenuItemDef)[] {
  const defaults = params.defaultItems ?? [];
  const advEnabled = !!params.api.getGridOption("enableAdvancedFilter");
  const advancedFilter: MenuItemDef = advEnabled
    ? {
        name: "关闭高级筛选",
        icon: '<span class="ag-icon ag-icon-filter" role="presentation"></span>',
        action: () => {
          params.api.hideAdvancedFilterBuilder();
          params.api.setGridOption("enableAdvancedFilter", false);
        },
      }
    : {
        name: "高级筛选",
        icon: '<span class="ag-icon ag-icon-filter" role="presentation"></span>',
        action: () => {
          params.api.setGridOption("enableAdvancedFilter", true);
          params.api.showAdvancedFilterBuilder();
        },
      };
  let isTree = false;
  params.api.forEachNode((n) => {
    if (n.group) isTree = true;
  });
  if (!isTree) return [...defaults, "separator", advancedFilter];
  return [
    { name: "展开所有", action: () => params.api.expandAll() },
    { name: "折叠所有", action: () => params.api.collapseAll() },
    "separator",
    ...defaults,
    "separator",
    advancedFilter,
  ];
}

/** NULL / 千分位 / 是否，与采购订单页一致 */
export function hmxNullFormatter(p: ValueFormatterParams): string {
  const v = p.value as unknown;
  if (v === null || v === undefined || v === "") return "NULL";
  if (typeof v === "number")
    return Number.isInteger(v) ? String(v) : v.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  if (typeof v === "boolean") return v ? "是" : "否";
  return String(v);
}

/* filter: true 全站默认开启列头筛选（文本/数字/日期按值类型自动选件），列菜单同时出现「筛选」页签 */
/* 列头 ⋮ 菜单：默认项后追加「选中此列」（选中该列全部单元格 range，等价 Excel 列头箭头全选；
   点列头仍是排序动作，二者不冲突）与「按此列分组」（企业版行分组，setRowGroupColumns 为整组替换，
   分组后源列并入"组"列、还原走"组"列菜单自带的"取消全部分组"）。
   页级 columnMenuItems 可先调用本函数再追加自有项。 */
export function hmxColumnMenuItems(p: GetColumnMenuItemsParams): (DefaultColumnMenuItem | MenuItemDef)[] {
  const col = p.column;
  /* 内置 token 换名（方案二 token 替换，仅影响列菜单）：autoSizeThis/autoSizeAll → 列宽自适应系列，
     动作与内置一致（api.autoSizeColumns / autoSizeAllColumns） */
  const items: (DefaultColumnMenuItem | MenuItemDef)[] = (p.defaultItems ?? []).map((it) =>
    it === "autoSizeThis"
      ? { name: "最佳列宽", action: () => col && p.api.autoSizeColumns([col]) }
      : it === "autoSizeAll"
        ? { name: "最佳列宽/所有列", action: () => p.api.autoSizeAllColumns() }
        : it,
  );
  if (col && col.getId() !== "ag-Grid-AutoColumn") {
    items.push(
      {
        name: "选中此列",
        action: () => {
          const n = p.api.getDisplayedRowCount();
          if (n > 0) p.api.addCellRange({ rowStartIndex: 0, rowEndIndex: n - 1, columns: [col] });
        },
      },
      { name: "按此列分组", action: () => p.api.setRowGroupColumns([col]) },
    );
  }
  return items;
}

export const hmxDefaultColDef: ColDef = {
  sortable: true,
  resizable: true,
  filter: true,
  columnMenuItems: hmxColumnMenuItems,
};

/* HMX ag-grid 全站初始化：社区+企业模块注册、企业版 License、全站默认 gridOptions。
   provideGlobalGridOptions 注入，页面级 gridOptions 优先级更高——存量页面显式传同值属冗余覆盖，行为不变。
   全局默认三项（本段必须排在 hmxDefaultColDef 之后：模块求值按序执行，const 有 TDZ）：
   - localeText：AG_GRID_LOCALE_CN 中文。曾是 283 页逐页 import + :locale-text 的样板（451 处同值绑定），
     上提后新页面不必再写，漏写也不会再出英文筛选面板/导出菜单；
   - defaultColDef：hmxDefaultColDef。283 页逐页 :default-col-def 且无一改动过它（spread 改写 0 处），同理由页面上提；
   - suppressColumnVirtualisation：关列虚拟化。autoSizeAllColumns 量不到屏幕外列（官方 Column Sizing 文档：
     "leaves off-screen columns untouched"），而全仓 230 页在用 autoSizeOnFirstData——原 hmxGridOptions 只有
     1 页显式消费，不全局化则宽表横向滚出的列永不自适应。代价是全列渲染，本仓列数量级（几十列）可接受。
   其余默认：cellSelection 单元格划选 + rowNumbers 行号列 + 10px 滚动条预留（agGrid.css 自绘）、
   getContextMenuItems 树形展开/折叠 + 「高级筛选」右键（hmxGetContextMenuItems）、suppressPdfExport 导出只留 Excel。
   注：不用 cellSelection.enableColumnSelection——它会让点列头被选列独占、排序失效；
   选列走列菜单「选中此列」（hmxDefaultColDef.columnMenuItems）。
   执行时机在本模块求值、而不是原 main.ts 的 app.use：main.ts → 本模块是一条静态 import 链，会把 ag-grid
   community+enterprise 全家桶拖进首屏 entry chunk（登录页所有用户都要先下载执行这 2MB+）。时机仍安全——
   全仓 284 处 <AgGridVue> 页面全部路由懒加载、且无一例外 import 本模块取运行时值（脚本核对 0 例外），
   chunk 求值必然早于该页首个网格构造（模块求值 → 组件 setup → AgGridVue 创建 grid）。
   ES 模块单例只执行一次；HMR 重复求值时 ModuleRegistry / provideGlobalGridOptions 也是幂等的。 */
ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);
LicenseManager.setLicenseKey("[v3][RELEASE][0102]_NDg2Njc4MzY3MDgzNw==16d78ca762fb5d2ff740aed081e2af7b");
provideGlobalGridOptions({
  cellSelection: true,
  /* 自绘 10px 滚动条（agGrid.css ::-webkit-scrollbar），告知 grid 按 10px 预留布局 */
  scrollbarWidth: 10,
  rowNumbers: { width: 32, minWidth: 32, maxWidth: 64 },
  getContextMenuItems: hmxGetContextMenuItems,
  // 右键「导出」子菜单只保留 Excel，隐藏「导出为PDF」（页面级 gridOptions 可覆盖）
  suppressPdfExport: true,
  /* —— 文案/列/虚拟化三项全局默认（283 页重复样板上提，见上方注释） —— */
  localeText: AG_GRID_LOCALE_CN,
  defaultColDef: hmxDefaultColDef,
  suppressColumnVirtualisation: true,
});

/** 已并入 provideGlobalGridOptions 全局默认（suppressColumnVirtualisation），本导出仅供存量页面显式标注
    （仅 SMP/TAVersion 在用），新代码不必再传 */
export const hmxGridOptions = {
  suppressColumnVirtualisation: true,
} as const;

/** 默认数据首次渲染完成后按内容自适应列宽（Community autoSizeAllColumns）。绑到 AgGridVue 的 @first-data-rendered。 */
export function autoSizeOnFirstData(e: FirstDataRenderedEvent) {
  requestAnimationFrame(() => e.api.autoSizeAllColumns());
  setTimeout(() => e.api.autoSizeAllColumns(), 150);
  setTimeout(() => e.api.autoSizeAllColumns(), 400);
}

/** 网格布局完成后执行 bestFit（绑到 @grid-size-changed，时机晚于 first-data-rendered） */
export function autoSizeOnGridReady(api: { autoSizeAllColumns: () => void }) {
  requestAnimationFrame(() => api.autoSizeAllColumns());
  setTimeout(() => api.autoSizeAllColumns(), 200);
}

/** 页面初始化完成后对指定表格执行 bestFit */
export function bestFitGrid(gridApi: GridApi | null | undefined) {
  if (!gridApi) return;
  requestAnimationFrame(() => gridApi.autoSizeAllColumns());
  setTimeout(() => gridApi.autoSizeAllColumns(), 200);
  setTimeout(() => gridApi.autoSizeAllColumns(), 500);
}

/** HMX 网格主题：行高 28、表头 29、边框/前景/背景走 CSS 变量（随明暗自动切换）。须在组件 setup 内调用。 */
export function makeHmxGridTheme(): ComputedRef<Theme> {
  const settingsStore = useSettingsStore();
  return computed(() =>
    themeQuartz.withParams({
      rowHeight: 28,
      headerHeight: 29,
      /* 数据区 = 内容正文，字号钉在字阶正文档 0.8125rem（13px@16），rem 随 --hmx-scale 缩放 */
      fontSize: "0.8125rem",
      /* 表格字体栈 = 用户英文字体（若有）→ 表字体（拉丁 tabular）→ 全站 --font-sans（含中/英文设置） */
      fontFamily: [
        settingsStore.editorSettings.fontEnglishFamily ? `"${settingsStore.editorSettings.fontEnglishFamily}"` : null,
        `'${settingsStore.editorSettings.tableFontFamily}'`,
        "var(--font-sans)",
      ]
        .filter(Boolean)
        .join(", "),
      spacing: 5, // 默认通常是 8px，调小到 4-6 即可明显紧凑
      headerFontSize: "0.75rem", // 表头 = 控件/辅助档 12px（rem 同上）
      headerFontWeight: 500,
      borderColor: "var(--border)",
      borderRadius: "0px",
      foregroundColor: "var(--foreground)",
      backgroundColor: "var(--background)",
      oddRowBackgroundColor: "transparent",
      cellHorizontalPadding: 8,
      headerBackgroundColor: "rgb(229 230 235)",
      headerTextColor: "var(--muted-foreground)",
      selectedRowBackgroundColor: "var(--accent)",
      rangeSelectionBorderColor: "var(--p-primary-color)",
      rangeSelectionBackgroundColor: "rgba(59,130,246,0.12)",
      menuShadow: {
        radius: 8, // 模糊半径，shadcn 通常用 4-8px
        spread: 0, // 扩散，shadcn 通常为 0
        color: "rgba(0,0,0,0.08)", // 极低透明度
        offsetY: 2, // 向下偏移 2px
      },
    }),
  );
}
