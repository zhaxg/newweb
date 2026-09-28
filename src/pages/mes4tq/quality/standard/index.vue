<script setup lang="ts">
/** 对应 TQ0001 检验标准维护（质量管理 · 附录 A3 版式 **L1 列表页**）
 *
 *  接口：`qualityStandardApi.page`（POST /tqmes/qualityStandard/listPage）
 *        `qualityStandardApi.products`（品名候选，与 TQ0003 同源）
 *
 *  演示要点：**这一页是整条质检链的口径源头**——TQ0003 判「合格/不合格」时
 *  用的就是这张表的 `min`/`max`。所以在 TQ0001 改一个上下限，
 *  TQ0003 的判定**当场跟着变**，两页不可能给出不同结论。这就是为什么
 *  判定不在 TQ0003 页面上算（页面自己写一条 0.8% 会与标准分家）。
 *
 *  **`roundRule` 与 `section` 不是装饰**——它俩在边界值上决定合格与否：
 *  - `roundRule` 修约方式不同，同一样本会算出不同的报告值；
 *  - `section` 开闭区间不同，TFe 恰好 55.00 时算不算合格就不同。
 *  这两列在很多系统里被省掉，**省掉就等于标准不完整**，客户（尤其质量主管）一眼看得出。
 *
 *  待接入：新增标准、修改上下限（本域只查桩；改了要能立刻在 TQ0003 复核，
 *  所以这一页将来接写操作时必须通知实绩页重算）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { qualityStandardApi } from "@/api/mes4tq";
import { numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const proOptions = ref<string[]>([]);
const proValueMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: "TQ0001",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "品名 / 检验项 / 标准号 / 修约规则" },
    {
      key: "proName",
      label: "品名",
      kind: "select",
      options: proOptions.value,
      valueMap: proValueMap.value,
      placeholder: "全部",
    },
    {
      key: "workshopCode",
      label: "车间",
      kind: "select",
      options: ["CJ02", "CJ03", "CJ06"],
      valueMap: { CJ02: "CJ02", CJ03: "CJ03", CJ06: "CJ06" },
      placeholder: "全部",
    },
    {
      key: "section",
      label: "区间",
      kind: "select",
      options: ["[min,max]", "(min,max]", "[min,max)"],
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "proName", headerName: "品名", width: 116, pinned: "left" },
    { field: "stdCode", headerName: "标准号", width: 176 },
    { field: "inspecName", headerName: "检验项", width: 140 },
    { field: "unit", headerName: "单位", width: 92 },
    /* 上下限：**区间符号同屏**（`section`），否则 55.00 这个边界值算不算合格说不清 */
    { field: "min", headerName: "下限", width: 106, type: "numericColumn", valueFormatter: numFmt(4) },
    { field: "max", headerName: "上限", width: 106, type: "numericColumn", valueFormatter: numFmt(4) },
    { field: "section", headerName: "区间", width: 128, valueFormatter: (p) => p.value || "—" },
    { field: "decimalDigit", headerName: "小数位", width: 96, type: "numericColumn", valueFormatter: numFmt(0) },
    /* 修约规则：行业口径（二五成双 / 四舍六入五成双 / 四舍），改了会改判定结果 */
    { field: "roundRule", headerName: "修约规则", width: 156, cellRenderer: tagRenderer() },
    { field: "integerDigit", headerName: "整数位", width: 96, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "workshopCode", headerName: "车间", width: 96 },
    { field: "nOrder", headerName: "排序", width: 84, type: "numericColumn", valueFormatter: numFmt(0) },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "按品名看实绩", kind: "link", to: "/tqmes/quality/result" },
  ],
  toolbar: { extraButtons: ["▶ 模拟标准变更"] },
  fetch: (q) => qualityStandardApi.page(q),
  summary: ({ total, rows }) => {
    const open = rows.filter((r: any) => r.section === "(min,max]").length;
    return `本页 ${total} 项 · 开区间上限 ${open} 项`;
  },
}));

async function loadAll() {
  try {
    const [products, all] = await Promise.all([
      qualityStandardApi.products(),
      qualityStandardApi.page({ pageSize: 500 }),
    ]);
    proOptions.value = products;
    /* 候选要能**原值透传**（下拉显示品名、行里存的也是品名），所以 valueMap 是恒等映射。
       这不是多余：万一将来改成「显示品名、存 proCode」，只有这一处要动 */
    proValueMap.value = Object.fromEntries(products.map((p) => [p, p]));

    const rows = all.rows;
    cards.value = [
      { label: "品名数", value: products.length, sub: "覆盖全部产成品与原燃料" },
      { label: "检验项", value: rows.length, sub: "每个品名 3~5 项" },
      {
        label: "带上下限的项",
        value: rows.filter((r) => r.min != null || r.max != null).length,
        sub: "判定的唯一依据",
      },
      { label: "开区间项", value: rows.filter((r) => r.section === "(min,max]").length, sub: "边界值判定更严格" },
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
