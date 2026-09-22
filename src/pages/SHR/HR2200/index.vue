<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR2200（改切计划生成）：DDH.Winforms.SHR.Forms.FrmHR2200
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'NOrder', headerName: '排序', width: 149 },
      { field: 'CBatchNo', headerName: '批号', width: 150 },
      { field: 'CPlanTime', headerName: '计划时间', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'CCool', headerName: '冷却', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'CIsGcd', headerName: '是否过称', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'COrderNo1', headerName: '订单号1', width: 149 },
      { field: 'CCutFlag', headerName: '切边方式', width: 150 },
      { field: 'COrderNo2', headerName: '订单号2', width: 149 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 149 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 150 },
      { field: 'COrderNo4', headerName: '订单号4', width: 149 },
      { field: 'DProTime', headerName: '产出时间', width: 150 },
      { field: 'NLenTq1', headerName: '套切1', width: 149 },
      { field: 'CProUser', headerName: '产出人', width: 150 },
      { field: 'NLenTq2', headerName: '套切2', width: 149 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 150 },
      { field: 'NLenTq3', headerName: '套切3', width: 149 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 150 },
      { field: 'NLenTq4', headerName: '套切4', width: 149 },
      { field: 'NBc', headerName: '倍尺', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'NQmStatus', headerName: '质量状态', width: 150 },
      { field: 'NPlanedWgt', headerName: '计划重量', width: 149 },
      { field: 'NLockReason', headerName: '质量封锁原因', width: 150 },
      { field: 'NPlanZpWgt', headerName: '计划组批量', width: 149 },
      { field: 'NQmLevel', headerName: '质量等级', width: 150 },
      { field: 'NZpSyWgt', headerName: '剩余组批量', width: 149 },
      { field: 'CIsSurface', headerName: '是否表检', width: 150 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 150 },
      { field: 'CSurfaceDefectCode', headerName: '表面缺陷代码', width: 150 },
      { field: 'CRemark', headerName: '备注', width: 149 },
      { field: 'CSurfaceDesc', headerName: '表检描述', width: 150 },
      { field: 'CSgCodeTl', headerName: '炼钢钢种', width: 149 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 150 },
      { field: 'CSgStdTl', headerName: '提料标准', width: 149 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 150 },
      { field: 'NThickTl', headerName: '坯厚', width: 149 },
      { field: 'CDetectResultCode', headerName: '探伤判定结果', width: 150 },
      { field: 'NWidthTl', headerName: '坯宽', width: 149 },
      { field: 'CDetectDefectLevel', headerName: '探伤等级', width: 150 },
      { field: 'NLenMinTl', headerName: '提料长度最小值', width: 149 },
      { field: 'CDefectDefectCode', headerName: '探伤判定缺陷代码', width: 150 },
      { field: 'NLenMaxTl', headerName: '提料长度最大值', width: 149 },
      { field: 'CDefectDefectMark', headerName: '探伤判定缺陷描述', width: 150 },
      { field: 'NQuaTl', headerName: '计划生产钢坯块数', width: 149 },
      { field: 'CDefectUser', headerName: '探伤判定人', width: 150 },
      { field: 'NWgtUnitTl', headerName: '钢坯单重', width: 149 },
      { field: 'DDefectTime', headerName: '探伤判定时间', width: 150 },
      { field: 'NWgtTl', headerName: '生产钢坯重量', width: 149 },
      { field: 'CAutoJudgeResult', headerName: '自动判定结果', width: 150 },
      { field: 'NQuaZp', headerName: '组批支数', width: 150 },
      { field: 'CJudgeUser', headerName: '判定人', width: 150 },
      { field: 'NWgtZp', headerName: '组批重量', width: 150 },
      { field: 'DJudgeTime', headerName: '判定时间', width: 150 },
      { field: 'NQuaFur', headerName: '入炉支数', width: 150 },
      { field: 'CJudgeResult', headerName: '最终判定结果', width: 150 },
      { field: 'NWgtFur', headerName: '入炉量', width: 150 },
      { field: 'CJudgeRemark', headerName: '判定备注', width: 150 },
      { field: 'NQuaRoll', headerName: '轧制支数', width: 150 },
      { field: 'CStatus', headerName: '状态', width: 150 },
      { field: 'NWgtRoll', headerName: '轧制重量', width: 150 },
      { field: 'CRecheckFlag', headerName: '复验标记', width: 150 },
      { field: 'NQuaPlan', headerName: '计划收料支数', width: 150 },
      { field: 'CComplexDecideCode', headerName: '综判结果', width: 150 },
      { field: 'NQuaFinish', headerName: '收料支数', width: 150 },
      { field: 'CComplexDesc', headerName: '综判描述', width: 150 },
      { field: 'NWgtFinish', headerName: '收料重量', width: 150 },
      { field: 'CComplexUser', headerName: '综判人', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 149 },
      { field: 'DComplexTime', headerName: '综判时间', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 149 },
      { field: 'CQmHandleCode', headerName: '处置结果', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 149 },
      { field: 'CQmHandleDesc', headerName: '处置注释', width: 150 },
      { field: 'DStart', headerName: '开始时间', width: 150 },
      { field: 'CQmHandleUser', headerName: '处置人', width: 150 },
      { field: 'DEnd', headerName: '结束时间', width: 150 },
      { field: 'DQmHandleTime', headerName: '处置时间', width: 150 },
      { field: 'CPieceNos', headerName: '批量件次号', width: 150 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 149 },
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
