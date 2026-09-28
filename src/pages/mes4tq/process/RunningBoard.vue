<script setup lang="ts">
/**
 * 运行参数 L5 **共享监控盘**——TW0204/TW0206/TW0304/TW0404/TW0504/TW0604 六个
 * 「运行参数 / 炉温 / 煤气净化」页共用，换 `process` + `paramKey` 两个入参。
 *
 * **固定深色**（`tqDarkClass` + `forceDark`）：现场操作室常年不开灯。
 * 图表 option 里的颜色**全部写死**——只跟根元素判主题，会让用户在浅色外壳里
 * 看到深蓝底上贴一块浅灰画布（见 `EChart.vue` 的 `forceDark` 分支说明）。
 *
 * 页面职责只有三件，**判定一律不在页面做**：
 * 1. **参数色块墙**：读 `current.alarms` 把超限的标红——上下限是 `model.paramSnapshot()` 判的；
 * 2. **历史曲线**：点一个参数看它近 8 小时的走势，虚线是上下限；
 * 3. **报警条**：超限参数列在底部，念第一行就是「现在哪个参数不对」。
 *
 * 「阈值住在哪里」是这页最容易走偏的地方：**页面一个数字都不写**，
 * 上下限来自 `processParamApi.defs()`（那端点读 `model.PROCESS_PARAMS`）。
 * 六个页面各写一套阈值，改一处漏五处，而超限判定在两处做必然会出现两页对同一条的结论不一致。
 *
 * 轮询纪律：**定时器归页面**（`onMounted` 起、`onBeforeUnmount` 清）——
 * AGENTS 点过 KeepAlive 缓存页后台轮询的问题。
 *
 * **本底板只读**：没有写操作（本域只查桩）。
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { processApi, processParamApi } from "@/api/mes4tq";
import EChart from "../EChart.vue";
import { TQ_BAD, TQ_OK, TQ_WARN, tqChartAxis, tqDarkClass, tqHeaderTextClass, tqPanelClass } from "../tqTheme";

const props = defineProps<{
  /** 工序键：coke / pellet / sinter / lime / blast / raw */
  process: string;
  /**
   * 参数套 key。**焦化三页各一套**（`coke` 主参数 / `coke-oven` 炉温 / `coke-gas` 煤气净化），
   * 其余工序省略即可（端点回落到 `process`）。
   */
  paramKey?: string;
  /** 页面代号（资源表 cCode） */
  code: string;
  /** 盘面标题 */
  title: string;
}>();

/** 轮询节拍（ms）。参数变化比采集点位慢一档，10s 够读、也不会每两秒刷一遍数值晃眼 */
const TICK = 10000;

const units = ref<Array<{ id: string; name: string; spec?: string }>>([]);
const unitId = ref("");
const defs = ref<Array<{ key: string; label: string; unit: string; lo: number; hi: number; digits?: number }>>([]);
const snapshot = ref<any>(null);
const clock = ref("");
const loading = ref(true);

/** 当前选中看曲线的参数（默认取第一个） */
const activeKey = ref("");

const currentParams = computed<Record<string, number>>(() => snapshot.value?.params ?? {});
const alarms = computed<string[]>(() => snapshot.value?.alarms ?? []);

/** 超限判定**只做一次**：读 `model.paramSnapshot()` 已经算好的 `alarms`，页面不重算
 *  ——两处判定必然会出现两页对同一条参数给出不同结论 */
function inAlarm(key: string): boolean {
  return alarms.value.includes(key);
}

function unitName(id: string): string {
  return units.value.find((u) => u.id === id)?.name ?? id;
}

async function loadSnapshot() {
  if (!unitId.value) return;
  try {
    snapshot.value = await processParamApi.current(unitId.value, props.paramKey);
    clock.value = snapshot.value?.clock ?? "";
  } catch {
    /* 拦截层已 toast；值冻在上一帧比整页报错强 */
  } finally {
    loading.value = false;
  }
}

/* ── 历史曲线 ──────────────────────────────────────────── */

const history = ref<{
  times: string[];
  series: Array<{ name: string; unit: string; data: number[] }>;
  defs: Array<{ key: string; label: string; unit: string; lo: number; hi: number }>;
}>({
  times: [],
  series: [],
  defs: [],
});

