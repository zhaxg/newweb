<script setup lang="ts">
/**
 * 流光背景层：斜向渐变底色 + 三个缓慢漂移的模糊光斑（原 LoginPage 背景提出）。
 * 根元素 absolute inset-0，父容器负责定位与 overflow；装饰层整体 aria-hidden。
 * 换色系可在实例上覆盖 CSS 变量（--flow-bg / --flow-bg-dark / --flow-blob-a/b/c），
 * 例：<FlowBg style="--flow-blob-a: rgba(251,191,36,.8)" />。
 */
</script>

<template>
  <div class="flow-bg absolute inset-0 overflow-hidden" aria-hidden="true">
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>
  </div>
</template>

<style scoped>
/* 淡色底 + 柔和渐变；暗色皮肤下整体压暗（变量可被实例覆盖） */
.flow-bg {
  background: var(--flow-bg, linear-gradient(140deg, #eaf1fb 0%, #dde9f9 45%, #e9f0fd 100%));
}

.dark .flow-bg {
  background: var(--flow-bg-dark, linear-gradient(140deg, #0c1a30 0%, #101c33 45%, #0a1830 100%));
}

/* 缓慢漂移的流光光斑（CSS 特效） */
.blob {
  position: absolute;
  width: 44vmax;
  height: 44vmax;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.75;
  animation: blob-drift 26s ease-in-out infinite;
}

.dark .blob {
  opacity: 0.3;
}

.blob-a {
  left: -12vmax;
  top: -14vmax;
  background: radial-gradient(circle, var(--flow-blob-a, rgba(147, 197, 253, 0.9)), transparent 65%);
}

.blob-b {
  right: -14vmax;
  top: 8vmax;
  background: radial-gradient(circle, var(--flow-blob-b, rgba(196, 181, 253, 0.8)), transparent 65%);
  animation-delay: -9s;
}

.blob-c {
  left: 22vmax;
  bottom: -18vmax;
  background: radial-gradient(circle, var(--flow-blob-c, rgba(165, 243, 252, 0.75)), transparent 65%);
  animation-delay: -17s;
}

@keyframes blob-drift {
  0% {
    transform: translate(0, 0) scale(1);
  }

  33% {
    transform: translate(5%, -4%) scale(1.12);
  }

  66% {
    transform: translate(-4%, 5%) scale(0.94);
  }

  100% {
    transform: translate(0, 0) scale(1);
  }
}

/* 特效降级（光斑静止、底色保留）：① OS 减弱动态效果；② 软件渲染环境
   （lib/effectsPerf.ts 探测后在 <html> 打 hmx-effects-off 类，此处作祖先选择器） */
@media (prefers-reduced-motion: reduce) {
  .blob {
    animation: none;
  }
}

.hmx-effects-off .blob {
  animation: none;
}
</style>
