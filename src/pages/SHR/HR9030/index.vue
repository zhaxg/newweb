<script setup lang="ts">
/** 对应 FrmHR9030（加热实绩）：DDH.Winforms.SHR.Forms.FrmHR9030
 *  已接入：hR9000Api.queryTiL2me11s
 *  偏差：furanType/装炉方式等枚举列显示原值；时间默认 [-1天,+7天]（同原窗体） */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR9000Api, type DtoQueryL2, type TiL2me11Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

/* ---------- 时间（原 ucTimeRange，默认昨天至7天后） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（DtoQueryL2） ---------- */
const input = reactive({
  planNo: "",
  slabNo: "",
  cBatchOrder: "",
  cBc: false,
  dates: null as Date[] | null,
});
// 原 Load：DRange = [今天-1天 0点, 今天+7天 当前时刻]
{
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  begin.setDate(begin.getDate() - 1);
  const end = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  input.dates = [begin, end];
}

/* ---------- 表格（gridView1 / TiL2me11Dto） ---------- */
const rows = shallowRef<TiL2me11Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 150 },
  { colId: "matNo", field: "matNo", headerName: "材料号", width: 150 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 150 },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 150 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "坯重", width: 150 },
  { colId: "spare6", field: "spare6", headerName: "照核厚度", width: 150 },
  { colId: "spare5", field: "spare5", headerName: "照核宽度", width: 150 },
  { colId: "spare4", field: "spare4", headerName: "照核长度", width: 150 },
  { colId: "spare3", field: "spare3", headerName: "炉前称重", width: 150 },
  { colId: "nThickPlan", field: "nThickPlan", headerName: "轧制厚度", width: 150 },
  { colId: "nWidthPlan", field: "nWidthPlan", headerName: "轧制宽度", width: 150 },
  { colId: "nLenPlan", field: "nLenPlan", headerName: "轧制长度", width: 150 },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 150 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 150 },
  { colId: "cSgStdPlan", field: "cSgStdPlan", headerName: "订单标准", width: 150 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "订单钢种", width: 150 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },
  { colId: "slabFurTime", field: "slabFurTime", headerName: "板坯装炉时刻", width: 150 },
  { colId: "slabFurBefTemp", field: "slabFurBefTemp", headerName: "板坯装炉前温度", width: 150 },
  { colId: "furNo", field: "furNo", headerName: "加热炉号", width: 150 },
  { colId: "furType", field: "furType", headerName: "道次", width: 150 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 150 },
  { colId: "inFurnaceShiftNo", field: "inFurnaceShiftNo", headerName: "入炉班次", width: 150 },
  { colId: "inFurnaceShiftGroup", field: "inFurnaceShiftGroup", headerName: "入炉班组", width: 150 },
  { colId: "outFurnaceShiftNo", field: "outFurnaceShiftNo", headerName: "出炉班次", width: 150 },
  { colId: "outFurnaceShiftGroup", field: "outFurnaceShiftGroup", headerName: "出炉班组", width: 150 },
  { colId: "tapSlabTempAve", field: "tapSlabTempAve", headerName: "出钢时板坯平均温度", width: 150 },
  { colId: "tapSlabTempSrfc", field: "tapSlabTempSrfc", headerName: "出钢时板坯表面温度", width: 150 },
  { colId: "tapSlabTempCt", field: "tapSlabTempCt", headerName: "出钢时板坯中心温度", width: 150 },
  { colId: "outTime", field: "outTime", headerName: "抽出时刻", width: 150 },
  { colId: "outTempAvg", field: "outTempAvg", headerName: "抽出平均温度", width: 150 },
  { colId: "inFurnaceTime", field: "inFurnaceTime", headerName: "在炉内时间", width: 150 },
  { colId: "ht1SlabTempAve", field: "ht1SlabTempAve", headerName: "加热段1入口板坯平均温度", width: 150 },
  { colId: "ht1SlabHotAve", field: "ht1SlabHotAve", headerName: "加热段1入口板坯均热度", width: 150 },
  { colId: "ht1SlabTempSrfc", field: "ht1SlabTempSrfc", headerName: "加热段1入口板坯表面温度", width: 150 },
  { colId: "ht1SlabTempCt", field: "ht1SlabTempCt", headerName: "加热段1入口板坯中心温度", width: 150 },
  { colId: "ht1AveTemp", field: "ht1AveTemp", headerName: "在加热段1时的平均温度", width: 150 },
  { colId: "ht1InFurPerd", field: "ht1InFurPerd", headerName: "加热段1在炉时段", width: 150 },
  { colId: "ht2SlabTempAve", field: "ht2SlabTempAve", headerName: "加热段2入口板坯平均温度", width: 150 },
  { colId: "ht2SlabHotAve", field: "ht2SlabHotAve", headerName: "加热段2入口板坯均热度", width: 150 },
  { colId: "ht2SlabTempSrfc", field: "ht2SlabTempSrfc", headerName: "加热段2入口板坯表面温度", width: 150 },
  { colId: "ht2SlabTempCt", field: "ht2SlabTempCt", headerName: "加热段2入口板坯中心温度", width: 150 },
  { colId: "ht2AveTemp", field: "ht2AveTemp", headerName: "在加热段2时的平均温度", width: 150 },
  { colId: "ht2InFurPerd", field: "ht2InFurPerd", headerName: "加热段2在炉时段", width: 150 },
  { colId: "eqSlabTempAve", field: "eqSlabTempAve", headerName: "均热段入口板坯平均温度", width: 150 },
  { colId: "eqSlabHotAve", field: "eqSlabHotAve", headerName: "均热段入口板坯均热度", width: 150 },
  { colId: "eqSlabTempSrfc", field: "eqSlabTempSrfc", headerName: "均热段入口板坯表面温度", width: 150 },
  { colId: "eqSlabTempCt", field: "eqSlabTempCt", headerName: "均热段入口板坯中心温度", width: 150 },
  { colId: "eqAveTemp", field: "eqAveTemp", headerName: "均热段时的平均温度", width: 150 },
  { colId: "eqInFurPerd", field: "eqInFurPerd", headerName: "均热段在炉时段", width: 150 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 150 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 150 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 150 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 150 },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 150 },
  { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 150 },
  { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 150 },
  { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 150 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 150 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 150 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 150 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 150 },
  { colId: "preHtTempAve", field: "preHtTempAve", headerName: "预热段入口的平均板坯温度", width: 150, hide: true },
  { colId: "preHtHotAve", field: "preHtHotAve", headerName: "预热段入口的板坯均热温度", width: 150, hide: true },
  { colId: "preHtTempSrf", field: "preHtTempSrf", headerName: "预热段入口的板坯表面温度", width: 150, hide: true },
  { colId: "preHtTempCt", field: "preHtTempCt", headerName: "预热段入口的板坯中心温度", width: 150, hide: true },
  { colId: "preHtAveTemp", field: "preHtAveTemp", headerName: "在预热段时的平均温度", width: 150, hide: true },
  { colId: "preHtFurPerd", field: "preHtFurPerd", headerName: "预热段在炉时间", width: 150, hide: true },
  { colId: "cOrderNo5", field: "cOrderNo5", headerName: "订单号5", width: 150, hide: true },
  { colId: "cOrderNo6", field: "cOrderNo6", headerName: "订单号6", width: 150, hide: true },
  { colId: "cInboundNo5", field: "cInboundNo5", headerName: "入库标识5", width: 150, hide: true },
  { colId: "cInboundNo6", field: "cInboundNo6", headerName: "入库标识6", width: 150, hide: true },
  { colId: "nLenTq5", field: "nLenTq5", headerName: "套切5", width: 150, hide: true },
  { colId: "nLenTq6", field: "nLenTq6", headerName: "套切6", width: 150, hide: true },
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryL2 = {
      dRange: toTimeRange(input.dates),
      planNo: input.planNo.trim() || null,
      slabNo: input.slabNo.trim() || null,
      cBatchOrder: input.cBatchOrder.trim() || null,
      cBc: input.cBc,
    };
    rows.value = (await hR9000Api.queryTiL2me11s(dto)) ?? [];
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
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">计划号</label>
        <InputText v-model="input.planNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cBatchOrder" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <Checkbox v-model="input.cBc" binary inputId="cbBc" />
        <label for="cbBc" class="text-xs text-muted-foreground">是否补产</label>
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">作业时间</label>
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
      <div class="col-span-2 flex min-w-0 items-center gap-1">
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
