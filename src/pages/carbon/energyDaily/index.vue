<script setup lang="ts">
/** 对应线上「能耗日报表」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/reportForm/energyDaily）
 *  已接入：GET /business/dayReport/selectEnergyDayByEnergy（分页 + 名称/时间区间）
 *  待接入：行内无动作（原页面操作列是空的）
 *
 * 「消耗量」= dataValue，「碳排放量（吨）」= emissionData（照线上行取值反查）。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "energyDaily",
  query: [
    { key: "energyName", label: "名称", kind: "input", placeholder: "请输入" },
    { key: "dataTime", label: "时间", kind: "range", placeholder: "开始日期" },
  ],
  columns: [
    { field: "energyName", headerName: "名称", minWidth: 180, flex: 1 },
    { field: "dataTime", headerName: "时间", width: 120 },
    { field: "dataValue", headerName: "消耗量", width: 160 },
    { field: "emissionData", headerName: "碳排放量（吨）", width: 160 },
  ],
  fetch: carbonQuery("/dayReport/selectEnergyDayByEnergy"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
