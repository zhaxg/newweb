<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9030（加热实绩）：DDH.Winforms.SHR.Forms.FrmHR9030
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CBatchOrder', headerName: '组批号', width: 150 },
      { field: 'MatNo', headerName: '材料号', width: 150 },
      { field: 'NThick', headerName: '厚度', width: 150 },
      { field: 'NWidth', headerName: '宽度', width: 150 },
      { field: 'NLen', headerName: '长度', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'Spare6', headerName: '备用6', width: 150 },
      { field: 'Spare5', headerName: '备用5', width: 150 },
      { field: 'Spare4', headerName: '备用4', width: 150 },
      { field: 'Spare3', headerName: '备用3', width: 150 },
      { field: 'NThickPlan', headerName: '轧制厚度', width: 150 },
      { field: 'NWidthPlan', headerName: '轧制宽度', width: 150 },
      { field: 'NLenPlan', headerName: '计划长度', width: 150 },
      { field: 'COrderCustCname', headerName: '订货客户', width: 150 },
      { field: 'CConRemark', headerName: '合同备注', width: 150 },
      { field: 'CIsGcd', headerName: '是否过称', width: 150 },
      { field: 'CSgStdPlan', headerName: '订单标准', width: 150 },
      { field: 'CSgCodePlan', headerName: '订单钢种', width: 150 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 150 },
      { field: 'CProRemark', headerName: '生产备注', width: 150 },
      { field: 'SlabFurTime', headerName: '板坯装炉时刻', width: 150 },
      { field: 'SlabFurBefTemp', headerName: '入炉前温度', width: 150 },
      { field: 'FurNo', headerName: '炉号', width: 150 },
      { field: 'FurType', headerName: '加热炉类型', width: 150 },
      { field: 'NFurType', headerName: '装炉方式', width: 150 },
      { field: 'InFurnaceShiftNo', headerName: '入炉班次', width: 150 },
      { field: 'InFurnaceShiftGroup', headerName: '入炉班组', width: 150 },
      { field: 'OutFurnaceShiftNo', headerName: '出炉班次', width: 150 },
      { field: 'OutFurnaceShiftGroup', headerName: '出炉班组', width: 150 },
      { field: 'TapSlabTempAve', headerName: '出钢时板坯平均温度', width: 150 },
      { field: 'TapSlabTempSrfc', headerName: '出钢时板坯表面温度', width: 150 },
      { field: 'TapSlabTempCt', headerName: '出钢时板坯中心温度', width: 150 },
      { field: 'OutTime', headerName: '抽出时刻', width: 150 },
      { field: 'OutTempAvg', headerName: '抽出平均温度', width: 150 },
      { field: 'InFurnaceTime', headerName: '在炉时间', width: 150 },
      { field: 'Ht1SlabTempAve', headerName: '加热段1入口板坯平均温度', width: 150 },
      { field: 'Ht1SlabHotAve', headerName: '加热段1入口板坯均热度', width: 150 },
      { field: 'Ht1SlabTempSrfc', headerName: '加热段1入口板坯表面温度', width: 150 },
      { field: 'Ht1SlabTempCt', headerName: '加热段1入口板坯中心温度', width: 150 },
      { field: 'Ht1AveTemp', headerName: '在加热段1时的平均温度', width: 150 },
      { field: 'Ht1InFurPerd', headerName: '加热段1在炉时段', width: 150 },
      { field: 'Ht2SlabTempAve', headerName: '加热段2入口板坯平均温度', width: 150 },
      { field: 'Ht2SlabHotAve', headerName: '加热段2入口板坯均热度', width: 150 },
      { field: 'Ht2SlabTempSrfc', headerName: '加热段2入口板坯表面温度', width: 150 },
      { field: 'Ht2SlabTempCt', headerName: '加热段2入口板坯中心温度', width: 150 },
      { field: 'Ht2AveTemp', headerName: '在加热段2时的平均温度', width: 150 },
      { field: 'Ht2InFurPerd', headerName: '加热段2在炉时段', width: 150 },
      { field: 'EqSlabTempAve', headerName: '均热段入口板坯平均温度', width: 150 },
      { field: 'EqSlabHotAve', headerName: '均热段入口板坯均热度', width: 150 },
      { field: 'EqSlabTempSrfc', headerName: '均热段入口板坯表面温度', width: 150 },
      { field: 'EqSlabTempCt', headerName: '均热段入口板坯中心温度', width: 150 },
      { field: 'EqAveTemp', headerName: '均热平均温度', width: 150 },
      { field: 'EqInFurPerd', headerName: '均热在炉时段', width: 150 },
      { field: 'COrderNo1', headerName: '订单号1', width: 150 },
      { field: 'COrderNo2', headerName: '订单号2', width: 150 },
      { field: 'COrderNo3', headerName: '订单号3', width: 150 },
      { field: 'COrderNo4', headerName: '订单号4', width: 150 },
      { field: 'CInboundNo1', headerName: '入库标识1', width: 150 },
      { field: 'CInboundNo2', headerName: '入库标识2', width: 150 },
      { field: 'CInboundNo3', headerName: '入库标识3', width: 150 },
      { field: 'CInboundNo4', headerName: '入库标识4', width: 150 },
      { field: 'NLenTq1', headerName: '套切1', width: 150 },
      { field: 'NLenTq2', headerName: '套切2', width: 150 },
      { field: 'NLenTq3', headerName: '套切3', width: 150 },
      { field: 'NLenTq4', headerName: '套切4', width: 150 },
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
