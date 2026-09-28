<script setup lang="ts">
/**
 * TD 大屏看板 **共享底板**——TD0001 烧结 / TD0002 高炉 / TD0003 铁水 三张屏共用，
 * 换 `kind` 一个入参。三张屏**版式完全一致**（B8 给的工艺区域色 + KPI 墙 + 曲线 + 报警条），
 * 差别只在数据与那块工艺色。
 *
 * ── 1920×1080 等比缩放 ─────────────────────────────────────────────────
 * 大屏不是响应式的，是**固定 1920×1080 再整体缩放**：现场是投影/LED，比例固定，
 * 逐元素重排反而会在不同分辨率下错位。所以：
 * 内层写死 `w-[1920px] h-[1080px]`，外层量窗口算 `scale` 再 `transform: scale()`。
 * **切词阶在这里会崩**——缩放是纯 transform，字号跟着整体放大，
 * 所以内层仍用四档字阶，不写 `text-[34px]` 之类的越档值（不破 `audit:ui`）。
 *
 * ── 固定深色 ───────────────────────────────────────────────────────────
 * `tqDarkClass` + `force-dark`：大屏常年开灯开着，不跟壳层主题翻转。
 * 图表 option 里的颜色**全部写死**——只跟根元素判主题，浅色外壳下会出现
 * 深蓝底贴一块浅灰画布（见 `EChart.vue` 的 `forceDark` 分支说明）。
 *
 * ── 轮询纪律 ───────────────────────────────────────────────────────────
 * **定时器归页面**（`onMounted` 起、`onBeforeUnmount` 清）——
 * AGENTS 点过 KeepAlive 缓存页后台轮询的问题。大屏可能开一天，这条尤其要紧。
 *
 * ── 数字从哪来 ─────────────────────────────────────────────────────────
 * 屏上每个数都来自 `model.ts` 的派生函数或既有事件表（见 `data/board.ts` 文件头），
 * **没有一处手写**——客户会拿大屏与报表页交叉核，两处必须相等。
 *
 * **本底板只读**：没有写操作（本域只查桩）。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { boardApi } from "@/api/mes4tq";
import type { BoardData, BoardKpi } from "@/api/mes4tq/types";
import EChart from "../EChart.vue";
import { TQ_AREA, tqChartAxis, tqDarkClass, tqHeaderTextClass } from "../tqTheme";

const props = defineProps<{
  /** sinter / blast / iron */
  kind: "sinter" | "blast" | "iron";
}>();

/** 轮询节拍（ms）。大屏要"活着"的感觉，但 5s 人眼能跟上；
 *  更快（1s）会让数字一直在跳，反而看不清当前值 */
const TICK = 5000;
/** 设计基准分辨率——大屏是**固定 1920×1080 再缩放**，不是响应式（见文件头） */
const W = 1920;
const H = 1080;

const data = ref<BoardData | null>(null);
const shell = ref<{ title: string; areaKey: string; footer: string } | null>(null);
const loading = ref(true);
const lastOkAt = ref("");

/** 工艺区域色：`areaKey` → `TQ_AREA`（**颜色只住 tqTheme**，mock 不给颜色） */
const areaColor = computed(() => {
  const key = shell.value?.areaKey ?? "";
  return (TQ_AREA as Record<string, string>)[key] ?? "#60A5FA";
});

/* ── 等比缩放 ──────────────────────────────────────────── */

const scale = ref(1);

/**
 * 量窗口 → 算缩放比。
 *
 * **取 min 而不是分别算**：两个方向都必须**完整**在视野内
 * （取 max 会让短边超出、KPI 墙被裁掉）。留 0.96 的边距，
 * 否则贴边显示时现场的屏幕边框会压住第一行。
 */
function fit() {
  scale.value = Math.min(window.innerWidth / W, window.innerHeight / H) * 0.96;
}

/* ── 数据 ──────────────────────────────────────────────── */

