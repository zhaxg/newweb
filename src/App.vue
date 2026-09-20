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
import LoginPage from "./pages/LoginPage.vue";
import { useTabs } from "./composables/useTabs";
import { useToast } from "./composables/useToast";
import { useSettingsStore } from "./stores/settingsStore";
import { useAuthStore } from "./stores/authStore";
import type { ErpMenuNode } from "./data/erpMenu";
import { LicenseManager } from "ag-grid-enterprise";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
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
const auth = useAuthStore();

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

// PrimeVue 4.5.5 的 Select.onEscapeKey 无条件 stopPropagation，焦点在 Select 上时 Escape 到不了 Dialog 的
// document 监听；在捕获阶段代理顶层对话框关闭钮。下拉正展开（aria-expanded=true）时交还组件自处理。
function onEscapeCapture(event: KeyboardEvent) {
  if (event.code !== "Escape" || event.isComposing) return;
  const target = event.target as HTMLElement | null;
  if (target?.getAttribute("aria-expanded") === "true") return;
  const mask = [...document.querySelectorAll(".p-dialog-mask")].filter((m) => m.querySelector(".p-dialog")).pop();
  mask?.querySelector<HTMLElement>(".p-dialog-close-button")?.click();
}
onMounted(() => document.addEventListener("keydown", onEscapeCapture, true));

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
  auth.logout();
  toast("已退出登录", 1800);
}

function runToastAction() {
  const action = toastAction.value;
  dismissToast();
  action?.onClick();
}
</script>

<template>
  <div class="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground antialiased">
    <LoginPage v-if="!auth.session" />
    <template v-else>
      <ErpHeader @open-settings="settingsOpen = true" @logout="logout"
        @toggle-sidebar="sidebarVisible = !sidebarVisible" @open-page="openPage" />
      <div class="flex min-h-0 flex-1">
        <ErpSidebar v-if="sidebarVisible" :active-page-id="activeId ? activeId.replace('page-', '') : null"
          @open-page="openPage" />
        <main class="flex min-h-0 min-w-0 flex-1 flex-col">
          <ErpTabBar />
          <div class="min-h-0 flex-1 overflow-hidden bg-white p-[5px] dark:bg-[#282828]">
            <div class="flex h-full min-h-0 flex-col overflow-hidden rounded-sm"
              :class="activeId === 'page-home' ? '' : 'bg-background'">
              <component v-if="activePageComponent" :is="activePageComponent" :key="activeId"
                :title="activePageTitle" />
              <div v-else class="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <div class="text-lg font-semibold text-foreground/80">欢迎使用 智能制造 ERP</div>
                <div class="text-sm">从左侧菜单选择功能模块开始工作</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </template>

    <Dialog :visible="settingsOpen" modal header="系统设置" :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
      @update:visible="settingsOpen = $event">
      <div class="space-y-3 text-sm text-muted-foreground">
        <p>· 主题：请通过右上角主题菜单切换浅色 / 深色 / 跟随系统</p>
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
