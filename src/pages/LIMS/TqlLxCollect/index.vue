<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTqlLxCollect（力学信息）：DDH.Winforms.LIMS.Forms.FrmTqlLxCollect
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'Selected', headerName: '选择', width: 60 },
      { field: 'NOrder', headerName: '排序', width: 60 },
      { field: 'StoveNo', headerName: '炉号', width: 60 },
      { field: 'TestNo', headerName: '代表样号', width: 60 },
      { field: 'BatchNo', headerName: '组批号', width: 60 },
      { field: 'SlabPieceNo', headerName: '板坯号', width: 60 },
      { field: 'CTestNo', headerName: '委托单号', width: 60 },
      { field: 'CTestItem', headerName: '试验项目号', width: 60 },
      { field: 'CItemTable', headerName: '试验项目表名', width: 60 },
      { field: 'CLength', headerName: '试样长度', width: 74 },
      { field: 'CSampleNo', headerName: '试样号', width: 60 },
      { field: 'CWidth', headerName: '试样宽度', width: 74 },
      { field: 'COperatorName', headerName: '操作员姓名', width: 60 },
      { field: 'CThickness', headerName: '试样厚度', width: 74 },
      { field: 'CNotchDepth', headerName: '缺口深度mm', width: 74 },
      { field: 'NCurOrder', headerName: '当前第几根', width: 60 },
      { field: 'CNotchType', headerName: '缺口类型', width: 74 },
      { field: 'NTestCount', headerName: '当前试验编号下试样个数', width: 60 },
      { field: 'CDirection', headerName: '试验方向', width: 74 },
      { field: 'NMaxLoad', headerName: '最大力', width: 60 },
      { field: 'CEnergy1', headerName: '吸收功1[J]', width: 74 },
      { field: 'NMaxDistort', headerName: '抗拉压折弯强度', width: 60 },
      { field: 'CTemperature', headerName: '试验温度', width: 74 },
      { field: 'NMaxStrength', headerName: '抗拉强度', width: 60 },
      { field: 'CEnergy2', headerName: '吸收功2[J]', width: 74 },
      { field: 'NYieLdUpLoad', headerName: '上屈服力', width: 60 },
      { field: 'CEnergy3', headerName: '吸收功3[J]', width: 74 },
      { field: 'NYieLdUpStrength', headerName: '上屈服强度', width: 60 },
      { field: 'CAveEnergy', headerName: '平均吸收功[J]', width: 74 },
      { field: 'NYieLdLoad', headerName: '屈服力', width: 60 },
      { field: 'NYieLdStrength', headerName: '下屈服强度', width: 60 },
      { field: 'NFpLoad', headerName: '规定非比例延伸力', width: 60 },
      { field: 'NFpStrength', headerName: '规定非比例延伸强度', width: 60 },
      { field: 'NFtLoad', headerName: '规定总延伸力', width: 60 },
      { field: 'NFtStrength', headerName: '规定总延伸强度', width: 60 },
      { field: 'NFinalLength', headerName: '断后标距', width: 60 },
      { field: 'NFinalRate', headerName: '断后伸长率', width: 60 },
      { field: 'NFinalShrink', headerName: '断面收缩率', width: 60 },
      { field: 'NFinalDia', headerName: '断后直径', width: 60 },
      { field: 'NFinalWidth', headerName: '断后宽度', width: 60 },
      { field: 'NFinalThick', headerName: '断后厚度', width: 60 },
      { field: 'NFinalBorder', headerName: '断后边量', width: 60 },
      { field: 'NElasticity', headerName: '弹性模量', width: 60 },
      { field: 'NDuration', headerName: '持续时间', width: 60 },
      { field: 'NMaxSpeed', headerName: '加荷速度峰值', width: 60 },
      { field: 'NTemperature', headerName: '试验温度', width: 60 },
      { field: 'NHumidity', headerName: '试验湿度', width: 60 },
      { field: 'CTestTime', headerName: '试验时间', width: 60 },
      { field: 'NFinalPosition', headerName: '断裂位置', width: 60 },
      { field: 'CFinalState', headerName: '断裂形态', width: 60 },
      { field: 'CBendResult', headerName: '弯曲结果', width: 60 },
      { field: 'NMotherLength', headerName: '母材长度', width: 60 },
      { field: 'NMotherWeight', headerName: '母材重量', width: 60 },
      { field: 'NOrgGaugeLength', headerName: '原始标距', width: 60 },
      { field: 'NExtGaugeLength', headerName: '引伸计标距', width: 60 },
      { field: 'NDia', headerName: '试样直径', width: 60 },
      { field: 'NSpan', headerName: '跨距', width: 60 },
      { field: 'NLength', headerName: '试样长度', width: 60 },
      { field: 'NWidth', headerName: '宽度', width: 60 },
      { field: 'NThickness', headerName: '试样厚度', width: 60 },
      { field: 'NBorder', headerName: '试样边长', width: 60 },
      { field: 'NOutDia', headerName: '试样外径', width: 60 },
      { field: 'NInnerDia', headerName: '试样壁厚', width: 60 },
      { field: 'NArea', headerName: '试样面积', width: 60 },
      { field: 'CEquipCode', headerName: '设备编号', width: 60 },
      { field: 'NMeasureRange', headerName: '试验机量程', width: 60 },
      { field: 'CIdentifier', headerName: '标识', width: 60 },
      { field: 'CCategory', headerName: '类型', width: 60 },
      { field: 'NIsFinished', headerName: '是否完成本组所有试样标记', width: 60 },
      { field: 'CTestId', headerName: '测试编号', width: 60 },
      { field: 'CSaveFileName', headerName: '保存文件名', width: 60 },
      { field: 'CCtrlMode', headerName: '控制模式', width: 60 },
      { field: 'NDistanceBeforeTest', headerName: '测试前距离', width: 60 },
      { field: 'NDistanceAfterTest', headerName: '测试后距离', width: 60 },
      { field: 'NMaxGaugeLength', headerName: '最大量规长度', width: 60 },
      { field: 'NMaxFinalLength', headerName: '最大最终长度', width: 60 },
      { field: 'NWeightLenght1', headerName: '重量长度1', width: 60 },
      { field: 'NWeightLenght2', headerName: '重量长度2', width: 60 },
      { field: 'NWeightLenght3', headerName: '重量长度3', width: 60 },
      { field: 'NWeightLenght4', headerName: '重量长度4', width: 60 },
      { field: 'NWeightLenght5', headerName: '重量长度5', width: 60 },
      { field: 'NTotalWeight', headerName: '总重量', width: 60 },
      { field: 'NDiameter1', headerName: '直径1', width: 60 },
      { field: 'NDiameter2', headerName: '直径2', width: 60 },
      { field: 'NDiameter3', headerName: '直径3', width: 60 },
      { field: 'NDiameter4', headerName: '直径4', width: 60 },
      { field: 'NDiameter5', headerName: '直径5', width: 60 },
      { field: 'CSampleInfo1', headerName: '样本信息1', width: 60 },
      { field: 'CSampleInfo2', headerName: '样本信息2', width: 60 },
      { field: 'CSampleInfo3', headerName: '样本信息3', width: 60 },
      { field: 'CSampleInfo4', headerName: '样本信息4', width: 60 },
      { field: 'CSampleInfo5', headerName: '样本信息5', width: 60 },
      { field: 'CSampleInfo6', headerName: '样本信息6', width: 60 },
      { field: 'CSampleInfo7', headerName: '样本信息7', width: 60 },
      { field: 'CSampleInfo8', headerName: '样本信息8', width: 60 },
      { field: 'CSampleInfo9', headerName: '样本信息9', width: 60 },
      { field: 'CSampleInfo10', headerName: '样本信息10', width: 60 },
      { field: 'CCurvePicture', headerName: '曲线图', width: 60 },
      { field: 'CSendDevice', headerName: '发送设备', width: 74 },
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
