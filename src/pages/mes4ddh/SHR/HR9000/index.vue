<script setup lang="ts">
/** 对应 FrmHR9000（照核实绩）：DDH.Winforms.SHR.Forms.FrmHR9000
 *  已接入：hR4200Api.queryTiL2me05s
 *  偏差：nStatus/nQmStatus/cSurfaceResult 等 KV/枚举列显示原值（web 无 KV 字典设施） */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { hR4200Api, type DtoQueryL2, type TiL2ME05ItemDto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

/* ---------- 时间（原 ucTimeRange，默认本月） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（DtoQueryL2） ---------- */
const input = reactive({
  slabNo: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 表格（gridView1 / TiL2ME05ItemDto） ---------- */
const rows = shallowRef<TiL2ME05ItemDto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  { colId: "createTime", field: "createTime", headerName: "照核时间", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 150 },
  { colId: "printCode", field: "printCode", headerName: "喷印号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 150 },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 150 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 150 },
  { colId: "mesCallBack", field: "mesCallBack", headerName: "MES反馈", width: 150 },
  { colId: "l2CallBack", field: "l2CallBack", headerName: "L2反馈", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "库存状态", width: 150 },
  { colId: "nQmStatus", field: "nQmStatus", headerName: "质量状态", width: 150 },
  { colId: "cSurfaceResult", field: "cSurfaceResult", headerName: "表检结果", width: 150 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 150 },
  { colId: "pLAN_NThickPlan", field: "pLAN_NThickPlan", headerName: "轧制厚", width: 150 },
  { colId: "pLAN_NWidthPlan", field: "pLAN_NWidthPlan", headerName: "轧制宽", width: 150 },
  { colId: "pLAN_NLlCleanLen", field: "pLAN_NLlCleanLen", headerName: "轧制长", width: 150 },
  { colId: "pLAN_CSpec", field: "pLAN_CSpec", headerName: "剪切计划规格", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryL2 = {
      dRange: toTimeRange(input.dates),
      slabNo: input.slabNo.trim() || null,
    };
    rows.value = (await hR4200Api.queryTiL2me05s(dto)) ?? [];
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">喷印号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
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
