<script setup lang="ts">
/**
 * 能源首页（资源表一级叶子 `home`——`dynamicRoutes.withHomeOwnership` 认它顶掉内置兜底页）
 *
 *  接口：`overviewApi.home`（**与 EO0001 大屏、EO0002 看板同一个聚合口的子集**——
 *        四个顶栏数永远与大屏同数，首页自己不算账）
 *
 *  演示要点：**这是走查的开场**。销售先在这页点一句「先看哪」，再进模块。
 *  所以：
 *  1. 四张顶栏卡给出「现在怎么样」（放散/自发电/报警/待办），
 *     每张带目标，客户第一眼看到的是**离承诺多远**而不是一个孤零零的数；
 *  2. 六个模块入口按**开发顺序**排（EG→EC→EM→EP→ER→EO），
 *     因为这条顺序就是系统的「先有数据、再有账、最后收口」的逻辑，讲起来顺；
 *  3. 演示走查五步是**幕序**（B4 的 8 幕压缩成点得动的 5 步），
 *     每步一句台词——这是给销售看的，不是给实施看的。
 *
 *  **首页不写死任何数**：连「71 个页面」这种话都从路由来（`totalLeaves` 静态计数
 *  与 `data/rescs.ts` 的叶子数一致，两处不一致是 rescs 少铺了叶子的信号）。
 *
 *  待接入：待办事项列表（当前只给计数，理由是待办的动作在各模块里做，
 *  首页再放一套动作按钮就是第二处能改状态机的地方）。
 */
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { overviewApi } from "@/api/energy";
import { EMS_BAD, EMS_OK, EMS_WARN, TONE_TEXT, emsHeaderTextClass, emsPanelClass } from "../emsTheme";

const router = useRouter();
const loading = ref(true);
const kpi = ref<Awaited<ReturnType<typeof overviewApi.home>> | null>(null);

async function load() {
  try {
    kpi.value = await overviewApi.home();
  } catch {
    /* 拦截层已 toast；首页给空态而不是崩 */
  } finally {
    loading.value = false;
  }
}
onMounted(() => void load());

/** 顶栏四卡：**方向判据写在卡里**——放散越低越好、自发电越高越好，
 *  报警与待办是「越少越好」但没有目标线（它们是状态量不是承诺值） */
const tiles = computed(() => {
  const k = kpi.value;
  if (!k) return [];
  const ventGood = k.ventRatePct <= k.ventTarget;
  const genGood = k.selfGenRatePct >= k.selfGenTarget;
  const kgceGood = k.compositeKgce <= k.compositeTarget;
  return [
    {
      label: "煤气放散率",
      value: `${k.ventRatePct.toFixed(1)}%`,
      target: `目标 ${k.ventTarget}%`,
      tone: ventGood ? TONE_TEXT.ok : TONE_TEXT.bad,
      hint: ventGood ? "贴着承诺线" : "高于承诺，未收口",
    },
    {
      label: "自发电率",
      value: `${k.selfGenRatePct.toFixed(1)}%`,
      target: `目标 ${k.selfGenTarget}%`,
      tone: genGood ? TONE_TEXT.ok : TONE_TEXT.warn,
      hint: genGood ? "达标" : "低于承诺",
    },
    {
      label: "吨钢综合能耗",
      value: `${k.compositeKgce.toFixed(1)}`,
      unit: "kgce/t",
      target: `目标 ${k.compositeTarget}`,
      tone: kgceGood ? TONE_TEXT.ok : TONE_TEXT.warn,
      hint: "越低越好",
    },
    {
      label: "活动报警 / 紧急",
      value: `${k.activeAlarms} / ${k.urgentAlarms}`,
      target: `调度令 ${k.openOrders} 张`,
      tone: k.urgentAlarms > 0 ? TONE_TEXT.bad : k.activeAlarms > 0 ? TONE_TEXT.warn : TONE_TEXT.ok,
      hint: `待补录工单 ${k.pendingTickets} 条`,
    },
  ];
});

