<script setup lang="ts">
/** 对应 FrmMS9200（连铸产出实绩查询）：DDH.Winforms.SMS.Forms.FrmMS9200
 *  已接入：mS9200Api.getMS9200sDto（btnQuery → DataBind——产出信息主表）
 *          + mS9200Api.get9200DayHzDtos / get9200GroupHzDtos / get9200StoveHzDtos / get9200SgCodeHzDtos
 *            （HzDataBind——按当前页签选中索引懒加载汇总；xtraTabControl1 SelectedPageChanged 同步重查）
 *  查询条件（原 stackPanel1）：时间范围(UCTimeRange) + 查询；Load 默认=本月 1 日 00:00 ~ 明天 00:00
 *  结构（原 splitContainerControl1 Horizontal=false SplitterPosition=405）：
 *    上=groupControl1「产出信息」gridControl1(MS9200Dtos 17 可见+NCalWgt 隐藏)，
 *    下=groupControl2「汇总信息」xtraTabControl1 四页签：
 *      日信息汇总 gridControl2(7+NCalWgt/CProductStove 隐藏) / 班组产出信息汇总 gridControl3(9+NCalWgt 隐藏) /
 *      炉次信息汇总 gridControl4(8+NCalWgt 隐藏) / 钢种长度信息汇总 gridControl5(10 全可见)
 *  待接入：无 */
import { reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { mS9200Api } from "@/api/mes4ddh/sms.swagger";
import { useMenuQuery } from "@/lib/menuQuery";

useMenuQuery();

type TimeRange = { min?: string; max?: string };

const theme = makeHmxGridTheme();
const querying = ref(false);
const hzLoading = ref(false);
const mainApi = ref<GridApi | null>(null);
const dayApi = ref<GridApi | null>(null);
const groupApi = ref<GridApi | null>(null);
const stoveApi = ref<GridApi | null>(null);
const sgApi = ref<GridApi | null>(null);

const mainRows = ref<Record<string, unknown>[]>([]);
const dayRows = ref<Record<string, unknown>[]>([]);
const groupRows = ref<Record<string, unknown>[]>([]);
const stoveRows = ref<Record<string, unknown>[]>([]);
const sgRows = ref<Record<string, unknown>[]>([]);

/* 主表列（extract gridView1：MS9200Dtos 17 可见 + NCalWgt 隐藏，w=112） */
const mainCols = ref<ColDef[]>([
  { field: "cStove", headerName: "炉号", width: 112 },
  { field: "cSgCode", headerName: "钢种", width: 112 },
  { field: "cPieceSlabNo", headerName: "板坯号", width: 112 },
  { field: "nThick", headerName: "厚度", width: 112 },
  { field: "nWth", headerName: "宽度", width: 112 },
  { field: "nLen", headerName: "长度", width: 112 },
  { field: "cSpec", headerName: "规格", width: 112 },
  { field: "nWgt", headerName: "重量", width: 112 },
  { field: "cIsHot", headerName: "是否热送", width: 112 },
  { field: "cIsDown", headerName: "是否下线", width: 112 },
  { field: "cIsZh", headerName: "是否照核", width: 112 },
  { field: "cShiftNo", headerName: "产出班次", width: 112 },
  { field: "cGroupNo", headerName: "产出班组", width: 112 },
  { field: "dProTime", headerName: "产出时间", width: 112 },
  { field: "dPlanTime", headerName: "计划日期", width: 112 },
  { field: "dFurTime", headerName: "装炉时间", width: 112 },
  { field: "dZhTime", headerName: "照核时间", width: 112 },
  { field: "nCalWgt", headerName: "理论重量", hide: true },
]);

/* 日信息汇总（gridView2：7 可见 + NCalWgt/CProductStove 隐藏） */
const dayCols = ref<ColDef[]>([
  { field: "date", headerName: "日期", width: 112 },
  { field: "nQua", headerName: "块数", width: 112 },
  { field: "nWgt", headerName: "重量", width: 112 },
  { field: "nHotQua", headerName: "热送块数", width: 112 },
  { field: "nHotWgt", headerName: "热送重量", width: 112 },
  { field: "nDownQua", headerName: "下线块数", width: 112 },
  { field: "nDownWgt", headerName: "下线重量", width: 112 },
  { field: "nCalWgt", headerName: "理论重量", hide: true },
  { field: "cProductStove", headerName: "产出炉号汇总", hide: true },
]);

/* 班组产出信息汇总（gridView3：9 可见 + NCalWgt 隐藏） */
const groupCols = ref<ColDef[]>([
  { field: "date", headerName: "日期", width: 112 },
  { field: "cShiftGroup", headerName: "班组", width: 112 },
  { field: "nQua", headerName: "块数", width: 112 },
  { field: "nWgt", headerName: "重量", width: 112 },
  { field: "nHotQua", headerName: "热送块数", width: 112 },
  { field: "nHotWgt", headerName: "热送重量", width: 112 },
  { field: "nDownQua", headerName: "下线块数", width: 112 },
  { field: "nDownWgt", headerName: "下线重量", width: 112 },
  { field: "cProductStove", headerName: "产出炉号汇总", width: 112 },
  { field: "nCalWgt", headerName: "理论重量", hide: true },
]);

/* 炉次信息汇总（gridView4：8 可见 + NCalWgt 隐藏） */
const stoveCols = ref<ColDef[]>([
  { field: "date", headerName: "日期", width: 112 },
  { field: "cStove", headerName: "炉号", width: 112 },
  { field: "nQua", headerName: "块数", width: 112 },
  { field: "nWgt", headerName: "重量", width: 112 },
  { field: "nHotQua", headerName: "热送块数", width: 112 },
  { field: "nHotWgt", headerName: "热送重量", width: 112 },
  { field: "nDownQua", headerName: "下线块数", width: 112 },
  { field: "nDownWgt", headerName: "下线重量", width: 112 },
  { field: "nCalWgt", headerName: "理论重量", hide: true },
]);

/* 钢种长度信息汇总（gridView5：10 全可见） */
const sgCols = ref<ColDef[]>([
  { field: "date", headerName: "日期", width: 112 },
  { field: "cSgCode", headerName: "钢种", width: 112 },
  { field: "nLen", headerName: "长度", width: 112 },
  { field: "nQua", headerName: "块数", width: 112 },
  { field: "nWgt", headerName: "重量", width: 112 },
  { field: "nHotQua", headerName: "热送块数", width: 112 },
  { field: "nHotWgt", headerName: "热送重量", width: 112 },
  { field: "nDownQua", headerName: "下线块数", width: 112 },
  { field: "nDownWgt", headerName: "下线重量", width: 112 },
  { field: "cProductStove", headerName: "产出炉号汇总", width: 112 },
]);

function monthStart(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
}
function tomorrow(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
}
/* 原 Load：TimeRange = 本月 1 日 ~ 明天 */
const q = reactive({ dates: [monthStart(), tomorrow()] as Date[] | null });

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

const activeTab = ref("0");

function readyMain(e: GridReadyEvent) {
  mainApi.value = e.api;
}
function readyDay(e: GridReadyEvent) {
  dayApi.value = e.api;
}
function readyGroup(e: GridReadyEvent) {
  groupApi.value = e.api;
}
function readyStove(e: GridReadyEvent) {
  stoveApi.value = e.api;
}
function readySg(e: GridReadyEvent) {
  sgApi.value = e.api;
}
function autosize(api: GridApi | null) {
  requestAnimationFrame(() => api?.autoSizeAllColumns());
}

/** 原 HzDataBind：按 SelectedTabPageIndex 分发四个汇总接口（每次切换都重查，照 C# 不做缓存） */
async function hzDataBind() {
  const key = activeTab.value;
  hzLoading.value = true;
  try {
    const tr = toTimeRange(q.dates);
    if (key === "0") {
      dayRows.value = ((await mS9200Api.get9200DayHzDtos(tr)) ?? []) as Record<string, unknown>[];
      autosize(dayApi.value);
    } else if (key === "1") {
      groupRows.value = ((await mS9200Api.get9200GroupHzDtos(tr)) ?? []) as Record<string, unknown>[];
      autosize(groupApi.value);
    } else if (key === "2") {
      stoveRows.value = ((await mS9200Api.get9200StoveHzDtos(tr)) ?? []) as Record<string, unknown>[];
      autosize(stoveApi.value);
    } else {
      sgRows.value = ((await mS9200Api.get9200SgCodeHzDtos(tr)) ?? []) as Record<string, unknown>[];
      autosize(sgApi.value);
    }
  } finally {
    hzLoading.value = false;
  }
}

/** 原 btnQuery_Click：DataBind + HzDataBind */
async function onQuery() {
  querying.value = true;
  try {
    const tr = toTimeRange(q.dates);
    mainRows.value = ((await mS9200Api.getMS9200sDto(tr)) ?? []) as Record<string, unknown>[];
    autosize(mainApi.value);
    await hzDataBind();
  } finally {
    querying.value = false;
  }
}

/** 原 xtraTabControl1_SelectedPageChanged：切页签重查该页汇总 */
async function onTabChange(v: string | number) {
  activeTab.value = String(v);
  await hzDataBind();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询行（原 stackPanel1：时间范围 Label + uctimeRange1 + btnQuery） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">时间范围</label>
      <DatePicker
        v-model="q.dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        class="w-96 shrink-0"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 Horizontal=false SplitterPosition=405） -->
    <div class="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
      <div class="flex min-h-0 flex-[57] flex-col overflow-hidden border-b border-border/60">
        <!-- groupControl1「产出信息」→ 纯标题分区头 h-8 -->
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">产出信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="mainCols"
            :row-data="mainRows"
            :pagination="false"
            :loading="querying"
            @grid-ready="readyMain"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </div>

      <div class="flex min-h-0 flex-[43] flex-col overflow-hidden">
        <!-- groupControl2「汇总信息」+ xtraTabControl1 四页签 -->
        <Tabs :value="activeTab" class="min-h-0 flex-1 flex-col" @update:value="onTabChange">
          <div class="flex shrink-0 items-center border-b border-border/60 px-2">
            <span class="mr-2 shrink-0 text-xs font-medium text-muted-foreground">汇总信息</span>
            <TabList class="min-w-0 flex-1">
              <Tab value="0">日信息汇总</Tab>
              <Tab value="1">班组产出信息汇总</Tab>
              <Tab value="2">炉次信息汇总</Tab>
              <Tab value="3">钢种长度信息汇总</Tab>
            </TabList>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel value="0" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="dayCols"
                :row-data="dayRows"
                :pagination="false"
                :loading="hzLoading && activeTab === '0'"
                @grid-ready="readyDay"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel value="1" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="groupCols"
                :row-data="groupRows"
                :pagination="false"
                :loading="hzLoading && activeTab === '1'"
                @grid-ready="readyGroup"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel value="2" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="stoveCols"
                :row-data="stoveRows"
                :pagination="false"
                :loading="hzLoading && activeTab === '2'"
                @grid-ready="readyStove"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel value="3" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="sgCols"
                :row-data="sgRows"
                :pagination="false"
                :loading="hzLoading && activeTab === '3'"
                @grid-ready="readySg"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  </div>
</template>
