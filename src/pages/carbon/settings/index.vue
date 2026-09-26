<script setup lang="ts">
/** 对应线上「预警设置」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/settings）
 *  已接入：GET /business/warningSetting/list（分页 + 企业名称/预警业务/预警类别/状态）
 *          行内「预警记录」跳 `/carbonWarning/records`（站内 link）
 *  待接入：新增 / 编辑 / 删除 / 停用 —— warningSetting/{add,edit,delete/:id,changeStatus} 已占位，回成功不落库
 *
 * 「预警类别」在原页面是筛选条件但**不是列**，行数据里也没有对应字段，
 * 故它不参与过滤（list.ts 的 livePairs 会把它筛掉）——否则一选就整表搜成空。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "settings",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入企业名称" },
    {
      key: "warningType",
      label: "预警业务",
      kind: "select",
      options: ["设备预警"],
      placeholder: "请选择预警业务",
    },
    { key: "warningCategory", label: "预警类别", kind: "select", options: [], placeholder: "请选择预警类别" },
    { key: "statusFlagName", label: "状态", kind: "select", options: ["启用", "停用"], placeholder: "请选择状态" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 180, flex: 1 },
    { field: "warningType", headerName: "预警业务", width: 120 },
    { field: "statusFlagName", headerName: "状态", width: 90 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
    { label: "停用", kind: "stub" },
    { label: "预警记录", kind: "link", to: "/carbonWarning/records" },
  ],
  toolbar: { add: true },
  detail: {
    sections: [
      {
        fields: [
          { label: "企业名称", from: "enterName" },
          { label: "预警业务", from: "warningType" },
          { label: "厂区", from: "factoryName" },
          { label: "工序", from: "processName" },
          { label: "状态", from: "statusFlagName" },
          { label: "最后编辑人", from: "lastModifyUserName" },
          { label: "最后编辑时间", from: "lastModifyTime" },
        ],
      },
    ],
  },
  edit: {
    title: "预警设置",
    fields: [
      { key: "enterName", label: "企业名称", kind: "select", options: ["红河谷钢铁事业部"] },
      { key: "warningType", label: "预警业务", kind: "select", options: ["设备预警"] },
      { key: "statusFlagName", label: "状态", kind: "select", options: ["启用", "停用"] },
    ],
  },
  fetch: carbonQuery("/warningSetting/list"),
  writeFn: carbonStub("/warningSetting/add"),
  deleteFn: carbonStub("/warningSetting/delete/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
