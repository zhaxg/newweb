<script setup lang="ts">
/** 对应 FrmHR9400（中厚板轧制台账）：DDH.Winforms.SHR.Forms.FrmHR9400
 *  已接入：hR9400Api.getHR9400Dtos(DtoQueryHR9400)
 *  偏差：切边方式 KV 下拉迁为文本输入（显示原值）；原 ViewControl.Completed 清空切边方式 → 查询完成后清空 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import RangeInput from "@/components/common/RangeInput.vue";
import { hR9400Api, type DtoQueryHR9400, type HR9400Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

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
  begin.setDate(begin.getDate() - 7);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [begin, end];
}

const input = reactive({
  cBatchOrder: "",
  cSgCodeLg: "",
  cTrimFlag: null as string | null,
  cOrderNoTl: "",
  cOrderNo: "",
  cSlabNo: "",
  nBc: null as number | null,
  dates: defaultRange() as Date[] | null,
  thickMin: null as number | null,
  thickMax: null as number | null,
  widthMin: null as number | null,
  widthMax: null as number | null,
});

const rows = shallowRef<HR9400Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) { api.value = e.api; }

const colDefs: ColDef[] = [
  /*  { colId: "cPlanTime", field: "cPlanTime", headerName: "计划日期", width: 30 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 30 },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 30 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 30 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 30 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 30 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 30 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 30 },
  { colId: "dFurTime", field: "dFurTime", headerName: "入炉时间", width: 30 },
  { colId: "dRollTime", field: "dRollTime", headerName: "轧制时间", width: 30 },
  { colId: "cDelivyStatus", field: "cDelivyStatus", headerName: "交货状态", width: 30 },
  { colId: "cSgCodeOrder", field: "cSgCodeOrder", headerName: "订单钢种", width: 30 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "组批号", width: 30 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 112 },
  { colId: "cStoveNo", field: "cStoveNo", headerName: "炉号", width: 30 },
  { colId: "cSgCodeLg", field: "cSgCodeLg", headerName: "炼钢钢种", width: 30 },
  { colId: "nSlabThick", field: "nSlabThick", headerName: "钢坯厚", width: 30 },
  { colId: "nSlabWidth", field: "nSlabWidth", headerName: "钢坯宽", width: 30 },
  { colId: "nSlabLen", field: "nSlabLen", headerName: "钢坯长", width: 30 },
  { colId: "nSlabWgtCal", field: "nSlabWgtCal", headerName: "钢坯重量", width: 30 },
  { colId: "nSlabWgtSj", field: "nSlabWgtSj", headerName: "钢坯实重", width: 30 },
  { colId: "dRollQua", field: "dRollQua", headerName: "轧制块数", width: 112 },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 30 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 30 },
  { colId: "nWidth1", field: "nWidth1", headerName: "宽度1", width: 30 },
  { colId: "nWidth2", field: "nWidth2", headerName: "宽度2", width: 30 },
  { colId: "nLen1", field: "nLen1", headerName: "长度1", width: 30 },
  { colId: "nLen2", field: "nLen2", headerName: "长度2", width: 30 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 30 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 30 },
  { colId: "cRollSpec", field: "cRollSpec", headerName: "轧制规格", width: 112 },
  { colId: "nThickRoll", field: "nThickRoll", headerName: "轧制厚", width: 30 },
  { colId: "nWidthRoll", field: "nWidthRoll", headerName: "轧制宽", width: 30 },
  { colId: "nLenRoll", field: "nLenRoll", headerName: "轧制长", width: 30 },
  { colId: "totalRollingTime", field: "totalRollingTime", headerName: "总轧制时间s", width: 112 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 30 },
  { colId: "cDelivyQtyFlag", field: "cDelivyQtyFlag", headerName: "计重方式", width: 30 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 30 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同要求", width: 30 },
  { colId: "cFaceKeyPoint", field: "cFaceKeyPoint", headerName: "表面重点", width: 30 },
  { colId: "cFaceClass", field: "cFaceClass", headerName: "表面类别", width: 30 },
  { colId: "nLenLlB", field: "nLenLlB", headerName: "理论板边", width: 30 },
  { colId: "nLenLlT", field: "nLenLlT", headerName: "理论板头", width: 30 },
  { colId: "nLlSc", field: "nLlSc", headerName: "理论烧损", width: 30 },
  { colId: "nLenLlMc", field: "nLenLlMc", headerName: "理论毛长", width: 30 },
  { colId: "nLenMbJc", field: "nLenMbJc", headerName: "母板净长", width: 30 },
  { colId: "nCclTL", field: "nCclTL", headerName: "提料成材率", width: 30 },
  { colId: "nCclSj", field: "nCclSj", headerName: "实际成材率", width: 30 },
  { colId: "nRateCz", field: "nRateCz", headerName: "成材率差值", width: 30 },
  { colId: "cIsNotDl", field: "cIsNotDl", headerName: "是否堆冷", width: 30 },
  { colId: "cIsQY", field: "cIsQY", headerName: "是否取样", width: 30 },
  { colId: "nCalWgt1", field: "nCalWgt1", headerName: "钢板理重1", width: 30 },
  { colId: "cIsNotTq", field: "cIsNotTq", headerName: "是否套切", width: 30 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "长度套切1", width: 30 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "长度套切2", width: 30 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "长度套切3", width: 30 },
  { colId: "cIsNotWidthTq", field: "cIsNotWidthTq", headerName: "是否宽套切", width: 30 },
  { colId: "nWidthTq1", field: "nWidthTq1", headerName: "宽度套切1", width: 30 },
  { colId: "nWidthTq2", field: "nWidthTq2", headerName: "宽度套切2", width: 30 },
  { colId: "nWidthTq3", field: "nWidthTq3", headerName: "宽度套切3", width: 38 },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 30 },
  { colId: "nCalWgt2", field: "nCalWgt2", headerName: "钢板理重2", width: 30 },
  { colId: "nCalWgt3", field: "nCalWgt3", headerName: "钢板理重3", width: 30 },
  { colId: "nCalWgt4", field: "nCalWgt4", headerName: "钢板理重4", width: 30 },
  { colId: "nCalWgtSum", field: "nCalWgtSum", headerName: "钢板合计重量", width: 30 },
  { colId: "cFlawStand", field: "cFlawStand", headerName: "探伤要求", width: 30 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 30 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "性能要求", width: 30 },
  { colId: "c", field: "c", headerName: "C", width: 30 },
  { colId: "si", field: "si", headerName: "Si", width: 30 },
  { colId: "mn", field: "mn", headerName: "Mn", width: 30 },
  { colId: "p", field: "p", headerName: "P", width: 30 },
  { colId: "s", field: "s", headerName: "S", width: 30 },
  { colId: "cr", field: "cr", headerName: "Cr", width: 30 },
  { colId: "ni", field: "ni", headerName: "Ni", width: 30 },
  { colId: "mo", field: "mo", headerName: "Mo", width: 30 },
  { colId: "cu", field: "cu", headerName: "Cu", width: 30 },
  { colId: "al", field: "al", headerName: "Al", width: 30 },
  { colId: "ti", field: "ti", headerName: "Ti", width: 30 },
  { colId: "nb", field: "nb", headerName: "Nb", width: 30 },
  { colId: "v", field: "v", headerName: "V", width: 30 },
  { colId: "als", field: "als", headerName: "Als", width: 30 },
  { colId: "ca", field: "ca", headerName: "Ca", width: 30 },
  { colId: "ceq", field: "ceq", headerName: "Ceq", width: 30 },
  { colId: "b", field: "b", headerName: "B", width: 30 },
  { colId: "alins", field: "alins", headerName: "Alins", width: 30 },
  { colId: "w", field: "w", headerName: "W", width: 30 },
  { colId: "as", field: "as", headerName: "As", width: 30 },
  { colId: "sn", field: "sn", headerName: "Sn", width: 30 },
  { colId: "co", field: "co", headerName: "Co", width: 30 },
  { colId: "pb", field: "pb", headerName: "Pb", width: 30 },
  { colId: "sb", field: "sb", headerName: "Sb", width: 30 },
  { colId: "ta", field: "ta", headerName: "Ta", width: 30 },
  { colId: "zr", field: "zr", headerName: "Zr", width: 30 },
  { colId: "bi", field: "bi", headerName: "Bi", width: 30 },
  { colId: "se", field: "se", headerName: "Se", width: 30 },
  { colId: "te", field: "te", headerName: "Te", width: 30 },
  { colId: "ce", field: "ce", headerName: "Ce", width: 30 },
  { colId: "la", field: "la", headerName: "La", width: 30 },
  { colId: "n", field: "n", headerName: "N", width: 30 },*/
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryHR9400 = {
      timeRange: toTimeRange(input.dates),
      cBatchOrder: input.cBatchOrder.trim() || null,
      cSgCodeLg: input.cSgCodeLg.trim() || null,
      cTrimFlag: input.cTrimFlag?.trim() || null,
      cOrderNoTl: input.cOrderNoTl.trim() || null,
      cOrderNo: input.cOrderNo.trim() || null,
      cSlabNo: input.cSlabNo.trim() || null,
      nBc: input.nBc,
      nThickRange: input.thickMin != null || input.thickMax != null
        ? { min: input.thickMin, max: input.thickMax } : undefined,
      nWidthRange: input.widthMin != null || input.widthMax != null
        ? { min: input.widthMin, max: input.widthMax } : undefined,
    };
    rows.value = (await hR9400Api.getHR9400Dtos(dto)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    // 原 ViewControl.Completed → 清空切边方式
    input.cTrimFlag = null;
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cBatchOrder" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">炼钢钢种</label>
        <InputText v-model="input.cSgCodeLg" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">切边方式</label>
        <InputText v-model="input.cTrimFlag" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">提料计划号</label>
        <InputText v-model="input.cOrderNoTl" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.cSlabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">倍尺</label>
        <InputNumber v-model="input.nBc" :min="0" :max="99999" :use-grouping="false" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
        <DatePicker v-model="input.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">厚度区间</label>
        <RangeInput v-model:min="input.thickMin" v-model:max="input.thickMax" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">宽度区间</label>
        <RangeInput v-model:min="input.widthMin" v-model:max="input.widthMax" class="min-w-0 flex-1" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1">
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
