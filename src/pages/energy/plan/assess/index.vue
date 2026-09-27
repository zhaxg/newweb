<script setup lang="ts">
/**
 * EP0005 能耗考核与对标（模块五 · 附录 B5 版式 **V4 分析：柱图 + 排名表 + 考核评分**）
 *
 *  接口：`assessApi.page/generate`（实绩 vs 标杆值/准入值/设计值 → 得分排名）
 *
 *  演示要点：**幕 7 的后半段**——「考核页按峰谷+定额打分排名」。
 *  三档基准（标杆/准入/设计）是 GB 21256 的对标口径示意：
 *  实绩柱 + 两条基准线一起画，**只画实绩答不了「离标杆还差多少」**。
 *
 *  **评分方向**：`score = 基准分 − 超标扣分 + 节能加分`，扣分/加分都是 store 算的
 *  （`runAssess`），页面只显示——页面自己算分就是第二份口径，而考核是要发奖金的。
 *
 *  **排名列按 `rank` 升序**，但**名次颜色不标好坏**（第 4 名不代表这厂差，
 *  只代表这次排在后面）：绿色只给第 1 名，这是竞赛榜的惯例不是评价。
 *
 *  待接入：按月切换（当前出默认账期）、考核报表导出。
 */
import { computed, onMounted, ref, watch } from "vue";
import { assessApi } from "@/api/energy";
import type { AssessRow } from "@/api/energy/types";
import { useToast } from "@/composables/useToast";
import { applyResult } from "../../rowActions";
import EChart from "../../EChart.vue";
import { emsDarkClass, emsHeaderTextClass } from "../../emsTheme";
import { useNameMaps } from "../../nameMaps";
import type { EChartsOption } from "echarts";

const { toast } = useToast();
const { ready, unitMap } = useNameMaps();
/** index signature 必须显式：unitMap 是 `Record<string,string>`，用 string 索引在 strict 下报 TS7053 */
const nameOf = (id: string | undefined): string => unitMap.value[String(id ?? "")] ?? String(id ?? "—");

const rows = ref<AssessRow[]>([]);
const busy = ref(false);
const loading = ref(true);

async function load() {
  try {
    const res = await assessApi.page({ currentPage: 1, pageSize: 100 });
    rows.value = res.rows;
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/** ▶生成考核月报（分数与排名由 store 算，页面只触发） */
async function generate() {
  if (busy.value) return;
  busy.value = true;
  try {
    if (applyResult(await assessApi.generate(), "考核月报已生成", toast)) await load();
  } finally {
    busy.value = false;
  }
}

/** 按名次升序（第 1 名在最上——竞赛榜的读法） */
const ranked = computed(() => rows.value.toSorted((a, b) => a.rank - b.rank));

/**
 * 对标柱图：实绩柱 + 标杆/准入两条基准线。
 *
 * **三档基准一起给**：只画实绩，客户不知道「好」在哪条线上；
 * 标杆是行业先进、准入是合规底线，**准入线下方 = 不合格**，
 * 这张图的结论是「谁在准入线以下」，所以准入线比标杆线更醒目。
 */
const chartOption = computed<EChartsOption>(() => {
  const list = ranked.value;
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 56, right: 18, top: 34, bottom: 44 },
    tooltip: { trigger: "axis", valueFormatter: (v) => `${v} kgce/t` },
    legend: { top: 4, textStyle: { color: "#CBD5E1", fontSize: 12 } },
    xAxis: {
      type: "category",
      data: list.map((r) => nameOf(r.unitId)),
      axisLabel: { color: "#CBD5E1", fontSize: 11, interval: 0, rotate: list.length > 6 ? 24 : 0 },
    },
    yAxis: { type: "value", name: "kgce/t", nameTextStyle: { color: "#64748B", fontSize: 12 }, ...axis() },
    series: [
      {
        name: "实绩",
        type: "bar",
        barWidth: 22,
        data: list.map((r) => ({
          value: r.actual,
          itemStyle: { color: r.actual <= r.benchmark ? "#22C55E" : r.actual <= r.quota ? "#F59E0B" : "#EF4444" },
        })),
        label: { show: true, position: "top" as const, color: "#94A3B8", fontSize: 10, formatter: "{c}" },
      },
      {
        name: "定额",
        type: "line",
        step: "end",
        symbol: "none",
        data: list.map((r) => r.quota),
        lineStyle: { type: "dashed", color: "#38BDF8", width: 1.5 },
      },
      {
        name: "标杆",
        type: "line",
        step: "end",
        symbol: "none",
        data: list.map(() => list[0]?.benchmark ?? 0),
        lineStyle: { type: "dashed", color: "#A78BFA", width: 1.5 },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { type: "dotted", color: "#EF4444", width: 1 },
          label: { color: "#EF4444", fontSize: 10, formatter: "准入" },
          data: [{ yAxis: list[0]?.benchmark ?? 0 }],
        },
      },
    ],
  };
});

