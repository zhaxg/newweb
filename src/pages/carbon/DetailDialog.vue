<script setup lang="ts">
/**
 * 通用只读详情弹窗：按 `sections` 逐段渲染 label/value。
 *
 * 对应线上各页行内「详情」弹窗（目标完成情况、配额履约、预警设置…都是这种
 * 「分组标题 + 两列明细」的形状，字段集合各页不同，故用 spec 驱动而不是每页一个组件）。
 *
 * 页脚给「取消」并标 autofocus：线上多数详情弹窗也有一个取消/关闭按钮，
 * 且 ui-rules R5 要求每个 <Dialog> 必须有 autofocus，否则 PrimeVue 兜底聚焦右上角关闭键。
 */
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import type { DetailSection } from "./listTypes";

type DetailField = DetailSection["fields"][number];

const props = defineProps<{
  open: boolean;
  title?: string;
  sections: DetailSection[];
  data: Record<string, any> | null;
}>();

const emit = defineEmits<{ "update:open": [value: boolean] }>();

const LBL = "shrink-0 text-xs text-muted-foreground";
const VAL = "min-w-0 text-body";

function valueOf(f: DetailField): string {
  const v = props.data?.[f.from];
  if (v === null || v === undefined || v === "") return "-";
  const text = f.map ? (f.map[String(v)] ?? String(v)) : String(v);
  return f.suffix ? `${text}${f.suffix}` : text;
}
</script>

<template>
  <Dialog
    :visible="open"
    modal
    :header="title ?? '详情'"
    :style="{ width: 'min(40rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)"
  >
    <div class="min-w-0 space-y-4 py-1">
      <div v-for="s in sections" :key="s.title ?? s.fields[0]?.from" class="space-y-2">
        <div v-if="s.title" class="text-sm font-medium">{{ s.title }}</div>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-2">
          <template v-for="f in s.fields" :key="f.label">
            <dt :class="LBL">{{ f.label }}</dt>
            <dd :class="VAL">{{ valueOf(f) }}</dd>
          </template>
        </dl>
      </div>
      <div v-if="!data" class="text-body text-muted-foreground">暂无数据</div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" autofocus @click="emit('update:open', false)" />
    </template>
  </Dialog>
</template>
