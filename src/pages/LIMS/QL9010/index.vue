<script setup lang="ts">
/** 对应 FrmQL9010（委托单信息查询）：DDH.Winforms.LIMS.Forms.FrmQL9010
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

const theme = makeHmxGridTheme();
const testJobRows = ref<any[]>([]);
const sampleRows = ref<any[]>([]);
const resultRows = ref<any[]>([]);
const querying = ref(false);
const testJobGridApi = ref<GridApi | null>(null);
const sampleGridApi = ref<GridApi | null>(null);
const resultGridApi = ref<GridApi | null>(null);

const input = reactive({
  timeRange1: null as Date[] | null,
  timeRange2: null as Date[] | null,
  timeRange3: null as Date[] | null,
  lineCode: "", testNo: "", stove: "", sgSign: "",
  sgStd: "", orderNo: "", batch: "",
});

// 检验委托列（对应原 ucTestJob1）
const testJobColDefs: ColDef[] = [
  { field: "CTestNo", headerName: "委托单号", width: 130 },
  { field: "CStove", headerName: "炉号", width: 90 },
  { field: "CSgSign", headerName: "钢种", width: 90 },
  { field: "CSgStd", headerName: "钢种标准", width: 110 },
  { field: "CLineCode", headerName: "产线", width: 70 },
  { field: "CBatch", headerName: "批号", width: 90 },
  { field: "COrderNo", headerName: "订单号", width: 130 },
  { field: "CStatus", headerName: "状态", width: 80 },
  { field: "CSpec", headerName: "规格", width: 110 },
  { field: "NThick", headerName: "厚度", width: 70 },
  { field: "NWth", headerName: "宽度", width: 70 },
  { field: "NLen", headerName: "长度", width: 70 },
  { field: "CRecheckFlag", headerName: "复验标记", width: 90 },
  { field: "CJudgeResult", headerName: "最终判定结果", width: 110 },
  { field: "CJudgeRemark", headerName: "判定备注", width: 150 },
  { field: "DReceiveTime", headerName: "接收时间", width: 140 },
  { field: "DReceiveUser", headerName: "接收人", width: 90 },
];

// 取样要求列（对应原 ucSampleRequires1）
const sampleColDefs: ColDef[] = [
  { field: "CTestItemTypeDesc", headerName: "试验项目类型", width: 130 },
  { field: "CTestItemName", headerName: "试验项目名称", width: 130 },
  { field: "NTestNum", headerName: "试验数量", width: 90 },
  { field: "NSampleNumRnd", headerName: "取样数量", width: 90 },
  { field: "CSamplePosDesc", headerName: "取样位置", width: 110 },
  { field: "CSampleLenDesc", headerName: "取样长度", width: 110 },
  { field: "CTestPurposeDesc", headerName: "试验目的", width: 120 },
  { field: "CCompleteFlag", headerName: "完成标记", width: 90 },
  { field: "CJudgeResult", headerName: "判定结果", width: 90 },
];

// 检验结果列（对应原 ucTestItemReslut1）
const resultColDefs: ColDef[] = [
  { field: "CTestItemName", headerName: "试验项目名称", width: 130 },
  { field: "CTestSubItemName", headerName: "试验子项目名称", width: 140 },
  { field: "NValue", headerName: "原始值", width: 90 },
  { field: "ValueDisplay", headerName: "显示值", width: 90 },
  { field: "CUnit", headerName: "单位", width: 70 },
  { field: "StdRange", headerName: "标准范围", width: 110 },
  { field: "CJudgeResult", headerName: "判定结果", width: 90 },
  { field: "CJudgeRemark", headerName: "判定备注", width: 150 },
  { field: "CTestUser", headerName: "检验人", width: 90 },
  { field: "DTestTime", headerName: "检验时间", width: 140 },
];

function onTestJobGridReady(e: GridReadyEvent) { testJobGridApi.value = e.api; }
function onSampleGridReady(e: GridReadyEvent) { sampleGridApi.value = e.api; }
function onResultGridReady(e: GridReadyEvent) { resultGridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    testJobRows.value = [];
    sampleRows.value = [];
    resultRows.value = [];
    requestAnimationFrame(() => {
      testJobGridApi.value?.autoSizeAllColumns();
      sampleGridApi.value?.autoSizeAllColumns();
      resultGridApi.value?.autoSizeAllColumns();
    });
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：10个条件 → 6列 grid（2行） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">接收时间</label>
          <DatePicker v-model="input.timeRange1" selection-mode="range" :manual-input="false"
            date-format="yy-mm-dd" show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">判定时间</label>
          <DatePicker v-model="input.timeRange2" selection-mode="range" :manual-input="false"
            date-format="yy-mm-dd" show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">发送时间</label>
          <DatePicker v-model="input.timeRange3" selection-mode="range" :manual-input="false"
            date-format="yy-mm-dd" show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <InputText v-model="input.lineCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">委托单号</label>
          <InputText v-model="input.testNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="input.stove" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.sgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="input.sgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.orderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="input.batch" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 操作工具栏：1个按钮 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">委托单信息查询（{{ testJobRows.length }}）</span>
    </div>

    <!-- 嵌套三层 Splitter -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左栏：检验委托 -->
      <SplitterPanel :size="35" :minSize="20" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">检验委托（{{ testJobRows.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="testJobColDefs" :row-data="testJobRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onTestJobGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 右栏：上下分层 -->
      <SplitterPanel :minSize="35" class="flex flex-col">
        <Splitter class="min-h-0 flex-1" layout="vertical">
          <!-- 右上：取样要求 -->
          <SplitterPanel :size="45" :minSize="25" class="flex flex-col">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">取样要求（{{ sampleRows.length }}）</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="sampleColDefs" :row-data="sampleRows"
                :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                :suppress-column-virtualisation="true"
                :pagination="false" :animate-rows="false"
                @grid-ready="onSampleGridReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>

          <!-- 右下：检验结果 -->
          <SplitterPanel :minSize="25" class="flex flex-col">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">检验结果（{{ resultRows.length }}）</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="resultColDefs" :row-data="resultRows"
                :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                :suppress-column-virtualisation="true"
                :pagination="false" :animate-rows="false"
                @grid-ready="onResultGridReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
