/** pageId → 路由 path 的单一映射（home 挂壳层根路径）。
 *  pageId 即资源路径链（真实后端 "admin/user" → /admin/user；mock "sys-users" → /sys-users）。
 *  独立模块防 router↔组件循环引用。 */
export function tabPath(page: string): string {
  return page === "home" ? "/" : `/${page}`;
}
