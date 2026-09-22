<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";


import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTqmtp01（产品规范维护）：DDH.Winforms.SQM.Forms.Tqmtp.FrmTqmtp01
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const ItemForCPsc = ref("");
const ItemForCSgStd = ref("");
const ItemForCSgSign = ref("");
const ItemForCProdClass = ref("");
const ItemForFactoryId = ref("");
const colDefs = ref<ColDef[]>(([
      { field: 'CPsc', headerName: '产品规范码', width: 120 },
      { field: 'CProdCode', headerName: '产品代码', width: 120 },
      { field: 'CMsc', headerName: '冶金规范码', width: 120 },
      { field: 'CProdCName', headerName: '产品名称（品名中文）', width: 120 },
      { field: 'CStdSgCode', headerName: '标准牌号代码', width: 120 },
      { field: 'CFinalUse1', headerName: '最终用途1', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CFinCustCode', headerName: '最终用户代码', width: 120 },
      { field: 'CSgSign', headerName: '钢种', width: 120 },
      { field: 'CApnDesc', headerName: '产品最终用途说明', width: 120 },
      { field: 'CLevel', headerName: '产品等级', width: 120 },
      { field: 'CFinUserName', headerName: '最终用户名称', width: 120 },
      { field: 'CProcessPurposeCode', headerName: '加工用途代码', width: 120 },
      { field: 'CProcessPurposeDesc', headerName: '加工用途叙述', width: 120 },
      { field: 'CClientEvaluateCode', headerName: '客户评审号', width: 120 },
      { field: 'CHeatAndTypeCode', headerName: '热处理状态和类型', width: 120 },
      { field: 'CProcUseDesc', headerName: '加工用途描述', width: 120 },
      { field: 'CHeatAndTypeDesc', headerName: '热处理状态和类型叙述', width: 120 },
      { field: 'CSpecialUsagec', headerName: '特殊用途叙述', width: 120 },
      { field: 'CSurfaceStatus', headerName: '表面状态', width: 120 },
      { field: 'DTcTranOkTime', headerName: '电文处理成功时间', width: 120 },
      { field: 'CSurfaceStatusDesc', headerName: '表面状态叙述', width: 120 },
      { field: 'CTolPrecGroup', headerName: '截面公差精度组别', width: 120 },
      { field: 'CTolPrecGroupDesc', headerName: '截面公差精度组别叙述', width: 120 },
      { field: 'CBendGroup', headerName: '弯曲度', width: 120 },
      { field: 'CBendGroupDesc', headerName: '弯曲度叙述', width: 120 },
      { field: 'CValidFlag', headerName: '生效标记', width: 120 },
      { field: 'CCheckMaker', headerName: '检验责任者', width: 120 },
      { field: 'DCheckTime', headerName: '报出时间', width: 120 },
      { field: 'CProdAuth', headerName: '产品认证', width: 120 },
      { field: 'CCertiTypeCode', headerName: '质保书类型代码', width: 120 },
      { field: 'NCertiNum', headerName: '质保书份数', width: 120 },
      { field: 'CNewProductCode', headerName: '新试产品代码1', width: 120 },
      { field: 'DChangeProductDate', headerName: '转产日期1', width: 120 },
      { field: 'CPscDesc', headerName: '产品规范说明', width: 120 },
      { field: 'CRemark', headerName: '备注', width: 120 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 120 },
      { field: 'CDeliveryStateDesc', headerName: '交货状态描述', width: 120 },
      { field: 'CProdClass', headerName: '钢板分类', width: 120 },
      { field: 'CProdClassText', headerName: '产品大类及形状描述', width: 120 },
      { field: 'NVersion', headerName: '版次', width: 120 },
      { field: 'CArchiveFlag', headerName: '归档标记', width: 120 },
      { field: 'CFactoryId', headerName: '工厂编码', width: 120 },
      { field: 'CRemarkDesc', headerName: '合同备注', width: 120 },
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnAddMsc() { /* TODO: 接入业务逻辑 */ }
function onbtnDeleteMsc() { /* TODO: 接入业务逻辑 */ }
function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnAdd() { /* TODO: 接入业务逻辑 */ }
function onbtnEdit() { /* TODO: 接入业务逻辑 */ }
function onbtnDelete() { /* TODO: 接入业务逻辑 */ }
function onbtnValid() { /* TODO: 接入业务逻辑 */ }
function onbtnInvalid() { /* TODO: 接入业务逻辑 */ }
function onbtnCancel() { /* TODO: 接入业务逻辑 */ }
function onbtnOk() { /* TODO: 接入业务逻辑 */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">产品规范码</label>
      <InputText v-model="ItemForCPsc" class="w-40" />
      <label class="whitespace-nowrap">标准</label>
      <InputText v-model="ItemForCSgStd" class="w-40" />
      <label class="whitespace-nowrap">钢种牌号</label>
      <InputText v-model="ItemForCSgSign" class="w-40" />
      <label class="whitespace-nowrap">产品大类及形状</label>
      <InputText v-model="ItemForCProdClass" class="w-40" />
      <label class="whitespace-nowrap">工厂</label>
      <InputText v-model="ItemForFactoryId" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="添加" severity="success" @click="onbtnAddMsc" />
      <Button label="删除" severity="danger" @click="onbtnDeleteMsc" />
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="添加" severity="success" @click="onbtnAdd" />
      <Button label="编辑" severity="success" @click="onbtnEdit" />
      <Button label="删除" severity="danger" @click="onbtnDelete" />
      <Button label="审核生效" severity="success" @click="onbtnValid" />
      <Button label="禁用" severity="success" @click="onbtnInvalid" />
      <Button label="取消" severity="success" @click="onbtnCancel" />
      <Button label="选择" severity="success" @click="onbtnOk" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
