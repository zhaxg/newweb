<script setup lang="ts">
/** 对应 FrmTsDept（部门编辑）：HmxWinForms.Forms.Admin.Department.FrmTsDept
 *  画面迁移，逻辑不迁移到 */

import { computed, reactive, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import TreeSelect from "primevue/treeselect";
import { buildDeptTree, descendantIds, type DeptTreeNode, type HmxDept } from "@/data/departments";

const props = defineProps<{
  open: boolean;
  allRows: HmxDept[];
  
  editing: HmxDept | null;
  
  presetPid: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [dept: HmxDept];
  invalid: [message: string];
}>();

const form = reactive({
  cDeptName: "",
  cDeptPid: null as string | null,
  cCompany: "",
  cDeptDesc: "",
  cClassify: "",
  cSw01: "",
  cSw02: "",
  cSw03: "",
  cSw04: "",
  cSw05: "",
});

// ---------- 上级部门 TreeSelect ----------
interface PTreeNode {
  key: string;
  label: string;
  children?: PTreeNode[];
}

function toPTree(nodes: DeptTreeNode[]): PTreeNode[] {
  return nodes.map((n) => {
    const children = toPTree(n.children);
    return { key: n.id, label: n.cDeptName ?? "", ...(children.length ? { children } : {}) };
  });
}

const selectableTree = computed<PTreeNode[]>(() => {
  const editing = props.editing;
  const rows = editing ? props.allRows.filter((r) => !descendantIds(props.allRows, editing.id ?? "").has(r.id ?? "")) : props.allRows;
  return toPTree(buildDeptTree(rows));
});

// TreeSelect 的 v-model 是 {key:true} 选择映射，这里适配回 string|null
const parentSelection = computed<Record<string, boolean> | null>(() => (typeof form.cDeptPid === "string" && form.cDeptPid ? { [form.cDeptPid]: true } : null));

function onParentSelection(keys: Record<string, boolean> | null) {
  form.cDeptPid = keys ? Object.keys(keys).find((k) => keys[k]) ?? null : null;
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    const e = props.editing;
    form.cDeptName = e?.cDeptName ?? "";
    const rawPid = e ? e.cDeptPid : props.presetPid;
    form.cDeptPid = typeof rawPid === "string" && rawPid ? rawPid : null;
    form.cCompany = e?.cCompany ?? "";
    form.cDeptDesc = e?.cDeptDesc ?? "";
    form.cClassify = e?.cClassify ?? "";
    form.cSw01 = e?.cSw01 ?? "";
    form.cSw02 = e?.cSw02 ?? "";
    form.cSw03 = e?.cSw03 ?? "";
    form.cSw04 = e?.cSw04 ?? "";
    form.cSw05 = e?.cSw05 ?? "";
  },
);

function onSave() {
  if (!form.cDeptName.trim()) {
    emit("invalid", "请输入部门名称");
    return;
  }
  const emptyToUndef = (v: string) => v || undefined;
  emit("save", {
    ...(props.editing ?? { selected: false }),
    id: props.editing?.id ?? "",
    cDeptName: form.cDeptName.trim(),
    cDeptPid: form.cDeptPid ?? undefined,
    cDeptDesc: emptyToUndef(form.cDeptDesc.trim()),
    cCompany: emptyToUndef(form.cCompany.trim()),
    cClassify: emptyToUndef(form.cClassify.trim()),
    cSw01: emptyToUndef(form.cSw01.trim()),
    cSw02: emptyToUndef(form.cSw02.trim()),
    cSw03: emptyToUndef(form.cSw03.trim()),
    cSw04: emptyToUndef(form.cSw04.trim()),
    cSw05: emptyToUndef(form.cSw05.trim()),
  });
}
</script>

<template>
  <Dialog :visible="open" modal :header="editing ? '编辑部门' : '添加部门'"
    :style="{ width: 'min(36rem, calc(100vw - 2rem))' }" @update:visible="emit('update:open', $event)">
    <div class="min-w-0 space-y-4 py-1">
      <!-- 基本信息：双列布局 -->
      <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">部门名称<span class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="form.cDeptName" placeholder="请输入部门名称" autofocus autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" @keydown.enter="onSave" />
        </div>

        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">上级部门</label>
          <TreeSelect :model-value="parentSelection" @update:model-value="onParentSelection" :options="selectableTree"
            placeholder="-请选择-（顶级部门）" filter show-clear class="w-full min-w-0" />
        </div>

        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">集团代码</label>
          <InputText v-model="form.cCompany" placeholder="如 HMX" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" />
        </div>

        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">自定义分类</label>
          <InputText v-model="form.cClassify" placeholder="如 职能 / 事业部" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" />
        </div>
      </div>

      <!-- 描述：整行 -->
      <div class="min-w-0 space-y-1">
        <label class="text-xs font-medium text-muted-foreground">部门描述</label>
        <Textarea v-model="form.cDeptDesc" rows="2" placeholder="部门职责、说明等" class="w-full min-w-0" />
      </div>

      <!-- 扩展字段：弱化独立区块 -->
      <div class="min-w-0 rounded-md border border-border/60 bg-muted/30 p-3">
        <div class="mb-2 text-xs font-medium text-muted-foreground">扩展字段</div>
        <div class="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
          <!-- 仅展示前 3 个；form 仍携带 cSw04/05，编辑保存时原值回写不丢失 -->
          <div v-for="n in 3" :key="n" class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">扩展{{ n }}</label>
            <InputText :model-value="(form as Record<string, string>)[`cSw0${n}`]"
              @update:model-value="(v: string | undefined) => ((form as Record<string, string>)[`cSw0${n}`] = v ?? '')"
              class="w-full min-w-0 bg-background" />
          </div>
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="保存" variant="outlined" @click="onSave" />
    </template>
  </Dialog>
</template>
