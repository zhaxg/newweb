<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IconX } from "@tabler/icons-vue";
import Popover from "primevue/popover";
import InputText from "primevue/inputtext";
import { TABLER_FALLBACK_ICON, TABLER_ICON_NAMES, filterTablerIcons, tablerIcon } from "@/lib/tablerIcons";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ "update:modelValue": [value: string] }>();

/** 常用清单（空搜索时展示；键名与侧栏/种子数据保持一致） */
const FAVORITES = [
  "LayoutDashboard",
  "ShoppingCart",
  "Package",
  "PackageImport",
  "PackageExport",
  "Users",
  "UserSearch",
  "Building",
  "BuildingWarehouse",
  "ShieldCheck",
  "ListTree",
  "Braces",
  "Note",
  "FileText",
  "Settings",
  "Wallet",
  "TrendingUp",
  "Packages",
  "Truck",
  "Clock",
  "Sparkles",
  "AdjustmentsHorizontal",
  "Coin",
  "Cash",
  "Receipt",
  "Table",
  "ChartPie",
  "ChartBar",
  "ChartLine",
  "Search",
  "Refresh",
  "Folder",
  "Archive",
  "ClipboardList",
  "ClipboardCheck",
  "Scale",
  "Trophy",
  "Forklift",
  "ArrowsLeftRight",
  "Home",
];

const PAGE_SIZE = 96;

const DEFAULT_LIST = [...FAVORITES, ...TABLER_ICON_NAMES.filter((n) => !FAVORITES.includes(n))];

const popover = ref<InstanceType<typeof Popover> | null>(null);
const query = ref("");
const searchInput = ref<InstanceType<typeof InputText> | null>(null);
const shown = ref(PAGE_SIZE);

const tip = ref<{ text: string; x: number; y: number } | null>(null);
function showTip(ev: MouseEvent, name: string) {
  tip.value = { text: name, x: ev.clientX, y: ev.clientY - 10 };
}
function hideTip() {
  tip.value = null;
}

const allMatches = computed(() => (query.value.trim() ? filterTablerIcons(query.value) : DEFAULT_LIST));
const visible = computed(() => allMatches.value.slice(0, shown.value));
const currentIcon = computed(() => tablerIcon(props.modelValue) ?? TABLER_FALLBACK_ICON);

watch(query, () => {
  shown.value = PAGE_SIZE;
});

function toggle(ev: MouseEvent) {
  popover.value?.toggle(ev);
  query.value = "";
  shown.value = PAGE_SIZE;
  // PrimeVue 组件运行期暴露 $el，但类型上不可见
  setTimeout(
    () => (searchInput.value as unknown as { $el?: HTMLElement } | null)?.$el?.querySelector("input")?.focus(),
    0,
  );
}

function onScroll(ev: Event) {
  const el = ev.target as HTMLElement;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 64 && shown.value < allMatches.value.length)
    shown.value += PAGE_SIZE;
}

function pick(name: string) {
  hideTip();
  emit("update:modelValue", name);
  popover.value?.hide();
}

function clear() {
  emit("update:modelValue", "");
}
</script>

<template>
  <div class="flex min-w-0 items-stretch gap-1">
    <button
      type="button"
      class="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2 text-left text-xs hover:border-primary/60"
      @click="toggle"
    >
      <component :is="currentIcon" class="h-4 w-4 shrink-0 text-muted-foreground" />
      <span class="min-w-0 flex-1 truncate" :class="!modelValue && 'italic text-muted-foreground/60'">{{
        modelValue || "（默认）"
      }}</span>
      <span class="shrink-0 text-xs text-muted-foreground/60">{{ TABLER_ICON_NAMES.length }}+</span>
    </button>
    <button
      v-if="modelValue"
      type="button"
      title="清除，回退默认图标"
      @click="clear"
      class="flex h-5 w-5 shrink-0 self-center items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <IconX class="h-3 w-3" />
    </button>

    <Popover ref="popover" :dismissable="true" class="w-[520px]" @hide="hideTip">
      <div class="flex flex-col gap-2 p-1">
        <div class="relative">
          <InputText
            v-model="query"
            ref="searchInput"
            placeholder="搜索图标（如 chart-pie / building / clock）"
            autocapitalize="off"
            spellcheck="false"
            class="w-full pr-8"
          />
          <button
            v-if="query"
            type="button"
            title="清空搜索"
            @click="query = ''"
            class="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <IconX class="h-3 w-3" />
          </button>
        </div>
        <div v-if="query.trim()" class="text-xs text-muted-foreground">匹配 {{ allMatches.length }} 个</div>
        <div class="grid max-h-[260px] grid-cols-9 gap-1 overflow-y-auto" @scroll.passive="onScroll">
          <button
            v-for="name in visible"
            :key="name"
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
            :class="name === modelValue && 'bg-primary/10 text-primary'"
            @mouseenter="showTip($event, name)"
            @mousemove="showTip($event, name)"
            @mouseleave="hideTip"
            @click="pick(name)"
          >
            <component :is="tablerIcon(name)" class="h-4 w-4" />
          </button>
        </div>
        <div v-if="visible.length === 0" class="py-4 text-center text-xs text-muted-foreground">无匹配图标</div>
        <div v-else-if="allMatches.length > visible.length" class="text-center text-xs text-muted-foreground/70">
          已显示 {{ visible.length }} / {{ allMatches.length }} · 向下滚动加载更多
        </div>
      </div>
    </Popover>

    <Teleport to="body">
      <div
        v-if="tip"
        class="pointer-events-none fixed z-[2147483647] -translate-x-1/2 -translate-y-full rounded bg-foreground px-1.5 py-0.5 text-xs text-background shadow-md"
        :style="{ left: `${tip.x}px`, top: `${tip.y}px` }"
      >
        {{ tip.text }}
      </div>
    </Teleport>
  </div>
</template>
