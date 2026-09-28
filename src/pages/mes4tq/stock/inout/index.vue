<script setup lang="ts">
/** 对应 TS0003 出入库记录查询（物料与库存 · 附录 A3 版式 **L1 列表页**）
 *
 *  接口：`stockTxnApi.page`（POST /tqmes/stockTxn/listPage）
 *
 *  演示要点：**这张流水里没有「入库」**——这是刻意的（规格书 B11 第 1 条）：
 *  **进厂入储在 ERP-MR、库后的消耗/移存/回收在 MES**。
 *  所以 `direction` 只有出库/移库/回收/盘盈/盘亏五种，
 *  看到客户问「为什么没有入库」，答案就是「入库那笔账在 ERP，MES 只接它的信息」。
 *
 *  **凭证号 `MES+日期+序号` 是与 ERP 对账的连接键**——真实系统里 MES 出库会回抛
 *  ERP 记账，所以客户拿凭证号去 ERP 是查得到的。凭证号要是随机串，这条链就断了。
 *
 *  **干基与湿基同样自洽**（`dry = wet / (1 + h2o/100)`），与 TW 投料实绩是同一条等式——
 *  客户在两页各按一次计算器，结果必须一致，否则会以为是两套数据。
 *
 *  待接入：红冲、凭证回抛 ERP（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { materialApi, stockTxnApi, storeApi } from "@/api/mes4tq";
import { codeFmt, dayFmt, numFmt, qtyFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, materialMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const materialOptions = ref<string[]>([]);
const materialValueMap = ref<Record<string, string>>({});
const roomOptions = ref<string[]>([]);
const roomValueMap = ref<Record<string, string>>({});
const roomMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: "TS0003",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "凭证号 / 物料 / 批次 / 操作人" },
    {
      key: "materialId",
      label: "物料",
      kind: "select",
      options: materialOptions.value,
      valueMap: materialValueMap.value,
      placeholder: "全部",
    },
    {
      key: "direction",
      label: "方向",
      kind: "select",
      options: ["出库", "移库", "回收", "盘盈", "盘亏"],
      placeholder: "全部",
    },
    {
      key: "storeRoomCode",
      label: "库房",
      kind: "select",
      options: roomOptions.value,
      valueMap: roomValueMap.value,
      placeholder: "全部",
    },
    { key: "txnTime", label: "发生日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "txnTime", headerName: "发生时间", width: 150, pinned: "left" },
    /* 凭证号紧随其后：这是客户与 ERP 对账时第一眼看的列 */
    { field: "docNo", headerName: "凭证号", width: 170 },
    { field: "direction", headerName: "方向", width: 88, cellRenderer: tagRenderer() },
    { field: "moveType", headerName: "移动类型", width: 104 },
    { field: "materialId", headerName: "物料", width: 130, valueFormatter: codeFmt(materialMap.value) },
    { field: "batchNo", headerName: "批次号", width: 148 },
    { field: "dryWeight", headerName: "干基 t", width: 120, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "wetWeight", headerName: "湿基 t", width: 120, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "h2o", headerName: "水分 %", width: 100, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "storeRoomCode", headerName: "库房", width: 136, valueFormatter: codeFmt(roomMap.value) },
    { field: "storePositionCode", headerName: "库位", width: 140 },
    { field: "operator", headerName: "操作人", width: 96 },
    { field: "remark", headerName: "备注", minWidth: 180, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "库存明细", kind: "link", to: "/tqmes/stock/inventory" },
  ],
  toolbar: { extraButtons: ["▶ 模拟出库"] },
  fetch: (q) => stockTxnApi.page(q),
  summary: ({ total, rows }) => {
    const out = rows.filter((r: any) => r.direction === "出库").length;
    return `本页 ${total} 条 · 出库 ${out} 条（无入库，见 B11 库前边界）`;
  },
}));

async function loadOptions() {
  try {
    const [mats, rooms] = await Promise.all([materialApi.list(), storeApi.rooms()]);
    materialOptions.value = mats.map((m) => m.name);
    materialValueMap.value = Object.fromEntries(mats.map((m) => [m.name, m.id]));
    roomOptions.value = rooms.map((r) => r.name);
    roomValueMap.value = Object.fromEntries(rooms.map((r) => [r.name, r.id]));
    roomMap.value = Object.fromEntries(rooms.map((r) => [r.id, r.name]));
  } catch {
    /* 拦截层已 toast */
  }
}

/** 统计卡：五种方向各给一个数——「方向」就是这一页的分类维度 */
async function loadCards() {
  try {
    const res = await stockTxnApi.page({ pageSize: 500 });
    const rows = res.rows;
    const by = new Map<string, number>();
    for (const r of rows) by.set(r.direction, (by.get(r.direction) ?? 0) + 1);
    cards.value = [
      { label: "流水条数", value: rows.length, sub: "近 7 天 · 库后动作" },
      { label: "出库", value: by.get("出库") ?? 0, sub: "MES 侧的主要动作" },
      { label: "移库 + 回收", value: (by.get("移库") ?? 0) + (by.get("回收") ?? 0), sub: "厂内流转，不动 ERP 库" },
      { label: "盘盈 + 盘亏", value: (by.get("盘盈") ?? 0) + (by.get("盘亏") ?? 0), sub: "盘点调整，MES 自己的账" },
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
  <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
</template>
