<script setup lang="ts">
/**
 * 「配料计划」L3 **主从双表共享底板**——TB0001/TB0002/TB0003/TB0004
 * 四个工序页共用，只换 `process` 一个入参。
 *
 * **上表主计划、下表配比明细，点主行才出下表**——这是 A3 给这四页定的形状
 * （「单品种矿配比 / 质量加权 / 成本预测」是明细侧的内容，主表放不下）。
 * 选中态由 `spec.onRowClick` 给进来，页面不必去碰 `AgGridVue` 的实例
 * （见 `listTypes.ts` 那条 `onRowClick` 的说明）。
 *
 * 两条**客户会当场验**的账，写在这里是因为它们决定了下表怎么算：
 * 1. **配比合计必须 100%**——`normalizeRatio()` 生成时强制归一，dev 装配期还会抛错；
 * 2. **目标重量 = 配比 × 计划产量 / 100**——下表的重量不是种子里的占位值，
 *    是按当前计划产量**现算**的。这样客户拿计算器按「配比 × 产量」能对上，
 *    而主表改了产量、下表跟着变（`items` 每次选中都重查）。
 *
 * **本底板只读**：没有审核、没有下达、没有执行（本域只查桩，
 * 但状态列照 S2 给全五档，色标才有东西可显示）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../ListPage.vue";
import { batchingApi, processApi } from "@/api/mes4tq";
import { numFmt, qtyFmt, tagRenderer } from "../cells";
import { useNameMaps } from "../nameMaps";
import type { ListPageSpec } from "../listTypes";

const props = defineProps<{
  /** 工序键：raw / sinter / pellet / blast */
  process: string;
  /** 页面代号（资源表 cCode） */
  code: string;
  /** 计划类型名（「混匀配料」/「烧结配料」…），下拉与统计卡都用它 */
  label: string;
}>();

const { ready, materialMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/** 选中的主行 → 下表的 `planId` */
const selectedId = ref("");
const selected = ref<any>(null);
const items = ref<any[]>([]);
const itemsLoading = ref(false);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const unitOptions = ref<string[]>([]);
const unitValueMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: props.code,
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "计划号 / 描述 / 工位 / 机组" },
    {
      key: "unitId",
      label: "机组",
      kind: "select",
      options: unitOptions.value,
      valueMap: unitValueMap.value,
      placeholder: "全部",
    },
    {
      key: "status",
      label: "状态",
      kind: "select",
      options: ["草稿", "已审核", "执行中", "已完成", "调整"],
      placeholder: "全部",
    },
    { key: "minCost", label: "成本≥", kind: "input", placeholder: "元/t" },
  ],
  columns: [
    { field: "id", headerName: "计划号", width: 200, pinned: "left" },
    { field: "mixCenter", headerName: "配料工位", width: 168 },
    { field: "unitId", headerName: "机组", width: 118 },
    {
      field: "process",
      headerName: "工序",
      width: 104,
      valueFormatter: (p) => processName.value[String(p.value)] ?? p.value,
      cellRenderer: tagRenderer(),
    },
    { field: "plannedOutput", headerName: "计划产量 t", width: 130, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "days", headerName: "天数", width: 84, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "batchNo", headerName: "批次号", width: 150 },
    /* 预测成本是这四页的「成本预测」卖点，列宽给足 */
    {
      field: "predictedCost",
      headerName: "预测成本 元/t",
      width: 146,
      type: "numericColumn",
      valueFormatter: numFmt(2),
    },
    { field: "status", headerName: "状态", width: 104, cellRenderer: tagRenderer() },
    /* `nStatus` 是真实表的数字列，与中文 `status` 同源（见 data/batch.ts 的说明） */
    {
      field: "nStatus",
      headerName: "N_STATUS",
      width: 116,
      valueFormatter: (p) =>
        ({ 0: "0 草稿", 1: "1 已审核", 2: "2 执行中", 3: "3 已完成" })[Number(p.value)] ?? String(p.value ?? "—"),
    },
    {
      field: "totalWgt",
      headerName: "平铺总量 t",
      width: 130,
      type: "numericColumn",
      valueFormatter: (p) => (p.value == null ? "—" : qtyFmt(p)),
    },
    {
      field: "usedWgt",
      headerName: "已接收 t",
      width: 130,
      type: "numericColumn",
      valueFormatter: (p) => (p.value == null ? "—" : qtyFmt(p)),
    },
    {
      field: "surWgt",
      headerName: "剩余 t",
      width: 130,
      type: "numericColumn",
      valueFormatter: (p) => (p.value == null ? "—" : qtyFmt(p)),
    },
    { field: "planTime", headerName: "编制时间", width: 160 },
    { field: "remark", headerName: "备注", minWidth: 200, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "投料实绩", kind: "link", to: `/tqmes/process/${props.process}/input` },
  ],
  toolbar: { extraButtons: ["▶ 模拟配料执行"] },
  fetch: (q) => batchingApi.page({ ...q, process: props.process }),
  /* 点主行 → 重查下表。回调放进 computed 的 spec 里，`selected` 的变化由页面自身驱动 */
  onRowClick: (row) => void selectRow(row),
  summary: ({ total, rows }) => {
    const run = rows.filter((r: any) => r.status === "执行中").length;
    return run ? `本页 ${total} 条 · 执行中 ${run} 条` : `共 ${total} 条`;
  },
}));

