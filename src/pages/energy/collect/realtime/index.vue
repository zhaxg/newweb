<script setup lang="ts">
/** 对应 EC0005 实时与历史数据（模块一 · 附录 B5 版式 V4 图 + 明细）
 *  接口：unitApi/tree + meterPointApi.list（选点）· pointApi.tick/realtime/history（POST /ems/point/*）
 *  演示要点：**「表上的数和曲线上的数是不是一个数」在这一页被当场验证**。
 *        左侧勾选的是计量网络上的点（与 EC0001 同一批点、同一棵树），
 *        当前值 = 该点摊到的日量 × 当小时负荷系数（累计量再乘今日已过比例），
 *        历史曲线 = `model.daySplit` 摊出来的逐日量——**和 EP0002 那条日行同一个算法**，
 *        所以客户把曲线最后一格和实绩表并排打开，两个数必须一样。
 *        通道断了的点显示**空白而不是 0**：把最后一次读数冒充当前值是实时页最丢人的假数据，
 *        而补一个 0 会让曲线在断点那天凹下去、日均跟着被拉低（mock 里 `missing` 的点回 `null`）。
 *        曲线末点与人工校正同步：`daySplit(month, lastOverride)` 的末位直接取账上的日行值，
 *        所以 EC0003 校核通过、这里那一格立刻变成校正值。
 *        实时刷新是**页内 3s 定时器**（`onBeforeUnmount` 必清）——AGENTS 点过 KeepAlive 缓存页
 *        后台轮询的问题，定时器归页面、只有推进演示时钟这件事在 store（`/ems/point/tick`）。
 *  待接入：秒级采样与降采样（演示按分钟推进，接真后端时 history 端点换成按时/按天两档，页面零改动）。 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Tree from "primevue/tree";
import Button from "primevue/button";
import ToggleSwitch from "primevue/toggleswitch";
import Select from "primevue/select";
import EChart from "../../EChart.vue";
import { meterPointApi, pointApi, unitApi } from "@/api/energy";
import type { MeterPoint, PointHistoryResult, PointReading, UsingUnit } from "@/api/energy/types";
import { tagClass } from "../../cells";
import { EMS_TEXT, EMS_TEXT_MUTE, emsChartAxis } from "../../emsTheme";
import { useNameMaps } from "../../nameMaps";
import type { EChartsOption } from "echarts";

type Node = { key: string; label: string; children?: Node[]; data?: { point?: MeterPoint; unit?: UsingUnit } };

const { mediumName, unitName } = useNameMaps();

const nodes = ref<Node[]>([]);
const expandedKeys = ref<Record<string, boolean>>({});
const checkedKeys = ref<Record<string, boolean>>({});
const pointIndex = ref<Record<string, MeterPoint>>({});
const parentOf = ref<Record<string, string>>({});
const live = ref<PointReading[]>([]);
const hist = ref<PointHistoryResult | null>(null);
/**
 * 历史区间三档。下拉里选的是**中文档名**，送进 `/ems/point/history` 的是天数——
 * 把 `26` 直接摆在页面上让客户猜单位是常见失分点。
 * 选「本月」时**不传 days**：月账已经过了几天是 mock 的 `MONTH_ELAPSED_DAYS` 说了算，
 * 页面写死一个 26，月底演示就会多算出几天没发生的曲线。
 */
const DAY_RANGES: Record<string, number> = { "近 7 日": 7, "近 14 日": 14 };
const DAY_LABELS = ["本月", "近 7 日", "近 14 日"];
const dayRangeLabel = ref("本月");
const days = computed(() => (dayRangeLabel.value === "本月" ? undefined : DAY_RANGES[dayRangeLabel.value]));
const polling = ref(true);
const busy = ref(false);

/** 曲线最多画 8 条：再多就不是"看几条趋势"而是涂一坨，页面按勾选顺序取前 8 个点 */
const SERIES_CAP = 8;

/**
 * 勾选里只有**点**是数据源：单元节点是分组用的（勾单元 = 勾它下面所有点，
 * PrimeVue 的 checkbox 传播默认就做了这件事），所以取数时只认在点索引里的 key。
 */
const pickedPoints = computed(() =>
  Object.keys(checkedKeys.value)
    .filter((k) => checkedKeys.value[k] && pointIndex.value[k])
    .map((k) => pointIndex.value[k]),
);

const chartPoints = computed(() => pickedPoints.value.slice(0, SERIES_CAP));

function subtreeKeys(list: Node[], out: string[] = []): string[] {
  for (const n of list) {
    if (n.data?.point) out.push(n.key);
    if (n.children) subtreeKeys(n.children, out);
  }
  return out;
}

