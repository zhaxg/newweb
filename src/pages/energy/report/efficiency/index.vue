<script setup lang="ts">
/**
 * ER0002 能效分析（模块四 · 附录 B5 版式 **V4 分析 · 对象/介质/基准三选择器**）
 *
 *  接口：`reportApi.efficiency`（单耗多维对比的数）· `reportApi.lossAnalysis`（损耗）
 *        `reportApi.unitOptions` / `mediaOptions`（两个下拉的候选，从数据取不写死）
 *
 *  演示要点：**三个选择器回答三件事**——
 *  「谁」（对象 = 工序）、「哪一种能」（介质）、「跟谁比」（基准 = 标杆值）。
 *  没有基准的选择器，横向对标就只是把各厂的数排一遍，答不了「好还是差」。
 *
 *  **损耗分析是这一页独有的价值**：规格书原话「供水 vs 出水、线损」。
 *  供应侧与使用侧的差额 = 损耗，`lossPct` 留两位——
 *  整数位看不出 0.3% 的变化，而 0.3% 乘全厂水量就是一笔钱。
 *  口径与 EP0003 平衡表同源（都是 `buildActualRecords`），但**这里按介质、那边按工序**，
 *  两个切面谁也替代不了谁。
 *
 *  待接入：同比环比的历史期（当前是单期对标；历史由 ER0003 的预测趋势承担）。
 */
import { isDark } from "@/composables/useAppTheme";
import { computed, onMounted, ref } from "vue";
import EChart from "../../EChart.vue";
import Button from "primevue/button";
import { reportApi } from "@/api/energy";
import { TONE_TEXT, emsChartAxis, emsHeaderTextClass } from "../../emsTheme";
import { moneyFmt } from "../../cells";
import type { EChartsOption } from "echarts";

/* ── 三选择器（对象 / 介质 / 基准）──────────────────────────────────── */

const unitId = ref("");
const mediaCode = ref("");
const baseline = ref<number | null>(null);
const loading = ref(true);

interface SubRow {
  unitId: string;
  mediaCode: string;
  qty: number;
  price: number;
  amount: number;
  priceType: string;
}
interface LossRow {
  date: string;
  mediaCode: string;
  supply: number;
  use: number;
  loss: number;
  lossPct: number;
}

const subs = ref<SubRow[]>([]);
const losses = ref<LossRow[]>([]);
const summary = ref({ total: 0, perTonSteel: 0, elecTotal: 0, fixed: 0 });
const unitOptions = ref<Array<{ id: string; name: string }>>([]);
const mediaOptions = ref<Array<{ code: string; name: string; color: string }>>([]);

async function loadAll() {
  loading.value = true;
  try {
    const [eff, loss, units, media] = await Promise.all([
      reportApi.efficiency(),
      reportApi.lossAnalysis(),
      reportApi.unitOptions().catch(() => []),
      reportApi.mediaOptions().catch(() => []),
    ]);
    subs.value = (eff?.rows ?? []) as SubRow[];
    summary.value = {
      total: eff?.total ?? 0,
      perTonSteel: eff?.perTonSteel ?? 0,
      elecTotal: eff?.elecTotal ?? 0,
      fixed: eff?.fixed ?? 0,
    };
    losses.value = loss ?? [];
    unitOptions.value = units;
    mediaOptions.value = media;
  } catch {
    /* 拦截层已 toast；各区给空态 */
  } finally {
    loading.value = false;
  }
}

/** 过滤（**前端做**：这两个选择器是本页专属视图，服务端端点不分这两个维度） */
const filteredSubs = computed(() =>
  subs.value.filter(
    (r) => (!unitId.value || r.unitId === unitId.value) && (!mediaCode.value || r.mediaCode === mediaCode.value),
  ),
);

/** 损耗按介质聚合：`lossAnalysis` 是 日 × 介质 的行，直接画会太碎 */
const lossByMedia = computed(() => {
  const by = new Map<string, { supply: number; use: number; loss: number; lossPct: number }>();
  for (const r of losses.value) {
    if (mediaCode.value && r.mediaCode !== mediaCode.value) continue;
    const cur = by.get(r.mediaCode) ?? { supply: 0, use: 0, loss: 0, lossPct: 0 };
    cur.supply += r.supply;
    cur.use += r.use;
    cur.loss += r.loss;
    by.set(r.mediaCode, cur);
  }
  return [...by.entries()]
    .map(([code, v]) => ({
      mediaCode: code,
      ...v,
      /* 聚合后的率 = 聚合的 loss / 聚合的 supply，**不是各日 lossPct 的平均**——
       平均率会让小流量日的异常率被摊平，恰好掩盖要找的那个差 */
      lossPct: v.supply > 0 ? Math.round((v.loss / v.supply) * 10000) / 100 : 0,
    }))
    .toSorted((a, b) => b.lossPct - a.lossPct);
});

