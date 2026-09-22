/**
 * HMX 通用 ag-grid 基建：全局初始化插件（模块注册 + License + 默认 gridOptions）、统一主题、默认列定义、空值格式化。
 */
import { computed, type ComputedRef, type Plugin } from "vue";
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
  type MenuItemDef,
  type Theme,
  type ValueFormatterParams,
} from "ag-grid-community";
import { AllEnterpriseModule, LicenseManager } from "ag-grid-enterprise";
import { useSettingsStore } from "@/stores/settingsStore";

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

/* HMX ag-grid 插件（main.ts 里 app.use 一次装齐，页面不再各自初始化；app.use 自带防重复安装）：
   社区+企业模块注册、企业版 License、全站默认 gridOptions——单元格划选 + 行号列 +
   树形展开/折叠与高级筛选右键菜单（provideGlobalGridOptions 注入，页面级 gridOptions 优先级更高）。
   注：不用 cellSelection.enableColumnSelection——它会让点列头被选列独占、排序失效；
   选列走列菜单「选中此列」（hmxDefaultColDef.columnMenuItems） */
export const hmxAgGridPlugin: Plugin = {
  install() {
    ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);
    LicenseManager.setLicenseKey("[v3][RELEASE][0102]_NDg2Njc4MzY3MDgzNw==16d78ca762fb5d2ff740aed081e2af7b");
    provideGlobalGridOptions({
      cellSelection: true,
      rowNumbers: { width: 32, minWidth: 32, maxWidth: 64 },
      getContextMenuItems: hmxGetContextMenuItems,
      // 右键「导出」子菜单只保留 Excel，隐藏「导出为PDF」（页面级 gridOptions 可覆盖）
      suppressPdfExport: true,
    });
  },
};

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

export const hmxDefaultColDef: ColDef = { sortable: true, resizable: true, filter: true, columnMenuItems: hmxColumnMenuItems };

/** 默认数据首次渲染完成后按内容自适应列宽（Community autoSizeAllColumns）。绑到 AgGridVue 的 @first-data-rendered。 */
export function autoSizeOnFirstData(e: FirstDataRenderedEvent) {
  e.api.autoSizeAllColumns();
}

/** HMX 网格主题：行高 28、表头 29、边框/前景/背景走 CSS 变量（随明暗自动切换）。须在组件 setup 内调用。 */
export function makeHmxGridTheme(): ComputedRef<Theme> {
  const settingsStore = useSettingsStore();
  return computed(() =>
    themeQuartz.withParams({
      rowHeight: 28,
      headerHeight: 29,
      fontSize: `${settingsStore.editorSettings.fontSize}px`,
      /* 表格字体栈 = 用户英文字体（若有）→ 表字体（拉丁 tabular）→ 全站 --font-sans（含中/英文设置） */
      fontFamily: [
        settingsStore.editorSettings.fontEnglishFamily
          ? `"${settingsStore.editorSettings.fontEnglishFamily}"`
          : null,
        `'${settingsStore.editorSettings.tableFontFamily}'`,
        "var(--font-sans)",
      ]
        .filter(Boolean)
        .join(", "),
      spacing: 5, // 默认通常是 8px，调小到 4-6 即可明显紧凑
      headerFontSize: "12px",
      headerFontWeight: 500,
      borderColor: "var(--border)",
      foregroundColor: "var(--foreground)",
      backgroundColor: "var(--background)",
      oddRowBackgroundColor: "transparent",
      cellHorizontalPadding: 8,
      headerBackgroundColor: "rgb(229 230 235)",
      headerTextColor: "var(--muted-foreground)",
      selectedRowBackgroundColor: "var(--accent)",
      rangeSelectionBorderColor: "var(--primary)",
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
