<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS9000（二炼钢铸坯实绩查询）：DDH.Winforms.SMS.Forms.FrmMS9000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 120 },
      { field: 'CSgCode', headerName: '钢种', width: 120 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'NCalWgt', headerName: '理重', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 120 },
      { field: 'CPrintCode', headerName: '喷号', width: 120 },
      { field: 'CLineCode', headerName: '产线', width: 120 },
      { field: 'CMachine', headerName: '机台', width: 120 },
      { field: 'CStrandNo', headerName: '流号', width: 120 },
      { field: 'DProTime', headerName: '产出时间', width: 120 },
      { field: 'CBilletTypeCode', headerName: '铸坯标识', width: 120 },
      { field: 'NThick', headerName: '厚度', width: 120 },
      { field: 'NWth', headerName: '宽度', width: 120 },
      { field: 'NLen', headerName: '长度', width: 120 },
      { field: 'NNum', headerName: '件数', width: 120 },
      { field: 'CPlanId', headerName: '计划ID', width: 120 },
      { field: 'COrderNo', headerName: '订单号', width: 120 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 120 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 120 },
      { field: 'CConfirmStatus', headerName: '确认判定状态', width: 120 },
      { field: 'CIsHot', headerName: '是否热送', width: 120 },
      { field: 'CMsc', headerName: '冶金规范码', width: 120 },
      { field: 'CMscLine', headerName: '冶金规范产线', width: 120 },
      { field: 'CStNo', headerName: '炉号', width: 120 },
      { field: 'CSteelType', headerName: '品名', width: 120 },
      { field: 'CProRemark', headerName: '生产备注', width: 120 },
      { field: 'CSurfaceResult', headerName: '表检结果', width: 120 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 120 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 120 },
      { field: 'CSurfaceRemark', headerName: '缺陷描述', width: 120 },
      { field: 'CSurfaceAdvice', headerName: '表检处置意见', width: 120 },
      { field: 'DConfirmTime', headerName: '成分确认时间', width: 120 },
      { field: 'CConfirmUser', headerName: '成分确认人', width: 120 },
      { field: 'CDestination', headerName: '去向', width: 120 },
      { field: 'CSampleLotNo', headerName: '样批号', width: 120 },
      { field: 'NCastDivCode', headerName: '模连铸标识', width: 120 },
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
