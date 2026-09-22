<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmDM1030（磨削实绩）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1030
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CRollerNo', headerName: '轧辊号', width: 112 },
      { field: 'NRollerType', headerName: '轧辊类型', width: 112 },
      { field: 'NFrontHeadPath', headerName: '磨前头部直径mm', width: 112 },
      { field: 'NFrontCenterPath', headerName: '磨前中部直径mm', width: 112 },
      { field: 'NFrontTailPath', headerName: '磨前尾部直径mm', width: 112 },
      { field: 'NLastHeadPath', headerName: '磨后头部直径mm', width: 112 },
      { field: 'NLastCenterPath', headerName: '磨后中部直径mm', width: 112 },
      { field: 'NLastTailPath', headerName: '磨后尾部直径mm', width: 112 },
      { field: 'NGrindNum', headerName: '磨削量0.01mm', width: 112 },
      { field: 'NHeadRoundness', headerName: '头圆度', width: 112 },
      { field: 'NCenterRoundness', headerName: '中圆度', width: 112 },
      { field: 'NTailRoundness', headerName: '尾圆度', width: 112 },
      { field: 'NRollerTol', headerName: '辊型偏差', width: 112 },
      { field: 'NCenterHeight', headerName: '中高', width: 112 },
      { field: 'DGrindStartTime', headerName: '磨削开始时间', width: 112 },
      { field: 'DGrindEndTime', headerName: '磨削结束时间', width: 112 },
      { field: 'NGrindNo', headerName: '磨削程序号', width: 112 },
      { field: 'COperator', headerName: '操作人员', width: 112 },
      { field: 'NOrderNum', headerName: '磨削序号', width: 112 },
      { field: 'NHandleFlag', headerName: '处理标识', width: 112 },
      { field: 'CRemark', headerName: '备注', width: 112 },
      { field: 'CSyncFlag', headerName: '是否同步轧辊数据', width: 112 },
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