async function load() {
  try {
    const fn = props.kind === "sinter" ? boardApi.sinter : props.kind === "blast" ? boardApi.blast : boardApi.iron;
    const [d, s] = await Promise.all([
      fn(),
      shell.value
        ? Promise.resolve(shell.value)
        : (boardApi.shell(props.kind) as Promise<{ title: string; areaKey: string; footer: string }>),
    ]);
    data.value = d;
    shell.value = s as any;
    lastOkAt.value = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  } catch {
    /* 拦截层已 toast；数据冻在上一帧比整屏报错强 */
  } finally {
    loading.value = false;
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  fit();
  window.addEventListener("resize", fit);
  void load();
  timer = setInterval(() => void load(), TICK);
});

/* **必须清**：大屏可能开一整天，定时器与 resize 监听都要卸干净 */
onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  window.removeEventListener("resize", fit);
});

/* ── 图表 ──────────────────────────────────────────────── */

/**
 * 曲线 option：**颜色写死**，不跟外壳主题（固定深色，见文件头）。
 *
 * 三条线**各自带单位标注在图例里**（`温度 ℃` / `压力 kPa`）——
 * 三条线量纲不同，若只在图上标一个 y 轴，客户会以为 1180 与 2.86 是一个尺度。
 * 这是这张图唯一不能省的说明。
 */
const chartOption = computed(() => {
  const d = data.value;
  const palette = ["#38BDF8", "#22C55E", "#F59E0B"];
  return {
    backgroundColor: "transparent",
    grid: { left: 62, right: 24, top: 40, bottom: 34 },
    tooltip: { trigger: "axis" as const },
    legend: {
      data: (d?.series ?? []).map((s) => s.name),
      textStyle: { color: "#CBD5E1", fontSize: 15 },
      top: 4,
    },
    xAxis: { type: "category" as const, data: d?.times ?? [], boundaryGap: false, ...tqChartAxis(true) },
    yAxis: { type: "value" as const, ...tqChartAxis(true) },
    series: (d?.series ?? []).map((s, i) => ({
      name: s.name,
      type: "line" as const,
      smooth: true,
      symbol: "circle" as const,
      symbolSize: 5,
      data: s.data,
      lineStyle: { width: 2, color: palette[i % palette.length] },
      itemStyle: { color: palette[i % palette.length] },
      areaStyle: { color: `${palette[i % palette.length]}22` },
    })),
  };
});

/** KPI 状态 → 颜色。**报警红、预警琥珀、正常绿**，与 `tqTheme` 的三档语义色同值 */
const STATUS_CLASS: Record<string, string> = {
  报警: "text-[#EF4444] border-[#EF4444]/50 bg-[#EF4444]/12",
  预警: "text-[#F59E0B] border-[#F59E0B]/50 bg-[#F59E0B]/12",
  正常: "text-[#22C55E] border-[#22C55E]/45 bg-[#22C55E]/10",
};

/** 报警级别 → 颜色（事故/重大红、一般琥珀、提示蓝） */
const ALARM_CLASS: Record<string, string> = {
  事故: "text-[#EF4444]",
  重大: "text-[#EF4444]",
  一般: "text-[#F59E0B]",
  提示: "text-[#38BDF8]",
};

/** KPI 值的显示：数值给千分位、字符串原样（`今日铁水 4850` 这类数字才需要分隔） */
function fmt(v: BoardKpi["value"]): string {
  if (typeof v === "number") return v.toLocaleString("zh-CN", { maximumFractionDigits: 3 });
  return String(v ?? "—");
}
</script>

