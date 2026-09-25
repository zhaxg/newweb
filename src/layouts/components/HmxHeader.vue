<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import {
  IconBook,
  IconChevronDown,
  IconDots,
  IconEraser,
  IconKey,
  IconLogout,
  IconMaximize,
  IconMinimize,
  IconSettings,
  IconUserCircle,
} from "@tabler/icons-vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Menu from "primevue/menu";
import TieredMenu from "primevue/tieredmenu";
import type { MenuItem } from "primevue/menuitem";
import { TABLER_FALLBACK_ICON, tablerIcon } from "@/lib/tablerIcons";
import ThemeToggle from "@/components/common/ThemeToggle.vue";
import ModifyPasswd from "@/pages/_core/profile/ModifyPasswd.vue";
import { useAppTheme } from "@/composables/useAppTheme";
import type { HmxMenuNode } from "@/layouts/composables/menuFromRoutes";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { menuTree } from "@/layouts/composables/menuFromRoutes";
import { useToast } from "@/composables/useToast";
import { useRoute } from "vue-router";
import { computed } from "vue";

const { isDark, setMode } = useAppTheme();
const auth = useAuthStore();
const permission = usePermissionStore();
const route = useRoute();
const { toast } = useToast();

const emit = defineEmits<{
  openSettings: [];
  logout: [];
  toggleSidebar: [];
  openPage: [node: HmxMenuNode];
}>();

/** 标题点击回首页：走父级 openPage 统一导航通道（page=home → "/home"） */
const HOME_NODE: HmxMenuNode = { id: "home", label: "首页", page: "home" };

const userMenu = ref<InstanceType<typeof Menu> | null>(null);

/** ThemeToggle 二态切换：暗 ⇄ 亮 */
function toggleTheme() {
  setMode(isDark.value ? "light" : "dark");
}

/* 用户下拉：帮助文档（新标签） | 修改密码 | 清除缓存 | 退出（图标走 #itemicon 插槽） */
const modifyPasswdRef = ref<InstanceType<typeof ModifyPasswd> | null>(null);
const logoutConfirmOpen = ref(false);
const clearCacheOpen = ref(false);
const userItems: MenuItem[] = [
  { label: "帮助文档", command: openHelp },
  { label: "修改密码", command: () => modifyPasswdRef.value?.openModal() },
  { separator: true },
  { label: "清除缓存", command: () => (clearCacheOpen.value = true) },
  { label: "退出", command: () => (logoutConfirmOpen.value = true) },
];
const userIcons: Record<string, unknown> = {
  帮助文档: IconBook,
  修改密码: IconKey,
  清除缓存: IconEraser,
  退出: IconLogout,
};

/* 帮助文档：新标签打开 VITE_HELP_URL，带当前页资源行的 id/code 供文档站定位本页。
   pageId → 资源行 的映射复用按钮权限那份（推导规则只在 menuRescTree 有，别处不重算）；
   首页等静态路由没有资源行，只开基址。 */
function openHelp() {
  const base = String(import.meta.env.VITE_HELP_URL ?? "").trim();
  if (!base) {
    toast("未配置帮助文档地址（VITE_HELP_URL）", 2000, "warn");
    return;
  }
  const rescId = permission.pageIdToRescId.get(String(route.meta.pageId ?? ""));
  const row = rescId ? permission.resources.find((r) => r.id === rescId) : undefined;
  let href = base;
  try {
    if (row) {
      const url = new URL(base);
      url.searchParams.set("pageid", row.id ?? "");
      url.searchParams.set("code", row.cCode ?? "");
      href = url.toString();
    }
  } catch {
    /* 基址非合法 URL（如相对路径），退回原样打开 */
  }
  window.open(href, "_blank", "noopener");
}

/* 清空 localStorage 后整页刷新：刷新即以空存储重建各 store 默认值并回落登录页，
   不留在「存储已空、内存还在」的半清理状态 */
function clearLocalCache() {
  localStorage.clear();
  window.location.reload();
}

/* 侧栏树同款数据 → TieredMenu 模型（叶子点击 = 开页） */
function toMenuItems(nodes: HmxMenuNode[]): MenuItem[] {
  return nodes.map((n) => ({
    label: n.label,
    data: n,
    items: n.children?.length ? toMenuItems(n.children) : undefined,
    command: n.page || n.url ? () => emit("openPage", n) : undefined,
  }));
}
const navMenuRef = ref<InstanceType<typeof TieredMenu> | null>(null);
const navMenuItems = computed(() => toMenuItems(menuTree.value));
/* TieredMenu 默认首次须点击分组项才允许 hover 展开子菜单（内部 dirty 门控）；
   弹出即置 dirty，实现"展开后鼠标滑动自动展开子菜单" */
function onNavShow() {
  const menu = navMenuRef.value as unknown as { dirty?: boolean } | null;
  if (menu) menu.dirty = true;
}
function navIcon(item: MenuItem) {
  const name = (item.data as HmxMenuNode | undefined)?.icon;
  return tablerIcon(name) ?? TABLER_FALLBACK_ICON;
}

