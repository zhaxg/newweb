<script setup lang="ts">
/** 对应 AR0001 KPI指标（模块七 分析 · 附录 B5 版式 A：指标卡 + 趋势图）
 *  接口：analysisApi.kpi（GET /eam/analysis/kpi）
 *  演示要点：**客户问的第二句话永远是"我这套系统跑半年，怎么证明它有用"**——这页就是答案：
 *        故障率、OEE、备件周转率、人均绩效四条月度趋势 + 工单来源构成 + 人员绩效排行。
 *        四个数一条线，正是设备部对厂长汇报的那页 PPT，所以这页的话术是"这张表您不用自己做，
 *        系统里就是长这样的"。
 *        数据不是写死的曲线：`store.kpiSet` 用 `KPI_HISTORY`（12 个月的真实口径）打底，
 *        工单来源构成与人员排行**从当前工单表现算**——主线剧本每转一圈（报警转工单、工单完工），
 *        这两块的排名就会动，客户看得出它们是活的。
 *        趋势图分两张而不是四线一轴：故障率(%)、OEE(%) 是同一量纲，周转率(次/年) 与绩效(分) 不是，
 *        塞进一张图要么把 2% 的线压成贴地直线，要么得开双轴让读者猜哪条对哪根轴。
 *  待接入：指标目标值/达标判定（后端只给了 delta，没有目标线）。 */
import { computed, onMounted, ref } from "vue";
import type { EChartsOption } from "echarts";
import Button from "primevue/button";
import { IconRotateClockwise } from "@tabler/icons-vue";
import { analysisApi } from "@/api/equipment";
import type { KpiSet } from "@/api/equipment/types";
import EChart from "../../EChart.vue";

const kpi = ref<KpiSet | null>(null);
const loading = ref(false);

async function load() {
  loading.value = true;
  try {
    kpi.value = await analysisApi.kpi();
  } catch {
    /* 拦截层已 toast */
  }
  loading.value = false;
}

onMounted(load);

/** 比率类两条线同轴（都是 %），量纲不同的两条各占一根轴 */
const rateOption = computed<EChartsOption>(() => {
  const k = kpi.value;
  return {
    grid: { left: 44, right: 20, top: 34, bottom: 26 },
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["故障率", "OEE"] },
    xAxis: { type: "category", data: k?.months ?? [] },
    yAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
    series: [
      { name: "故障率", type: "line", smooth: true, data: k?.faultRate ?? [] },
      { name: "OEE", type: "line", smooth: true, data: k?.oee ?? [] },
    ],
  };
});

const utilOption = computed<EChartsOption>(() => {
  const k = kpi.value;
  return {
    grid: { left: 44, right: 44, top: 34, bottom: 26 },
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["备件周转率", "人均绩效"] },
    xAxis: { type: "category", data: k?.months ?? [] },
    yAxis: [
      { type: "value", name: "次/年", nameTextStyle: { fontSize: 12 } },
      { type: "value", name: "分", nameTextStyle: { fontSize: 12 }, splitLine: { show: false } },
    ],
    series: [
      { name: "备件周转率", type: "line", smooth: true, data: k?.turnover ?? [] },
      { name: "人均绩效", type: "line", smooth: true, yAxisIndex: 1, data: k?.performance ?? [] },
    ],
  };
});

const mixOption = computed<EChartsOption>(() => {
  const k = kpi.value;
  return {
    tooltip: { trigger: "item", formatter: "{b} {c} 单（{d}%）" },
    legend: { bottom: 0, type: "scroll" },
    series: [
      {
        name: "工单来源",
        type: "pie",
        radius: ["42%", "68%"],
        center: ["50%", "44%"],
        itemStyle: { borderRadius: 3, borderWidth: 2 },
        label: { formatter: "{b}\n{d}%", fontSize: 12 },
        data: k?.sourceMix ?? [],
      },
    ],
  };
});

/** 人员排行：横向条形，分数放轴外——竖条在 10 个人名时会把姓名挤成竖排 */
const rankOption = computed<EChartsOption>(() => {
  const rank = (kpi.value?.personRank ?? []).slice(0, 8).toSorted((a, b) => a.score - b.score);
  return {
    grid: { left: 76, right: 40, top: 12, bottom: 22 },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    xAxis: { type: "value" },
    yAxis: { type: "category", data: rank.map((r) => r.name), axisLabel: { fontSize: 12 } },
    series: [
      {
        name: "绩效分",
        type: "bar",
        barWidth: 12,
        data: rank.map((r) => r.score),
        label: { show: true, position: "right", fontSize: 12 },
      },
    ],
  };
});

const empty = computed(() => !kpi.value);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="load">
        <IconRotateClockwise class="h-3 w-3" />刷新
      </Button>
      <span class="text-xs text-muted-foreground">指标口径：全厂 · 近 12 个月滚动</span>
      <span class="ml-auto text-xs text-muted-foreground"
        >数据随主线演示实时重算（工单/报警一变，构成与排行就跟着变）</span
      >
    </div>

    <div v-if="empty" class="min-h-0 flex-1 overflow-auto p-4">
      <div class="text-body text-muted-foreground">指标数据还没有取回来（点「刷新」重试）</div>
    </div>

    <div v-else class="min-h-0 flex-1 overflow-auto p-3">
      <!-- 指标卡：值 + 同环比，delta 正负只上色不改文案（故障率的"上升"是坏事，OEE 的是好事） -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="c in kpi?.cards" :key="c.label" class="min-w-0 rounded-md border border-border/60 p-3">
          <div class="truncate text-xs text-muted-foreground">{{ c.label }}</div>
          <div class="mt-1 flex min-w-0 items-baseline gap-1">
            <span class="text-base font-medium">{{ c.value }}</span>
            <span class="text-xs text-muted-foreground">{{ c.unit }}</span>
            <span
              class="ml-auto shrink-0 text-xs"
              :class="c.delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'"
            >
              {{ c.delta >= 0 ? "+" : "" }}{{ c.delta }}
            </span>
          </div>
          <div class="mt-1 truncate text-xs text-muted-foreground">{{ c.hint }}</div>
        </div>
      </div>

      <div class="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div class="min-w-0 rounded-md border border-border/60 p-3">
          <div class="h-9 shrink-0 text-sm font-medium">故障率与 OEE 趋势</div>
          <EChart :option="rateOption" height="15rem" />
        </div>
        <div class="min-w-0 rounded-md border border-border/60 p-3">
          <div class="h-9 shrink-0 text-sm font-medium">备件周转率与人均绩效</div>
          <EChart :option="utilOption" height="15rem" />
        </div>
        <div class="min-w-0 rounded-md border border-border/60 p-3">
          <div class="h-9 shrink-0 text-sm font-medium">工单来源构成</div>
          <EChart :option="mixOption" height="15rem" />
        </div>
        <div class="min-w-0 rounded-md border border-border/60 p-3">
          <div class="h-9 shrink-0 text-sm font-medium">维修人员绩效排行（前 8）</div>
          <EChart :option="rankOption" height="15rem" />
        </div>
      </div>
    </div>
  </div>
</template>
