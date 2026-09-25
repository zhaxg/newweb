<script setup lang="ts">
/** 对应 FrmHR4610（热装率统计）：DDH.Winforms.SHR.Forms.FrmHR4610
 *  已接入：hR4600Api.queryRzl(TimeRange)
 *  偏差：班组列显示原值
 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR4600Api, type RzlDto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  begin.setDate(begin.getDate() + -1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  end.setDate(end.getDate() + 1);
  return [begin, end];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

const input = reactive({ dates: defaultRange() as Date[] | null });
const rows = shallowRef<RzlDto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  /*  { colId: "date", field: "date", headerName: "日期", width: 150 },
  { colId: "group", field: "group", headerName: "班组", width: 150 },
  { colId: "nQuaTotal", field: "nQuaTotal", headerName: "总块数", width: 150 },
  { colId: "nQua500", field: "nQua500", headerName: "500℃以下块数", width: 150 },
  { colId: "nRzl500", field: "nRzl500", headerName: "500℃以下比率", width: 150 },
  { colId: "nQua600", field: "nQua600", headerName: "500℃~600℃块数", width: 150 },
  { colId: "nRzl600", field: "nRzl600", headerName: "500℃~600", width: 150 },
  { colId: "nQua700", field: "nQua700", headerName: "600℃~700℃块数", width: 150 },
  { colId: "nRzl700", field: "nRzl700", headerName: "600℃~700℃比率", width: 150 },
  { colId: "nQua800", field: "nQua800", headerName: "700℃~800℃块数", width: 150 },
  { colId: "nRzl800", field: "nRzl800", headerName: "700℃~800℃比率", width: 150 },
  { colId: "nQua800Zs", field: "nQua800Zs", headerName: "800℃以上块数", width: 150 },
  { colId: "nRzl800Zs", field: "nRzl800Zs", headerName: "800℃以上比率", width: 150 },
  { colId: "nQua", field: "nQua", headerName: "温装块数", width: 150 },
  { colId: "nRzl", field: "nRzl", headerName: "温装率", width: 150 },*/
];

async function query() {
  loading.value = true;
  try {
    rows.value = (await hR4600Api.queryRzl(toTimeRange(input.dates))) ?? [];
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
        <DatePicker
          v-model="input.dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          placeholder="开始 至 结束"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-4 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
