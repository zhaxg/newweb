<script setup lang="ts">
/** UCPaginationBar（Hmx 分页条）：上一页/下一页/转到 + 输入页码/每页显示 + 页码统计
 *  已接入：纯前端；PageCount = DataCount==0 ? 1 : ceil(DataCount/PageSize)；转到越界 → 「无效页码」 */
import { computed, ref } from "vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ dataCount: number; pageIndex: number; pageSize: number }>();
const emit = defineEmits<{ change: [pageIndex: number, pageSize: number] }>();
const { toast } = useToast();

const pageCount = computed(() => (props.dataCount === 0 ? 1 : Math.ceil(props.dataCount / props.pageSize)));
const gotoPage = ref<number | null>(null);
const size = ref<number>(props.pageSize);

const prev = () => {
  if (props.pageIndex > 0) emit("change", props.pageIndex - 1, props.pageSize);
};
const next = () => {
  if (props.pageIndex + 1 < pageCount.value) emit("change", props.pageIndex + 1, props.pageSize);
};
const goto = () => {
  const p = gotoPage.value;
  if (p == null || p < 1 || p > pageCount.value) {
    toast("无效页码", 2000, "error");
    return;
  }
  emit("change", p - 1, props.pageSize);
};
const applySize = () => {
  emit("change", 0, size.value || 50);
};
</script>

<template>
  <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2 text-xs text-muted-foreground">
    <span>{{ props.pageIndex + 1 }}/{{ pageCount }}</span>
    <span class="mx-1 h-4 w-px bg-border" />
    <Button
      variant="outlined"
      class="h-6 shrink-0 whitespace-nowrap !px-2"
      :disabled="props.pageIndex <= 0"
      @click="prev"
    >
      上一页
    </Button>
    <Button
      variant="outlined"
      class="h-6 shrink-0 whitespace-nowrap !px-2"
      :disabled="props.pageIndex + 1 >= pageCount"
      @click="next"
    >
      下一页
    </Button>
    <span>输入页码：</span>
    <InputNumber
      v-model="gotoPage"
      :min="1"
      :max="pageCount"
      :use-grouping="false"
      class="w-20"
      show-buttons
      :step="1"
    />
    <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="goto">转到</Button>
    <span class="ml-auto">每页显示：</span>
    <InputNumber
      v-model="size"
      :min="1"
      :use-grouping="false"
      class="w-20"
      show-buttons
      :step="10"
      @update:model-value="applySize"
    />
    <span>行</span>
    <span class="w-28 text-right">共 {{ props.dataCount }} 条</span>
  </div>
</template>
