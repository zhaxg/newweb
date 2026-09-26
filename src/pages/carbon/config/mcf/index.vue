<script setup lang="ts">
/** 对应线上「MCF配置」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbon-mcf）
 *  已接入：GET /business/forestCarbonConfigMcf/listPage（分页 + 行业类型）
 *  待接入：新增 / 编辑 / 删除 —— forestCarbonConfigMcf 与 /:id 已占位
 *
 * MCF值字段名线上是 `vaule`（拼写就是如此，照抄不改，否则按 value 取不到）。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import { INDUSTRY_OPTIONS, INDUSTRY_TYPE, INDUSTRY_VALUE_MAP } from "../../industries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "carbon-mcf",
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
    { field: "name", headerName: "处理和排放途径或系统类型", minWidth: 220, flex: 1 },
    { field: "vaule", headerName: "MCF值", width: 100 },
    {
      field: "industryType",
      headerName: "行业类型",
      width: 200,
      valueFormatter: (p) => INDUSTRY_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "remark", headerName: "备注", width: 160 },
  ],
  actions: [
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  edit: {
    title: "MCF配置",
    fields: [
      { key: "name", label: "处理和排放途径或系统类型", kind: "input" },
      { key: "vaule", label: "MCF值", kind: "number" },
      {
        key: "industryType",
        label: "行业类型",
        kind: "select",
        options: INDUSTRY_OPTIONS,
        valueMap: INDUSTRY_VALUE_MAP,
      },
      { key: "remark", label: "备注", kind: "textarea" },
    ],
  },
  fetch: carbonQuery("/forestCarbonConfigMcf/listPage"),
  writeFn: carbonStub("/forestCarbonConfigMcf"),
  deleteFn: carbonStub("/forestCarbonConfigMcf/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
