<script setup lang="ts">
/** 对应 FrmMS2200_ZL（转炉台账报表，5 菜单共用 cQueryString={LineCode,MachineCode} 注入单产线单机台）：DDH.Winforms.SMS.Forms.FrmMS2200_ZL
 *  已接入：crudAppService.SaveList("FrmMS2200_ZLViewDto")（btnSave_Click：bsc.GetTrackingList→ToSaveChangesData→保存，
 *         行内编辑 TrackableList；保存按钮与网格可编辑门控 = 查询后任一行 IsEnableEditAndSaveDatas，原 btnSave.Visible=check）
 *  待接入：② 炉长/一操手列下拉候选——原 OperateViewModel.BandColnum → frmMS2100_X_ShiftInfo/getProcUserInfo 未生成，
 *             暂文本编辑；选中回写 CUserNameLuzhang/CUserNameYicaoshou 待候选接入后补
 *  提取器所列二级弹窗 FrmMS2200_X_QueryString_Dto 实为菜单注入参数结构（.cs 无 ShowDialog），不设弹窗
 *  结构：stackPanel1（产线|机台|日期|炉次号|查询|保存）+ bandedGridView1 单表；产线/机台=qs 注入单值只读
 *       （原 UCLine/UCMachine ShowLines/ShowMachines 仅单值）；deDate_EditValueChanged（加载完成后）自动重查
 *  列集：extract 待确认 70 可见 + 6 隐藏（hide:true，含 IsEnableEditAndSaveDatas 等）；班次/班组列 agSelect 下拉（0-2 / 01-04 照列头文案）
 *  字段桥接：后端 JSON camelCase（首字母小写），回填 toPascal 首字母还原以匹配 extract 的 Pascal 列 */
