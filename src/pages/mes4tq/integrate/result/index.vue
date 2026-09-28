<script setup lang="ts">
/**
 * 对应 TI0002 采集结果查询（系统集成 · 附录 A3 版式 **L5 实时监控盘**）
 *
 * 接口：`collectResultApi.page`（下表报警明细）· `collectResultApi.realtime`（5s 轮询当前值）
 *       `collectResultApi.history`（选中点的历史曲线）· `collectPointApi.list`（点位元数据）
 *
 * 演示要点：**「数采断了怎么办」是客户一定会问的一题**（规格书 B7 把「模拟通讯中断」
 * 列为本模块的模拟触发点）。这一页把三件事摊开：
 * 1. **点位色块墙**——正常绿、越限红、可疑琥珀、中断灰，一眼扫过去就知道哪个红了；
 * 2. **历史曲线**——点一个点看它近 8 小时怎么走的，越限点会看到「冲出去又被拉回来」；
 * 3. **报警明细**——底部只列**越限**的点，客户问「现在有几个异常」时念第一行就行。
 *
 * **固定深色**（`tqDarkClass` + `forceDark`）：现场操作室常年不开灯。
 * 图表 option 里的颜色**全部写死**——只跟根元素判主题会让用户在浅色外壳里
 * 看到深蓝底上贴一块浅灰画布（见 `EChart.vue` 的 `forceDark` 分支说明）。
 *
 * 轮询纪律：**定时器归页面**（`onMounted` 起、`onBeforeUnmount` 清）——
 * AGENTS 点过 KeepAlive 缓存页后台轮询的问题，store 只提供取数动作本体。
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { collectPointApi, collectResultApi } from "@/api/mes4tq";
import type { CollectPoint, CollectResult } from "@/api/mes4tq/types";
import EChart from "../../EChart.vue";
import {
  TQ_BAD,
  TQ_OK,
  TQ_WARN,
  tqChartAxis,
  tqDarkClass,
  tqHeaderTextClass,
  tqMetricClass,
  tqPanelClass,
} from "../../tqTheme";

/** 轮询节拍（ms）。与本域其他实时页一致取 5s——再快人眼也读不完一屏，再慢演示就没劲 */
const TICK = 5000;

const loading = ref(true);
const rows = ref<CollectResult[]>([]);
const points = ref<CollectPoint[]>([]);
const selectedId = ref<string>("");
const clock = ref("");
/** 本次轮询是否出了岔子（中断演示的落点：值冻住、状态变中断） */
const failed = ref(false);
const lastOkAt = ref("");

const byId = computed(() => Object.fromEntries(points.value.map((p) => [p.id, p])));

/** 四色统计：正常 / 越限 / 可疑 / 中断——与 `TAG_CLASS` 的三态词 + 本页的中断灰同源 */
const stats = computed(() => {
  const s = { ok: 0, over: 0, suspect: 0, down: 0 };
  for (const r of rows.value) {
    if (r.quality === "Bad") s.down += 1;
    else if (r.overLimit) s.over += 1;
    else if (r.quality === "Uncertain") s.suspect += 1;
    else s.ok += 1;
  }
  return s;
});

/** 报警明细：只列越限与中断的点，排在最前（客户问「有几个异常」时看它） */
const alarms = computed(() =>
  rows.value
    .filter((r) => r.overLimit || r.quality === "Bad")
    .toSorted((a, b) => Number(b.overLimit) - Number(a.overLimit))
    .map((r) => ({
      ...r,
      lo: byId.value[r.pointId]?.lowerLimit ?? 0,
      hi: byId.value[r.pointId]?.upperLimit ?? 0,
      unitName: byId.value[r.pointId]?.unit ?? "",
      range: `${byId.value[r.pointId]?.lowerLimit ?? 0}~${byId.value[r.pointId]?.upperLimit ?? 0}`,
    })),
);

/** 色块状态：越限红 > 中断灰 > 可疑琥珀 > 正常绿 */
function stateOf(r: CollectResult): "ok" | "over" | "suspect" | "down" {
  if (r.quality === "Bad") return "down";
  if (r.overLimit) return "over";
  if (r.quality === "Uncertain") return "suspect";
  return "ok";
}

const TILE_COLOR: Record<string, string> = {
  ok: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  over: "border-red-500/50 bg-red-500/15 text-red-400",
  suspect: "border-amber-500/45 bg-amber-500/12 text-amber-400",
  down: "border-white/20 bg-white/5 text-[#64748B]",
};

async function load() {
  try {
    const [list, meta] = await Promise.all([
      collectResultApi.realtime(),
      points.value.length ? Promise.resolve(points.value) : collectPointApi.list(),
    ]);
    rows.value = list;
    points.value = meta;
    if (!selectedId.value && list.length) selectedId.value = list[0].pointId;
    failed.value = false;
    lastOkAt.value = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    clock.value = list[0]?.timestamp ?? "";
  } catch {
    /* 拦截层已 toast；`failed` 置位让表头显示「中断」而不是静默停摆 */
    failed.value = true;
  } finally {
    loading.value = false;
  }
}

