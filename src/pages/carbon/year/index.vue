<script setup lang="ts">
/** 对应线上「年度报表」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonReduction/year）
 *  已接入：GET /business/reductionRecords/selectProjectRecordsYear（分页 + 企业/项目/类型/时间区间）
 *  待接入：行内「详情」与导出 exportProjectRecordsYear —— 详情端点按 `:id` 占位
 *
 * 「统计时间」实测是**查询当下生成的时间**（页面打开那天的时分秒），不是行里字段，
 * 故由页面加载时取一次；线上是每次查询重新取，展示上无差别。
 * 「项目类型」列是 offsetId 原始 id，原因同 project 页注释。
 */
import type { ColDef } from "ag-grid-community";
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

function factorText(r: any): string {
  if (!r) return "";
  return [r.factorName, r.dataValue, r.factorUnit].filter((v) => v !== null && v !== undefined && v !== "").join(" ");
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const statTime = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
})();

const columns: ColDef[] = [
  { field: "enterName", headerName: "企业名称", minWidth: 170, width: 180 },
  { field: "projectName", headerName: "项目名称", minWidth: 180, flex: 1 },
  { field: "offsetId", headerName: "项目类型", width: 170 },
  { field: "dataTime", headerName: "年份", width: 80 },
  { colId: "factor", headerName: "减排因素数值", minWidth: 180, flex: 1, valueGetter: (p) => factorText(p.data) },
  { field: "emissionValue", headerName: "排放量（tCO2）", width: 130 },
  { field: "reductionValue", headerName: "减排量（tCO2）", width: 130 },
  { colId: "statTime", headerName: "统计时间", width: 155, valueGetter: () => statTime },
];

const spec: ListPageSpec = {
  code: "year",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    { key: "projectName", label: "项目名称", kind: "input", placeholder: "请输入" },
    { key: "offsetTypeName", label: "项目类型", kind: "select", options: ["热力", "CCER"], placeholder: "请选择" },
    { key: "dataTime", label: "时间", kind: "range", placeholder: "开始日期" },
  ],
  columns,
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: { export: true },
  detail: {
    sections: [
      {
        fields: [
          { label: "企业名称", from: "enterName" },
          { label: "项目名称", from: "projectName" },
          { label: "项目类型", from: "offsetId" },
          { label: "年份", from: "dataTime" },
          { label: "减排因素", from: "factorName" },
          { label: "因素数值", from: "dataValue" },
          { label: "因素单位", from: "factorUnit" },
          { label: "排放量", from: "emissionValue", suffix: " tCO2" },
          { label: "减排量", from: "reductionValue", suffix: " tCO2" },
          { label: "对标物", from: "benchmarks" },
          { label: "对标物数值", from: "benchmarksValue" },
          { label: "统计时间", from: "statTime" },
        ],
      },
    ],
  },
  fetch: carbonQuery("/reductionRecords/selectProjectRecordsYear"),
  exportFn: carbonStub("/reductionRecords/exportProjectRecordsYear"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
