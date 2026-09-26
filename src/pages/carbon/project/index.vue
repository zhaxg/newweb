<script setup lang="ts">
/** 对应线上「项目管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonReduction/project）
 *  已接入：GET /business/reductionProject/list（分页 + 项目名称/企业名称/项目类型/状态）
 *  待接入：新增 / 编辑 / 删除 / 停用 / 变动记录 / 减排统计 —— reductionProject 相关写端点已占位；
 *          行内「变动记录」「减排统计」在原页面是打开子面板/跳转，本次按 stub 处理（只 toast）
 *
 * ⚠️ 项目类型列的值是**原始 id**（实测行里就是 2092545315130118145），与 offset 类型表的 id
 *    不是同一套 id 空间，拿不到名字，故照原样展示。筛选也因同一原因**不参与过滤**
 *    （参数名故意用行里不存在的 offsetTypeName，见 mock/carbon/list.ts 的 livePairs 说明），
 *    否则选一个类型会把整表搜成空。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const STATUS: Record<string, string> = { "0": "正常", "1": "停用" };

const spec: ListPageSpec = {
  code: "project",
  query: [
    { key: "projectName", label: "项目名称", kind: "input", placeholder: "请输入" },
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    { key: "offsetTypeName", label: "项目类型", kind: "select", options: ["热力", "CCER"], placeholder: "请选择" },
    {
      key: "status",
      label: "状态",
      kind: "select",
      options: ["正常", "停用"],
      valueMap: { 正常: "0", 停用: "1" },
      placeholder: "请选择",
    },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 170, width: 180 },
    { field: "projectName", headerName: "项目名称", minWidth: 180, flex: 1 },
    { field: "offsetId", headerName: "项目类型", width: 170 },
    { field: "factorName", headerName: "减排因素名称", width: 140 },
    { field: "factorUnit", headerName: "减排因素单位", width: 120 },
    { field: "unitEmission", headerName: "单位碳排放量", width: 120 },
    { field: "benchmarks", headerName: "对标物", width: 130 },
    { field: "benchmarksUnitEmission", headerName: "对标物单位碳排放量", width: 160 },
    {
      field: "status",
      headerName: "状态",
      width: 80,
      valueFormatter: (p) => STATUS[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
    { label: "停用", kind: "stub" },
    { label: "变动记录", kind: "stub" },
    { label: "减排统计", kind: "stub" },
  ],
  toolbar: { add: true },
  detail: {
    sections: [
      {
        fields: [
          { label: "企业名称", from: "enterName" },
          { label: "项目名称", from: "projectName" },
          { label: "项目类型", from: "offsetId" },
          { label: "项目编号", from: "projectNo" },
          { label: "减排因素名称", from: "factorName" },
          { label: "减排因素单位", from: "factorUnit" },
          { label: "单位碳排放量", from: "unitEmission" },
          { label: "对标物", from: "benchmarks" },
          { label: "对标物单位碳排放量", from: "benchmarksUnitEmission" },
          { label: "状态", from: "status", map: STATUS },
          { label: "最后编辑人", from: "lastModifyUserName" },
          { label: "最后编辑时间", from: "lastModifyTime" },
        ],
      },
    ],
  },
  edit: {
    title: "项目管理",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["红河谷钢铁事业部"] },
      { key: "projectName", label: "项目名称", kind: "input" },
      { key: "factorName", label: "减排因素名称", kind: "input" },
      { key: "factorUnit", label: "减排因素单位", kind: "input" },
      { key: "unitEmission", label: "单位碳排放量", kind: "number" },
      { key: "benchmarks", label: "对标物", kind: "input" },
      { key: "benchmarksUnitEmission", label: "对标物单位碳排放量", kind: "number" },
      { key: "status", label: "状态", kind: "select", options: ["正常", "停用"] },
    ],
  },
  fetch: carbonQuery("/reductionProject/list"),
  writeFn: carbonStub("/reductionProject"),
  deleteFn: carbonStub("/reductionProject/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
