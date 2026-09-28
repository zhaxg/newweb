<script setup lang="ts">
/** 对应 FrmTI1240（出炉温度实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1240
 *  已接入：tI1240Api.queryTi1240（主表·出炉温度负差）；queryDetail（汇总明细页签）；queryYearDetial（年汇总明细页签）
 *  待接入：无
 *  偏差：主表 Ti1240Dto；汇总/年汇总为分组表头（T≤±10℃/±10＜T≤±20℃/其他/≤±20℃，每组 支数+命中率），命中率按 {0}% 格式化；
 *        年汇总时间范围取 [今年1月1日, 明天]；本页 精轧责任者A 为文本框（原 ImageComboBoxEdit→TextEdit，无 KV 灌值）；
 *        班组下拉逐字照 C# 硬编码 甲→A/乙→B/丙→C（TiShiftGroupEnum 大写）；
 *        「抽钢责任者姓名」缩「抽钢责任者」、「生产时间区间」缩「生产时间」统一 w-18。*/

import { reactive, ref, shallowRef, watch } from "vue";
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
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import {
  tI1240Api,
  type DtoTi1210Query,
  type Ti1240Dto,
  type Ti1240DetailDto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

interface Ti1240Query extends DtoTi1210Query {
  cZpNo?: string | null;
  cSlabNo?: string | null;
}

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function dayStart(offsetDays = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}
function toRange(beg: Date, end: Date): TimeRange {
  return { min: isoLocal(beg), max: isoLocal(end) };
}
function yearRange(): TimeRange {
  const now = new Date();
  return toRange(new Date(now.getFullYear(), 0, 1, 0, 0, 0), dayStart(1));
}

const input = reactive({
  cOutSteelAuthorName: "",
  cFmAuthorA: "",
  cFmAuthorB: "",
  cRmAuthorA: "",
  cRmAuthorB: "",
  cShiftGroup: null as string | null,
  cZpNo: "",
  cSlabNo: "",
  dates: [dayStart(0), dayStart(1)] as Date[] | null,
});
const groupOptions = [
  { label: "甲", value: "A" },
  { label: "乙", value: "B" },
  { label: "丙", value: "C" },
];

function buildQuery(): Ti1240Query {
  return {
    cOutSteelAuthorName: input.cOutSteelAuthorName.trim() || null,
    cFmAuthorA: input.cFmAuthorA.trim() || null,
    cFmAuthorB: input.cFmAuthorB.trim() || null,
    cRmAuthorA: input.cRmAuthorA.trim() || null,
    cRmAuthorB: input.cRmAuthorB.trim() || null,
    cShiftGroup: input.cShiftGroup || null,
    cZpNo: input.cZpNo.trim() || null,
    cSlabNo: input.cSlabNo.trim() || null,
    timeRange:
      input.dates && input.dates.length >= 2 ? toRange(input.dates[0], input.dates[input.dates.length - 1]) : undefined,
  };
}

/* ---------- 主表 ---------- */
const mainRows = shallowRef<Ti1240Dto[]>([]);
const mainApi = ref<GridApi | null>(null);
const mainColDefs: ColDef[] = [
  { field: "cShiftNo", headerName: "班次", minWidth: 80 },
  { field: "cShiftGroup", headerName: "班组", minWidth: 80 },
  { field: "cZpNo", headerName: "组批号", minWidth: 100 },
  { field: "cSlabNo", headerName: "板坯号", minWidth: 100 },
  { field: "nOrderThick", headerName: "订单厚", minWidth: 88 },
  { field: "nOrderWidth", headerName: "订单宽", minWidth: 88 },
  { field: "nOrderLen", headerName: "订单长", minWidth: 88 },
  { field: "nExitFurTempSj", headerName: "实绩出炉温度", minWidth: 110 },
  { field: "nPlanExitFurTemp", headerName: "目标出炉温度", minWidth: 110 },
  { field: "tol", headerName: "公差数据", minWidth: 88 },
  { field: "dFurEndTime", headerName: "出炉时间", minWidth: 140 },
  { field: "dFurStartTime", headerName: "入炉时间", minWidth: 140 },
];

/* ---------- 明细（Ti1240DetailDto，分组表头） ---------- */
const rateFmt = (p: { value: unknown }) => (p.value == null || p.value === "" ? "" : `${p.value}%`);
function rateGroup(title: string, quaField: string, rateField: string): ColDef {
  return {
    headerName: title,
    children: [
      { field: quaField, headerName: "支数", minWidth: 72 },
      { field: rateField, headerName: "命中率", minWidth: 82, valueFormatter: rateFmt },
    ],
  };
}
const detailGroups: ColDef[] = [
  rateGroup("T≤±10℃", "nQua1", "hitRate1"),
  rateGroup("±10＜T≤±20℃", "nQua2", "hitRate2"),
  rateGroup("其他", "nQua3", "hitRate3"),
  rateGroup("≤±20℃", "nQua4", "hitRate4"),
];
const sumColDefs: ColDef[] = [
  { field: "nQuaAll", headerName: "轧制量", minWidth: 88 },
  ...detailGroups,
  { field: "cShiftGroup", headerName: "班组", minWidth: 80 },
  { field: "dFurStartTime", headerName: "入炉时间", minWidth: 140 },
  { field: "dFurEndTime", headerName: "出炉时间", minWidth: 140 },
];
const yearColDefs: ColDef[] = [
  { field: "cDateTime", headerName: "日期", minWidth: 110 },
  { field: "nQuaAll", headerName: "出炉量", minWidth: 88 },
  ...detailGroups,
];

const sumRows = shallowRef<Ti1240DetailDto[]>([]);
const yearRows = shallowRef<Ti1240DetailDto[]>([]);
const sumApi = ref<GridApi | null>(null);
const yearApi = ref<GridApi | null>(null);
const activeTab = ref(0);
const loading = ref(false);

async function dataBind() {
  loading.value = true;
  try {
    if (activeTab.value === 0) {
      sumRows.value = (await tI1240Api.queryDetail(buildQuery())) ?? [];
      requestAnimationFrame(() => sumApi.value?.autoSizeAllColumns());
    } else {
      yearRows.value = (await tI1240Api.queryYearDetial(yearRange())) ?? [];
      requestAnimationFrame(() => yearApi.value?.autoSizeAllColumns());
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function onQuery() {
  loading.value = true;
  try {
    mainRows.value = (await tI1240Api.queryTi1240(buildQuery())) ?? [];
    requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
  await dataBind();
}

watch(activeTab, () => void dataBind());

const makeReady = (api: { value: GridApi | null }) => (e: GridReadyEvent) => {
  api.value = e.api;
};
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">抽钢责任者</label>
        <InputText v-model="input.cOutSteelAuthorName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">精轧责任者A</label>
        <InputText v-model="input.cFmAuthorA" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">精轧责任者B</label>
        <InputText v-model="input.cFmAuthorB" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">粗轧责任者A</label>
        <InputText v-model="input.cRmAuthorA" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">粗轧责任者B</label>
        <InputText v-model="input.cRmAuthorB" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">班组</label>
        <Select
          v-model="input.cShiftGroup"
          :options="groupOptions"
          option-label="label"
          option-value="value"
          :show-clear="true"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cZpNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-18 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.cSlabNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
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
      <div class="flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">负差列表</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="mainColDefs"
            :row-data="mainRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true }"
            :loading="loading"
            @grid-ready="makeReady(mainApi)"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab :value="0">汇总明细</Tab>
              <Tab :value="1">年汇总明细</Tab>
            </TabList>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel :value="0" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="sumColDefs"
                :row-data="sumRows"
                :loading="loading"
                @grid-ready="makeReady(sumApi)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel :value="1" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="yearColDefs"
                :row-data="yearRows"
                :loading="loading"
                @grid-ready="makeReady(yearApi)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