async function loadTree() {
  try {
    const [units, points] = await Promise.all([unitApi.tree(), meterPointApi.list()]);
    const idx: Record<string, MeterPoint> = {};
    for (const p of points ?? []) idx[p.id] = p;
    pointIndex.value = idx;

    const byParent = new Map<string | null, UsingUnit[]>();
    for (const u of units ?? []) {
      const pid = u.parentId ?? null;
      (byParent.get(pid) ?? byParent.set(pid, []).get(pid)!).push(u);
    }
    /** 子 → 父的一张反查表：建树时顺手记，之后「把勾选的点展开给客户看见」靠它 */
    const parents: Record<string, string> = {};
    const pointsOf = (uid: string): Node[] =>
      (points ?? [])
        .filter((p) => p.unitId === uid)
        .map((p) => {
          parents[p.id] = uid;
          return { key: p.id, label: `${p.name}（${p.id}）`, data: { point: p } };
        });
    const build = (pid: string | null): Node[] =>
      (byParent.get(pid) ?? []).map((u) => {
        if (pid) parents[u.id] = pid;
        return {
          key: u.id,
          label: u.name,
          data: { unit: u },
          children: [...build(u.id), ...pointsOf(u.id)],
        };
      });
    nodes.value = build(null);
    parentOf.value = parents;
    /* 默认只展开前两级：整棵树全展开得滚三屏才能找到点，而三级单元（各厂）是客户第一眼要看的东西 */
    const open: Record<string, boolean> = {};
    for (const u of units ?? []) if (!u.parentId || u.level <= 2) open[u.id] = true;
    expandedKeys.value = open;
  } catch {
    return; // 拦截层已 toast；树留着上一次的样子，比清成一片空白有用
  }
}

/**
 * 默认选中「发电厂」子树：能源中心的关口表最密，进页面第一眼就有几条曲线。
 * 认的是**树上的节点名**（`unitApi.tree` 每行自带 `name`），不是 nameMaps 翻译后的名字——
 * 后者要等 `GET /ems/unit/list` 到货，用还没到的名字去挑默认勾选，结果就是
 * 「刷新一下才有曲线、不刷新就一片白」这种查不出原因的演示事故。
 */
function pickDefault() {
  const stack: Node[] = [...nodes.value];
  let power: Node | undefined;
  while (stack.length && !power) {
    const n = stack.shift()!;
    if (n.data?.unit?.name.includes("发电")) power = n;
    else if (n.children) stack.push(...n.children);
  }
  const keys = (power ? subtreeKeys([power]) : Object.keys(pointIndex.value)).slice(0, SERIES_CAP);
  checkedKeys.value = Object.fromEntries(keys.map((k) => [k, true]));
  /* 勾选的点多半挂在折叠着的三级单元下面——不把它们的上游一路展开，
     客户看到的就是"下面那行说有 8 个已选、树上却一个勾都没有" */
  const acc = { ...expandedKeys.value };
  for (const k of keys) {
    let up: string | undefined = parentOf.value[k];
    /** `parentOf` 只有单元之间和点→单元的回边，链必然在根节点终止，不会成环 */
    while (up) {
      acc[up] = true;
      up = parentOf.value[up];
    }
  }
  expandedKeys.value = acc;
}

async function refreshLive() {
  try {
    const ids = chartPoints.value.map((p) => p.id);
    live.value = await pointApi.realtime(ids);
  } catch {
    /* 保留上一批读数：实时页最怕的是"刷新失败 = 一片空白" */
  }
}

async function refreshHistory() {
  const ids = chartPoints.value.map((p) => p.id);
  if (!ids.length) {
    hist.value = null;
    return;
  }
  try {
    hist.value = await pointApi.history(ids, days.value);
  } catch {
    hist.value = null;
  }
}

/* ── 实时定时器：**推进时钟**与**取读数**是两件事，所以两次请求 ─────────────
   `/ems/point/tick` 会让柜位、负荷、待补传都走一拍（它是有副作用的那个），
   `/ems/point/realtime` 只读。合并成一个端点的话，任何"只想看一眼"的调用
   都在偷偷推进全站时钟，EP0002 的"当日"会在客户眼皮底下变成第二天。 */
let timer: number | null = null;
async function tickOnce() {
  if (busy.value) return;
  busy.value = true;
  try {
    await pointApi.tick();
    await refreshLive();
  } finally {
    busy.value = false;
  }
}
function resetTimer() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  if (polling.value) timer = window.setInterval(() => void tickOnce(), 3000);
}
watch(polling, resetTimer);

