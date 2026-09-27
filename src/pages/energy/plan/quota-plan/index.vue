<script setup lang="ts">
/**
 * EP0001 定额与能源计划（模块五 · 附录 B5 版式 **V5 矩阵 / 上计划态 + 下定额表**）
 *
 *  接口：`planApi.page/status/recalc`（月度能源计划，B2-3 状态机）
 *        `quotaApi.page`（产品能源定额，工序 × 介质）
 *
 *  演示要点：**上半屏是「计划状态流转」、下半屏是「定额」——两件事一层楼**：
 *  定额是**口径**（一吨产品该用多少），计划是**本月要按这个口径干多少**。
 *  计划状态照 B2-3（编制中→已提交→已批准→执行中→已归档，已批准前可退回编制），
 *  每张计划卡给**当前状态下可点的下一档**——不可达的档不出现，
 *  比全画出来再置灰更清楚「下一步该干什么」（状态流转在 store 的 `PLAN_FLOW` 定义，
 *  页面只是按它显示，不自己推导下一档）。
 *
 *  下半屏的定额表是 V3 台账（`quotaApi.page`），列里的 `intensityUnit` 是
 *  **量纲后缀**（`m³/t铁` 这类）——同一列的单位可能不同（购入是绝对量、消耗是单耗），
 *  所以单位必须跟着行走，不能放进列头。
 *
 *  待接入：多介质定额联动、计划-实绩偏差雷达（等 EP0002 的实绩稳定后再挂）。
 */
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import ListPage from "../../ListPage.vue";
import { planApi, quotaApi } from "@/api/energy";
import type { EnergyPlan } from "@/api/energy/types";
import { useToast } from "@/composables/useToast";
import { applyResult } from "../../rowActions";
import { codeFmt, dashFmt, numFmt } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const router = useRouter();
const { toast } = useToast();
const { ready, unitMap, mediumMap } = useNameMaps();

/* ── 上半屏：月度计划与状态流转 ─────────────────────────────────────── */

const plans = ref<EnergyPlan[]>([]);
const busy = ref(false);

/** 下一档由 `PLAN_FLOW` 决定；页面只负责显示，**不自己推导可达性**。
 *  `已归档` 没有下一档——用 `Partial` 表达「可能没有」，比硬塞 undefined 类型诚实 */
const NEXT: Partial<Record<EnergyPlan["status"], EnergyPlan["status"]>> = {
  编制中: "已提交",
  已提交: "已批准",
  已批准: "执行中",
  执行中: "已归档",
};
/** 「已提交」可退回编制（B2-3 的退回支路） */
const BACK: Partial<Record<EnergyPlan["status"], EnergyPlan["status"]>> = { 已提交: "编制中" };

async function loadPlans() {
  try {
    const res = await planApi.page({ pageSize: 20 });
    plans.value = res.rows;
  } catch {
    /* 拦截层已 toast */
  }
}

/** 状态推进：拒绝（非法转移）由 store 判，这里只弹 msg、成功后重查 */
async function advance(p: EnergyPlan, to: EnergyPlan["status"]) {
  if (busy.value) return;
  busy.value = true;
  try {
    if (applyResult(await planApi.status(p.id, to), `计划已 ${to}`, toast)) await loadPlans();
  } finally {
    busy.value = false;
  }
}

async function recalc(p: EnergyPlan) {
  if (busy.value) return;
  busy.value = true;
  try {
    /* 重算系数 = 当前预测产量（store 内按 monthEffect 取），页面不传数——
       传了就等于页面能改生产预测口径，那是 model 的活 */
    if (applyResult(await planApi.recalc(p.id), "计划已按预测产量重算", toast)) await loadPlans();
  } finally {
    busy.value = false;
  }
}

/** 产量明细按工序给前 4 行——计划卡只回答「这个月主要产什么」，全量在详情里 */
const productsOf = (p: EnergyPlan) => p.products.slice(0, 4);

/* ── 下半屏：定额表（V3 台账）───────────────────────────────────── */

const listRef = ref<InstanceType<typeof ListPage> | null>(null);

