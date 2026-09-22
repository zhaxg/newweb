<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1000（拒收实绩明细）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'PassNo', headerName: '轧制道次', width: 112 },
      { field: 'SlabNo', headerName: '坯料号', width: 112 },
      { field: 'Temp', headerName: '测量温度', width: 112 },
      { field: 'ZpNo', headerName: '组批号', width: 112 },
      { field: 'TempCal', headerName: '计算温度', width: 112 },
      { field: 'RejectType', headerName: '拒收类型', width: 112 },
      { field: 'ThickCal', headerName: '计算厚度', width: 112 },
      { field: 'RejectPosition', headerName: '拒收位置', width: 112 },
      { field: 'Spray', headerName: '除鳞应用', width: 112 },
      { field: 'PlanNo', headerName: '计划号', width: 112 },
      { field: 'TurnFlag', headerName: '转钢标记', width: 112 },
      { field: 'CardNo', headerName: '牌号', width: 112 },
      { field: 'ForceCal', headerName: '预算轧制力', width: 112 },
      { field: 'RejectReason', headerName: '拒收原因', width: 112 },
      { field: 'ForceAct', headerName: '实际轧制力', width: 112 },
      { field: 'FurCode', headerName: '加热炉号', width: 112 },
      { field: 'TorqueCal', headerName: '预算扭矩', width: 112 },
      { field: 'ShiftGroup', headerName: '班次组', width: 112 },
      { field: 'TorqueAct', headerName: '实际扭矩', width: 112 },
      { field: 'ShiftNo', headerName: '班次号', width: 112 },
      { field: 'BendForceCal', headerName: '预算弯辊力', width: 112 },
      { field: 'Thick', headerName: '厚度', width: 112 },
      { field: 'BendForceAct', headerName: '实际弯辊力', width: 112 },
      { field: 'Width', headerName: '宽度', width: 112 },
      { field: 'ThreadSpeed', headerName: '咬钢速度', width: 112 },
      { field: 'Len', headerName: '长', width: 112 },
      { field: 'RunSpeed', headerName: '轧制速度', width: 112 },
      { field: 'Wgt', headerName: '吨位', width: 112 },
      { field: 'EntryTemp', headerName: '入炉温度', width: 112 },
      { field: 'OrderThick', headerName: '合同厚度', width: 112 },
      { field: 'OutSpeed', headerName: '出口速度', width: 112 },
      { field: 'OrderWidth', headerName: '合同宽度', width: 112 },
      { field: 'TempCalEn', headerName: '入口计算温度', width: 112 },
      { field: 'OrderLen', headerName: '合同长度', width: 112 },
      { field: 'WidthEn', headerName: '入口宽度', width: 112 },
      { field: 'OrderWgt', headerName: '订单重量', width: 112 },
      { field: 'WidthEx', headerName: '出口宽度', width: 112 },
      { field: 'LengthEx', headerName: '出口长度', width: 112 },
      { field: 'Author', headerName: '作者', width: 112 },
      { field: 'RollTimeStart', headerName: '咬钢时间', width: 112 },
      { field: 'RollTimeStop', headerName: '轧制时刻', width: 112 },
      { field: 'FalgN', headerName: 'FALG_N', width: 112 },
      { field: 'FalgC', headerName: 'FALG_C', width: 112 },
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
