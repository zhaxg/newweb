<script setup lang="ts">
/**
 * 对应 TG0005 指标维护（基础配置 · 附录 A3 版式 **L1 列表页**）
 *
 * 接口：`indicatorApi.page`（POST /tqmes/indicator/listPage）
 *
 * 演示要点：**这一屏是「这个数怎么算出来的」的唯一答案**——
 * 规格书 B4 把 7 个核心指标的公式与粒度定死了，本页把它们摊开成可筛选的表。
 * 客户在别处系统里遇到「利用系数为什么是 2.15 不是 0.95」这类追问时，
 * 会发现 `formula` 列里写着高炉按天、烧结按小时——两个分母的时间单位不同是行业惯例。
 *
 * **与 TP0001 的分工**：这里维护的是**指标定义**（有哪些指标、口径是什么、算到什么粒度）；
 * TP0001 维护的是某年某月某个机组的**指标值**。两张表别混，混了公式就没地方放了。
 *
 * 「启用」关掉的行（如高炉有效容积利用系数，与「利用系数」重叠）
 * 会仍然查得到但默认不启用——重复计数是报表页最容易犯的错。
 *
 * 待接入：新增指标、改公式（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { indicatorApi, processApi } from "@/api/mes4tq";
import { boolRenderer, dashFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

/** 工序与粒度的候选从接口取，不写死在页面里——两处管同一件事就是页间矛盾的源头 */
const processOptions = ref<string[]>([]);
const granularityOptions = ref<string[]>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TG0005",
  query: [
    { key: "keyword", label: "指标", kind: "input", placeholder: "指标名 / 单位 / 公式" },
    { key: "process", label: "适用工序", kind: "select", options: processOptions.value, placeholder: "全部" },
    { key: "granularity", label: "统计粒度", kind: "select", options: granularityOptions.value, placeholder: "全部" },
    { key: "enabled", label: "启用", kind: "select", options: ["是", "否"], valueMap: { 是: "true", 否: "false" } },
  ],
  columns: [
    { field: "indicatorName", headerName: "指标名", width: 170, pinned: "left" },
    { field: "unit", headerName: "单位", width: 150, valueFormatter: dashFmt },
    /* 公式列给 flex：它是这一页的全部价值，窄列会被截断成客户看不出所以然 */
    { field: "formula", headerName: "计算公式", minWidth: 300, flex: 2, valueFormatter: dashFmt },
    { field: "granularity", headerName: "统计粒度", width: 110, cellRenderer: tagRenderer() },
    { field: "process", headerName: "适用工序", width: 110, cellRenderer: tagRenderer() },
    { field: "enabled", headerName: "启用", width: 78, cellRenderer: boolRenderer() },
    { field: "remark", headerName: "备注", minWidth: 220, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  fetch: (q) => indicatorApi.page(q),
  summary: ({ total }) => `${total} 个技经指标 · 公式口径照附录 B4`,
}));

async function loadOptions() {
  try {
    const [procs, list] = await Promise.all([processApi.list(), indicatorApi.list()]);
    processOptions.value = procs.map((p) => p.name);
    const grans = [...new Set(list.map((i) => i.granularity))];
    granularityOptions.value = grans;
  } catch {
    /* 拦截层已 toast；下拉空着不影响其余筛选 */
  }
}

/* 名称/候选表晚到时重查一次，否则两个下拉是空的（spec 是 computed，候选到货自然重算，
   但表格的行不会自己重跑 valueFormatter，所以还要 reload） */
watch(
  () => processOptions.value.length > 0,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

const listRef = ref<InstanceType<typeof ListPage> | null>(null);

onMounted(() => void loadOptions());
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
