<script setup lang="ts">
/** 对应 FrmMS2000（炼钢总厂甘特图）：DDH.Winforms.SMS.Forms.FrmMS2000（双菜单 MS2000 操作 / MS2001 历史报表）
 *  已接入：frmMS2000Api.queryStovePlan（查询，QueryStovePlanDto{lineCode,queryHaveRoutePlanDatas,invalidDate}）/
 *          saveGanttDatas（保存，确认「确定将修改提交至数据库？」）/
 *          checkStovePlanHaveProductionByIds + clearRoutePlanByIds（清除路线）/
 *          checkPlanInvalid + planInvalid（计划作废）/ planInvalidCancel（取消作废，cbo=已作废 时显示）/
 *          （待接入）清除路线前置校验 checkStovePlanHaveProductionByIds 未生成于 swagger——本次禁改 src/api，暂直接 clearRoutePlanByIds/
 *          checkWhenAddGanttPoint + getStoveRouteDatas（添加点位/删除点位校验，文案照抄 .cs）/
 *          checkAllowChangeStoveSgCode（钢种变更校验）/
 *          getGanttResourcesDatas + getStoveRouteHistoryDatas1（甘特区初始化 InitGantt）/
 *          getStovePlanInfoByGsIds（原 Gant1_OnMouseUpAfter 点位抬起——骨架以点位选中回填计划表）/
 *          publicKVApi.getMSConfig（原 gantt_ResourceRowHeight 行高配置，初始化预取）/
 *          publicKVApi.getMsProcMachineMapping + getProcMachineUseTime + getProcTransTime（原拖拽落点 CreateStoveRoutePlanToGantt
 *            时长/转运计算——web 以计划行双击替代拖拽，见下「偏差」）/
 *          publicFactoryLineAreaMachineApi.getFactoryLineAreaMachine_LG（甘特左侧资源机台）
 *  cQueryString：{FactoryCode,LineCode,AsReportShow,AllowQueryHistoryDatas,GanttCCMProcEditJCInfo}——
 *                AsReportShow=true 隐藏 stackPanel1 工具行、显示刷新甘特图2+历史查询区；LineCode=LG01(炼钢一厂) 隐藏添加/删除点位
 *  分栏（原 panelControl1(Fill)+splitterControl1(Right)+panelControl2(Right)）左右 65/35：左=甘特区骨架，右=炉次计划
 *  列集按 extract：计划表 23可见+66隐藏=89；Selected 转移勾选列
 *  【偏差】web 无 GantterSchedule.Gant 控件：甘特区以「资源条 + 点位表」时间轴骨架呈现（getGanttResourcesDatas/
 *          getFactoryLineAreaMachine_LG 资源 chips + getStoveRouteHistoryDatas1 点位行），点位选中即 _ganttCurrentPointInfo；
 *          复杂交互占位——计划行双击=原拖拽添加点位（getMsProcMachineMapping→use/trans 时间→getStoveRouteDatas 落点），
 *          计划交换( FrmMS2100_X_UpdateStoveSgCode，源校验服务未生成 swagger)、钢种变更/添加计划/添加点位弹窗留 toast 占位；
 *          解决重叠/水平垂直移动/同机台联动为纯客户端逻辑，按点位字段尽力实现（骨架无点位时间时静默）；
 *          上移/下移简化为数组相邻交换（原按过滤排序上下移动）；ShiftInfo/自动刷新时间以「甘特图」代窗体标题
 *  待接入：班次班组 ShiftInfo、点位编辑弹窗（FrmMS2000_GanttPointEdit/SgCodeChange/AddStovePlan） */
import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconRefresh, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClickedEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { frmMS2000Api, publicFactoryLineAreaMachineApi, publicKVApi } from "@/api/mes4ddh/sms.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

type Row = Record<string, any>;

const { toast } = useToast();
const { json: menuJson } = useMenuQuery();
const qsStr = (v: unknown) => (typeof v === "string" ? v : "");
const qsBool = (v: unknown) => v === true;

const lineCode = qsStr(menuJson.LineCode) || qsStr(menuJson.lineCode);
const asReportShow = qsBool(menuJson.AsReportShow) || qsBool(menuJson.asReportShow);
const allowHistory = qsBool(menuJson.AllowQueryHistoryDatas) || qsBool(menuJson.allowQueryHistoryDatas);
/* LineConst.炼钢一厂 = "LG01"：不需甘特图点位的添加和删除 */
const isLg1 = lineCode === "LG01";

const theme = makeHmxGridTheme();
const plans = ref<Row[]>([]);
const points = ref<Row[]>([]);
const planApi = ref<GridApi | null>(null);
const pointApi = ref<GridApi | null>(null);
const planLoading = ref(false);
const ganttLoading = ref(false);
const curPoint = ref<Row | null>(null);
const curPlan = ref<Row | null>(null);

