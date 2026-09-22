<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1230（长度实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1230
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CFmAuthorA', headerName: '精轧责任者A', width: 100 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 88 },
      { field: 'CShiftGroup', headerName: '班组', width: 88 },
      { field: 'CBatchNo', headerName: '批号', width: 88 },
      { field: 'CPieceNo', headerName: '头侧件次号', width: 88 },
      { field: 'CSgCode', headerName: '钢种', width: 88 },
      { field: 'NLenSj', headerName: '实际长度', width: 88 },
      { field: 'NThick', headerName: '厚度', width: 88 },
      { field: 'NWidth', headerName: '宽度', width: 88 },
      { field: 'NLen', headerName: '长度', width: 88 },
      { field: 'NLenMin', headerName: '最小长度', width: 88 },
      { field: 'NLenMax', headerName: '最大长度', width: 88 },
      { field: 'CLengthType', headerName: '长度类型', width: 88 },
      { field: 'NPlanLenMin', headerName: '目标长度下限(内控)', width: 88 },
      { field: 'NPlanLenMax', headerName: '目标长度上限(内控)', width: 88 },
      { field: 'NLenTol', headerName: '长度公差', width: 88 },
      { field: 'CTol', headerName: '公差', width: 88 },
      { field: 'DRollingTimeStart', headerName: '轧制开始时间', width: 88 },
      { field: 'DRollingTimeEnd', headerName: '轧制结束时间', width: 88 },
      { field: 'NQuaAll', headerName: '轧制支数', width: 112 },
      { field: 'NQua1', headerName: '支数', width: 112 },
      { field: 'HitRate1', headerName: '命中率', width: 112 },
      { field: 'NQua2', headerName: '支数', width: 112 },
      { field: 'HitRate2', headerName: '命中率', width: 112 },
      { field: 'NQua3', headerName: '支数', width: 112 },
      { field: 'HitRate3', headerName: '命中率', width: 112 },
      { field: 'NQua4', headerName: '支数', width: 112 },
      { field: 'HitRate4', headerName: '命中率', width: 112 },
      { field: 'NQua5', headerName: '支数', width: 112 },
      { field: 'HitRate5', headerName: '命中率', width: 112 },
      { field: 'CDateTime', headerName: '日期', width: 112 },
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
