<template>
  <button
    ref="btnRef"
    type="button"
    class="relative inline-flex items-center justify-center overflow-hidden rounded-full text-current transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/20 dark:active:bg-white/30"
    :class="sizeClass"
    @click="toggleTheme"
  >
    <IconMoon v-if="isDark" class="size-[1em]" />
    <IconSun v-else class="size-[1em]" />
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { IconMoon, IconSun } from "@tabler/icons-vue";

/* 主题切换钮（移植自 hmx_web ThemeToggle.vue）：
   原版 icon-[line-md--...] 动效图标换为 Tabler Sun/Moon 静态图标；
   View Transition 圆形展开/收缩动画与对外 API（isDark + @toggle 由父级翻转）保持不变。 */

const props = withDefaults(
  defineProps<{
    isDark?: boolean;
    duration?: number;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    isDark: false,
    duration: 400,
    size: "md",
  },
);

const emit = defineEmits<{
  toggle: [];
}>();

const btnRef = ref<HTMLButtonElement>();

const sizeClass = computed(
  () =>
    ({
      sm: "size-8 text-base",
      md: "size-10 text-xl", // audit-allow 非排版：字号仅作图标尺寸驱动（icon size-[1em]）
      lg: "size-12 text-2xl", // audit-allow 同上
    })[props.size],
);

function toggleTheme() {
  const btn = btnRef.value;
  if (!btn) {
    emit("toggle");
    return;
  }

  const canUseVT =
    typeof document.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canUseVT) {
    emit("toggle");
    return;
  }

  // 使用按钮元素的中心坐标
  const rect = btn.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const endRadius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const root = document.documentElement;
  // 百分比坐标：页面缩放≠100% 时 ::view-transition 伪元素的坐标空间与 CSS px 不一致（圆心偏移），
  // % 相对伪元素自身框解析，缩放免疫；circle() 半径 % 基准 = hypot(w,h)/√2
  root.style.setProperty("--vt-x", `${((x / innerWidth) * 100).toFixed(4)}%`);
  root.style.setProperty("--vt-y", `${((y / innerHeight) * 100).toFixed(4)}%`);
  root.style.setProperty(
    "--vt-r",
    `${((endRadius / Math.hypot(innerWidth, innerHeight)) * Math.SQRT2 * 100).toFixed(4)}%`,
  );
  root.style.setProperty("--vt-duration", `${props.duration}ms`);

  document.startViewTransition(() => {
    emit("toggle");
  });
}
</script>

<style>
/* View Transition 圆形展开/收缩动画 */
::view-transition-new(root),
::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}
::view-transition-old(root) {
  z-index: 1;
}
::view-transition-new(root) {
  z-index: 2147483646;
  animation: vt-expand var(--vt-duration, 0.4s) ease-in;
}
html.dark::view-transition-old(root) {
  z-index: 2147483646 !important;
  animation: vt-shrink var(--vt-duration, 0.4s) ease-in forwards !important;
}
html.dark::view-transition-new(root) {
  z-index: 1;
  animation: none !important;
}

@keyframes vt-expand {
  from {
    clip-path: circle(0px at var(--vt-x, 50%) var(--vt-y, 50%));
  }
  to {
    clip-path: circle(var(--vt-r, 150%) at var(--vt-x, 50%) var(--vt-y, 50%));
  }
}
@keyframes vt-shrink {
  from {
    clip-path: circle(var(--vt-r, 150%) at var(--vt-x, 50%) var(--vt-y, 50%));
  }
  to {
    clip-path: circle(0px at var(--vt-x, 50%) var(--vt-y, 50%));
  }
}
</style>
