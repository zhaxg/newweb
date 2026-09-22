<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1202（轧制信息）：DDH.Winforms.SHR.Forms.APILogViewer.FrmTI1202
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'PlateNo', headerName: '板号', width: 112 },
      { field: 'SlabNo', headerName: '坯料号', width: 112 },
      { field: 'PlanNo', headerName: '计划号', width: 112 },
      { field: 'SlabStatus', headerName: 'BD板坯标识', width: 112 },
      { field: 'StandNo', headerName: '机架号', width: 112 },
      { field: 'SteelGrade', headerName: '钢种', width: 112 },
      { field: 'ProductCode', headerName: '产品代码', width: 112 },
      { field: 'CrCode', headerName: '铬代码', width: 112 },
      { field: 'RmPass', headerName: '粗轧道次', width: 112 },
      { field: 'FmPass', headerName: '精轧道次', width: 112 },
      { field: 'RollingStatus', headerName: '轧制状态', width: 112 },
      { field: 'ExitThick', headerName: '出口厚度', width: 112 },
      { field: 'ExitWidth', headerName: '出口宽度', width: 112 },
      { field: 'ExitLength', headerName: '出口长度', width: 112 },
      { field: 'OperateUserCode', headerName: '轧制操作人员代码（改规标记1）', width: 112 },
      { field: 'CrownMark', headerName: '钢板凸度（实绩标记)', width: 112 },
      { field: 'MeaThickWs', headerName: '西面测量厚度', width: 112 },
      { field: 'MeaThickDs', headerName: '南面测量厚度', width: 112 },
      { field: 'HsbExitTempAvg', headerName: '高压水除鳞出口平均温度', width: 112 },
      { field: 'HsbExitTempMax', headerName: '除鳞后温度（最大）', width: 112 },
      { field: 'RmEntTempCal', headerName: '粗轧入口温度计算', width: 112 },
      { field: 'RmEntTempAvg', headerName: '粗轧入轧平均温度', width: 112 },
      { field: 'RmEntTempMin', headerName: '粗轧开轧温度（测量最小）', width: 112 },
      { field: 'RmEntTempMax', headerName: '粗轧开轧温度（测量最大）', width: 112 },
      { field: 'RmEntTempDev', headerName: '粗轧开轧温度（测量偏差）', width: 112 },
      { field: 'RmExitTempCal', headerName: '粗轧出口温度计算', width: 112 },
      { field: 'RmExitTempAvg', headerName: '粗轧出轧平均温度', width: 112 },
      { field: 'RmExitTempMin', headerName: '粗轧终轧温度（测量最小）', width: 112 },
      { field: 'RmExitTempMax', headerName: '粗轧终轧温度（测量最大）', width: 112 },
      { field: 'RmExitTempDev', headerName: '粗轧终轧温度（测量偏差）', width: 112 },
      { field: 'RmEntThick', headerName: '粗轧入口厚度', width: 112 },
      { field: 'FmEntTempCal', headerName: '精轧入口温度计算', width: 112 },
      { field: 'FmEntTempAvg', headerName: '精轧入轧平均温度', width: 112 },
      { field: 'FmEntTempMin', headerName: '精轧开轧温度（测量最小）', width: 112 },
      { field: 'FmEntTempMax', headerName: '精轧开轧温度（测量最大）', width: 112 },
      { field: 'FmEntTempDev', headerName: '精轧开轧温度（测量偏差）', width: 112 },
      { field: 'FmExitTempCal', headerName: '精轧出口温度计算', width: 112 },
      { field: 'FmExitTempAvg', headerName: '精轧出轧平均温度', width: 112 },
      { field: 'FmExitTempMin', headerName: '精轧终轧温度（测量最小）', width: 112 },
      { field: 'FmExitTempMax', headerName: '精轧终轧温度（测量最大）', width: 112 },
      { field: 'FmExitTempDev', headerName: '精轧终轧温度（测量偏差）', width: 112 },
      { field: 'FmEntThick', headerName: '精轧入口厚度', width: 112 },
      { field: 'FirstConThick', headerName: '第一阶段控制轧制点厚度', width: 112 },
      { field: 'SecondConThick', headerName: '第二阶段控制轧制点厚度', width: 112 },
      { field: 'FirstContTemp', headerName: '第一阶段控制轧制点温度', width: 112 },
      { field: 'SecondConTemp', headerName: '第二阶段控制轧制点温度', width: 112 },
      { field: 'ThickHp', headerName: '厚度液压', width: 112 },
      { field: 'Broadbef', headerName: '展宽轧制前厚度', width: 112 },
      { field: 'Broadaft', headerName: '展宽轧制后厚度', width: 112 },
      { field: 'ShiftNo', headerName: '班次号', width: 112 },
      { field: 'ShiftGroup', headerName: '班次组', width: 112 },
      { field: 'ProductTime', headerName: '生产时间', width: 112 },
      { field: 'Author', headerName: '作者', width: 112 },
      { field: 'SlabWeight', headerName: '坯料重量', width: 112 },
      { field: 'RmAuthorA', headerName: '粗轧责任者A', width: 112 },
      { field: 'RmAuthorB', headerName: '粗轧责任者B', width: 112 },
      { field: 'FmAuthorA', headerName: '精轧操作员A', width: 112 },
      { field: 'FmAuthorB', headerName: '精轧操作员B', width: 112 },
      { field: 'DDischargeTime', headerName: '出炉时间', width: 112 },
      { field: 'DRollingTimeStart', headerName: '轧制开始时间', width: 112 },
      { field: 'DRollingTimeEnd', headerName: '轧制结束时间', width: 112 },
      { field: 'DProductTime', headerName: '生产时间', width: 112 },
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
