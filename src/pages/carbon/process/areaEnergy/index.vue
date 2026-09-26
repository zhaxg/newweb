<script setup lang="ts">
/** 对应线上「厂区能耗管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/factoryManage/energyExpend）
 *  已接入：GET /business/factoryEnergy/list（分页 + 厂区名称）
 *  待接入：新增 —— factoryEnergy 与 /:id 已占位
 *
 * ⚠️ 种子是**空表**（线上该接口同样回 0 行，页面就是「暂无数据」），
 *    故列字段名按列头语义推定（enterName/factoryName/energyTime/productionData/emissionData），
 *    有数据后需对着返回体核一遍。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "energyExpend",
  query: [{ key: "factoryName", label: "厂区名称", kind: "input", placeholder: "请输入" }],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 170, flex: 1 },
    { field: "factoryName", headerName: "厂区名称", width: 140 },
    { field: "energyTime", headerName: "时间", width: 120 },
    { field: "productionData", headerName: "产量", width: 150 },
    { field: "emissionData", headerName: "碳排放量（吨）", width: 150 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
  ],
  toolbar: { add: true },
  edit: {
    title: "厂区能耗",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["红河谷钢铁事业部"] },
      { key: "factoryName", label: "厂区名称", kind: "select", options: [] },
      { key: "energyTime", label: "时间", kind: "date" },
      { key: "productionData", label: "产量", kind: "number" },
      { key: "emissionData", label: "碳排放量", kind: "number", unit: "吨" },
    ],
  },
  fetch: carbonQuery("/factoryEnergy/list"),
  writeFn: carbonStub("/factoryEnergy"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
