<script setup lang="ts">
/** 对应 TQ0003 检验实绩查询（质量管理 · 附录 A3 版式 **L1 列表页 + 实绩详情含标准对照**）
 *
 *  接口：`qualityBatchApi.page`（POST /tqmes/qualityBatch/listPage）
 *        `qualityBatchApi.detail`（GET，**详情带每项的上下限**）
 *
 *  演示要点：**「合格」两个字必须有上下限陪衬**——
 *  详情弹窗里每一项同时显示 `实测值` 与 `标准区间`，
 *  否则客户看到一个「合格」却没有下限可对照，那结论就是空口白话。
 *  而上下限正是从 TQ0001 读来的（`detail` 端点把 `std` 拼进每一项），
 *  所以两页给出的结论**不可能分家**。
 *
 *  **三个来源都要有**（B2 的 `source`）：进厂 / 工序产出 / 铁水——
 *  少一个下拉就筛不出它。铁水行还多一个 `feBatchNo`（铁次号），
 *  这是 A3 对 TQ0003「铁水质量」那一句的落实。
 *
 *  「只看不合格」走**服务端**：总数要准，页面自己过滤会让「共 N 条」与实际行数对不上。
 *  不合格的行标出来是**故意的**——全是合格的质检页看不出质检在干什么。
 *
 *  待接入：复检发起（本域只查桩；S3 状态机的末档「复检」在状态列里可见）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { qualityBatchApi } from "@/api/mes4tq";
import { codeFmt, dayFmt, numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { DetailSection, ListPageSpec } from "../../listTypes";

const { ready, materialMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const productOptions = ref<string[]>([]);
const productValueMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: "TQ0003",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "批次 / 品名 / 铁次号" },
    {
      key: "productName",
      label: "品名",
      kind: "select",
      options: productOptions.value,
      valueMap: productValueMap.value,
      placeholder: "全部",
    },
    { key: "source", label: "来源", kind: "select", options: ["进厂", "工序产出", "铁水"], placeholder: "全部" },
    {
      key: "status",
      label: "批次状态",
      kind: "select",
      options: ["待检", "检验中", "已判定", "已报出", "复检"],
      placeholder: "全部",
    },
    /* 服务端筛选：`failOnly` 在 routes/quality.ts 里判，总数才准 */
    {
      key: "failOnly",
      label: "只看不合格",
      kind: "select",
      options: ["是", "否"],
      valueMap: { 是: "true", 否: "false" },
      placeholder: "全部",
    },
    {
      key: "process",
      label: "工序",
      kind: "select",
      options: ["raw", "coke", "pellet", "sinter", "lime", "blast"],
      placeholder: "全部",
    },
    { key: "sampleTime", label: "取样日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "sampleTime", headerName: "取样时间", width: 150, pinned: "left" },
    { field: "batchNo", headerName: "批次号", width: 148 },
    { field: "productName", headerName: "品名", width: 118 },
    { field: "source", headerName: "来源", width: 112, cellRenderer: tagRenderer() },
    {
      field: "process",
      headerName: "工序",
      width: 104,
      valueFormatter: (p) => processName.value[String(p.value)] ?? p.value,
    },
    { field: "materialId", headerName: "物料", width: 128, valueFormatter: codeFmt(materialMap.value) },
    { field: "feBatchNo", headerName: "铁次号", width: 130, valueFormatter: (p) => p.value || "—" },
    /* 合格/不合格放显眼位置并上色标——质检页的结论列，藏在最后一列是失职 */
    { field: "overallGrade", headerName: "综合判定", width: 108, cellRenderer: tagRenderer() },
    { field: "status", headerName: "批次状态", width: 104, cellRenderer: tagRenderer() },
    { field: "remark", headerName: "备注", minWidth: 220, flex: 1 },
  ],
  actions: [
    { label: "逐项实绩", kind: "detail" },
    { label: "检验委托", kind: "link", to: "/tqmes/quality/order" },
  ],
  toolbar: { extraButtons: ["▶ 模拟复检"] },
  detail: { sections: detailSections },
  /**
   * 详情取数：把 `items` 拍平成一行。
   *
   * 每项格式 `检验项 实测值单位（标准 lo~hi）✓/✗`——
   * 客户拿这一行就能复核「合格」，不必再切到 TQ0001 查上下限。
   * `✓`/`✗` 由**该项自己**是否落在标准区间判出来，与端点给的 `overallGrade` 各算各的：
   * 两者对不上说明标准与判定脱节，那正是要当场发现的事。
   */
  detailFetch: async (id) => {
    const d = await qualityBatchApi.detail(id);
    if (!d) return null;
    const lines = (d.items ?? []).map((it: any) => {
      const std = it.std;
      const lo = std?.min,
        hi = std?.max;
      const range = lo != null && hi != null ? `${lo}~${hi}` : lo != null ? `≥${lo}` : hi != null ? `≤${hi}` : "无区间";
      const inRange = (lo == null || it.value >= lo) && (hi == null || it.value <= hi);
      return `${it.itemName} ${it.value}${it.unit}（标准 ${range}）${inRange ? "✓" : "✗"}`;
    });
    return { ...d, _itemsText: lines.join(" · ") || "无检验项" };
  },
  fetch: (q) => qualityBatchApi.page(q),
  summary: ({ total, rows }) => {
    const fail = rows.filter((r: any) => r.overallGrade === "不合格").length;
    return fail ? `本页 ${total} 批 · 不合格 ${fail} 批` : `共 ${total} 批`;
  },
}));

