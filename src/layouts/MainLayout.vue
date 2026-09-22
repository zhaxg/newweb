<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter, RouterView } from "vue-router";
import HmxHeader from "@/layouts/components/HmxHeader.vue";
import HmxSidebar from "@/layouts/components/HmxSidebar.vue";
import HmxTabBar from "@/layouts/components/HmxTabBar.vue";
import ErrorBoundary from "@/components/common/ErrorBoundary.vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Select from "primevue/select";
import type { HmxMenuNode } from "@/api/common/menuApi";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useTabsStore } from "@/stores/tabsStore";
import { resetUserRoutes } from "@/router";
import { tabPath } from "@/router/paths";
import { useToast } from "@/composables/useToast";
import { useSettingsStore, type FontScale } from "@/stores/settingsStore";
import { primaryOptions } from "@/lib/themeSettings";
import { IconPlus } from "@tabler/icons-vue";
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

/* 字体大小档位：写 editorSettings.fontScale → settingsStore watch 更新 --hmx-scale，即时生效并持久化 */
const fontScaleOptions: { label: string; value: FontScale }[] = [
  { label: "标准", value: "standard" },
  { label: "大字体", value: "large" },
  { label: "更大字体", value: "xlarge" },
];

function onFontChange(kind: "zh" | "en", option: FontOption) {
  ensureFontLoaded(option);
  updateEditorSettings(kind === "zh" ? { fontChineseFamily: option.family } : { fontEnglishFamily: option.family });
  applyFontSettings();
}

/* 分段单选项类族（主题色/字体大小共用；SFC scoped 样式里 @apply 不可用，见 Tailwind v4 @reference 限制）。
   inactive 串自带 text-xs，满足字段族辅助档声明 */
const SEG_BASE = "relative flex items-center gap-1.5 px-3 py-1 transition-colors";
const SEG_ACTIVE = `${SEG_BASE} bg-primary font-medium text-primary-foreground`;
const SEG_INACTIVE = `${SEG_BASE} bg-background text-xs text-muted-foreground hover:bg-accent hover:text-foreground`;

/* 主题色：写 editorSettings.primaryColor → settingsStore watch 覆盖 --p-primary-*，即时生效并持久化。
   自定义取色器只在选到非预设色时占用该值，点回预设即恢复 */
function onCustomColor(e: Event) {
  const hex = (e.target as HTMLInputElement).value;
  if (/^#[0-9a-f]{6}$/i.test(hex)) updateEditorSettings({ primaryColor: hex });
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

    <Dialog :visible="settingsOpen" modal header="系统设置" :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
      @update:visible="settingsOpen = $event">
      <div class="space-y-3 text-xs text-muted-foreground">
        <div class="flex items-center justify-between gap-4">
          <span>· 主题色</span>
          <div class="inline-flex overflow-hidden rounded-md border border-border" role="radiogroup" aria-label="主题色">
            <button v-for="opt in primaryOptions" :key="opt.id" type="button" role="radio"
              :aria-checked="editorSettings.primaryColor === opt.id"
              :class="editorSettings.primaryColor === opt.id ? SEG_ACTIVE : SEG_INACTIVE"
              @click="updateEditorSettings({ primaryColor: opt.id })">
              <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: opt.base }" />{{ opt.label }}
            </button>
            <label class="text-xs"
              :class="[/^#[0-9a-f]{6}$/i.test(editorSettings.primaryColor) ? SEG_ACTIVE : SEG_INACTIVE, 'cursor-pointer']"
              title="任意颜色">
              <span v-if="/^#[0-9a-f]{6}$/i.test(editorSettings.primaryColor)" class="size-2 shrink-0 rounded-full"
                :style="{ backgroundColor: editorSettings.primaryColor }" />
              <IconPlus v-else class="size-3 shrink-0" />自定义
              <input type="color" class="absolute inset-0 cursor-pointer opacity-0"
                :value="/^#[0-9a-f]{6}$/i.test(editorSettings.primaryColor) ? editorSettings.primaryColor : '#0052d9'"
                @input="onCustomColor" />
            </label>
          </div>
        </div>
        <div class="flex items-center justify-between gap-4">
          <span>· 字体大小</span>
          <!-- 分段单选（radio 式）：档位少且互斥，比下拉少一次展开 -->
          <div class="inline-flex overflow-hidden rounded-md border border-border" role="radiogroup" aria-label="字体大小">
            <button v-for="o in fontScaleOptions" :key="o.value" type="button" role="radio"
              :aria-checked="editorSettings.fontScale === o.value"
              :class="editorSettings.fontScale === o.value ? SEG_ACTIVE : SEG_INACTIVE"
              @click="updateEditorSettings({ fontScale: o.value })">{{ o.label }}</button>
          </div>
        </div>
        <div class="flex items-center justify-between gap-4">
          <span>· 中文字体</span>
          <!-- Select 丢弃 $attrs,autofocus 须走 pt 挂到 focusInput(span),供 Dialog 的 [autofocus] 查询命中 -->
          <Select :model-value="findFontOption(chineseFontOptions, editorSettings.fontChineseFamily)"
            :options="chineseFontOptions" option-label="label" data-key="family" class="w-40"
            :pt="{ label: { autofocus: true } }" @update:model-value="onFontChange('zh', $event)" />
        </div>
        <div class="flex items-center justify-between gap-4">
          <span>· 英文字体</span>
          <Select :model-value="findFontOption(englishFontOptions, editorSettings.fontEnglishFamily)"
            :options="englishFontOptions" option-label="label" data-key="family" class="w-40"
            @update:model-value="onFontChange('en', $event)" />
        </div>
      </div>
      <template #footer>
        <Button label="关闭" raised @click="settingsOpen = false" />
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
