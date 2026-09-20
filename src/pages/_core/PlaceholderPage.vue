<script setup lang="ts">
import { IconCone } from "@tabler/icons-vue";

defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="flex h-full min-h-0 flex-col items-center justify-center gap-3 text-muted-foreground">
    <IconCone class="h-8 w-8" />
    <div class="text-sm font-medium text-foreground">{{ title }}</div>
    <div class="text-xs">页面建设中——可在 HMX 业务模块中复用本项目的表格与组件体系</div>
  </div>
</template>
