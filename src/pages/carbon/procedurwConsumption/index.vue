<script setup lang="ts">
/** 对应线上「工序能耗」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/processManage/procedurwConsumption）
 *  已接入：GET /business/factoryEnergy/processList（分页 + 企业/厂区/工序/日期）
 *          日历接口 process/emissionCalendar 已占位（线上是页面上的日期选择器高亮，本次未接）
 *  待接入：新增 —— factoryEnergy 与 /:id 已占位
 *
 * 「数据来源」在这张表里**已经是中文串**（实测 "人工录入"），与排放记录页存 code 的情况不同，
 * 故不再套 record_source 字典。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "procedurwConsumption",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    { key: "factoryName", label: "厂区名称", kind: "input", placeholder: "请输入" },
    { key: "processName", label: "工序名称", kind: "input", placeholder: "请输入" },
    { key: "energyTime", label: "日期", kind: "date", placeholder: "请选择日期" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 170, flex: 1 },
    { field: "factoryName", headerName: "厂区名称", width: 130 },
    { field: "processName", headerName: "工序", width: 130 },
    { field: "productName", headerName: "产出品", width: 120 },
    { field: "productionData", headerName: "产量", width: 140 },
    { field: "productUnit", headerName: "单位", width: 80 },
    { field: "emissionData", headerName: "碳排放量（tCO2）", width: 150 },
    { field: "dataSource", headerName: "数据来源", width: 100 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
  ],
  toolbar: { add: true },
  edit: {
    title: "工序能耗",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["天津示例钢铁企业有限公司"] },
      { key: "factoryName", label: "厂区名称", kind: "select", options: ["炼铁厂", "轧钢厂", "动力厂"] },
      { key: "processName", label: "工序名称", kind: "select", options: [] },
      { key: "energyTime", label: "日期", kind: "date" },
      { key: "productionData", label: "产量", kind: "number" },
      { key: "emissionData", label: "碳排放量", kind: "number", unit: "tCO2" },
    ],
  },
  fetch: carbonQuery("/factoryEnergy/processList"),
  writeFn: carbonStub("/factoryEnergy"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
