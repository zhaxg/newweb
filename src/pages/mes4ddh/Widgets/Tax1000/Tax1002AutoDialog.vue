<script setup lang="ts">
import { reactive, watch } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import Select from "primevue/select";

/** 对应 FrmTax1002（自动排班）：画面迁移，逻辑不迁移 */

const props = defineProps<{ open: boolean }>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [
    input: {
      cfg: string;
      startDate: Date | null;
      firstShiftIndex: string;
      firstGroupIndex: string;
      stopDate: Date | null;
    },
  ];
}>();

const form = reactive({
  cfg: "",
  startDate: null as Date | null,
  firstShiftIndex: "",
  firstGroupIndex: "",
  stopDate: null as Date | null,
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    Object.assign(form, { cfg: "", startDate: null, firstShiftIndex: "", firstGroupIndex: "", stopDate: null });
  },
);

function onSubmit() {
  emit("submit", { ...form });
}
</script>

<template>
  <Dialog
    :visible="open"
    modal
    header="自动排班"
    :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)"
  >
    <div class="min-w-0 space-y-3 py-1">
      <div class="grid grid-cols-1 gap-x-4 gap-y-3">
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">选择排班配置</label>
          <Select v-model="form.cfg" :options="[]" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">排班开始时间</label>
          <DatePicker
            v-model="form.startDate"
            show-time
            hour-format="24"
            date-format="yy-mm-dd"
            class="w-full min-w-0"
            input-class="w-full"
          />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">排班开始班次</label>
          <Select v-model="form.firstShiftIndex" :options="[]" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">排班开始班组</label>
          <Select v-model="form.firstGroupIndex" :options="[]" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">排班结束时间</label>
          <DatePicker
            v-model="form.stopDate"
            show-time
            hour-format="24"
            date-format="yy-mm-dd"
            class="w-full min-w-0"
            input-class="w-full"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="确定" variant="outlined" @click="onSubmit" />
    </template>
  </Dialog>
</template>
