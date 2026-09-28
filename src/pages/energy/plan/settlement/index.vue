<script setup lang="ts">
/**
 * EP0004 成本与结算（模块五 · 附录 B5 版式 **V6 流程工单 · B2-5 状态机**）
 *
 *  接口：`settlementApi.page/generate/status`
 *
 *  演示要点：**幕 7 的钱**——「▶ 生成本月结算」把实绩 × 单价（峰谷按分时段电量）
 *  变成一张张成本中心结算单；状态照 B2-5（已生成 → 已核对 → 已定稿）。
 *
 *  **定稿是全站最硬的一道门**：一旦 `已定稿`，该月实绩**禁止再校正**
 *  （`store.correctActual`/`recalcActual` 会直接拒）。所以定稿按钮给**确认文案**、
 *  而且把后果写进去——「锁定该月实绩，之后不可再校正」。客户看到这句话才敢点，
 *  也才知道这个系统是真锁不是嘴上锁。
 *
 *  **状态列要读得出「下一步」**：三档各给一个可点动作（核对/定稿），
 *  已定稿的行**不给任何动作**——全灰一排按钮不如没有按钮，
 *  没有按钮就是在说「这条路走完了」。
 *
 *  待接入：峰谷电价明细展开（电价模板在 EG0003 维护，此处只读它的结果）。
 */
import { computed, onMounted, ref, watch } from "vue";
import { settlementApi } from "@/api/energy";
import type { SettlementBill } from "@/api/energy/types";
import { useToast } from "@/composables/useToast";
import { applyResult } from "../../rowActions";
import { emsHeaderTextClass, emsPanelClass } from "../../emsTheme";
import { useNameMaps } from "../../nameMaps";

const { toast } = useToast();
const { ready, unitMap, mediumMap } = useNameMaps();

const rows = ref<SettlementBill[]>([]);
const busy = ref(false);
const month = ref("");

/** 期别候选（账期下拉）——从已加载的结算单现算，不另开请求 */
const months = computed(() => [...new Set(rows.value.map((r) => r.month))].toReversed());

async function load() {
  try {
    const res = await settlementApi.page({
      currentPage: 1,
      pageSize: 50,
      ...(month.value ? { month: month.value } : {}),
    });
    rows.value = res.rows;
  } catch {
    /* 拦截层已 toast */
  }
}

/** ▶生成本月结算（幕 7）。已定稿的月 store 会拒（回「不再整批重生成」） */
async function generate() {
  if (busy.value) return;
  busy.value = true;
  try {
    if (applyResult(await settlementApi.generate(month.value || undefined), "结算单已生成", toast)) await load();
  } finally {
    busy.value = false;
  }
}

/** 状态推进。定稿带后果文案——见文件头 */
async function advance(b: SettlementBill, to: SettlementBill["status"], confirmText?: string) {
  if (busy.value) return;
  if (confirmText && !window.confirm(confirmText)) return;
  busy.value = true;
  try {
    if (applyResult(await settlementApi.status(b.id, to), `${b.id} ${to}`, toast)) await load();
  } finally {
    busy.value = false;
  }
}

const FLOW: Record<SettlementBill["status"], SettlementBill["status"]> = {
  已生成: "已核对",
  已核对: "已定稿",
  已定稿: undefined as unknown as SettlementBill["status"],
};
const nextOf = (s: SettlementBill["status"]) => FLOW[s];

const STATUS_TONE: Record<string, string> = {
  已生成: "bg-sky-500/15 text-primary",
  已核对: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  已定稿: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
};

const fmtY = (v: number) => v.toLocaleString("zh-CN", { maximumFractionDigits: 0 });

/** 合计：**已核对与已生成才算「待确认的敞口」**，已定稿是既成事实 */
const summary = computed(() => {
  const all = rows.value;
  const locked = all.filter((r) => r.status === "已定稿");
  const open = all.filter((r) => r.status !== "已定稿");
  return {
    count: all.length,
    total: all.reduce((s, r) => s + r.total, 0),
    openCount: open.length,
    openTotal: open.reduce((s, r) => s + r.total, 0),
    lockedCount: locked.length,
  };
});

