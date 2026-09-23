<script setup lang="ts">
/** 对应 FrmHR4300（计划产出查询）：DDH.Winforms.SHR.Forms.FrmHR4300
 *  已接入：hR4300Api.queryCc(DtoQuerySlabs)；产线取菜单参数（qs=ZG01）
 *  偏差：原「开始/结束产出时间」控件绑定到不存在的 DtoQuerySlabs.DProStart/DProzEnd（死绑定）未渲染，产出时间走 ucTimeRange→timeRange；
 *       库区/班组/班次/切边方式 KV 列显示原值 */
import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { hR4300Api, tPa1000Api, type DtoQuerySlabs, type PlanCcDto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
// 原 Load：TimeRange = [今天-1天, 今天+1月-1秒]
function defaultRange(): Date[] {
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  begin.setDate(begin.getDate() - 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return [begin, end];
}

/* ---------- 产线下拉（原 comLine，Load 用菜单参数初始化） ---------- */
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string>(menuQs[0] ?? "ZG01");

const input = reactive({
  cStoreCode: "",
  cOrderNo: "",
  cBatchNo: "",
  cPieceNo: "",
  cStove: "",
  cSgCode: "",
  cSgStd: "",
  dates: defaultRange() as Date[] | null,
});

const rows = shallowRef<PlanCcDto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) { api.value = e.api; }

const colDefs: ColDef[] = [
  /*  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 150 },
  { colId: "cSlabNo", field: "cSlabNo", headerName: "板坯号", width: 150 },
  { colId: "cPlateSlab", field: "cPlateSlab", headerName: "大板号", width: 150 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "子板号", width: 150 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 150 },
  { colId: "dRl", field: "dRl", headerName: "入炉时间", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "订单钢种", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "订单规格", width: 150 },
  { colId: "nThickPlan", field: "nThickPlan", headerName: "计划厚度", width: 150 },
  { colId: "nWidthPlan", field: "nWidthPlan", headerName: "计划宽度", width: 150 },
  { colId: "nLenPlan", field: "nLenPlan", headerName: "计划长度", width: 150 },
  { colId: "cInboundNoPlan", field: "cInboundNoPlan", headerName: "计划入库标识", width: 150 },
  { colId: "nThick", field: "nThick", headerName: "产出厚度", width: 150 },
  { colId: "nWidth", field: "nWidth", headerName: "产出宽度", width: 150 },
  { colId: "nLen", field: "nLen", headerName: "产出长度", width: 150 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 150 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 150 },
  { colId: "nQua", field: "nQua", headerName: "产出支数", width: 150 },
  { colId: "nWgtCc", field: "nWgtCc", headerName: "产出重量", width: 150 },
  { colId: "cPrint", field: "cPrint", headerName: "喷印完成标记", width: 150 },
  { colId: "cSlCode", field: "cSlCode", headerName: "剪切线代码", width: 150 },
  { colId: "dProTime", field: "dProTime", headerName: "产出时间", width: 150 },
  { colId: "cProUser", field: "cProUser", headerName: "产出人", width: 150 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "产出班次", width: 150 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "产出班组", width: 150 },*/
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQuerySlabs = {
      cLineCode: lineCode.value || null,
      cStoreCode: input.cStoreCode.trim() || null,
      cOrderNo: input.cOrderNo.trim() || null,
      cBatchNo: input.cBatchNo.trim() || null,
      cPieceNo: input.cPieceNo.trim() || null,
      cStove: input.cStove.trim() || null,
      cSgCode: input.cSgCode.trim() || null,
      cSgStd: input.cSgStd.trim() || null,
      timeRange: toTimeRange(input.dates),
    };
    rows.value = (await hR4300Api.queryCc(dto)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const devices = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = devices.map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    if (!lineCode.value && lineOptions.value.length) lineCode.value = lineOptions.value[0].value;
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
        <Select v-model="lineCode" :options="lineOptions" option-label="label" option-value="value"
          class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">库区</label>
        <InputText v-model="input.cStoreCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" @keydown.enter="query" />
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
      <div class="col-span-3 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入炉时间</label>
        <DatePicker v-model="input.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
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
