<script setup lang="ts">
/** 对应设备管理子系统首页（资源表 leaf `2000`，pageId=home 顶掉内置兜底页）
 *  接口：overviewApi.dashboard（GET /eam/overview/dashboard）——只取顶部四个实时数与待办，
 *        与 AO0001 大屏、AO0003 报警中心同一个聚合口，所以「首页说的数」和「大屏说的数」永远一致
 *  设计意图：这是销售演示的**第一屏与返场屏**——开场讲定位、每一幕讲完回到这里点下一幕。
 *        所以「演示主线 10 幕」不是一张说明书，而是 10 个**真导航**（`router.push`），
 *        讲解人不用记菜单在哪；驾驶舱那一格按壳层的 blank 规则开新标签（整屏页不占页签）。
 *  待接入：无（只读一屏，接口只有 dashboard 聚合那一个）。
 *  已知偏差：模块入口是写死的九宫格（后端资源树本可以投影出来，但演示要的是"每格都有话讲"，
 *        按资源树渲染会把 31 页铺成一面墙）；待办计数随主线变，卡片文案不变。 */
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  IconAlarm,
  IconBuildingFactory,
  IconChartDots,
  IconClipboardCheck,
  IconDatabase,
  IconFileText,
  IconGauge,
  IconSettings,
  IconShield,
  IconTools,
} from "@tabler/icons-vue";
import { overviewApi } from "@/api/equipment";
import type { DashboardOverview } from "@/api/equipment/types";

const router = useRouter();
const board = ref<DashboardOverview | null>(null);

/** 首页只读一次：讲完一幕回来自带刷新（点下面卡片是路由跳转，回本页会重新挂载） */
onMounted(async () => {
  try {
    board.value = await overviewApi.dashboard();
  } catch {
    /* 拦截层已 toast；拉不到就只显示骨架，不阻塞讲解人往下点 */
  }
});

const stats = computed(() => {
  const d = board.value;
  if (!d) return [];
  return [
    { label: "纳管设备", value: `${d.deviceTotal}`, unit: "台", hint: `运行 ${d.running} · 故障停机 ${d.faultStop}` },
    { label: "平均健康度", value: `${d.avgHealth}`, unit: "分", hint: `OEE ${d.oee}% · 备件周转 ${d.spareTurnover}` },
    { label: "活动报警", value: `${d.activeAlarm}`, unit: "条", hint: `其中紧急 ${d.urgentAlarm} 条` },
    { label: "在办工单", value: `${d.openWorkOrder}`, unit: "张", hint: `备件资金 ${d.spareValue} 万元` },
  ];
});

const todoItems = computed(() => {
  const t = board.value?.todo;
  if (!t) return [];
  return [
    { label: "备件寿命超期", value: t["寿命超期"], to: "/equipment/spare/lifetime" },
    { label: "备件寿命临期", value: t["寿命临期"], to: "/equipment/spare/lifetime" },
    { label: "特种设备待检", value: t["特种待检"], to: "/equipment/safety/special" },
    { label: "计量器具临检", value: t["计量临检"], to: "/equipment/safety/metering" },
    { label: "活动报警未处理", value: t["活动报警"], to: "/equipment/overview/alarm" },
  ];
});

