<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1300（产量指标）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1300
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'DDateMonth', headerName: '月份', width: 112 },
      { field: 'NPlanProduct', headerName: '目标产量', width: 112 },
      { field: 'DJqStopTime', headerName: '剪切线停机时间', width: 112 },
      { field: 'DStopTime', headerName: '总停机时间', width: 112 },
      { field: 'Date', headerName: '日期', width: 112 },
      { field: 'NWorkTime', headerName: '作业时间', width: 112 },
      { field: 'NSlabQua1', headerName: '支数', width: 112 },
      { field: 'NSlabWgt1', headerName: '重量', width: 112 },
      { field: 'NSlabQua2', headerName: '支数', width: 112 },
      { field: 'NSlabWgt2', headerName: '重量', width: 112 },
      { field: 'NSlabQua0', headerName: '支数', width: 112 },
      { field: 'NSlabWgt0', headerName: '重量', width: 112 },
      { field: 'NSlabQuaAll', headerName: '支数', width: 112 },
      { field: 'NSlabWgtAll', headerName: '重量', width: 112 },
      { field: 'NPlateQua1', headerName: '支数', width: 112 },
      { field: 'NPlateWgt1', headerName: '重量', width: 112 },
      { field: 'NPlateQua2', headerName: '支数', width: 112 },
      { field: 'NPlateWgt2', headerName: '重量', width: 112 },
      { field: 'NPlateQua0', headerName: '支数', width: 112 },
      { field: 'NPlateWgt0', headerName: '重量', width: 112 },
      { field: 'NPlateQuaAll', headerName: '支数', width: 112 },
      { field: 'NPlateWgtAll', headerName: '重量', width: 112 },
      { field: 'NRollWgt', headerName: '轧制板重t', width: 112 },
      { field: 'NRollQua', headerName: '支数', width: 112 },
      { field: 'NInHouseQua', headerName: '支数', width: 112 },
      { field: 'NInHouseWgt', headerName: '重量', width: 112 },
      { field: 'NRate', headerName: '收得率', width: 112 },
      { field: 'NOneQua1', headerName: '支数', width: 112 },
      { field: 'NOneWgt1', headerName: '重量', width: 112 },
      { field: 'NOneQua2', headerName: '支数', width: 112 },
      { field: 'NOneWgt2', headerName: '重量', width: 112 },
      { field: 'NOneQua0', headerName: '支数', width: 112 },
      { field: 'NOneWgt0', headerName: '重量', width: 112 },
      { field: 'NOneQuaAll', headerName: '支数', width: 112 },
      { field: 'NOneWgtAll', headerName: '重量', width: 112 },
      { field: 'NOneTimeQua', headerName: '支数', width: 112 },
      { field: 'NOneTimeWgt', headerName: '重量', width: 112 },
      { field: 'NTwoQua1', headerName: '支数', width: 112 },
      { field: 'NTwoWgt1', headerName: '重量', width: 112 },
      { field: 'NTwoQua2', headerName: '支数', width: 112 },
      { field: 'NTwoWgt2', headerName: '重量', width: 112 },
      { field: 'NTwoQua0', headerName: '支数', width: 112 },
      { field: 'NTwoWgt0', headerName: '重量', width: 112 },
      { field: 'NTwoQuaAll', headerName: '支数', width: 112 },
      { field: 'NTwoWgtAll', headerName: '重量', width: 112 },
      { field: 'NTwoTimeQua', headerName: '支数', width: 112 },
      { field: 'NTwoTimeWgt', headerName: '重量', width: 112 },
      { field: 'NQuaAll', headerName: '轧制支数', width: 112 },
      { field: 'NWgtAll', headerName: '钢板合计重量', width: 112 },
      { field: 'NTimeQua', headerName: '支数', width: 112 },
      { field: 'NTimeWgt', headerName: '重量', width: 112 },
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
