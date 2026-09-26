<script setup lang="ts">
/** 对应 FrmTI1290（热装率）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1290
 *  已接入：tI1290Api.getThr3010Fcdetails（上：板坯出炉信息，含时间/班组/板坯号/组批号条件）
 *        · tI1290Api.getTi1290Dtos（下：红送率，按月份区间汇总）
 *  待接入：无
 *  偏差：原上下两块 groupControl（splitContainerControl1）以垂直 Splitter 还原；上默认 [今天, 明天]、下默认本月首日至明天；
 *        班组下拉候选沿用同族窗体的 TiFurShiftGroupEnum（甲/乙/丙=A/B/C），入炉班组列同规则展示 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tI1290Api, type Thr3010Fcdetail, type Ti1290Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const loading = ref(false);
const hzLoading = ref(false);

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function dayStart(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}
function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
const groupFmt = (p: ValueFormatterParams) =>
  (({ A: "甲", B: "乙", C: "丙" }) as Record<string, string>)[String(p.value)] ?? p.value ?? "";

const shiftGroupOptions = [
  { label: "甲", value: "A" },
  { label: "乙", value: "B" },
  { label: "丙", value: "C" },
];

const input = reactive({
  dates: [dayStart(0), dayStart(1)] as Date[] | null, // ucTimeRange1 出炉信息
  datesHz: [monthStart(), dayStart(1)] as Date[] | null, // ucTimeRange2 红送率
  cShiftGroup: null as string | null,
  cSlabNo: "",
  cZpNo: "",
});

const rows = shallowRef<Thr3010Fcdetail[]>([]);
const hzRows = shallowRef<Ti1290Dto[]>([]);
const api = ref<GridApi | null>(null);
const hzApi = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onHzReady(e: GridReadyEvent) {
  hzApi.value = e.api;
}

const mainDefs: ColDef[] = [
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", minWidth: 140 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "组批号", minWidth: 130 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "板坯号", minWidth: 130 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", minWidth: 130 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", minWidth: 100 },
  { colId: "nThick", field: "nThick", headerName: "订单厚度", minWidth: 100 },
  { colId: "nWidth", field: "nWidth", headerName: "订单宽度", minWidth: 100 },
  { colId: "nLen", field: "nLen", headerName: "订单长度", minWidth: 100 },
  { colId: "nLenMin", field: "nLenMin", headerName: "订单长度下限", minWidth: 120 },
  { colId: "nLenMax", field: "nLenMax", headerName: "订单长度上限", minWidth: 120 },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", minWidth: 100 },
  { colId: "nInFurTemp", field: "nInFurTemp", headerName: "入炉温度", minWidth: 100 },
  { colId: "cTol", field: "cTol", headerName: "公差", minWidth: 90 },
  {
    colId: "cInFurShiftGroup",
    field: "cInFurShiftGroup",
    headerName: "入炉班组",
    minWidth: 100,
    valueFormatter: groupFmt,
  },
  { colId: "cInFurShiftNo", field: "cInFurShiftNo", headerName: "入炉班次", minWidth: 100 },
  { colId: "dFurTime", field: "dFurTime", headerName: "入炉时间", minWidth: 160 },
  { colId: "dExitfurTime", field: "dExitfurTime", headerName: "出炉时间", minWidth: 160 },
  { colId: "id", field: "id", headerName: "主键", minWidth: 120, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", minWidth: 90, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", minWidth: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", minWidth: 100, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", minWidth: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "Thr3010主键", minWidth: 140, hide: true },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", minWidth: 100, hide: true },
];

const hzDefs: ColDef[] = [
  { colId: "cDateTime", field: "cDateTime", headerName: "日期", minWidth: 120 },
  { colId: "nQuaAll", field: "nQuaAll", headerName: "合计支数", minWidth: 100 },
  { colId: "nQua1", field: "nQua1", headerName: "支数1", minWidth: 90 },
  { colId: "hitRate1", field: "hitRate1", headerName: "红装率1", minWidth: 100 },
  { colId: "nQua2", field: "nQua2", headerName: "支数2", minWidth: 90 },
  { colId: "hitRate2", field: "hitRate2", headerName: "红装率2", minWidth: 100 },
  { colId: "nQua3", field: "nQua3", headerName: "支数3", minWidth: 90 },
  { colId: "hitRate3", field: "hitRate3", headerName: "红装率3", minWidth: 100 },
  { colId: "nQua4", field: "nQua4", headerName: "支数4", minWidth: 90 },
  { colId: "hitRate4", field: "hitRate4", headerName: "红装率4", minWidth: 100 },
  { colId: "nQua5", field: "nQua5", headerName: "支数5", minWidth: 90 },
  { colId: "hitRate5", field: "hitRate5", headerName: "红装率5", minWidth: 100 },
  { colId: "nQua6", field: "nQua6", headerName: "支数6", minWidth: 90 },
  { colId: "hitRate6", field: "hitRate6", headerName: "红装率6", minWidth: 100 },
];

async function query() {
  loading.value = true;
  try {
    const payload = {
      timeRange: toTimeRange(input.dates),
      cZpNo: input.cZpNo.trim() || null,
      cShiftGroup: input.cShiftGroup || null,
      cSlabNo: input.cSlabNo.trim() || null,
    };
    rows.value = (await tI1290Api.getThr3010Fcdetails(payload)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function queryHz() {
  hzLoading.value = true;
  try {
    hzRows.value = (await tI1290Api.getTi1290Dtos({ timeRange: toTimeRange(input.datesHz) })) ?? [];
    requestAnimationFrame(() => hzApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    hzLoading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="55" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
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
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">班组</label>
            <Select
              v-model="input.cShiftGroup"
              :options="shiftGroupOptions"
              option-label="label"
              option-value="value"
              show-clear
              placeholder="全部"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
            <InputText v-model="input.cSlabNo" class="min-w-0 flex-1" @keydown.enter="query" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
            <InputText v-model="input.cZpNo" class="min-w-0 flex-1" @keydown.enter="query" />
          </div>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">板坯出炉信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="mainDefs"
            :row-data="rows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :loading="loading"
            @grid-ready="onReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="45" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
          <DatePicker
            v-model="input.datesHz"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始 至 结束"
            class="min-w-0 flex-1"
          />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="hzLoading" @click="queryHz">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground">红送率</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="hzDefs"
            :row-data="hzRows"
            :loading="hzLoading"
            @grid-ready="onHzReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
