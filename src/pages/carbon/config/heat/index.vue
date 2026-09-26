<script setup lang="ts">
/** 对应线上「电和热配置」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbon-heat）
 *  已接入：GET /business/forestCarbonConfigHeat/listPage（分页 + 行业类型/类型）
 *  待接入：新增 / 编辑 / 删除 —— forestCarbonConfigHeat 与 /:id 已占位
 *
 * 「类型」列的 `typeName` 在这批种子里**全是 null**，线上显示的是「热力/电力」，
 * 由 `type` 编码翻出来（seed 里 电力 全是 type=1、热水/蒸汽 全是 type=2，故 1=电力、2=热力），
 * 见 ../industries.ts 的 HEAT_TYPE。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import { HEAT_TYPE, INDUSTRY_OPTIONS, INDUSTRY_TYPE, INDUSTRY_VALUE_MAP, YES_NO_DEFAULT } from "../../industries";
import type { ListPageSpec } from "../../listTypes";

const HEAT_VALUE_MAP: Record<string, string> = { 电力: "1", 热力: "2" };

const spec: ListPageSpec = {
  code: "carbon-heat",
  query: [
    {
      key: "industryType",
      label: "行业类型",
      kind: "select",
      options: INDUSTRY_OPTIONS,
      valueMap: INDUSTRY_VALUE_MAP,
      placeholder: "请选择行业类型",
    },
    {
      key: "type",
      label: "类型",
      kind: "select",
      options: ["电力", "热力"],
      valueMap: HEAT_VALUE_MAP,
      placeholder: "请选择类型",
    },
  ],
  columns: [
    { field: "name", headerName: "名称", minWidth: 140, flex: 1 },
    { field: "num", headerName: "编码", width: 100 },
    {
      field: "industryType",
      headerName: "行业类型",
      width: 200,
      valueFormatter: (p) => INDUSTRY_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "unit", headerName: "单位", width: 90 },
    { field: "factor", headerName: "排放因子", width: 120 },
    {
      field: "type",
      headerName: "类型",
      width: 90,
      valueFormatter: (p) => HEAT_TYPE[String(p.value)] ?? String(p.value ?? ""),
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
    title: "电和热配置",
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
      { key: "factor", label: "排放因子", kind: "number" },
      { key: "type", label: "类型", kind: "select", options: ["电力", "热力"], valueMap: HEAT_VALUE_MAP },
      { key: "isDefault", label: "是否默认项", kind: "select", options: ["是", "否"], valueMap: { 是: "1", 否: "0" } },
    ],
  },
  fetch: carbonQuery("/forestCarbonConfigHeat/listPage"),
  writeFn: carbonStub("/forestCarbonConfigHeat"),
  deleteFn: carbonStub("/forestCarbonConfigHeat/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
