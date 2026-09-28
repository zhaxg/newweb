<script setup lang="ts">
/**
 * ER0001 能耗统计报表（模块四 · 附录 B5 版式 **V4 分析 · 多标签页**）
 *
 *  接口：`reportApi.ranking`（KPI 卡片，与 EO0001/EO0002 同源）
 *        `reportApi.regionStat` / `subStat` / `elecTimeUse` / `mediaOptions`
 *
 *  演示要点：**四页签 = 规格书 ER0001 的四个标签**（区域能耗 / 分项能耗 /
 *  峰平谷电能 / 排名），顶部 KPI 卡片行常驻——四个数与大屏、KPI 看板
 *  **读同一个 `kpiBoard`**，所以这页永远和 EO0002 对得上。
 *
 *  三条口径纪律（这一页最容易越权）：
 *  1. **不直连 `@/mock`**：早期版本 `import { regionStat } from "@/mock/…"`,
 *     等于把派生层搬进视图层，`model` 改口径页面不会编译报错、只会悄悄出错。
 *     现在全走端点，`temp/check_ems_api_calls.py` 会把直连拦下来。
 *  2. **峰平谷的两块量纲不同**：`tiers`（时段合计，kWh）与 `hourlyKWh`（24 点形状）
 *     **必须分轴**——本域踩过「三条不同量纲的线塞一个 y 轴」的坑。
 *  3. **排名的名次颜色不标好坏**：第 1 名绿、2~3 名蓝、其余灰——
 *     颜色标名次不标评价，否则第 4 名看着像「这厂差」。
 *
 *  待接入：真正的 CSV 落盘（当前只 toast，见 `exportCsv`）。
 */
import { isDark } from "@/composables/useAppTheme";
import { computed, onMounted, ref } from "vue";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import Button from "primevue/button";
import EChart from "../../EChart.vue";
import { reportApi } from "@/api/energy";
import { useToast } from "@/composables/useToast";
import { TONE_TEXT, emsChartAxis, emsHeaderTextClass } from "../../emsTheme";
import { moneyFmt } from "../../cells";
import type { EChartsOption } from "echarts";

const { toast } = useToast();

/** 四个页签 = 规格书 ER0001 点名的四块，顺序照规格书 */
const TABS = [
  { key: "region", label: "区域能耗" },
  { key: "sub", label: "分项能耗" },
  { key: "elec", label: "峰平谷电能" },
  { key: "rank", label: "排名" },
] as const;
type TabKey = (typeof TABS)[number]["key"];
const active = ref<TabKey>("region");

/* ── KPI 卡片行（常驻，四页签共用）──────────────────────────────────── */

/**
 * `ranking()` 回的是**裸数值对象**（`ventRatePct`/`compositeKgce`/…），
 * 卡片要的是 `{label,value,unit,tone,hint}`。
 * 这个映射**只写一次、四页签共用**——四个页签各映射一遍就会出现
 * 「区域能耗页的放散率是绿的、排名页是红的」这种页间矛盾。
 */
interface KpiCard {
  label: string;
  value: string;
  unit?: string;
  tone: string;
  hint: string;
}
const kpiCards = ref<KpiCard[]>([]);

