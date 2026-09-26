<script setup lang="ts">
/** 对应线上「碳交易」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonTrading）
 *  已接入：GET /business/carbonTrade/list（分页 + 企业名称/交易类型/交易时间区间）
 *  待接入：新增 / 编辑 / 删除 —— carbonTrade/{add,edit,delete/:id} 已占位，回成功不落库
 *
 * 交易类型、盈亏类型行里存的是 code（tradeTypeCode / profitLossFlag）+ 名称字段，
 * 列展示直接用名称字段（tradeTypeName / profitLossName），筛选也按名称字段走。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "carbonTrading",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入企业名称" },
    {
      key: "tradeTypeName",
      label: "交易类型",
      kind: "select",
      options: ["购入", "卖出"],
      placeholder: "请选择交易类型",
    },
    { key: "tradeTime", label: "交易时间", kind: "range", placeholder: "开始日期" },
  ],
  columns: [
    { field: "tradeNo", headerName: "流水号", minWidth: 170, flex: 1 },
    { field: "enterName", headerName: "企业名称", minWidth: 170, width: 180 },
    { field: "tradeTime", headerName: "交易时间", width: 150 },
    { field: "tradeTypeName", headerName: "交易类型", width: 90 },
    { field: "tradeVal", headerName: "交易量（tCO2）", width: 130 },
    { field: "tradePrice", headerName: "交易单价（元/tCO2）", width: 150 },
    { field: "marketPrice", headerName: "市场单价（元/tCO2）", width: 150 },
    { field: "profitLossName", headerName: "盈亏类型", width: 90 },
    { field: "profitLossVal", headerName: "盈亏金额（元）", width: 130 },
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
          { label: "流水号", from: "tradeNo" },
          { label: "企业名称", from: "enterName" },
          { label: "交易时间", from: "tradeTime" },
          { label: "交易类型", from: "tradeTypeName" },
          { label: "交易量", from: "tradeVal", suffix: " tCO2" },
          { label: "交易单价", from: "tradePrice", suffix: " 元/tCO2" },
          { label: "市场单价", from: "marketPrice", suffix: " 元/tCO2" },
          { label: "交易总额", from: "tradeTotalPrice", suffix: " 元" },
          { label: "市场总额", from: "marketTotalPrice", suffix: " 元" },
          { label: "盈亏类型", from: "profitLossName" },
          { label: "盈亏金额", from: "profitLossVal", suffix: " 元" },
          { label: "备注", from: "remark" },
        ],
      },
    ],
  },
  edit: {
    title: "碳交易",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["红河谷钢铁事业部"] },
      { key: "tradeTypeName", label: "交易类型", kind: "select", options: ["购入", "卖出"] },
      { key: "tradeTime", label: "交易时间", kind: "date" },
      { key: "tradeVal", label: "交易量", kind: "number", unit: "tCO2" },
      { key: "tradePrice", label: "交易单价", kind: "number", unit: "元/tCO2" },
      { key: "marketPrice", label: "市场单价", kind: "number", unit: "元/tCO2" },
    ],
  },
  fetch: carbonQuery("/carbonTrade/list"),
  writeFn: carbonStub("/carbonTrade/add"),
  deleteFn: carbonStub("/carbonTrade/delete/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
