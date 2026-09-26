<script setup lang="ts">
/** 对应线上「减排配置」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbon-reduce）
 *  已接入：GET /business/forestCarbonConfigReduce/listPage（分页 + 行业类型/类型）
 *  待接入：新增 / 编辑 / 删除 —— forestCarbonConfigReduce 与 /:id 已占位
 *
 * 「类型」列规则同过程排放配置：typeName 为空则显示原始 type 编码（见 carbon-process 页注释）。
 * 筛选按 typeName 文本匹配，候选取种子里实际出现过的值。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import { INDUSTRY_OPTIONS, INDUSTRY_TYPE, INDUSTRY_VALUE_MAP, YES_NO_DEFAULT, YES_NO_PURITY } from "../../industries";
import type { ListPageSpec } from "../../listTypes";

const TYPE_OPTIONS = ["火炬销毁CH4", "回收销毁CH4", "CO2回收利用", "CH4回收利用", "回收利用CO2"];

const spec: ListPageSpec = {
  code: "carbon-reduce",
  query: [
    {
      key: "industryType",
      label: "行业类型",
      kind: "select",
      options: INDUSTRY_OPTIONS,
      valueMap: INDUSTRY_VALUE_MAP,
      placeholder: "请选择",
    },
    { key: "type", label: "类型", kind: "select", options: TYPE_OPTIONS, placeholder: "请选择" },
  ],
  columns: [
    { field: "name", headerName: "名称", minWidth: 150, flex: 1 },
    { field: "num", headerName: "编码", width: 100 },
    {
      field: "industryType",
      headerName: "行业类型",
      width: 200,
      valueFormatter: (p) => INDUSTRY_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "unit", headerName: "单位", width: 90 },
    {
      colId: "type",
      headerName: "类型",
      width: 130,
      valueGetter: (p) => p.data?.typeName || String(p.data?.type ?? ""),
    },
    { field: "selfUseRate", headerName: "自用率", width: 90 },
    { field: "factor", headerName: "排放因子", width: 110 },
    { field: "fuelNum", headerName: "燃料编号", width: 100 },
    {
      field: "isPotency",
      headerName: "是否有纯度",
      width: 100,
      valueFormatter: (p) => YES_NO_PURITY[String(p.value)] ?? String(p.value ?? ""),
    },
    {
      field: "isDefault",
      headerName: "是否默认项",
      width: 100,
      valueFormatter: (p) => YES_NO_DEFAULT[String(p.value)] ?? String(p.value ?? ""),
    },
  ],
  actions: [
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  edit: {
    title: "减排配置",
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
      { key: "type", label: "类型", kind: "select", options: TYPE_OPTIONS },
      { key: "selfUseRate", label: "自用率", kind: "number" },
      { key: "factor", label: "排放因子", kind: "number" },
      { key: "fuelNum", label: "燃料编号", kind: "input" },
      { key: "isPotency", label: "是否有纯度", kind: "select", options: ["是", "否"], valueMap: { 是: "1", 否: "0" } },
      { key: "isDefault", label: "是否默认项", kind: "select", options: ["是", "否"], valueMap: { 是: "1", 否: "0" } },
    ],
  },
  fetch: carbonQuery("/forestCarbonConfigReduce/listPage"),
  writeFn: carbonStub("/forestCarbonConfigReduce"),
  deleteFn: carbonStub("/forestCarbonConfigReduce/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
