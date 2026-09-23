<script setup lang="ts">
/** 对应 FrmHR4900（防瓢曲台账）：DDH.Winforms.SHR.Forms.FrmHR4900
 *  已接入：hR4900Api.get4900Dtos(TimeRange)
 *  偏差：无
 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR4900Api, type QueryHR4900Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

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
const rows = shallowRef<QueryHR4900Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) { api.value = e.api; }

const colDefs: ColDef[] = [
  /*  { colId: "cBatchNo", field: "cBatchNo", headerName: "组批号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "订单钢种", width: 112 },
  { colId: "cNoPD", field: "cNoPD", headerName: "不平度", width: 112 },
  { colId: "nDownTemp", field: "nDownTemp", headerName: "下线温度", width: 112 },
  { colId: "inFurnaceTime", field: "inFurnaceTime", headerName: "在炉内时间", width: 112 },
  { colId: "ht1AveTemp", field: "ht1AveTemp", headerName: "在加热段1时的平均温度", width: 112 },
  { colId: "ht1InFurPerd", field: "ht1InFurPerd", headerName: "加热段1在炉时段", width: 112 },
  { colId: "ht2AveTemp", field: "ht2AveTemp", headerName: "在加热段2时的平均温度", width: 112 },
  { colId: "ht2InFurPerd", field: "ht2InFurPerd", headerName: "加热段2在炉时段", width: 112 },
  { colId: "eqAveTemp", field: "eqAveTemp", headerName: "均热段时的平均温度", width: 112 },
  { colId: "eqInFurPerd", field: "eqInFurPerd", headerName: "均热段在炉时段", width: 112 },
  { colId: "nSlabThick", field: "nSlabThick", headerName: "中间坯厚度", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "rmEntTempAvg", field: "rmEntTempAvg", headerName: "粗轧开轧温度", width: 112 },
  { colId: "fmEntTempAvg", field: "fmEntTempAvg", headerName: "精轧开轧温度", width: 112 },
  { colId: "fmExitTempAvg", field: "fmExitTempAvg", headerName: "精轧终轧温度", width: 112 },
  { colId: "entryTemp", field: "entryTemp", headerName: "预矫钢板温度", width: 112 },
  { colId: "levelerSpeed", field: "levelerSpeed", headerName: "预矫速度", width: 112 },
  { colId: "bitSpeed", field: "bitSpeed", headerName: "预矫咬入速度", width: 112 },
  { colId: "entryGap", field: "entryGap", headerName: "预矫入口辊缝", width: 112 },
  { colId: "exitGap", field: "exitGap", headerName: "预矫出口辊缝", width: 112 },
  { colId: "l2Force", field: "l2Force", headerName: "预矫预矫力", width: 112 },
  { colId: "endTimeRj", field: "endTimeRj", headerName: "热矫结束时间", width: 112 },
  { colId: "entryTempRj", field: "entryTempRj", headerName: "热矫钢板温度", width: 112 },
  { colId: "levelerSpeedRj", field: "levelerSpeedRj", headerName: "热矫速度", width: 112 },
  { colId: "bitSpeedRj", field: "bitSpeedRj", headerName: "热矫咬入速度", width: 112 },
  { colId: "entryGapRj", field: "entryGapRj", headerName: "热矫入口辊缝", width: 112 },
  { colId: "exitGapRj", field: "exitGapRj", headerName: "热矫出口辊缝", width: 112 },
  { colId: "l2ForceRj", field: "l2ForceRj", headerName: "热矫矫直力", width: 112 },
  { colId: "nColdStopTime", field: "nColdStopTime", headerName: "冷床停留时间", width: 112 },
  { colId: "dHlIn", field: "dHlIn", headerName: "堆冷开始时间", width: 112 },
  { colId: "nHlHour", field: "nHlHour", headerName: "计划堆冷时间", width: 112 },
  { colId: "nHlHourSj", field: "nHlHourSj", headerName: "实际堆冷时间", width: 112 },
  { colId: "nHlHourSy", field: "nHlHourSy", headerName: "剩余堆冷时间", width: 112 },
  { colId: "dHlOut", field: "dHlOut", headerName: "堆冷结束时间", width: 112 },
  { colId: "isAutoUse", field: "isAutoUse", headerName: "是否投用自动", width: 112 },
  { colId: "entryAveTemp", field: "entryAveTemp", headerName: "开冷平均温度", width: 112 },
  { colId: "targetFinishTemp", field: "targetFinishTemp", headerName: "目标返红温度", width: 112 },
  { colId: "nTempXb", field: "nTempXb", headerName: "实测下表返红温度", width: 112 },
  { colId: "finishAveTemp", field: "finishAveTemp", headerName: "返红平均温度", width: 112 },
  { colId: "coolingRate", field: "coolingRate", headerName: "实际冷速", width: 112 },
  { colId: "actFluxB", field: "actFluxB", headerName: "B区实际流量", width: 112 },
  { colId: "actRatioB", field: "actRatioB", headerName: "B区实际水比", width: 112 },
  { colId: "actSpeed", field: "actSpeed", headerName: "实际辊速", width: 112 },
  { colId: "actAspd", field: "actAspd", headerName: "实际加速度", width: 112 },
  { colId: "num", field: "num", headerName: "开启集管组数", width: 112 },
  { colId: "hTSIS", field: "hTSIS", headerName: "头尾遮蔽投入信号", width: 112 },
  { colId: "headUpLength", field: "headUpLength", headerName: "头上长度", width: 112 },
  { colId: "headBotLength", field: "headBotLength", headerName: "头下长度", width: 112 },
  { colId: "headUpCoef", field: "headUpCoef", headerName: "头上系数", width: 112 },
  { colId: "headBotCoef", field: "headBotCoef", headerName: "头下系数", width: 112 },
  { colId: "tailUpLength", field: "tailUpLength", headerName: "尾上长度", width: 112 },
  { colId: "tailBotLength", field: "tailBotLength", headerName: "尾下长度", width: 112 },
  { colId: "tailUpCoef", field: "tailUpCoef", headerName: "尾上系数", width: 112 },
  { colId: "tailBotCoef", field: "tailBotCoef", headerName: "尾下系数", width: 112 },
  { colId: "tempWater", field: "tempWater", headerName: "水温", width: 112 },
  { colId: "pressWater", field: "pressWater", headerName: "水压", width: 112 },
  { colId: "total_flow", field: "total_flow", headerName: "总水量", width: 112 },
  { colId: "cNorderNo", field: "cNorderNo", headerName: "订单号", width: 112, hide: true },
  { colId: "dSlabFurTime", field: "dSlabFurTime", headerName: "板坯装炉时间", width: 112, hide: true },*/
];

async function query() {
  loading.value = true;
  try {
    rows.value = (await hR4900Api.get4900Dtos(toTimeRange(input.dates))) ?? [];
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
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
