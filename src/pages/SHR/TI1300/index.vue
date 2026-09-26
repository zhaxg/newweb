<script setup lang="ts">
/** 对应 FrmTI1300（产量指标）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1300
 *  已接入（台账逐条）：
 *    查询    → tI1300Api.getThr3010PlanProducts（主表：目标产量维护，TrackableList）
 *    添加    → tI1300Api.addPlanProduct          保存 → tI1300Api.saveChanges(SaveChangesData)
 *    启用    → tI1300Api.updataNStatus(id,true)  禁用 → tI1300Api.updataNStatus(id,false)
 *    同步作业时间 → tI1300Api.syncStopTime(区间)
 *    页签查询 → getTi1300Slabs（板坯完成率）· getTi1300JQs（剪切线作业率）
 *  待接入：无
 *  偏差：原 XtraTabControl 页签在顶部；保存按 C# 走 saveChanges(SaveChangesData)（非通用 SaveList）；
 *        主表行内编辑目标产量列，启用/禁用作用于当前单选行；停机时间/剪切线停机时间以原值展示 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputNumber from "primevue/inputnumber";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import {
  IconDeviceFloppy,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconToggleLeft,
  IconToggleRight,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { TrackableList } from "@/api/common/trackableList";
import {
  tI1300Api,
  Tdm1060StatusEnum,
  type Thr3010PlanProduct,
  type Ti1300SlabDto,
  type Ti1300JQLineDto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const loading = ref(false);
const hzLoading = ref(false);
const activeTab = ref("slab");

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
const statusFmt = (p: ValueFormatterParams) =>
  p.value === Tdm1060StatusEnum.Open ? "正常" : p.value === Tdm1060StatusEnum.Close ? "失效" : (p.value ?? "");

/* ---------- 查询条件 ---------- */
const statusOptions = [
  { label: "正常", value: Tdm1060StatusEnum.Open },
  { label: "失效", value: Tdm1060StatusEnum.Close },
];
const input = reactive({
  dates: [monthStart(), dayStart(1)] as Date[] | null, // ucTimeRange1 主表区间
  datesHz: [monthStart(), dayStart(1)] as Date[] | null, // ucTimeRange2 明细区间
  nStatus: Tdm1060StatusEnum.Open as Tdm1060StatusEnum, // comNStatus 默认第 0 项
  month: monthStart() as Date | null, // txtDate 默认本月首日
  planProduct: 0 as number | null, // txtPlanProduct
});

/* ---------- 主表 TrackableList ---------- */
const trackList = shallowRef<TrackableList<Thr3010PlanProduct>>(new TrackableList<Thr3010PlanProduct>());
const selectedId = ref<string | null>(null);
const api = ref<GridApi | null>(null);
const slabApi = ref<GridApi | null>(null);
const jqApi = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onSlabReady(e: GridReadyEvent) {
  slabApi.value = e.api;
}
function onJqReady(e: GridReadyEvent) {
  jqApi.value = e.api;
}
function getRowId(p: GetRowIdParams) {
  return String((p.data as Thr3010PlanProduct).id);
}
function onSelectionChanged() {
  const row = api.value?.getSelectedRows()[0] as Thr3010PlanProduct | undefined;
  selectedId.value = row?.id ?? null;
}
function onCellValueChanged(e: CellValueChangedEvent) {
  api.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}
function currentRow(): Thr3010PlanProduct | null {
  return trackList.value.find((r) => r.id === selectedId.value) ?? null;
}

const slabRows = shallowRef<Ti1300SlabDto[]>([]);
const jqRows = shallowRef<Ti1300JQLineDto[]>([]);

const mainDefs: ColDef[] = [
  { colId: "creator", field: "creator", headerName: "创建人", minWidth: 90 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", minWidth: 150 },
  { colId: "dDateMonth", field: "dDateMonth", headerName: "月份", minWidth: 120 },
  { colId: "nPlanProduct", field: "nPlanProduct", headerName: "目标产量", minWidth: 110, editable: true },
  { colId: "dJqStopTime", field: "dJqStopTime", headerName: "剪切线停机时间", minWidth: 140 },
  { colId: "dStopTime", field: "dStopTime", headerName: "总停机时间", minWidth: 120 },
  { colId: "nStatus", field: "nStatus", headerName: "状态", minWidth: 90, valueFormatter: statusFmt },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", minWidth: 110 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", minWidth: 150 },
  { colId: "id", field: "id", headerName: "主键", minWidth: 120, hide: true },
];

