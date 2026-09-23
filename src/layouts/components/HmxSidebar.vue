<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { IconChevronsUp, IconSearch, IconX } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import Tree from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import type { HmxMenuNode } from "@/api/common/menuApi";
import { TABLER_FALLBACK_ICON, tablerIcon } from "@/lib/tablerIcons";
import { usePermissionStore } from "@/stores/permissionStore";

const props = defineProps<{
  activePageId: string | null;
}>();

/* 菜单树 = mock 后端按角色下发的动态树（与路由注册同源），无权限节点直接不渲染 */
const perm = usePermissionStore();

const emit = defineEmits<{
  openPage: [node: HmxMenuNode];
}>();

const search = ref("");

/* 侧栏宽度：可拖动分割条（移植 DBX usePanelResize 交互），持久化到 localStorage */
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 480;
const sidebarWidth = ref(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, Number(localStorage.getItem("hmx-sidebar-width")) || 240)));

function startResize(e: PointerEvent) {
  e.preventDefault();
  const handle = e.currentTarget as HTMLElement | null;
  handle?.setPointerCapture(e.pointerId);
  const startX = e.clientX;
  const startWidth = sidebarWidth.value;
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, { position: "fixed", inset: "0", zIndex: "2147483647", cursor: "col-resize", userSelect: "none", touchAction: "none" });
  document.body.append(overlay);
  let currentWidth = startWidth;
  let rafId: number | null = null;

  const onPointerMove = (ev: PointerEvent) => {
    currentWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, startWidth + (ev.clientX - startX)));
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      sidebarWidth.value = currentWidth;
      rafId = null;
    });
  };
  const finishResize = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", finishResize);
    document.removeEventListener("pointercancel", finishResize);
    window.removeEventListener("blur", finishResize);
    if (handle?.hasPointerCapture(e.pointerId)) handle.releasePointerCapture(e.pointerId);
    overlay.remove();
    sidebarWidth.value = currentWidth;
    localStorage.setItem("hmx-sidebar-width", String(currentWidth));
  };
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", finishResize);
  document.addEventListener("pointercancel", finishResize);
  window.addEventListener("blur", finishResize, { once: true });
}

function filterNodes(nodes: HmxMenuNode[], query: string): HmxMenuNode[] {
  if (!query.trim()) return nodes;
  const q = query.trim().toLowerCase();
  const result: HmxMenuNode[] = [];
  for (const node of nodes) {
    const children = node.children ? filterNodes(node.children, q) : undefined;
    if (node.label.toLowerCase().includes(q) || (children && children.length > 0)) {
      result.push({ ...node, children: children ?? node.children });
    }
  }
  return result;
}

function toTreeNodes(nodes: HmxMenuNode[]): TreeNode[] {
  return nodes.map((n) => ({
    key: n.id,
    label: n.label,
    data: n,
    selectable: true,
    children: n.children ? toTreeNodes(n.children) : undefined,
  }));
}

const treeNodes = computed(() => toTreeNodes(filterNodes(perm.menuTree, search.value)));

/* 加载菜单后默认全部折叠（不预展开任何层级） */
const expandedKeys = ref<Record<string, boolean>>({});
watch(
  () => perm.menuTree,
  () => {
    /* 菜单重载：清空搜索并保持全折叠 */
    search.value = "";
    expandedKeys.value = {};
  },
  { immediate: true },
);

/** 收集树里所有带子节点的 key（用于搜索后一键全展开） */
function collectExpandableKeys(nodes: TreeNode[], acc: Record<string, boolean> = {}): Record<string, boolean> {
  for (const n of nodes) {
    if (n.children?.length) {
      acc[String(n.key)] = true;
      collectExpandableKeys(n.children, acc);
    }
  }
  return acc;
}

/* 搜索：有查询词 → 当前（过滤后）树全展开；清除查询 → 恢复默认全折叠 */
watch(search, (q) => {
  if (q.trim()) {
    expandedKeys.value = collectExpandableKeys(treeNodes.value);
  } else {
    expandedKeys.value = {};
  }
});

/* page → 树节点 key，用于把当前激活页映射为选中态 */
const pageKeyMap = computed(() => {
  const map = new Map<string, string>();
  const walk = (nodes: HmxMenuNode[]) => {
    for (const n of nodes) {
      if (n.page) map.set(n.page, n.id);
      if (n.children) walk(n.children);
    }
  };
  walk(perm.menuTree);
  return map;
});

/* 选中态：默认跟随当前激活页；用户点父节点时也可临时选中父行（仅高亮，不改页面） */
const selectedKeys = ref<Record<string, boolean>>({});

watch(
  () => props.activePageId,
  (pageId) => {
    const key = pageId ? pageKeyMap.value.get(pageId) : undefined;
    selectedKeys.value = key ? { [key]: true } : {};
  },
  { immediate: true },
);

/* 一键折叠：清空展开态，全部收起 */
function collapseAll() {
  expandedKeys.value = {};
}

function nodeIcon(node: TreeNode) {
  const name = (node.data as HmxMenuNode | undefined)?.icon;
  return tablerIcon(name) ?? TABLER_FALLBACK_ICON;
}

function toggleExpand(node: TreeNode) {
  if (node.children?.length) {
    const key = node.key as string;
    expandedKeys.value = { ...expandedKeys.value, [key]: !expandedKeys.value[key] };
  }
}

