<script setup lang="ts">
/** 对应 EG0001 介质与折标系数（模块六 · 附录 B5 版式 L1）
 *  接口：mediumApi.page（POST /ems/medium/listPage）· save · remove · mediumApi.list
 *  演示要点：**整站所有数的乘数都在这张表上**。折标煤系数一改，EP0002 实绩的折标列、
 *        EP0003 平衡表、EP0004 结算金额、EP0005 考核单耗、EO0001 大屏的吨钢综合能耗
 *        六处同时跟着变——因为它们读的是同一个 `model.ts` 派生函数，而派生函数读的就是这行配置。
 *        所以「改一个数、六个页面同时变」这件事在这页演示最有说服力：
 *        把氩气折标从 0.6698 改成 0.7，马上开 EP0003 看那一行。
 *        「删除」与「改编码」都给了守卫而不是假成功：已挂定额的介质删不掉（高炉煤气就是这条），
 *        编码改了会被拒——它是定额、流向、平衡表三张表的连接键，宁可拒绝也不让账烂掉。
 *        折碳系数这列**只有展示用途**：能碳一体化归碳系统管（energy.md 附录 A 边界），
 *        本域没有任何派生函数读它，页面上也不给「折碳」做任何汇总。
 *  待接入：介质新增后的定额联动（新增介质要配定额才有量，EP0001 负责，这页不做二级弹窗）。 */
import { computed } from "vue";
import ListPage from "../../ListPage.vue";
import { mediumApi } from "@/api/energy";
import { boolRenderer, dashFmt, moneyFmt, numFmt } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

/** 参与能源平衡表——筛选候选，不是业务口径（是/否由 mock 的 `eq()` 认字符串） */
const YES_NO = ["是", "否"];

const spec = computed<ListPageSpec>(() => ({
  code: "EG0001",
  query: [
    { key: "keyword", label: "介质", kind: "input", placeholder: "名称 / 编码 / 计量单位" },
    {
      key: "balanceParticipate",
      label: "进平衡表",
      kind: "select",
      options: YES_NO,
      valueMap: { 是: "true", 否: "false" },
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "code", headerName: "编码", width: 88 },
    { field: "name", headerName: "介质名称", minWidth: 120 },
    { field: "unit", headerName: "计量单位", width: 92 },
    {
      field: "stdCoal",
      headerName: "折标煤系数",
      minWidth: 112,
      type: "numericColumn",
      /* 系数一律 4 位小数：BFG 0.1286 少一位，全厂折标就差出四位数，客户拿计算器能复核这一列 */
      valueFormatter: numFmt(4),
    },
    {
      field: "calorific",
      headerName: "低位热值 MJ",
      minWidth: 112,
      type: "numericColumn",
      valueFormatter: numFmt(3),
    },
    {
      field: "innerPrice",
      headerName: "内结单价 元",
      minWidth: 112,
      type: "numericColumn",
      valueFormatter: moneyFmt,
    },
    /** 展示列——本域不参与任何计算，见文件头边界声明 */
    {
      field: "carbonFactor",
      headerName: "折碳系数(仅展示)",
      minWidth: 132,
      type: "numericColumn",
      valueFormatter: numFmt(4),
    },
    { field: "balanceParticipate", headerName: "进平衡表", width: 92, cellRenderer: boolRenderer() },
    { field: "color", headerName: "专色", width: 64, cellRenderer: colorSwatch },
    { field: "remark", headerName: "备注", minWidth: 180, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: { add: true },
  edit: {
    title: "介质与折标系数",
    fields: [
      { key: "name", label: "介质名称", kind: "input", placeholder: "如 高炉煤气" },
      { key: "code", label: "介质编码", kind: "input", placeholder: "大写英文，如 BFG" },
      { key: "unit", label: "计量单位", kind: "input", placeholder: "kWh / m³ / t" },
      { key: "stdCoal", label: "折标煤系数", kind: "number", unit: "kgce/单位" },
      { key: "calorific", label: "低位热值", kind: "number", unit: "MJ/单位" },
      { key: "innerPrice", label: "内部结算价", kind: "number", unit: "元/单位" },
      { key: "carbonFactor", label: "折碳系数（仅展示）", kind: "number", unit: "tCO₂e/单位" },
      { key: "balanceParticipate", label: "进能源平衡表", kind: "bool" },
      { key: "color", label: "图表专色", kind: "input", placeholder: "#RRGGBB" },
      { key: "remark", label: "备注", kind: "textarea", full: true },
    ],
  },
  detail: {
    sections: [
      {
        title: "介质身份",
        fields: [
          { label: "介质编码", from: "code" },
          { label: "介质名称", from: "name" },
          { label: "计量单位", from: "unit" },
          { label: "是否进能源平衡表", from: "balanceParticipate", map: { true: "进表", false: "不进表" } },
        ],
      },
      {
        title: "换算与价格",
        fields: [
          { label: "折标煤系数 kgce/单位", from: "stdCoal" },
          { label: "低位热值 MJ/单位", from: "calorific" },
          { label: "内部结算价 元/单位", from: "innerPrice" },
          { label: "折碳系数（仅展示，本域不参与计算）", from: "carbonFactor" },
        ],
      },
      { title: "备注", fields: [{ label: "备注", from: "remark" }] },
    ],
  },
  fetch: (q) => mediumApi.page(q),
  writeFn: (d) => mediumApi.save(d),
  deleteFn: (id) => mediumApi.remove(id),
  summary: ({ total }) => `共 ${total} 种介质 · 系数改动即时影响实绩/平衡/结算/考核`,
}));

/**
 * 专色 swatch：色值取自行数据（`model.ts` 的 `MEDIUMS[code].color` 是唯一真源），
 * 前端不另配一份介质色——两处在管同一件事，就会出现平衡表图例和监测曲线各画一个颜色。
 */
function colorSwatch(p: any): HTMLElement {
  const el = document.createElement("span");
  el.className = "inline-block h-3.5 w-6 rounded-sm border border-border align-middle";
  if (typeof p.value === "string") el.style.background = p.value;
  return el;
}
</script>

<template>
  <ListPage :spec="spec" />
</template>
