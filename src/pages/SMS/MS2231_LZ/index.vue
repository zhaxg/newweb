<script setup lang="ts">
/** 对应 FrmMS2231_LZ（1#连铸台账报表，3 菜单 LG01 共用 cQueryString={LineCode,MachineCode}，实体/服务同 FrmMS2230_LZ）：
 *  DDH.Winforms.SMS.Forms.FrmMS2231_LZ
 *  已接入：crudAppService.SaveList("FrmMS2230_LZViewDto")（.cs btnSave_Click 取 tracking 的就是 FrmMS2230_LZViewDto，
 *         一炼钢报表同实体——按批约台账）；保存按钮门控 = 查询后任一行 IsEnableEditAndSaveDatas；
 *         行内编辑 TrackableList，可编辑=check（本页照抄 .cs Editable=check，与 MS2230 的恒 true 不同）
 *  待接入：② 炉长/一操手列下拉候选（原 OperateViewModel → frmMS2100_X_ShiftInfo/getProcUserInfo 未生成），暂文本编辑
 *  二级弹窗：查看曲线图 → FrmMS3110(dtoList).ShowDialog() —— 按批约留占位（校验文案照抄后 toast 提示）
 *  结构：stackPanel1（产线|机台|日期(时间范围)|炉次号|查询|保存|查看曲线图）——本页无 chkAutoRefresh「全选」；
 *       UCTimeRange → DatePicker range(show-time)，默认 今天 00:00 ~ 明天 00:00；校验：产线机台不得为空 / 时间范围不得大于31天
 *  列集：extract 待确认 70 可见（Selected 选择列→row-selection 复选框，原列 hide:true 保留，勾选回写 Selected 字段）+ 7 隐藏（hide:true）；班次/班组列 agSelect（0-2 / 01-04）
 *  字段桥接：后端 JSON camelCase → 回填 toPascal 首字母还原 */
import { ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { onMounted } from "vue";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { crudAppService } from "@/api/common/crudAppService";
import { TrackableList } from "@/api/common/trackableList";
import { frmMS2230LZApi } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { raw: menuQs, json: menuJson } = useMenuQuery();
const qsFormat = JSON.stringify({ LineCode: null, MachineCode: null });

const theme = makeHmxGridTheme();
const gridApi = ref<GridApi | null>(null);
const querying = ref(false);
const saving = ref(false);
const canEdit = ref(false);

const lineCode = ref(String((menuJson as { LineCode?: string }).LineCode ?? ""));
const machineCode = ref(String((menuJson as { MachineCode?: string }).MachineCode ?? ""));
const stoveNo = ref("");
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// 原 ucTimeRange1.Value = new TimeRange(DateTime.Now.Date, DateTime.Now.Date.AddDays(1))
const dateRange = ref<Date[] | null>([startOfDay(new Date()), new Date(startOfDay(new Date()).getTime() + 86400000)]);

const trackList = shallowRef<TrackableList<Record<string, unknown>>>(new TrackableList<Record<string, unknown>>());

const colDefs = ref<ColDef[]>([      { field: "CPono", headerName: "PONO", width: 112 },
      { field: "Index", headerName: "序号", width: 86 },
      { field: "CStoveNo", headerName: "炉号", width: 86 },
      { field: "Date", headerName: "日期", width: 86 },
      { field: "CActualMachineDesc", headerName: "实际工序机台名称", width: 164 },
      { field: "CActualMachineStationCode", headerName: "实际机台工位编码", width: 164 },
      { field: "GroupCode", headerName: "班组(01:甲；02:乙；03:丙；04:丁)", width: 300 },
      { field: "ShiftCode", headerName: "班次(0:夜；1:白；2:中)", width: 255 },
      { field: "CSgCode", headerName: "钢种", width: 86 },
      { field: "CPotNo", headerName: "罐号", width: 86 },
      { field: "CPotState", headerName: "钢包包况 包况", width: 151 },
      { field: "CZbh1", headerName: "中包号1", width: 112 },
      { field: "NThick", headerName: "厚度", width: 86 },
      { field: "NWidth", headerName: "宽度", width: 86 },
      { field: "CCMIndex", headerName: "包次序号", width: 112 },
      { field: "Wgt_Remaining", headerName: "浇余（吨）", width: 125 },
      { field: "Temp_Get", headerName: "温度（℃）索要温度", width: 177 },
      { field: "CDbdtwd", headerName: "温度（℃）上台温度", width: 177 },
      { field: "Time_ZhenJing", headerName: "过程时间（min)镇静时间", width: 229 },
      { field: "Time_Leave_LF", headerName: "过程时间（min)精炼出站时间", width: 255 },
      { field: "CTimekjsj", headerName: "过程时间（min)开浇", width: 203 },
      { field: "CTimetjsj", headerName: "过程时间（min)停浇", width: 203 },
      { field: "CDbzk1", headerName: "是否自开", width: 112 },
      { field: "Temp_ZJB_1", headerName: "中包温度（℃）1", width: 164 },
      { field: "Temp_ZJB_2", headerName: "中包温度（℃）2", width: 164 },
      { field: "Temp_ZJB_3", headerName: "中包温度（℃）3", width: 164 },
      { field: "Temp_ZJB_4", headerName: "中包温度（℃）4", width: 164 },
      { field: "N1Lasu1", headerName: "一流拉速/m.min 1", width: 216 },
      { field: "N1Lasu2", headerName: "一流拉速/m.min 2", width: 216 },
      { field: "N1Lasu3", headerName: "一流拉速/m.min 3", width: 216 },
      { field: "N1Lasu4", headerName: "一流拉速/m.min 4", width: 216 },
      { field: "N2Lasu1", headerName: "二流拉速/m.min 1", width: 216 },
      { field: "N2Lasu2", headerName: "二流拉速/m.min 2", width: 216 },
      { field: "N2Lasu3", headerName: "二流拉速/m.min 3", width: 216 },
      { field: "N2Lasu4", headerName: "二流拉速/m.min 4", width: 216 },
      { field: "GSCF_ShangGang_N", headerName: "上钢成分 N（上钢）", width: 190 },
      { field: "GSCF_ShangGang_Als", headerName: "上钢成分 Als（上钢", width: 203 },
      { field: "GSCF_CP_C", headerName: "成品成分（%）C", width: 164 },
      { field: "GSCF_CP_Si", headerName: "成品成分（%）Si", width: 177 },
      { field: "GSCF_CP_Mn", headerName: "成品成分（%）Mn", width: 177 },
      { field: "GSCF_CP_P", headerName: "成品成分（%）P", width: 164 },
      { field: "GSCF_CP_S", headerName: "成品成分（%）S", width: 164 },
      { field: "GSCF_CP_Als", headerName: "成品成分（%）Als", width: 190 },
      { field: "GSCF_CP_Ca", headerName: "成品成分（%）Ca", width: 177 },
      { field: "GSCF_CP_Ti", headerName: "成品成分（%）Ti", width: 177 },
      { field: "GSCF_CP_N", headerName: "成品成分（%）N", width: 164 },
      { field: "GSCF_CP_Cu", headerName: "成品成分（%）Cu", width: 177 },
      { field: "GSCF_CP_Cr", headerName: "成品成分（%）Cr", width: 177 },
      { field: "GSCF_CP_Ni", headerName: "成品成分（%）Ni", width: 177 },
      { field: "GSCF_CP_Nb", headerName: "成品成分（%）Nb", width: 177 },
      { field: "Wgt_GaiLvBi", headerName: "钙铝比", width: 99 },
      { field: "BaoHuZha_Liu1", headerName: "一流保护渣", width: 125 },
      { field: "BaoHuZha_Liu2", headerName: "二流保护渣", width: 125 },
      { field: "DaBaoFuGaiJi", headerName: "大包覆盖剂", width: 125 },
      { field: "ShuiBiaoHao", headerName: "水表号", width: 99 },
      { field: "BaoHuZha", headerName: "保护渣", width: 99 },
      { field: "FuGaiJi", headerName: "覆盖剂", width: 99 },
      { field: "BangSai", headerName: "塞棒", width: 86 },
      { field: "ShuiKou_Shang", headerName: "上水口", width: 99 },
      { field: "ShuiKou_JinRuShi", headerName: "浸入式水口", width: 125 },
      { field: "ShuiKou_Chang", headerName: "长水口", width: 99 },
      { field: "BackUp", headerName: "备注", width: 86 },
      { field: "CuiHuo", headerName: "是否投用淬火", width: 138 },
      { field: "Wgt_GS_MZ", headerName: "钢水量 毛重", width: 138 },
      { field: "Wgt_GS_PZ", headerName: "钢水量 皮重", width: 138 },
      { field: "Wgt_GS", headerName: "钢水量 净重", width: 138 },
      { field: "CUserIdLuzhang", headerName: "炉长id", width: 112 },
      { field: "CUserIdYiCaoShou", headerName: "一操手Id", width: 125 },
      { field: "GSCF_CP_Al", headerName: "成品成分（%）Al", width: 177 },
      { field: "Selected", headerName: "选择", hide: true },
      { field: "CUserNameLuzhang", headerName: "炉长姓名", width: 112, hide: true },
      { field: "Creator", headerName: "创建人", width: 99, hide: true },
      { field: "Tms2010Id", headerName: "Tms2010Id", width: 177, hide: true },
      { field: "CUserNameYiCaoShou", headerName: "一操手姓名", width: 125, hide: true },
      { field: "IsEnableEditAndSaveDatas", headerName: "IsEnableEditAndSaveDatas", width: 300, hide: true },
      { field: "Tms2000Id", headerName: "Tms2000Id", width: 177, hide: true },
      { field: "Tms2014CcmId", headerName: "Tms2014CcmId", width: 216, hide: true }]);

// 可编辑门控（原 Editable = check）；系统/内键列只读；班次/班组列下拉照列头文案
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
// Selected = 勾选标记列（原 CheckEdit；非行选择 checkbox）：ui-rules §7——原列 hide:true 保留，
// 勾选由 row-selection 复选框呈现；保存 payload 仍含 Selected 字段，selection-changed 回写保持契约

function toPascal(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k ? k[0].toUpperCase() + k.slice(1) : k] = v;
  return out;
}

