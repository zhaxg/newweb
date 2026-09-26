<script setup lang="ts">
/** 对应 FrmHR3620（堆冷作业汇总统计）：DDH.Winforms.SHR.Forms.FrmHR3620
 *  布局：stackPanel1（时间区间 ucTimeRange1 + 查询 btnQuery）→ 单表格 gridView1
 *  已接入：hR3600Api.queryDl（原 QueryDl(ucTimeRange1.Value)）/
 *         systemKeyValueApi.getSysKvListByGroup("A0000:GROUP")（原 colShiftGroup.SetCodeFormatterAsync<GROUP>()）
 *  待接入：无
 *  偏差：原 ShowFooter 各数值列 SUM 合计={0:0:###} 以 AG Grid 汇总行等价呈现 */

import { onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { systemKeyValueApi } from "@/api/admin/request";
import { hR3600Api, type DlGroupDto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

/* ---------- 时间区间（原 ucTimeRange1，默认 昨天0点 ~ 明天0点） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 1);
  const b = new Date();
  b.setHours(0, 0, 0, 0);
  b.setDate(b.getDate() + 1);
  return [a, b];
}
const dates = ref<Date[] | null>(defaultRange());
function toTimeRange(v: Date[] | null): TimeRange | undefined {
  if (!v || v.length < 2) return undefined;
  return { min: isoLocal(v[0]), max: isoLocal(v[v.length - 1]) };
}

/* ---------- 班组字典（原 GROUP CodeFormatter） ---------- */
const groupMap = ref<Record<string, string>>({});
const groupFmt = (p: ValueFormatterParams) => {
  const v = p.value == null ? "" : String(p.value);
  return groupMap.value[v] ?? v;
};

/* ---------- 汇总（原 SummaryItem SUM 合计={0:0.###}） ---------- */
function fmtNum(n: number): string {
  return String(Math.round(n * 1000) / 1000);
}
function sumAgg(p: { values: unknown[] }): string {
  const s = p.values.reduce<number>((a, v) => a + (typeof v === "number" ? v : Number(v) || 0), 0);
  return `合计=${fmtNum(s)}`;
}

/* ---------- 列集（原 gridView1 12 可见列，无隐藏列） ---------- */
const colDefs: ColDef[] = [
  { field: "date", headerName: "日期", width: 112 },
  { field: "shiftGroup", headerName: "班组", width: 112, valueFormatter: groupFmt },
  { field: "nQuaS", headerName: "开始堆冷数量", width: 112, aggFunc: sumAgg },
  { field: "nWgtS", headerName: "开始堆冷重量", width: 112, aggFunc: sumAgg },
  { field: "nQuaEnd", headerName: "结束堆冷数量", width: 112, aggFunc: sumAgg },
  { field: "nWgtEnd", headerName: "结束堆冷重量", width: 112, aggFunc: sumAgg },
  { field: "nQuaDd", headerName: "堆冷倒垛块数", width: 112, aggFunc: sumAgg },
  { field: "nWgtDd", headerName: "堆冷倒垛重量", width: 112, aggFunc: sumAgg },
  { field: "nQuaZy", headerName: "转运块数", width: 112, aggFunc: sumAgg },
  { field: "nWgtZy", headerName: "转运重量", width: 112, aggFunc: sumAgg },
  { field: "nQuaJs", headerName: "接收块数", width: 112, aggFunc: sumAgg },
  { field: "nWgtJs", headerName: "接收重量", width: 112, aggFunc: sumAgg },
];

/* ---------- 查询（原 btnQuery_Click：QueryDl(ucTimeRange1.Value)） ---------- */
const rows = ref<DlGroupDto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await hR3600Api.queryDl(toTimeRange(dates.value) ?? {})) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(async () => {
  try {
    const groups = await systemKeyValueApi.getSysKvListByGroup("A0000:GROUP");
    const map: Record<string, string> = {};
    for (const g of groups ?? []) {
      if (g.cCode) map[g.cCode] = g.cName ?? g.cCode;
    }
    groupMap.value = map;
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 单条件与按钮同行（原 stackPanel1：时间区间 + 查询） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">时间区间</label>
      <DatePicker
        v-model="dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        placeholder="开始 至 结束"
        class="w-72 shrink-0"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        grand-total-row="bottom"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
