<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmSD2061（中厚板成品资源调配）：DDH.Winforms.SMP.Forms.FrmSD2061
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'CComplexDecideCode', headerName: '综判结果', width: 150 },
      { field: 'CStackNo', headerName: '垛位号', width: 150 },
      { field: 'CStackNum', headerName: '层号', width: 150 },
      { field: 'CConsignee', headerName: '订货单位', width: 150 },
      { field: 'CSettleCust', headerName: '结算客户', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'CProdClass', headerName: '钢板分类', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CProdCode', headerName: '产品代码', width: 150 },
      { field: 'NWgt', headerName: '����', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWth', headerName: '宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'NQmStatus', headerName: '质量状态', width: 150 },
      { field: 'NLockReason', headerName: '质量封锁原因', width: 150 },
      { field: 'CWgtToler', headerName: '重量偏差等级', width: 150 },
      { field: 'CCutFlag', headerName: '切边方式', width: 150 },
      { field: 'CDetectDefectLevel', headerName: '探伤等级', width: 150 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
      { field: 'DProTime', headerName: '产出时间', width: 150 },
      { field: 'NQmLevel', headerName: '质量等级', width: 150 },
      { field: 'CDetectResultCode', headerName: '探伤判定结果', width: 150 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 150 },
      { field: 'CStoreCode', headerName: '库区号', width: 150 },
      { field: 'CSaleEmp', headerName: '销售员', width: 150 },
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
