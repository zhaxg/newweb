<script setup lang="ts">
import { ref } from "vue";
import * as lucide from "@lucide/vue";
import { LogOut, Moon, Settings, Sun, MonitorCog, ChevronDown, User, CreditCard, Circle, PanelLeft, Ellipsis, File } from "@lucide/vue";
import Button from "primevue/button";
import Menu from "primevue/menu";
import TieredMenu from "primevue/tieredmenu";
import type { MenuItem } from "primevue/menuitem";
import { useAppTheme } from "@/composables/useAppTheme";
import { erpMenu, type ErpMenuNode } from "@/data/erpMenu";

const { mode, setMode } = useAppTheme();

const emit = defineEmits<{
  openSettings: [];
  logout: [];
  toggleSidebar: [];
  openPage: [node: ErpMenuNode];
}>();

const themeMenu = ref<InstanceType<typeof TieredMenu> | null>(null);
const userMenu = ref<InstanceType<typeof Menu> | null>(null);

const themeItems: MenuItem[] = [
  { label: "浅色", command: () => setMode("light") },
  { label: "深色", command: () => setMode("dark") },
  { label: "跟随系统", command: () => setMode("system") },
];

const themeIcons = [Sun, Moon, MonitorCog];

/* 官方 Menu 示例（docs primevue/menu popup），图标换 lucide 占位 */
const userItems: MenuItem[] = [
  { label: "My Account", items: [
    { label: "Profile" },
    { label: "Billing" },
    { label: "Settings" },
  ] },
  { separator: true },
  { label: "Notifications", items: [
    { label: "Enable notifications" },
    { label: "Play sound" },
  ] },
  { separator: true },
  { label: "Appearance", items: [
    { label: "Light" },
    { label: "Dark" },
    { label: "System" },
  ] },
];
const userIcons: Record<string, unknown> = { Profile: User, Billing: CreditCard, Settings };

/* 侧栏树同款数据 → TieredMenu 模型（叶子点击 = 开页） */
function toMenuItems(nodes: ErpMenuNode[]): MenuItem[] {
  return nodes.map((n) => ({
    label: n.label,
    data: n,
    items: n.children?.length ? toMenuItems(n.children) : undefined,
    command: n.page ? () => emit("openPage", n) : undefined,
  }));
}
const navMenuRef = ref<InstanceType<typeof TieredMenu> | null>(null);
const navMenuItems = toMenuItems(erpMenu);
function navIcon(item: MenuItem) {
  const name = (item.data as ErpMenuNode | undefined)?.icon;
  return (name && (lucide as Record<string, unknown>)[name]) || File;
}
</script>

<template>
  <header class="flex h-12 shrink-0 items-center justify-between border-b border-border bg-[#F4F4F4] px-3 dark:bg-card">
    <div class="flex min-w-0 items-center gap-2.5">
      <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground shadow-sm">E</div>
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold leading-tight text-foreground">智能制造 ERP</div>
      </div>
      <div class="ml-[40px] flex shrink-0 items-center">
        <Button text size="small" title="收起/展开侧栏" @click="emit('toggleSidebar')">
          <template #icon>
            <PanelLeft class="h-4 w-4" />
          </template>
        </Button>
        <Button text size="small" title="功能菜单" @click="navMenuRef?.toggle($event)">
          <template #icon>
            <Ellipsis class="h-4 w-4" />
          </template>
        </Button>
        <TieredMenu ref="navMenuRef" :model="navMenuItems" popup class="w-48">
          <template #itemicon="{ item }">
            <component :is="navIcon(item)" class="h-3.5 w-3.5 text-muted-foreground" />
          </template>
        </TieredMenu>
      </div>
    </div>
    <div class="flex shrink-0 items-center gap-1">
      <Button text size="small" title="系统设置" @click="emit('openSettings')">
        <template #icon>
          <Settings class="h-4 w-4" />
        </template>
      </Button>
      <Button text size="small" title="主题切换" @click="themeMenu?.toggle($event)">
        <template #icon>
          <Sun v-if="mode === 'light'" class="h-4 w-4" />
          <Moon v-else-if="mode === 'dark'" class="h-4 w-4" />
          <MonitorCog v-else class="h-4 w-4" />
        </template>
      </Button>
      <TieredMenu ref="themeMenu" :model="themeItems" popup class="w-40">
        <template #itemicon="{ item }">
          <component :is="themeIcons[themeItems.indexOf(item)]" class="h-3.5 w-3.5 text-muted-foreground" />
        </template>
      </TieredMenu>
      <button type="button" class="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-sm hover:bg-accent"
        @click="userMenu?.toggle($event)">
        <span class="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">管</span>
        <span class="hidden text-foreground sm:inline">admin</span>
        <ChevronDown class="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <Menu ref="userMenu" :model="userItems" popup class="w-44">
        <template #itemicon="{ item }">
          <component :is="userIcons[item.label as string] ?? Circle" class="h-3.5 w-3.5 text-muted-foreground" />
        </template>
      </Menu>
      <Button outlined size="small" label="退出" class="ml-1" @click="emit('logout')">
        <template #icon>
          <LogOut class="h-3.5 w-3.5" />
        </template>
      </Button>
    </div>
  </header>
</template>
