<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2010（一炼钢铁水接收）：DDH.Winforms.SMS.Forms.FrmMS2010
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 60 },
      { field: 'SampleNo', headerName: '试样编号', width: 120 },
      { field: 'CIronNo', headerName: '铁次号', width: 120 },
      { field: 'SampleType', headerName: '检验样类型', width: 120 },
      { field: 'CPotNo', headerName: '罐号', width: 120 },
      { field: 'C', headerName: '碳', width: 120 },
      { field: 'NWgtMz', headerName: '钢水毛重', width: 120 },
      { field: 'Si', headerName: '硅', width: 120 },
      { field: 'NWgtPz', headerName: '钢水皮重', width: 120 },
      { field: 'Mn', headerName: '锰', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'P', headerName: '磷', width: 120 },
      { field: 'NWgtRemaining', headerName: '剩余重量', width: 120 },
      { field: 'S', headerName: '硫', width: 120 },
      { field: 'CState', headerName: '铁水状态', width: 120 },
      { field: 'CDataAddType', headerName: '数据添加方式', width: 95 },
      { field: 'CKrSign', headerName: '脱硫标识', width: 120 },
      { field: 'CKrState', headerName: '脱硫状态', width: 120 },
      { field: 'NIntrusion', headerName: '是否倒罐', width: 120 },
      { field: 'DAccountDate', headerName: '记账日期', width: 120 },
      { field: 'DTeamDate', headerName: '虚拟或占用炉号班次日期', width: 120 },
      { field: 'CShift', headerName: '班次', width: 120 },
      { field: 'CTeam', headerName: '班组', width: 120 },
      { field: 'DTbInTime', headerName: '铁包到达时间', width: 95 },
      { field: 'DTbOutTime', headerName: '铁包离开时间', width: 95 },
      { field: 'CTbOutUser', headerName: '铁包离开确认人', width: 107 },
      { field: 'NLgTemperature', headerName: '炼钢铁水站测温', width: 107 },
      { field: 'NLgWgtMz', headerName: '炼钢计量毛重', width: 95 },
      { field: 'NLgWgtPz', headerName: '炼钢计量皮重', width: 95 },
      { field: 'NLgWgt', headerName: '炼钢计量净重', width: 95 },
      { field: 'DLgWgtMzTime', headerName: '炼钢计量毛重计量时间', width: 143 },
      { field: 'DLgWgtPzTime', headerName: '炼钢计量皮重计量时间', width: 143 },
      { field: 'NQmSampled', headerName: '铁水质检抽样', width: 143 },
      { field: 'CQmSampNo', headerName: '铁水质检抽检检验样号', width: 143 },
      { field: 'DWgtPzTime', headerName: '皮重计量时间', width: 95 },
      { field: 'DWgtMzTime', headerName: '毛重计量时间', width: 95 },
      { field: 'CEnable', headerName: '启用', width: 120 },
      { field: 'CMtrlCode', headerName: '物料编码', width: 120 },
      { field: 'CMtrlName', headerName: '物料描述', width: 120 },
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
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">

    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
