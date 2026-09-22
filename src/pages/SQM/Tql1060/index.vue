<script setup lang="ts">
/** 对应 FrmTql1060（中厚板探伤判定）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTql1060
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const recordRows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const recordGridApi = ref<GridApi | null>(null);

const recordTime = ref<Date[] | null>(null);
const stoveNo = ref("");
const pieceNo = ref("");

const colDefs: ColDef[] = [
      { field: "Selected", headerName: "Selected", width: 112 },
      { field: "CStove", headerName: "CStove", width: 112 },
      { field: "CPieceNo", headerName: "CPieceNo", width: 112 },
      { field: "CSlabPieceNo", headerName: "CSlabPieceNo", width: 112 },
      { field: "CIsDisable", headerName: "CIsDisable", width: 112 },
      { field: "CSgCode", headerName: "CSgCode", width: 112 },
      { field: "CInboundNo", headerName: "CInboundNo", width: 112 },
      { field: "CSgStd", headerName: "CSgStd", width: 112 },
      { field: "CSpec", headerName: "CSpec", width: 112 },
      { field: "NNum", headerName: "NNum", width: 112 },
      { field: "NCalWgt", headerName: "NCalWgt", width: 112 },
      { field: "CDetectResultCode", headerName: "CDetectResultCode", width: 112 },
      { field: "CDetectDefectLevel", headerName: "CDetectDefectLevel", width: 112 },
      { field: "CSurfaceUser", headerName: "CSurfaceUser", width: 112 },
      { field: "DSurfaceTime", headerName: "DSurfaceTime", width: 112 },
      { field: "CShiftNo", headerName: "CShiftNo", width: 112 },
      { field: "CGroupNo", headerName: "CGroupNo", width: 112 },
      { field: "CLineCode", headerName: "CLineCode", width: 112 },
      { field: "NProType", headerName: "NProType", width: 112 },
      { field: "NThick", headerName: "NThick", width: 112 },
      { field: "NWth", headerName: "NWth", width: 112 },
      { field: "NLen", headerName: "NLen", width: 112 },
      { field: "NWgt", headerName: "NWgt", width: 112 },
      { field: "CDefectDefectMark", headerName: "CDefectDefectMark", width: 112 },
      { field: "COrderNo", headerName: "COrderNo", width: 112 },
];;

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }
function onRecordGridReady(e: GridReadyEvent) { recordGridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    recordRows.value = [];
    requestAnimationFrame(() => {
      gridApi.value?.autoSizeAllColumns();
      recordGridApi.value?.autoSizeAllColumns();
    });
  } finally {
    querying.value = false;
  }
}
function onDetectJudge() { toast("画面迁移：探伤判定逻辑待接入", 2000, "warn"); }
function onQueryRecord() { toast("画面迁移：查询判定记录逻辑待接入", 2000, "warn"); }
function onDisable() { toast("画面迁移：作废逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDetectJudge">
        <IconCheck class="h-3 w-3" />探伤判定
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">中厚板探伤判定</span>
    </div>

    <!-- 左右主子表 -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <SplitterPanel :size="30" :minSize="20" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">库存材料</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="30" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <DatePicker v-model="recordTime" selection-mode="range" :manual-input="false"
            date-format="yy-mm-dd" show-icon placeholder="时间" class="w-56 shrink-0" />
          <InputText v-model="stoveNo" placeholder="炉号" class="w-28 shrink-0" />
          <InputText v-model="pieceNo" placeholder="件次号" class="w-28 shrink-0" />
          <Button text class="shrink-0 whitespace-nowrap" @click="onQueryRecord">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDisable">
            <IconTrash class="h-3 w-3" />作废
          </Button>
          <span class="ml-auto text-xs text-muted-foreground">判定记录（{{ recordRows.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="recordRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false"
            @grid-ready="onRecordGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
