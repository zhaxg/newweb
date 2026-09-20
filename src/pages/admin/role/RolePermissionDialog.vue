<script setup lang="ts">
import { computed, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Tree from "primevue/tree";
import { useToast } from "@/composables/useToast";
import { hmxMenu, type HmxMenuNode } from "@/data/hmxMenu";
import { loadRolePerms, saveRolePerms, type HmxRole } from "@/data/roles";

const props = defineProps<{
  open: boolean;
  role: HmxRole | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { toast } = useToast();

/** 勾选的节点 id（父节点自身也入集合，展示态由子孙派生） */
const checked = ref<Set<string>>(new Set());
/** 展开的父节点 key（v-model 同步 Tree 内部折叠操作），打开时全部展开 */
const expandedKeys = ref<Record<string, boolean>>({});

const parentOf = computed(() => {
  const map = new Map<string, string | null>();
  const walk = (list: HmxMenuNode[], pid: string | null) => {
    for (const node of list) {
      map.set(node.id, pid);
      if (node.children?.length) walk(node.children, node.id);
    }
  };
  walk(hmxMenu, null);
  return map;
});

function isChecked(node: HmxMenuNode): boolean {
  if (!node.children?.length) return checked.value.has(node.id);
  return node.children.every(isChecked);
}

function isMixed(node: HmxMenuNode): boolean {
  if (!node.children?.length) return false;
  return !isChecked(node) && node.children.some((c) => isChecked(c) || isMixed(c));
}

// ---------- PrimeVue Tree 适配 ----------
interface PTreeNode {
  key: string;
  label: string;
  children?: PTreeNode[];
}

function toPTree(list: HmxMenuNode[]): PTreeNode[] {
  return list.map((n) => {
    const children = n.children?.length ? toPTree(n.children) : undefined;
    return { key: n.id, label: n.label, ...(children ? { children } : {}) };
  });
}

const treeNodes = computed<PTreeNode[]>(() => toPTree(hmxMenu));

/** 受控 selectionKeys：checked=全选、partialChecked=半选（视觉 indeterminate） */
const selectionKeys = computed<Record<string, { checked: boolean; partialChecked: boolean }>>(() => {
  const out: Record<string, { checked: boolean; partialChecked: boolean }> = {};
  const walk = (list: HmxMenuNode[]) => {
    for (const n of list) {
      if (isChecked(n)) out[n.id] = { checked: true, partialChecked: false };
      else if (isMixed(n)) out[n.id] = { checked: false, partialChecked: true };
      if (n.children?.length) walk(n.children);
    }
  };
  walk(hmxMenu);
  return out;
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const roleId = props.role?.id;
    checked.value = new Set(roleId ? (loadRolePerms()[roleId] ?? []) : []);
    const out: Record<string, boolean> = {};
    const walk = (list: HmxMenuNode[]) => {
      for (const n of list) {
        if (n.children?.length) {
          out[n.id] = true;
          walk(n.children);
        }
      }
    };
    walk(hmxMenu);
    expandedKeys.value = out;
  },
);

function expandAncestors(id: string) {
  const next = { ...expandedKeys.value };
  let pid = parentOf.value.get(id) ?? null;
  while (pid) {
    next[pid] = true;
    pid = parentOf.value.get(pid) ?? null;
  }
  expandedKeys.value = next;
}

function setNodeCheckedById(id: string, nextChecked: boolean) {
  const next = new Set(checked.value);
  const apply = (n: HmxMenuNode) => {
    if (nextChecked) next.add(n.id);
    else next.delete(n.id);
    n.children?.forEach(apply);
  };
  const find = (list: HmxMenuNode[]): HmxMenuNode | null => {
    for (const n of list) {
      if (n.id === id) return n;
      if (n.children?.length) {
        const hit = find(n.children);
        if (hit) return hit;
      }
    }
    return null;
  };
  const node = find(hmxMenu);
  if (!node) return;
  apply(node);
  checked.value = next;
  // 勾选任意节点时自动展开其全部祖先，保证选中项可见
  if (nextChecked) expandAncestors(id);
}

/** Tree 内部传播与派生模型语义一致；selectionKeys 单向受控，勾选结果以 checked 集合为准 */
function onNodeSelect(node: { key?: string }) {
  if (node?.key) setNodeCheckedById(node.key, true);
}

function onNodeUnselect(node: { key?: string }) {
  if (node?.key) setNodeCheckedById(node.key, false);
}

function onSave() {
  const role = props.role;
  if (!role) return;
  const ids: string[] = [];
  const walk = (list: HmxMenuNode[]) => {
    for (const node of list) {
      if (isChecked(node)) ids.push(node.id);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(hmxMenu);
  const all = loadRolePerms();
  all[role.id] = ids;
  saveRolePerms(all);
  emit("update:open", false);
  toast("保存成功！");
}
</script>

<template>
  <Dialog :visible="open" modal :header="`RBAC角色资源权限（菜单与界面元素）— ${role?.cRoleName}`"
    :style="{ width: 'min(32rem, calc(100vw - 2rem))' }" @update:visible="emit('update:open', $event)">
    <div class="min-h-0 max-h-[60vh] overflow-y-auto rounded-md border border-border/60 py-1">
      <Tree
        selection-mode="checkbox"
        :value="treeNodes"
        :selection-keys="selectionKeys"
        v-model:expanded-keys="expandedKeys"
        @node-select="onNodeSelect"
        @node-unselect="onNodeUnselect"
      />
    </div>
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="保存" variant="outlined" autofocus @click="onSave" />
    </template>
  </Dialog>
</template>
