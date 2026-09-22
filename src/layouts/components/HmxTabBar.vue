<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  HmxChromeTabsElement,
  hmxChromeTabsEvents,
  type HmxChromeTabEventDetail,
  type HmxChromeTabReorderEventDetail,
} from "@/components/chromeTabs/hmxChromeTabs";
import { useTabs } from "@/composables/useTabs";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { tabPath } from "@/router/paths";

const tabsStore = useTabs();
const { tabs, activeId } = storeToRefs(tabsStore);
const { close, closeOthers } = tabsStore;
const router = useRouter();

/* tabs → router 单向：所有激活/切换都归结为 push 对应路由，实际 activeId 由 router.afterEach 的 openTab 落定。
   同一页重复 push 会被 vue-router 静默去重，不会产生额外历史。 */
function pushPath(pageId: string | null | undefined) {
  router.push(pageId ? tabPath(pageId) : "/");
}

function pageOf(id: string | null): string | null {
  return tabs.value.find((t) => t.id === id)?.page ?? null;
}

const tabsEl = ref<HmxChromeTabsElement | null>(null);

function sync() {
  const el = tabsEl.value;
  if (!el) return;
  el.tabs = tabs.value.map((t) => ({
    id: t.id,
    title: t.dirty ? `${t.title} *` : t.title,
    pinned: t.pinned,
  }));
  el.activeTabId = activeId.value ?? "";
}

function ensureActive() {
  if (!tabs.value.some((t) => t.id === activeId.value)) {
    activeId.value = tabs.value[tabs.value.length - 1]?.id ?? null;
  }
}

function closeLeft(id: string) {
  const prev = activeId.value;
  const idx = tabs.value.findIndex((t) => t.id === id);
  if (idx <= 0) return;
  tabs.value = tabs.value.filter((t, i) => i >= idx || t.pinned);
  ensureActive();
  if (activeId.value !== prev) pushPath(pageOf(activeId.value));
}

function closeRight(id: string) {
  const prev = activeId.value;
  const idx = tabs.value.findIndex((t) => t.id === id);
  if (idx === -1) return;
  tabs.value = tabs.value.filter((t, i) => i <= idx || t.pinned);
  ensureActive();
  if (activeId.value !== prev) pushPath(pageOf(activeId.value));
}

function reorder(detail: HmxChromeTabReorderEventDetail) {
  const from = tabs.value.findIndex((t) => t.id === detail.tabId);
  if (from === -1) return;
  const [moved] = tabs.value.splice(from, 1);
  const target = tabs.value.findIndex((t) => t.id === detail.targetTabId);
  if (target === -1) {
    tabs.value.push(moved);
  } else {
    tabs.value.splice(detail.position === "after" ? target + 1 : target, 0, moved);
  }
}

onMounted(() => {
  const el = tabsEl.value;
  if (!el) return;
  el.locale = "zh";
  el.widthMode = "content";
  el.addEventListener(hmxChromeTabsEvents.activate, (e: Event) =>
    pushPath(pageOf((e as CustomEvent<HmxChromeTabEventDetail>).detail.tabId)),
  );
  el.addEventListener(hmxChromeTabsEvents.close, (e: Event) => {
    const prev = activeId.value;
    close((e as CustomEvent<HmxChromeTabEventDetail>).detail.tabId);
    if (activeId.value !== prev) pushPath(pageOf(activeId.value));
  });
  el.addEventListener(hmxChromeTabsEvents.closeOthers, (e: Event) => {
    const id = (e as CustomEvent<HmxChromeTabEventDetail>).detail.tabId;
    closeOthers(id);
    pushPath(pageOf(id));
  });
  el.addEventListener(hmxChromeTabsEvents.closeLeft, (e: Event) =>
    closeLeft((e as CustomEvent<HmxChromeTabEventDetail>).detail.tabId),
  );
  el.addEventListener(hmxChromeTabsEvents.closeRight, (e: Event) =>
    closeRight((e as CustomEvent<HmxChromeTabEventDetail>).detail.tabId),
  );
  el.addEventListener(hmxChromeTabsEvents.reorder, (e: Event) =>
    reorder((e as CustomEvent<HmxChromeTabReorderEventDetail>).detail),
  );
  sync();
});

