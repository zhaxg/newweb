<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTql6000（二炼钢扒皮台账）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTql6000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'NProType', headerName: '库存类型', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWth', headerName: '宽度', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'NNum', headerName: '件数', width: 120 },
      { field: 'NCalWgt', headerName: '理重', width: 120 },
      { field: 'HasFile', headerName: '是否已上传', width: 120 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 120 },
      { field: 'CSurfaceDefectCode', headerName: '表面缺陷代码', width: 120 },
      { field: 'CSurfaceDefectPosition', headerName: '表面缺陷位置', width: 120 },
      { field: 'CSurfaceDesc', headerName: '表检描述', width: 120 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 120 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 120 },
      { field: 'CFaceHandleAdvice', headerName: '处置措施', width: 120 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 120 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 120 },
      { field: 'NSurfaceThick1', headerName: '尺寸厚1', width: 120 },
      { field: 'NSurfaceThick2', headerName: '尺寸厚2', width: 120 },
      { field: 'NSurfaceThick3', headerName: '尺寸厚3', width: 120 },
      { field: 'NSurfaceLen', headerName: '尺寸长', width: 120 },
      { field: 'NSurfaceWidth', headerName: '尺寸宽', width: 120 },
      { field: 'NLenMin', headerName: '最小长度', width: 120 },
      { field: 'NLenMax', headerName: '最大长度', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
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
