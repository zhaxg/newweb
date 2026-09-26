<script setup lang="ts">
/** 对应线上「减排统计」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonReduction/statistic）
 *  已接入：GET /business/reductionRecords/selectProjectRecordsReport（分页 + 企业/项目/类型/时间区间）
 *  行内「月度报表」「年度报表」是站内跳转 → /carbonReduction/{month,year}
 *
 * 「减排因素数值」在行里不是一个字段，线上显示的是拼接串
 * 「CO2捕集量 86900 tCO2」= factorName + dataValue + factorUnit，这里按同一规则由 valueGetter 拼。
 * 右上角「减排量：… tCO2」是当前结果集的合计，故 summary 用函数现算。
 */
import type { ColDef } from "ag-grid-community";
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

function factorText(r: any): string {
  if (!r) return "";
  return [r.factorName, r.dataValue, r.factorUnit].filter((v) => v !== null && v !== undefined && v !== "").join(" ");
}

const columns: ColDef[] = [
  { field: "enterName", headerName: "企业名称", minWidth: 170, width: 180 },
  { field: "projectName", headerName: "项目名称", minWidth: 180, flex: 1 },
  { field: "offsetId", headerName: "项目类型", width: 170 },
  { colId: "factor", headerName: "减排因素数值", minWidth: 180, flex: 1, valueGetter: (p) => factorText(p.data) },
  { field: "emissionValue", headerName: "排放量（tCO2）", width: 130 },
  { field: "reductionValue", headerName: "累计减排量（tCO2）", width: 150 },
];

const spec: ListPageSpec = {
  code: "statistic",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    { key: "projectName", label: "项目名称", kind: "input", placeholder: "请输入" },
    { key: "offsetTypeName", label: "项目类型", kind: "select", options: ["热力", "CCER"], placeholder: "请选择" },
    { key: "dataTime", label: "时间", kind: "range", placeholder: "开始日期" },
  ],
  columns,
  actions: [
    { label: "月度报表", kind: "link", to: "/carbonReduction/month" },
    { label: "年度报表", kind: "link", to: "/carbonReduction/year" },
  ],
  summary: ({ rows }) => {
    const sum = rows.reduce((acc, r) => acc + Number(r?.reductionValue ?? 0), 0);
    return `减排量：${Number.isInteger(sum) ? sum : sum.toFixed(2)} tCO2`;
  },
  fetch: carbonQuery("/reductionRecords/selectProjectRecordsReport"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