/* 勾选变了就重取数：曲线和读数都只跟**当前勾选的点**走，不需要推进时钟。
   这是本页第一次出数的入口（`onMounted` 选完默认点也走它），所以挂载处不再手动刷一遍。 */
watch(chartPoints, () => {
  void refreshLive();
  void refreshHistory();
});
watch(days, () => void refreshHistory());

onMounted(() => {
  /* 只建树、选默认点：取数交给 `watch(chartPoints)`。
     在这儿再手动刷一次，就是同一次进页面对后端发两遍完全一样的请求 */
  void loadTree().then(() => {
    pickDefault();
    resetTimer();
  });
  readTheme();
  mo = new MutationObserver(readTheme);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
});
onBeforeUnmount(() => {
  /* 两个都得清：定时器漏清就是缓存页在后台替全站推进演示时钟（AGENTS 点过的 KeepAlive 问题），
     observer 漏清就是每进一次这页多挂一个，永不回收 */
  if (timer !== null) clearInterval(timer);
  mo?.disconnect();
});

function allOpen(open: boolean) {
  if (!open) {
    expandedKeys.value = {};
    return;
  }
  const acc: Record<string, boolean> = {};
  const walk = (list: Node[]) => {
    for (const n of list) {
      if (n.children?.length) {
        acc[n.key] = true;
        walk(n.children);
      }
    }
  };
  walk(nodes.value);
  expandedKeys.value = acc;
}

/* ── 曲线 option：多条逐日线，x 轴是**日期**（与 EP0002 的日行同一批日） ───── */
const dark = ref(false);
const option = computed<EChartsOption>(() => {
  const h = hist.value;
  if (!h?.series.length) {
    return { xAxis: { type: "category", data: [] }, yAxis: { type: "value" }, series: [] };
  }
  return {
    backgroundColor: "transparent",
    animation: false,
    grid: { left: 60, right: 18, top: 42, bottom: 34 },
    legend: {
      type: "scroll",
      top: 6,
      textStyle: { color: dark.value ? EMS_TEXT : "#475569", fontSize: 12 },
    },
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: h.dates.map((d) => d.slice(5)), ...emsChartAxis(dark.value) },
    yAxis: {
      type: "value",
      name: h.series[0]?.unit ?? "",
      nameTextStyle: { color: dark.value ? EMS_TEXT_MUTE : "#94A3B8", fontSize: 12 },
      ...emsChartAxis(dark.value),
    },
    series: h.series.map((s) => ({
      name: s.name,
      type: "line",
      smooth: false,
      showSymbol: false,
      /** `connectNulls` 不给：断点那天就是要**断开**，连起来等于把缺失画成有 */
      data: s.values,
    })),
  };
});

/** 主题翻转要重算轴色（`emsChartAxis` 不读 DOM，见 emsTheme 的文件头）。接线在下面的 onMounted */
function readTheme() {
  dark.value = document.documentElement.classList.contains("dark");
}
let mo: MutationObserver | null = null;

/**
 * 读数不是 AG Grid 列，没有 `valueFormatter` 可挂，这里自己格式化一位小数。
 * `null`（断点）回**空**而不是 0：实时页最丢人的假数据就是把「没数」画成「零」。
 */
