<script setup lang="ts">
/**
 * EP0003 能源平衡表（模块五 · 附录 B5 版式 **V5 矩阵 · 月度必出报表**）
 *
 *  接口：`balanceApi.page`（`BalanceSheet[]`，一介质一张）· `balanceApi.run`（▶执行平衡分摊）
 *
 *  演示要点：**幕 6 的落点**——9 月平衡表 diff 标红 →「▶ 执行平衡分摊」归零，
 *  台词「月出平衡表是节能监察硬要求，系统一键」。
 *
 *  两条审计红线（写在文件头是因为**实现最容易在这里松手**）：
 *  ① 分摊只动「损失 / 平衡差」两列，**收入与消耗是计量来的硬数不许改**——
 *     这条在 `store.runBalance` 里守，页面的职责是把改动**标出来**：
 *     分摊后行上的 `loss`/`diff` 变、而 `income`/`consume` 纹丝不动，客户能对照；
 *  ② 已 `balanced` 的表再点 → store 回「已平，无残差可摊」，页面**不重复调用**，
 *     按钮直接置灰——置灰比点了弹错更清楚「这张表已经处理过」。
 *
 *  表结构：**行 = 工序（7 行）、列 = 收入/供应/转换/消耗/外供/损失/平衡差**。
 *  平衡差不为 0 的单元格**条件格式标红**——这张表的全部信息量就是「差在哪」，
 *  不标红客户要逐行心算。
 *
 *  待接入：介质切换（当前一次出一张表，七张表靠月度筛选切换）、分摊历史对比。
 */
import { computed, onMounted, ref, watch } from "vue";
import Button from "primevue/button";
import { balanceApi } from "@/api/energy";
import type { BalanceSheet } from "@/api/energy/types";
import { useToast } from "@/composables/useToast";
import { applyResult } from "../../rowActions";
import { emsHeaderTextClass, emsPanelClass } from "../../emsTheme";
import { useNameMaps } from "../../nameMaps";

const { toast } = useToast();
const { ready, unitMap, mediumMap } = useNameMaps();

const rows = ref<BalanceSheet[]>([]);
const busy = ref(false);
const month = ref("");

async function load() {
  try {
    const res = await balanceApi.page({ currentPage: 1, pageSize: 20, ...(month.value ? { month: month.value } : {}) });
    rows.value = res.rows;
  } catch {
    /* 拦截层已 toast */
  }
}

/**
 * ▶执行平衡分摊。
 *
 * **只对未平的表调用**：`store.runBalance` 自己也会拒（回「无残差可摊」），
 * 但按钮置灰 + 服务端二次拒绝是两道闸——第一道让客户看不见可点的错按钮，
 * 第二道兜住「另一个标签页已平过」的并发。
 */
async function run(sheet: BalanceSheet) {
  if (busy.value) return;
  busy.value = true;
  try {
    if (applyResult(await balanceApi.run(sheet.month), `已按规则完成 ${sheet.month} 分摊`, toast)) await load();
  } finally {
    busy.value = false;
  }
}

/** 矩阵的列定义：**顺序就是账的读法**（收 → 供 → 转 → 耗 → 外供 → 损 → 差）。
 *  `diff` 单独一列放最后并标红，是因为它是这张表唯一的结论。 */
const COLS = [
  { key: "income", label: "分配获得", hint: "入网量按受入占比分到本工序" },
  { key: "supply", label: "本工序入网", hint: "自产+购入+回收，信息列不参与差额" },
  { key: "convert", label: "转换", hint: "工序间转换（如煤气→蒸汽）" },
  { key: "consume", label: "消耗", hint: "计量来的硬数，分摊不许改" },
  { key: "exportOut", label: "外供", hint: "出厂到厂界外，支出侧" },
  { key: "loss", label: "损失", hint: "管损/放散，分摊的唯一可动列" },
] as const;

const fmt = (v: number | undefined) =>
  v === undefined || v === null ? "—" : Number(v).toLocaleString("zh-CN", { maximumFractionDigits: 0 });

/** 红格：平衡差 ≠ 0。**标红阈值不是 0**——浮点残差 ±1 以内视作平，
 *  否则账面上永远挂着一片红，真差异反而看不出来 */
