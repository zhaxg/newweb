<script setup lang="ts">
/** 对应线上「碳排放计算器web端」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbon-calculator）
 *  已接入：GET /business/forestCarbonEnergy/listPage（分页 + 企业/行业/创建人）
 *          行业下拉候选取自同一份 CIndustryType 字典（../industries.ts）
 *  待接入：无行内动作；导入/模板下载等能力线上也不在这一页
 *
 * ⚠️ 种子是**空表**（线上演示环境该接口就回 0 行），因此列的字段名无法从返回体确认，
 *    按列头语义命名（enterName/industryName/emissionTime/creatorUserName/createTime/emissionVal）；
 *    筛选字段同样如此。一旦线上有数据，这几个名字要对着返回体核一遍。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import { INDUSTRY_OPTIONS, INDUSTRY_VALUE_MAP } from "../industries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "carbon-calculator",
  query: [
    {
      key: "enterName",
      label: "企业",
      kind: "select",
      options: ["红河谷钢铁事业部"],
      placeholder: "请选择",
    },
    {
      key: "industryName",
      label: "行业",
      kind: "select",
      options: INDUSTRY_OPTIONS,
      valueMap: INDUSTRY_VALUE_MAP,
      placeholder: "请选择",
    },
    { key: "creatorUserName", label: "创建人", kind: "input", placeholder: "请输入" },
  ],
  columns: [
    { field: "enterName", headerName: "企业", minWidth: 180, flex: 1 },
    { field: "industryName", headerName: "行业", width: 180 },
    { field: "emissionTime", headerName: "排放时间", width: 150 },
    { field: "creatorUserName", headerName: "创建人", width: 110 },
    { field: "createTime", headerName: "创建时间", width: 155 },
    { field: "emissionVal", headerName: "排放量", width: 130 },
  ],
  fetch: carbonQuery("/forestCarbonEnergy/listPage"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
