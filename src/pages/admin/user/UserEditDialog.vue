<script setup lang="ts">
/** 对应 FrmUserList（用户编辑）：HmxWinForms.Forms.Admin.FrmUserList
 *  画面迁移，逻辑不迁移到 */

import { computed, reactive, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import TreeSelect from "primevue/treeselect";
import { departmentApi } from "@/api/admin/request";
import type { HmxDept, HmxUser } from "@/api/admin/types";
import { UserType } from "@/api/admin/enums";
import { buildDeptTree, type DeptTreeNode } from "@/pages/admin/dept/departments";
import { EDUS, NATIONS, POLITICS, PROVINCES, SEXES, USER_TYPES } from "./userOptions";

const props = defineProps<{
  open: boolean;

  editing: HmxUser | null;

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
  cUserType: UserType.Nomral as UserType,
  cSex: SEXES[0],
  cStatus: "1",
  cMaster: false,
  cDepartment: null as string | null,
  cPost: "",
  cPosition: "",
  cEducation: null as string | null,
  cNation: null as string | null,
  cNativePlace: null as string | null,
  cPoliticsStatus: null as string | null,
  cIdCardNo: "",
  cSbcard: "",
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
    return { key: n.id, label: n.cDeptName ?? "", ...(children.length ? { children } : {}) };
  });
}

const deptRows = ref<HmxDept[]>([]);
const deptTreeNodes = computed(() => toPTree(buildDeptTree(deptRows.value)));

// TreeSelect 的 v-model 是 {key:true} 选择映射，这里适配回 string|null
const deptSelection = computed<Record<string, boolean> | null>(() =>
  form.cDepartment ? { [form.cDepartment]: true } : null,
);

function onDeptSelection(keys: Record<string, boolean> | null) {
  form.cDepartment = keys ? (Object.keys(keys).find((k) => keys[k]) ?? null) : null;
}

const statusOptions = [
  { label: "启用", value: "1" },
  { label: "禁用", value: "0" },
];

watch(
  () => props.open,
  async (open) => {
    if (!open) return;
    deptRows.value = await departmentApi.queryAllDepartments();
    const e = props.editing;
    form.id = e?.id ?? "";
    form.cUserName = e?.cUserName ?? `用户${Math.floor(Math.random() * 10000)}`;
    form.cPhone = e?.cPhone ?? "";
    form.cEmail = e?.cEmail ?? "";
    form.cUserType = e?.cUserType ?? UserType.Nomral;
    form.cSex = e?.cSex || SEXES[0];
    form.cStatus = e?.cStatus || "1";
    form.cMaster = (e?.cMaster ?? "0") === "1";
    form.cDepartment =
      typeof (e ? e.cDepartment : props.presetDeptId) === "string"
        ? ((e ? e.cDepartment : props.presetDeptId) as string)
        : null;
    form.cPost = e?.cPost ?? "";
    form.cPosition = e?.cPosition ?? "";
    form.cEducation = e?.cEducation || null;
    form.cNation = e?.cNation || null;
    form.cNativePlace = e?.cNativePlace || null;
    form.cPoliticsStatus = e?.cPoliticsStatus || null;
    form.cIdCardNo = e?.cIdCardNo ?? "";
    form.cSbcard = e?.cSbcard ?? "";
  },
);

function onSave() {
  if (!form.id.trim() || !form.cUserName.trim()) {
    emit("invalid", "必须填写登录名和用户名");
    return;
  }
  emit("save", {
    ...(props.editing ?? { selected: false }),
    id: props.editing?.id ?? form.id.trim(),
    cUserName: form.cUserName.trim(),
    cUserType: form.cUserType,
    cPhone: form.cPhone.trim(),
    cSex: form.cSex,
    cEmail: form.cEmail.trim(),
    cStatus: form.cStatus,
    cMaster: form.cMaster ? "1" : "0",
    creator: props.editing?.creator ?? "",
    createTime: props.editing?.createTime ?? "",
    lastModifier: props.editing?.lastModifier ?? "",
    lastModifyTime: props.editing?.lastModifyTime ?? "",
    cTimestamp: props.editing?.cTimestamp ?? "",
    cDepartment: form.cDepartment ?? undefined,
    cPost: form.cPost.trim(),
    cPosition: form.cPosition.trim(),
    cEducation: form.cEducation ?? "",
    cNativePlace: form.cNativePlace ?? "",
    cPoliticsStatus: form.cPoliticsStatus ?? "",
    cNation: form.cNation ?? "",
    cIdCardNo: form.cIdCardNo.trim(),
    cSbcard: form.cSbcard.trim(),
  });
}
</script>

