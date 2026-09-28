<script setup lang="ts">
/** 对应 AS0006 请购管理（模块五 备品备件 · 附录 B4 第 6 幕）
 *  接口：purchaseApi.page（POST /eam/purchaseRequest/listPage）/ approve（/approve）/ receive（/receive）
 *        + sparePartApi.list（GET /list，外键翻译）+ exportRows("purchaseRequest")
 *  演示要点：**这一页的行大多是「别处生成的」**——剧本第 5 幕在工单上领料，库存跌破安全库存才冒出这一行，
 *        `reason` 里写着是哪张工单触发的。所以本页不给「新增」：请购单由库存策略产生，
 *        人工提报的那条（PR-003）也已经在种子里给了，页面再造一个新增按钮就等于承认「这页和工单没关系」。
 *        「到货入库」也不是改个状态：store 里库存 +qty、写一条入库流水、余额一并更新（AS0002 看得见）。
 *  待接入：无。 */
import { computed, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { exportRows, purchaseApi } from "@/api/equipment";
import { numFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const STATUSES = ["待审核", "已请购", "已到货"];

const { partName, partMap, ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/** 名称表后到（AG Grid 的 valueFormatter 只在渲染时跑），到位后重查一次，别让客户看一屏 SP-0008 */
watch(ready, (on) => {
  if (on) listRef.value?.reload();
});

const spec = computed<ListPageSpec>(() => ({
  code: "AS0006",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "单号 / 备件 / 触发原因" },
    { key: "status", label: "请购状态", kind: "select", options: STATUSES, placeholder: "全部状态" },
  ],
  columns: [
    { field: "id", headerName: "请购单号", width: 104 },
    { field: "spId", headerName: "备件", minWidth: 165, flex: 1, valueFormatter: (p) => partName(p.value) },
    { field: "qty", headerName: "请购数量", width: 96, valueFormatter: numFmt() },
    { field: "reason", headerName: "触发原因", minWidth: 300, wrapText: true, autoHeight: true },
    { field: "status", headerName: "状态", width: 92, sortable: false, cellRenderer: tagRenderer() },
    { field: "createdAt", headerName: "生成时间", width: 160 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    {
      label: "审核",
      kind: "run",
      shown: (r) => r.status === "待审核",
      okMsg: "请购单已提交采购",
      run: (r) => purchaseApi.approve(String(r.id)),
    },
    {
      label: "到货入库",
      kind: "run",
      shown: (r) => r.status === "已请购",
      okMsg: "已到货入库",
      run: (r) => purchaseApi.receive(String(r.id)),
    },
  ],
  toolbar: {
    acts: [{ label: "导出", okMsg: "导出任务已提交", refresh: false, run: (f) => exportRows("purchaseRequest", f) }],
  },
  detail: {
    sections: [
      {
        title: "单据信息",
        fields: [
          { label: "请购单号", from: "id" },
          { label: "备件", from: "spId", map: partMap.value },
          { label: "请购数量", from: "qty" },
          { label: "当前状态", from: "status" },
          { label: "生成时间", from: "createdAt" },
        ],
      },
      {
        title: "触发原因",
        fields: [{ label: "系统留痕", from: "reason" }],
      },
    ],
  },
  fetch: (q) => purchaseApi.page(q),
  summary: ({ total, rows }) => {
    const wait = rows.filter((r) => r.status === "待审核").length;
    return `共 ${total} 张请购单 · 本页待审核 ${wait}（领料跌破安全库存自动生成，与工单联动）`;
  },
}));
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
