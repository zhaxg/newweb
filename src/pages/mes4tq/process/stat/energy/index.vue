<script setup lang="ts">
/** 对应 TW0702 能源数据结果查询（工序统计查询 · 附录 A3 版式 **L1 · 跨工序**）
 *
 *  接口：`energyInterfaceApi.processEnergy`（按工序汇总）· `energyInterfaceApi.page`（明细查账）
 *
 *  演示要点：**本页是铁区 MES 与能源域（EMS）的唯一交叉口**——
 *  规格书把「能源管理」整体交给 energy 域，铁区 MES 只通过 `TI0004` 那条下抛接口
 *  收到水/电/气消耗数据，然后在这页按**工序**重新切一刀。
 *
 *  与 `TI0004` 的分工要说清楚（客户会拿两页对着看）：
 *  - **TI0004** 按**介质 × 日期 × 班次**查账，回答「哪一班少推了一笔」；
 *  - **TW0702** 按**工序 × 介质**汇总，回答「哪道工序最费气」。
 *  两个是不同的切面，所以是两条端点——从明细里聚合不出工序维度
 *  （那批行挂的是工厂，不是工序），这一点在 `api/mes4tq/index.ts` 的 `processEnergy` 注释里写明了。
 *
 *  **失败行不进合计**：EMS 没推到的那一班是「缺」不是 0，把它当 0 会悄悄少算一笔能源成本。
 *
 *  待接入：能耗对标、单耗考核（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../../ListPage.vue";
import { energyInterfaceApi, processApi } from "@/api/mes4tq";
import { codeFmt, moneyFmt, numFmt, qtyFmt, tagRenderer } from "../../../cells";
import { useNameMaps } from "../../../nameMaps";
import type { ListPageSpec } from "../../../listTypes";

const { ready } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const processOptions = ref<string[]>([]);
const processValueMap = ref<Record<string, string>>({});
const processName = ref<Record<string, string>>({});

/** 候选写死在这里而不是页面外拉：`supplyApi` 那类没有字典端点的实体同样处理——
 *  十种介质是**产品口径**（B1 的系统边界表），半年不会变，多一次请求换不来信息量 */
const MEDIAS = ["电", "水", "蒸汽", "高炉煤气", "焦炉煤气", "转炉煤气", "氧气", "氮气", "氩气", "压缩空气"];

const spec = computed<ListPageSpec>(() => ({
  code: "TW0702",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "工序 / 介质" },
    {
      key: "process",
      label: "工序",
      kind: "select",
      options: processOptions.value,
      valueMap: processValueMap.value,
      placeholder: "全部工序",
    },
    { key: "medium", label: "能源介质", kind: "select", options: MEDIAS, placeholder: "全部" },
  ],
  columns: [
    /* 工序列第一列：本页的组织维度就是工序 */
    {
      field: "process",
      headerName: "工序",
      width: 106,
      pinned: "left",
      valueFormatter: (p) => processName.value[String(p.value)] ?? p.value,
      cellRenderer: tagRenderer(),
    },
    { field: "medium", headerName: "能源介质", width: 118, cellRenderer: tagRenderer() },
    { field: "unit", headerName: "单位", width: 84 },
    { field: "qty", headerName: "近 7 天消耗", width: 136, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "stdCoal", headerName: "折标煤 tce", width: 136, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "amount", headerName: "金额 元", width: 136, type: "numericColumn", valueFormatter: moneyFmt },
    { field: "unitConsumption", headerName: "单耗", width: 116, type: "numericColumn", valueFormatter: numFmt(1) },
    { field: "yoy", headerName: "同比 %", width: 100, type: "numericColumn", valueFormatter: numFmt(1) },
  ],
  actions: [
    { label: "明细查账", kind: "link", to: "/tqmes/integrate/energy" },
    { label: "成本分析", kind: "link", to: "/tqmes/cost/analysis" },
  ],
  fetch: async (q) => {
    /* 本页的行是**按工序汇总的读取**、不是分页表，所以在这里拼出 ListPage 要的形状——
       明细走 TI0004 的分页端点，汇总走 processEnergy（见文件头「两个是不同的切面」） */
    const rows = await energyInterfaceApi.processEnergy(q);
    return { total: rows.length, rows };
  },
  summary: ({ total, rows }) => {
    const failedish = rows.filter((r: any) => Number(r.yoy) > 6).length;
    return failedish ? `共 ${total} 行 · ${failedish} 行同比上升超 6%` : `共 ${total} 行`;
  },
}));

onMounted(async () => {
  try {
    const [procs, rows] = await Promise.all([processApi.list(), energyInterfaceApi.processEnergy({})]);
    for (const p of procs) processName.value[p.code] = p.name;
    processOptions.value = procs.map((p) => p.name);
    processValueMap.value = Object.fromEntries(procs.map((p) => [p.name, p.code]));

    /* 统计卡：按工序求标煤与金额，「最费气的工序」是这一屏最常被问的一句 */
    const byProc = new Map<string, { coal: number; amount: number }>();
    for (const r of rows) {
      const cur = byProc.get(r.process) ?? { coal: 0, amount: 0 };
      cur.coal += r.stdCoal;
      cur.amount += r.amount;
      byProc.set(r.process, cur);
    }
    const top = [...byProc.entries()].toSorted((a, b) => b[1].amount - a[1].amount)[0];
    cards.value = [
      {
        label: "近 7 天折标煤",
        value: `${Math.round(rows.reduce((s, r) => s + r.stdCoal, 0)).toLocaleString("zh-CN")} tce`,
        sub: "只算 EMS 推送成功的行",
      },
      {
        label: "近 7 天能源成本",
        value: `¥${Math.round(rows.reduce((s, r) => s + r.amount, 0)).toLocaleString("zh-CN")}`,
        sub: "进入 TC0002 的 energyCost",
      },
      {
        label: "最费钱的工序",
        value: top ? (processName.value[top[0]] ?? top[0]) : "—",
        sub: top ? `¥${Math.round(top[1].amount).toLocaleString("zh-CN")}` : "",
      },
      { label: "工序 × 介质", value: rows.length, sub: `${byProc.size} 道工序` },
    ];
    /* 字典到货后重查一次右表：`process` 列的 valueFormatter 依赖 `processName`，
       不重查它会一直显示 `sinter` 这种工序键 */
    listRef.value?.reload();
  } catch {
    /* 拦截层已 toast */
  }
});

watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);
</script>

<template>
  <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
</template>
