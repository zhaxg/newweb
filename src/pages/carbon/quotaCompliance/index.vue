<script setup lang="ts">
/** 对应线上「配额履约」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/quotaCompliance）
 *  已接入：GET /business/complianceManage/list（分页 + 企业名称/业务类型/业务时间区间）
 *          业务时间区间走 startTime/endTime，mock 侧用 dateField=serverTime 做区间过滤
 *  待接入：顶部「配额」「履约」两个开单按钮（原页面是打开对应新增流程）→ 只 toast；
 *          新增/编辑/删除走 complianceManage/{add,edit,delete/:id} 占位。
 *
 * 业务类型存的是编码 serverType（实测行值 1=履约、2=配额），下拉显示中文，
 * 故 QueryField 配 valueMap 反查（见 listTypes 说明）。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const SERVER_TYPE: Record<string, string> = { "1": "履约", "2": "配额" };

const spec: ListPageSpec = {
  code: "quotaCompliance",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入企业名称" },
    {
      key: "serverType",
      label: "业务类型",
      kind: "select",
      options: ["履约", "配额"],
      valueMap: { 履约: "1", 配额: "2" },
      placeholder: "请选择业务类型",
    },
    { key: "serverTime", label: "业务时间", kind: "range", placeholder: "开始时间" },
  ],
  columns: [
    { field: "serverNo", headerName: "流水号", minWidth: 170, flex: 1 },
    { field: "enterName", headerName: "企业名称", minWidth: 170, width: 180 },
    { field: "serverYear", headerName: "业务时间", width: 90 },
    {
      field: "serverType",
      headerName: "业务类型",
      width: 90,
      valueFormatter: (p) => SERVER_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "quotaComplianceData", headerName: "碳量（tCO2）", width: 130 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 150 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { extraButtons: ["配额", "履约"] },
  detail: {
    sections: [
      {
        fields: [
          { label: "企业名称", from: "enterName" },
          { label: "增减类型", from: "serverType", map: SERVER_TYPE },
          { label: "业务来源", from: "serverType", map: SERVER_TYPE },
          { label: "履约年份", from: "serverYear" },
          { label: "履约量", from: "quotaComplianceData", suffix: " tCO2" },
          { label: "履约时间", from: "serverTime" },
          /* 核查量/核查时间在列表行里没有（详情接口才给），本次只插桩 → 显示 "-" */
          { label: "核查量", from: "inspectVal", suffix: " tCO2" },
          { label: "核查时间", from: "inspectTime" },
          { label: "添加人", from: "creatorUserName" },
          { label: "添加时间", from: "creatorTime" },
          { label: "最后编辑人", from: "lastModifyUserName" },
          { label: "最后编辑时间", from: "lastModifyTime" },
        ],
      },
    ],
  },
  edit: {
    title: "配额履约",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["天津示例钢铁企业有限公司"] },
      { key: "serverType", label: "业务类型", kind: "select", options: ["履约", "配额"] },
      { key: "serverYear", label: "业务年份", kind: "input" },
      { key: "quotaComplianceData", label: "碳量", kind: "number", unit: "tCO2" },
      { key: "serverTime", label: "业务时间", kind: "date" },
    ],
  },
  fetch: carbonQuery("/complianceManage/list"),
  writeFn: carbonStub("/complianceManage/add"),
  deleteFn: carbonStub("/complianceManage/delete/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
