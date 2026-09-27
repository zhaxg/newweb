<script setup lang="ts">
/**
 * 服务端分页条（`共N条数据 · 页码 · 20条/页`）。
 *
 * 为什么不直接用 AG Grid 内置分页：本域列表是**服务端分页**
 * （`POST /ems/<实体>/listPage` 带 `currentPage`/`pageSize`、回 `{total,rows}`，
 * 见 `src/mock/energy/query.ts` 的 `paged()`），而 AG Grid 的内置分页是对**已到手的行**做前端切片，
 * 拿不到服务端 total，两者同时开会既翻不动也显示错总数。
 * 于是分页状态留在页面、网格只渲染当前页，条子自己画（`:pagination="false"` 也是 ui-rules §7 的统一要求）。
 *
 * 与其他域的分页条同一形状但**文件独立存在**：跨域 import 会让一个域的改动抖到另一个域，
 * 这里只保留交互契约（页码边界钳制、换页长回第 1 页）。
 */
import Button from "primevue/button";
import Select from "primevue/select";

const props = defineProps<{
  total: number;
  page: number;
  pageSize: number;
}>();

const emit = defineEmits<{ change: [page: number, pageSize: number] }>();

const PAGE_SIZES = ["20 条/页", "50 条/页", "100 条/页"];

function pageCount(): number {
  return Math.max(1, Math.ceil(props.total / Math.max(1, props.pageSize)));
}

function go(page: number) {
  const next = Math.min(pageCount(), Math.max(1, page));
  if (next === props.page) return;
  emit("change", next, props.pageSize);
}

/** 换每页条数必须回第 1 页：停在第 4 页把 20 换成 100，会直接落到超出总页数的空窗 */
function changeSize(label: string) {
  const size = Number.parseInt(label, 10);
  if (!Number.isFinite(size) || size === props.pageSize) return;
  emit("change", 1, size);
}
</script>

<template>
  <div class="flex h-9 shrink-0 items-center gap-2 border-t border-border/60 px-3">
    <span class="text-xs text-muted-foreground">共 {{ total }} 条数据</span>
    <div class="ml-auto flex items-center gap-1.5">
      <Button
        icon="pi pi-chevron-left"
        variant="outlined"
        severity="secondary"
        :disabled="page <= 1"
        @click="go(page - 1)"
      />
      <span class="min-w-16 text-center text-xs text-muted-foreground">{{ page }} / {{ pageCount() }}</span>
      <Button
        icon="pi pi-chevron-right"
        variant="outlined"
        severity="secondary"
        :disabled="page >= pageCount()"
        @click="go(page + 1)"
      />
      <Select
        :model-value="`${pageSize} 条/页`"
        :options="PAGE_SIZES"
        class="w-24"
        @update:model-value="changeSize($event as string)"
      />
    </div>
  </div>
</template>
