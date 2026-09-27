<script setup lang="ts">
/**
 * EP0006 重点用能设备（模块五 · 附录 B5 版式 **V3 台账 + 能效曲线下钻**）
 *
 *  接口：`keyEquipApi.page/curve`（曲线由 `model.monthSeries` 派生，页面不自己抖）
 *
 *  演示要点：**九大类设备的能效评级**（1级-3级-落后）。
 *  能效等级不是贴纸——它来自 `model.EFF_GRADE_FACTOR` 对**工序定额**的修正，
 *  所以「1 级机组略优、3 级略差」的口径与 EP0001 那张定额表**同源**：
 *  客户最爱拿这两页互查，一处改了另一处没跟上就露馅。
 *
 *  **单耗方向是「越低越好」**：`intensity` 列按 `EFF_GRADE_FACTOR` 排布天然有序
 *  （1级 0.94 < 2级 1.0 < 3级 1.08 < 落后 1.2），所以列上直接给等级色标，
 *  而不是让客户自己比大小。
 *
 *  点行看能效曲线（`kind:"form"` 不合适——它不是表单，所以走自定义下钻：
 *  行动作 `detail` 打开详情，`曲线` 用 row 的 `curve` 字段现取）。
 *
 *  待接入：设备台账增改（主数据同步，本页只读）、月度曲线导出。
 */
import { computed, onMounted, ref, watch } from "vue";
import { keyEquipApi } from "@/api/energy";
import type { KeyEquip } from "@/api/energy/types";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import EChart from "../../EChart.vue";
import { emsDarkClass, emsHeaderTextClass } from "../../emsTheme";
import { useNameMaps } from "../../nameMaps";
import type { EChartsOption } from "echarts";

const { ready, unitMap, mediumMap } = useNameMaps();

const rows = ref<KeyEquip[]>([]);
const loading = ref(true);
const category = ref("");

