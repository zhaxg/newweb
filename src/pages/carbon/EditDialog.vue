<script setup lang="ts">
/**
 * 通用新增/编辑表单弹窗（spec 驱动）。
 *
 * 提交**只插桩**：调 `writeFn`，mock 回成功信封但不落库、不校验——本次约定「只 mock 查询，增删改只插桩」。
 *
 * 布局用**标签在上**而不是左右并排：线上表单标签长度从「年度」(2字) 到「检定/校准频次」(7字)，
 * 左右并排就得给 label 选一个 w-*，而 ui-rules 的 label 宽度硬规则要求**同一页内全部同一个值**
 * （查询条件区已经用 w-16），弹窗里再放宽一档就会和查询区起点对不齐。
 * 标签在上则没有这个约束，且与 admin/user/UserEditDialog.vue 的既有写法一致。
 */
import { reactive, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import DatePicker from "primevue/datepicker";
import { useToast } from "@/composables/useToast";
import type { EditField } from "./listTypes";

const props = defineProps<{
  open: boolean;
  title?: string;
  fields: EditField[];
  /** 编辑时的行数据（新增为 null） */
  row?: Record<string, any> | null;
  writeFn?: (data: Record<string, any>) => Promise<unknown>;
}>();

const emit = defineEmits<{ "update:open": [value: boolean]; done: [] }>();

const { toast } = useToast();
const form = reactive<Record<string, any>>({});
const saving = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    for (const f of props.fields) form[f.key] = props.row?.[f.key] ?? (f.kind === "number" ? null : "");
  },
);

/** 第一个可聚焦控件标 autofocus（ui-rules R5：表单弹窗标首个可用输入框，不标会被 disabled 的） */
const firstFocusKey = () => props.fields.find((f) => f.kind !== "textarea")?.key;

async function confirm() {
  if (!props.writeFn) {
    emit("update:open", false);
    return;
  }
  // select 存的是展示文案，落库前按 valueMap 翻回行里的编码（否则写进字典序号字段的是中文名）
  const payload: Record<string, any> = { ...form };
  for (const f of props.fields) {
    if (f.kind === "select" && f.valueMap && payload[f.key] != null && payload[f.key] !== "") {
      payload[f.key] = f.valueMap[String(payload[f.key])] ?? payload[f.key];
    }
  }
  saving.value = true;
  try {
    await props.writeFn(payload);
  } catch {
    return; // 拦截层已 toast
  } finally {
    saving.value = false;
  }
  emit("update:open", false);
  emit("done");
  toast("保存成功", 2000, "success");
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
      <div
        v-for="f in fields"
        :key="f.key"
        class="min-w-0 space-y-1"
        :class="f.kind === 'textarea' ? 'sm:col-span-2' : ''"
      >
        <label class="text-xs text-muted-foreground">{{ f.label }}</label>

        <div v-if="f.kind === 'input'" class="flex min-w-0 items-center gap-2">
          <InputText v-model="form[f.key]" class="min-w-0 flex-1" :autofocus="f.key === firstFocusKey()" />
          <span v-if="f.unit" class="shrink-0 text-xs text-muted-foreground">{{ f.unit }}</span>
        </div>

        <Textarea v-else-if="f.kind === 'textarea'" v-model="form[f.key]" rows="3" class="min-w-0 w-full" />

        <Select
          v-else-if="f.kind === 'select'"
          v-model="form[f.key]"
          :options="f.options ?? []"
          show-clear
          placeholder="请选择"
          class="min-w-0 w-full"
          :autofocus="f.key === firstFocusKey()"
        />

        <DatePicker
          v-else-if="f.kind === 'date'"
          v-model="form[f.key]"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-icon
          class="min-w-0 w-full"
          :autofocus="f.key === firstFocusKey()"
        />

        <div v-else class="flex min-w-0 items-center gap-2">
          <div class="min-w-0 flex-1">
            <InputNumber v-model="form[f.key]" :show-buttons="false" fluid :autofocus="f.key === firstFocusKey()" />
          </div>
          <span v-if="f.unit" class="shrink-0 text-xs text-muted-foreground">{{ f.unit }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="确定" :loading="saving" @click="confirm" />
    </template>
  </Dialog>
</template>
