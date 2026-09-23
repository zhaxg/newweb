<script setup lang="ts">
/** 对应 FrmMS2020_KR（炼钢总厂铁水脱硫）：DDH.Winforms.SMS.Forms.FrmMS2020_KR
 *  已接入：frmMS2020Api.query（查询——LineCode+date+getLimitedDayData）/
 *          setKRBeg（脱硫开始，状态 Doing/Done 拦截「已执行过开始脱硫」照抄，完成提示「执行完毕！」）/
 *          setKRBegCancel（取消开始）/ setKREnd（脱硫结束）/ setKREndCancel（取消结束）/
 *          sendTSQM（发送质检，原 Visible=false 仍接）/ saveData（保存，焦点行编辑直存，C# 无成功提示）/
 *          frmMS2010Api.getTsQMInfo（焦点行 → 铁水质检信息）/ uCCustomPLCPointShowInfoApi.query（机台实时运行信息 UC）
 *  cQueryString：{LineCode,MachineCode}——查询用 LineCode、PLC 面板用 LineCode+MachineCode（原 ucCustomplcPointShowInfo1.Init）
 *  分栏：stackPanel1(工具行) + stackPanel2(占位控件, Visible=false) + gridControl1(Fill「脱硫铁水信息」) + splitter +
 *        panel1(Bottom,320px≈45%) 内左右三分：vGrid「铁水质检信息」| 表单+保存 | GroupBox「机台实时运行信息」(PLC UC)
 *  列集按 extract：主 19可见+52隐藏=71；质检竖排 VGrid(8 行) 以同列集列表呈现（偏差见此）
 *  待接入：KR班次/KR班组 ImageCombo 候选=MS_SHIFT/MS_GROUP 运行时字典（无 swagger 入口，选项留空仅回显当前值）；
 *          uCCustomPLCPointShowInfoApi.getPointInfoFromRedis 未生成于 swagger（无法改 src/api）；换班占位；ShiftInfo 传空 */
import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { frmMS2010Api, frmMS2020Api, uCCustomPLCPointShowInfoApi } from "@/api/mes4ddh/sms.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

type Row = Record<string, any>;

const { toast } = useToast();
const { json: menuJson } = useMenuQuery();
const qsStr = (v: unknown) => (typeof v === "string" ? v : "");
const lineCode = qsStr(menuJson.LineCode) || qsStr(menuJson.lineCode);
const machineCode = qsStr(menuJson.MachineCode) || qsStr(menuJson.machineCode);

const theme = makeHmxGridTheme();
const rows = ref<Row[]>([]);
const qcRows = ref<Row[]>([]);
const mainApi = ref<GridApi | null>(null);
const qcApi = ref<GridApi | null>(null);
const querying = ref(false);
const curRow = ref<Row | null>(null);

