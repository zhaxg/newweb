/**
 * 按需加载 vue-print-designer（Web Component 注册 + 样式）。
 * 首屏 main.ts 不再全局 import；仅打印设计器页 / 打印模拟数据时调用。
 * customElements.define 后，页面上已存在的 <print-designer> 会自动 upgrade。
 */
let loading: Promise<void> | null = null;

export function ensurePrintDesigner(): Promise<void> {
  if (!loading) {
    loading = Promise.all([
      import("vue-print-designer"),
      import("vue-print-designer/style.css"),
    ]).then(() => undefined);
  }
  return loading;
}
