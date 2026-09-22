<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4100（轧钢收料管理）：DDH.Winforms.SHR.Forms.FrmHR4100
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 150 },
      { field: 'CSlCode', headerName: '剪切线代码', width: 150 },
      { field: 'CLineCode', headerName: '产线', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'CConNo', headerName: '合同号', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'CBatchNo', headerName: '批号', width: 150 },
      { field: 'CPlateNo', headerName: '大板号', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'CLengthType', headerName: '长度类型', width: 150 },
      { field: 'NLenMin', headerName: '最小长度', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'NLenMax', headerName: '最大长度', width: 150 },
      { field: 'NCalWgt', headerName: '理重', width: 150 },
      { field: 'NQua', headerName: '支数', width: 150 },
      { field: 'NOrder', headerName: '排序', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'NFurStatus', headerName: '加热炉状态', width: 150 },
      { field: 'NProType', headerName: '库存类型', width: 150 },
      { field: 'NRateLl', headerName: '理论成材率', width: 150 },
      { field: 'CFurCode', headerName: '加热炉编号', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'NRateSj', headerName: '实际成材率', width: 150 },
      { field: 'NRollStatus', headerName: '轧制状态', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'NFurType', headerName: '装炉方式', width: 150 },
      { field: 'CRollCode', headerName: '轧机编号', width: 150 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 150 },
      { field: 'CRemark', headerName: '备注', width: 150 },
      { field: 'CFinishEmp', headerName: '轧制完成人', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'DRoll', headerName: '开轧/终轧时间', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CConfirmStatus', headerName: '确认判定状态', width: 150 },
      { field: 'CRollShift', headerName: '轧制完成班次', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'CConfirmEmp', headerName: '收料人', width: 150 },
      { field: 'CRollGroup', headerName: '轧制完成班组', width: 150 },
      { field: 'CProdCode', headerName: '产品代码', width: 150 },
      { field: 'DConfirm', headerName: '收料时间', width: 150 },
      { field: 'NJqStatus', headerName: '剪切状态', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CConfirmShift', headerName: '收料班次', width: 150 },
      { field: 'CJqCode', headerName: '剪切设备', width: 150 },
      { field: 'CWgtToler', headerName: '重量偏差等级', width: 150 },
      { field: 'CConfirmGroup', headerName: '收料班组', width: 150 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 150 },
      { field: 'CDesignNo', headerName: '设计编号', width: 150 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 150 },
      { field: 'CTlOrderNo', headerName: '提料订单号', width: 150 },
      { field: 'CFlag', headerName: '材料标记', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
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
