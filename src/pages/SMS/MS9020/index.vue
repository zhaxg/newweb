<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS9020（二炼钢板坯火切作业）：DDH.Winforms.SMS.Forms.FrmMS9020
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CStove', headerName: '炉号', width: 149 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 149 },
      { field: 'NProType', headerName: '库存类型', width: 149 },
      { field: 'CPrintCode', headerName: '喷号', width: 149 },
      { field: 'CLineCode', headerName: '产线', width: 149 },
      { field: 'CProc', headerName: '工序', width: 149 },
      { field: 'CMachine', headerName: '机台', width: 149 },
      { field: 'CStrandNo', headerName: '流号', width: 149 },
      { field: 'CPlanId', headerName: '计划ID', width: 149 },
      { field: 'CConNo', headerName: '合同号', width: 149 },
      { field: 'COrderNo', headerName: '订单号', width: 149 },
      { field: 'CMatCode', headerName: '钢坯物料号', width: 149 },
      { field: 'CSgCode', headerName: '钢种', width: 149 },
      { field: 'CSgStd', headerName: '钢种标准', width: 149 },
      { field: 'NThick', headerName: '厚度', width: 149 },
      { field: 'NWth', headerName: '宽度', width: 149 },
      { field: 'NLen', headerName: '长度', width: 149 },
      { field: 'CSpec', headerName: '规格', width: 149 },
      { field: 'NNum', headerName: '件数', width: 149 },
      { field: 'NCalWgt', headerName: '理重', width: 149 },
      { field: 'NWgt', headerName: '重量', width: 149 },
      { field: 'DProTime', headerName: '产出时间', width: 149 },
      { field: 'CProUser', headerName: '产出人', width: 149 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 149 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 149 },
      { field: 'DInTime', headerName: '入库时间', width: 149 },
      { field: 'CInUser', headerName: '入库人', width: 149 },
      { field: 'CStoreCode', headerName: '库区号', width: 149 },
      { field: 'CArer', headerName: '区域', width: 149 },
      { field: 'CStackNo', headerName: '垛位号', width: 149 },
      { field: 'NStackNum', headerName: '层号', width: 150 },
      { field: 'CSourceStoreCode', headerName: '原库区号', width: 149 },
      { field: 'CSourceStackNo', headerName: '原垛位号', width: 149 },
      { field: 'CSourceStackNum', headerName: '原层号', width: 149 },
      { field: 'NStatus', headerName: '状态', width: 149 },
      { field: 'CIsHot', headerName: '是否热送', width: 149 },
      { field: 'CProRemark', headerName: '生产备注', width: 149 },
      { field: 'NCastDivCode', headerName: '模连铸标识', width: 149 },
      { field: 'CLockedLine', headerName: '占用产线', width: 149 },
      { field: 'CLockedPlan', headerName: '占用计划', width: 149 },
      { field: 'CMatType', headerName: '物料类型', width: 149 },
      { field: 'CProdCode', headerName: '产品代码', width: 149 },
      { field: 'CSteelType', headerName: '品名', width: 149 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 149 },
      { field: 'CCustStdCode', headerName: '客户标准', width: 149 },
      { field: 'CBatchNo', headerName: '批号', width: 149 },
      { field: 'COrderNoLast', headerName: '原始订单号', width: 149 },
      { field: 'CDestination', headerName: '去向', width: 149 },
      { field: 'CHotNo', headerName: '退火炉回号', width: 149 },
      { field: 'CSlabType', headerName: '坯型', width: 149 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 149 },
      { field: 'NQmStatus', headerName: '质量状态', width: 149 },
      { field: 'NLockReason', headerName: '质量封锁原因', width: 149 },
      { field: 'NQmLevel', headerName: '质量等级', width: 149 },
      { field: 'CIsSurface', headerName: '是否表检', width: 149 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 149 },
      { field: 'CSurfaceDefectCode', headerName: '表面缺陷代码', width: 149 },
      { field: 'CSurfaceDesc', headerName: '表检描述', width: 149 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 149 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 149 },
      { field: 'CDetectResultCode', headerName: '探伤判定结果', width: 149 },
      { field: 'CDetectDefectLevel', headerName: '探伤等级', width: 149 },
      { field: 'CDefectDefectCode', headerName: '探伤判定缺陷代码', width: 149 },
      { field: 'CDefectDefectMark', headerName: '探伤判定缺陷描述', width: 149 },
      { field: 'CDefectUser', headerName: '探伤判定人', width: 149 },
      { field: 'DDefectTime', headerName: '探伤判定时间', width: 149 },
      { field: 'CComplexDecideCode', headerName: '综判结果', width: 149 },
      { field: 'CComplexDesc', headerName: '综判描述', width: 149 },
      { field: 'CComplexUser', headerName: '综判人', width: 149 },
      { field: 'DComplexTime', headerName: '综判时间', width: 149 },
      { field: 'CQmHandleCode', headerName: '处置结果', width: 149 },
      { field: 'CQmHandleDesc', headerName: '处置注释', width: 149 },
      { field: 'CQmHandleUser', headerName: '处置人', width: 149 },
      { field: 'DQmHandleTime', headerName: '处置时间', width: 149 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 149 },
      { field: 'CSampleLotNoPre', headerName: '前检验委托单号', width: 149 },
      { field: 'CCutFlag', headerName: '切边方式', width: 149 },
      { field: 'CInboundNo', headerName: '入库单号', width: 149 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 149 },
      { field: 'CWgtToler', headerName: '重量偏差等级', width: 149 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 149 },
      { field: 'CCusName', headerName: '客户名称', width: 149 },
      { field: 'PLAN_CSpec', headerName: '剪切计划规格', width: 149 },
      { field: 'PLAN_NThickPlan', headerName: '轧制厚', width: 149 },
      { field: 'PLAN_NWidthPlan', headerName: '轧制宽', width: 149 },
      { field: 'PLAN_NLlCleanLen', headerName: '轧制长', width: 149 },
      { field: 'PLAN_COrderNo1', headerName: '订单号1', width: 149 },
      { field: 'PLAN_COrderNo2', headerName: '订单号2', width: 149 },
      { field: 'PLAN_COrderNo3', headerName: '订单号3', width: 149 },
      { field: 'PLAN_COrderNo4', headerName: '订单号4', width: 149 },
      { field: 'PLAN_COrderNo5', headerName: '订单号5', width: 149 },
      { field: 'PLAN_COrderNo6', headerName: '订单号6', width: 149 },
      { field: 'PLAN_NLenPlan1', headerName: '套切长度1', width: 149 },
      { field: 'PLAN_NLenPlan2', headerName: '套切长度2', width: 149 },
      { field: 'PLAN_NLenPlan3', headerName: '套切长度3', width: 149 },
      { field: 'PLAN_NLenPlan4', headerName: '套切长度4', width: 149 },
      { field: 'PLAN_NLenPlan5', headerName: '套切长度5', width: 149 },
      { field: 'PLAN_NLenPlan6', headerName: '套切长度6', width: 149 },
      { field: 'NKSgCode', headerName: '国标钢种', width: 149 },
      { field: 'CPlanTime', headerName: '计划时间', width: 149 },
      { field: 'CTol', headerName: '公差', width: 149 },
      { field: 'TypeValues', headerName: '钢板分类', width: 73 },
      { field: 'CAutoJudgeResult', headerName: '自动判定结果', width: 149 },
      { field: 'CJudgeRemark', headerName: '判定备注', width: 149 },
      { field: 'CJudgeResult', headerName: '最终判定结果', width: 149 },
      { field: 'CJudgeUser', headerName: '判定人', width: 149 },
      { field: 'CRecheckFlag', headerName: '复验标记', width: 149 },
      { field: 'CStatus', headerName: '状态', width: 149 },
      { field: 'DJudgeTime', headerName: '判定时间', width: 149 },
      { field: 'CTlSgCode', headerName: '提料钢种', width: 120 },
      { field: 'COutUser', headerName: '出库人', width: 100 },
      { field: 'DOutTime', headerName: '抽出时间', width: 100 },
      { field: 'CInboundNo1', headerName: '入库标识1', width: 150 },
      { field: 'CInboundNo2', headerName: '入库标识2', width: 150 },
      { field: 'CInboundNo3', headerName: '入库标识3', width: 150 },
      { field: 'CInboundNo4', headerName: '入库标识4', width: 150 },
      { field: 'CInboundNo5', headerName: '入库标识5', width: 150 },
      { field: 'CInboundNo6', headerName: '入库标识6', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 150 },
      { field: 'NDbc', headerName: '单重', width: 150 },
      { field: 'CIsMatchOrder', headerName: '是否满足订单要求', width: 150 },
      { field: 'NTransferNo', headerName: '入库吊号', width: 150 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]));

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">

      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"><IconSearch class="h-3.5 w-3.5" />查询</Button>
    </div>
        <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
