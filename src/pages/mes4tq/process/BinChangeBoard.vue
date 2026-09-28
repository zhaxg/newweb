<script setup lang="ts">
/**
 * 「料仓变料」L2 左树右表**共享底板**——TW0101/TW0201/TW0301/TW0401/TW0501/TW0601
 * 六个工序页共用它，只换 `process` 一个入参。
 *
 * 为什么不给六个页各写一份：它们是**同一张表（TPA_1041）的六个工序切片**，
 * 差别只有工序过滤与仓名前缀。写六份意味着「改一次变料记录的列要改六处」，
 * 而这六页在客户那儿是并排点的——改漏一处就是页间矛盾
 * （这份规格书点名的唯一硬红线）。所以底板只有一份，工序差异走入参。
 *
 * 演示要点：**左树选机组、右表看该机组料仓的变料流水**；
 * 台账的「当前料种」是**初始配置 + 最后一次变料**叠出来的（见 `routes/work.ts`
 * 的 `/binChange/current`），所以这页能看到「1#高炉 3#仓 焦炭 → 焦丁」——
 * 那就是规格书 B7「模拟上料」的落点。
 *
 * **本底板只读**：没有编辑、没有删除（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import Tree from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import ListPage from "../ListPage.vue";
import { binChangeApi, materialApi, processApi, siloApi } from "@/api/mes4tq";
import { codeFmt, dashFmt, dayFmt, numFmt } from "../cells";
import { useNameMaps } from "../nameMaps";
import type { ListPageSpec } from "../listTypes";

const props = defineProps<{
  /** 工序键：raw / coke / pellet / sinter / lime / blast */
  process: string;
  /** 页面代号（资源表 cCode），写进查询与导出实体名 */
  code: string;
  /** 左树标题（如「原料工序」），不给就按工序名推 */
  title?: string;
}>();

