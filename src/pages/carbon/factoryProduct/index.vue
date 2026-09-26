<script setup lang="ts">
/** 对应线上「厂区产出品管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/factoryManage/factoryProduct）
 *  已接入：GET /business/factoryProduct/list（分页 + 产出品名称/企业名称/厂区名称）
 *  待接入：新增 / 删除 —— factoryProduct 与 /:id 已占位
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "factoryProduct",
  query: [
    { key: "productName", label: "产出品名称", kind: "input", placeholder: "请输入" },
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    { key: "factoryName", label: "厂区名称", kind: "input", placeholder: "请输入" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 170, flex: 1 },
    { field: "factoryName", headerName: "厂区名称", width: 130 },
    { field: "productName", headerName: "产出品名称", width: 140 },
    { field: "productUnit", headerName: "计量单位", width: 100 },
    { field: "proCount", headerName: "产量", width: 130 },
    { field: "processName", headerName: "关联工序", width: 130 },
  ],
  actions: [{ label: "删除", kind: "delete" }],
  toolbar: { add: true },
  edit: {
    title: "厂区产出品",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["天津示例钢铁企业有限公司"] },
      { key: "factoryName", label: "厂区名称", kind: "select", options: [] },
      { key: "productName", label: "产出品名称", kind: "select", options: [] },
    ],
  },
  fetch: carbonQuery("/factoryProduct/list"),
  writeFn: carbonStub("/factoryProduct"),
  deleteFn: carbonStub("/factoryProduct/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
