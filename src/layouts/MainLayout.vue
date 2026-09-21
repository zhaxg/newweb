<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, RouterView } from "vue-router";
import HmxHeader from "@/layouts/components/HmxHeader.vue";
import HmxSidebar from "@/layouts/components/HmxSidebar.vue";
import HmxTabBar from "@/layouts/components/HmxTabBar.vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Select from "primevue/select";
import type { HmxMenuNode } from "@/data/hmxMenu";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useTabsStore } from "@/stores/tabsStore";
import { resetUserRoutes } from "@/router";
import { tabPath } from "@/router/paths";
import { useToast } from "@/composables/useToast";
import { useSettingsStore } from "@/stores/settingsStore";
import {
  chineseFontOptions,
  englishFontOptions,
  ensureFontLoaded,
  findFontOption,
  applyFontSettings,
  type FontOption,
} from "@/lib/fontSettings";

/* 壳层：Header + Sidebar + 标签栏 + 页面区（RouterView 渲染权限内页面）。
   导航真源是 router：菜单点击 → push；router.afterEach → 开/激活 tab。 */

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const perm = usePermissionStore();
const tabs = useTabsStore();
const { toast } = useToast();
const { editorSettings, updateEditorSettings } = useSettingsStore();

const settingsOpen = ref(false);
const sidebarVisible = ref(true);

function onFontChange(kind: "zh" | "en", option: FontOption) {
  ensureFontLoaded(option);
  updateEditorSettings(kind === "zh" ? { fontChineseFamily: option.family } : { fontEnglishFamily: option.family });
  applyFontSettings();
}

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
        <div class="min-h-0 flex-1 overflow-hidden bg-white p-[5px] dark:bg-[#282828]">
          <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-sm"
            :class="route.name === 'home' ? '' : 'bg-background'">
            <RouterView v-slot="{ Component, route: r }">
              <Transition name="page" mode="out-in">
                <KeepAlive :max="25">
                  <component :is="Component" v-if="Component" :key="pageKey(r.meta.pageId, r.name)" :title="r.meta.title" />
                </KeepAlive>
              </Transition>
            </RouterView>
          </div>
        </div>
      </main>
    </div>

    <Dialog :visible="settingsOpen" modal header="系统设置" :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
      @update:visible="settingsOpen = $event">
      <div class="space-y-3 text-sm text-muted-foreground">
        <p>· 主题：请通过右上角主题按钮切换浅色 / 深色</p>
        <div class="flex items-center justify-between gap-4">
          <span>· 中文字体</span>
          <!-- Select 丢弃 $attrs,autofocus 须走 pt 挂到 focusInput(span),供 Dialog 的 [autofocus] 查询命中 -->
          <Select :model-value="findFontOption(chineseFontOptions, editorSettings.fontChineseFamily)"
            :options="chineseFontOptions" option-label="label" data-key="family" size="small" class="w-40"
            :pt="{ label: { autofocus: true } }" @update:model-value="onFontChange('zh', $event)" />
        </div>
        <div class="flex items-center justify-between gap-4">
          <span>· 英文字体</span>
          <Select :model-value="findFontOption(englishFontOptions, editorSettings.fontEnglishFamily)"
            :options="englishFontOptions" option-label="label" data-key="family" size="small" class="w-40"
            @update:model-value="onFontChange('en', $event)" />
        </div>
      </div>
      <template #footer>
        <Button label="关闭" size="small" raised @click="settingsOpen = false" />
      </template>
    </Dialog>
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
