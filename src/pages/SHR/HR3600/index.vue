<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR3600（堆冷作业）：DDH.Winforms.SHR.Forms.FrmHR3600
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>([
  { field: "COrderNo", headerName: "订单号", width: 149 },
  { field: "CBatchOrder", headerName: "组批号", width: 149 },
  { field: "CHlStack", headerName: "堆冷垛位", width: 149 },
  { field: "CPieceNo", headerName: "头侧件次号", width: 149 },
  { field: "CHlStackNum", headerName: "堆冷层", width: 149 },
  { field: "CPieceNoSlab", headerName: "板坯号", width: 149 },
  { field: "CSgCode", headerName: "钢种", width: 149 },
  { field: "COrderNo1", headerName: "订单号1", width: 150 },
  { field: "NKSgCode", headerName: "国标钢种", width: 149 },
  { field: "COrderNo2", headerName: "订单号2", width: 150 },
  { field: "COrderNo3", headerName: "订单号3", width: 150 },
  { field: "NThick", headerName: "厚度", width: 149 },
  { field: "COrderNo4", headerName: "订单号4", width: 150 },
  { field: "NWth", headerName: "宽度", width: 149 },
  { field: "NThickOrder", headerName: "订单厚度", width: 150 },
  { field: "NLen", headerName: "长度", width: 149 },
  { field: "CInboundNo1", headerName: "入库标识1", width: 150 },
  { field: "NWgt", headerName: "重量", width: 149 },
  { field: "CInboundNo2", headerName: "入库标识2", width: 150 },
  { field: "DProTime", headerName: "产出时间", width: 149 },
  { field: "CInboundNo3", headerName: "入库标识3", width: 150 },
  { field: "CProUser", headerName: "产出人", width: 149 },
  { field: "CInboundNo4", headerName: "入库标识4", width: 150 },
  { field: "CShiftNo", headerName: "结果录入班次", width: 149 },
  { field: "CGroupNo", headerName: "结果录入班组", width: 149 },
  { field: "CStove", headerName: "炉号", width: 149 },
  { field: "CStackNo", headerName: "垛位号", width: 149 },
  { field: "CIsQy", headerName: "原取样板标记", width: 151 },
  { field: "CStackNum", headerName: "层号", width: 149 },
  { field: "CCutFlag", headerName: "切边方式", width: 149 },
  { field: "CCusName", headerName: "客户名称", width: 149 },
  { field: "CSgStd", headerName: "钢种标准", width: 149 },
  { field: "PLAN_CSpec", headerName: "剪切计划规格", width: 149 },
  { field: "CSpec", headerName: "规格", width: 149 },
  { field: "COrderCustCname", headerName: "订货客户", width: 149 },
  { field: "CSpecPlan", headerName: "轧制规格", width: 150 },
  { field: "PLAN_COrderNo1", headerName: "订单号1", width: 149 },
  { field: "PLAN_COrderNo2", headerName: "订单号2", width: 149 },
  { field: "NWidth", headerName: "宽度", width: 149 },
  { field: "PLAN_COrderNo3", headerName: "订单号3", width: 149 },
  { field: "PLAN_COrderNo4", headerName: "订单号4", width: 149 },
  { field: "NNum", headerName: "件数", width: 149 },
  { field: "PLAN_COrderNo5", headerName: "订单号5", width: 149 },
  { field: "PLAN_COrderNo6", headerName: "订单号6", width: 149 },
  { field: "NHlStatus", headerName: "缓冷状态", width: 149 },
  { field: "PLAN_NLenPlan1", headerName: "套切长度1", width: 149 },
  { field: "NWdIn", headerName: "开始温度", width: 149 },
  { field: "PLAN_NLenPlan2", headerName: "套切长度2", width: 149 },
  { field: "CHlShiftIn", headerName: "开始班次", width: 149 },
  { field: "PLAN_NLenPlan3", headerName: "套切长度3", width: 149 },
  { field: "CHlGroupIn", headerName: "开始班组", width: 149 },
  { field: "PLAN_NLenPlan4", headerName: "套切长度4", width: 149 },
  { field: "DLcIn", headerName: "上冷床时间", width: 150 },
  { field: "PLAN_NLenPlan5", headerName: "套切长度5", width: 149 },
  { field: "NLcWd", headerName: "上冷床温度", width: 150 },
  { field: "PLAN_NLenPlan6", headerName: "套切长度6", width: 149 },
  { field: "NLc", headerName: "冷床冷却时长", width: 150 },
  { field: "NDbc", headerName: "单重", width: 149 },
  { field: "DHlIn", headerName: "开始时间", width: 149 },
  { field: "CInboundNo", headerName: "入库单号", width: 149 },
  { field: "CHlUserIn", headerName: "开始人", width: 149 },
  { field: "NHlHour", headerName: "计划堆冷时间", width: 149 },
  { field: "NHlHourSj", headerName: "实际堆冷时间", width: 149 },
  { field: "NHlHourSy", headerName: "剩余堆冷时间", width: 149 },
  { field: "NWdOut", headerName: "结束温度", width: 149 },
  { field: "CHlShiftOut", headerName: "结束班次", width: 149 },
  { field: "CHlGroupOut", headerName: "结束班组", width: 149 },
  { field: "DHlOut", headerName: "结束时间", width: 149 },
  { field: "CHlUserOut", headerName: "结束人", width: 149 },
  { field: "NLenPlan1", headerName: "套切长度1", width: 150 },
  { field: "NLenPlan2", headerName: "套切长度2", width: 150 },
  { field: "NLenPlan3", headerName: "套切长度3", width: 150 },
  { field: "NLenPlan4", headerName: "套切长度4", width: 150 },
  { field: "NWidthPlan1", headerName: "套切宽度1", width: 150 },
  { field: "NWidthPlan2", headerName: "套切宽度2", width: 150 },
  { field: "NWidthPlan3", headerName: "套切宽度3", width: 150 },
  { field: "NWidthPlan4", headerName: "套切宽度4", width: 150 },
  { field: "CExitem1", headerName: "是否工程单", width: 150 },
  { field: "CTrimFlag", headerName: "切边方式", width: 150 },
  { field: "CDestination", headerName: "去向", width: 150 },
  { field: "CStoreCode", headerName: "库区号", width: 150 },
  { field: "Creator", headerName: "创建人", width: 112 },
  { field: "CreateTime", headerName: "创建时间", width: 112 },
  { field: "LastModifier", headerName: "最后修改人", width: 112 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery"
        ><IconSearch class="h-3.5 w-3.5" />查询</Button
      >
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        row-selection="multiple"
        @grid-ready="onGridReady"
      />
    </div>
  </div>
</template>
