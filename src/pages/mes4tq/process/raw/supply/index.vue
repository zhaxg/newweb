<script setup lang="ts">
/** 对应 TW0105 供料作业记录（原料工序 · 附录 A3 版式 **L1 列表页**）
 *
 *  接口：`supplyApi.page`（POST /tqmes/supply/listPage）
 *
 *  演示要点：**这一页是原料工序的「出口」**——向烧结/球团/高炉送了多少料。
 *  A3 的原文是「向烧结/球团/高炉供料的品种/数量/时间」，所以 `toUnit` 存的是
 *  **机组名**（`1#烧结机` / `3#高炉`）而不是编码：客户读的是厂里人说的话，
 *  存编码再翻译一次等于把同一个翻译摊在两处。
 *
 *  **与下游对账是这页的价值**：这边送出去 850t，烧结那边 TW0402 的投料实绩
 *  应该能对上。两个数字对不上时，`status=中断` 的行（皮带故障）就是解释。
 *
 *  待接入：补送单、供料计划对比（本域只查桩）。
 */
import { computed, ref, watch } from "vue";
import ListPage from "../../../ListPage.vue";
import { supplyApi } from "@/api/mes4tq";
import { codeFmt, dayFmt, numFmt, qtyFmt, tagRenderer } from "../../../cells";
import { useNameMaps } from "../../../nameMaps";
import type { ListPageSpec } from "../../../listTypes";

const { ready, materialMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TW0105",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "去向 / 物料 / 操作人" },
    { key: "toUnit", label: "接收对象", kind: "select", options: DEST_OPTIONS, placeholder: "全部" },
    { key: "shift", label: "班次", kind: "select", options: ["A", "B", "C"], placeholder: "全部" },
    { key: "status", label: "状态", kind: "select", options: ["完成", "中断"], placeholder: "全部" },
    { key: "date", label: "供料日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "date", headerName: "供料日期", width: 116, pinned: "left" },
    { field: "beginTime", headerName: "开始时间", width: 150 },
    { field: "endTime", headerName: "结束时间", width: 150 },
    { field: "fromUnit", headerName: "供出机组", width: 118 },
    { field: "toUnit", headerName: "接收对象", width: 132 },
    { field: "materialId", headerName: "物料", width: 126, valueFormatter: codeFmt(materialMap.value) },
    { field: "qty", headerName: "供料量 t", width: 116, type: "numericColumn", valueFormatter: qtyFmt },
    {
      field: "shift",
      headerName: "班次",
      width: 76,
      valueFormatter: (p) => ({ A: "A 早班", B: "B 中班", C: "C 夜班" })[String(p.value)] ?? p.value,
    },
    { field: "operator", headerName: "操作人", width: 96 },
    { field: "status", headerName: "状态", width: 92, cellRenderer: tagRenderer() },
    { field: "remark", headerName: "备注", minWidth: 200, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "下游投料实绩", kind: "link", to: "/tqmes/process/sinter/input" },
  ],
  toolbar: { extraButtons: ["▶ 模拟供料"] },
  fetch: (q) => supplyApi.page(q),
  summary: ({ total, rows }) => {
    const bad = rows.filter((r: any) => r.status === "中断").length;
    return bad ? `本页 ${total} 条 · 中断 ${bad} 条（缺的量要在下游补）` : `共 ${total} 条`;
  },
}));

/** 接收对象的候选写死在这里**而不是页面外拉**：就这几个接收方、且与 `toUnit` 存的值逐字相同，
 *  多一次请求换不来的信息量（`supplyApi` 没有单独的「去向字典」端点，见该文件） */
const DEST_OPTIONS = ["1#烧结机", "2#烧结机", "1#竖炉", "2#竖炉", "3#竖炉", "1#高炉", "2#高炉", "3#高炉"];

async function loadCards() {
  try {
    const res = await supplyApi.page({ pageSize: 500 });
    const rows = res.rows;
    const ok = rows.filter((r) => r.status !== "中断");
    const toSinter = ok.filter((r) => r.toUnit.includes("烧结")).reduce((s, r) => s + r.qty, 0);
    const toPellet = ok.filter((r) => r.toUnit.includes("竖炉")).reduce((s, r) => s + r.qty, 0);
    const toBlast = ok.filter((r) => r.toUnit.includes("高炉")).reduce((s, r) => s + r.qty, 0);
    const bad = rows.length - ok.length;
    cards.value = [
      { label: "送烧结", value: `${Math.round(toSinter).toLocaleString("zh-CN")} t`, sub: "对得上 TW0402 投料" },
      { label: "送球团", value: `${Math.round(toPellet).toLocaleString("zh-CN")} t`, sub: "对得上 TW0302 投料" },
      { label: "送高炉", value: `${Math.round(toBlast).toLocaleString("zh-CN")} t`, sub: "对得上 TW0602 投料" },
      { label: "中断次数", value: bad, sub: "缺的量要下游补送" },
    ];
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

void loadCards();
</script>

<template>
  <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
</template>
