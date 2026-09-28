<script setup lang="ts">
/** 对应 TR0003 综合统计报表（统计报表 · 附录 A3 版式 **L4 分组表 + 子项钻取**）
 *
 *  接口：`statApi.page`（kind=summary 三类汇总）· `statApi.drill`（子项明细）
 *        `statApi.periods` / `statApi.indicators`（候选取自数据）
 *
 *  演示要点：**A3 对这一页的原话是「燃料消耗/原料收支/质量汇总」**——
 *  所以表就按这三类分组，**不自行增减分类**（客户会照着规格书核对，
 *  多出第四类或少掉一类，他会以为规格没做完）。
 *
 *  **燃料消耗对非燃料工序给 0 并标注**：原料、球团、石灰不烧焦炭，
 *  给它们一个 0 而不是留空，是因为「0」是**算出来的结论**（不消耗）、
 *  留空则会被读成「没查到」——两者在对账时是完全不同的意思，
 *  所以备注列必须写清「本工序不消耗焦炭类燃料，列此行仅供对齐」。
 *
 *  **原料收支的 `childItems` 是 `期初/入/出` 三个数**，客户能当场验：
 *  `期初 + 入 − 出` 是否等于结存。而**质量汇总**的子项是合格批/总批。
 *  三类的子项形状各不相同——所以钻取时按 `indicator` 读各自那一套，
 *  不套用统一模板（套了就会把「期初」显示成「班值」）。
 *
 *  待接入：报表导出、月度定稿（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import DetailDialog from "../../DetailDialog.vue";
import { statApi } from "@/api/mes4tq";
import { dayFmt, numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { DetailSection, ListPageSpec } from "../../listTypes";

const { ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const indicatorOptions = ref<string[]>([]);
const periods = ref<string[]>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TR0003",
  exportEntity: "comprehensive-report",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "工序 / 分类 / 算式" },
    { key: "indicator", label: "分类", kind: "select", options: indicatorOptions.value, placeholder: "全部" },
    {
      key: "process",
      label: "工序",
      kind: "select",
      options: processOptions.value,
      valueMap: processValueMap.value,
      placeholder: "全部",
    },
    { key: "granularity", label: "粒度", kind: "select", options: ["日", "月", "班"], placeholder: "全部" },
  ],
  columns: [
    { field: "target", headerName: "统计对象", minWidth: 240, flex: 1, pinned: "left" },
    /* 分类列是这一屏的组织维度：燃料消耗 / 原料收支 / 质量汇总——**只有这三类** */
    { field: "indicator", headerName: "分类", width: 132, cellRenderer: tagRenderer() },
    { field: "period", headerName: "账期", width: 96, valueFormatter: dayFmt },
    { field: "granularity", headerName: "粒度", width: 84 },
    { field: "unit", headerName: "单位", width: 116 },
    { field: "value", headerName: "母项值", width: 140, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "planValue", headerName: "计划值", width: 130, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "formula", headerName: "计算公式", minWidth: 320, flex: 2, valueFormatter: (p) => p.value || "—" },
    { field: "remark", headerName: "备注", minWidth: 240, flex: 2 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "日报", kind: "link", to: "/tqmes/report/daily" },
  ],
  toolbar: { extraButtons: ["▶ 模拟生成综合报表"] },
  fetch: (q) => statApi.page({ ...q, kind: "summary" }),
  onRowClick: (row) => void openDrill(row),
  summary: ({ total, rows }) => {
    const kinds = new Set(rows.map((r: any) => r.indicator)).size;
    return `共 ${total} 行 · ${kinds} 类（燃料消耗 / 原料收支 / 质量汇总）`;
  },
}));

const processOptions = ref<string[]>([]);
const processValueMap = ref<Record<string, string>>({});

/* ── 子项钻取 ─────────────────────────────────────────── */

const drillOpen = ref(false);
const drillData = ref<Record<string, any> | null>(null);

/**
 * 三类的子项形状各不相同（期初/入/出 vs 合格批/总批 vs 各机组值），
 * 所以**按 `indicator` 决定段落标题**，不套统一模板——
 * 把「期初」显示在「班值」的标题下就是页间矛盾。
 */
const DRILL_SECTIONS: DetailSection[] = [
  {
    title: "母项与算式",
    fields: [
      { label: "统计对象", from: "target" },
      { label: "分类", from: "indicator" },
      { label: "账期", from: "period" },
      { label: "母项值", from: "value" },
      { label: "单位", from: "unit" },
      { label: "计算公式", from: "formula" },
    ],
  },
  {
    title: "子项明细",
    fields: [{ label: "明细", from: "_childrenText" }],
  },
];

async function openDrill(row: any) {
  try {
    const d = await statApi.drill(row.id);
    const kids = (d?.children ?? [])
      .map((c: any) => `${c.name} ${Number(c.value).toLocaleString("zh-CN")}${c.unit || ""}`)
      .join(" · ");
    drillData.value = {
      ...(d ?? row),
      /* 三种形状各自的额外说明：收支类要验 `期初+入−出`，质量类要读批数 */
      _childrenText:
        row.indicator === "原料收支"
          ? `${kids}。验算：期初 + 入 − 出 应等于结存`
          : row.indicator === "质量汇总"
            ? `${kids}。合格率 = 合格批 / 总批 × 100%`
            : kids || "无子项",
    };
  } catch {
    drillData.value = { ...row, _childrenText: "查询失败（拦截层已提示）" };
  }
  drillOpen.value = true;
}

async function loadAll() {
  try {
    const [inds, all] = await Promise.all([statApi.indicators(), statApi.page({ kind: "summary", pageSize: 500 })]);
    indicatorOptions.value = inds;
    periods.value = [...new Set(all.rows.map((r) => r.period))].toSorted((a, b) => b.localeCompare(a));

    const NAMES: Record<string, string> = {
      raw: "原料",
      coke: "焦化",
      pellet: "球团",
      sinter: "烧结",
      lime: "石灰",
      blast: "高炉",
    };
    processValueMap.value = Object.fromEntries(Object.entries(NAMES).map(([code, cn]) => [`${cn}工序`, code]));
    processOptions.value = Object.values(NAMES).map((cn) => `${cn}工序`);

    const rows = all.rows;
    cards.value = [
      { label: "汇总行数", value: rows.length, sub: "六道工序 × 三类" },
      {
        label: "分类数",
        value: new Set(rows.map((r) => r.indicator)).size,
        sub: "A3 原话：燃料消耗/原料收支/质量汇总",
      },
      {
        label: "不适用的燃料行",
        value: rows.filter((r) => r.indicator === "燃料消耗" && Number(r.value) === 0).length,
        sub: "给 0 并标注，不留空",
      },
      { label: "账期", value: periods.value[0] ?? "—", sub: `共 ${periods.value.length} 期` },
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
    <!-- 分类速览：三类各自的行数（与表格同源，客户对规格书时看这里） -->
    <div class="flex h-9 shrink-0 items-center gap-4 border-b border-border/60 px-3">
      <span class="text-xs font-medium">分类</span>
      <span v-for="i in indicatorOptions" :key="i" class="text-xs text-muted-foreground">
        <span class="mr-1 inline-block h-2 w-2 rounded-sm bg-primary/60 align-middle"></span>{{ i }}
      </span>
      <span class="ml-auto text-xs text-muted-foreground">
        点表格任意一行看它的子项；收支类要验「期初 + 入 − 出」
      </span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
    </div>

    <DetailDialog v-model:open="drillOpen" title="子项明细" :sections="DRILL_SECTIONS" :data="drillData" />
  </div>
</template>
