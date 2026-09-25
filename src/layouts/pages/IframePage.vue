<script setup lang="ts">
/* iframe 外链路由的占位组件：实际 iframe 由布局层的常驻池 HmxIframeHost 渲染（避开 KeepAlive 反挂载导致的重载）。
   本组件只作路由 component、撑住内容区尺寸，视觉内容由其上方的池承载。地址挂路由 meta.url。 */
</script>

<template>
  <div class="h-full w-full" />
</template>
