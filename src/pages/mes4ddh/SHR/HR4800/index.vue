<script setup lang="ts">
/** 对应 FrmHR4800（理论成材率查询）：DDH.Winforms.SHR.Forms.FrmHR4800
 *  已接入：hR4800Api.queryLlCcl(TimeRange)
 *  偏差：原页脚 CustomSummary 4 组成材率以底部横条呈现（nRate0 原固定 99%）；班组列显示原值
 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR4800Api, type CclDto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

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
const rows = shallowRef<CclDto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  /*  { colId: "date", field: "date", headerName: "日期", width: 150 },
  { colId: "group", field: "group", headerName: "班组", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "板坯重量", width: 150 },
  { colId: "nWgtCp", field: "nWgtCp", headerName: "成品重量", width: 150 },
  { colId: "nRate", field: "nRate", headerName: "理论成材率", width: 150 },
  { colId: "nWgt4", field: "nWgt4", headerName: "板坯重量", width: 150 },
  { colId: "nWgtCp4", field: "nWgtCp4", headerName: "成品重量", width: 150 },
  { colId: "nRate4", field: "nRate4", headerName: "理论成材率", width: 150 },
  { colId: "nWgt2", field: "nWgt2", headerName: "板坯重量", width: 150 },
  { colId: "nWgtCp2", field: "nWgtCp2", headerName: "成品重量", width: 150 },
  { colId: "nRate2", field: "nRate2", headerName: "理论成材率", width: 150 },
  { colId: "nWgt0", field: "nWgt0", headerName: "板坯重量", width: 150 },
  { colId: "nWgtCp0", field: "nWgtCp0", headerName: "成品重量", width: 150 },
  { colId: "nRate0", field: "nRate0", headerName: "理论成材率", width: 150 },
  { colId: "nQua", field: "nQua", headerName: "板坯块数", width: 150 },
  { colId: "nQua0", field: "nQua0", headerName: "板坯块数", width: 150 },
  { colId: "nQua2", field: "nQua2", headerName: "板坯块数", width: 150 },
  { colId: "nQua4", field: "nQua4", headerName: "板坯块数", width: 150 },
  { colId: "nQuaCp", field: "nQuaCp", headerName: "成品块数", width: 150 },
  { colId: "nQuaCp0", field: "nQuaCp0", headerName: "成品块数", width: 150 },
  { colId: "nQuaCp2", field: "nQuaCp2", headerName: "成品块数", width: 150 },
  { colId: "nQuaCp4", field: "nQuaCp4", headerName: "成品块数", width: 150 },*/
];

/* 原 CustomSummary：4 组成材率 = Σ成品重/Σ理重×100%（nRate0 组原固定 99%） */
const rates = ref<Record<string, string>>({});
function calcRates() {
  const s = { r: [0, 0], r4: [0, 0], r2: [0, 0] } as Record<string, [number, number]>;
  for (const x of rows.value) {
    s.r[0] += x.nWgtCp ?? 0;
    s.r[1] += x.nWgt ?? 0;
    s.r4[0] += x.nWgtCp4 ?? 0;
    s.r4[1] += x.nWgt4 ?? 0;
    s.r2[0] += x.nWgtCp2 ?? 0;
    s.r2[1] += x.nWgt2 ?? 0;
  }
  const pct = (p: [number, number]) =>
    p[0] === 0 || p[1] === 0 ? "0" : (Math.round(((p[0] * 100) / p[1]) * 100) / 100).toFixed(2);
  rates.value = { rate: pct(s.r), rate4: pct(s.r4), rate2: pct(s.r2), rate0: "99" };
}

async function query() {
  loading.value = true;
  try {
    rows.value = (await hR4800Api.queryLlCcl(toTimeRange(input.dates))) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    calcRates();
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">出炉时间</label>
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

    <div class="flex h-7 shrink-0 items-center gap-4 border-t border-border/60 px-3">
      <span class="text-xs text-muted-foreground">成材率：{{ rates.rate }}%</span>
      <span class="text-xs text-muted-foreground">成材率4：{{ rates.rate4 }}%</span>
      <span class="text-xs text-muted-foreground">成材率2：{{ rates.rate2 }}%</span>
      <span class="text-xs text-muted-foreground">成材率0：{{ rates.rate0 }}%</span>
    </div>
  </div>
</template>
