<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4000（剪切实绩查询）：DDH.Winforms.SHR.Forms.FrmHR4000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'CSlCode', headerName: '剪切线代码', width: 150 },
      { field: 'CPrint', headerName: '喷印完成标记', width: 150 },
      { field: 'PrintCount', headerName: '打印次数', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'CBatchNo', headerName: '批号', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'CIsGcd', headerName: '是否过称', width: 150 },
      { field: 'CIsCc', headerName: '是否超长', width: 150 },
      { field: 'CIsDc', headerName: '是否短尺', width: 150 },
      { field: 'CIsMatchOrder', headerName: '是否满足订单要求', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'CJqShift', headerName: '剪切班次', width: 150 },
      { field: 'CJqGroup', headerName: '剪切班组', width: 150 },
      { field: 'CJqCode', headerName: '剪切设备', width: 150 },
      { field: 'CJqUser', headerName: '剪切人', width: 150 },
      { field: 'DJq', headerName: '剪切时间', width: 150 },
      { field: 'NOrderThick', headerName: '订货厚', width: 150 },
      { field: 'NOrderWidth', headerName: '订货宽', width: 150 },
      { field: 'COrderLenType', headerName: '合同长度类型', width: 150 },
      { field: 'NOrderLen', headerName: '订货长mm', width: 150 },
      { field: 'NOrderLenMin', headerName: '订单长', width: 150 },
      { field: 'NOrderLenMax', headerName: '订单长2', width: 150 },
      { field: 'CEngMinThick', headerName: '厚度下偏差', width: 150 },
      { field: 'CEngMaxThick', headerName: '厚度上偏差', width: 150 },
      { field: 'CEngMinWidth', headerName: '宽度下偏差', width: 150 },
      { field: 'CEngMaxWidth', headerName: '宽度上偏差', width: 150 },
      { field: 'CEngMinLen', headerName: '长度下偏差', width: 150 },
      { field: 'CEngMaxLen', headerName: '长度上偏差', width: 150 },
      { field: 'CCustName', headerName: '客户名称', width: 150 },
      { field: 'DDeliveryDate', headerName: '交货日期', width: 150 },
      { field: 'DOrdDate', headerName: '订单日期', width: 150 },
      { field: 'CSpecReqText', headerName: '客户特殊要求', width: 150 },
      { field: 'CConNo', headerName: '合同号', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'CConsigneeCustCname', headerName: '收货客户中文名称', width: 150 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 150 },
      { field: 'CSgCodeSlab', headerName: '钢坯钢种', width: 150 },
      { field: 'CSgStdSlab', headerName: '坯料执行标准', width: 150 },
      { field: 'CSpecSlab', headerName: '板坯规格', width: 150 },
      { field: 'NThickSlab', headerName: '坯料厚度', width: 150 },
      { field: 'NWidthSlab', headerName: '坯料宽度', width: 150 },
      { field: 'NLenSlab', headerName: '坯料长度', width: 150 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 150 },
      { field: 'NQuaSlab', headerName: '钢坯总支数', width: 150 },
      { field: 'NWgtSlab', headerName: '坯重', width: 150 },
      { field: 'CMatCodeSlab', headerName: '坯料物料编码', width: 150 },
      { field: 'CMatNameSlab', headerName: '坯料物料名称', width: 150 },
      { field: 'NFurType', headerName: '装炉方式', width: 150 },
      { field: 'CFurCode', headerName: '加热炉编号', width: 150 },
      { field: 'CRollCode', headerName: '轧机编号', width: 150 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 150 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 150 },
      { field: 'CSurfaceRemark', headerName: '缺陷描述', width: 150 },
      { field: 'CRespDept', headerName: '责任部门', width: 150 },
      { field: 'CFaceHandleAdvice', headerName: '处置措施', width: 150 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 150 },
      { field: 'CSampleLotNoSlab', headerName: '坯料试批号', width: 150 },
      { field: 'CQmHandleDesc', headerName: '处置注释', width: 150 },
      { field: 'CStoreCode', headerName: '库区号', width: 150 },
      { field: 'CStackNo', headerName: '垛位号', width: 150 },
      { field: 'CStackNum', headerName: '层号', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CProdCode', headerName: '产品代码', width: 150 },
      { field: 'CWgtToler', headerName: '重量偏差等级', width: 150 },
      { field: 'LastPrintTime', headerName: '最后打印时间', width: 150 },
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
