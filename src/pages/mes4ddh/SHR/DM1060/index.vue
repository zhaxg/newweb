<script setup lang="ts">
/** 对应 FrmDM1060（能耗单价信息）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1060
 *  已接入：dM1060Api.getTdm1060s（DataBind 单价主表）· dM1060Api.queryTdm1060DtoDay（当日分时汇总）·
 *         dM1060Api.getTdm1060Dtos（年汇总）· dM1060Api.getTdm1060Includeds + editStatusTdm1060（启用/禁用）
 *  待接入：添加 / 编辑（原 FrmDM1060_Edit 二级弹窗未迁移，仅占位）
 *  偏差：ucTimeRange 以 RangePicker（Date[] → TimeRange{min,max}）复刻；启用/禁用取「选中行」而非 DevExpress
 *        FocusedRowObject；页签内容区沿用 PrimeVue Tabs（原 XtraTabControl 顶部页签同位） */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconBan, IconCheck, IconPencil, IconPlus, IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import {
  dM1060Api,
  Tdm1060StatusEnum,
  type DtoQueryTdm1060,
  type Tdm1060,
  type Tdm1060Dto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 时间工具（原 ucTimeRange：TimeRange{Min,Max}） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
/* 原 Load：ucTimeRange1 = [本月1日, 明天]；ucTimeRange2 = [今年1月1日, 明天] */
function monthToDate(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}
function yearToDate(): Date[] {
  const now = new Date();
  return [new Date(now.getFullYear(), 0, 1), new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)];
}

/* ---------- 状态（原 comStatus = AddEnum(Tdm1060StatusEnum)，默认 正常，非空） ---------- */
const statusOptions = [
  { label: "正常", value: Tdm1060StatusEnum.Open },
  { label: "失效", value: Tdm1060StatusEnum.Close },
];
const statusMap: Record<string, string> = { 0: "正常", 10: "失效" };
function statusFmt(p: ValueFormatterParams) {
  return p.value == null || p.value === "" ? "" : (statusMap[String(p.value)] ?? String(p.value));
}
const input = reactive({
  nStatus: Tdm1060StatusEnum.Open as Tdm1060StatusEnum,
  dates1: monthToDate() as Date[] | null,
  dates2: yearToDate() as Date[] | null,
});

/* ---------- 单价主表（gridView1 / Tdm1060：18 可见 + Id 隐藏） ---------- */
const rows = shallowRef<Tdm1060[]>([]);
const loading = ref(false);
const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
const colDefs: ColDef[] = [
  { colId: "id", field: "id", headerName: "主键", width: 112, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 112 },
  { colId: "dMonth", field: "dMonth", headerName: "月份", width: 112 },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 112, valueFormatter: statusFmt },
  { colId: "nGasNum", field: "nGasNum", headerName: "煤气入库量", width: 112 },
  { colId: "nGasPrice", field: "nGasPrice", headerName: "煤气单价", width: 112 },
  { colId: "nElecNum", field: "nElecNum", headerName: "用电入库量", width: 112 },
  { colId: "nElecPrice", field: "nElecPrice", headerName: "用电单价", width: 112 },
  { colId: "nWaterNum", field: "nWaterNum", headerName: "新水入库量", width: 112 },
  { colId: "nWaterPrice", field: "nWaterPrice", headerName: "新水单价", width: 112 },
  { colId: "nAirNum", field: "nAirNum", headerName: "压空入库量", width: 112 },
  { colId: "nAirPrice", field: "nAirPrice", headerName: "压空单价", width: 112 },
  { colId: "nO2Num", field: "nO2Num", headerName: "氧气入库量", width: 112 },
  { colId: "nO2Price", field: "nO2Price", headerName: "氧气单价", width: 112 },
  { colId: "nN2Num", field: "nN2Num", headerName: "氮气入库量", width: 112 },
  { colId: "nN2Price", field: "nN2Price", headerName: "氮气单价", width: 112 },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 112 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 112 },
];

/* ---------- 当日分时汇总（gridView2 / Tdm1060Dto，7 可见） ---------- */
const dayRows = shallowRef<Tdm1060Dto[]>([]);
const dayApi = ref<GridApi | null>(null);
function onDayReady(e: GridReadyEvent) {
  dayApi.value = e.api;
}
const dayColDefs: ColDef[] = [
  { colId: "dMonth", field: "dMonth", headerName: "时间", width: 112 },
  { colId: "nGasUseNum", field: "nGasUseNum", headerName: "煤气", width: 112 },
  { colId: "nElecUseNum", field: "nElecUseNum", headerName: "用电", width: 112 },
  { colId: "nWaterUseNum", field: "nWaterUseNum", headerName: "新水", width: 112 },
  { colId: "nAirUseNum", field: "nAirUseNum", headerName: "压空", width: 112 },
  { colId: "nO2UseNum", field: "nO2UseNum", headerName: "氧气", width: 112 },
  { colId: "nN2UseNum", field: "nN2UseNum", headerName: "氮气", width: 112 },
];

