<script setup lang="ts">
/** 对应线上「大屏数据管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/screenManage/data）
 *  已接入：GET /business/dataConfig/list（分页 + 数据/大屏/数据来源）
 *  待接入：行内「编辑」—— 线上打开编辑弹窗，本次 dataConfig/edit 已占位，只插桩
 *
 * 两个编码列照线上显示反查：
 *  - `sourceType`：实测 2 →「真实数据」；1 推定为「示例数据」（行里另有 baseData/exampleData 两列可佐证）
 *  - 「数据值」用 `dataStr`：实测线上该列为空，而 dataNum/baseData 都有值——
 *    `dataStr` 正是空的那个字段，故按它取（有数据后再核）。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const SOURCE_TYPE: Record<string, string> = { "1": "示例数据", "2": "真实数据" };
const SOURCE_OPTIONS = Object.values(SOURCE_TYPE);

const spec: ListPageSpec = {
  code: "data",
  query: [
    { key: "dataName", label: "数据", kind: "input", placeholder: "请输入" },
    {
      key: "screenTypeName",
      label: "大屏",
      kind: "select",
      options: ["碳交易", "碳配额", "碳排放"],
      placeholder: "请选择",
    },
    {
      key: "sourceType",
      label: "数据来源",
      kind: "select",
      options: SOURCE_OPTIONS,
      valueMap: SOURCE_TYPE,
      placeholder: "请选择",
    },
  ],
  columns: [
    { field: "dataName", headerName: "数据", minWidth: 160, flex: 1 },
    { field: "screenTypeName", headerName: "大屏", width: 110 },
    { field: "moduleName", headerName: "模块", width: 130 },
    {
      field: "sourceType",
      headerName: "数据来源",
      width: 110,
      valueFormatter: (p) => SOURCE_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "dataStr", headerName: "数据值", width: 110 },
    { field: "dataUnit", headerName: "数据单位", width: 100 },
    { field: "lastModifyUserName", headerName: "最后更新人", width: 110 },
    { field: "lastModifyTime", headerName: "最后更新时间", width: 155 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
  ],
  detail: {
    sections: [
      {
        fields: [
          { label: "数据", from: "dataName" },
          { label: "数据键", from: "dataKey" },
          { label: "大屏", from: "screenTypeName" },
          { label: "模块", from: "moduleName" },
          { label: "数据来源", from: "sourceType", map: SOURCE_TYPE },
          { label: "数据值", from: "dataStr" },
          { label: "数据单位", from: "dataUnit" },
          { label: "基准值", from: "baseData" },
          { label: "示例值", from: "exampleData" },
          { label: "备注", from: "remark" },
          { label: "最后更新人", from: "lastModifyUserName" },
          { label: "最后更新时间", from: "lastModifyTime" },
        ],
      },
    ],
  },
  edit: {
    title: "大屏数据",
    fields: [
      { key: "dataName", label: "数据", kind: "input" },
      { key: "screenTypeName", label: "大屏", kind: "select", options: ["碳交易", "碳配额", "碳排放"] },
      { key: "moduleName", label: "模块", kind: "input" },
      { key: "sourceType", label: "数据来源", kind: "select", options: SOURCE_OPTIONS, valueMap: SOURCE_TYPE },
      { key: "dataStr", label: "数据值", kind: "input" },
      { key: "dataUnit", label: "数据单位", kind: "input" },
      { key: "remark", label: "备注", kind: "textarea" },
    ],
  },
  fetch: carbonQuery("/dataConfig/list"),
  writeFn: carbonStub("/dataConfig/edit"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
