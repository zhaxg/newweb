<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1010（加热实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1010
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 112 },
      { field: 'CCustName', headerName: '客户名称', width: 112 },
      { field: 'CSaleCon', headerName: '销售合同号', width: 112 },
      { field: 'CInboundNo', headerName: '入库单号', width: 112 },
      { field: 'CTqCon1', headerName: '套切合同1', width: 112 },
      { field: 'NWidthTq1', headerName: '宽度套切1', width: 112 },
      { field: 'NLenTq1', headerName: '套切1', width: 112 },
      { field: 'CStoreposNo1', headerName: '库位标识1', width: 112 },
      { field: 'CTqCon2', headerName: '套切合同2', width: 112 },
      { field: 'NWidthTq2', headerName: '宽度套切2', width: 112 },
      { field: 'NLenTq2', headerName: '套切2', width: 112 },
      { field: 'CStoreposNo2', headerName: '库位标识2', width: 112 },
      { field: 'CTqCon3', headerName: '套切合同3', width: 112 },
      { field: 'NWidthTq3', headerName: '宽度套切3', width: 112 },
      { field: 'NLenTq3', headerName: '套切3', width: 112 },
      { field: 'CStoreposNo3', headerName: '库位标识3', width: 112 },
      { field: 'CTqCon4', headerName: '套切合同4', width: 112 },
      { field: 'NWidthTq4', headerName: '套切宽度4', width: 112 },
      { field: 'NLenTq4', headerName: '套切4', width: 112 },
      { field: 'CStoreposNo4', headerName: '库位标识4', width: 112 },
      { field: 'CZpNo', headerName: '组批号', width: 112 },
      { field: 'CSlabNo', headerName: '板坯号', width: 112 },
      { field: 'CCardNo', headerName: '牌号', width: 112 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 112 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 112 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 112 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 112 },
      { field: 'NSlabLen', headerName: '钢坯长', width: 112 },
      { field: 'NPlanSlabWgt', headerName: '计划坯重', width: 112 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 112 },
      { field: 'NStoveWgt', headerName: '炉前称重', width: 112 },
      { field: 'NOrderThick', headerName: '订货厚', width: 112 },
      { field: 'NOrderWidth', headerName: '订货宽', width: 112 },
      { field: 'COrderWidth2', headerName: '订单宽度2', width: 112 },
      { field: 'NOrderLen', headerName: '订货长mm', width: 112 },
      { field: 'COrderLen2', headerName: '订单长度2', width: 112 },
      { field: 'CTol', headerName: '公差', width: 112 },
      { field: 'NBc', headerName: '倍尺', width: 112 },
      { field: 'CPlanNo', headerName: '计划号', width: 112 },
      { field: 'DProductTime', headerName: '生产时间', width: 112 },
      { field: 'DOutTime', headerName: '抽出时间', width: 112 },
      { field: 'CAuthor', headerName: '责任者', width: 112 },
      { field: 'CCrewCode', headerName: '机组代码', width: 112 },
      { field: 'DFurTime', headerName: '入炉时间', width: 112 },
      { field: 'CFurCode', headerName: '加热炉编号', width: 112 },
      { field: 'CPassNo', headerName: '道号', width: 112 },
      { field: 'NFurTemp', headerName: '装炉前温度', width: 112 },
      { field: 'CFurShiftNo', headerName: '入炉班次', width: 112 },
      { field: 'CFurShiftGroup', headerName: '入炉班组', width: 112 },
      { field: 'NOutPlateAvgTemp', headerName: '出钢时板坯均热度', width: 112 },
      { field: 'NOutPlateCenterTemp', headerName: '出钢时板坯中心热度', width: 112 },
      { field: 'NOutAvgTemp', headerName: '抽出平均温度', width: 112 },
      { field: 'DInStoveTime', headerName: '在炉内时间(min)', width: 112 },
      { field: 'DOutStoveTime', headerName: '出炉时刻', width: 112 },
      { field: 'CProdCode', headerName: '产品代码', width: 112 },
      { field: 'DYrSlabEvenHeatTemp', headerName: '预热段入口的板坯均热温度', width: 112 },
      { field: 'DYrSlabAvgTemp', headerName: '预热段入口的平均板坯温度', width: 112 },
      { field: 'DYrSlabCenterTemp', headerName: '预热段入口的板坯中心温度', width: 112 },
      { field: 'DYrAvgTemp', headerName: '在预热段时的平均温度', width: 112 },
      { field: 'DYrInStoveTime', headerName: '预热段在炉时间(min)', width: 112 },
      { field: 'DHeatRkSlabAvgTemp1', headerName: '加热段1入口板坯平均温度', width: 112 },
      { field: 'DHeatSlabFaceTemp1', headerName: '加热段1入口板坯表面温度', width: 112 },
      { field: 'DHeatSlabCenterTemp1', headerName: '加热段1入口板坯中心温度', width: 112 },
      { field: 'DHeatSlabAvgTemp1', headerName: '在加热段1时的平均温度', width: 112 },
      { field: 'DHeatInStoveTime1', headerName: '加热段1在炉时段(min)', width: 112 },
      { field: 'DHeatRkSlabAvgTemp2', headerName: '加热段2入口板坯平均温度', width: 112 },
      { field: 'DHeatSlabCenterTemp2', headerName: '加热段2入口板坯中心温度', width: 112 },
      { field: 'DHeatSlabFaceTemp2', headerName: '加热段2入口板坯表面温度', width: 112 },
      { field: 'DHeatSlabAvgTemp2', headerName: '在加热段2时的平均温度', width: 112 },
      { field: 'DHeatInStoveTime2', headerName: '加热段2在炉时段(min)', width: 112 },
      { field: 'DHeatAvgTemp', headerName: '均热段时的平均温度', width: 112 },
      { field: 'DHeatInStoveTime', headerName: '均热段在炉时段(min)', width: 112 },
      { field: 'DEvenHeatAvgTemp', headerName: '均热段入口板坯平均温度', width: 112 },
      { field: 'DEvenHeatCenterTemp', headerName: '均热段入口板坯中心温度', width: 112 },
      { field: 'DEvenHeatFaceTemp', headerName: '均热段入口板坯表面温度', width: 112 },
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