import { onMounted, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { crudAppService } from "@/api/common/crudAppService";
import { TrackableList } from "@/api/common/trackableList";
import { frmMS2200ZLApi } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { raw: menuQs, json: menuJson } = useMenuQuery();
const qsFormat = JSON.stringify({ LineCode: null, MachineCode: null });

const theme = makeHmxGridTheme();
const gridApi = ref<GridApi | null>(null);
const querying = ref(false);
const saving = ref(false);
const canEdit = ref(false);
const loaded = ref(false);

const lineCode = ref(String((menuJson as { LineCode?: string }).LineCode ?? ""));
const machineCode = ref(String((menuJson as { MachineCode?: string }).MachineCode ?? ""));
const deDate = ref<Date>(new Date());
const stoveNo = ref("");

// 行内编辑数据源：TrackableList 快照 → SaveList 算增/改/删（原 bsc.GetTrackingList().ToSaveChangesData()）
const trackList = shallowRef<TrackableList<Record<string, unknown>>>(new TrackableList<Record<string, unknown>>());

const colDefs = ref<ColDef[]>([      { field: "CPono", headerName: "PONO", width: 112 },
      { field: "Date", headerName: "日期", width: 86 },
      { field: "GroupCode", headerName: "班组(01:甲；02:乙；03:丙；04:丁)", width: 300 },
      { field: "ShiftCode", headerName: "班次(0:夜；1:白；2:中)", width: 255 },
      { field: "CUserIdLuzhang", headerName: "炉长", width: 86 },
      { field: "CUserIdYicaoshou", headerName: "一操手", width: 99 },
      { field: "CStoveNo", headerName: "炉号", width: 86 },
      { field: "CSgCode", headerName: "钢种", width: 86 },
      { field: "TS_NWgtPz", headerName: "铁水皮重", width: 112 },
      { field: "TS_NWgtMz", headerName: "铁水毛重", width: 112 },
      { field: "TS_NWgt", headerName: "铁水净重", width: 112 },
      { field: "CPotNo", headerName: "罐号", width: 86 },
      { field: "CTsC", headerName: "最终铁水C", width: 125 },
      { field: "CTsSi", headerName: "最终铁水Si", width: 138 },
      { field: "CTsMn", headerName: "最终铁水Mn", width: 138 },
      { field: "CTsP", headerName: "最终铁水P", width: 125 },
      { field: "CTsS", headerName: "最终铁水S", width: 125 },
      { field: "CTsTi", headerName: "最终铁水Ti", width: 138 },
      { field: "CTsTemp", headerName: "最终铁水温度", width: 138 },
      { field: "FG_NWgtPz", headerName: "废钢皮重", width: 112 },
      { field: "FG_NWgtMz", headerName: "废钢毛重", width: 112 },
      { field: "FG_NWgt", headerName: "废钢净重", width: 112 },
      { field: "FG_Cycle", headerName: "废钢自循环", width: 125 },
      { field: "CLXX_Time_O2_Start", headerName: "吹炼信息-时刻-开吹", width: 190 },
      { field: "CLXX_Time_O2_End", headerName: "吹炼信息-时刻-结束", width: 190 },
      { field: "CLXX_Time", headerName: "吹炼信息-时刻-供氧时间", width: 216 },
      { field: "CLXX_Time_O2_Num", headerName: "吹炼信息-时刻-供氧量", width: 203 },
      { field: "CLXX_Time_BC", headerName: "吹炼信息-时刻-补吹", width: 190 },
      { field: "CLXX_Time_Out_Beg", headerName: "吹炼信息-时刻-出钢", width: 190 },
      { field: "FL_Wgt_ShiHuiShi", headerName: "辅料 重量（kg）石灰（Kg)", width: 255 },
      { field: "FL_Wgt_BaiYunShi", headerName: "辅料 重量（kg）白云石", width: 216 },
      { field: "FL_Wgt_MeiQiu", headerName: "辅料 重量（kg）镁球", width: 203 },
      { field: "FL_Wgt_LengYaQiu", headerName: "辅料 重量（kg）冷压球", width: 216 },
      { field: "FL_Wgt_FanKuang", headerName: "辅料 重量（kg）返矿", width: 203 },
      { field: "DZL_Wgt_ShiHui", headerName: "顶渣料 石灰", width: 138 },
      { field: "DZL_Wgt_YingShi", headerName: "顶渣料 萤石", width: 138 },
      { field: "CEndC", headerName: "终点成份C", width: 125 },
      { field: "CEndMn", headerName: "终点成份Mn", width: 138 },
      { field: "CEndP", headerName: "终点成份P", width: 125 },
      { field: "CEndS", headerName: "终点成份S", width: 125 },
      { field: "CEndTemp", headerName: "终点温度", width: 112 },
      { field: "CEndO", headerName: "终点氧", width: 99 },
      { field: "NSlgSplsTimes", headerName: "溅渣信息 时间", width: 151 },
      { field: "NN2Consume", headerName: "氮气消耗", width: 112 },
      { field: "TYHJL_Wgt_ZengTanJi", headerName: "增碳剂", width: 99 },
      { field: "TYHJL_Wgt_LvTie", headerName: "铝铁", width: 86 },
      { field: "TYHJL_Wgt_GuiTie", headerName: "硅铁", width: 86 },
      { field: "TYHJL_Wgt_GuiMeng", headerName: "硅锰", width: 86 },
      { field: "TYHJL_Wgt_GuiTieQiu", headerName: "硅铁球", width: 99 },
      { field: "TYHJL_Wgt_DiTanGeTie", headerName: "低碳铬铁", width: 112 },
      { field: "TYHJL_Wgt_ZhongTanMengTie", headerName: "脱氧合金料 重量（Kg) 中碳锰铁", width: 281 },
      { field: "TYHJL_Wgt_GaoTanMengTie", headerName: "脱氧合金料 重量（Kg) 高碳锰铁", width: 281 },
      { field: "TYHJL_Wgt_JinShuMeng", headerName: "脱氧合金料 重量（Kg) 金属锰", width: 268 },
      { field: "TYHJL_Wgt_FeiTong", headerName: "脱氧合金料 重量（Kg) 废铜", width: 255 },
      { field: "TYHJL_Al_Len", headerName: "脱氧合金料 重量（Kg) 铝线（m)", width: 294 },
      { field: "GSCF_Ar_C", headerName: "氩站 成分（%）C", width: 177 },
      { field: "GSCF_Ar_Si", headerName: "氩站 成分（%）Si", width: 190 },
      { field: "GSCF_Ar_Mn", headerName: "氩站 成分（%）Mn", width: 190 },
      { field: "GSCF_Ar_S", headerName: "氩站 成分（%）S", width: 177 },
      { field: "GSCF_Ar_Al", headerName: "氩站 成分（%）Al", width: 190 },
      { field: "GSCF_Ar_Als", headerName: "氩站 成分（%）Als", width: 203 },
      { field: "CTempOut", headerName: "吹氩出站温度", width: 138 },
      { field: "CPotAge", headerName: "钢包包况 包号", width: 151 },
      { field: "CPotState", headerName: "钢包包况 包况", width: 151 },
      { field: "NHbCount", headerName: "挡渣 滑板寿命", width: 151 },
      { field: "NGsWgt_MZ", headerName: "钢水 毛重", width: 125 },
      { field: "NGsWgt_PZ", headerName: "钢水 皮重", width: 125 },
      { field: "NOutGsWgt", headerName: "钢水 净重", width: 125 },
      { field: "CBackup", headerName: "备注", width: 86 },
      { field: "GSCF_Ar_P", headerName: "氩站 成分（%）P", width: 177 },
      { field: "CUserNameLuzhang", headerName: "炉长姓名", width: 112, hide: true },
      { field: "CUserNameYicaoshou", headerName: "一操手姓名", width: 125, hide: true },
      { field: "Tms2010Id", headerName: "Tms2010Id", width: 177, hide: true },
      { field: "IsEnableEditAndSaveDatas", headerName: "IsEnableEditAndSaveDatas", width: 300, hide: true },
      { field: "Tms2000Id", headerName: "Tms2000Id", width: 177, hide: true },
      { field: "Tms2011BofId", headerName: "Tms2011BofId", width: 216, hide: true }]);

// 可编辑门控（原 bandedGridView1.OptionsBehavior.Editable = 任一行 IsEnableEditAndSaveDatas）；系统/内键列只读
const RO = new Set(["Id", "Creator", "CreateTime", "LastModifier", "LastModifyTime"]);
for (const c of colDefs.value) {
  if (!c.field || RO.has(c.field)) continue;
  c.editable = () => canEdit.value;
  if (c.field === "GroupCode") {
    c.cellEditor = "agSelectCellEditor";
    c.cellEditorParams = { values: ["01", "02", "03", "04"] };
  } else if (c.field === "ShiftCode") {
    c.cellEditor = "agSelectCellEditor";
    c.cellEditorParams = { values: ["0", "1", "2"] };
  }
}

/** 后端 JSON 为 camelCase（首字母小写），extract 列为 PascalCase——回填时首字母还原 */
function toPascal(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k ? k[0].toUpperCase() + k.slice(1) : k] = v;
  return out;
}

