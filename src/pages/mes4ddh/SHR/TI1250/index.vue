<script setup lang="ts">
/** 对应 FrmTI1250（开轧温度实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1250
 *  已接入：systemKeyValueApi.querySysKvItemList("A0000:ZGAUTHOR")（精轧责任者A 下拉，过滤 CGroup=JZ）
 *        · tI1250Api.queryTi1250（主表：开轧温度负差列表）
 *        · tI1250Api.queryDetail（页签1 汇总明细）· tI1250Api.queryYearDetial（页签2 年汇总明细，固定本月起→明天）
 *  待接入：无
 *  偏差：原 XtraTabControl 页签在顶部（PrimeVue Tabs）；年汇总的时间范围按 C# 固定为本月首日至明天，不随查询区联动；
 *        组批号/板坯号两输入 C# 绑到查询 DTO 但 web swagger 的 DtoTi1210Query 未声明该两字段，仍随对象一并提交（后端按名绑定）；
 *        班组/精轧责任者A 列以 A/B/C→甲/乙/丙 及责任者代码原值展示 */

import { onMounted, reactive, ref, shallowRef } from "vue";
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
import { systemKeyValueApi } from "@/api/admin/request";
import { tI1250Api, type Thr3010Fcdetail, type TimeRange, type Ti1250DetailDto } from "@/api/mes4ddh/shr.swagger";

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
/** 年汇总固定区间：本月首日 → 明天（原 C# Load/DataBind） */
function yearRange(): TimeRange {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  return { min: isoLocal(first), max: isoLocal(dayStart(1)) };
}
const groupFmt = (p: ValueFormatterParams) =>
  (({ A: "甲", B: "乙", C: "丙" }) as Record<string, string>)[String(p.value)] ?? p.value ?? "";