async function loadHistory() {
  if (!unitId.value) return;
  try {
    history.value = await processParamApi.history(
      unitId.value,
      activeKey.value ? [activeKey.value] : [],
      8,
      props.paramKey,
    );
    if (!activeKey.value && history.value.defs.length) activeKey.value = history.value.defs[0].key;
  } catch {
    /* 拦截层已 toast */
  }
}

const activeDef = computed(() => history.value.defs.find((d) => d.key === activeKey.value) ?? history.value.defs[0]);

/** 曲线 option：**颜色全部写死**，不跟外壳主题（固定深色页，见文件头） */
const chartOption = computed(() => {
  const def = activeDef.value;
  const s = history.value.series[0];
  return {
    backgroundColor: "transparent",
    grid: { left: 62, right: 18, top: 22, bottom: 26 },
    tooltip: { trigger: "axis" as const },
    xAxis: { type: "category" as const, data: history.value.times, boundaryGap: false, ...tqChartAxis(true) },
    yAxis: { type: "value" as const, ...tqChartAxis(true) },
    series: [
      {
        name: def?.label ?? "",
        type: "line" as const,
        smooth: true,
        symbol: "circle" as const,
        symbolSize: 4,
        data: s?.data ?? [],
        lineStyle: { width: 2, color: TQ_OK },
        itemStyle: { color: TQ_OK },
        areaStyle: { color: "rgba(34,197,94,0.14)" },
        /* 上下限两条虚线：不画它们，曲线「越没越线」要靠客户自己对数字 */
        markLine: def
          ? {
              silent: true,
              symbol: "none",
              lineStyle: { color: TQ_BAD, type: "dashed" as const, width: 1 },
              label: { color: TQ_BAD, fontSize: 10, formatter: (d: any) => `${d.value}` },
              data: [{ yAxis: def.lo }, { yAxis: def.hi }],
            }
          : undefined,
      },
    ],
  };
});

function selectParam(key: string) {
  if (activeKey.value === key) return;
  activeKey.value = key;
  void loadHistory();
}

async function selectUnit(id: string) {
  if (unitId.value === id) return;
  unitId.value = id;
  await Promise.all([loadSnapshot(), loadHistory()]);
}

/* ── 轮询 ──────────────────────────────────────────────── */
let timer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  try {
    units.value = await processApi.units(props.process);
    if (units.value.length) unitId.value = units.value[0].id;
  } catch {
    /* 拦截层已 toast；没有机组则盘面停在空态 */
  }
  defs.value = await processParamApi.defs(props.process, props.paramKey).catch(() => []);
  await Promise.all([loadSnapshot(), loadHistory()]);
  if (defs.value.length && !activeKey.value) activeKey.value = defs.value[0].key;
  timer = setInterval(() => void loadSnapshot(), TICK);
});

/* **必须清**：只清定时器不清在途请求也是白清——本页是单发 GET，卸载即停发新请求即可 */
onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});

