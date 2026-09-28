<script setup lang="ts">
/** 对应 FrmMS9210（二炼钢3#连铸板坯电子台账）：DDH.Winforms.SMS.Forms.FrmMS9210
 *  已接入：mS9210Api.get9210Dtos（btnQuery_Click → DataBinding——DtoQueryMS9210：
 *          时间范围 / 班次(TiShiftNoEnum 早中夜) / 班组(TiFurShiftGroupEnum 甲乙丙) / 炉号 / 钢种，
 *          固定 CLineCode=炼钢二厂(LG02)、CMachineCode=LG02_CCM3_MachineCode(E3#CCM)；
 *          Load 默认时间=近 7 天 00:00 ~ 明天 00:00）
 *  查询条件（原 dataLayoutControl1 5 个 LayoutControlItem）：班次 / 班组 / 炉号 / 钢种 / 时间范围
 *  列：42 可见（化学元素列头保持英文，按 LDisplay:MS9210Dto）+ 1 隐藏(ProTime=生产时间)
 *  待接入：无 */
import { reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { mS9210Api } from "@/api/mes4ddh/sms.swagger";
import { useMenuQuery } from "@/lib/menuQuery";

useMenuQuery();

type TimeRange = { min?: string; max?: string };

const theme = makeHmxGridTheme();
const rows = ref<Record<string, unknown>[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/* 班次：TiShiftNoEnum（早=1/中=2/夜=3）；班组：TiFurShiftGroupEnum（甲=A=0/乙=B=1/丙=C=2）——
   后端无 StringEnumConverter，枚举按整数序列化 */
const shiftOptions = [
  { label: "早", value: 1 },
  { label: "中", value: 2 },
  { label: "夜", value: 3 },
];
const groupOptions = [
  { label: "甲", value: 0 },
  { label: "乙", value: 1 },
  { label: "丙", value: 2 },
];

/* 列头=extract LDisplay:MS9210Dto；化学元素列头保持英文 */
const colDefs = ref<ColDef[]>([
  { field: "dTime", headerName: "日期", width: 112 },
  { field: "cShiftNo", headerName: "班次", width: 112 },
  { field: "cGroupNo", headerName: "班组", width: 112 },
  { field: "cStove", headerName: "炉号", width: 112 },
  { field: "cSgCode", headerName: "钢种", width: 112 },
  { field: "c", headerName: "C", width: 112 },
  { field: "si", headerName: "SI", width: 112 },
  { field: "mn", headerName: "MN", width: 112 },
  { field: "p", headerName: "P", width: 112 },
  { field: "s", headerName: "S", width: 112 },
  { field: "cr", headerName: "CR", width: 112 },
  { field: "ni", headerName: "NI", width: 112 },
  { field: "mo", headerName: "MO", width: 112 },
  { field: "cu", headerName: "CU", width: 112 },
  { field: "al", headerName: "AL", width: 112 },
  { field: "ti", headerName: "TI", width: 112 },
  { field: "nb", headerName: "NB", width: 112 },
  { field: "v", headerName: "V", width: 112 },
  { field: "als", headerName: "ALS", width: 112 },
  { field: "ca", headerName: "CA", width: 112 },
  { field: "ceq", headerName: "CEQ", width: 112 },
  { field: "b", headerName: "B", width: 112 },
  { field: "alins", headerName: "ALINS", width: 112 },
  { field: "w", headerName: "W", width: 112 },
  { field: "as", headerName: "AS", width: 112 },
  { field: "sn", headerName: "SN", width: 112 },
  { field: "co", headerName: "CO", width: 112 },
  { field: "pb", headerName: "PB", width: 112 },
  { field: "sb", headerName: "SB", width: 112 },
  { field: "ta", headerName: "TA", width: 112 },
  { field: "zr", headerName: "ZR", width: 112 },
  { field: "bi", headerName: "BI", width: 112 },
  { field: "se", headerName: "SE", width: 112 },
  { field: "te", headerName: "TE", width: 112 },
  { field: "ce", headerName: "CE", width: 112 },
  { field: "la", headerName: "LA", width: 112 },
  { field: "n", headerName: "N", width: 112 },
  { field: "cDcN", headerName: "合格定尺N", width: 112 },
  { field: "cDcX", headerName: "合格定尺X", width: 112 },
  { field: "len", headerName: "非定尺米数", width: 112 },
  { field: "nQua", headerName: "支数", width: 112 },
  { field: "nWgt", headerName: "重量", width: 112 },
  { field: "proTime", headerName: "生产时间", hide: true },
]);

function dayAt(offset: number): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
}
/* 原 Load：dto.TimeRange = 近 7 天 00:00 ~ 明天 00:00 */
const q = reactive({
  cShiftNo: null as number | null,
  cGroupNo: null as number | null,
  cStove: "",
  cSgCode: "",
  dates: [dayAt(-7), dayAt(1)] as Date[] | null,
});

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/** 原 btnQuery_Click → DataBinding：固定产线 LG02 + 机台 E3#CCM */
async function onQuery() {
  querying.value = true;
  try {
    const input = {
      timeRange: toTimeRange(q.dates),
      cShiftNo: q.cShiftNo ?? undefined,
      cGroupNo: q.cGroupNo ?? undefined,
      cStove: q.cStove.trim() || undefined,
      cSgCode: q.cSgCode.trim() || undefined,
      cLineCode: "LG02",
      cMachineCode: "E3#CCM",
    };
    rows.value = ((await mS9210Api.get9210Dtos(input)) ?? []) as Record<string, unknown>[];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：班次/班组/炉号/钢种/时间范围） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-2 py-1.5">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">班次</label>
        <Select
          v-model="q.cShiftNo"
          :options="shiftOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">班组</label>
        <Select
          v-model="q.cGroupNo"
          :options="groupOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
        <DatePicker
          v-model="q.dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          class="min-w-0 flex-1"
        />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1 内 btnQuery） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs font-medium text-muted-foreground">电子台账</span>
    </div>

    <!-- 主表（gridControl1 / gridView1，绑定实体 MS9210Dto） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