/* ── 历史曲线 ──────────────────────────────────────────── */

const history = ref<{ times: string[]; data: number[] }>({ times: [], data: [] });

async function loadHistory() {
  if (!selectedId.value) return;
  try {
    history.value = await collectResultApi.history(selectedId.value, 8);
  } catch {
    /* 拦截层已 toast；空图比整页报错强 */
  }
}

const selectedPoint = computed(() => byId.value[selectedId.value]);

/** 曲线 option：**颜色全部写死**，不跟外壳主题（固定深色页，见文件头） */
const chartOption = computed(() => {
  const p = selectedPoint.value;
  return {
    backgroundColor: "transparent",
    grid: { left: 56, right: 16, top: 24, bottom: 28 },
    tooltip: { trigger: "axis" as const },
    xAxis: {
      type: "category" as const,
      data: history.value.times,
      boundaryGap: false,
      ...tqChartAxis(true),
    },
    yAxis: {
      type: "value" as const,
      ...tqChartAxis(true),
    },
    series: [
      {
        name: p?.pointName ?? "测点",
        type: "line" as const,
        smooth: true,
        symbol: "circle" as const,
        symbolSize: 4,
        data: history.value.data,
        lineStyle: { width: 2, color: "#38BDF8" },
        itemStyle: { color: "#38BDF8" },
        areaStyle: { color: "rgba(56,189,248,0.16)" },
        /* 上下限两条参考线：不画它们，曲线「越没越线」要靠客户自己对数字 */
        markLine: p
          ? {
              silent: true,
              symbol: "none",
              lineStyle: { color: TQ_BAD, type: "dashed" as const, width: 1 },
              label: { color: TQ_BAD, fontSize: 10, formatter: (d: any) => `${d.value}` },
              data: [{ yAxis: p.lowerLimit }, { yAxis: p.upperLimit }],
            }
          : undefined,
      },
    ],
  };
});

function select(pointId: string) {
  selectedId.value = pointId;
  void loadHistory();
}

/* ── 轮询 ──────────────────────────────────────────────── */
let timer: ReturnType<typeof setInterval> | null = null;

function startTick() {
  if (timer) return;
  timer = setInterval(() => void load(), TICK);
}

onMounted(() => {
  void load().then(() => {
    void loadHistory();
    startTick();
  });
});

/* **必须清**：AGENTS 点过 KeepAlive 缓存页在后台仍轮询的问题，
   只清定时器不清在途请求也是白清——本页用的是单发 GET，卸载时即停发新请求即可 */
onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" :class="tqDarkClass">
    <!-- 表头：标题 + 数据截止 + 轮询状态 -->
    <div class="flex h-11 shrink-0 items-center gap-4 border-b border-white/10 px-4">
      <span :class="tqHeaderTextClass">采集结果查询 · 实时监控盘</span>
      <span class="text-xs text-slate-500">数据截止 {{ clock || "—" }}</span>
      <span class="text-xs" :class="failed ? 'text-red-400' : 'text-emerald-400'">
        {{ failed ? "通讯中断 · 值已冻结" : `每 ${TICK / 1000}s 轮询 · 上次成功 ${lastOkAt || "—"}` }}
      </span>
      <span class="ml-auto text-xs text-slate-500">越限点{{ stats.over }} · 中断{{ stats.down }}</span>
      <button
        type="button"
        class="cursor-pointer rounded border border-white/15 px-2 py-0.5 text-xs text-slate-300 hover:bg-white/10"
        @click="load"
      >
        立即刷新
      </button>
    </div>

    <!-- 四色统计条 -->
    <div class="grid shrink-0 grid-cols-4 gap-px border-b border-white/10 bg-white/5">
      <div class="bg-[#111A2C] px-4 py-2">
        <div class="text-base font-semibold tabular-nums text-emerald-400">{{ stats.ok }}</div>
        <div class="text-xs text-slate-500">正常</div>
      </div>
      <div class="bg-[#111A2C] px-4 py-2">
        <div class="text-base font-semibold tabular-nums text-red-400">{{ stats.over }}</div>
        <div class="text-xs text-slate-500">越限</div>
      </div>
      <div class="bg-[#111A2C] px-4 py-2">
        <div class="text-base font-semibold tabular-nums text-amber-400">{{ stats.suspect }}</div>
        <div class="text-xs text-slate-500">可疑</div>
      </div>
      <div class="bg-[#111A2C] px-4 py-2">
        <div class="text-base font-semibold tabular-nums text-slate-500">{{ stats.down }}</div>
        <div class="text-xs text-slate-500">通讯中断</div>
      </div>
    </div>

    <!-- 主区：左点位色块墙 + 右历史曲线 -->
    <div class="flex min-h-0 flex-1">
      <!-- 点位色块墙 -->
      <div class="flex min-w-0 flex-1 flex-col border-r border-white/10">
        <div class="flex h-8 shrink-0 items-center px-4 text-xs text-slate-500">
          点位实时值（点选看历史曲线）
          <span class="ml-auto">{{ rows.length }} 个点</span>
        </div>
        <div class="min-h-0 flex-1 overflow-auto px-3 pb-3">
          <div class="grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-6">
            <button
              v-for="r in rows"
              :key="r.pointId"
              type="button"
              class="rounded border px-2 py-2 text-left transition-colors"
              :class="[TILE_COLOR[stateOf(r)], selectedId === r.pointId ? 'ring-1 ring-[#38BDF8]' : '']"
              @click="select(r.pointId)"
            >
              <div class="truncate text-xs opacity-80">{{ byId[r.pointId]?.pointName ?? r.pointId }}</div>
              <div class="text-base font-semibold tabular-nums">
                {{ r.value }}
                <span class="text-xs font-normal opacity-70">{{ r.unit || "" }}</span>
              </div>
              <div class="truncate text-xs opacity-70">
                {{
                  stateOf(r) === "over"
                    ? `越限 ${r.range ?? ""}`
                    : r.quality === "Bad"
                      ? "中断"
                      : r.quality === "Uncertain"
                        ? "可疑"
                        : `限 ${byId[r.pointId]?.lowerLimit ?? ""}~${byId[r.pointId]?.upperLimit ?? ""}`
                }}
              </div>
            </button>
          </div>
          <div v-if="!rows.length" class="p-6 text-center text-sm text-slate-500">
            {{ loading ? "加载中…" : "没有点位数据" }}
          </div>
        </div>
      </div>

      <!-- 历史曲线 -->
      <div class="flex w-[42%] shrink-0 flex-col">
        <div class="flex h-8 shrink-0 items-center px-4 text-xs text-slate-500">
          {{ selectedPoint?.pointName ?? "历史曲线" }}
          <span class="ml-auto">近 8 小时 · 虚线为上下限</span>
        </div>
        <div class="min-h-0 flex-1 px-2">
          <EChart :option="chartOption" height="100%" force-dark />
        </div>
        <div class="shrink-0 border-t border-white/10 px-4 py-2 text-xs text-slate-500">
          <span class="text-slate-300">{{ selectedPoint?.address }}</span>
          · {{ selectedPoint?.protocol }} · 限值
          <span :class="TQ_BAD">{{ selectedPoint?.lowerLimit ?? 0 }}~{{ selectedPoint?.upperLimit ?? 0 }}</span>
          <span class="ml-2">{{ selectedPoint?.unit || "" }}</span>
        </div>
      </div>
    </div>

    <!-- 报警明细：只列越限与中断 -->
    <div class="shrink-0 border-t border-white/10" :class="tqPanelClass">
      <div class="flex h-8 items-center gap-3 px-4 text-xs" :class="alarms.length ? 'text-red-400' : 'text-slate-500'">
        报警明细
        <span v-if="alarms.length" class="font-semibold tabular-nums">{{ alarms.length }} 条</span>
        <span v-else class="ml-1">全部点位在限内</span>
        <span class="ml-auto text-slate-500">单位、限值与当前值同源，不另算</span>
      </div>
      <div class="max-h-40 overflow-auto">
        <table class="w-full text-xs">
          <thead class="sticky top-0 bg-[#111A2C] text-slate-500">
            <tr class="[&>th]:px-4 [&>th]:py-1.5 [&>th]:text-left [&>th]:font-normal">
              <th>点位号</th>
              <th>点位名称</th>
              <th>当前值</th>
              <th>限值</th>
              <th>单位</th>
              <th>状态</th>
              <th>采集时刻</th>
            </tr>
          </thead>
          <tbody class="[&>td]:px-4 [&>td]:py-1.5">
            <tr v-for="a in alarms" :key="a.id" class="border-t border-white/5">
              <td class="tabular-nums">{{ a.pointId }}</td>
              <td>{{ a.pointName }}</td>
              <td class="tabular-nums" :class="a.overLimit ? 'text-red-400' : ''">{{ a.value }}</td>
              <td class="tabular-nums">{{ a.range }}</td>
              <td>{{ a.unitName }}</td>
              <td :class="a.quality === 'Bad' ? 'text-slate-500' : 'text-red-400'">
                {{ a.quality === "Bad" ? "中断" : "越限" }}
              </td>
              <td class="tabular-nums text-slate-500">{{ a.timestamp }}</td>
            </tr>
            <tr v-if="!alarms.length">
              <td colspan="7" class="py-4 text-center text-slate-500">暂无越限点位</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
