<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { IconBook, IconChevronDown, IconDots, IconKey, IconLogout, IconMaximize, IconMinimize, IconSettings } from "@tabler/icons-vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Menu from "primevue/menu";
import TieredMenu from "primevue/tieredmenu";
import type { MenuItem } from "primevue/menuitem";
import User from "@primeicons/vue/user";
import { TABLER_FALLBACK_ICON, tablerIcon } from "@/lib/tablerIcons";
import ThemeToggle from "@/components/common/ThemeToggle.vue";
import ModifyPasswd from "@/pages/_core/profile/ModifyPasswd.vue";
import { useAppTheme } from "@/composables/useAppTheme";
import type { HmxMenuNode } from "@/api/common/menuApi";
import { useAuthStore } from "@/stores/authStore";
import { usePermissionStore } from "@/stores/permissionStore";
import { useToast } from "@/composables/useToast";
import { computed } from "vue";

const { isDark, setMode } = useAppTheme();
const auth = useAuthStore();
const perm = usePermissionStore();
const { toast } = useToast();

const emit = defineEmits<{
  openSettings: [];
  logout: [];
  toggleSidebar: [];
  openPage: [node: HmxMenuNode];
}>();

/** 标题点击回首页：走父级 openPage 统一导航通道（page=home → "/"） */
const HOME_NODE: HmxMenuNode = { id: "home", label: "首页", page: "home" };

const userMenu = ref<InstanceType<typeof Menu> | null>(null);

/** ThemeToggle 二态切换：暗 ⇄ 亮 */
function toggleTheme() {
  setMode(isDark.value ? "light" : "dark");
}

/* 用户下拉：帮助文档 | 修改密码 | 退出（图标走 #itemicon 插槽） */
const modifyPasswdRef = ref<InstanceType<typeof ModifyPasswd> | null>(null);
const logoutConfirmOpen = ref(false);
const userItems: MenuItem[] = [
  { label: "帮助文档", command: () => toast("帮助文档建设中", 1800) },
  { label: "修改密码", command: () => modifyPasswdRef.value?.openModal() },
  { separator: true },
  { label: "退出", command: () => (logoutConfirmOpen.value = true) },
];
const userIcons: Record<string, unknown> = { 帮助文档: IconBook, 修改密码: IconKey, 退出: IconLogout };

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
const navMenuItems = computed(() => toMenuItems(perm.menuTree));
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
      <div class="flex h-7 w-7 shrink-0 cursor-pointer select-none items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-sm"
        title="收起/展开侧栏" @click="emit('toggleSidebar')">H</div>
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
      <button type="button" :title="isFullscreen ? '退出全屏' : '全屏'"
        class="inline-flex size-8 items-center justify-center rounded-full text-base text-current transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/20 dark:active:bg-white/30"
        @click="toggleFullscreen">
        <IconMinimize v-if="isFullscreen" class="size-[1em]" />
        <IconMaximize v-else class="size-[1em]" />
      </button>
      <button type="button" title="系统设置"
        class="inline-flex size-8 items-center justify-center rounded-full text-base text-current transition-colors hover:bg-black/5 active:bg-black/10 dark:hover:bg-white/20 dark:active:bg-white/30"
        @click="emit('openSettings')">
        <IconSettings class="size-[1em]" />
      </button>
      <ThemeToggle :is-dark="isDark" size="sm" :duration="600" title="主题切换" @toggle="toggleTheme" />
      <Button severity="secondary" variant="text" rounded class="gap-1.5" @click="userMenu?.toggle($event)">
        <span class="flex items-center gap-1.5">
          <span
            class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary"><User
              class="h-3.5 w-3.5" /></span>
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

    <!-- 退出确认（拦截误点）；autofocus 标记 → Dialog 动画结束后焦点落在"退出"按钮 -->
    <Dialog :visible="logoutConfirmOpen" modal header="退出确认" autofocus
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }" @update:visible="logoutConfirmOpen = $event">
      <p class="text-xs">是否确定退出系统？</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="logoutConfirmOpen = false" />
        <Button label="退出" severity="danger" variant="outlined" autofocus
          @click="logoutConfirmOpen = false; emit('logout')" />
      </template>
    </Dialog>
  </header>
</template>
