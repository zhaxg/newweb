<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";


import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQL3100（检验委托接收）：DDH.Winforms.LIMS.Forms.FrmQL3100
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const ItemForCLineCode = ref("");
const ItemForCTestNo = ref("");
const ItemForCStove = ref("");
const ItemForCSgSign = ref("");
const ItemForCSgStd = ref("");
const ItemForCOrderNo = ref("");
const ItemForCRecheckFlag = ref("");
const ItemForCBatch = ref("");
const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: ' ', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CBatch', headerName: '批号', width: 120 },
      { field: 'CInternalNo', headerName: '内部编号', width: 120 },
      { field: 'CTestNo', headerName: '委托单号', width: 120 },
      { field: 'NTestTimes', headerName: '试验次数', width: 120 },
      { field: 'CRecheckFlag', headerName: '复验标记', width: 120 },
      { field: 'CStatus', headerName: '状态', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'CSgSign', headerName: '钢种', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CDeliveryStateDesc', headerName: '交货状态描述', width: 120 },
      { field: 'CCustStd', headerName: '加工用途', width: 120 },
      { field: 'CStNo', headerName: '炉号', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWth', headerName: '宽度', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'CAutoJudgeResult', headerName: '自动判定结果', width: 120 },
      { field: 'CJudgeUser', headerName: '判定人', width: 120 },
      { field: 'DJudgeTime', headerName: '判定时间', width: 120 },
      { field: 'CJudgeResult', headerName: '最终判定结果', width: 120 },
      { field: 'CJudgeRemark', headerName: '判定备注', width: 120 },
      { field: 'DReceiveTime', headerName: '确认接收时间', width: 120 },
      { field: 'DReceiveUser', headerName: '确认接收人', width: 120 },
      { field: 'CConfirmUser', headerName: '成分确认人', width: 120 },
      { field: 'CSendUser', headerName: '发送人', width: 120 },
      { field: 'DConfirmTime', headerName: '成分确认时间', width: 120 },
      { field: 'DSendTime', headerName: '发送时间', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'OrderCustCName', headerName: '订货客户', width: 120 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 120 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 120 },
      { field: 'CCzpFlag', headerName: '重组批标记', width: 120 },
      { field: 'CPrevTestNo', headerName: '前委托单号', width: 120 },
      { field: 'Wgt', headerName: '吨位', width: 120 },
      { field: 'Count', headerName: '数量', width: 120 },
      { field: 'CJiaJi', headerName: '加急', width: 120 },
      { field: 'CMatShape', headerName: '尺寸外形', width: 120 },
      { field: 'CSpecialDesc', headerName: '特殊要求', width: 120 },
      { field: 'CSpecialMarkHt', headerName: '技术要求特殊说明', width: 120 },
      { field: 'CSpecialPackDesc', headerName: '特殊包装要求叙述', width: 120 },
      { field: 'CWarrantyDesc', headerName: '质保描述', width: 120 },
      { field: 'CDesignNo', headerName: '设计编号', width: 120 },
      { field: 'CurrentItemCompleteFlag', headerName: '项目完成标记', width: 120 },
]));

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnAddItem() { /* TODO: 接入业务逻辑 */ }
function onbtnDeleteItem() { /* TODO: 接入业务逻辑 */ }
function onbtnReversePrint() { /* TODO: 接入业务逻辑 */ }
function onbtnChangeSamplePosition() { /* TODO: 接入业务逻辑 */ }
function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnReceive() { /* TODO: 接入业务逻辑 */ }
function onbtnCancelReceive() { /* TODO: 接入业务逻辑 */ }
function onbtnPrint() { /* TODO: 接入业务逻辑 */ }
function onbtnReject() { /* TODO: 接入业务逻辑 */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">产线代码</label>
      <InputText v-model="ItemForCLineCode" class="w-40" />
      <label class="whitespace-nowrap">委托单号</label>
      <InputText v-model="ItemForCTestNo" class="w-40" />
      <label class="whitespace-nowrap">炉号</label>
      <InputText v-model="ItemForCStove" class="w-40" />
      <label class="whitespace-nowrap">钢种</label>
      <InputText v-model="ItemForCSgSign" class="w-40" />
      <label class="whitespace-nowrap">执行标准</label>
      <InputText v-model="ItemForCSgStd" class="w-40" />
      <label class="whitespace-nowrap">订单号</label>
      <InputText v-model="ItemForCOrderNo" class="w-40" />
      <label class="whitespace-nowrap">复验标记</label>
      <InputText v-model="ItemForCRecheckFlag" class="w-40" />
      <label class="whitespace-nowrap">批号</label>
      <InputText v-model="ItemForCBatch" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="新增项目" severity="success" @click="onbtnAddItem" />
      <Button label="删除项目" severity="danger" @click="onbtnDeleteItem" />
      <Button label="标为未打印" severity="success" @click="onbtnReversePrint" />
      <Button label="修改取样位置" severity="success" @click="onbtnChangeSamplePosition" />
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="登记" severity="success" @click="onbtnReceive" />
      <Button label="取消登记" severity="success" @click="onbtnCancelReceive" />
      <Button label="打印" severity="success" @click="onbtnPrint" />
      <Button label="拒收" severity="success" @click="onbtnReject" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
