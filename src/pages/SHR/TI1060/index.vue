<script setup lang="ts">
/** 对应 FrmTI1060（轮廓仪数据查询）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1060
 *  已接入：tI1060Api.queryTi1060（原 btnQuery_Click → QueryTi1060(DtoTi1060Query)）
 *         tI1060Api.getHzTi1060 / getTi1060GroupHz / getTi1060DayHz（原 HzDataBind：按当前页签取
 *         「汇总明细 / 日班组汇总明细 / 每日汇总明细」，入参均为 ucTimeRange1.Value（TimeRange）；
 *         查询后与页签切换（xtraTabControl1_SelectedPageChanged）各触发一次）
 *  待接入：无
 *  偏差：班组走 EnumCodeConverter<TiFurShiftGroupEnum>.StringValue（A/B/C→甲/乙/丙）、班次走
 *        <TiShiftNoEnum>.Int32StringValue（1/2/3→早/中/夜）、精轧责任者A 走 KeyValueFormatters.ZGAUTHOR
 *        （A0000:ZGAUTHOR 字典，原样查不到时回退原值）；镰刀弯行原为 Color.Yellow 实底，此处用浅黄底以保证深色主题可读；
 *        原 XtraTabControl 页签在内容区顶部（HeaderLocation 默认 Top），PrimeVue Tabs 同位；
 *        gridView3/4 页脚汇总（总块数/总镰刀弯量）以各页签底部统计条呈现 */

import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClassParams, ValueFormatterParams } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { systemKeyValueApi } from "@/api/admin/request";
import {
  tI1060Api,
  type DtoTi1060Query,
  type Ti1060Dto,
  type Ti1060RankDto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
/* 原 FrmTI1060_Load：new TimeRange(今天所在月的 1 日 00:00, 明天 00:00) */
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}

/* ---------- 列值翻译（原 Load 里的 SetCodeFormatterAsync） ---------- */
/* 班组：TiFurShiftGroupEnum.StringValue */
const groupMap: Record<string, string> = { A: "甲", B: "乙", C: "丙" };
/* 班次：TiShiftNoEnum.Int32StringValue（后端下发的是 "1"/"2"/"3" 形态） */
const shiftMap: Record<string, string> = { 1: "早", 2: "中", 3: "夜" };
function enumFmt(m: Record<string, string>) {
  return (p: ValueFormatterParams) =>
    p.value == null || p.value === "" ? "" : (m[String(p.value)] ?? String(p.value));
}
/* 精轧责任者A：KeyValueFormatters.ZGAUTHOR */
const kvAuthor = new Map<string, string>();
function authorFmt(p: ValueFormatterParams) {
  const code = String(p.value ?? "");
  return kvAuthor.get(code) ?? code;
}
/* 镰刀弯比例：原 DisplayFormat "{0}%"（数字格式，百分号是字面量，不乘 100） */
function rateFmt(p: ValueFormatterParams) {
  return p.value == null || p.value === "" ? "" : `${p.value}%`;
}
/* 日期列：原 DisplayFormat "yyyy-MM-dd" */
function dayFmt(p: ValueFormatterParams) {
  const v = p.value as string | null | undefined;
  return v ? String(v).slice(0, 10) : "";
}
onMounted(async () => {
  try {
    for (const x of (await systemKeyValueApi.getSysKvListByGroup("A0000:ZGAUTHOR")) ?? [])
      kvAuthor.set(x.cCode ?? "", x.cName ?? "");
    gridApi.value?.refreshCells({ force: true });
    for (const a of hzApis.value) a?.refreshCells({ force: true });
  } catch {
    /* 拦截层已 toast */
  }
});

/* ---------- 查询条件（原 stackPanel1：时间范围 / 钢板号 / 批号 / 是否镰刀弯） ---------- */
/* 是否镰刀弯：原 comCIfSickleBend = AddEnum(typeof(TiYNEnum), true) + AllowNullInput，值为枚举名 Y/N */
const ynOptions = [
  { label: "是", value: "Y" },
  { label: "否", value: "N" },
];
const input = reactive({
  dates: defaultRange() as Date[] | null,
  plateNo: "",
  cBatchNo: "",
  cIfSickleBend: null as string | null,
});

