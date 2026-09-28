<script setup lang="ts">
/** 对应 AM0004 PHM 诊断（模块三 状态监测 · 附录 B5 版式 L5：雷达图 + RUL 大数字卡）
 *  接口：phmApi.view（GET /eam/monitor/phm）· toWorkOrder（POST /monitor/phmToWorkOrder，一键生成 PdM 来源工单）
 *        + equipmentApi.list（设备候选）
 *  演示要点：**这一页回答的是客户第二个问题**——第一个是"能不能看到"（AM0002），
 *        这个是"能不能提前知道"。所以版式不是表格，是一张雷达（五个维度对着参考基线 90 分）
 *        加一个 RUL 大数字：剩余寿命 48 天、置信度 88%，旁边写清这条结论是怎么来的
 *        （mock 用「近 30 天线性劣化外推」，`store.phmView` 里那三行就是全部机理）。
 *        「一键生成诊断工单」把结论接回业务闭环：PdM 来源的工单在 AW0003 的状态机里
 *        从待派工起步，所以这一按，工单页、报警页、大屏三处都会多东西——这是演示的收口动作。
 *  已知偏差：真实 PHM 的 RUL 是模型输出（退化特征 + 相似样本），这里刻意用线性外推，
 *        页面上不写"AI 模型"这种兜不住的话。
 *  待接入：无。 */
import { computed, onMounted, ref, watch } from "vue";
import type { EChartsOption } from "echarts";
import Button from "primevue/button";
import Select from "primevue/select";
import { IconBulb, IconReportMoney } from "@tabler/icons-vue";
import { useToast } from "@/composables/useToast";
import { equipmentApi, phmApi } from "@/api/equipment";
import type { Equipment, PhmView } from "@/api/equipment/types";
import EChart from "../../EChart.vue";
import { applyResult } from "../../rowActions";
import { tagRenderer } from "../../cells";

const { toast } = useToast();

const equips = ref<Equipment[]>([]);
const eqId = ref("");
const view = ref<PhmView | null>(null);
const busy = ref(false);

const options = computed(() => equips.value.map((e) => ({ id: e.id, name: `${e.name}（${e.model}）` })));

