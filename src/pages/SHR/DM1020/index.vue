<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmDM1020（轧辊管理）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1020
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CRollerNo', headerName: '轧辊号', width: 112 },
      { field: 'CStandNo', headerName: '机架号', width: 112 },
      { field: 'CAssemPosition', headerName: '装配位置', width: 112 },
      { field: 'CRollerMaterial', headerName: '轧辊材质', width: 112 },
      { field: 'NRollerPath', headerName: '辊径mm', width: 112 },
      { field: 'NRollerCrown', headerName: '轧辊凸度mm', width: 112 },
      { field: 'CRollerType', headerName: '轧辊类型', width: 112 },
      { field: 'CRollerRollType', headerName: '轧辊辊型', width: 112 },
      { field: 'COperateBear', headerName: '操作侧轴承座', width: 112 },
      { field: 'CTranBear', headerName: '传动侧轴承座', width: 112 },
      { field: 'NRollNum', headerName: '本次轧制块数', width: 112 },
      { field: 'NRollLen', headerName: '轧制长mm', width: 112 },
      { field: 'NRollTime', headerName: '本次轧制时间', width: 112 },
      { field: 'NRollWgt', headerName: '轧制板重t', width: 112 },
      { field: 'NAllNum', headerName: '累计块数', width: 112 },
      { field: 'NAllLen', headerName: '累计长度', width: 112 },
      { field: 'NAllTime', headerName: '总时间', width: 112 },
      { field: 'NAllWgt', headerName: '累计重量', width: 112 },
      { field: 'DPlanTime', headerName: '计划时间', width: 112 },
      { field: 'DDownTime', headerName: '下发时间', width: 112 },
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
