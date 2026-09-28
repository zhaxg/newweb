<script setup lang="ts">
/** 对应 FrmHR4600（炼钢热送统计）：DDH.Winforms.SHR.Forms.FrmHR4600
 *  已接入：hR4600Api.queryRsl（日统计明细）/ queryStoveRslDtos（炉次统计明细），页签切换即查询
 *  偏差：列宽 +=50 运行时微调由自适应列宽替代 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR4600Api, type RslDto, type StoveRslDto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

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
  begin.setDate(begin.getDate() - 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [begin, end];
}

const input = reactive({ dates: defaultRange() as Date[] | null });
const activeTab = ref(0);
const dayRows = shallowRef<RslDto[]>([]);
const stoveRows = shallowRef<StoveRslDto[]>([]);
const loading = ref(false);
const dayApi = ref<GridApi | null>(null);
const stoveApi = ref<GridApi | null>(null);
function onDayReady(e: GridReadyEvent) {
  dayApi.value = e.api;
}
function onStoveReady(e: GridReadyEvent) {
  stoveApi.value = e.api;
}

const dayColDefs: ColDef[] = [
  /*  { colId: "date", field: "date", headerName: "日期", width: 150 },
  { colId: "nQuaTotal", field: "nQuaTotal", headerName: "总块数", width: 150 },
  { colId: "nQua", field: "nQua", headerName: "热送块数", width: 150 },
  { colId: "nRsl", field: "nRsl", headerName: "热送率", width: 150 },*/
];
const stoveColDefs: ColDef[] = [
  /*  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "nHotQua", field: "nHotQua", headerName: "热送块数", width: 112 },
  { colId: "nHotWgt", field: "nHotWgt", headerName: "热送重量", width: 112 },
  { colId: "nRsl", field: "nRsl", headerName: "热送率", width: 112 },
  { colId: "nDownQua", field: "nDownQua", headerName: "下线块数", width: 112 },
  { colId: "nDownWgt", field: "nDownWgt", headerName: "下线重量", width: 112 },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 112 },*/
];

async function query() {
  loading.value = true;
  try {
    const range = toTimeRange(input.dates);
    if (activeTab.value === 0) {
      dayRows.value = (await hR4600Api.queryRsl(range)) ?? [];
      requestAnimationFrame(() => dayApi.value?.autoSizeAllColumns());
    } else {
      stoveRows.value = (await hR4600Api.queryStoveRslDtos(range)) ?? [];
      requestAnimationFrame(() => stoveApi.value?.autoSizeAllColumns());
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

function onTabChange(v: string | number) {
  activeTab.value = Number(v);
  void query();
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
    <Tabs :value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:value="onTabChange">
      <TabList>
        <Tab :value="0">日统计明细</Tab>
        <Tab :value="1">炉次统计明细</Tab>
      </TabList>
      <TabPanels class="min-h-0 flex-1">
        <TabPanel :value="0" class="h-full p-0">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="dayColDefs"
            :row-data="dayRows"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onDayReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </TabPanel>
        <TabPanel :value="1" class="h-full p-0">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="stoveColDefs"
            :row-data="stoveRows"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onStoveReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
