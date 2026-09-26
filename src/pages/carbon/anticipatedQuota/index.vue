<script setup lang="ts">
/** 对应线上「预计配额」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/anticipatedQuota）
 *  已接入：GET /business/anticipatedQuota/list（分页 + 企业名称/行业/年度）
 *          行内详情用行数据渲染；行业/交易所下拉候选取自 /business/tradingPost/selectList 同族数据
 *  待接入：新增 / 编辑 / 删除 —— anticipatedQuota/{add,edit,deleteById/:id} 已注册占位，回成功不落库
 *
 * 年度筛选按 `as: "year"` 只送年份（见 listTypes 的 QueryField.as 说明）。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "anticipatedQuota",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入企业名称" },
    { key: "professionName", label: "行业", kind: "select", options: ["中国钢铁生产企业"], placeholder: "请选择行业" },
    { key: "quotaYear", label: "年度", kind: "date", placeholder: "开始年份", as: "year" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 180, flex: 1 },
    { field: "professionName", headerName: "行业", width: 150 },
    { field: "tradingPostName", headerName: "交易所", width: 140 },
    { field: "quotaYear", headerName: "年度", width: 70 },
    { field: "quotaMethodName", headerName: "配额方法", width: 110 },
    { field: "anticipatedQuotaVal", headerName: "预计配额量（tCO2）", width: 150 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  detail: {
    sections: [
      {
        fields: [
          { label: "企业名称", from: "enterName" },
          { label: "行业", from: "professionName" },
          { label: "交易所", from: "tradingPostName" },
          { label: "年度", from: "quotaYear" },
          { label: "配额方法", from: "quotaMethodName" },
          { label: "预计配额量", from: "anticipatedQuotaVal", suffix: " tCO2" },
          { label: "备注", from: "remark" },
          { label: "最后编辑时间", from: "lastModifyTime" },
        ],
      },
    ],
  },
  edit: {
    title: "预计配额",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["天津示例钢铁企业有限公司"] },
      { key: "professionName", label: "所属行业", kind: "select", options: ["中国钢铁生产企业"] },
      { key: "tradingPostName", label: "交易所", kind: "select", options: ["天津碳排放交易所"] },
      { key: "quotaYear", label: "配额年份", kind: "date" },
      { key: "anticipatedQuotaVal", label: "预计配额量", kind: "number", unit: "tCO2" },
    ],
  },
  fetch: carbonQuery("/anticipatedQuota/list"),
  writeFn: carbonStub("/anticipatedQuota/add"),
  deleteFn: carbonStub("/anticipatedQuota/deleteById/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
