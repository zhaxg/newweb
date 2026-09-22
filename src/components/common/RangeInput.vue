<script setup lang="ts">
import { computed, ref } from "vue";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Popover from "primevue/popover";
import Button from "primevue/button";

const min = defineModel<number | null>("min");
const max = defineModel<number | null>("max");

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    disabled?: boolean;
    // InputNumber 常用参数透传
    showButtons?: boolean;
    mode?: "decimal" | "currency" | "percent";
    minFractionDigits?: number;
    maxFractionDigits?: number;
    min?: number;
    max?: number;
    step?: number;
    incrementButtonClass?: string;
    decrementButtonClass?: string;
    inputClass?: string;
    locale?: string;
    currency?: string;
    prefix?: string;
    suffix?: string;
    useGrouping?: boolean;
    readonly?: boolean;
    invalid?: boolean;
    form?: string;
    ariaLabel?: string;
  }>(),
  {
    placeholder: "最小 ~ 最大",
    disabled: false,
    showButtons: false,
    mode: "decimal",
    minFractionDigits: 1,
    maxFractionDigits: 2,
    useGrouping: true,
  },
);

const op = ref();
const draftMin = ref<number | null>(null);
const draftMax = ref<number | null>(null);

const displayText = computed(() => {
  if (min.value == null && max.value == null) return "";
  const lo = min.value != null ? String(min.value) : "最小";
  const hi = max.value != null ? String(max.value) : "最大";
  return `${lo} ~ ${hi}`;
});

// InputNumber 透传的公共 props
const inputNumberProps = computed(() => ({
  mode: props.mode,
  showButtons: props.showButtons,
  minFractionDigits: props.minFractionDigits,
  maxFractionDigits: props.maxFractionDigits,
  min: props.min,
  max: props.max,
  step: props.step,
  locale: props.locale,
  currency: props.currency,
  prefix: props.prefix,
  suffix: props.suffix,
  useGrouping: props.useGrouping,
  readonly: props.readonly,
  invalid: props.invalid,
  form: props.form,
  inputClass: props.inputClass,
  incrementButtonClass: props.incrementButtonClass,
  decrementButtonClass: props.decrementButtonClass,
}));

function toggle(event: MouseEvent) {
  if (props.disabled) return;
  draftMin.value = min.value;
  draftMax.value = max.value;
  op.value.toggle(event);
}

function confirm() {
  min.value = draftMin.value;
  max.value = draftMax.value;
  op.value.hide();
}

function clear() {
  min.value = null;
  max.value = null;
  draftMin.value = null;
  draftMax.value = null;
  op.value.hide();
}
</script>

<template>
  <div class="flex min-w-0 items-center">
    <!-- 触发框：只读显示范围文本 -->
    <InputText :model-value="displayText" :placeholder="placeholder" readonly class="w-full cursor-pointer"
      :disabled="disabled" @click="toggle" />

    <!-- 弹层面板：双 InputNumber 编辑 -->
    <Popover ref="op" class="w-72">
      <div class="flex flex-col gap-3 p-2">
        <div class="flex items-center gap-2">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">最小</label>
          <InputNumber v-model="draftMin" class="min-w-0 flex-1" v-bind="inputNumberProps" />
        </div>
        <div class="flex items-center gap-2">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">最大</label>
          <InputNumber v-model="draftMax" class="min-w-0 flex-1" v-bind="inputNumberProps" />
        </div>
        <div class="flex justify-end gap-2 pt-1">
          <Button text size="small" label="清除" @click="clear" />
          <Button size="small" label="确定" @click="confirm" />
        </div>
      </div>
    </Popover>
  </div>
</template>
