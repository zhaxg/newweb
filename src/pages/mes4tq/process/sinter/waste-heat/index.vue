<script setup lang="ts">
/** 对应 TW0406 余热回收监控（烧结工序 · 附录 A3 版式 **L5 实时监控盘**）
 *
 *  接口：`wasteHeatApi.current`（当前值条）· `wasteHeatApi.page`（历史记录表）
 *
 *  演示要点：**除氧器压力是双端危险的参数**——低了氧除不尽会腐蚀汽包，
 *  高了安全阀起跳。所以它的下限给的是**正值**（0.02 MPa）而不是 0，
 *  两边都要能标红。这与料仓料位是同一条逻辑：**不是「越高越坏」，是「两头都坏」**。
 *
 *  表里的 `status` 列是 model 判的（`正常`/`报警`），**页面不重算判定**——
 *  两处判定必然会出现两页对同一条给出不同结论。
 *
 *  待接入：蒸汽外供、余热发电量（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../../ListPage.vue";
import { wasteHeatApi } from "@/api/mes4tq";
import { codeFmt, dayFmt, numFmt, tagRenderer } from "../../../cells";
import { useNameMaps } from "../../../nameMaps";
import type { ListPageSpec } from "../../../listTypes";
import { tqDarkClass, tqHeaderTextClass, tqPanelClass } from "../../../tqTheme";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

const current = ref<any>(null);
const clock = ref("");

const spec = computed<ListPageSpec>(() => ({
  code: "TW0406",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "机组" },
    {
      key: "unitId",
      label: "烧结机",
      kind: "select",
      options: ["1#烧结机", "2#烧结机"],
      valueMap: { "1#烧结机": "SJ01-01", "2#烧结机": "SJ01-02" },
      placeholder: "全部",
    },
    { key: "status", label: "状态", kind: "select", options: ["正常", "报警"], placeholder: "全部" },
    { key: "clock", label: "日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "clock", headerName: "采样时刻", width: 150, pinned: "left", valueFormatter: dayFmt },
    { field: "unitId", headerName: "烧结机", width: 120, valueFormatter: codeFmt(unitMap.value) },
    { field: "steamOutput", headerName: "蒸汽产量 t/h", width: 132, type: "numericColumn", valueFormatter: numFmt(1) },
    { field: "drumPressure", headerName: "汽包压力 MPa", width: 136, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "drumLevel", headerName: "汽包液位 mm", width: 128, type: "numericColumn", valueFormatter: numFmt(0) },
    {
      field: "deaeratorPressure",
      headerName: "除氧器压力 MPa",
      width: 156,
      type: "numericColumn",
      valueFormatter: numFmt(3),
    },
    {
      field: "deaeratorTemp",
      headerName: "除氧器温度 ℃",
      width: 136,
      type: "numericColumn",
      valueFormatter: numFmt(0),
    },
    { field: "status", headerName: "状态", width: 96, cellRenderer: tagRenderer() },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: { extraButtons: ["▶ 模拟余热波动"] },
  fetch: (q) => wasteHeatApi.page(q),
  summary: ({ total, rows }) => {
    const bad = rows.filter((r: any) => r.status === "报警").length;
    return bad ? `本页 ${total} 条 · 报警 ${bad} 条` : `共 ${total} 条`;
  },
}));

/** 当前值条：四个数就是这一屏要盯的（蒸汽产量 / 汽包压力液位 / 除氧器） */
const tiles = computed<Array<{ label: string; value: string; unit?: string; alarm?: boolean }>>(() => {
  const c = current.value;
  if (!c) return [];
  const pressureOk = c.deaeratorPressure >= 0.02 && c.deaeratorPressure <= 0.06;
  const levelOk = c.drumLevel >= 300 && c.drumLevel <= 620;
  return [
    { label: "蒸汽产量", value: String(c.steamOutput ?? "—"), unit: "t/h" },
    { label: "汽包压力", value: String(c.drumPressure ?? "—"), unit: "MPa", alarm: c.status === "报警" },
    { label: "汽包液位", value: String(c.drumLevel ?? "—"), unit: "mm", alarm: !levelOk },
    { label: "除氧器压力", value: String(c.deaeratorPressure ?? "—"), unit: "MPa", alarm: !pressureOk },
    { label: "除氧器温度", value: String(c.deaeratorTemp ?? "—"), unit: "℃" },
  ];
});

async function loadCurrent() {
  try {
    current.value = await wasteHeatApi.current("SJ01-01");
    clock.value = current.value?.clock ?? "";
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

onMounted(() => {
  void loadCurrent();
  void listRef.value?.reload();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col" :class="tqDarkClass">
    <!-- 当前值条：深色、超限标红 -->
    <div class="shrink-0 border-b border-white/10 px-4 py-2">
      <div class="flex items-center gap-3">
        <span :class="tqHeaderTextClass">余热回收 · 当前</span>
        <span class="text-xs text-slate-500">1#烧结机 · {{ clock || "—" }}</span>
        <span class="ml-auto text-xs text-slate-500"> 除氧器压力的下限是正值（0.02 MPa）——两头都危险 </span>
      </div>
      <div class="mt-2 grid grid-cols-3 gap-2 lg:grid-cols-5">
        <div
          v-for="t in tiles"
          :key="t.label"
          class="rounded border px-3 py-2"
          :class="t.alarm ? 'border-red-500/55 bg-red-500/15' : 'border-emerald-500/35 bg-emerald-500/8'"
        >
          <div class="text-xs" :class="t.alarm ? 'text-red-400' : 'text-slate-500'">{{ t.label }}</div>
          <div class="text-base font-semibold tabular-nums" :class="t.alarm ? 'text-red-400' : 'text-emerald-400'">
            {{ t.value }}<span class="ml-1 text-xs font-normal opacity-70">{{ t.unit }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="min-h-0 flex-1" :class="tqPanelClass">
      <ListPage ref="listRef" :spec="spec" />
    </div>
  </div>
</template>
