<script setup lang="ts">
/** 对应 TR0001 生产日报月报（统计报表 · 附录 A3 版式 **L4 列表 + 子母项钻取弹窗**）
 *
 *  接口：`statApi.page`（kind=daily 日报 / kind=summary 月报）· `statApi.drill`（子母项钻取）
 *
 *  演示要点：**「这个数怎么来的」必须能点开看**——这是这一页与一张 Excel 的全部区别。
 *  每行的 `formula` 列写着算式，**点表格任意一行**弹出子母项钻取，
 *  能看到 `月 → 日 → 班` 三层（B4 原话：班实绩 → 日汇总 → 月汇总 → 技经指标）。
 *
 *  **母项不自己算**：产量、利用系数、焦比、煤比、合格品率全部来自 `model.ts`——
 *  报表页自己算就是第二份口径，而它与 model 打架时页面照样渲染、没有任何工具会报错。
 *  所以 `formula` 里直接写出 `model` 的函数名：客户问「代码里这个数怎么来的」，
 *  看公式列就能定位到那一行。
 *
 *  **利用系数的时间单位在两道工序上不同**（高炉按天、烧结按小时），
 *  公式列里**必须写出来**——写成一个通用公式，烧结的系数会差 24 倍，
 *  而这个错误在演示上是致命的（规格书 B9 给的 1.82 就是踩了这个坑）。
 *
 *  **完成率对计划为 0 的行不显示**（`0` 做分母会得到 Infinity）——
 *  统计卡上单独给一个「计划为 0」的计数，说明为什么有些行没有完成率。
 *
 *  待接入：日快照固化、月报定稿（本域只查桩；真实系统里日快照不可修改）。
 */
