<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1260（ACC温度实绩）：DDH.Winforms.SHR.Forms.InterInfoQuery.FrmTI1260
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>([
  { field: "CFastcoldShiftNo", headerName: "超快冷班次", width: 112 },
  { field: "CFastcoldShiftGroup", headerName: "超快冷班组", width: 112 },
  { field: "CBatchNo", headerName: "批号", width: 112 },
  { field: "CPieceNo", headerName: "头侧件次号", width: 112 },
  { field: "CSgCode", headerName: "钢种", width: 112 },
  { field: "NThick", headerName: "厚度", width: 112 },
  { field: "NWidth", headerName: "宽度", width: 112 },
  { field: "NLen", headerName: "长度", width: 112 },
  { field: "NPlanStcoldTemp", headerName: "目标开冷温度", width: 112 },
  { field: "NStcoldTemp", headerName: "实际开冷温度", width: 112 },
  { field: "NStcoldTempTol", headerName: "开冷温度公差", width: 112 },
  { field: "NPlanendColdTemp", headerName: "目标终冷温度", width: 112 },
  { field: "NEndcoldTemp", headerName: "实际终冷温度", width: 112 },
  { field: "NEndcoldTempTol", headerName: "终冷温度公差", width: 112 },
  { field: "CTol", headerName: "公差", width: 112 },
  { field: "DFastcoldStart", headerName: "开冷时间", width: 112 },
  { field: "DFastcoldEnd", headerName: "终冷时间", width: 112 },
  { field: "CShiftGroup", headerName: "班组", width: 112 },
  { field: "NQuaAll", headerName: "轧制支数", width: 112 },
  { field: "NStartColdQua1", headerName: "支数", width: 112 },
  { field: "StartColdHitRate1", headerName: "命中率", width: 112 },
  { field: "NStartColdQua2", headerName: "支数", width: 112 },
  { field: "StartColdHitRate2", headerName: "命中率", width: 112 },
  { field: "NStartColdQua3", headerName: "支数", width: 112 },
  { field: "StartColdHitRate3", headerName: "命中率", width: 94 },
  { field: "NStartColdQua4", headerName: "支数", width: 112 },
  { field: "StartColdHitRate4", headerName: "命中率", width: 112 },
  { field: "NEndColdQua1", headerName: "支数", width: 112 },
  { field: "EndColdHitRate1", headerName: "命中率", width: 112 },
  { field: "NEndColdQua2", headerName: "支数", width: 112 },
  { field: "EndColdHitRate2", headerName: "命中率", width: 112 },
  { field: "NEndColdQua3", headerName: "支数", width: 112 },
  { field: "EndColdHitRate3", headerName: "命中率", width: 112 },
  { field: "NEndColdQua4", headerName: "支数", width: 112 },
  { field: "EndColdHitRate4", headerName: "命中率", width: 112 },
  { field: "NEndColdQua5", headerName: "支数", width: 112 },
  { field: "EndColdHitRate5", headerName: "命中率", width: 112 },
  { field: "DColdStartTime", headerName: "开冷时间", width: 112 },
  { field: "DColdEndTime", headerName: "终冷时间", width: 112 },
  { field: "CDateTime", headerName: "日期", width: 112 },
  { field: "DDayDate", headerName: "日期", width: 112 },
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
