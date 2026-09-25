<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmQL3910（取样实绩）：DDH.Winforms.LIMS.Forms.FrmQL3910
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>([
  { field: "CSameTestNo", headerName: "原代表样编号", width: 120 },
  { field: "CZpNo", headerName: "组批号", width: 120 },
  { field: "CStove", headerName: "炉号", width: 120 },
  { field: "CPieceNo", headerName: "头侧件次号", width: 120 },
  { field: "CQyPlateSJ", headerName: "取样实绩板", width: 120 },
  { field: "Time", headerName: "发送时刻", width: 120 },
  { field: "SampleLth", headerName: "取样长度", width: 120 },
  { field: "CSgSign", headerName: "钢种", width: 120 },
  { field: "CSgStd", headerName: "钢种标准", width: 120 },
  { field: "DSendTime", headerName: "发送时间", width: 120 },
  { field: "CSendUser", headerName: "发送人", width: 120 },
  { field: "CSendStatus", headerName: "送样状态", width: 120 },
  { field: "CZpType", headerName: "组批分类", width: 120 },
  { field: "COrderNo", headerName: "订单号", width: 120 },
  { field: "NThick", headerName: "厚度", width: 120 },
  { field: "NWth", headerName: "宽度", width: 120 },
  { field: "NLen", headerName: "长度", width: 120 },
  { field: "CDelivyStatusCode", headerName: "交货状态", width: 120 },
  { field: "CCustStdCode", headerName: "客户标准", width: 120 },
  { field: "CSpecialDesc", headerName: "特殊要求", width: 120 },
  { field: "CBatchNo", headerName: "批号", width: 120 },
  { field: "NOrder", headerName: "排序", width: 120 },
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
      <Button text class="shrink-0 whitespace-nowrap" @click="onBtn0"><IconSend class="h-3 w-3" />发送检验委托</Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onBtn1"
        ><IconSend class="h-3 w-3" />取消发送</Button
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
