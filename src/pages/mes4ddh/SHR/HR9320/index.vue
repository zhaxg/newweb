<script setup lang="ts">
/** 对应 FrmHR9320（性能台账）：DDH.Winforms.SHR.Forms.FrmHR9320
 *  已接入：hR9320Api.get9320Dtos(FrmQL8100QueryInputDto)
 *  偏差：班次/班组枚举列显示原值；检验时间范围默认 [-7天,+1天]（同原窗体），原 CompleteTimeTextEdit 未绑定（时间走 ucTimeRange 意图） */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR9320Api, type FrmQL8100QueryInputDto, type QueryHR9320Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

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
  cTestNo: "",
  cStove: "",
  cBatch: "",
  cSgSign: "",
  cSgStd: "",
  testItemType: "",
  completeTime: defaultRange() as Date[] | null,
});

const rows = shallowRef<QueryHR9320Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  /*  { colId: "cTestNo", field: "cTestNo", headerName: "委托单号", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态代码", width: 112 },
  { colId: "cDeliveryStateDesc", field: "cDeliveryStateDesc", headerName: "交货状态描述", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cBatch", field: "cBatch", headerName: "批号", width: 112 },
  { colId: "cSgSign", field: "cSgSign", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "cJudgeResult", field: "cJudgeResult", headerName: "最终判定结果", width: 112 },
  { colId: "jyTime", field: "jyTime", headerName: "检验时间", width: 112 },
  { colId: "cSampleNo", field: "cSampleNo", headerName: "试样号", width: 112 },
  { colId: "nTestTimes", field: "nTestTimes", headerName: "试验次数", width: 112 },
  { colId: "cRecheckFlag", field: "cRecheckFlag", headerName: "复验标记", width: 112 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 112 },
  { colId: "nRollThick", field: "nRollThick", headerName: "轧制厚度", width: 112 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "班组", width: 112 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "班次", width: 112 },
  { colId: "dProTime", field: "dProTime", headerName: "生产时间", width: 112 },
  { colId: "actAspd", field: "actAspd", headerName: "实际加速度", width: 112 },
  { colId: "actFluxA", field: "actFluxA", headerName: "A区实际流量", width: 112 },
  { colId: "actFluxB", field: "actFluxB", headerName: "B区实际流量", width: 112 },
  { colId: "actRatioA", field: "actRatioA", headerName: "A区实际水比", width: 112 },
  { colId: "actRatioB", field: "actRatioB", headerName: "B区实际水比", width: 112 },
  { colId: "actSpeed", field: "actSpeed", headerName: "实际辊速", width: 112 },
  { colId: "coolingRate", field: "coolingRate", headerName: "实际冷速", width: 112 },
  { colId: "entryAveTemp", field: "entryAveTemp", headerName: "开冷平均温度", width: 112 },
  { colId: "eqInFurPerd", field: "eqInFurPerd", headerName: "在炉时间", width: 112 },
  { colId: "eqAveTemp", field: "eqAveTemp", headerName: "均热段平均温度", width: 112 },
  { colId: "finishAveTemp", field: "finishAveTemp", headerName: "返红平均温度", width: 112 },
  { colId: "fmEntTempAvg", field: "fmEntTempAvg", headerName: "精轧开轧温度（测量平均）", width: 112 },
  { colId: "fmEntTempTar", field: "fmEntTempTar", headerName: "精轧开轧温度目标", width: 112 },
  { colId: "fmEntThick", field: "fmEntThick", headerName: "中间坯厚度", width: 112 },
  { colId: "fmExitTempAvg", field: "fmExitTempAvg", headerName: "精轧终轧温度（测量平均）", width: 112 },
  { colId: "fmExitTempTar", field: "fmExitTempTar", headerName: "精轧终轧温度目标", width: 112 },
  { colId: "htAveTemp1", field: "htAveTemp1", headerName: "一加热段平均温度", width: 112 },
  { colId: "htAveTemp2", field: "htAveTemp2", headerName: "二加热段平均温度", width: 112 },
  { colId: "nTempXb", field: "nTempXb", headerName: "实测下表返红温度", width: 112 },
  { colId: "num", field: "num", headerName: "开启集管组数", width: 112 },
  { colId: "pressWater", field: "pressWater", headerName: "水压", width: 112 },
  { colId: "rmEntTempAvg", field: "rmEntTempAvg", headerName: "粗轧开轧温度（测量平均）", width: 112 },
  { colId: "rmEntTempTar", field: "rmEntTempTar", headerName: "粗轧开轧温度目标", width: 112 },
  { colId: "rmExitTempAvg", field: "rmExitTempAvg", headerName: "粗轧终轧温度（测量平均）", width: 112 },
  { colId: "targetFinishTemp", field: "targetFinishTemp", headerName: "目标返红温度", width: 112 },
  { colId: "tempWater", field: "tempWater", headerName: "水温", width: 112 },
  { colId: "total_flow", field: "total_flow", headerName: "总水量", width: 112 },
  { colId: "al", field: "al", headerName: "Al", width: 112 },
  { colId: "alins", field: "alins", headerName: "Alins", width: 112 },
  { colId: "als", field: "als", headerName: "Als", width: 112 },
  { colId: "b", field: "b", headerName: "B", width: 112 },
  { colId: "as", field: "as", headerName: "As", width: 112 },
  { colId: "bi", field: "bi", headerName: "Bi", width: 112 },
  { colId: "c", field: "c", headerName: "C", width: 112 },
  { colId: "ca", field: "ca", headerName: "Ca", width: 112 },
  { colId: "cAveImpact", field: "cAveImpact", headerName: "平均冲击功", width: 112 },
  { colId: "cBendResult", field: "cBendResult", headerName: "弯曲结果", width: 112 },
  { colId: "cDirection", field: "cDirection", headerName: "试验方向", width: 112 },
  { colId: "ce", field: "ce", headerName: "Ce", width: 112 },
  { colId: "ceq", field: "ceq", headerName: "Ceq", width: 112 },
  { colId: "cev", field: "cev", headerName: "Cev", width: 112 },
  { colId: "cImpact1", field: "cImpact1", headerName: "冲击功1", width: 112 },
  { colId: "cImpact2", field: "cImpact2", headerName: "冲击功2", width: 112 },
  { colId: "cImpact3", field: "cImpact3", headerName: "冲击功3", width: 112 },
  { colId: "co", field: "co", headerName: "Co", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112 },
  { colId: "cr", field: "cr", headerName: "Cr", width: 112 },
  { colId: "cTemperature", field: "cTemperature", headerName: "试验温度", width: 112 },
  { colId: "cu", field: "cu", headerName: "Cu", width: 112 },
  { colId: "la", field: "la", headerName: "La", width: 112 },
  { colId: "mn", field: "mn", headerName: "Mn", width: 112 },
  { colId: "mo", field: "mo", headerName: "Mo", width: 112 },
  { colId: "n", field: "n", headerName: "N", width: 112 },
  { colId: "nb", field: "nb", headerName: "Nb", width: 112 },
  { colId: "nFinalRate", field: "nFinalRate", headerName: "断后伸长率", width: 112 },
  { colId: "nFinalShrink", field: "nFinalShrink", headerName: "断面收缩率", width: 112 },
  { colId: "nFinalShrink1", field: "nFinalShrink1", headerName: "断面收缩率1", width: 112 },
  { colId: "nFinalShrink2", field: "nFinalShrink2", headerName: "断面收缩率2", width: 112 },
  { colId: "nFinalShrink3", field: "nFinalShrink3", headerName: "断面收缩率3", width: 112 },
  { colId: "nFinalShrinkAvg", field: "nFinalShrinkAvg", headerName: "平均断面收缩率", width: 112 },
  { colId: "ni", field: "ni", headerName: "Ni", width: 112 },
  { colId: "nMaxStrength", field: "nMaxStrength", headerName: "抗拉强度", width: 112 },
  { colId: "nYieLdStrength", field: "nYieLdStrength", headerName: "下屈服强度", width: 112 },
  { colId: "nYieLdUpStrength", field: "nYieLdUpStrength", headerName: "上屈服强度", width: 112 },
  { colId: "p", field: "p", headerName: "P", width: 112 },
  { colId: "pb", field: "pb", headerName: "Pb", width: 112 },
  { colId: "s", field: "s", headerName: "S", width: 112 },
  { colId: "sb", field: "sb", headerName: "Sb", width: 112 },
  { colId: "se", field: "se", headerName: "Se", width: 112 },
  { colId: "si", field: "si", headerName: "Si", width: 112 },
  { colId: "sn", field: "sn", headerName: "Sn", width: 112 },
  { colId: "ta", field: "ta", headerName: "Ta", width: 112 },
  { colId: "te", field: "te", headerName: "Te", width: 112 },
  { colId: "ti", field: "ti", headerName: "Ti", width: 112 },
  { colId: "tql4000Id", field: "tql4000Id", headerName: "Tql4000Id", width: 112 },
  { colId: "v", field: "v", headerName: "V", width: 112 },
  { colId: "w", field: "w", headerName: "W", width: 112 },
  { colId: "zr", field: "zr", headerName: "Zr", width: 112 },
  { colId: "isAutoUse", field: "isAutoUse", headerName: "是否投用自动", width: 112 },*/
];

async function query() {
  loading.value = true;
  try {
    const dto: FrmQL8100QueryInputDto = {
      cTestNo: input.cTestNo.trim() || null,
      cStove: input.cStove.trim() || null,
      cBatch: input.cBatch.trim() || null,
      cSgSign: input.cSgSign.trim() || null,
      cSgStd: input.cSgStd.trim() || null,
      testItemType: input.testItemType.trim() || null,
      completeTime: toTimeRange(input.completeTime),
    } as FrmQL8100QueryInputDto;
    rows.value = (await hR9320Api.get9320Dtos(dto)) ?? [];
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
        <label class="w-18 shrink-0 text-xs text-muted-foreground">委托单号</label>
        <InputText v-model="input.cTestNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatch" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgSign" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">试验项目种类</label>
        <InputText v-model="input.testItemType" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">检验时间</label>
        <DatePicker
          v-model="input.completeTime"
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
      <div class="col-span-3 flex min-w-0 items-center gap-1">
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
