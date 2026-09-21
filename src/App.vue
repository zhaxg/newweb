<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView } from "vue-router";
import Toast from "primevue/toast";
import CheckUpdates from "./components/common/CheckUpdates.vue";
import { setupFontSettings } from "./lib/fontSettings";

onMounted(setupFontSettings);

// PrimeVue 4.5.5 的 Select.onEscapeKey 无条件 stopPropagation，焦点在 Select 上时 Escape 到不了 Dialog 的
// document 监听；在捕获阶段代理顶层对话框关闭钮。下拉正展开（aria-expanded=true）时交还组件自处理。
function onEscapeCapture(event: KeyboardEvent) {
  if (event.code !== "Escape" || event.isComposing) return;
  const target = event.target as HTMLElement | null;
  if (target?.getAttribute("aria-expanded") === "true") return;
  const mask = [...document.querySelectorAll(".p-dialog-mask")].filter((m) => m.querySelector(".p-dialog")).pop();
  mask?.querySelector<HTMLElement>(".p-dialog-close-button")?.click();
}
onMounted(() => document.addEventListener("keydown", onEscapeCapture, true));
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground antialiased">
    <RouterView v-slot="{ Component }">
      <!-- 不用 out-in：Vue 的 out-in 在 RouterView 插槽上会卡死（leave 完成后 enter 不渲染）；
           登录页是 fixed 覆盖层，交叉淡入淡出重叠期观感正确 -->
      <Transition name="screen">
        <component :is="Component" />
      </Transition>
    </RouterView>

    <Toast position="top-center" />

    <CheckUpdates :check-updates-interval-minutes="1" />
  </div>
</template>

<style>
html,
body {
  margin: 0;
  height: 100%;
  overflow: hidden;
}

#app {
  height: 100%;
}

/* 登录页 ↔ 壳层整屏切换（交叉淡入淡出）：旧屏淡出微收，新屏淡入微升 */
.screen-enter-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.25, 0.8, 0.5, 1);
}
.screen-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.screen-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.screen-leave-to {
  opacity: 0;
  transform: scale(0.985);
}
@media (prefers-reduced-motion: reduce) {
  .screen-enter-active,
  .screen-leave-active {
    transition: none;
  }
}
</style>
