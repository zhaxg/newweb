<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR3200（轧制作业）：DDH.Winforms.SHR.Forms.FrmHR3200
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const ItemForCStove = ref("");
const ItemForCSgCode = ref("");
const ItemForCSgStd = ref("");
const ItemForCOrderNo = ref("");
const ItemForCBatchNo = ref("");
const groupControl1 = ref("");
const groupControl2 = ref("");
const ItemForNRollStatus = ref("");
const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 150 },
      { field: 'PassNo', headerName: '轧制道次', width: 150 },
      { field: 'CLineCode', headerName: '产线', width: 150 },
      { field: 'Temp', headerName: '测量温度', width: 150 },
      { field: 'NOrder', headerName: '排序', width: 150 },
      { field: 'TempCal', headerName: '计算温度', width: 150 },
      { field: 'NL2Status', headerName: 'L2计划状态', width: 150 },
      { field: 'ThickCal', headerName: '计算厚度', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'Spray', headerName: '除鳞应用', width: 150 },
      { field: 'CBatchNo', headerName: '批号', width: 150 },
      { field: 'TurnFlag', headerName: '转钢标记', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'ForceCal', headerName: '预算轧制力', width: 150 },
      { field: 'CPlateNo', headerName: '大板号', width: 150 },
      { field: 'ForceAct', headerName: '实际轧制力', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'TorqueCal', headerName: '预算扭矩', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'TorqueAct', headerName: '实际扭矩', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'BendForceCal', headerName: '预算弯辊力', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'BendForceAct', headerName: '实际弯辊力', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'ThreadSpeed', headerName: '咬钢速度', width: 150 },
      { field: 'NQua', headerName: '支数', width: 150 },
      { field: 'RunSpeed', headerName: '轧制速度', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'EntryTemp', headerName: '入炉温度', width: 150 },
      { field: 'CSgCodePlan', headerName: '订单钢种', width: 150 },
      { field: 'OutSpeed', headerName: '出口速度', width: 150 },
      { field: 'CSgStdPlan', headerName: '订单标准', width: 150 },
      { field: 'TempCalEn', headerName: '入口计算温度', width: 150 },
      { field: 'CSpecPlan', headerName: '轧制规格', width: 150 },
      { field: 'WidthEn', headerName: '入口宽度', width: 150 },
      { field: 'NLenPlan', headerName: '计划长度', width: 150 },
      { field: 'WidthEx', headerName: '出口宽度', width: 150 },
      { field: 'NQuaPlan', headerName: '计划收料支数', width: 150 },
      { field: 'LengthEx', headerName: '出口长度', width: 150 },
      { field: 'NWgtPlan', headerName: '计划重量', width: 150 },
      { field: 'RollTimeStart', headerName: '咬钢时间', width: 150 },
      { field: 'NWgtOrder', headerName: '订单重量', width: 150 },
      { field: 'RollTimeStop', headerName: '轧制时刻', width: 150 },
      { field: 'NRateLl', headerName: '理论成材率', width: 150 },
      { field: 'NRateSj', headerName: '实际成材率', width: 150 },
      { field: 'NFurType', headerName: '装炉方式', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'COverstepBl', headerName: '超差', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'CShape', headerName: '形状', width: 150 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnFinish() { /* TODO: 接入业务逻辑 */ }
function onbtnCancel() { /* TODO: 接入业务逻辑 */ }
function onbtnWaste() { /* TODO: 接入业务逻辑 */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">炉号</label>
      <InputText v-model="ItemForCStove" class="w-40" />
      <label class="whitespace-nowrap">钢种</label>
      <InputText v-model="ItemForCSgCode" class="w-40" />
      <label class="whitespace-nowrap">执行标准</label>
      <InputText v-model="ItemForCSgStd" class="w-40" />
      <label class="whitespace-nowrap">订单号</label>
      <InputText v-model="ItemForCOrderNo" class="w-40" />
      <label class="whitespace-nowrap">批号</label>
      <InputText v-model="ItemForCBatchNo" class="w-40" />
      <label class="whitespace-nowrap">计划材料</label>
      <InputText v-model="groupControl1" class="w-40" />
      <label class="whitespace-nowrap">轧制记录</label>
      <InputText v-model="groupControl2" class="w-40" />
      <label class="whitespace-nowrap">轧制状态</label>
      <InputText v-model="ItemForNRollStatus" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="轧制完成" severity="success" @click="onbtnFinish" />
      <Button label="撤消完成" severity="success" @click="onbtnCancel" />
      <Button label="吊销" severity="success" @click="onbtnWaste" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
