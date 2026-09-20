<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IconLoader } from "@tabler/icons-vue";
import { useRoute } from "vue-router";

/* 内置 iframe 承载页：渲染注册路由时挂在 meta.url 的外嵌地址（builtinMenu iframe 叶子） */

const route = useRoute();
const url = computed(() => (route.meta.url as string) ?? "");
const loaded = ref(false);
watch(url, () => (loaded.value = false));
</script>

<template>
  <div class="relative h-full min-h-0 w-full bg-white dark:bg-[#282828]">
    <iframe v-if="url" :src="url" :title="String(route.meta.title ?? '')" class="h-full w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads" @load="loaded = true" />
    <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">未配置内嵌地址</div>
    <div v-if="url && !loaded" class="pointer-events-none absolute inset-0 flex items-center justify-center">
      <IconLoader class="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  </div>
</template>
