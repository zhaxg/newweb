<script setup lang="ts">
/**
 * 对应 TI0004 能源数据接口（系统集成 · 附录 A3 版式 **L1 + 介质汇总卡**）
 *
 * 接口：`energyInterfaceApi.page`（POST /tqmes/energyInterface/listPage）
 *       `energyInterfaceApi.byMedium`（GET /tqmes/energyInterface/byMedium → 统计卡）
 *
 * 演示要点：**本域与能源域（EMS）的唯一接缝**——
 * 规格书把「能源管理」交给 energy 域覆盖，铁区 MES 只通过这一条
 * `EMS-DB_LINK` **下抛**接口接收水/电/气消耗数据；TC0002 成本分析里的
 * `energyCost` 就是从这里读的。客户同时看两个系统时会问「数对不对得上」，
 * 两页的口径必须一致。
 *
 * **`status=失败` 的行 `qty` 是空而不是 0**——这是这一页最重要的一条：
 * EMS 没推到的那一班在明细里是「缺」，合计里也必须缺。
 * 当成 0 会悄悄少算一笔能源成本，而对账时最先被发现的就是
 * 「看起来对得上、其实少了一笔」的账。所以统计卡的合计**只算成功的行**，
 * 同时单独给一张「失败行数」的卡，缺的那笔不会藏起来。
 *
 * 待接入：补收重传、与 EMS 对账差异处理（本域只查桩）。
 */
import { computed, onMounted, ref } from "vue";
import ListPage from "../../ListPage.vue";
import { energyInterfaceApi } from "@/api/mes4tq";
import { dashFmt, moneyFmt, qtyFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TI0004",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "介质 / 备注" },
    {
      key: "medium",
      label: "能源介质",
      kind: "select",
      options: ["电", "水", "蒸汽", "高炉煤气", "焦炉煤气", "转炉煤气", "氧气", "氮气", "氩气", "压缩空气"],
      placeholder: "全部",
    },
    { key: "shift", label: "班次", kind: "select", options: ["A", "B", "C"], placeholder: "全部" },
    { key: "status", label: "接收状态", kind: "select", options: ["成功", "失败", "处理中"], placeholder: "全部" },
    { key: "date", label: "接收日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "id", headerName: "接收单号", width: 200, pinned: "left" },
    { field: "medium", headerName: "能源介质", width: 118, cellRenderer: tagRenderer() },
    { field: "date", headerName: "接收日期", width: 116 },
    { field: "shift", headerName: "班次", width: 78 },
    { field: "qty", headerName: "消耗量", width: 132, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "unit", headerName: "单位", width: 84 },
    { field: "stdCoal", headerName: "折标煤 tce", width: 124, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "price", headerName: "单价 元", width: 104, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "amount", headerName: "金额 元", width: 130, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "source", headerName: "来源接口", width: 130, valueFormatter: dashFmt },
    { field: "status", headerName: "接收状态", width: 100, cellRenderer: tagRenderer() },
    { field: "receiveTime", headerName: "接收时间", minWidth: 160, valueFormatter: dashFmt },
    { field: "remark", headerName: "备注", minWidth: 160, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "重传", kind: "stub" },
  ],
  toolbar: { extraButtons: ["▶ 模拟 EMS 中断"] },
  fetch: (q) => energyInterfaceApi.page(q),
  summary: ({ total, rows }) => {
    const fail = rows.filter((r: any) => r.status === "失败").length;
    return fail ? `本页 ${total} 行 · ${fail} 行 EMS 未推送（缺，不是 0）` : `共 ${total} 行`;
  },
}));

onMounted(async () => {
  try {
    const [byMedium, rows] = await Promise.all([
      energyInterfaceApi.byMedium(),
      energyInterfaceApi.page({ pageSize: 500 }),
    ]);
    const amount = byMedium.reduce((s, m) => s + m.amount, 0);
    const stdCoal = byMedium.reduce((s, m) => s + m.stdCoal, 0);
    const failed = rows.rows.filter((r) => r.status === "失败").length;
    cards.value = [
      { label: "介质种类", value: byMedium.length, sub: "电/水/蒸汽/煤气/气体" },
      {
        label: "近 7 天折标煤",
        value: `${Math.round(stdCoal).toLocaleString("zh-CN")} tce`,
        sub: "只算 EMS 推送成功的行",
      },
      { label: "近 7 天金额", value: `¥${Math.round(amount).toLocaleString("zh-CN")}`, sub: "进入 TC0002 的能源成本" },
      { label: "推送失败", value: failed, sub: "缺数不是 0，对账要单独看" },
    ];
  } catch {
    /* 拦截层已 toast；统计卡空着不影响表格 */
  }
});
</script>

<template>
  <ListPage :spec="spec" :stat-cards="cards" />
</template>
