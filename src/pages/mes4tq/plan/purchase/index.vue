<script setup lang="ts">
/** 对应 TP0004 采购计划管理（计划管理 · 附录 A3 版式 **L1 列表页**）
 *
 *  接口：`purchasePlanApi.page`（POST /tqmes/purchasePlan/listPage）
 *        `purchasePlanApi` 的供方候选走 `/tqmes/supplier/list`
 *
 *  演示要点：**这一页只生成「净需求 > 0」的行**——数据层已经挡掉了负净需求
 *  （见 `data/plan.ts` 的 `PURCHASE_PLANS`）。原因很直白：
 *  库存已经够还生成采购建议，客户当场就会问「你是不是算错了」。
 *
 *  倒推链到这儿是**最后一环**：
 *  `TP0002 月计划 → TP0003 需求 → TP0004 采购`，`demandPlanId` 把它接回上游。
 *  「上游需求计划」列留着这个 id，点详情能一路追回产量计划——
 *  这正是 A1 里「需求计划 → 采购建议」那条溯源。
 *
 *  金额 = 建议采购量 × 单价，列上算得出来，客户拿计算器能验。
 *
 *  待接入：下单、到货确认（本域只查桩；接口按 B10 走 ERP-MP 上抛需求计划）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { materialApi, purchasePlanApi, supplierApi } from "@/api/mes4tq";
import { codeFmt, moneyFmt, qtyFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, materialMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const materialOptions = ref<string[]>([]);
const materialValueMap = ref<Record<string, string>>({});
const suppOptions = ref<string[]>([]);
const periods = ref<string[]>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TP0004",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "单号 / 供应商 / 物料" },
    {
      key: "materialId",
      label: "物料",
      kind: "select",
      options: materialOptions.value,
      valueMap: materialValueMap.value,
      placeholder: "全部",
    },
    { key: "suppName", label: "供应商", kind: "select", options: suppOptions.value, placeholder: "全部" },
    { key: "status", label: "状态", kind: "select", options: ["草稿", "已提交", "已确认"], placeholder: "全部" },
    { key: "expectDate", label: "到货日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "id", headerName: "采购建议号", width: 250, pinned: "left" },
    { field: "materialId", headerName: "物料", width: 132, valueFormatter: codeFmt(materialMap.value) },
    { field: "demandPlanId", headerName: "上游需求计划", width: 250, valueFormatter: (p) => p.value || "—" },
    { field: "suggestQty", headerName: "建议采购量 t", width: 146, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "price", headerName: "单价 元/t", width: 126, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "amount", headerName: "金额 元", width: 146, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "suppName", headerName: "供应商", width: 140, valueFormatter: (p) => p.value || "—" },
    { field: "suppId", headerName: "供应商编码", width: 130, valueFormatter: (p) => p.value || "—" },
    { field: "expectDate", headerName: "期望到货", width: 126 },
    { field: "status", headerName: "状态", width: 100, cellRenderer: tagRenderer() },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "需求来源", kind: "link", to: "/tqmes/plan/demand" },
  ],
  toolbar: { extraButtons: ["▶ 模拟生成采购建议"] },
  fetch: (q) => purchasePlanApi.page(q),
  summary: ({ total, rows }) => {
    const amount = rows.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    return `共 ${total} 条 · 合计 ¥${Math.round(amount).toLocaleString("zh-CN")}`;
  },
}));

async function loadAll() {
  try {
    const [all, mats, supps] = await Promise.all([
      purchasePlanApi.page({ pageSize: 500 }),
      materialApi.list(),
      supplierApi.list(),
    ]);
    materialOptions.value = mats.map((m) => m.name);
    materialValueMap.value = Object.fromEntries(mats.map((m) => [m.name, m.id]));
    suppOptions.value = supps.map((s) => s.name);
    periods.value = [...new Set(all.rows.map((r) => r.expectDate.slice(0, 7)))].toSorted((a, b) => b.localeCompare(a));

    const rows = all.rows;
    cards.value = [
      { label: "采购建议", value: rows.length, sub: "只含净需求 > 0 的" },
      {
        label: "合计金额",
        value: `¥${rows.reduce((s, r) => s + r.amount, 0).toLocaleString("zh-CN")}`,
        sub: "建议量 × 单价",
      },
      { label: "涉及供应商", value: supps.length, sub: "供方与订单同源，不会筛出 0 行" },
      { label: "期望到货跨度", value: `${periods.value.length} 个月`, sub: periods.value[0] ?? "" },
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
