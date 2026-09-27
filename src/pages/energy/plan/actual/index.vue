<script setup lang="ts">
/**
 * EP0002 能源实绩管理（模块五 · 附录 B5 版式 **V3 台账 + 公式追溯 + 校正留痕**）
 *
 *  接口：`actualApi.page/correct/recalc`
 *
 *  演示要点：这一页是幕 6 的第一站——「▶ 重算昨日实绩」按下后，
 *  统计节点行的 `formulaTrace` 会变（它是**算式快照**，`buildActualRecords` 写进去的），
 *  详情弹窗把它原样摊开：「烧结机总电耗 = Σ各回路」。**追溯值必须从行上读、不许页面重算**，
 *  否则弹窗里的式子与行上的值会是两套口径（本域红线：页间矛盾）。
 *
 *  **人工校正留痕**（`kind:"form"` 动作）：校正后行上多出 `correctedFrom/correctBy/correctReason`
 *  三列——审计要的就是「改过、谁改的、为什么」，而不是把旧值悄悄覆盖。
 *  该月结算**已定稿**时 store 直接拒绝（B2-5 门控），页面只弹 msg，不刷新。
 *
 *  「缺失」列是 EC0002 通讯中断的**后果展示区**之一：中断期实绩 `missing=true`，
 *  这里看得见、补录工单（EC0003）能处理它。
 *
 *  待接入：月份切片与日/月粒度并排对比（等 EP0003 的平衡表口径稳定）。
 */
