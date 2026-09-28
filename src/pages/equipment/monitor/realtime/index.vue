<script setup lang="ts">
/** 对应 AM0002 实时监控（模块三 状态监测 · 附录 B4 第 3 幕 · 自定版式：卡片墙 + 曲线）
 *  接口：realtimeApi.view（GET /eam/monitor/realtime）· tick（POST /monitor/tick，推进一拍并回新视图）
 *        · script（/monitor/script，剧本爬升）· runHours（/monitor/runHours）
 *  演示要点：**这一页的"动"是整场演示的开场**——选中设备后曲线自己往前长（定时器每拍调一次
 *        `/monitor/tick`，mock 按 `SIM_PARAM` 抖动写值），超过预警线变橙、超过报警线变红，
 *        同时右侧活动报警立刻多一条。客户在这里看到的不是"截图里的监测"，是"正在跑的监测"。
 *        「▶ 剧本：F4 轴承温度爬升」是主线第 3 幕：20s 内把 61.2℃ 线性推到 88.4℃，
 *        逐拍越 70（预警）/ 80（报警）两道线——**可重复**，销售讲到这句点一下就行，
 *        随机数据会把这一幕变成抽奖（曲线形状在 mock 的 `data/sim.ts`，页面只管按拍调用）。
 *  已知偏差：真实系统这里还有频谱/瀑布图（振动诊断），mock 只给时域滚动窗，不做假频谱。
 *  待接入：无。 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { EChartsOption } from "echarts";
import Button from "primevue/button";
import Select from "primevue/select";
import InputNumber from "primevue/inputnumber";
import { IconPlayerPause, IconPlayerPlay, IconFlame } from "@tabler/icons-vue";
import { useToast } from "@/composables/useToast";
import { realtimeApi } from "@/api/equipment";
import type { RealtimeView } from "@/api/equipment/types";
import EChart from "../../EChart.vue";
import { useNameMaps } from "../../nameMaps";
import { applyResult } from "../../rowActions";

type Series = RealtimeView["series"][number];

/** 喂数节拍：与 mock 的 `SIM_STEP_MS` 同值（20s 走完剧本）；页面侧只关心"多久问一次" */
const STEP_MS = 500;
/** 剧本固定的那台设备（主线第 3 幕；曲线形状与设备绑定，见 mock 的 `SIM_SCRIPT_F4`） */
const SCRIPT_EQ = "EQ-BR-F4-03";

const { toast } = useToast();
const { eqMap, ready } = useNameMaps();

const eqId = ref(SCRIPT_EQ);
const view = ref<RealtimeView | null>(null);
const running = ref(false);
const scriptRunning = ref(false);
const busy = ref(false);
const hours = ref(240);
let timer: ReturnType<typeof setInterval> | null = null;

const eqOptions = computed(() => Object.entries(eqMap.value).map(([id, name]) => ({ id, name })));

async function load() {
  try {
    view.value = await realtimeApi.view(eqId.value);
  } catch {
    /* 拦截层已 toast；保留上一帧，曲线不至于空白 */
  }
}

/** 一拍：剧本模式走 script（线性爬升），否则走 tick（围绕基线抖动） */
async function beat() {
  if (busy.value) return;
  busy.value = true;
  try {
    if (scriptRunning.value && eqId.value === SCRIPT_EQ) {
      const res = await realtimeApi.script(eqId.value);
      view.value = await realtimeApi.view(eqId.value);
      if (res?.done) {
        scriptRunning.value = false;
        toast("剧本走完：温度已越报警线，报警级报警生成，可去报警中心转工单", 3600, "success", "演示");
      }
    } else {
      view.value = await realtimeApi.tick(eqId.value);
    }
  } catch {
    /* 拦截层已 toast；下一拍继续 */
  }
  busy.value = false;
}

function start() {
  stop();
  running.value = true;
  timer = setInterval(beat, STEP_MS);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  running.value = false;
}

function toggle() {
  if (running.value) stop();
  else start();
}

function runScript() {
  eqId.value = SCRIPT_EQ;
  scriptRunning.value = true;
  if (!running.value) start();
  else void beat();
}

async function pushHours() {
  try {
    const res = await realtimeApi.runHours(eqId.value, hours.value);
    applyResult(res, "运行小时已推进", toast);
    await load();
  } catch {
    /* 拦截层已 toast */
  }
}

watch(eqId, () => {
  scriptRunning.value = false;
  void load();
});

