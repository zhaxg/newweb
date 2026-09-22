<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2020_KR（炼钢总厂铁水脱硫）：DDH.Winforms.SMS.Forms.FrmMS2020_KR
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CPotNo', headerName: '罐号', width: 120 },
      { field: 'CIronNo', headerName: '铁次号', width: 120 },
      { field: 'CCarNo', headerName: '车号', width: 120 },
      { field: 'NWgtPz', headerName: '钢水皮重', width: 120 },
      { field: 'NWgtMz', headerName: '钢水毛重', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'NLgTemperature', headerName: '炼钢铁水站测温', width: 107 },
      { field: 'NLgKrTemperature', headerName: '炼钢KR测温', width: 85 },
      { field: 'CKrSign', headerName: '脱硫标识', width: 120 },
      { field: 'CKrState', headerName: '脱硫状态', width: 120 },
      { field: 'DInStationTime', headerName: '脱硫到站时间', width: 95 },
      { field: 'DOutStationTime', headerName: '脱硫离站时间', width: 95 },
      { field: 'NWgtTlj', headerName: '脱硫剂添加量', width: 95 },
      { field: 'DAccountDateKR', headerName: 'KR账务日期', width: 85 },
      { field: 'DTeamDateKR', headerName: 'KR班次日期', width: 85 },
      { field: 'CShiftKR', headerName: 'KR班次', width: 120 },
      { field: 'CTeamKR', headerName: 'KR班组', width: 120 },
      { field: 'CMtrlName', headerName: '物料描述', width: 120 },
      { field: 'CMtrlCode', headerName: '物料编码', width: 120 },
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
