<script setup lang="ts">
/** 对应线上「过程排放配置」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbon-process）
 *  已接入：GET /business/forestCarbonConfigProcess/listPage（分页 + 行业类型/类型）
 *  待接入：新增 / 编辑 / 删除 —— forestCarbonConfigProcess 与 /:id 已占位
 *
 * 「类型」列的规则与线上一致：**有 typeName 就显示 typeName，为空则显示原始 type 编码**
 * （实测「保护气」那行 typeName 为空、列里显示的就是编码 6）。筛选因此按 typeName 文本匹配，
 * 下拉候选取种子里实际出现过的 typeName。
 * 「是否有纯度」实测 0→否；「是否默认项」实测 1→是。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import { INDUSTRY_OPTIONS, INDUSTRY_TYPE, INDUSTRY_VALUE_MAP, YES_NO_DEFAULT, YES_NO_PURITY } from "../../industries";
import type { ListPageSpec } from "../../listTypes";

const TYPE_OPTIONS = [
  "原材料排放CO2",
  "化工产品排放CO2",
  "二氧化碳气体保护焊产生的 CO2排放",
  "副产物及逃逸排放",
  "HFC-23排放",
];

const spec: ListPageSpec = {
  code: "carbon-process",
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
    {
      colId: "type",
      headerName: "类型",
      width: 160,
      valueGetter: (p) => p.data?.typeName || String(p.data?.type ?? ""),
    },
    { field: "unit", headerName: "单位", width: 80 },
    { field: "factor", headerName: "排放因子", width: 110 },
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
    title: "过程排放配置",
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
      { key: "type", label: "类型", kind: "select", options: TYPE_OPTIONS },
      { key: "unit", label: "单位", kind: "input" },
      { key: "factor", label: "排放因子", kind: "number" },
      { key: "isPotency", label: "是否有纯度", kind: "select", options: ["是", "否"], valueMap: { 是: "1", 否: "0" } },
      { key: "isDefault", label: "是否默认项", kind: "select", options: ["是", "否"], valueMap: { 是: "1", 否: "0" } },
    ],
  },
  fetch: carbonQuery("/forestCarbonConfigProcess/listPage"),
  writeFn: carbonStub("/forestCarbonConfigProcess"),
  deleteFn: carbonStub("/forestCarbonConfigProcess/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
