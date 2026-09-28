<script setup lang="ts">
/** 对应 TW0203 推焦作业实绩（焦化工序 · 附录 A3 版式 **L1 列表页 + 统计卡**）
 *
 *  接口：`pushCokeApi.page`（POST /tqmes/pushCoke/listPage）
 *
 *  演示要点：**三个 K 系数是这一页的全部内容**（A3 原文：出焦炉号/时间/推焦电流/系数 K1K2K3）：
 *  - **K1 计划系数** = 实出炉数 / 计划炉数 → 该出的有没有都出；
 *  - **K2 执行系数** = 实出炉数 / 实际作业时间能出的炉数 → 作业效率；
 *  - **K3 操作系数** = 正确炉数 / 实出炉数 → **有没有推错炉**。
 *
 *  K3 < 1 意味着出过错（提前接焦、错推相邻炉），是要追责的事故，
 *  所以 mock 里约 5% 的记录 K3 落在 0.92~0.99、备注写「错推相邻炉，已按事故追查」。
 *  **全给 1 的话 K3 这一列就没有存在的理由**，客户会问「既然都对要它干嘛」。
 *
 *  B7 的「▶ 模拟推焦」落点：5#焦炉完成一次出焦 → 推焦电流与 K 系数更新。
 *
 *  待接入：推焦计划、四车联锁回传（本域只查桩）。
 */
import { computed, ref, watch } from "vue";
import ListPage from "../../../ListPage.vue";
import { pushCokeApi } from "@/api/mes4tq";
import { codeFmt, dashFmt, numFmt, tagRenderer } from "../../../cells";
import { useNameMaps } from "../../../nameMaps";
import type { ListPageSpec } from "../../../listTypes";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TW0203",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "炉号 / 班组 / 备注" },
    { key: "ovenNo", label: "焦炉", kind: "select", options: OVENS, placeholder: "全部" },
    { key: "shift", label: "班次", kind: "select", options: ["A", "B", "C"], placeholder: "全部" },
    { key: "team", label: "班组", kind: "select", options: ["T-A", "T-B", "T-C", "T-D"], placeholder: "全部" },
    { key: "pushTime", label: "出焦日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "pushTime", headerName: "出焦时间", width: 150, pinned: "left" },
    { field: "ovenNo", headerName: "炉号", width: 84 },
    { field: "current", headerName: "推焦电流 A", width: 116, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "planCokingTime", headerName: "计划结焦 h", width: 116, type: "numericColumn", valueFormatter: numFmt(0) },
    {
      field: "actualCokingTime",
      headerName: "实际结焦 h",
      width: 116,
      type: "numericColumn",
      valueFormatter: numFmt(0),
    },
    /* 三个 K 系数是本页的核心，各给足列宽且右对齐——它们是客户逐行核对的对象 */
    { field: "k1", headerName: "K1 计划", width: 104, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "k2", headerName: "K2 执行", width: 104, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "k3", headerName: "K3 操作", width: 104, type: "numericColumn", valueFormatter: numFmt(3) },
    {
      field: "shift",
      headerName: "班次",
      width: 76,
      valueFormatter: (p) => ({ A: "A 早班", B: "B 中班", C: "C 夜班" })[String(p.value)] ?? p.value,
    },
    { field: "team", headerName: "班组", width: 84 },
    { field: "remark", headerName: "备注", minWidth: 200, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "炉温记录", kind: "link", to: "/tqmes/process/coke/temp" },
  ],
  toolbar: { extraButtons: ["▶ 模拟推焦"] },
  fetch: (q) => pushCokeApi.page(q),
  summary: ({ total, rows }) => {
    const bad = rows.filter((r: any) => Number(r.k3) < 1).length;
    return bad ? `本页 ${total} 条 · K3<1（错推）${bad} 条` : `共 ${total} 条`;
  },
}));

const OVENS = ["1#", "2#", "3#", "4#", "5#", "6#"];

/** 统计卡：K 系数的**均值**才说明问题，单行看不出来（K3 全是 1 也看不出趋势） */
async function loadCards() {
  try {
    const res = await pushCokeApi.page({ pageSize: 500 });
    const rows = res.rows;
    const avg = (f: keyof (typeof rows)[number]) =>
      rows.reduce((s, r) => s + Number(r[f] ?? 0), 0) / Math.max(1, rows.length);
    const fault = rows.filter((r) => Number(r.k3) < 1).length;
    const current = rows.reduce((s, r) => s + Number(r.current ?? 0), 0) / Math.max(1, rows.length);
    cards.value = [
      { label: "K1 计划（均）", value: avg("k1").toFixed(3), sub: "该出的有没有都出" },
      { label: "K2 执行（均）", value: avg("k2").toFixed(3), sub: "作业效率" },
      { label: "K3 操作（均）", value: avg("k3").toFixed(3), sub: fault ? `${fault} 次错推已记事故` : "无错推" },
      { label: "平均推焦电流", value: `${current.toFixed(0)} A`, sub: "超出 180~260 要看机械" },
    ];
  } catch {
    /* 拦截层已 toast */
  }
}

watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

void loadCards();
</script>

<template>
  <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
</template>