async function load() {
  if (!eqId.value) return;
  try {
    view.value = await phmApi.view(eqId.value);
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(async () => {
  try {
    equips.value = (await equipmentApi.list()) ?? [];
    // 默认停在剧本那台「有结论可讲」的设备上：换一台健康的，雷达五维全贴着基线，没什么可说的
    eqId.value = equips.value.find((e) => e.id === "EQ-BR-F4-03")?.id ?? equips.value[0]?.id ?? "";
  } catch {
    /* 拦截层已 toast */
  }
  await load();
});

watch(eqId, load);

async function toWorkOrder() {
  if (!eqId.value || busy.value) return;
  busy.value = true;
  try {
    applyResult(await phmApi.toWorkOrder(eqId.value), "诊断工单已生成", toast);
  } catch {
    /* 拦截层已 toast */
  }
  busy.value = false;
}

/** 雷达：实际得分 vs 参考基线 90。缺了基线那一圈，五个数字就只是五个数字 */
const radarOption = computed<EChartsOption>(() => {
  const v = view.value;
  if (!v) return {};
  return {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, data: ["实测得分", "参考基线"] },
    radar: {
      indicator: v.radar.map((d) => ({ name: d.name, max: 100 })),
      radius: "62%",
      axisName: { fontSize: 11 },
    },
    series: [
      {
        type: "radar",
        data: [
          { name: "实测得分", value: v.radar.map((d) => d.value), areaStyle: { opacity: 0.16 } },
          {
            name: "参考基线",
            value: v.radar.map((d) => d.ref),
            lineStyle: { type: "dashed", width: 1 },
            symbol: "none",
          },
        ],
      },
    ],
  };
});

/** 劣化趋势：实线是已发生的 30 天，虚线是外推到的那一天（NaN 断点是 echarts 分段的标准做法） */
const degradeOption = computed<EChartsOption>(() => {
  const v = view.value;
  if (!v) return {};
  return {
    grid: { left: 44, right: 18, top: 30, bottom: 26 },
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["历史健康度", "预测劣化"] },
    xAxis: { type: "category", data: v.degrade.days, axisLabel: { fontSize: 10 } },
    yAxis: { type: "value", min: 40, max: 100, splitLine: { lineStyle: { type: "dashed" } } },
    series: [
      {
        name: "历史健康度",
        type: "line",
        data: v.degrade.health,
        showSymbol: false,
        smooth: true,
        lineStyle: { width: 2 },
      },
      {
        name: "预测劣化",
        type: "line",
        data: v.degrade.forecast,
        showSymbol: false,
        lineStyle: { width: 2, type: "dashed", color: "#ef4444" },
        itemStyle: { color: "#ef4444" },
        // 50 分是外推的终点（低于它就该换了），画出来客户才知道那条虚线要往哪儿靠
        markLine: {
          silent: true,
          symbol: "none",
          data: [{ yAxis: 50, lineStyle: { color: "#f59e0b" }, label: { formatter: "建议更换线 50" } }],
        },
      },
    ],
  };
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏 h-9：设备 + 统计，动作按钮靠右 -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Select
        v-model="eqId"
        :options="options"
        option-label="name"
        option-value="id"
        filter
        placeholder="选择设备"
        class="w-72 shrink-0"
      />
      <span v-if="view" class="text-xs text-muted-foreground">
        诊断基线取近 30 天劣化速率外推 · 结论只作检修排程参考
      </span>
      <Button class="ml-auto shrink-0 whitespace-nowrap" :loading="busy" @click="toWorkOrder">
        <IconReportMoney class="h-3 w-3" />生成诊断工单
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto p-3">
      <div v-if="view" class="space-y-3">
        <!-- 四张指标卡：健康度 / RUL / 置信度 / 参与诊断的测点数 -->
        <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div class="min-w-0 rounded-md border border-border/60 px-3 py-2">
            <div class="text-xs text-muted-foreground">综合健康度</div>
            <div class="text-base font-semibold tabular-nums">
              {{ view.health }} <span class="text-xs font-normal">/ 100</span>
            </div>
          </div>
          <div class="min-w-0 rounded-md border border-border/60 px-3 py-2">
            <div class="text-xs text-muted-foreground">剩余寿命 RUL</div>
            <div class="text-base font-semibold tabular-nums">
              {{ view.rulDays }} <span class="text-xs font-normal">天</span>
            </div>
          </div>
          <div class="min-w-0 rounded-md border border-border/60 px-3 py-2">
            <div class="text-xs text-muted-foreground">预测置信度</div>
            <div class="text-base font-semibold tabular-nums">{{ view.rulConfidence }}%</div>
          </div>
          <div class="min-w-0 rounded-md border border-border/60 px-3 py-2">
            <div class="text-xs text-muted-foreground">诊断结论</div>
            <div class="truncate text-base font-semibold">{{ view.findings.length }} 项待处理</div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div class="h-[22rem] min-w-0 rounded-md border border-border/60 px-1">
            <EChart :option="radarOption" height="100%" />
          </div>
          <div class="h-[22rem] min-w-0 rounded-md border border-border/60 px-1">
            <EChart :option="degradeOption" height="100%" />
          </div>
        </div>

        <!-- 诊断结论：症状给数字、建议给动作，客户读到的是"下一步干什么"而不是一个分数 -->
        <div class="rounded-md border border-border/60">
          <div class="flex h-9 items-center gap-2 border-b border-border/60 px-3">
            <span class="text-sm font-medium">诊断结论与处置建议</span>
            <span class="ml-auto text-xs text-muted-foreground">{{ view.eqName }}</span>
          </div>
          <ul class="divide-y divide-border/60">
            <li v-for="(f, i) in view.findings" :key="i" class="flex min-w-0 items-start gap-3 px-3 py-2">
              <IconBulb class="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div class="min-w-0 flex-1 space-y-0.5">
                <div class="flex min-w-0 items-center gap-2">
                  <span class="text-body font-medium">{{ f.part }}</span>
                  <span class="shrink-0 text-xs text-muted-foreground">{{ f.symptom }}</span>
                </div>
                <div class="text-xs text-muted-foreground">{{ f.advice }}</div>
              </div>
              <span
                class="shrink-0 rounded px-1.5 py-0.5 text-xs"
                :class="
                  f.level === '报警'
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                "
                >{{ f.level }}</span
              >
            </li>
            <li v-if="!view.findings.length" class="px-3 py-2 text-xs text-muted-foreground">
              这台设备本轮诊断没有越限测点，维持原检修周期即可。
            </li>
          </ul>
        </div>
      </div>

      <div v-else class="flex h-full items-center justify-center text-body text-muted-foreground">
        选择设备后加载诊断结果
      </div>
    </div>
  </div>
</template>
