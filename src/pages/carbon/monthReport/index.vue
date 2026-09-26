<script setup lang="ts">
/** 对应线上「月度报表」（碳排放 → 企业层级核算，https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/companyLevel/emissionStatistic/monthReport）
 *  已接入：POST /business/emissionRecords/company/monthCollect（分页 + 企业/排放源类型/月份）
 *  待接入：行内「明细」—— 端点已占位
 *
 * 列映射按线上行实测：月份=`date`、排放源类型=`emissionName`、
 * **排放量=`typeCarbonDioxide`（该类型）、排放总量=`carbonDioxide`（合计）**、
 * 粗钢产量=`crudeSteel`、单位粗钢碳排放量=`unitCrudeSteelCarbonDioxide`。
 * 注意与「碳减排 → 月度报表」（/carbon/month）不是同一页。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "monthReport",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    {
      key: "emissionName",
      label: "排放源类型",
      kind: "select",
      options: ["消耗化石燃料排放", "过程排放", "含碳产品隐含的排放"],
      placeholder: "请选择",
    },
    { key: "date", label: "月份", kind: "date", placeholder: "选择月份" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 170, flex: 1 },
    { field: "date", headerName: "月份", width: 95 },
    { field: "emissionName", headerName: "排放源类型", width: 170 },
    { field: "typeCarbonDioxide", headerName: "排放量（tCO2）", width: 140 },
    { field: "carbonDioxide", headerName: "排放总量（tCO2）", width: 140 },
    { field: "crudeSteel", headerName: "粗钢产量（t）", width: 130 },
    { field: "unitCrudeSteelCarbonDioxide", headerName: "单位粗钢碳排放量（tCO2/t）", width: 190 },
  ],
  actions: [{ label: "明细", kind: "stub" }],
  fetch: carbonQuery("/emissionRecords/company/monthCollect", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
