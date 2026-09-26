<script setup lang="ts">
/** 对应线上「目标管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/targetManage）
 *  已接入：GET /business/targetManagement/list（分页 + 目标名称/企业名称/厂区名称/工序名称/年度）
 *  待接入：新增 / 编辑 / 删除 —— `/business/targetManagement[/:id]` 已按线上路径注册为占位，
 *          mock 回成功但不落库。
 *
 * 两处与线上字段的对照（照实测行值反推）：
 *  - 类型列存的是编码 targetTypeId（enter_target / project_target / group_target），
 *    线上展示中文，故用 valueFormatter 映射；
 *  - 目标描述列在行数据里不是单字段，线上是拼接串
 *    「排放量:小于 1000000t 排放强度:小于 1.89 减排量:大于 300000t」，这里按同一规则由 valueGetter 拼。
 */
import type { ColDef } from "ag-grid-community";
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const TARGET_TYPE: Record<string, string> = {
  enter_target: "企业目标",
  project_target: "项目目标",
  group_target: "集团目标",
};
const SYMBOL: Record<string, string> = { less: "小于", greater: "大于", equal: "等于" };

function describe(r: any): string {
  if (!r) return "";
  const parts: string[] = [];
  if (r.emissionData != null) parts.push(`排放量:${SYMBOL[r.emissionSymbolCode] ?? ""} ${r.emissionData}t`);
  if (r.strengthData != null) parts.push(`排放强度:${SYMBOL[r.strengthSymbolCode] ?? ""} ${r.strengthData}`);
  if (r.reductionData != null) parts.push(`减排量:${SYMBOL[r.reductionSymbolCode] ?? ""} ${r.reductionData}t`);
  return parts.join(" ");
}

const columns: ColDef[] = [
  { field: "targetName", headerName: "名称", minWidth: 180, flex: 1 },
  {
    field: "targetTypeId",
    headerName: "类型",
    width: 90,
    valueFormatter: (p) => TARGET_TYPE[p.value as string] ?? String(p.value ?? ""),
  },
  { field: "targetYear", headerName: "年度", width: 70 },
  { field: "enterName", headerName: "适用企业", minWidth: 170, width: 180 },
  { field: "factoryName", headerName: "适用厂区", width: 110 },
  { field: "processName", headerName: "适用工序", width: 110 },
  { colId: "desc", headerName: "目标描述", minWidth: 220, flex: 2, valueGetter: (p) => describe(p.data) },
];

const spec: ListPageSpec = {
  code: "targetManage",
  query: [
    { key: "targetName", label: "目标名称", kind: "input", placeholder: "请输入目标名称" },
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入企业名称" },
    { key: "factoryName", label: "厂区名称", kind: "input", placeholder: "请输入厂区名称" },
    { key: "processName", label: "工序名称", kind: "input", placeholder: "请输入工序名称" },
    { key: "targetYear", label: "年度", kind: "date", placeholder: "请选择年度", as: "year" },
  ],
  columns,
  actions: [
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  edit: {
    title: "目标",
    fields: [
      { key: "targetName", label: "目标名称", kind: "input" },
      { key: "targetTypeId", label: "目标类型", kind: "select", options: ["企业目标", "项目目标", "集团目标"] },
      { key: "targetYear", label: "年度", kind: "date" },
      { key: "enterName", label: "企业名称", kind: "select", options: ["红河谷钢铁事业部"] },
      { key: "factoryName", label: "厂区名称", kind: "select", options: [] },
      { key: "processName", label: "工序名称", kind: "select", options: [] },
      { key: "emissionData", label: "排放量", kind: "number", unit: "tCO2" },
      { key: "strengthData", label: "排放强度", kind: "number" },
      { key: "reductionData", label: "减排量", kind: "number", unit: "tCO2" },
    ],
  },
  fetch: carbonQuery("/targetManagement/list"),
  writeFn: carbonStub("/targetManagement"),
  deleteFn: carbonStub("/targetManagement/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
