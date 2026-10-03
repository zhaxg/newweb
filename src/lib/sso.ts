/**
 * SSO 跨认证中心往返的浏览器侧状态：state（防 CSRF，回跳核对、一次性）与原始回跳页。
 * 存 sessionStorage——按标签页隔离、随整页 302 往返保留、跨站 JS 读不到，
 * 正是 state 该待的地方（后端在登录前没有本系统会话，由前端负责核对）。
 * 消费方：router/core/guard（起跳登记）、pages/_core/login/SsoCallbackPage（回跳消费）。
 */

export const SSO_STATE_KEY = "hmx.sso.state";
export const SSO_REDIRECT_KEY = "hmx.sso.redirect";

/** 16 字节随机 hex（认证中心只原样透传 state，不解析其内容） */
export function randomSsoState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 起跳前登记：state 与回跳页写入 sessionStorage */
export function saveSsoStart(state: string, redirect: string): void {
  sessionStorage.setItem(SSO_STATE_KEY, state);
  sessionStorage.setItem(SSO_REDIRECT_KEY, redirect);
}

/** 回跳页读取并**一次性消费**（防重放）state 与回跳页；缺失返回空串/根路径 */
export function consumeSsoStart(): { state: string; redirect: string } {
  const state = sessionStorage.getItem(SSO_STATE_KEY) ?? "";
  const redirect = sessionStorage.getItem(SSO_REDIRECT_KEY) ?? "/";
  sessionStorage.removeItem(SSO_STATE_KEY);
  sessionStorage.removeItem(SSO_REDIRECT_KEY);
  return { state, redirect };
}

/** 回跳地址合法性（同 LoginCard 的开放重定向防线：仅接受站内绝对路径） */
export function safeLocalPath(p: string | null | undefined): string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : "/";
}
