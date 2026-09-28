<script setup lang="ts">
/** 对应 TP0003 需求计划管理（计划管理 · 附录 A3 版式 **L1 列表页**）
 *
 *  接口：`demandPlanApi.page`（POST /tqmes/demandPlan/listPage）
 *
 *  演示要点：**三个数相减就是净需求，行上算得出来**——
 *  `netDemand = requiredQty - availableStock - inTransit`。
 *  这条等式**列上三个数都在**，所以客户拿计算器一按就能验，
 *  也正因此**不能把等式挪到别处去算**（挪了就验不了了，而这一页存在的全部理由就是「算得明白」）。
 *
 *  **负净需求不是 bug**：约 15% 的行库存充裕、算出来是负数——
 *  页面要显示成「建议不动」而不是把负号藏起来。藏了负号，
 *  下游 TP0004 就会照着「负需求」生成采购建议（那个怪事在 batch/plan 的数据层已经挡掉：
 *  采购计划只取 `netDemand > 0` 的行）。
 *
 *  「只看需要采购」这个筛选走**服务端**而不是页面自己 filter：
 *  总数必须是服务端给的，页面自己过滤会让「共 N 条」和实际行数对不上。
 *
 *  待接入：需求确认、导出采购建议（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { demandPlanApi, materialApi } from "@/api/mes4tq";
import { codeFmt, dashFmt, qtyFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, materialMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const materialOptions = ref<string[]>([]);
const materialValueMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: "TP0003",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "计划号 / 物料 / 期别" },
    {
      key: "materialId",
      label: "物料",
      kind: "select",
      options: materialOptions.value,
      valueMap: materialValueMap.value,
      placeholder: "全部",
    },
    { key: "status", label: "状态", kind: "select", options: ["草稿", "已提交", "已确认"], placeholder: "全部" },
    { key: "period", label: "期别", kind: "select", options: periods.value, placeholder: "全部" },
    /* 服务端筛选：「只看需要采购的」——负净需求的行在服务端被剔掉，总数才准 */
    {
      key: "needPurchase",
      label: "净需求>0",
      kind: "select",
      options: ["是", "否"],
      valueMap: { 是: "true", 否: "false" },
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "id", headerName: "需求计划号", width: 240, pinned: "left" },
    { field: "period", headerName: "期别", width: 96 },
    { field: "monthlyPlanId", headerName: "上游月计划", width: 230, valueFormatter: dashFmt },
    { field: "materialId", headerName: "物料", width: 132, valueFormatter: codeFmt(materialMap.value) },
    { field: "requiredQty", headerName: "需求量 t", width: 130, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "availableStock", headerName: "可用库存 t", width: 136, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "inTransit", headerName: "在途 t", width: 126, type: "numericColumn", valueFormatter: qtyFmt },
    /* 净需求是本页的结论列，放在三列之后、右对齐加粗 */
    { field: "netDemand", headerName: "净需求 t", width: 136, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "status", headerName: "状态", width: 100, cellRenderer: tagRenderer() },
    { field: "remark", headerName: "备注", minWidth: 200, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "采购建议", kind: "link", to: "/tqmes/plan/purchase" },
  ],
  toolbar: { extraButtons: ["▶ 模拟倒推需求"] },
  fetch: (q) => demandPlanApi.page(q),
  summary: ({ total, rows }) => {
    const buy = rows.filter((r: any) => Number(r.netDemand) > 0).length;
    const hold = rows.filter((r: any) => Number(r.netDemand) <= 0).length;
    return `本页 ${total} 条 · 需采购 ${buy} · 库存够 ${hold}`;
  },
}));

const periods = ref<string[]>([]);

async function loadAll() {
  try {
    const [all, mats] = await Promise.all([demandPlanApi.page({ pageSize: 500 }), materialApi.list()]);
    periods.value = [...new Set(all.rows.map((r) => r.period).filter(Boolean))].toReversed();
    materialOptions.value = mats.map((m) => m.name);
    materialValueMap.value = Object.fromEntries(mats.map((m) => [m.name, m.id]));

    const rows = all.rows;
    const buy = rows.filter((r) => r.netDemand > 0);
    cards.value = [
      { label: "需采购的物料项", value: buy.length, sub: "净需求 > 0" },
      { label: "库存已覆盖", value: rows.length - buy.length, sub: "净需求 ≤ 0，本期不采购" },
      {
        label: "净需求合计",
        value: `${Math.round(buy.reduce((s, r) => s + r.netDemand, 0)).toLocaleString("zh-CN")} t`,
        sub: "不计负值（不能拿负需求去采购）",
      },
      { label: "覆盖期别", value: periods.value.length, sub: periods.value.join(" / ") },
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
