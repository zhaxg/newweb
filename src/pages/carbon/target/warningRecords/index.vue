<script setup lang="ts">
/** 对应线上「预警记录」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/records）
 *  已接入：GET /business/warningRecord/list（分页 + 企业名称/预警业务/预警日期区间）
 *  待接入：无行内动作（原页面操作列是空的）
 *
 * ⚠️ 线上这张表**当前就是 0 行**（演示环境没有预警数据），种子同样为空：
 *    列头照原样迁入，打开是空表 + 「共 0 条数据」，与线上一致，不是没接上。
 *    行字段名（等级/预警内容/预警方式等）在无数据时无法从返回体确认，按列头语义命名；
 *    一旦线上有数据回来，这几个名字需要对着返回体核一遍。
 */
import ListPage from "../../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../../listTypes";

const spec: ListPageSpec = {
  code: "records",
  query: [
    { key: "enterName", label: "企业名称", kind: "input", placeholder: "请输入企业名称" },
    { key: "warningType", label: "预警业务", kind: "select", options: ["设备预警"], placeholder: "请选择预警业务" },
    { key: "warningTime", label: "预警日期", kind: "range", placeholder: "开始日期" },
  ],
  columns: [
    { field: "enterName", headerName: "企业名称", minWidth: 180, flex: 1 },
    { field: "warningType", headerName: "预警业务", width: 120 },
    { field: "level", headerName: "等级", width: 80 },
    { field: "warningContent", headerName: "预警内容", minWidth: 200, flex: 2 },
    { field: "warningTime", headerName: "预警时间", width: 155 },
    { field: "warningMethod", headerName: "预警方式", width: 110 },
  ],
  fetch: carbonQuery("/warningRecord/list"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