async function loadKpi() {
  try {
    const k = await reportApi.ranking();
    const t = k.targets ?? {};
    kpiCards.value = [
      {
        label: "吨钢综合能耗",
        value: Number(k.compositeKgce ?? 0).toFixed(1),
        unit: " kgce/t",
        tone: Number(k.compositeKgce) <= Number(t.compositeKgce ?? Infinity) ? TONE_TEXT.ok : TONE_TEXT.warn,
        hint: `目标 ${t.compositeKgce ?? "—"} · 越低越好`,
      },
      {
        label: "煤气放散率",
        value: Number(k.ventRatePct ?? 0).toFixed(1),
        unit: "%",
        tone: Number(k.ventRatePct) <= Number(t.ventRatePct ?? Infinity) ? TONE_TEXT.ok : TONE_TEXT.bad,
        hint: `目标 ${t.ventRatePct ?? "—"}% · 越低越好`,
      },
      {
        label: "自发电率",
        value: Number(k.selfGenRatePct ?? 0).toFixed(1),
        unit: "%",
        tone: Number(k.selfGenRatePct) >= Number(t.selfGenRatePct ?? 0) ? TONE_TEXT.ok : TONE_TEXT.warn,
        hint: `目标 ${t.selfGenRatePct ?? "—"}% · 越高越好`,
      },
      {
        label: "吨钢能源成本",
        value: Number(k.costPerTonSteel ?? 0).toFixed(1),
        unit: " 元/t",
        tone: Number(k.costPerTonSteel) <= Number(t.costPerTonSteel ?? Infinity) ? TONE_TEXT.ok : TONE_TEXT.warn,
        hint: `目标 ${t.costPerTonSteel ?? "—"} · 外购口径`,
      },
    ];
  } catch {
    /* 拦截层已 toast；卡片留空即可，四页签仍可用 */
  }
}

/* ── 四页签各自的行数据 ──────────────────────────────────────────────── */

interface AreaRow {
  unitName: string;
  productName: string;
  outputT: number;
  stdCoalTce: number;
  intensity: number;
  cost: number;
  month: string;
}
interface SubRow {
  unitId: string;
  mediaCode: string;
  qty: number;
  price: number;
  amount: number;
  priceType: string;
}
interface ElecTier {
  tier: string;
  price: number;
  hours: string;
  qtyKWh: number;
  amount: number;
}

const areas = ref<AreaRow[]>([]);
const subs = ref<SubRow[]>([]);
const tiers = ref<ElecTier[]>([]);
const subTotal = ref({ total: 0, perTonSteel: 0 });
const elec = ref<{ avgPrice: number; totalAmount: number; demandCharge: number; pfAdjCharge: number } | null>(null);
const loading = ref(true);

/**
 * **排名行 = 区域能耗行按单耗升序 + `rank`**。
 *
 * 与区域能耗**同一份数据**是刻意的：两个页签若各查一次接口，
 * 万一两次响应不同（分页、时间漂移），排名页的第一名会和区域能耗页的最低单耗对不上。
 * 从同一数组排序出来，永远一致。
 */
const ranked = computed(() =>
  areas.value.toSorted((a, b) => a.intensity - b.intensity).map((r, i) => ({ ...r, rank: i + 1 })),
);

/** 排名色：只给第 1 名绿、2~3 名蓝——颜色标名次不标评价（见文件头） */
const rankTone = (r: number) => (r === 1 ? TONE_TEXT.ok : r <= 3 ? "text-primary" : "text-muted-foreground");

async function loadAll() {
  loading.value = true;
  try {
    const [region, sub, e, mediaOpts] = await Promise.all([
      reportApi.regionStat(),
      reportApi.subStat(),
      reportApi.elecTimeUse(),
      reportApi.mediaOptions().catch(() => []),
    ]);
    areas.value = (region ?? []).map((r: any) => ({
      unitName: r.unitName,
      productName: r.productName,
      outputT: Number(r.outputT ?? 0),
      stdCoalTce: Number(r.stdCoalTce ?? 0),
      intensity: Number(r.intensity ?? 0),
      cost: Number(r.cost ?? 0),
      month: String(r.month ?? ""),
    }));
    subs.value = (sub?.rows ?? []) as SubRow[];
    subTotal.value = { total: sub?.total ?? 0, perTonSteel: sub?.perTonSteel ?? 0 };
    tiers.value = e?.tiers ?? [];
    elec.value = {
      avgPrice: Number(e?.avgPrice ?? 0),
      totalAmount: Number(e?.totalAmount ?? 0),
      demandCharge: Number(e?.demandCharge ?? 0),
      pfAdjCharge: Number(e?.pfAdjCharge ?? 0),
    };
    void mediaOpts;
  } catch {
    /* 拦截层已 toast；各页签给空态 */
  } finally {
    loading.value = false;
  }
}

/** 导出（模拟）：本域没有真 CSV 端点，落盘是「接真实后端后换接口」的事，
 *  现在只 toast——**不假装成功**，文案说清是模拟 */
