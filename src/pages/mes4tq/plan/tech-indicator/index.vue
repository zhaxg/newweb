<script setup lang="ts">
/** 对应 TP0001 技经指标管理（计划管理 · 附录 A3 版式 **L1 列表页 + 完成率方向卡**）
 *
 *  接口：`techIndicatorApi.page`（POST /tqmes/techIndicator/listPage）
 *        `techIndicatorApi.compare`（GET /tqmes/techIndicator/compare）
 *
 *  演示要点：**「完成率」必须知道方向才有意义**——这是这一页唯一容易做错的地方：
 *  利用系数、合格品率是**越大越好**（105% 是超产），
 *  而焦比、煤比、单耗、成本是**越小越好**（92% 是省了）。
 *  一律按「≥100% 算达标」会把省下来的煤标成红的。
 *  所以行上带一列 `direction`（由**指标名**判定，是指标的性质、不随行变，
 *  住在数据层见 `api/mes4tq/types.ts` 的 `direction` 注释），
 *  「达标口径」列把它翻成中文，页面据此决定达标色。
 *
 *  **与 TG0005 的分工**：那一页维护**指标定义**（有哪些指标、公式、粒度），
 *  这一页维护**某年某月的指标值**（计划 vs 实际）。两张表别混，混了公式就没地方放。
 *
 *  期别与指标两个下拉**从数据里取**，不写死候选——写死会出现筛不出行的选项。
 *
 *  待接入：录入指标、审核（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { techIndicatorApi } from "@/api/mes4tq";
import { codeFmt, dashFmt, numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

/** 候选从数据里取（近 6 个月 × 启用的指标），不写死 */
const periods = ref<string[]>([]);
const planItems = ref<string[]>([]);
const years = computed(() => [...new Set(periods.value.map((p) => p.slice(0, 4)))]);

const spec = computed<ListPageSpec>(() => ({
  code: "TP0001",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "指标名 / 机组 / 计划类型" },
    { key: "planItem", label: "指标", kind: "select", options: planItems.value, placeholder: "全部" },
    { key: "period", label: "期别", kind: "select", options: periods.value, placeholder: "全部" },
    { key: "year", label: "年份", kind: "select", options: years.value, placeholder: "全部" },
    { key: "month", label: "月份", kind: "select", options: MONTH_OPTIONS, placeholder: "全部" },
    { key: "planType", label: "计划类型", kind: "select", options: ["高炉技经", "烧结技经"], placeholder: "全部" },
  ],
  columns: [
    { field: "workstation", headerName: "机组", width: 118, pinned: "left", valueFormatter: codeFmt(unitMap.value) },
    { field: "planItem", headerName: "指标", width: 170 },
    { field: "planType", headerName: "计划类型", width: 116, cellRenderer: tagRenderer() },
    { field: "value", headerName: "计划值", width: 110, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "actualValue", headerName: "实际值", width: 110, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "unit", headerName: "单位", width: 168, valueFormatter: dashFmt },
    { field: "rate", headerName: "完成率 %", width: 110, type: "numericColumn", valueFormatter: numFmt(2) },
    /* 达标口径列：`higher`→「越大越好」、`lower`→「越小越好」，`tagRenderer` 上色 */
    { field: "direction", headerName: "达标口径", width: 116, cellRenderer: (p: any) => dirTag(p.value) },
    { field: "year", headerName: "年", width: 78, type: "numericColumn" },
    { field: "month", headerName: "月", width: 68, type: "numericColumn" },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "指标定义", kind: "link", to: "/tqmes/basic/indicator" },
  ],
  toolbar: { extraButtons: ["▶ 模拟月度结算"] },
  fetch: (q) => techIndicatorApi.page(q),
  summary: ({ total, rows }) => {
    /* 低 95% 的**两类口径都要算**：越大越好的低于 95 是差、越小越好的低于 95 是好，
       所以这里只报「绝对偏离计划超过 5%」，不判好坏——好坏由 `direction` 列说 */
    const off = rows.filter((r: any) => Math.abs(Number(r.rate ?? 100) - 100) > 5).length;
    return off ? `本页 ${total} 条 · 偏离计划超 5% 的 ${off} 条` : `共 ${total} 条`;
  },
}));

const MONTH_OPTIONS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

/** 达标口径的色标：越大越好给绿、越小越好给蓝——**颜色只标方向，不标好坏** */
function dirTag(v: unknown) {
  const s = String(v ?? "");
  const el = document.createElement("span");
  const cls =
    s === "lower"
      ? "text-sky-600 bg-sky-500/12 dark:text-sky-400"
      : s === "higher"
        ? "text-emerald-600 bg-emerald-500/12 dark:text-emerald-400"
        : "text-muted-foreground bg-muted";
  el.className = `inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${cls}`;
  el.textContent = s === "lower" ? "越小越好" : s === "higher" ? "越大越好" : "—";
  return el;
}

/**
 * 统计卡 + 候选项。
 *
 * 候选用一次 `page({pageSize:500})` 取而不是另开三个端点：这些候选**本来就是这张表自己的取值域**
 * （有哪些期别、有哪些指标名），再开三个端点等于把同一批数据问三遍。
 */
async function loadAll() {
  try {
    const [all, recent] = await Promise.all([
      techIndicatorApi.page({ pageSize: 500 }),
      techIndicatorApi.compare(periods.value[0] ?? "202609"),
    ]);
    const rows = all.rows;
    periods.value = [...new Set(rows.map((r) => `${r.year}${String(r.month).padStart(2, "0")}`))].toReversed();
    planItems.value = [...new Set(rows.map((r) => r.planItem).filter(Boolean))];

    const off = recent.filter((r) => Math.abs(Number(r.rate ?? 100) - 100) > 5);
    cards.value = [
      { label: "本期指标项", value: recent.length, sub: periods.value[0] ?? "—" },
      { label: "偏离计划 >5%", value: off.length, sub: "方向由 `direction` 定，不判好坏" },
      { label: "计划类型", value: new Set(rows.map((r) => r.planType)).size, sub: "高炉技经 / 烧结技经" },
      { label: "覆盖期别", value: periods.value.length, sub: "近 6 个月" },
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
