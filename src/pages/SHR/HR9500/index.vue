<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";



import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9500（销售订单跟踪查询）：DDH.Winforms.SHR.Forms.FrmHR9500
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);


const colDefs = ref<ColDef[]>(([
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'NFlag', headerName: '订单类型', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'CBatchNo', headerName: '批号', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'CExitem1', headerName: '是否工程单', width: 150 },
      { field: 'NProType', headerName: '库存类型', width: 150 },
      { field: 'IsTl', headerName: '是否提料', width: 150 },
      { field: 'CIsCc', headerName: '是否超长', width: 150 },
      { field: 'IsDaliy', headerName: '是否生成日计划', width: 150 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 150 },
      { field: 'CIsDc', headerName: '是否短尺', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'NNum', headerName: '件数', width: 150 },
      { field: 'DProTime', headerName: '产出时间', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'CProUser', headerName: '产出人', width: 150 },
      { field: 'NQuaLg', headerName: '炼钢产出块数', width: 150 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 150 },
      { field: 'NWgtLg', headerName: '炼钢产出重量', width: 150 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 150 },
      { field: 'NQuaZz', headerName: '轧制完成块数', width: 150 },
      { field: 'DInTime', headerName: '入库时间', width: 150 },
      { field: 'NWgtZz', headerName: '轧制完成重量', width: 150 },
      { field: 'CInUser', headerName: '入库人', width: 150 },
      { field: 'NQuaDl', headerName: '堆冷中块数', width: 150 },
      { field: 'CStoreCode', headerName: '库区号', width: 150 },
      { field: 'NWgtDl', headerName: '堆冷中重量', width: 150 },
      { field: 'CStackNo', headerName: '垛位号', width: 150 },
      { field: 'NQuaJh', headerName: '计划生产块数', width: 150 },
      { field: 'CStackNum', headerName: '层号', width: 150 },
      { field: 'NQuaYxFjh', headerName: '允许非计划块数', width: 150 },
      { field: 'NQuaJq', headerName: '剪切支数', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
      { field: 'NWgtJq', headerName: '剪切重量', width: 150 },
      { field: 'NQuaCc', headerName: '超长块数', width: 150 },
      { field: 'NQuaDc', headerName: '短尺块数', width: 150 },
      { field: 'NPerFjh', headerName: '非计划比例', width: 150 },
      { field: 'NQuaJz', headerName: '精整中块数', width: 150 },
      { field: 'NWgtJz', headerName: '精整中重量', width: 150 },
      { field: 'NQuaCp', headerName: '成品支数', width: 150 },
      { field: 'NWgtCp', headerName: '成品重量', width: 150 },
      { field: 'NQuaFh', headerName: '发货块数', width: 150 },
      { field: 'NWgtFh', headerName: '发货重量', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NThickMin', headerName: '最小厚度', width: 150 },
      { field: 'NThickMax', headerName: '最大厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NWidthMin', headerName: '最小宽度', width: 150 },
      { field: 'NWidthMax', headerName: '最大宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'CLengthType', headerName: '长度类型', width: 150 },
      { field: 'NLenMin', headerName: '最小长度', width: 150 },
      { field: 'NLenMax', headerName: '最大长度', width: 150 },
      { field: 'CSteelType', headerName: '品名', width: 150 },
      { field: 'CProdCode', headerName: '产品代码', width: 150 },
      { field: 'CLineCode', headerName: '产线', width: 150 },
      { field: 'NDbc', headerName: '单重', width: 150 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 150 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 150 },
      { field: 'COrderCustNo', headerName: '订货客户编号', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'COrderCustEname', headerName: '订货客户英文名', width: 150 },
      { field: 'CProductH', headerName: '产品大类', width: 150 },
      { field: 'COrderTypeCode', headerName: '订单类型', width: 150 },
      { field: 'CExportFlag', headerName: '出口标志', width: 150 },
      { field: 'DOrderTime', headerName: '订单时间', width: 150 },
      { field: 'DJhqTime', headerName: '计划日期', width: 150 },
      { field: 'CMatCode', headerName: '钢坯物料号', width: 150 },
      { field: 'CMatName', headerName: '钢坯物料名称', width: 150 },
      { field: 'CSlabType', headerName: '坯型', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 150 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'CWarrantyDesc', headerName: '质保描述', width: 150 },
      { field: 'CPackCode', headerName: '包装代码', width: 150 },
      { field: 'NOrderProcFlag', headerName: '质量处理结果', width: 150 },
      { field: 'CDelivyQtyFlag', headerName: '交货数量标志', width: 150 },
      { field: 'CDeptCode', headerName: '部门编码', width: 150 },
      { field: 'CProdName', headerName: '产品名称', width: 150 },
      { field: 'CDelivyStatusDesc', headerName: '交货状态描述', width: 150 },
      { field: 'CCustStdDesc', headerName: '客户标准描述', width: 150 },
      { field: 'NApplyCloseStatus', headerName: '申请结案状态', width: 150 },
      { field: 'CApplyCloseEmp', headerName: '申请结案人', width: 150 },
      { field: 'DApplyCloseDt', headerName: '申请结案日期', width: 150 },
      { field: 'CApplyCloseRemark', headerName: '申请结案备注', width: 150 },
      { field: 'CDesignNo', headerName: '设计编号', width: 150 },
      { field: 'CDesignDesc', headerName: '设计描述', width: 150 },
      { field: 'NWtMax', headerName: '最大重量', width: 150 },
      { field: 'NWtMin', headerName: '最小重量', width: 150 },
      { field: 'NSendNum', headerName: '发货数量', width: 150 },
      { field: 'NWidthWgt', headerName: '宽重', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CFlawDesc', headerName: '表面缺陷', width: 150 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 150 },
      { field: 'CTol', headerName: '公差', width: 150 },
      { field: 'COverstepBl', headerName: '超差', width: 150 },
      { field: 'CShape', headerName: '形状', width: 150 },
      { field: 'CSgCodeNk', headerName: '内控钢种', width: 150 },
      { field: 'COrderProcUserid', headerName: '合同处理操作人', width: 150 },
      { field: 'DOrderProcTime', headerName: '合同处理时间', width: 150 },
      { field: 'CZggyCode', headerName: '轧钢工艺编码', width: 150 },
      { field: 'CPushUserid', headerName: '下发生产人', width: 150 },
      { field: 'DPushTime', headerName: '下发生产时间', width: 150 },
      { field: 'CSendUserid', headerName: '销售下提报人', width: 150 },
      { field: 'DSendTime', headerName: '发送时间', width: 150 },
      { field: 'NThickTolMin', headerName: '厚度公差最小', width: 150 },
      { field: 'NThickTolMax', headerName: '厚度公差最大', width: 150 },
      { field: 'NWidthTolMin', headerName: '宽度公差最小', width: 150 },
      { field: 'NWidthTolMax', headerName: '宽度公差最大', width: 150 },
      { field: 'NLenTolMin', headerName: '长度公差最小', width: 150 },
      { field: 'NLenTolMax', headerName: '长度公差最大', width: 150 },
      { field: 'DTimeShipment', headerName: '发货时间', width: 150 },
      { field: 'CJrzzgyCode', headerName: '加热轧制工艺编码', width: 150 },
      { field: 'CJqgyCode', headerName: '剪切工艺编码', width: 150 },
      { field: 'NExitem2', headerName: '申请通知', width: 150 },
      { field: 'CExitem3', headerName: '原始订单号', width: 150 },
      { field: 'CBackRemark', headerName: '生产退回销售订单原因', width: 150 },
      { field: 'CExitem4', headerName: '变更原因', width: 150 },
      { field: 'CConRemark2', headerName: '合同备注2', width: 150 },
      { field: 'CGf', headerName: '平直度', width: 150 },
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
