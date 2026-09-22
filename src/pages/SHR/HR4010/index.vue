<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4010（遗留台账登记）：DDH.Winforms.SHR.Forms.FrmHR4010
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CDate', headerName: '日期', width: 150 },
      { field: 'CReason', headerName: '强制原因', width: 150 },
      { field: 'CGroup', headerName: '班组', width: 150 },
      { field: 'CYcRemark', headerName: '备注说明', width: 150 },
      { field: 'NQuaNotIn', headerName: 'NQuaNotIn', width: 150 },
      { field: 'NQuaJz', headerName: '精整中块数', width: 150 },
      { field: 'CStoreCode', headerName: '库区号', width: 150 },
      { field: 'CStackNo', headerName: '垛位号', width: 150 },
      { field: 'CStackNum', headerName: '层号', width: 150 },
      { field: 'CSlCode', headerName: '剪切线代码', width: 150 },
      { field: 'COrderNo', headerName: '订单号', width: 150 },
      { field: 'CBatchNo', headerName: '批号', width: 150 },
      { field: 'CStove', headerName: '炉号', width: 150 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 150 },
      { field: 'CIsGcd', headerName: '是否过称', width: 150 },
      { field: 'CIsCc', headerName: '是否超长', width: 150 },
      { field: 'CIsDc', headerName: '是否短尺', width: 150 },
      { field: 'CSgCode', headerName: '钢种', width: 150 },
      { field: 'CSgStd', headerName: '钢种标准', width: 150 },
      { field: 'CSpec', headerName: '规格', width: 150 },
      { field: 'CTrimFlag', headerName: '切边方式', width: 150 },
      { field: 'CInboundNo', headerName: '入库单号', width: 150 },
      { field: 'NWgt', headerName: '重量', width: 150 },
      { field: 'CJqGroup', headerName: '剪切班组', width: 150 },
      { field: 'CJqShift', headerName: '剪切班次', width: 150 },
      { field: 'CJqUser', headerName: '剪切人', width: 150 },
      { field: 'DJq', headerName: '剪切时间', width: 150 },
      { field: 'CRemark', headerName: '备注', width: 150 },
      { field: 'NSurfaceResult', headerName: '表检结果', width: 150 },
      { field: 'DSurfaceTime', headerName: '表面判定时间', width: 150 },
      { field: 'CSurfaceUser', headerName: '表面判定人', width: 150 },
      { field: 'CSurfaceRemark', headerName: '缺陷描述', width: 150 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 150 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 150 },
      { field: 'CSurfaceCategory', headerName: '判定分类', width: 150 },
      { field: 'CSurfaceDefectCode', headerName: '表面缺陷代码', width: 150 },
      { field: 'CSurfaceDefectPosition', headerName: '表面缺陷位置', width: 150 },
      { field: 'NSurfaceLen', headerName: '尺寸长', width: 150 },
      { field: 'NSurfaceThick1', headerName: '尺寸厚1', width: 150 },
      { field: 'NSurfaceThick2', headerName: '尺寸厚2', width: 150 },
      { field: 'NSurfaceThick3', headerName: '尺寸厚3', width: 150 },
      { field: 'NSurfaceWidth', headerName: '尺寸宽', width: 150 },
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