const spec = computed<ListPageSpec>(() => ({
  code: "EP0001",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "定额号 / 产品 / 用能单元" },
    {
      key: "mediaCode",
      label: "介质",
      kind: "select",
      options: mediumOptions.value,
      valueMap: mediumValueMap.value,
      placeholder: "全部",
    },
    {
      key: "direction",
      label: "流向",
      kind: "select",
      options: ["购入", "自产", "转换", "消耗", "回收", "外供"],
      placeholder: "全部",
    },
    {
      key: "unitId",
      label: "用能单元",
      kind: "select",
      options: unitOptions.value,
      valueMap: unitValueMap.value,
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "id", headerName: "定额号", width: 110, pinned: "left" },
    { field: "unitId", headerName: "用能单元", width: 130, valueFormatter: codeFmt(unitMap.value) },
    { field: "product", headerName: "产品", width: 110 },
    { field: "mediaCode", headerName: "介质", width: 96, valueFormatter: codeFmt(mediumMap.value) },
    { field: "direction", headerName: "流向", width: 84 },
    { field: "intensity", headerName: "定额", width: 120, type: "numericColumn", valueFormatter: numFmt(3) },
    /* 单位跟行走：购入是绝对量（万/月）、消耗是单耗（m³/t铁），放列头会把两种量纲混在一个头下 */
    { field: "intensityUnit", headerName: "量纲", width: 110, valueFormatter: dashFmt },
    { field: "note", headerName: "备注", minWidth: 220, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  fetch: (q) => quotaApi.page(q),
  summary: ({ total, rows }) => {
    const buy = rows.filter((r: any) => r.direction === "购入").length;
    return `共 ${total} 条定额 · 购入向 ${buy} 条`;
  },
}));

const unitOptions = ref<string[]>([]);
const unitValueMap = ref<Record<string, string>>({});
const mediumOptions = ref<string[]>([]);
const mediumValueMap = ref<Record<string, string>>({});

/** 候选从 nameMaps 的两张表现造（它们已是 id→名 / 码→名的真源），不另发请求 */
/**
 * `unitMap`/`mediumMap` 是 `id(码) → 名`。下拉要的是：
 * `options` = 展示名、`valueMap` = **名 → 码**（`ListPage.buildParams` 送请求时按 `valueMap` 翻）。
 * 早先写成两跳对调，翻出来还是 id→name，筛出 0 行却看着"没报错"。
 */
function buildOptions() {
  unitOptions.value = Object.values(unitMap.value);
  unitValueMap.value = Object.fromEntries(Object.entries(unitMap.value).map(([id, name]) => [name, id]));
  mediumOptions.value = Object.values(mediumMap.value);
  mediumValueMap.value = Object.fromEntries(Object.entries(mediumMap.value).map(([code, name]) => [name, code]));
}

onMounted(() => {
  void loadPlans();
  void buildOptions();
});
watch(
  ready,
  (v) => {
    if (v) {
      buildOptions();
      listRef.value?.reload();
    }
  },
  { once: true },
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上半屏：计划状态流转（B2-3）-->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="mb-1.5 flex items-center gap-3">
        <span class="text-xs font-medium">月度能源计划</span>
        <span class="text-xs text-muted-foreground">
          状态机：编制中 → 已提交 → 已批准 → 执行中 → 已归档（已批准前可退回编制）
        </span>
      </div>
      <div class="flex flex-wrap gap-2">
        <div v-for="p in plans" :key="p.id" class="min-w-72 rounded border border-border/70 bg-card/60 px-3 py-2">
          <div class="flex items-baseline gap-2">
            <span class="text-body font-medium">{{ p.id }}</span>
            <span
              class="ml-auto rounded px-1.5 py-0.5 text-xs"
              :class="
                p.status === '已归档'
                  ? 'bg-muted text-muted-foreground'
                  : p.status === '编制中'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
              "
            >
              {{ p.status }}
            </span>
          </div>
          <div class="mt-1 text-xs text-muted-foreground">
            编制 {{ p.createdBy }}<template v-if="p.approvedBy"> · 批准 {{ p.approvedBy }}</template> · 产品
            {{ p.products.length }} 项 · 计划项 {{ p.items.length }} 条
          </div>
          <div class="mt-1 truncate text-xs text-muted-foreground">
            产量：{{
              productsOf(p)
                .map((x) => `${x.product} ${(x.outputT * 10000).toLocaleString("zh-CN")}t`)
                .join(" / ")
            }}
          </div>
          <div class="mt-1.5 flex gap-2">
            <Button
              v-if="NEXT[p.status]"
              variant="outlined"
              :disabled="busy"
              :label="`推进 ${NEXT[p.status]}`"
              @click="advance(p, NEXT[p.status]!)"
            />
            <Button
              v-if="BACK[p.status]"
              variant="text"
              severity="secondary"
              :disabled="busy"
              :label="`退回 ${BACK[p.status]}`"
              @click="advance(p, BACK[p.status]!)"
            />
            <Button
              v-if="p.status === '编制中'"
              variant="text"
              severity="secondary"
              :disabled="busy"
              label="按预测产量重算"
              @click="recalc(p)"
            />
            <Button variant="text" label="定额口径" @click="router.push('/energy/plan/quota-plan')" />
          </div>
        </div>
        <div v-if="!plans.length" class="px-2 py-4 text-xs text-muted-foreground">计划加载中…</div>
      </div>
    </div>

    <!-- 下半屏：产品能源定额（工序 × 介质 单耗定额）-->
    <div class="min-h-0 flex-1 overflow-hidden">
      <ListPage ref="listRef" :spec="spec" />
    </div>
  </div>
</template>
