<script setup lang="ts">
import { reactive, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";

/** 对应 FrmTax1001（编辑）：画面迁移，逻辑不迁移 */

interface ShiftGroupConfig {
  cPlantId?: string;
  cLineNo?: string;
  cProcCd?: string;
  cWorkshop?: string;
  cMachineId?: string;
}

const props = defineProps<{
  open: boolean;
  config: ShiftGroupConfig | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [config: ShiftGroupConfig];
}>();

const form = reactive<ShiftGroupConfig>({
  cPlantId: "",
  cLineNo: "",
  cProcCd: "",
  cWorkshop: "",
  cMachineId: "",
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    Object.assign(form, props.config ?? { cPlantId: "", cLineNo: "", cProcCd: "", cWorkshop: "", cMachineId: "" });
  },
);

function onSubmit() {
  emit("submit", { ...form });
}
</script>

<template>
  <Dialog :visible="open" modal header="编辑" :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)">
    <div class="min-w-0 space-y-3 py-1">
      <div class="grid grid-cols-1 gap-x-4 gap-y-3">
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">选择机台</label>
          <InputText v-model="form.cMachineId" placeholder="请输入机台" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">工厂</label>
          <Select v-model="form.cPlantId" :options="[]" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">产线</label>
          <Select v-model="form.cLineNo" :options="[]" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">工序</label>
          <Select v-model="form.cProcCd" :options="[]" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">车间</label>
          <Select v-model="form.cWorkshop" :options="[]" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">机台</label>
          <Select v-model="form.cMachineId" :options="[]" class="w-full min-w-0" />
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="确定" variant="outlined" @click="onSubmit" />
    </template>
  </Dialog>
</template>
