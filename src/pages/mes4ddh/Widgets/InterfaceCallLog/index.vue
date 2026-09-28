<script setup lang="ts">
/** 对应 FrmInterfaceCallLog（接口日志）：Hmx.WinForms.Widgets.Interfaceplatform.FrmInterfaceCallLog
 *  画面迁移，逻辑不迁移到 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import { IconRefresh, IconSearch, IconSettings } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 查询条件（对应原 stackPanel1：调用时间范围 + 接口名称下拉 + 关键字）
const query = reactive({
  dates: null as Date[] | null,
  interfaceName: "",
  keywords: "",
});
// 接口名称下拉项：原窗体 Load 时 QueryAllInterfaceNames 填充（逻辑不迁移）
const interfaceNames = ref<string[]>([]);

const selected = ref<any>(null);
const activeTab = ref("input");

// 列按 Designer.cs VisibleIndex 排序（宽度取原 Width）
const colDefs: ColDef[] = [
  { field: "InterfaceName", headerName: "接口名称", width: 88 },
  { field: "Status", headerName: "请求状态", width: 88 },
  { field: "ExcuteTime", headerName: "请求时间", width: 108 },
  { field: "SourceSystem", headerName: "发方系统", width: 82 },
  { field: "TargetSystem", headerName: "收方系统", width: 82 },
  { field: "RequestId", headerName: "请求ID", width: 82 },
  { field: "MessageId", headerName: "消息ID", width: 89 },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onSelectionChanged(e: SelectionChangedEvent) {
  selected.value = e.api.getSelectedRows()[0] ?? null;
}

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
  } finally {
    querying.value = false;
  }
}
function onReCall() {
  /* TODO */
}
function onSetting() {
  /* TODO */
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（对应 stackPanel1 条件部分）：3 条件 → grid 布局，按钮另起工具栏行 -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">调用时间</label>
          <DatePicker
            v-model="query.dates"
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
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">接口名称</label>
          <Select
            v-model="query.interfaceName"
            :options="interfaceNames"
            filter
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">关键字</label>
          <InputText v-model="query.keywords" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel 内 3 按钮：查询/重试接口/配置，≥3 条件独立成行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onReCall">
        <IconRefresh class="h-3 w-3" />重试接口
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSetting"> <IconSettings class="h-3 w-3" />配置 </Button>
    </div>

    <!-- 主体（对应 splitContainerControl1）：左=日志表格，右=输入/输出/异常 3 页签（MemoEdit 只读） -->
    <Splitter class="min-h-0 flex-1">
      <SplitterPanel :size="56" :minSize="30" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
            row-selection="single"
            :loading="querying"
            @grid-ready="onGridReady"
            @selection-changed="onSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="44" :minSize="20" class="flex flex-col overflow-hidden">
        <Tabs v-model:value="activeTab" class="min-h-0 flex-1 flex-col">
          <div class="flex shrink-0 items-center border-b border-border/60">
            <TabList class="min-w-0 flex-1">
              <Tab value="input">输入信息</Tab>
              <Tab value="out">输出信息</Tab>
              <Tab value="error">异常信息</Tab>
            </TabList>
          </div>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel value="input" class="h-full overflow-auto">
              <pre class="m-0 whitespace-pre-wrap break-all p-3 font-mono text-xs leading-5">{{
                selected?.InputJson ?? ""
              }}</pre>
            </TabPanel>
            <TabPanel value="out" class="h-full overflow-auto">
              <pre class="m-0 whitespace-pre-wrap break-all p-3 font-mono text-xs leading-5">{{
                selected?.OutJson ?? ""
              }}</pre>
            </TabPanel>
            <TabPanel value="error" class="h-full overflow-auto">
              <pre class="m-0 whitespace-pre-wrap break-all p-3 font-mono text-xs leading-5">{{
                selected?.ErrorMsg ?? ""
              }}</pre>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
