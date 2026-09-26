<script setup lang="ts">
/** 对应线上「碳排放月报表」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/reportForm/emission1）
 *  已接入：GET /business/monthReport/selectEmissionMonth（分页 + 时间区间）
 *  待接入：行内「详情」「产量信息」—— 线上是打开子面板，本次详情用行数据渲染、产量信息按插桩提示
 */
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "emission1",
  query: [{ key: "dataTime", label: "时间", kind: "range", placeholder: "开始月份" }],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 200, flex: 1 },
    { field: "dataTime", headerName: "时间", width: 110 },
    { field: "emissionData", headerName: "碳排放量（吨）", width: 170 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "产量信息", kind: "stub" },
  ],
  detail: {
    sections: [
      {
        fields: [
          { label: "企业名称", from: "enterName" },
          { label: "时间", from: "dataTime" },
          { label: "碳排放量", from: "emissionData", suffix: " 吨" },
          { label: "厂区", from: "factoryName" },
          { label: "工序", from: "processName" },
        ],
      },
    ],
  },
  fetch: carbonQuery("/monthReport/selectEmissionMonth"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