/* ── 两个图 ──────────────────────────────────────────────────────────── */

/**
 * 横向对标：各用能单元的能源成本 vs **基准线**。
 *
 * 基准线只在给了基准值时画——没基准时画一条「建议值」是发明数据，
 * 客户会问「这线哪来的」。空基准就只显示排序，这是诚实的降级。
 */
const compareChart = computed<EChartsOption>(() => {
  const byUnit = new Map<string, number>();
  for (const r of filteredSubs.value) byUnit.set(r.unitId, (byUnit.get(r.unitId) ?? 0) + r.amount);
  const entries = [...byUnit.entries()].toSorted((a, b) => b[1] - a[1]).slice(0, 8);
  const base = baseline.value;
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 100, right: 72, top: 26, bottom: 26 },
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
        /* 基准线：给了才画（见文件头「空基准就只显示排序」） */
        ...(base !== null && Number.isFinite(base)
          ? {
              markLine: {
                silent: true,
                symbol: "none",
                lineStyle: { type: "dashed" as const, color: "#F59E0B", width: 1.5 },
                label: { color: "#F59E0B", fontSize: 11, formatter: `基准 ¥${base.toLocaleString("zh-CN")}` },
                data: [{ xAxis: base }],
              },
            }
          : {}),
      },
    ],
  };
});

/**
 * 损耗分析：各介质的损耗率（条）+ 供应/使用两侧（堆叠不行——两者量纲同但差值才是重点）。
 * 画「损耗率」而不是「损耗量」：量随介质规模天生不同，跨介质比量没有意义；率才可比。
 */
const lossChart = computed<EChartsOption>(() => {
  const rows = lossByMedia.value;
  const worst = rows[0]?.lossPct ?? 0;
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 76, right: 64, top: 26, bottom: 26 },
    tooltip: { trigger: "axis", valueFormatter: (v) => `${v}%` },
    xAxis: {
      type: "value",
      name: "%",
      nameTextStyle: { color: isDark.value ? "#64748B" : "#94A3B8", fontSize: 11 },
      ...emsChartAxis(isDark.value),
    },
    yAxis: {
      type: "category",
      data: rows.map((r) => r.mediaCode).toReversed(),
      axisLabel: { color: isDark.value ? "#CBD5E1" : "#475569", fontSize: 12 },
    },
    series: [
      {
        type: "bar",
        barWidth: 18,
        data: rows.toReversed().map((r) => ({
          value: r.lossPct,
          itemStyle: {
            /* 红 = 本批里最差的（>0.5%），琥珀 = 中间，绿 = 最小——
               颜色按**相对**排位不是绝对阈值：不同介质的正常损耗量级本就不同，
               给统一阈值会让某个介质永远红或永远绿 */
            color:
              r.lossPct >= worst * 0.8 && rows.length > 1
                ? "#EF4444"
                : r.lossPct >= worst * 0.5 && rows.length > 1
                  ? "#F59E0B"
                  : "#22C55E",
            borderRadius: [0, 3, 3, 0],
          },
        })),
        label: {
          show: true,
          position: "right" as const,
          color: isDark.value ? "#94A3B8" : "#64748B",
          fontSize: 10,
          formatter: "{c}%",
        },
      },
    ],
  };
});

/** KPI 行（本页自己的四个数——不是 kpiBoard：这页看的是「账的构成」不是「全厂 KPI」） */
const kpiCards = computed(() => [
  {
    label: "能源成本合计",
    value: `¥${Math.round(summary.value.total).toLocaleString("zh-CN")}`,
    tone: TONE_TEXT.ok,
    hint: "本口径下全部介质",
  },
  {
    label: "吨钢能源成本",
    value: `¥${summary.value.perTonSteel.toFixed(1)}`,
    unit: "/t",
    tone: TONE_TEXT.warn,
    hint: "外购口径 · 越低越好",
  },
  {
    label: "电费小计",
    value: `¥${Math.round(summary.value.elecTotal).toLocaleString("zh-CN")}`,
    tone: TONE_TEXT.ok,
    hint: "含分时、需量、力调",
  },
  {
    label: "行数",
    value: String(filteredSubs.value.length),
    tone: TONE_TEXT.ok,
    hint: `合计 ${summary.value.total} 行`,
  },
]);

