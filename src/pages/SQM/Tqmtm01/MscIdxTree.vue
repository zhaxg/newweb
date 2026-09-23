<script setup lang="ts">
/** 树列表（原 DevExpress TreeList，数据源=IdxReferenceTree 平铺表按 Pid 组树）
 *  节点着色照原 treeList1_NodeCellStyle：A=加粗橙、B=矢车菊蓝、C=中紫红、None=默认；无图标的空/实心差异以子节点有无区分 */
import { computed, ref, watch } from "vue";
import { IconChevronDown, IconChevronRight, IconFolder, IconFolderOpen } from "@tabler/icons-vue";
import { MscBasicTableType } from "@/api/mes4ddh/sqm.swagger";
import type { IdxReferenceTree } from "./mscVm";

const props = defineProps<{ nodes: IdxReferenceTree[]; selectedId?: string | null }>();
const emit = defineEmits<{ select: [IdxReferenceTree] }>();

interface Row {
  node: IdxReferenceTree;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
}
const expanded = ref<Set<string>>(new Set());

const childrenOf = computed(() => {
  const map = new Map<string, IdxReferenceTree[]>();
  for (const n of props.nodes) {
    const arr = map.get(n.pid) ?? [];
    arr.push(n);
    map.set(n.pid, arr);
  }
  return map;
});

const rows = computed<Row[]>(() => {
  const out: Row[] = [];
  const walk = (pid: string, depth: number) => {
    for (const n of childrenOf.value.get(pid) ?? []) {
      const kids = childrenOf.value.get(n.id) ?? [];
      const hasChildren = kids.length > 0;
      const isExpanded = expanded.value.has(n.id);
      out.push({ node: n, depth, hasChildren, expanded: isExpanded });
      if (hasChildren && isExpanded) walk(n.id, depth + 1);
    }
  };
  walk("0", 0);
  return out;
});

// 初次加载/树重建时展开到选中节点所在链路的两层（原程序 FocusedNode 会 CollapseAll 后 ExpandAll 父链）
watch(
  () => props.nodes,
  () => {
    if (!props.nodes.length) return;
    // 保留用户手动折叠状态，仅补根级展开（原 RefreshData 后 ExpandAll）
    for (const n of props.nodes) {
      if ((childrenOf.value.get(n.pid) ?? []).length && n.pid === "0") expanded.value.add(n.id);
    }
    let pid: string | undefined = props.nodes.find((n) => n.id === props.selectedId)?.pid;
    while (pid && pid !== "0") {
      if (expanded.value.has(pid)) break;
      expanded.value.add(pid);
      pid = props.nodes.find((n) => n.id === pid)?.pid;
    }
  },
  { immediate: true },
);

const toggle = (r: Row) => {
  const id = r.node.id;
  if (!id) return;
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
};

const colorOf = (t: MscBasicTableType) => {
  if (t === MscBasicTableType.A) return "text-[#ff8c00] font-medium";
  if (t === MscBasicTableType.B) return "text-[#6495ed]";
  if (t === MscBasicTableType.C) return "text-[#c71585]";
  return "";
};
</script>

<template>
  <div class="h-full min-h-0 overflow-auto py-1">
    <div v-for="(r, i) in rows" :key="r.node.id + '-' + i"
      class="flex h-6 cursor-pointer select-none items-center gap-1 px-1 text-xs hover:bg-accent"
      :class="r.node.id === props.selectedId ? 'bg-accent' : ''" :style="{ paddingLeft: `${r.depth * 14 + 4}px` }"
      @click="emit('select', r.node)">
      <span class="inline-flex h-3 w-3 shrink-0 items-center justify-center" @click.stop="r.hasChildren && toggle(r)">
        <IconChevronDown v-if="r.hasChildren && r.expanded" class="h-3 w-3" />
        <IconChevronRight v-else-if="r.hasChildren" class="h-3 w-3" />
      </span>
      <IconFolderOpen v-if="r.hasChildren && r.expanded" class="h-3 w-3 shrink-0 opacity-60" />
      <IconFolder v-else-if="r.hasChildren" class="h-3 w-3 shrink-0 opacity-60" />
      <span class="truncate" :class="colorOf(r.node.tableType)">{{ r.node.displayTxt }}</span>
    </div>
  </div>
</template>
