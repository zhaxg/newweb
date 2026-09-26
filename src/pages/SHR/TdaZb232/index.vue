<script setup lang="ts">
/** 对应 FrmTdaZb232（35KWh电力）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTdaZb232
 *  已接入：tdaZb232Api.getTdaZb232s
 *  待接入：无
 *  偏差：默认时间范围照原 Load 为 [今天-7天, 今天+1天]；原窗体班次/班组条件在 C# 里已注释停用，未迁；
 *        原 gridView1.ShowFooter + NCount 页脚汇总「共计={0:0.##}」以底部横条呈现；
 *        原查询仅带 TimeRange（DtoTdaZb037Query 的 ShiftNum/TeamGroup 注释掉），此处同 */

import { computed, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { tdaZb232Api, type TimeRange } from "@/api/mes4ddh/shr.swagger";

/* 原 gridControl1 绑 tdaZb232DtoBindingSource（TdaZb232Dto：date/TimeRange/NShow/NPer/NCount），
   swagger 生成签名为 TdaZb232[]，按 C# 侧 Dto 声明行类型并断言 */
interface TdaZb232Dto {
  date?: string | null;
  timeRange?: string | null;
  nShow?: number | null;
  nPer?: number | null;
  nCount?: number | null;
}

const theme = makeHmxGridTheme();
const rows = ref<TdaZb232Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

/* ---------- 时间范围（原 ucTimeRange1_Load：[今天-7天, 今天+1天]） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}
const dates = ref<Date[] | null>(defaultRange());
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

/* 原 colNShow DisplayFormat "N3" */
function n3(p: ValueFormatterParams): string {
  const v = p.value as number | null | undefined;
  if (v === null || v === undefined) return "";
  return v.toLocaleString("zh-CN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

/* 原页脚汇总：共计={0:0.##} */
const total = computed(() => {
  let s = 0;
  for (const r of rows.value) s += r.nCount ?? 0;
  return Math.round(s * 100) / 100;
});

/* ---------- 表格（原 gridView1 / TdaZb232Dto） ---------- */
const colDefs: ColDef[] = [
  { colId: "date", field: "date", headerName: "日期", minWidth: 100 },
  { colId: "timeRange", field: "timeRange", headerName: "时间段", minWidth: 100 },
  { colId: "nShow", field: "nShow", headerName: "表底字", minWidth: 80, type: "numericColumn", valueFormatter: n3 },
  { colId: "nPer", field: "nPer", headerName: "变比", minWidth: 60, type: "numericColumn" },
  { colId: "nCount", field: "nCount", headerName: "实际用电(度)", minWidth: 90, type: "numericColumn" },
];

async function query() {
  loading.value = true;
  try {
    const list = await tdaZb232Api.getTdaZb232s({ timeRange: toTimeRange(dates.value) });
    rows.value = (list ?? []) as unknown as TdaZb232Dto[];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 stackPanel1：label「发送时间」+ ucTimeRange + 查询）；单条件与按钮同行，ui-rules §6 以 placeholder 提示 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <DatePicker
        v-model="dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        placeholder="发送时间"
        class="w-80 shrink-0"
        @keydown.enter="query"
      />
      <Button variant="outlined" :loading="loading" class="shrink-0 whitespace-nowrap" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
    <div class="flex h-7 shrink-0 items-center gap-2 border-t border-border/60 px-3">
      <span class="text-xs text-muted-foreground">共计={{ total }}</span>
    </div>
  </div>
</template>
