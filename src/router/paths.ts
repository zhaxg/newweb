/** pageId → 路由 path 的单一映射（home 挂壳层根路径）。独立模块防 router↔组件循环引用。 */
export function tabPath(page: string): string {
  return page === "home" ? "/" : `/page/${page}`;
}
