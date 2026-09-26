<script setup lang="ts">
/** 对应线上「碳排放日报表」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/reportForm/daily）
 *  已接入：GET /business/dayReport/selectEmissionDay（分页 + 时间区间）
 *  待接入：行内「产量信息」—— 线上是打开产量子面板，本次按插桩提示（只 toast）
 *
 * 时间列线上显示「2026年08月29日」，行里存的是 `2026-08-29`，这里照行值原样展示
 * （线上那套中文日期格式是它自己的 formatter，不改数据只改渲染会在筛选时对不上）。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "daily",
  query: [{ key: "dataTime", label: "时间", kind: "range", placeholder: "开始日期" }],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 180, flex: 1 },
    { field: "factoryName", headerName: "所属厂区", width: 130 },
    { field: "processName", headerName: "工序名称", width: 140 },
    { field: "dataTime", headerName: "时间", width: 120 },
    { field: "emissionData", headerName: "碳排放量（吨）", width: 160 },
  ],
  actions: [{ label: "产量信息", kind: "stub" }],
  fetch: carbonQuery("/dayReport/selectEmissionDay"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