function rangeDays(): number {
  const [a, b] = dateRange.value ?? [];
  if (!a || !b) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86400000); // 原 (Max-Min).Days
}

function getParamDto() {
  if (!lineCode.value || !machineCode.value) {
    toast("禁止操作，产线和机台均不得为空！", 2000, "warn");
    return null;
  }
  if (rangeDays() > 31) {
    toast("禁止操作，时间范围不得大于31天！", 2000, "warn");
    return null;
  }
  const [min, max] = dateRange.value ?? [null, null];
  return {
    LineCode: lineCode.value,
    LineDesc: lineCode.value,
    MachineCode: machineCode.value,
    MachineName: machineCode.value,
    StoveNo: stoveNo.value,
    TimeRange: { Min: min, Max: max }, // 原 TimeRange(Min,Max)
  };
}

async function onQuery() {
  const p = getParamDto();
  if (!p) return;
  querying.value = true;
  try {
    const list = ((await frmMS2230LZApi.query(p)) ?? []) as Record<string, unknown>[];
    trackList.value = new TrackableList(list.map(toPascal));
    canEdit.value = list.some((x) => x.IsEnableEditAndSaveDatas === true || x.isEnableEditAndSaveDatas === true);
    /* 原 CheckEdit 直接绑定 Selected 字段：查询回填后按数据字段回灌勾选态 */
    requestAnimationFrame(() => {
      gridApi.value?.forEachNode((node) => node.setSelected(!!(node.data as Record<string, unknown>).Selected));
      gridApi.value?.autoSizeAllColumns();
    });
  } finally {
    querying.value = false;
  }
}

/** 勾选态回写 Selected 数据字段（保存 SaveList 仍带该字段，后端契约不变） */
function syncSelectedToData() {
  const sel = new Set((gridApi.value?.getSelectedRows() ?? []) as Record<string, unknown>[]);
  for (const r of trackList.value) r.Selected = sel.has(r);
}

async function onSave() {
  if (!trackList.value.length) return;
  saving.value = true;
  try {
    await crudAppService.SaveList(trackList.value, "FrmMS2230_LZViewDto"); // .cs 取的即此实体（一炼钢同实体）
    // 原保存后重查——查询已接 frmMS2230LZApi.query
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

// 原 brnShowChart_Click：勾选行 → 开浇/停浇时间校验（本页不列炉号明细）→ FrmMS3110 弹窗（二级弹窗占位）
function onShowChart() {
  const list = (gridApi.value?.getSelectedRows() ?? []) as Record<string, unknown>[];
  if (!list.length) {
    toast("请选择一行数据后重试！", 2000, "warn");
    return;
  }
  const bad = list.filter((r) => {
    const b = r.CTimekjsj ? new Date(String(r.CTimekjsj)).getTime() : NaN;
    const e = r.CTimetjsj ? new Date(String(r.CTimetjsj)).getTime() : NaN;
    return Number.isNaN(b) || Number.isNaN(e) || e - b <= 0;
  });
  if (bad.length) {
    toast("开浇停浇时间不得为空且停浇时间不得早于开浇时间！", 3000, "warn");
    return;
  }
  // 原构造 MS3100SetDto{TimeRange=开浇~停浇,IsPopup=true,Machine/Plant/Line,CStoveNo} → new FrmMS3110(list).ShowDialog()
  toast("曲线图弹窗（FrmMS3110）为二级弹窗，待确认后迁移", 2500, "info");
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
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：产线/机台/日期(UCTimeRange)/炉次号/查询/保存/查看曲线图——无全选） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <InputText :model-value="machineCode" disabled class="w-28 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="dateRange" selection-mode="range" :manual-input="false" date-format="yy-mm-dd" show-time
        hour-format="24" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">炉次号</label>
      <InputText v-model="stoveNo" class="w-32 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button v-if="canEdit" variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onShowChart">查看曲线图</Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="trackList" :pagination="false"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :loading="querying" @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData"
        @selection-changed="syncSelectedToData" @cell-value-changed="onCellValueChanged" />
    </div>
  </div>
</template>
