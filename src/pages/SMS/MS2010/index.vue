<script setup lang="ts">
/** 对应 FrmMS2010（一炼钢铁水接收）：DDH.Winforms.SMS.Forms.FrmMS2010
 *  已接入：frmMS2010Api.query（查询）/
 *          checkTSInStation + updateTBInOrOutStation（铁包到站/离站，时间称重弹窗随迁 InOrOutTimeDialog；state=15 In/40 Out）/
 *          setTsToKR（去脱硫）/ cehckSetTsToKRCancel + setTsToKRCancel（不去脱硫）/
 *          checkTSInStationByList（铁水倒罐校验）/ sendTSQM（抽样质检，原 Visible=false 仍接）/
 *          getTsQMInfo（焦点行 → 铁水成分信息子表）/ query2+确定（倒罐弹窗模式 stackPanel3，主菜单打开恒隐藏）/
 *          checkUpdateTSDatatState + updateTSDatatState（铁水作废/启用，按钮文字与可用态随行切换，文案照抄）
 *  cQueryString：{FactoryCode,LineCode}——产线只读回显；ShiftInfo.CheckShiftInfo/班次班组 web 无模块（待接入：
 *                updateTBInOrOutStation 的 shiftInfo 传空、换班按钮占位）
 *  二级弹窗：FrmMS2010_TS_Intrusion（倒罐）/ FrmMS2010_TS_Add（添加铁水）留 toast 占位；stackPanel2（占位控件+机台+
 *            添加/删除/保存，Designer Visible=false Enabled=false，元素保留隐藏）无 .cs 处理器，按钮禁用
 *  分栏：gridControl1(Fill)「铁水信息」+ splitter + gridControl2(Bottom,200px)「铁水成分信息」上下 65/35
 *  列集按 extract：主 34可见+54隐藏=88 / 成分 7可见+1隐藏；状态/脱硫/班次编码格式化器未迁，显示原始编码 */
import { computed, ref } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { frmMS2010Api } from "@/api/mes4ddh/sms.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import InOrOutTimeDialog from "./InOrOutTimeDialog.vue";

type Row = Record<string, any>;

const { toast } = useToast();
const { json: menuJson } = useMenuQuery();
const qsStr = (v: unknown) => (typeof v === "string" ? v : "");
const qsLine = qsStr(menuJson.LineCode) || qsStr(menuJson.lineCode);

const theme = makeHmxGridTheme();
const rows = ref<Row[]>([]);
const tsqmRows = ref<Row[]>([]);
const mainApi = ref<GridApi | null>(null);
const tsqmApi = ref<GridApi | null>(null);
const querying = ref(false);
const curRow = ref<Row | null>(null);

/* 倒罐弹窗模式：C# FrmMS2010(queryString, excludeData) 构造切 stackPanel1↔stackPanel3，主菜单打开恒 false */
const dlgMode = ref(false);