watch([tabs, activeId], sync, { deep: true });

/* 页签属导航 chrome，字号钉在辅助档 0.75rem（12px，同侧栏/控件），rem 随 --hmx-scale 缩放；
   字体族跟随全站 --font-sans（含用户中/英文字体设置，可穿透 shadow DOM） */
const tabsFont = "0.75rem var(--font-sans)";
</script>

<template>
  <div class="app-tab-bar relative flex w-full min-w-0 shrink-0 overflow-hidden">
    <hmx-chrome-tabs ref="tabsEl" :style="{ '--chrome-tabs-font': tabsFont }" />
  </div>
</template>

<style scoped>
.app-tab-bar {
  background: transparent;
  /* 形成独立堆叠上下文，隔离标签栏元素内部高达 1200 的 z-index，
     否则其会泄漏到根上下文并压过传送至 body 的下拉/对话框遮罩（z-50）。
     取 10：高于其后的表格内容（右键菜单/悬浮层是 fixed 定位，需浮在表格之上），仍低于 z-50 传送层 */
  z-index: 10;
}

hmx-chrome-tabs {
  display: block;
  width: 100%;
  /* 几何全部 rem：随 --hmx-scale 档位与字阶联动缩放（图标几何仍 px，属视觉常量） */
  --chrome-tabs-height: 2.25rem; /* 36px@16 */
  --chrome-tab-min-width: 2rem; /* 32px@16 */
  --chrome-tab-max-width: 9rem; /* 144px@16 = 8汉字96 + 内边距20 + 关闭钮16+5 + 富余 */
  --chrome-tab-radius: 0.3125rem;
  --chrome-tabs-background: #e5e7eb;
  --chrome-tab-text-color: #4b5563;
  --chrome-tab-active-text-color: #111827;
  --chrome-tab-hover-background: #d1d5db;
  --chrome-tab-active-background: #ffffff;
  --chrome-tab-divider-color: #d4d4d4;
  --chrome-tab-close-hover-background: #d1d5db;
  --chrome-tabs-accent-color: #111827;
  --chrome-tabs-menu-background: #ffffff;
  --chrome-tabs-menu-border-color: #9ca3af;
  --chrome-tabs-menu-hover-background: #f3f4f6;
  --chrome-tabs-menu-text-color: #111827;
  --chrome-tabs-menu-icon-color: #111827;
  --chrome-tabs-menu-icon-background: #e5e7eb;
}

/* 暗色模式：CSS 自定义属性可穿透 shadow DOM，直接覆盖组件的配色变量 */
.dark hmx-chrome-tabs {
  /* 激活标签 #282828 与内容区（App.vue dark:bg-[#282828]）融为一体；标签栏走侧栏色 */
  --chrome-tabs-background: var(--sidebar);
  --chrome-tab-text-color: var(--muted-foreground);
  --chrome-tab-active-text-color: var(--foreground);
  --chrome-tab-hover-background: color-mix(in srgb, var(--foreground) 10%, var(--sidebar));
  --chrome-tab-active-background: #282828;
  --chrome-tab-divider-color: var(--border);
  --chrome-tab-close-hover-background: color-mix(in srgb, var(--foreground) 18%, var(--sidebar));
  --chrome-tabs-accent-color: var(--foreground);
  --chrome-tabs-menu-background: var(--popover);
  --chrome-tabs-menu-border-color: var(--border);
  --chrome-tabs-menu-hover-background: var(--accent);
  --chrome-tabs-menu-text-color: var(--popover-foreground);
  --chrome-tabs-menu-icon-color: var(--popover-foreground);
  --chrome-tabs-menu-icon-background: var(--muted);
}

/* 关闭按钮保持默认指针样式（圆角等观感已内置于 hmxChromeTabs.css） */
hmx-chrome-tabs::part(close-button) {
  cursor: default !important;
}
</style>
