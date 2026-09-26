<script setup lang="ts">
/** 对应线上「减排记录」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonReduction/record）
 *  已接入：GET /business/reductionRecords/list（分页 + 项目名称/企业名称/项目类型/时间区间）
 *  待接入：新增 / 编辑 / 导出 —— reductionRecords 的写端点与 exportReductionRecords 已占位；
 *          线上「新增」是页面内子面板，本次按插桩处理
 *
 * 「类型」列显示的是 offsetId 原始 id（与项目管理同一原因，见该页注释）；项目类型筛选同理不参与过滤。
 * 编辑表单里「数据来源」的下拉文案按线上取值推定（0=人工录入 / 1=系统对接），对照表未在演示环境取到。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "record",
  query: [
    { key: "projectName", label: "项目名称", kind: "input", placeholder: "请输入" },
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    { key: "offsetTypeName", label: "项目类型", kind: "select", options: ["热力", "CCER"], placeholder: "请选择" },
    { key: "dataTime", label: "时间", kind: "range", placeholder: "开始日期" },
  ],
  columns: [
    { field: "serialnumber", headerName: "流水号", minWidth: 170, flex: 1 },
    { field: "enterName", headerName: "企业名称", minWidth: 170, width: 180 },
    { field: "projectName", headerName: "项目名称", minWidth: 170, width: 180 },
    { field: "offsetId", headerName: "类型", width: 170 },
    { field: "dataTime", headerName: "业务时间", width: 110 },
    { field: "emissionValue", headerName: "排放量（tCO2）", width: 130 },
    { field: "reductionValue", headerName: "减排量（tCO2）", width: 130 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
  ],
  actions: [{ label: "编辑", kind: "edit" }],
  toolbar: { add: true, export: true },
  edit: {
    title: "减排记录",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["天津示例钢铁企业有限公司"] },
      { key: "projectName", label: "项目名称", kind: "input" },
      { key: "dataTime", label: "业务时间", kind: "date" },
      { key: "emissionValue", label: "排放量", kind: "number", unit: "tCO2" },
      { key: "reductionValue", label: "减排量", kind: "number", unit: "tCO2" },
      { key: "dataSource", label: "数据来源", kind: "select", options: ["人工录入", "系统对接"] },
    ],
  },
  fetch: carbonQuery("/reductionRecords/list"),
  exportFn: carbonStub("/reductionRecords/exportReductionRecords"),
  writeFn: carbonStub("/reductionRecords"),
  deleteFn: carbonStub("/reductionRecords/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
