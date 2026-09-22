<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS9001（二炼钢3#连铸坯料计划匹配）：DDH.Winforms.SMS.Forms.FrmMS9001
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'NOrder', headerName: '排序', width: 120 },
      { field: 'Selected', headerName: '选择', width: 120 },
      { field: 'MathStatus', headerName: '匹配状态', width: 120 },
      { field: 'PlanNo', headerName: '计划号', width: 120 },
      { field: 'PlanTime', headerName: '计划号', width: 120 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 60 },
      { field: 'CSgCodeTl', headerName: '炼钢钢种', width: 120 },
      { field: 'DProTime', headerName: '产出时间', width: 74 },
      { field: 'SgStd', headerName: '标准', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 60 },
      { field: 'Thick', headerName: '厚度', width: 120 },
      { field: 'CStrandNo', headerName: '流号', width: 60 },
      { field: 'Width', headerName: '宽度', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 60 },
      { field: 'LengthMin', headerName: '最小长度', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 60 },
      { field: 'NumStr', headerName: '匹配情况', width: 120 },
      { field: 'NWth', headerName: '宽度', width: 60 },
      { field: 'Percent', headerName: '完成率', width: 120 },
      { field: 'NLen', headerName: '长度', width: 60 },
      { field: 'NNum', headerName: '件数', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 60 },
      { field: 'NNeedNum', headerName: '需求块数', width: 120 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 82 },
      { field: 'NPlanNum', headerName: '计划件数', width: 120 },
      { field: 'CPrintCode', headerName: '喷号', width: 60 },
      { field: 'NStorageNum', headerName: '已挂坯支数', width: 120 },
      { field: 'ZZThick', headerName: '轧制厚度', width: 120 },
      { field: 'CProRemark', headerName: '生产备注', width: 60 },
      { field: 'ZZWidth', headerName: '轧制宽度', width: 120 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 120 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 120 },
      { field: 'CSurfaceDefectCode', headerName: '表面缺陷代码', width: 120 },
      { field: 'CSaleOrderNo1', headerName: '订单1', width: 120 },
      { field: 'NQmStatus', headerName: '质量状态', width: 120 },
      { field: 'CSaleOrderNo2', headerName: '订单2', width: 120 },
      { field: 'NLockReason', headerName: '质量封锁原因', width: 120 },
      { field: 'CSaleOrderNo3', headerName: '订单3', width: 120 },
      { field: 'CSaleOrderNo4', headerName: '订单4', width: 120 },
      { field: 'NLenPlan1', headerName: '套切长度1', width: 120 },
      { field: 'NLenPlan2', headerName: '套切长度2', width: 120 },
      { field: 'NLenPlan3', headerName: '套切长度3', width: 120 },
      { field: 'NLenPlan4', headerName: '套切长度4', width: 120 },
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
