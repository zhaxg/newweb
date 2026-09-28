<script setup lang="ts">
/** 对应 FrmMS2030_FG_Edit（编辑废钢配料数据）：DDH.Winforms.SMS.Forms.FrmMS2030_FG_Edit
 *  随主窗 FrmMS2030_FG 迁移（承接 frmMS2030Api.save 的入参组装）：字段/校验文案照抄 .cs
 *  使用工厂候选 = LineConst.炼钢一厂(LG01)/炼钢二厂(LG02)，传入 lineCode 时回显并禁用（原 ucLine1.Enabled=false） */
import { reactive, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();

const props = defineProps<{
  open: boolean;
  lineCode: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  confirm: [info: { cContainerNo: string; nWgtWG: number; nWgtZC: number; cUseFactory: string | undefined }];
}>();

/* ucLine1.ShowLines = [LineConst.炼钢一厂, LineConst.炼钢二厂] */
const FACTORY_OPTIONS = [
  { label: "炼钢一厂", value: "LG01" },
  { label: "炼钢二厂", value: "LG02" },
];

const form = reactive({
  cUseFactory: "",
  cContainerNo: "",
  nWgtWG: null as number | null,
  nWgtZC: null as number | null,
});

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    form.cUseFactory = props.lineCode || "";
    form.cContainerNo = "";
    form.nWgtWG = null;
    form.nWgtZC = null;
  },
);

/** btnOK_Click：斗号不得为空；外购/自循环重量不得同时为 0（文案照抄） */
function onOk() {
  const wg = form.nWgtWG ?? 0;
  const zc = form.nWgtZC ?? 0;
  if (!form.cContainerNo.trim()) {
    toast("禁止操作，废钢斗号不得为空！", 2500, "warn");
    return;
  }
  if (wg === 0 && zc === 0) {
    toast("禁止操作，外购废钢和自循环废钢的重量不得同时为0！", 2500, "warn");
    return;
  }
  emit("confirm", {
    cContainerNo: form.cContainerNo.trim(),
    nWgtWG: wg,
    nWgtZC: zc,
    cUseFactory: form.cUseFactory || undefined,
  });
}
</script>

<template>
  <Dialog
    :visible="open"
    modal
    header="编辑废钢配料数据"
    :style="{ width: 'min(30rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)"
  >
    <div class="min-w-0 py-1">
      <div class="grid grid-cols-1 gap-x-4 gap-y-3">
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">使用工厂</label>
          <Select
            v-model="form.cUseFactory"
            :options="FACTORY_OPTIONS"
            option-label="label"
            option-value="value"
            :disabled="!!lineCode"
            class="w-full min-w-0"
          />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">废钢斗号</label>
          <InputText v-model="form.cContainerNo" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">外购废钢(吨)</label>
          <InputNumber
            v-model="form.nWgtWG"
            :min="0"
            :show-buttons="false"
            :min-fraction-digits="0"
            :max-fraction-digits="3"
            fluid
            class="w-full min-w-0"
          />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">自循环废钢(吨)</label>
          <InputNumber
            v-model="form.nWgtZC"
            :min="0"
            :show-buttons="false"
            :min-fraction-digits="0"
            :max-fraction-digits="3"
            fluid
            class="w-full min-w-0"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="确定" variant="outlined" @click="onOk" />
    </template>
  </Dialog>
</template>
