<script setup lang="ts">
/** 对应 FrmQL4000（检验结果录入）：DDH.Winforms.LIMS.Forms.FrmQL4000
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconCheck, IconFlask, IconRefresh, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const testJobRows = ref<any[]>([]);
const resultRows = ref<any[]>([]);
const querying = ref(false);
const activeTab = ref("batch");
const testJobGridApi = ref<GridApi | null>(null);
const resultGridApi = ref<GridApi | null>(null);

const input = reactive({
  timeRange: null as Date[] | null,
  lineCode: "", testNo: "", stove: "", sgSign: "",
  sgStd: "", recheckFlag: "", testItemType: "", batch: "",
});

// 检验委托列（对应原 ucTestJob1）
const testJobColDefs: ColDef[] = [
  { field: "CTestNo", headerName: "委托单号", width: 130 },
  { field: "CStove", headerName: "炉号", width: 90 },
  { field: "CSgSign", headerName: "钢种", width: 90 },
  { field: "CSgStd", headerName: "钢种标准", width: 110 },
  { field: "CLineCode", headerName: "产线", width: 70 },
  { field: "CBatch", headerName: "批号", width: 90 },
  { field: "CRecheckFlag", headerName: "复验标记", width: 90 },
  { field: "CStatus", headerName: "状态", width: 80 },
  { field: "COrderNo", headerName: "订单号", width: 130 },
  { field: "CSpec", headerName: "规格", width: 110 },
  { field: "NThick", headerName: "厚度", width: 70 },
  { field: "NWth", headerName: "宽度", width: 70 },
  { field: "NLen", headerName: "长度", width: 70 },
];

// 检验项目结果列（对应原 ucTestItemResult）
const resultColDefs: ColDef[] = [
  { field: "CTestItemName", headerName: "试验项目名称", width: 130 },
  { field: "CTestSubItemName", headerName: "试验子项目名称", width: 140 },
  { field: "NValue", headerName: "原始值", width: 90 },
  { field: "ValueDisplay", headerName: "显示值", width: 90 },
  { field: "CUnit", headerName: "单位", width: 70 },
  { field: "StdRange", headerName: "标准范围", width: 110 },
  { field: "MainRange", headerName: "内控范围", width: 110 },
  { field: "CJudgeResult", headerName: "判定结果", width: 90 },
  { field: "CJudgeRemark", headerName: "判定备注", width: 150 },
  { field: "CTestUser", headerName: "检验人", width: 90 },
  { field: "DTestTime", headerName: "检验时间", width: 140 },
  { field: "CCompleteFlag", headerName: "完成标记", width: 90 },
  { field: "CCompleteUser", headerName: "完成人", width: 90 },
  { field: "DCompleteTime", headerName: "完成时间", width: 140 },
  { field: "CCheckStatus", headerName: "检查状态", width: 90 },
  { field: "CCheckUser", headerName: "检查人", width: 90 },
  { field: "DCheckTime", headerName: "检查时间", width: 140 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
];

function onTestJobGridReady(e: GridReadyEvent) { testJobGridApi.value = e.api; }
function onResultGridReady(e: GridReadyEvent) { resultGridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    testJobRows.value = [];
    resultRows.value = [];
    requestAnimationFrame(() => {
      testJobGridApi.value?.autoSizeAllColumns();
      resultGridApi.value?.autoSizeAllColumns();
    });
  } finally {
    querying.value = false;
  }
}
function onCollect() { toast("画面迁移：采集试验结果逻辑待接入", 2000, "warn"); }
function onSubmitAudit() { toast("画面迁移：提交审核逻辑待接入", 2000, "warn"); }
function onUpdateItem() { toast("画面迁移：更新检验项目逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：9个条件 → 6列 grid -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
          <DatePicker v-model="input.timeRange" selection-mode="range" :manual-input="false"
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
          <label class="w-16 shrink-0 text-xs text-muted-foreground">复验标记</label>
          <InputText v-model="input.recheckFlag" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">试验类型</label>
          <InputText v-model="input.testItemType" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
          <InputText v-model="input.batch" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 操作工具栏：4个按钮 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCollect">
        <IconFlask class="h-3 w-3" />采集试验结果
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSubmitAudit">
        <IconCheck class="h-3 w-3" />提交审核
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onUpdateItem">
        <IconRefresh class="h-3 w-3" />更新检验项目
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">检验结果录入（{{ testJobRows.length }}）</span>
    </div>

    <!-- Splitter：左=检验委托，右=Tab结果录入 -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左栏：检验委托（对应原 ucTestJob1） -->
      <SplitterPanel :size="25" :minSize="15" class="flex flex-col">
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

      <!-- 右栏：Tab结果录入（对应原 xtraTabControl1） -->
      <SplitterPanel :minSize="40" class="flex flex-col">
        <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab value="batch">批量录入</Tab>
              <Tab value="single">单条录入</Tab>
            </TabList>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
          <!-- Tab1: 批量录入（对应原 ucTestItemResultMuti1） -->
          <TabPanel value="batch" class="h-full overflow-hidden">
            <div class="flex flex-col gap-2">
              <div class="flex items-center gap-2">
                <span class="text-xs text-muted-foreground">批量录入检验项目结果</span>
              </div>
              <div class="min-h-0 flex-1 overflow-hidden">
                <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef" :column-defs="resultColDefs" :row-data="resultRows"
                  :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                  :suppress-column-virtualisation="true"
                  :pagination="false" :animate-rows="false"
                  @grid-ready="onResultGridReady" @first-data-rendered="autoSizeOnFirstData" />
              </div>
            </div>
          </TabPanel>

          <!-- Tab2: 单条录入（对应原 ucTestItemResult1） -->
          <TabPanel value="single" class="h-full overflow-auto">
            <div class="flex flex-col gap-2 p-2">
              <p class="text-xs text-muted-foreground">选择左侧委托后，在此录入单条检验结果</p>
            </div>
          </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