onMounted(() => void loadAll());
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
    <!-- 顶栏：三个选择器（对象 / 介质 / 基准） -->
    <div class="flex shrink-0 flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-2">
      <span :class="emsHeaderTextClass">能效分析</span>

      <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
        对象
        <select v-model="unitId" class="h-8 rounded border border-border bg-background px-2 text-body text-foreground">
          <option value="">全部工序</option>
          <option v-for="u in unitOptions" :key="u.id" :value="u.id">{{ u.name }}</option>
        </select>
      </label>

      <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
        介质
        <select
          v-model="mediaCode"
          class="h-8 rounded border border-border bg-background px-2 text-body text-foreground"
        >
          <option value="">全部介质</option>
          <option v-for="m in mediaOptions" :key="m.code" :value="m.code">{{ m.name }}</option>
        </select>
      </label>

      <label class="flex items-center gap-1.5 text-xs text-muted-foreground">
        基准 ¥
        <input
          v-model.number="baseline"
          type="number"
          class="h-28 w-28 rounded border border-border bg-background px-2 text-body text-foreground tabular-nums"
          placeholder="留空不画基准线"
        />
      </label>

      <Button variant="outlined" label="重查" @click="loadAll" />
      <span class="ml-auto text-xs text-muted-foreground"> 三选答三件事：谁 · 哪一种能 · 跟谁比 </span>
    </div>

    <!-- KPI 行 -->
    <div class="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4">
      <div v-for="k in kpiCards" :key="k.label" class="rounded-md border border-border bg-card px-3 py-2">
        <div class="text-xs text-muted-foreground">{{ k.label }}</div>
        <div class="text-base font-semibold tabular-nums" :class="k.tone">
          {{ k.value }}<span class="text-xs font-normal text-muted-foreground">{{ k.unit ?? "" }}</span>
        </div>
        <div class="truncate text-xs text-muted-foreground">{{ k.hint }}</div>
      </div>
    </div>

    <!-- 双图区：左对标、右损耗 -->
    <div class="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
      <section class="flex min-h-[14rem] flex-col rounded-md border border-border bg-card p-2">
        <div class="shrink-0 pb-1 text-sm text-primary">
          单耗对标（能源成本 · 元）
          <span class="ml-2 text-xs text-muted-foreground">
            {{ baseline !== null && Number.isFinite(baseline) ? "虚线 = 你给的基准" : "填基准值后出现虚线" }}
          </span>
        </div>
        <EChart v-if="filteredSubs.length" :option="compareChart" class="min-h-0 flex-1" />
        <div v-else class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {{ loading ? "加载中…" : "当前筛选下没有数据" }}
        </div>
      </section>

      <section class="flex min-h-[14rem] flex-col rounded-md border border-border bg-card p-2">
        <div class="shrink-0 pb-1 text-sm text-primary">
          损耗分析（%）
          <span class="ml-2 text-xs text-muted-foreground">红 = 本批最差 · 绿 = 最优（按介质相对排位）</span>
        </div>
        <EChart v-if="lossByMedia.length" :option="lossChart" class="min-h-0 flex-1" />
        <div v-else class="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {{ loading ? "加载中…" : "暂无损耗数据" }}
        </div>
      </section>
    </div>

    <!-- 损耗明细：供应 / 用 / 损耗 三列（差值可验算） -->
    <div class="shrink-0 overflow-auto rounded-md border border-border bg-card">
      <table class="w-full" style="font-size: 13px">
        <thead class="bg-card text-muted-foreground">
          <tr>
            <th class="px-3 py-2 text-left font-normal">介质</th>
            <th class="px-3 py-2 text-right font-normal">供应侧</th>
            <th class="px-3 py-2 text-right font-normal">使用侧</th>
            <th class="px-3 py-2 text-right font-normal">损耗</th>
            <th class="px-3 py-2 text-right font-normal">损耗率</th>
            <th class="px-3 py-2 text-left font-normal">判定</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in lossByMedia" :key="r.mediaCode" class="border-t border-border/60">
            <td class="px-3 py-2 text-foreground">{{ r.mediaCode }}</td>
            <td class="px-3 py-2 text-right tabular-nums text-foreground">
              {{ Math.round(r.supply).toLocaleString("zh-CN") }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-foreground">
              {{ Math.round(r.use).toLocaleString("zh-CN") }}
            </td>
            <td
              class="px-3 py-2 text-right tabular-nums"
              :class="r.loss > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'"
            >
              {{ Math.round(r.loss).toLocaleString("zh-CN") }}
            </td>
            <td
              class="px-3 py-2 text-right tabular-nums"
              :class="r.lossPct >= 0.5 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'"
            >
              {{ r.lossPct.toFixed(2) }}%
            </td>
            <td class="px-3 py-2 text-xs text-muted-foreground">
              {{ r.lossPct >= 0.5 ? "偏差偏大，查管网与计量" : r.loss > 0 ? "正常损耗区间" : "两端平衡" }}
            </td>
          </tr>
          <tr v-if="!lossByMedia.length">
            <td colspan="6" class="px-3 py-6 text-center text-sm text-muted-foreground">
              {{ loading ? "加载中…" : "暂无损耗数据" }}
            </td>
          </tr>
        </tbody>
      </table>
      <div class="border-t border-border px-3 py-2 text-xs text-muted-foreground">
        损耗 = 供应 − 用（口径同 EP0003 平衡表，但**按介质聚合**，EP0003 按工序聚合——两个切面）
      </div>
    </div>
  </div>
</template>
