<script setup lang="ts">
/** 对应 FrmTI1210（厚度负差实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1210
 *  已接入：tI1210Api.getTi1210Dtos（主表·负差实绩列表）；getTi1211Dtos（汇总/日/周/月明细，4 页签共用 Ti1211Dto）；
 *          getTi1211MonthRank（班组月排名）；getTi1211AuthorRank（个人月排名）；
 *          systemKeyValueApi.querySysKvItemList("A0000:ZGAUTHOR")（精轧责任者A 下拉，取 cGroup=="JZ"，对应 C# Load）
 *  待接入：无
 *  偏差：主表按 C# GetTi1210Dtos 实际返回的 Thr3010Fcdetail 列集渲染（提取器标注的绑定实体）；班组下拉逐字照 C# 硬编码
 *        甲→B/乙→A/丙→C（TiFurShiftGroupEnum，注意与 1220/1230/1240 的甲→A 不同，原样保留）；
 *        月排名/个人排名页签的 AvgHitRate 按 C# RowCellStyle 上色（≥95 绿、85~95 橙、其余红）；
 *        「抽钢责任者姓名」缩为「抽钢责任者」、「生产时间区间」缩为「生产时间」以整页统一 w-18。*/

import { onMounted, reactive, ref, shallowRef, watch } from "vue";
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
import type { CellClassParams, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { systemKeyValueApi, type HmxKv } from "@/api/admin/request";
import {
  tI1210Api,
  type DtoTi1210Query,
  type Thr3010Fcdetail,
  type Ti1211Dto,
  type Ti1211RankDto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

/* ---------- 查询条件（DtoTi1210Query，含 C# 侧的 CZpNo/CSlabNo） ---------- */
interface Ti1210Query extends DtoTi1210Query {
  cZpNo?: string | null;
  cSlabNo?: string | null;
}

/* ---------- 时间工具 ---------- */
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

const input = reactive({
  cOutSteelAuthorName: "",
  cFmAuthorA: null as string | null,
  cFmAuthorB: "",
  cRmAuthorA: "",
  cRmAuthorB: "",
  cShiftGroup: null as string | null,
  cZpNo: "",
  cSlabNo: "",
  dates: [dayStart(0), dayStart(1)] as Date[] | null,
});

/* 精轧责任者A（KV 灌值）与 班组（C# 硬编码，注意甲→B/乙→A/丙→C） */
const authorOptions = ref<{ label: string; value: string }[]>([]);
const groupOptions = [
  { label: "甲", value: "B" },
  { label: "乙", value: "A" },
  { label: "丙", value: "C" },
];

function buildQuery(timeRange?: TimeRange): Ti1210Query {
  const base: Ti1210Query = {
    cOutSteelAuthorName: input.cOutSteelAuthorName.trim() || null,
    cFmAuthorA: input.cFmAuthorA || null,
    cFmAuthorB: input.cFmAuthorB.trim() || null,
    cRmAuthorA: input.cRmAuthorA.trim() || null,
    cRmAuthorB: input.cRmAuthorB.trim() || null,
    cShiftGroup: input.cShiftGroup || null,
    cZpNo: input.cZpNo.trim() || null,
    cSlabNo: input.cSlabNo.trim() || null,
    timeRange:
      timeRange ??
      (input.dates && input.dates.length >= 2
        ? toRange(input.dates[0], input.dates[input.dates.length - 1])
        : undefined),
  };
  return base;
}

/* ---------- 主表 ---------- */
const mainRows = shallowRef<Thr3010Fcdetail[]>([]);
const mainApi = ref<GridApi | null>(null);
const mainColDefs: ColDef[] = [
  { field: "cFmAuthorA", headerName: "精轧责任者A", minWidth: 100 },
  { field: "cShiftNo", headerName: "轧制班次", minWidth: 88 },
  { field: "cShiftGroup", headerName: "轧制班组", minWidth: 88 },
  { field: "cBatchNo", headerName: "组批号", minWidth: 100 },
  { field: "cPieceNo", headerName: "板坯号", minWidth: 100 },
  { field: "cSgCode", headerName: "钢种", minWidth: 88 },
  { field: "nThickSj", headerName: "实际厚度", minWidth: 88 },
  { field: "nThick", headerName: "订单厚度", minWidth: 88 },
  { field: "nWidth", headerName: "订单宽度", minWidth: 88 },
  { field: "nLen", headerName: "订单长度", minWidth: 88 },
  { field: "nPlanThickMin", headerName: "目标厚度下限", minWidth: 100 },
  { field: "nPlanThickMax", headerName: "目标厚度上限", minWidth: 100 },
  { field: "nThickHitrate", headerName: "厚度命中率", minWidth: 96 },
  { field: "nThickTol", headerName: "厚度公差", minWidth: 88 },
  { field: "nThicjTolSwitch", headerName: "厚度是否超内控公差范围", minWidth: 160 },
  { field: "cTol", headerName: "公差", minWidth: 88 },
  { field: "dRollingTimeStart", headerName: "轧制开始时间", minWidth: 140 },
  { field: "dRollingTimeEnd", headerName: "轧制结束时间", minWidth: 140 },
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cPlateNo", headerName: "钢板号", hide: true },
  { field: "dProductTime", headerName: "生产时间", hide: true },
  { field: "cAuthor", headerName: "抽钢责任者", hide: true },
  { field: "cRmAuthorA", headerName: "粗轧责任者A", hide: true },
  { field: "cRmAuthorB", headerName: "粗轧责任者B", hide: true },
  { field: "cFmAuthorB", headerName: "精轧责任者B", hide: true },
  { field: "cOrderNo", headerName: "订单号", hide: true },
];

/* ---------- 页签明细（Ti1211Dto，汇总/日/周/月共用列集） ---------- */
function fillApi(api: { value: GridApi | null }) {
  requestAnimationFrame(() => api.value?.autoSizeAllColumns());
}
const sumColDefs: ColDef[] = [
  { field: "cShiftGroup", headerName: "班组", minWidth: 80 },
  { field: "nQua", headerName: "块数", minWidth: 80 },
  { field: "cFmAuthorA", headerName: "精轧责任者A", minWidth: 100 },
  { field: "nOrderThickAvg", headerName: "合同平均厚度", minWidth: 110 },
  { field: "nThickAvg", headerName: "平均厚度", minWidth: 90 },
  { field: "nPlanThickMin", headerName: "目标厚度下限", minWidth: 100 },
  { field: "nPlanThickMax", headerName: "目标厚度上限", minWidth: 100 },
  { field: "hitRate", headerName: "命中率", minWidth: 88 },
  { field: "superMax", headerName: "超上限比例", minWidth: 100 },
  { field: "superMin", headerName: "超下限比例", minWidth: 100 },
  { field: "dRollingTimeStart", headerName: "轧制开始时间", minWidth: 140 },
  { field: "dRollingTimeEnd", headerName: "轧制结束时间", minWidth: 140 },
  { field: "cOutSteelAuthor", headerName: "抽钢责任者姓名", hide: true },
  { field: "cFmAuthorB", headerName: "精轧责任者B", hide: true },
  { field: "cRmAuthorA", headerName: "粗轧责任者A", hide: true },
  { field: "cRmAuthorB", headerName: "粗轧责任者B", hide: true },
];

const sumRows0 = shallowRef<Ti1211Dto[]>([]);
const sumRows1 = shallowRef<Ti1211Dto[]>([]);
const sumRows2 = shallowRef<Ti1211Dto[]>([]);
const sumRows3 = shallowRef<Ti1211Dto[]>([]);
const sumApi0 = ref<GridApi | null>(null);
const sumApi1 = ref<GridApi | null>(null);
const sumApi2 = ref<GridApi | null>(null);
const sumApi3 = ref<GridApi | null>(null);

/* ---------- 排名页签（Ti1211RankDto，AvgHitRate 上色） ---------- */
const rateStyle = (p: CellClassParams): string | undefined => {
  const v = Number(p.value);
  if (Number.isNaN(v)) return undefined;
  if (v >= 95 && v <= 100) return "bg-green-200 text-green-900";
  if (v >= 85) return "bg-orange-400 text-orange-950";
  return "bg-red-500 text-white";
};
const rankMonthColDefs: ColDef[] = [
  { field: "cShiftGroup", headerName: "班组", minWidth: 100 },
  { field: "avgHitRate", headerName: "平均命中率", minWidth: 110, cellClass: rateStyle },
];
const rankAuthorColDefs: ColDef[] = [
  { field: "cAuthor", headerName: "责任者", minWidth: 100 },
  { field: "cShiftGroup", headerName: "班组", minWidth: 100 },
  { field: "avgHitRate", headerName: "平均命中率", minWidth: 110, cellClass: rateStyle },
];
const rankMonthRows = shallowRef<Ti1211RankDto[]>([]);
const rankAuthorRows = shallowRef<Ti1211RankDto[]>([]);
const rankMonthApi = ref<GridApi | null>(null);
const rankAuthorApi = ref<GridApi | null>(null);

const tabRefs = [sumApi0, sumApi1, sumApi2, sumApi3, rankMonthApi, rankAuthorApi];
const activeTab = ref(0);
const loading = ref(false);

/* ---------- 明细联动（原 DataBind，按页签切接口与时间范围） ---------- */
async function dataBind() {
  loading.value = true;
  try {
    const idx = activeTab.value;
    if (idx <= 3) {
      let range = buildQuery().timeRange;
      if (idx === 1) range = toRange(dayStart(0), dayStart(1));
      else if (idx === 2) {
        const wstart = dayStart(-new Date().getDay());
        range = toRange(wstart, dayStart(-new Date().getDay() + 7));
      } else if (idx === 3) {
        range = toRange(dayStart(1 - new Date().getDate()), dayStart(1));
      }
      const q = buildQuery(range);
      const list = (await tI1210Api.getTi1211Dtos(q)) ?? [];
      if (idx === 0) sumRows0.value = list;
      else if (idx === 1) sumRows1.value = list;
      else if (idx === 2) sumRows2.value = list;
      else sumRows3.value = list;
      fillApi(tabRefs[idx]);
    } else {
      const q = buildQuery(toRange(dayStart(1 - new Date().getDate()), dayStart(1)));
      if (idx === 4) {
        rankMonthRows.value = (await tI1210Api.getTi1211MonthRank(q)) ?? [];
        fillApi(rankMonthApi);
      } else {
        rankAuthorRows.value = (await tI1210Api.getTi1211AuthorRank(q)) ?? [];
        fillApi(rankAuthorApi);
      }
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
    mainRows.value = (await tI1210Api.getTi1210Dtos(buildQuery())) ?? [];
    requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
  await dataBind();
}

watch(activeTab, () => void dataBind());

function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}
const makeReady = (api: { value: GridApi | null }) => (e: GridReadyEvent) => {
  api.value = e.api;
};

onMounted(async () => {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList("A0000:ZGAUTHOR")) ?? [];
    authorOptions.value = list
      .filter((k: HmxKv) => k.cGroup === "JZ")
      .map((k: HmxKv) => ({ label: k.cName ?? k.cCode ?? "", value: k.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
});
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
        <Select
          v-model="input.cFmAuthorA"
          :options="authorOptions"
          option-label="label"
          option-value="value"
          :show-clear="true"
          class="min-w-0 flex-1"
        />
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
      <SplitterPanel :size="55" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">负差实绩列表</span>
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
            @grid-ready="onMainReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="45" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab :value="0">汇总明细</Tab>
              <Tab :value="1">日汇总明细</Tab>
              <Tab :value="2">周汇总明细</Tab>
              <Tab :value="3">月汇总明细</Tab>
              <Tab :value="4">班组月排名</Tab>
              <Tab :value="5">个人月排名</Tab>
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
                :row-data="sumRows0"
                :loading="loading"
                @grid-ready="makeReady(sumApi0)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel :value="1" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="sumColDefs"
                :row-data="sumRows1"
                :loading="loading"
                @grid-ready="makeReady(sumApi1)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel :value="2" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="sumColDefs"
                :row-data="sumRows2"
                :loading="loading"
                @grid-ready="makeReady(sumApi2)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel :value="3" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="sumColDefs"
                :row-data="sumRows3"
                :loading="loading"
                @grid-ready="makeReady(sumApi3)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel :value="4" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="rankMonthColDefs"
                :row-data="rankMonthRows"
                :loading="loading"
                @grid-ready="makeReady(rankMonthApi)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel :value="5" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="rankAuthorColDefs"
                :row-data="rankAuthorRows"
                :loading="loading"
                @grid-ready="makeReady(rankAuthorApi)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
