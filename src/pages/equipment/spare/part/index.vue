<script setup lang="ts">
/** 对应 AS0001 备件主数据（模块五 备品备件）
 *  接口：sparePartApi.page（POST /eam/sparePart/listPage）/ save（/save，有 id 即改）
 *        / remove（/remove）/ list（GET /list，供库存与寿命页翻译外键）/ exportRows("sparePart")
 *  演示要点：**`lifeManaged` 是整条「寿命与考核」链路的总开关**。
 *        关掉它，这条备件就不会出现在 AS0003 寿命台账里、不参与 AS0004 月度结算、
 *        也不能在 AS0005 折算——mock 侧 `saveRow` 的 after 钩子会顺手删掉它的 `lifeLimitHours`，
 *        所以这里把「是否考核」做成 ToggleSwitch 而不是下拉：字符串 `"true"` 写进布尔列会连锁失效。
 *  待接入：无（本页所有按钮都已接）。 */
import ListPage from "../../ListPage.vue";
import { exportRows, sparePartApi } from "@/api/equipment";
import { boolRenderer, moneyFmt, numFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const CATEGORY = ["A", "B", "C"];

const spec: ListPageSpec = {
  code: "AS0001",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "名称 / 规格 / 库位" },
    { key: "category", label: "备件类别", kind: "select", options: CATEGORY, placeholder: "A/B/C" },
    {
      key: "lifeManaged",
      label: "寿命考核",
      kind: "select",
      options: ["纳入考核", "不考核"],
      // 行里存的是真布尔，mock 的 eq() 对布尔字段认 "true"/"false" 两种写法
      valueMap: { 纳入考核: "true", 不考核: "false" },
      placeholder: "全部",
    },
  ],
  columns: [
    { field: "id", headerName: "备件编号", width: 108 },
    { field: "name", headerName: "备件名称", minWidth: 170, flex: 1 },
    { field: "spec", headerName: "规格型号", minWidth: 150, width: 180 },
    { field: "unit", headerName: "单位", width: 68 },
    { field: "category", headerName: "类别", width: 78, sortable: false, cellRenderer: tagRenderer() },
    { field: "loc", headerName: "库位", minWidth: 140, width: 170 },
    { field: "qty", headerName: "现库存", width: 90, valueFormatter: numFmt() },
    { field: "safetyQty", headerName: "安全库存", width: 96, valueFormatter: numFmt() },
    { field: "price", headerName: "单价（元）", width: 110, valueFormatter: moneyFmt },
    { field: "lifeManaged", headerName: "寿命考核", width: 92, cellRenderer: boolRenderer() },
    { field: "lifeLimitHours", headerName: "寿命限期", width: 100, valueFormatter: numFmt() },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "编辑", kind: "edit" },
    { label: "删除", kind: "delete" },
  ],
  toolbar: {
    add: true,
    acts: [{ label: "导出", okMsg: "导出任务已提交", refresh: false, run: (f) => exportRows("sparePart", f) }],
  },
  detail: {
    sections: [
      {
        title: "基本信息",
        fields: [
          { label: "备件编号", from: "id" },
          { label: "备件名称", from: "name" },
          { label: "规格型号", from: "spec" },
          { label: "计量单位", from: "unit" },
          {
            label: "备件类别",
            from: "category",
            map: { A: "A 类（关键备件）", B: "B 类（消耗件）", C: "C 类（一般备件）" },
          },
          { label: "存放库位", from: "loc" },
        ],
      },
      {
        title: "库存与资金",
        fields: [
          { label: "现库存", from: "qty", suffix: "" },
          { label: "安全库存", from: "safetyQty" },
          { label: "单价", from: "price", suffix: " 元" },
        ],
      },
      {
        title: "寿命与考核",
        fields: [
          { label: "纳入寿命考核", from: "lifeManaged", map: { true: "是", false: "否" } },
          { label: "寿命限期", from: "lifeLimitHours", suffix: " h" },
        ],
      },
    ],
  },
  edit: {
    title: "备件主数据",
    fields: [
      { key: "name", label: "备件名称", kind: "input", placeholder: "如：高线精轧轧辊" },
      { key: "spec", label: "规格型号", kind: "input", placeholder: "如：φ540×K 高铬铸铁" },
      { key: "unit", label: "计量单位", kind: "input", placeholder: "支 / 套 / 台" },
      { key: "category", label: "备件类别", kind: "select", options: CATEGORY },
      { key: "loc", label: "存放库位", kind: "input", placeholder: "如：备件库 A 区 1 排 2 层", full: true },
      { key: "qty", label: "现库存", kind: "number", initial: 0 },
      { key: "safetyQty", label: "安全库存", kind: "number", initial: 0 },
      { key: "price", label: "单价", kind: "number", unit: "元" },
      { key: "lifeManaged", label: "纳入寿命考核", kind: "bool" },
      { key: "lifeLimitHours", label: "寿命限期", kind: "number", unit: "h" },
    ],
  },
  fetch: (q) => sparePartApi.page(q),
  writeFn: (d) => sparePartApi.save(d),
  deleteFn: (id) => sparePartApi.remove(id),
  summary: ({ total }) => `共 ${total} 种备件 · 其中纳入寿命考核的备件参与月度结算`,
};
</script>

<template>
  <ListPage :spec="spec" />
</template>