function exportCsv() {
  toast("导出 CSV 待接入：真接后端时此处换成下载链接", 2600, "warn");
}

/* ── 四个图 ──────────────────────────────────────────────────────────── */

/** 区域能耗：单耗柱图（按单耗排没有意义，这里按工序原序 + 均值虚线） */
const regionChart = computed<EChartsOption>(() => {
  const rows = areas.value;
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 62, right: 18, top: 30, bottom: 44 },
    tooltip: { trigger: "axis", valueFormatter: (v) => `${v} kgce/t` },
    xAxis: {
      type: "category",
      data: rows.map((r) => r.unitName),
      axisLabel: {
        color: isDark.value ? "#CBD5E1" : "#475569",
        fontSize: 11,
        interval: 0,
        rotate: rows.length > 6 ? 24 : 0,
      },
    },
    yAxis: {
      type: "value",
      name: "kgce/t",
      nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 11 },
      ...emsChartAxis(isDark.value),
    },
    series: [
      {
        type: "bar",
        barWidth: 20,
        data: rows.map((r) => r.intensity),
        itemStyle: { color: "#60A5FA", borderRadius: [3, 3, 0, 0] },
        label: {
          show: true,
          position: "top" as const,
          color: isDark.value ? "#94A3B8" : "#64748B",
          fontSize: 10,
          formatter: "{c}",
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dashed", color: "#F59E0B", width: 1 },
          label: { color: "#F59E0B", fontSize: 10, formatter: "均值" },
          data: [{ type: "average" as const }],
        },
      },
    ],
  };
});

/** 分项能耗：按介质的金额。
 *  **只用一色**：这张图比的是「哪块贵」，多种颜色会让客户以为颜色还有别的含义 */
const subChart = computed<EChartsOption>(() => {
  const byMedia = new Map<string, number>();
  for (const r of subs.value) byMedia.set(r.mediaCode, (byMedia.get(r.mediaCode) ?? 0) + r.amount);
  const entries = [...byMedia.entries()].toSorted((a, b) => b[1] - a[1]);
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 76, right: 76, top: 26, bottom: 26 },
    tooltip: { trigger: "axis", valueFormatter: (v) => `¥${Number(v).toLocaleString("zh-CN")}` },
    xAxis: {
      type: "value",
      ...emsChartAxis(isDark.value),
      axisLabel: {
        color: isDark.value ? "#CBD5E1" : "#475569",
        fontSize: 11,
        formatter: (v: number) => `${(v / 1e4).toFixed(0)}万`,
      },
    },
    yAxis: {
      type: "category",
      data: entries.map(([k]) => k).toReversed(),
      axisLabel: { color: isDark.value ? "#CBD5E1" : "#475569", fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        barWidth: 18,
        data: entries.map(([, v]) => v).toReversed(),
        itemStyle: { color: "#38BDF8", borderRadius: [0, 3, 3, 0] },
        label: {
          show: true,
          position: "right" as const,
          color: isDark.value ? "#94A3B8" : "#64748B",
          fontSize: 10,
          formatter: (p: any) => `¥${(p.value / 1e4).toFixed(0)}万`,
        },
      },
    ],
  };
});

/**
 * 峰平谷电能：**柱 = 分时电量、线 = 电价**，两者量纲不同 → **双 y 轴**。
 *
 * 这是规格书原文「柱线组合图」的落地，也是本域踩过的坑的正面示范：
 * kWh 与 元/kWh 塞一个轴，电价那条线会贴在 0 上方一条直线，读不出尖峰谷的价差。
 */
