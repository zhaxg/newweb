<script setup lang="ts">
import worldUrl from "@/assets/world.svg";

defineProps<{ title?: string }>();
</script>

<template>
  <div class="flex min-h-0 flex-1 items-center justify-center overflow-auto">
    <!-- 单色点阵世界地图：SVG 经 mask 上色，明暗模式各用一档灰 -->
    <div class="home-world" :style="{ maskImage: `url(${worldUrl})`, WebkitMaskImage: `url(${worldUrl})` }" />
  </div>
</template>

<style scoped>
.home-world {
  width: 480px;
  max-width: 100%;
  aspect-ratio: 1974 / 928;
  background-color: #a5a6aa;
  opacity: 0.3;
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-position: center;
  -webkit-mask-size: contain;
  user-select: none;
}

.dark .home-world {
  background-color: #d1d5db;
}
</style>
