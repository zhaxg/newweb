<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQZ6000（库内材料质量处置）：DDH.Winforms.SQM.Forms.QualityDisposition.FrmQZ6000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 120 },
      { field: 'CBatchNo', headerName: '批号', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'NQmStatus', headerName: '质量状态', width: 120 },
      { field: 'CQmHandleCode', headerName: '处置结果', width: 120 },
      { field: 'CProRemark', headerName: '生产备注', width: 120 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 120 },
      { field: 'NQmLevel', headerName: '质量等级', width: 120 },
      { field: 'TestJobJudgeResult', headerName: '理化结果', width: 120 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 120 },
      { field: 'CDetectResultCode', headerName: '探伤判定结果', width: 120 },
      { field: 'CComplexDecideCode', headerName: '综判结果', width: 120 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 120 },
      { field: 'NotJudgeReason', headerName: '待判原因', width: 120 },
      { field: 'NLockReason', headerName: '质量封锁原因', width: 120 },
      { field: 'CSurfaceDefectCode', headerName: '表面缺陷代码', width: 120 },
      { field: 'CSurfaceDesc', headerName: '表检描述', width: 120 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 120 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 120 },
      { field: 'CComplexUser', headerName: '综判人', width: 120 },
      { field: 'DComplexTime', headerName: '综判时间', width: 120 },
      { field: 'CCutFlag', headerName: '切边方式', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWth', headerName: '宽度', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'NNum', headerName: '件数', width: 120 },
      { field: 'NCalWgt', headerName: '理重', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'DProTime', headerName: '产出时间', width: 120 },
      { field: 'CProUser', headerName: '产出人', width: 120 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 120 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 120 },
      { field: 'DInTime', headerName: '入库时间', width: 120 },
      { field: 'CInUser', headerName: '入库人', width: 120 },
      { field: 'CStoreCode', headerName: '库区号', width: 120 },
      { field: 'CStackNo', headerName: '垛位号', width: 120 },
      { field: 'CStackNum', headerName: '层号', width: 120 },
      { field: 'CSourceStoreCode', headerName: '原库区号', width: 120 },
      { field: 'CSourceStackNo', headerName: '原垛位号', width: 120 },
      { field: 'CSourceStackNum', headerName: '原层号', width: 120 },
      { field: 'CIsHot', headerName: '是否热送', width: 120 },
      { field: 'NCastDivCode', headerName: '模连铸标识', width: 120 },
      { field: 'CLockedLine', headerName: '占用产线', width: 120 },
      { field: 'CLockedPlan', headerName: '占用计划', width: 120 },
      { field: 'CMatType', headerName: '物料类型', width: 120 },
      { field: 'CProdCode', headerName: '产品代码', width: 120 },
      { field: 'CSteelType', headerName: '品名', width: 120 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 120 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 120 },
      { field: 'COrderNoLast', headerName: '原始订单号', width: 120 },
      { field: 'CDestination', headerName: '去向', width: 120 },
      { field: 'CHotNo', headerName: '退火炉回号', width: 120 },
      { field: 'CSlabType', headerName: '坯型', width: 120 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 120 },
      { field: 'CIsSurface', headerName: '是否表检', width: 120 },
      { field: 'CDetectDefectLevel', headerName: '探伤等级', width: 120 },
      { field: 'CDefectDefectCode', headerName: '探伤判定缺陷代码', width: 120 },
      { field: 'CDefectDefectMark', headerName: '探伤判定缺陷描述', width: 120 },
      { field: 'CDefectUser', headerName: '探伤判定人', width: 120 },
      { field: 'DDefectTime', headerName: '探伤判定时间', width: 120 },
      { field: 'CComplexDesc', headerName: '综判描述', width: 120 },
      { field: 'CQmHandleDesc', headerName: '处置注释', width: 120 },
      { field: 'CQmHandleUser', headerName: '处置人', width: 120 },
      { field: 'DQmHandleTime', headerName: '处置时间', width: 120 },
      { field: 'CSampleLotNoPre', headerName: '前检验委托单号', width: 120 },
      { field: 'CInboundNo', headerName: '入库单号', width: 120 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 120 },
      { field: 'CWgtToler', headerName: '重量偏差等级', width: 120 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 120 },
      { field: 'CCusName', headerName: '客户名称', width: 120 },
      { field: 'CQxDl', headerName: '缺陷大类', width: 120 },
      { field: 'CQxXl', headerName: '缺陷小类', width: 120 },
      { field: 'TestJobReceiveUser', headerName: '检验委托接收人', width: 120 },
      { field: 'TestJobReceiveTime', headerName: '检验委托接收时间', width: 120 },
      { field: 'TestUser', headerName: '检验人', width: 120 },
      { field: 'TestCompeteTime', headerName: '检验完成时间', width: 120 },
      { field: 'IsRecheck', headerName: '是否复检', width: 120 },
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