/** 模块九宫格：一格一个模块 + 该模块最该先看的那页 */
const MODULES = [
  { icon: IconGauge, name: "总览", desc: "驾驶舱 · 健康看板 · 报警中心", to: "/equipment/overview/health" },
  { icon: IconDatabase, name: "设备台账", desc: "主数据 · 结构树 · 生命周期档案", to: "/equipment/asset/device" },
  {
    icon: IconChartDots,
    name: "状态监测",
    desc: "点位 · 实时曲线 · 三级阈值 · PHM",
    to: "/equipment/monitor/realtime",
  },
  { icon: IconTools, name: "维修工单", desc: "PM 计划 · 报修 · 工单闭环 · 排程", to: "/equipment/workorder/list" },
  {
    icon: IconClipboardCheck,
    name: "备件与寿命",
    desc: "库存 · 寿命台账 · 考核 · 折算",
    to: "/equipment/spare/lifetime",
  },
  { icon: IconShield, name: "安全合规", desc: "作业票 · 隐患 · 特种设备 · 计量", to: "/equipment/safety/workPermit" },
  { icon: IconFileText, name: "分析与报表", desc: "KPI 指标 · 月报年报", to: "/equipment/analysis/kpi" },
  { icon: IconSettings, name: "系统集成", desc: "SAP / MES / 采集网关接口", to: "/equipment/config/integration" },
  {
    icon: IconBuildingFactory,
    name: "领导驾驶舱",
    desc: "1920×1080 全屏大屏（新标签）",
    to: "/equipment/overview/dashboard",
    blank: true,
  },
];

/** 附录 B4 的十幕，逐条可点 */
const SCRIPT = [
  { act: "1", title: "设备主数据", what: "弹出 F4 电机二维码，手机扫码看档案", to: "/equipment/asset/device" },
  { act: "2", title: "移动端档案", what: "台账 + 结构树 + 历史工单（H5 免登录）", to: "/equipment/asset/qrcode" },
  { act: "3", title: "实时监控", what: "点剧本：温度 20 秒爬到 85℃，自动生成报警", to: "/equipment/monitor/realtime" },
  { act: "4", title: "报警中心", what: "红色弹窗自动跳出 → 一键转工单", to: "/equipment/overview/alarm" },
  { act: "5", title: "工单派工", what: "派给张伟，移动端接单并领用 NUP318 轴承", to: "/equipment/workorder/list" },
  { act: "6", title: "自动请购", what: "库存跌破安全库存，请购单当场生成", to: "/equipment/spare/purchase" },
  { act: "7", title: "完工验证", what: "填工时传照片提交，验证通过后健康度回升", to: "/equipment/workorder/mobile" },
  { act: "8", title: "寿命台账", what: "3 条临期黄、2 条超期红，提醒报警已生成", to: "/equipment/spare/lifetime" },
  { act: "9", title: "考核结算", what: "生成 9 月结算：奖 640 / 罚 1200，一键打印", to: "/equipment/spare/assessment" },
  {
    act: "10",
    title: "离职折算 → 大屏",
    what: "芯棒剩余寿命折算 7.56 万，全屏大屏收口",
    to: "/equipment/spare/handover",
  },
];

function go(item: { to: string; blank?: boolean }) {
  if (item.blank) {
    window.open(router.resolve(item.to).href, "_blank", "noopener");
    return;
  }
  void router.push(item.to);
}

const alarms = computed(() => (board.value?.alarms ?? []).slice(0, 6));
const LEVEL_TONE: Record<string, string> = {
  紧急: "bg-red-500/15 text-red-600 dark:text-red-400",
  报警: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  预警: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  提示: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
};
</script>

