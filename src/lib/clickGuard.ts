import type { Plugin } from "vue";

/**
 * 全局点击连击闸（capture 阶段 document 监听，不改任何按钮状态）：
 * 同一 button 在 GUARD_MS 内只放行第一击，后续 stopPropagation + preventDefault 直接吞掉。
 * 对应 WinForms 时代「点击即禁用、事件完毕恢复」的按钮保护——但这里刻意不翻 disabled 属性：
 * handler 常把 disabled 交给 :loading/Vue 补丁管理，闸如果也写 disabled，500ms 恢复时
 * 会把还在 loading 的按钮解套（fallback 变事故）；吞事件方案与组件状态零互踩。
 * 窗口 500ms 覆盖人类连击间隔（双击 80~150ms）与 Enter/Space 长按自动重复；
 * 连击之外的「响应完毕前不可再点」契约仍属页面层 :loading 约定，本闸只兜双击/三击。
 * 作用域 = 一切 <button>（PrimeVue Button 根节点、SpeedDial、原生按钮均命中），
 * 时间戳用 e.timeStamp——与 WeakMap 的键同生命周期比较，元素被替换后自动失效不残留。
 */
const GUARD_MS = 500;
const lastClickAt = new WeakMap<HTMLButtonElement, number>();

export const hmxClickGuardPlugin: Plugin = {
  install() {
    document.addEventListener(
      "click",
      (e) => {
        const btn = (e.target as Element | null)?.closest?.("button") as HTMLButtonElement | null;
        if (!btn || btn.disabled) return;
        const now = e.timeStamp;
        const prev = lastClickAt.get(btn);
        if (prev !== undefined && now - prev < GUARD_MS) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        lastClickAt.set(btn, now);
      },
      true,
    );
  },
};
