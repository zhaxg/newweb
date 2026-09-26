<script setup lang="ts">
/** 对应线上「能耗月报表」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/reportForm/energyExpends）
 *  已接入：GET /business/monthReport/selectEnergyMonthByEnergy（分页 + 名称/时间区间）
 *  待接入：行内「详情」—— 线上弹窗字段未取到，本次用行数据渲染（字段与列同源）
 *
 * 注意与「碳减排 → 月度报表」不是同一个页面（那边是 /carbon/month、减排记录聚合）。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "energyExpends",
  query: [
    { key: "energyName", label: "名称", kind: "input", placeholder: "请输入" },
    { key: "dataTime", label: "时间", kind: "range", placeholder: "开始月份" },
  ],
  columns: [
    { field: "energyName", headerName: "名称", minWidth: 180, flex: 1 },
    { field: "dataTime", headerName: "时间", width: 110 },
    { field: "dataValue", headerName: "消耗量", width: 160 },
    { field: "emissionData", headerName: "碳排放量（吨）", width: 160 },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  detail: {
    sections: [
      {
        fields: [
          { label: "名称", from: "energyName" },
          { label: "时间", from: "dataTime" },
          { label: "消耗量", from: "dataValue" },
          { label: "碳排放量", from: "emissionData", suffix: " 吨" },
          { label: "企业", from: "enterName" },
          { label: "厂区", from: "factoryName" },
          { label: "工序", from: "processName" },
        ],
      },
    ],
  },
  fetch: carbonQuery("/monthReport/selectEnergyMonthByEnergy"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