/* ---------- 主表（gridView1 / Ti1060Dto，Designer 17 列，顺序按 VisibleIndex） ---------- */
const rows = shallowRef<Ti1060Dto[]>([]);
const loading = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 86, hide: true },
  { colId: "plateNo", field: "plateNo", headerName: "钢板号", width: 99 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 86 },
  { colId: "plateLen", field: "plateLen", headerName: "钢板长度", width: 112 },
  { colId: "plateHead", field: "plateHead", headerName: "板头", width: 86 },
  { colId: "plateLast", field: "plateLast", headerName: "板尾", width: 86 },
  { colId: "cYcCode", field: "cYcCode", headerName: "异常代码", width: 112 },
  { colId: "nOpSickleBend", field: "nOpSickleBend", headerName: "OP侧镰刀弯量", width: 150 },
  { colId: "nDrSickleBend", field: "nDrSickleBend", headerName: "DR侧镰刀弯量", width: 150 },
  { colId: "cIfSickleBend", field: "cIfSickleBend", headerName: "是否为镰刀弯", width: 138 },
  { colId: "nOpSicklePosition", field: "nOpSicklePosition", headerName: "OP侧镰刀弯量坐标", width: 180 },
  { colId: "nDrSicklePosition", field: "nDrSicklePosition", headerName: "DR侧镰刀弯量坐标", width: 180 },
  { colId: "dInsertTime", field: "dInsertTime", headerName: "插入时间", width: 130 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "班次", width: 86, valueFormatter: enumFmt(shiftMap) },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 86, valueFormatter: enumFmt(groupMap) },
  { colId: "cRmAuthorA", field: "cRmAuthorA", headerName: "精轧责任者A", width: 140, valueFormatter: authorFmt },
  { colId: "cRmAuthorNameA", field: "cRmAuthorNameA", headerName: "精轧责任者A姓名", width: 160 },
];

/* 原 gridView1_RowCellStyle：CIfSickleBend 为空或 "N" → 白（走主题色），否则 → 黄 */
function rowSickle(p: RowClassParams<Ti1060Dto>) {
  const v = p.data?.cIfSickleBend;
  return v === null || v === undefined || v === "N" ? undefined : { backgroundColor: "#fef9c3", color: "#713f12" };
}

/* ---------- 排名汇总（原 groupControl2：3 个页签，各一张表，绑定实体 Ti1060RankDto） ---------- */
const tabCaptions = ["汇总明细", "日班组汇总明细", "每日汇总明细"];
const activeTab = ref(0);
const hzLoading = ref(false);
const hzApis = ref<(GridApi | null)[]>([null, null, null]);
function onHzReady(i: number, e: GridReadyEvent) {
  hzApis.value[i] = e.api;
}
/* 页签 0：gridView2（块数 / 精轧责任者A / 镰刀弯量 / 镰刀弯比例） */
const hzRows = shallowRef<Ti1060RankDto[]>([]);
const hzColDefs: ColDef[] = [
  { colId: "nQua", field: "nQua", headerName: "块数", width: 86 },
  { colId: "cRmAuthorA", field: "cRmAuthorA", headerName: "精轧责任者A", width: 140, valueFormatter: authorFmt },
  { colId: "nSickleBend", field: "nSickleBend", headerName: "镰刀弯量", width: 112 },
  { colId: "nSickleBendRate", field: "nSickleBendRate", headerName: "镰刀弯比例", width: 112, valueFormatter: rateFmt },
];
/* 页签 1：gridView3（日期 / 班组 / 块数 / 镰刀弯量 / 镰刀弯比例，页脚汇总块数与镰刀弯量） */
const groupRows = shallowRef<Ti1060RankDto[]>([]);
const groupColDefs: ColDef[] = [
  { colId: "dDateTime", field: "dDateTime", headerName: "日期", width: 112, valueFormatter: dayFmt },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 86, valueFormatter: enumFmt(groupMap) },
  { colId: "nQua", field: "nQua", headerName: "块数", width: 86 },
  { colId: "nSickleBend", field: "nSickleBend", headerName: "镰刀弯量", width: 112 },
  { colId: "nSickleBendRate", field: "nSickleBendRate", headerName: "镰刀弯比例", width: 112, valueFormatter: rateFmt },
];
/* 页签 2：gridView4（日期 / 块数 / 镰刀弯量 / 镰刀弯比例，页脚汇总块数与镰刀弯量） */
const dayRows = shallowRef<Ti1060RankDto[]>([]);
const dayColDefs: ColDef[] = [
  { colId: "dDateTime", field: "dDateTime", headerName: "日期", width: 112, valueFormatter: dayFmt },
  { colId: "nQua", field: "nQua", headerName: "块数", width: 86 },
  { colId: "nSickleBend", field: "nSickleBend", headerName: "镰刀弯量", width: 112 },
  { colId: "nSickleBendRate", field: "nSickleBendRate", headerName: "镰刀弯比例", width: 112, valueFormatter: rateFmt },
];

