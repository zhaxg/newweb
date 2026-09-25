<script setup lang="ts">
import { ref } from "vue";
import { IconLoader } from "@tabler/icons-vue";
import { useFrameKeepAlive } from "@/composables/useFrameKeepAlive";

/**
 * 常驻 iframe 池：渲染在 MainLayout 内容区、RouterView 之外（不进 KeepAlive/Transition）。
 * 每个内嵌页一个 absolute 铺满的 iframe，v-if 按「页签开着」决定挂载、v-show 按「当前路由」决定显隐，
 * 所以切页签只是 display 切换、iframe 节点不动 → 不重载。挂在内容区(relative)内、RouterView 之后 →
 * 显示时盖在同路由的空占位页(IframePage)之上；非内嵌路由时本池全部 display:none，不拦交互。
 */
const { framePages, hasRenderFrame, showIframe } = useFrameKeepAlive();
const loaded = ref<Record<string, boolean>>({});
</script>

<template>
  <template v-for="frame in framePages" :key="frame.meta.pageId">
    <div
      v-if="hasRenderFrame(frame.meta.pageId)"
      v-show="showIframe(frame.meta.pageId)"
      class="absolute inset-0 bg-white dark:bg-[#282828]"
    >
      <iframe
        :src="frame.meta.url as string"
        :title="String(frame.meta.title ?? '')"
        class="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
        @load="loaded[frame.meta.pageId as string] = true"
      />
      <div
        v-if="!loaded[frame.meta.pageId as string]"
        class="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <IconLoader class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  </template>
</template>
