<script setup lang="ts">
/** 对应线上「废水配置」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/energy-water）
 *  已接入：GET /business/forestCarbonConfigWater/listPage（分页 + 行业类型）
 *  待接入：新增 / 编辑 / 删除 —— forestCarbonConfigWater 与 forestCarbonConfigWater/:id 已占位
 *
 * 「是否为选项」存 isSelect：实测 0→否、2→是（照线上两行的显示反推，见 ../industries.ts 的 YES_NO_SELECT）。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import { INDUSTRY_OPTIONS, INDUSTRY_TYPE, INDUSTRY_VALUE_MAP, YES_NO_SELECT } from "../../industries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "energy-water",
  query: [
    {
      key: "industryType",
      label: "行业类型",
      kind: "select",
      options: INDUSTRY_OPTIONS,
      valueMap: INDUSTRY_VALUE_MAP,
      placeholder: "请选择",
    },
  ],
  columns: [
    { field: "name", headerName: "名称", minWidth: 200, flex: 1 },
    { field: "num", headerName: "编码", width: 100 },
    {
      field: "industryType",
      headerName: "行业类型",
      width: 200,
      valueFormatter: (p) => INDUSTRY_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "unit", headerName: "单位", width: 110 },
    {
      field: "isSelect",
      headerName: "是否为选项",
      width: 100,
      valueFormatter: (p) => YES_NO_SELECT[String(p.value)] ?? String(p.value ?? ""),
    },
  ],
  actions: [
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  edit: {
    title: "废水配置",
    fields: [
      { key: "name", label: "名称", kind: "input" },
      { key: "num", label: "编码", kind: "input" },
      {
        key: "industryType",
        label: "行业类型",
        kind: "select",
        options: INDUSTRY_OPTIONS,
        valueMap: INDUSTRY_VALUE_MAP,
      },
      { key: "unit", label: "单位", kind: "input" },
      { key: "isSelect", label: "是否为选项", kind: "select", options: ["是", "否"], valueMap: { 是: "2", 否: "0" } },
    ],
  },
  fetch: carbonQuery("/forestCarbonConfigWater/listPage"),
  writeFn: carbonStub("/forestCarbonConfigWater"),
  deleteFn: carbonStub("/forestCarbonConfigWater/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
