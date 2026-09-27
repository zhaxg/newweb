<script setup lang="ts">
/**
 * EO0003 能流网络图（总览 · 附录 B5 版式 **V4 分析：ECharts Sankey**）
 *
 *  接口：`overviewApi.sankey(media)`（节点色与 `dirs` 由服务端给）
 *        `overviewApi.kpi`（顶部一句话账）
 *
 *  演示要点：**按介质切、全链路一眼看穿**——购入/自产 → 转换 → 消耗 → 回收/外供。
 *  规格书要求「节点值实时、点击节点下钻」。节点值来自 `model.sankeyData`（与
 *  平衡表同一份 `flows()`，所以图上的量与 EP0003 表里的量**必然同数**）。
 *
 *  两条口径纪律：
 *  1. **颜色不自己挑**：节点色服务端按方向填（`FLOW_HEX`）、图例读 `dirs`——
 *     页面从节点名里拆方向 = 复制 `sankeyNodeName` 的拼接规则，改了拼接就漏一处。
 *  2. **量纲跟介质走**：`unit`（万m³ / 万kWh / t）由端点给，tooltip 按它拼，
 *     页面不查介质字典——查了就是第二份单位表。
 *
 *  下钻：点节点 → 按方向/工序路由到对应监测页（消耗/转换→EM0002、回收→EM0007…）。
 *  **只下钻到已存在的页**，不发明不存在的目标。
 *
 *  待接入：自定义节点拖拽、按工序聚合开关。
 */
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { mediumApi, overviewApi } from "@/api/energy";
import type { EnergyMedium, SankeyDto } from "@/api/energy/types";
import EChart from "../../EChart.vue";
import { FLOW_LEGEND, emsDarkClass, emsHeaderTextClass } from "../../emsTheme";
import type { EChartsOption } from "echarts";

const router = useRouter();
const loading = ref(true);
const media = ref("BFG");
const mediaList = ref<EnergyMedium[]>([]);
const dto = ref<SankeyDto | null>(null);

