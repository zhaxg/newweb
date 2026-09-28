<script setup lang="ts">
/** 对应 TP0002 月生产计划编制（计划管理 · 附录 A3 版式 **L3 倒推链 + 列表**）
 *
 *  接口：`monthlyPlanApi.chain`（GET /tqmes/monthlyPlan/chain）· `monthlyPlanApi.page`
 *
 *  演示要点：**A2 那句「铁水→烧结→球团→原料 倒推」是这一页的全部内容**——
 *  顶部的三级链条就是 `MonthlyPlan.level` 的可视化：
 *  level 1 铁水 → level 2 烧结/球团 → level 3 原料，**上游派生下游**。
 *  所以链上每一格显示的是「这级有几条计划」，点一格把下面的表筛到那一级。
 *
 *  为什么倒推而不是正推：钢厂的月计划**先定铁水产量**（销售与高炉产能决定），
 *  再倒推要烧多少、球团多少、备多少料。反过来算会得到一个不满足销售的计划。
 *
 *  **`parentId` 必须连得上**——断了链页面会退化成平铺三组，
 *  「倒推」这个卖点就没了。所以链上任一格点进去，下表用 `level` 筛同一级的行。
 *
 *  待接入：编制、审核、下达（本域只查桩；状态照 S1 五档显示）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { monthlyPlanApi } from "@/api/mes4tq";
import { codeFmt, numFmt, qtyFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/** 倒推链的三级（level 1 → 2 → 3），每格显示计划条数与合计产量 */
const chain = ref<Array<{ level: number; label: string; count: number; output: number; detail: string }>>([]);
const activeLevel = ref<number | null>(null);
const periods = ref<string[]>([]);
const activePeriod = ref("");

const spec = computed<ListPageSpec>(() => ({
  code: "TP0002",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "机组 / 产品 / 状态" },
    { key: "period", label: "期别", kind: "select", options: periods.value, placeholder: activePeriod.value || "全部" },
    {
      key: "unitId",
      label: "机组",
      kind: "select",
      options: unitOptions.value,
      valueMap: unitValueMap.value,
      placeholder: "全部",
    },
    {
      key: "productType",
      label: "产品",
      kind: "select",
      options: ["铁水", "烧结矿", "球团矿", "混匀料"],
      placeholder: "全部",
    },
    {
      key: "status",
      label: "状态",
      kind: "select",
      options: ["草稿", "已审核", "已下达", "执行中", "已完成"],
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "id", headerName: "计划号", width: 220, pinned: "left" },
    { field: "level", headerName: "倒推层级", width: 110, cellRenderer: (p: any) => levelTag(p.value) },
    { field: "period", headerName: "期别", width: 92 },
    { field: "unitId", headerName: "机组", width: 120, valueFormatter: codeFmt(unitMap.value) },
    { field: "productType", headerName: "产品", width: 104, cellRenderer: tagRenderer() },
    { field: "targetOutput", headerName: "目标产量 t", width: 140, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "targetCost", headerName: "目标成本 元/t", width: 146, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "status", headerName: "状态", width: 100, cellRenderer: tagRenderer() },
    { field: "parentId", headerName: "上游计划", width: 220, valueFormatter: (p) => p.value || "（链首）" },
    { field: "remark", headerName: "备注", minWidth: 180, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "需求计划", kind: "link", to: "/tqmes/plan/demand" },
  ],
  toolbar: { extraButtons: ["▶ 模拟倒推编制"] },
  /* `activePeriod` / `levelFilter` 都是**外挂的筛选**：前者锁期别（首屏要看到链）
     后者是链条按钮的出口——`ListPage` 的 `model` 是它内部状态，页面改不到，
     所以两处都只能在 `fetch` 里并进去。同一种办法，别处不要再发明第二种。 */
  fetch: (q) =>
    monthlyPlanApi.page({
      ...q,
      ...(activePeriod.value ? { period: activePeriod.value } : {}),
      ...(levelFilter.value ? { level: levelFilter.value } : {}),
    }),
  summary: ({ total, rows }) => {
    const lv = new Set(rows.map((r: any) => r.level)).size;
    return `共 ${total} 条 · 覆盖 ${lv} 级倒推`;
  },
}));

const unitOptions = ref<string[]>([]);
const unitValueMap = ref<Record<string, string>>({});

