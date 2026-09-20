<script setup lang="ts">
import { reactive, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { useToast } from "@/composables/useToast";
import type { HmxBackgroudJobInfo } from "@/api/admin/types";
import { HmxJobMisfiredEnums, YesNo } from "@/api/admin/enums";

const props = defineProps<{
  open: boolean;
  job: HmxBackgroudJobInfo | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [job: HmxBackgroudJobInfo];
}>();

const { toast } = useToast();

const STATUS_OPTIONS = [
  { label: "否", value: YesNo.N },
  { label: "是", value: YesNo.Y },
];

const MISFIRED_OPTIONS = [
  { label: "立即执行", value: HmxJobMisfiredEnums.ExecuteNow },
  { label: "忽略", value: HmxJobMisfiredEnums.ExecuteNext },
];

const form = reactive<HmxBackgroudJobInfo>({
  id: "",
  cName: "",
  cTrigerName: "",
  cSetupTime: "",
  cCronExp: "",
  nIntervalMinutes: 5,
  nRepetCount: -1,
  nDelayMinutes: 0,
  cNextTime: "",
  cLastTime: "",
  cLastMessage: "",
  cScheduler: "",
  cAssemblyQualifiedName: "",
  enable: YesNo.Y,
  enablePaiallel: YesNo.N,
  cFlagMisfired: HmxJobMisfiredEnums.ExecuteNow,
});

watch(
  () => props.open,
  (open) => {
    if (!open || !props.job) return;
    Object.assign(form, props.job);
  },
);

function onSubmit() {
  const job = props.job;
  if (!job) return;
  if (!form.cName?.trim()) {
    toast("请输入任务名称", 2000, "warn");
    return;
  }
  if (form.cName.trim().length < 5) {
    toast("任务名称至少 5 个字符", 2000, "warn");
    return;
  }
  if (!form.cTrigerName?.trim()) {
    toast("请输入触发器名称", 2000, "warn");
    return;
  }
  if (!form.cAssemblyQualifiedName?.trim()) {
    toast("请输入程序集限定名", 2000, "warn");
    return;
  }
  emit("submit", {
    ...job,
    ...form,
    cName: form.cName.trim(),
    cTrigerName: form.cTrigerName.trim(),
    cAssemblyQualifiedName: form.cAssemblyQualifiedName.trim(),
  });
}
</script>

<template>
  <Dialog :visible="open" modal header="编辑任务信息" :style="{ width: 'min(44rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)">
    <div class="min-w-0 space-y-3 py-1">
      <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">任务ID</label>
          <InputText :model-value="form.id" disabled class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">任务名称<span
              class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="form.cName" placeholder="请输入任务名称" autofocus autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" @keydown.enter="onSubmit" />
        </div>

        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">触发器名称<span
              class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="form.cTrigerName" placeholder="请输入触发器名称" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" @keydown.enter="onSubmit" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">Cron表达式</label>
          <InputText v-model="form.cCronExp" placeholder="请输入Cron表达式" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" @keydown.enter="onSubmit" />
        </div>

        <div class="min-w-0 space-y-1 sm:col-span-2">
          <label class="text-xs font-medium text-muted-foreground">程序集限定名<span
              class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="form.cAssemblyQualifiedName" placeholder="请输入程序集限定名" autocapitalize="off"
            spellcheck="false" class="w-full min-w-0" @keydown.enter="onSubmit" />
        </div>

        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">间隔分钟数</label>
          <InputNumber v-model="form.nIntervalMinutes" :min="0" :show-buttons="false" :use-grouping="false"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">重复次数</label>
          <InputNumber v-model="form.nRepetCount" :show-buttons="false" :use-grouping="false" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">延迟分钟数</label>
          <InputNumber v-model="form.nDelayMinutes" :min="0" :show-buttons="false" :use-grouping="false"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">允许并行</label>
          <Select v-model="form.enablePaiallel" :options="STATUS_OPTIONS" option-label="label" option-value="value"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">错过机制</label>
          <Select v-model="form.cFlagMisfired" :options="MISFIRED_OPTIONS" option-label="label" option-value="value"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">是否启用</label>
          <Select v-model="form.enable" :options="STATUS_OPTIONS" option-label="label" option-value="value"
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
