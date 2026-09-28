<script setup lang="ts">
/**
 * 铁区MES 首页（资源表的一级叶子 `home`，不在 71 个功能叶之内）。
 *
 * 接口：`statApi.page`（日报）· `tappingPlanApi.page`（今日铁次）
 *       `inspectionApi.flow`（质检流转）· `interfaceLogApi.health`（接口健康）
 *
 * 演示要点：**首页是走查的开场**——一屏答完四个「你们系统现在怎么样」：
 * 产量、质检、调度、集成。四个数分别来自 TR / TQ / TM / TI 四个模块的
 * **同一批端点**，所以首页说的数 = 进去那页说的数——
 * 首页自己另算一套就会出现「首页写 4850、点进去是 4780」，那是最常见的露馅。
 *
 * 十一个模块的入口卡按**规格书 A2 的优先级**排序（P0 → P1 → P2），
 * 每张卡带一个叶子数与一句话——客户扫一眼就知道从哪开始点。
 *
 * 待接入：待办事项（本域只查桩；首页没有可点的动作，只有入口）。
 */
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { inspectionApi, interfaceLogApi, statApi, tappingPlanApi } from "@/api/mes4tq";
import { TQ_AREA } from "../tqTheme";

const router = useRouter();

/**
 * 十一个模块入口。
 *
 * `to` 走的是**资源表的 cResPath 链**（`/tqmes/<模块>/<页>`），
 * 与 `data/rescs.ts` 的叶子路径逐字对应——改了一处必须改另一处，
 * 否则点进去 404 而首页看不出来。
 *
 * `area` 对应 `TQ_AREA` 的工艺区域色：颜色标的是**这模块管哪道工序**，
 * 不是模块的好坏——烧结蓝、高炉粉在全站各页都是这个意思（B8）。
 */
const MODULES = [
  {
    code: "TG",
    name: "基础配置",
    to: "/tqmes/basic/line",
    leaves: 5,
    prio: "P0",
    area: "raw",
    desc: "产线 / 物料 / 料仓 / 排班 / 指标",
  },
  {
    code: "TI",
    name: "系统集成",
    to: "/tqmes/integrate/point",
    leaves: 4,
    prio: "P0",
    area: "belt",
    desc: "采集点位 / 接口日志 / EMS 下抛",
  },
  {
    code: "TW",
    name: "工序作业",
    to: "/tqmes/process/raw/bin-change",
    leaves: 35,
    prio: "P0",
    area: "sinter",
    desc: "六工序 × 投收料 / 变料 / 运行 / 停机",
  },
  {
    code: "TP",
    name: "计划管理",
    to: "/tqmes/plan/tech-indicator",
    leaves: 4,
    prio: "P1",
    area: "belt",
    desc: "技经指标 → 月计划 → 需求 → 采购",
  },
  {
    code: "TB",
    name: "配料管理",
    to: "/tqmes/batch/blend",
    leaves: 4,
    prio: "P1",
    area: "raw",
    desc: "混匀 / 烧结 / 球团 / 高炉 配料计划",
  },
  {
    code: "TS",
    name: "物料与库存",
    to: "/tqmes/stock/location",
    leaves: 4,
    prio: "P1",
    area: "belt",
    desc: "库房库位 / 库存 / 收发存 / 料场图",
  },
  {
    code: "TQ",
    name: "质量管理",
    to: "/tqmes/quality/standard",
    leaves: 3,
    prio: "P1",
    area: "blast",
    desc: "标准 → 委托 → 实绩 三段链",
  },
  {
    code: "TR",
    name: "统计报表",
    to: "/tqmes/report/daily",
    leaves: 3,
    prio: "P1",
    area: "belt",
    desc: "日报月报 / 班组竞赛 / 综合报表",
  },
  {
    code: "TD",
    name: "大屏看板",
    to: "/tqmes/board/sinter",
    leaves: 3,
    prio: "P1",
    area: "sinter",
    desc: "烧结 / 高炉 / 铁水 三张屏",
  },
  {
    code: "TM",
    name: "铁水调度",
    to: "/tqmes/iron/plan",
    leaves: 3,
    prio: "P2",
    area: "ladle",
    desc: "出铁计划 / 罐管理 / 过磅台账",
  },
  {
    code: "TC",
    name: "成本归集",
    to: "/tqmes/cost/analysis",
    leaves: 3,
    prio: "P2",
    area: "belt",
    desc: "单价维护 / 成本分析 / 月末调差",
  },
] as const;

