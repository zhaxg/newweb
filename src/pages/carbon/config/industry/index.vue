<script setup lang="ts">
/** 对应线上「行业管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/administration）
 *  已接入：GET /business/CarbonIndustryManage（分页 + 行业名称）
 *  待接入：行内「企业管理」——线上是打开该行业下的企业子面板，本次按插桩处理（只 toast）
 *
 * 「排放项」「减排项」两列在种子里字段存在但**全为 null**（线上同样显示空白），筛选因此
 * 用行里不存在的参数名 missItemNameQuery / missReduceItemNameQuery——见 mock/carbon/list.ts：
 * 行里没有这个维度就不参与过滤，否则一选就把有数据的行业全筛没了。
 * 这两个下拉的候选项线上取自别处，本次未取到，留空（placeholder 提示）。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "administration",
  query: [
    { key: "industryName", label: "行业名称", kind: "input", placeholder: "请输入行业名称" },
    { key: "missItemNameQuery", label: "排放项", kind: "select", options: [], placeholder: "请选择排放项" },
    { key: "missReduceItemNameQuery", label: "减排项", kind: "select", options: [], placeholder: "请选择减排项" },
  ],
  columns: [
    { field: "industryName", headerName: "行业名称", minWidth: 220, flex: 1 },
    { field: "missItemName", headerName: "排放项", width: 160 },
    { field: "missReduceItemName", headerName: "减排项", width: 160 },
  ],
  actions: [{ label: "企业管理", kind: "stub" }],
  fetch: carbonQuery("/CarbonIndustryManage"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
