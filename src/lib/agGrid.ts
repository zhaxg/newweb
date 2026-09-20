/**
 * HMX 通用 ag-grid 基建：模块注册（幂等）、统一主题、默认列定义、空值格式化。
 * 企业版 License 只在 App.vue 设置，此处不重复。
 */
import { computed, type ComputedRef } from "vue";
import {
  AllCommunityModule,
  ModuleRegistry,
  provideGlobalGridOptions,
  themeQuartz,
  type ColDef,
  type DefaultMenuItem,
  type GetContextMenuItemsParams,
  type MenuItemDef,
  type Theme,
  type ValueFormatterParams,
} from "ag-grid-community";
import { AllEnterpriseModule } from "ag-grid-enterprise";
import { useSettingsStore } from "@/stores/settingsStore";

let registered = false;

/* 全局右键菜单：树形（treeData/分组）网格在默认项前追加"展开所有/折叠所有"，平铺网格保持默认。
   经 provideGlobalGridOptions 注入，页面未显式传 getContextMenuItems 即生效。 */
function hmxGetContextMenuItems(params: GetContextMenuItemsParams): (DefaultMenuItem | MenuItemDef)[] {
  const defaults = params.defaultItems ?? [];
  let isTree = false;
  params.api.forEachNode((n) => {
    if (n.group) isTree = true;
  });
  if (!isTree) return defaults;
  return [
    { name: "展开所有", action: () => params.api.expandAll() },
    { name: "折叠所有", action: () => params.api.collapseAll() },
    "separator",
    ...defaults,
  ];
}

export function ensureAgGrid() {
  if (registered) return;
  ModuleRegistry.registerModules([AllCommunityModule, AllEnterpriseModule]);
  /* 全站默认：单元格划选 + 行号列 + 树形展开/折叠右键菜单；页面级 gridOptions 优先级更高（如 :row-numbers="false" 隐藏） */
  provideGlobalGridOptions({
    cellSelection: true,
    rowNumbers: { width: 32, minWidth: 32, maxWidth: 64 },
    getContextMenuItems: hmxGetContextMenuItems,
  });
  registered = true;
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

export const hmxDefaultColDef: ColDef = { sortable: true, resizable: true, filter: false };

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