import { computed, onMounted, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import ListPage from "../../ListPage.vue";
import DetailDialog from "../../DetailDialog.vue";
import { statApi } from "@/api/mes4tq";
import { dayFmt, numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { DetailSection, ListPageSpec } from "../../listTypes";

const { ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

/** 日报 / 月报切换：**同一个端点、换 `kind`**——两张报表的字段形状完全相同 */
const mode = ref<"daily" | "summary">("daily");

const spec = computed<ListPageSpec>(() => ({
  code: "TR0001",
  exportEntity: mode.value === "daily" ? "daily-report" : "monthly-report",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "机组 / 指标 / 算式" },
    { key: "indicator", label: "指标", kind: "select", options: indicatorOptions.value, placeholder: "全部" },
    {
      key: "process",
      label: "工序",
      kind: "select",
      options: processOptions.value,
      valueMap: processValueMap.value,
      placeholder: "全部",
    },
    { key: "granularity", label: "粒度", kind: "select", options: ["日", "月", "班"], placeholder: "全部" },
    { key: "period", label: "日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "period", headerName: "日期", width: 116, pinned: "left", valueFormatter: dayFmt },
    { field: "target", headerName: "统计对象", minWidth: 220, flex: 1 },
    { field: "indicator", headerName: "指标", width: 128, cellRenderer: tagRenderer() },
    { field: "granularity", headerName: "粒度", width: 84 },
    { field: "unit", headerName: "单位", width: 116 },
    { field: "value", headerName: "母项值", width: 130, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "planValue", headerName: "计划值", width: 130, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "rate", headerName: "完成率 %", width: 116, type: "numericColumn", valueFormatter: numFmt(2) },
    /* 公式列给 flex：它是「这个数怎么来的」的书面答案，窄列会截断 */
    { field: "formula", headerName: "计算公式", minWidth: 320, flex: 2, valueFormatter: (p) => p.value || "—" },
    { field: "remark", headerName: "备注", minWidth: 160, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "班组指标", kind: "link", to: "/tqmes/report/team" },
  ],
  toolbar: { extraButtons: ["▶ 模拟生成日快照"] },
  fetch: (q) => statApi.page({ ...q, kind: mode.value }),
  /* 点任意一行即打开子母项钻取（`ListPage` 的 `onRowClick`）——
     「子母项」是这一页的主动作，放行内按钮反而要逐行去找 */
  onRowClick: (row) => void openDrill(row),
  summary: ({ total, rows }) => {
    const noPlan = rows.filter((r: any) => r.planValue == null).length;
    return noPlan ? `本页 ${total} 行 · ${noPlan} 行无计划值（不计完成率）` : `共 ${total} 行`;
  },
}));

const indicatorOptions = ref<string[]>([]);
const processOptions = ref<string[]>([]);
const processValueMap = ref<Record<string, string>>({});

/* ── 子母项钻取 ───────────────────────────────────────── */

const drillOpen = ref(false);
const drillData = ref<Record<string, any> | null>(null);

/**
 * 钻取弹窗的分段：算式 → 子项 → 班层。
 * **顺序就是「从母到子」的顺序**，不是按字段字母序——读的顺序就是算的顺序。
 *
 * 后两段的值由 `openDrill` 拍平成一行可读串：`DetailDialog` 对对象数组
 * 只会 `join`，结果是 `[object Object]、[object Object]`（见该文件的 `valueOf`）。
 */
const DRILL_SECTIONS: DetailSection[] = [
  {
    title: "母项与算式",
    fields: [
      { label: "统计对象", from: "target" },
      { label: "指标", from: "indicator" },
      { label: "期间", from: "period" },
      { label: "粒度", from: "granularity" },
      { label: "母项值", from: "value" },
      { label: "单位", from: "unit" },
      { label: "计算公式", from: "formula" },
    ],
  },
  {
    title: "子项明细",
    fields: [{ label: "各子项", from: "_childrenText" }],
  },
  {
    title: "班层（model 算出的日 → 三班树）",
    fields: [{ label: "班值", from: "_treeText" }],
  },
];

async function openDrill(row: any) {
  try {
    const d = await statApi.drill(row.id);
    if (!d) {
      drillData.value = { ...row, _childrenText: "该行没有子项明细", _treeText: "—" };
    } else {
      const kids = (d.children ?? [])
        .map((c: any) => `${c.name} ${Number(c.value).toLocaleString("zh-CN")}${c.unit || ""}`)
        .join(" · ");
      /* 班层树是 `model` 算的真树（日 → A/B/C 三班），只在日粒度有；
         其余粒度没有班层，显示成「该粒度没有班层」比留空好读 */
      const tree = (d.levelTree?.children ?? [])
        .slice(-3)
        .map((day: any) => `${day.period}: ${day.children.map((c: any) => `${c.period}班 ${c.value}`).join(" / ")}`)
        .join("  ｜  ");
      drillData.value = {
        ...d,
        _childrenText: kids || "无子项",
        _treeText: tree || "该粒度没有班层（只有日与月）",
      };
    }
  } catch {
    drillData.value = { ...row, _childrenText: "查询失败（拦截层已提示）", _treeText: "—" };
  }
  drillOpen.value = true;
}

async function loadAll() {
  try {
    const [inds, dates, all] = await Promise.all([
      statApi.indicators(),
      statApi.dates(),
      statApi.page({ kind: "daily", pageSize: 500 }),
    ]);
    indicatorOptions.value = inds;
    /* 中文名 → 工序键：`eq` 比的是行里的 `process` 原值，不翻过来筛出 0 行 */
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

    cards.value = [
      { label: "日报行数", value: all.rows.length, sub: `覆盖 ${dates.length} 天` },
      { label: "指标种类", value: inds.length, sub: "来自 TG0005 的定义" },
      { label: "有计划值", value: all.rows.filter((r) => r.planValue != null).length, sub: "可算完成率" },
      { label: "无计划值", value: all.rows.filter((r) => r.planValue == null).length, sub: "0 做分母会得到 Infinity" },
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
    <!-- 日报 / 月报切换：同一个端点换 kind，所以两档的列完全一致 -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Button
        variant="outlined"
        :class="mode === 'daily' ? 'border-primary text-primary' : ''"
        @click="
          mode = 'daily';
          listRef?.reload();
        "
      >
        日报
      </Button>
      <Button
        variant="outlined"
        :class="mode === 'summary' ? 'border-primary text-primary' : ''"
        @click="
          mode = 'summary';
          listRef?.reload();
        "
      >
        月报（按工序汇总）
      </Button>
      <span class="ml-auto text-xs text-muted-foreground"> 日报与月报是同一棵子母项树的不同层——两层数必须对得上 </span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
    </div>

    <!-- 子母项钻取弹窗（点表格任意一行打开） -->
    <DetailDialog v-model:open="drillOpen" title="子母项明细" :sections="DRILL_SECTIONS" :data="drillData" />
  </div>
</template>