onMounted(() => void load());
watch(
  ready,
  (v) => {
    if (v) void load();
  },
  { once: true },
);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col gap-2 p-3">
    <!-- 顶栏：生成动作 + 期别 + 汇总 -->
    <div class="flex shrink-0 flex-wrap items-center gap-4 rounded-md border border-border bg-card px-4 py-2">
      <span :class="emsHeaderTextClass">能源成本与结算</span>
      <span class="text-xs text-muted-foreground">状态机：已生成 → 已核对 → 已定稿（定稿后锁死该月实绩）</span>

      <select
        v-model="month"
        class="h-8 rounded border border-border bg-background px-2 text-body text-foreground"
        @change="load"
      >
        <option value="">默认账期</option>
        <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
      </select>

      <button
        type="button"
        class="cursor-pointer rounded border border-primary/60 px-3 py-1.5 text-body text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="busy"
        @click="generate"
      >
        ▶ 生成本月结算
      </button>

      <span class="ml-auto text-xs text-muted-foreground">
        共 {{ summary.count }} 张 · 合计 ¥{{ fmtY(summary.total) }} · 未定稿 {{ summary.openCount }} 张（¥{{
          fmtY(summary.openTotal)
        }}）
      </span>
    </div>

    <!-- 结算单列表 -->
    <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
      <table class="w-full" style="font-size: 13px">
        <thead class="sticky top-0 bg-card">
          <tr class="text-muted-foreground">
            <th class="px-3 py-2 text-left font-normal">结算单</th>
            <th class="px-3 py-2 text-left font-normal">账期</th>
            <th class="px-3 py-2 text-left font-normal">成本中心</th>
            <th class="px-3 py-2 text-left font-normal">明细项</th>
            <th class="px-3 py-2 text-right font-normal">需量+力调</th>
            <th class="px-3 py-2 text-right font-normal">合计 元</th>
            <th class="px-3 py-2 text-left font-normal">状态</th>
            <th class="px-3 py-2 text-left font-normal">动作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in rows" :key="b.id" class="border-t border-border/60">
            <td class="px-3 py-2 text-foreground">{{ b.id }}</td>
            <td class="px-3 py-2 text-foreground tabular-nums">{{ b.month }}</td>
            <td class="px-3 py-2 text-foreground">{{ unitMap[b.unitId] ?? b.unitId }}</td>
            <td class="px-3 py-2 text-muted-foreground">
              {{ b.items.map((i) => `${mediumMap[i.mediaCode] ?? i.mediaCode} ${fmtY(i.amount)}`).join(" · ") }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums text-muted-foreground">{{ fmtY(b.extraFee) }}</td>
            <td class="px-3 py-2 text-right tabular-nums font-semibold text-foreground">{{ fmtY(b.total) }}</td>
            <td class="px-3 py-2">
              <span class="rounded px-1.5 py-0.5 text-xs" :class="STATUS_TONE[b.status]">{{ b.status }}</span>
            </td>
            <!-- 已定稿的行不给任何按钮：没有按钮就是在说「这条路走完了」 -->
            <td class="px-3 py-2">
              <span v-if="!nextOf(b.status)" class="text-xs text-muted-foreground">已锁定</span>
              <button
                v-else
                type="button"
                class="cursor-pointer rounded border border-border px-2 py-0.5 text-xs text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="busy"
                :title="nextOf(b.status) === '已定稿' ? '锁定后该月实绩禁止再校正' : ''"
                @click="
                  advance(
                    b,
                    nextOf(b.status)!,
                    nextOf(b.status) === '已定稿' ? '确认定稿？定稿后该月实绩与结算锁定，不可再校正。' : undefined,
                  )
                "
              >
                {{ nextOf(b.status) }}
              </button>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="8" class="px-3 py-8 text-center text-sm text-muted-foreground">
              {{ busy ? "处理中…" : "暂无结算单。点上方「▶ 生成本月结算」。" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 状态机说明 -->
    <div class="shrink-0 rounded-md border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
      已生成（系统按实绩 × 单价出单）→ 已核对（成本中心确认）→ 已定稿（**锁定，不可再改实绩**）· 当前未定稿
      {{ summary.openCount }} 张 · 已定稿 {{ summary.lockedCount }} 张
      <span class="ml-3">定稿门控在 store：`correctActual`/`recalcActual` 对已定稿月直接拒</span>
    </div>
  </div>
</template>
