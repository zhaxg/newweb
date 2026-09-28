<script setup lang="ts">
/** 对应 FrmHR9410（性能判定台账）：DDH.Winforms.SHR.Forms.FrmHR9410
 *  已接入：hR9400Api.getHR9410Dtos(DtoQueryHR9410)
 *  偏差：切边方式 KV 下拉迁为文本输入（显示原值）；原 ViewControl.Completed 清空切边方式 → 查询完成后清空 */
import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR9400Api, type DtoQueryHR9410, type Thr9410Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

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
  begin.setDate(begin.getDate() - 2);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return [begin, end];
}

const input = reactive({
  cOrderNo: "",
  cBatchOrder: "",
  cStoveNo: "",
  cSgCodeOrder: "",
  cSgCodeLg: "",
  cTrimFlag: null as string | null,
  dates: defaultRange() as Date[] | null,
});

const rows = shallowRef<Thr9410Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  /*  { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 112 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 112 },
  { colId: "cIsQY", field: "cIsQY", headerName: "是否取样", width: 112 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "坯料钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "坯料标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "坯料规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 112 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "订单钢种", width: 112 },
  { colId: "cSgStdPlan", field: "cSgStdPlan", headerName: "订单标准", width: 112 },
  { colId: "cSpecRoll", field: "cSpecRoll", headerName: "轧制规格", width: 112 },
  { colId: "nThickRoll", field: "nThickRoll", headerName: "轧制厚度", width: 112 },
  { colId: "nWidthRoll", field: "nWidthRoll", headerName: "轧制宽度", width: 112 },
  { colId: "nLenRoll", field: "nLenRoll", headerName: "轧制长度", width: 112 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 112 },
  { colId: "cCustName", field: "cCustName", headerName: "客户名称", width: 112 },
  { colId: "cConRemark", field: "cConRemark", headerName: "特殊要求", width: 112 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 112 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112 },
  { colId: "cInboundNo1", field: "cInboundNo1", headerName: "入库标识1", width: 112 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 112 },
  { colId: "nQuaPlan", field: "nQuaPlan", headerName: "计划支数", width: 112 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 112 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112 },
  { colId: "cSpecialMarkGy", field: "cSpecialMarkGy", headerName: "性能要求", width: 112 },
  { colId: "cDn", field: "cDn", headerName: "需要堆冷", width: 112 },
  { colId: "steelGrade", field: "steelGrade", headerName: "牌号", width: 112 },
  { colId: "dDischargeTime", field: "dDischargeTime", headerName: "出炉时间", width: 112 },
  { colId: "dRollingTimeStart", field: "dRollingTimeStart", headerName: "轧制开始时间", width: 112 },
  { colId: "dRollingTimeEnd", field: "dRollingTimeEnd", headerName: "轧制结束时间", width: 112 },
  { colId: "crCode", field: "crCode", headerName: "CR代码", width: 112 },
  { colId: "totalRollingTime", field: "totalRollingTime", headerName: "总轧制时间s", width: 112 },
  { colId: "fmPass", field: "fmPass", headerName: "精轧总轧制道次数", width: 112 },
  { colId: "rollingStatus", field: "rollingStatus", headerName: "误轧制标记", width: 112 },
  { colId: "dwThick", field: "dwThick", headerName: "待温厚度", width: 112 },
  { colId: "exitThick", field: "exitThick", headerName: "轧制厚度（计算）", width: 112 },
  { colId: "exitWidth", field: "exitWidth", headerName: "轧制宽度（计算）", width: 112 },
  { colId: "exitLength", field: "exitLength", headerName: "轧制长度（计算）", width: 112 },
  { colId: "nWdRl", field: "nWdRl", headerName: "入炉温度", width: 112 },
  { colId: "nWdCl", field: "nWdCl", headerName: "出炉温度", width: 112 },
  { colId: "inFurnaceTime", field: "inFurnaceTime", headerName: "在炉内时间", width: 112 },
  { colId: "hsbExitTempAvg", field: "hsbExitTempAvg", headerName: "除鳞后温度（平均）", width: 112 },
  { colId: "hsbExitTempMax", field: "hsbExitTempMax", headerName: "除鳞后温度（最大）", width: 112 },
  { colId: "meaThickWs", field: "meaThickWs", headerName: "厚度（工作侧）测厚仪", width: 112 },
  { colId: "meaThickDs", field: "meaThickDs", headerName: "厚度（传动侧）测厚仪", width: 112 },
  { colId: "thickHp", field: "thickHp", headerName: "厚度（中部）测厚仪", width: 112 },
  { colId: "rmPass", field: "rmPass", headerName: "粗轧总轧制道次数", width: 112 },
  { colId: "rmEntTempTar", field: "rmEntTempTar", headerName: "粗轧开轧温度目标", width: 112 },
  { colId: "rmEntTempCal", field: "rmEntTempCal", headerName: "粗轧开轧温度（计算）", width: 112 },
  { colId: "rmEntTempAvg", field: "rmEntTempAvg", headerName: "粗轧开轧温度（测量平均）", width: 112 },
  { colId: "rmEntTempMin", field: "rmEntTempMin", headerName: "粗轧开轧温度（测量最小）", width: 112 },
  { colId: "rmEntTempMax", field: "rmEntTempMax", headerName: "粗轧开轧温度（测量最大）", width: 112 },
  { colId: "rmExitTempCal", field: "rmExitTempCal", headerName: "粗轧终轧温度（计算）", width: 112 },
  { colId: "rmExitTempAvg", field: "rmExitTempAvg", headerName: "粗轧终轧温度（测量平均）", width: 112 },
  { colId: "rmExitTempMin", field: "rmExitTempMin", headerName: "粗轧终轧温度（测量最小）", width: 112 },
  { colId: "rmExitTempMax", field: "rmExitTempMax", headerName: "粗轧终轧温度（测量最大）", width: 112 },
  { colId: "rmEntThick", field: "rmEntThick", headerName: "粗轧开始厚度（计算）", width: 112 },
  { colId: "fmEntTempCal", field: "fmEntTempCal", headerName: "精轧开轧温度（计算）", width: 112 },
  { colId: "fmEntTempTar", field: "fmEntTempTar", headerName: "精轧开轧温度目标", width: 112 },
  { colId: "fmEntTempAvg", field: "fmEntTempAvg", headerName: "精轧开轧温度（测量平均）", width: 112 },
  { colId: "fmEntTempMin", field: "fmEntTempMin", headerName: "精轧开轧温度（测量最小）", width: 112 },
  { colId: "fmEntTempMax", field: "fmEntTempMax", headerName: "精轧开轧温度（测量最大）", width: 112 },
  { colId: "fmExitTempTar", field: "fmExitTempTar", headerName: "终轧温度目标", width: 112 },
  { colId: "fmExitTempCal", field: "fmExitTempCal", headerName: "精轧终轧温度（计算）", width: 112 },
  { colId: "fmExitTempAvg", field: "fmExitTempAvg", headerName: "精轧终轧温度（测量平均）", width: 112 },
  { colId: "fmExitTempMin", field: "fmExitTempMin", headerName: "精轧终轧温度（测量最小）", width: 112 },
  { colId: "fmExitTempMax", field: "fmExitTempMax", headerName: "精轧终轧温度（测量最大）", width: 112 },
  { colId: "shiftNo", field: "shiftNo", headerName: "班次", width: 112 },
  { colId: "shiftGroup", field: "shiftGroup", headerName: "班组", width: 112 },
  { colId: "dProductTime", field: "dProductTime", headerName: "生产时间", width: 112 },
  { colId: "nCcl", field: "nCcl", headerName: "理论成材率", width: 112 },
  { colId: "totalPass", field: "totalPass", headerName: "预矫总次数", width: 112 },
  { colId: "entryTime", field: "entryTime", headerName: "预矫进入时间", width: 112 },
  { colId: "endTime", field: "endTime", headerName: "预矫结束时间", width: 112 },
  { colId: "entryTemp", field: "entryTemp", headerName: "预矫钢板温度", width: 112 },
  { colId: "levelerSpeed", field: "levelerSpeed", headerName: "预矫速度", width: 112 },
  { colId: "bitSpeed", field: "bitSpeed", headerName: "预矫咬入速度", width: 112 },
  { colId: "startCoolTime", field: "startCoolTime", headerName: "开冷时间", width: 112 },
  { colId: "finishCoolTime", field: "finishCoolTime", headerName: "终冷时间", width: 112 },
  { colId: "entryAveTemp", field: "entryAveTemp", headerName: "开冷平均温度", width: 112 },
  { colId: "entryMaxTemp", field: "entryMaxTemp", headerName: "开冷最大温度", width: 112 },
  { colId: "entryMinTemp", field: "entryMinTemp", headerName: "开冷最小温度", width: 112 },
  { colId: "targetFinishTemp", field: "targetFinishTemp", headerName: "目标返红温度", width: 112 },
  { colId: "nTempXb", field: "nTempXb", headerName: "实测下表返红温度", width: 112 },
  { colId: "finishAveTemp", field: "finishAveTemp", headerName: "返红平均温度", width: 112 },
  { colId: "finishMaxTemp", field: "finishMaxTemp", headerName: "返红温度最大", width: 112 },
  { colId: "finishMinTemp", field: "finishMinTemp", headerName: "返红温度最小", width: 112 },
  { colId: "coolingRate", field: "coolingRate", headerName: "实际冷速", width: 112 },
  { colId: "entryTimeRj", field: "entryTimeRj", headerName: "热矫进入时间", width: 112 },
  { colId: "endTimeRj", field: "endTimeRj", headerName: "热矫结束时间", width: 112 },
  { colId: "entryTempRj", field: "entryTempRj", headerName: "热矫钢板温度", width: 112 },
  { colId: "emptyFlagRj", field: "emptyFlagRj", headerName: "热矫是否空过", width: 112 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 112 },
  { colId: "c", field: "c", headerName: "C", width: 112 },
  { colId: "si", field: "si", headerName: "Si", width: 112 },
  { colId: "mn", field: "mn", headerName: "Mn", width: 112 },
  { colId: "p", field: "p", headerName: "P", width: 112 },
  { colId: "s", field: "s", headerName: "S", width: 112 },
  { colId: "cr", field: "cr", headerName: "Cr", width: 112 },
  { colId: "ni", field: "ni", headerName: "Ni", width: 112 },
  { colId: "mo", field: "mo", headerName: "Mo", width: 112 },
  { colId: "cu", field: "cu", headerName: "Cu", width: 112 },
  { colId: "al", field: "al", headerName: "Al", width: 112 },
  { colId: "ti", field: "ti", headerName: "Ti", width: 112 },
  { colId: "nb", field: "nb", headerName: "Nb", width: 112 },
  { colId: "v", field: "v", headerName: "V", width: 112 },
  { colId: "als", field: "als", headerName: "Als", width: 112 },
  { colId: "ca", field: "ca", headerName: "Ca", width: 112 },
  { colId: "ceq", field: "ceq", headerName: "Ceq", width: 112 },
  { colId: "b", field: "b", headerName: "B", width: 112 },
  { colId: "alins", field: "alins", headerName: "Alins", width: 112 },
  { colId: "w", field: "w", headerName: "W", width: 112 },
  { colId: "as", field: "as", headerName: "As", width: 112 },
  { colId: "sn", field: "sn", headerName: "Sn", width: 112 },
  { colId: "co", field: "co", headerName: "Co", width: 112 },
  { colId: "pb", field: "pb", headerName: "Pb", width: 112 },
  { colId: "sb", field: "sb", headerName: "Sb", width: 112 },
  { colId: "ta", field: "ta", headerName: "Ta", width: 112 },
  { colId: "zr", field: "zr", headerName: "Zr", width: 112 },
  { colId: "bi", field: "bi", headerName: "Bi", width: 112 },
  { colId: "se", field: "se", headerName: "Se", width: 112 },
  { colId: "te", field: "te", headerName: "Te", width: 112 },
  { colId: "ce", field: "ce", headerName: "Ce", width: 112 },
  { colId: "la", field: "la", headerName: "La", width: 112 },
  { colId: "n", field: "n", headerName: "N", width: 112 },*/
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryHR9410 = {
      timeRange: toTimeRange(input.dates),
      cOrderNo: input.cOrderNo.trim() || null,
      cBatchOrder: input.cBatchOrder.trim() || null,
      cStoveNo: input.cStoveNo.trim() || null,
      cSgCodeOrder: input.cSgCodeOrder.trim() || null,
      cSgCodeLg: input.cSgCodeLg.trim() || null,
      cTrimFlag: input.cTrimFlag?.trim() || null,
    };
    rows.value = (await hR9400Api.getHR9410Dtos(dto)) ?? [];
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">提料计划号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cBatchOrder" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStoveNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单钢种</label>
        <InputText v-model="input.cSgCodeOrder" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">坯料钢种</label>
        <InputText v-model="input.cSgCodeLg" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">切边方式</label>
        <InputText v-model="input.cTrimFlag" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
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
