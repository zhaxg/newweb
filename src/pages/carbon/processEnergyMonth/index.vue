<script setup lang="ts">
/** 对应线上「工序能耗月报表」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/productionManage/processManage/processEnergyMonth）
 *  已接入：POST /business/processEnergyCollect/page（分页 + 月份/企业/厂区/工序）
 *  待接入：顶部只有查询/重置（原页面就没有新增导出）
 *
 * ⚠️ 种子是**空表**：该接口线上必须带 `processDate` 才不报 400（实测），
 *    带上后仍回 0 行——线上该月无工序能耗记录。故列字段名按列头语义推定，
 *    有数据后需对着返回体核一遍。mock 侧默认参数已带 processDate（见 mock/carbon/lists.ts）。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "processEnergyMonth",
  query: [
    { key: "processDate", label: "月份", kind: "date", placeholder: "请选择月份" },
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    { key: "factoryName", label: "厂区名称", kind: "input", placeholder: "请输入" },
    { key: "processName", label: "工序", kind: "input", placeholder: "请输入" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 170, flex: 1 },
    { field: "factoryName", headerName: "厂区名称", width: 130 },
    { field: "processName", headerName: "工序", width: 130 },
    { field: "productName", headerName: "产出品", width: 120 },
    { field: "productionData", headerName: "产量", width: 140 },
    { field: "productUnit", headerName: "单位", width: 80 },
    { field: "emissionData", headerName: "碳排放量（tCO2）", width: 150 },
  ],
  fetch: carbonQuery("/processEnergyCollect/page", "post", { processDate: "2026-09-01" }),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