async function selectRow(row: any) {
  if (!row?.id) return;
  selected.value = row;
  selectedId.value = row.id;
  itemsLoading.value = true;
  try {
    items.value = await batchingApi.items(row.id);
  } catch {
    /* 拦截层已 toast */
  } finally {
    itemsLoading.value = false;
  }
}

/** 下表的列：按**该项成本贡献**排序，客户一眼看出哪一项最贵 */
const detailCols = [
  { key: "materialId", label: "物料编码", width: "110px" },
  { key: "materialName", label: "物料名称", width: "130px" },
  { key: "ratioPct", label: "配比 %", width: "100px" },
  { key: "targetWeight", label: "目标重量 t", width: "130px" },
  { key: "actualWeight", label: "实际重量 t", width: "130px" },
  { key: "deviation", label: "偏差 %", width: "110px" },
  { key: "siloId", label: "料仓", width: "120px" },
];

const ratioSum = computed(() => items.value.reduce((s, i) => s + Number(i.ratioPct ?? 0), 0));
const weightSum = computed(() => items.value.reduce((s, i) => s + Number(i.targetWeight ?? 0), 0));

const processName = ref<Record<string, string>>({});

async function loadOptions() {
  try {
    const [units, procs] = await Promise.all([processApi.units(props.process), processApi.list()]);
    unitOptions.value = units.map((u) => u.name);
    unitValueMap.value = Object.fromEntries(units.map((u) => [u.name, u.id]));
    for (const p of procs) processName.value[p.code] = p.name;
  } catch {
    /* 拦截层已 toast */
  }
}

/**
 * 统计卡。**成本那张是这四页的卖点**（A3 对 TB0001 的原话就是「成本预测」）：
 * 预测成本来自 `MATERIALS.costPrice`，所以它与 TG0002 的单价列是同一条账。
 */
async function loadCards() {
  try {
    const res = await batchingApi.page({ process: props.process, pageSize: 500 });
    const rows = res.rows;
    const avg = rows.reduce((s, r) => s + Number(r.predictedCost ?? 0), 0) / Math.max(1, rows.length);
    const run = rows.filter((r) => r.status === "执行中").length;
    const done = rows.filter((r) => r.status === "已完成").length;
    cards.value = [
      { label: "平均预测成本", value: avg.toFixed(2), sub: "元/t · 口径同 TG0002 单价" },
      { label: "计划数", value: rows.length, sub: "近 3 个月 · 本工序机组" },
      { label: "执行中", value: run, sub: "S2 状态机第 3 档" },
      { label: "已完成", value: done, sub: "可回看配比与产量" },
    ];
    listRef.value?.reload();
  } catch {
    /* 拦截层已 toast */
  }
}

watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

onMounted(() => {
  void loadOptions();
  void loadCards();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上表：主计划（L3 的「主」） -->
    <div class="basis-[58%] shrink-0 overflow-hidden">
      <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
    </div>

    <div class="h-px shrink-0 bg-border"></div>

    <!-- 下表：配比明细（L3 的「从」）——只有选中主行才有内容 -->
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex h-8 shrink-0 items-center gap-3 border-b border-border/60 px-3">
        <span class="text-xs font-medium">配比明细</span>
        <span v-if="selected" class="truncate text-xs text-muted-foreground"
          >{{ selected.id }} · {{ selected.mixCenter }}</span
        >
        <span v-else class="text-xs text-muted-foreground">点击上方一行查看它的配比</span>
        <span
          class="ml-auto text-xs tabular-nums"
          :class="Math.abs(ratioSum - 100) < 0.05 ? 'text-muted-foreground' : 'text-destructive'"
        >
          配比合计 {{ ratioSum.toFixed(1) }}%<span v-if="items.length">
            · 目标重量合计 {{ weightSum.toLocaleString("zh-CN") }} t</span
          >
        </span>
      </div>

      <div class="min-h-0 flex-1 overflow-auto">
        <table class="w-full text-body">
          <thead class="sticky top-0 bg-card text-xs text-muted-foreground">
            <tr class="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-normal">
              <th v-for="c in detailCols" :key="c.key" :style="{ width: c.width }">{{ c.label }}</th>
            </tr>
          </thead>
          <tbody class="[&>td]:px-3 [&>td]:py-2">
            <tr v-for="(it, i) in items" :key="it.materialId + i" class="border-t border-border/50">
              <td class="tabular-nums text-muted-foreground">{{ it.materialId }}</td>
              <td>{{ it.materialName }}</td>
              <td class="tabular-nums font-medium">{{ Number(it.ratioPct).toFixed(1) }}</td>
              <td class="tabular-nums">{{ Number(it.targetWeight).toLocaleString("zh-CN") }}</td>
              <!-- 实际与偏差在本域恒为空（只查桩、没有执行写入），给「—」而不是 0 -->
              <td class="text-muted-foreground">—</td>
              <td class="text-muted-foreground">—</td>
              <td class="text-muted-foreground">{{ it.siloId || "—" }}</td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="7" class="py-6 text-center text-sm text-muted-foreground">
                {{ itemsLoading ? "加载中…" : "尚未选中计划" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