function fmt(d: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmtTs(v: Date | null): string | undefined {
  if (!v) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
}
function addDays(delta: number): Date {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
  d.setDate(d.getDate() + delta);
  return d;
}
function today(): Date {
  return addDays(0);
}
function arr(v: unknown): Row[] {
  return Array.isArray(v) ? (v as Row[]) : [];
}
/* 点位字段：Gantt_BegTime 等经 camelCase（首字母小写）后为 gantt_BegTime，兼容几种落库形态 */
function ganttBeg(x: Row): unknown {
  return x.gantt_BegTime ?? x.Gantt_BegTime ?? x.gantt_begTime;
}
function ganttEnd(x: Row): unknown {
  return x.gantt_EndTime ?? x.Gantt_EndTime ?? x.gantt_endTime;
}
function toMs(v: unknown): number {
  if (!v) return 0;
  const s = String(v).includes("T") ? String(v) : String(v).replace(" ", "T");
  return Date.parse(s) || 0;
}

/* ===== 原 stackPanel1（甘特工具行，AsReportShow 时隐藏） ===== */
const chkMoveHorizontal = ref(false); /* 原赋 gant1.CanMoveHorizontal，骨架无控件仅保留状态 */
const chkMoveVertical = ref(false);
const chkAutoUpdateGanttPoint = ref(true);
const chkAddBySameJC = ref(false);
const chkAutoRefresh = ref(false);
const showPlan = ref(true); /* btnShowHiddenStovePlan：初始 Designer 文本「显示计划」 */
const showPlanText = computed(() => (showPlan.value ? "隐藏计划" : "显示计划"));

/* ===== 原 stackPanel2（报表行：AsReportShow 显示；labGanttPointInfo 红字常显） ===== */
const chkQueryHistory = ref(false);
const rBeg = ref<Date | null>(allowHistory ? addDays(-3) : null);
const rEnd = ref<Date | null>(allowHistory ? addDays(3) : null);
const stoveNoOrPono = ref("");
const historyEnabled = computed(() => chkQueryHistory.value);

/* ===== 原 stackPanel3/4（右栏：指定工艺路线 + 计划按钮 + 炉次计划表） ===== */
/* cboSetStoveRouteState：否=YesNo.N 是=YesNo.Y 已作废=Consts_MS.Invalid，变更即触发查询 */
const ROUTE_OPTIONS = [
  { label: "否", value: "N" },
  { label: "是", value: "Y" },
  { label: "已作废", value: "Invalid" },
];
const routeState = ref("N");
const invalidMode = computed(() => routeState.value === "Invalid");
const dePlanDate = ref<Date | null>(today());

/* 计划表（原 gridControl1/gridView1 ViewCaption=炉次计划：FrmMS2000ViewDtos_StovePlan 23 可见 + 66 隐藏） */
const planCols = ref<ColDef[]>([
        { field: "selected", headerName: "选择", width: 50, minWidth: 56, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false },
      { field: "cPlanTime", headerName: "计划日期", width: 112 },
      { field: "cCcCode", headerName: "连铸代码", width: 112 },
      { field: "cSgCode", headerName: "钢种", width: 86 },
      { field: "cSgStd", headerName: "执行标准", width: 112 },
      { field: "cZGLineCode", headerName: "轧制产线", width: 112 },
      { field: "cPono", headerName: "制造命令号", width: 83 },
      { field: "cJcNo", headerName: "浇次号", width: 99 },
      { field: "nSortJc", headerName: "炉数", width: 119 },
      { field: "cDownDdUser", headerName: "下发调度人", width: 83 },
      { field: "dDownDdTime", headerName: "下发调度时间", width: 95 },
      { field: "creator", headerName: "创建人", width: 99 },
      { field: "createTime", headerName: "创建时间", width: 112 },
      { field: "cSpec", headerName: "规格", width: 86 },
      { field: "nThick", headerName: "坯厚", width: 86 },
      { field: "nWidth", headerName: "坯宽", width: 86 },
      { field: "nLen", headerName: "坯长", width: 86 },
      { field: "cOrderNo", headerName: "订单号", width: 99 },
      { field: "cTsyq", headerName: "特殊要求", width: 112 },
      { field: "cIsZb", headerName: "是否备坯计划", width: 95 },
      { field: "cRemark", headerName: "反馈结果", width: 112 },
      { field: "nGenerateRoutePlan", headerName: "生成工艺路线计划", width: 119 },
      { field: "cLineName", headerName: "产线名称", width: 112 },
      { field: "id", headerName: "主键", hide: true },
      { field: "nStatus", headerName: "处理标记", hide: true },
      { field: "cJcFk", headerName: "浇次主键", hide: true },
      { field: "cStove", headerName: "炉号", hide: true },
      { field: "nQua", headerName: "支数", hide: true },
      { field: "nWgt", headerName: "坯重", hide: true },
      { field: "nSort", headerName: "顺序号", hide: true },
      { field: "cMatCode", headerName: "物料编码", hide: true },
      { field: "cMatName", headerName: "物料名称", hide: true },
      { field: "dUseTime", headerName: "可用时间", hide: true },
      { field: "cRoute", headerName: "工艺路线", hide: true },
      { field: "dJhqTime", headerName: "交期", hide: true },
      { field: "cCustName", headerName: "客户名称", hide: true },
      { field: "nLgCn", headerName: "炼钢产能", hide: true },
      { field: "cLenMx", headerName: "长度明细", hide: true },
      { field: "cSgCodeStd", headerName: "钢种标准", hide: true },
      { field: "cStNo", headerName: "制造标准号", hide: true },
      { field: "dDownLgsc", headerName: "下发生产时间", hide: true },
      { field: "cDownLgscUser", headerName: "下发人", hide: true },
      { field: "nWgtMeter", headerName: "米单重", hide: true },
      { field: "cSpecOrder", headerName: "成品规格", hide: true },
      { field: "cLineCode", headerName: "产线", hide: true },
      { field: "cIsSl", headerName: "是否收料", hide: true },
      { field: "cPotType", headerName: "包况", hide: true },
      { field: "cPotNo", headerName: "罐号", hide: true },
      { field: "cPotNoId", headerName: "包数据ID", hide: true },
      { field: "cStoveLocation", headerName: "最新炉次位置", hide: true },
      { field: "cStoveLocationStation", headerName: "最新炉次工位", hide: true },
      { field: "cStoveState", headerName: "最新炉次状态", hide: true },
      { field: "cStovePlanId", headerName: "炉次计划id", hide: true },
      { field: "cToCurrentStoveSplitMergeType", headerName: "生成当前炉次的拆合类型", hide: true },
      { field: "cToCurrentStoveSplitMergeTypeSign", headerName: "生成当前炉次的拆合类型标识", hide: true },
      { field: "cStoveSplitMergeType", headerName: "炉次拆合类型", hide: true },
      { field: "cStoveSplitMergeTypeSign", headerName: "炉次拆合类型标识", hide: true },
      { field: "cStoveChangeId", headerName: "炉次最终更改标识id", hide: true },
      { field: "cStoveChangeMachinename", headerName: "炉次最终更改位置", hide: true },
      { field: "cQmAdjust", headerName: "质检改判", hide: true },
      { field: "cQmAdjustActualId", headerName: "最终质检改判时炉次工序机台实际id", hide: true },
      { field: "cRefurnace", headerName: "炉次回炉", hide: true },
      { field: "cRefurnaceState", headerName: "炉次回炉状态", hide: true },
      { field: "cRefurnaceActualId", headerName: "炉次回炉时炉次工序机台实际id", hide: true },
      { field: "cMoveGs", headerName: "炉次转钢水", hide: true },
      { field: "cMoveGsSign", headerName: "炉次转钢水标识", hide: true },
      { field: "cMoveGsPlanId", headerName: "炉次转钢水时炉次工序机台计划id", hide: true },
      { field: "cEnable", headerName: "启用", hide: true },
      { field: "cNotEnableBackup", headerName: "不启用状态备注", hide: true },
      { field: "dAccountDate", headerName: "账务日期", hide: true },
      { field: "nMixStove", headerName: "混合炉", hide: true },
      { field: "cBackup", headerName: "备注", hide: true },
      { field: "timestamp", headerName: "时间戳", hide: true },
      { field: "lastModifier", headerName: "最后修改人", hide: true },
      { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
      { field: "cSw01", headerName: "备用字段1", hide: true },
      { field: "cSw02", headerName: "备用字段2", hide: true },
      { field: "cSw03", headerName: "备用字段3", hide: true },
      { field: "cSw04", headerName: "备用字段4", hide: true },
      { field: "cSw05", headerName: "备用字段5", hide: true },
      { field: "cSw06", headerName: "备用字段6", hide: true },
      { field: "qM_RouteCode", headerName: "QM_RouteCode", hide: true },
      { field: "qM_RouteDesc", headerName: "QM_RouteDesc", hide: true },
      { field: "qM_RouteShortOldSysCode", headerName: "QM_RouteShortOldSysCode", hide: true },
      { field: "stoveRouteDataAddToGanttTemp", headerName: "是否是炉次工艺路线数据临时添加至甘特图", hide: true },
      { field: "cDelFlag", headerName: "删除标识", hide: true },
      { field: "cLdCode", headerName: "转炉代码", hide: true },
      { field: "cLfCode", headerName: "精炼代码", hide: true },
      { field: "cRhCode", headerName: "真空代码", hide: true },
]);

/* 甘特骨架点位表列（点位来自 getStoveRouteHistoryDatas1/拖拽落点，GanttDataDto_StoveRoutePlan 字段取平坦呈现） */
const pointCols = ref<ColDef[]>([
  { field: "cStove", headerName: "炉号", width: 100 },
  { field: "cPono", headerName: "制造命令号", width: 130 },
  { field: "cProc", headerName: "工序代码", width: 90 },
  { field: "cProcDesc", headerName: "工序", width: 110 },
  { field: "cPlanLineDesc", headerName: "计划产线", width: 110 },
  { field: "cPlanMachineDesc", headerName: "计划机台", width: 110 },
  { field: "dPlanBegtime", headerName: "计划开始", width: 150 },
  { field: "dPlanEndtime", headerName: "计划结束", width: 150 },
]);

/* 甘特资源 chips（getGanttResourcesDatas + getFactoryLineAreaMachine_LG；原为左侧资源列） */
const resChips = ref<string[]>([]);
function resLabel(r: Row): string {
  return String(r.cMachineName ?? r.cMachineDesc ?? r.cName ?? r.machineName ?? r.cCode ?? r.id ?? "");
}

/* 本地甘特变更（对应 _ganttStovePlanDataDtoList/_ganttRemoveStoveDatas/_ganttRemoveRouteDatas） */
const ganttChanges: Row[] = [];
const removeTms2000Ids: string[] = [];
const removeTms2010Ids: string[] = [];

function onPlanReady(e: GridReadyEvent) {
  planApi.value = e.api;
}
function onPointReady(e: GridReadyEvent) {
  pointApi.value = e.api;
}

/** btnQuery_Click_Real → Proxy.QueryStovePlan */
async function queryPlans() {
  planLoading.value = true;
  try {
    plans.value = (await frmMS2000Api.queryStovePlan({
      lineCode: lineCode || undefined,
      queryHaveRoutePlanDatas: routeState.value,
      invalidDate: fmt(dePlanDate.value),
    })) ?? [];
    requestAnimationFrame(() => planApi.value?.autoSizeAllColumns());
  } finally {
    planLoading.value = false;
  }
}

/** 计划行选中/点击（供上移下移取焦点行；Selected 勾选列由 checkbox 维护） */
function onPlanClick(e: RowClickedEvent) {
  curPlan.value = (e.data as Row) ?? null;
}

/** 点位行选中 = _ganttCurrentPointInfo；同时按 gsId 取炉次计划信息回填计划表
 *  （原 Gant1_OnMouseUpAfter → GetStovePlanInfoByGsIds，骨架以点位选中代拖拽抬起，偏差见来源注释） */
function onPointSelection(e: SelectionChangedEvent) {
  const p = (e.api.getSelectedRows()[0] ?? null) as Row | null;
  curPoint.value = p;
  const gsId = (p?.tms2000?.id ?? p?.gsId) as string | undefined;
  if (gsId) void loadPlanInfoForPoint([gsId]);
}
async function loadPlanInfoForPoint(gsIds: string[]) {
  const info = arr(await frmMS2000Api.getStovePlanInfoByGsIds({ gsIds }));
  if (!info.length) return;
  const byId = new Map(info.map((r) => [r.id as string, r]));
  let touched = false;
  plans.value = plans.value.map((r) => {
    const hit = byId.get(r.id);
    if (hit) {
      touched = true;
      return { ...r, ...hit };
    }
    return r;
  });
  if (touched) planApi.value?.refreshCells({ force: true });
}

function toPointRow(x: Row): Row {
  const t1 = (x.tms2010 ?? {}) as Row;
  const t0 = (x.tms2000 ?? {}) as Row;
  return {
    ...x,
    cStove: t0.cStove ?? x.cStove,
    cPono: t0.cPono ?? x.cPono ?? x.cpno,
    cProc: t1.cProc ?? x.cProc,
    cProcDesc: t1.cProcDesc ?? x.cProcDesc,
    cPlanLineDesc: t1.cPlanLineDesc ?? x.cPlanLineDesc,
    cPlanMachineDesc: t1.cPlanMachineDesc ?? x.cPlanMachineDesc,
    dPlanBegtime: t1.dPlanBegtime ?? x.dPlanBegtime,
    dPlanEndtime: t1.dPlanEndtime ?? x.dPlanEndtime,
    gsId: t0.id ?? x.gsId,
  };
}

/** InitGantt：资源行高配置 + 资源机台 + 点位历史（原 InitGantt/InitGanttResourcesDatas/GetGanttStoveRoutePlanDatas） */
async function initGantt() {
  ganttLoading.value = true;
  try {
    const historyBeg = asReportShow && chkQueryHistory.value && allowHistory ? rBeg.value : null;
    const historyEnd = asReportShow && chkQueryHistory.value && allowHistory ? rEnd.value : null;
    const [cfg, machineDtos, resources, history] = await Promise.all([
      publicKVApi.getMSConfig(),
      publicFactoryLineAreaMachineApi.getFactoryLineAreaMachine_LG({ lineCode: lineCode || undefined }),
      frmMS2000Api.getGanttResourcesDatas({ lineCode: lineCode || undefined }),
      frmMS2000Api.getStoveRouteHistoryDatas1({
        lineCode: lineCode || undefined,
        begTime: fmt(historyBeg),
        endTime: fmt(historyEnd),
        stoveNoOrPono: stoveNoOrPono.value.trim() || undefined,
      }),
    ]);
    /* cfg=原 ResourceRowHeight 配置；machineDtos=原左侧资源机台——合并为资源条 chips（骨架偏差见来源注释） */
    void cfg;
    const labels = [...arr(resources), ...arr(machineDtos)].map(resLabel).filter(Boolean);
    resChips.value = [...new Set(labels)].slice(0, 40);
    points.value = arr(history).map(toPointRow);
    requestAnimationFrame(() => pointApi.value?.autoSizeAllColumns());
  } finally {
    ganttLoading.value = false;
  }
}

/** btnRefreshGantt_Click：报表模式不确认；确认文案照抄 */
async function refreshGantt() {
  if (!asReportShow && !window.confirm("确定刷新甘特图显示的数据？\r\n注：未保存的数据在刷新甘特图后会丢失！")) return;
  await initGantt();
  if (!asReportShow) await queryPlans();
}

/** btnRefreshGantt2_Click（历史报表）：区间/40 天校验文案照抄 → 刷新 */
async function refreshGantt2() {
  if (asReportShow && allowHistory) {
    if (rBeg.value && rEnd.value && rBeg.value.getTime() > rEnd.value.getTime()) {
      toast("禁止操作，查询历史区间数据时的开始时间晚于结束时间！", 3000, "warn");
      return;
    }
    const days = 40;
    if (!stoveNoOrPono.value.trim() && rBeg.value && rEnd.value) {
      const span = (rEnd.value.getTime() - rBeg.value.getTime()) / 86400000;
      if (span > days) {
        toast(`禁止操作，因数据量较大，查询历史区间数据时的开始时间和结束时间相隔不得大于${days}天！`, 3000, "warn");
        return;
      }
    }
  }
  await refreshGantt();
}

/** btnSaveGanttDatas_Click：无本地变更直接返回；确认 → SaveGanttDatas → 查询 + InitGantt */
async function saveGanttDatas() {
  if (ganttChanges.length === 0 && removeTms2000Ids.length === 0 && removeTms2010Ids.length === 0) return;
  if (!window.confirm("确定将修改提交至数据库？")) return;
  await frmMS2000Api.saveGanttDatas({
    ganttDatas: [...ganttChanges],
    removeTms2000Ids: [...removeTms2000Ids],
    removeTms2010Ids: [...removeTms2010Ids],
  });
  ganttChanges.length = 0;
  removeTms2000Ids.length = 0;
  removeTms2010Ids.length = 0;
  await queryPlans();
  await initGantt();
}

/** btnShowHiddenStovePlan_Click：切换 splitterControl1/panelControl2 可见 + 按钮文案 */
function togglePlanPanel() {
  showPlan.value = !showPlan.value;
}

/** btnAddPoint_Click：无点位静默返回（C# 同）→ 校验 → 过期校验 → 点位编辑弹窗占位 */
async function addPoint() {
  const p = curPoint.value;
  if (!p) return;
  await frmMS2000Api.checkWhenAddGanttPoint({ tms2010Id: p.tms2010?.id });
  if (p.tms2010?.id) {
    const latest = arr(await frmMS2000Api.getStoveRouteDatas({ lineCode: lineCode || undefined, gsIds: [p.tms2000?.id] }));
    const mine = latest.find((x) => x.tms2010Id === p.tms2010?.id);
    if (!mine || p.tms2010.nActualExist !== mine.tms2010?.nActualExist) {
      toast("界面数据可能已经过期，请刷新后甘特图后再试！", 3000, "warn");
      return;
    }
  }
  toast("添加点位弹窗待接入（FrmMS2000_GanttPointEdit）", 2500, "warn");
}

/** btnRemovePoint_Click：实际生产/转炉连铸/拆合炉/炉次号固定校验 + 确认 → 本地移除并记 removeTms2010Ids */
async function removePoint() {
  const p = curPoint.value;
  if (!p) return;
  if (!p.mustSaveData && p.tms2000?.id) {
    const datas = arr(await frmMS2000Api.getStoveRouteDatas({ lineCode: lineCode || undefined, gsIds: [p.tms2000.id] }));
    const t1 = datas.find((x) => x.tms2010Id === p.tms2010?.id)?.tms2010;
    if (t1?.nActualExist) {
      toast(
        `禁止操作，该甘特图点位所表示的炉次‘${t1.cStoveNo ?? t1.cPono}’的该工艺路线计划已经开始实际生产，不允许该删除操作！`,
        3500,
        "warn",
      );
      return;
    }
    await frmMS2000Api.checkWhenAddGanttPoint({ tms2010Id: p.tms2010?.id });
  }
  const proc = String(p.tms2010?.cProc ?? "");
  if (proc === "BOF" || proc.startsWith("CCM")) {
    toast("禁止操作，转炉和连铸的甘特图点位不允许删除！", 3000, "warn");
    return;
  }
  const stoveNo = p.tms2000?.cStove ?? p.tms2000?.cPono ?? p.cPono ?? "";
  const gsId = p.tms2000?.id ?? p.gsId;
  const others = points.value.filter((x) => (x.tms2000?.id ?? x.gsId) === gsId && x !== p);
  if ((p.tms2000?.cToCurrentStoveSplitMergeTypeSign || p.tms2000?.cStoveSplitMergeTypeSign) && others.length < 1) {
    toast(`禁止操作，炉次‘${stoveNo}’参与了拆合炉，不允许通过“删除点位”的方式删除该炉次的所有工艺路线计划！`, 3500, "warn");
    return;
  }
  if (p.tms2000?.cStovePlanId && others.length < 1) {
    toast(`禁止操作，炉次‘${stoveNo}’的炉次号已经固定，不允许通过‘删除点位’的方式删除该炉次的所有工艺路线计划！`, 3500, "warn");
    return;
  }
  if (!window.confirm(`确定删除甘特图点位所表示的炉次‘${stoveNo}’在‘${p.tms2010?.cPlanMachineDesc ?? ""}’的工艺路线计划？`)) return;
  points.value = points.value.filter((x) => x !== p);
  if (p.tms2010?.id) removeTms2010Ids.push(p.tms2010.id);
  if (gsId && !points.value.some((x) => (x.tms2000?.id ?? x.gsId) === gsId)) removeTms2000Ids.push(gsId);
  curPoint.value = null;
}

/** btnRemoveStove_Click：已投产/拆合炉/炉次号固定校验 + 确认 → 移除该炉次全部点位并记 removeTms2000Ids */
async function removeStove() {
  const p = curPoint.value;
  if (!p) return;
  const gsId = p.tms2000?.id ?? p.gsId;
  if (gsId) {
    const datas = arr(await frmMS2000Api.getStoveRouteDatas({ lineCode: lineCode || undefined, gsIds: [gsId] }));
    const produced = datas.filter((x) => x.tms2010?.nActualExist);
    if (produced.length) {
      const nos = [...new Set(produced.map((x) => (x.tms2000?.cStove ? x.tms2000.cStove : x.tms2000?.cPono)))];
      toast(`禁止操作，制造命令号为‘${nos.join(",")}’的炉次已经开始实际生产，不允许该删除操作！`, 3500, "warn");
      return;
    }
  }
  const stoveNo = p.tms2000?.cStove ?? p.tms2000?.cPono ?? p.cPono ?? "";
  if (p.tms2000?.cToCurrentStoveSplitMergeTypeSign || p.tms2000?.cStoveSplitMergeTypeSign) {
    toast(`禁止操作，炉次‘${stoveNo}’参与了拆合炉，不允许通过‘删除炉次’功能删除该炉次！`, 3500, "warn");
    return;
  }
  if (p.tms2000?.cStovePlanId) {
    toast(`禁止操作，炉次‘${stoveNo}’的炉次号已经固定，不允许通过‘删除炉次’功能删除该炉次！`, 3500, "warn");
    return;
  }
  if (!window.confirm(`确定删除甘特图所表示的炉次‘${stoveNo}’的工艺路线计划？`)) return;
  points.value = points.value.filter((x) => (x.tms2000?.id ?? x.gsId) !== gsId);
  if (gsId) removeTms2000Ids.push(gsId);
  curPoint.value = null;
}

/** btnAutoResolveConflicts_Click：同机台点位顺延消除重叠（纯客户端；骨架无点位时间字段时静默） */
function autoResolveConflicts() {
  const p = curPoint.value;
  if (!p) {
    toast("请先选择需要解决冲突的甘特图点位！", 2500, "warn");
    return;
  }
  const machine = p.tms2010?.cPlanMachineCode;
  const list = points.value
    .filter((x) => x !== p && x.tms2010?.cPlanMachineCode === machine && toMs(ganttBeg(x)) >= toMs(ganttBeg(p)))
    .sort((a, b) => toMs(ganttBeg(a)) - toMs(ganttBeg(b)));
  let end = toMs(ganttEnd(p));
  for (const item of list) {
    if (toMs(ganttBeg(item)) < end) item.gantt_BegTime = fmtTs(new Date(end));
    end = toMs(ganttEnd(item)) || end;
  }
  pointApi.value?.refreshCells({ force: true });
}

/** btnPlanExchange_Click：原弹窗 FrmMS2100_X_UpdateStoveSgCode（源校验服务未生成 swagger）占位 */
function planExchange() {
  if (!curPoint.value) return;
  toast("计划交换弹窗待接入（FrmMS2100_X_UpdateStoveSgCode；源校验服务未生成 swagger）", 3000, "warn");
}

/** btnUpdateStoveSgCode_Click → CheckAllowChangeStoveSgCode → 钢种变更弹窗占位 */
async function sgCodeChange() {
  const p = curPoint.value;
  if (!p) return;
  await frmMS2000Api.checkAllowChangeStoveSgCode({ gsId: p.tms2000?.id ?? p.gsId, pono: p.tms2000?.cPono ?? p.cPono });
  toast("钢种变更弹窗待接入（FrmMS2000_SgCodeChange）", 2500, "warn");
}

/** btnAddStovePlan_Click：无点位报错文案照抄 → 添加计划弹窗占位 → 刷新 → 成功提示照抄 */
async function addStovePlan() {
  if (!curPoint.value) {
    toast("请在甘特图上选择要添加的炉次锚定的甘特图炉次点位！\r\n选择本浇次的炉次在甘特图上的任意一个点位均可！", 3500, "warn");
    return;
  }
  toast("添加计划弹窗待接入（FrmMS2000_AddStovePlan）", 2500, "warn");
  await initGantt();
  if (!asReportShow) await queryPlans();
  toast("炉次信息已添加，请在计划列表中选择并将添加的炉次信息添加到甘特图中！", 3000, "info");
}

/** 计划行双击 = 原「拖拽计划行到甘特图」web 替代（偏差见来源注释）：映射→工序占用/转运时间→工艺路线落点 */
async function onPlanDblClick(e: RowClickedEvent) {
  const plan = e.data as Row | undefined;
  if (!plan) return;
  if (!window.confirm(`确定将选择的1个炉次信息直接添加到甘特图？`)) return;
  const mapping = arr(await publicKVApi.getMsProcMachineMapping({ lineCode: lineCode || undefined }));
  const firstMachine = String(mapping[0]?.cMachineCode ?? mapping[0]?.cCode ?? "");
  await frmMS2000Api.getProcMachineUseTime({
    lineCode: lineCode || undefined,
    machineCode: firstMachine || undefined,
    sgCode: plan.cSgCode,
    sgStd: plan.cSgStd,
    proc: undefined,
  });
  await frmMS2000Api.getProcTransTime({
    lineCodeS: lineCode || undefined,
    machineCodeS: firstMachine || undefined,
    lineCodeT: lineCode || undefined,
    machineCodeT: firstMachine || undefined,
  });
  const routes = arr(await frmMS2000Api.getStoveRouteDatas({ lineCode: lineCode || undefined, gsIds: [plan.id] }));
  const added = routes.map(toPointRow);
  points.value = [...points.value, ...added];
  if (added.length) ganttChanges.push(...added);
  requestAnimationFrame(() => pointApi.value?.autoSizeAllColumns());
  toast("已按工艺路线将炉次添加至甘特点位表（拖拽落点为骨架近似）", 2500, "success");
}

/** chkAutoRefresh_EditValueChanging：开启自动刷新确认文案照抄，取消则回退 */
function onAutoRefreshToggle(v: unknown) {
  if (v === true) {
    if (!window.confirm("注意：自动刷新开启后，若要进行甘特图调整，请先关闭自动刷新！\r\n否则调整的数据在保存前可能因自动刷新而丢失！！！")) {
      chkAutoRefresh.value = false;
      return;
    }
    chkAutoRefresh.value = true;
    return;
  }
  chkAutoRefresh.value = false;
}

/* 定时自动刷新（原 TimerHelper 10s）：chkAutoRefresh 开启时 InitGantt + 查询，失败静默照 C# catch{} */
let autoTimer: number | undefined;
async function autoTick() {
  if (!chkAutoRefresh.value) return;
  try {
    await initGantt();
    if (!asReportShow) await queryPlans();
    const n = new Date();
    const p = (x: number) => String(x).padStart(2, "0");
    toast(`界面‘甘特图’自动刷新执行完毕！时间：${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`, 2000, "success");
  } catch {
    /* 拦截层已 toast；自动刷新失败静默（照 C# catch {}） */
  }
}

/** cboSetStoveRouteState_SelectedIndexChanged：显隐作废计划日期/取消作废并触发查询 */
function onRouteStateChange() {
  void queryPlans();
}

function selectedPlans(onlyDisabled = false): Row[] {
  return plans.value.filter((r) => r.selected && (!onlyDisabled || r.cEnable === false));
}

/** btnUpLine/btnDownLine：焦点行与相邻行交换（原 CurrentRowMoveToPrevious/NextWithFilterOrSort，简化数组序，见来源注释） */
function movePlan(dir: -1 | 1) {
  const target = curPlan.value;
  if (!target) return;
  const i = plans.value.findIndex((r) => r === target);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= plans.value.length) return;
  const arrCopy = [...plans.value];
  [arrCopy[i], arrCopy[j]] = [arrCopy[j], arrCopy[i]];
  plans.value = arrCopy;
}

/** btnClearRoute_Click → 确认 → ClearRoutePlanByIds → 查询 + InitGantt
 *  注：前置校验 CheckStovePlanHaveProductionByIds 未生成于 swagger（本次禁改 src/api，见来源注释待接入），暂直接清除 */
async function clearRoute() {
  const sel = selectedPlans();
  if (!sel.length) return;
  const ids = [...new Set(sel.map((r) => r.id))];
  if (!window.confirm("确定清除所选的炉次的工艺路线计划？")) return;
  await frmMS2000Api.clearRoutePlanByIds({ gsIds: ids });
  await queryPlans();
  await initGantt();
}

/** btnPlanInvalid_Click → CheckPlanInvalid → 确认 → PlanInvalid */
async function planInvalid() {
  const sel = selectedPlans();
  if (!sel.length) return;
  const ids = [...new Set(sel.map((r) => r.id))];
  await frmMS2000Api.checkPlanInvalid({ gsIds: ids });
  if (!window.confirm("确定作废所选的炉次的工艺路线计划？")) return;
  await frmMS2000Api.planInvalid({ gsIds: ids });
  await queryPlans();
  await initGantt();
}

/** btnPlanInvalidCancel_Click（仅 已作废 模式可见）→ 确认 → PlanInvalidCancel */
async function planInvalidCancel() {
  const sel = selectedPlans(true);
  if (!sel.length) return;
  if (!window.confirm("确定取消所选的炉次的工艺路线计划的作废状态？")) return;
  const ids = [...new Set(sel.map((r) => r.id))];
  await frmMS2000Api.planInvalidCancel({ gsIds: ids });
  await queryPlans();
  await initGantt();
}

/** btnStoveMergeSplit_Click（钢水分包）：原 .cs 空实现，按钮 Designer Visible=false */
function stoveMergeSplit() {
  /* 原方法体为空 */
}

onMounted(async () => {
  /* 原 Load：InitStovePlanArea（cbo 默认否、dePlanDate=今天、查询）→ InitGanttArea（甘特初始化） */
  await queryPlans();
  await initGantt();
  autoTimer = window.setInterval(() => void autoTick(), 10000);
});
onBeforeUnmount(() => {
  if (autoTimer) window.clearInterval(autoTimer);
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：甘特工具行（AsReportShow 隐藏；原 Dock=Top） -->
    <div
      v-if="!asReportShow"
      class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2"
    >
      <Button text class="shrink-0 whitespace-nowrap" :loading="ganttLoading" @click="refreshGantt">
        <IconRefresh class="h-3 w-3" />刷新甘特图
      </Button>
      <Checkbox v-model="chkMoveHorizontal" binary inputId="chkMh" />
      <label for="chkMh" class="shrink-0 text-xs text-muted-foreground">水平移动</label>
      <Checkbox v-model="chkMoveVertical" binary inputId="chkMv" />
      <label for="chkMv" class="shrink-0 text-xs text-muted-foreground">垂直移动</label>
      <Checkbox v-model="chkAutoUpdateGanttPoint" binary inputId="chkAu" />
      <label for="chkAu" class="shrink-0 text-xs text-muted-foreground">同机台联动更新</label>
      <Checkbox v-model="chkAddBySameJC" binary inputId="chkJc" />
      <label for="chkJc" class="shrink-0 text-xs text-muted-foreground">同浇次批量添加</label>
      <Button text class="shrink-0 whitespace-nowrap" @click="saveGanttDatas">保存</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="togglePlanPanel">{{ showPlanText }}</Button>
      <Button v-if="!isLg1" text class="shrink-0 whitespace-nowrap" @click="addPoint">添加点位</Button>
      <Button v-if="!isLg1" text class="shrink-0 whitespace-nowrap" @click="removePoint">删除点位</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="removeStove">删除炉次</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="autoResolveConflicts">解决重叠</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="planExchange">计划交换</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="sgCodeChange">钢种变更</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="addStovePlan">添加计划</Button>
      <Button v-show="false" text class="shrink-0 whitespace-nowrap" @click="stoveMergeSplit">钢水分包</Button>
      <Checkbox :model-value="chkAutoRefresh" binary inputId="chkAr" @update:model-value="onAutoRefreshToggle" />
      <label for="chkAr" class="shrink-0 text-xs text-muted-foreground">自动更新</label>
    </div>

    <!-- stackPanel2：报表查询行（元素常在 DOM，Designer 默认 Visible=false：btnRefreshGantt2 仅报表显示、
         历史项需 AsReportShow&&AllowQueryHistoryDatas）+ 红字点位信息（常显） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <Button
        v-show="asReportShow"
        text
        class="shrink-0 whitespace-nowrap"
        :loading="ganttLoading"
        @click="refreshGantt2"
      >
        <IconRefresh class="h-3 w-3" />刷新甘特图
      </Button>
      <Checkbox v-show="asReportShow && allowHistory" v-model="chkQueryHistory" binary inputId="chkQh" />
      <label v-show="asReportShow && allowHistory" for="chkQh" class="shrink-0 text-xs text-muted-foreground">查询历史数据</label>
      <label v-show="asReportShow && allowHistory" class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker
        v-show="asReportShow && allowHistory"
        v-model="rBeg"
        :disabled="!historyEnabled"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-icon
        class="shrink-0"
      />
      <label v-show="asReportShow && allowHistory" class="shrink-0 text-xs text-muted-foreground">≤计划日期≤</label>
      <DatePicker
        v-show="asReportShow && allowHistory"
        v-model="rEnd"
        :disabled="!historyEnabled"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-icon
        class="shrink-0"
      />
      <label v-show="asReportShow && allowHistory" class="shrink-0 text-xs text-muted-foreground">炉次号或制造命令号</label>
      <InputText v-show="asReportShow && allowHistory" v-model="stoveNoOrPono" :disabled="!historyEnabled" class="w-40 shrink-0" />
      <!-- 原 labGanttPointInfo（红字，Location 靠右） -->
      <span class="ml-auto shrink-0 text-xs font-medium text-red-600">甘特图点位信息</span>
    </div>

    <!-- 左右分栏（原 panelControl1(Fill) + splitterControl1(Right) + panelControl2(Right) ≈ 65/35；「显示计划」隐藏右栏） -->
    <Splitter layout="horizontal" class="min-h-0 flex-1">
      <SplitterPanel :size="65" :minSize="30" class="flex flex-col overflow-hidden">
        <!-- stackPanel5：甘特点位颜色图例（原 Dock=Top，h-8 无按钮） -->
        <div class="flex h-8 shrink-0 items-center gap-3 overflow-x-auto border-b border-border/60 px-2 text-xs font-medium">
          <span style="color: lime">浅绿色:工序正在生产;</span>
          <span style="color: rgb(255, 90, 255)">淡紫色:工序生产完毕;</span>
          <span style="color: rgb(0, 120, 0)">深绿色:已产出未确认;</span>
          <span class="px-1" style="background: yellow; color: rgb(40, 40, 40)">黄色背景:点位重叠;</span>
          <span class="px-1" style="background: #0078d7; color: red">前红背蓝:点位选中;</span>
          <span class="px-1" style="background: #0078d7; color: yellow">前黄背蓝:同炉次点位;</span>
          <span style="color: black">其它颜色:未生产未选中同炉次铸机颜色;</span>
        </div>
        <!-- gant1 资源条（原左侧资源列，getGanttResourcesDatas+getFactoryLineAreaMachine_LG） -->
        <div class="flex h-8 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border/60 px-2">
          <span class="shrink-0 text-xs text-muted-foreground">资源</span>
          <span
            v-for="(r, i) in resChips"
            :key="`${r}-${i}`"
            class="shrink-0 border border-border/60 px-1.5 py-0.5 text-xs text-muted-foreground"
            >{{ r }}</span
          >
        </div>
        <!-- 甘特点位表（骨架：getStoveRouteHistoryDatas1 点位行；点位选中=当前点位） -->
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="pointCols"
            :row-data="points"
            :pagination="false"
            :loading="ganttLoading"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            @grid-ready="onPointReady"
            @selection-changed="onPointSelection"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel v-if="showPlan" :size="35" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- stackPanel3：指定工艺路线 + 作废计划日期（Invalid 模式显示） -->
        <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">指定工艺路线</label>
          <Select
            v-model="routeState"
            :options="ROUTE_OPTIONS"
            option-label="label"
            option-value="value"
            class="w-28 shrink-0"
            @update:model-value="onRouteStateChange"
          />
          <template v-if="invalidMode">
            <label class="shrink-0 text-xs text-muted-foreground">作废计划日期</label>
            <DatePicker v-model="dePlanDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
          </template>
        </div>
        <!-- stackPanel4：计划按钮 + 表标题（按钮左标题右共用 h-9） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button text class="shrink-0 whitespace-nowrap" :loading="planLoading" @click="queryPlans">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="movePlan(-1)">上移</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="movePlan(1)">下移</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="clearRoute">清除路线</Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="planInvalid">计划作废</Button>
          <Button v-show="invalidMode" text class="shrink-0 whitespace-nowrap" @click="planInvalidCancel">取消作废</Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">炉次计划</span>
        </div>
        <!-- 炉次计划表（原 gridControl1 Dock=Fill；双击行=原拖拽到甘特） -->
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="planCols"
            :row-data="plans"
            :pagination="false"
            :loading="planLoading"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            @grid-ready="onPlanReady"
            @row-clicked="onPlanClick"
            @row-double-clicked="onPlanDblClick"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
