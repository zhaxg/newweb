<script setup lang="ts">
/**
 * 通用只读详情弹窗：按 `sections` 逐段渲染 label/value。
 *
 * 与 carbon 的同名组件同一形状（分组标题 + 两列明细），差别只有两处，都是本域数据形态逼出来的：
 * - **数组值 join**：`AlarmRule.channels`、`WorkOrder.photos` 这类字段行里就是数组，
 *   直接 `String(v)` 会打成 `站内,App`，逗号在中文界面里读着像一句话被截断，所以统一用顿号；
 * - **空值给破折号而不是 `-`**：与 `cells.ts` 的表格口径一致（同一页里两种「没有」会让人以为是两回事）。
 *
 * 页脚给「取消」并标 autofocus：R5 要求每个 `<Dialog>` 必须有 autofocus，
 * 否则 PrimeVue 兜底聚焦右上角关闭按钮，回车会误触关闭。
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
  if (v === null || v === undefined || v === "") return "—";
  const raw = Array.isArray(v) ? v.join("、") : String(v);
  const text = f.map ? (f.map[raw] ?? raw) : raw;
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
