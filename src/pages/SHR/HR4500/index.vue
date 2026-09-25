<script setup lang="ts">
/** 对应 FrmHR4500（日产量查询）：DDH.Winforms.SHR.Forms.FrmHR4500
 *  已接入：hR4500Api.queryDayCl + queryDayHz（查询一次取主表与汇总；原 CreateShiftGroup 调用已注释未接）
 *  偏差：原页脚 CustomSummary「非尺比例」以底部横条呈现；班组/班次 KV 列显示原值；列宽 +=50 的运行时微调由自适应列宽替代 */
import { computed, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR4500Api, type ClHzDto, type Hr4500HzDto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
function defaultRange(): Date[] {
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [begin, end];
}

const input = reactive({ dates: defaultRange() as Date[] | null });
const rows = shallowRef<ClHzDto[]>([]);
const hzRows = shallowRef<Hr4500HzDto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
const hzApi = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onHzReady(e: GridReadyEvent) {
  hzApi.value = e.api;
}

const colDefs: ColDef[] = [
  /*  { colId: "date", field: "date", headerName: "日期", width: 150 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 150 },
  { colId: "nQuaCl", field: "nQuaCl", headerName: "出炉支数", width: 150 },
  { colId: "nWgtCl", field: "nWgtCl", headerName: "出炉重量", width: 150 },
  { colId: "nQuaRoll", field: "nQuaRoll", headerName: "轧制支数", width: 150 },
  { colId: "nWgtRoll", field: "nWgtRoll", headerName: "轧制重量", width: 150 },
  { colId: "nQuaJq", field: "nQuaJq", headerName: "剪切支数", width: 150 },
  { colId: "nWgtJq", field: "nWgtJq", headerName: "剪切重量", width: 150 },
  { colId: "nQuaHq", field: "nQuaHq", headerName: "火切支数", width: 150 },
  { colId: "nWgtHq", field: "nWgtHq", headerName: "火切重量", width: 150 },
  { colId: "nQuaCp", field: "nQuaCp", headerName: "成品支数", width: 150 },
  { colId: "nQuaRk", field: "nQuaRk", headerName: "入库支数", width: 150 },
  { colId: "nQuaWRk", field: "nQuaWRk", headerName: "未入库支数", width: 150 },
  { colId: "nQuaFc", field: "nQuaFc", headerName: "非尺支数", width: 150 },
  { colId: "nPerFc", field: "nPerFc", headerName: "非尺比例", width: 150 },*/
];
const hzColDefs: ColDef[] = [
  /*  { colId: "date", field: "date", headerName: "日期", width: 112 },
  { colId: "nAllDlQua", field: "nAllDlQua", headerName: "总数量", width: 112 },
  { colId: "nAllDlWgt", field: "nAllDlWgt", headerName: "总重量", width: 112 },
  { colId: "nDlFinishQua", field: "nDlFinishQua", headerName: "到期数量", width: 112 },
  { colId: "nDlFinishWgt", field: "nDlFinishWgt", headerName: "到期重量", width: 112 },
  { colId: "nDlNotQua", field: "nDlNotQua", headerName: "未到期数量", width: 112 },
  { colId: "nDlNotWgt", field: "nDlNotWgt", headerName: "未到期重量", width: 112 },
  { colId: "nQuaHq", field: "nQuaHq", headerName: "火切支数", width: 112 },
  { colId: "nWgtHq", field: "nWgtHq", headerName: "火切重量", width: 112 },
  { colId: "nQuaDrk", field: "nQuaDrk", headerName: "待入库支数", width: 112 },
  { colId: "nWgtDrk", field: "nWgtDrk", headerName: "待入库重量", width: 112 },*/
];

/* 原 CustomSummary：非尺比例 = Σ非尺支数/Σ成品支数×100% */
const nonStdRate = computed(() => {
  let cp = 0;
  let fc = 0;
  for (const r of rows.value) {
    cp += r.nQuaCp ?? 0;
    fc += r.nQuaFc ?? 0;
  }
  return cp === 0 || fc === 0 ? "0" : (Math.round(((fc * 100) / cp) * 100) / 100).toFixed(2);
});

async function query() {
  loading.value = true;
  try {
    const range = toTimeRange(input.dates);
    const [cl, hz] = await Promise.all([hR4500Api.queryDayCl(range), hR4500Api.queryDayHz(range)]);
    rows.value = cl ?? [];
    hzRows.value = hz ?? [];
    requestAnimationFrame(() => {
      api.value?.autoSizeAllColumns();
      hzApi.value?.autoSizeAllColumns();
    });
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">日期范围</label>
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
    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs font-medium text-muted-foreground">日产量信息</span>
      </div>
      <div class="min-h-0 flex-[5] overflow-hidden">
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
      <div class="flex h-7 shrink-0 items-center gap-2 border-t border-border/60 px-3">
        <span class="text-xs text-muted-foreground">非尺比例：{{ nonStdRate }}%</span>
      </div>
      <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs font-medium text-muted-foreground">日汇总信息</span>
      </div>
      <div class="min-h-0 flex-[4] overflow-hidden">
        <AgGridVue
          class="hmx-ag-grid h-full w-full"
          :theme="theme"
          :locale-text="AG_GRID_LOCALE_CN"
          :default-col-def="hmxDefaultColDef"
          :column-defs="hzColDefs"
          :row-data="hzRows"
          :pagination="false"
          :animate-rows="false"
          :loading="loading"
          @grid-ready="onHzReady"
          @first-data-rendered="autoSizeOnFirstData"
        />
      </div>
    </div>
  </div>
</template>
