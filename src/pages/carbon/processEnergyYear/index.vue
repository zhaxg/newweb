<script setup lang="ts">
/** 对应线上「工序能耗年报表」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/processManage/processEnergyYear）
 *  已接入：POST /business/processEnergyYearController/pageYear（分页 + 企业/厂区/工序）
 *  待接入：行内「明细」「导出」—— 线上各自打开子面板，本次按插桩提示；
 *          顶部只有查询/重置（原页面也没有）
 */
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "processEnergyYear",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    { key: "factoryName", label: "厂区名称", kind: "input", placeholder: "请输入" },
    { key: "processName", label: "工序", kind: "input", placeholder: "请输入" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 170, flex: 1 },
    { field: "dateYear", headerName: "年份", width: 80 },
    { field: "factoryName", headerName: "厂区名称", width: 130 },
    { field: "processName", headerName: "工序", width: 130 },
    { field: "productName", headerName: "产出品", width: 120 },
    { field: "productionData", headerName: "产量", width: 150 },
    { field: "productUnit", headerName: "单位", width: 80 },
    { field: "emissionData", headerName: "碳排放量（tCO2）", width: 160 },
  ],
  actions: [
    { label: "明细", kind: "stub" },
    { label: "导出", kind: "stub" },
  ],
  fetch: carbonQuery("/processEnergyYearController/pageYear", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
