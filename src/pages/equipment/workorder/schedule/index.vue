<script setup lang="ts">
/** 对应 AW0005 计划排程（模块四 维修工单 · 附录 B5 版式「L5 + ECharts custom series」）
 *  接口：workOrderApi.page（POST /eam/workOrder/listPage，取全量在册工单来排）
 *        + orgApi.assignees（人力条）/ equipmentApi.list（设备名翻译，走 ../../nameMaps.ts）
 *  演示要点：**一眼看清「谁在什么时候占着哪台设备」**——纵向是维修工（最下面是还没派出去的单），
 *        横向是时间，每根条是一张工单的「下达 + 计划工时」。这就是排程员早上要的那张图，
 *        也是「人力分配均不均」的直观答案：右侧人力条给每人的单数与工时合计。
 *
 *        条子为什么从 `createdAt` 起画：本域工单实体只有**下达时间**和**计划工时**
 *        （见 `@/api/equipment/types.ts` 的 `WorkOrder`），没有单独的 plannedStart——
 *        排程在真实系统里是排出来的，而演示数据是「下达即开始做」的口径。
 *        宁可让图画得诚实（标题与脚注都写明口径），也不在页面上造一个后端没有的字段。
 *  待接入：拖拽改派 / 改计划开工时间（需要后端有排程字段与冲突校验，mock 未提供）。 */
import { computed, onMounted, ref } from "vue";
import Select from "primevue/select";
import type { EChartsOption } from "echarts";
import { useToast } from "@/composables/useToast";
import { orgApi, workOrderApi } from "@/api/equipment";
import type { WorkOrder } from "@/api/equipment/types";
import EChart from "../../EChart.vue";
import { useNameMaps } from "../../nameMaps";
import { toDay } from "../../dateField";

const RANGES = ["近 7 天", "近 30 天", "全部"];

const { toast } = useToast();
/* tooltip 里的设备名在**悬停那一刻**才查表，所以名称表后到也不用重算图表（不像列表页的 valueFormatter） */
const { eqName } = useNameMaps();
const orders = ref<WorkOrder[]>([]);
const assignees = ref<string[]>([]);
const range = ref("近 7 天");

