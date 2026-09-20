/**
 * 多标签页状态（原 composables/useTabs 的 Pinia 化，API 不变）。
 * 约定：tab id = `page-<pageId>`；首页 tab 固定 pin。本 store 不 import router（防环）。
 */
import { computed, ref } from "vue";
import { defineStore } from "pinia";

export interface HmxTab {
  id: string;
  title: string;
  page: string;
  icon?: string;
  dirty?: boolean;
  pinned?: boolean;
}

export const useTabsStore = defineStore("tabs", () => {
  const tabs = ref<HmxTab[]>([{ id: "page-home", title: "首页", page: "home", pinned: true }]);
  const activeId = ref<string | null>("page-home");

  const activeTab = computed(() => tabs.value.find((tab) => tab.id === activeId.value) ?? null);

  function openTab(tab: Omit<HmxTab, "id"> & { id?: string }) {
    const existing = tab.id ? tabs.value.find((t) => t.id === tab.id) : undefined;
    if (existing) {
      activeId.value = existing.id;
      return existing;
    }
    const created: HmxTab = { ...tab, id: tab.id ?? `tab-${tab.page}-${Date.now()}` };
    tabs.value.push(created);
    activeId.value = created.id;
    return created;
  }

  function activate(id: string) {
    activeId.value = id;
  }

  function close(id: string) {
    const index = tabs.value.findIndex((tab) => tab.id === id);
    if (index === -1) return;
    if (tabs.value[index].pinned) return;
    tabs.value.splice(index, 1);
    if (activeId.value === id) {
      const next = tabs.value[index] ?? tabs.value[index - 1] ?? null;
      activeId.value = next?.id ?? null;
    }
  }

  function closeOthers(id: string) {
    tabs.value = tabs.value.filter((tab) => tab.id === id || tab.pinned);
    activeId.value = id;
  }

  function closeAll() {
    tabs.value = tabs.value.filter((tab) => tab.pinned);
    activeId.value = tabs.value[0]?.id ?? null;
  }

  function rename(id: string, title: string) {
    const tab = tabs.value.find((t) => t.id === id);
    if (tab && title.trim()) tab.title = title.trim();
  }

  /** 重置到登录前状态（登出时调用） */
  function reset() {
    tabs.value = [{ id: "page-home", title: "首页", page: "home", pinned: true }];
    activeId.value = "page-home";
  }

  return { tabs, activeId, activeTab, openTab, activate, close, closeOthers, closeAll, rename, reset };
});