function fmt(d: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmtTs(d: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(String(v).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}
function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/* 原 stackPanel1：日期 deDate + 仅查询当天铁水 + 操作按钮 */
const deDate = ref<Date | null>(today());
const chkQueryConn1 = ref(false);

/* 主表（原 gridControl1/gridView1 ViewCaption=脱硫铁水信息：FrmMS2020ViewDto 19 可见 + 52 隐藏） */
const mainCols = ref<ColDef[]>([
        { field: "cPotNo", headerName: "罐号", width: 86 },
      { field: "cIronNo", headerName: "铁次号", width: 99 },
      { field: "cCarNo", headerName: "车号", width: 86 },
      { field: "nWgtPz", headerName: "钢水皮重", width: 112 },
      { field: "nWgtMz", headerName: "钢水毛重", width: 112 },
      { field: "nWgt", headerName: "坯重", width: 86 },
      { field: "nLgTemperature", headerName: "炼钢铁水站测温", width: 107 },
      { field: "nLgKrTemperature", headerName: "炼钢KR测温", width: 85 },
      { field: "cKrSign", headerName: "脱硫标识", width: 112 },
      { field: "cKrState", headerName: "脱硫状态", width: 112 },
      { field: "dInStationTime", headerName: "脱硫到站时间", width: 95 },
      { field: "dOutStationTime", headerName: "脱硫离站时间", width: 95 },
      { field: "nWgtTlj", headerName: "脱硫剂添加量", width: 95 },
      { field: "dAccountDateKR", headerName: "KR账务日期", width: 85 },
      { field: "dTeamDateKR", headerName: "KR班次日期", width: 85 },
      { field: "cShiftKR", headerName: "KR班次", width: 112 },
      { field: "cTeamKR", headerName: "KR班组", width: 112 },
      { field: "cMtrlName", headerName: "物料描述", width: 112 },
      { field: "cMtrlCode", headerName: "物料编码", width: 112 },
      { field: "id", headerName: "主键", hide: true },
      { field: "nWgtKz", headerName: "钢水扣重", hide: true },
      { field: "nWgtRemaining", headerName: "剩余重量", hide: true },
      { field: "cUnit", headerName: "单片钢坯", hide: true },
      { field: "cState", headerName: "铁水状态", hide: true },
      { field: "cDataAddType", headerName: "数据添加方式", hide: true },
      { field: "cMatchingStoveSign", headerName: "炉次匹配标识", hide: true },
      { field: "dAccountDate", headerName: "账务日期", hide: true },
      { field: "dTeamDate", headerName: "虚拟或占用炉号班次日期", hide: true },
      { field: "cShift", headerName: "班次", hide: true },
      { field: "cTeam", headerName: "班组", hide: true },
      { field: "cEnable", headerName: "启用", hide: true },
      { field: "cBackup", headerName: "备注", hide: true },
      { field: "dTbInTime", headerName: "铁包到达时间", hide: true },
      { field: "dTbOutTime", headerName: "铁包离开时间", hide: true },
      { field: "cTbInUser", headerName: "铁包到达确认人", hide: true },
      { field: "cTbOutUser", headerName: "铁包离开确认人", hide: true },
      { field: "dBegProTime", headerName: "脱硫开始作业时间", hide: true },
      { field: "dEndProTime", headerName: "脱硫结束作业时间", hide: true },
      { field: "dInStationMode", headerName: "脱硫到站操作方式", hide: true },
      { field: "dBegProMode", headerName: "脱硫开始作业操作方式", hide: true },
      { field: "dEndProMode", headerName: "脱硫结束作业操作方式", hide: true },
      { field: "dOutStationMode", headerName: "脱硫离站操作方式", hide: true },
      { field: "cUnitTl", headerName: "脱硫剂单位", hide: true },
      { field: "cTimestamp", headerName: "时间戳", hide: true },
      { field: "creator", headerName: "创建人", hide: true },
      { field: "createTime", headerName: "创建时间", hide: true },
      { field: "lastModifier", headerName: "最后修改人", hide: true },
      { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
      { field: "cSw01", headerName: "备用字段1", hide: true },
      { field: "cSw02", headerName: "备用字段2", hide: true },
      { field: "cSw03", headerName: "备用字段3", hide: true },
      { field: "cSw04", headerName: "备用字段4", hide: true },
      { field: "cSw05", headerName: "备用字段5", hide: true },
      { field: "cSw06", headerName: "备用字段6", hide: true },
      { field: "selected", headerName: "选择", hide: true },
      { field: "dWgtMzTime", headerName: "毛重计量时间", hide: true },
      { field: "dWgtPzTime", headerName: "皮重计量时间", hide: true },
      { field: "dWgtTime", headerName: "净重计量时间", hide: true },
      { field: "cBizNo", headerName: "凭证单号", hide: true },
      { field: "cBizType", headerName: "凭证类型", hide: true },
      { field: "cCarriertype", headerName: "载具类型", hide: true },
      { field: "cQmKrSampNo", headerName: "KR铁水质检抽检检验样号", hide: true },
      { field: "cQmSampNo", headerName: "铁水质检抽检检验样号", hide: true },
      { field: "dLgWgtMzTime", headerName: "炼钢计量毛重计量时间", hide: true },
      { field: "dLgWgtPzTime", headerName: "炼钢计量皮重计量时间", hide: true },
      { field: "dLgWgtTime", headerName: "炼钢计量净重计量时间", hide: true },
      { field: "nIntrusion", headerName: "是否倒罐", hide: true },
      { field: "nLgWgt", headerName: "炼钢计量净重", hide: true },
      { field: "nLgWgtMz", headerName: "炼钢计量毛重", hide: true },
      { field: "nLgWgtPz", headerName: "炼钢计量皮重", hide: true },
      { field: "nQmSampled", headerName: "铁水是否质检抽检取样", hide: true },
]);
/* 铁水质检信息（原 vGridControl1 Caption=铁水质检信息，绑定 FrmMS2010ViewDto_TSQM——以同列集列表呈现） */
const qcCols = ref<ColDef[]>([
        { field: "sampleNo", headerName: "试样编号", width: 112 },
      { field: "sampleType", headerName: "检验样类型", width: 125 },
      { field: "c", headerName: "C", width: 80 },
      { field: "si", headerName: "SI", width: 86 },
      { field: "mn", headerName: "MN", width: 86 },
      { field: "p", headerName: "P", width: 80 },
      { field: "s", headerName: "S", width: 80 },
      { field: "ceq", headerName: "CEQ", hide: true },
]);

/* dataLayoutControl1：焦点行编辑缓冲（保存时写回行并 saveData） */
const editRow = ref<Row | null>(null);
const form = reactive({
  cIronNo: "",
  cPotNo: "",
  dBegProTime: null as Date | null,
  dEndProTime: null as Date | null,
  nWgtTlj: null as number | null,
  cUnitTl: "",
  dAccountDateKR: null as Date | null,
  dTeamDateKR: null as Date | null,
  nLgKrTemperature: null as number | null,
  cShiftKR: "",
  cTeamKR: "",
});

/* KR班次/KR班组：ImageCombo 候选来自 MS_SHIFT/MS_GROUP 运行时字典（待接入，仅回显当前值） */
const shiftOptions = computed(() =>
  form.cShiftKR ? [{ label: form.cShiftKR, value: form.cShiftKR }] : [],
);
const teamOptions = computed(() =>
  form.cTeamKR ? [{ label: form.cTeamKR, value: form.cTeamKR }] : [],
);

function loadForm(row: Row | null) {
  editRow.value = row;
  if (!row) return;
  form.cIronNo = row.cIronNo ?? "";
  form.cPotNo = row.cPotNo ?? "";
  form.dBegProTime = toDate(row.dBegProTime);
  form.dEndProTime = toDate(row.dEndProTime);
  form.nWgtTlj = row.nWgtTlj ?? null;
  form.cUnitTl = row.cUnitTl ?? "";
  form.dAccountDateKR = toDate(row.dAccountDateKR);
  form.dTeamDateKR = toDate(row.dTeamDateKR);
  form.nLgKrTemperature = row.nLgKrTemperature ?? null;
  form.cShiftKR = row.cShiftKR ?? "";
  form.cTeamKR = row.cTeamKR ?? "";
}

function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}
function onQcReady(e: GridReadyEvent) {
  qcApi.value = e.api;
}

/** btnQuery_Click_Real → Proxy.Query(lineCode, date, getLimitedDayData) */
async function queryReal() {
  querying.value = true;
  try {
    rows.value = (await frmMS2020Api.query({
      lineCode: lineCode || undefined,
      date: fmt(deDate.value),
      getLimitedDayData: chkQueryConn1.value,
    })) ?? [];
    requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
  curRow.value = null;
  loadForm(null);
  qcRows.value = [];
}

/** gridView1_FocusedRowChanged → 绑定编辑区 + Proxy.GetTsQMInfo(tsId) */
async function onMainSelection(e: SelectionChangedEvent) {
  const row = (e.api.getSelectedRows()[0] ?? null) as Row | null;
  curRow.value = row;
  loadForm(row);
  if (!row) {
    qcRows.value = [];
    return;
  }
  qcRows.value = (await frmMS2010Api.getTsQMInfo({ tsId: row.id })) ?? [];
  requestAnimationFrame(() => qcApi.value?.autoSizeAllColumns());
}

function guardRow(): Row | null {
  return curRow.value;
}

/** btnKRBeg_Click：Doing/Done 拦截 + 确认 + SetKRBeg(id, Now, ShiftInfo) + 「执行完毕！」 */
async function onKRBeg() {
  const row = guardRow();
  if (!row) return;
  if (row.cKrState === "Doing" || row.cKrState === "Done") {
    toast("铁水已经执行过开始脱硫，无需重复操作！", 3000, "warn");
    return;
  }
  if (!window.confirm(`铁次号：‘${row.cIronNo}’，罐号：‘${row.cPotNo}’的铁水确定开始脱硫？`)) return;
  await frmMS2020Api.setKRBeg({ tsId: row.id, dateTime: fmtTs(new Date()), shiftInfo: undefined });
  await queryReal();
  toast("执行完毕！", 2000, "success");
}

/** btnKRBegCancel_Click → SetKRBegCancel */
async function onKRBegCancel() {
  const row = guardRow();
  if (!row) return;
  if (!window.confirm(`确定取消铁次号：‘${row.cIronNo}’，罐号：‘${row.cPotNo}’的铁水开始脱硫？`)) return;
  await frmMS2020Api.setKRBegCancel({ tsId: row.id });
  await queryReal();
  toast("执行完毕！", 2000, "success");
}

/** btnKREnd_Click → SetKREnd(id, Now) */
async function onKREnd() {
  const row = guardRow();
  if (!row) return;
  if (!window.confirm(`铁次号：‘${row.cIronNo}’，罐号：‘${row.cPotNo}’的铁水确定脱硫结束？`)) return;
  await frmMS2020Api.setKREnd({ tsId: row.id, dateTime: fmtTs(new Date()) });
  await queryReal();
  toast("执行完毕！", 2000, "success");
}

/** btnKREndCancel_Click → SetKREndCancel */
async function onKREndCancel() {
  const row = guardRow();
  if (!row) return;
  if (!window.confirm(`确定取消铁次号：‘${row.cIronNo}’，罐号：‘${row.cPotNo}’的铁水脱硫结束？`)) return;
  await frmMS2020Api.setKREndCancel({ tsId: row.id });
  await queryReal();
  toast("执行完毕！", 2000, "success");
}

/** btnSendQM_Click（原 Visible=false）→ 确认 → SendTSQM */
async function onSendQM() {
  const row = guardRow();
  if (!row) return;
  if (!window.confirm(`确定发送罐号为‘${row.cPotNo}’，铁次号为‘${row.cIronNo}’的铁水的质检委托？`)) return;
  await frmMS2020Api.sendTSQM({ tsId: row.id });
  await queryReal();
}

/** btnRefreshTeamInfo_Click 原 ShiftInfo.ResetShiftInfo（web 无班次模块占位） */
function onRefreshTeam() {
  toast("换班：web 端无 ShiftInfo 班次模块，暂不可用", 2500, "warn");
}

/** btnSaveKR_Click → Proxy.SaveData(编辑缓冲写回焦点行)；C# 无成功提示 */
async function onSaveKR() {
  const row = editRow.value;
  if (!row) return;
  row.cIronNo = form.cIronNo;
  row.cPotNo = form.cPotNo;
  row.dBegProTime = fmtTs(form.dBegProTime);
  row.dEndProTime = fmtTs(form.dEndProTime);
  row.nWgtTlj = form.nWgtTlj;
  row.cUnitTl = form.cUnitTl;
  row.dAccountDateKR = fmtTs(form.dAccountDateKR);
  row.dTeamDateKR = fmtTs(form.dTeamDateKR);
  row.nLgKrTemperature = form.nLgKrTemperature;
  row.cShiftKR = form.cShiftKR;
  row.cTeamKR = form.cTeamKR;
  await frmMS2020Api.saveData(row);
  mainApi.value?.refreshCells({ force: true });
}

/* 机台实时运行信息（原 groupBox1 + ucCustomplcPointShowInfo1.Init(DisplayOnly, LineCode, MachineCode)） */
const plcRows = ref<Row[]>([]);
const plcCols = ref<ColDef[]>([]);
onMounted(async () => {
  plcRows.value = (await uCCustomPLCPointShowInfoApi.query({ lineCode, machineCode })) ?? [];
  const keys = Object.keys(plcRows.value[0] ?? {});
  plcCols.value = keys.map((k) => ({ field: k, headerName: k, minWidth: 80 } as ColDef));
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 操作行（原 stackPanel1 Dock=Top） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="deDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <Checkbox v-model="chkQueryConn1" binary inputId="chkConn1" />
      <label for="chkConn1" class="shrink-0 text-xs text-muted-foreground">仅查询当天铁水</label>
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="queryReal">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onKRBeg">脱硫开始</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onKRBegCancel">取消开始</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onKREnd">脱硫结束</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onKREndCancel">取消结束</Button>
      <Button text v-show="false" class="shrink-0 whitespace-nowrap" @click="onSendQM">发送质检</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onRefreshTeam">换班</Button>
    </div>

    <!-- 占位控件行（原 stackPanel2 Visible=false：textEdit1「占位控件」，元素保留隐藏） -->
    <div v-show="false" class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <InputText model-value="占位控件" disabled class="w-24 shrink-0" />
    </div>

    <!-- 上下分栏：gridControl1(Fill) + splitterControl1 + panel1(Bottom,320px ≈ 55/45) -->
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="55" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">脱硫铁水信息</span>
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
      <SplitterPanel :size="45" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- panel1(Dock=Bottom) 内左右三分：vGrid(Dock=Left) | dataLayout(Dock=Left) | groupBox(Fill) -->
        <Splitter layout="horizontal" class="min-h-0 flex-1">
          <SplitterPanel :size="30" :minSize="15" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">铁水质检信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="qcCols"
                :row-data="qcRows"
                :pagination="false"
                @grid-ready="onQcReady"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
          <SplitterPanel :size="35" :minSize="15" class="flex flex-col overflow-hidden">
            <!-- dataLayoutControl1：11 个绑定字段 + btnSaveKR -->
            <div class="min-h-0 flex-1 overflow-y-auto p-2">
              <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">铁次号</label>
                  <InputText v-model="form.cIronNo" class="w-full min-w-0" />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">罐号</label>
                  <InputText v-model="form.cPotNo" class="w-full min-w-0" />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">脱硫开始作业时间</label>
                  <DatePicker
                    v-model="form.dBegProTime"
                    :manual-input="false"
                    show-time
                    hour-format="24"
                    date-format="yy-mm-dd"
                    show-icon
                    class="w-full min-w-0"
                  />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">脱硫结束作业时间</label>
                  <DatePicker
                    v-model="form.dEndProTime"
                    :manual-input="false"
                    show-time
                    hour-format="24"
                    date-format="yy-mm-dd"
                    show-icon
                    class="w-full min-w-0"
                  />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">脱硫剂添加量</label>
                  <InputNumber
                    v-model="form.nWgtTlj"
                    :show-buttons="false"
                    :min-fraction-digits="0"
                    :max-fraction-digits="3"
                    fluid
                    class="w-full min-w-0"
                  />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">脱硫剂单位</label>
                  <InputText v-model="form.cUnitTl" class="w-full min-w-0" />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">KR账务日期</label>
                  <DatePicker
                    v-model="form.dAccountDateKR"
                    :manual-input="false"
                    date-format="yy-mm-dd"
                    show-icon
                    class="w-full min-w-0"
                  />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">KR班次日期</label>
                  <DatePicker
                    v-model="form.dTeamDateKR"
                    :manual-input="false"
                    date-format="yy-mm-dd"
                    show-icon
                    class="w-full min-w-0"
                  />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">炼钢KR测温</label>
                  <InputNumber
                    v-model="form.nLgKrTemperature"
                    :show-buttons="false"
                    :min-fraction-digits="0"
                    :max-fraction-digits="2"
                    fluid
                    class="w-full min-w-0"
                  />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">KR班次</label>
                  <Select
                    v-model="form.cShiftKR"
                    :options="shiftOptions"
                    option-label="label"
                    option-value="value"
                    class="w-full min-w-0"
                  />
                </div>
                <div class="min-w-0 space-y-1">
                  <label class="text-xs text-muted-foreground">KR班组</label>
                  <Select
                    v-model="form.cTeamKR"
                    :options="teamOptions"
                    option-label="label"
                    option-value="value"
                    class="w-full min-w-0"
                  />
                </div>
              </div>
            </div>
            <div class="flex h-9 shrink-0 items-center gap-1 border-t border-border/60 px-2">
              <Button text class="shrink-0 whitespace-nowrap" :disabled="!editRow" @click="onSaveKR">保存</Button>
            </div>
          </SplitterPanel>
          <SplitterPanel :size="35" :minSize="15" class="flex flex-col overflow-hidden">
            <!-- groupBox1「机台实时运行信息」(Dock=Fill) 内 ucCustomplcPointShowInfo1 -->
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">机台实时运行信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="plcCols"
                :row-data="plcRows"
                :pagination="false"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
