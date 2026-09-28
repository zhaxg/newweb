<script setup lang="ts">
/** 对应 AS0002 库存流转（模块五 备品备件）
 *  接口：stockTxnApi.page（POST /eam/stockTxn/listPage）/ sparePartApi.stockIn（POST /eam/sparePart/stockIn）
 *        sparePartApi.list + orgApi.assignees（「手工入库」表单的候选，GET /eam/sparePart/list、/eam/org/assignees）
 *  演示要点：**`balance` 是数据不是页面现算**——每一笔都带「动账后余额」，
 *        客户问「你们账实怎么对得上」时，这一列逐条自证；所以手工入库必须走后端（库存、流水、余额三处一起动），
 *        绝不能在前端 unshift 一行假装入库。
 *  待接入：无。 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { exportRows, orgApi, sparePartApi, stockTxnApi } from "@/api/equipment";
import { numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { SparePart } from "@/api/equipment/types";
import type { ListPageSpec } from "../../listTypes";

const TXN_TYPES = ["入库", "出库", "领用", "借出", "归还", "调拨", "盘点", "报废"];

const { partName, ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const parts = ref<SparePart[]>([]);
const people = ref<string[]>([]);

onMounted(async () => {
  [parts.value, people.value] = await Promise.all([sparePartApi.list(), orgApi.assignees()]);
});

/** 名称表是后到的（AG Grid 的 valueFormatter 只在渲染时跑），到位后重查一次，别让客户看一屏 SP-0001 */
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

const spec = computed<ListPageSpec>(() => ({
  code: "AS0002",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "备件编号 / 经办人 / 工单号" },
    { key: "type", label: "动账类型", kind: "select", options: TXN_TYPES, placeholder: "全部类型" },
    { key: "at", label: "动账时间", kind: "range", placeholder: "开始时间" },
  ],
  columns: [
    { field: "id", headerName: "流水号", width: 100 },
    { field: "spId", headerName: "备件", minWidth: 160, flex: 1, valueFormatter: (p) => partName(p.value) },
    { field: "type", headerName: "类型", width: 86, sortable: false, cellRenderer: tagRenderer() },
    { field: "qty", headerName: "数量", width: 84, valueFormatter: numFmt() },
    { field: "balance", headerName: "动账后余额", width: 112, valueFormatter: numFmt() },
    { field: "woId", headerName: "关联工单", width: 150, valueFormatter: (p) => String(p.value ?? "—") },
    { field: "person", headerName: "经办人", width: 120 },
    { field: "at", headerName: "动账时间", width: 160 },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: {
    acts: [
      {
        label: "手工入库",
        okMsg: "入库完成",
        fields: [
          {
            key: "spId",
            label: "备件",
            kind: "select",
            // 显示「编号 名称」、落库只要编号：valueMap 就是这条反查表
            options: parts.value.map((p) => `${p.id} ${p.name}`),
            valueMap: Object.fromEntries(parts.value.map((p) => [`${p.id} ${p.name}`, p.id])),
            placeholder: "选择要入库的备件",
            full: true,
          },
          { key: "qty", label: "入库数量", kind: "number", initial: 1 },
          {
            key: "person",
            label: "经办人",
            kind: "select",
            options: people.value,
            placeholder: "库管员 / 维修工",
          },
          { key: "note", label: "备注", kind: "input", placeholder: "如：采购到货 / 盘盈", full: true },
        ],
        run: (f) =>
          sparePartApi.stockIn(String(f.spId ?? ""), Number(f.qty) || 0, String(f.person ?? ""), String(f.note ?? "")),
      },
      { label: "导出", okMsg: "导出任务已提交", refresh: false, run: (f) => exportRows("stockTxn", f) },
    ],
  },
  detail: {
    sections: [
      {
        title: "流水信息",
        fields: [
          { label: "流水号", from: "id" },
          { label: "备件", from: "spId" },
          { label: "动账类型", from: "type" },
          { label: "数量", from: "qty" },
          { label: "动账后余额", from: "balance" },
          { label: "关联工单", from: "woId" },
          { label: "经办人", from: "person" },
          { label: "动账时间", from: "at" },
          { label: "备注", from: "note" },
        ],
      },
    ],
  },
  fetch: (q) => stockTxnApi.page(q),
  summary: ({ total }) => `共 ${total} 笔动账 · 每一笔都带动账后余额，可逐条核对账实`,
}));
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
