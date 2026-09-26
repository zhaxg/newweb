<script setup lang="ts">
/** 对应线上「厂区管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/factoryManage/factoryArea）
 *  已接入：GET /business/factoryManage/list（分页 + 厂区名称/所属企业）
 *  待接入：新增 / 详情 / 编辑 / 删除 —— factoryManage/{add,edit,delete/:id,getInfo/:id} 已占位；
 *          行内「工序管理」「产出品管理」线上是跳到对应子列表，本次按插桩提示
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "factoryArea",
  query: [
    { key: "factoryName", label: "厂区名称", kind: "input", placeholder: "请输入" },
    {
      key: "enterName",
      label: "所属企业",
      kind: "select",
      options: ["红河谷钢铁事业部"],
      placeholder: "请选择",
    },
  ],
  columns: [
    { field: "factoryName", headerName: "厂区名称", minWidth: 150, flex: 1 },
    { field: "enterName", headerName: "所属企业", minWidth: 170, width: 180 },
    { field: "facProcessCount", headerName: "工序数量", width: 100 },
    { field: "productCount", headerName: "产出品", width: 90 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
    { label: "工序管理", kind: "stub" },
    { label: "产出品管理", kind: "stub" },
  ],
  toolbar: { add: true },
  detail: {
    sections: [
      {
        fields: [
          { label: "厂区名称", from: "factoryName" },
          { label: "所属企业", from: "enterName" },
          { label: "工序数量", from: "facProcessCount" },
          { label: "产出品数量", from: "productCount" },
          { label: "描述", from: "remark" },
          { label: "最后编辑人", from: "lastModifyUserName" },
          { label: "最后编辑时间", from: "lastModifyTime" },
        ],
      },
    ],
  },
  edit: {
    title: "厂区",
    fields: [
      { key: "enterName", label: "所属企业", kind: "select", options: ["红河谷钢铁事业部"] },
      { key: "factoryName", label: "厂区名称", kind: "input" },
      { key: "remark", label: "描述", kind: "textarea" },
    ],
  },
  fetch: carbonQuery("/factoryManage/list"),
  writeFn: carbonStub("/factoryManage/add"),
  deleteFn: carbonStub("/factoryManage/delete/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