async function load() {
  loading.value = true;
  try {
    dto.value = await overviewApi.sankey(media.value);
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
onMounted(async () => {
  try {
    mediaList.value = await mediumApi.list();
    /* 默认停在高炉煤气（BFG）——它节点最多、链路最全，第一眼最有说服力；
       电力是环形网、桑基读不出层次，不适合当首屏 */
    if (mediaList.value.some((m) => m.code === "BFG")) media.value = "BFG";
  } catch {
    /* 拦截层已 toast；下拉空着但图仍可按默认介质画 */
  }
  await load();
});

/** 介质下拉只留**有平衡意义**的介质：`balanceParticipate` 是 EG0001 的开关，
 *  关掉的介质（不进平衡表）本来就不该出现在能流图里 */
const options = computed(() => mediaList.value.filter((m) => m.balanceParticipate));

const current = computed(() => mediaList.value.find((m) => m.code === media.value));
/** 顶部一句话账：本介质的**总量** = 首节点流出量之和（服务端已按方向给节点） */
const total = computed(() => {
  const d = dto.value;
  if (!d) return 0;
  return d.links.filter((l) => l.source === d.nodes[0]?.name).reduce((s, l) => s + l.value, 0);
});

/** 图例：读服务端给的 `dirs`（图里**实际出现**的方向），空项不挂 */
const legend = computed(() => FLOW_LEGEND(dto.value?.dirs ?? []));

/** 桑基 option。颜色全部来自服务端的 `itemStyle.color`，页面不补色 */
const option = computed<EChartsOption>(() => {
  const d = dto.value;
  if (!d) return {};
  const unit = d.unit;
  const digits = d.scale > 1 ? 0 : 1;
  const fmt = (v: number) => `${(v / d.scale).toLocaleString("zh-CN", { maximumFractionDigits: digits })} ${unit}`;
  return {
    backgroundColor: "transparent",
    animation: false,
    tooltip: {
      trigger: "item",
      formatter: (p: any) => {
        if (p.dataType === "edge") return `${p.data.source} → ${p.data.target}<br/>${fmt(p.data.value)}`;
        return `${p.name}<br/>${fmt(p.value ?? 0)}`;
      },
    },
    series: [
      {
        type: "sankey",
        layout: "none",
        emphasis: { focus: "adjacency" },
        /* 节点名字要读得清：工序 · 方向，13px 在 1920 上偏小 */
        label: { color: "#CBD5E1", fontSize: 13 },
        lineStyle: { color: "gradient", opacity: 0.35 },
        itemStyle: { borderWidth: 0 },
        data: d.nodes,
        links: d.links,
      },
    ],
  };
});

/**
 * 点节点下钻。**只路由到已存在的页**（规格书说「点击节点下钻到对应监测页」，
 * 目标不在功能树里的就不下钻——返回 false 时 ECharts 忽略，比跳 404 强）。
 * 方向 → 页面的映射：谁在管这一段的数，就跳谁。
 */
const ROUTE_BY_DIR: Record<string, string> = {
  购入: "/energy/monitor/power",
  自产: "/energy/monitor/gas",
  转换: "/energy/monitor/gas-plant",
  消耗: "/energy/monitor/gas",
  回收: "/energy/monitor/gas-balance",
  损失: "/energy/monitor/alarm",
  外供: "/energy/monitor/gas",
};

function onNodeClick(params: any) {
  if (params.dataType !== "node" || !params.name) return;
  const dir = params.name.split("·").at(-1) ?? "";
  const to = ROUTE_BY_DIR[dir];
  /* 首节点（介质名本身）不下钻：它是这张图的标题，不是一段能流 */
  if (to && params.name.includes("·")) void router.push(to);
}

watch(media, () => void load());
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 p-3" :class="emsDarkClass">
    <!-- 顶栏：介质切换 + 一句话账 + 图例 -->
    <div class="flex shrink-0 flex-wrap items-center gap-4 rounded-md border border-white/10 bg-[#111A2C] px-4 py-2">
      <span :class="emsHeaderTextClass">能流网络图</span>

      <!-- 介质下拉：只列 `balanceParticipate` 的介质（不进平衡表的本来就不该有能流） -->
      <select v-model="media" class="h-8 rounded border border-white/15 bg-[#0B1220] px-2 text-body text-foreground">
        <option v-for="m in options" :key="m.code" :value="m.code">{{ m.name }}</option>
      </select>

      <span class="text-xs text-slate-500">
        {{ current?.name ?? media }} · 合计
        <span class="tabular-nums text-foreground">
          {{
            (total / (dto?.scale || 1)).toLocaleString("zh-CN", { maximumFractionDigits: dto && dto.scale > 1 ? 0 : 1 })
          }}
        </span>
        {{ dto?.unit ?? "" }}
      </span>

      <!-- 图例读服务端 dirs：图里出现什么方向就挂什么，不挂空项 -->
      <div class="flex items-center gap-3">
        <span v-for="l in legend" :key="l.label" class="flex items-center gap-1.5 text-xs text-slate-500">
          <span class="inline-block h-2.5 w-5 rounded-sm" :style="{ background: l.color }"></span>{{ l.label }}
        </span>
      </div>

      <span class="ml-auto text-xs text-slate-500">点击节点下钻到对应监测页 · 量与 EP0003 平衡表同源</span>
    </div>

    <!-- 桑基主图 -->
    <div class="min-h-0 flex-1 rounded-md border border-white/10 bg-[#111A2C] p-2">
      <EChart v-if="dto" :option="option" force-dark class="h-full w-full" @click="onNodeClick" />
      <div v-else class="flex h-full items-center justify-center text-sm text-slate-500">
        {{ loading ? "能流图加载中…" : "该介质暂无可展示的能流（未进能源平衡表的介质不出现在这里）" }}
      </div>
    </div>
  </div>
</template>
