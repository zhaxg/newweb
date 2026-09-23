<script setup lang="ts">
/** 对应 FrmMS2010_TS_InOrOutTime（铁包到达/离开 时间称重弹窗）：DDH.Winforms.SMS.Forms.FrmMS2010_TS_InOrOutTime
 *  随主窗 FrmMS2010 迁移（承接 updateTBInOrOutStation 入参组装）：字段、禁用侧、净重联动、测温解析照抄 .cs
 *  mode=In 标题「铁包到达」（离厂侧禁用）；mode=Out 标题「铁包离开」（进厂侧禁用）；
 *  确定回写：进厂时间/毛重时间/毛重恒写，Out 侧另写离厂时间/皮重时间/皮重+净重，测温可解析时回写 */
import { reactive, watch } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";

type Row = Record<string, any>;

const props = defineProps<{
  open: boolean;
  mode: "In" | "Out";
  row: Row | null;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  ok: [row: Row];
}>();

const form = reactive({
  cPotNo: "",
  cCarNo: "",
  cIronNo: "",
  dIn: null as Date | null,
  dOut: null as Date | null,
  nIn: 0,
  nOut: 0,
  nWgt: 0,
  temp: "",
});

function parseTs(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}
function fmtTs(d: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

watch(
  () => props.open,
  (open) => {
    if (!open || !props.row) return;
    const r = props.row;
    form.cPotNo = r.cPotNo ?? "";
    form.cCarNo = r.cCarNo ?? "";
    form.cIronNo = r.cIronNo ?? "";
    /* 原构造：deIn/deOut 默认取行上计量时间，缺省 Now；称重取行值，净重初值 = NLgWgt */
    form.dIn = parseTs(r.dLgWgtMzTime) ?? new Date();
    form.dOut = parseTs(r.dLgWgtPzTime) ?? new Date();
    form.nIn = r.nLgWgtMz ?? 0;
    form.nOut = r.nLgWgtPz ?? 0;
    form.nWgt = r.nLgWgt ?? 0;
    form.temp = r.nLgTemperature != null ? String(r.nLgTemperature) : "";
  },
);

/** speInWgt/speOutWgt.EditValueChanged → UpdateWgt：净重 = 进厂称重 - 离厂称重 */
function onWgtChange() {
  form.nWgt = (form.nIn ?? 0) - (form.nOut ?? 0);
}

/** btnQuery_Click（确定）：按 _state 回写字段，文案逻辑照 .cs */
function onOk() {
  const r: Row = { ...(props.row ?? {}) };
  r.dTbInTime = fmtTs(form.dIn);
  r.dLgWgtMzTime = r.dTbInTime;
  r.nLgWgtMz = form.nIn;
  if (props.mode === "Out") {
    r.dTbOutTime = fmtTs(form.dOut);
    r.dLgWgtPzTime = r.dTbOutTime;
    r.nLgWgtPz = form.nOut;
    r.nLgWgt = form.nWgt;
  }
  if (form.temp.trim()) {
    const n = Number(form.temp.trim());
    if (!Number.isNaN(n)) r.nLgTemperature = n;
  }
  emit("ok", r);
}
</script>

<template>
  <Dialog
    :visible="open"
    :header="mode === 'In' ? '铁包到达' : '铁包离开'"
    modal
    :style="{ width: 'min(34rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)"
  >
    <div class="min-w-0 py-1">
      <div class="grid grid-cols-2 gap-x-4 gap-y-3">
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">罐号</label>
          <InputText :model-value="form.cPotNo" disabled class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">运载车号</label>
          <InputText :model-value="form.cCarNo" disabled class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">铁次号</label>
          <InputText :model-value="form.cIronNo" disabled class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">钢厂测温</label>
          <InputText v-model="form.temp" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">钢厂进厂时间</label>
          <DatePicker
            v-model="form.dIn"
            :disabled="mode === 'Out'"
            :manual-input="false"
            show-time
            hour-format="24"
            date-format="yy-mm-dd"
            show-icon
            class="w-full min-w-0"
          />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">钢厂进厂称重</label>
          <InputNumber
            v-model="form.nIn"
            :disabled="mode === 'Out'"
            :show-buttons="false"
            :min-fraction-digits="0"
            :max-fraction-digits="3"
            fluid
            class="w-full min-w-0"
          />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">钢厂离厂时间</label>
          <DatePicker
            v-model="form.dOut"
            :disabled="mode === 'In'"
            :manual-input="false"
            show-time
            hour-format="24"
            date-format="yy-mm-dd"
            show-icon
            class="w-full min-w-0"
          />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">钢厂离厂称重</label>
          <InputNumber
            v-model="form.nOut"
            :disabled="mode === 'In'"
            :show-buttons="false"
            :min-fraction-digits="0"
            :max-fraction-digits="3"
            fluid
            class="w-full min-w-0"
            @update:model-value="onWgtChange"
          />
        </div>
        <div class="col-span-2 min-w-0 space-y-1">
          <label class="text-xs text-muted-foreground">钢厂计量净重</label>
          <InputNumber
            v-model="form.nWgt"
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
