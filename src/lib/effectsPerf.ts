/**
 * 页面特效（光斑漂移 / 毛玻璃 backdrop-blur）降级控制。
 * 软件渲染环境（远程桌面、无 GPU 云桌面等）下 CSS 大半径模糊全部落到 CPU，
 * 这里探测 WebGL 渲染器并把 html.hmx-effects-off 类打到根元素，样式层据此降级：
 *   - .blob → animation:none（光斑静止，底色保留）
 *   - .login-acrylic → 去 backdrop-filter，改高不透明度纯色
 * 偏好三态存 localStorage（auto|on|off），auto 跟随检测；设置面板以后可直接调用
 * setEffectsPreference("off") 实现手动开关。
 */
const KEY = "hmx.effects-pref";
export type EffectsPref = "auto" | "on" | "off";

function detectSoftwareRendering(): boolean {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL))
      : String(gl.getParameter(gl.RENDERER));
    return /swiftshader|software|basic render|warp|llvmpipe/i.test(renderer);
  } catch {
    return true;
  }
}

export function getEffectsPreference(): EffectsPref {
  const v = localStorage.getItem(KEY);
  return v === "on" || v === "off" ? v : "auto";
}

export function effectsActive(): boolean {
  return !document.documentElement.classList.contains("hmx-effects-off");
}

export function applyEffectsPreference(pref: EffectsPref = getEffectsPreference()): void {
  const off = pref === "off" || (pref === "auto" && detectSoftwareRendering());
  document.documentElement.classList.toggle("hmx-effects-off", off);
}

export function setEffectsPreference(pref: EffectsPref): void {
  if (pref === "auto") localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, pref);
  applyEffectsPreference(pref);
}