function fmt(d: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/* 原 stackPanel1：产线 ucLine1(只读) + 日期 deDate + 仅查询当天铁水 chkQueryConn1 + 操作按钮 */
const lineCode = ref(qsLine);
const lineCode2 = ref(qsLine); /* stackPanel3 内 ucLine2 */
const deDate = ref<Date | null>(today());
const chkQueryConn1 = ref(false);

/* 主表（原 gridControl1/gridView1 ViewCaption=铁水信息：FrmMS2010ViewDto 34 可见 + 54 隐藏） */
const mainCols = ref<ColDef[]>([
        { field: "selected", headerName: "选择", width: 60, minWidth: 56, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false },
      { field: "cIronNo", headerName: "铁次号", width: 99 },
      { field: "cPotNo", headerName: "罐号", width: 86 },
      { field: "nWgtMz", headerName: "钢水毛重", width: 112 },
      { field: "nWgtPz", headerName: "钢水皮重", width: 112 },
      { field: "nWgt", headerName: "坯重", width: 86 },
      { field: "nWgtRemaining", headerName: "剩余重量", width: 112 },
      { field: "cState", headerName: "铁水状态", width: 112 },
      { field: "cDataAddType", headerName: "数据添加方式", width: 95 },
      { field: "cKrSign", headerName: "脱硫标识", width: 112 },
      { field: "cKrState", headerName: "脱硫状态", width: 112 },
      { field: "nIntrusion", headerName: "是否倒罐", width: 112 },
      { field: "dAccountDate", headerName: "账务日期", width: 112 },
      { field: "dTeamDate", headerName: "虚拟或占用炉号班次日期", width: 203 },
      { field: "cShift", headerName: "班次", width: 86 },
      { field: "cTeam", headerName: "班组", width: 86 },
      { field: "dTbInTime", headerName: "铁包到达时间", width: 95 },
      { field: "dTbOutTime", headerName: "铁包离开时间", width: 95 },
      { field: "cTbOutUser", headerName: "铁包离开确认人", width: 107 },
      { field: "nLgTemperature", headerName: "炼钢铁水站测温", width: 107 },
      { field: "nLgWgtMz", headerName: "炼钢计量毛重", width: 95 },
      { field: "nLgWgtPz", headerName: "炼钢计量皮重", width: 95 },
      { field: "nLgWgt", headerName: "炼钢计量净重", width: 95 },
      { field: "dLgWgtMzTime", headerName: "炼钢计量毛重计量时间", width: 143 },
      { field: "dLgWgtPzTime", headerName: "炼钢计量皮重计量时间", width: 143 },
      { field: "nQmSampled", headerName: "铁水质检抽样", width: 143 },
      { field: "cQmSampNo", headerName: "铁水质检抽检检验样号", width: 143 },
      { field: "dWgtPzTime", headerName: "皮重计量时间", width: 95 },
      { field: "dWgtMzTime", headerName: "毛重计量时间", width: 95 },
      { field: "cEnable", headerName: "启用", width: 86 },
      { field: "cMtrlCode", headerName: "物料编码", width: 112 },
      { field: "cMtrlName", headerName: "物料描述", width: 112 },
      { field: "creator", headerName: "创建人", width: 99 },
      { field: "createTime", headerName: "创建时间", width: 112 },
      { field: "id", headerName: "主键", hide: true },
      { field: "cCarNo", headerName: "车号", hide: true },
      { field: "nWgtKz", headerName: "钢水扣重", hide: true },
      { field: "cUnit", headerName: "单片钢坯", hide: true },
      { field: "cMatchingStoveSign", headerName: "炉次匹配标识", hide: true },
      { field: "cBackup", headerName: "备注", hide: true },
      { field: "cTbInUser", headerName: "铁包到达确认人", hide: true },
      { field: "dInStationTime", headerName: "脱硫到站时间", hide: true },
      { field: "dBegProTime", headerName: "脱硫开始作业时间", hide: true },
      { field: "dEndProTime", headerName: "脱硫结束作业时间", hide: true },
      { field: "dOutStationTime", headerName: "脱硫离站时间", hide: true },
      { field: "dInStationMode", headerName: "脱硫到站操作方式", hide: true },
      { field: "dBegProMode", headerName: "脱硫开始作业操作方式", hide: true },
      { field: "dEndProMode", headerName: "脱硫结束作业操作方式", hide: true },
      { field: "dOutStationMode", headerName: "脱硫离站操作方式", hide: true },
      { field: "nWgtTlj", headerName: "脱硫剂添加量", hide: true },
      { field: "cUnitTl", headerName: "脱硫剂单位", hide: true },
      { field: "cTimestamp", headerName: "时间戳", hide: true },
      { field: "lastModifier", headerName: "最后修改人", hide: true },
      { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
      { field: "cSw01", headerName: "备用字段1", hide: true },
      { field: "cSw02", headerName: "备用字段2", hide: true },
      { field: "cSw03", headerName: "备用字段3", hide: true },
      { field: "cSw04", headerName: "备用字段4", hide: true },
      { field: "cSw05", headerName: "备用字段5", hide: true },
      { field: "cSw06", headerName: "备用字段6", hide: true },
      { field: "dWgtTime", headerName: "净重计量时间", hide: true },
      { field: "cBizNo", headerName: "凭证单号", hide: true },
      { field: "cBizType", headerName: "凭证类型", hide: true },
      { field: "cCarriertype", headerName: "载具类型", hide: true },
      { field: "cQmKrSampNo", headerName: "KR铁水质检抽检检验样号", hide: true },
      { field: "dLgWgtTime", headerName: "炼钢计量净重计量时间", hide: true },
      { field: "intrusionWgtRemaining", headerName: "倒出剩余重量", hide: true },
      { field: "intrusionWgtOut", headerName: "倒出重量", hide: true },
      { field: "nLgKrTemperature", headerName: "炼钢KR测温", hide: true },
      { field: "cShiftKR", headerName: "KR班次", hide: true },
      { field: "cTeamKR", headerName: "KR班组", hide: true },
      { field: "dAccountDateKR", headerName: "KR账务日期", hide: true },
      { field: "dTeamDateKR", headerName: "KR班次日期", hide: true },
      { field: "cFactory", headerName: "厂家", hide: true },
      { field: "cBlast", headerName: "高炉号", hide: true },
      { field: "cRecLoctNo", headerName: "收方库位", hide: true },
      { field: "cRecStrgNo", headerName: "收方库房", hide: true },
      { field: "cSndLoctNo", headerName: "发方库位", hide: true },
      { field: "cSndStrgNo", headerName: "发方库房", hide: true },
      { field: "beforeIntrusionWgtRemaining", headerName: "BeforeIntrusionWgtRemaining", hide: true },
      { field: "cTqDataId", headerName: "铁前数据id", hide: true },
      { field: "isAddEmptyPot", headerName: "IsAddEmptyPot", hide: true },
      { field: "isWeighTs", headerName: "是否是过磅铁水", hide: true },
      { field: "nCalcCoef", headerName: "计算系数", hide: true },
      { field: "nIntrusionCF", headerName: "是否使用倒罐成分", hide: true },
      { field: "nWgtMzNoCalc", headerName: "毛重", hide: true },
      { field: "nWgtNoCalc", headerName: "净重", hide: true },
      { field: "nWgtPzNoCalc", headerName: "皮重", hide: true },
]);
/* 成分表（原 gridControl2/gridView2 ViewCaption=铁水成分信息：FrmMS2010ViewDto_TSQM 7 可见 + 1 隐藏） */
const tsqmCols = ref<ColDef[]>([
        { field: "sampleNo", headerName: "试样编号", width: 112 },
      { field: "sampleType", headerName: "检验样类型", width: 125 },
      { field: "c", headerName: "C", width: 80 },
      { field: "si", headerName: "SI", width: 86 },
      { field: "mn", headerName: "MN", width: 86 },
      { field: "p", headerName: "P", width: 80 },
      { field: "s", headerName: "S", width: 80 },
      { field: "ceq", headerName: "CEQ", hide: true },
]);

function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}
function onTsqmReady(e: GridReadyEvent) {
  tsqmApi.value = e.api;
}

/** 铁水作废按钮：状态 ∈ {UnReceived,UnDischarge} 可用；文字按 CEnable 切「铁水作废/铁水启用」 */
const invalidBtnEnabled = computed(() => {
  const s = curRow.value?.cState;
  return s === "UnReceived" || s === "UnDischarge";
});
const invalidBtnText = computed(() => (curRow.value?.cEnable === false ? "铁水启用" : "铁水作废"));

/** btnQuery_Click_Real → Proxy.Query(lineCode, date, getLimitedDayData)；查询后原代码以 null 焦点重载成分表 */
async function queryReal() {
  querying.value = true;
  try {
    rows.value = (await frmMS2010Api.query({
      lineCode: lineCode.value || undefined,
      date: fmt(deDate.value),
      getLimitedDayData: chkQueryConn1.value,
    })) ?? [];
    requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
  curRow.value = null;
  tsqmRows.value = [];
}

/** gridView1_FocusedRowChanged → Proxy.GetTsQMInfo(tsId) */
async function onMainSelection(e: SelectionChangedEvent) {
  const row = (e.api.getSelectedRows()[0] ?? null) as Row | null;
  curRow.value = row;
  if (!row) {
    tsqmRows.value = [];
    return;
  }
  tsqmRows.value = (await frmMS2010Api.getTsQMInfo({ tsId: row.id })) ?? [];
  requestAnimationFrame(() => tsqmApi.value?.autoSizeAllColumns());
}

/* ===== 铁包到站/离站：tbInOrOut(StoveStateEnum) ===== */
const inOutOpen = ref(false);
const inOutMode = ref<"In" | "Out">("In");
const inOutRow = ref<Row | null>(null);
async function tbInOrOut(mode: "In" | "Out") {
  const row = curRow.value;
  if (!row) return;
  if (mode === "Out") {
    await frmMS2010Api.checkTSInStation({ tsId: row.id, checkPotIsOut: false });
  } else if (row.cTbOutUser) {
    toast(`禁止操作，罐号为‘${row.cPotNo}’的铁水罐已经离开铁水站！`, 3000, "warn");
    return;
  }
  /* 原 ShiftInfo.CheckShiftInfo——web 无班次模块（待接入） */
  inOutMode.value = mode;
  inOutRow.value = { ...row };
  inOutOpen.value = true;
}
async function onInOutOk(edited: Row) {
  inOutOpen.value = false;
  const state = inOutMode.value === "In" ? 15 : 40; /* StoveStateEnum.In=15 Out=40 */
  await frmMS2010Api.updateTBInOrOutStation({ data: edited, state, shiftInfo: undefined });
  await queryReal();
}

/** btnToKR_Click → CheckTSInStation → 确认 → SetTsToKR（已标记提示照抄） */
async function onToKR() {
  const row = curRow.value;
  if (!row) return;
  await frmMS2010Api.checkTSInStation({ tsId: row.id });
  if (row.cKrSign) {
    toast(`铁次号为‘${row.cIronNo}’，罐号为‘${row.cPotNo}’的铁水已经标记为需脱硫！\r\n无需重复标记！`, 3000, "warn");
    return;
  }
  if (!window.confirm(`确定将铁次号为‘${row.cIronNo}’，罐号为‘${row.cPotNo}’的铁水标记为需脱硫？`)) return;
  await frmMS2010Api.setTsToKR({ tsId: row.id });
  await queryReal();
}

/** btnCancelKR_Click → CheckTSInStation + CehckSetTsToKRCancel → 确认 → SetTsToKRCancel */
async function onCancelKR() {
  const row = curRow.value;
  if (!row) return;
  await frmMS2010Api.checkTSInStation({ tsId: row.id });
  await frmMS2010Api.cehckSetTsToKRCancel({ tsId: row.id });
  if (!window.confirm(`确定将铁次号为‘${row.cIronNo}’，罐号为‘${row.cPotNo}’的铁水取消去脱硫？`)) return;
  await frmMS2010Api.setTsToKRCancel({ tsId: row.id });
  await queryReal();
}

/** btnIntrusion_Click → CheckTSInStationByList → 倒罐弹窗（FrmMS2010_TS_Intrusion 二级弹窗占位）→ 重查 */
async function onIntrusion() {
  if (!rows.value.length) return;
  const sel = rows.value.filter((r) => r.selected);
  if (!sel.length) {
    toast("请选择要进行倒罐的铁水数据！", 2500, "warn");
    return;
  }
  await frmMS2010Api.checkTSInStationByList({ tsIds: sel.map((r) => r.id) });
  toast("倒罐弹窗待接入（FrmMS2010_TS_Intrusion）", 2500, "warn");
  await queryReal();
}

/** btnSendQM_Click（原 Visible=false）→ CheckTSInStation → 确认 → SendTSQM */
async function onSendQM() {
  const row = curRow.value;
  if (!row) return;
  await frmMS2010Api.checkTSInStation({ tsId: row.id });
  if (!window.confirm(`确定发送罐号为‘${row.cPotNo}’，铁次号为‘${row.cIronNo}’的铁水的质检委托？`)) return;
  await frmMS2010Api.sendTSQM({ tsId: row.id });
  await queryReal();
}

/** btnRefreshTeamInfo_Click 原 ShiftInfo.ResetShiftInfo（web 无班次模块占位） */
function onRefreshTeam() {
  toast("换班：web 端无 ShiftInfo 班次模块，暂不可用", 2500, "warn");
}

/** btnTSAdd_Click：产线校验 → FrmMS2010_TS_Add（二级弹窗占位）→ 刷新 */
function onTsAdd() {
  if (!lineCode.value) {
    toast("产线不得为空！", 2500, "warn");
    return;
  }
  toast("添加铁水弹窗待接入（FrmMS2010_TS_Add）", 2500, "warn");
  void queryReal();
}

/** btnTSInvalid_Click → CheckUpdateTSDatatState → UpdateTSDatatState（确定文案照抄） */
async function onTsInvalid() {
  const row = curRow.value;
  if (!row) return;
  const str = row.cEnable ? "作废" : "启用";
  if (!window.confirm(`确定 ${str} 所选的铁次号为 ${row.cIronNo}，罐号为 ${row.cPotNo} 的铁水数据？`)) return;
  const state = !row.cEnable;
  await frmMS2010Api.checkUpdateTSDatatState({ tsDataDto: row, state });
  await frmMS2010Api.updateTSDatatState({ tsDataDto: row, state });
  await queryReal();
}

/** btnQuery2_Click（倒罐弹窗模式 stackPanel3，主界面隐藏）→ Proxy.Query2 */
async function query2() {
  rows.value = (await frmMS2010Api.query2({ lineCode: lineCode2.value || undefined })) ?? [];
  requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
}
/** btnOK_Click（倒罐弹窗模式）：确定返回所选行——主菜单打开时仅占位 */
function onOkPick() {
  if (!curRow.value) {
    toast("禁止操作，选择的要进行倒罐的铁水信息为空！", 2500, "warn");
    return;
  }
  toast("确定仅在倒罐弹窗模式下返回所选铁水，主界面占位", 2500, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 主操作行（原 stackPanel1 Dock=Top；Visible=!dlgMode） -->
    <div v-show="!dlgMode" class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineCode" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="deDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <Checkbox v-model="chkQueryConn1" binary inputId="chkConn1" />
      <label for="chkConn1" class="shrink-0 text-xs text-muted-foreground">仅查询当天铁水</label>
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="queryReal">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="tbInOrOut('In')">铁包到站</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onToKR">去脱硫</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCancelKR">不去脱硫</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="tbInOrOut('Out')">铁包离站</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onIntrusion">铁水倒罐</Button>
      <Button text v-show="false" class="shrink-0 whitespace-nowrap" @click="onSendQM">抽样质检</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onRefreshTeam">换班</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onTsAdd">添加铁水</Button>
      <Button text class="shrink-0 whitespace-nowrap" :disabled="!invalidBtnEnabled" @click="onTsInvalid">{{ invalidBtnText }}</Button>
    </div>

    <!-- 倒罐弹窗模式行（原 stackPanel3 Visible=false：产线 ucLine2 + 查询 + 确定） -->
    <div v-show="dlgMode" class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText v-model="lineCode2" class="w-28 shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" @click="query2">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onOkPick">确定</Button>
    </div>

    <!-- 编辑占位行（原 stackPanel2 Visible=false Enabled=false：占位控件+机台+添加/删除/保存，元素保留隐藏） -->
    <div v-show="false" class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <InputText model-value="占位控件" disabled class="w-24 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <InputText disabled class="w-24 shrink-0" />
      <Button text disabled class="shrink-0 whitespace-nowrap">添加</Button>
      <Button text disabled class="shrink-0 whitespace-nowrap">删除</Button>
      <Button text disabled class="shrink-0 whitespace-nowrap">保存</Button>
    </div>

    <!-- 上下分栏（原 gridControl1 Fill + splitterControl1 Bottom + gridControl2 Bottom,200px ≈ 65/35） -->
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="65" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 主表标题（原 gridView1.ViewCaption，无按钮 → h-8） -->
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">铁水信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="mainCols"
            :row-data="rows"
            :pagination="false"
            :loading="querying"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            @grid-ready="onMainReady"
            @selection-changed="onMainSelection"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="35" :minSize="15" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">铁水成分信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="tsqmCols"
            :row-data="tsqmRows"
            :pagination="false"
            @grid-ready="onTsqmReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

    <InOrOutTimeDialog v-model:open="inOutOpen" :mode="inOutMode" :row="inOutRow" @ok="onInOutOk" />
  </div>
</template>
