<script setup lang="ts">
/** 对应 FrmSS8080（能耗产出）：DDH.Winforms.SHR.Forms.StripSteel.FrmSS8080
 *  已接入：e1000Api.queryTiE8080List
 *  待接入：无
 *  偏差：查询条件按 ui-rules §6 与按钮同行、以 placeholder 代替原 LabelControl；
 *        默认时间范围取原 uctimeRange1._Load 的「本月1日 ~ 次日」；原 Form.Text 为「称重实绩」（与钢卷称重实绩重名，疑为复制残留），以菜单名与列义为准 */

import { ref } from "vue";

import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { e1000Api, type TiE8080, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const rows = ref<TiE8080[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

const dates = ref<Date[] | null>(defaultRange());

/* 时间范围默认值（原 uctimeRange1._Load：本月1日 ~ 次日） */
function defaultRange(): Date[] {
  const now = new Date();
  return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)];
}
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

/* 时间列格式（原 colDHour DisplayFormat yyyy-MM-dd HH:mm） */
function dHourFmt(p: ValueFormatterParams): string {
  if (!p.value) return "";
  const d = new Date(String(p.value));
  if (Number.isNaN(d.getTime())) return String(p.value);
  const g = (n: number) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + g(d.getMonth() + 1) + "-" + g(d.getDate()) + " " + g(d.getHours()) + ":" + g(d.getMinutes());
}

const colDefs: ColDef[] = [
  { field: "dHour", headerName: "时间", width: 112, valueFormatter: dHourFmt },
  { field: "e35N102", headerName: "传动IN102", width: 112 },
  { field: "e35N202", headerName: "传动IIN202", width: 112 },
  { field: "e35N402", headerName: "动力IIN402", width: 112 },
  { field: "e35N302", headerName: "动力IN302", width: 112 },
  { field: "fceTotGas", headerName: "加热炉煤气", width: 125 },
  { field: "wpLfpsIfw", headerName: "水耗总管", width: 112 },
  { field: "wpTurbMak", headerName: "浊环中水", width: 112 },
  { field: "wpLfpsXgMak", headerName: "西皋水", width: 112 },
  { field: "wpLfpsLifeMak", headerName: "生活补水", width: 112 },
  { field: "wpLfpsMak", headerName: "层流中水", width: 112 },
  { field: "fceNitrogen", headerName: "加热炉氮气", width: 125 },
  { field: "fceCompAir", headerName: "加热炉压缩空气", width: 151 },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
  { field: "selected", headerName: "选择", width: 112, hide: true },
];

async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await e1000Api.queryTiE8080List({
        timeRange: toTimeRange(dates.value),
      })) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 stackPanel1：label + textEdit1 + uctimeRange1 + btnQuery）；ui-rules §6 条件与按钮同行、用 placeholder -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      
      <DatePicker v-model="dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd" show-time
        hour-format="24" show-icon placeholder="日期" class="w-80" />
      <Button variant="outlined" :loading="querying" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
