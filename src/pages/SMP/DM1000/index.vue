<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmDM1000（轴承/轴承箱管理）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1000
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>([
  { field: "CBearNo", headerName: "轴承号", width: 200 },
  { field: "CBearBoxNo", headerName: "轴承箱号", width: 200 },
  { field: "CFourBearNo", headerName: "四列轴承号", width: 184 },
  { field: "CTwoBearNo", headerName: "双列轴承号", width: 184 },
  { field: "CAssembler", headerName: "装配人", width: 200 },
  { field: "CConeBearNo", headerName: "锥套轴承号", width: 184 },
  { field: "DAssemblyTime", headerName: "装配时间", width: 200 },
  { field: "CBushBearNo", headerName: "衬套轴承号", width: 184 },
  { field: "NBearType", headerName: "轴承类型", width: 200 },
  { field: "CFactory", headerName: "厂家", width: 200 },
  { field: "CRemark", headerName: "备注", width: 200 },
  { field: "NOnMachineNum", headerName: "上机次数", width: 200 },
  { field: "NAssemblyFlag", headerName: "是否装配轴承", width: 200 },
  { field: "NRunTime", headerName: "本次运行时间min", width: 200 },
  { field: "NBearSeatType", headerName: "轴承座类型", width: 165 },
  { field: "NRollWgt", headerName: "轧制板重t", width: 200 },
  { field: "NRollLen", headerName: "轧制长mm", width: 200 },
  { field: "NAllRunTime", headerName: "累计运行时间", width: 200 },
  { field: "NAllRollWgt", headerName: "累计轧制重量", width: 200 },
  { field: "NAllRollLen", headerName: "累计轧制长度", width: 200 },
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
