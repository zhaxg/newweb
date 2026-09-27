<script setup lang="ts">
/**
 * 通用表单弹窗：**编辑实体**与**动作表单**共用一个组件。
 *
 * 为什么不拆成两个：本域的动作绝大多数要收一个入参才能执行——转调度令要选接收人、
 * 实绩校正要填新值和原因、补录要填建议值、加减负荷要填指令。它们的 UI 与「编辑一条记录」
 * 完全是同一件事（几栏字段 + 确定/取消），拆成两个组件就是两份要各自维护的对齐、焦点、日期换算规则。
 * 区别只在提交去哪：编辑走 `spec.writeFn`（带行 id），动作走 `act.run(row, form)`。
 * 本组件不知道也不关心这个差别——`submit` 是个函数，返回值交给 `applyResult` 判成功/业务拒绝。
 *
 * 布局用**标签在上**而不是左右并排：字段名长度从「介质」(2字) 到「是否纳入能源平衡表」(9字)，
 * 左右并排就得选一个 label 宽度，而 ui-rules 的 label 宽度硬规则要求同一页内全部同值
 * （查询条件区已经占掉一档），弹窗再放宽一档就会和查询区起点对不齐。
 * 标签在上没有这个约束，且与平台既有编辑弹窗的写法一致。
 */
import { reactive, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import ToggleSwitch from "primevue/toggleswitch";
import DatePicker from "primevue/datepicker";
import { useToast } from "@/composables/useToast";
import { applyResult } from "./rowActions";
import { pickDate, toDate } from "./dateField";
import type { EditField } from "./listTypes";

const props = defineProps<{
  open: boolean;
  title?: string;
  fields: EditField[];
  /** 编辑时的行数据（新增/动作表单为 null） */
  row?: Record<string, any> | null;
  /** 提交：回 `ActionResult` 时由下面的 `applyResult` 判业务拒绝 */
  submit: (payload: Record<string, any>) => Promise<unknown>;
  /** 成功兜底文案（后端给了具体 msg 时优先用后端的） */
  okMsg?: string;
  /** 主按钮文字 */
  actionLabel?: string;
}>();

const emit = defineEmits<{ "update:open": [value: boolean]; done: [] }>();

const { toast } = useToast();
const form = reactive<Record<string, any>>({});
const saving = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    for (const f of props.fields) {
      const raw = props.row?.[f.key] ?? f.initial;
      if (f.kind === "date") {
        // 日期字段回填要转 Date，否则日历显示不出来（见 dateField.ts 文件头）
        form[f.key] = toDate(raw);
        continue;
      }
      /**
       * select 落库存的是**编码**（`unitId: "EU-0301"`），而 `options` 是给人读的文案
       * （「7#高炉」）。提交时按 `valueMap` 文案→编码翻过去，
       * 回填就得反向查回来——不反查的话编辑弹窗里下拉是**空的**，用户以为没选就直接保存，
       * 把归属单元改没了。`multi` 是同一件事的数组版（字段值本身就是编码数组，如
       * `UsingUnit.mediaCodes`），逐元素翻。
       */
      const v = f.valueMap && (f.kind === "select" || f.kind === "multi") ? toLabels(f, raw) : raw;
      // multi 的值本来就是字符串数组（AlarmRule.receivers/channels），兜底给空数组而不是空串：MultiSelect 拿到 "" 会当备选项渲染
      form[f.key] = v ?? (f.kind === "multi" ? [] : f.kind === "number" ? null : f.kind === "bool" ? false : "");
    }
  },
);

/** 第一个可聚焦控件标 autofocus（R5：表单弹窗标首个可用输入框，不标会被 disabled 的） */
const firstFocusKey = () => (props.fields.find((f) => f.kind !== "textarea") ?? props.fields[0])?.key;

/** 落库值 → 下拉文案（找不到映射就原样返回：字典缺行时宁可显示编码，不能显示空） */
function toLabels(f: EditField, stored: unknown) {
  const map = f.valueMap!;
  const one = (x: unknown) => Object.keys(map).find((k) => map[k] === String(x)) ?? x;
  return Array.isArray(stored) ? stored.map(one) : stored === undefined ? undefined : one(stored);
}

/** 下拉文案 → 落库值；空值原样送出（清空的 select 该送空，而不是翻成 `undefined` 字符串） */
function toStored(f: EditField, label: unknown) {
  const map = f.valueMap!;
  const one = (x: unknown) => (x === "" || x === null || x === undefined ? x : (map[String(x)] ?? x));
  return Array.isArray(label) ? label.map(one) : one(label);
}

