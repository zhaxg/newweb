<script setup lang="ts">
/** 对应线上「碳分析」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonAnalyse/index）
 *  已接入：POST /business/analysisRecord/page（分页 + 名称/状态）
 *  待接入：顶部「上传」「清空」—— 线上分别调 analysisRecord/upload 与 /clear，
 *          两个端点已按线上路径注册为占位，按钮本身按插桩提示（不发请求、不产生文件）
 *
 * ⚠️ 种子是**空表**（线上该接口就回 0 行），故列字段名按列头语义推定
 *    （name/createTime/status），有数据后需对着返回体核一遍。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "carbonAnalyse",
  query: [
    { key: "name", label: "名称", kind: "input", placeholder: "请输入名称" },
    { key: "status", label: "状态", kind: "select", options: [], placeholder: "请选择状态" },
  ],
  columns: [
    { field: "name", headerName: "名称", minWidth: 220, flex: 1 },
    { field: "createTime", headerName: "创建时间", width: 165 },
    { field: "status", headerName: "状态", width: 100 },
  ],
  toolbar: { extraButtons: ["上传", "清空"] },
  fetch: carbonQuery("/analysisRecord/page", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
