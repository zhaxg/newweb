<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR2000（轧钢日计划管理）：DDH.Winforms.SHR.Forms.FrmHR2000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 150 },
      { field: 'NOrder', headerName: '排序', width: 150 },
      { field: 'CPlanTime', headerName: '计划时间', width: 150 },
      { field: 'CCool', headerName: '冷却', width: 150 },
      { field: 'CIsGcd', headerName: '是否过称', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'COrderNo1', headerName: '订单号1', width: 150 },
      { field: 'COrderNo2', headerName: '订单号2', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 150 },
      { field: 'COrderNo4', headerName: '订单号4', width: 150 },
      { field: 'NLenTq1', headerName: '套切1', width: 150 },
      { field: 'NLenTq2', headerName: '套切2', width: 150 },
      { field: 'NLenTq3', headerName: '套切3', width: 150 },
      { field: 'NLenTq4', headerName: '套切4', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'NBc', headerName: '倍尺', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NPlanedWgt', headerName: '计划重量', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NThickMin', headerName: '最小厚度', width: 150 },
      { field: 'NThickMax', headerName: '最大厚度', width: 150 },
      { field: 'NPlanZpWgt', headerName: '计划组批量', width: 149 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NZpSyWgt', headerName: '剩余组批量', width: 149 },
      { field: 'NWidthMin', headerName: '最小宽度', width: 150 },
      { field: 'NWidthMax', headerName: '最大宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'CRemark', headerName: '备注', width: 149 },
      { field: 'CLengthType', headerName: '长度类型', width: 150 },
      { field: 'CSgCodeTl', headerName: '炼钢钢种', width: 149 },
      { field: 'NLenMin', headerName: '最小长度', width: 150 },
      { field: 'CSgStdTl', headerName: '提料标准', width: 149 },
      { field: 'NLenMax', headerName: '最大长度', width: 150 },
      { field: 'NThickTl', headerName: '坯厚', width: 149 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'NWidthTl', headerName: '坯宽', width: 149 },
      { field: 'CProdCode', headerName: '产品代码', width: 150 },
      { field: 'NLenMinTl', headerName: '提料长度最小值', width: 149 },
      { field: 'NDbc', headerName: '单重', width: 150 },
      { field: 'NLenMaxTl', headerName: '提料长度最大值', width: 149 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'NQuaTl', headerName: '计划生产钢坯块数', width: 149 },
      { field: 'CSlabSource', headerName: '坯料来源', width: 150 },
      { field: 'NWgtUnitTl', headerName: '钢坯单重', width: 149 },
      { field: 'CTlSgCode', headerName: '提料钢种', width: 150 },
      { field: 'NWgtTl', headerName: '生产钢坯重量', width: 149 },
      { field: 'CTlSgStd', headerName: '提料钢种标准', width: 150 },
      { field: 'NQuaZp', headerName: '组批支数', width: 150 },
      { field: 'CSlabSize', headerName: '钢坯尺寸', width: 150 },
      { field: 'NWgtZp', headerName: '组批重量', width: 150 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 150 },
      { field: 'NQuaFur', headerName: '入炉支数', width: 150 },
      { field: 'NSlabWidth', headerName: '坯料宽度', width: 150 },
      { field: 'NWgtFur', headerName: '入炉量', width: 150 },
      { field: 'NSlabLen', headerName: '钢坯长', width: 150 },
      { field: 'NQuaRoll', headerName: '轧制支数', width: 150 },
      { field: 'NSlabQua', headerName: '坯料数量', width: 150 },
      { field: 'NWgtRoll', headerName: '轧制重量', width: 150 },
      { field: 'NWgtUnit', headerName: '单位重量', width: 150 },
      { field: 'NQuaPlan', headerName: '计划收料支数', width: 150 },
      { field: 'NRate', headerName: '收得率', width: 150 },
      { field: 'NQuaFinish', headerName: '收料支数', width: 150 },
      { field: 'NSlabWgt', headerName: '坯料重量', width: 150 },
      { field: 'NWgtFinish', headerName: '收料重量', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 150 },
      { field: 'COrderCustNo', headerName: '订货客户编号', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'DStart', headerName: '开始时间', width: 150 },
      { field: 'CExportFlag', headerName: '出口标志', width: 150 },
      { field: 'DEnd', headerName: '结束时间', width: 150 },
      { field: 'DOrderTime', headerName: '订单时间', width: 150 },
      { field: 'CPieceNos', headerName: '批量件次号', width: 150 },
      { field: 'DJhqTime', headerName: '计划日期', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 150 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'CWarrantyDesc', headerName: '质保描述', width: 150 },
      { field: 'CPackCode', headerName: '包装代码', width: 150 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 150 },
      { field: 'CDeptCode', headerName: '部门编码', width: 150 },
      { field: 'NFlag', headerName: '标志', width: 150 },
      { field: 'CProdName', headerName: '产品名称', width: 150 },
      { field: 'CDelivyStatusDesc', headerName: '交货状态描述', width: 150 },
      { field: 'CCustStdDesc', headerName: '客户标准描述', width: 150 },
      { field: 'NWtMax', headerName: '最大重量', width: 150 },
      { field: 'NWtMin', headerName: '最小重量', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'COverstepBl', headerName: '超差', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'CShape', headerName: '形状', width: 150 },
      { field: 'CSlabRemark', headerName: '坯料备注', width: 150 },
      { field: 'NBoarCleanLen', headerName: '板清洁长度', width: 150 },
      { field: 'NLlCleanLen', headerName: '余量清洁长度', width: 150 },
      { field: 'NPlanBoarLen', headerName: '计划板长', width: 150 },
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