watch(ready, (on) => {
  if (on) void load();
});

/** 离开页面就停表：KeepAlive 多页签下后台继续 500ms 一问会白耗，而且回来的那一帧早就过期了 */
onBeforeUnmount(stop);

/**
 * 进页面即自动开始刷新（不用先点「实时刷新」）。
 *
 * 这一页存在的意义就是「曲线在动」：让客户先点一下按钮才动，演示开场就冷了一截。
 * 停表只有两个出口——卸载（下面 onBeforeUnmount）和工具栏那个暂停按钮。
 */
onMounted(() => {
  void load();
  start();
});

const LEVEL_COLOR = { 预警: "#f59e0b", 报警: "#ef4444", 停机: "#dc2626" } as const;

/** 最新一帧的越阈程度：决定测点卡片的颜色（预警橙 / 报警红 / 正常绿） */
function levelOf(s: Series) {
  const last = s.data.at(-1) ?? 0;
  if (s.alarm && last >= s.alarm) return "报警";
  if (s.warn && last >= s.warn) return "预警";
  return "正常";
}

/**
 * 曲线一次只画**一个测点**（点卡片切换）。
 *
 * 为什么不叠多条：这台设备的测点量纲差三个数量级（电流 312A / 振动 5.9mm/s），
 * 共轴会把小量程那条压成贴底直线，客户看不出它在动；对数轴能画但读图门槛高，
 * 演示现场没人愿意在图上做心算。单测点还能把预警/报警两条阈值线如实画出来——
 * 「越线」这件事是这一页要讲的，值得占满整张图。
 */
const picked = ref("");

watch(
  view,
  (v) => {
    if (!v) return;
    // 默认停在剧本那条温度测点上：进来就看到「有阈值线、会越线」的那支，而不是随机一支
    if (!v.series.some((s) => s.pointId === picked.value)) {
      picked.value = v.series.find((s) => s.name.startsWith("温度"))?.pointId ?? v.series[0]?.pointId ?? "";
    }
  },
  { immediate: true },
);

const current = computed<Series | undefined>(() => view.value?.series.find((s) => s.pointId === picked.value));

