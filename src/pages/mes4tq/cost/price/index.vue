<script setup lang="ts">
/** 对应 TC0001 成本项单价维护（成本归集 · 附录 A3 版式 **L1 列表页 + 数据来源卡**）
 *
 *  接口：`costPriceApi.page`（POST /tqmes/costPrice/listPage）
 *        `costPriceApi.items`（成本项字典，带 B1 的「数据来源」）
 *
 *  演示要点：**「这个成本项的数是谁给的」必须答得出来**——
 *  规格书 B1 的成本结构表给了六条来路：原料/燃料 **MES 收集**、
 *  辅材/备件 **ERP-IN 抛送**、能源 **EMS 抛送**、人员 **ERP-HR**。
 *  所以字典端点把 `source` 一起带回来，统计卡上也单独给一格「按来源分布」。
 *  客户问「你这数哪来的」时，看一眼卡就知道是自己收的还是别人推的。
 *
 *  **单价三个月一变**（数据层逐月 ±4% 浮动）：三个月同价是「编的」最明显特征——
 *  现实里焦炭、合金、电价都会动。逐月同向波动才像同一个市场周期。
 *
 *  **人员成本的单位是「元/人·月」而不是「元/t」**——它不参与吨成本摊销。
 *  混进吨成本会得到一个量纲错误的结果，所以这一项在 TC0002 里单独标出来。
 *
 *  待接入：单价维护、与 ERP 对账（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { costPriceApi } from "@/api/mes4tq";
import { moneyFmt, numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);
const sourceGroups = ref<Array<{ source: string; count: number }>>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TC0001",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "项代码 / 项名 / 分类" },
    {
      key: "category",
      label: "数据来源",
      kind: "select",
      options: categories.value,
      valueMap: categoryValueMap.value,
      placeholder: "全部",
    },
    { key: "itemNo", label: "成本项", kind: "select", options: itemOptions.value, placeholder: "全部" },
    { key: "date", label: "账期", kind: "select", options: periods.value, placeholder: "全部" },
  ],
  columns: [
    { field: "itemNo", headerName: "项代码", width: 104, pinned: "left" },
    { field: "itemName", headerName: "成本项", minWidth: 190, flex: 1 },
    /* 分类列**显示的是数据来源**（MES 收集 / ERP-IN 抛送 / EMS 抛送 / ERP-HR）——
       这是 B1 成本结构表的落点，也是客户问「数哪来的」时的答案 */
    { field: "category", headerName: "数据来源", width: 140, cellRenderer: tagRenderer() },
    { field: "price", headerName: "单价", width: 130, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "unit", headerName: "单位", width: 116 },
    { field: "date", headerName: "账期", width: 126 },
    { field: "workshopCode", headerName: "车间", width: 96, valueFormatter: (p) => p.value || "全厂" },
    { field: "remark", headerName: "备注", minWidth: 200, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "成本分析", kind: "link", to: "/tqmes/cost/analysis" },
  ],
  toolbar: { extraButtons: ["▶ 模拟单价同步"] },
  fetch: (q) => costPriceApi.page(q),
  summary: ({ total, rows }) => {
    const emp = rows.filter((r: any) => String(r.unit).includes("人")).length;
    return emp ? `本页 ${total} 行 · 含 ${emp} 行按人归集（不摊吨成本）` : `共 ${total} 行`;
  },
}));

const categories = ref<string[]>([]);
const categoryValueMap = ref<Record<string, string>>({});
const itemOptions = ref<string[]>([]);
const periods = ref<string[]>([]);

async function loadAll() {
  try {
    const [items, all] = await Promise.all([costPriceApi.items(), costPriceApi.page({ pageSize: 500 })]);
    categories.value = [...new Set(items.map((i) => i.category))];
    /* 下拉显示分类中文、行里存的也是中文（`eq` 直接比），所以 valueMap 是恒等映射——
       保留它是为了将来若改成「显示中文、存 code」时只动这一处 */
    categoryValueMap.value = Object.fromEntries(categories.value.map((c) => [c, c]));
    itemOptions.value = [...new Set(all.rows.map((r) => r.itemName))];
    periods.value = [...new Set(all.rows.map((r) => r.date))].toReversed();

    const by = new Map<string, number>();
    for (const i of items) by.set(i.category, (by.get(i.category) ?? 0) + 1);
    sourceGroups.value = [...by.entries()].map(([source, count]) => ({ source, count }));

    cards.value = [
      { label: "成本项", value: items.length, sub: "覆盖 B1 的六类" },
      { label: "单价行", value: all.rows.length, sub: `${periods.value.length} 个账期` },
      { label: "数据来源种类", value: by.size, sub: "MES / ERP-IN / EMS / ERP-HR" },
      {
        label: "按人归集的项",
        value: items.filter((i) => i.unit.includes("人")).length,
        sub: "单位是 元/人·月，不摊吨成本",
      },
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
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 按数据来源分布：B1 成本结构表的可视化 -->
    <div class="flex h-9 shrink-0 items-center gap-3 border-b border-border/60 px-3">
      <span class="text-xs font-medium">数据来源分布</span>
      <span v-for="g in sourceGroups" :key="g.source" class="text-xs text-muted-foreground">
        <span class="mr-1 inline-block h-2 w-2 rounded-sm bg-primary/60 align-middle"></span>
        {{ g.source }} <span class="tabular-nums">{{ g.count }}</span>
      </span>
      <span class="ml-auto text-xs text-muted-foreground"> 与规格书 B1「成本结构」表逐项对应 </span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
    </div>
  </div>
</template>
