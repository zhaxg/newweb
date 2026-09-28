<script setup lang="ts">
/** 对应 FrmTI1280（成材率实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1280
 *  已接入：tI1280Api.getTi1280s（主表：实绩列表）
 *        · get1280Details（页签 成材率）· getTi1280DayProductDtos（成材率日汇总，按 txtDayDate 单日）
 *        · getTi1280WgtDetails（重量合格情况）· getTi1280FcDetails（坯料负差明细）· get1280DayGroupDetails（班组成材率日汇总）
 *  待接入：无
 *  偏差：原 XtraTabControl 页签在顶部；原页签下三个 ucTimeRange + txtDayDate 按选中页签显隐，
 *        web 侧在底部工具栏按页签条件渲染对应时间控件（成材率/重量/负差用月首→明天区间、日汇总用单日、班组日用月初→明天区间）；
 *        切边方式原为运行时 KV 下拉，候选值未随迁移提供，暂以空选项 Select 承载；班组以 A/B/C→甲/乙/丙 展示 */

import { reactive, ref, shallowRef, type Ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import {
  tI1280Api,
  type Ti1280Dto,
  type Ti1280DetailDto,
  type Ti1280WgtDetailDto,
  type Ti1280FcDetailDto,
  type Ti1280DayProductDto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const loading = ref(false);
const tabLoading = ref(false);
const activeTab = ref("ccl");

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
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
function monthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
}
const groupFmt = (p: ValueFormatterParams) =>
  (({ A: "甲", B: "乙", C: "丙" }) as Record<string, string>)[String(p.value)] ?? p.value ?? "";

/* ---------- 查询条件（DtoTi1280Query + 各页签时间） ---------- */
const input = reactive({
  dates: [dayStart(-1), dayStart(1)] as Date[] | null, // ucTimeRange1 主表
  dates2: [monthStart(), dayStart(1)] as Date[] | null, // ucTimeRange2 月汇总区间
  dates3: [monthStart(), dayStart(1)] as Date[] | null, // ucTimeRange3 班组日汇总区间
  dayDate: new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) as Date | null, // txtDayDate
  cTrimFlag: null as string | null,
  cSlabNo: "",
  cPieceNo: "",
});
const trimFlagOptions = ref<{ label: string; value: string }[]>([]);

/* ---------- 表格 ---------- */
const rows = shallowRef<Ti1280Dto[]>([]);
const cclRows = shallowRef<Ti1280DetailDto[]>([]);
const dayProductRows = shallowRef<Ti1280DayProductDto[]>([]);
const wgtRows = shallowRef<Ti1280WgtDetailDto[]>([]);
const fcRows = shallowRef<Ti1280FcDetailDto[]>([]);
const groupRows = shallowRef<Ti1280DetailDto[]>([]);
const api = ref<GridApi | null>(null);
const cclApi = ref<GridApi | null>(null);
const dayProductApi = ref<GridApi | null>(null);
const wgtApi = ref<GridApi | null>(null);
const fcApi = ref<GridApi | null>(null);
const groupApi = ref<GridApi | null>(null);
const bindGrid = (target: Ref<GridApi | null>) => (e: GridReadyEvent) => {
  target.value = e.api;
};

