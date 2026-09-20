import { computed, ref } from "vue";

export interface ErpTab {
  id: string;
  title: string;
  page: string;
  icon?: string;
  dirty?: boolean;
  pinned?: boolean;
}

const tabs = ref<ErpTab[]>([{ id: "page-home", title: "首页", page: "home", pinned: true }]);
const activeId = ref<string | null>("page-home");

export function useTabs() {
  const activeTab = computed(() => tabs.value.find((tab) => tab.id === activeId.value) ?? null);

  function openTab(tab: Omit<ErpTab, "id"> & { id?: string }) {
    const existing = tab.id ? tabs.value.find((t) => t.id === tab.id) : undefined;
    if (existing) {
      activeId.value = existing.id;
      return existing;
    }
    const created: ErpTab = { ...tab, id: tab.id ?? `tab-${tab.page}-${Date.now()}` };
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

  return { tabs, activeId, activeTab, openTab, activate, close, closeOthers, closeAll, rename };
}
