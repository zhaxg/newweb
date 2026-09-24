/** 按需加载 Univer Sheets（设计页专用，不进首屏）
 *  含浮动图片 drawing 链（模型 + UI 菜单 sheet.menu.image）
 */
let loading: Promise<void> | null = null;

export function ensureUniver(): Promise<void> {
  if (!loading) {
    loading = Promise.all([
      import("@univerjs/presets"),
      import("@univerjs/preset-sheets-core"),
      import("@univerjs/preset-sheets-core/lib/index.css"),
      import("@univerjs/drawing"),
      import("@univerjs/docs-drawing"),
      import("@univerjs/sheets-drawing"),
      import("@univerjs/drawing-ui"),
      import("@univerjs/drawing-ui/lib/index.css"),
      import("@univerjs/sheets-drawing-ui"),
      import("@univerjs/sheets-drawing-ui/lib/index.css"),
      import("@univerjs/drawing-ui/locale/zh-CN"),
      import("@univerjs/sheets-drawing-ui/locale/zh-CN"),
    ]).then(() => undefined);
  }
  return loading;
}
