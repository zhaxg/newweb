<script setup lang="ts">
/** 对应线上「产出品管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/producedManage）
 *  已接入：GET /business/productManage/list（分页 + 产出品名称）
 *  待接入：新增 / 详情 / 编辑 / 删除 —— productManage/{add,edit,delete/:id,getInfo/:id} 已占位
 *
 * 「关联工序」「关联厂区」两列线上显示的是**计数**（实测 轧钢 那行是 0 / 0、粗钢 是 0 / 2），
 * 对应行字段 proCount / facCount——不是名称，也不是 id。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "producedManage",
  query: [{ key: "productName", label: "产出品名称", kind: "input", placeholder: "请输入" }],
  columns: [
    { field: "productName", headerName: "产出品名称", minWidth: 160, flex: 1 },
    { field: "productUnit", headerName: "计量单位", width: 100 },
    { field: "proCount", headerName: "关联工序", width: 100 },
    { field: "facCount", headerName: "关联厂区", width: 100 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  detail: {
    sections: [
      {
        fields: [
          { label: "产出品名称", from: "productName" },
          { label: "计量单位", from: "productUnit" },
          { label: "关联工序数", from: "proCount" },
          { label: "关联厂区数", from: "facCount" },
          { label: "备注", from: "remark" },
          { label: "最后编辑人", from: "lastModifyUserName" },
          { label: "最后编辑时间", from: "lastModifyTime" },
        ],
      },
    ],
  },
  edit: {
    title: "产出品",
    fields: [
      { key: "productName", label: "产出品名称", kind: "input" },
      { key: "productUnit", label: "计量单位", kind: "input" },
      { key: "remark", label: "备注", kind: "textarea" },
    ],
  },
  fetch: carbonQuery("/productManage/list"),
  writeFn: carbonStub("/productManage/add"),
  deleteFn: carbonStub("/productManage/delete/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
