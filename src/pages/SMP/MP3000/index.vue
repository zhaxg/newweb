<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMP3000（订单产出实绩）：DDH.Winforms.SMP.Forms.FrmMP3000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 149 },
      { field: 'CLineCode', headerName: '产线', width: 149 },
      { field: 'COrderNo', headerName: '订单号', width: 149 },
      { field: 'CBatchNo', headerName: '批号', width: 149 },
      { field: 'CStove', headerName: '炉号', width: 149 },
      { field: 'CSgCode', headerName: '钢种', width: 149 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 149 },
      { field: 'CSgStd', headerName: '钢种标准', width: 149 },
      { field: 'CSpec', headerName: '规格', width: 149 },
      { field: 'NNum', headerName: '件数', width: 149 },
      { field: 'NWgt', headerName: '重量', width: 149 },
      { field: 'NQua', headerName: '支数', width: 149 },
      { field: 'CSteelType', headerName: '品名', width: 149 },
      { field: 'CProdCode', headerName: '产品代码', width: 149 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 149 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 149 },
      { field: 'CEngMinThick', headerName: '厚度下偏差', width: 149 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 149 },
      { field: 'CEngMaxThick', headerName: '厚度上偏差', width: 149 },
      { field: 'DOrderTime', headerName: '订单时间', width: 149 },
      { field: 'CEngMinWidth', headerName: '宽度下偏差', width: 149 },
      { field: 'DJhqTime', headerName: '计划日期', width: 149 },
      { field: 'CEngMaxWidth', headerName: '宽度上偏差', width: 149 },
      { field: 'CConRemark', headerName: '合同备注', width: 149 },
      { field: 'CEngMinLen', headerName: '长度下偏差', width: 149 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 149 },
      { field: 'CEngMaxLen', headerName: '长度上偏差', width: 149 },
      { field: 'CDeptCode', headerName: '部门编码', width: 149 },
      { field: 'CCustName', headerName: '客户名称', width: 149 },
      { field: 'CProdName', headerName: '产品名称', width: 149 },
      { field: 'NWtMax', headerName: '最大重量', width: 149 },
      { field: 'NWtMin', headerName: '最小重量', width: 149 },
      { field: 'NWidthWgt', headerName: '宽重', width: 149 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 149 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 149 },
      { field: 'CSgCodeSlab', headerName: '钢坯钢种', width: 149 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 149 },
      { field: 'CSgStdSlab', headerName: '坯料执行标准', width: 149 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 149 },
      { field: 'CSpecSlab', headerName: '板坯规格', width: 149 },
      { field: 'CTol', headerName: '公差', width: 149 },
      { field: 'NQuaSlab', headerName: '钢坯总支数', width: 149 },
      { field: 'COverstepBl', headerName: '超差', width: 149 },
      { field: 'NWgtSlab', headerName: '坯重', width: 149 },
      { field: 'CInboundNo', headerName: '入库单号', width: 149 },
      { field: 'NFurType', headerName: '装炉方式', width: 149 },
      { field: 'CZggyCode', headerName: '轧钢工艺编码', width: 150 },
      { field: 'CFurCode', headerName: '加热炉编号', width: 149 },
      { field: 'CJrzzgyCode', headerName: '加热轧制工艺编码', width: 150 },
      { field: 'CRollCode', headerName: '轧机编号', width: 149 },
      { field: 'CJqgyCode', headerName: '剪切工艺编码', width: 150 },
      { field: 'DFinish', headerName: '完成时间', width: 149 },
      { field: 'CFinishShift', headerName: '完成班次', width: 149 },
      { field: 'CFinishGroup', headerName: '完成班组', width: 149 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 149 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 149 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 149 },
      { field: 'CSurfaceRemark', headerName: '缺陷描述', width: 149 },
      { field: 'CRespDept', headerName: '责任部门', width: 149 },
      { field: 'CFaceHandleAdvice', headerName: '处置措施', width: 149 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 149 },
      { field: 'CSampleLotNoSlab', headerName: '坯料试批号', width: 149 },
      { field: 'CQmHandleDesc', headerName: '处置注释', width: 149 },
      { field: 'CStoreCode', headerName: '库区号', width: 149 },
      { field: 'CStackNo', headerName: '垛位号', width: 149 },
      { field: 'CStackNum', headerName: '层号', width: 149 },
      { field: 'CWgtToler', headerName: '重量偏差等级', width: 149 },
      { field: 'NOrderThick', headerName: '订货厚', width: 149 },
      { field: 'NOrderWidth', headerName: '订货宽', width: 149 },
      { field: 'COrderLenType', headerName: '合同长度类型', width: 149 },
      { field: 'NOrderLenMax', headerName: '订单长2', width: 149 },
      { field: 'NOrderLenMin', headerName: '订单长', width: 149 },
      { field: 'NOrderLen', headerName: '订货长mm', width: 149 },
      { field: 'NCalWgt', headerName: '理重', width: 149 },
      { field: 'CPrint', headerName: '喷印完成标记', width: 149 },
      { field: 'CSlCode', headerName: '剪切线代码', width: 149 },
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
