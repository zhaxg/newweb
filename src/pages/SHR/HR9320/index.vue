<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmHR9320（性能台账）：DDH.Winforms.SHR.Forms.FrmHR9320
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CTestNo', headerName: '委托单号', width: 120 },
      { field: 'CDelivyStatusCode', headerName: '交货状态', width: 120 },
      { field: 'CDeliveryStateDesc', headerName: '交货状态描述', width: 120 },
      { field: 'CStove', headerName: '炉号', width: 120 },
      { field: 'CBatch', headerName: '批号', width: 120 },
      { field: 'CPieceNoSlab', headerName: '板坯号', width: 112 },
      { field: 'CSgSign', headerName: '钢种', width: 120 },
      { field: 'NRollThick', headerName: '轧制厚', width: 112 },
      { field: 'CSgStd', headerName: '钢种标准', width: 120 },
      { field: 'CSpec', headerName: '规格', width: 120 },
      { field: 'CJudgeResult', headerName: '最终判定结果', width: 120 },
      { field: 'JyTime', headerName: '检验时间', width: 120 },
      { field: 'CSampleNo', headerName: '试样号', width: 120 },
      { field: 'CRecheckFlag', headerName: '复验标记', width: 120 },
      { field: 'NTestTimes', headerName: '试验次数', width: 120 },
      { field: 'NYieLdUpStrength', headerName: '上屈服强度', width: 112 },
      { field: 'NYieLdStrength', headerName: '下屈服强度', width: 112 },
      { field: 'NMaxStrength', headerName: '抗拉强度', width: 112 },
      { field: 'NFinalRate', headerName: '断后伸长率', width: 112 },
      { field: 'NFinalShrink', headerName: '断面收缩率', width: 112 },
      { field: 'NFinalShrink1', headerName: '断面收缩率1', width: 112 },
      { field: 'NFinalShrink2', headerName: '断面收缩率2', width: 112 },
      { field: 'NFinalShrink3', headerName: '断面收缩率3', width: 112 },
      { field: 'NFinalShrinkAvg', headerName: '平均断面收缩率', width: 112 },
      { field: 'CBendResult', headerName: '弯曲结果', width: 112 },
      { field: 'CImpact1', headerName: '冲击功1', width: 112 },
      { field: 'CImpact2', headerName: '冲击功2', width: 112 },
      { field: 'CImpact3', headerName: '冲击功3', width: 112 },
      { field: 'CAveImpact', headerName: '平均冲击功', width: 112 },
      { field: 'CDirection', headerName: '试验方向', width: 112 },
      { field: 'CTemperature', headerName: '试验温度', width: 112 },
      { field: 'C', headerName: '碳', width: 112 },
      { field: 'Si', headerName: '硅', width: 112 },
      { field: 'Mn', headerName: '锰', width: 112 },
      { field: 'P', headerName: '磷', width: 112 },
      { field: 'S', headerName: '硫', width: 112 },
      { field: 'Cr', headerName: '铬', width: 112 },
      { field: 'Ni', headerName: '镍', width: 112 },
      { field: 'Cu', headerName: '铜', width: 112 },
      { field: 'Mo', headerName: '钼', width: 112 },
      { field: 'Ti', headerName: '钛', width: 112 },
      { field: 'Al', headerName: '铝', width: 112 },
      { field: 'Pb', headerName: '铅', width: 112 },
      { field: 'Sn', headerName: '锡', width: 112 },
      { field: 'Sb', headerName: '锑', width: 112 },
      { field: 'As', headerName: '砷', width: 112 },
      { field: 'Ca', headerName: '钙', width: 112 },
      { field: 'B', headerName: '硼', width: 112 },
      { field: 'Nb', headerName: '铌', width: 112 },
      { field: 'N', headerName: '氮', width: 112 },
      { field: 'V', headerName: '钒', width: 112 },
      { field: 'Co', headerName: '钴', width: 112 },
      { field: 'Zr', headerName: '锆', width: 112 },
      { field: 'Ta', headerName: '钽', width: 112 },
      { field: 'Ce', headerName: '铈', width: 112 },
      { field: 'La', headerName: '镧', width: 112 },
      { field: 'Se', headerName: '硒', width: 112 },
      { field: 'W', headerName: '钨', width: 112 },
      { field: 'Bi', headerName: '铋', width: 112 },
      { field: 'Te', headerName: '碲', width: 112 },
      { field: 'Cev', headerName: 'Cev', width: 112 },
      { field: 'Ceq', headerName: '碳当量', width: 112 },
      { field: 'Als', headerName: 'ALS', width: 112 },
      { field: 'Alins', headerName: 'ALINS', width: 112 },
      { field: 'CShiftNo', headerName: '结果录入班次', width: 112 },
      { field: 'CGroupNo', headerName: '结果录入班组', width: 112 },
      { field: 'DProTime', headerName: '产出时间', width: 112 },
      { field: 'HtAveTemp1', headerName: '一加热段平均温度', width: 112 },
      { field: 'HtAveTemp2', headerName: '二加热段平均温度', width: 112 },
      { field: 'EqAveTemp', headerName: '均热平均温度', width: 112 },
      { field: 'EqInFurPerd', headerName: '均热在炉时段', width: 112 },
      { field: 'RmEntTempTar', headerName: '粗轧开轧温度目标', width: 112 },
      { field: 'RmEntTempAvg', headerName: '粗轧入轧平均温度', width: 112 },
      { field: 'RmExitTempAvg', headerName: '粗轧出轧平均温度', width: 112 },
      { field: 'FmEntThick', headerName: '精轧入口厚度', width: 112 },
      { field: 'FmEntTempTar', headerName: '精轧开轧温度目标', width: 112 },
      { field: 'FmEntTempAvg', headerName: '精轧入轧平均温度', width: 112 },
      { field: 'FmExitTempTar', headerName: '精轧终轧温度目标', width: 112 },
      { field: 'FmExitTempAvg', headerName: '精轧出轧平均温度', width: 112 },
      { field: 'EntryAveTemp', headerName: '入炉平均温度', width: 112 },
      { field: 'TargetFinishTemp', headerName: '目标终轧温度', width: 112 },
      { field: 'FinishAveTemp', headerName: '终轧平均温度', width: 112 },
      { field: 'NTempXb', headerName: '实测下表返红温度', width: 112 },
      { field: 'ActSpeed', headerName: '实际速度', width: 112 },
      { field: 'ActFluxA', headerName: '实际熔剂A', width: 112 },
      { field: 'ActFluxB', headerName: '实际熔剂B', width: 112 },
      { field: 'ActRatioA', headerName: '实际配比A', width: 112 },
      { field: 'ActRatioB', headerName: '实际配比B', width: 112 },
      { field: 'CoolingRate', headerName: '冷却速率', width: 112 },
      { field: 'ActAspd', headerName: '实际喷吹速度', width: 112 },
      { field: 'Num', headerName: '数量', width: 112 },
      { field: 'TempWater', headerName: '水温', width: 112 },
      { field: 'total_flow', headerName: '总水量', width: 112 },
      { field: 'PressWater', headerName: '压力水', width: 112 },
      { field: 'CProRemark', headerName: '生产备注', width: 112 },
      { field: 'COrderNo', headerName: '订单号', width: 112 },
      { field: 'Tql4000Id', headerName: 'Tql4000Id', width: 112 },
      { field: 'IsAutoUse', headerName: '是否投用自动', width: 112 },
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