/* 切机组时 activeKey 若属于上一套参数，要复位到新套的第一个 */
watch(
  () => props.paramKey,
  () => {
    activeKey.value = "";
  },
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" :class="tqDarkClass">
    <!-- 表头：标题 + 机组切换 + 轮询状态 -->
    <div class="flex h-11 shrink-0 items-center gap-3 border-b border-white/10 px-4">
      <span :class="tqHeaderTextClass">{{ title }}</span>
      <div class="flex items-center gap-1.5 overflow-x-auto">
        <button
          v-for="u in units"
          :key="u.id"
          type="button"
          class="shrink-0 cursor-pointer rounded border px-2 py-0.5 text-xs transition-colors"
          :class="
            unitId === u.id
              ? 'border-[#38BDF8]/60 bg-[#38BDF8]/15 text-sky-400'
              : 'border-white/15 text-slate-300 hover:bg-white/10'
          "
          @click="selectUnit(u.id)"
        >
          {{ u.name }}{{ u.spec ? ` ${u.spec}` : "" }}
        </button>
      </div>
      <span class="ml-auto text-xs text-slate-500">
        {{ clock || "—" }}
        <span class="mx-2 text-slate-500/60">|</span>
        <span :class="alarms.length ? 'text-red-400' : 'text-emerald-400'">
          {{ alarms.length ? `${alarms.length} 个参数超限` : "全部在限内" }}
        </span>
        <span class="mx-2 text-slate-500/60">|</span>
        每 {{ TICK / 1000 }}s 刷新
      </span>
      <button
        type="button"
        class="cursor-pointer rounded border border-white/15 px-2 py-0.5 text-xs text-slate-300 hover:bg-white/10"
        @click="loadSnapshot"
      >
        立即刷新
      </button>
    </div>

    <!-- 主区：左参数色块墙 + 右历史曲线 -->
    <div class="flex min-h-0 flex-1">
      <!-- 参数色块墙 -->
      <div class="flex min-w-0 flex-1 flex-col border-r border-white/10">
        <div class="flex h-8 shrink-0 items-center px-4 text-xs text-slate-500">
          运行参数（点选看历史曲线）
          <span class="ml-auto">{{ defs.length }} 个参数 · 判定与阈值在 model，页面不写</span>
        </div>
        <div class="min-h-0 flex-1 overflow-auto p-3">
          <div class="grid grid-cols-2 gap-2 lg:grid-cols-3 2xl:grid-cols-4">
            <button
              v-for="d in defs"
              :key="d.key"
              type="button"
              class="rounded border px-3 py-2 text-left transition-colors"
              :class="[
                inAlarm(d.key)
                  ? 'border-red-500/55 bg-red-500/15 text-red-400'
                  : 'border-emerald-500/35 bg-emerald-500/8 text-emerald-400',
                activeKey === d.key ? 'ring-1 ring-[#38BDF8]' : '',
              ]"
              @click="selectParam(d.key)"
            >
              <div class="flex items-baseline gap-1.5">
                <span class="truncate text-xs opacity-85">{{ d.label }}</span>
                <span class="ml-auto shrink-0 text-xs opacity-70">{{ d.unit }}</span>
              </div>
              <div class="text-base font-semibold tabular-nums">
                {{ currentParams[d.key] ?? "—" }}
              </div>
              <div class="text-xs" :class="inAlarm(d.key) ? 'opacity-90' : 'opacity-60'">
                限 {{ d.lo }} ~ {{ d.hi }}
                <span v-if="inAlarm(d.key)"> · 超限</span>
              </div>
            </button>
          </div>
          <div v-if="!defs.length" class="p-8 text-center text-sm text-slate-500">
            {{ loading ? "加载中…" : "该机组没有配置运行参数" }}
          </div>
        </div>
      </div>

      <!-- 历史曲线 -->
      <div class="flex w-[40%] shrink-0 flex-col">
        <div class="flex h-8 shrink-0 items-center px-4 text-xs text-slate-500">
          {{ activeDef?.label ?? "历史曲线" }}
          <span class="ml-auto">近 8 小时 · 红虚线为上下限</span>
        </div>
        <div class="min-h-0 flex-1 px-2">
          <EChart :option="chartOption" height="100%" force-dark />
        </div>
        <div class="shrink-0 border-t border-white/10 px-4 py-2 text-xs text-slate-500">
          {{ unitName(unitId) }} · {{ activeDef?.label ?? "" }}
          <span class="text-slate-300">当前 {{ currentParams[activeKey] ?? "—" }}{{ activeDef?.unit || "" }}</span>
          <span class="ml-3">限 {{ activeDef?.lo ?? "—" }} ~ {{ activeDef?.hi ?? "—" }}</span>
        </div>
      </div>
    </div>

    <!-- 底部报警条 -->
    <div class="shrink-0 border-t border-white/10" :class="tqPanelClass">
      <div
        class="flex min-h-8 flex-wrap items-center gap-3 px-4 py-1.5 text-xs"
        :class="alarms.length ? 'text-red-400' : 'text-slate-500'"
      >
        <span class="font-medium">超限参数</span>
        <template v-if="alarms.length">
          <span v-for="k in alarms" :key="k" class="rounded bg-red-500/20 px-2 py-0.5 tabular-nums">
            {{ defs.find((d) => d.key === k)?.label ?? k }}
            {{ currentParams[k] }}{{ defs.find((d) => d.key === k)?.unit || "" }} （限
            {{ defs.find((d) => d.key === k)?.lo }}~{{ defs.find((d) => d.key === k)?.hi }}）
          </span>
        </template>
        <span v-else>全部参数在正常区间</span>
        <span class="ml-auto text-slate-500">阈值来自 model.PROCESS_PARAMS，本页零硬编码</span>
      </div>
    </div>
  </div>
</template>