function isFull(f: EditField) {
  return f.kind === "textarea" || f.full === true;
}

async function confirm() {
  const payload: Record<string, any> = { ...form };
  for (const f of props.fields) {
    if (f.kind === "date") {
      payload[f.key] = pickDate(payload[f.key], f.withTime === true);
      continue;
    }
    // select / multi 存的是展示文案，落库前按 valueMap 翻回行里的编码/布尔
    if (f.valueMap && (f.kind === "select" || f.kind === "multi")) {
      payload[f.key] = toStored(f, payload[f.key]);
    }
  }
  saving.value = true;
  let res: unknown;
  try {
    res = await props.submit(payload);
  } catch {
    saving.value = false;
    return; // 拦截层已 toast
  }
  saving.value = false;
  if (!applyResult(res, props.okMsg ?? "保存成功", toast)) return; // 业务拒绝：留着弹窗让用户改
  emit("update:open", false);
  emit("done");
}
</script>

<template>
  <Dialog
    :visible="open"
    modal
    :header="title ?? '新增'"
    :style="{ width: 'min(38rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)"
  >
    <div class="grid grid-cols-1 gap-x-4 gap-y-3 py-1 sm:grid-cols-2">
      <div v-for="f in fields" :key="f.key" class="min-w-0 space-y-1" :class="isFull(f) ? 'sm:col-span-2' : ''">
        <label class="text-xs text-muted-foreground">{{ f.label }}</label>

        <div v-if="f.kind === 'input'" class="flex min-w-0 items-center gap-2">
          <InputText
            v-model="form[f.key]"
            :placeholder="f.placeholder"
            class="min-w-0 flex-1"
            :autofocus="f.key === firstFocusKey()"
          />
          <span v-if="f.unit" class="shrink-0 text-xs text-muted-foreground">{{ f.unit }}</span>
        </div>

        <Textarea
          v-else-if="f.kind === 'textarea'"
          v-model="form[f.key]"
          rows="3"
          :placeholder="f.placeholder"
          class="min-w-0 w-full"
        />

        <Select
          v-else-if="f.kind === 'select'"
          v-model="form[f.key]"
          :options="f.options ?? []"
          show-clear
          :placeholder="f.placeholder ?? '请选择'"
          class="min-w-0 w-full"
          :autofocus="f.key === firstFocusKey()"
        />

        <!-- 多选：报警接收人、通知渠道这类「行里就是数组」的字段，用 select 会把它写成字符串 -->
        <MultiSelect
          v-else-if="f.kind === 'multi'"
          v-model="form[f.key]"
          :options="f.options ?? []"
          :placeholder="f.placeholder ?? '可多选'"
          class="min-w-0 w-full"
          :autofocus="f.key === firstFocusKey()"
        />

        <DatePicker
          v-else-if="f.kind === 'date'"
          v-model="form[f.key]"
          :manual-input="false"
          date-format="yy-mm-dd"
          :show-time="f.withTime"
          :hour-format="f.withTime ? '24' : undefined"
          show-icon
          :placeholder="f.placeholder"
          class="min-w-0 w-full"
          :autofocus="f.key === firstFocusKey()"
        />

        <!-- 布尔开关直接绑真值：select 翻成 "true"/"false" 字符串会把布尔列写脏（saveRow 原样落库） -->
        <div v-else-if="f.kind === 'bool'" class="flex min-w-0 items-center gap-2">
          <ToggleSwitch v-model="form[f.key]" :autofocus="f.key === firstFocusKey()" />
          <span class="text-xs text-muted-foreground">{{ form[f.key] ? "是" : "否" }}</span>
        </div>

        <div v-else class="flex min-w-0 items-center gap-2">
          <!-- InputNumber 的 class 管不住 input 的 intrinsic 宽，必须外层容器 + fluid（ui-rules §6） -->
          <div class="min-w-0 flex-1">
            <InputNumber
              v-model="form[f.key]"
              :show-buttons="false"
              fluid
              :placeholder="f.placeholder"
              :autofocus="f.key === firstFocusKey()"
            />
          </div>
          <span v-if="f.unit" class="shrink-0 text-xs text-muted-foreground">{{ f.unit }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button :label="actionLabel ?? '确定'" :loading="saving" @click="confirm" />
    </template>
  </Dialog>
</template>