/**
 * 六个模块入口。
 *
 * **顺序 = 开发顺序 = 讲解顺序**：EG 配置（口径源头）→ EC 采集（数据进来）
 * → EM 监控调度（演示核心）→ EP 管理（变成账）→ ER 报表（讲成结论）
 * → EO 总览（收口给领导看）。这条链本身就是在讲「EMS 为什么值钱」。
 *
 * `to` 与 `data/rescs.ts` 的叶子 `cResPath` 逐字对应——改一处必须改另一处，
 * 否则点进去 404 而首页看不出来。
 */
const MODULES = [
  {
    code: "EG",
    name: "基础配置",
    to: "/energy/config/medium",
    leaves: 3,
    prio: "P0",
    done: true,
    desc: "介质 · 用能单元 · 报警与电价",
    why: "口径源头：折标系数一改，六处同时变",
  },
  {
    code: "EC",
    name: "数据采集",
    to: "/energy/collect/network",
    leaves: 5,
    prio: "P2",
    done: true,
    desc: "计量网络 · 通道 · 质量 · 仪表 · 历史",
    why: "采集不是黑盒：中断→补录全留痕",
  },
  {
    code: "EM",
    name: "监控与调度",
    to: "/energy/monitor/gas",
    leaves: 7,
    prio: "P3",
    done: true,
    desc: "供配电 · 煤气 · 蒸汽水 · 氧氮氩 · 报警 · 调度令 · 平衡仿真",
    why: "8 幕剧本的主舞台，幕 2→5 都在这",
  },
  {
    code: "EP",
    name: "能源管理",
    to: "/energy/plan/quota-plan",
    leaves: 6,
    prio: "P4",
    done: true,
    desc: "定额 · 实绩 · 平衡 · 结算 · 考核 · 重点设备",
    why: "幕 6→7：月出平衡表 + 结算单",
  },
  {
    code: "ER",
    name: "报表统计",
    to: "/energy/report/energy-stat",
    leaves: 4,
    prio: "P5",
    done: true,
    desc: "能耗 · 能效 · 预测 · 自定义",
    why: "把账讲成结论",
  },
  {
    code: "EO",
    name: "能源总览",
    to: "/energy/overview/screen",
    leaves: 3,
    prio: "P6",
    done: true,
    desc: "大屏 · KPI 看板 · 能流桑基",
    why: "幕 1 开场、幕 8 收口",
  },
] as const;

/** 总叶数（与 `data/rescs.ts` 的 `LEAF_COUNT` 同一个数——两处必须一致） */
const totalLeaves = computed(() => MODULES.reduce((s, m) => s + m.leaves, 0));

/**
 * 演示走查五步（B4 的 8 幕压成点得动的 5 步）。
 * **每步一句台词**——给销售照着念，不是给实施看的说明书。
 */
const WALK = [
  { n: 1, page: "EO0001 大屏", to: "/energy/overview/screen", line: "这是调度台每天盯着的屏。" },
  { n: 2, page: "EM0002 → EM0007", to: "/energy/monitor/gas", line: "柜位 30 秒爬到 88%，系统自己给出三条调度建议。" },
  { n: 3, page: "EM0005 → EM0006", to: "/energy/monitor/alarm", line: "从报警到处置全留痕，事后能复盘。" },
  { n: 4, page: "EP0002 → EP0003", to: "/energy/plan/balance", line: "月出平衡表是节能监察硬要求，系统一键。" },
  {
    n: 5,
    page: "EO0002 KPI",
    to: "/energy/overview/kpi",
    line: "放散率 2.1%→1.3%，月增效 ≈240 万——每一幕都来自刚才那一次调度。",
  },
];

function go(to: string) {
  void router.push(to);
}
</script>

