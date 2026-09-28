<script setup lang="ts">
/** BatchIdInput — 批量编号录入（原 WinForms MemoExEdit 弹出多行编辑）
 *  来源样例：FrmHR2000 批量计划号；HR5310/MP2016/MS9010 等同构控件共用。
 *  v-model 为逗号分隔串（与原查询 DTO 字符串字段一致）；解析兼容 逗号/中文逗号/换行。
 *  label/unit 可传入：批量计划号 / 批量订单号 / 合同号 …
 */
import { computed, ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import { IconChevronDown } from "@tabler/icons-vue";
import { parseBatchIds } from "./parse";

const props = withDefaults(
  defineProps<{
    /** 逗号分隔的编号串（v-model） */
    modelValue?: string;
    /** 左侧标签，如「批量计划号」「批量订单号」「合同号」 */
    label?: string;
    /** 计数/提示用短名；默认去掉 label 的「批量」前缀（计划号/订单号/合同号） */
    unit?: string;
    labelWidth?: string;
    /** 只读触发框 placeholder */
    placeholder?: string;
    /** 弹窗内 Textarea placeholder */
    samplePlaceholder?: string;
  }>(),
  {
    modelValue: "",
    label: "批量计划号",
    unit: "",
    labelWidth: "w-16",
    placeholder: "批量录入…",
    samplePlaceholder: "例如：\nJH001,JH002,JH003\nJH004",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const unitName = computed(() => props.unit || props.label.replace(/^批量/, "") || "编号");

const dialogOpen = ref(false);
const draft = ref("");

const list = computed(() => parseBatchIds(props.modelValue));
const display = computed(() => (list.value.length ? `${list.value.length} 个${unitName.value}` : ""));
const draftCount = computed(() => parseBatchIds(draft.value).length);

function openDialog() {
  draft.value = list.value.join("\n");
  dialogOpen.value = true;
}

function apply() {
  emit("update:modelValue", parseBatchIds(draft.value).join(","));
  dialogOpen.value = false;
}

function clear() {
  draft.value = "";
}
</script>

<template>
  <div class="flex min-w-0 items-center gap-1.5">
    <label class="shrink-0 text-xs text-muted-foreground" :class="labelWidth">{{ label }}</label>
    <div class="flex min-w-0 flex-1 items-center gap-0.5">
      <InputText
        :model-value="display"
        readonly
        class="min-w-0 flex-1"
        :placeholder="placeholder"
        @click="openDialog"
      />
      <Button text class="shrink-0 px-1" :aria-label="`批量录入${unitName}`" @click="openDialog">
        <IconChevronDown class="h-3 w-3" />
      </Button>
    </div>

    <Dialog
      :visible="dialogOpen"
      modal
      :header="label"
      :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
      @update:visible="dialogOpen = $event"
    >
      <div class="flex flex-col gap-2">
        <p class="text-xs text-muted-foreground">
          粘贴或输入多个{{ unitName }}，用逗号或换行分隔（共 {{ draftCount }} 个）
        </p>
        <Textarea v-model="draft" rows="8" class="w-full" :placeholder="samplePlaceholder" />
      </div>
      <template #footer>
        <Button label="清空" variant="outlined" severity="secondary" @click="clear" />
        <Button label="取消" variant="outlined" @click="dialogOpen = false" />
        <Button label="确定" @click="apply" />
      </template>
    </Dialog>
  </div>
</template>
