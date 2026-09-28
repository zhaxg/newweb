<script setup lang="ts">
/** 对应 TG0002 物料管理（基础配置 · 附录 A3 版式 **L1 列表页**）
 *
 *  接口：`materialApi.page`（POST /tqmes/material/listPage）
 *
 *  演示要点：**这 29 行是全站所有「量」的成本口径源头**——
 *  TC0001 单价维护、TC0002 成本分析、TB 配料计划的成本预测、TW 投料实绩的成本归集
 *  全部按这里的 `costPrice` 乘出来。所以这一页是客户问「吨矿成本哪来的」时的第一站。
 *  筛选按**物料组**和**物料类型**两个维度分：配料页按组筛（矿石/煤炭/熔剂…），
 *  成本页按类型归集（原料/燃料/产品/副产品…），两个维度都必须留着。
 *
 *  料号 `M-0101` 与 ERP-MR 一致（规格书 B11 第 1 条：库前入储在 ERP、库后消耗在 MES），
 *  所以**不能在这页改料号**——它是 MES 与 ERP 的连接键。
 *
 *  待接入：新增物料、改价（本域只查桩；单价真正可改在 TC0001）。
 */
import { computed } from "vue";
import ListPage from "../../ListPage.vue";
import { materialApi } from "@/api/mes4tq";
import { boolRenderer, dashFmt, moneyFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const spec = computed<ListPageSpec>(() => ({
  code: "TG0002",
  query: [
    { key: "keyword", label: "物料", kind: "input", placeholder: "料号 / 品名 / 物料组" },
    {
      key: "group",
      label: "物料组",
      kind: "select",
      options: ["矿石", "煤炭", "焦炭", "熔剂", "燃料", "辅料", "产品"],
      placeholder: "全部",
    },
    {
      key: "type",
      label: "物料类型",
      kind: "select",
      options: ["原料", "辅料", "燃料", "产品", "副产品", "回收品"],
      placeholder: "全部",
    },
    { key: "enabled", label: "状态", kind: "select", options: ["是", "否"], valueMap: { 是: "true", 否: "false" } },
  ],
  columns: [
    { field: "id", headerName: "料号", width: 96, pinned: "left" },
    { field: "name", headerName: "品名", width: 120 },
    { field: "group", headerName: "物料组", width: 92, cellRenderer: tagRenderer() },
    { field: "type", headerName: "物料类型", width: 104, cellRenderer: tagRenderer() },
    { field: "unit", headerName: "计量单位", width: 92, valueFormatter: dashFmt },
    /* 成本单价是本页最要紧的一列：它是 TC0002 与 TB 成本预测的乘数 */
    { field: "costPrice", headerName: "成本单价 元", width: 120, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "enabled", headerName: "启用", width: 78, cellRenderer: boolRenderer() },
    { field: "remark", headerName: "备注", minWidth: 180, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: { extraButtons: ["▶ 模拟物料到位"] },
  fetch: (q) => materialApi.page(q),
  summary: ({ total }) => `共 ${total} 种物料 · 单价为 TC 成本归集的唯一乘数`,
}));
</script>

<template>
  <ListPage :spec="spec" />
</template>
