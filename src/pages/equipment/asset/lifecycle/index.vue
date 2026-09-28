<script setup lang="ts">
/** 对应 AE0003 生命周期档案（模块二 设备台账 · 附录 B5 版式 L3 时间轴）
 *  接口：equipmentApi.list（选设备）+ equipmentApi.detail（GET /eam/equipment/detail，
 *        一次给 events / workOrders / lifeRecords / docs 四块，页面不再各拉一遍）
 *  演示要点：**一台设备的一生是一条线，不是一张表**——采购→安装→调试→投运是每台都同构的四步，
 *        真正要讲的是后面那几笔：维修/大修/改造。它们**不是手填的**：主线第 7 幕在工单上点
 *        「验证通过」，`closeWorkOrder` 会往这张时间轴上追加一条「维修」（refDocNo=工单号），
 *        所以这一页同时是**联动效果的验证件**——改完工单回到这里，多出来的那行就是证据。
 *        右侧两块（关联工单 / 在装寿命件）是「挂工单、挂备件记录」的落点：档案不是孤立的表，
 *        它的每一笔都能追到单据号。
 *  待接入：无。 */
import { computed, onMounted, ref, watch } from "vue";
import Select from "primevue/select";
import { equipmentApi } from "@/api/equipment";
import type { EquipmentDetail, LifecycleEvent } from "@/api/equipment/types";
import { TAG_CLASS } from "../../cells";
import { useNameMaps } from "../../nameMaps";

const TYPES = ["采购", "安装", "调试", "投运", "维修", "大修", "改造", "报废"];

/** 备件名走 `nameMaps` 的缓存表（`LifeRecord.spId` 是外键），这里不是 AG Grid，
 *  缓存后到也会自动重渲染，不需要重查 */
const { partName } = useNameMaps();
const equips = ref<Array<{ label: string; value: string }>>([]);
const eqId = ref("");
const type = ref("");
const detail = ref<EquipmentDetail | null>(null);
const loading = ref(false);

async function load() {
  if (!eqId.value) return;
  loading.value = true;
  try {
    detail.value = await equipmentApi.detail(eqId.value);
  } catch {
    detail.value = null;
  }
  loading.value = false;
}

onMounted(async () => {
  try {
    const list = (await equipmentApi.list()) ?? [];
    equips.value = list.map((e) => ({ label: `${e.name}（${e.model}）`, value: e.id }));
    // 默认落在主线剧本那台电机上：轴承 55 分、有一次大修一次维修，时间轴一上来就有内容
    eqId.value = list.some((e) => e.id === "EQ-BR-F4-02") ? "EQ-BR-F4-02" : (list[0]?.id ?? "");
    await load();
  } catch {
    /* 拦截层已 toast */
  }
});

watch(eqId, load);

/** 事件按时间倒序（最近一笔在最上面，符合「履历」的阅读方向）；类型筛选在前端做，一次请求已经拿全 */
const events = computed<LifecycleEvent[]>(() => {
  const evs = [...(detail.value?.events ?? [])].toSorted((a, b) => (a.at < b.at ? 1 : -1));
  return type.value ? evs.filter((e) => e.type === type.value) : evs;
});

/** 四类同构事件（采购/安装/调试/投运）是每台都一样的底账，看趋势时不想被它们淹没 */
const baseOnly = computed(() => events.value.filter((e) => !["维修", "大修", "改造", "报废"].includes(e.type)).length);

const counts = computed(() => {
  const by = new Map<string, number>();
  for (const e of detail.value?.events ?? []) by.set(e.type, (by.get(e.type) ?? 0) + 1);
  return TYPES.filter((t) => by.has(t)).map((t) => ({ type: t, n: by.get(t) ?? 0 }));
});

/** 圆点色沿用 `TAG_CLASS` 的词表：同一个词在列表页、时间轴、状态标三处必须一个颜色 */
function dotOf(t: string): string {
  const cls = TAG_CLASS[t] ?? "";
  if (cls.includes("emerald")) return "bg-emerald-500";
  if (cls.includes("sky")) return "bg-sky-500";
  if (cls.includes("amber")) return "bg-amber-500";
  if (cls.includes("red")) return "bg-red-500";
  return "bg-muted-foreground/50";
}

