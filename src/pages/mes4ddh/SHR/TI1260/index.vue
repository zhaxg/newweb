<script setup lang="ts">
/** 对应 FrmTI1260（ACC温度实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1260
 *  已接入：tI1260Api.queryTi1260（主表：负差列表）
 *        · tI1260Api.queryDetail（页签1 汇总明细）· tI1260Api.queryYearDetial（页签2 年汇总明细，固定本月起→明天）
 *  待接入：无
 *  偏差：原 XtraTabControl 页签在顶部；年汇总时间范围按 C# 固定本月首日至明天，不随查询区联动；默认区间为 [今天-7天, 明天]；
 *        组批号/板坯号随查询对象一并提交（web DtoTi1210Query 未声明该两字段，后端按名绑定）；班组以 A/B/C→甲/乙/丙 展示 */

import { reactive, ref, shallowRef } from "vue";
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
import { tI1260Api, type Thr3010Fcdetail, type TimeRange, type Ti1260DetailDto } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const loading = ref(false);
const activeTab = ref("hz");

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
function yearRange(): TimeRange {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  return { min: isoLocal(first), max: isoLocal(dayStart(1)) };
}
const groupFmt = (p: ValueFormatterParams) =>
  (({ A: "甲", B: "乙", C: "丙" }) as Record<string, string>)[String(p.value)] ?? p.value ?? "";

/* ---------- 查询条件（默认 [今天-7, 明天]） ---------- */
const input = reactive({
  dates: [dayStart(-7), dayStart(1)] as Date[] | null,
  cOutSteelAuthorName: "",
  cFmAuthorA: "",
  cFmAuthorB: "",
  cRmAuthorA: "",
  cRmAuthorB: "",
  cShiftGroup: null as string | null,
  cZpNo: "",
  cSlabNo: "",
});
const shiftGroupOptions = [
  { label: "甲", value: "A" },
  { label: "乙", value: "B" },
  { label: "丙", value: "C" },
];

function buildDto() {
  return {
    timeRange: toTimeRange(input.dates),
    cOutSteelAuthorName: input.cOutSteelAuthorName.trim() || null,
    cFmAuthorA: input.cFmAuthorA.trim() || null,
    cFmAuthorB: input.cFmAuthorB.trim() || null,
    cRmAuthorA: input.cRmAuthorA.trim() || null,
    cRmAuthorB: input.cRmAuthorB.trim() || null,
    cShiftGroup: input.cShiftGroup || null,
    cZpNo: input.cZpNo.trim() || null,
    cSlabNo: input.cSlabNo.trim() || null,
  };
}

const rows = shallowRef<Thr3010Fcdetail[]>([]);
const hzRows = shallowRef<Ti1260DetailDto[]>([]);
const yearRows = shallowRef<Ti1260DetailDto[]>([]);
const api = ref<GridApi | null>(null);
const hzApi = ref<GridApi | null>(null);
const yearApi = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onHzReady(e: GridReadyEvent) {
  hzApi.value = e.api;
}
function onYearReady(e: GridReadyEvent) {
  yearApi.value = e.api;
}

const mainDefs: ColDef[] = [
  { colId: "cFastcoldShiftNo", field: "cFastcoldShiftNo", headerName: "超快冷班次", minWidth: 110 },
  {
    colId: "cFastcoldShiftGroup",
    field: "cFastcoldShiftGroup",
    headerName: "超快冷班组",
    minWidth: 110,
    valueFormatter: groupFmt,
  },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "组批号", minWidth: 130 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "板坯号", minWidth: 130 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", minWidth: 100 },
  { colId: "nThick", field: "nThick", headerName: "订单厚度", minWidth: 100 },
  { colId: "nWidth", field: "nWidth", headerName: "订单宽度", minWidth: 100 },
  { colId: "nLen", field: "nLen", headerName: "订单长度", minWidth: 100 },
  { colId: "nPlanStcoldTemp", field: "nPlanStcoldTemp", headerName: "目标开冷温度", minWidth: 120 },
  { colId: "nStcoldTemp", field: "nStcoldTemp", headerName: "实际开冷温度", minWidth: 120 },
  { colId: "nStcoldTempTol", field: "nStcoldTempTol", headerName: "开冷温度公差", minWidth: 120 },
  { colId: "nPlanendColdTemp", field: "nPlanendColdTemp", headerName: "目标终冷温度", minWidth: 120 },
  { colId: "nEndcoldTemp", field: "nEndcoldTemp", headerName: "实际终冷温度", minWidth: 120 },
  { colId: "nEndcoldTempTol", field: "nEndcoldTempTol", headerName: "终冷温度公差", minWidth: 120 },
  { colId: "cTol", field: "cTol", headerName: "公差", minWidth: 90 },
  { colId: "dFastcoldStart", field: "dFastcoldStart", headerName: "开冷时间", minWidth: 160 },
  { colId: "dFastcoldEnd", field: "dFastcoldEnd", headerName: "终冷时间", minWidth: 160 },
  { colId: "creator", field: "creator", headerName: "创建人", minWidth: 90, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", minWidth: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", minWidth: 100, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", minWidth: 150, hide: true },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", minWidth: 130, hide: true },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", minWidth: 140, hide: true },
];