function axis() {
  return {
    axisLine: { lineStyle: { color: "rgba(148,163,184,0.35)" } },
    axisLabel: { color: "#CBD5E1", fontSize: 11 },
    splitLine: { lineStyle: { color: "rgba(148,163,184,0.16)" } },
  };
}

/** 排名色：只给第 1 名绿、2~3 名蓝——颜色标名次不标好坏（见文件头） */
const rankTone = (r: number) => (r === 1 ? "text-emerald-400" : r <= 3 ? "text-sky-400" : "text-[#64748B]");

const fmt = (v: number, d = 1) => Number(v).toFixed(d);

onMounted(() => void load());
watch(
  ready,
  (v) => {
    if (v) void load();
  },
  { once: true },
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 p-3" :class="emsDarkClass">
    <!-- 顶栏 -->
    <div class="flex shrink-0 items-center gap-4 rounded-md border border-white/10 bg-[#111A2C] px-4 py-2">
      <span :class="emsHeaderTextClass">能耗考核与对标</span>
      <span class="text-xs text-slate-500"> 对标 GB 21256 口径示意 · 实绩 vs 定额 vs 标杆（准入线以下为不合格） </span>
      <button
        type="button"
        class="ml-auto cursor-pointer rounded border border-[#38BDF8]/60 px-3 py-1.5 text-body text-sky-400 hover:bg-[#38BDF8]/10 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="busy"
        @click="generate"
      >
        ▶ 生成考核月报
      </button>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-5 gap-2">
      <!-- 左：对标柱图 -->
      <section class="col-span-3 flex min-h-0 flex-col rounded-md border border-white/10 bg-[#111A2C] p-2">
        <div class="shrink-0 pb-1 text-sm text-sky-400">工序能耗对标（kgce/t）</div>
        <EChart :option="chartOption" force-dark class="min-h-0 flex-1" />
        <div class="shrink-0 pt-1 text-xs text-slate-500">
          柱色：绿 = 不高于标杆 · 琥珀 = 高于标杆但达准入 · 红 = 低于准入线（不合格）
        </div>
      </section>

      <!-- 右：排名 + 评分表 -->
      <section class="col-span-2 flex min-h-0 flex-col rounded-md border border-white/10 bg-[#111A2C]">
        <div class="shrink-0 px-3 py-2 text-sm text-sky-400">厂际排名与评分</div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full" style="font-size: 13px">
            <thead class="sticky top-0 bg-[#111A2C] text-slate-500">
              <tr>
                <th class="px-3 py-2 text-left font-normal">名次</th>
                <th class="px-3 py-2 text-left font-normal">单位</th>
                <th class="px-3 py-2 text-right font-normal">实绩</th>
                <th class="px-3 py-2 text-right font-normal">定额</th>
                <th class="px-3 py-2 text-right font-normal">扣分</th>
                <th class="px-3 py-2 text-right font-normal">加分</th>
                <th class="px-3 py-2 text-right font-normal">得分</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in ranked" :key="r.unitId + r.mediaCode" class="border-t border-white/5">
                <td class="px-3 py-2 font-semibold" :class="rankTone(r.rank)">{{ r.rank }}</td>
                <td class="px-3 py-2 text-slate-300">
                  {{ nameOf(r.unitId) }}
                  <span class="ml-1 text-xs text-slate-500">{{ r.product }}</span>
                </td>
                <td
                  class="px-3 py-2 text-right tabular-nums"
                  :class="r.actual <= r.benchmark ? 'text-emerald-400' : 'text-amber-400'"
                >
                  {{ fmt(r.actual) }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums text-slate-500">{{ fmt(r.quota) }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-red-400">
                  {{ r.deduction > 0 ? `−${r.deduction}` : "0" }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums text-emerald-400">
                  {{ r.bonus > 0 ? `+${r.bonus}` : "0" }}
                </td>
                <td class="px-3 py-2 text-right font-semibold tabular-nums text-slate-300">{{ fmt(r.score, 0) }}</td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="7" class="px-3 py-8 text-center text-sm text-slate-500">
                  {{ loading ? "加载中…" : "暂无考核数据，点「▶ 生成考核月报」。" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- 评分口径 -->
    <div class="shrink-0 rounded-md border border-white/10 bg-[#111A2C] px-4 py-2 text-xs text-slate-500">
      得分 = 基准分 − 超标扣分 + 节能加分（由 `store.runAssess` 算，页面不自算）· `direction=STD`
      表示「折标煤综合口径」——考核的是吨钢综合能耗，跨所有介质，没有单一介质可挂
    </div>
  </div>
</template>
