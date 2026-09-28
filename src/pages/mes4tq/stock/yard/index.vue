<script setup lang="ts">
/** 对应 TS0004 料场可视化（物料与库存 · 附录 A3 版式 **自绘 料条图**）
 *
 *  接口：`yardApi.piles`（一次全给，不分页）
 *
 *  演示要点：**这一页不套 `ListPage`——它要的是「一眼看出厂里还剩多少矿」**，
 *  而那是一张**位置图**不是一张表：六条料条画成六行、
 *  每个堆按 `beginPos`/`endPos`（料条上的 0~100% 位置）铺在对应百分比处。
 *  客户扫一眼就知道「L02 那条满了、L05 是空的」，这在表里要逐行读吨位才拼得出来。
 *
 *  **两处刻意的取舍**：
 *  1. **不分页**——料场图画的是整片厂区，分页拼不出一张图（见 `routes/stock.ts`）；
 *  2. **「已取空」的堆 qty = 0**（数据层已保证）——一个取空了还显示 1200t 的堆，
 *     会让料场图的总账与收发存对不上，而这正是这张图要证明的事。
 *
 *  料种色从**物料组**取（矿石/熔剂/辅料），不是每堆各给一个色：
 *  颜色用于**归类**而不是标记个体，否则 24 个堆会有 12 种颜色，图例就废了。
 *
 *  待接入：堆位分配、取料计划（本域只查桩）。
 */
import { computed, onMounted, ref } from "vue";
import { yardApi } from "@/api/mes4tq";
import type { YardPile } from "@/api/mes4tq/types";

const piles = ref<YardPile[]>([]);
const materialNames = ref<Record<string, string>>({});
const materialGroups = ref<Record<string, string>>({});
/** 料条按 `stripNo` 分组，行序按料条号（不按数组顺序——图上的行序必须稳定） */
const strips = ref<Array<{ stripNo: string; piles: YardPile[] }>>([]);
const selected = ref<YardPile | null>(null);
const loading = ref(true);

/**
 * 物料组 → 颜色。**只按组给色**（矿石蓝 / 熔剂琥珀 / 煤炭灰 / 辅料绿 / 其余紫），
 * 不给每个料一个色——24 个堆若 12 种颜色，图例就失去了「归类」的意义，
 * 而归类恰恰是料场管理要看的（哪条料条上是矿、哪条是熔剂）。
 */
const GROUP_COLOR: Record<string, string> = {
  矿石: "#60A5FA",
  熔剂: "#F59E0B",
  煤炭: "#94A3B8",
  辅料: "#22C55E",
  焦炭: "#F97316",
};

function colorOf(p: YardPile): string {
  const g = materialGroups.value[p.materialId] ?? "";
  return GROUP_COLOR[g] ?? "#A78BFA";
}

/** 料种图例：只列**图上真的有的**组，不列死字典（否则会出现图上没有的颜色） */
const legend = computed(() => {
  const seen = new Map<string, string>();
  for (const p of piles.value) {
    const g = materialGroups.value[p.materialId] ?? "其他";
    if (!seen.has(g)) seen.set(g, GROUP_COLOR[g] ?? "#A78BFA");
  }
  return [...seen.entries()];
});

/** 选中的堆的信息条 */
const totalQty = computed(() => piles.value.reduce((s, p) => s + p.qty, 0));
const freeBands = computed(() =>
  strips.value.map((s) => ({
    stripNo: s.stripNo,
    free: 100 - s.piles.reduce((a, p) => a + (p.endPos - p.beginPos), 0),
  })),
);

