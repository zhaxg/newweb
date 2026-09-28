<script setup lang="ts">
/** 对应 TM0002 铁水罐管理（铁水调度 · 附录 A3 版式 **L1 列表页 + 罐位分布卡**）
 *
 *  接口：`ladleApi.page`（POST /tqmes/ladle/listPage）· `ladleApi.byLocation`（罐位分布）
 *
 *  演示要点：**罐龄条是这一页的核心**——`lifeRatio`（已用次数 / 寿命上限）走
 *  `ratioBarRenderer`：≥90% 标红、≥85% 标黄。**mock 里第 7 号罐寿命在 95% 以上**，
 *  那是刻意留的危险样本（见 `data/iron.ts` 的说明）：一个罐用到 95% 还在装铁水，
 *  是现场真实的安全问题，客户（尤其设备口）一定会问「超龄的罐你们怎么看出来」。
 *
 *  **状态与位置必须自洽**：`检修` 的罐一定在检修区、`烘烤` 的一定在烘烤区——
 *  状态写「检修」却显示「运输中」是自相矛盾的，一眼就看穿是编的
 *  （数据层已按状态推位置，见 `data/iron.ts`）。
 *
 *  S4 状态机：空 ←→ 重（装铁/出铁切换）、烘烤 → 空、检修 → 空。
 *  **「重」不是坏、是满罐在途**——所以它给蓝色（在途）而不是红色。
 *
 *  待接入：罐调拨、罐验收（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import ListPage from "../../ListPage.vue";
import { ladleApi } from "@/api/mes4tq";
import { codeFmt, numFmt, ratioBarRenderer, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, unitMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

/** 罐位分布（统计卡下的一排色块）：位置 → 罐号列表 */
const byLocation = ref<Record<string, any[]>>({});

const spec = computed<ListPageSpec>(() => ({
  code: "TM0002",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "罐号 / 位置 / 高炉" },
    { key: "status", label: "罐状态", kind: "select", options: ["空", "重", "检修", "烘烤"], placeholder: "全部" },
    {
      key: "location",
      label: "位置",
      kind: "select",
      options: ["高炉", "运输中", "炼钢", "烘烤区", "检修区", "空罐区"],
      placeholder: "全部",
    },
    { key: "minLife", label: "罐龄≥", kind: "input", placeholder: "0-1（如 0.9 = 90%）" },
  ],
  columns: [
    { field: "id", headerName: "罐号", width: 120, pinned: "left" },
    { field: "status", headerName: "状态", width: 96, cellRenderer: tagRenderer() },
    { field: "location", headerName: "位置", width: 116 },
    { field: "capacity", headerName: "容量 t", width: 106, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "furnaceId", headerName: "所属高炉", width: 120, valueFormatter: codeFmt(unitMap.value) },
    {
      field: "tapNo",
      headerName: "当前铁次",
      width: 106,
      valueFormatter: (p) => (p.value ? `第 ${p.value} 铁次` : "—"),
    },
    { field: "lastTappingTime", headerName: "上次出铁", width: 160 },
    { field: "lifetime", headerName: "已用次数", width: 110, type: "numericColumn", valueFormatter: numFmt(0) },
    { field: "maxLifetime", headerName: "寿命上限", width: 110, type: "numericColumn", valueFormatter: numFmt(0) },
    /* 罐龄条：≥90% 红、≥85% 黄（`ratioBarRenderer` 的分档），超龄要一眼看见 */
    { field: "lifeRatio", headerName: "罐龄", minWidth: 150, cellRenderer: ratioBarRenderer() },
    { field: "remark", headerName: "备注", minWidth: 220, flex: 1 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "出铁计划", kind: "link", to: "/tqmes/iron/plan" },
  ],
  toolbar: { extraButtons: ["▶ 模拟出铁", "▶ 模拟罐检修"] },
  fetch: (q) => ladleApi.page(q),
  summary: ({ total, rows }) => {
    const over = rows.filter((r: any) => Number(r.lifeRatio) >= 0.9).length;
    return over ? `本页 ${total} 个罐 · ${over} 个罐龄 ≥90%（该修了）` : `共 ${total} 个罐`;
  },
}));

async function loadAll() {
  try {
    const [all, loc] = await Promise.all([ladleApi.page({ pageSize: 500 }), ladleApi.byLocation()]);
    byLocation.value = loc;
    const rows = all.rows;
    cards.value = [
      {
        label: "罐总数",
        value: rows.length,
        sub: `${new Set(rows.map((r) => r.furnaceId).filter(Boolean)).size} 座高炉在用`,
      },
      { label: "重（在途）", value: rows.filter((r) => r.status === "重").length, sub: "S4：空 ←→ 重" },
      {
        label: "检修 / 烘烤",
        value: rows.filter((r) => r.status === "检修" || r.status === "烘烤").length,
        sub: "检修后寿命回 0",
      },
      { label: "罐龄 ≥90%", value: rows.filter((r) => Number(r.lifeRatio) >= 0.9).length, sub: "超龄罐必须先评估" },
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
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 罐位分布：按位置分组的一排，回答「罐都在哪」 -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="mb-1.5 flex items-center gap-3">
        <span class="text-xs font-medium">罐位分布</span>
        <span class="text-xs text-muted-foreground">与下方表格同源（`ladleApi.byLocation`），两处数字必然一致</span>
      </div>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="(list, loc) in byLocation"
          :key="loc"
          class="min-w-40 rounded border border-border/70 bg-card/60 px-2.5 py-1.5"
        >
          <div class="flex items-baseline gap-2">
            <span class="text-xs text-muted-foreground">{{ loc }}</span>
            <span class="ml-auto text-xs tabular-nums font-medium">{{ list.length }}</span>
          </div>
          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="l in list.slice(0, 8)"
              :key="l.id"
              class="rounded px-1 py-0.5 text-xs"
              :class="
                l.status === '重'
                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                  : l.status === '检修'
                    ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                    : 'bg-muted text-muted-foreground'
              "
            >
              {{ l.id.replace("LAD-", "") }}
            </span>
            <span v-if="list.length > 8" class="text-xs text-muted-foreground">+{{ list.length - 8 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 罐台账 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
    </div>
  </div>
</template>