function areaOf(key: string): string {
  return (TQ_AREA as Record<string, string>)[key] ?? "#60A5FA";
}

function go(to: string) {
  void router.push(to);
}

/* ── 四个实时数字（各自来自对应模块的端点，**首页不自己算**）───────── */

const kpis = ref<Array<{ label: string; value: string; sub: string; tone: "ok" | "warn" | "bad" }>>([]);
const loading = ref(true);

async function loadKpis() {
  loading.value = true;
  try {
    const [daily, taps, flow, iface] = await Promise.all([
      statApi.page({ kind: "daily", indicator: "产量", pageSize: 500 }),
      tappingPlanApi.page({ pageSize: 500 }),
      inspectionApi.flow(),
      interfaceLogApi.health(),
    ]);

    /* ① 产量：**取 TR0001 里最近一天的「产量」合计**——与日报页同一批行，
          不在首页另算一遍（另算必与报表页不等） */
    const latest = [...new Set(daily.rows.map((r) => r.period))].toSorted().at(-1) ?? "";
    const todayOutput = daily.rows
      .filter((r) => r.period === latest && r.indicator === "产量")
      .reduce((s, r) => s + r.value, 0);

    /* ② 今日铁次：与 TM0001 同一批计划行 */
    const todayStr = taps.rows[0]?.tapTime?.slice(0, 10) ?? "";
    const todayTaps = taps.rows.filter((r) => r.tapTime.startsWith(todayStr));
    const doneTaps = todayTaps.filter((r) => r.status === "已完成").length;

    /* ③ 质检：复检那一列就是「不合格」的数（`inspectionFlow` 已把它算进去了） */
    const fail = flow["复检"] ?? 0;
    const reported = flow["已报出"] ?? 0;

    /* ④ 集成：13 个接口的成功率（与 TI0003 同源） */
    const ifaceTotal = iface.reduce((s, h) => s + h.total, 0);
    const ifaceFail = iface.reduce((s, h) => s + h.fail, 0);
    const rate = ifaceTotal ? ((ifaceTotal - ifaceFail) / ifaceTotal) * 100 : 100;

    kpis.value = [
      {
        label: `当日产量（${latest}）`,
        value: `${Math.round(todayOutput).toLocaleString("zh-CN")} t`,
        sub: "六道工序合计 · 取自 TR0001 日报",
        tone: "ok",
      },
      {
        label: `今日铁次（${todayStr}）`,
        value: `${doneTaps} / ${todayTaps.length}`,
        sub: "已完成 / 计划 · 取自 TM0001",
        tone: doneTaps < todayTaps.length / 2 ? "warn" : "ok",
      },
      {
        label: "质检已报出 / 待复检",
        value: `${reported} / ${fail}`,
        sub: "取自 TQ0002 委托流转",
        tone: fail > 0 ? "warn" : "ok",
      },
      {
        label: "接口成功率",
        value: `${rate.toFixed(2)}%`,
        sub: `${iface.length} 个接口 · 取自 TI0003`,
        tone: rate >= 98 ? "ok" : "bad",
      },
    ];
  } catch {
    /* 拦截层已 toast；首页给空态而不是崩 */
    kpis.value = [];
  } finally {
    loading.value = false;
  }
}

const TONE_CLASS = {
  ok: "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
  warn: "border-amber-500/45 text-amber-600 dark:text-amber-400",
  bad: "border-red-500/50 text-red-600 dark:text-red-400",
} as const;

/** 总叶子数（与 `data/rescs.ts` 的 `LEAF_COUNT` 同一个数——两处必须一致） */
const totalLeaves = computed(() => MODULES.reduce((s, m) => s + m.leaves, 0));

onMounted(() => void loadKpis());
</script>

