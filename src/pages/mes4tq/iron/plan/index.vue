<script setup lang="ts">
/** 对应 TM0001 出铁计划（铁水调度 · 附录 A3 版式 **L7 流程看板**）
 *
 *  接口：`tappingPlanApi.page`（计划数据）· `tappingPlanApi.flow`（列头计数）
 *        `tappingPlanApi.furnaces`（高炉下拉）
 *
 *  演示要点：**S5 出铁计划状态机只有四档**（计划 → 出铁中 → 已完成，未开始可已取消），
 *  所以看板是**四列**而不是像 TQ0002 那样的七列——状态机有几档就摆几列，
 *  摆八列其中四列永远是空的，比四列更难看。
 *
 *  **一个铁次 = 一次出铁**（B11 第 2 条）：卡片上的「第 N 铁次」与
 *  TM0003 台账里的 `tapNo` 是同一个号，两页对得上。
 *  同一天同一炉只有一个「第 3 铁次」，跨天重号——这是现场做法，不是 bug
 *  （铁次是「今天的第几次出铁」，不是全局流水）。
 *
 *  **计划里不写实重**：`actualWeight` 只在 `已完成` 的卡片上出现。
 *  未出完铁水就显示「已装 320t」，等于把结果写进了计划，客户会当场问
 *  「还没出铁怎么有实重」（数据层已按状态留空，见 `data/iron.ts`）。
 *
 *  「已取消」的卡片必须给出原因（备注里有），否则客户会问「为什么取消」。
 *
 *  待接入：下达、取消、改期（本域只查桩——所以卡片不给操作按钮）。
 */
import { computed, onMounted, ref, watch } from "vue";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { tappingPlanApi } from "@/api/mes4tq";
import type { TappingPlan } from "@/api/mes4tq/types";
import DetailDialog from "../../DetailDialog.vue";
import type { DetailSection } from "../../listTypes";

/** S5 的四档，顺序即状态机顺序 */
const COLUMNS = ["计划", "出铁中", "已完成", "已取消"] as const;

const loading = ref(true);
const counts = ref<Record<string, number>>({});
const rows = ref<TappingPlan[]>([]);
const furnaces = ref<Array<{ id: string; name: string; spec: string }>>([]);
/** `Select` 要 `{label, value}`；选项从数据取而不是写死（写死会筛出 0 行） */
const furnaceOptions = computed(() => furnaces.value.map((f) => ({ label: f.name, value: f.id })));
const model = ref<Record<string, any>>({ keyword: "", furnaceId: "", destination: "" });

const grouped = computed(() => {
  const by: Record<string, TappingPlan[]> = {};
  for (const c of COLUMNS) by[c] = [];
  for (const r of rows.value) (by[r.status] ??= []).push(r);
  return by;
});