<template>
  <div class="min-h-0 flex-1 overflow-auto">
    <!-- 页头 -->
    <div class="border-b border-border px-5 py-4">
      <div class="flex items-baseline gap-3">
        <span :class="emsHeaderTextClass">钢铁能源管理（EMS）</span>
        <span class="text-xs text-muted-foreground">钢城钢铁 · 年产钢约 300 万吨</span>
        <span class="ml-auto text-xs text-muted-foreground">
          {{ MODULES.length }} 个模块 · {{ totalLeaves }} 个功能页 · 数据截止 {{ kpi?.at ?? "—" }}
        </span>
      </div>
      <div class="mt-1 text-xs text-muted-foreground">
        演示账号 <code class="rounded bg-muted px-1">energy</code> · 四个顶栏数与大屏 / KPI
        看板**同一个聚合口**，三处永远同数
      </div>
    </div>

    <!-- 顶栏四卡 -->
    <div class="grid grid-cols-2 gap-3 px-5 py-4 lg:grid-cols-4">
      <div v-for="t in tiles" :key="t.label" class="rounded-md border border-border bg-card px-4 py-3">
        <div class="text-xs text-muted-foreground">{{ t.label }}</div>
        <div class="mt-1 flex items-baseline gap-2">
          <span class="text-base font-semibold tabular-nums" :class="t.tone">{{ loading ? "…" : t.value }}</span>
          <span v-if="t.unit" class="text-xs text-muted-foreground">{{ t.unit }}</span>
          <span class="ml-auto text-xs text-muted-foreground">{{ t.target }}</span>
        </div>
        <div class="mt-0.5 truncate text-xs text-muted-foreground">{{ t.hint }}</div>
      </div>
    </div>

    <!-- 六个模块入口（顺序 = 开发顺序 = 讲解顺序） -->
    <div class="px-5 pb-5">
      <div class="mb-2 flex items-center gap-3">
        <span class="text-xs font-medium text-foreground">模块入口</span>
        <span class="text-xs text-muted-foreground">
          顺序即讲解顺序：先有口径（EG）、再有数据（EC）、才有账（EP）、最后收口（EO）
        </span>
      </div>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <button
          v-for="m in MODULES"
          :key="m.code"
          type="button"
          class="cursor-pointer rounded-md border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/60"
          @click="go(m.to)"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-primary">{{ m.name }}</span>
            <span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{{ m.code }}</span>
            <span
              class="ml-auto rounded px-1.5 py-0.5 text-xs"
              :class="
                m.done
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              "
            >
              {{ m.prio }}
            </span>
          </div>
          <div class="mt-1 text-xs text-muted-foreground">{{ m.desc }}</div>
          <div class="mt-1 flex items-baseline gap-2 text-xs">
            <span class="text-foreground tabular-nums">{{ m.leaves }}</span>
            <span class="text-muted-foreground">页</span>
            <span class="ml-auto text-primary">进入 →</span>
          </div>
          <div class="mt-1 truncate text-xs text-muted-foreground">{{ m.why }}</div>
        </button>
      </div>
    </div>

    <!-- 演示走查五步（给销售照着念） -->
    <div class="px-5 pb-8">
      <div class="rounded-md border border-border bg-card px-4 py-3">
        <div class="text-sm font-semibold text-primary">演示走查（15 分钟 · 照着念）</div>
        <ol class="mt-2 space-y-1.5">
          <li v-for="w in WALK" :key="w.n" class="flex items-baseline gap-3 text-body">
            <span class="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{{ w.n }}</span>
            <button type="button" class="shrink-0 cursor-pointer text-primary hover:underline" @click="go(w.to)">
              {{ w.page }}
            </button>
            <span class="min-w-0 flex-1 text-foreground">{{ w.line }}</span>
          </li>
        </ol>
        <div class="mt-2 text-xs text-muted-foreground">
          原则：任何「▶ 模拟触发」都必须能在别的页面看到后果——报警中心、平衡表、结算、大屏四处是后果展示区。
        </div>
      </div>
    </div>
  </div>
</template>
