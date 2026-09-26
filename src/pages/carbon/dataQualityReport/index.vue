<script setup lang="ts">
/** 对应线上「数据质量方案」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonReport/dataQualityReport）
 *  已接入：POST /business/business/qualityStrategy/page（分页 + 版本号/修订时间区间）
 *  待接入：行内「修订」—— 线上打开修订流程，本次按插桩提示；行内「详情」用行数据渲染
 *
 * 编码列的对照全部来自线上字典 / 实测显示：
 *  - 修订原因 `reason` → 字典组 `data_edit_type`（1..6，已抓全）
 *  - 类型 `strategyType` 与 状态 `status`：种子里只出现 1，线上分别显示「修订版本」「启用」，
 *    故只映射这一个值，其余原样显示（不是猜的，是没有第二个样本可推）。
 */
import ListPage from "../ListPage.vue";
import { carbonQuery } from "@/api/carbon/queries";
import type { ListPageSpec } from "../listTypes";

/** 字典组 data_edit_type（线上 DictionaryData/All 抓取） */
const REASON: Record<string, string> = {
  "1": "排放设施发生变化或使用方案中未包括的新燃料或物料而产生的排放",
  "2": "采用新的测量仪器和方法，使数据的准确度提高",
  "3": "发现之前采用的测量方法所产生的数据不正确",
  "4": "发现更改方案可提高报告数据的准确度",
  "5": "发现方案不符合本指南核算和报告的要求",
  "6": "生态环境部明确的其他需要修订的情况",
};
const REASON_OPTIONS = Object.values(REASON);
const STRATEGY_TYPE: Record<string, string> = { "1": "修订版本" };
const STATUS: Record<string, string> = { "1": "启用", "0": "停用" };

const spec: ListPageSpec = {
  code: "dataQualityReport",
  query: [
    { key: "strategyVersion", label: "版本号", kind: "input", placeholder: "请输入" },
    { key: "revisionDate", label: "修订时间", kind: "range", placeholder: "开始日期" },
  ],
  columns: [
    { field: "standardVersion", headerName: "规范版本", minWidth: 200, flex: 1 },
    { field: "strategyVersion", headerName: "数据质量方案版本号", width: 150 },
    {
      field: "strategyType",
      headerName: "类型",
      width: 90,
      valueFormatter: (p) => STRATEGY_TYPE[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "revisionDate", headerName: "制定(修订)时间", width: 130 },
    {
      field: "reason",
      headerName: "修订原因",
      minWidth: 240,
      flex: 2,
      valueFormatter: (p) => REASON[String(p.value)] ?? String(p.value ?? ""),
    },
    {
      field: "status",
      headerName: "状态",
      width: 80,
      valueFormatter: (p) => STATUS[String(p.value)] ?? String(p.value ?? ""),
    },
    { field: "creatorUserName", headerName: "创建人", width: 100 },
  ],
  actions: [
    { label: "查看", kind: "detail" },
    { label: "修订", kind: "stub" },
  ],
  detail: {
    sections: [
      {
        fields: [
          { label: "规范版本", from: "standardVersion" },
          { label: "数据质量方案版本号", from: "strategyVersion" },
          { label: "类型", from: "strategyType", map: STRATEGY_TYPE },
          { label: "制定(修订)时间", from: "revisionDate" },
          { label: "修订原因", from: "reason", map: REASON },
          { label: "状态", from: "status", map: STATUS },
          { label: "方案编号", from: "strategyCode" },
          { label: "创建人", from: "creatorUserName" },
          { label: "创建时间", from: "createTime" },
        ],
      },
    ],
  },
  fetch: carbonQuery("/business/qualityStrategy/page", "post"),
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