const slabDefs: ColDef[] = [
  { colId: "date", field: "date", headerName: "日期", minWidth: 120 },
  { colId: "nWorkTime", field: "nWorkTime", headerName: "作业时间", minWidth: 100 },
  { colId: "nPlanProduct", field: "nPlanProduct", headerName: "目标产量", minWidth: 100 },
  { colId: "nSlabQua1", field: "nSlabQua1", headerName: "板坯支数四切", minWidth: 110 },
  { colId: "nSlabWgt1", field: "nSlabWgt1", headerName: "板坯重量四切", minWidth: 110 },
  { colId: "nSlabQua2", field: "nSlabQua2", headerName: "板坯支数两切", minWidth: 110 },
  { colId: "nSlabWgt2", field: "nSlabWgt2", headerName: "板坯重量两切", minWidth: 110 },
  { colId: "nSlabQua0", field: "nSlabQua0", headerName: "板坯支数毛边", minWidth: 110 },
  { colId: "nSlabWgt0", field: "nSlabWgt0", headerName: "板坯重量毛边", minWidth: 110 },
  { colId: "nSlabQuaAll", field: "nSlabQuaAll", headerName: "板坯支数合计", minWidth: 110 },
  { colId: "nSlabWgtAll", field: "nSlabWgtAll", headerName: "板坯重量合计", minWidth: 110 },
  { colId: "nPlateQua1", field: "nPlateQua1", headerName: "钢板支数四切", minWidth: 110 },
  { colId: "nPlateWgt1", field: "nPlateWgt1", headerName: "钢板重量四切", minWidth: 110 },
  { colId: "nPlateQua2", field: "nPlateQua2", headerName: "钢板支数两切", minWidth: 110 },
  { colId: "nPlateWgt2", field: "nPlateWgt2", headerName: "钢板重量两切", minWidth: 110 },
  { colId: "nPlateQua0", field: "nPlateQua0", headerName: "钢板支数毛边", minWidth: 110 },
  { colId: "nPlateWgt0", field: "nPlateWgt0", headerName: "钢板重量毛边", minWidth: 110 },
  { colId: "nPlateQuaAll", field: "nPlateQuaAll", headerName: "钢板支数合计", minWidth: 110 },
  { colId: "nPlateWgtAll", field: "nPlateWgtAll", headerName: "钢板重量合计", minWidth: 110 },
  { colId: "nRollQua", field: "nRollQua", headerName: "轧制支数", minWidth: 100 },
  { colId: "nRollWgt", field: "nRollWgt", headerName: "轧制重量", minWidth: 100 },
  { colId: "nInHouseQua", field: "nInHouseQua", headerName: "入库支数", minWidth: 100 },
  { colId: "nInHouseWgt", field: "nInHouseWgt", headerName: "入库重量", minWidth: 100 },
  { colId: "nRate", field: "nRate", headerName: "完成率", minWidth: 100 },
];

