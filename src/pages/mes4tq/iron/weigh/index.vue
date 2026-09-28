<script setup lang="ts">
/** 对应 TM0003 铁水过磅台账（铁水调度 · 附录 A3 版式 **L1 列表页**）
 *
 *  接口：`tappingActualApi.page`（POST /tqmes/tappingActual/listPage）
 *        `tappingActualApi.detail`
 *
 *  演示要点：**这一页是计量系统回传的磅重 + 温度 + 成分**（A3 原文），
 *  三样都得有，缺一样客户就会问「这台账是 MES 自己记的还是计量回传的」。
 *  所以：
 *  - `weight` 磅重来自计量系统（**不是计划量**——计划与磅重差 3~5% 是常态）；
 *  - `temperature` 是**过磅时**的温度，`tempDrop` 是它与出铁温度的差；
 *  - `si`/`mn`/`s`/`p` 成分与 **TQ0003 铁水批次**同口径——
 *    两处必须对得上，客户会拿这两页交叉核。
 *
 *  **温降是这一页最有说服力的数**：30~86℃ 的抖动幅度随转运距离变，
 *  恒定温降或 0 都会显得是编的（数据层见 `data/iron.ts`）。
 *  所以「温降 ≥70℃」给了独立筛选——现场最关心的就是「哪一罐凉过头了」。
 *
 *  **台账只收已完成的计划**：没出完铁水就没有磅重，
 *  台账里出现「出铁中」的计划是矛盾的（数据层已按 `status === 已完成` 过滤）。
 *
 *  待接入：计量接口回传、成分复检（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { tappingActualApi, tappingPlanApi } from "@/api/mes4tq";
import { codeFmt, dayFmt, numFmt, qtyFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const spec = computed<ListPageSpec>(() => ({
  code: "TM0003",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "台账号 / 高炉 / 罐号 / 出铁口" },
    {
      key: "furnaceId",
      label: "高炉",
      kind: "select",
      options: furnaces.value,
      valueMap: furnaceValueMap.value,
      placeholder: "全部",
    },
    { key: "destination", label: "去向", kind: "select", options: ["炼钢1#", "炼钢2#", "铸铁"], placeholder: "全部" },
    { key: "minDrop", label: "温降≥℃", kind: "input", placeholder: "如 70" },
    { key: "tapStartTime", label: "出铁日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "tapStartTime", headerName: "出铁开始", width: 150, pinned: "left" },
    { field: "tapEndTime", headerName: "出铁结束", width: 150 },
    { field: "furnaceId", headerName: "高炉", width: 116, valueFormatter: codeFmt(unitMap.value) },
    { field: "tapNo", headerName: "铁次", width: 84, type: "numericColumn", valueFormatter: (p) => `第 ${p.value} 次` },
    { field: "tapHole", headerName: "出铁口", width: 96 },
    { field: "ladleId", headerName: "罐号", width: 118 },
    /* 磅重是**计量回传**的实重，不是计划量——两者的差就是客户要看的东西 */
    { field: "weight", headerName: "磅重 t", width: 120, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "temperature", headerName: "过磅温度 ℃", width: 130, type: "numericColumn", valueFormatter: numFmt(0) },
    /* 温降单独一列并给筛选：≥70 是现场的告警线，客户会直接问「有没有凉过头的」 */
    { field: "tempDrop", headerName: "温降 ℃", width: 110, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "destination", headerName: "去向", width: 110, cellRenderer: tagRenderer() },
    /* 成分四列与 TQ0003 同口径，客户会交叉核 */
    { field: "si", headerName: "Si %", width: 96, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "mn", headerName: "Mn %", width: 96, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "s", headerName: "S %", width: 96, type: "numericColumn", valueFormatter: numFmt(4) },
    { field: "p", headerName: "P %", width: 96, type: "numericColumn", valueFormatter: numFmt(3) },
    { field: "remark", headerName: "备注", minWidth: 200, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "铁水检验", kind: "link", to: "/tqmes/quality/result" },
    { label: "出铁计划", kind: "link", to: "/tqmes/iron/plan" },
  ],
  toolbar: { extraButtons: ["▶ 模拟过磅回传"] },
  fetch: (q) => tappingActualApi.page(q),
  summary: ({ total, rows }) => {
    const bigDrop = rows.filter((r: any) => Number(r.tempDrop) >= 70).length;
    return bigDrop ? `本页 ${total} 罐 · 温降 ≥70℃ 的 ${bigDrop} 罐` : `共 ${total} 罐`;
  },
}));

const furnaces = ref<string[]>([]);
const furnaceValueMap = ref<Record<string, string>>({});

async function loadAll() {
  try {
    const [all, fs] = await Promise.all([tappingActualApi.page({ pageSize: 500 }), tappingPlanApi.furnaces()]);
    furnaces.value = fs.map((f) => f.name);
    furnaceValueMap.value = Object.fromEntries(fs.map((f) => [f.name, f.id]));

    const rows = all.rows;
    cards.value = [
      { label: "过磅罐数", value: rows.length, sub: "只收已完成的出铁计划" },
      {
        label: "平均磅重",
        value: `${Math.round(rows.reduce((s, r) => s + r.weight, 0) / Math.max(1, rows.length))} t`,
        sub: "计量回传，非计划量",
      },
      {
        label: "平均温降",
        value: `${Math.round(rows.reduce((s, r) => s + r.tempDrop, 0) / Math.max(1, rows.length))} ℃`,
        sub: "出铁温度 − 过磅温度",
      },
      { label: "温降 ≥70℃", value: rows.filter((r) => r.tempDrop >= 70).length, sub: "转运远的那几罐" },
    ];
    listRef.value?.reload();
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

onMounted(() => void loadAll());
</script>

<template>
  <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
</template>
