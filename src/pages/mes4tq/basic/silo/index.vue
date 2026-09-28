<script setup lang="ts">
/** 对应 TG0003 料仓管理（基础配置 · 附录 A3 版式 **L2 左树右表**）
 *
 *  接口：`siloApi.list`/`byUnit`（左树机组）· `siloApi.page`（右表，料位现算）
 *        `binChangeApi.page`（下钻：该仓的变料历史）
 *
 *  演示要点：**料位是双端危险的**——满仓要溢料、空仓会断料停线，
 *  所以料位列用 `levelBarRenderer` 画双端红线（高线 90 / 低线 15 都标红），
 *  单端进度条表达不了这条。点一个料仓看它的变料历史，
 *  就能看出「当前料种是怎么从焦炭变成焦丁的」——那是 B7 剧本「模拟上料」的落点。
 *
 *  料位来自 mock 现算的 `siloState()`：按仓号 + 演示日确定性生成，
 *  有约 16% 的仓故意落在危险区（高 8% / 低 8%），全绿等于这个控件没做。
 *
 *  待接入：变料写入、库存调账（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import Tree from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import ListPage from "../../ListPage.vue";
import { materialApi, orgApi, siloApi } from "@/api/mes4tq";
import { dashFmt, levelBarRenderer, numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, materialMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/* ── 左树：车间 → 机组（两级，25 个节点；工厂级不用，因为料仓只挂在机组上）──── */

const tree = ref<TreeNode[]>([]);
const selectionKeys = ref<Record<string, boolean>>({});
const selected = ref<TreeNode | null>(null);
const orgNames = ref<Record<string, string>>({});

async function loadTree() {
  try {
    const nodes = (await orgApi.list()) as Array<{ id: string; name: string; parentId: string; kind: string }>;
    for (const n of nodes) orgNames.value[n.id] = n.name;
    const byPid = new Map<string, TreeNode[]>();
    for (const n of nodes) {
      if (n.kind === "factory") continue; /* 从车间起，工厂层对料仓没有筛选意义 */
      const item: TreeNode = {
        key: n.id,
        label: n.name,
        data: { ...n },
        leaf: n.kind === "unit",
        icon: n.kind === "workshop" ? "pi pi-sitemap" : "pi pi-cog",
      };
      byPid.set(n.parentId, [...(byPid.get(n.parentId) ?? []), item]);
    }
    const build = (pid: string): TreeNode[] =>
      (byPid.get(pid) ?? []).map((n) => ({ ...n, children: n.leaf ? undefined : build(n.key as string) }));
    /* 工厂层被上面跳过了，所以桶的 key 有两种：FG*（子是车间）与 CJ*（子是机组）。
       从 FG* 起递归就正好得到「车间 → 机组」两层 */
    tree.value = Object.keys(byPid)
      .filter((pid) => pid.startsWith("FG"))
      .flatMap((pid) => build(pid));
  } catch {
    /* 拦截层已 toast */
  }
}

/** 选中机组 → 右表按机组筛；选中车间 → 按车间筛（厂层没有，见 loadTree 的跳过） */
const treeFilter = computed<Record<string, any>>(() => {
  const d = selected.value?.data as any;
  if (!d) return {};
  if (d.kind === "unit") return { workstationCode: d.id };
  if (d.kind === "workshop") return { workshopCode: d.id };
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

/**
 * 「当前物料」下拉的候选。**必须走接口**：物料表是全站主数据，
 * 页面写死一份候选，TG0002 改一条物料后这里就会少一项——
 * 两处管同一件事，正是这份规格书点名的页间矛盾。
 */
const materialOptions = ref<string[]>([]);
/** 品名 → 料号。展示品名、送料号——`eq()` 比的是 `row.matrlId`，
 * 不翻过来会把「混匀矿」送进去然后筛出 0 行，客户会以为这仓没物料 */
const materialValueMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: "TG0003",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "仓号 / 仓名 / 物料" },
    {
      key: "matrlId",
      label: "当前物料",
      kind: "select",
      options: materialOptions.value,
      valueMap: materialValueMap.value,
      placeholder: "全部",
    },
    { key: "minLevel", label: "料位≥%", kind: "input", placeholder: "0-100" },
  ],
  columns: [
    { field: "binCode", headerName: "料仓号", width: 132, pinned: "left" },
    { field: "binName", headerName: "仓名", width: 110 },
    { field: "workstationCode", headerName: "所属机组", width: 112, valueFormatter: dashFmt },
    { field: "workshopName", headerName: "车间", width: 110, valueFormatter: dashFmt },
    {
      field: "matrlId",
      headerName: "当前物料",
      width: 118,
      valueFormatter: (p) => materialMap.value[String(p.value)] ?? p.value,
    },
    { field: "product", headerName: "品种", width: 92, valueFormatter: dashFmt },
    /* 料位条：双端危险，红线画在 15% 与 90%（见 cells.ts 的 levelBarRenderer） */
    { field: "levelPct", headerName: "料位", minWidth: 150, cellRenderer: levelBarRenderer() },
    { field: "stock", headerName: "存量 t", width: 100, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "capacity", headerName: "容量 t", width: 96, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "levelState", headerName: "状态", width: 88, cellRenderer: tagRenderer() },
    { field: "feedTime", headerName: "最近变料", minWidth: 148, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "变料记录", kind: "link", to: "/tqmes/process/stat/bin-change" },
  ],
  toolbar: { extraButtons: ["▶ 模拟上料"] },
  fetch: (q) => siloApi.page({ ...q, ...treeFilter.value }),
  summary: ({ total, rows }) => {
    const danger = rows.filter((r: any) => r.levelState === "报警").length;
    return danger ? `共 ${total} 个仓 · ${danger} 个已越过红线` : `共 ${total} 个仓`;
  },
}));

/* 名称表晚到时重查，否则「当前物料」一列全是 M-0101 编码 */
watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

async function loadMaterials() {
  try {
    /* value 是料号、展示是品名——`ListPage.buildParams` 送的是原值，mock 的 `eq` 比的也是料号 */
    const list = await materialApi.list();
    materialOptions.value = list.map((m) => m.name);
    materialValueMap.value = Object.fromEntries(list.map((m) => [m.name, m.id]));
  } catch {
    /* 拦截层已 toast；下拉空着不影响其余筛选 */
  }
}

onMounted(() => {
  void loadTree();
  void loadMaterials();
});
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左树：车间 → 机组 -->
    <div class="flex w-56 shrink-0 flex-col border-r border-border/60 bg-card/40">
      <div class="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <span class="text-xs text-muted-foreground">车间 / 机组</span>
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
      <div class="shrink-0 border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">78 个料仓</div>
    </div>

    <!-- 右表 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <ListPage ref="listRef" :spec="spec" />
    </div>
  </div>
</template>
