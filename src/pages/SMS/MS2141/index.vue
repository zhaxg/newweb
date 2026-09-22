<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2141（1#连铸产出）：DDH.Winforms.SMS.Forms.FrmMS2141
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 60 },
      { field: 'tms2000_CStove', headerName: '炉号', width: 91 },
      { field: 'PlanNo', headerName: '计划号', width: 83 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'tms2000_CPono', headerName: '制造命令号', width: 93 },
      { field: 'PlanTime', headerName: '计划号', width: 120 },
      { field: 'CPono', headerName: 'PONO', width: 83 },
      { field: 'tms2000_CSgCode', headerName: '钢种', width: 91 },
      { field: 'CSgCodeTl', headerName: '炼钢钢种', width: 120 },
      { field: 'CStrandNo', headerName: '流号', width: 120 },
      { field: 'tms2000_COrderNo', headerName: '订单号', width: 120 },
      { field: 'SgStd', headerName: '标准', width: 120 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 120 },
      { field: 'tms2010_CStoveState', headerName: '工序炉次状态', width: 95 },
      { field: 'Thick', headerName: '厚度', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'tms2000_CSgStd', headerName: '执行标准', width: 120 },
      { field: 'Width', headerName: '宽度', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'tms2000_CSpec', headerName: '规格', width: 120 },
      { field: 'LengthMin', headerName: '最小长度', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'tms2000_CPlanTime', headerName: '计划日期', width: 120 },
      { field: 'NumStr', headerName: '匹配情况', width: 120 },
      { field: 'Percent', headerName: '完成率', width: 120 },
      { field: 'CProRemark', headerName: '生产备注', width: 120 },
      { field: 'tms2000_NThick', headerName: '厚度', width: 120 },
      { field: 'tms2000_NWidth', headerName: '宽度', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'tms2000_NLen', headerName: '长度', width: 120 },
      { field: 'NNeedNum', headerName: '需求块数', width: 120 },
      { field: 'NWth', headerName: '宽度', width: 120 },
      { field: 'tms2000_CTsyq', headerName: '特殊要求', width: 120 },
      { field: 'NPlanNum', headerName: '计划件数', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'tms2000_CRemark', headerName: '备注', width: 120 },
      { field: 'NStorageNum', headerName: '已挂坯支数', width: 83 },
      { field: 'NNum', headerName: '件数', width: 120 },
      { field: 'tms2000_CStoveLocation', headerName: '最新炉次位置', width: 95 },
      { field: 'ZZThick', headerName: '轧制厚度', width: 120 },
      { field: 'NCalWgt', headerName: '理重', width: 120 },
      { field: 'tms2000_CStoveState', headerName: '最新炉次状态', width: 95 },
      { field: 'ZZWidth', headerName: '轧制宽度', width: 120 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 120 },
      { field: 'tms2010_DPlanBegtime', headerName: '计划工序开始时间', width: 119 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 120 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 120 },
      { field: 'tms2010_DPlanEndtime', headerName: '计划工序结束时间', width: 119 },
      { field: 'CSaleOrderNo1', headerName: '订单1', width: 120 },
      { field: 'DProTime', headerName: '产出时间', width: 120 },
      { field: 'tms2010_DActualBegtime', headerName: '实际工序开始时间', width: 119 },
      { field: 'CSaleOrderNo2', headerName: '订单2', width: 120 },
      { field: 'CConfirmStatus', headerName: '确认判定状态', width: 120 },
      { field: 'tms2010_DActualEndtime', headerName: '实际工序结束时间', width: 119 },
      { field: 'CSaleOrderNo3', headerName: '订单3', width: 120 },
      { field: 'CMsc', headerName: '冶金规范码', width: 83 },
      { field: 'tms2010_DAccountDate', headerName: '账务日期', width: 120 },
      { field: 'CSaleOrderNo4', headerName: '订单4', width: 120 },
      { field: 'CMscLine', headerName: '冶金规范产线', width: 95 },
      { field: 'tms2010_DTeamDate', headerName: '班次日期', width: 120 },
      { field: 'NLenPlan1', headerName: '套切长度1', width: 78 },
      { field: 'CStNo', headerName: '炉号', width: 83 },
      { field: 'tms2010_CShift', headerName: '班次', width: 120 },
      { field: 'NLenPlan2', headerName: '套切长度2', width: 78 },
      { field: 'CPieceNoQd', headerName: '钢坯切断件次号', width: 107 },
      { field: 'tms2010_CTeam', headerName: '班组', width: 120 },
      { field: 'NLenPlan3', headerName: '套切长度3', width: 78 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 120 },
      { field: 'NLenPlan4', headerName: '套切长度4', width: 78 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 120 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 120 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 120 },
      { field: 'CSurfaceRemark', headerName: '缺陷描述', width: 120 },
      { field: 'CSurfaceAdvice', headerName: '表检处置意见', width: 95 },
      { field: 'DConfirmTime', headerName: '成分确认时间', width: 120 },
      { field: 'CConfirmUser', headerName: '成分确认人', width: 120 },
      { field: 'CPcResult', headerName: '理化结果', width: 120 },
      { field: 'DPcTime', headerName: '理化判定时间', width: 95 },
      { field: 'CPcUser', headerName: '理化判定人', width: 83 },
      { field: 'CPcRemark', headerName: '理化判定备注', width: 95 },
      { field: 'NQmStatus', headerName: '质量状态', width: 120 },
      { field: 'CDestination', headerName: '去向', width: 120 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 120 },
      { field: 'NCastDivCode', headerName: '模连铸标识', width: 83 },
      { field: 'tms2000_DAccountDate', headerName: '炉次账务日期', width: 120 },
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
