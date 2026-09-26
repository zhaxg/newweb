<script setup lang="ts">
/** 对应线上「工序产出品」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/processManage/procedureProduced）
 *  已接入：GET /business/factoryProduct/processList（分页 + 厂区/工序/产出品）
 *  待接入：新增 / 删除 —— factoryProduct 与 /:id 已占位
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "procedureProduced",
  query: [
    { key: "factoryName", label: "厂区名称", kind: "input", placeholder: "请输入" },
    { key: "processName", label: "工序名称", kind: "input", placeholder: "请输入" },
    { key: "productName", label: "产出品名称", kind: "input", placeholder: "请输入" },
  ],
  columns: [
    { field: "factoryName", headerName: "厂区名称", minWidth: 140, flex: 1 },
    { field: "processName", headerName: "工序名称", width: 140 },
    { field: "productName", headerName: "产出品名称", width: 140 },
    { field: "productUnit", headerName: "计量单位", width: 100 },
    { field: "productionData", headerName: "产量", width: 130 },
    { field: "emissionData", headerName: "碳排放量（吨）", width: 150 },
  ],
  actions: [{ label: "删除", kind: "delete" }],
  toolbar: { add: true },
  edit: {
    title: "工序产出品",
    fields: [
      { key: "factoryName", label: "厂区名称", kind: "select", options: ["炼铁厂", "轧钢厂", "动力厂"] },
      { key: "processName", label: "工序名称", kind: "select", options: [] },
      { key: "productName", label: "产出品名称", kind: "select", options: [] },
      { key: "productionData", label: "产量", kind: "number" },
      { key: "emissionData", label: "碳排放量", kind: "number", unit: "吨" },
    ],
  },
  fetch: carbonQuery("/factoryProduct/processList"),
  writeFn: carbonStub("/factoryProduct"),
  deleteFn: carbonStub("/factoryProduct/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