/* 全屏切换（Fullscreen API）：状态以 fullscreenchange 为准——
   覆盖 Esc / 系统退出等非本钮触发的离开，图标与 title 跟随真实状态 */
const isFullscreen = ref(false);
function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}
async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {
    /* 浏览器拒绝（策略/非用户手势）已无统一 toast 通道，静默即可 */
  }
}
onMounted(() => document.addEventListener("fullscreenchange", onFullscreenChange));
onBeforeUnmount(() => document.removeEventListener("fullscreenchange", onFullscreenChange));
</script>

<template>
  <header class="flex h-12 shrink-0 items-center justify-between border-b border-border bg-[#F4F4F4] px-3 dark:bg-card">
    <div class="flex min-w-0 items-center gap-2.5">
      <!-- logo：点击切换侧栏收起/展开（与侧栏钮同行为） -->
      <div
        class="flex h-7 w-7 shrink-0 cursor-pointer select-none items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-sm"
        title="收起/展开侧栏"
        @click="emit('toggleSidebar')"
      >
        H
      </div>
      <!-- 标题：点击回首页（走父级 openPage 统一导航通道） -->
      <div class="min-w-0 cursor-pointer select-none" title="返回首页" @click="emit('openPage', HOME_NODE)">
        <div class="truncate text-sm font-semibold leading-tight text-foreground">HiMind工业互联网平台</div>
      </div>
      <div class="ml-5 flex shrink-0 items-center">
        <Button text icon-only title="功能菜单" @click="navMenuRef?.toggle($event)">
          <IconDots class="h-4 w-4" />
        </Button>
        <TieredMenu ref="navMenuRef" :model="navMenuItems" popup class="hmx-nav-menu" @show="onNavShow">
          <template #itemicon="{ item }">
            <component :is="navIcon(item)" class="h-3.5 w-3.5 text-muted-foreground" />
          </template>
        </TieredMenu>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <!-- 与 ThemeToggle 同款圆形图标钮，保持右侧视觉统一 -->
      <button
        type="button"
        :title="isFullscreen ? '退出全屏' : '全屏'"
        class="inline-flex size-8 items-center justify-center rounded-full text-base text-current transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/20 dark:active:bg-white/30"
        @click="toggleFullscreen"
      >
        <IconMinimize v-if="isFullscreen" class="size-[1em]" />
        <IconMaximize v-else class="size-[1em]" />
      </button>
      <button
        type="button"
        title="系统设置"
        class="inline-flex size-8 items-center justify-center rounded-full text-base text-current transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/20 dark:active:bg-white/30"
        @click="emit('openSettings')"
      >
        <IconSettings class="size-[1em]" />
      </button>
      <ThemeToggle :is-dark="isDark" size="sm" :duration="600" title="主题切换" @toggle="toggleTheme" />
      <Button severity="secondary" variant="outlined" rounded class="gap-1.5" @click="userMenu?.toggle($event)">
        <span class="flex items-center gap-1.5">
          <IconUserCircle stroke="{1.5}" class="text-primary" />
          <span class="hidden text-xs text-foreground sm:inline">{{ auth.session?.userName ?? "" }}</span>
          <IconChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </Button>
      <Menu ref="userMenu" :model="userItems" popup class="w-40">
        <template #itemicon="{ item }">
          <component :is="userIcons[item.label as string]" class="h-3.5 w-3.5 text-muted-foreground" />
        </template>
      </Menu>
      <ModifyPasswd ref="modifyPasswdRef" />
    </div>

    <!-- 清除缓存确认：文案先讲清范围（含登录态与个性化数据）再讲后果（刷新重登、不可恢复） -->
    <Dialog
      :visible="clearCacheOpen"
      modal
      header="清除缓存"
      autofocus
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="clearCacheOpen = $event"
    >
      <p class="text-xs leading-relaxed">
        将清空本浏览器保存的全部本地数据：登录状态、界面偏好（主题 / 字体 /
        侧栏宽度）以及库位图、打印模板等本地留存数据。
      </p>
      <p class="text-xs leading-relaxed">清除后页面自动刷新并需要重新登录，且数据无法恢复。是否继续？</p>
      <template #footer>
        <Button label="取消" severity="text" @click="clearCacheOpen = false" />
        <Button label="清除缓存" severity="danger" autofocus @click="clearLocalCache" />
      </template>
    </Dialog>

    <!-- 退出确认（拦截误点）；autofocus 标记 → Dialog 动画结束后焦点落在"退出"按钮 -->
    <Dialog
      :visible="logoutConfirmOpen"
      modal
      header="退出确认"
      autofocus
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="logoutConfirmOpen = $event"
    >
      <p class="text-xs">是否确定退出系统？</p>
      <template #footer>
        <Button label="取消" severity="text" @click="logoutConfirmOpen = false" />
        <Button
          label="退出"
          severity="danger"
          autofocus
          @click="
            logoutConfirmOpen = false;
            emit('logout');
          "
        />
      </template>
    </Dialog>
  </header>
</template>
