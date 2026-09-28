<script setup lang="ts">
/** FrmEditLine（产线编辑）：2 项（产线号/备注），原 OnOkClick 无校验直接确定 */
import { reactive, watch } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Dialog from "primevue/dialog";
import type { EditLineDto } from "./mscVm";

const props = defineProps<{ visible: boolean; dto: EditLineDto | null }>();
const emit = defineEmits<{ "update:visible": [boolean]; ok: [EditLineDto] }>();

const form = reactive<EditLineDto>({});
watch(
  () => props.visible,
  (v) => {
    if (v) Object.assign(form, props.dto ?? {});
  },
);
function onOk() {
  emit("ok", { ...props.dto, ...form });
  emit("update:visible", false);
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    header="产线"
    :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="grid grid-cols-1 items-start gap-y-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">产线号</label>
        <InputText v-model="form.lineNo" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-start gap-1.5">
        <label class="w-20 shrink-0 pt-1.5 text-xs text-muted-foreground">备注</label>
        <Textarea v-model="form.remark" rows="3" class="min-w-0 flex-1" />
      </div>
    </div>
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:visible', false)" />
      <Button label="确定" variant="outlined" @click="onOk" />
    </template>
  </Dialog>
</template>
