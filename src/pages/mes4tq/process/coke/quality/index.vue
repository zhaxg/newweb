<script setup lang="ts">
/** 对应 TW0205 焦炭质量与产量（焦化工序 · 附录 A3 版式 **L4 图表分析**）
 *
 *  接口：`cokeQualityApi.page`（POST /tqmes/cokeQuality/listPage）
 *
 *  演示要点：**M40 与 M10 是方向相反的两个指标**——这是这一页唯一要讲的事：
 *  - **M40（摩氏强度）越大越好**，计划线 82%，掉下去说明焦得不够透；
 *  - **M10（磨损强度）越小越好**，涨上去说明焦炭更脆，入炉粉化多。
 *
 *  两条线画在同一张图上时**必须给计划参考线**，否则客户看到 M40 下降、M10 上升
 *  会以为「两个都变差了」，其实两者是同一件事（焦化程度）的两个侧面。
 *  所以图上 M40 走绿、M10 走琥珀，且各自带计划虚线。
 *
 *  另外四个指标（水分 H2O / 干基挥发分 Vdaf / 干基灰分 Ad / 硫分 S）在表里——
 *  它们是**入炉干焦量**的换算依据，也是客户问「为什么这次焦炭贵」时的答案。
 *
 *  待接入：配煤比方案对比（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../../ListPage.vue";
import EChart from "../../../EChart.vue";
import { cokeQualityApi } from "@/api/mes4tq";
import { dayFmt, numFmt, qtyFmt, tagRenderer } from "../../../cells";
import { useNameMaps } from "../../../nameMaps";
import type { ListPageSpec } from "../../../listTypes";
import { tqChartAxis, tqDarkClass, tqHeaderTextClass, tqPanelClass } from "../../../tqTheme";

const { ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TW0205",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "炉号 / 日期 / 备注" },
    { key: "ovenNo", label: "焦炉", kind: "select", options: OVENS, placeholder: "全部" },
    { key: "shift", label: "班次", kind: "select", options: ["A", "B", "C"], placeholder: "全部" },
    { key: "date", label: "日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "date", headerName: "日期", width: 110, pinned: "left", valueFormatter: dayFmt },
    { field: "ovenNo", headerName: "炉号", width: 84 },
    { field: "output", headerName: "产量 t", width: 106, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "qualified", headerName: "合格品 t", width: 110, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "h2o", headerName: "水分 %", width: 96, type: "numericColumn", valueFormatter: numFmt(1) },
    { field: "vdaf", headerName: "Vdaf %", width: 96, type: "numericColumn", valueFormatter: numFmt(1) },
    { field: "ad", headerName: "Ad %", width: 96, type: "numericColumn", valueFormatter: numFmt(1) },
    /* M40 越大越好：正的 m40Delta 是「高于计划」，列上直接显示带符号的差值 */
    { field: "m40", headerName: "M40 %", width: 96, type: "numericColumn", valueFormatter: numFmt(1) },
    { field: "m10", headerName: "M10 %", width: 96, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "s", headerName: "硫分 %", width: 96, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "m40Delta", headerName: "M40 vs 计划", width: 116, type: "numericColumn", valueFormatter: numFmt(1) },
    {
      field: "shift",
      headerName: "班次",
      width: 76,
      valueFormatter: (p) => ({ A: "A 早班", B: "B 中班", C: "C 夜班" })[String(p.value)] ?? p.value,
    },
    { field: "remark", headerName: "备注", minWidth: 220, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "推焦实绩", kind: "link", to: "/tqmes/process/coke/push" },
  ],
  toolbar: { extraButtons: ["▶ 模拟焦炭产出"] },
  fetch: (q) => cokeQualityApi.page(q),
  summary: ({ total, rows }) => {
    const bad = rows.filter((r: any) => Number(r.m40) < 82).length;
    return bad ? `本页 ${total} 行 · M40 低于计划 ${bad} 行` : `共 ${total} 行`;
  },
}));

const OVENS = ["1#", "2#", "3#", "4#", "5#", "6#"];

/** 图表数据：按**日**聚合（表是炉 × 日的行，图要 14 个点） */
const seriesData = ref<{ dates: string[]; m40: number[]; m10: number[]; output: number[] }>({
  dates: [],
  m40: [],
  m10: [],
  output: [],
});

/**
 * 双指标图：M40 走绿、M10 走琥珀，各自带计划虚线。
 *
 * 两条线**数值量级差一个数量级**（M40 ~82、M10 ~7），放同一个 y 轴会让 M10 贴底成直线，
 * 读不出起伏——所以给 M10 一个**第二 y 轴**（`yAxisIndex: 1`）。
 * 这是这张图唯一不能省的配置，省了 M10 就白画了。
 */