onMounted(async () => {
  try {
    const [list, mats] = await Promise.all([yardApi.piles(), import("@/api/mes4tq").then((m) => m.materialApi.list())]);
    piles.value = list;
    for (const m of mats) {
      materialNames.value[m.id] = m.name;
      materialGroups.value[m.id] = m.group;
    }
    /* 按 stripNo 分组 + 按 beginPos 排——**图上的位置必须与数据一致**，
       不排的话同一条料条上的堆会互相叠，看起来像数据错乱 */
    const by = new Map<string, YardPile[]>();
    for (const p of list) by.set(p.stripNo, [...(by.get(p.stripNo) ?? []), p]);
    strips.value = [...by.entries()]
      .toSorted((a, b) => a[0].localeCompare(b[0]))
      .map(([stripNo, ps]) => ({ stripNo, piles: ps.toSorted((a, b) => a.beginPos - b.beginPos) }));
  } catch {
    /* 拦截层已 toast；空图时显示「加载中」 */
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 图例 + 总量 -->
    <div class="flex h-9 shrink-0 items-center gap-4 border-b border-border/60 px-3">
      <span class="text-xs font-medium">料场堆位图（料条位置 0~100%）</span>
      <span v-for="[g, c] in legend" :key="g" class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span class="inline-block h-2.5 w-4 rounded-sm" :style="{ background: c }"></span>{{ g }}
      </span>
      <span class="ml-auto text-xs tabular-nums text-muted-foreground">
        {{ piles.length }} 个堆 · 合计 {{ totalQty.toLocaleString("zh-CN") }} t
      </span>
    </div>

    <!-- 料条图 -->
    <div class="min-h-0 flex-1 overflow-auto px-4 py-3">
      <div v-if="loading" class="py-10 text-center text-sm text-muted-foreground">加载中…</div>

      <div v-for="s in strips" :key="s.stripNo" class="mb-3">
        <div class="mb-1 flex items-baseline gap-3">
          <span class="text-body font-medium">{{ s.stripNo }} 料条</span>
          <span class="text-xs text-muted-foreground">
            {{ s.piles.length }} 个堆 · 空余
            <span
              class="tabular-nums"
              :class="
                (freeBands.find((f) => f.stripNo === s.stripNo)?.free ?? 0) < 15
                  ? 'text-amber-600 dark:text-amber-400'
                  : ''
              "
            >
              {{ Math.max(0, Math.round(freeBands.find((f) => f.stripNo === s.stripNo)?.free ?? 0)) }}%
            </span>
          </span>
        </div>

        <!-- 一行 = 一条料条。位置用百分比 left/width，所以缩放窗口时图不会错位 -->
        <div class="relative h-10 rounded border border-border/60 bg-muted/40">
          <!-- 10% 刻度线：没有刻度就无法估「这块占多宽」 -->
          <div
            v-for="i in 9"
            :key="i"
            class="absolute top-0 h-full w-px bg-border/70"
            :style="{ left: `${i * 10}%` }"
          ></div>

          <button
            v-for="p in s.piles"
            :key="p.id"
            type="button"
            class="absolute top-1 h-8 cursor-pointer rounded px-1 text-left transition-shadow hover:shadow"
            :class="selected?.id === p.id ? 'ring-2 ring-primary' : ''"
            :style="{
              left: `${p.beginPos}%`,
              width: `${Math.max(2, p.endPos - p.beginPos)}%`,
              background: colorOf(p),
            }"
            @click="selected = selected?.id === p.id ? null : p"
          >
            <div class="truncate text-xs font-medium text-white/95">{{ p.pileNo }}</div>
            <div class="truncate text-xs text-white/85">
              {{ materialNames[p.materialId] ?? p.materialId }}
              <span v-if="p.qty" class="tabular-nums">{{ (p.qty / 1000).toFixed(1) }}k t</span>
            </div>
          </button>

          <!-- 空料条的提示：不给提示客户会以为渲染坏了 -->
          <div
            v-if="!s.piles.length"
            class="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground"
          >
            该料条无堆
          </div>
        </div>
      </div>

      <div v-if="!strips.length && !loading" class="py-10 text-center text-sm text-muted-foreground">没有料堆数据</div>
    </div>

    <!-- 选中堆的信息条 -->
    <div class="shrink-0 border-t border-border/60 px-4 py-2 text-body">
      <template v-if="selected">
        <span class="font-medium">{{ selected.pileNo }}</span>
        <span class="mx-3 text-muted-foreground">|</span>
        {{ materialNames[selected.materialId] ?? selected.materialId }}
        <span class="mx-3 text-muted-foreground">|</span>
        {{ selected.stripNo }} 料条 第 {{ selected.beginPos }}% ~ {{ selected.endPos }}% 位
        <span class="mx-3 text-muted-foreground">|</span>
        <span class="tabular-nums">{{ selected.qty.toLocaleString("zh-CN") }} t</span>
        <span class="mx-3 text-muted-foreground">|</span>
        堆料时间 {{ selected.buildTime }}
        <span class="mx-3 text-muted-foreground">|</span>
        <span :class="selected.status === '已取空' ? 'text-muted-foreground' : 'text-primary'">{{
          selected.status
        }}</span>
        <button type="button" class="ml-4 cursor-pointer text-xs text-primary hover:underline" @click="selected = null">
          取消选中
        </button>
      </template>
      <span v-else class="text-sm text-muted-foreground">点击色块查看堆位详情</span>
    </div>
  </div>
</template>
