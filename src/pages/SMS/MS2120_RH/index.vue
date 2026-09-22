<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2120_RH（1#RH作业）：DDH.Winforms.SMS.Forms.FrmMS2120_RH
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CPono', headerName: '制造命令号', width: 120 },
      { field: 'tms2000_CPono', headerName: '制造命令号', width: 83 },
      { field: 'CStoveNo', headerName: '炉次号', width: 120 },
      { field: 'tms2000_CStove', headerName: '炉号', width: 120 },
      { field: 'CProcDesc', headerName: '工序', width: 120 },
      { field: 'tms2000_CSgCode', headerName: '钢种', width: 120 },
      { field: 'CProcIndex', headerName: '工序序号', width: 76 },
      { field: 'tms2000_CSgStd', headerName: '执行标准', width: 120 },
      { field: 'CStoveState', headerName: '炉次状态', width: 83 },
      { field: 'tms2010_CPlanMachineDesc', headerName: '计划机台', width: 119 },
      { field: 'CPlanLineDesc', headerName: '计划产线描述', width: 95 },
      { field: 'tms2010_CStoveState', headerName: '工序炉次状态', width: 84 },
      { field: 'CPlanMachineDesc', headerName: '计划机台名称', width: 117 },
      { field: 'tms2010_CActualMachineStationDesc', headerName: '生产工位', width: 119 },
      { field: 'DPlanBegtime', headerName: '计划开始时间', width: 89 },
      { field: 'tms2000_CSpec', headerName: '规格', width: 120 },
      { field: 'DPlanEndtime', headerName: '计划结束时间', width: 89 },
      { field: 'tms2000_NThick', headerName: '厚度', width: 120 },
      { field: 'CActualLineDesc', headerName: '实际产线描述', width: 107 },
      { field: 'tms2000_NWidth', headerName: '宽度', width: 120 },
      { field: 'CActualMachineDesc', headerName: '实际机台名称', width: 129 },
      { field: 'tms2000_NLen', headerName: '长度', width: 120 },
      { field: 'DActualBegtime', headerName: '实际开始时间', width: 101 },
      { field: 'tms2000_COrderNo', headerName: '订单号', width: 120 },
      { field: 'DActualEndtime', headerName: '实际结束时间', width: 101 },
      { field: 'tms2000_CTsyq', headerName: '特殊要求', width: 120 },
      { field: 'DAccountDate', headerName: '账务日期', width: 94 },
      { field: 'tms2000_CRemark', headerName: '备注', width: 120 },
      { field: 'DTeamDate', headerName: '班次日期', width: 79 },
      { field: 'tms2010_DAccountDate', headerName: '账务日期', width: 120 },
      { field: 'CShift', headerName: '班次', width: 120 },
      { field: 'tms2010_DTeamDate', headerName: '班次日期', width: 120 },
      { field: 'CTeam', headerName: '班组', width: 120 },
      { field: 'tms2010_CShift', headerName: '班次', width: 120 },
      { field: 'tms2010_CTeam', headerName: '班组', width: 120 },
      { field: 'tms2010_DPlanBegtime', headerName: '计划工序开始时间', width: 119 },
      { field: 'tms2010_DPlanEndtime', headerName: '计划工序结束时间', width: 119 },
      { field: 'tms2010_DActualBegtime', headerName: '实际工序开始时间', width: 119 },
      { field: 'tms2010_DActualEndtime', headerName: '实际工序结束时间', width: 119 },
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
