<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import TreeSelect from "primevue/treeselect";
import { buildDeptTree, loadDepartments, type DeptTreeNode, type HmxDept } from "@/data/departments";
import { EDUS, NATIONS, POLITICS, PROVINCES, SEXES, USER_TYPES, type HmxUser } from "@/data/users";

const props = defineProps<{
  open: boolean;
  /** null 表示新增 */
  editing: HmxUser | null;
  /** 预置部门 id（预留） */
  presetDeptId?: string | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  save: [user: HmxUser];
  invalid: [message: string];
}>();

const form = reactive({
  id: "",
  cUserName: "",
  cPhone: "",
  cEmail: "",
  cUserType: USER_TYPES[0],
  cSex: SEXES[0],
  cStatus: "1",
  cManager: false,
  cDeptId: null as string | null,
  cPost: "",
  cDuty: "",
  cEdu: null as string | null,
  cNation: null as string | null,
  cNative: null as string | null,
  cPolitics: null as string | null,
  cIdCard: "",
  cSocialSec: "",
});

// ---------- 部门树选择（TreeSelect） ----------
interface PTreeNode {
  key: string;
  label: string;
  children?: PTreeNode[];
}

function toPTree(nodes: DeptTreeNode[]): PTreeNode[] {
  return nodes.map((n) => {
    const children = toPTree(n.children);
    return { key: n.id, label: n.cDeptName, ...(children.length ? { children } : {}) };
  });
}

const deptRows = ref<HmxDept[]>([]);
const deptTreeNodes = computed(() => toPTree(buildDeptTree(deptRows.value)));

// TreeSelect 的 v-model 是 {key:true} 选择映射，这里适配回 string|null
const deptSelection = computed<Record<string, boolean> | null>(() => (form.cDeptId ? { [form.cDeptId]: true } : null));

function onDeptSelection(keys: Record<string, boolean> | null) {
  form.cDeptId = keys ? Object.keys(keys).find((k) => keys[k]) ?? null : null;
}

const statusOptions = [
  { label: "启用", value: "1" },
  { label: "禁用", value: "0" },
];

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    deptRows.value = loadDepartments();
    const e = props.editing;
    form.id = e?.id ?? "";
    form.cUserName = e?.cUserName ?? "";
    form.cPhone = e?.cPhone ?? "";
    form.cEmail = e?.cEmail ?? "";
    form.cUserType = e?.cUserType || USER_TYPES[0];
    form.cSex = e?.cSex || SEXES[0];
    form.cStatus = e?.cStatus || "1";
    form.cManager = e?.cManager ?? false;
    form.cDeptId = typeof (e ? e.cDeptId : props.presetDeptId) === "string" ? ((e ? e.cDeptId : props.presetDeptId) as string) : null;
    form.cPost = e?.cPost ?? "";
    form.cDuty = e?.cDuty ?? "";
    form.cEdu = e?.cEdu || null;
    form.cNation = e?.cNation || null;
    form.cNative = e?.cNative || null;
    form.cPolitics = e?.cPolitics || null;
    form.cIdCard = e?.cIdCard ?? "";
    form.cSocialSec = e?.cSocialSec ?? "";
  },
);

function onSave() {
  if (!form.id.trim() || !form.cUserName.trim()) {
    emit("invalid", "必须填写登录名和用户名");
    return;
  }
  emit("save", {
    id: props.editing?.id ?? form.id.trim(),
    cUserName: form.cUserName.trim(),
    cUserType: form.cUserType,
    cPhone: form.cPhone.trim(),
    cSex: form.cSex,
    cEmail: form.cEmail.trim(),
    cStatus: form.cStatus,
    cManager: form.cManager,
    creator: props.editing?.creator ?? "",
    createTime: props.editing?.createTime ?? "",
    lastModifier: props.editing?.lastModifier ?? "",
    lastModifyTime: props.editing?.lastModifyTime ?? "",
    cDeptId: form.cDeptId,
    cPost: form.cPost.trim(),
    cDuty: form.cDuty.trim(),
    cEdu: form.cEdu ?? "",
    cNative: form.cNative ?? "",
    cPolitics: form.cPolitics ?? "",
    cNation: form.cNation ?? "",
    cIdCard: form.cIdCard.trim(),
    cSocialSec: form.cSocialSec.trim(),
  });
}
</script>

