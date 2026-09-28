<script setup lang="ts">
/** 对应 TW0605 喷煤制粉运行（高炉工序 · 附录 A3 版式 **L5 实时监控盘**）
 *
 *  接口：`pciApi.current`（当前值条）· `pciApi.page`（历史记录表）
 *
 *  演示要点：**喷煤量与焦比是一对**——喷煤替代焦炭，煤比上焦比就下，
 *  两个一起看才是「总燃料比」（B4 把煤比单列正是为了拆开这层）。
 *  所以当前值条把**喷煤量**与**煤粉仓料位**放在一起：
 *  料位见底时磨机来不及供煤、喷煤量就顶不上去，高炉要减风——这是现场的真实因果链。
 *
 *  `status=待机` 的行是磨机检���或煤粉仓满，1/17 的采样点会落在这档——
 *  24×7 全在运行不像生产现场。
 *
 *  待接入：磨机启停控制、制粉报表（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../../ListPage.vue";
import { pciApi } from "@/api/mes4tq";
import { codeFmt, dayFmt, levelBarRenderer, numFmt, tagRenderer } from "../../../cells";
import { useNameMaps } from "../../../nameMaps";
import type { ListPageSpec } from "../../../listTypes";
import { tqDarkClass, tqHeaderTextClass, tqPanelClass } from "../../../tqTheme";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

const current = ref<any>(null);
const clock = ref("");

const spec = computed<ListPageSpec>(() => ({
  code: "TW0605",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "机组 / 状态" },
    {
      key: "unitId",
      label: "高炉",
      kind: "select",
      options: ["1#高炉", "2#高炉", "3#高炉"],
      valueMap: { "1#高炉": "GL01-01", "2#高炉": "GL01-02", "3#高炉": "GL01-03" },
      placeholder: "全部",
    },
    { key: "status", label: "磨机状态", kind: "select", options: ["运行", "待机", "检修"], placeholder: "全部" },
    { key: "clock", label: "日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "clock", headerName: "采样时刻", width: 150, pinned: "left", valueFormatter: dayFmt },
    { field: "unitId", headerName: "高炉", width: 116, valueFormatter: codeFmt(unitMap.value) },
    { field: "millOutput", headerName: "磨机产量 t/h", width: 132, type: "numericColumn", valueFormatter: numFmt(1) },
    { field: "coalInjection", headerName: "喷煤量 t/h", width: 120, type: "numericColumn", valueFormatter: numFmt(1) },
    /* 料位列走进度条：「快没煤了」要一眼看出，而不是逐行读数字 */
    { field: "bunkerLevel", headerName: "煤粉仓料位", minWidth: 150, cellRenderer: levelBarRenderer() },
    {
      field: "bfgConsumption",
      headerName: "高炉煤气耗量",
      width: 150,
      type: "numericColumn",
      valueFormatter: numFmt(0),
    },
    { field: "status", headerName: "状态", width: 96, cellRenderer: tagRenderer() },
    { field: "remark", headerName: "备注", minWidth: 200, flex: 1 },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: { extraButtons: ["▶ 模拟喷煤波动"] },
  fetch: (q) => pciApi.page(q),
  summary: ({ total, rows }) => {
    const wait = rows.filter((r: any) => r.status !== "运行").length;
    return wait ? `本页 ${total} 条 · 非运行 ${wait} 条` : `共 ${total} 条`;
  },
}));

const tiles = computed<Array<{ label: string; value: string; unit?: string; alarm?: boolean }>>(() => {
  const c = current.value;
  if (!c) return [];
  /* 煤粉仓低于 40% 就是「磨机来得及补、但值得盯」；低于 20% 才是真报警 */
  const low = Number(c.bunkerLevel ?? 100) < 20;
  return [
    { label: "磨机产量", value: String(c.millOutput ?? "—"), unit: "t/h", alarm: c.status !== "运行" },
    { label: "喷煤量", value: String(c.coalInjection ?? "—"), unit: "t/h" },
    { label: "煤粉仓料位", value: String(c.bunkerLevel ?? "—"), unit: "%", alarm: low },
    { label: "高炉煤气耗量", value: String(c.bfgConsumption ?? "—"), unit: "m³/h" },
    { label: "磨机状态", value: String(c.status ?? "—"), alarm: c.status !== "运行" },
  ];
});

async function loadCurrent() {
  try {
    current.value = await pciApi.current("GL01-03");
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
    <!-- 当前值条 -->
    <div class="shrink-0 border-b border-white/10 px-4 py-2">
      <div class="flex items-center gap-3">
        <span :class="tqHeaderTextClass">喷煤制粉 · 当前（3#高炉）</span>
        <span class="text-xs text-slate-500">{{ clock || "—" }}</span>
        <span class="ml-auto text-xs text-slate-500">
          喷煤量与焦比成反比——这页与 <span class="text-sky-400">TW0604 高炉运行参数</span> 要对着看
        </span>
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
