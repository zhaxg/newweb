<script setup lang="ts">
/** 对应线上「化石燃料排放配置」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbon-fuel）
 *  已接入：GET /business/forestCarbonConfigFuel/listPage（分页 + 行业类型）
 *  待接入：新增 / 编辑 / 删除 —— forestCarbonConfigFuel 与 forestCarbonConfigFuel/:id 已占位，回成功不落库
 *
 * 行业类型列存的是字典序号（"9"），显示走 CIndustryType 字典 → 见 ../industries.ts。
 * 「是否默认项」存 "1"，线上显示「是」（实测）。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import { INDUSTRY_OPTIONS, INDUSTRY_TYPE, INDUSTRY_VALUE_MAP, YES_NO_DEFAULT } from "../industries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "carbon-fuel",
  query: [
    {
      key: "industryType",
      label: "行业类型",
      kind: "select",
      options: INDUSTRY_OPTIONS,
      valueMap: INDUSTRY_VALUE_MAP,
      placeholder: "请选择行业类型",
    },
  ],
  columns: [
    { field: "fuelName", headerName: "名称", minWidth: 160, flex: 1 },
    { field: "fuelNum", headerName: "燃料编码", width: 100 },
    {
      field: "industryType",
      headerName: "行业类型",
      width: 200,
      valueFormatter: (p) => INDUSTRY_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "unit", headerName: "单位", width: 80 },
    { field: "lowCalorific", headerName: "低位发热量", width: 110 },
    { field: "content", headerName: "单位热值含碳", width: 120 },
    { field: "oxygen", headerName: "燃料碳氧", width: 100 },
    { field: "ratio", headerName: "系数分子", width: 100 },
    { field: "ratio1", headerName: "系数分母", width: 100 },
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
    title: "化石燃料排放配置",
    fields: [
      { key: "fuelName", label: "名称", kind: "input" },
      { key: "fuelNum", label: "燃料编码", kind: "input" },
      {
        key: "industryType",
        label: "行业类型",
        kind: "select",
        options: INDUSTRY_OPTIONS,
        valueMap: INDUSTRY_VALUE_MAP,
      },
      { key: "unit", label: "单位", kind: "input" },
      { key: "lowCalorific", label: "低位发热量", kind: "number" },
      { key: "content", label: "单位热值含碳", kind: "number" },
      { key: "oxygen", label: "燃料碳氧", kind: "number" },
      { key: "ratio", label: "系数分子", kind: "number" },
      { key: "ratio1", label: "系数分母", kind: "number" },
      { key: "isDefault", label: "是否默认项", kind: "select", options: ["是", "否"] },
    ],
  },
  fetch: carbonQuery("/forestCarbonConfigFuel/listPage"),
  writeFn: carbonStub("/forestCarbonConfigFuel"),
  deleteFn: carbonStub("/forestCarbonConfigFuel/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
