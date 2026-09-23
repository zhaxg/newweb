<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, RouterView } from "vue-router";
import HmxHeader from "@/layouts/components/HmxHeader.vue";
import HmxSidebar from "@/layouts/components/HmxSidebar.vue";
import HmxTabBar from "@/layouts/components/HmxTabBar.vue";
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
import SettingsDialog from "@/layouts/components/SettingsDialog.vue";
import type { HmxMenuNode } from "@/api/common/menuApi";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useTabsStore } from "@/stores/tabsStore";
import { resetUserRoutes } from "@/router";
import { tabPath } from "@/router/paths";
import { useToast } from "@/composables/useToast";

/* 壳层：Header + Sidebar + 标签栏 + 页面区（RouterView 渲染权限内页面）。
   导航真源是 router：菜单点击 → push；router.afterEach → 开/激活 tab。 */

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const perm = usePermissionStore();
const tabs = useTabsStore();
const { toast } = useToast();

const settingsOpen = ref(false);
const sidebarVisible = ref(true);

function openPage(node: HmxMenuNode) {
  if (node.url) {
    window.open(node.url, "_blank", "noopener");
    return;
  }
  if (!node.page) return;
  router.push(tabPath(node.page));
}

function logout() {
  auth.logout();
  perm.reset();
  resetUserRoutes();
  tabs.reset();
  router.replace("/login");
  toast("已退出登录", 1800);
}

/* 页签状态缓存（KeepAlive）：切页签不丢页面态；关闭页签 → 该页代号世代 +1 →
   缓存键失效，重开 = 全新挂载。:max 兜底淘汰极端累积（LRU）。 */
const pageGen = ref<Record<string, number>>({});

const openPages = computed(() => new Set(tabs.tabs.map((t) => t.page)));

watch(openPages, (now, prev) => {
  if (!prev) return;
  for (const page of prev) if (!now.has(page)) pageGen.value[page] = (pageGen.value[page] ?? 0) + 1;
});

function pageKey(pageId: string | undefined, routeName: unknown): string {
  const pid = pageId ?? String(routeName);
  return `${pid}#${pageGen.value[pid] ?? 0}`;
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <HmxHeader @open-settings="settingsOpen = true" @logout="logout" @toggle-sidebar="sidebarVisible = !sidebarVisible"
      @open-page="openPage" />
    <div class="flex min-h-0 flex-1">
      <HmxSidebar v-if="sidebarVisible" :active-page-id="route.meta.pageId ?? null" @open-page="openPage" />
      <main class="flex min-h-0 min-w-0 flex-1 flex-col">
        <HmxTabBar />
        <div class="min-h-0 flex-1 overflow-hidden p-1.25 dark:bg-[#282828]">
          <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-sm"
            :class="route.name === 'home' ? '' : 'bg-background'">
            <RouterView v-slot="{ Component, route: r }">
              <Transition name="page" mode="out-in">
                <KeepAlive :max="25">
                  <ErrorBoundary v-if="Component" :key="pageKey(r.meta.pageId, r.name)">
                    <component :is="Component" :key="pageKey(r.meta.pageId, r.name)" :title="r.meta.title" />
                  </ErrorBoundary>
                </KeepAlive>
              </Transition>
            </RouterView>
          </div>
        </div>
      </main>
    </div>

    <!-- 系统设置（独立组件：主题色/字体大小/中英文字体，逻辑见 SettingsDialog.vue） -->
    <SettingsDialog v-model:visible="settingsOpen" />
  </div>
</template>

<style scoped>
/* 页面切换动画：out-in 快速淡出 + 淡入微升，总时长 ~280ms，观感不拖沓 */
.page-enter-active {
  transition: opacity 0.18s ease, transform 0.18s cubic-bezier(0.25, 0.8, 0.5, 1);
}

.page-leave-active {
  transition: opacity 0.1s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {

  .page-enter-active,
  .page-leave-active {
    transition: none;
  }
}
</style>
