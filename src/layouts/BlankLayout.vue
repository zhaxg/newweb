<script setup lang="ts">
import { RouterView } from "vue-router";

/** 全局空布局：无 Header/Sidebar/Tab，整屏承载子路由。
 *  路由 meta.layout = "blank" 时挂在本布局下（见 @/layouts/composables/layouts 注册表）。
 */
</script>

<template>
  <div class="relative h-screen w-screen overflow-hidden bg-background text-foreground">
    <RouterView v-slot="{ Component }">
      <component :is="Component" class="h-full w-full min-h-0" />
    </RouterView>
  </div>
</template>
