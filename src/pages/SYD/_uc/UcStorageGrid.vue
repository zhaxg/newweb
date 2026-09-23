<script setup lang="ts">
/** UCStorage（WinForms 共享控件，DDH.Winforms/Controls/UCStorage）的 web 对应。
 *  内嵌库存表：绑定 Tyd2000Dto，列与 Designer 一一对应（127 可见 + CStackNum 隐藏 + Selected 行选择）。
 *  被 FrmYD2000 / FrmYD2010 / FrmYD2100 复用 —— 与原 UC 控件同构。
 *  注意：PLAN_* 字段按后端契约为 pLAN_*（swagger camelCase） */
import { ref } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

const props = withDefaults(
  defineProps<{
    rows: unknown[];
    loading?: boolean;
    mode?: "multiRow" | "singleRow";
  }>(),
  { loading: false, mode: "multiRow" },
);

const emit = defineEmits<{
  ready: [api: GridApi];
  selectionChanged: [];
}>();

const theme = makeHmxGridTheme();

const colDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "id", headerName: "主键", width: 86 },
  { field: "cStove", headerName: "炉号", width: 86 },
  { field: "cPieceNo", headerName: "件次号", width: 99 },
  { field: "nProType", headerName: "库存分类", width: 112 },
  { field: "cPrintCode", headerName: "喷号", width: 86 },
  { field: "cLineCode", headerName: "产线", width: 86 },
  { field: "cProc", headerName: "工序代码", width: 112 },
  { field: "cMachine", headerName: "机台号", width: 99 },
  { field: "cStrandNo", headerName: "流号", width: 86 },
  { field: "cPlanId", headerName: "计划号", width: 99 },
  { field: "cConNo", headerName: "合同号", width: 99 },
  { field: "cOrderNo", headerName: "订单号", width: 99 },
  { field: "cMatCode", headerName: "物料编码", width: 112 },
  { field: "cSgCode", headerName: "钢种", width: 86 },
  { field: "cSgStd", headerName: "执行标准", width: 112 },
  { field: "nThick", headerName: "厚度", width: 86 },
  { field: "nWth", headerName: "宽度", width: 86 },
  { field: "nLen", headerName: "长度", width: 86 },
  { field: "cSpec", headerName: "规格", width: 86 },
  { field: "nNum", headerName: "支数", width: 86 },
  { field: "nCalWgt", headerName: "理重", width: 86 },
  { field: "nWgt", headerName: "实重", width: 86 },
  { field: "dProTime", headerName: "产出时间", width: 112 },
  { field: "cProUser", headerName: "产出人", width: 99 },
  { field: "cShiftNo", headerName: "产出班次", width: 112 },
  { field: "cGroupNo", headerName: "产出班组", width: 112 },
  { field: "dInTime", headerName: "入库时间", width: 112 },
  { field: "cInUser", headerName: "入库人", width: 99 },
  { field: "cStoreCode", headerName: "库区号", width: 99 },
  { field: "cArer", headerName: "区域", width: 86 },
  { field: "cStackNo", headerName: "垛位号", width: 99 },
  { field: "nStackNum", headerName: "层号", width: 86 },
  { field: "cSourceStoreCode", headerName: "原库区号", width: 112 },
  { field: "cSourceStackNo", headerName: "原垛位号", width: 112 },
  { field: "cSourceStackNum", headerName: "原层号", width: 99 },
  { field: "nStatus", headerName: "库存状态", width: 112 },
  { field: "cIsHot", headerName: "热送区分", width: 112 },
  { field: "cProRemark", headerName: "生产备注", width: 112 },
  { field: "nCastDivCode", headerName: "模连铸标识", width: 125 },
  { field: "cLockedLine", headerName: "占用产线", width: 112 },
  { field: "cLockedPlan", headerName: "占用计划", width: 112 },
  { field: "cMatType", headerName: "产品大类", width: 112 },
  { field: "cProdCode", headerName: "品名", width: 86 },
  { field: "cSteelType", headerName: "钢类", width: 86 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 138 },
  { field: "cBatchNo", headerName: "批号", width: 86 },
  { field: "cOrderNoLast", headerName: "原始订单号", width: 125 },
  { field: "cDestination", headerName: "去向", width: 86 },
  { field: "cHotNo", headerName: "退火炉回号", width: 125 },
  { field: "cSlabType", headerName: "坯类", width: 86 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 99 },
  { field: "nQmStatus", headerName: "质量状态", width: 112 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 138 },
  { field: "nQmLevel", headerName: "质量等级", width: 112 },
  { field: "cIsSurface", headerName: "是否表检", width: 112 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 112 },
  { field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 138 },
  { field: "cSurfaceDesc", headerName: "表检描述", width: 112 },
  { field: "cSurfaceUser", headerName: "表面判定人", width: 125 },
  { field: "dSurfaceTime", headerName: "表面判定时间", width: 138 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 138 },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 112 },
  { field: "cDefectDefectCode", headerName: "探伤判定缺陷代码", width: 164 },
  { field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 164 },
  { field: "cDefectUser", headerName: "表面判定人", width: 125 },
  { field: "dDefectTime", headerName: "表面判定时间", width: 138 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 112 },
  { field: "cComplexDesc", headerName: "综判描述", width: 112 },
  { field: "cComplexUser", headerName: "综判人", width: 99 },
  { field: "dComplexTime", headerName: "综判时间", width: 112 },
  { field: "cQmHandleCode", headerName: "处置结果", width: 112 },
  { field: "cQmHandleDesc", headerName: "处置注释", width: 112 },
  { field: "cQmHandleUser", headerName: "处置人", width: 99 },
  { field: "dQmHandleTime", headerName: "处置时间", width: 112 },
  { field: "cSampleLotNo", headerName: "试批号", width: 99 },
  { field: "cSampleLotNoPre", headerName: "前试批号", width: 112 },
  { field: "cCutFlag", headerName: "切边方式", width: 112 },
  { field: "cInboundNo", headerName: "入库标识", width: 112 },
  { field: "cDelivyAddress", headerName: "流向", width: 86 },
  { field: "cWgtToler", headerName: "公差等级", width: 112 },
  { field: "cBilletTypeCode", headerName: "铸坯标识", width: 112 },
  { field: "cCusName", headerName: "客户名称", width: 112 },
  { field: "pLAN_CSpec", headerName: "剪切计划规格", width: 130 },
  { field: "pLAN_NThickPlan", headerName: "轧制厚", width: 130 },
  { field: "pLAN_NWidthPlan", headerName: "轧制宽", width: 130 },
  { field: "pLAN_NLlCleanLen", headerName: "轧制长", width: 130 },
  { field: "pLAN_COrderNo1", headerName: "订单号1", width: 130 },
  { field: "pLAN_COrderNo2", headerName: "订单号2", width: 130 },
  { field: "pLAN_COrderNo3", headerName: "订单号3", width: 130 },
  { field: "pLAN_COrderNo4", headerName: "订单号4", width: 130 },
  { field: "pLAN_COrderNo5", headerName: "订单号5", width: 130 },
  { field: "pLAN_COrderNo6", headerName: "订单号6", width: 130 },
  { field: "pLAN_NLenPlan1", headerName: "套切长度1", width: 130 },
  { field: "pLAN_NLenPlan2", headerName: "套切长度2", width: 130 },
  { field: "pLAN_NLenPlan3", headerName: "套切长度3", width: 130 },
  { field: "pLAN_NLenPlan4", headerName: "套切长度4", width: 130 },
  { field: "pLAN_NLenPlan5", headerName: "套切长度5", width: 130 },
  { field: "pLAN_NLenPlan6", headerName: "套切长度6", width: 130 },
  { field: "nKSgCode", headerName: "国标钢种", width: 112 },
  { field: "cPlanTime", headerName: "计划日期", width: 112 },
  { field: "cTol", headerName: "公差", width: 86 },
  { field: "typeValues", headerName: "钢板分类", width: 112 },
  { field: "cAutoJudgeResult", headerName: "委托自动判定结果", width: 164 },
  { field: "cJudgeRemark", headerName: "委托判定备注", width: 138 },
  { field: "cJudgeResult", headerName: "委托最终判定结果", width: 164 },
  { field: "cJudgeUser", headerName: "委托判定人", width: 125 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 112 },
  { field: "cStatus", headerName: "委托单状态", width: 125 },
  { field: "dJudgeTime", headerName: "委托判定时间", width: 138 },
  { field: "cTlSgCode", headerName: "炼钢钢种", width: 112 },
  { field: "cOutUser", headerName: "出库人", width: 99 },
  { field: "dOutTime", headerName: "出库时间", width: 112 },
  { field: "cInboundNo1", headerName: "入库标识1", width: 125 },
  { field: "cInboundNo2", headerName: "入库标识2", width: 125 },
  { field: "cInboundNo3", headerName: "入库标识3", width: 125 },
  { field: "cInboundNo4", headerName: "入库标识4", width: 125 },
  { field: "cInboundNo5", headerName: "入库标识5", width: 125 },
  { field: "cInboundNo6", headerName: "入库标识6", width: 125 },
  { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 164 },
  { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 151 },
  { field: "nDbc", headerName: "倍尺", width: 86 },
  { field: "lastModifier", headerName: "最后修改人", width: 125 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138 },
  { field: "cIsMatchOrder", headerName: "是否满足订单要求", width: 164 },
  { field: "nTransferNo", headerName: "吊号", width: 86 },
  { field: "cStackNum", headerName: "层号", hide: true },
]);

/* PLAN_* → swagger 契约 pLAN_* */
for (const c of colDefs.value) {
  if (c.field?.startsWith("PLAN_")) c.field = "pLAN_" + c.field.slice(5);
}

function onReady(e: GridReadyEvent) {
  emit("ready", e.api);
  requestAnimationFrame(() => e.api.autoSizeAllColumns());
}
</script>

<template>
  <div class="min-h-0 flex-1 overflow-hidden">
    <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="colDefs"
      :default-col-def="hmxDefaultColDef" :row-data="props.rows" :locale-text="AG_GRID_LOCALE_CN"
      :row-selection="
        props.mode === 'singleRow'
          ? { mode: 'singleRow', checkboxes: true, enableClickSelection: true }
          : { mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }
      "
      :pagination="false" :animate-rows="false" :loading="props.loading"
      @grid-ready="onReady" @selection-changed="emit('selectionChanged')"
      @first-data-rendered="autoSizeOnFirstData" />
  </div>
</template>
