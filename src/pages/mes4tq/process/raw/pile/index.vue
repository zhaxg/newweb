<script setup lang="ts">
/** 对应 TW0102 混匀料堆管理（原料工序 · 附录 A3 版式 **L1 列表页**）
 *
 *  接口：`blendPileApi.page`（POST /tqmes/blendPile/listPage）· `blendPileApi.detail`
 *
 *  演示要点：**`isVirtual`（直供烧结虚拟堆）是这一页唯一要讲的东西**——
 *  那一行没有实际堆位，是混匀线直接把料供到烧结的「账上堆」。规格书 TPP_1010 专门为它
 *  留了 `N_IS_VIRTUAL` 字段，客户问「为什么这个堆不占库位」时答案就在这个标记上。
 *
 *  另一条是**未封堆**：`endTime` 为空 = 还在堆（`status` 显示「堆料中」），
 *  封堆后 `qty`（堆存量）才定稿。B2 原文「未封堆=null」，所以这列**不能**兜底成
 *  「—」后就被当成没数据——它有明确的业务含义，`status` 列承载它。
 *
 *  待接入：取料计划、封堆操作（本域只查桩）。
 */
import { computed, ref, watch } from "vue";
import ListPage from "../../../ListPage.vue";
import { blendPileApi, processApi } from "@/api/mes4tq";
import { boolRenderer, codeFmt, dashFmt, numFmt, qtyFmt, tagRenderer } from "../../../cells";
import { useNameMaps } from "../../../nameMaps";
import type { ListPageSpec } from "../../../listTypes";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const unitOptions = ref<string[]>([]);
const unitValueMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: "TW0102",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "堆号 / 配料计划 / 库位" },
    {
      key: "unitId",
      label: "机组",
      kind: "select",
      options: unitOptions.value,
      valueMap: unitValueMap.value,
      placeholder: "全部",
    },
    {
      key: "status",
      label: "堆状态",
      kind: "select",
      options: ["堆料中", "已封堆", "取料中", "已取空", "直供烧结"],
      placeholder: "全部",
    },
    {
      key: "isVirtual",
      label: "虚拟堆",
      kind: "select",
      options: ["是", "否"],
      valueMap: { 是: "true", 否: "false" },
      placeholder: "全部",
    },
    { key: "begTime", label: "开铺日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "begTime", headerName: "开铺时间", width: 150, pinned: "left" },
    { field: "endTime", headerName: "封堆时间", width: 150, valueFormatter: (p) => p.value || "在堆中" },
    { field: "pileNo", headerName: "料堆号", width: 120 },
    { field: "unitId", headerName: "混匀线", width: 118, valueFormatter: codeFmt(unitMap.value) },
    { field: "storePositionId", headerName: "堆位库位", width: 150, valueFormatter: dashFmt },
    { field: "planId", headerName: "配料计划", width: 136, valueFormatter: dashFmt },
    { field: "qty", headerName: "堆存量 t", width: 116, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "status", headerName: "堆状态", width: 108, cellRenderer: tagRenderer() },
    { field: "isVirtual", headerName: "直供虚拟堆", width: 112, cellRenderer: boolRenderer() },
    { field: "flagDel", headerName: "作废", width: 82, cellRenderer: boolRenderer() },
    { field: "yhPljh", headerName: "预混小料计划", width: 136, valueFormatter: dashFmt },
    { field: "remark", headerName: "备注", minWidth: 200, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "配料计划", kind: "link", to: "/tqmes/batch/blend" },
  ],
  toolbar: { extraButtons: ["▶ 模拟开铺"] },
  fetch: (q) => blendPileApi.page(q),
  summary: ({ total, rows }) => {
    const virtual = rows.filter((r: any) => r.isVirtual).length;
    const open = rows.filter((r: any) => !r.endTime).length;
    return `共 ${total} 个料堆 · 未封堆 ${open} · 虚拟堆 ${virtual}`;
  },
}));

async function loadOptions() {
  try {
    const units = await processApi.units("raw");
    unitOptions.value = units.map((u) => u.name);
    unitValueMap.value = Object.fromEntries(units.map((u) => [u.name, u.id]));
  } catch {
    /* 拦截层已 toast */
  }
}

/** 统计卡：堆存量按「已封堆才算定稿」给合计——未封堆的量还在变，加进去是假数 */
async function loadCards() {
  try {
    const res = await blendPileApi.page({ pageSize: 500 });
    const rows = res.rows;
    const closed = rows.filter((r) => r.endTime);
    const open = rows.filter((r) => !r.endTime);
    const virtual = rows.filter((r) => r.isVirtual);
    cards.value = [
      {
        label: "已封堆总量",
        value: `${Math.round(closed.reduce((s, r) => s + Number(r.qty ?? 0), 0)).toLocaleString("zh-CN")} t`,
        sub: "封堆后才定稿",
      },
      { label: "在堆（未封）", value: open.length, sub: "堆存量还在变，不进合计" },
      { label: "直供烧结虚拟堆", value: virtual.length, sub: "不实际落地，只记账" },
      { label: "料堆总数", value: rows.length, sub: "近 14 天" },
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

void loadOptions();
void loadCards();
</script>

<template>
  <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
</template>