const diffClass = (d: number | undefined) => {
  if (d === undefined) return "text-muted-foreground";
  if (Math.abs(d) <= 1) return "text-emerald-600 dark:text-emerald-400";
  return "text-red-600 dark:text-red-400 font-semibold";
};

/** 当前表（一次显示一张介质的表；多张时先给第一张并给切换） */
const current = computed(() => rows.value[0] ?? null);
/** 期别候选 */
const months = computed(() => [...new Set(rows.value.map((r) => r.month))]);

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
    <!-- 顶栏 -->
    <div class="flex shrink-0 items-center gap-4 rounded-md border border-border bg-card px-4 py-2">
      <span :class="emsHeaderTextClass">能源平衡表</span>
      <span class="text-xs text-muted-foreground">月度必出报表 · 行 = 工序 · 列 = 收/供/转/耗/外供/损/差</span>

      <select
        v-model="month"
        class="ml-auto h-8 rounded border border-border bg-background px-2 text-body text-foreground"
        @change="load"
      >
        <option value="">全部期别</option>
        <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
      </select>

      <button
        type="button"
        class="cursor-pointer rounded border px-3 py-1.5 text-body disabled:cursor-not-allowed disabled:opacity-40"
        :class="
          current?.balanced
            ? 'border-border text-muted-foreground'
            : 'border-primary/60 text-primary hover:bg-primary/10'
        "
        :disabled="busy || !current || current.balanced"
        @click="current && run(current)"
      >
        ▶ 执行平衡分摊
      </button>
      <span class="text-xs text-muted-foreground">
        {{ current ? (current.balanced ? `${current.month} 已平` : `${current.month} 有残差，点分摊归零`) : "加载中…" }}
      </span>
    </div>

    <!-- 主表：行 = 工序 -->
    <div class="min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card">
      <table v-if="current" class="w-full" style="font-size: 13px">
        <thead class="sticky top-0 bg-card">
          <tr class="text-muted-foreground">
            <th class="px-3 py-2 text-left font-normal">工序</th>
            <th v-for="c in COLS" :key="c.key" class="px-3 py-2 text-right font-normal" :title="c.hint">
              {{ c.label }}
            </th>
            <!-- 结论列单独表头，颜色即语义 -->
            <th class="px-3 py-2 text-right font-normal text-red-600 dark:text-red-400">平衡差</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in current.rows" :key="r.unitId" class="border-t border-border/60">
            <td class="px-3 py-2 text-foreground">{{ unitMap[r.unitId] ?? r.unitId }}</td>
            <td
              v-for="c in COLS"
              :key="c.key"
              class="px-3 py-2 text-right tabular-nums text-foreground"
              :title="c.hint"
            >
              {{ fmt((r as any)[c.key]) }}
            </td>
            <td class="px-3 py-2 text-right tabular-nums" :class="diffClass(r.diff)">
              {{ fmt(r.diff) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="border-t border-border text-foreground">
            <td class="px-3 py-2 text-xs text-muted-foreground">合计</td>
            <td v-for="c in COLS" :key="c.key" class="px-3 py-2 text-right tabular-nums">
              {{ fmt(current.rows.reduce((s, r) => s + ((r as any)[c.key] ?? 0), 0)) }}
            </td>
            <td
              class="px-3 py-2 text-right tabular-nums"
              :class="diffClass(current.rows.reduce((s, r) => s + (r.diff ?? 0), 0))"
            >
              {{ fmt(current.rows.reduce((s, r) => s + (r.diff ?? 0), 0)) }}
            </td>
          </tr>
        </tfoot>
      </table>
      <div v-else class="p-8 text-center text-sm text-muted-foreground">加载中…</div>
    </div>

    <!-- 介质名 + 分摊规则说明 -->
    <div class="shrink-0 rounded-md border border-border bg-card px-4 py-2 text-xs text-muted-foreground">
      <template v-if="current">
        <span class="text-foreground">{{ mediumMap[current.mediaCode] ?? current.mediaCode }}</span>
        · 单位 {{ current.unit }} ·
        <span
          :class="current.balanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'"
        >
          {{ current.balanced ? "已按规则分摊，差值归零" : "未分摊，差值为红" }}
        </span>
        <template v-if="current.balanceRule"> · 规则：{{ current.balanceRule }}</template>
      </template>
      <span class="ml-3">收入与消耗是计量硬数（分摊不改）· 损失与平衡差是分摊可动列</span>
    </div>
  </div>
</template>