const orders = computed(() =>
  [...(detail.value?.workOrders ?? [])].toSorted((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
);
const lives = computed(() => detail.value?.lifeRecords ?? []);
const docs = computed(() => detail.value?.docs ?? []);

/** 投运至今多久：档案页要能一句话回答「这台设备服役几年了」 */
const sinceCommission = computed(() => {
  const at = detail.value?.eq.commissionedAt;
  if (!at) return "";
  const days = Math.floor((Date.parse("2026-09-27T00:00:00") - Date.parse(`${at}T00:00:00`)) / 86400000);
  return `${Math.floor(days / 365)} 年 ${Math.floor((days % 365) / 30)} 个月`;
});
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 条件区只有两个：按 ui-rules §6 同行摆放、不写 label，靠 placeholder 说明 -->
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <Select
          v-model="eqId"
          :options="equips"
          option-label="label"
          option-value="value"
          filter
          placeholder="选设备"
          class="w-72 shrink-0"
        />
        <Select v-model="type" :options="TYPES" show-clear placeholder="全部事件" class="w-32 shrink-0" />
        <span v-if="baseOnly" class="text-xs text-muted-foreground"
          >其中同构底账（采购/安装/调试/投运）{{ baseOnly }} 笔</span
        >
        <span class="ml-auto text-xs text-muted-foreground">共 {{ events.length }} 笔履历</span>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div v-if="loading" class="text-xs text-muted-foreground">读取中…</div>
        <div v-else-if="!detail" class="text-xs text-muted-foreground">选一台设备，看它从合同到报废的整条线。</div>

        <template v-else>
          <ol class="relative space-y-5 border-l border-border/60 pl-5">
            <li v-for="e in events" :key="e.id" class="relative">
              <span
                class="absolute -left-[27px] top-1 h-2.5 w-2.5 rounded-full ring-2 ring-background"
                :class="dotOf(e.type)"
              />
              <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span class="text-body tabular-nums">{{ e.at }}</span>
                <span class="text-xs text-muted-foreground">{{ e.type }}</span>
                <span v-if="e.refDocNo" class="rounded bg-muted px-1.5 py-0.5 text-xs">{{ e.refDocNo }}</span>
              </div>
              <p class="mt-0.5 text-body">{{ e.note }}</p>
            </li>
          </ol>
          <p v-if="!events.length" class="text-xs text-muted-foreground">这个类型下没有记录。</p>
        </template>
      </div>
    </div>

    <!-- 右：档案摘要 + 挂在这台设备上的单据（工单 / 寿命件 / 资料） -->
    <aside class="flex w-80 shrink-0 flex-col border-l border-border/60">
      <div class="flex h-9 shrink-0 items-center border-b border-border/60 px-3">
        <span class="text-xs text-muted-foreground">档案与关联单据</span>
      </div>
      <div class="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <div v-if="!detail" class="text-xs text-muted-foreground">未选设备。</div>
        <template v-else>
          <section class="space-y-1.5">
            <div class="text-sm font-medium">{{ detail.eq.name }}</div>
            <div class="text-xs text-muted-foreground">{{ detail.eq.model }} · {{ detail.eq.id }}</div>
            <dl class="space-y-1 text-xs">
              <div class="flex justify-between gap-2">
                <dt class="text-muted-foreground">分级 / 状态</dt>
                <dd>{{ detail.eq.level }} 类 · {{ detail.eq.status }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted-foreground">投运至今</dt>
                <dd>{{ sinceCommission }}</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted-foreground">累计运行</dt>
                <dd>{{ detail.eq.runHours.toLocaleString("zh-CN") }} h</dd>
              </div>
              <div class="flex justify-between gap-2">
                <dt class="text-muted-foreground">健康度</dt>
                <dd>{{ detail.eq.health }} / 100</dd>
              </div>
            </dl>
          </section>

          <section class="space-y-1.5 border-t border-border/60 pt-3">
            <div class="text-xs text-muted-foreground">履历构成</div>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="c in counts" :key="c.type" class="rounded bg-muted px-1.5 py-0.5 text-xs">
                {{ c.type }} {{ c.n }}
              </span>
            </div>
          </section>

          <section class="space-y-2 border-t border-border/60 pt-3">
            <div class="text-xs text-muted-foreground">关联工单 {{ orders.length }} 张</div>
            <ul v-if="orders.length" class="space-y-1.5">
              <li v-for="w in orders.slice(0, 6)" :key="w.id" class="text-xs">
                <div class="flex items-baseline gap-2">
                  <span class="min-w-0 flex-1 truncate text-body">{{ w.title }}</span>
                  <span class="shrink-0 text-muted-foreground">{{ w.status }}</span>
                </div>
                <div class="text-muted-foreground">{{ w.id }} · {{ w.createdAt.slice(0, 10) }}</div>
              </li>
            </ul>
            <p v-else class="text-xs text-muted-foreground">还没有工单。</p>
          </section>

          <section class="space-y-2 border-t border-border/60 pt-3">
            <div class="text-xs text-muted-foreground">在装寿命件 {{ lives.length }} 件</div>
            <ul v-if="lives.length" class="space-y-1.5">
              <li v-for="l in lives" :key="l.serial" class="text-xs">
                <div class="flex items-baseline gap-2">
                  <span class="min-w-0 flex-1 truncate text-body">{{ partName(l.spId) }}</span>
                  <span class="shrink-0 text-muted-foreground">{{ l.status }}</span>
                </div>
                <div class="text-muted-foreground">
                  {{ l.serial }} · 已用 {{ Math.round(l.usedHours) }} / {{ l.lifeLimitHours }} h
                </div>
              </li>
            </ul>
            <p v-else class="text-xs text-muted-foreground">这台设备上没有纳入寿命考核的备件在装。</p>
          </section>

          <section v-if="docs.length" class="space-y-1.5 border-t border-border/60 pt-3">
            <div class="text-xs text-muted-foreground">随机资料 {{ docs.length }} 份</div>
            <ul class="space-y-1">
              <li v-for="d in docs" :key="d.id" class="truncate text-xs text-muted-foreground">{{ d.name }}</li>
            </ul>
          </section>
        </template>
      </div>
    </aside>
  </div>
</template>
