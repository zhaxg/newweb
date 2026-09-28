<script setup lang="ts">
/**
 * 对应 TG0001 产线维护（基础配置 · 附录 A3 版式 **L2 左树右表**）
 *
 * 接口：`orgApi.list`（左树，一次拉全工厂/车间/机组三层）· `lineApi.page`（右表分页）
 *
 * 演示要点：**工厂 → 车间 → 机组三级树是全站组织口径的唯一真源**——
 * 客户问「1#高炉归谁管、下面管着哪几条线」时，答得上来的系统才叫有底子。
 * 所以左树给全量（不懒加载、不虚拟滚动）：三级一共 6+6+19=31 个节点一屏放得下，
 * 点哪层右表立刻跟着换。
 *
 * 筛选语义分三路，**这是本页唯一容易出错的地方**：选**车间**送 `workshopId`、
 * 选**工厂**送 `factoryId`（一个厂下有多个车间，只按 workshopId 筛会让点工厂时结果为空）、
 * 选到**机组**则不送层级参数、改成按编码 `keyword` 精确定位（右表只剩一行，便于核对）。
 *
 * 待接入：新增/编辑产线（本域只查桩，见 listTypes.ts 文件头）。
 */
import { computed, onMounted, ref, watch } from "vue";
import Tree from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import ListPage from "../../ListPage.vue";
import { lineApi, orgApi } from "@/api/mes4tq";
import { boolRenderer, codeFmt, numFmt } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, workshopMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/* ── 左树 ────────────────────────────────────────────── */

const tree = ref<TreeNode[]>([]);
/** PrimeVue Tree 单选态：`selection-keys` 要的是 `{ 节点key: true }` 对象，不是节点本身 */
const selectionKeys = ref<Record<string, boolean>>({});
/** 真正的选中节点（筛选条件从它的 `data` 上取） */
const selected = ref<TreeNode | null>(null);

/** 工厂 id → 名称。本地建表而不走 nameMaps：工厂/车间/机组的名称来自 `org/list`，
 * 三方各自维护一张会让「同一条车间名两处不一致」 */
const orgNames = ref<Record<string, string>>({});

async function loadTree() {
  try {
    const nodes = (await orgApi.list()) as Array<{
      id: string;
      name: string;
      parentId: string;
      kind: string;
      spec?: string;
    }>;
    for (const n of nodes) orgNames.value[n.id] = n.name;

    const byPid = new Map<string, TreeNode[]>();
    for (const n of nodes) {
      const item: TreeNode = {
        key: n.id,
        label: n.kind === "unit" ? `${n.name}${n.spec ? `（${n.spec}）` : ""}` : n.name,
        data: { ...n },
        leaf: n.kind === "unit",
        icon: n.kind === "factory" ? "pi pi-building" : n.kind === "workshop" ? "pi pi-sitemap" : "pi pi-cog",
      };
      byPid.set(n.parentId, [...(byPid.get(n.parentId) ?? []), item]);
    }
    /* 逐级挂子树。工厂的 parentId 是空串，所以从 "" 起递归就得到完整三层 */
    const build = (pid: string): TreeNode[] =>
      (byPid.get(pid) ?? []).map((n) => ({ ...n, children: n.leaf ? undefined : build(n.key as string) }));
    tree.value = build("");
  } catch {
    /* 拦截层已 toast；树空表时右表仍可用（顶部有「全部」入口） */
  }
}

/** 选中层级 → 右表的额外筛选参数（三条路径见文件头） */
const treeFilter = computed<Record<string, any>>(() => {
  const d = selected.value?.data as any;
  if (!d) return {};
  if (d.kind === "workshop") return { workshopId: d.id };
  if (d.kind === "factory") return { factoryId: d.id };
  if (d.kind === "unit") return { keyword: d.id };
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
  code: "TG0001",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "机组编码 / 名称 / 规格" },
    {
      key: "type",
      label: "机组类型",
      kind: "select",
      options: ["混匀线", "配煤仓", "焦炉", "烧结机", "竖炉", "竖窑", "高炉"],
    },
    { key: "enabled", label: "状态", kind: "select", options: ["是", "否"], valueMap: { 是: "true", 否: "false" } },
  ],
  columns: [
    { field: "id", headerName: "机组编码", width: 110, pinned: "left" },
    { field: "name", headerName: "机组名称", width: 132 },
    { field: "type", headerName: "类型", width: 92 },
    { field: "spec", headerName: "关键规格", width: 118 },
    { field: "capacity", headerName: "年产能 万t", width: 108, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "workshopId", headerName: "所属车间", width: 118, valueFormatter: codeFmt(orgNames.value) },
    { field: "factoryId", headerName: "所属工厂", width: 104, valueFormatter: codeFmt(orgNames.value) },
    { field: "onlineDate", headerName: "投产日期", width: 110 },
    { field: "enabled", headerName: "启用", width: 78, cellRenderer: boolRenderer() },
    { field: "remark", headerName: "备注", minWidth: 180, flex: 1 },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  fetch: (q) => lineApi.page({ ...q, ...treeFilter.value }),
  summary: ({ total }) => (total ? `共 ${total} 台机组` : "该层级下没有机组"),
}));

/* 名称表是后到的：AG Grid 只在单元格渲染时跑 valueFormatter，
   缓存表到货后不重查，「所属车间/工厂」两列就会一直显示 CJ01 这种编码 */
watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

onMounted(() => void loadTree());
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左树 -->
    <div class="flex w-64 shrink-0 flex-col border-r border-border/60 bg-card/40">
      <div class="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <span class="text-xs text-muted-foreground">组织架构</span>
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
        6 厂 · 6 车间 · 19 机组
      </div>
    </div>

    <!-- 右表 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <ListPage ref="listRef" :spec="spec" />
    </div>
  </div>
</template>
