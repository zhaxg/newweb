<script setup lang="ts">
/** 对应 TW0701 料仓变料记录查询（工序统计查询 · 附录 A3 版式 **L1 · 跨工序**）
 *
 *  接口：`binChangeApi.page`（POST /tqmes/binChange/listPage）
 *
 *  演示要点：**与 TW0101/0201/…/0601 六个工序页打的是同一个端点**——
 *  那六页各自用 `process` 锁死一个工序（左树也只能看本工序的机组），
 *  这一页**不锁**，六道工序的变料流水混在一起。这正是它存在的理由：
 *  跨工序的「昨天谁动过仓」要一次查完，逐个工序页点六遍是查不出事的。
 *
 *  所以筛选里**工序下拉是这一页的主角**（候选来自 `processApi.list()`，
 *  与六个工序页同源，不会出现两处工序名不一样）；机组下拉不锁定，给全厂 19 台。
 *
 *  待接入：变料审批、跨工序追溯链（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../../ListPage.vue";
import { binChangeApi, processApi } from "@/api/mes4tq";
import { codeFmt, dashFmt, numFmt, tagRenderer } from "../../../cells";
import { useNameMaps } from "../../../nameMaps";
import type { ListPageSpec } from "../../../listTypes";

const { ready, materialMap, siloMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const processOptions = ref<string[]>([]);
const processValueMap = ref<Record<string, string>>({});
const processName = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: "TW0701",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "仓号 / 物料 / 操作人 / 批次" },
    /* 工序下拉是本页主角：六道工序的流水混查，靠它切片 */
    {
      key: "process",
      label: "工序",
      kind: "select",
      options: processOptions.value,
      valueMap: processValueMap.value,
      placeholder: "全部工序",
    },
    {
      key: "matrlId",
      label: "物料",
      kind: "select",
      options: materialOptions.value,
      valueMap: materialValueMap.value,
      placeholder: "全部",
    },
    { key: "operator", label: "操作人", kind: "select", options: personOptions.value, placeholder: "全部" },
    { key: "feedTime", label: "变料日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "feedTime", headerName: "变料时间", width: 150, pinned: "left" },
    /* 工序列放第二列：跨工序查询里「这是哪道工序」比「这是哪台设备」更要紧 */
    {
      field: "process",
      headerName: "工序",
      width: 106,
      valueFormatter: (p) => processName.value[String(p.value)] ?? p.value,
      cellRenderer: tagRenderer(),
    },
    { field: "binCode", headerName: "料仓号", width: 132, valueFormatter: codeFmt(siloMap.value) },
    { field: "matrlId", headerName: "变更后物料", width: 130, valueFormatter: codeFmt(materialMap.value) },
    { field: "product", headerName: "物料组", width: 96, valueFormatter: dashFmt },
    { field: "batchNo", headerName: "批次号", width: 146, valueFormatter: dashFmt },
    {
      field: "mtrlConsumeType",
      headerName: "指定规则",
      width: 96,
      valueFormatter: (p) => ({ 1: "指定物料", 2: "指定品种", 3: "自由" })[Number(p.value)] ?? "—",
    },
    { field: "nPercent", headerName: "配比 %", width: 96, type: "numericColumn", valueFormatter: numFmt(1) },
    { field: "operator", headerName: "操作人", width: 96 },
    { field: "remark", headerName: "变更说明", minWidth: 180, flex: 1, valueFormatter: dashFmt },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "料仓管理", kind: "link", to: "/tqmes/basic/silo" },
  ],
  fetch: (q) => binChangeApi.page(q),
  summary: ({ total, rows }) => {
    const kinds = new Set(rows.map((r: any) => r.process)).size;
    return `共 ${total} 条 · 覆盖 ${kinds} 道工序`;
  },
}));

const materialOptions = ref<string[]>([]);
const materialValueMap = ref<Record<string, string>>({});
const personOptions = ref<string[]>([]);

onMounted(async () => {
  try {
    const [procs, people] = await Promise.all([
      processApi.list(),
      import("@/api/mes4tq").then((m) => m.personApi.list()),
    ]);
    for (const p of procs) processName.value[p.code] = p.name;
    processOptions.value = procs.map((p) => p.name);
    /* 中文名 → 工序键：`eq()` 比的是行里的 `process` 原值，不翻过来筛出 0 行 */
    processValueMap.value = Object.fromEntries(procs.map((p) => [p.name, p.code]));
    personOptions.value = people.map((x) => x.name);
    const mats = await import("@/api/mes4tq").then((m) => m.materialApi.list());
    materialOptions.value = mats.map((m) => m.name);
    materialValueMap.value = Object.fromEntries(mats.map((m) => [m.name, m.id]));
  } catch {
    /* 拦截层已 toast；下拉空着不影响其余筛选 */
  }
  try {
    const res = await binChangeApi.page({ pageSize: 500 });
    const rows = res.rows;
    const byProc = new Map<string, number>();
    for (const r of rows) byProc.set(r.process, (byProc.get(r.process) ?? 0) + 1);
    const top = [...byProc.entries()].toSorted((a, b) => b[1] - a[1])[0];
    cards.value = [
      { label: "近 7 天变料", value: rows.length, sub: "六道工序合计" },
      { label: "覆盖工序", value: byProc.size, sub: "全厂六道" },
      {
        label: "变料最频繁",
        value: top ? `${processName.value[top[0]] ?? top[0]} ${top[1]} 次` : "—",
        sub: "换料最勤的那道",
      },
      { label: "涉及料仓", value: new Set(rows.map((r) => r.binCode)).size, sub: "全厂 78 仓中动过的" },
    ];
    /* 字典到货后重查：`process`/`binCode` 两列的 valueFormatter 依赖刚加载的名称表 */
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