async function load() {
  loading.value = true;
  try {
    const [flow, res] = await Promise.all([
      tappingPlanApi.flow(),
      tappingPlanApi.page({ ...model.value, pageSize: 500 }),
    ]);
    counts.value = flow;
    rows.value = res.rows;
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

function reset() {
  model.value = { keyword: "", furnaceId: "", destination: "" };
  void load();
}

/* ── 详情 ────────────────────────────────────────────── */

const detailOpen = ref(false);
const detailData = ref<Record<string, any> | null>(null);

const SECTIONS: DetailSection[] = [
  {
    title: "铁次信息",
    fields: [
      { label: "计划号", from: "id" },
      { label: "高炉", from: "furnaceId" },
      { label: "铁次", from: "tapNo" },
      { label: "预计出铁时间", from: "tapTime" },
      { label: "出铁口", from: "tapHole" },
      { label: "预计出铁量 t", from: "estimatedWeight" },
      { label: "去向", from: "destination" },
      { label: "状态", from: "status" },
    ],
  },
  {
    /* 实重只在已完成时有值——**计划里不该有实重**，见文件头说明 */
    title: "执行结果（完成后回填）",
    fields: [
      { label: "实装罐号", from: "ladleId" },
      { label: "实际出铁量 t", from: "actualWeight" },
      { label: "取消/备注", from: "remark" },
    ],
  },
];

async function openDetail(row: TappingPlan) {
  try {
    detailData.value = await tappingPlanApi.detail(row.id);
  } catch {
    detailData.value = row;
  }
  detailOpen.value = true;
}

/** 已完成的铁次可下钻到过磅台账（同一 `tapNo`，两页必须对得上） */
const weighOpen = ref(false);
const weighText = ref("");

async function openWeigh(row: TappingPlan) {
  try {
    const res = await import("@/api/mes4tq").then((m) => m.tappingActualApi.page({ keyword: row.id, pageSize: 10 }));
    const hit = res.rows.find((a) => a.tappingPlanId === row.id);
    weighText.value = hit
      ? `铁次 ${hit.tapNo} · ${hit.ladleId} · 磅重 ${hit.weight} t · 过磅温度 ${hit.temperature}℃ · 温降 ${hit.tempDrop}℃ · 去向 ${hit.destination}`
      : "该铁次还没有过磅回传（计量系统未返回）";
  } catch {
    weighText.value = "过磅查询失败（拦截层已提示）";
  }
  weighOpen.value = true;
}

/** 高炉下拉候选（从数据取，不写死——写死会出现筛出 0 行的选项） */
async function loadOptions() {
  try {
    furnaces.value = await tappingPlanApi.furnaces();
  } catch {
    /* 拦截层已 toast */
  }
}

watch(
  () => model.value,
  () => void load(),
  { deep: true },
);

onMounted(() => {
  void load();
  void loadOptions();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 条件区：高炉 / 去向 / 关键词 -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <InputText
        v-model="model.keyword"
        class="w-56 shrink-0"
        placeholder="计划号 / 高炉 / 罐号 / 出铁口"
        @keydown.enter="load"
      />
      <Select v-model="model.furnaceId" :options="furnaceOptions" show-clear placeholder="高炉" class="w-36 shrink-0" />
      <Select
        v-model="model.destination"
        :options="['炼钢1#', '炼钢2#', '铸铁']"
        show-clear
        placeholder="去向"
        class="w-32 shrink-0"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="load">查询</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">重置</Button>
      <span class="ml-auto text-xs text-muted-foreground">
        {{ rows.length }} 条计划 · 一个铁次 = 一次出铁，与过磅台账同号
      </span>
    </div>

    <!-- 四列看板 -->
    <div class="min-h-0 flex-1 overflow-x-auto p-3">
      <div class="flex min-w-max gap-3">
        <div v-for="(c, i) in COLUMNS" :key="c" class="flex w-72 shrink-0 flex-col">
          <div
            class="mb-2 flex items-center gap-2 rounded border px-2.5 py-1.5"
            :class="
              c === '已完成'
                ? 'border-emerald-500/50 bg-emerald-500/10'
                : c === '出铁中'
                  ? 'border-sky-500/50 bg-sky-500/10'
                  : c === '已取消'
                    ? 'border-border/70 bg-muted/50'
                    : 'border-border/70 bg-card'
            "
          >
            <span class="text-body font-medium">{{ i + 1 }}. {{ c }}</span>
            <span
              class="ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums"
              :class="(counts[c] ?? 0) ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'"
            >
              {{ counts[c] ?? 0 }}
            </span>
          </div>
          <span v-if="i < COLUMNS.length - 1" class="mb-1 text-xs text-muted-foreground">↓</span>

          <div class="flex min-h-24 flex-col gap-2">
            <button
              v-for="r in grouped[c]"
              :key="r.id"
              type="button"
              class="cursor-pointer rounded border border-border/70 bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/60"
              @click="openDetail(r)"
            >
              <div class="flex items-baseline gap-2">
                <span class="text-body font-medium">{{ r.furnaceId }} · 第 {{ r.tapNo }} 铁次</span>
                <span class="ml-auto text-xs text-muted-foreground">{{ r.tapHole }}</span>
              </div>
              <div class="mt-0.5 text-xs text-muted-foreground">
                {{ r.tapTime.slice(5, 16) }} · 预计 {{ r.estimatedWeight }} t
              </div>
              <div class="mt-0.5 flex items-center gap-2 text-xs">
                <span class="text-muted-foreground">去向 {{ r.destination }}</span>
                <!-- 实重只在已完成时出现；未完成的行上是 undefined，不会显示 0 -->
                <span v-if="r.actualWeight" class="text-emerald-600 dark:text-emerald-400"
                  >实重 {{ r.actualWeight }} t</span
                >
                <span v-if="r.ladleId" class="text-primary">{{ r.ladleId }}</span>
              </div>
              <div v-if="r.remark" class="mt-0.5 truncate text-xs text-amber-600 dark:text-amber-400">
                {{ r.remark }}
              </div>
              <div class="mt-1 flex gap-3">
                <span v-if="c === '已完成'" class="text-xs text-primary hover:underline" @click.stop="openWeigh(r)">
                  看过磅
                </span>
                <span class="text-xs text-muted-foreground">详情 →</span>
              </div>
            </button>

            <div
              v-if="!grouped[c]?.length"
              class="rounded border border-dashed border-border/70 px-2.5 py-4 text-center text-xs text-muted-foreground"
            >
              {{ loading ? "加载中…" : "暂无" }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <DetailDialog v-model:open="detailOpen" :sections="SECTIONS" :data="detailData" />

    <Dialog v-model:visible="weighOpen" modal header="过磅回传" :style="{ width: 'min(40rem, calc(100vw - 2rem))' }">
      <div class="py-2 text-body leading-6">{{ weighText }}</div>
      <template #footer>
        <Button label="关闭" variant="outlined" autofocus @click="weighOpen = false" />
      </template>
    </Dialog>
  </div>
</template>
