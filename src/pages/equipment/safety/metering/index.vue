<script setup lang="ts">
/** 对应 AC0004 计量器具台账（模块六 安全合规 · 附录 B5 版式 L1）
 *  接口：meteringApi.page（POST /eam/metering/listPage）/ verify（/metering/verify）+ exportRows("metering")
 *  演示要点：**计量条线的法务红线是「强制检定目录内的器具必须周检」**，所以页面把「强检」单独成列、
 *        并给「临检 / 超期」上色（口径与 AC0003 完全一致：`/metering/listPage` 带回 `daysLeft` 与
 *        `deadlineState`，阈值和报警扫描共用 `warnDays`，不在页面里 `Date.now()` 现算）。
 *        这页**没有「新增」和「编辑」**，是刻意的：计量器具台账由主数据接口同步进来（AG0001 的 IF-001），
 *        EAM 侧只开放「周期检定登记」这一个动作——检定完成才回写下次检定日与证书号。
 *        给客户讲这页时这句话很有用：**能改的是合规状态，不是台账本身**。
 *  待接入：检定证书扫描件（后端未提供，与 AC0003 同一处占位）。 */
import { computed, ref } from "vue";
import ListPage from "../../ListPage.vue";
import { exportRows, meteringApi } from "@/api/equipment";
import { boolRenderer, dashFmt, dayFmt, tagRenderer } from "../../cells";
import type { ListPageSpec } from "../../listTypes";

const STATUSES = ["合格", "临检", "超期"];

const listRef = ref<InstanceType<typeof ListPage> | null>(null);

/** 到期文案（与 AC0003 同口径）：超期要说「已超期 n 天」，不能给一个负数让客户自己减 */
function deadlineText(d: unknown) {
  const n = Number(d);
  if (!Number.isFinite(n)) return "—";
  if (n < 0) return `已超期 ${-n} 天`;
  if (n === 0) return "今天到期";
  return `${n} 天后`;
}

const spec = computed<ListPageSpec>(() => ({
  code: "AC0004",
  queryLabelWidth: "w-20",
  query: [
    { key: "keyword", label: "器具名称", kind: "input", placeholder: "名称或检定证书号" },
    {
      key: "mandatoryVerify",
      label: "强制检定",
      kind: "select",
      options: ["是", "否"],
      valueMap: { 是: "true", 否: "false" },
      placeholder: "全部",
    },
    { key: "status", label: "检定状态", kind: "select", options: STATUSES, placeholder: "全部状态" },
  ],
  columns: [
    { field: "id", headerName: "器具编号", width: 96 },
    { field: "name", headerName: "器具名称", minWidth: 200, flex: 1 },
    { field: "accuracy", headerName: "准确度等级", width: 150 },
    { field: "mandatoryVerify", headerName: "强检", width: 84, cellRenderer: boolRenderer("强检", "非强检") },
    { field: "verifyCycleMonths", headerName: "检定周期", width: 96, valueFormatter: (p) => `${p.value ?? "—"} 月` },
    { field: "nextVerifyAt", headerName: "下次检定", width: 110, valueFormatter: dayFmt },
    {
      colId: "deadline",
      headerName: "距下次检定",
      width: 122,
      sortable: false,
      valueGetter: (p) => deadlineText(p.data.daysLeft),
      cellClass: (p: any) =>
        p.data.deadlineState === "超期"
          ? "text-red-600 font-medium dark:text-red-400"
          : p.data.deadlineState === "临期"
            ? "text-amber-600 font-medium dark:text-amber-400"
            : "",
    },
    { field: "certNo", headerName: "检定证书号", width: 140, valueFormatter: dashFmt },
    { field: "status", headerName: "检定状态", width: 92, cellRenderer: tagRenderer() },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    {
      label: "登记检定",
      kind: "form",
      title: "登记本次周期检定",
      fields: [
        { key: "nextVerifyAt", label: "下次检定日期", kind: "date", placeholder: "留空即按检定周期自动外推" },
        { key: "certNo", label: "检定证书号", kind: "input", placeholder: "如 衡检-2026-0221" },
      ],
      run: (row, f) =>
        meteringApi.verify(row.id, String(f.nextVerifyAt ?? ""), f.certNo ? String(f.certNo) : undefined),
      okMsg: "检定完成，证书与下次检定日已更新",
    },
  ],
  toolbar: {
    acts: [{ label: "导出", okMsg: "导出任务已提交", refresh: false, run: (f) => exportRows("metering", f) }],
  },
  detail: {
    sections: [
      {
        title: "器具信息",
        fields: [
          { label: "器具编号", from: "id" },
          { label: "器具名称", from: "name" },
          { label: "准确度等级", from: "accuracy" },
          { label: "强制检定", from: "mandatoryVerify", map: { true: "是", false: "否" } },
          { label: "检定周期", from: "verifyCycleMonths", suffix: " 个月" },
        ],
      },
      {
        title: "周期检定",
        fields: [
          { label: "下次检定日期", from: "nextVerifyAt" },
          { label: "到期分档", from: "deadlineState" },
          { label: "距下次检定", from: "daysLeft", suffix: " 天（负数为已超期）" },
          { label: "检定证书号", from: "certNo" },
          { label: "检定状态", from: "status" },
        ],
      },
    ],
  },
  fetch: (q) => meteringApi.page(q),
  summary: ({ total, rows }) => {
    const mandatory = rows.filter((r: any) => r.mandatoryVerify).length;
    const near = rows.filter((r: any) => r.deadlineState === "临期").length;
    const over = rows.filter((r: any) => r.deadlineState === "超期").length;
    return `共 ${total} 台 · 本页强检 ${mandatory} · 临检 ${near} · 超期 ${over}`;
  },
}));
</script>

<template>
  <ListPage ref="listRef" :spec="spec" />
</template>
