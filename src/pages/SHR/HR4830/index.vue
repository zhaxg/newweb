<script setup lang="ts">
/** 对应 FrmHR4830（生产计划成材率统计汇总）：DDH.Winforms.SHR.Forms.FrmHR4830
 *  已接入：hR4830Api.queryHR4830Dtos(TimeRange)
 *  偏差：原 CellMerge 单元格合并规则未迁（AG Grid 无单元格合并）
 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR4830Api, type QueryHR4830Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  begin.setDate(begin.getDate() + (-7));
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + (1));
  return [begin, end];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

const input = reactive({ dates: defaultRange() as Date[] | null });
const rows = shallowRef<QueryHR4830Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) { api.value = e.api; }

const colDefs: ColDef[] = [
  /*  { colId: "cDateTime", field: "cDateTime", headerName: "日期", width: 112 },
  { colId: "cJc", field: "cJc", headerName: "浇次", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "nbc", field: "nbc", headerName: "倍尺", width: 112 },
  { colId: "cTrimFlagBC", field: "cTrimFlagBC", headerName: "切割方式", width: 112 },
  { colId: "nBCTLRate", field: "nBCTLRate", headerName: "提料成材率", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "nQuaAll", field: "nQuaAll", headerName: "总块数", width: 112 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切割方式", width: 112 },
  { colId: "cQgJcRate", field: "cQgJcRate", headerName: "浇次比例", width: 112 },
  { colId: "nQgTLRate", field: "nQgTLRate", headerName: "提料成材率", width: 112 },
  { colId: "nRoll", field: "nRoll", headerName: "轧制规格", width: 112 },
  { colId: "cRollJcRate", field: "cRollJcRate", headerName: "浇次比例", width: 112 },
  { colId: "nRollTLRate", field: "nRollTLRate", headerName: "提料成材率", width: 112 },*/
];

async function query() {
  loading.value = true;
  try {
    rows.value = (await hR4830Api.queryHR4830Dtos(toTimeRange(input.dates))) ?? [];
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
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">日期</label>
        <DatePicker v-model="input.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-4 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        :animate-rows="false" :loading="loading" @grid-ready="onReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>

  </div>
</template>
