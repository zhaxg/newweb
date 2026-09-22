<script setup lang="ts">
/** 对应 FrmTql1050（中厚板表面判定）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTql1050
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

// 表面判定记录列
const recordColDefs: ColDef[] = [
  { field: "CStove", headerName: "炉号", width: 90 },
  { field: "CPieceNo", headerName: "头侧件次号", width: 110 },
  { field: "CSlabPieceNo", headerName: "板坯号", width: 100 },
  { field: "CLineCode", headerName: "产线", width: 70 },
  { field: "CSgCode", headerName: "钢种", width: 90 },
  { field: "CSpec", headerName: "规格", width: 120 },
  { field: "NNum", headerName: "件数", width: 60 },
  { field: "NCalWgt", headerName: "理重", width: 70 },
  { field: "CSurfaceResult", headerName: "表检结果", width: 90 },
  { field: "CSurfaceCategory", headerName: "判定分类", width: 90 },
  { field: "CSurfaceDefectCode", headerName: "表面缺陷代码", width: 110 },
  { field: "CSurfaceDesc", headerName: "表检描述", width: 150 },
  { field: "CSurfaceUser", headerName: "表面判定人", width: 100 },
  { field: "DSurfaceTime", headerName: "表面判定时间", width: 140 },
  { field: "CFaceHandleAdvice", headerName: "处置措施", width: 110 },
  { field: "NThick", headerName: "厚度", width: 70 },
  { field: "NWth", headerName: "宽度", width: 70 },
  { field: "NLen", headerName: "长度", width: 70 },
  { field: "CIsDisable", headerName: "作废标记", width: 80 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
];

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
function onSurfaceJudge() { toast("画面迁移：表面判定逻辑待接入", 2000, "warn"); }
function onQueryRecord() { toast("画面迁移：查询判定记录逻辑待接入", 2000, "warn"); }
function onDisable() { toast("画面迁移：作废逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部工具栏：查询 + 表面判定 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSurfaceJudge">
        <IconCheck class="h-3 w-3" />表面判定
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">中厚板表面判定</span>
    </div>

    <!-- 左右主子表：左=库存查看器，右=判定记录 -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左：库存查看器（对应原 ucStorage1） -->
      <SplitterPanel :size="30" :minSize="20" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">库存材料</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="recordColDefs" :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 右：判定记录 + 查询栏 -->
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
            :default-col-def="hmxDefaultColDef" :column-defs="recordColDefs" :row-data="recordRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false"
            @grid-ready="onRecordGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
