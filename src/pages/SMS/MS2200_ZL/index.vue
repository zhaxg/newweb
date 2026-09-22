<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmMS2200_ZL（2#转炉报表）：DDH.Winforms.SMS.Forms.FrmMS2200_ZL
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs = ref<ColDef[]>(([
      { field: 'CPono', headerName: 'PONO', width: 83 },
      { field: 'Date', headerName: '日期', width: 65 },
      { field: 'GroupCode', headerName: '班组(01:甲；02:乙；03:丙；04:丁)', width: 60 },
      { field: 'ShiftCode', headerName: '班次(0:夜；1:白；2:中)', width: 60 },
      { field: 'CUserIdLuzhang', headerName: '炉长', width: 60 },
      { field: 'CUserIdYicaoshou', headerName: '一操手', width: 69 },
      { field: 'CStoveNo', headerName: '炉号', width: 60 },
      { field: 'CSgCode', headerName: '钢种', width: 60 },
      { field: 'TS_NWgtMz', headerName: '铁水毛重', width: 60 },
      { field: 'TS_NWgtPz', headerName: '铁水皮重', width: 60 },
      { field: 'TS_NWgt', headerName: '铁水净重', width: 63 },
      { field: 'CPotNo', headerName: '罐号', width: 60 },
      { field: 'CTsC', headerName: '最终铁水C', width: 60 },
      { field: 'CTsSi', headerName: '最终铁水Si', width: 60 },
      { field: 'CTsMn', headerName: '最终铁水Mn', width: 60 },
      { field: 'CTsP', headerName: '最终铁水P', width: 60 },
      { field: 'CTsS', headerName: '最终铁水S', width: 60 },
      { field: 'CTsTi', headerName: '最终铁水Ti', width: 60 },
      { field: 'CTsTemp', headerName: '最终铁水温度', width: 60 },
      { field: 'FG_NWgtMz', headerName: '废钢毛重', width: 60 },
      { field: 'FG_NWgtPz', headerName: '废钢皮重', width: 60 },
      { field: 'FG_NWgt', headerName: '废钢净重', width: 60 },
      { field: 'FG_Cycle', headerName: '废钢自循环', width: 60 },
      { field: 'CLXX_Time_O2_Start', headerName: '吹炼信息-时刻-开吹', width: 60 },
      { field: 'CLXX_Time_O2_End', headerName: '吹炼信息-时刻-结束', width: 61 },
      { field: 'CLXX_Time', headerName: '吹炼信息-时刻-供氧时间', width: 73 },
      { field: 'CLXX_Time_O2_Num', headerName: '吹炼信息-时刻-供氧量', width: 68 },
      { field: 'CLXX_Time_BC', headerName: '吹炼信息-时刻-补吹', width: 60 },
      { field: 'CLXX_Time_Out_Beg', headerName: '吹炼信息-时刻-出钢', width: 63 },
      { field: 'FL_Wgt_ShiHuiShi', headerName: '辅料 重量（kg）石灰（Kg)', width: 60 },
      { field: 'FL_Wgt_MeiQiu', headerName: '辅料 重量（kg）镁球', width: 60 },
      { field: 'FL_Wgt_BaiYunShi', headerName: '辅料 重量（kg）白云石', width: 60 },
      { field: 'FL_Wgt_LengYaQiu', headerName: '辅料 重量（kg）冷压球', width: 60 },
      { field: 'FL_Wgt_FanKuang', headerName: '辅料 重量（kg）返矿', width: 60 },
      { field: 'DZL_Wgt_ShiHui', headerName: '顶渣料 石灰', width: 60 },
      { field: 'DZL_Wgt_YingShi', headerName: '顶渣料 萤石', width: 60 },
      { field: 'CEndC', headerName: '终点成份C', width: 60 },
      { field: 'CEndMn', headerName: '终点成份Mn', width: 60 },
      { field: 'CEndP', headerName: '终点成份P', width: 60 },
      { field: 'CEndS', headerName: '终点成份S', width: 60 },
      { field: 'CEndTemp', headerName: '终点温度', width: 60 },
      { field: 'CEndO', headerName: '终点氧', width: 60 },
      { field: 'NSlgSplsTimes', headerName: '溅渣信息 时间', width: 63 },
      { field: 'NN2Consume', headerName: '氮气消耗', width: 63 },
      { field: 'TYHJL_Wgt_ZengTanJi', headerName: '增碳剂', width: 60 },
      { field: 'TYHJL_Wgt_LvTie', headerName: '铝铁', width: 60 },
      { field: 'TYHJL_Wgt_GuiTie', headerName: '硅铁', width: 60 },
      { field: 'TYHJL_Wgt_GuiMeng', headerName: '硅锰', width: 60 },
      { field: 'TYHJL_Wgt_GuiTieQiu', headerName: '硅铁球', width: 60 },
      { field: 'TYHJL_Wgt_DiTanGeTie', headerName: '低碳铬铁', width: 67 },
      { field: 'TYHJL_Wgt_ZhongTanMengTie', headerName: '脱氧合金料 重量（Kg) 中碳锰铁', width: 68 },
      { field: 'TYHJL_Wgt_GaoTanMengTie', headerName: '脱氧合金料 重量（Kg) 高碳锰铁', width: 64 },
      { field: 'TYHJL_Wgt_JinShuMeng', headerName: '脱氧合金料 重量（Kg) 金属锰', width: 60 },
      { field: 'TYHJL_Wgt_FeiTong', headerName: '脱氧合金料 重量（Kg) 废铜', width: 60 },
      { field: 'TYHJL_Al_Len', headerName: '脱氧合金料 重量（Kg) 铝线（m)', width: 60 },
      { field: 'GSCF_Ar_C', headerName: '氩站 成分（%）C', width: 60 },
      { field: 'GSCF_Ar_Si', headerName: '氩站 成分（%）Si', width: 60 },
      { field: 'GSCF_Ar_Mn', headerName: '氩站 成分（%）Mn', width: 60 },
      { field: 'GSCF_Ar_P', headerName: '氩站 成分（%）P', width: 60 },
      { field: 'GSCF_Ar_S', headerName: '氩站 成分（%）S', width: 60 },
      { field: 'GSCF_Ar_Al', headerName: '氩站 成分（%）Al', width: 60 },
      { field: 'GSCF_Ar_Als', headerName: '氩站 成分（%）Als', width: 60 },
      { field: 'CTempOut', headerName: '吹氩出站温度', width: 60 },
      { field: 'CPotAge', headerName: '钢包包况 包号', width: 60 },
      { field: 'CPotState', headerName: '钢包包况 包况', width: 60 },
      { field: 'NHbCount', headerName: '挡渣 滑板寿命', width: 60 },
      { field: 'NGsWgt_MZ', headerName: '钢水 毛重', width: 60 },
      { field: 'NGsWgt_PZ', headerName: '钢水 皮重', width: 60 },
      { field: 'NOutGsWgt', headerName: '钢水 净重', width: 60 },
      { field: 'CBackup', headerName: '备注', width: 120 },
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
