<script setup lang="ts">
/** 对应线上「生产用料管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/productionMaterialsManage）
 *  已接入：GET /business/productionMaterialsEnter/list（分页 + 生产用料 + 排放因子区间）
 *  待接入：新增 / 详情 / 编辑 / 删除 —— productionMaterialsEnter 与 /:id 已占位
 *
 * 排放因子是**数值区间**（MIN/MAX 两个输入），不是模糊匹配 → mock 侧走 numRange
 * （见 mock/carbon/list.ts 的 ranges，参数名 emissionFactorsMin / emissionFactorsMax）。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "productionMaterialsManage",
  query: [
    { key: "materialsName", label: "生产用料", kind: "input", placeholder: "请输入" },
    { key: "emissionFactorsMin", label: "排放因子MIN", kind: "input", placeholder: "请输入" },
    { key: "emissionFactorsMax", label: "排放因子MAX", kind: "input", placeholder: "请输入" },
  ],
  columns: [
    { field: "materialsName", headerName: "生产用料", minWidth: 160, flex: 1 },
    { field: "aliasName", headerName: "别名", width: 140 },
    { field: "materialsUnit", headerName: "计量单位", width: 100 },
    { field: "molecularFormula", headerName: "分子式", width: 110 },
    { field: "emissionFactorsValue", headerName: "排放因子", width: 120 },
    { field: "emissionFactorsUnit", headerName: "排放因子单位", width: 130 },
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
          { label: "生产用料", from: "materialsName" },
          { label: "别名", from: "aliasName" },
          { label: "计量单位", from: "materialsUnit" },
          { label: "分子式", from: "molecularFormula" },
          { label: "排放因子", from: "emissionFactorsValue" },
          { label: "排放因子单位", from: "emissionFactorsUnit" },
          { label: "数据来源", from: "dataSource" },
          { label: "所属行业", from: "professionName" },
          { label: "备注", from: "remark" },
        ],
      },
    ],
  },
  edit: {
    title: "生产用料",
    fields: [
      { key: "materialsName", label: "生产用料", kind: "input" },
      { key: "aliasName", label: "别名", kind: "input" },
      { key: "materialsUnit", label: "计量单位", kind: "input" },
      { key: "molecularFormula", label: "分子式", kind: "input" },
      { key: "emissionFactorsValue", label: "排放因子", kind: "number" },
      { key: "emissionFactorsUnit", label: "排放因子单位", kind: "input" },
      { key: "remark", label: "备注", kind: "textarea" },
    ],
  },
  fetch: carbonQuery("/productionMaterialsEnter/list"),
  writeFn: carbonStub("/productionMaterialsEnter"),
  deleteFn: carbonStub("/productionMaterialsEnter/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