/** 层级色标：1 级蓝（铁水，源头）、2 级紫、3 级绿——颜色标的是**顺序**不是好坏 */
function levelTag(v: unknown) {
  const lv = Number(v);
  const cls =
    lv === 1
      ? "text-sky-600 bg-sky-500/12 dark:text-sky-400"
      : lv === 2
        ? "text-violet-600 bg-violet-500/12 dark:text-violet-400"
        : "text-emerald-600 bg-emerald-500/12 dark:text-emerald-400";
  const el = document.createElement("span");
  el.className = `inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${cls}`;
  el.textContent = lv === 1 ? "1 铁水" : lv === 2 ? "2 烧结/球团" : "3 原料";
  return el;
}

/**
 * 链条按钮选出的那一级（`""` = 全部）。
 *
 * 声明必须在 `spec` 之前：`spec` 是 `computed`，它的**回调**里读了这个 ref，
 * 而 Vue 在首次求值时就会执行回调——声明在后会撞 TDZ。
 */
const levelFilter = ref("");

/** 点链上一格 → 把 `level` 换成那一级（再点一次取消） */
function pickLevel(lv: number) {
  activeLevel.value = activeLevel.value === lv ? null : lv;
  /* `level` 是普通查询字段，直接改 `model` 不行（在 ListPage 内部），
     所以走 `spec.fetch` 的外挂——与 `activePeriod` 同一种外挂方式 */
  levelFilter.value = activeLevel.value ?? "";
  listRef.value?.reload();
}

async function loadAll() {
  try {
    const [rows, firstPeriod] = await Promise.all([monthlyPlanApi.page({ pageSize: 500 }), monthlyPlanApi.chain("")]);
    periods.value = [...new Set(rows.rows.map((r) => r.period))].toSorted((a, b) => b.localeCompare(a));
    activePeriod.value = periods.value[0] ?? "";

    const byLevel = new Map<number, typeof rows.rows>();
    for (const r of firstPeriod) byLevel.set(r.level, [...(byLevel.get(r.level) ?? []), r]);
    chain.value = [1, 2, 3].map((lv) => {
      const list = byLevel.get(lv) ?? [];
      return {
        level: lv,
        label: lv === 1 ? "① 铁水（源头）" : lv === 2 ? "② 烧结 / 球团" : "③ 原料",
        count: list.length,
        output: list.reduce((s, r) => s + r.targetOutput, 0),
        detail: [...new Set(list.map((r) => r.productType))].join(" / "),
      };
    });

    const all = rows.rows;
    const run = all.filter((r) => r.status === "执行中").length;
    cards.value = [
      { label: "计划条数", value: all.length, sub: `近 ${periods.value.length} 个月` },
      { label: "执行中", value: run, sub: "S1 状态机第 4 档" },
      { label: "链上三级", value: chain.value.filter((c) => c.count > 0).length, sub: "铁水→烧结/球团→原料" },
      {
        label: "断链计划",
        value: all.filter((r) => r.level !== 1 && !r.parentId).length,
        sub: "应为 0，非 0 就是倒推没接上",
      },
    ];
    listRef.value?.reload();
  } catch {
    /* 拦截层已 toast */
  }
}

const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

onMounted(() => void loadAll());
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 倒推链：三格一排，点一格筛下面的表 -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="mb-1.5 flex items-center gap-3">
        <span class="text-xs font-medium">月计划倒推链（铁水 → 烧结/球团 → 原料）</span>
        <span class="text-xs text-muted-foreground">点一格只看那一级；再点一次取消</span>
        <span class="ml-auto text-xs text-muted-foreground">期别 {{ activePeriod || "—" }}</span>
      </div>
      <div class="flex items-center gap-2">
        <template v-for="(c, i) in chain" :key="c.level">
          <button
            type="button"
            class="min-w-44 cursor-pointer rounded border px-3 py-1.5 text-left transition-colors"
            :class="
              activeLevel === c.level
                ? 'border-primary bg-primary/10'
                : 'border-border/70 bg-card/60 hover:border-primary/50'
            "
            @click="pickLevel(c.level)"
          >
            <div class="text-xs text-muted-foreground">{{ c.label }}</div>
            <div class="text-base font-semibold tabular-nums">
              {{ c.count }}
              <span class="text-xs font-normal text-muted-foreground"
                >条 · {{ (c.output / 10000).toFixed(1) }} 万t</span
              >
            </div>
            <div class="truncate text-xs text-muted-foreground">{{ c.detail }}</div>
          </button>
          <span v-if="i < chain.length - 1" class="text-base text-muted-foreground">→</span>
        </template>
      </div>
    </div>

    <!-- 下表：计划明细 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
    </div>
  </div>
</template>
