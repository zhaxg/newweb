<script setup lang="ts">
/** 对应线上「项目类型」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/type）
 *  已接入：GET /business/offset/list（分页 + 项目类型/是否可抵消碳配额）
 *  待接入：新增 / 编辑 / 删除 —— offset/{add,edit,delete/:id} 已占位，回成功不落库
 *
 * 「是否可抵消碳配额」存的是 offsetFlag（实测行值 0），线上显示「不可抵消」，
 * 按 0=不可抵消 / 1=可抵消 映射；筛选下拉同理用 valueMap 反查。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const OFFSET_FLAG: Record<string, string> = { "0": "不可抵消", "1": "可抵消" };

const spec: ListPageSpec = {
  code: "type",
  query: [
    { key: "typeName", label: "项目类型", kind: "input", placeholder: "请输入" },
    {
      key: "offsetFlag",
      label: "是否可抵消碳配额",
      kind: "select",
      options: ["可抵消", "不可抵消"],
      valueMap: { 可抵消: "1", 不可抵消: "0" },
      placeholder: "请选择",
    },
  ],
  columns: [
    { field: "typeName", headerName: "项目类型", minWidth: 160, flex: 1 },
    {
      field: "offsetFlag",
      headerName: "是否可抵消碳配额",
      width: 150,
      valueFormatter: (p) => OFFSET_FLAG[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "creatorUserName", headerName: "添加人", width: 100 },
    { field: "creatorTime", headerName: "添加时间", width: 155 },
    { field: "lastModifyUserName", headerName: "最后编辑人", width: 110 },
    { field: "lastModifyTime", headerName: "最后编辑时间", width: 155 },
  ],
  actions: [
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  edit: {
    title: "项目类型",
    fields: [
      { key: "typeName", label: "项目类型", kind: "input" },
      { key: "offsetFlag", label: "是否可抵消碳配额", kind: "select", options: ["可抵消", "不可抵消"] },
    ],
  },
  fetch: carbonQuery("/offset/list"),
  writeFn: carbonStub("/offset/add"),
  deleteFn: carbonStub("/offset/delete/:id", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
