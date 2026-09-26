<script setup lang="ts">
/** 对应线上「碳排放企业管理」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/businessManagement）
 *  已接入：GET /business/CarbonEnterprise（分页 + 企业名称/所属地区）
 *  待接入：新增 —— `POST /business/CarbonEnterprise` 已占位，回成功不落库
 *
 * ⚠️ 种子是**空表**（线上演示环境该接口回 0 行，页面就是「暂无数据」），
 *    故列字段名按列头语义推定（enterName/creditCode/areaName/creatorUserName/…），有数据后需核对。
 *    「所属地区」下拉候选取自别处，本次未取到，留空。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery, carbonStub } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "businessManagement",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入企业名称" },
    { key: "areaName", label: "所属地区", kind: "select", options: [], placeholder: "请选择所属地区" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 180, flex: 1 },
    { field: "creditCode", headerName: "统一信用代码", width: 180 },
    { field: "areaName", headerName: "所属区域", width: 140 },
    { field: "creatorUserName", headerName: "添加人", width: 100 },
    { field: "createTime", headerName: "添加时间", width: 155 },
    { field: "lastModifyUserName", headerName: "最后更新人", width: 110 },
    { field: "lastModifyTime", headerName: "最后更新时间", width: 155 },
  ],
  toolbar: { add: true },
  edit: {
    title: "碳排放企业",
    fields: [
      { key: "enterName", label: "企业名称", kind: "input" },
      { key: "creditCode", label: "统一信用代码", kind: "input" },
      { key: "areaName", label: "所属地区", kind: "select", options: [] },
    ],
  },
  fetch: carbonQuery("/CarbonEnterprise"),
  writeFn: carbonStub("/CarbonEnterprise"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