/* ---------- 年汇总（bandedGridView1 / Tdm1060Dto，32 列，列头取实体 LDisplay） ---------- */
const hzRows = shallowRef<Tdm1060Dto[]>([]);
const hzApi = ref<GridApi | null>(null);
function onHzReady(e: GridReadyEvent) {
  hzApi.value = e.api;
}
const hzColDefs: ColDef[] = [
  { colId: "dMonth", field: "dMonth", headerName: "月份", width: 112 },
  { colId: "nGasNum", field: "nGasNum", headerName: "入库量", width: 112 },
  { colId: "nGasUseNum", field: "nGasUseNum", headerName: "用量", width: 112 },
  { colId: "nGasPrice", field: "nGasPrice", headerName: "单价", width: 112 },
  { colId: "nGasSingleNum", field: "nGasSingleNum", headerName: "单耗", width: 112 },
  { colId: "nGasAmount", field: "nGasAmount", headerName: "金额", width: 112 },
  { colId: "nElecNum", field: "nElecNum", headerName: "入库量", width: 112 },
  { colId: "nElecUseNum", field: "nElecUseNum", headerName: "用量", width: 112 },
  { colId: "nElecPrice", field: "nElecPrice", headerName: "单价", width: 112 },
  { colId: "nElecSingleNum", field: "nElecSingleNum", headerName: "单耗", width: 112 },
  { colId: "nElecAmount", field: "nElecAmount", headerName: "金额", width: 112 },
  { colId: "nWaterNum", field: "nWaterNum", headerName: "入库量", width: 112 },
  { colId: "nWaterUseNum", field: "nWaterUseNum", headerName: "用量", width: 112 },
  { colId: "nWaterPrice", field: "nWaterPrice", headerName: "单价", width: 112 },
  { colId: "nWaterSingleNum", field: "nWaterSingleNum", headerName: "单耗", width: 112 },
  { colId: "nWaterAmount", field: "nWaterAmount", headerName: "金额", width: 112 },
  { colId: "nAirNum", field: "nAirNum", headerName: "入库量", width: 112 },
  { colId: "nAirUseNum", field: "nAirUseNum", headerName: "用量", width: 112 },
  { colId: "nAirPrice", field: "nAirPrice", headerName: "单价", width: 112 },
  { colId: "nAirSingleNum", field: "nAirSingleNum", headerName: "单耗", width: 112 },
  { colId: "nAirAmount", field: "nAirAmount", headerName: "金额", width: 112 },
  { colId: "nO2Num", field: "nO2Num", headerName: "入库量", width: 112 },
  { colId: "nO2UseNum", field: "nO2UseNum", headerName: "用量", width: 112 },
  { colId: "nO2Price", field: "nO2Price", headerName: "单价", width: 112 },
  { colId: "nO2SingleNum", field: "nO2SingleNum", headerName: "单耗", width: 112 },
  { colId: "nO2Amount", field: "nO2Amount", headerName: "金额", width: 112 },
  { colId: "nN2Num", field: "nN2Num", headerName: "入库量", width: 112 },
  { colId: "nN2UseNum", field: "nN2UseNum", headerName: "用量", width: 112 },
  { colId: "nN2Price", field: "nN2Price", headerName: "氮气单价", width: 112 },
  { colId: "nN2SingleNum", field: "nN2SingleNum", headerName: "单耗", width: 112 },
  { colId: "nN2Amount", field: "nN2Amount", headerName: "金额", width: 112 },
  { colId: "nAllPrice", field: "nAllPrice", headerName: "累计", width: 112 },
];

/* ---------- 页签（原 xtraTabControl1：0 当日 / 1 年汇总） ---------- */
const activeTab = ref(0);
const hzLoading = ref(false);