const processName = ref<Record<string, string>>({});

/**
 * 详情的分段：**每一项都带标准区间**（`std.min` / `std.max` 由 `detail` 端点拼进来）。
 *
 * 这是这一页最重要的一处：把上下限摊在同一个弹窗里，
 * 客户拿实测值对着区间读一遍就能复核「合格」这个结论，
 * 不用再切到 TQ0001 去查。段落按**判定顺序**排（基本信息 → 逐项结果），
 * 不是按字段名字母序——读的顺序就是判的顺序。
 */
const detailSections: DetailSection[] = [
  {
    title: "批次身份",
    fields: [
      { label: "批次号", from: "batchNo" },
      { label: "品名", from: "productName" },
      { label: "来源", from: "source" },
      { label: "铁次号", from: "feBatchNo" },
      { label: "取样时间", from: "sampleTime" },
      { label: "综合判定", from: "overallGrade", map: { 合格: "合格", 不合格: "不合格" } },
      { label: "批次状态", from: "status" },
    ],
  },
  {
    /* 这一段的值由 `detailFetch` 拍平成一行可读串（见下）——
       `DetailDialog` 对对象数组只会 `join`，结果是 `[object Object]、[object Object]`，
       所以**不能把 items 原样丢给它** */
    title: "逐项结果（实测 vs 标准）",
    fields: [{ label: "检验项与标准区间", from: "_itemsText" }],
  },
];

async function loadAll() {
  try {
    /* ⚠️ Promise.all 的顺序就是字面顺序：先 page（回 {total,rows}）、后 sources（回 string[]）。
       早先解构成 `[products, all]` 把两者对调，options 被赋成 PageResult **对象**——
       PrimeVue Select 的 `options` 必须是 Array，运行期直接抛
       `findSelectedOptionIndex is not a function`、整页被 ErrorBoundary 吞掉。 */
    const [pageRes, sources] = await Promise.all([qualityBatchApi.page({ pageSize: 500 }), qualityBatchApi.sources()]);
    productOptions.value = sources;
    productValueMap.value = Object.fromEntries(sources.map((p) => [p, p]));
    const procs = await import("@/api/mes4tq").then((m) => m.processApi.list());
    for (const p of procs) processName.value[p.code] = p.name;

    const rows = pageRes.rows;
    cards.value = [
      { label: "检验批次", value: rows.length, sub: "近 7 天" },
      {
        label: "不合格",
        value: rows.filter((r) => r.overallGrade === "不合格").length,
        sub: "全是合格看不出质检在做什么",
      },
      { label: "已报出", value: rows.filter((r) => r.status === "已报出").length, sub: "S3 状态机末档" },
      { label: "铁水批次", value: rows.filter((r) => r.source === "铁水").length, sub: "带铁次号" },
    ];
    listRef.value?.reload();
  } catch {
    /* 拦截层已 toast */
  }
}

watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

onMounted(() => void loadAll());
</script>

<template>
  <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
</template>
