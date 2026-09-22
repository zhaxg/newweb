<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9140（装炉实绩(不分炉)）：DDH.Winforms.SHR.Forms.FrmHR9140
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'NOrderSj', headerName: '实际生产顺序', width: 149 },
      { field: 'CCustName', headerName: '客户名称', width: 149 },
      { field: 'CConRemark', headerName: '合同备注', width: 149 },
      { field: 'CIsGcd', headerName: '是否过称', width: 149 },
      { field: 'CCool', headerName: '冷却', width: 100 },
      { field: 'NFurType', headerName: '装炉方式', width: 149 },
      { field: 'SlabFurBefTemp', headerName: '入炉前温度', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 149 },
      { field: 'FurNo', headerName: '炉号', width: 149 },
      { field: 'RowNo', headerName: '行号', width: 149 },
      { field: 'ZPNo', headerName: '组批号', width: 149 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 149 },
      { field: 'NThick', headerName: '厚度', width: 149 },
      { field: 'NWth', headerName: '宽度', width: 149 },
      { field: 'NLen', headerName: '长度', width: 149 },
      { field: 'Spare6', headerName: '备用6', width: 149 },
      { field: 'Spare5', headerName: '备用5', width: 149 },
      { field: 'Spare4', headerName: '备用4', width: 149 },
      { field: 'NLenDiff', headerName: '长度差', width: 149 },
      { field: 'CSgCode', headerName: '钢种', width: 149 },
      { field: 'CSgCodePlan', headerName: '订单钢种', width: 149 },
      { field: 'PLAN_NThickPlan', headerName: '轧制厚', width: 149 },
      { field: 'PLAN_NWidthPlan', headerName: '轧制宽', width: 149 },
      { field: 'PLAN_NLlCleanLen', headerName: '轧制长', width: 149 },
      { field: 'NCalWgt', headerName: '理重', width: 149 },
      { field: 'Spare3', headerName: '备用3', width: 149 },
      { field: 'NwgtDiff', headerName: '重量差', width: 100 },
      { field: 'CDn', headerName: '需要堆冷', width: 149 },
      { field: 'CCutFlag', headerName: '切边方式', width: 149 },
      { field: 'PLAN_CSpec', headerName: '剪切计划规格', width: 149 },
      { field: 'NBoarCleanLen', headerName: '板清洁长度', width: 149 },
      { field: 'CTol', headerName: '公差', width: 149 },
      { field: 'NThickMin', headerName: '最小厚度', width: 149 },
      { field: 'NThickMax', headerName: '最大厚度', width: 149 },
      { field: 'CSpecialMarkGy', headerName: '特殊标记工艺', width: 149 },
      { field: 'CDelivyAddress', headerName: '交货地址', width: 149 },
      { field: 'PLAN_COrderNo1', headerName: '订单号1', width: 149 },
      { field: 'PLAN_COrderNo2', headerName: '订单号2', width: 149 },
      { field: 'PLAN_COrderNo3', headerName: '订单号3', width: 149 },
      { field: 'PLAN_COrderNo4', headerName: '订单号4', width: 149 },
      { field: 'PLAN_NLenPlan1', headerName: '套切长度1', width: 149 },
      { field: 'PLAN_NLenPlan2', headerName: '套切长度2', width: 149 },
      { field: 'PLAN_NLenPlan3', headerName: '套切长度3', width: 149 },
      { field: 'PLAN_NLenPlan4', headerName: '套切长度4', width: 149 },
      { field: 'NDbc', headerName: '单重', width: 149 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 149 },
      { field: 'CProRemark', headerName: '生产备注', width: 149 },
      { field: 'CInboundNo1', headerName: '入库标识1', width: 100 },
      { field: 'CInboundNo2', headerName: '入库标识2', width: 100 },
      { field: 'CInboundNo3', headerName: '入库标识3', width: 100 },
      { field: 'CInboundNo4', headerName: '入库标识4', width: 100 },
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