async function load() {
  try {
    const res = await keyEquipApi.page({
      currentPage: 1,
      pageSize: 200,
      ...(category.value ? { category: category.value } : {}),
    });
    rows.value = res.rows;
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/** 九大类（顺序 = 规格书 A3 EP0006 的列举顺序，讲解时按这个念） */
const CATEGORIES = ["空压机", "变压器", "水泵", "煤气加压机", "锅炉", "鼓风机", "TRT", "煤气柜", "透平机"];

/**
 * 等级 → 色标。
 *
 * 不走 `cells.tagRenderer`：那个是 AG Grid 的 `cellRenderer`（收 `ICellRendererParams`），
 * 这里是表格里手写的 `<td>`，拿它当 `:ref` 传进去收到的是 DOM 元素、参数对不上。
 * 词色与 `cells.TAG_CLASS` 的 `1级/2级/3级/落后` 同值——同一个词两处不同色就是页间矛盾。
 */
const GRADE_CLASS: Record<string, string> = {
  "1级": "text-emerald-400",
  "2级": "text-sky-400",
  "3级": "text-amber-400",
  落后: "text-red-400",
};
const gradeOf = (g: string) => GRADE_CLASS[g] ?? "text-[#64748B]";

const ranked = computed(() => rows.value.toSorted((a, b) => b.monthStdCoal - a.monthStdCoal).slice(0, 8));

/* ── 能效曲线下钻 ────────────────────────────────────────────── */

const curveOpen = ref(false);
const curveTitle = ref("");
const curve = ref<Array<{ label?: string; monthStdCoal: number; intensity: number }>>([]);

async function openCurve(r: KeyEquip) {
  try {
    curve.value = await keyEquipApi.curve(r.id);
    curveTitle.value = `${r.name} · 近 6 期单耗与折标煤`;
    curveOpen.value = true;
  } catch {
    /* 拦截层已 toast */
  }
}

/** 双轴图：折标煤（柱）与单耗（线）**量纲不同，必须分轴**——
 *  塞进一个 y 轴，单耗那条线会被柱子压成贴底的直线（本域踩过的坑） */
const curveOption = computed<EChartsOption>(() => {
  const curveRows = curve.value;
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 56, right: 56, top: 40, bottom: 28 },
    tooltip: { trigger: "axis" },
    legend: { top: 4, textStyle: { color: "#CBD5E1", fontSize: 12 } },
    xAxis: { type: "category", data: curveRows.map((r) => r.label ?? ""), ...axis() },
    yAxis: [
      { type: "value", name: "tce", nameTextStyle: { color: "#64748B", fontSize: 11 }, ...axis() },
      {
        type: "value",
        name: "单耗",
        nameTextStyle: { color: "#64748B", fontSize: 11 },
        ...axis(),
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "月折标煤",
        type: "bar",
        barWidth: 18,
        data: curveRows.map((r) => r.monthStdCoal),
        itemStyle: { color: "#60A5FA" },
      },
      {
        name: "单耗",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        data: curveRows.map((r) => r.intensity),
        lineStyle: { width: 2, color: "#F59E0B" },
        itemStyle: { color: "#F59E0B" },
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
    <!-- 顶栏：类别筛选 + 数量 -->
    <div class="flex shrink-0 flex-wrap items-center gap-3 rounded-md border border-white/10 bg-[#111A2C] px-4 py-2">
      <span :class="emsHeaderTextClass">重点用能设备</span>
      <button
        type="button"
        class="cursor-pointer rounded px-2 py-1 text-xs"
        :class="category === '' ? 'bg-[#38BDF8]/20 text-sky-400' : 'text-slate-500 hover:bg-white/10'"
        @click="
          category = '';
          load();
        "
      >
        全部
      </button>
      <button
        v-for="c in CATEGORIES"
        :key="c"
        type="button"
        class="cursor-pointer rounded px-2 py-1 text-xs"
        :class="category === c ? 'bg-[#38BDF8]/20 text-sky-400' : 'text-slate-500 hover:bg-white/10'"
        @click="
          category = c;
          load();
        "
      >
        {{ c }}
      </button>
      <span class="ml-auto text-xs text-slate-500">{{ rows.length }} 台 · 点行看详情与近 6 期能效曲线</span>
    </div>

    <div class="grid min-h-0 flex-1 grid-cols-5 gap-2">
      <!-- 左：台账表（占大头） -->
      <section class="col-span-3 flex min-h-0 flex-col rounded-md border border-white/10 bg-[#111A2C]">
        <div class="shrink-0 px-3 py-2 text-sm text-sky-400">设备台账</div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full" style="font-size: 13px">
            <thead class="sticky top-0 bg-[#111A2C] text-slate-500">
              <tr>
                <th class="px-3 py-2 text-left font-normal">设备</th>
                <th class="px-3 py-2 text-left font-normal">类别</th>
                <th class="px-3 py-2 text-left font-normal">所在单元</th>
                <th class="px-3 py-2 text-right font-normal">月折标 tce</th>
                <th class="px-3 py-2 text-right font-normal">单耗</th>
                <th class="px-3 py-2 text-left font-normal">等级</th>
                <th class="px-3 py-2 text-left font-normal">动作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in rows" :key="r.id" class="border-t border-white/5">
                <td class="px-3 py-2 text-slate-300">
                  {{ r.name }}
                  <span class="ml-1 text-xs text-slate-500">{{ r.model }}</span>
                </td>
                <td class="px-3 py-2 text-slate-500">{{ r.category }}</td>
                <td class="px-3 py-2 text-slate-500">{{ unitMap[r.unitId] ?? r.unitId }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-slate-300">
                  {{ r.monthStdCoal.toLocaleString("zh-CN") }}
                </td>
                <td class="px-3 py-2 text-right tabular-nums text-slate-500">
                  {{ r.intensity }}<span class="ml-0.5 text-xs">{{ r.intensityUnit }}</span>
                </td>
                <td class="px-3 py-2 text-xs font-medium" :class="gradeOf(r.effGrade)">{{ r.effGrade }}</td>
                <td class="px-3 py-2">
                  <button
                    type="button"
                    class="cursor-pointer text-xs text-sky-400 hover:underline"
                    @click="openCurve(r)"
                  >
                    能效曲线
                  </button>
                </td>
              </tr>
              <tr v-if="!rows.length">
                <td colspan="7" class="px-3 py-8 text-center text-sm text-slate-500">
                  {{ loading ? "加载中…" : "该类别下没有设备" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 右：高耗排名（结论区） -->
      <section class="col-span-2 flex min-h-0 flex-col rounded-md border border-white/10 bg-[#111A2C]">
        <div class="shrink-0 px-3 py-2 text-sm text-sky-400">高耗设备排名（前 8）</div>
        <div class="min-h-0 flex-1 overflow-auto">
          <table class="w-full" style="font-size: 13px">
            <thead class="sticky top-0 bg-[#111A2C] text-slate-500">
              <tr>
                <th class="px-3 py-2 text-left font-normal">#</th>
                <th class="px-3 py-2 text-left font-normal">设备</th>
                <th class="px-3 py-2 text-right font-normal">月折标 tce</th>
                <th class="px-3 py-2 text-left font-normal">等级</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in ranked" :key="r.id" class="border-t border-white/5">
                <td class="px-3 py-2" :class="i === 0 ? 'text-red-400 font-semibold' : 'text-slate-500'">
                  {{ i + 1 }}
                </td>
                <td class="px-3 py-2 text-slate-300">{{ r.name }}</td>
                <td class="px-3 py-2 text-right tabular-nums text-slate-300">
                  {{ r.monthStdCoal.toLocaleString("zh-CN") }}
                </td>
                <td class="px-3 py-2 text-xs font-medium" :class="gradeOf(r.effGrade)">{{ r.effGrade }}</td>
              </tr>
              <tr v-if="!ranked.length">
                <td colspan="4" class="px-3 py-8 text-center text-sm text-slate-500">加载中…</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="shrink-0 border-t border-white/10 px-3 py-2 text-xs text-slate-500">
          等级口径：`EFF_GRADE_FACTOR` 对**工序定额**的修正（1级 0.94 / 2级 1.0 / 3级 1.08 / 落后 1.2）—— 与 EP0001
          定额表同源，两页可互查
        </div>
      </section>
    </div>

    <!-- 能效曲线下钻：`DetailDialog` 没有插槽，所以台账与曲线是**两个弹窗**——
         曲线自己开（`openCurve`），台账详情走表格的「详情」行动作。
         硬塞进没有插槽的组件 = 图画不出来，而页面上又"看起来配了" -->
    <Dialog v-model:visible="curveOpen" modal :header="curveTitle" :style="{ width: 'min(46rem, calc(100vw - 2rem))' }">
      <EChart :option="curveOption" force-dark class="h-64" />
      <div class="mt-2 text-xs text-muted-foreground">
        柱 = 月折标煤（tce，左轴）· 线 = 单耗（右轴）。**两者量纲不同必须分轴**， 否则单耗会被柱子压成贴底的直线
      </div>
      <template #footer>
        <Button label="关闭" variant="outlined" autofocus @click="curveOpen = false" />
      </template>
    </Dialog>
  </div>
</template>
