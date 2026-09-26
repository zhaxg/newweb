<script setup lang="ts">
/** 对应线上「排放记录」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/companyLevel/emissionRecord）
 *  已接入：POST /business/emissionRecords/company/table（分页 + 企业/排放源类型/数据来源/日期）
 *  待接入：新增 —— emissionRecords/company/save 已占位
 *
 * 「数据来源」存 code，字典组 `record_source`：0=人工录入 / 1=系统对接（线上字典实抓）。
 * 「流水号」取 `serialnumber`（另有 companyRecordsCode 是业务单号，非流水号）。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const SOURCE: Record<string, string> = { "0": "人工录入", "1": "系统对接" };
const SOURCE_OPTIONS = Object.values(SOURCE);

const spec: ListPageSpec = {
  code: "emissionRecord",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    {
      key: "emissionName",
      label: "排放源类型",
      kind: "select",
      options: ["消耗化石燃料排放", "过程排放", "含碳产品隐含的排放"],
      placeholder: "请选择",
    },
    {
      key: "dataSource",
      label: "数据来源",
      kind: "select",
      options: SOURCE_OPTIONS,
      valueMap: SOURCE,
      placeholder: "请选择",
    },
    { key: "dataTime", label: "日期", kind: "date", placeholder: "请选择日期" },
  ],
  columns: [
    { field: "serialnumber", headerName: "流水号", minWidth: 170, flex: 1 },
    { field: "enterName", headerName: "企业名称", minWidth: 170, width: 180 },
    { field: "emissionName", headerName: "排放源类型", width: 170 },
    { field: "totalCarbonDioxide", headerName: "排放量（tCO2）", width: 130 },
    {
      field: "dataSource",
      headerName: "数据来源",
      width: 100,
      valueFormatter: (p) => SOURCE[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "creatorUserName", headerName: "创建人", width: 100 },
    { field: "creatorTime", headerName: "创建时间", width: 155 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
  ],
  toolbar: { add: true },
  edit: {
    title: "排放记录",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["红河谷钢铁事业部"] },
      {
        key: "emissionName",
        label: "排放源类型",
        kind: "select",
        options: ["消耗化石燃料排放", "过程排放", "含碳产品隐含的排放"],
      },
      { key: "dataTime", label: "日期", kind: "date" },
      { key: "totalCarbonDioxide", label: "排放量", kind: "number", unit: "tCO2" },
      { key: "dataSource", label: "数据来源", kind: "select", options: SOURCE_OPTIONS, valueMap: SOURCE },
    ],
  },
  fetch: carbonQuery("/emissionRecords/company/table", "post"),
  writeFn: carbonStub("/emissionRecords/company/save"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
