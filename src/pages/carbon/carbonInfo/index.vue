<script setup lang="ts">
/** 对应线上「碳信息」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonInfo）
 *  已接入：GET /business/carbonInfo/getCarbonInfoList（分页 + 信息标题/信息类型）
 *  待接入：无——原页面只有查询，没有新增/删除，行内也不可点
 *
 * 原表**没有操作列**（列头就是 信息标题/信息类型/发布时间 三根）。
 * 信息类型是中文串（carbonInfoType="政策信息"），下拉候选取自行数据实际值。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

const spec: ListPageSpec = {
  code: "carbonInfo",
  query: [
    { key: "title", label: "信息标题", kind: "input", placeholder: "请输入信息标题查询" },
    {
      key: "carbonInfoType",
      label: "信息类型",
      kind: "select",
      options: ["政策信息"],
      placeholder: "请选择信息类型",
    },
  ],
  columns: [
    { field: "title", headerName: "信息标题", minWidth: 260, flex: 1 },
    { field: "carbonInfoType", headerName: "信息类型", width: 120 },
    { field: "lastPublishTime", headerName: "发布时间", width: 170 },
  ],
  fetch: carbonQuery("/carbonInfo/getCarbonInfoList"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
