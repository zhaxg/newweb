<script setup lang="ts">
/** 对应 FrmTI1230（长度实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1230
 *  已接入：tI1230Api.queryTi1230（主表·长度负差）；queryDetail（汇总明细页签）；queryYearDetial（年汇总明细页签）；
 *          systemKeyValueApi.querySysKvItemList("A0000:ZGAUTHOR")（精轧责任者A 下拉，取 cGroup=="JZ"）
 *  待接入：无
 *  偏差：主表按 C# QueryTi1230 返回的 Thr3010Fcdetail 列集渲染；汇总/年汇总为分组表头（0＜长度≤5mm/5＜长度≤8mm/8＜长度≤10mm/
 *        其他/一次命中，每组 支数+命中率），命中率按 C# {0}% 格式化；年汇总时间范围取 [今年1月1日, 明天]；
 *        责任者下拉候选由 KV 灌值；「抽钢责任者姓名」缩「抽钢责任者」、「生产时间区间」缩「生产时间」统一 w-18。*/

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
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { systemKeyValueApi, type HmxKv } from "@/api/admin/request";
import {
  tI1230Api,
  type DtoTi1210Query,
  type Thr3010Fcdetail,
  type TimeRange,
  type Ti1230Detail,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

interface Ti1230Query extends DtoTi1210Query {
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
  cFmAuthorA: null as string | null,
  cFmAuthorB: "",
  cRmAuthorA: "",
  cRmAuthorB: "",
  cShiftGroup: null as string | null,
  cZpNo: "",
  cSlabNo: "",
  dates: [dayStart(0), dayStart(1)] as Date[] | null,
});
const authorOptions = ref<{ label: string; value: string }[]>([]);
const groupOptions = [
  { label: "甲", value: "A" },
  { label: "乙", value: "B" },
  { label: "丙", value: "C" },
];

function buildQuery(): Ti1230Query {
  return {
    cOutSteelAuthorName: input.cOutSteelAuthorName.trim() || null,
    cFmAuthorA: input.cFmAuthorA || null,
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
const mainRows = shallowRef<Thr3010Fcdetail[]>([]);
const mainApi = ref<GridApi | null>(null);
const mainColDefs: ColDef[] = [
  { field: "cFmAuthorA", headerName: "精轧责任者A", minWidth: 100 },
  { field: "cShiftNo", headerName: "轧制班次", minWidth: 88 },
  { field: "cShiftGroup", headerName: "轧制班组", minWidth: 88 },
  { field: "cBatchNo", headerName: "组批号", minWidth: 100 },
  { field: "cPieceNo", headerName: "板坯号", minWidth: 100 },
  { field: "cSgCode", headerName: "钢种", minWidth: 88 },
  { field: "nLenSj", headerName: "实际长度", minWidth: 88 },
  { field: "nThick", headerName: "订单厚度", minWidth: 88 },
  { field: "nWidth", headerName: "订单宽度", minWidth: 88 },
  { field: "nLen", headerName: "订单长度", minWidth: 88 },
  { field: "nLenMin", headerName: "订单长度下限", minWidth: 110 },
  { field: "nLenMax", headerName: "订单长度上限", minWidth: 110 },
  { field: "cLengthType", headerName: "长度类型", minWidth: 88 },
  { field: "nPlanLenMin", headerName: "目标长度下限(内控)", minWidth: 150 },
  { field: "nPlanLenMax", headerName: "目标长度上限(内控)", minWidth: 150 },
  { field: "nLenTol", headerName: "长度公差", minWidth: 88 },
  { field: "cTol", headerName: "公差", minWidth: 88 },
  { field: "dRollingTimeStart", headerName: "轧制开始时间", minWidth: 140 },
  { field: "dRollingTimeEnd", headerName: "轧制结束时间", minWidth: 140 },
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cPlateNo", headerName: "钢板号", hide: true },
  { field: "cAuthor", headerName: "抽钢责任者", hide: true },
  { field: "cRmAuthorA", headerName: "粗轧责任者A", hide: true },
  { field: "cRmAuthorB", headerName: "粗轧责任者B", hide: true },
  { field: "cFmAuthorB", headerName: "精轧责任者B", hide: true },
  { field: "cOrderNo", headerName: "订单号", hide: true },
];

/* ---------- 明细（Ti1230Detail，分组表头） ---------- */
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
  rateGroup("0＜长度≤5mm", "nQua1", "hitRate1"),
  rateGroup("5＜长度≤8mm", "nQua2", "hitRate2"),
  rateGroup("8＜长度≤10mm", "nQua3", "hitRate3"),
  rateGroup("其他", "nQua4", "hitRate4"),
  rateGroup("一次命中", "nQua5", "hitRate5"),
];
const sumColDefs: ColDef[] = [
  { field: "nQuaAll", headerName: "轧制支数", minWidth: 90 },
  ...detailGroups,
  { field: "cFmAuthorA", headerName: "精轧责任者A", minWidth: 100 },
  { field: "cShiftGroup", headerName: "班组", minWidth: 80 },
  { field: "dRollingTimeStart", headerName: "轧制开始时间", minWidth: 140 },
  { field: "dRollingTimeEnd", headerName: "轧制结束时间", minWidth: 140 },
  { field: "cOutSteelAuthor", headerName: "抽钢责任者", hide: true },
  { field: "cFmAuthorB", headerName: "精轧责任者B", hide: true },
  { field: "cRmAuthorA", headerName: "粗轧责任者A", hide: true },
  { field: "cRmAuthorB", headerName: "粗轧责任者B", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
];
const yearColDefs: ColDef[] = [
  { field: "cDateTime", headerName: "日期", minWidth: 110 },
  { field: "nQuaAll", headerName: "轧制支数", minWidth: 90 },
  ...detailGroups,
];

const sumRows = shallowRef<Ti1230Detail[]>([]);
const yearRows = shallowRef<Ti1230Detail[]>([]);
const sumApi = ref<GridApi | null>(null);
const yearApi = ref<GridApi | null>(null);
const activeTab = ref(0);
const loading = ref(false);

async function dataBind() {
  loading.value = true;
  try {
    if (activeTab.value === 0) {
      sumRows.value = (await tI1230Api.queryDetail(buildQuery())) ?? [];
      requestAnimationFrame(() => sumApi.value?.autoSizeAllColumns());
    } else {
      yearRows.value = (await tI1230Api.queryYearDetial(yearRange())) ?? [];
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
    mainRows.value = (await tI1230Api.queryTi1230(buildQuery())) ?? [];
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
      <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">长度负差</span>
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
