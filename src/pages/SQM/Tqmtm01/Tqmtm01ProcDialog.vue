<script setup lang="ts">
/** FrmEditProc（工序编辑）：工序(PROC_CODE 字典)/顺序号/备注；确定时「工序不能为空」，ProcName=工序字典文本 */
import { reactive, ref, watch } from "vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import { systemKeyValueApi } from "@/api/admin/request";
import type { EditProcDto } from "./mscVm";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ visible: boolean; dto: EditProcDto | null }>();
const emit = defineEmits<{ "update:visible": [boolean]; ok: [EditProcDto] }>();
const { toast } = useToast();

type Opt = { label: string; value: string };
const form = reactive<EditProcDto>({});
const procOptions = ref<Opt[]>([]);
const err = ref("");

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    err.value = "";
    Object.assign(form, props.dto ?? {});
    if (!procOptions.value.length) {
      try {
        const list = (await systemKeyValueApi.querySysKvItemList("A0100:PROC_CODE")) ?? [];
        procOptions.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
      } catch {
        /* 拦截层已 toast */
      }
    }
  },
);

function onOk() {
  if (!form.procCd?.trim()) {
    err.value = "工序不能为空";
    return;
  }
  const label = procOptions.value.find((x) => x.value === form.procCd)?.label ?? "";
  emit("ok", { ...form, procName: label });
  emit("update:visible", false);
}
</script>

<template>
  <Dialog :visible="props.visible" modal header="工序" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)">
    <div class="grid grid-cols-1 items-start gap-y-2">
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">工序</label>
          <Select :model-value="form.procCd ?? null" :options="procOptions" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="工序" class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => { form.procCd = v; err = ''; }" />
        </div>
        <p v-if="err" class="mt-0.5 pl-[5.375rem] text-xs text-destructive">{{ err }}</p>
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">顺序号</label>
        <InputNumber v-model="form.seq" :use-grouping="false" class="min-w-0 flex-1" show-buttons :step="10" />
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