const option = computed<EChartsOption>(() => {
  const v = view.value;
  const s = current.value;
  if (!v || !s) return { xAxis: { type: "category" }, yAxis: { type: "value" }, series: [] };
  const level = levelOf(s);
  return {
    grid: { left: 52, right: 18, top: 30, bottom: 26 },
    tooltip: { trigger: "axis" },
    title: { text: `${s.name} · ${s.unit}`, left: 4, top: 0, textStyle: { fontSize: 12, fontWeight: "normal" } },
    xAxis: { type: "category", data: v.times, boundaryGap: false, axisLabel: { fontSize: 10 } },
    yAxis: { type: "value", scale: true, splitLine: { lineStyle: { type: "dashed" } } },
    series: [
      {
        name: s.name,
        type: "line",
        data: s.data,
        showSymbol: false,
        smooth: true,
        // 越阈那一刻曲线自己变红，比只在卡片上标色更早被看到
        lineStyle: { width: 2, color: level === "正常" ? undefined : LEVEL_COLOR[level] },
        areaStyle: { opacity: 0.08 },
        markLine: {
          silent: true,
          symbol: "none",
          data: [
            { yAxis: s.warn, lineStyle: { color: LEVEL_COLOR.预警 }, label: { formatter: `预警 ${s.warn}` } },
            { yAxis: s.alarm, lineStyle: { color: LEVEL_COLOR.报警 }, label: { formatter: `报警 ${s.alarm}` } },
          ],
        },
      },
    ],
  };
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏 h-9：设备 + 播放控制 + 剧本按钮，统计靠右 -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Select
        v-model="eqId"
        :options="eqOptions"
        option-label="name"
        option-value="id"
        filter
        placeholder="选择设备"
        class="w-72 shrink-0"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="toggle">
        <IconPlayerPause v-if="running" class="h-3 w-3" />
        <IconPlayerPlay v-else class="h-3 w-3" />
        {{ running ? "暂停" : "实时刷新" }}
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="scriptRunning" @click="runScript">
        <IconFlame class="h-3 w-3" />剧本：F4 轴承温度爬升
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">
        {{ view ? `${view.eqName} · ${view.series.length} 个测点 · 滚动窗 ${view.times.length} 拍` : "加载中…" }}
      </span>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 xl:flex-row">
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <!-- 测点卡片墙：这一帧的值 + 阈值，越阈整块变色；点一张就把下面那张图切到这支 -->
        <div class="grid shrink-0 grid-cols-2 gap-3 xl:grid-cols-4">
          <button
            v-for="s in view?.series ?? []"
            :key="s.pointId"
            type="button"
            class="min-w-0 rounded-md border px-3 py-2 text-left"
            :class="[
              levelOf(s) === '报警'
                ? 'border-red-500/60 bg-red-500/10'
                : levelOf(s) === '预警'
                  ? 'border-amber-500/60 bg-amber-500/10'
                  : 'border-border/60',
              picked === s.pointId ? 'ring-1 ring-primary' : '',
            ]"
            @click="picked = s.pointId"
          >
            <div class="truncate text-xs text-muted-foreground">{{ s.name }}</div>
            <div class="flex min-w-0 items-baseline gap-1">
              <span class="text-base font-semibold tabular-nums">{{ (s.data.at(-1) ?? 0).toFixed(1) }}</span>
              <span class="text-xs text-muted-foreground">{{ s.unit }}</span>
            </div>
            <div class="truncate text-xs text-muted-foreground">预警 {{ s.warn }} · 报警 {{ s.alarm }}</div>
          </button>
        </div>

        <div class="min-h-[20rem] flex-1 rounded-md border border-border/60 px-1">
          <EChart v-if="view" :option="option" height="100%" />
          <div v-else class="flex h-full items-center justify-center text-body text-muted-foreground">
            选择设备后开始实时采样
          </div>
        </div>

        <div class="shrink-0 text-xs text-muted-foreground">
          点上面任一测点卡片切换曲线；预警 / 报警两道阈值线就画在图上，越线时曲线本身变红。
        </div>
      </div>

      <!-- 右：活动报警 + 运行小时推进（寿命/PM 计数器联动的入口） -->
      <aside class="flex w-full shrink-0 flex-col gap-3 xl:w-80">
        <div class="min-h-0 flex-1 rounded-md border border-border/60">
          <div class="flex h-9 items-center gap-2 border-b border-border/60 px-3">
            <span class="text-sm font-medium">活动报警</span>
            <span class="ml-auto text-xs text-muted-foreground">{{ view?.activeAlarms.length ?? 0 }} 条</span>
          </div>
          <ul class="max-h-72 space-y-2 overflow-auto p-3">
            <li v-for="a in view?.activeAlarms ?? []" :key="a.id" class="min-w-0 space-y-0.5">
              <div class="flex min-w-0 items-center gap-2">
                <span
                  class="size-2 shrink-0 rounded-full"
                  :style="{ background: LEVEL_COLOR[a.level as keyof typeof LEVEL_COLOR] ?? '#71717a' }"
                />
                <span class="text-xs text-muted-foreground">{{ a.id }}</span>
                <span class="ml-auto text-xs text-muted-foreground">{{ a.occurredAt.slice(11) }}</span>
              </div>
              <div class="text-body">{{ a.msg }}</div>
            </li>
            <li v-if="!view?.activeAlarms.length" class="text-xs text-muted-foreground">
              这台设备当前没有活动报警。点上面「剧本」按钮跑一幕，这里会立刻长出一条。
            </li>
          </ul>
        </div>

        <div class="shrink-0 space-y-2 rounded-md border border-border/60 p-3">
          <div class="text-sm font-medium">推进累计运行小时</div>
          <div class="flex min-w-0 items-center gap-2">
            <div class="min-w-0 flex-1">
              <InputNumber v-model="hours" :show-buttons="false" fluid :min="1" placeholder="运行小时" />
            </div>
            <span class="shrink-0 text-xs text-muted-foreground">h</span>
            <Button label="推进" variant="outlined" class="shrink-0 whitespace-nowrap" @click="pushHours" />
          </div>
          <p class="text-xs text-muted-foreground">
            运行小时是寿命件与 PM 计数器的依据：推进它，临期的寿命件会生成到期提醒、到期的 PM 计划会出工单。
          </p>
        </div>

        <div class="shrink-0 rounded-md border border-border/60 p-3">
          <div class="flex items-baseline gap-2">
            <span class="text-sm font-medium">健康度</span>
            <span class="text-base font-semibold tabular-nums">{{ view?.health ?? "—" }}</span>
            <span class="text-xs text-muted-foreground">/ 100 · 状态 {{ view?.status ?? "—" }}</span>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
