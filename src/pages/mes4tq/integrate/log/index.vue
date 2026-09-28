<script setup lang="ts">
/**
 * 对应 TI0003 接口日志监控（系统集成 · 附录 A3 版式 **L1 + 接口成功率卡**）
 *
 * 接口：`interfaceLogApi.page`（POST /tqmes/interfaceLog/listPage）
 *       `interfaceLogApi.health`（GET /tqmes/interfaceLog/health → 统计卡与顶部健康条）
 *
 * 演示要点：**13 个对接接口的每一次调用都留了痕**（规格书 B10）——
 * ERP-MR/MP/IN 走 DI、远程计量与检化验走 DB_LINK、EMS 走 DB_LINK、
 * 五条 L2 与三个 OPC 中间件走 TCP。客户问「接口挂了谁负责、
 * 哪一班没收到」时，点开一条失败日志就能看到**真像后端吐出来的**错误文本
 * （`ORA-00001 unique constraint violated`、`socket timeout after 15000ms`…）。
 *
 * **失败率刻意留约 6%**：全绿的接口监控看不出监控在干什么，失败率太高又像接得不好。
 * 顶部统计卡显示的是「平均成功率」，不是「全部成功」——
 * 一个「全部成功」的演示反而会让客户怀疑日志是假的。
 *
 * 时间区间筛**只按日**：日志只精确到分钟但演示要按天翻，
 * 送带时分的区间会把「9-26 全天」筛成「9-26 08:00 之后」，看着像没数据。
 *
 * 待接入：日志重推、接口启停（本域只查桩）。
 */
import { computed, onMounted, ref } from "vue";
import ListPage from "../../ListPage.vue";
import { interfaceLogApi } from "@/api/mes4tq";
import { dashFmt, numFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TI0003",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "接口名 / 系统 / 错误" },
    {
      key: "interfaceName",
      label: "接口",
      kind: "select",
      options: [
        "ERP-MR",
        "ERP-MP",
        "ERP-IN",
        "远程计量",
        "检化验",
        "EMS",
        "高炉L2",
        "烧结L2",
        "球团L2",
        "原料L2",
        "焦化用煤优化",
        "四车联锁",
        "温度管理",
      ],
      placeholder: "全部",
    },
    {
      key: "direction",
      label: "方向",
      kind: "select",
      options: ["上抛", "下抛", "请求", "响应", "双向"],
      placeholder: "全部",
    },
    { key: "status", label: "状态", kind: "select", options: ["成功", "失败", "处理中"], placeholder: "全部" },
    {
      key: "date",
      label: "调用日期",
      kind: "range",
      as: "date",
      /* `as: "date"` 只送 YYYY-MM-DD——见文件头「只按日筛」的理由 */
      placeholder: "日期区间",
    },
  ],
  columns: [
    { field: "id", headerName: "日志号", width: 140, pinned: "left" },
    { field: "interfaceName", headerName: "接口", width: 132 },
    { field: "direction", headerName: "方向", width: 84, cellRenderer: tagRenderer() },
    { field: "sourceSystem", headerName: "源系统", width: 130 },
    { field: "targetSystem", headerName: "目标系统", width: 140 },
    { field: "status", headerName: "状态", width: 96, cellRenderer: tagRenderer() },
    { field: "timestamp", headerName: "调用时间", minWidth: 160 },
    { field: "costMs", headerName: "耗时 ms", width: 96, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "content", headerName: "内容", minWidth: 260, flex: 1, valueFormatter: dashFmt },
    /* 错误文本最宽：客户点开一条失败就是要读这串 SQL/套接字提示 */
    { field: "errorMsg", headerName: "错误信息", minWidth: 300, flex: 2, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "重推", kind: "stub" },
  ],
  toolbar: { extraButtons: ["▶ 模拟接口中断"] },
  fetch: (q) => interfaceLogApi.page(q),
  summary: ({ total, rows }) => {
    const fail = rows.filter((r: any) => r.status === "失败").length;
    return fail ? `本页 ${total} 条 · 失败 ${fail} 条` : `共 ${total} 条`;
  },
}));

onMounted(async () => {
  try {
    const health = await interfaceLogApi.health();
    const total = health.reduce((s, h) => s + h.total, 0);
    const fail = health.reduce((s, h) => s + h.fail, 0);
    const worst = health.toSorted((a, b) => a.rate - b.rate)[0];
    cards.value = [
      { label: "对接接口", value: health.length, sub: "规格书 B10 的 13 条" },
      { label: "近 7 天调用", value: total.toLocaleString("zh-CN"), sub: "全部接口合计" },
      {
        label: "平均成功率",
        value: `${Math.round(((total - fail) / Math.max(1, total)) * 10000) / 100}%`,
        sub: "失败不隐去——全绿反像假的",
      },
      { label: "成功率最低", value: worst ? `${worst.rate}%` : "—", sub: worst?.interfaceName ?? "" },
    ];
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <ListPage :spec="spec" :stat-cards="cards" />
</template>
