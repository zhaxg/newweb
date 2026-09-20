<script setup lang="ts">
import { ref } from "vue";
import { IconBook, IconChevronDown, IconDots, IconKey, IconLayoutSidebar, IconLogout, IconSettings } from "@tabler/icons-vue";
import Button from "primevue/button";
import Menu from "primevue/menu";
import TieredMenu from "primevue/tieredmenu";
import type { MenuItem } from "primevue/menuitem";
import User from "@primeicons/vue/user";
import { TABLER_FALLBACK_ICON, tablerIcon } from "@/lib/tablerIcons";
import ThemeToggle from "@/components/common/ThemeToggle.vue";
import ModifyPasswd from "@/pages/_core/profile/ModifyPasswd.vue";
import { useAppTheme } from "@/composables/useAppTheme";
import type { HmxMenuNode } from "@/data/hmxMenu";
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

const userMenu = ref<InstanceType<typeof Menu> | null>(null);

/** ThemeToggle 二态切换：暗 ⇄ 亮 */
function toggleTheme() {
  setMode(isDark.value ? "light" : "dark");
}

/* 用户下拉：帮助文档 | 修改密码 | 退出（图标走 #itemicon 插槽） */
const modifyPasswdRef = ref<InstanceType<typeof ModifyPasswd> | null>(null);
const userItems: MenuItem[] = [
  { label: "帮助文档", command: () => toast("帮助文档建设中", 1800) },
  { label: "修改密码", command: () => modifyPasswdRef.value?.openModal() },
  { separator: true },
  { label: "退出", command: () => emit("logout") },
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
</script>

<template>
  <header class="flex h-12 shrink-0 items-center justify-between border-b border-border bg-[#F4F4F4] px-3 dark:bg-card">
    <div class="flex min-w-0 items-center gap-2.5">
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-sm">
        H</div>
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold leading-tight text-foreground">HiMind工业互联网平台</div>
      </div>
      <div class="ml-[40px] flex shrink-0 items-center">
        <Button text size="small" icon-only title="收起/展开侧栏" @click="emit('toggleSidebar')">
          <IconLayoutSidebar class="h-4 w-4" />
        </Button>
        <Button text size="small" icon-only title="功能菜单" @click="navMenuRef?.toggle($event)">
          <IconDots class="h-4 w-4" />
        </Button>
        <TieredMenu ref="navMenuRef" :model="navMenuItems" popup class="w-48" @show="onNavShow">
          <template #itemicon="{ item }">
            <component :is="navIcon(item)" class="h-3.5 w-3.5 text-muted-foreground" />
          </template>
        </TieredMenu>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <!-- 与 ThemeToggle 同款圆形图标钮，保持右侧视觉统一 -->
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
  </header>
</template>
