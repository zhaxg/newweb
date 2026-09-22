<script setup lang="ts">
/** 对应 FrmRescList（资源编辑）：HmxWinForms.Forms.Admin.FrmRescList
 *  画面迁移，逻辑不迁移到 */

import { reactive, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { useToast } from "@/composables/useToast";
import IconPicker from "./IconPicker.vue";
import type { HmxResTree } from "./tree-node";

const props = defineProps<{
  open: boolean;
  
  node: HmxResTree | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [node: HmxResTree];
}>();

const { toast } = useToast();

const LAYOUTS = ["LAYOUT", "BLANK", "IFRAME"];
const ENABLE_OPTIONS = [
  { value: "1", label: "启用" },
  { value: "0", label: "禁用" },
];

const form = reactive({
  id: "",
  cPid: "",
  cCode: "",
  cTitle: "",
  cName: "LAYOUT",
  cIcon: "FileText",
  cResPath: "",
  cResSubPath: "",
  cQueryString: "",
  cOrder: "999",
  cEnable: "1",
});

watch(
  () => props.open,
  (open) => {
    if (!open || !props.node) return;
    const n = props.node;
    form.id = n.id ?? "";
    form.cPid = n.cPid ?? "";
    form.cCode = n.cCode ?? "";
    form.cTitle = n.cTitle ?? "";
    form.cName = n.cName ?? "LAYOUT";
    form.cIcon = n.cIcon ?? "FileText";
    form.cResPath = n.cResPath ?? "";
    form.cResSubPath = n.cResSubPath ?? "";
    form.cQueryString = n.cQueryString ?? "";
    form.cOrder = n.cOrder ?? "999";
    form.cEnable = n.cEnable ?? "1";
  },
);

function onSubmit() {
  const node = props.node;
  if (!node) return;
  if (!form.cTitle.trim()) {
    toast("请输入资源名称！", 2000, "warn");
    return;
  }
  const { children: _children, ...rest } = node;
  emit("submit", {
    ...rest,
    id: form.id,
    cPid: form.cPid,
    cCode: form.cCode.trim().toUpperCase(),
    cTitle: form.cTitle.trim(),
    cName: form.cName,
    cIcon: form.cIcon,
    cResPath: form.cResPath.trim(),
    cResSubPath: form.cResSubPath.trim(),
    cQueryString: form.cQueryString.trim(),
    cOrder: form.cOrder.trim() || "999",
    cEnable: form.cEnable,
  });
}
</script>

<template>
  <Dialog :visible="open" modal header="资源信息" :style="{ width: 'min(40rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)">
    <div class="min-w-0 space-y-3 py-1">
      <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">ID</label>
          <InputText :model-value="form.id" disabled placeholder="[自动生成]" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">父级ID</label>
          <InputText :model-value="form.cPid" disabled placeholder="[根节点]" class="w-full min-w-0" />
        </div>

        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">图标</label>
          <IconPicker v-model="form.cIcon" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground" title="资源编码，格式为三位字母+四位数字 如TAB1234，可选">编码</label>
          <InputText v-model="form.cCode" placeholder="TAB1234" title="资源编码，格式为三位字母+四位数字 如TAB1234，可选"
            maxlength="7" autocapitalize="characters" spellcheck="false" class="w-full min-w-0"
            @keydown.enter="onSubmit" />
        </div>

        <div class="min-w-0 space-y-1 sm:col-span-2">
          <label class="text-xs font-medium text-muted-foreground">资源名称<span
              class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="form.cTitle" placeholder="请输入资源名称" autofocus autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" @keydown.enter="onSubmit" />
        </div>

        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground" title="非具体页面路由: 默认提供了LAYOUT、BLANK、IFRAME三种类型">布局类型</label>
          <Select v-model="form.cName" :options="LAYOUTS"
            title="非具体页面路由: 默认提供了LAYOUT、BLANK、IFRAME三种类型" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground" title="由树结构生成路由地址，只填写当前路由节点的名称，不带 / 符号">路由名称</label>
          <InputText v-model="form.cResPath" placeholder="请输入路由名称" title="由树结构生成路由地址，只填写当前路由节点的名称，不带 / 符号"
            autocapitalize="off" spellcheck="false" class="w-full min-w-0" @keydown.enter="onSubmit" />
        </div>

        <div class="min-w-0 space-y-1 sm:col-span-2">
          <label class="text-xs font-medium text-muted-foreground" title="vue文件的地址。外部链接填写URL, 跳转填写路由名称=_blank">组件路径</label>
          <InputText v-model="form.cResSubPath" placeholder="请输入组件路径" title="vue文件的地址。外部链接填写URL, 跳转填写路由名称=_blank"
            autocapitalize="off" spellcheck="false" class="w-full min-w-0" @keydown.enter="onSubmit" />
        </div>

        <div class="min-w-0 space-y-1 sm:col-span-2">
          <label class="text-xs font-medium text-muted-foreground" title="在构造函数后注入。举例：name=zhaxg&pawd=234">注入参数</label>
          <InputText v-model="form.cQueryString" placeholder="name=xx&pawd=xx" title="在构造函数后注入。举例：name=zhaxg&pawd=234"
            autocapitalize="off" spellcheck="false" class="w-full min-w-0" @keydown.enter="onSubmit" />
        </div>

        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">排序</label>
          <InputText v-model="form.cOrder" type="number" min="0" class="w-full min-w-0" @keydown.enter="onSubmit" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">是否启用</label>
          <Select v-model="form.cEnable" :options="ENABLE_OPTIONS" option-label="label" option-value="value"
            class="w-full min-w-0" />
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="保存" variant="outlined" @click="onSubmit" />
    </template>
  </Dialog>
</template>
