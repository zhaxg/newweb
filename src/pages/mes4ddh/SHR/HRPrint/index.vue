<script setup lang="ts">
/** 对应 FrmHRPrint（标签打印记录查看）：DDH.Winforms.SHR.Forms.FrmHRPrint
 *  已接入：btnQuery_Click → hRPrintApi.queryLog（QueryPrintDto：timeRange + cPieceNo；Load 默认时间区间为本月）
 *  待接入：无
 *  偏差：创建人/产线代码/切边方式/手动打印 原为 CodeFormatter（UserFormatter / LineFormatter /
 *  KeyValueFormatters.CUTFLAG / EnumCodeConverter<YNEnum>）换算显示，web 侧显示原值；
 *  原 gridView1.BestFitColumns() 以 autoSizeAllColumns 等效 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hRPrintApi, type ThrPrint, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

/* ---------- 时间（原 ucTimeRange1.Value，FrmHRPrint_Load 默认本月） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

const input = reactive({
  cPieceNo: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 表格（gridView1 / ThrPrint） ---------- */
const rows = shallowRef<ThrPrint[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  { colId: "creator", field: "creator", headerName: "创建人", width: 150 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 150 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 150 },
  { colId: "cType", field: "cType", headerName: "手动打印", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },
];

/* ---------- btnQuery_Click ---------- */
async function query() {
  loading.value = true;
  try {
    rows.value =
      (await hRPrintApi.queryLog({ cPieceNo: input.cPieceNo.trim() || null, timeRange: toTimeRange(input.dates) })) ??
      [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* 原 FrmHRPrint_Load：仅设置默认时间区间（本文件 input.dates 初值）与四列 CodeFormatter，不自动查询 */
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <DatePicker
        v-model="input.dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        placeholder="时间区间"
        class="w-80 shrink-0"
      />
      <InputText v-model="input.cPieceNo" placeholder="件次号" class="w-44 shrink-0" @keydown.enter="query" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
