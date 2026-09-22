<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS3000（一炼钢炉次实绩）：DDH.Winforms.SMS.Forms.FrmMS3000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CLineName', headerName: '产线名称', width: 120 },
      { field: 'CStoveNo', headerName: '炉号', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'CProBof', headerName: '转炉工序', width: 95 },
      { field: 'CProcName', headerName: '工序名称', width: 120 },
      { field: 'CMachine', headerName: '机台', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CProcDesc', headerName: '工序描述', width: 167 },
      { field: 'CMachineName', headerName: '机台名称', width: 120 },
      { field: 'CStrandNo', headerName: '流号', width: 120 },
      { field: 'CPono', headerName: 'PONO', width: 83 },
      { field: 'CProcIndex', headerName: '工序序号', width: 119 },
      { field: 'DAccountDate', headerName: '记账日期', width: 120 },
      { field: 'CPlanLineDesc', headerName: '计划产线', width: 95 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'CPlanMachineDesc', headerName: '计划机台', width: 119 },
      { field: 'CSiloCode', headerName: '料仓代码', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'DPlanBegtime', headerName: '计划开始时间', width: 119 },
      { field: 'CSiloName', headerName: '料仓名称', width: 120 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'DPlanEndtime', headerName: '计划结束时间', width: 119 },
      { field: 'CMtrlCode', headerName: '物料编码', width: 120 },
      { field: 'CPlanId', headerName: '计划ID', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'CMtrlName', headerName: '物料描述', width: 120 },
      { field: 'CConNo', headerName: '合同号', width: 120 },
      { field: 'NWidth', headerName: '宽度', width: 120 },
      { field: 'CUnit', headerName: '单片钢坯', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'CIronNo', headerName: '铁次号', width: 120 },
      { field: 'CMatCode', headerName: '钢坯物料号', width: 120 },
      { field: 'CLenMx', headerName: '长度明细', width: 120 },
      { field: 'CTsyq', headerName: '特殊要求', width: 120 },
      { field: 'CPlanBackup', headerName: '计划备注', width: 120 },
      { field: 'NMainQm', headerName: '作为炉次铁水成分', width: 119 },
      { field: 'DStoveNoCreateTime', headerName: '虚拟炉号添加时间', width: 107 },
      { field: 'NActualExist', headerName: '按计划进行实际生产', width: 131 },
      { field: 'CRefurnaceStoveNo', headerName: '回炉钢水炉次号', width: 107 },
      { field: 'CPlanTime', headerName: '计划时间', width: 120 },
      { field: 'CActualLineDesc', headerName: '实际产线描述', width: 95 },
      { field: 'CRefurnacePono', headerName: '回炉钢水制造命令号', width: 131 },
      { field: 'NWth', headerName: '宽度', width: 120 },
      { field: 'Route_Plan', headerName: '计划工序机台', width: 95 },
      { field: 'CActualMachineDesc', headerName: '实际工序机台名称', width: 119 },
      { field: 'Route_Actual', headerName: '实际工序机台', width: 95 },
      { field: 'DActualBegtime', headerName: '实际工序开始时间', width: 119 },
      { field: 'CDataAddType', headerName: '数据添加方式', width: 95 },
      { field: 'NVirtualStoveNo', headerName: '虚拟炉号', width: 120 },
      { field: 'DActualBegtimePro', headerName: '实际工序生产开始时间', width: 143 },
      { field: 'CAllowTotal', headerName: '是否统计投料量', width: 107 },
      { field: 'NNum', headerName: '件数', width: 120 },
      { field: 'CVirtualStoveNoBof', headerName: '虚拟炉号转炉', width: 95 },
      { field: 'DActualEndtimePro', headerName: '实际工序生产结束时间', width: 143 },
      { field: 'NCalWgt', headerName: '理重', width: 120 },
      { field: 'NOccupiedStoveNo', headerName: '占用炉号', width: 120 },
      { field: 'DActualEndtime', headerName: '实际工序结束时间', width: 119 },
      { field: 'COccupiedStoveNoBof', headerName: '占用炉号所属转炉', width: 119 },
      { field: 'DActualBegtimeOperationMode', headerName: '实际工序开始操作方式', width: 143 },
      { field: 'CStoreCode', headerName: '库区号', width: 83 },
      { field: 'CStoveLocation', headerName: '最新炉次位置', width: 95 },
      { field: 'DActualBegtimeProOperationMode', headerName: '实际工序生产开始操作方式', width: 167 },
      { field: 'CStackNo', headerName: '垛位号', width: 83 },
      { field: 'CStoveLocationStation', headerName: '最新炉次工位', width: 95 },
      { field: 'DActualEndtimeProOperationMode', headerName: '实际工序生产结束操作方式', width: 167 },
      { field: 'CStackNum', headerName: '层号', width: 95 },
      { field: 'CStoveState', headerName: '最新炉次状态', width: 95 },
      { field: 'DActualEndtimeOperationMode', headerName: '实际工序结束操作方式', width: 143 },
      { field: 'CRefurnace', headerName: '炉次回炉', width: 120 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 120 },
      { field: 'CRefurnaceState', headerName: '炉次回炉状态', width: 95 },
      { field: 'DTeamDate', headerName: '虚拟或占用炉号班次日期', width: 120 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 120 },
      { field: 'CPotNo', headerName: '罐号', width: 120 },
      { field: 'CShift', headerName: '班次', width: 120 },
      { field: 'DProTime', headerName: '产出时间', width: 120 },
      { field: 'CPotType', headerName: '包况', width: 120 },
      { field: 'CTeam', headerName: '班组', width: 120 },
      { field: 'CConfirmStatus', headerName: '确认判定状态', width: 120 },
      { field: 'CBackup', headerName: '备注', width: 120 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'CIsHot', headerName: '是否热送', width: 120 },
      { field: 'CEnable', headerName: '启用', width: 120 },
      { field: 'CMsc', headerName: '冶金规范码', width: 83 },
      { field: 'CNotEnableBackup', headerName: '不启用状态备注', width: 107 },
      { field: 'CActualBackup', headerName: '实际备注', width: 120 },
      { field: 'CMscLine', headerName: '冶金规范产线', width: 95 },
      { field: 'CStNo', headerName: '炉号', width: 83 },
      { field: 'CSteelType', headerName: '品名', width: 120 },
      { field: 'CProRemark', headerName: '生产备注', width: 120 },
      { field: 'CPieceNoQd', headerName: '钢坯切断件次号', width: 107 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 120 },
      { field: 'CShiftNoSj', headerName: '炉次实绩班次', width: 95 },
      { field: 'CGroupNoSj', headerName: '炉次实绩班组', width: 95 },
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
      { field: 'CQmHandleDesc', headerName: '处置注释', width: 120 },
      { field: 'NQmStatus', headerName: '质量状态', width: 120 },
      { field: 'CDestination', headerName: '去向', width: 120 },
      { field: 'CRouteCode', headerName: '精炼路径', width: 120 },
      { field: 'CPrintCode', headerName: '喷号', width: 120 },
      { field: 'NCastDivCode', headerName: '模连铸标识', width: 83 },
      { field: 'CZGLineCode', headerName: '轧制产线', width: 95 },
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
