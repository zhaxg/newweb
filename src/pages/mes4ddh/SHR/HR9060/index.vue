<script setup lang="ts">
/** 对应 FrmHR9060（超快冷实绩）：DDH.Winforms.SHR.Forms.FrmHR9060
 *  已接入：hR9000Api.queryTiL2me14s / queryTiL2me14sGroupHz / queryTiL2me14sAuthorHz（汇总随页签切换重算）
 *  偏差：coolMode/班组/责任者 KV 列显示原值；汇总带（空冷/水冷/DQ）用 AG Grid 表头分组呈现 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import {
  hR9000Api,
  type DtoQueryL2,
  type QueryHR9060HzDto,
  type TimeRange,
  type TiL2me14Dto,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();

/* ---------- 时间（原 ucTimeRange，默认本月） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（DtoQueryL2） ---------- */
const input = reactive({
  planNo: "",
  slabNo: "",
  cBatchNo: "",
  cBatchOrder: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 上：ACC超快冷实绩（gridView1 / TiL2me14Dto） ---------- */
const rows = shallowRef<TiL2me14Dto[]>([]);
const rawList = shallowRef<TiL2me14Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 112 },
  { colId: "cBilletTypeCode", field: "cBilletTypeCode", headerName: "铸坯标识", width: 112 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 112 },
  { colId: "slabNo", field: "slabNo", headerName: "板坯号", width: 112 },
  { colId: "steelGrade", field: "steelGrade", headerName: "钢种", width: 112 },
  { colId: "thick", field: "thick", headerName: "厚度", width: 112 },
  { colId: "width", field: "width", headerName: "宽度", width: 112 },
  { colId: "length", field: "length", headerName: "长度", width: 112 },
  { colId: "cCoolMode", field: "cCoolMode", headerName: "冷却模式", width: 112 },
  { colId: "startCoolTime", field: "startCoolTime", headerName: "开冷时间", width: 112 },
  { colId: "finishCoolTime", field: "finishCoolTime", headerName: "终冷时间", width: 112 },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
  { colId: "rollAveTemp", field: "rollAveTemp", headerName: "轧后平均温度", width: 112 },
  { colId: "rollMaxTemp", field: "rollMaxTemp", headerName: "轧后温度最大值", width: 112 },
  { colId: "rollMinTemp", field: "rollMinTemp", headerName: "轧后温度最小值", width: 112 },
  { colId: "entryAveTemp", field: "entryAveTemp", headerName: "开冷平均温度", width: 112 },
  { colId: "entryMaxTemp", field: "entryMaxTemp", headerName: "开冷最大温度", width: 112 },
  { colId: "entryMinTemp", field: "entryMinTemp", headerName: "开冷最小温度", width: 112 },
  { colId: "targetFinishTemp", field: "targetFinishTemp", headerName: "目标返红温度", width: 112 },
  { colId: "finishAveTemp", field: "finishAveTemp", headerName: "返红平均温度", width: 112 },
  { colId: "finishMaxTemp", field: "finishMaxTemp", headerName: "返红温度最大", width: 112 },
  { colId: "finishMinTemp", field: "finishMinTemp", headerName: "返红温度最小", width: 112 },
  { colId: "nTempXb", field: "nTempXb", headerName: "实测下表返红温度", width: 112 },
  { colId: "scanAveTemp", field: "scanAveTemp", headerName: "扫描高温计平均温度", width: 112 },
  { colId: "scanMaxTemp", field: "scanMaxTemp", headerName: "扫描高温计最大温度", width: 112 },
  { colId: "scanMinTemp", field: "scanMinTemp", headerName: "扫描高温计最小温度", width: 112 },
  { colId: "coolingRate", field: "coolingRate", headerName: "实际冷速", width: 112 },
  { colId: "fluxA", field: "fluxA", headerName: "A区设定流量", width: 112 },
  { colId: "fluxB", field: "fluxB", headerName: "B区设定流量", width: 112 },
  { colId: "actFluxA", field: "actFluxA", headerName: "A区实际流量", width: 112 },
  { colId: "actFluxB", field: "actFluxB", headerName: "B区实际流量", width: 112 },
  { colId: "ratioA", field: "ratioA", headerName: "A区设定水比", width: 112 },
  { colId: "ratioB", field: "ratioB", headerName: "B区设定水比", width: 112 },
  { colId: "actRatioA", field: "actRatioA", headerName: "A区实际水比", width: 112 },
  { colId: "actRatioB", field: "actRatioB", headerName: "B区实际水比", width: 112 },
  { colId: "speed", field: "speed", headerName: "设定辊速", width: 112 },
  { colId: "actSpeed", field: "actSpeed", headerName: "实际辊速", width: 112 },
  { colId: "aspd", field: "aspd", headerName: "设定加速度", width: 112 },
  { colId: "actAspd", field: "actAspd", headerName: "实际加速度", width: 112 },
  { colId: "num", field: "num", headerName: "开启集管组数", width: 112 },
  { colId: "sideSpary", field: "sideSpary", headerName: "侧喷", width: 112 },
  { colId: "midSpary", field: "midSpary", headerName: "中喷", width: 112 },
  { colId: "hTSIS", field: "hTSIS", headerName: "头尾遮蔽投入信号", width: 112 },
  { colId: "headUpLength", field: "headUpLength", headerName: "头上长度", width: 112 },
  { colId: "headBotLength", field: "headBotLength", headerName: "头下长度", width: 112 },
  { colId: "headUpCoef", field: "headUpCoef", headerName: "头上系数", width: 112 },
  { colId: "headBotCoef", field: "headBotCoef", headerName: "头下系数", width: 112 },
  { colId: "tailUpLength", field: "tailUpLength", headerName: "尾上长度", width: 112 },
  { colId: "tailBotLength", field: "tailBotLength", headerName: "尾下长度", width: 112 },
  { colId: "tailUpCoef", field: "tailUpCoef", headerName: "尾上系数", width: 112 },
  { colId: "tailBotCoef", field: "tailBotCoef", headerName: "尾下系数", width: 112 },
  { colId: "tempWater", field: "tempWater", headerName: "水温", width: 112 },
  { colId: "pressWater", field: "pressWater", headerName: "水压", width: 112 },
  { colId: "total_flow", field: "total_flow", headerName: "总水量", width: 112 },
  { colId: "cAuthor", field: "cAuthor", headerName: "责任者", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 112, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 112, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 112, hide: true },
  { colId: "dHandle", field: "dHandle", headerName: "处理时间", width: 112, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "处理结果", width: 112, hide: true },
  { colId: "coolMode", field: "coolMode", headerName: "冷却模式", width: 112, hide: true },
  { colId: "uppipeFlow", field: "uppipeFlow", headerName: "1-28集管上流量", width: 112, hide: true },
  { colId: "botpipeFlow", field: "botpipeFlow", headerName: "1-28集管下流量", width: 112, hide: true },
  { colId: "sideCavityFlow1", field: "sideCavityFlow1", headerName: "1-10边腔流量", width: 112, hide: true },
  { colId: "prh", field: "prh", headerName: "压辊高度A1-10prh", width: 112, hide: true },
  { colId: "eLPBCD", field: "eLPBCD", headerName: "电降平台bcd", width: 112, hide: true },
  { colId: "iSpare", field: "iSpare", headerName: "备用", width: 112, hide: true },
  { colId: "fSpare", field: "fSpare", headerName: "备用", width: 112, hide: true },
  { colId: "finishTemp", field: "finishTemp", headerName: "反红温度曲线", width: 112, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
];

/* ---------- 下：汇总（bandedGridView1 班组 / bandedGridView2 责任者） ---------- */
const hzLoading = ref(false);
const hzGroupRows = shallowRef<QueryHR9060HzDto[]>([]);
const hzAuthorRows = shallowRef<QueryHR9060HzDto[]>([]);
const activeTab = ref(0);

const hzGroupColDefs: (ColGroupDef | ColDef)[] = [
  {
    groupId: "g1",
    headerName: "",
    children: [
      { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112 },
      { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
    ],
  },
  {
    groupId: "kl",
    headerName: "空冷",
    children: [
      { colId: "nKLQua", field: "nKLQua", headerName: "块数", width: 112 },
      { colId: "nKLRate", field: "nKLRate", headerName: "比例", width: 112 },
    ],
  },
  {
    groupId: "sl",
    headerName: "水冷",
    children: [
      { colId: "nSLQua", field: "nSLQua", headerName: "块数", width: 112 },
      { colId: "nSLRate", field: "nSLRate", headerName: "比例", width: 112 },
    ],
  },
  {
    groupId: "dq",
    headerName: "DQ(高压模式)",
    children: [
      { colId: "nDQQua", field: "nDQQua", headerName: "块数", width: 112 },
      { colId: "nDQRate", field: "nDQRate", headerName: "比例", width: 112 },
    ],
  },
  { colId: "author", field: "author", headerName: "责任者", width: 112, hide: true },
];

const hzAuthorColDefs: (ColGroupDef | ColDef)[] = [
  {
    groupId: "g2",
    headerName: "",
    children: [
      { colId: "author", field: "author", headerName: "责任者", width: 112 },
      { colId: "nQua", field: "nQua", headerName: "块数", width: 112 },
    ],
  },
  {
    groupId: "kl",
    headerName: "空冷",
    children: [
      { colId: "nKLQua", field: "nKLQua", headerName: "块数", width: 112 },
      { colId: "nKLRate", field: "nKLRate", headerName: "比例", width: 112 },
    ],
  },
  {
    groupId: "sl",
    headerName: "水冷",
    children: [
      { colId: "nSLQua", field: "nSLQua", headerName: "块数", width: 112 },
      { colId: "nSLRate", field: "nSLRate", headerName: "比例", width: 112 },
    ],
  },
  {
    groupId: "dq",
    headerName: "DQ(高压模式)",
    children: [
      { colId: "nDQQua", field: "nDQQua", headerName: "块数", width: 112 },
      { colId: "nDQRate", field: "nDQRate", headerName: "比例", width: 112 },
    ],
  },
  { colId: "cShiftGroup", field: "cShiftGroup", headerName: "班组", width: 112, hide: true },
];

async function hzBind() {
  hzLoading.value = true;
  try {
    if (activeTab.value === 0) {
      hzGroupRows.value = (await hR9000Api.queryTiL2me14sGroupHz(rawList.value)) ?? [];
    } else {
      hzAuthorRows.value = (await hR9000Api.queryTiL2me14sAuthorHz(rawList.value)) ?? [];
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    hzLoading.value = false;
  }
}

function onTabChange(idx: string | number) {
  activeTab.value = Number(idx);
  void hzBind();
}

async function query() {
  loading.value = true;
  try {
    const dto: DtoQueryL2 = {
      dRange: toTimeRange(input.dates),
      planNo: input.planNo.trim() || null,
      slabNo: input.slabNo.trim() || null,
      cBatchNo: input.cBatchNo.trim() || null,
      cBatchOrder: input.cBatchOrder.trim() || null,
    };
    const list = (await hR9000Api.queryTiL2me14s(dto)) ?? [];
    rawList.value = list;
    rows.value = list;
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
  await hzBind();
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">计划号</label>
        <InputText v-model="input.planNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">板坯号</label>
        <InputText v-model="input.slabNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">组批号</label>
        <InputText v-model="input.cBatchOrder" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">作业时间</label>
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
      <div class="col-span-2 flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <div class="flex min-h-0 flex-1 flex-col">
      <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs font-medium text-muted-foreground">ACC超快冷实绩</span>
      </div>
      <div class="min-h-0 flex-[7] overflow-hidden">
        <AgGridVue
          class="hmx-ag-grid h-full w-full"
          :theme="theme"
          :locale-text="AG_GRID_LOCALE_CN"
          :default-col-def="hmxDefaultColDef"
          :column-defs="colDefs"
          :row-data="rows"
          :pagination="false"
          :animate-rows="false"
          :loading="loading"
          @grid-ready="onReady"
          @first-data-rendered="autoSizeOnFirstData"
        />
      </div>
      <div class="flex min-h-0 flex-[3] flex-col border-t border-border/60">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">汇总信息</span>
        </div>
        <Tabs :value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:value="onTabChange">
          <TabList>
            <Tab :value="0">超快冷实绩班组汇总</Tab>
            <Tab :value="1">超快冷实绩责任者汇总</Tab>
          </TabList>
          <TabPanels class="min-h-0 flex-1">
            <TabPanel :value="0" class="h-full p-0">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="hzGroupColDefs"
                :row-data="hzGroupRows"
                :pagination="false"
                :animate-rows="false"
                :loading="hzLoading"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
            <TabPanel :value="1" class="h-full p-0">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="hzAuthorColDefs"
                :row-data="hzAuthorRows"
                :pagination="false"
                :animate-rows="false"
                :loading="hzLoading"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </div>
  </div>
</template>
