/**
 * 扫码后要打开的 H5 档案页地址。
 *
 * 为什么是 `window.location.origin` 而不是页面里写死一个域名：演示环境经常换机器换端口，
 * 写死的地址扫出来是 404；跟着当前来源走，**在局域网里拿手机扫屏上的码就能真打开**。
 * 路径与 `src/router/business.ts` 里那条 `meta.public` 的路由一一对应——
 * 那是全站唯一一条「免登录 + 整屏深色」的设备域路由，改它必须同时改这里。
 */
const H5_PATH = "/eam/eq";

export function h5ArchiveUrl(code: string): string {
  return `${window.location.origin}${H5_PATH}?code=${encodeURIComponent(code)}`;
}