<template>
  <div class="mx-auto flex w-full max-w-[1400px] flex-col gap-3 p-4">
    <!-- 定位 + 四个实时数 -->
    <div class="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <span class="h-4 w-1 rounded-full bg-primary" />
            <span class="text-base font-semibold text-foreground">
              {{ board?.plant ?? "设备全生命周期管理（EAM / PHM）" }}
            </span>
          </div>
          <p class="mt-2 max-w-3xl text-body text-muted-foreground">
            从采集点位到健康度，从报警到工单，从领料到考核到人：设备的一生都在这套系统里留痕，钱和责任都对得上账。
          </p>
        </div>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div v-for="s in stats" :key="s.label" class="min-w-[9rem] rounded-md border border-border px-3 py-2">
            <div class="text-xs text-muted-foreground">{{ s.label }}</div>
            <div class="home-num">
              {{ s.value }}<span class="home-unit">{{ s.unit }}</span>
            </div>
            <div class="mt-0.5 text-xs text-muted-foreground">{{ s.hint }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <!-- 主线十幕：演示动线，每格真导航 -->
      <div class="rounded-lg border border-border bg-card p-4 shadow-sm xl:col-span-2">
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-foreground">演示主线 · 十幕走查</div>
          <span class="text-xs text-muted-foreground">点任意一幕直达，讲完回本页点下一幕</span>
        </div>
        <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <button
            v-for="s in SCRIPT"
            :key="s.act"
            class="flex items-start gap-2.5 rounded-md border border-border p-2.5 text-left transition-colors hover:bg-accent"
            @click="go(s)"
          >
            <span class="mt-0.5 shrink-0 rounded bg-primary/12 px-1.5 py-0.5 text-xs font-medium text-primary">
              {{ s.act }}
            </span>
            <span class="min-w-0">
              <span class="block truncate text-body font-medium text-foreground">{{ s.title }}</span>
              <span class="block truncate text-xs text-muted-foreground">{{ s.what }}</span>
            </span>
          </button>
        </div>
      </div>

      <!-- 到期扫描待办 + 最新报警 -->
      <div class="flex flex-col gap-3">
        <div class="rounded-lg border border-border bg-card p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium text-foreground">到期扫描待办</div>
            <span class="text-xs text-muted-foreground">app 启动即跑，与大屏同口径</span>
          </div>
          <div class="mt-2 flex flex-col">
            <button
              v-for="t in todoItems"
              :key="t.label"
              class="flex items-center justify-between border-b border-border/60 py-1.5 text-left last:border-0 hover:bg-accent"
              @click="go(t)"
            >
              <span class="text-body text-muted-foreground">{{ t.label }}</span>
              <span class="text-sm font-medium" :class="t.value ? 'text-red-500' : 'text-emerald-600'">
                {{ t.value }}
              </span>
            </button>
            <div v-if="!todoItems.length" class="py-3 text-center text-xs text-muted-foreground">数据加载中</div>
          </div>
        </div>

        <div class="min-h-0 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <IconAlarm class="h-4 w-4 text-red-500" />最新活动报警
            </div>
            <button class="text-xs text-primary hover:underline" @click="go({ to: '/equipment/overview/alarm' })">
              报警中心
            </button>
          </div>
          <div class="mt-2 flex flex-col gap-1.5">
            <div v-for="a in alarms" :key="a.id" class="flex items-start gap-2">
              <span
                class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium"
                :class="LEVEL_TONE[a.level] ?? 'bg-muted text-muted-foreground'"
              >
                {{ a.level }}
              </span>
              <span class="min-w-0 flex-1 truncate text-body text-foreground">{{ a.msg }}</span>
              <span class="shrink-0 text-xs text-muted-foreground">{{ a.occurredAt.slice(5, 16) }}</span>
            </div>
            <div v-if="!alarms.length" class="py-3 text-center text-xs text-muted-foreground">当前暂无活动报警</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 模块九宫格 -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <button
        v-for="m in MODULES"
        :key="m.name"
        class="flex items-center gap-3 rounded-lg border border-border bg-card p-3.5 text-left shadow-sm transition-colors hover:bg-accent"
        @click="go(m)"
      >
        <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/12">
          <component :is="m.icon" class="h-5 w-5 text-primary" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-body font-medium text-foreground">{{ m.name }}</span>
          <span class="block truncate text-xs text-muted-foreground">{{ m.desc }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 首页四个数：与 carbon 首页同理，看板型大数字是这一页的视觉主体，
   写在局部类里而不是 text-[26px]（四档字阶是给表格/表单页的纪律）。 */
.home-num {
  margin-top: 2px;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--color-foreground);
  font-variant-numeric: tabular-nums;
}
.home-unit {
  margin-left: 4px;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-muted-foreground);
}
</style>
