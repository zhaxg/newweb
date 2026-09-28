<script setup lang="ts">
/** 对应 TS0001 库房库位管理（物料与库存 · 附录 A3 版式 **L2 左树右表**）
 *
 *  接口：`storeApi.rooms`（左树库房）· `storeApi.locationPage`（右表库位）
 *
 *  演示要点：**「库位有多大」与「现在放了多少」是两回事**——
 *  库位的 `capacity` 是定义（仓库图纸上写着 8000t），
 *  当前堆存由 `STOCK_RECORDS` **现算**出来（见 `routes/stock.ts`）。
 *  把堆存写进库位定义里就永远停在装配那一刻，改一条出库流水也不会变——
 *  那样这一页就成了静态示意图，不是查询页。
 *
 *  满仓率用 `levelBarRenderer` 画**进度条**：客户要的是「哪几个库位快满了」，
 *  逐行读百分比看不出这个。
 *
 *  **与 TW 料仓的关系**要说清楚：库房库位是**静态主数据**（仓库的格子），
 *  料仓是**生产用的容器**（挂在机组下），两者都记吨位但不是同一个东西——
 *  客户问「料仓算不算库位」时答案是「不算，料仓在 TG0003」。
 *
 *  待接入：库位新增、容量调整（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import Tree from "primevue/tree";
import type { TreeNode } from "primevue/treenode";
import ListPage from "../../ListPage.vue";
import { storeApi } from "@/api/mes4tq";
import { codeFmt, levelBarRenderer, numFmt, qtyFmt } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/* ── 左树：库房 → 库位 ──────────────────────────────────── */

const tree = ref<TreeNode[]>([]);
const selectionKeys = ref<Record<string, boolean>>({});
const selected = ref<TreeNode | null>(null);

async function loadTree() {
  try {
    const [rooms, locs] = await Promise.all([storeApi.rooms(), storeApi.locations()]);
    tree.value = rooms.map((r) => ({
      key: r.id,
      label: r.name,
      data: { ...r, kind: "room" },
      icon: "pi pi-building",
      children: locs
        .filter((l) => l.storeRoomCode === r.id)
        .map((l) => ({ key: l.id, label: l.name, data: { ...l, kind: "loc" }, leaf: true, icon: "pi pi-inbox" })),
    }));
  } catch {
    /* 拦截层已 toast */
  }
}

/** 选库房 → 按库房筛；选库位 → 按库位筛（一次点到位） */
const treeFilter = computed<Record<string, any>>(() => {
  const d = selected.value?.data as any;
  if (!d) return {};
  return d.kind === "loc" ? { storePositionCode: d.id } : { storeRoomCode: d.id };
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
  code: "TS0001",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "库位号 / 名称 / 库房" },
    {
      key: "storeRoomCode",
      label: "库房",
      kind: "select",
      options: roomOptions.value,
      valueMap: roomValueMap.value,
      placeholder: "全部",
    },
    { key: "minLevel", label: "满仓率≥%", kind: "input", placeholder: "0-100" },
  ],
  columns: [
    { field: "id", headerName: "库位号", width: 130, pinned: "left" },
    { field: "name", headerName: "库位名称", minWidth: 170, flex: 1 },
    { field: "storeRoomCode", headerName: "所属库房", width: 140, valueFormatter: codeFmt(roomMap.value) },
    { field: "materialCount", headerName: "存放料种", width: 106, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "dryWeight", headerName: "当前堆存 t", width: 140, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "capacity", headerName: "容量 t", width: 120, type: "numericColumn", valueFormatter: numFmt(0) },
    /* 满仓率画条：库位快满了要比「78%」这个数字更快被看见 */
    { field: "levelPct", headerName: "满仓率", minWidth: 150, cellRenderer: levelBarRenderer() },
    { field: "remark", headerName: "备注", minWidth: 200, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "库存明细", kind: "link", to: "/tqmes/stock/inventory" },
  ],
  toolbar: { extraButtons: ["▶ 模拟库位调整"] },
  fetch: (q) => storeApi.locationPage({ ...q, ...treeFilter.value }),
  summary: ({ total, rows }) => {
    const full = rows.filter((r: any) => Number(r.levelPct) >= 95).length;
    return full ? `本页 ${total} 个库位 · ${full} 个已接近满仓` : `共 ${total} 个库位`;
  },
}));

const roomOptions = ref<string[]>([]);
const roomValueMap = ref<Record<string, string>>({});
const roomMap = ref<Record<string, string>>({});

async function loadRooms() {
  try {
    const rooms = await storeApi.rooms();
    roomOptions.value = rooms.map((r) => r.name);
    roomValueMap.value = Object.fromEntries(rooms.map((r) => [r.name, r.id]));
    roomMap.value = Object.fromEntries(rooms.map((r) => [r.id, r.name]));
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
  void loadTree();
  void loadRooms();
});
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左树：库房 → 库位 -->
    <div class="flex w-56 shrink-0 flex-col border-r border-border/60 bg-card/40">
      <div class="flex h-9 shrink-0 items-center justify-between border-b border-border/60 px-3">
        <span class="text-xs text-muted-foreground">库房 / 库位</span>
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
        {{ tree.length }} 个库房 · 点库位可只看这一格
      </div>
    </div>

    <!-- 右表 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <ListPage ref="listRef" :spec="spec" />
    </div>
  </div>
</template>
