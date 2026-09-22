<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS9200（连铸产出实绩查询）：DDH.Winforms.SMS.Forms.FrmMS9200
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CStove', headerName: '炉号', width: 112 },
      { field: 'Date', headerName: '日期', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'NQua', headerName: '支数', width: 112 },
      { field: 'CShiftGroup', headerName: '班组', width: 112 },
      { field: 'CPieceSlabNo', headerName: '板坯号', width: 112 },
      { field: 'NThick', headerName: '厚度', width: 112 },
      { field: 'NHotQua', headerName: '热送块数', width: 112 },
      { field: 'NWth', headerName: '宽度', width: 112 },
      { field: 'NHotWgt', headerName: '热送重量', width: 112 },
      { field: 'NLen', headerName: '长度', width: 112 },
      { field: 'NDownQua', headerName: '下线块数', width: 112 },
      { field: 'CSpec', headerName: '规格', width: 112 },
      { field: 'NDownWgt', headerName: '下线重量', width: 112 },
      { field: 'NWgt', headerName: '重量', width: 112 },
      { field: 'CIsHot', headerName: '是否热送', width: 112 },
      { field: 'CProductStove', headerName: '产出炉号汇总', width: 112 },
      { field: 'CIsDown', headerName: '是否下线', width: 112 },
      { field: 'CIsZh', headerName: '是否照核', width: 112 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 112 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 112 },
      { field: 'DProTime', headerName: '产出时间', width: 112 },
      { field: 'DPlanTime', headerName: '计划时间', width: 112 },
      { field: 'DFurTime', headerName: '入炉时间', width: 112 },
      { field: 'DZhTime', headerName: '照核时间', width: 112 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">

      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>
        <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