const jqDefs: ColDef[] = [
  { colId: "date", field: "date", headerName: "日期", minWidth: 120 },
  { colId: "nWorkTime", field: "nWorkTime", headerName: "作业时间", minWidth: 100 },
  { colId: "nPlanProduct", field: "nPlanProduct", headerName: "目标产量", minWidth: 100 },
  { colId: "nOneQua1", field: "nOneQua1", headerName: "一线支数四切", minWidth: 110 },
  { colId: "nOneWgt1", field: "nOneWgt1", headerName: "一线重量四切", minWidth: 110 },
  { colId: "nOneQua2", field: "nOneQua2", headerName: "一线支数两切", minWidth: 110 },
  { colId: "nOneWgt2", field: "nOneWgt2", headerName: "一线重量两切", minWidth: 110 },
  { colId: "nOneQua0", field: "nOneQua0", headerName: "一线支数毛边", minWidth: 110 },
  { colId: "nOneWgt0", field: "nOneWgt0", headerName: "一线重量毛边", minWidth: 110 },
  { colId: "nOneQuaAll", field: "nOneQuaAll", headerName: "一线支数合计", minWidth: 110 },
  { colId: "nOneWgtAll", field: "nOneWgtAll", headerName: "一线重量合计", minWidth: 110 },
  { colId: "nOneTimeQua", field: "nOneTimeQua", headerName: "一线作业支数", minWidth: 110 },
  { colId: "nOneTimeWgt", field: "nOneTimeWgt", headerName: "一线作业重量", minWidth: 110 },
  { colId: "nTwoQua1", field: "nTwoQua1", headerName: "二线支数四切", minWidth: 110 },
  { colId: "nTwoWgt1", field: "nTwoWgt1", headerName: "二线重量四切", minWidth: 110 },
  { colId: "nTwoQua2", field: "nTwoQua2", headerName: "二线支数两切", minWidth: 110 },
  { colId: "nTwoWgt2", field: "nTwoWgt2", headerName: "二线重量两切", minWidth: 110 },
  { colId: "nTwoQua0", field: "nTwoQua0", headerName: "二线支数毛边", minWidth: 110 },
  { colId: "nTwoWgt0", field: "nTwoWgt0", headerName: "二线重量毛边", minWidth: 110 },
  { colId: "nTwoQuaAll", field: "nTwoQuaAll", headerName: "二线支数合计", minWidth: 110 },
  { colId: "nTwoWgtAll", field: "nTwoWgtAll", headerName: "二线重量合计", minWidth: 110 },
  { colId: "nTwoTimeQua", field: "nTwoTimeQua", headerName: "二线作业支数", minWidth: 110 },
  { colId: "nTwoTimeWgt", field: "nTwoTimeWgt", headerName: "二线作业重量", minWidth: 110 },
  { colId: "nQuaAll", field: "nQuaAll", headerName: "合计支数", minWidth: 100 },
  { colId: "nWgtAll", field: "nWgtAll", headerName: "合计重量", minWidth: 100 },
  { colId: "nTimeQua", field: "nTimeQua", headerName: "作业支数", minWidth: 100 },
  { colId: "nTimeWgt", field: "nTimeWgt", headerName: "作业重量", minWidth: 100 },
];

async function dataBind() {
  const payload = {
    timeRange: toTimeRange(input.dates),
    nStatus: input.nStatus ?? null,
  };
  const rows = (await tI1300Api.getThr3010PlanProducts(payload)) ?? [];
  trackList.value = new TrackableList<Thr3010PlanProduct>(rows);
  selectedId.value = null;
  requestAnimationFrame(() => api.value?.autoSizeAllColumns());
}

async function hzDataBind() {
  const range = toTimeRange(input.datesHz);
  if (activeTab.value === "slab") {
    slabRows.value = (await tI1300Api.getTi1300Slabs(range)) ?? [];
    requestAnimationFrame(() => slabApi.value?.autoSizeAllColumns());
  } else {
    jqRows.value = (await tI1300Api.getTi1300JQs(range)) ?? [];
    requestAnimationFrame(() => jqApi.value?.autoSizeAllColumns());
  }
}

