<script setup lang="ts">
/**
 * 碳资产列表页的分页条（对照线上 antd Pagination：`共N条数据 · 页码 · 20条/页`）。
 *
 * 为什么单独做一个：线上列表是**服务端分页**（请求带 currentPage/pageSize，响应给 total），
 * 而 AG Grid 内置分页是纯前端切片、拿不到服务端 total，两者不能同时开
 * （ui-rules §7 又要求全站 `:pagination="false"`）。所以分页状态留在页面里、
 * 网格只渲染当前页的行，条子自己画。
 *
 * 行号（agGrid 内置 rowNumbers，rowIndex+1）也因此天然是页内序号，与 antd 一致。
 * 页面放 src/pages/carbon 根（不是某个 pageId 目录），因为 5 个页面共用；
 * 之后别的模块要复用直接 import，确认通用后再考虑上提到 src/components/common。
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
  const max = pageCount();
  const next = Math.min(max, Math.max(1, page));
  if (next === props.page && props.pageSize) return;
  emit("change", next, props.pageSize);
}

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
