<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTiGzmfile（标准/工艺文件管理）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTiGzmfile
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 120 },
      { field: 'UseUnit', headerName: '使用单位', width: 60 },
      { field: 'MatKind', headerName: '厂别区分', width: 60 },
      { field: 'ControlState', headerName: '受控状态', width: 60 },
      { field: 'Variety', headerName: '文件种类', width: 60 },
      { field: 'RegulateNo', headerName: '工艺规程号', width: 60 },
      { field: 'RegulateName', headerName: '文件名称', width: 60 },
      { field: 'SgStd', headerName: '标准', width: 60 },
      { field: 'SgSign', headerName: '钢种', width: 60 },
      { field: 'VersionNo', headerName: '版本号', width: 60 },
      { field: 'CIsEnable', headerName: '是否启用', width: 60 },
      { field: 'DutyMan', headerName: '负责人', width: 60 },
      { field: 'PublishDate', headerName: '发布日期', width: 60 },
      { field: 'Remark', headerName: '备注', width: 60 },
      { field: 'CUptUser', headerName: '修改人', width: 60 },
      { field: 'DUptDate', headerName: '修改时间', width: 60 },
      { field: 'CScrapUser', headerName: '报废操作人', width: 60 },
      { field: 'DScrapDate', headerName: '作废时间', width: 60 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">

      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
        <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