const fmt = (v: number | null) =>
  v === null || v === undefined ? "—" : v.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左：计量点选择器（点=叶子，勾单元即勾它下面所有点） -->
    <aside class="flex w-80 shrink-0 flex-col border-r border-border/60">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs text-muted-foreground">计量点</span>
        <Button variant="text" class="ml-auto shrink-0 whitespace-nowrap" @click="allOpen(true)">展开</Button>
        <Button variant="text" class="shrink-0 whitespace-nowrap" @click="allOpen(false)">收起</Button>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <Tree
          v-model:expanded-keys="expandedKeys"
          v-model:checked-keys="checkedKeys"
          selection-mode="multiple"
          :value="nodes"
        />
        <div v-if="!nodes.length" class="px-3 py-6 text-xs text-muted-foreground">
          还没有计量点，先去 EC0001 配网络。
        </div>
      </div>
      <div class="shrink-0 border-t border-border/60 px-2 py-1.5 text-xs text-muted-foreground">
        已选 {{ pickedPoints.length }} 点 · 曲线画前 {{ SERIES_CAP }} 条
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
      <!-- 工具条：刷新开关 + 天数。实时页没有"查询"，只有"看哪几天" -->
      <div class="flex shrink-0 flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-xs text-muted-foreground">
          <ToggleSwitch v-model="polling" />
          实时刷新（3s）
        </label>
        <label class="flex items-center gap-2 text-xs text-muted-foreground">
          历史区间
          <Select v-model="dayRangeLabel" :options="DAY_LABELS" class="w-36" />
        </label>
        <Button variant="outlined" :loading="busy" @click="tickOnce">推进一拍</Button>
        <span class="ml-auto text-xs text-muted-foreground">当前 {{ live.length ? live[0].at : "—" }}</span>
      </div>

      <!-- 实时读数 -->
      <section class="shrink-0 rounded-md border border-border/60">
        <div class="border-b border-border/60 px-3 py-1.5 text-sm font-medium">实时读数</div>
        <div class="max-h-64 overflow-auto">
          <table class="w-full text-body">
            <thead class="sticky top-0 bg-background text-xs text-muted-foreground">
              <tr>
                <th class="px-3 py-1.5 text-left font-medium">计量点</th>
                <th class="px-3 py-1.5 text-left font-medium">介质</th>
                <th class="px-3 py-1.5 text-left font-medium">所属单元</th>
                <th class="px-3 py-1.5 text-right font-medium">当前值</th>
                <th class="px-3 py-1.5 text-left font-medium">通道</th>
                <th class="px-3 py-1.5 text-right font-medium">待补传</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in live" :key="r.pointId" class="border-t border-border/40">
                <td class="px-3 py-1.5">{{ r.name }}</td>
                <td class="px-3 py-1.5">{{ mediumName(r.mediaCode) }}</td>
                <td class="px-3 py-1.5">{{ unitName(r.unitId) }}</td>
                <!-- 断点显示空白而不是 0：冒充当前值是实时页最丢人的假数据 -->
                <td class="px-3 py-1.5 text-right tabular-nums">
                  <!-- 状态量没有"量"：表盘上那个 1/0 是客户要翻译的东西，翻译在展示层做掉 -->
                  <template v-if="r.dataKind === '状态量'">{{ r.on ? "运行" : "停止" }}</template>
                  <template v-else>
                    {{ r.value === null ? "—" : fmt(r.value) }}
                    <span class="text-xs text-muted-foreground">{{ r.unit }}</span>
                  </template>
                </td>
                <td class="px-3 py-1.5">
                  <span :class="tagClass(r.channelStatus)">{{ r.channelStatus }}</span>
                </td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ r.pendingUpload || "—" }}</td>
              </tr>
              <tr v-if="!live.length">
                <td colspan="6" class="px-3 py-6 text-center text-xs text-muted-foreground">
                  左侧勾选计量点后这里就有数。
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 历史曲线 -->
      <section class="flex min-h-72 flex-1 flex-col rounded-md border border-border/60">
        <div class="shrink-0 border-b border-border/60 px-3 py-1.5 text-sm font-medium">逐日历史曲线</div>
        <EChart v-if="hist?.series.length" :option="option" class="min-h-0 flex-1" />
        <div v-else class="flex flex-1 items-center justify-center px-3 py-8 text-xs text-muted-foreground">
          勾选计量点后画出它的逐日线；曲线的最后一天与 EP0002 的日实绩同一次分摊，必然相等。
        </div>
      </section>

      <!-- 历史统计 -->
      <section v-if="hist?.series.length" class="shrink-0 rounded-md border border-border/60">
        <div class="border-b border-border/60 px-3 py-1.5 text-sm font-medium">区间统计</div>
        <div class="overflow-auto">
          <table class="w-full text-body">
            <thead class="bg-background text-xs text-muted-foreground">
              <tr>
                <th class="px-3 py-1.5 text-left font-medium">计量点</th>
                <th class="px-3 py-1.5 text-right font-medium">平均</th>
                <th class="px-3 py-1.5 text-right font-medium">最大</th>
                <th class="px-3 py-1.5 text-right font-medium">最小</th>
                <th class="px-3 py-1.5 text-right font-medium">标准差</th>
                <th class="px-3 py-1.5 text-left font-medium">单位</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in hist.series" :key="s.pointId" class="border-t border-border/40">
                <td class="px-3 py-1.5">{{ s.name }}</td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ fmt(s.stats.avg) }}</td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ fmt(s.stats.max) }}</td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ fmt(s.stats.min) }}</td>
                <td class="px-3 py-1.5 text-right tabular-nums">{{ fmt(s.stats.std) }}</td>
                <td class="px-3 py-1.5 text-muted-foreground">{{ s.unit }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
