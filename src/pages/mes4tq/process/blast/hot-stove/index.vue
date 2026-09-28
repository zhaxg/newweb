<script setup lang="ts">
/** 对应 TW0607 热风炉运行（高炉工序 · 附录 A3 版式 **L5 实时监控盘**）
 *
 *  接口：`hotStoveApi.current`（四座热风炉的当前状态）· `hotStoveApi.page`（换炉记录）
 *
 *  演示要点：**一座高炉配四座热风炉轮换送风**，同一时刻恰好两座送风、两座燃烧蓄热。
 *  所以当前条不是「四张一样的卡」，而是**按炉号分的四张、送风与燃烧两种色**——
 *  一屏读出「这会儿哪两座在送风」。mock 也刻意按 `(炉号序 + 时段序) % 4 < 2` 分配，
 *  **保证不会出现四座全送风或全燃烧**（那正是随手生成的破绽）。
 *
 *  送风炉给**送风温度**、燃烧炉给**拱顶温度**——两个温度各自的口径不同，
 *  同列显示会让人以为一座炉同时有两个温度。
 *
 *  待接入：换炉指令、煤气热值补偿（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../../ListPage.vue";
import { hotStoveApi } from "@/api/mes4tq";
import { codeFmt, dayFmt, numFmt, tagRenderer } from "../../../cells";
import { useNameMaps } from "../../../nameMaps";
import type { ListPageSpec } from "../../../listTypes";
import { tqDarkClass, tqHeaderTextClass, tqPanelClass } from "../../../tqTheme";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);

const current = ref<any[]>([]);
const clock = ref("");

const spec = computed<ListPageSpec>(() => ({
  code: "TW0607",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "机组 / 炉号" },
    {
      key: "unitId",
      label: "高炉",
      kind: "select",
      options: ["1#高炉", "2#高炉", "3#高炉"],
      valueMap: { "1#高炉": "GL01-01", "2#高炉": "GL01-02", "3#高炉": "GL01-03" },
      placeholder: "全部",
    },
    { key: "mode", label: "运行方式", kind: "select", options: ["送风", "燃烧", "换炉中"], placeholder: "全部" },
    { key: "stoveNo", label: "热风炉号", kind: "select", options: ["1#", "2#", "3#", "4#"], placeholder: "全部" },
    { key: "clock", label: "日期", kind: "range", as: "date", placeholder: "日期区间" },
  ],
  columns: [
    { field: "clock", headerName: "采样时刻", width: 150, pinned: "left", valueFormatter: dayFmt },
    { field: "unitId", headerName: "高炉", width: 116, valueFormatter: codeFmt(unitMap.value) },
    { field: "stoveNo", headerName: "热风炉号", width: 104 },
    { field: "mode", headerName: "运行方式", width: 104, cellRenderer: tagRenderer() },
    { field: "gasFlow", headerName: "煤气流量 m³/h", width: 146, type: "numericColumn", valueFormatter: numFmt(0) },
    /* 送风/拱顶两列分开——两者口径不同（见文件头），同列显示会误读 */
    { field: "blastTemp", headerName: "送风温度 ℃", width: 132, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "domeTemp", headerName: "拱顶温度 ℃", width: 132, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "switchTime", headerName: "上次换炉", width: 150, valueFormatter: dayFmt },
    { field: "remark", headerName: "备注", minWidth: 180, flex: 1 },
  ],
  actions: [{ label: "详情", kind: "detail" }],
  toolbar: { extraButtons: ["▶ 模拟换炉"] },
  fetch: (q) => hotStoveApi.page(q),
  summary: ({ total, rows }) => {
    const blowing = rows.filter((r: any) => r.mode === "送风").length;
    return `本页 ${total} 条 · 送风 ${blowing} 座`;
  },
}));

/** 四座热风炉的当前状态：按炉号排，送风绿 / 燃烧琥珀 / 换炉灰 */
const tiles = computed(() =>
  (current.value ?? [])
    .toSorted((a, b) => String(a.stoveNo).localeCompare(String(b.stoveNo)))
    .map((h: any) => ({
      label: `${h.stoveNo} 热风炉`,
      mode: String(h.mode ?? ""),
      /* 送风看送风温度、燃烧看拱顶温度——两个口径不同，所以只显示一个 */
      main: h.mode === "送风" ? `${h.blastTemp ?? "—"}` : `${h.domeTemp ?? "—"}`,
      mainLabel: h.mode === "送风" ? "送风温度 ℃" : "拱顶温度 ℃",
      sub: `煤气 ${h.gasFlow ?? "—"} m³/h`,
      alarm: h.mode !== "送风" && h.mode !== "燃烧",
    })),
);

async function loadCurrent() {
  try {
    current.value = await hotStoveApi.current("GL01-03");
    clock.value = current.value?.[0]?.clock ?? "";
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
    <!-- 四座热风炉的当前状态：两送两燃，一屏读完 -->
    <div class="shrink-0 border-b border-white/10 px-4 py-2">
      <div class="flex items-center gap-3">
        <span :class="tqHeaderTextClass">热风炉 · 当前（3#高炉）</span>
        <span class="text-xs text-slate-500">{{ clock || "—" }}</span>
        <span class="ml-auto text-xs text-slate-500">
          四座轮换送风：同一时刻两座送风、两座燃烧蓄热，不会出现四座全同色
        </span>
      </div>
      <div class="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div
          v-for="t in tiles"
          :key="t.label"
          class="rounded border px-3 py-2"
          :class="
            t.alarm
              ? 'border-red-500/55 bg-red-500/15'
              : t.mode === '送风'
                ? 'border-emerald-500/35 bg-emerald-500/8'
                : 'border-amber-500/40 bg-amber-500/10'
          "
        >
          <div class="flex items-baseline gap-2">
            <span class="text-xs text-slate-300">{{ t.label }}</span>
            <span class="ml-auto text-xs" :class="t.mode === '送风' ? 'text-emerald-400' : 'text-amber-400'">
              {{ t.mode }}
            </span>
          </div>
          <div
            class="text-base font-semibold tabular-nums"
            :class="t.mode === '送风' ? 'text-emerald-400' : 'text-amber-400'"
          >
            {{ t.main }}
            <span class="ml-1 text-xs font-normal opacity-70">{{ t.mainLabel }}</span>
          </div>
          <div class="text-xs text-slate-500">{{ t.sub }}</div>
        </div>
      </div>
    </div>

    <!-- 换炉记录 -->
    <div class="min-h-0 flex-1" :class="tqPanelClass">
      <ListPage ref="listRef" :spec="spec" />
    </div>
  </div>
</template>