<template>
  <!-- 固定深色外壳 + 缩放容器（见文件头「1920×1080 等比缩放」） -->
  <div class="relative h-full w-full overflow-hidden" :class="tqDarkClass">
    <!-- 居中缩放：`translate(-50%,-50%) scale()` 必须**先平移后缩放**——
         反过来（scale 在前）会把 -50% 也一起缩放，屏就偏左上角了。
         `transform-origin: center` 是让 `translate(-50%,-50%)` 相对自身尺寸算的前提。 -->
    <div
      class="absolute left-1/2 top-1/2"
      :style="{
        width: `${W}px`,
        height: `${H}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
      }"
    >
      <!-- ── 顶部：标题 + 时间 ─────────────────────────────── -->
      <div class="flex h-20 items-center gap-6 border-b border-white/10 px-10">
        <span class="flex h-10 w-1.5 items-center" :style="{ background: areaColor }"></span>
        <div>
          <div class="text-base font-semibold text-sky-400">{{ shell?.title ?? "大屏" }}</div>
          <div class="text-xs text-slate-500">钢城钢铁 铁区MES · {{ data?.clock ?? "—" }}</div>
        </div>
        <span class="ml-auto text-xs text-slate-500">
          上次更新 {{ lastOkAt || "—" }} · 每 {{ TICK / 1000 }}s 轮询
          <span v-if="loading && !data" class="ml-3">加载中…</span>
        </span>
      </div>

      <!-- ── KPI 墙：6 格 ──────────────────────────────────── -->
      <div class="grid grid-cols-6 gap-3 px-10 py-6">
        <div
          v-for="k in data?.kpis ?? []"
          :key="k.key"
          class="rounded border px-4 py-3"
          :class="STATUS_CLASS[k.status ?? '正常'] ?? STATUS_CLASS['正常']"
        >
          <div class="text-xs opacity-75">{{ k.label }}</div>
          <div class="mt-1 flex items-baseline gap-1.5">
            <span class="text-base font-semibold tabular-nums">{{ fmt(k.value) }}</span>
            <span class="text-xs opacity-70">{{ k.unit }}</span>
          </div>
          <div class="mt-0.5 text-xs opacity-60">
            {{ k.target !== undefined ? `目标 ${k.target}` : (k.status ?? "正常") }}
          </div>
        </div>
      </div>

      <!-- ── 主区：左曲线 / 右报警 ─────────────────────────── -->
      <div class="flex gap-3 px-10" style="height: 640px">
        <div class="flex-1 rounded border border-white/10 bg-[#111A2C]/70">
          <div class="flex h-10 items-center gap-3 border-b border-white/10 px-4">
            <span class="text-sm font-medium text-slate-300">运行趋势（近 12 小时）</span>
            <span class="text-xs text-slate-500">三条线量纲不同，单位写在图例里</span>
          </div>
          <div class="p-3" style="height: 592px">
            <EChart :option="chartOption" height="100%" force-dark />
          </div>
        </div>

        <div class="flex w-[440px] flex-col gap-3">
          <!-- 报警条 -->
          <div class="flex-1 rounded border border-white/10 bg-[#111A2C]/70">
            <div class="flex h-10 items-center gap-2 border-b border-white/10 px-4">
              <span class="text-sm font-medium text-slate-300">报警与提示</span>
              <span
                class="ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums"
                :class="(data?.alarms?.length ?? 0) ? 'bg-[#EF4444]/20 text-red-400' : 'bg-white/10 text-slate-500'"
              >
                {{ data?.alarms?.length ?? 0 }}
              </span>
            </div>
            <div class="max-h-[420px] overflow-auto">
              <div v-for="(a, i) in data?.alarms ?? []" :key="i" class="border-b border-white/5 px-4 py-3">
                <div class="flex items-baseline gap-2">
                  <span class="text-xs tabular-nums text-slate-500">{{
                    a.clock.slice(11, 16) || a.clock.slice(5, 10)
                  }}</span>
                  <span class="text-xs font-medium" :class="ALARM_CLASS[a.level] ?? 'text-slate-300'">{{
                    a.level
                  }}</span>
                </div>
                <div class="mt-0.5 text-sm text-slate-300">{{ a.text }}</div>
              </div>
              <div v-if="!data?.alarms?.length" class="px-4 py-8 text-center text-sm text-slate-500">
                全部在正常区间
              </div>
            </div>
          </div>

          <!-- 口径说明：客户扫一眼就知道这屏在说什么 -->
          <div class="rounded border border-white/10 bg-[#111A2C]/70 px-4 py-3">
            <div class="text-xs font-medium text-sky-400">数据口径</div>
            <div class="mt-1 text-xs leading-5 text-slate-500">{{ shell?.footer ?? "—" }}</div>
          </div>
        </div>
      </div>

      <!-- ── 底栏 ─────────────────────────────────────────── -->
      <div class="flex h-12 items-center gap-6 border-t border-white/10 px-10 text-xs text-slate-500">
        <span>指标口径：附录 B4 子母项</span>
        <span>工艺区域色：附录 B8</span>
        <span>数字全部来自 model 派生层，与报表页同源</span>
        <span class="ml-auto">{{ data?.title }} · {{ data?.clock }}</span>
      </div>
    </div>
  </div>
</template>
