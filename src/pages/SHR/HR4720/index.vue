<script setup lang="ts">
/** 对应 FrmHR4720（宽不合台账）：DDH.Winforms.SHR.Forms.FrmHR4720
 *  已接入：hR4700Api.queryWidthHz(TimeRange)
 *  偏差：班组/班次/责任者 KV 列显示原值
 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR4700Api, type QueryWidthHzDto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  begin.setDate(begin.getDate() + (-1));
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + (1));
  return [begin, end];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

const input = reactive({ dates: defaultRange() as Date[] | null });
const rows = shallowRef<QueryWidthHzDto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) { api.value = e.api; }

const colDefs: ColDef[] = [
  /*  { colId: "cSlabNo", field: "cSlabNo", headerName: "板坯号", width: 150 },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "dRollingTimeEnd", field: "dRollingTimeEnd", headerName: "轧制完成时间", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "销售订单号", width: 150 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 150 },
  { colId: "nThickSlab", field: "nThickSlab", headerName: "坯厚", width: 150 },
  { colId: "nWidthSlab", field: "nWidthSlab", headerName: "坯宽", width: 150 },
  { colId: "nLenSlab", field: "nLenSlab", headerName: "坯长", width: 150 },
  { colId: "nWgtSlab", field: "nWgtSlab", headerName: "坯重", width: 150 },
  { colId: "nWgtZh", field: "nWgtZh", headerName: "称重重量", width: 150 },
  { colId: "nWgtBc", field: "nWgtBc", headerName: "磅差", width: 150 },
  { colId: "nThickOrder", field: "nThickOrder", headerName: "订单厚度", width: 150 },
  { colId: "nWidthOrder", field: "nWidthOrder", headerName: "订单宽度", width: 150 },
  { colId: "nThickZh", field: "nThickZh", headerName: "照核厚度", width: 150 },
  { colId: "nWidthZh", field: "nWidthZh", headerName: "照核宽度", width: 150 },
  { colId: "nLenZh", field: "nLenZh", headerName: "照核长度", width: 150 },
  { colId: "nWidthBefore", field: "nWidthBefore", headerName: "粗轧前测宽仪全长平均宽度[mm](冷态)", width: 150 },
  { colId: "nWidthAfter", field: "nWidthAfter", headerName: "粗轧后测宽仪全长平均宽度[mm](冷态)", width: 150 },
  { colId: "nWidthRoll", field: "nWidthRoll", headerName: "测宽仪宽度", width: 150 },
  { colId: "nWidthAvg", field: "nWidthAvg", headerName: "平直度仪平均宽度", width: 150 },
  { colId: "nWidthMax", field: "nWidthMax", headerName: "平直度仪最大宽度值（冷态）", width: 150 },
  { colId: "nWidthMin", field: "nWidthMin", headerName: "平直度仪最小宽度值（冷态）", width: 150 },
  { colId: "nWidthSbj", field: "nWidthSbj", headerName: "双边剪剪切宽度", width: 150 },
  { colId: "nWidthPy", field: "nWidthPy", headerName: "喷印宽度", width: 150 },*/
];

async function query() {
  loading.value = true;
  try {
    rows.value = (await hR4700Api.queryWidthHz(toTimeRange(input.dates))) ?? [];
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轧制完成时间</label>
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