<template>
  <Dialog :visible="open" modal :header="editing ? '编辑用户信息' : '添加用户'"
    :style="{ width: 'min(36rem, calc(100vw - 2rem))' }" @update:visible="emit('update:open', $event)">
    <div class="min-w-0 space-y-4 py-1">
      <!-- 基本信息：双列布局 -->
      <div class="min-w-0 space-y-2">
        <div class="text-xs font-medium text-muted-foreground">基本信息</div>
        <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">登录名<span class="ml-0.5 text-destructive">*</span></label>
            <InputText v-model="form.id" :disabled="!!editing" placeholder="请输入登录名" autofocus autocapitalize="off"
              spellcheck="false" class="w-full min-w-0" @keydown.enter="onSave" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">用户名<span class="ml-0.5 text-destructive">*</span></label>
            <InputText v-model="form.cUserName" placeholder="请输入用户名" autocapitalize="off" spellcheck="false"
              class="w-full min-w-0" @keydown.enter="onSave" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">手机</label>
            <InputText v-model="form.cPhone" placeholder="请输入手机号" autocapitalize="off" spellcheck="false"
              class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">邮箱</label>
            <InputText v-model="form.cEmail" placeholder="请输入邮箱" autocapitalize="off" spellcheck="false"
              class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">用户类型</label>
            <Select v-model="form.cUserType" :options="USER_TYPES" placeholder="-请选择-" class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">性别</label>
            <Select v-model="form.cSex" :options="SEXES" placeholder="-请选择-" class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">状态</label>
            <Select v-model="form.cStatus" :options="statusOptions" option-label="label" option-value="value"
              class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">管理者</label>
            <div class="flex h-8 items-center">
              <ToggleSwitch v-model="form.cManager" />
            </div>
          </div>
        </div>
      </div>

      <!-- 其他信息：弱化独立区块 -->
      <div class="min-w-0 rounded-md border border-border/60 bg-muted/30 p-3">
        <div class="mb-2 text-xs font-medium text-muted-foreground">其他信息</div>
        <div class="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <label class="text-[11px] text-muted-foreground/80">部门</label>
            <TreeSelect :model-value="deptSelection" @update:model-value="onDeptSelection" :options="deptTreeNodes"
              placeholder="-请选择-" filter show-clear class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-[11px] text-muted-foreground/80">岗位</label>
            <InputText v-model="form.cPost" class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-[11px] text-muted-foreground/80">职务</label>
            <InputText v-model="form.cDuty" class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-[11px] text-muted-foreground/80">教育程度</label>
            <Select v-model="form.cEdu" :options="EDUS" placeholder="-请选择-" show-clear class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-[11px] text-muted-foreground/80">民族</label>
            <Select v-model="form.cNation" :options="NATIONS" placeholder="-请选择-" show-clear class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-[11px] text-muted-foreground/80">籍贯</label>
            <Select v-model="form.cNative" :options="PROVINCES" placeholder="-请选择-" show-clear filter
              class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-[11px] text-muted-foreground/80">政治面貌</label>
            <Select v-model="form.cPolitics" :options="POLITICS" placeholder="-请选择-" show-clear class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-[11px] text-muted-foreground/80">身份证</label>
            <InputText v-model="form.cIdCard" class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-[11px] text-muted-foreground/80">社保号</label>
            <InputText v-model="form.cSocialSec" class="w-full min-w-0" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="取消" text @click="emit('update:open', false)" />
      <Button label="确定" raised @click="onSave" />
    </template>
  </Dialog>
</template>