const elecChart = computed<EChartsOption>(() => {
  const rows = tiers.value;
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 72, right: 72, top: 34, bottom: 30 },
    tooltip: { trigger: "axis" },
    legend: { top: 4, textStyle: { color: isDark.value ? "#CBD5E1" : "#475569", fontSize: 12 } },
    xAxis: {
      type: "category",
      data: rows.map((r) => r.tier),
      axisLabel: { color: isDark.value ? "#CBD5E1" : "#475569", fontSize: 12 },
    },
    yAxis: [
      {
        type: "value",
        name: "万kWh",
        nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 11 },
        ...emsChartAxis(isDark.value),
        axisLabel: {
          color: isDark.value ? "#CBD5E1" : "#475569",
          fontSize: 11,
          formatter: (v: number) => `${(v / 1e4).toFixed(0)}`,
        },
      },
      {
        type: "value",
        name: "元/kWh",
        nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 11 },
        ...emsChartAxis(isDark.value),
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "电量",
        type: "bar",
        barWidth: 30,
        yAxisIndex: 0,
        data: rows.map((r) => r.qtyKWh),
        itemStyle: { color: "#38BDF8", borderRadius: [3, 3, 0, 0] },
      },
      {
        name: "电价",
        type: "line",
        yAxisIndex: 1,
        data: rows.map((r) => r.price),
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 2, color: "#F59E0B" },
        itemStyle: { color: "#F59E0B" },
      },
    ],
  };
});

/** 排名：横向条（第 1 名在最上）——纵向柱图的名次要人脑倒序读 */
const rankChart = computed<EChartsOption>(() => {
  const rows = ranked.value;
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 96, right: 64, top: 24, bottom: 26 },
    tooltip: { trigger: "axis", valueFormatter: (v) => `${v} kgce/t` },
    xAxis: {
      type: "value",
      name: "kgce/t",
      nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 11 },
      ...emsChartAxis(isDark.value),
    },
    yAxis: {
      type: "category",
      data: rows.map((r) => r.unitName).toReversed(),
      axisLabel: { color: isDark.value ? "#CBD5E1" : "#475569", fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        barWidth: 20,
        data: rows.toReversed().map((r, i) => {
          const rank = rows.length - i;
          return {
            value: r.intensity,
            itemStyle: {
              color: rank === 1 ? "#22C55E" : rank <= 3 ? "#38BDF8" : "#64748B",
              borderRadius: [0, 3, 3, 0],
            },
          };
        }),
        label: {
          show: true,
          position: "right" as const,
          color: isDark.value ? "#94A3B8" : "#64748B",
          fontSize: 10,
          formatter: "{c}",
        },
      },
    ],
  };
});

