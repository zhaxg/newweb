<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ErpHeader from "./components/layout/ErpHeader.vue";
import ErpSidebar from "./components/layout/ErpSidebar.vue";
import ErpTabBar from "./components/layout/ErpTabBar.vue";
import SalesOrdersPage from "./pages/SalesOrdersPage.vue";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage.vue";
import HomePage from "./pages/HomePage.vue";
import SysDepartmentsPage from "./pages/SysDepartmentsPage.vue";
import SysUsersPage from "./pages/SysUsersPage.vue";
import SysRolesPage from "./pages/SysRolesPage.vue";
import SysMenusPage from "./pages/SysMenusPage.vue";
import SysKvPage from "./pages/SysKvPage.vue";
import SysAuditPage from "./pages/SysAuditPage.vue";
import PlaceholderPage from "./pages/PlaceholderPage.vue";
import { useTabs } from "./composables/useTabs";
import { useToast } from "./composables/useToast";
import { useSettingsStore } from "./stores/settingsStore";
import type { ErpMenuNode } from "./data/erpMenu";
import { LicenseManager } from "ag-grid-enterprise";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import SelectButton from "primevue/selectbutton";
import Select from "primevue/select";
import Toast from "primevue/toast";
import {
  chineseFontOptions,
  englishFontOptions,
  ensureFontLoaded,
  findFontOption,
  setupFontSettings,
  applyFontSettings,
  type FontOption,
} from "./lib/fontSettings";

LicenseManager.setLicenseKey("[v3][RELEASE][0102]_NDg2Njc4MzY3MDgzNw==16d78ca762fb5d2ff740aed081e2af7b");

const { tabs, activeId, openTab } = useTabs();
const { action: toastAction, toast, dismissToast } = useToast();
const { editorSettings, updateEditorSettings } = useSettingsStore();

const tabWidthOptions: { label: string; value: "fixed" | "content" }[] = [
  { label: "固定宽度", value: "fixed" },
  { label: "随标题内容", value: "content" },
];

const pageComponents: Record<string, unknown> = {
  home: HomePage,
  "sales-orders": SalesOrdersPage,
  "purchase-orders": PurchaseOrdersPage,
  "sys-departments": SysDepartmentsPage,
  "sys-users": SysUsersPage,
  "sys-roles": SysRolesPage,
  "sys-menus": SysMenusPage,
  "sys-kv": SysKvPage,
  "sys-audit": SysAuditPage,
};

const settingsOpen = ref(false);
const sidebarVisible = ref(true);

onMounted(setupFontSettings);

function onFontChange(kind: "zh" | "en", option: FontOption) {
  ensureFontLoaded(option);
  updateEditorSettings(kind === "zh" ? { fontChineseFamily: option.family } : { fontEnglishFamily: option.family });
  applyFontSettings();
}

const activePageComponent = computed(() => {
  const tab = tabs.value.find((t) => t.id === activeId.value);
  return tab ? (pageComponents[tab.page] ?? PlaceholderPage) : null;
});

const activePageTitle = computed(() => tabs.value.find((t) => t.id === activeId.value)?.title ?? "");

function openPage(node: ErpMenuNode) {
  if (!node.page) return;
  openTab({ id: `page-${node.page}`, title: node.label, page: node.page });
}

function logout() {
  toast("已退出（演示）", 1800);
}

function runToastAction() {
  const action = toastAction.value;
  dismissToast();
  action?.onClick();
}
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground antialiased">
    <ErpHeader @open-settings="settingsOpen = true" @logout="logout" @toggle-sidebar="sidebarVisible = !sidebarVisible"
      @open-page="openPage" />
    <div class="flex min-h-0 flex-1">
      <ErpSidebar v-if="sidebarVisible" :active-page-id="activeId ? activeId.replace('page-', '') : null"
        @open-page="openPage" />
      <main class="flex min-h-0 min-w-0 flex-1 flex-col">
        <ErpTabBar />
        <div class="min-h-0 flex-1 overflow-hidden bg-white p-[5px] dark:bg-[#282828]">
          <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-sm"
            :class="activeId === 'page-home' ? '' : 'bg-background'">
            <component v-if="activePageComponent" :is="activePageComponent" :key="activeId" :title="activePageTitle" />
            <div v-else class="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <div class="text-lg font-semibold text-foreground/80">欢迎使用 智能制造 ERP</div>
              <div class="text-sm">从左侧菜单选择功能模块开始工作</div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <Dialog :visible="settingsOpen" modal header="系统设置" :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
      @update:visible="settingsOpen = $event">
      <div class="space-y-3 text-sm text-muted-foreground">
        <p>· 主题：请通过右上角主题菜单切换浅色 / 深色 / 跟随系统</p>
        <div class="flex items-center justify-between gap-4">
          <span>· 标签宽度模式</span>
          <SelectButton :model-value="editorSettings.tabWidthMode" :options="tabWidthOptions" option-value="value"
            option-label="label" size="small"
            @update:model-value="updateEditorSettings({ tabWidthMode: $event })" />
        </div>
        <div class="flex items-center justify-between gap-4">
          <span>· 中文字体</span>
          <Select :model-value="findFontOption(chineseFontOptions, editorSettings.fontChineseFamily)"
            :options="chineseFontOptions" option-label="label" data-key="family" size="small" class="w-40"
            @update:model-value="onFontChange('zh', $event)" />
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

    <Toast position="bottom-center">
      <template #message="{ message }">
        <div class="flex items-center gap-3">
          <span class="min-w-0 break-words whitespace-pre-wrap text-sm">{{ message.summary }}</span>
          <Button v-if="toastAction" size="small" :label="toastAction.label" @click="runToastAction" />
        </div>
      </template>
    </Toast>
  </div>
</template>

<style>
html,
body {
  margin: 0;
  height: 100%;
  overflow: hidden;
}

#app {
  height: 100%;
}
</style>