const { ready, materialMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/* ── 左树：机组 → 料仓（两层，本工序的机组数不超过 6）───────────────────── */

const tree = ref<TreeNode[]>([]);
const selectionKeys = ref<Record<string, boolean>>({});
const selected = ref<TreeNode | null>(null);
/** 仓名表（`binCode → 仓名`），右表的仓名列读它 */
const siloNames = ref<Record<string, string>>({});
const unitNames = ref<Record<string, string>>({});

async function loadTree() {
  try {
    const [silos, units] = await Promise.all([siloApi.list(), processApi.units(props.process)]);
    for (const s of silos) siloNames.value[s.binCode] = s.binName || s.binCode;
    for (const u of units) unitNames.value[u.id] = u.name;

    tree.value = units.map((u) => ({
      key: u.id,
      label: `${u.name}${u.spec ? `（${u.spec}）` : ""}`,
      data: { ...u, kind: "unit" },
      icon: "pi pi-cog",
      children: silos
        .filter((s) => s.workstationCode === u.id)
        .map((s) => ({
          key: s.binCode,
          label: s.binName || s.binCode,
          data: { ...s, kind: "silo" },
          leaf: true,
          icon: "pi pi-inbox",
        })),
    }));
  } catch {
    /* 拦截层已 toast */
  }
}

/** 选中机组 → 按机组筛；选中料仓 → 按仓号筛（一次点到位） */
const treeFilter = computed<Record<string, any>>(() => {
  const d = selected.value?.data as any;
  if (!d) return {};
  if (d.kind === "silo") return { binCode: d.binCode };
  if (d.kind === "unit") return { workstationCode: d.id };
  return {};
});

function onNodeSelect(node: TreeNode) {
  selected.value = node;
  listRef.value?.reload();
}

function clearSelection() {
  selected.value = null;
  selectionKeys.value = {};
  listRef.value?.reload();
}

/* ── 右表 ────────────────────────────────────────────── */

const spec = computed<ListPageSpec>(() => ({
  code: props.code,
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "仓号 / 物料 / 操作人 / 批次" },
    {
      key: "matrlId",
      label: "物料",
      kind: "select",
      options: materialOptions.value,
      valueMap: materialValueMap.value,
      placeholder: "全部",
    },
    {
      key: "process",
      label: "工序",
      kind: "select",
      options: processOptions.value,
      valueMap: processValueMap.value,
      placeholder: "全部",
    },
    {
      key: "feedTime",
      label: "变料日期",
      kind: "range",
      as: "date",
      placeholder: "日期区间",
    },
  ],
  columns: [
    { field: "feedTime", headerName: "变料时间", width: 150, pinned: "left" },
    { field: "binCode", headerName: "料仓号", width: 130, valueFormatter: codeFmt(siloNames.value) },
    {
      field: "process",
      headerName: "工序",
      width: 104,
      valueFormatter: (p) => processName.value[String(p.value)] ?? p.value,
    },
    { field: "matrlId", headerName: "变更后物料", width: 130, valueFormatter: codeFmt(materialMap.value) },
    { field: "product", headerName: "物料组", width: 96 },
    { field: "batchNo", headerName: "批次号", width: 140, valueFormatter: dashFmt },
    {
      field: "mtrlConsumeType",
      headerName: "指定规则",
      width: 96,
      valueFormatter: (p) => ({ 1: "指定物料", 2: "指定品种", 3: "自由" })[Number(p.value)] ?? "—",
    },
    /* 混料配比只有配混工序有值；单料仓的仓给「—」而不是 100%——100% 看着像占位 */
    { field: "nPercent", headerName: "配比 %", width: 96, type: "numericColumn", valueFormatter: numFmt(1) },
    { field: "operator", headerName: "操作人", width: 96, valueFormatter: dashFmt },
    { field: "remark", headerName: "变更说明", minWidth: 160, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: { extraButtons: ["▶ 模拟上料"] },
  fetch: (q) => binChangeApi.page({ ...q, ...treeFilter.value }),
  summary: ({ total, rows }) => {
    const today = String((rows[0] as any)?.feedTime ?? "").slice(0, 10);
    return total ? `${total} 条变料 · 最近 ${today || "—"}` : "该条件下没有变料记录";
  },
}));

/** 工序名（六道工序的中文），从字典接口取，不在页面写死 */
const processName = ref<Record<string, string>>({});
const processOptions = ref<string[]>([]);
const processValueMap = ref<Record<string, string>>({});
const materialOptions = ref<string[]>([]);
const materialValueMap = ref<Record<string, string>>({});

/**
 * 两个下拉的候选 + **两张互不相干的 valueMap**。
 *
 * 这里最容易写错的就是把两张翻表合成一张：
 * - `matrlId` 要的是「品名 → 料号」（`混匀矿 → M-0101`）；
 * - `process` 要的是「工序中文 → 工序键」（`烧结工序 → sinter`）。
 * 合成一张会让工序下拉也能翻出料号、物料下拉也能翻出工序键，
 * 而 `ListPage.buildParams` 是**按字段的 valueMap** 翻的——字段与表对不上就直接筛出 0 行。
 */
async function loadOptions() {
  try {
    const [procs, mats] = await Promise.all([processApi.list(), materialApi.list()]);
    for (const p of procs) processName.value[p.code] = p.name;
    processOptions.value = procs.map((p) => p.name);
    processValueMap.value = Object.fromEntries(procs.map((p) => [p.name, p.code]));
    materialOptions.value = mats.map((m) => m.name);
    materialValueMap.value = Object.fromEntries(mats.map((m) => [m.name, m.id]));
  } catch {
    /* 拦截层已 toast；下拉空着不影响其余筛选 */
  }
}

/* 名称表晚到时重查（AG Grid 只在渲染时跑 valueFormatter） */
watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

onMounted(() => {
  void loadTree();
  void loadOptions();
});
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左树：本工序的机组 → 料仓 -->
    <div class="flex w-56 shrink-0 flex-col border-r border-border/60 bg-card/40">
      <div class="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <span class="text-xs text-muted-foreground">{{ title ?? processName[process] ?? "机组 / 料仓" }}</span>
        <button type="button" class="cursor-pointer text-xs text-primary hover:underline" @click="clearSelection">
          全部
        </button>
      </div>
      <div class="min-h-0 flex-1 overflow-auto p-2">
        <Tree
          v-model:selection-keys="selectionKeys"
          :value="tree"
          selection-mode="single"
          class="w-full border-0 bg-transparent p-0"
          @node-select="onNodeSelect"
        />
      </div>
      <div class="shrink-0 border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
        {{ tree.length }} 台机组 · 点仓号可只看这一仓
      </div>
    </div>

    <!-- 右表 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <ListPage ref="listRef" :spec="spec" />
    </div>
  </div>
</template>
