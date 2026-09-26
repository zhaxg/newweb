<script setup lang="ts">
/** 对应线上「完成情况」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/taskResult）
 *  已接入：GET /business/targetManagement/list（与「目标管理」同一个接口，列不同：只到完成状态）
 *          行内详情直接用行数据渲染，没有额外请求
 *  待接入：详情弹窗里的「完成情况」内嵌表格（排放量/排放强度/减排量 三行目标 vs 实际）——
 *          DetailDialog 是 label/value 分段，装不下表格，等需要时再单独做。
 *
 * 状态编码：overStatus 存 "1"，线上列表显示「未完成」（实测该行显示值），故按 1=未完成 映射。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const TARGET_TYPE: Record<string, string> = {
  enter_target: "企业目标",
  project_target: "项目目标",
  group_target: "集团目标",
};
const OVER: Record<string, string> = { "1": "未完成", "2": "已完成" };

const spec: ListPageSpec = {
  code: "taskResult",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入企业名称" },
    { key: "targetYear", label: "日期", kind: "date", placeholder: "开始年度", as: "year" },
  ],
  columns: [
    { field: "targetName", headerName: "名称", minWidth: 200, flex: 1 },
    {
      field: "targetTypeId",
      headerName: "类型",
      width: 90,
      valueFormatter: (p) => TARGET_TYPE[p.value as string] ?? String(p.value ?? ""),
    },
    { field: "targetYear", headerName: "年度", width: 70 },
    { field: "enterName", headerName: "适用企业", minWidth: 170, width: 180 },
    {
      field: "overStatus",
      headerName: "完成状态",
      width: 90,
      valueFormatter: (p) => OVER[p.value as string] ?? String(p.value ?? ""),
    },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  detail: {
    sections: [
      {
        title: "目标",
        fields: [
          { label: "目标名称", from: "targetName" },
          { label: "目标类型", from: "targetTypeId", map: TARGET_TYPE },
          { label: "适用企业", from: "enterName" },
          { label: "适用项目", from: "projectName" },
          { label: "年度", from: "targetYear" },
          { label: "完成状态", from: "overStatus", map: OVER },
          { label: "最后编辑人", from: "lastModifyUserName" },
          { label: "最后编辑时间", from: "lastModifyTime" },
        ],
      },
    ],
  },
  fetch: carbonQuery("/targetManagement/list"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