<template>
  <Dialog
    :visible="open"
    modal
    :header="editing ? '编辑用户信息' : '添加用户'"
    :style="{ width: 'min(36rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)"
  >
    <div class="min-w-0 space-y-4 py-1">
      <!-- 基本信息：双列布局 -->
      <div class="min-w-0 space-y-2">
        <div class="text-xs font-medium text-muted-foreground">基本信息</div>
        <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground"
              >登录名<span class="ml-0.5 text-destructive">*</span></label
            >
            <InputText
              v-model="form.id"
              :disabled="!!editing"
              placeholder="请输入登录名"
              autofocus
              autocapitalize="off"
              spellcheck="false"
              class="w-full min-w-0"
              @keydown.enter="onSave"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground"
              >用户名<span class="ml-0.5 text-destructive">*</span></label
            >
            <InputText
              v-model="form.cUserName"
              placeholder="请输入用户名"
              autocapitalize="off"
              spellcheck="false"
              class="w-full min-w-0"
              @keydown.enter="onSave"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">手机</label>
            <InputText
              v-model="form.cPhone"
              placeholder="请输入手机号"
              autocapitalize="off"
              spellcheck="false"
              class="w-full min-w-0"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">邮箱</label>
            <InputText
              v-model="form.cEmail"
              placeholder="请输入邮箱"
              autocapitalize="off"
              spellcheck="false"
              class="w-full min-w-0"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">用户类型</label>
            <Select
              v-model="form.cUserType"
              :options="USER_TYPES"
              option-label="label"
              option-value="value"
              placeholder="-请选择-"
              class="w-full min-w-0"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">性别</label>
            <Select v-model="form.cSex" :options="SEXES" placeholder="-请选择-" class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">状态</label>
            <Select
              v-model="form.cStatus"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              class="w-full min-w-0"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs font-medium text-muted-foreground">管理者</label>
            <div class="flex h-8 items-center">
              <ToggleSwitch v-model="form.cMaster" />
            </div>
          </div>
        </div>
      </div>

      <!-- 其他信息：弱化独立区块 -->
      <div class="min-w-0 rounded-md border border-border/60 bg-muted/30 p-3">
        <div class="mb-2 text-xs font-medium text-muted-foreground">其他信息</div>
        <div class="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
          <div class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">部门</label>
            <TreeSelect
              :model-value="deptSelection"
              @update:model-value="onDeptSelection"
              :options="deptTreeNodes"
              placeholder="-请选择-"
              filter
              show-clear
              class="w-full min-w-0"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">岗位</label>
            <InputText v-model="form.cPost" class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">职务</label>
            <InputText v-model="form.cPosition" class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">教育程度</label>
            <Select
              v-model="form.cEducation"
              :options="EDUS"
              placeholder="-请选择-"
              show-clear
              class="w-full min-w-0"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">民族</label>
            <Select
              v-model="form.cNation"
              :options="NATIONS"
              placeholder="-请选择-"
              show-clear
              class="w-full min-w-0"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">籍贯</label>
            <Select
              v-model="form.cNativePlace"
              :options="PROVINCES"
              placeholder="-请选择-"
              show-clear
              filter
              class="w-full min-w-0"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">政治面貌</label>
            <Select
              v-model="form.cPoliticsStatus"
              :options="POLITICS"
              placeholder="-请选择-"
              show-clear
              class="w-full min-w-0"
            />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">身份证</label>
            <InputText v-model="form.cIdCardNo" class="w-full min-w-0" />
          </div>

          <div class="min-w-0 space-y-1">
            <label class="text-xs text-muted-foreground/80">社保号</label>
            <InputText v-model="form.cSbcard" class="w-full min-w-0" />
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="确定" variant="outlined" @click="onSave" />
    </template>
  </Dialog>
</template>