async function load() {
  try {
    const res = await workOrderApi.page({ currentPage: 1, pageSize: 200 });
    orders.value = res?.rows ?? [];
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(async () => {
  try {
    const [who] = await Promise.all([orgApi.assignees(), load()]);
    assignees.value = who ?? [];
  } catch {
    toast("排程数据没取到，刷新页面重试", 2400, "warn");
  }
});

/** 时间窗口的左端：锚在**最新一张单**上，而不是今天的日期——剧本里生成新单后窗口要跟着走 */
function windowStart(rows: WorkOrder[]): number {
  const days = range.value === "近 7 天" ? 7 : range.value === "近 30 天" ? 30 : 0;
  if (!days) return 0;
  const last = rows.reduce((m, w) => Math.max(m, Date.parse(w.createdAt.replace(" ", "T"))), 0);
  return last - days * 86400_000;
}

type Bar = { row: number; start: number; end: number; wo: WorkOrder };

/** 纵轴分类：有人的在前（按 assignees 顺序），没派出去的单独一行「待派工」压在最下面 */
const plan = computed<{ categories: string[]; bars: Bar[]; rows: WorkOrder[] }>(() => {
  const cats = [...assignees.value];
  const waitIdx = cats.length;
  cats.push("待派工");
  const start = windowStart(orders.value);
  const bars: Bar[] = [];
  for (const w of orders.value) {
    const s = Date.parse(w.createdAt.replace(" ", "T"));
    if (!Number.isFinite(s) || (start && s < start)) continue;
    const row = w.assignee ? cats.indexOf(w.assignee) : waitIdx;
    if (row < 0) continue;
    bars.push({ row, start: s, end: s + Math.max(1, w.planHours) * 3600_000, wo: w });
  }
  return { categories: cats, bars, rows: orders.value };
});

/** 右侧人力条：单数与工时合计——排程员真正要比的是「这个人今天背了几小时」 */
const workload = computed(() => {
  const by = new Map<string, { count: number; hours: number }>();
  for (const b of plan.value.bars) {
    const who = b.wo.assignee || "待派工";
    const cur = by.get(who) ?? { count: 0, hours: 0 };
    cur.count += 1;
    cur.hours += b.wo.planHours;
    by.set(who, cur);
  }
  const list = [...by.entries()].map(([name, v]) => ({ name, ...v }));
  const max = Math.max(1, ...list.map((x) => x.hours));
  return { list: list.toSorted((a, b) => b.hours - a.hours), max };
});

const option = computed<EChartsOption>(() => {
  const { categories, bars } = plan.value;
  return {
    grid: { left: 96, right: 24, top: 28, bottom: 44 },
    tooltip: {
      trigger: "item",
      formatter: (p: any) => {
        const b = bars[p.dataIndex];
        if (!b) return "";
        const day = new Date(b.start);
        return [
          `<b>${b.wo.id}</b> ${b.wo.title}`,
          `${eqName(b.wo.eqId)}`,
          `${b.wo.assignee || "待派工"} · 计划 ${b.wo.planHours} h`,
          `${toDay(day)} ${String(day.getHours()).padStart(2, "0")}:00 起`,
          `状态 ${b.wo.status} / 优先级 ${b.wo.priority}`,
        ].join("<br/>");
      },
    },
    xAxis: {
      type: "time",
      position: "top",
      axisLabel: { hideOverlap: true, formatter: (v: number) => fmtHour(v) },
      splitLine: { show: true, lineStyle: { opacity: 0.25 } },
    },
    yAxis: {
      type: "category",
      data: categories,
      inverse: true,
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        type: "custom",
        renderItem: (_params: any, api: any) => {
          const row = api.value(0);
          const start = api.coord([api.value(1), row]);
          const end = api.coord([api.value(2), row]);
          const h = api.size([0, 1])[1] * 0.55;
          return {
            type: "rect",
            shape: { x: start[0], y: start[1] - h / 2, width: Math.max(3, end[0] - start[0]), height: h, r: 3 },
            style: api.style(),
          };
        },
        encode: { x: [1, 2], y: 0 },
        data: bars.map((b) => ({
          value: [b.row, b.start, b.end],
          itemStyle: { color: barColor(b.wo) },
        })),
      },
    ],
  };
});

/** 颜色跟着状态机走（与列表页、详情时间轴同一套语汇），紧急单再加粗边 */
function barColor(w: WorkOrder): string {
  if (w.status === "已关闭") return "#71717a";
  if (w.status === "待验证") return "#8b5cf6";
  if (w.status === "执行中") return "#0ea5e9";
  if (w.status === "已派工") return "#22c55e";
  return "#f59e0b";
}

function fmtHour(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}时`;
}

const span = computed(() => {
  const bs = plan.value.bars;
  if (!bs.length) return "";
  const s = Math.min(...bs.map((b) => b.start));
  const e = Math.max(...bs.map((b) => b.end));
  return `${toDay(new Date(s))} ~ ${toDay(new Date(e))}`;
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Select v-model="range" :options="RANGES" class="w-32 shrink-0" />
      <span class="text-xs text-muted-foreground">
        {{ plan.bars.length }} 张工单在排 · {{ workload.list.length }} 人有活{{ span ? ` · ${span}` : "" }}
      </span>
      <span class="ml-auto text-xs text-muted-foreground">条长 = 计划工时 · 颜色 = 状态 · 口径：下达即开始</span>
    </div>

    <div class="flex min-h-0 flex-1">
      <div class="flex min-w-0 flex-1 flex-col">
        <EChart v-if="plan.bars.length" :option="option" class="min-h-0 flex-1" />
        <div v-else class="flex min-h-0 flex-1 items-center justify-center px-6">
          <div class="max-w-md text-center">
            <div class="text-sm font-medium">这个窗口里没有可排的工单</div>
            <p class="mt-1.5 text-xs text-muted-foreground">
              换个范围（近 30 天 / 全部），或者先去报修、转几张报警成工单。
            </p>
          </div>
        </div>
      </div>

      <!-- 人力分配：排程的落点是「人背了多少小时」 -->
      <aside class="flex w-72 shrink-0 flex-col border-l border-border/60">
        <div class="flex h-9 shrink-0 items-center border-b border-border/60 px-3">
          <span class="text-xs text-muted-foreground">人力分配</span>
        </div>
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          <div v-for="w in workload.list" :key="w.name" class="space-y-1">
            <div class="flex min-w-0 items-baseline gap-2">
              <span class="truncate text-body">{{ w.name }}</span>
              <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ w.count }} 单 · {{ w.hours }} h</span>
            </div>
            <div class="h-1.5 w-full overflow-hidden rounded bg-muted">
              <div
                class="h-full rounded bg-primary"
                :style="{ width: `${Math.round((w.hours / workload.max) * 100)}%` }"
              />
            </div>
          </div>
          <div v-if="!workload.list.length" class="text-xs text-muted-foreground">窗口内没有排入的工单。</div>
          <div class="space-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
            <div>色带（同条子）：</div>
            <div class="flex flex-wrap gap-x-3 gap-y-1">
              <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background: #f59e0b" />待派工</span>
              <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background: #22c55e" />已派工</span>
              <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background: #0ea5e9" />执行中</span>
              <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background: #8b5cf6" />待验证</span>
              <span><i class="mr-1 inline-block h-2 w-2 rounded-full" style="background: #71717a" />已关闭</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