/* 原 Summary「总块数={0:0.##}」「总镰刀弯量={0:0.##}」——两位小数内去掉尾零 */
function sum(list: Ti1060RankDto[], key: "nQua" | "nSickleBend"): string {
  let t = 0;
  for (const r of list) t += r[key] ?? 0;
  return String(Number(t.toFixed(2)));
}

/* 原 HzDataBind：按当前页签调对应的汇总接口（三个不同方法），入参都是时间范围 */
async function hzDataBind() {
  hzLoading.value = true;
  try {
    const range = toTimeRange(input.dates);
    if (activeTab.value === 0) {
      hzRows.value = (await tI1060Api.getHzTi1060(range)) ?? [];
      requestAnimationFrame(() => hzApis.value[0]?.autoSizeAllColumns());
    } else if (activeTab.value === 1) {
      groupRows.value = (await tI1060Api.getTi1060GroupHz(range)) ?? [];
      requestAnimationFrame(() => hzApis.value[1]?.autoSizeAllColumns());
    } else {
      dayRows.value = (await tI1060Api.getTi1060DayHz(range)) ?? [];
      requestAnimationFrame(() => hzApis.value[2]?.autoSizeAllColumns());
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    hzLoading.value = false;
  }
}

/* 原 btnQuery_Click：主表查询 → BestFitColumns → 再 HzDataBind（无前置校验） */
async function query() {
  loading.value = true;
  try {
    const dto: DtoTi1060Query = {
      plateNo: input.plateNo.trim() || null,
      cBatchNo: input.cBatchNo.trim() || null,
      cIfSickleBend: input.cIfSickleBend,
      timeRange: toTimeRange(input.dates),
    };
    rows.value = (await tI1060Api.queryTi1060(dto)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
  await hzDataBind();
}

/* 原 xtraTabControl1_SelectedPageChanged：切页签即重新绑定汇总 */
function onTabChange(v: string | number) {
  activeTab.value = Number(v);
  void hzDataBind();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 stackPanel1：时间范围 / 钢板号 / 批号 / 是否镰刀弯 + 查询按钮同一行） -->
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢板号</label>
        <InputText v-model="input.plateNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">是否镰刀弯</label>
        <Select
          v-model="input.cIfSickleBend"
          :options="ynOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 Horizontal=false，SplitterPosition 476 / 1067 ≈ 45%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="45" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 原 groupControl1 标题 -->
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">轮廓仪信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="colDefs"
            :row-data="rows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            :get-row-style="rowSickle"
            @grid-ready="onGridReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="55" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 原 groupControl2 标题 + 其内 xtraTabControl1（三个页签各一张汇总表） -->
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">排名汇总</span>
        </div>
        <Tabs :value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:value="onTabChange">
          <TabList class="flex-wrap">
            <Tab v-for="(c, i) in tabCaptions" :key="i" :value="i">{{ c }}</Tab>
          </TabList>
          <TabPanels class="min-h-0 flex-1">
            <TabPanel :value="0" class="h-full p-0">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :column-defs="hzColDefs"
                :row-data="hzRows"
                :pagination="false"
                :animate-rows="false"
                :loading="hzLoading"
                @grid-ready="(e: GridReadyEvent) => onHzReady(0, e)"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel :value="1" class="flex h-full flex-col p-0">
              <div class="min-h-0 flex-1 overflow-hidden">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :column-defs="groupColDefs"
                  :row-data="groupRows"
                  :pagination="false"
                  :animate-rows="false"
                  :loading="hzLoading"
                  @grid-ready="(e: GridReadyEvent) => onHzReady(1, e)"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
              <div class="flex h-7 shrink-0 items-center gap-4 border-t border-border/60 px-3">
                <span class="text-xs text-muted-foreground">总块数={{ sum(groupRows, "nQua") }}</span>
                <span class="text-xs text-muted-foreground">总镰刀弯量={{ sum(groupRows, "nSickleBend") }}</span>
              </div>
            </TabPanel>
            <TabPanel :value="2" class="flex h-full flex-col p-0">
              <div class="min-h-0 flex-1 overflow-hidden">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :column-defs="dayColDefs"
                  :row-data="dayRows"
                  :pagination="false"
                  :animate-rows="false"
                  :loading="hzLoading"
                  @grid-ready="(e: GridReadyEvent) => onHzReady(2, e)"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
              <div class="flex h-7 shrink-0 items-center gap-4 border-t border-border/60 px-3">
                <span class="text-xs text-muted-foreground">总块数={{ sum(dayRows, "nQua") }}</span>
                <span class="text-xs text-muted-foreground">总镰刀弯量={{ sum(dayRows, "nSickleBend") }}</span>
              </div>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
