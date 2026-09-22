<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR4900（防瓢曲台账）：DDH.Winforms.SHR.Forms.FrmHR4900
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CBatchNo', headerName: '批号', width: 112 },
      { field: 'CSgCode', headerName: '钢种', width: 112 },
      { field: 'CNoPD', headerName: '不平度', width: 112 },
      { field: 'NDownTemp', headerName: '下线温度', width: 112 },
      { field: 'InFurnaceTime', headerName: '在炉时间', width: 112 },
      { field: 'Ht1AveTemp', headerName: '在加热段1时的平均温度', width: 112 },
      { field: 'Ht1InFurPerd', headerName: '加热段1在炉时段', width: 112 },
      { field: 'Ht2AveTemp', headerName: '在加热段2时的平均温度', width: 112 },
      { field: 'Ht2InFurPerd', headerName: '加热段2在炉时段', width: 112 },
      { field: 'EqAveTemp', headerName: '均热平均温度', width: 112 },
      { field: 'EqInFurPerd', headerName: '均热在炉时段', width: 112 },
      { field: 'NSlabThick', headerName: '坯料厚度', width: 112 },
      { field: 'NThick', headerName: '厚度', width: 112 },
      { field: 'NWidth', headerName: '宽度', width: 112 },
      { field: 'NLen', headerName: '长度', width: 112 },
      { field: 'RmEntTempAvg', headerName: '粗轧入轧平均温度', width: 112 },
      { field: 'FmEntTempAvg', headerName: '精轧入轧平均温度', width: 112 },
      { field: 'FmExitTempAvg', headerName: '精轧出轧平均温度', width: 112 },
      { field: 'EntryTemp', headerName: '入炉温度', width: 112 },
      { field: 'LevelerSpeed', headerName: '矫直速度', width: 112 },
      { field: 'BitSpeed', headerName: '位速度', width: 112 },
      { field: 'EntryGap', headerName: '入口间隙', width: 112 },
      { field: 'ExitGap', headerName: '出口间隙', width: 112 },
      { field: 'L2Force', headerName: '矫直力', width: 112 },
      { field: 'EndTimeRj', headerName: '热矫结束时间', width: 112 },
      { field: 'EntryTempRj', headerName: '热矫钢板温度', width: 112 },
      { field: 'LevelerSpeedRj', headerName: '热矫速度', width: 112 },
      { field: 'BitSpeedRj', headerName: '热矫咬入速度', width: 112 },
      { field: 'EntryGapRj', headerName: '热矫入口辊缝', width: 112 },
      { field: 'ExitGapRj', headerName: '热矫出口辊缝', width: 112 },
      { field: 'L2ForceRj', headerName: '热矫矫直力', width: 112 },
      { field: 'NColdStopTime', headerName: '冷床停留时间', width: 112 },
      { field: 'DHlIn', headerName: '开始时间', width: 112 },
      { field: 'NHlHour', headerName: '计划堆冷时间', width: 112 },
      { field: 'NHlHourSj', headerName: '实际堆冷时间', width: 112 },
      { field: 'NHlHourSy', headerName: '剩余堆冷时间', width: 112 },
      { field: 'DHlOut', headerName: '结束时间', width: 112 },
      { field: 'IsAutoUse', headerName: '是否投用自动', width: 112 },
      { field: 'EntryAveTemp', headerName: '入炉平均温度', width: 112 },
      { field: 'TargetFinishTemp', headerName: '目标终轧温度', width: 112 },
      { field: 'NTempXb', headerName: '实测下表返红温度', width: 112 },
      { field: 'FinishAveTemp', headerName: '终轧平均温度', width: 112 },
      { field: 'CoolingRate', headerName: '冷却速率', width: 112 },
      { field: 'ActFluxB', headerName: '实际熔剂B', width: 112 },
      { field: 'ActRatioB', headerName: '实际配比B', width: 112 },
      { field: 'ActSpeed', headerName: '实际速度', width: 112 },
      { field: 'ActAspd', headerName: '实际喷吹速度', width: 112 },
      { field: 'Num', headerName: '数量', width: 112 },
      { field: 'HTSIS', headerName: '头尾遮蔽投入信号', width: 112 },
      { field: 'HeadUpLength', headerName: '头部上弯长度', width: 112 },
      { field: 'HeadBotLength', headerName: '头部下弯长度', width: 112 },
      { field: 'HeadUpCoef', headerName: '头部上弯系数', width: 112 },
      { field: 'HeadBotCoef', headerName: '头部下弯系数', width: 112 },
      { field: 'TailUpLength', headerName: '尾部上弯长度', width: 112 },
      { field: 'TailBotLength', headerName: '尾部下弯长度', width: 112 },
      { field: 'TailUpCoef', headerName: '尾部上弯系数', width: 112 },
      { field: 'TailBotCoef', headerName: '尾部下弯系数', width: 112 },
      { field: 'TempWater', headerName: '水温', width: 112 },
      { field: 'PressWater', headerName: '压力水', width: 112 },
      { field: 'total_flow', headerName: '总水量', width: 112 },
      { field: "Creator", headerName: "创建人", width: 112 },
      { field: "CreateTime", headerName: "创建时间", width: 112 },
      { field: "LastModifier", headerName: "最后修改人", width: 112 },
      { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },,
]));
function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
</script>

<template>
  <div class="flex h-full flex-col gap-2 p-2">
    <div class="flex flex-wrap items-center gap-3 rounded bg-white p-3 shadow-sm dark:bg-gray-900">

      <Button label="查询" icon="pi pi-search" :loading="querying" @click="onQuery" />
    </div>
        <div class="flex-1 overflow-hidden rounded bg-white shadow-sm dark:bg-gray-900">
      <AgGridVue class="h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        row-selection="multiple" @grid-ready="onGridReady" />
    </div>
  </div>
</template>