onMounted(() => {
  void loadAll();
  void loadKpi();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
    <!-- 顶栏：标题 + 导出 -->
    <div class="flex shrink-0 items-center gap-4 rounded-md border border-border bg-card px-4 py-2">
      <span :class="emsHeaderTextClass">能耗统计报表</span>
      <span class="text-xs text-muted-foreground">KPI 与大屏 / KPI 看板同源（同一个 kpiBoard）</span>
      <Button variant="outlined" class="ml-auto" label="导出 CSV" @click="exportCsv" />
    </div>

    <!-- KPI 卡片行（四页签共用，见文件头「只写一次」） -->
    <div class="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
      <div v-for="c in kpiCards" :key="c.label" class="rounded-md border border-border bg-card px-3 py-2">
        <div class="text-xs text-muted-foreground">{{ c.label }}</div>
        <div class="text-base font-semibold tabular-nums" :class="c.tone">
          {{ c.value }}<span class="text-xs font-normal text-muted-foreground">{{ c.unit }}</span>
        </div>
        <div class="truncate text-xs text-muted-foreground">{{ c.hint }}</div>
      </div>
    </div>

    <!-- 四页签（规格书 ER0001 的四个标签） -->
    <Tabs v-model:value="active" class="flex min-h-0 flex-1 flex-col">
      <TabList class="min-w-0 flex-1">
        <Tab v-for="t in TABS" :key="t.key" :value="t.key">{{ t.label }}</Tab>
      </TabList>

      <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
        <!-- ① 区域能耗 -->
        <TabPanel value="region" class="flex h-full flex-col gap-2">
          <section class="flex min-h-[16rem] flex-col rounded-md border border-border bg-card p-2">
            <div class="shrink-0 pb-1 text-sm text-primary">工序单耗（kgce/t）· 虚线 = 全厂均值</div>
            <EChart v-if="areas.length" :option="regionChart" class="min-h-0 flex-1" />
            <div v-else class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {{ loading ? "加载中…" : "暂无区域能耗数据" }}
            </div>
          </section>
          <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
            <table class="w-full" style="font-size: 13px">
              <thead class="sticky top-0 bg-card text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 text-left font-normal">工序</th>
                  <th class="px-3 py-2 text-left font-normal">主产品</th>
                  <th class="px-3 py-2 text-right font-normal">产量 t</th>
                  <th class="px-3 py-2 text-right font-normal">折标煤 tce</th>
                  <th class="px-3 py-2 text-right font-normal">单耗 kgce/t</th>
                  <th class="px-3 py-2 text-right font-normal">能源成本 元</th>
                  <th class="px-3 py-2 text-left font-normal">账期</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in areas" :key="r.unitName" class="border-t border-border/60">
                  <td class="px-3 py-2 text-foreground">{{ r.unitName }}</td>
                  <td class="px-3 py-2 text-muted-foreground">{{ r.productName }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">
                    {{ r.outputT.toLocaleString("zh-CN") }}
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">{{ r.stdCoalTce.toFixed(1) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">{{ r.intensity.toFixed(2) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">
                    ¥{{ Math.round(r.cost).toLocaleString("zh-CN") }}
                  </td>
                  <td class="px-3 py-2 tabular-nums text-muted-foreground">{{ r.month }}</td>
                </tr>
                <tr v-if="!areas.length">
                  <td colspan="7" class="px-3 py-8 text-center text-sm text-muted-foreground">
                    {{ loading ? "加载中…" : "暂无数据" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabPanel>

        <!-- ② 分项能耗 -->
        <TabPanel value="sub" class="flex h-full flex-col gap-2">
          <section class="flex min-h-[16rem] flex-col rounded-md border border-border bg-card p-2">
            <div class="shrink-0 pb-1 text-sm text-primary">分介质能源成本</div>
            <EChart v-if="subs.length" :option="subChart" class="min-h-0 flex-1" />
            <div v-else class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {{ loading ? "加载中…" : "暂无分项数据" }}
            </div>
          </section>
          <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
            <table class="w-full" style="font-size: 13px">
              <thead class="sticky top-0 bg-card text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 text-left font-normal">用能单元</th>
                  <th class="px-3 py-2 text-left font-normal">介质</th>
                  <th class="px-3 py-2 text-right font-normal">实物量</th>
                  <th class="px-3 py-2 text-right font-normal">单价 元</th>
                  <th class="px-3 py-2 text-right font-normal">金额 元</th>
                  <th class="px-3 py-2 text-left font-normal">价格类型</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in subs" :key="i" class="border-t border-border/60">
                  <td class="px-3 py-2 text-foreground">{{ r.unitId }}</td>
                  <td class="px-3 py-2 text-muted-foreground">{{ r.mediaCode }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">
                    {{ Number(r.qty).toLocaleString("zh-CN") }}
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {{ moneyFmt({ value: r.price }) }}
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">
                    ¥{{ Math.round(r.amount).toLocaleString("zh-CN") }}
                  </td>
                  <td class="px-3 py-2 text-muted-foreground">{{ r.priceType }}</td>
                </tr>
                <tr v-if="!subs.length">
                  <td colspan="6" class="px-3 py-8 text-center text-sm text-muted-foreground">
                    {{ loading ? "加载中…" : "暂无数据" }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              合计 ¥{{ Math.round(subTotal.total).toLocaleString("zh-CN") }} · 吨钢能源成本 ¥{{
                subTotal.perTonSteel.toFixed(1)
              }}/t
            </div>
          </div>
        </TabPanel>

        <!-- ③ 峰平谷电能 -->
        <TabPanel value="elec" class="flex h-full flex-col gap-2">
          <section class="flex min-h-[16rem] flex-col rounded-md border border-border bg-card p-2">
            <div class="shrink-0 pb-1 text-sm text-primary">
              分时电量与电价
              <span class="ml-2 text-xs text-muted-foreground">柱=电量(左轴) · 线=电价(右轴)，量纲不同必须分轴</span>
            </div>
            <EChart v-if="tiers.length" :option="elecChart" class="min-h-0 flex-1" />
            <div v-else class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {{ loading ? "加载中…" : "暂无分时数据" }}
            </div>
          </section>
          <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
            <table class="w-full" style="font-size: 13px">
              <thead class="sticky top-0 bg-card text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 text-left font-normal">时段</th>
                  <th class="px-3 py-2 text-right font-normal">电价 元/kWh</th>
                  <th class="px-3 py-2 text-left font-normal">覆盖小时</th>
                  <th class="px-3 py-2 text-right font-normal">电量 kWh</th>
                  <th class="px-3 py-2 text-right font-normal">电费 元</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="t in tiers" :key="t.tier" class="border-t border-border/60">
                  <td class="px-3 py-2">
                    <span
                      class="rounded px-1.5 py-0.5 text-xs"
                      :class="
                        t.tier === '尖峰'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                          : t.tier === '峰'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : t.tier === '平'
                              ? 'bg-sky-500/15 text-primary'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      "
                    >
                      {{ t.tier }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">{{ t.price.toFixed(2) }}</td>
                  <td class="px-3 py-2 text-muted-foreground">{{ t.hours }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">
                    {{ Math.round(t.qtyKWh).toLocaleString("zh-CN") }}
                  </td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">
                    ¥{{ Math.round(t.amount).toLocaleString("zh-CN") }}
                  </td>
                </tr>
                <tr v-if="!tiers.length">
                  <td colspan="5" class="px-3 py-8 text-center text-sm text-muted-foreground">
                    {{ loading ? "加载中…" : "暂无数据" }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="elec" class="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              度电均价 ¥{{ elec.avgPrice.toFixed(3) }}/kWh · 电费合计 ¥{{
                Math.round(elec.totalAmount).toLocaleString("zh-CN")
              }}
              （含需量 ¥{{ Math.round(elec.demandCharge).toLocaleString("zh-CN") }}、 力调 ¥{{
                Math.round(elec.pfAdjCharge).toLocaleString("zh-CN")
              }}）
            </div>
          </div>
        </TabPanel>

        <!-- ④ 排名 -->
        <TabPanel value="rank" class="flex h-full flex-col gap-2">
          <section class="flex min-h-[16rem] flex-col rounded-md border border-border bg-card p-2">
            <div class="shrink-0 pb-1 text-sm text-primary">
              单耗排名（低者在前）
              <span class="ml-2 text-xs text-muted-foreground">色 = 名次，不表示评价</span>
            </div>
            <EChart v-if="ranked.length" :option="rankChart" class="min-h-0 flex-1" />
            <div v-else class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {{ loading ? "加载中…" : "暂无数据" }}
            </div>
          </section>
          <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
            <table class="w-full" style="font-size: 13px">
              <thead class="sticky top-0 bg-card text-muted-foreground">
                <tr>
                  <th class="px-3 py-2 text-left font-normal">名次</th>
                  <th class="px-3 py-2 text-left font-normal">工序</th>
                  <th class="px-3 py-2 text-left font-normal">主产品</th>
                  <th class="px-3 py-2 text-right font-normal">单耗 kgce/t</th>
                  <th class="px-3 py-2 text-right font-normal">折标煤 tce</th>
                  <th class="px-3 py-2 text-right font-normal">能源成本 元</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in ranked" :key="r.unitName" class="border-t border-border/60">
                  <td class="px-3 py-2 font-semibold" :class="rankTone(r.rank)">{{ r.rank }}</td>
                  <td class="px-3 py-2 text-foreground">{{ r.unitName }}</td>
                  <td class="px-3 py-2 text-muted-foreground">{{ r.productName }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-foreground">{{ r.intensity.toFixed(2) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-muted-foreground">{{ r.stdCoalTce.toFixed(1) }}</td>
                  <td class="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    ¥{{ Math.round(r.cost).toLocaleString("zh-CN") }}
                  </td>
                </tr>
                <tr v-if="!ranked.length">
                  <td colspan="6" class="px-3 py-8 text-center text-sm text-muted-foreground">
                    {{ loading ? "加载中…" : "暂无数据" }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
