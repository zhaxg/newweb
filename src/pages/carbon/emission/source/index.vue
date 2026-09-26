<script setup lang="ts">
/** 对应线上「排放源管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonEmission/project/index）
 *  已接入：GET /business/emissionProject/list（分页 + 企业名称/排放源类型/状态）
 *          排放源类型下拉候选取自 GET /business/emissionType/select（线上同一对接口）
 *  待接入：新增 / 编辑 / 删除 / 停用 / 排放统计 —— emissionProject 写端点与 enable/deactivate 已占位
 *
 * 状态列：行里恒为 "0"，而原页面另有「停用」动作，故按 0=启用 映射（没有第二个样本可推）。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const STATUS: Record<string, string> = { "0": "启用", "1": "停用" };

const spec: ListPageSpec = {
  code: "projectIndex",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入" },
    {
      key: "emissionName",
      label: "排放源类型",
      kind: "select",
      options: ["消耗化石燃料排放", "过程排放", "含碳产品隐含的排放"],
      placeholder: "请选择",
    },
    {
      key: "status",
      label: "状态",
      kind: "select",
      options: ["启用", "停用"],
      valueMap: STATUS,
      placeholder: "请选择",
    },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 180, flex: 1 },
    { field: "emissionName", headerName: "排放源类型", width: 170 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
    {
      field: "status",
      headerName: "状态",
      width: 80,
      valueFormatter: (p) => STATUS[String(p.value)] ?? String(p.value ?? ""),
    },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
    { label: "停用", kind: "stub" },
    { label: "排放统计", kind: "stub" },
  ],
  toolbar: { add: true },
  detail: {
    sections: [
      {
        fields: [
          { label: "企业名称", from: "enterName" },
          { label: "排放源类型", from: "emissionName" },
          { label: "排放单位", from: "emissionUnit" },
          { label: "状态", from: "status", map: STATUS },
          { label: "最后编辑人", from: "lastModifyUserName" },
          { label: "最后编辑时间", from: "lastModifyTime" },
        ],
      },
    ],
  },
  edit: {
    title: "排放源",
    fields: [
      { key: "enterName", label: "选择企业", kind: "select", options: ["红河谷钢铁事业部"] },
      {
        key: "emissionName",
        label: "排放源类型",
        kind: "select",
        options: ["消耗化石燃料排放", "过程排放", "含碳产品隐含的排放"],
      },
      { key: "emissionUnit", label: "排放单位", kind: "input" },
    ],
  },
  fetch: carbonQuery("/emissionProject/list"),
  writeFn: carbonStub("/emissionProject"),
  deleteFn: carbonStub("/emissionProject/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