import { computed, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { actualApi } from "@/api/energy";
import type { ActualRecord } from "@/api/energy/types";
import { useNameMaps } from "../../nameMaps";
import { boolRenderer, codeFmt, dashFmt, dayFmt, numFmt, qtyFmt, tagRenderer } from "../../cells";
import type { DetailSection, ListPageSpec } from "../../listTypes";

const { ready, unitMap, mediumMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/**
 * 详情分段：**公式追溯单独一段、放最上面**。
 * 它是这一页存在的理由——`formulaTrace` 为空的行（计量点实绩）不显示这段，
 * 而不是显示一排「—」让客户以为数据丢了。
 */
const DETAIL: DetailSection[] = [
  {
    title: "计算过程（统计节点行才有）",
    fields: [{ label: "公式追溯", from: "formulaTrace" }],
  },
  {
    title: "实绩身份",
    fields: [
      { label: "记录号", from: "id" },
      { label: "日期", from: "date" },
      { label: "粒度", from: "granularity", map: { day: "日", month: "月" } },
      { label: "计量点", from: "pointId" },
      { label: "用能单元", from: "unitId" },
      { label: "介质", from: "mediaCode" },
      { label: "流向", from: "direction" },
      { label: "数据来源", from: "source" },
    ],
  },
  {
    title: "量与折标",
    fields: [
      { label: "实物量", from: "value" },
      { label: "折标", from: "stdCoal", suffix: " kgce" },
      { label: "缺失", from: "missing", map: { true: "通道中断期（待补录）", false: "正常" } },
    ],
  },
  {
    /* 审计段：校正前的值 + 谁改的 + 为什么，三样缺一不可 */
    title: "校正留痕（改过的行才出现）",
    fields: [
      { label: "校正前值", from: "correctedFrom" },
      { label: "校正人", from: "correctBy" },
      { label: "校正原因", from: "correctReason" },
    ],
  },
];

const spec = computed<ListPageSpec>(() => ({
  code: "EP0002",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "记录号 / 计量点 / 用能单元" },
    {
      key: "granularity",
      label: "粒度",
      kind: "select",
      options: ["日", "月"],
      valueMap: { 日: "day", 月: "month" },
      placeholder: "全部",
    },
    {
      key: "source",
      label: "数据来源",
      kind: "select",
      options: ["采集", "公式", "补录", "校正"],
      placeholder: "全部",
    },
    {
      key: "mediaCode",
      label: "介质",
      kind: "select",
      options: mediaOptions.value,
      valueMap: mediumValueMap.value,
      placeholder: "全部",
    },
    {
      key: "direction",
      label: "流向",
      kind: "select",
      options: ["购入", "自产", "转换", "消耗", "回收", "外供"],
      placeholder: "全部",
    },
    /* 「只看缺失」是 EC0002 中断后的核对入口 */
    {
      key: "missing",
      label: "缺失",
      kind: "select",
      options: ["是", "否"],
      valueMap: { 是: "true", 否: "false" },
      placeholder: "全部",
    },
    { key: "date", label: "日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "date", headerName: "日期", width: 112, pinned: "left", valueFormatter: dayFmt },
    {
      field: "granularity",
      headerName: "粒度",
      width: 76,
      valueFormatter: (p) => ({ day: "日", month: "月" })[String(p.value)] ?? "—",
    },
    { field: "unitId", headerName: "用能单元", width: 132, valueFormatter: codeFmt(unitMap.value) },
    { field: "pointId", headerName: "计量点", width: 118, valueFormatter: dashFmt },
    { field: "mediaCode", headerName: "介质", width: 118, valueFormatter: codeFmt(mediumMap.value) },
    { field: "direction", headerName: "流向", width: 88 },
    { field: "value", headerName: "实物量", width: 130, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "stdCoal", headerName: "折标 kgce", width: 124, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "source", headerName: "数据来源", width: 96, cellRenderer: tagRenderer() },
    /* 公式列给 flex：追溯是这一页的全部价值，窄列截断就白做了 */
    { field: "formulaTrace", headerName: "公式追溯", minWidth: 260, flex: 2, valueFormatter: dashFmt },
    { field: "correctBy", headerName: "校正人", width: 96, valueFormatter: dashFmt },
    { field: "correctReason", headerName: "校正原因", minWidth: 180, flex: 1, valueFormatter: dashFmt },
    { field: "missing", headerName: "缺失", width: 84, cellRenderer: boolRenderer("缺", "正常") },
  ],
  detail: { sections: DETAIL },
  actions: [
    { label: "详情", kind: "detail" },
    {
      label: "校正",
      kind: "form",
      title: "人工校正（三处留痕：前值 / 人 / 原因）",
      fields: [
        { key: "value", label: "校正后值", kind: "number", placeholder: "非负数" },
        { key: "by", label: "校正人", kind: "input", placeholder: "如 张调" },
        { key: "reason", label: "校正原因", kind: "textarea", full: true, placeholder: "审计要读完整的一句话" },
      ],
      run: (row, form) => actualApi.correct(row.id, Number(form.value), form.by, form.reason),
      okMsg: "校正已留痕",
    },
    { label: "平衡表", kind: "link", to: "/energy/plan/balance" },
  ],
  toolbar: {
    acts: [
      {
        label: "▶ 重算昨日实绩",
        confirm: "由计量点实绩 + 公式汇总统计节点实绩，并同步刷新平衡表。该月已定稿会被拒绝。确认重算？",
        run: () => actualApi.recalc(),
        okMsg: "昨日实绩已重算",
      },
    ],
    extraButtons: ["▶ 生成当日异常"],
  },
  fetch: (q) => actualApi.page(q),
  summary: ({ total, rows }) => {
    const miss = rows.filter((r: any) => r.missing).length;
    const traced = rows.filter((r: any) => r.formulaTrace).length;
    return miss
      ? `本页 ${total} 条 · 缺失 ${miss} 条（EC0002 中断期）· 带公式 ${traced} 条`
      : `本页 ${total} 条 · 带公式 ${traced} 条`;
  },
}));

const mediaOptions = ref<string[]>([]);
const mediumValueMap = ref<Record<string, string>>({});

/** 候选从 nameMaps 的介质表现造（它已是码→名真源），不另发请求 */
function buildOptions() {
  mediaOptions.value = Object.values(mediumMap.value);
  mediumValueMap.value = Object.fromEntries(Object.entries(mediumMap.value).map(([code, name]) => [name, code]));
}

watch(
  ready,
  (v) => {
    if (v) {
      buildOptions();
      listRef.value?.reload();
    }
  },
  { once: true },
);
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