const hzDefs: ColDef[] = [
  { colId: "dDayDate", field: "dDayDate", headerName: "日期", minWidth: 140 },
  { colId: "nQuaAll", field: "nQuaAll", headerName: "轧制支数", minWidth: 100 },
  { colId: "nStartColdQua1", field: "nStartColdQua1", headerName: "开冷档1支数", minWidth: 110 },
  { colId: "startColdHitRate1", field: "startColdHitRate1", headerName: "开冷档1命中率", minWidth: 120 },
  { colId: "nStartColdQua2", field: "nStartColdQua2", headerName: "开冷档2支数", minWidth: 110 },
  { colId: "startColdHitRate2", field: "startColdHitRate2", headerName: "开冷档2命中率", minWidth: 120 },
  { colId: "nStartColdQua3", field: "nStartColdQua3", headerName: "开冷档3支数", minWidth: 110 },
  { colId: "startColdHitRate3", field: "startColdHitRate3", headerName: "开冷档3命中率", minWidth: 120 },
  { colId: "nStartColdQua4", field: "nStartColdQua4", headerName: "开冷档4支数", minWidth: 110 },
  { colId: "startColdHitRate4", field: "startColdHitRate4", headerName: "开冷档4命中率", minWidth: 120 },
  { colId: "nEndColdQua1", field: "nEndColdQua1", headerName: "终冷档1支数", minWidth: 110 },
  { colId: "endColdHitRate1", field: "endColdHitRate1", headerName: "终冷档1命中率", minWidth: 120 },
  { colId: "nEndColdQua2", field: "nEndColdQua2", headerName: "终冷档2支数", minWidth: 110 },
  { colId: "endColdHitRate2", field: "endColdHitRate2", headerName: "终冷档2命中率", minWidth: 120 },
  { colId: "nEndColdQua3", field: "nEndColdQua3", headerName: "终冷档3支数", minWidth: 110 },
  { colId: "endColdHitRate3", field: "endColdHitRate3", headerName: "终冷档3命中率", minWidth: 120 },
  { colId: "nEndColdQua4", field: "nEndColdQua4", headerName: "终冷档4支数", minWidth: 110 },
  { colId: "endColdHitRate4", field: "endColdHitRate4", headerName: "终冷档4命中率", minWidth: 120 },
  { colId: "nEndColdQua5", field: "nEndColdQua5", headerName: "终冷档5支数", minWidth: 110 },
  { colId: "endColdHitRate5", field: "endColdHitRate5", headerName: "终冷档5命中率", minWidth: 120 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", minWidth: 90, valueFormatter: groupFmt },
  { colId: "dColdStartTime", field: "dColdStartTime", headerName: "开冷时间", minWidth: 160 },
  { colId: "dColdEndTime", field: "dColdEndTime", headerName: "终冷时间", minWidth: 160 },
];

const yearDefs: ColDef[] = [
  { colId: "cDateTime", field: "cDateTime", headerName: "统计周期", minWidth: 140 },
  { colId: "nQuaAll", field: "nQuaAll", headerName: "轧制支数", minWidth: 100 },
  { colId: "nStartColdQua1", field: "nStartColdQua1", headerName: "开冷档1支数", minWidth: 110 },
  { colId: "startColdHitRate1", field: "startColdHitRate1", headerName: "开冷档1命中率", minWidth: 120 },
  { colId: "nStartColdQua2", field: "nStartColdQua2", headerName: "开冷档2支数", minWidth: 110 },
  { colId: "startColdHitRate2", field: "startColdHitRate2", headerName: "开冷档2命中率", minWidth: 120 },
  { colId: "nStartColdQua3", field: "nStartColdQua3", headerName: "开冷档3支数", minWidth: 110 },
  { colId: "startColdHitRate3", field: "startColdHitRate3", headerName: "开冷档3命中率", minWidth: 120 },
  { colId: "nStartColdQua4", field: "nStartColdQua4", headerName: "开冷档4支数", minWidth: 110 },
  { colId: "startColdHitRate4", field: "startColdHitRate4", headerName: "开冷档4命中率", minWidth: 120 },
  { colId: "nEndColdQua1", field: "nEndColdQua1", headerName: "终冷档1支数", minWidth: 110 },
  { colId: "endColdHitRate1", field: "endColdHitRate1", headerName: "终冷档1命中率", minWidth: 120 },
  { colId: "nEndColdQua2", field: "nEndColdQua2", headerName: "终冷档2支数", minWidth: 110 },
  { colId: "endColdHitRate2", field: "endColdHitRate2", headerName: "终冷档2命中率", minWidth: 120 },
  { colId: "nEndColdQua3", field: "nEndColdQua3", headerName: "终冷档3支数", minWidth: 110 },
  { colId: "endColdHitRate3", field: "endColdHitRate3", headerName: "终冷档3命中率", minWidth: 120 },
  { colId: "nEndColdQua4", field: "nEndColdQua4", headerName: "终冷档4支数", minWidth: 110 },
  { colId: "endColdHitRate4", field: "endColdHitRate4", headerName: "终冷档4命中率", minWidth: 120 },
  { colId: "nEndColdQua5", field: "nEndColdQua5", headerName: "终冷档5支数", minWidth: 110 },
  { colId: "endColdHitRate5", field: "endColdHitRate5", headerName: "终冷档5命中率", minWidth: 120 },
  {
    colId: "cShiftGroup",
    field: "cShiftGroup",
    headerName: "班组",
    minWidth: 90,
    hide: true,
    valueFormatter: groupFmt,
  },
  { colId: "dColdStartTime", field: "dColdStartTime", headerName: "开冷时间", minWidth: 160, hide: true },
  { colId: "dColdEndTime", field: "dColdEndTime", headerName: "终冷时间", minWidth: 160, hide: true },
];

async function query() {
  loading.value = true;
  try {
    rows.value = (await tI1260Api.queryTi1260(buildDto())) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
  await dataBind();
}

async function dataBind() {
  try {
    if (activeTab.value === "hz") {
      hzRows.value = (await tI1260Api.queryDetail(buildDto())) ?? [];
      requestAnimationFrame(() => hzApi.value?.autoSizeAllColumns());
    } else {
      yearRows.value = (await tI1260Api.queryYearDetial(yearRange())) ?? [];
      requestAnimationFrame(() => yearApi.value?.autoSizeAllColumns());
    }
  } catch {
    /* 拦截层已 toast */
  }
}

function onTabChange() {
  void dataBind();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="50" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">生产时间</label>
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
            <label class="w-18 shrink-0 text-xs text-muted-foreground">抽钢责任者</label>
            <InputText v-model="input.cOutSteelAuthorName" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">精轧责任者A</label>
            <InputText v-model="input.cFmAuthorA" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">精轧责任者B</label>
            <InputText v-model="input.cFmAuthorB" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">粗轧责任者A</label>
            <InputText v-model="input.cRmAuthorA" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">粗轧责任者B</label>
            <InputText v-model="input.cRmAuthorB" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">班组</label>
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
            <label class="w-18 shrink-0 text-xs text-muted-foreground">组批号</label>
            <InputText v-model="input.cZpNo" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">板坯号</label>
            <InputText v-model="input.cSlabNo" class="min-w-0 flex-1" />
          </div>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">负差列表</span>
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

      <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <Tabs v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:value="onTabChange">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab value="hz">汇总明细</Tab>
              <Tab value="year">年汇总明细</Tab>
            </TabList>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel value="hz" class="h-full overflow-hidden p-0">
              <div class="min-h-0 h-full">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="hzDefs"
                  :row-data="hzRows"
                  :loading="loading"
                  @grid-ready="onHzReady"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </TabPanel>
            <TabPanel value="year" class="h-full overflow-hidden p-0">
              <div class="min-h-0 h-full">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="yearDefs"
                  :row-data="yearRows"
                  :loading="loading"
                  @grid-ready="onYearReady"
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