const trendOption = computed(() => ({
  backgroundColor: "transparent",
  grid: { left: 52, right: 56, top: 30, bottom: 28 },
  tooltip: { trigger: "axis" as const },
  legend: { data: ["M40", "M10", "产量"], textStyle: { color: "#CBD5E1", fontSize: 12 } },
  xAxis: { type: "category" as const, data: seriesData.value.dates, boundaryGap: false, ...tqChartAxis(true) },
  yAxis: [
    { type: "value" as const, min: 74, max: 88, ...tqChartAxis(true) },
    { type: "value" as const, min: 5, max: 9, splitLine: { show: false }, ...tqChartAxis(true) },
  ],
  series: [
    {
      name: "M40",
      type: "line" as const,
      smooth: true,
      data: seriesData.value.m40,
      lineStyle: { width: 2, color: "#22C55E" },
      itemStyle: { color: "#22C55E" },
      markLine: {
        silent: true,
        symbol: "none",
        lineStyle: { color: "rgba(34,197,94,0.65)", type: "dashed" as const, width: 1 },
        label: { color: "#22C55E", fontSize: 10, formatter: "计划 82" },
        data: [{ yAxis: 82 }],
      },
    },
    {
      name: "M10",
      type: "line" as const,
      yAxisIndex: 1,
      smooth: true,
      data: seriesData.value.m10,
      lineStyle: { width: 2, color: "#F59E0B" },
      itemStyle: { color: "#F59E0B" },
      markLine: {
        silent: true,
        symbol: "none",
        lineStyle: { color: "rgba(245,158,11,0.65)", type: "dashed" as const, width: 1 },
        label: { color: "#F59E0B", fontSize: 10, formatter: "计划 7.5" },
        data: [{ yAxis: 7.5 }],
      },
    },
    {
      name: "产量",
      type: "bar" as const,
      yAxisIndex: 0,
      data: seriesData.value.output,
      itemStyle: { color: "rgba(56,189,248,0.28)" },
      barWidth: 10,
    },
  ],
}));

async function loadCards() {
  try {
    const res = await cokeQualityApi.page({ pageSize: 500 });
    const rows = [...res.rows].toSorted((a, b) => (a.date < b.date ? -1 : 1));
    const byDate = new Map<string, { m40: number[]; m10: number[]; out: number; q: number }>();
    for (const r of rows) {
      const cur = byDate.get(r.date) ?? { m40: [], m10: [], out: 0, q: 0 };
      cur.m40.push(r.m40);
      cur.m10.push(r.m10);
      cur.out += r.output;
      cur.q += r.qualified;
      byDate.set(r.date, cur);
    }
    const dates = [...byDate.keys()].toSorted((a, b) => (a < b ? -1 : 1));
    seriesData.value = {
      dates: dates.map((d) => d.slice(5)),
      m40: dates.map(
        (d) => Math.round((byDate.get(d)!.m40.reduce((s, v) => s + v, 0) / byDate.get(d)!.m40.length) * 10) / 10,
      ),
      m10: dates.map(
        (d) => Math.round((byDate.get(d)!.m10.reduce((s, v) => s + v, 0) / byDate.get(d)!.m10.length) * 100) / 100,
      ),
      output: dates.map((d) => byDate.get(d)!.out),
    };
    const all = rows;
    const avg = (f: "m40" | "m10") => all.reduce((s, r) => s + r[f], 0) / Math.max(1, all.length);
    const output = all.reduce((s, r) => s + r.output, 0);
    const qualified = all.reduce((s, r) => s + r.qualified, 0);
    cards.value = [
      { label: "M40 均值（越大越好）", value: avg("m40").toFixed(1), sub: "计划 82 · 低于此要调配煤" },
      { label: "M10 均值（越小越好）", value: avg("m10").toFixed(2), sub: "计划 7.5 · 涨了就是变脆" },
      { label: "近 14 天产量", value: `${Math.round(output).toLocaleString("zh-CN")} t`, sub: "6 炉合计" },
      { label: "合格品率", value: `${((qualified / Math.max(1, output)) * 100).toFixed(2)}%`, sub: "合格品 / 总产量" },
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

onMounted(() => void loadCards());
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" :class="tqDarkClass">
    <!-- 图表区：双 y 轴 + 计划虚线（见 trendOption 的说明） -->
    <div class="shrink-0 border-b border-white/10 px-3 pb-2 pt-2">
      <div class="mb-1 flex items-center gap-3">
        <span :class="tqHeaderTextClass">焦炭质量趋势（近 14 天）</span>
        <span class="text-xs text-slate-500"> 左轴 M40（越大越好）· 右轴 M10（越小越好）· 虚线为计划值 </span>
      </div>
      <EChart :option="trendOption" height="196px" force-dark />
    </div>

    <!-- 统计卡 + 表格 -->
    <div class="flex min-h-0 flex-1 flex-col" :class="tqPanelClass">
      <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
    </div>
  </div>
</template>