<template>
  <div class="min-h-0 flex-1 overflow-auto">
    <!-- 页头 -->
    <div class="border-b border-border/60 px-4 py-4">
      <div class="flex items-baseline gap-3">
        <span class="text-base font-semibold">铁区MES</span>
        <span class="text-xs text-muted-foreground">钢城钢铁 · 铁区制造执行系统</span>
        <span class="ml-auto text-xs text-muted-foreground">
          {{ MODULES.length }} 个模块 · {{ totalLeaves }} 个功能页（+ 首页）
        </span>
      </div>
      <div class="mt-1 text-xs text-muted-foreground">
        演示账号 <code class="rounded bg-muted px-1">tqmes</code> ·
        范围<b>只查桩</b>（无增删改，模拟触发按钮提示待接入）
      </div>
    </div>

    <!-- 四个实时数字：各自来自对应模块的端点，首页不自己算 -->
    <div class="grid grid-cols-2 gap-3 px-4 py-4 lg:grid-cols-4">
      <div v-for="k in kpis" :key="k.label" class="rounded border px-3 py-2.5" :class="TONE_CLASS[k.tone]">
        <div class="text-xs text-muted-foreground">{{ k.label }}</div>
        <div class="mt-1 text-base font-semibold tabular-nums">{{ loading ? "…" : k.value }}</div>
        <div class="mt-0.5 truncate text-xs text-muted-foreground">{{ k.sub }}</div>
      </div>
      <div
        v-if="!kpis.length && !loading"
        class="col-span-2 py-4 text-center text-sm text-muted-foreground lg:col-span-4"
      >
        指标加载失败（拦截层已提示），下方入口仍可正常使用
      </div>
    </div>

    <!-- 十一个模块入口：按 A2 的优先级 P0 → P1 → P2 排 -->
    <div class="px-4 pb-6">
      <div class="mb-2 flex items-center gap-3">
        <span class="text-xs font-medium">模块入口</span>
        <span class="text-xs text-muted-foreground">按规格书 A2 优先级排列（P0 → P1 → P2）</span>
      </div>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <button
          v-for="m in MODULES"
          :key="m.code"
          type="button"
          class="cursor-pointer rounded border border-border/70 bg-card/70 px-3 py-2.5 text-left transition-colors hover:border-primary/60"
          @click="go(m.to)"
        >
          <div class="flex items-center gap-2">
            <!-- 工艺区域色条：颜色标「这模块管哪道工序」，不标好坏（B8） -->
            <span class="h-4 w-1 rounded-sm" :style="{ background: areaOf(m.area) }"></span>
            <span class="text-body font-medium">{{ m.name }}</span>
            <span class="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{{ m.code }}</span>
            <span
              class="rounded px-1.5 py-0.5 text-xs"
              :class="m.prio === 'P0' ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'"
            >
              {{ m.prio }}
            </span>
          </div>
          <div class="mt-1 text-xs text-muted-foreground">{{ m.desc }}</div>
          <div class="mt-1 flex items-baseline gap-1 text-xs text-muted-foreground">
            <span class="tabular-nums font-medium text-foreground">{{ m.leaves }}</span> 个功能页
            <span class="ml-auto text-primary">进入 →</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 走查提示：给销售看的「先点哪」 -->
    <div class="px-4 pb-8">
      <div class="rounded border border-border/70 bg-card/60 px-4 py-3">
        <div class="text-xs font-medium">演示走查建议</div>
        <ol class="mt-1.5 space-y-1 text-xs leading-5 text-muted-foreground">
          <li>
            1. 先开 <b class="text-foreground">TD0002 高炉运行大屏</b>（满屏数据最抓眼）→ 再进
            <b class="text-foreground">TW0604 高炉运行参数</b> 对同一个数。
          </li>
          <li>
            2. <b class="text-foreground">TG0003 料仓管理</b> 看料位条的双端红线 → 点一个仓进
            <b class="text-foreground">TW0601 高炉料仓变料</b> 看它怎么变的。
          </li>
          <li>
            3. <b class="text-foreground">TQ0002 检验委托</b> 的七列看板 → 点「查看结果」下钻到
            <b class="text-foreground">TQ0003 检验实绩</b>（实测值与标准区间同屏）。
          </li>
          <li>
            4. <b class="text-foreground">TR0001 生产日报</b> 点任意一行 → 子母项弹窗一路看到 <b>月 → 日 → 班</b>。
          </li>
          <li>5. <b class="text-foreground">TC0002 成本分析</b> 的饼图每片带数据来源 → 回答「这块钱哪来的」。</li>
        </ol>
      </div>
    </div>
  </div>
</template>
