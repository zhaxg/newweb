<script setup lang="ts">
/** 对应 FrmTqlCfCollectTs（铁水成分查询 / 菜单 QL1140）：DDH.Winforms.LIMS.Forms.FrmTqlCfCollectTs
 *  布局：查询区（熔炼号 HeatNo + 样号 CSampNo + 创建时间 TimeRange 默认近7天～当天末）
 *       + stackPanel1 h-9（查询）→ 单表格 TqlCfCollect 47 可见 + CRemark 隐藏
 *  已接入：tqlCFCollectApi.queryTqlCfCollectsTs（swagger 补）
 *  化学元素列头保持英文（原 [LDisplay]） */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import {
  tqlCFCollectApi,
  TqlCFCollectNstatus,
  type QueryTqlCFCollectDto,
  type TqlCfCollect,
  type TimeRange,
} from "@/api/mes4ddh/lims.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const statusFmt = (p: ValueFormatterParams) =>
  (({
    [TqlCFCollectNstatus.Failure]: "失败",
    [TqlCFCollectNstatus.Normal]: "正常",
    [TqlCFCollectNstatus.Abnormal]: "异常",
    [TqlCFCollectNstatus.UnHandle]: "未处理",
    [TqlCFCollectNstatus.NStatusAbnormal]: "状态异常",
  }) as Record<string, string>)[String(p.value)] ?? (p.value == null ? "" : String(p.value));

/** 原 Load：TimeRange = 当日-7 ～ 次日0点前一秒（AddDays(1).AddSeconds(-1)）；NStatus = null */
function defaultDates(): Date[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 7);
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}

const input = reactive({
  heatNo: "",
  cSampNo: "",
  dates: defaultDates() as Date[] | null,
});

function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates?.[0]) return undefined;
  return { min: isoLocal(dates[0]), max: dates[1] ? isoLocal(dates[1]) : undefined };
}
function buildQuery(): QueryTqlCFCollectDto {
  return {
    heatNo: input.heatNo?.trim() || undefined,
    cSampNo: input.cSampNo?.trim() || undefined,
    timeRange: toTimeRange(input.dates),
    nStatus: null,
  };
}

/* TqlCfCollect：47 可见 + CRemark 隐藏；元素列头英文 */
const colDefs = ref<ColDef[]>([
  { field: "selected", headerName: "选择", width: 56, minWidth: 56, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 140 },
  { field: "cSampNo", headerName: "样号", width: 110 },
  { field: "cMeltingNo", headerName: "熔炼号", width: 110 },
  { field: "cStove", headerName: "炉号", width: 90 },
  { field: "cSgCode", headerName: "钢种", width: 90 },
  { field: "cSgStd", headerName: "标准", width: 110 },
  { field: "cStaCode", headerName: "工位", width: 70 },
  { field: "cCheckTime", headerName: "检验时间", width: 140 },
  { field: "cShift", headerName: "班次", width: 70 },
  { field: "cGroup", headerName: "班组", width: 70 },
  { field: "nStatus", headerName: "状态", width: 90, valueFormatter: statusFmt },
  { field: "c", headerName: "C", width: 70 },
  { field: "si", headerName: "SI", width: 70 },
  { field: "mn", headerName: "MN", width: 70 },
  { field: "p", headerName: "P", width: 70 },
  { field: "s", headerName: "S", width: 70 },
  { field: "cr", headerName: "CR", width: 70 },
  { field: "ni", headerName: "NI", width: 70 },
  { field: "mo", headerName: "MO", width: 70 },
  { field: "cu", headerName: "CU", width: 70 },
  { field: "al", headerName: "AL", width: 70 },
  { field: "ti", headerName: "TI", width: 70 },
  { field: "nb", headerName: "NB", width: 70 },
  { field: "v", headerName: "V", width: 70 },
  { field: "als", headerName: "ALS", width: 70 },
  { field: "ca", headerName: "CA", width: 70 },
  { field: "ceq", headerName: "CEQ", width: 70 },
  { field: "b", headerName: "B", width: 70 },
  { field: "alins", headerName: "ALINS", width: 80 },
  { field: "w", headerName: "W", width: 70 },
  { field: "as", headerName: "AS", width: 70 },
  { field: "sn", headerName: "SN", width: 70 },
  { field: "co", headerName: "CO", width: 70 },
  { field: "pb", headerName: "PB", width: 70 },
  { field: "sb", headerName: "SB", width: 70 },
  { field: "ta", headerName: "TA", width: 70 },
  { field: "zr", headerName: "ZR", width: 70 },
  { field: "bi", headerName: "BI", width: 70 },
  { field: "se", headerName: "SE", width: 70 },
  { field: "te", headerName: "TE", width: 70 },
  { field: "ce", headerName: "CE", width: 70 },
  { field: "la", headerName: "LA", width: 70 },
  { field: "n", headerName: "N", width: 70 },
  { field: "lastModifier", headerName: "最后修改人", width: 100 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 140 },
  { field: "cRemark", headerName: "备注", hide: true },
  { field: "id", headerName: "主键", hide: true },
]);

const rows = shallowRef<TqlCfCollect[]>([]);
const gridApi = ref<GridApi | null>(null);
const querying = ref(false);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* 原 btnQuery_Click → QueryTqlCfCollectsTs */
async function onQuery() {
  querying.value = true;
  try {
    const list = ((await tqlCFCollectApi.queryTqlCfCollectsTs(buildQuery())) ?? []) as TqlCfCollect[];
    rows.value = list;
    gridApi.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
    if (!list.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（3 条件：熔炼号 + 样号 + 创建时间 col-span-2） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">熔炼号</label>
          <InputText v-model="input.heatNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">样号</label>
          <InputText v-model="input.cSampNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
        <div class="col-span-3 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
          <DatePicker v-model="input.dates" selectionMode="range" :manualInput="false" date-format="yy-mm-dd"
            show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- stackPanel1 h-9：查询 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :pagination="false" :animate-rows="false" :loading="querying"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
