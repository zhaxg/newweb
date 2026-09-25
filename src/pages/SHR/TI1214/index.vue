<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTI1214（超快冷信息）：DDH.Winforms.SHR.Forms.APILogViewer.FrmTI1214
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>([
  { field: "SlabNo", headerName: "坯料号", width: 112 },
  { field: "SteelGrade", headerName: "钢种", width: 112 },
  { field: "Thick", headerName: "厚度", width: 112 },
  { field: "Width", headerName: "宽度", width: 112 },
  { field: "Length", headerName: "长度", width: 112 },
  { field: "CoolMode", headerName: "冷却模式", width: 112 },
  { field: "StartCoolTime", headerName: "开始冷却时间", width: 112 },
  { field: "FinishCoolTime", headerName: "结束冷却时间", width: 112 },
  { field: "RollAveTemp", headerName: "轧后平均温度", width: 112 },
  { field: "RollMaxTemp", headerName: "轧后温度最大值", width: 112 },
  { field: "RollMinTemp", headerName: "轧后温度最小值", width: 112 },
  { field: "EntryAveTemp", headerName: "入炉平均温度", width: 112 },
  { field: "EntryMaxTemp", headerName: "最高入炉温度", width: 112 },
  { field: "EntryMinTemp", headerName: "最低入炉温度", width: 112 },
  { field: "TargetFinishTemp", headerName: "目标终轧温度", width: 112 },
  { field: "FinishAveTemp", headerName: "终轧平均温度", width: 112 },
  { field: "FinishMaxTemp", headerName: "最高终轧温度", width: 112 },
  { field: "FinishMinTemp", headerName: "最低终轧温度", width: 112 },
  { field: "ScanAveTemp", headerName: "扫描高温计平均温度", width: 112 },
  { field: "ScanMaxTemp", headerName: "扫描高温计最大温度", width: 112 },
  { field: "ScanMinTemp", headerName: "扫描高温计最小温度", width: 112 },
  { field: "CoolingRate", headerName: "冷却速率", width: 112 },
  { field: "FluxA", headerName: "熔剂A", width: 112 },
  { field: "FluxB", headerName: "熔剂B", width: 112 },
  { field: "ActFluxA", headerName: "实际熔剂A", width: 112 },
  { field: "ActFluxB", headerName: "实际熔剂B", width: 112 },
  { field: "RatioA", headerName: "配比A", width: 112 },
  { field: "RatioB", headerName: "配比B", width: 112 },
  { field: "ActRatioA", headerName: "实际配比A", width: 112 },
  { field: "ActRatioB", headerName: "实际配比B", width: 112 },
  { field: "Speed", headerName: "速度", width: 112 },
  { field: "ActSpeed", headerName: "实际速度", width: 112 },
  { field: "Aspd", headerName: "喷吹速度", width: 112 },
  { field: "ActAspd", headerName: "实际喷吹速度", width: 112 },
  { field: "Num", headerName: "数量", width: 112 },
  { field: "SideSpary", headerName: "侧喷", width: 112 },
  { field: "MidSpary", headerName: "中喷", width: 112 },
  { field: "HTSIS", headerName: "头尾遮蔽投入信号", width: 112 },
  { field: "HeadUpLength", headerName: "头部上弯长度", width: 112 },
  { field: "HeadBotLength", headerName: "头部下弯长度", width: 112 },
  { field: "HeadUpCoef", headerName: "头部上弯系数", width: 112 },
  { field: "HeadBotCoef", headerName: "头部下弯系数", width: 112 },
  { field: "TailUpLength", headerName: "尾部上弯长度", width: 112 },
  { field: "TailBotLength", headerName: "尾部下弯长度", width: 112 },
  { field: "TailUpCoef", headerName: "尾部上弯系数", width: 112 },
  { field: "TailBotCoef", headerName: "尾部下弯系数", width: 112 },
  { field: "TempWater", headerName: "水温", width: 112 },
  { field: "PressWater", headerName: "压力水", width: 112 },
  { field: "total_flow", headerName: "总水量", width: 112 },
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