/* ---------- 查询条件（DtoTi1210Query，默认 [今天, 明天]） ---------- */
const input = reactive({
  dates: [dayStart(0), dayStart(1)] as Date[] | null,
  cOutSteelAuthorName: "",
  cFmAuthorA: null as string | null,
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
const fmAuthorOptions = ref<{ label: string; value: string }[]>([]);

function buildDto() {
  return {
    timeRange: toTimeRange(input.dates),
    cOutSteelAuthorName: input.cOutSteelAuthorName.trim() || null,
    cFmAuthorA: input.cFmAuthorA || null,
    cFmAuthorB: input.cFmAuthorB.trim() || null,
    cRmAuthorA: input.cRmAuthorA.trim() || null,
    cRmAuthorB: input.cRmAuthorB.trim() || null,
    cShiftGroup: input.cShiftGroup || null,
    cZpNo: input.cZpNo.trim() || null,
    cSlabNo: input.cSlabNo.trim() || null,
  };
}

/* ---------- 三个表格 ---------- */
const rows = shallowRef<Thr3010Fcdetail[]>([]);
const hzRows = shallowRef<Ti1250DetailDto[]>([]);
const yearRows = shallowRef<Ti1250DetailDto[]>([]);
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
  { colId: "cFmAuthorA", field: "cFmAuthorA", headerName: "精轧责任者A", minWidth: 120 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "轧制班次", minWidth: 100 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "轧制班组", minWidth: 100, valueFormatter: groupFmt },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "组批号", minWidth: 130 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "板坯号", minWidth: 130 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", minWidth: 100 },
  { colId: "nThick", field: "nThick", headerName: "订单厚度", minWidth: 100 },
  { colId: "nWidth", field: "nWidth", headerName: "订单宽度", minWidth: 100 },
  { colId: "nLen", field: "nLen", headerName: "订单长度", minWidth: 100 },
  { colId: "nStrollTemp", field: "nStrollTemp", headerName: "实际开轧温度", minWidth: 120 },
  { colId: "nPlanStrollTemp", field: "nPlanStrollTemp", headerName: "目标开轧温度", minWidth: 120 },
  { colId: "nStrollTempTol", field: "nStrollTempTol", headerName: "开轧温度公差", minWidth: 120 },
  { colId: "cTol", field: "cTol", headerName: "公差", minWidth: 90 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", minWidth: 100 },
  { colId: "dRollingTimeStart", field: "dRollingTimeStart", headerName: "轧制开始时间", minWidth: 160 },
  { colId: "dRollingTimeEnd", field: "dRollingTimeEnd", headerName: "轧制结束时间", minWidth: 160 },
  { colId: "creator", field: "creator", headerName: "创建人", minWidth: 90, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", minWidth: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", minWidth: 100, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", minWidth: 150, hide: true },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", minWidth: 130, hide: true },
  { colId: "cAuthor", field: "cAuthor", headerName: "抽钢责任者", minWidth: 110, hide: true },
  { colId: "cRmAuthorA", field: "cRmAuthorA", headerName: "粗轧责任者A", minWidth: 110, hide: true },
  { colId: "cRmAuthorB", field: "cRmAuthorB", headerName: "粗轧责任者B", minWidth: 110, hide: true },
  { colId: "cFmAuthorB", field: "cFmAuthorB", headerName: "精轧责任者B", minWidth: 110, hide: true },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", minWidth: 140, hide: true },
];

const hzDefs: ColDef[] = [
  { colId: "nQuaAll", field: "nQuaAll", headerName: "轧制支数", minWidth: 100 },
  { colId: "nQua1", field: "nQua1", headerName: "达标支数1", minWidth: 100 },
  { colId: "hitRate1", field: "hitRate1", headerName: "命中率1", minWidth: 100 },
  { colId: "nQua2", field: "nQua2", headerName: "达标支数2", minWidth: 100 },
  { colId: "hitRate2", field: "hitRate2", headerName: "命中率2", minWidth: 100 },
  { colId: "nQua3", field: "nQua3", headerName: "达标支数3", minWidth: 100 },
  { colId: "hitRate3", field: "hitRate3", headerName: "命中率3", minWidth: 100 },
  { colId: "nQua4", field: "nQua4", headerName: "达标支数4", minWidth: 100 },
  { colId: "hitRate4", field: "hitRate4", headerName: "命中率4", minWidth: 100 },
  { colId: "cFmAuthorA", field: "cFmAuthorA", headerName: "精轧责任者A", minWidth: 120 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", minWidth: 90, valueFormatter: groupFmt },
  { colId: "dRollingTimeStart", field: "dRollingTimeStart", headerName: "轧制开始时间", minWidth: 160 },
  { colId: "dRollingTimeEnd", field: "dRollingTimeEnd", headerName: "轧制结束时间", minWidth: 160 },
  { colId: "cOutSteelAuthor", field: "cOutSteelAuthor", headerName: "抽钢责任者", minWidth: 110, hide: true },
  { colId: "cFmAuthorB", field: "cFmAuthorB", headerName: "精轧责任者B", minWidth: 110, hide: true },
  { colId: "cRmAuthorA", field: "cRmAuthorA", headerName: "粗轧责任者A", minWidth: 110, hide: true },
  { colId: "cRmAuthorB", field: "cRmAuthorB", headerName: "粗轧责任者B", minWidth: 110, hide: true },
];

const yearDefs: ColDef[] = [
  { colId: "cDateTime", field: "cDateTime", headerName: "统计周期", minWidth: 140 },
  { colId: "nQuaAll", field: "nQuaAll", headerName: "轧制支数", minWidth: 100 },
  { colId: "nQua1", field: "nQua1", headerName: "达标支数1", minWidth: 100 },
  { colId: "hitRate1", field: "hitRate1", headerName: "命中率1", minWidth: 100 },
  { colId: "nQua2", field: "nQua2", headerName: "达标支数2", minWidth: 100 },
  { colId: "hitRate2", field: "hitRate2", headerName: "命中率2", minWidth: 100 },
  { colId: "nQua3", field: "nQua3", headerName: "达标支数3", minWidth: 100 },
  { colId: "hitRate3", field: "hitRate3", headerName: "命中率3", minWidth: 100 },
  { colId: "nQua4", field: "nQua4", headerName: "达标支数4", minWidth: 100 },
  { colId: "hitRate4", field: "hitRate4", headerName: "命中率4", minWidth: 100 },
];

async function query() {
  loading.value = true;
  try {
    const dto = buildDto();
    rows.value = (await tI1250Api.queryTi1250(dto)) ?? [];
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
      hzRows.value = (await tI1250Api.queryDetail(buildDto())) ?? [];
      requestAnimationFrame(() => hzApi.value?.autoSizeAllColumns());
    } else {
      yearRows.value = (await tI1250Api.queryYearDetial(yearRange())) ?? [];
      requestAnimationFrame(() => yearApi.value?.autoSizeAllColumns());
    }
  } catch {
    /* 拦截层已 toast */
  }
}

function onTabChange() {
  void dataBind();
}

onMounted(async () => {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList("A0000:ZGAUTHOR")) ?? [];
    fmAuthorOptions.value = list
      .filter((x) => x.cGroup === "JZ")
      .map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="45" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <!-- 查询条件区（对应原 groupControl1 LayoutControl） -->
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
            <Select
              v-model="input.cFmAuthorA"
              :options="fmAuthorOptions"
              option-label="label"
              option-value="value"
              show-clear
              filter
              placeholder="全部"
              class="min-w-0 flex-1"
            />
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
        <!-- 工具栏：查询按钮 + 表标题 -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">开轧温度负差列表</span>
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

      <SplitterPanel :size="55" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
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