async function query() {
  loading.value = true;
  try {
    await dataBind();
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function queryMx() {
  hzLoading.value = true;
  try {
    await hzDataBind();
  } catch {
    /* 拦截层已 toast */
  } finally {
    hzLoading.value = false;
  }
}

async function reloadAll() {
  await dataBind();
  await hzDataBind();
}

async function onAdd() {
  if (!input.month) {
    toast("请输入正确的月份数据！", 2000, "warn");
    return;
  }
  const plan = input.planProduct ?? 0;
  if (plan <= 0) {
    toast("请填写正确的目标产量！", 2000, "warn");
    return;
  }
  loading.value = true;
  try {
    await tI1300Api.addPlanProduct({ dDateMonth: isoLocal(input.month), nPlanProduct: plan });
    input.planProduct = 0;
    toast("数据提交成功！", 2000, "success");
    await reloadAll();
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function onSave() {
  const changes = trackList.value.SaveChangesData;
  if ((changes.changedItems?.length ?? 0) <= 0) return;
  loading.value = true;
  try {
    await tI1300Api.saveChanges(changes);
    toast("数据提交成功！", 2000, "success");
    await reloadAll();
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function onOpen() {
  const row = currentRow();
  if (!row) {
    toast("请选择数据操作！", 2000, "warn");
    return;
  }
  if (row.nStatus === Tdm1060StatusEnum.Open) {
    toast("正常数据不能再次启用！", 2000, "warn");
    return;
  }
  loading.value = true;
  try {
    await tI1300Api.updataNStatus(row.id ?? undefined, true);
    toast("数据提交成功！", 2000, "success");
    await reloadAll();
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function onClose() {
  const row = currentRow();
  if (!row) {
    toast("请选择数据操作！", 2000, "warn");
    return;
  }
  if (row.nStatus === Tdm1060StatusEnum.Close) {
    toast("禁用数据不能再次禁用！", 2000, "warn");
    return;
  }
  loading.value = true;
  try {
    await tI1300Api.updataNStatus(row.id ?? undefined, false);
    toast("数据提交成功！", 2000, "success");
    await reloadAll();
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function onSync() {
  loading.value = true;
  try {
    await tI1300Api.syncStopTime(toTimeRange(input.dates));
    toast("停机数据同步成功！", 2000, "success");
    await reloadAll();
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

function onTabChange() {
  hzLoading.value = true;
  hzDataBind().finally(() => {
    hzLoading.value = false;
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="50" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
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
            <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
            <Select
              v-model="input.nStatus"
              :options="statusOptions"
              option-label="label"
              option-value="value"
              placeholder="全部"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">月份</label>
            <DatePicker
              v-model="input.month"
              :manual-input="false"
              date-format="yy-mm-dd"
              show-icon
              placeholder="选择月份"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">目标产量</label>
            <div class="min-w-0 flex-1">
              <InputNumber v-model="input.planProduct" :min="0" :show-buttons="false" fluid placeholder="目标产量" />
            </div>
          </div>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onAdd">
            <IconPlus class="h-3 w-3" />添加
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onSave">
            <IconDeviceFloppy class="h-3 w-3" />保存
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onOpen">
            <IconToggleRight class="h-3 w-3" />启用
          </Button>
          <Button
            variant="outlined"
            severity="danger"
            class="shrink-0 whitespace-nowrap"
            :loading="loading"
            @click="onClose"
          >
            <IconToggleLeft class="h-3 w-3" />禁用
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onSync">
            <IconRefresh class="h-3 w-3" />同步作业时间
          </Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">目标产量维护</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="mainDefs"
            :row-data="trackList"
            :get-row-id="getRowId"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :loading="loading"
            @grid-ready="onReady"
            @selection-changed="onSelectionChanged"
            @cell-value-changed="onCellValueChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
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
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="hzLoading" @click="queryMx">
            <IconSearch class="h-3 w-3" />查询
          </Button>
        </div>
        <Tabs v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:value="onTabChange">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab value="slab">板坯完成率</Tab>
              <Tab value="jq">剪切线作业率</Tab>
            </TabList>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel value="slab" class="h-full overflow-hidden p-0">
              <div class="min-h-0 h-full">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="slabDefs"
                  :row-data="slabRows"
                  :loading="hzLoading"
                  @grid-ready="onSlabReady"
                  @first-data-rendered="autoSizeOnFirstData"
                />
              </div>
            </TabPanel>
            <TabPanel value="jq" class="h-full overflow-hidden p-0">
              <div class="min-h-0 h-full">
                <AgGridVue
                  class="hmx-ag-grid h-full w-full"
                  :theme="theme"
                  :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef"
                  :column-defs="jqDefs"
                  :row-data="jqRows"
                  :loading="hzLoading"
                  @grid-ready="onJqReady"
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