function getParamDto() {
  if (!lineCode.value || !machineCode.value) {
    toast("禁止操作，产线和机台均不得为空！", 2000, "warn");
    return null;
  }
  return {
    LineCode: lineCode.value,
    LineDesc: lineCode.value,
    MachineCode: machineCode.value,
    MachineName: machineCode.value,
    Date: deDate.value,
    StoveNo: stoveNo.value,
  };
}

async function onQuery() {
  const p = getParamDto();
  if (!p) return;
  querying.value = true;
  try {
    const list = ((await frmMS2200ZLApi.query(p)) ?? []) as Record<string, unknown>[];
    trackList.value = new TrackableList(list.map(toPascal));
    canEdit.value = list.some((x) => x.IsEnableEditAndSaveDatas === true || x.isEnableEditAndSaveDatas === true);
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}

async function onSave() {
  if (!trackList.value.length) return; // 原 bsc.Count==0 return
  saving.value = true;
  try {
    await crudAppService.SaveList(trackList.value, "FrmMS2200_ZLViewDto");
    // 原保存成功后 btnQuery_Click_Real() 重查
    await onQuery();
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

function onDateChange() {
  if (loaded.value) void onQuery(); // 原 deDate_EditValueChanged → btnQuery_Click
}

function onCellValueChanged(_e: CellValueChangedEvent) {
  gridApi.value?.refreshCells({ force: true });
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

onMounted(() => {
  if (!menuQs) {
    toast(
      `界面必须配置注入参数，MES程序版本可能已严重落后，请退出并重新打开MES程序！\r\n若问题仍未得到解决，请联系管理员！\r\n界面注入参数格式为：'${qsFormat}'`,
      5000,
      "error",
    );
  } else if (menuQs.startsWith("{") && !Object.keys(menuJson).length) {
    toast(`界面参数错误应为:${qsFormat}，\r\nMES程序版本可能已严重落后，请退出并重新打开MES程序！`, 5000, "error");
  }
  loaded.value = true;
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：产线/机台/日期/炉次号/查询/保存） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <InputText :model-value="machineCode" disabled class="w-28 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="deDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0"
        @update:model-value="onDateChange" />
      <label class="shrink-0 text-xs text-muted-foreground">炉次号</label>
      <InputText v-model="stoveNo" class="w-32 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button v-if="canEdit" variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
    </div>
    <!-- 台账表（原 bandedGridView1；列头在原画面隐藏 ShowColumnHeaders=false，web 保留 AG Grid 表头以支撑列面板） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="trackList" :pagination="false"
        :loading="querying" @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData"
        @cell-value-changed="onCellValueChanged" />
    </div>
  </div>
</template>
