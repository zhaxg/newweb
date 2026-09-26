<script setup lang="ts">
/** 对应线上「年度报表」（碳排放 → 企业层级核算，https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/companyLevel/emissionStatistic/yearReport）
 *  已接入：POST /business/emissionRecords/company/yearCollect（分页 + 企业/排放源类型/年份）
 *  待接入：行内「明细」—— 端点已占位
 *
 * 列映射与月度报表同源（typeCarbonDioxide=排放量、carbonDioxide=排放总量），仅时间粒度不同。
 * 注意与「碳减排 → 年度报表」（/carbon/year）不是同一页。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "yearReport",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    {
      key: "emissionName",
      label: "排放源类型",
      kind: "select",
      options: ["消耗化石燃料排放", "过程排放", "含碳产品隐含的排放"],
      placeholder: "请选择",
    },
    { key: "date", label: "年份", kind: "date", placeholder: "选择年份", as: "year" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 170, flex: 1 },
    { field: "date", headerName: "年份", width: 90 },
    { field: "emissionName", headerName: "排放源类型", width: 170 },
    { field: "typeCarbonDioxide", headerName: "排放量（tCO2）", width: 140 },
    { field: "carbonDioxide", headerName: "排放总量（tCO2）", width: 140 },
    { field: "crudeSteel", headerName: "粗钢产量（t）", width: 130 },
    { field: "unitCrudeSteelCarbonDioxide", headerName: "单位粗钢碳排放量（tCO2/t）", width: 190 },
  ],
  actions: [{ label: "明细", kind: "stub" }],
  fetch: carbonQuery("/emissionRecords/company/yearCollect", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