const mainDefs: ColDef[] = [
  { colId: "cShiftNo", field: "cShiftNo", headerName: "班次", minWidth: 80 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", minWidth: 80, valueFormatter: groupFmt },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", minWidth: 140 },
  { colId: "cZpNo", field: "cZpNo", headerName: "组批号", minWidth: 130 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", minWidth: 100 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", minWidth: 130 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", minWidth: 130 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", minWidth: 110 },
  { colId: "nOrderThick", field: "nOrderThick", headerName: "订单厚", minWidth: 90 },
  { colId: "nOrderWidth", field: "nOrderWidth", headerName: "订单宽", minWidth: 90 },
  { colId: "nOrderLen", field: "nOrderLen", headerName: "订单长", minWidth: 90 },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", minWidth: 100 },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", minWidth: 100 },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", minWidth: 100 },
  { colId: "nPlateWgt", field: "nPlateWgt", headerName: "重量", minWidth: 90 },
  { colId: "cSlabNo", field: "cSlabNo", headerName: "坯料件次号", minWidth: 130 },
  { colId: "cSpecSlab", field: "cSpecSlab", headerName: "坯料规格", minWidth: 110 },
  { colId: "nThickSlab", field: "nThickSlab", headerName: "坯料厚度", minWidth: 100 },
  { colId: "nWidthSlab", field: "nWidthSlab", headerName: "坯料宽度", minWidth: 100 },
  { colId: "nLenSlab", field: "nLenSlab", headerName: "坯料长度", minWidth: 100 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", minWidth: 100 },
  { colId: "nSlabWgt", field: "nSlabWgt", headerName: "板坯重量", minWidth: 100 },
  { colId: "dPrint", field: "dPrint", headerName: "喷印时间", minWidth: 160 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", minWidth: 150 },
];

// 成材率明细（Ti1280DetailDto）：坯料/钢板 × 四切/两切/毛边/合计 + 成材率
const detailCols: ColDef[] = [
  { colId: "nSlabQua1", field: "nSlabQua1", headerName: "坯料支数四切", minWidth: 110 },
  { colId: "nSlabWgt1", field: "nSlabWgt1", headerName: "坯料重量四切", minWidth: 110 },
  { colId: "nSlabQua2", field: "nSlabQua2", headerName: "坯料支数两切", minWidth: 110 },
  { colId: "nSlabWgt2", field: "nSlabWgt2", headerName: "坯料重量两切", minWidth: 110 },
  { colId: "nSlabQua0", field: "nSlabQua0", headerName: "坯料支数毛边", minWidth: 110 },
  { colId: "nSlabWgt0", field: "nSlabWgt0", headerName: "坯料重量毛边", minWidth: 110 },
  { colId: "nSlabQuaAll", field: "nSlabQuaAll", headerName: "坯料支数合计", minWidth: 110 },
  { colId: "nSlabWgtAll", field: "nSlabWgtAll", headerName: "坯料重量合计", minWidth: 110 },
  { colId: "nQua1", field: "nQua1", headerName: "钢板支数四切", minWidth: 110 },
  { colId: "nWgt1", field: "nWgt1", headerName: "钢板重量四切", minWidth: 110 },
  { colId: "nQua2", field: "nQua2", headerName: "钢板支数两切", minWidth: 110 },
  { colId: "nWgt2", field: "nWgt2", headerName: "钢板重量两切", minWidth: 110 },
  { colId: "nQua0", field: "nQua0", headerName: "钢板支数毛边", minWidth: 110 },
  { colId: "nWgt0", field: "nWgt0", headerName: "钢板重量毛边", minWidth: 110 },
  { colId: "nQuaAll", field: "nQuaAll", headerName: "钢板支数合计", minWidth: 110 },
  { colId: "nWgtAll", field: "nWgtAll", headerName: "钢板重量合计", minWidth: 110 },
  { colId: "nRate1", field: "nRate1", headerName: "成材率四切", minWidth: 110 },
  { colId: "nRate2", field: "nRate2", headerName: "成材率两切", minWidth: 110 },
  { colId: "nRate0", field: "nRate0", headerName: "成材率毛边", minWidth: 110 },
  { colId: "nRateAll", field: "nRateAll", headerName: "成材率合计", minWidth: 110 },
];
const cclDefs: ColDef[] = [{ colId: "date", field: "date", headerName: "日期", minWidth: 120 }, ...detailCols];
const groupDefs: ColDef[] = [
  { colId: "date", field: "date", headerName: "日期", minWidth: 120 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", minWidth: 80, valueFormatter: groupFmt },
  ...detailCols,
];

const wgtDefs: ColDef[] = [
  { colId: "date", field: "date", headerName: "日期", minWidth: 120 },
  { colId: "nQua", field: "nQua", headerName: "合计支数", minWidth: 100 },
  { colId: "nLlWgt", field: "nLlWgt", headerName: "合计理论重量", minWidth: 120 },
  { colId: "nSjWgt", field: "nSjWgt", headerName: "合计实绩重量", minWidth: 120 },
  { colId: "nTol", field: "nTol", headerName: "合计偏差", minWidth: 100 },
  { colId: "nDcQua", field: "nDcQua", headerName: "定尺支数", minWidth: 100 },
  { colId: "nDcLlWgt", field: "nDcLlWgt", headerName: "定尺理论重量", minWidth: 120 },
  { colId: "nDcSjWgt", field: "nDcSjWgt", headerName: "定尺实绩重量", minWidth: 120 },
  { colId: "nDcTol", field: "nDcTol", headerName: "定尺偏差", minWidth: 100 },
  { colId: "nDcBL", field: "nDcBL", headerName: "定尺比例", minWidth: 100 },
  { colId: "nFwcQua", field: "nFwcQua", headerName: "非定尺支数", minWidth: 110 },
  { colId: "nFwcLlWgt", field: "nFwcLlWgt", headerName: "非定尺理论重量", minWidth: 130 },
  { colId: "nFwcSjWgt", field: "nFwcSjWgt", headerName: "非定尺实绩重量", minWidth: 130 },
  { colId: "nFwcTol", field: "nFwcTol", headerName: "非定尺偏差", minWidth: 110 },
  { colId: "nFwcBL", field: "nFwcBL", headerName: "非定尺比例", minWidth: 110 },
  { colId: "nQtQua", field: "nQtQua", headerName: "其余支数", minWidth: 100 },
  { colId: "nQtLlWgt", field: "nQtLlWgt", headerName: "其余理论重量", minWidth: 120 },
  { colId: "nQtSjWgt", field: "nQtSjWgt", headerName: "其余实绩重量", minWidth: 120 },
  { colId: "nQtTol", field: "nQtTol", headerName: "其余偏差", minWidth: 100 },
  { colId: "nQtBL", field: "nQtBL", headerName: "其余比例", minWidth: 100 },
  { colId: "nWgtOkQua", field: "nWgtOkQua", headerName: "合格支数", minWidth: 100 },
  { colId: "nWgtOkLlWgt", field: "nWgtOkLlWgt", headerName: "合格理论重量", minWidth: 120 },
  { colId: "nWgtOkSjWgt", field: "nWgtOkSjWgt", headerName: "合格实绩重量", minWidth: 120 },
  { colId: "nWgtOkTol", field: "nWgtOkTol", headerName: "合格偏差", minWidth: 100 },
  { colId: "nWgtOkBL", field: "nWgtOkBL", headerName: "合格比例", minWidth: 100 },
];

const fcDefs: ColDef[] = [
  { colId: "date", field: "date", headerName: "日期", minWidth: 120 },
  { colId: "nSlabQua", field: "nSlabQua", headerName: "坯料数量", minWidth: 100 },
  { colId: "nThickFcQua1", field: "nThickFcQua1", headerName: "厚度负差1支数", minWidth: 130 },
  { colId: "nThickFcBL1", field: "nThickFcBL1", headerName: "厚度负差1比例", minWidth: 130 },
  { colId: "nThickFcQua2", field: "nThickFcQua2", headerName: "厚度负差2支数", minWidth: 130 },
  { colId: "nThickFcBL2", field: "nThickFcBL2", headerName: "厚度负差2比例", minWidth: 130 },
  { colId: "nWidthFcQua1", field: "nWidthFcQua1", headerName: "宽度负差1支数", minWidth: 130 },
  { colId: "nWidthFcBL1", field: "nWidthFcBL1", headerName: "宽度负差1比例", minWidth: 130 },
  { colId: "nWidthFcQua2", field: "nWidthFcQua2", headerName: "宽度负差2支数", minWidth: 130 },
  { colId: "nWidthFcBL2", field: "nWidthFcBL2", headerName: "宽度负差2比例", minWidth: 130 },
  { colId: "nDcLenFcQua1", field: "nDcLenFcQua1", headerName: "定尺长度负差1支数", minWidth: 150 },
  { colId: "nDcLenFcBL1", field: "nDcLenFcBL1", headerName: "定尺长度负差1比例", minWidth: 150 },
  { colId: "nDcLenFcQua2", field: "nDcLenFcQua2", headerName: "定尺长度负差2支数", minWidth: 150 },
  { colId: "nDcLenFcBL2", field: "nDcLenFcBL2", headerName: "定尺长度负差2比例", minWidth: 150 },
  { colId: "nFwcLenFcQua1", field: "nFwcLenFcQua1", headerName: "非定尺负差1支数", minWidth: 150 },
  { colId: "nFwcLenFcBL1", field: "nFwcLenFcBL1", headerName: "非定尺负差1比例", minWidth: 150 },
  { colId: "nFwcLenFcQua2", field: "nFwcLenFcQua2", headerName: "非定尺负差2支数", minWidth: 150 },
  { colId: "nFwcLenFcBL2", field: "nFwcLenFcBL2", headerName: "非定尺负差2比例", minWidth: 150 },
  { colId: "nQua", field: "nQua", headerName: "支数", minWidth: 90 },
  { colId: "nBL", field: "nBL", headerName: "比例", minWidth: 90 },
];

const dayProductDefs: ColDef[] = [
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", minWidth: 100 },
  { colId: "nTpDayAll", field: "nTpDayAll", headerName: "产量日合计", minWidth: 110 },
  { colId: "nTpMonthAll", field: "nTpMonthAll", headerName: "产量当月累计", minWidth: 120 },
  { colId: "nTpBlAll", field: "nTpBlAll", headerName: "产量所占比例", minWidth: 120 },
  { colId: "nTpDayA", field: "nTpDayA", headerName: "产量甲当日", minWidth: 110 },
  { colId: "nTpTotalA", field: "nTpTotalA", headerName: "产量甲累计", minWidth: 110 },
  { colId: "nTpDayB", field: "nTpDayB", headerName: "产量乙当日", minWidth: 110 },
  { colId: "nTpTotalB", field: "nTpTotalB", headerName: "产量乙累计", minWidth: 110 },
  { colId: "nTpDayC", field: "nTpDayC", headerName: "产量丙当日", minWidth: 110 },
  { colId: "nTpTotalC", field: "nTpTotalC", headerName: "产量丙累计", minWidth: 110 },
  { colId: "nSlabDayAll", field: "nSlabDayAll", headerName: "板坯日合计", minWidth: 110 },
  { colId: "nSlabMonthAll", field: "nSlabMonthAll", headerName: "板坯当月累计", minWidth: 120 },
  { colId: "nSlabRateAll", field: "nSlabRateAll", headerName: "板坯所占比例", minWidth: 120 },
  { colId: "nSlabDayA", field: "nSlabDayA", headerName: "板坯甲当日", minWidth: 110 },
  { colId: "nSlabTotalA", field: "nSlabTotalA", headerName: "板坯甲累计", minWidth: 110 },
  { colId: "nSlabDayB", field: "nSlabDayB", headerName: "板坯乙当日", minWidth: 110 },
  { colId: "nSlabTotalB", field: "nSlabTotalB", headerName: "板坯乙累计", minWidth: 110 },
  { colId: "nSlabDayC", field: "nSlabDayC", headerName: "板坯丙当日", minWidth: 110 },
  { colId: "nSlabTotalC", field: "nSlabTotalC", headerName: "板坯丙累计", minWidth: 110 },
  { colId: "nYieldDayAll", field: "nYieldDayAll", headerName: "成材日合计", minWidth: 110 },
  { colId: "nYieldMonthAll", field: "nYieldMonthAll", headerName: "成材当月累计", minWidth: 120 },
  { colId: "nYieldRateAll", field: "nYieldRateAll", headerName: "成材所占比例", minWidth: 120 },
  { colId: "nYieldDayA", field: "nYieldDayA", headerName: "成材甲当日", minWidth: 110 },
  { colId: "nYieldTotalA", field: "nYieldTotalA", headerName: "成材甲累计", minWidth: 110 },
  { colId: "nYieldDayB", field: "nYieldDayB", headerName: "成材乙当日", minWidth: 110 },
  { colId: "nYieldTotalB", field: "nYieldTotalB", headerName: "成材乙累计", minWidth: 110 },
  { colId: "nYieldDayC", field: "nYieldDayC", headerName: "成材丙当日", minWidth: 110 },
  { colId: "nYieldTotalC", field: "nYieldTotalC", headerName: "成材丙累计", minWidth: 110 },
];

async function query() {
  loading.value = true;
  try {
    const payload = {
      timeRange: toTimeRange(input.dates),
      cTrimFlag: input.cTrimFlag || null,
      cSlabNo: input.cSlabNo.trim() || null,
      cPieceNo: input.cPieceNo.trim() || null,
    };
    rows.value = (await tI1280Api.getTi1280s(payload)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function tabBind() {
  tabLoading.value = true;
  try {
    switch (activeTab.value) {
      case "ccl": {
        cclRows.value = (await tI1280Api.get1280Details({ timeRange: toTimeRange(input.dates2) })) ?? [];
        requestAnimationFrame(() => cclApi.value?.autoSizeAllColumns());
        break;
      }
      case "day": {
        const d = input.dayDate ?? new Date();
        const range: TimeRange = { min: isoLocal(d), max: isoLocal(dayStart(1)) };
        dayProductRows.value = (await tI1280Api.getTi1280DayProductDtos({ timeRange: range })) ?? [];
        requestAnimationFrame(() => dayProductApi.value?.autoSizeAllColumns());
        break;
      }
      case "wgt": {
        wgtRows.value = (await tI1280Api.getTi1280WgtDetails({ timeRange: toTimeRange(input.dates2) })) ?? [];
        requestAnimationFrame(() => wgtApi.value?.autoSizeAllColumns());
        break;
      }
      case "fc": {
        fcRows.value = (await tI1280Api.getTi1280FcDetails({ timeRange: toTimeRange(input.dates2) })) ?? [];
        requestAnimationFrame(() => fcApi.value?.autoSizeAllColumns());
        break;
      }
      case "group": {
        groupRows.value = (await tI1280Api.get1280DayGroupDetails({ timeRange: toTimeRange(input.dates3) })) ?? [];
        requestAnimationFrame(() => groupApi.value?.autoSizeAllColumns());
        break;
      }
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    tabLoading.value = false;
  }
}

function onTabChange() {
  void tabBind();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="50" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">时间范围</label>
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
            <label class="w-18 shrink-0 text-xs text-muted-foreground">切边方式</label>
            <Select
              v-model="input.cTrimFlag"
              :options="trimFlagOptions"
              option-label="label"
              option-value="value"
              show-clear
              placeholder="全部"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">坯料件次号</label>
            <InputText v-model="input.cSlabNo" class="min-w-0 flex-1" @keydown.enter="query" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">成品件次号</label>
            <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" @keydown.enter="query" />
          </div>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">实绩列表</span>
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
            @grid-ready="bindGrid(api)"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 底部工具栏：按页签渲染对应时间控件 + 查询按钮 + 表标题 -->
        <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <template v-if="activeTab === 'day'">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">日期</label>
            <DatePicker v-model="input.dayDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="w-44" />
          </template>
          <template v-else-if="activeTab === 'group'">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">时间范围</label>
            <DatePicker
              v-model="input.dates3"
              selection-mode="range"
              :manual-input="false"
              date-format="yy-mm-dd"
              show-time
              hour-format="24"
              show-icon
              placeholder="开始 至 结束"
              class="min-w-0 flex-1"
            />
          </template>
          <template v-else>
            <label class="w-18 shrink-0 text-xs text-muted-foreground">时间范围</label>
            <DatePicker
              v-model="input.dates2"
              selection-mode="range"
              :manual-input="false"
              date-format="yy-mm-dd"
              show-time
              hour-format="24"
              show-icon
              placeholder="开始 至 结束"
              class="min-w-0 flex-1"
            />
          </template>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="tabLoading" @click="tabBind">
            <IconSearch class="h-3 w-3" />查询
          </Button>
        </div>
        <Tabs v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:value="onTabChange">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab value="ccl">成材率</Tab>
              <Tab value="day">成材率日汇总</Tab>
              <Tab value="wgt">重量合格情况</Tab>
              <Tab value="fc">坯料负差明细</Tab>
              <Tab value="group">班组成材率日汇总</Tab>
            </TabList>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel value="ccl" class="h-full overflow-hidden p-0">
              <div class="min-h-0 h-full">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="cclDefs"
                  :row-data="cclRows"
                  :loading="tabLoading"
                  @grid-ready="bindGrid(cclApi)"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </TabPanel>
            <TabPanel value="day" class="h-full overflow-hidden p-0">
              <div class="min-h-0 h-full">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="dayProductDefs"
                  :row-data="dayProductRows"
                  :loading="tabLoading"
                  @grid-ready="bindGrid(dayProductApi)"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </TabPanel>
            <TabPanel value="wgt" class="h-full overflow-hidden p-0">
              <div class="min-h-0 h-full">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="wgtDefs"
                  :row-data="wgtRows"
                  :loading="tabLoading"
                  @grid-ready="bindGrid(wgtApi)"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </TabPanel>
            <TabPanel value="fc" class="h-full overflow-hidden p-0">
              <div class="min-h-0 h-full">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="fcDefs"
                  :row-data="fcRows"
                  :loading="tabLoading"
                  @grid-ready="bindGrid(fcApi)"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </TabPanel>
            <TabPanel value="group" class="h-full overflow-hidden p-0">
              <div class="min-h-0 h-full">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="groupDefs"
                  :row-data="groupRows"
                  :loading="tabLoading"
                  @grid-ready="bindGrid(groupApi)"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
