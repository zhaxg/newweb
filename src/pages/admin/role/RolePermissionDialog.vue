<script setup lang="ts">
/** 对应 FrmRoleList（角色权限编辑）：HmxWinForms.Forms.Admin.FrmRoleList
 *  画面迁移，逻辑不迁移到 */

import { computed, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Select from "primevue/select";
import Tree from "primevue/tree";
import { useToast } from "@/composables/useToast";
import { adminApi } from "@/api/admin/request";
import { transformPermissionTree, collectParentKeys, type PermissionNode } from "@/api/common/permissionTree";
import type { HmxKv, HmxRole, RolePermissionOfViewAndWidgets } from "@/api/admin/types";

const props = defineProps<{
  open: boolean;
  role: HmxRole | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const { toast } = useToast();

const defaultNs = import.meta.env.VITE_ROUTER_NAMESPACE ?? "TDWEB";
const namespaces = ref<{ label: string; value: string }[]>([]);
const currentNs = ref(defaultNs);
const treeNodes = ref<PermissionNode[]>([]);
const checked = ref<Set<string>>(new Set());
const expandedKeys = ref<Record<string, boolean>>({});
const loading = ref(false);

function isChecked(node: PermissionNode): boolean {
  if (!node.children?.length) return checked.value.has(node.key);
  return node.children.every(isChecked);
}

function isMixed(node: PermissionNode): boolean {
  if (!node.children?.length) return false;
  return !isChecked(node) && node.children.some((c) => isChecked(c) || isMixed(c));
}

const selectionKeys = computed<Record<string, { checked: boolean; partialChecked: boolean }>>(() => {
  const out: Record<string, { checked: boolean; partialChecked: boolean }> = {};
  const walk = (list: PermissionNode[]) => {
    for (const n of list) {
      if (isChecked(n)) out[n.key] = { checked: true, partialChecked: false };
      else if (isMixed(n)) out[n.key] = { checked: false, partialChecked: true };
      if (n.children?.length) walk(n.children);
    }
  };
  walk(treeNodes.value);
  return out;
});

function findNode(list: PermissionNode[], id: string): PermissionNode | null {
  for (const n of list) {
    if (n.key === id) return n;
    if (n.children?.length) {
      const hit = findNode(n.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

function parentOfId(list: PermissionNode[], id: string, pid: string | null): string | null {
  for (const n of list) {
    if (n.key === id) return pid;
    if (n.children?.length) {
      const hit = parentOfId(n.children, id, n.key);
      if (hit) return hit;
    }
  }
  return null;
}

function expandAncestors(id: string) {
  const next = { ...expandedKeys.value };
  let pid = parentOfId(treeNodes.value, id, null);
  while (pid) {
    next[pid] = true;
    pid = parentOfId(treeNodes.value, pid, null);
  }
  expandedKeys.value = next;
}

function setNodeCheckedById(id: string, nextChecked: boolean) {
  const node = findNode(treeNodes.value, id);
  if (!node) return;
  const next = new Set(checked.value);
  const apply = (n: PermissionNode) => {
    if (nextChecked) next.add(n.key);
    else next.delete(n.key);
    n.children?.forEach(apply);
  };
  apply(node);
  checked.value = next;
  if (nextChecked) expandAncestors(id);
}

function onNodeSelect(node: { key?: string }) {
  if (node?.key) setNodeCheckedById(node.key, true);
}
function onNodeUnselect(node: { key?: string }) {
  if (node?.key) setNodeCheckedById(node.key, false);
}

async function loadNamespaceOptions() {
  if (namespaces.value.length) return;
  try {
    const list = await adminApi.getResourceNamespaceList();
    namespaces.value = ((list ?? []) as HmxKv[]).map((k) => ({ label: k.cName ?? k.cCode ?? "", value: k.cCode ?? "" }));
    if (namespaces.value.length && !namespaces.value.some((n) => n.value === currentNs.value)) {
      currentNs.value = namespaces.value[0]!.value;
    }
  } catch {
    /* 拦截层已 toast */
  }
}

async function reload() {
  const roleId = props.role?.id;
  if (!roleId) return;
  loading.value = true;
  try {
    const resp = await adminApi.queryRolePermissionOfViewAndWidgets({ roleId, groupId: currentNs.value });
    const { tree, checkedLeafIds } = transformPermissionTree(resp ?? []);
    treeNodes.value = tree;
    checked.value = new Set(checkedLeafIds);
    expandedKeys.value = collectParentKeys(tree);
  } catch {
    treeNodes.value = [];
    checked.value = new Set();
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    await loadNamespaceOptions();
    await reload();
  },
);

function onSave() {
  const roleId = props.role?.id;
  if (!roleId) return;
  const permissions: RolePermissionOfViewAndWidgets[] = [];
  const walk = (list: PermissionNode[]) => {
    for (const n of list) {
      if (isChecked(n) || isMixed(n)) permissions.push(n.data);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(treeNodes.value);
  adminApi
    .saveRolePermissionOfViewAndWidgets({ roleId, groupId: currentNs.value, permissions })
    .then(() => {
      emit("update:open", false);
      toast("权限保存成功", 2000, "success");
    })
    .catch(() => {
      /* 拦截层已 toast */
    });
}
</script>

<template>
  <Dialog :visible="open" modal :header="`分配权限 [ ${role?.cRoleName} ]`"
    :style="{ width: 'min(34rem, calc(100vw - 2rem))' }" @update:visible="emit('update:open', $event)">
    <div class="mb-2 flex items-center gap-2">
      <span class="text-xs text-muted-foreground">命名空间</span>
      <Select v-model="currentNs" :options="namespaces" option-label="label" class="w-48" @change="reload" />
    </div>
    <div class="min-h-0 max-h-[55vh] overflow-y-auto rounded-md border border-border/60 py-1">
      <Tree selection-mode="checkbox" :value="treeNodes" :selection-keys="selectionKeys"
        v-model:expanded-keys="expandedKeys" @node-select="onNodeSelect" @node-unselect="onNodeUnselect" />
      <div v-if="!loading && treeNodes.length === 0" class="px-3 py-6 text-center text-xs text-muted-foreground">
        该命名空间下暂无可分配资源
      </div>
    </div>
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="保存" variant="outlined" autofocus :loading="loading" @click="onSave" />
    </template>
  </Dialog>
</template>
