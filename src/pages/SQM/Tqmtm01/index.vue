<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTqmtm01（冶金规范）：DDH.Winforms.SQM.Forms.Tqmtm.FrmTqmtm01
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const xtraTabPage1 = ref("");
const xtraTabPageTableVal = ref("");
const xtraTabPageT1 = ref("");
const xtraTabPageP0 = ref("");
const tabPageMsc = ref("");
const tabPageLine = ref("");
const tabPageProc = ref("");
const ItemForCMsc = ref("");
const colDefs = ref<ColDef[]>(([
      { field: 'DisplayTxt', headerName: '节点', width: 120 },
      { field: 'Data.CMsc', headerName: 'Data.CMsc', width: 120 },
      { field: 'Data.CBasicTableTypeCode', headerName: '基表类型', width: 120 },
      { field: 'Data.CMscDesc', headerName: 'Data.CMscDesc', width: 77 },
      { field: 'Data.CValidFlag', headerName: 'Data.CValidFlag', width: 120 },
      { field: 'Data.CMscLineNo', headerName: 'Data.CMscLineNo', width: 120 },
      { field: 'Data.CWholeBacklog', headerName: 'Data.CWholeBacklog', width: 120 },
      { field: 'Data.NWholeBacklogSeq', headerName: 'Data.NWholeBacklogSeq', width: 120 },
      { field: 'Data.CIdxNo', headerName: 'Data.CIdxNo', width: 120 },
      { field: 'Data.CProdClassCode', headerName: '产品大类', width: 120 },
      { field: 'Data.CWholeBacklogDesc', headerName: 'Data.CWholeBacklogDesc', width: 120 },
      { field: 'Data.CWholeBacklogCode', headerName: '全程工序', width: 120 },
      { field: 'Data.CProdCode', headerName: '品名', width: 120 },
      { field: 'Data.CStNo2', headerName: 'Data.CStNo2', width: 120 },
      { field: 'Data.CWholeBacklogName', headerName: 'Data.CWholeBacklogName', width: 120 },
      { field: 'Data.CBasicTableCode', headerName: 'Data.CBasicTableCode', width: 120 },
      { field: 'Data.CSteelType', headerName: 'Data.CSteelType', width: 120 },
      { field: 'Data.CStNo3', headerName: 'Data.CStNo3', width: 120 },
      { field: 'Data.CBasicTableEName', headerName: 'Data.CBasicTableEName', width: 120 },
      { field: 'Data.CSgStd', headerName: 'Data.CSgStd', width: 73 },
      { field: 'Data.CBasicTableCName', headerName: 'Data.CBasicTableCName', width: 120 },
      { field: 'Data.CSgSign', headerName: 'Data.CSgSign', width: 73 },
      { field: 'Data.CRemark', headerName: 'Data.CRemark', width: 120 },
      { field: 'Data.CItemMustFlag', headerName: 'Data.CItemMustFlag', width: 120 },
      { field: 'Data.CStdSgCode', headerName: 'Data.CStdSgCode', width: 92 },
      { field: 'Data.CDelivyStatusCode', headerName: 'Data.CDelivyStatusCode', width: 120 },
      { field: 'Data.CCustStdCode', headerName: 'Data.CCustStdCode', width: 120 },
      { field: 'Data.CDefaultFlag', headerName: 'Data.CDefaultFlag', width: 120 },
      { field: 'Data.NVersion', headerName: 'Data.NVersion', width: 72 },
      { field: 'Data.CHoldFlag', headerName: 'Data.CHoldFlag', width: 120 },
      { field: 'Data.CFactoryId', headerName: 'Data.CFactoryId', width: 120 },
      { field: 'Data.CAccuGradeCode', headerName: 'Data.CAccuGradeCode', width: 120 },
      { field: 'Data.CMscSrc', headerName: 'Data.CMscSrc', width: 72 },
      { field: 'Data.Creator', headerName: 'Data.Creator', width: 72 },
      { field: 'Data.CreateTime', headerName: 'Data.CreateTime', width: 72 },
      { field: 'Data.CCheckMaker', headerName: 'Data.CCheckMaker', width: 120 },
      { field: 'Data.DCheckTime', headerName: 'Data.DCheckTime', width: 120 },
      { field: 'Data.LastModifyTime', headerName: 'Data.LastModifyTime', width: 72 },
      { field: 'Data.LastModifier', headerName: 'Data.LastModifier', width: 87 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function onbtnQuery() { /* TODO: 接入业务逻辑 */ }
function onbtnAdd() { /* TODO: 接入业务逻辑 */ }
function onbtnEdit() { /* TODO: 接入业务逻辑 */ }
function onbtnDel() { /* TODO: 接入业务逻辑 */ }
function onbtnCopy() { /* TODO: 接入业务逻辑 */ }
function onbtnPreview() { /* TODO: 接入业务逻辑 */ }
function onbtnEnable() { /* TODO: 接入业务逻辑 */ }
function onbtnDisable() { /* TODO: 接入业务逻辑 */ }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">
      <label class="whitespace-nowrap">基表信息</label>
      <InputText v-model="xtraTabPage1" class="w-40" />
      <label class="whitespace-nowrap">基表数据明细</label>
      <InputText v-model="xtraTabPageTableVal" class="w-40" />
      <label class="whitespace-nowrap">试验项目要求</label>
      <InputText v-model="xtraTabPageT1" class="w-40" />
      <label class="whitespace-nowrap">试验项目标准</label>
      <InputText v-model="xtraTabPageP0" class="w-40" />
      <label class="whitespace-nowrap">冶金规范基本信息</label>
      <InputText v-model="tabPageMsc" class="w-40" />
      <label class="whitespace-nowrap">产线</label>
      <InputText v-model="tabPageLine" class="w-40" />
      <label class="whitespace-nowrap">工序</label>
      <InputText v-model="tabPageProc" class="w-40" />
      <label class="whitespace-nowrap">冶金规范码</label>
      <InputText v-model="ItemForCMsc" class="w-40" />
      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
    <div class="flex items-center gap-2 rounded bg-white p-2 shadow-sm dark:bg-gray-900">
      <Button label="查询" severity="secondary" @click="onbtnQuery" />
      <Button label="添加" severity="success" @click="onbtnAdd" />
      <Button label="编辑" severity="success" @click="onbtnEdit" />
      <Button label="删除" severity="danger" @click="onbtnDel" />
      <Button label="复制" severity="success" @click="onbtnCopy" />
      <Button label="预览" severity="success" @click="onbtnPreview" />
      <Button label="生效" severity="success" @click="onbtnEnable" />
      <Button label="禁用" severity="success" @click="onbtnDisable" />
    </div>
    <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
