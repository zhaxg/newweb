<script setup lang="ts">
/** 对应 FrmHR9072（取样记录查询）：DDH.Winforms.SHR.Forms.FrmHR9072
 *  已接入：hR9000Api.query9072s(DtoQueryThr3000)，产线固定 ZG01，结果按批号升序
 *  偏差：班次/班组/装炉方式等 KV/枚举列显示原值 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR9000Api, type DtoQueryThr3000, type Thr3010Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

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

const input = reactive({
  cOrderNo: "",
  cBatchNo: "",
  cStove: "",
  cSgCode: "",
  cSgStd: "",
  slabNo: "",
  dates: defaultRange() as Date[] | null,
});

const rows = shallowRef<Thr3010Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) { api.value = e.api; }

const colDefs: ColDef[] = [
  /*  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 200 },
  { colId: "cIsQy", field: "cIsQy", headerName: "是否取样板", width: 150 },
  { colId: "sampleTime", field: "sampleTime", headerName: "取样时间", width: 150 },
  { colId: "sampleLth", field: "sampleLth", headerName: "取样长度", width: 150 },
  { colId: "samplePos", field: "samplePos", headerName: "取样位置", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 200 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 200 },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 200 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 200 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 200 },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 200 },
  { colId: "cSgCode", field: "cSgCode", headerName: "坯料钢种", width: 200 },
  { colId: "cSgStd", field: "cSgStd", headerName: "坯料标准", width: 200 },
  { colId: "cSpec", field: "cSpec", headerName: "坯料规格", width: 200 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 200 },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 200 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 200 },
  { colId: "nWgt", field: "nWgt", headerName: "坯重", width: 200 },
  { colId: "nWgtCz", field: "nWgtCz", headerName: "称重重量", width: 200 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "订单钢种", width: 200 },
  { colId: "cSgStdPlan", field: "cSgStdPlan", headerName: "订单标准", width: 200 },
  { colId: "cSpecPlan", field: "cSpecPlan", headerName: "轧制规格", width: 200 },
  { colId: "nThickPlan", field: "nThickPlan", headerName: "轧制厚度", width: 200 },
  { colId: "nWidthPlan", field: "nWidthPlan", headerName: "轧制宽度", width: 200 },
  { colId: "nLenPlan", field: "nLenPlan", headerName: "轧制长度", width: 200 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 100 },
  { colId: "cCustName", field: "cCustName", headerName: "客户名称", width: 200 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 150 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 200 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 200 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 200 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 200 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 200 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 200 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 200 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 200 },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 200 },
  { colId: "cInboundNo2", field: "cInboundNo2", headerName: "入库标识2", width: 200 },
  { colId: "cInboundNo3", field: "cInboundNo3", headerName: "入库标识3", width: 200 },
  { colId: "cInboundNo4", field: "cInboundNo4", headerName: "入库标识4", width: 200 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 200 },
  { colId: "nQuaPlan", field: "nQuaPlan", headerName: "计划支数", width: 200 },
  { colId: "nWgtPlan", field: "nWgtPlan", headerName: "计划重量", width: 200 },
  { colId: "nWgtOrder", field: "nWgtOrder", headerName: "订单重量", width: 200 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 200 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 200 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 200 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 200 },
  { colId: "selected", field: "selected", headerName: "选择", width: 200, hide: true },
  { colId: "id", field: "id", headerName: "主键", width: 200, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 200, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 200, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 200, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 200, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 200, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 200, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 200, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 200, hide: true },
  { colId: "nL2Status", field: "nL2Status", headerName: "L2计划状态", width: 200, hide: true },
  { colId: "cPos", field: "cPos", headerName: "当前位置", width: 200, hide: true },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 200, hide: true },*/
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryThr3000 = {
      cLineCode: "ZG01",
      dCreateTimeRange: toTimeRange(input.dates),
      cOrderNo: input.cOrderNo.trim() || null,
      cBatchNo: input.cBatchNo.trim() || null,
      cStove: input.cStove.trim() || null,
      cSgCode: input.cSgCode.trim() || null,
      cSgStd: input.cSgStd.trim() || null,
      slabNo: input.slabNo.trim() || null,
    };
    const list = (await hR9000Api.query9072s(dto)) ?? [];
    rows.value = [...list].sort((a, b) => String(a.cBatchNo ?? "").localeCompare(String(b.cBatchNo ?? "")));
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批时间</label>
        <DatePicker v-model="input.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-3 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        :animate-rows="false" :loading="loading" @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