/* 原 DataBind */
async function dataBind() {
  loading.value = true;
  try {
    const dto: DtoQueryTdm1060 = { timeRange: toTimeRange(input.dates1), nStatus: input.nStatus };
    rows.value = (await dM1060Api.getTdm1060s(dto)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* 原 HzDataBind：按当前页签取当日分时 / 年汇总 */
async function hzDataBind() {
  hzLoading.value = true;
  try {
    if (activeTab.value === 0) {
      const now = new Date();
      const min = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const max = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      dayRows.value = (await dM1060Api.queryTdm1060DtoDay({ min: isoLocal(min), max: isoLocal(max) })) ?? [];
      requestAnimationFrame(() => dayApi.value?.autoSizeAllColumns());
    } else {
      hzRows.value = (await dM1060Api.getTdm1060Dtos({ timeRange: toTimeRange(input.dates2) })) ?? [];
      requestAnimationFrame(() => hzApi.value?.autoSizeAllColumns());
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    hzLoading.value = false;
  }
}

function onQuery() {
  void dataBind();
}
function onQueryHz() {
  void hzDataBind();
}
/* 原 xtraTabControl1_SelectedPageChanged：切页签即重取汇总 */
function onTabChange(v: string | number) {
  activeTab.value = Number(v);
  void hzDataBind();
}

/* 原 btnAdd_Click / btnEdit_Click：FrmDM1060_Edit 二级弹窗（未迁移） */
function onAdd() {
  toast("添加（二级弹窗）待接入", 2500, "warn");
}
function onEdit() {
  const r = gridApi.value?.getSelectedRows()[0] as Tdm1060 | undefined;
  if (rows.value.length === 0) return;
  if (!r) {
    toast("请选择数据操作！", 2000, "warn");
    return;
  }
  toast("编辑（二级弹窗）待接入", 2500, "warn");
}

/* 取当前选中行（原 gridView1.FocusedRowObject） */
function focused(): Tdm1060 | null {
  if (rows.value.length === 0) return null;
  const r = gridApi.value?.getSelectedRows()[0] as Tdm1060 | undefined;
  if (!r) {
    toast("请选择数据操作！", 2000, "warn");
    return null;
  }
  return r;
}

/* 原 btnOpen_Click：启用 */
async function onOpen() {
  const r = focused();
  if (!r) return;
  if (r.nStatus === Tdm1060StatusEnum.Open) {
    toast("正常数据不能再次启用！", 2000, "warn");
    return;
  }
  try {
    const included = (await dM1060Api.getTdm1060Includeds(r.dMonth ?? undefined)) ?? [];
    if (included.length > 0) {
      const y = String(r.dMonth ?? "").slice(0, 4);
      const m = Number(String(r.dMonth ?? "").slice(5, 7));
      toast(`已存在${y}年${m}月单价数据！`, 2000, "warn");
      return;
    }
    await dM1060Api.editStatusTdm1060(r.id ?? undefined, true);
    await dataBind();
    await hzDataBind();
    toast("数据提交成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

/* 原 btnClose_Click：禁用 */
async function onClose() {
  const r = focused();
  if (!r) return;
  if (r.nStatus === Tdm1060StatusEnum.Close) {
    toast("失效数据不能再次禁用！", 2000, "warn");
    return;
  }
  try {
    await dM1060Api.editStatusTdm1060(r.id ?? undefined, false);
    await dataBind();
    await hzDataBind();
    toast("数据提交成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下分栏（原 splitContainerControl1 上下，SplitterPosition 454） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- 原 groupControl1：单价信息 -->
      <SplitterPanel :size="55" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">单价信息</span>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
            <IconPlus class="h-3 w-3" />添加
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
            <IconPencil class="h-3 w-3" />编辑
          </Button>
          <Button variant="outlined" severity="success" class="shrink-0 whitespace-nowrap" @click="onOpen">
            <IconCheck class="h-3 w-3" />启用
          </Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onClose">
            <IconBan class="h-3 w-3" />禁用
          </Button>
          <label class="ml-auto w-16 shrink-0 text-xs text-muted-foreground">状态</label>
          <Select
            v-model="input.nStatus"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            class="w-28 shrink-0"
          />
          <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
          <DatePicker
            v-model="input.dates1"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始 至 结束"
            class="w-64 shrink-0"
          />
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
            :row-selection="{ mode: 'singleRow', enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onGridReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <!-- 原 groupControl2：汇总信息（xtraTabControl1 两页签） -->
      <SplitterPanel :size="45" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">汇总信息</span>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="hzLoading" @click="onQueryHz">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <label class="ml-auto w-16 shrink-0 text-xs text-muted-foreground">年汇总时间</label>
          <DatePicker
            v-model="input.dates2"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始 至 结束"
            class="w-64 shrink-0"
          />
        </div>
        <Tabs :value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:value="onTabChange">
          <TabList class="flex-wrap">
            <Tab :value="0">当日能耗每小时信息</Tab>
            <Tab :value="1">能耗信息年汇总</Tab>
          </TabList>
          <TabPanels class="min-h-0 flex-1 !p-0">
            <TabPanel :value="0" class="h-full p-0">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="dayColDefs"
                :row-data="dayRows"
                :pagination="false"
                :animate-rows="false"
                :loading="hzLoading"
                @grid-ready="onDayReady"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel :value="1" class="h-full p-0">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="hzColDefs"
                :row-data="hzRows"
                :pagination="false"
                :animate-rows="false"
                :loading="hzLoading"
                @grid-ready="onHzReady"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
