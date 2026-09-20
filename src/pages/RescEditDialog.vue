<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import TreeSelect from "primevue/treeselect";
import { buildRescTree, descendantIds, ICON_NAMES, loadRescs, RESC_TYPES, type HmxRes, type RescTreeNode } from "@/data/rescs";

const props = defineProps<{
  open: boolean;
  /** null 表示新增 */
  editing: HmxRes | null;
  /** 复制时预置的整行数据（新增场景） */
  presetRow: HmxRes | null;
  /** 新增时预置的父节点 id（"0" 为根） */
  presetPid: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [resc: HmxRes];
  invalid: [message: string];
}>();

const form = reactive({
  cPid: "0",
  cCode: "",
  cTitle: "",
  cOrder: "1",
  cResPath: "",
  cResSubPath: "",
  cQueryString: "",
  cEnable: "1",
  cRescType: "Menu",
  icon: "FileText",
});

const ENABLE_OPTIONS = [
  { value: "1", label: "1-启用" },
  { value: "0", label: "0-禁用" },
];

/** 打开对话框时从存储读取全量行，供父节点树下拉使用 */
const allRows = ref<HmxRes[]>([]);

function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ---------- 父节点 TreeSelect ----------
interface PTreeNode {
  key: string;
  label: string;
  children?: PTreeNode[];
}

function toPTree(nodes: RescTreeNode[]): PTreeNode[] {
  return nodes.map((n) => {
    const children = toPTree(n.children);
    return { key: n.id, label: `${n.cCode}-${n.cTitle}`, ...(children.length ? { children } : {}) };
  });
}

/** 编辑时排除自身及后代，防止把节点挂到自己的子树下 */
const selectableTree = computed<PTreeNode[]>(() => {
  const editing = props.editing;
  const rows = editing ? allRows.value.filter((r) => !descendantIds(allRows.value, editing.id).has(r.id)) : allRows.value;
  return toPTree(buildRescTree(rows));
});

// TreeSelect 的 v-model 是 {key:true} 选择映射；cPid "0"（根）映射为 null
const parentSelection = computed<Record<string, boolean> | null>(() => (form.cPid && form.cPid !== "0" ? { [form.cPid]: true } : null));

function onParentSelection(keys: Record<string, boolean> | null) {
  form.cPid = keys ? Object.keys(keys).find((k) => keys[k]) ?? "0" : "0";
}

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    allRows.value = loadRescs();
    const e = props.editing;
    const preset = e ?? props.presetRow;
    form.cPid = e ? e.cPid : props.presetPid ?? props.presetRow?.cPid ?? "0";
    form.cCode = preset?.cCode ?? "";
    form.cTitle = preset?.cTitle ?? "";
    form.cOrder = preset?.cOrder ?? "1";
    form.cResPath = preset?.cResPath ?? "";
    form.cResSubPath = preset?.cResSubPath ?? "";
    form.cQueryString = preset?.cQueryString ?? "";
    form.cEnable = preset?.cEnable ?? "1";
    form.cRescType = preset?.cRescType ?? "Menu";
    form.icon = preset?.icon || "FileText";
  },
);

function onSave() {
  if (!form.cCode.trim() || !form.cTitle.trim()) {
    emit("invalid", "请输入编码和名称！");
    return;
  }
  const e = props.editing;
  emit("save", {
    id: e?.id ?? "",
    cPid: form.cPid,
    cCode: form.cCode.trim().toUpperCase(),
    cTitle: form.cTitle.trim(),
    cOrder: form.cOrder.trim() || "1",
    cResPath: form.cResPath.trim(),
    cResSubPath: form.cResSubPath.trim(),
    cQueryString: form.cQueryString.trim(),
    cEnable: form.cEnable,
    cRescType: form.cRescType,
    icon: form.icon,
    creator: e?.creator ?? "admin",
    createTime: e?.createTime ?? now(),
    lastModifier: e ? "admin" : "",
    lastModifyTime: e ? now() : "",
  });
}
</script>

<template>
  <Dialog :visible="open" modal :header="editing ? '编辑资源' : '添加资源'"
    :style="{ width: 'min(36rem, calc(100vw - 2rem))' }" @update:visible="emit('update:open', $event)">
    <div class="min-w-0 space-y-3 py-1">
      <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <!-- 父节点 -->
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">父节点</label>
          <TreeSelect :model-value="parentSelection" @update:model-value="onParentSelection"
            :options="selectableTree" placeholder="-请选择-（根节点）" filter show-clear class="w-full min-w-0" />
        </div>

        <!-- 图标 -->
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">图标</label>
          <Select v-model="form.icon" :options="[...ICON_NAMES]" class="w-full min-w-0" />
        </div>

        <!-- 编码 -->
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground" title="模块代号，两位大写字母+数字编码">编码<span
              class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="form.cCode" placeholder="PP1200" title="模块代号，两位大写字母+数字编码" autocapitalize="off"
            spellcheck="false" class="w-full min-w-0" @keydown.enter="onSave" />
        </div>

        <!-- 名称 -->
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground" title="模块名称（||开头代表菜单分组的开始）">名称<span
              class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="form.cTitle" placeholder="请输入名称" title="模块名称（||开头代表菜单分组的开始）" autocapitalize="off"
            spellcheck="false" class="w-full min-w-0" @keydown.enter="onSave" />
        </div>

        <!-- 地址 -->
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">地址</label>
          <InputText v-model="form.cResPath" placeholder="/sys-xxx" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" @keydown.enter="onSave" />
        </div>

        <!-- 子路径 -->
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">子路径</label>
          <InputText v-model="form.cResSubPath" placeholder="btn:xxx" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" @keydown.enter="onSave" />
        </div>

        <!-- 注入参数 -->
        <div class="min-w-0 space-y-1 sm:col-span-2">
          <label class="text-xs font-medium text-muted-foreground" title="在构造函数后注入。举例：name=zhaxg&pawd=234">注入参数</label>
          <InputText v-model="form.cQueryString" placeholder="name=xx&pawd=xx"
            title="在构造函数后注入。举例：name=zhaxg&pawd=234" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" @keydown.enter="onSave" />
        </div>

        <!-- 是否启用 -->
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">是否启用</label>
          <Select v-model="form.cEnable" :options="ENABLE_OPTIONS" option-label="label" option-value="value"
            class="w-full min-w-0" />
        </div>

        <!-- 资源类型 -->
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">资源类型</label>
          <Select v-model="form.cRescType" :options="[...RESC_TYPES]" class="w-full min-w-0" />
        </div>

        <!-- 排序 -->
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">排序</label>
          <InputText v-model="form.cOrder" type="number" min="0" class="w-full min-w-0"
            @keydown.enter="onSave" />
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="取消" text @click="emit('update:open', false)" />
      <Button label="保存" raised @click="onSave" />
    </template>
  </Dialog>
</template>