function onNodeSelect(node: TreeNode) {
  const data = node.data as HmxMenuNode | undefined;
  if (data?.page || data?.url) {
    emit("openPage", data);
    return;
  }
  /* 父节点：选中高亮 + 切换展开/收起（selectable 节点 Tree 不再自动 toggle） */
  selectedKeys.value = { [node.key as string]: true };
  toggleExpand(node);
}

/* 单选模式下再次点击已选中节点走 node-unselect：保持选中态，父节点则再次切换展开/收起 */
function onNodeUnselect(node: TreeNode) {
  selectedKeys.value = { [node.key as string]: true };
  const data = node.data as HmxMenuNode | undefined;
  if (!data?.page && !data?.url) {
    toggleExpand(node);
  } else if (data) {
    emit("openPage", data);
  }
}
</script>

<template>
  <!-- z-[11]：高于标签栏（HmxTabBar z-10），保证骑在边框上的分割条热区不被遮挡 -->
  <aside class="relative z-[11] flex h-full shrink-0 select-none flex-col border-r border-border bg-[#e5e7eb] dark:bg-sidebar" :style="{ width: sidebarWidth + 'px' }">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2 py-1.5">
      <div class="relative flex min-w-0 flex-1 items-center">
        <IconSearch class="pointer-events-none absolute left-2 top-1/2 z-10 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <InputText v-model="search" type="text" placeholder="搜索菜单" autocapitalize="off" autocorrect="off" spellcheck="false"
          class="!h-6 w-full !rounded border border-[#cdd2d9] !bg-[#dde0e5] !pl-7 !pr-6 !text-xs shadow-none dark:!bg-input/30" />
        <button v-if="search" type="button" class="absolute right-1.5 top-1/2 z-10 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="清除" @click="search = ''">
          <IconX class="h-3 w-3" />
        </button>
      </div>
      <button type="button" class="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground" title="一键折叠" aria-label="一键折叠" @click="collapseAll">
        <IconChevronsUp class="h-3.5 w-3.5" />
      </button>
    </div>
    <div class="hmx-sidebar-scroll min-h-0 flex-1 overflow-y-auto py-1">
      <Tree v-if="treeNodes.length > 0" :value="treeNodes" selection-mode="single" :expanded-keys="expandedKeys" :selection-keys="selectedKeys"
        aria-label="功能菜单" @update:expanded-keys="expandedKeys = $event" @node-select="onNodeSelect" @node-unselect="onNodeUnselect">
        <template #nodeicon="{ node }">
          <component :is="nodeIcon(node)" class="h-3.5 w-3.5 text-muted-foreground" />
        </template>
      </Tree>
      <div v-if="treeNodes.length === 0" class="px-3 py-6 text-center text-xs text-muted-foreground">无匹配菜单</div>
    </div>
    <!-- 分割条（移植 DBX panel-resize-handle：透明热区，悬停/拖动高亮） -->
    <div class="panel-resize-handle panel-resize-handle--right" @pointerdown="startResize" />
  </aside>
</template>

<style scoped>
/* 分割条：7px 透明热区骑在边框上（好拖），悬停/拖动时只显示 2px 细高亮线（精致） */
.panel-resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 7px;
  cursor: col-resize;
  touch-action: none;
  z-index: 10;
  background: transparent;
}
.panel-resize-handle--right {
  right: -4px;
}
.panel-resize-handle--right::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  margin-left: -1px;
  background: var(--ring);
  opacity: 0;
  transition: opacity 0.12s;
}
.panel-resize-handle--right:hover::after,
.panel-resize-handle--right:active::after {
  opacity: 1;
}
/* 滚动条默认隐藏，鼠标进入侧边栏才显示（低调半透明）。
   注意：设置了 scrollbar-width/scrollbar-color 后 Chromium 会忽略 ::-webkit-scrollbar 自定义，故只用标准属性 */
.hmx-sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
  transition: scrollbar-color 0.25s;
}
aside:hover .hmx-sidebar-scroll {
  scrollbar-color: rgba(128, 128, 128, 0.28) transparent;
}
:global(.dark) aside:hover .hmx-sidebar-scroll {
  scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}
/* PrimeVue Tree 紧凑化：行高 ~28px、字号走预设 12px，激活页加粗 */
.hmx-sidebar-scroll :deep(.p-tree) {
  border: none;
  background: transparent;
  padding: 0;
}
.hmx-sidebar-scroll :deep(.p-tree-root-children) {
  padding: 0;
}
/* 层级缩进：本版本 Tree 无 indentation prop，缩进来自 .p-tree-node-children 的 padding-inline-start（theme token tree.indent）。
   这里显式给值并画一条淡色竖引导线强化三级层次 */
.hmx-sidebar-scroll :deep(.p-tree-node-children) {
  padding-top: 0;
  padding-bottom: 0;
  padding-inline-start: 20px;
  border-left: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}
.hmx-sidebar-scroll :deep(.p-tree-node-content) {
  width: 100%;
  border-radius: 4px;
}
.hmx-sidebar-scroll :deep(.p-tree-node-label) {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hmx-sidebar-scroll :deep(.p-tree-node-selected .p-tree-node-label) {
  font-weight: 600;
}
</style>
