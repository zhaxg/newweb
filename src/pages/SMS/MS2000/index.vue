<script setup lang="ts">
/** 对应 FrmMS2000（炼钢总厂甘特图）：DDH.Winforms.SMS.Forms.FrmMS2000（双菜单 MS2000 操作 / MS2001 历史报表）
 *  已接入：frmMS2000Api.queryStovePlan（查询，QueryStovePlanDto{lineCode,queryHaveRoutePlanDatas,invalidDate}）/
 *          saveGanttDatas（保存，确认「确定将修改提交至数据库？」；载荷=全量点位 SaveGanttDataDto + remove ids，照 C#）/
 *          checkStovePlanHaveProductionByIds + clearRoutePlanByIds（清除路线）/
 *          checkPlanInvalid + planInvalid（计划作废）/ planInvalidCancel（取消作废，cbo=已作废 时显示）/
 *          checkWhenAddGanttPoint + getStoveRouteDatas（添加点位/删除点位校验，文案照抄 .cs）/
 *          checkAllowChangeStoveSgCode（钢种变更校验）/
 *          getGanttResourcesDatas + getStoveRouteDatas / getStoveRouteHistoryDatas1（InitGantt → GanttChart 资源/点位）/
 *          getStovePlanInfoByGsIds（原 Gant1_OnMouseUpAfter 抬起回填计划表）/
 *          publicKVApi.getMSConfig（行高键值，组件 fitRowHeight 自适应，值作参考）/
 *          publicKVApi.getMsProcMachineMapping + getProcMachineUseTime + getProcTransTime（计划行双击落点近似，见偏差）/
 *          publicFactoryLineAreaMachineApi.getFactoryLineAreaMachine_LG（拖到新机台时回写工序字段）/
 *  cQueryString：{FactoryCode,LineCode,AsReportShow,AllowQueryHistoryDatas,GanttCCMProcEditJCInfo}——
 *                AsReportShow=true 隐藏 stackPanel1 工具行、显示刷新甘特图2+历史查询区；LineCode=LG01(炼钢一厂) 隐藏添加/删除点位
 *  分栏（原 panelControl1(Fill)+splitterControl1(Right)+panelControl2(Right)，Designer 初始 Visible=false）左右 65/35：左=甘特图，右=炉次计划
 *  甘特：src/components/gantt（原 GantterSchedule.Gant 移植）；资源/点位映射照 InitGanttResourcesDatas + CreateGanttAppointmentObject；
 *        真源 mock/mes4ddh/data/gantt_data.json（生产环境只读导出 LG02，2026-09-22）经
 *        getGanttResourcesDatas/getStoveRouteDatas/getMSConfig 下发；tms2000/tms2010 字段集以该导出为准，不编造
 *  列集按 extract：计划表 23可见+66隐藏=89；Selected 转移勾选列（ui-rules §7：原列 hide:true 保留，勾选由 row-selection 呈现）
 *  【偏差】计划行双击=原「拖拽计划行到甘特」web 替代（getMsProcMachineMapping→use/trans→getStoveRouteDatas 落点）；
 *          计划交换(FrmMS2100_X_UpdateStoveSgCode，源校验服务未生成 swagger)、钢种变更/添加计划/添加点位弹窗留 toast 占位；
 *          点位双击=原 FrmMS2000_GanttPointEdit 弹窗占位；同机台联动/自动顺延为纯客户端（引擎拖拽 + AutoUpdateGanttPoint）；
 *          上移/下移简化为数组相邻交换；ShiftInfo/自动刷新时间以「甘特图」代窗体标题
 *  待接入：班次班组 ShiftInfo、点位编辑弹窗（FrmMS2000_GanttPointEdit/SgCodeChange/AddStovePlan） */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconRefresh, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClickedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { frmMS2000Api, publicFactoryLineAreaMachineApi, publicKVApi } from "@/api/mes4ddh/sms.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import GanttChart from "@/components/gantt/GanttChart.vue";
import {
  EditState,
  SelectModel,
  createAppointment,
  type AppointmentObject,
  type GantError,
  type GanttStyle,
  type ResourceObject,
} from "@/components/gantt/engine";

type Row = Record<string, any>;
type PointDto = { tms2000: Row; tms2010: Row; stoveHaveOutput: boolean };

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
const planApi = ref<GridApi | null>(null);
const planLoading = ref(false);
const ganttLoading = ref(false);
const curPlan = ref<Row | null>(null);

/* ===== 原 stackPanel1（甘特工具行，AsReportShow 时隐藏） ===== */
const chkMoveHorizontal = ref(false);
const chkMoveVertical = ref(false);
const chkAutoUpdateGanttPoint = ref(true);
const chkAddBySameJC = ref(false);
const chkAutoRefresh = ref(false);
/* Designer: panelControl2.Visible=false 初始 → 按钮文案「显示计划」 */
const showPlan = ref(false);
const showPlanText = computed(() => (showPlan.value ? "隐藏计划" : "显示计划"));

/* ===== 原 stackPanel2（报表行：AsReportShow 显示；labGanttPointInfo 红字常显） ===== */
const chkQueryHistory = ref(false);
const rBeg = ref<Date | null>(allowHistory ? addDays(-3) : null);
const rEnd = ref<Date | null>(allowHistory ? addDays(3) : null);
const stoveNoOrPono = ref("");
const historyEnabled = computed(() => chkQueryHistory.value);
const pointInfoText = ref("");
/** 无选中时的占位提示 */
const pointInfoDisplay = computed(() => pointInfoText.value || "点击查看点位信息");

/* ===== 原 stackPanel3/4（右栏：指定工艺路线 + 计划按钮 + 炉次计划表） ===== */
const ROUTE_OPTIONS = [
  { label: "否", value: "N" },
  { label: "是", value: "Y" },
  { label: "已作废", value: "Invalid" },
];
const routeState = ref("N");
const invalidMode = computed(() => routeState.value === "Invalid");
const dePlanDate = ref<Date | null>(today());

/* ===== 甘特图（GanttChart 组件） ===== */
const ganttRef = ref<InstanceType<typeof GanttChart> | null>(null);
const resources = shallowRef<ResourceObject[]>([]);
const appointments = shallowRef<AppointmentObject[]>([]);
const ganttWindow = ref({ startDate: addDays(-1), endDate: addDays(4) });
const ganttStyle = ref<Partial<GanttStyle>>({});
/* 原 _ganttStovePlanDataDtoList：点位背后的炉次明细，appt.appointmentId = tms2010.id */
let ganttDtos: PointDto[] = [];
const rawById = new Map<string, PointDto>();
/* 原 _ganttRemoveStoveDatas / _ganttRemoveRouteDatas */
const removeTms2000Ids: string[] = [];
const removeTms2010Ids: string[] = [];
/* 原 MustSaveData 标记的点位 id（保存时全量提交，标志位来自 dirty） */
const dirtyIds = new Set<string>();

/* 连铸机资源标题色：照 InitGanttResourcesDatas 调色板，仅 cProc=1040 */
const CCM_COLORS = [
  "rgb(237,216,1)",
  "rgb(143,1,255)",
  "rgb(0,178,237)",
  "rgb(237,142,113)",
  "purple",
  "rgb(64,60,255)",
  "rgb(237,150,0)",
  "rgb(237,146,49)",
];

function fmt(d: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function fmtTs(v: Date | null | undefined): string | undefined {
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
function toMs(v: unknown): number {
  if (!v) return 0;
  const s = String(v).includes("T") ? String(v) : String(v).replace(" ", "T");
  return Date.parse(s) || 0;
}
function toDate(v: unknown): Date | null {
  const ms = toMs(v);
  return ms ? new Date(ms) : null;
}
function machineStationKey(code: string, station: string | null | undefined): string {
  return `${code}-${station ?? ""}`;
}
function isCcmProc(proc: unknown): boolean {
  return String(proc ?? "").startsWith("CCM");
}
/** 导出 tms2010 无 cPlanMachineDesc/工位名：按 resourceId 从 getGanttResourcesDatas 资源行反查 */
function machineNameOf(machineCode: unknown, station: unknown): string {
  const key = machineStationKey(String(machineCode ?? ""), station as string | null | undefined);
  const res = resources.value.find((r) => r.resourceId === key);
  if (res) return res.resourceName;
  return String(machineCode ?? "");
}

/* CreateGanttAppointmentObject：Gantt_BegTime = 实际优先，结束带 +8h 封顶规则 */
function pointBegEnd(p: PointDto): { beg: Date; end: Date; endAct: Date | null } {
  const t1 = p.tms2010 ?? {};
  const planBeg = toDate(t1.dPlanBegtime) ?? today();
  const planEnd = toDate(t1.dPlanEndtime) ?? planBeg;
  const actBeg = toDate(t1.dActualBegtime);
  const actEnd = toDate(t1.dActualEndtime);
  if (t1.nActualExist && actBeg) {
    let end = actEnd;
    if (!actEnd) {
      const span = planEnd.getTime() - planBeg.getTime();
      const temp = new Date(actBeg.getTime() + span);
      end = temp.getTime() > Date.now() ? temp : new Date();
    }
    return { beg: actBeg, end: end ?? planEnd, endAct: actEnd };
  }
  return { beg: planBeg, end: planEnd, endAct: actEnd };
}

/** 原 Gantt_LZ：同 cGsId 下首个 CCM 工序机台 */
function ccmResourceIdOf(p: PointDto): string {
  /* 生产导出：cGsId 恒等于 tms2000.id */
  const gs = p.tms2000?.id ?? p.tms2010?.cGsId;
  const hit = ganttDtos.find((x) => (x.tms2000?.id ?? x.tms2010?.cGsId) === gs && isCcmProc(x.tms2010?.cProc));
  const code = hit?.tms2010?.cPlanMachineCode ?? "";
  return code ? `${code}-` : "";
}

function buildResources(machines: Row[]): ResourceObject[] {
  const sorted = [...machines].sort((a, b) => String(a.order ?? "").localeCompare(String(b.order ?? "")));
  let colorIdx = 0;
  return sorted.map((m, i) => {
    const isCcm = String(m.cProc) === "1040";
    const isBof = String(m.cProc) === "1000";
    return {
      erpBofNo: String(i + 1),
      isCcmResource: isCcm,
      isBofResource: isBof,
      resourceGroup: String(m.ganttDragVerticallyMachineGroup ?? ""),
      seq: i + 1,
      resourceId: machineStationKey(String(m.machineCode ?? ""), m.machineStationCode),
      resourceName: `${m.machineDesc ?? ""}${m.machineStationDesc ?? ""}`,
      colorName: isCcm ? (CCM_COLORS[colorIdx++] ?? "") : undefined,
    } satisfies ResourceObject;
  });
}

function buildAppointments(dtos: PointDto[]): AppointmentObject[] {
  const list: AppointmentObject[] = [];
  for (const item of dtos) {
    const t0 = item.tms2000;
    const t1 = item.tms2010;
    if (!t0 || !t1) continue;
    const stoveNoOrPoNo = t0.cStove ? String(t0.cStove) : String(t0.cPono ?? "");
    const { beg, end, endAct } = pointBegEnd(item);
    const isLz = isCcmProc(t1.cProc);
    list.push(
      createAppointment({
        groupId: "00001",
        seq: Number(t1.cProcIndex ?? 1),
        pRelationId: String(t0.cSgCode ?? ""),
        headId: String(t1.cPono ?? t0.cPono ?? ""),
        headIdShowStr: stoveNoOrPoNo,
        relationId: String(t1.cPono ?? t0.cPono ?? "0").replace(/\D/g, "") || "0",
        resourceId: machineStationKey(String(t1.cPlanMachineCode ?? ""), t1.cPlanMachineStationCode),
        appointmentId: String(t1.id),
        startTime: beg,
        endTime: end,
        duringMins: Math.max(1, Math.round((end.getTime() - beg.getTime()) / 60000)),
        startTimeAct: t1.nActualExist ? toDate(t1.dActualBegtime) : null,
        endTimeAct: endAct,
        ccmResourceId: ccmResourceIdOf(item),
        stoveHaveOutput: !!item.stoveHaveOutput,
        nSortJcActual: isLz && t0.nSortJcActual != null ? Number(t0.nSortJcActual) : null,
        nJcBeg: isLz && !!t0.nJcActualBeg,
        nJcEnd: isLz && !!t0.nJcActualEnd,
        editState: EditState.Normal,
        tag: item,
      }),
    );
  }
  return list;
}

/** 原 SetGanttStoveRoutePlanDatas：时间窗 = 数据极值，非历史模式夹今日 ± */
function applyWindow(dtos: PointDto[], historyMode: boolean): void {
  let minT = Number.POSITIVE_INFINITY;
  let maxT = Number.NEGATIVE_INFINITY;
  for (const p of dtos) {
    const { beg, end } = pointBegEnd(p);
    minT = Math.min(minT, beg.getTime());
    maxT = Math.max(maxT, end.getTime());
  }
  if (!Number.isFinite(minT)) {
    ganttWindow.value = { startDate: addDays(-1), endDate: addDays(4) };
    return;
  }
  const dataMin = new Date(minT);
  const dataMax = new Date(maxT);
  if (historyMode) {
    ganttWindow.value = {
      startDate: new Date(dataMin.getFullYear(), dataMin.getMonth(), dataMin.getDate()),
      endDate: new Date(dataMax.getTime() + 12 * 3600_000),
    };
    return;
  }
  const todayStart = today();
  const todayEnd = new Date(todayStart.getTime() + 24 * 3600_000 - 1);
  const minDataTime = dataMin > todayStart ? todayStart : dataMin;
  const maxDataTime = dataMax > todayStart ? dataMax : todayEnd;
  ganttWindow.value = {
    startDate: addDays(-1 + Math.floor((minDataTime.getTime() - todayStart.getTime()) / 86400_000)),
    endDate: new Date(maxDataTime.getTime() + 3 * 86400_000),
  };
}

/** 原 UpdateGanttPointOverlapInfo → chart.setOverlapped */
function refreshOverlap(): void {
  const c = ganttRef.value?.chart;
  if (!c) return;
  const ids: string[] = [];
  for (let i = 0; i < c.appointments.length; i++) {
    for (let j = i + 1; j < c.appointments.length; j++) {
      const a = c.appointments[i];
      const b = c.appointments[j];
      if (a.resourceId === b.resourceId && a.startTime < b.endTime && b.startTime < a.endTime) {
        ids.push(a.appointmentId, b.appointmentId);
      }
    }
  }
  c.setOverlapped(ids);
}

/** 原 labGanttPointInfoTextUpdate：stove|pono(sg|HH:mm/HH:mm(min)|机台)+(+) */
function updatePointInfo(dto: PointDto | null): void {
  if (!dto) {
    pointInfoText.value = "";
    return;
  }
  const t0 = dto.tms2000 ?? {};
  const t1 = dto.tms2010 ?? {};
  const { beg, end } = pointBegEnd(dto);
  const hm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const mins = Math.round((end.getTime() - beg.getTime()) / 60000);
  const machine = machineNameOf(t1.cPlanMachineCode, t1.cPlanMachineStationCode);
  const dirty = dirtyIds.has(String(t1.id)) ? "|(+)" : "";
  pointInfoText.value = `${t0.cStove ?? ""}|${t1.cPono ?? t0.cPono ?? ""}(${t0.cSgCode ?? ""}|${hm(beg)}/${hm(end)}(${mins})|${machine})${dirty}`;
}

/* ===== 计划表（原 gridControl1/gridView1 ViewCaption=炉次计划：89 列） ===== */
const planCols = ref<ColDef[]>([
      { field: "selected", headerName: "选择", hide: true },
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

function onPlanReady(e: GridReadyEvent) {
  planApi.value = e.api;
}

/** btnQuery_Click_Real → Proxy.QueryStovePlan */
async function queryPlans() {
  planLoading.value = true;
  try {
    plans.value =
      (await frmMS2000Api.queryStovePlan({
        lineCode: lineCode || undefined,
        queryHaveRoutePlanDatas: routeState.value,
        invalidDate: fmt(dePlanDate.value),
      })) ?? [];
    requestAnimationFrame(() => planApi.value?.autoSizeAllColumns());
  } finally {
    planLoading.value = false;
  }
}

function onPlanClick(e: RowClickedEvent) {
  curPlan.value = (e.data as Row) ?? null;
}

async function loadPlanInfoForPoint(gsIds: string[]) {
  if (!gsIds.length) return;
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

function toPointDto(x: Row): PointDto {
  return {
    tms2000: (x.tms2000 ?? {}) as Row,
    tms2010: (x.tms2010 ?? {}) as Row,
    stoveHaveOutput: !!x.stoveHaveOutput,
  };
}

function rebindGantt(dtos: PointDto[]): void {
  ganttDtos = dtos;
  rawById.clear();
  for (const d of ganttDtos) rawById.set(String(d.tms2010?.id), d);
  appointments.value = buildAppointments(ganttDtos);
  requestAnimationFrame(() => refreshOverlap());
}

/** InitGantt：资源行高配置 + 资源机台 + 点位（原 InitGantt/InitGanttResourcesDatas/GetGanttStoveRoutePlanDatas） */
async function initGantt() {
  ganttLoading.value = true;
  try {
    const historyMode = asReportShow && allowHistory && chkQueryHistory.value;
    const historyBeg = historyMode ? rBeg.value : null;
    const historyEnd = historyMode ? rEnd.value : null;
    const [cfg, machines, routeDatas] = await Promise.all([
      publicKVApi.getMSConfig(),
      frmMS2000Api.getGanttResourcesDatas({ lineCode: lineCode || undefined }),
      historyMode
        ? frmMS2000Api.getStoveRouteHistoryDatas1({
            lineCode: lineCode || undefined,
            begTime: fmt(historyBeg),
            endTime: fmt(historyEnd),
            stoveNoOrPono: stoveNoOrPono.value.trim() || undefined,
          }).then((r) => {
            const wrap = r as Row | null;
            if (wrap && Array.isArray(wrap.ganttDataDto_StoveRoutePlans)) {
              if (!wrap.stoveIsExist && stoveNoOrPono.value.trim().length >= 6) {
                toast(`查询的炉次号或制造命令号为‘${stoveNoOrPono.value.trim()}’的炉次不存在！`, 3000, "warn");
              }
              return wrap.ganttDataDto_StoveRoutePlans;
            }
            return arr(r);
          })
        : frmMS2000Api.getStoveRouteDatas({ lineCode: lineCode || undefined }),
    ]);
    /* 导出 config 行高作组件 style 参考（fitRowHeight 开启时视口均分仍优先） */
    const kv = arr(cfg);
    const rowH = Number(kv.find((x) => x.cCode === "Gantt_ResourceRowHeight")?.cValue);
    const rowInner = Number(kv.find((x) => x.cCode === "Gantt_ResourceRowHeight_Inner")?.cValue);
    if (Number.isFinite(rowH) && rowH > 0) ganttStyle.value.resourceRowHeight = rowH;
    if (Number.isFinite(rowInner) && rowInner > 0) ganttStyle.value.resourceRowHeightInner = rowInner;
    resources.value = buildResources(arr(machines));
    const dtos = arr(routeDatas).map(toPointDto).filter((d) => d.tms2010?.id);
    applyWindow(dtos, historyMode);
    rebindGantt(dtos);
  } finally {
    ganttLoading.value = false;
  }
}

/** btnRefreshGantt_Click：报表模式不确认；确认文案照抄 */
async function refreshGantt() {
  if (!asReportShow && !window.confirm("确定刷新甘特图显示的数据？\r\n注：未保存的数据在刷新甘特图后会丢失！")) return;
  dirtyIds.clear();
  removeTms2000Ids.length = 0;
  removeTms2010Ids.length = 0;
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

/** btnSaveGanttDatas_Click：C# 仅三点全空才 return；确认 → 全量 SaveGanttDataDto + remove ids → 查询 + InitGantt */
async function saveGanttDatas() {
  if (ganttDtos.length === 0 && removeTms2000Ids.length === 0 && removeTms2010Ids.length === 0) return;
  if (!window.confirm("确定将修改提交至数据库？")) return;
  const ganttDatas = ganttDtos.map((x) => {
    const { beg, end } = pointBegEnd(x);
    const t0 = x.tms2000 ?? {};
    const t1 = x.tms2010 ?? {};
    const id = String(t1.id);
    const dirty = dirtyIds.has(id);
    const dataUpdate = !t1.nActualExist && dirty;
    return {
      tms2000: t0,
      tms2010: t1,
      gantt_BegTime: fmtTs(beg),
      gantt_EndTime: fmtTs(end),
      cJcNoActual: t0.cJcNoActual ?? null,
      nSortJcActual: t0.nSortJcActual ?? null,
      nJcActualBeg: t0.nJcActualBeg ?? false,
      nJcActualEnd: t0.nJcActualEnd ?? false,
      mustSaveData: dirty,
      dataUpdate,
      dataCCMMachineInfoUpdate: false,
      dataJCUpdate: false,
    };
  });
  await frmMS2000Api.saveGanttDatas({
    ganttDatas,
    removeTms2000Ids: [...removeTms2000Ids],
    removeTms2010Ids: [...removeTms2010Ids],
  });
  dirtyIds.clear();
  removeTms2000Ids.length = 0;
  removeTms2010Ids.length = 0;
  await queryPlans();
  await initGantt();
}

/** btnShowHiddenStovePlan_Click：切换 splitterControl1/panelControl2 可见 + 按钮文案 */
function togglePlanPanel() {
  showPlan.value = !showPlan.value;
}

/* ===== 甘特事件（照 FrmMS2000 Gant1_*） ===== */

/** Events_AppointmentClick：同炉联动高亮（headId）+ 计划表回填 */
function onAppointmentClick(appt: AppointmentObject | null): void {
  ganttRef.value?.chart?.setStoveHighlight(appt?.headId ?? null);
  if (!appt) {
    updatePointInfo(null);
    return;
  }
  const dto = rawById.get(appt.appointmentId);
  if (!dto) {
    toast("数据异常，所选择的甘特图点位对应的炉次计划数据不存在！请刷新甘特图！", 3000, "warn");
    return;
  }
  updatePointInfo(dto);
  const gsId = dto.tms2000?.id as string | undefined;
  if (gsId) void loadPlanInfoForPoint([gsId]);
}

/** GantException → toast（C# UserFriendlyException，拦截层已 toast 时这里补文案） */
function onGantException(err: GantError): void {
  toast(err.message, 3000, "warn");
}

/** Gant1_OnMouseUpAfter：同步时间/机台回 dto，同机台级联，标脏，重叠刷新 */
async function onMouseUpAfter(appt: AppointmentObject | null): Promise<void> {
  if (!appt) {
    updatePointInfo(null);
    return;
  }
  if (asReportShow) return;
  const dto = rawById.get(appt.appointmentId);
  if (!dto) {
    toast("数据异常，所选择的甘特图点位对应的炉次计划数据不存在！", 3000, "warn");
    return;
  }
  const t1 = dto.tms2010;
  const t0 = dto.tms2000;
  const oldBeg = pointBegEnd(dto).beg.getTime();
  const oldMachine = machineStationKey(String(t1.cPlanMachineCode ?? ""), t1.cPlanMachineStationCode);
  const machineChanged = appt.resourceId !== oldMachine;
  const timeChanged = appt.startTime.getTime() !== oldBeg;
  if (!machineChanged && !timeChanged) {
    updatePointInfo(dto);
    return;
  }

  const [code, station = ""] = appt.resourceId.split("-");
  if (machineChanged) {
    const list = arr(await publicFactoryLineAreaMachineApi.getFactoryLineAreaMachine_LG({ lineCode: lineCode || undefined }));
    const hit = list.find(
      (x) => x.machineCode === code && (!t1.cPlanMachineStationCode || x.machineStationCode === station),
    );
    if (hit) {
      t1.cProc = hit.routeProcValue ?? t1.cProc;
      t1.cProcDesc = hit.routeProcDesc ?? hit.machineDesc ?? t1.cProcDesc;
      t1.cPlanMachineCode = hit.machineCode ?? code;
      t1.cPlanMachineDesc = hit.machineName ?? hit.machineDesc ?? t1.cPlanMachineDesc;
      t1.cPlanMachineStationCode = hit.machineStationCode ?? station;
      t1.cPlanMachineStationDesc = hit.machineStationName ?? hit.machineStationDesc ?? "";
    } else {
      t1.cPlanMachineCode = code;
      t1.cPlanMachineStationCode = station || null;
    }
  }
  const diffSeconds = (appt.startTime.getTime() - oldBeg) / 1000;
  t1.dPlanBegtime = fmtTs(appt.startTime);
  t1.dPlanEndtime = fmtTs(appt.endTime);
  dirtyIds.add(String(t1.id));
  updatePointInfo(dto);

  /* 同炉全工序标 DataMachineInfoUpdate（C# routePlanDtoList） */
  if (machineChanged) {
    for (const x of ganttDtos) {
      if (x.tms2000?.id === t0.id) dirtyIds.add(String(x.tms2010.id));
    }
  }

  /* AutoUpdateGanttPoint：同机台且开始时间 ≥ 原点位的后续点位平移 */
  if (chkAutoUpdateGanttPoint.value && !isCcmProc(t1.cProc) && (timeChanged || machineChanged)) {
    const after = ganttDtos
      .filter(
        (x) =>
          x !== dto &&
          String(x.tms2010?.cPlanMachineCode) === String(t1.cPlanMachineCode) &&
          pointBegEnd(x).beg.getTime() >= oldBeg,
      )
      .sort((a, b) => pointBegEnd(a).beg.getTime() - pointBegEnd(b).beg.getTime());
    for (const item of after) {
      const b = pointBegEnd(item).beg;
      const nb = new Date(b.getTime() + diffSeconds * 1000);
      const span = pointBegEnd(item).end.getTime() - b.getTime();
      item.tms2010.dPlanBegtime = fmtTs(nb);
      item.tms2010.dPlanEndtime = fmtTs(new Date(nb.getTime() + span));
      dirtyIds.add(String(item.tms2010.id));
    }
    /* 级联后的点位对象同步（引擎里已是新引用数组） */
    const apptById = new Map(ganttRef.value?.chart?.appointments.map((a) => [a.appointmentId, a]) ?? []);
    for (const item of after) {
      const a = apptById.get(String(item.tms2010.id));
      if (a) {
        const b = pointBegEnd(item);
        a.startTime = b.beg;
        a.endTime = b.end;
      }
    }
    ganttRef.value?.chart?.invalidate();
  }

  refreshOverlap();

  /* 铸机改变且已生成炉次号 → 提示保存后炉次号变化（文案照抄） */
  if (machineChanged && isCcmProc(t1.cProc)) {
    const info = arr(await frmMS2000Api.getStovePlanInfoByGsIds({ gsIds: [t0.id] }));
    const routePlan = info[0];
    if (!routePlan) {
      toast("禁止操作，炉次信息不存在！界面数据可能已过期，请刷新界面后重试！", 3500, "warn");
      return;
    }
    if (routePlan.cStove) {
      toast(
        `炉次已经生成炉次号‘${routePlan.cStove}’，因铸机改变，炉次的炉次号在保存甘特图后也会发生改变！请知悉！`,
        4000,
        "warn",
      );
    }
  }
}

/** Gant1_Gantt_Events_OnMouseDoubleClick：点位编辑弹窗占位 */
function onAppointmentDblClick(appt: AppointmentObject | null): void {
  if (!appt || asReportShow) return;
  toast("点位编辑弹窗待接入（FrmMS2000_GanttPointEdit）", 2500, "warn");
}

/** btnAddPoint_Click */
async function addPoint() {
  const id = ganttRef.value?.chart?.currentAppointment?.appointmentId;
  if (!id) return;
  const p = rawById.get(id);
  if (!p) return;
  await frmMS2000Api.checkWhenAddGanttPoint({ tms2010Id: p.tms2010.id });
  if (p.tms2010.id) {
    const latest = arr(await frmMS2000Api.getStoveRouteDatas({ lineCode: lineCode || undefined, gsIds: [p.tms2000?.id] }));
    const mine = latest.find((x) => x.tms2010Id === p.tms2010.id || x.tms2010?.id === p.tms2010.id);
    const mineT1 = (mine?.tms2010 ?? mine) as Row | undefined;
    if (!mineT1 || p.tms2010.nActualExist !== mineT1.nActualExist) {
      toast("界面数据可能已经过期，请刷新后甘特图后再试！", 3000, "warn");
      return;
    }
  }
  toast("添加点位弹窗待接入（FrmMS2000_GanttPointEdit）", 2500, "warn");
}

/** btnRemovePoint_Click */
async function removePoint() {
  const id = ganttRef.value?.chart?.currentAppointment?.appointmentId;
  if (!id) return;
  const p = rawById.get(id);
  if (!p) return;
  if (!dirtyIds.has(String(p.tms2010.id)) && p.tms2000?.id) {
    const datas = arr(await frmMS2000Api.getStoveRouteDatas({ lineCode: lineCode || undefined, gsIds: [p.tms2000.id] }));
    const t1 = datas.find((x) => x.tms2010Id === p.tms2010.id || x.tms2010?.id === p.tms2010.id);
    const realT1 = (t1?.tms2010 ?? t1) as Row | undefined;
    if (realT1?.nActualExist) {
      toast(
        `禁止操作，该甘特图点位所表示的炉次‘${realT1.cStoveNo ?? realT1.cPono ?? p.tms2000.cStove}’的该工艺路线计划已经开始实际生产，不允许该删除操作！`,
        3500,
        "warn",
      );
      return;
    }
    await frmMS2000Api.checkWhenAddGanttPoint({ tms2010Id: p.tms2010.id });
  }
  const proc = String(p.tms2010?.cProc ?? "");
  if (proc === "BOF" || proc.startsWith("CCM")) {
    toast("禁止操作，转炉和连铸的甘特图点位不允许删除！", 3000, "warn");
    return;
  }
  const stoveNo = p.tms2000?.cStove ?? p.tms2000?.cPono ?? "";
  const gsId = p.tms2000?.id;
  const others = ganttDtos.filter((x) => x.tms2000?.id === gsId && x !== p);
  if ((p.tms2000?.cToCurrentStoveSplitMergeTypeSign || p.tms2000?.cStoveSplitMergeTypeSign) && others.length < 1) {
    toast(`禁止操作，炉次‘${stoveNo}’参与了拆合炉，不允许通过“删除点位”的方式删除该炉次的所有工艺路线计划！`, 3500, "warn");
    return;
  }
  if (p.tms2000?.cStovePlanId && others.length < 1) {
    toast(`禁止操作，炉次‘${stoveNo}’的炉次号已经固定，不允许通过‘删除点位’的方式删除该炉次的所有工艺路线计划！`, 3500, "warn");
    return;
  }
  const machineLabel = machineNameOf(p.tms2010?.cPlanMachineCode, p.tms2010?.cPlanMachineStationCode);
  if (!window.confirm(`确定删除甘特图点位所表示的炉次‘${stoveNo}’在‘${machineLabel}’的工艺路线计划？`)) return;
  ganttRef.value?.chart?.removeAppointment(String(p.tms2010.id));
  appointments.value = (ganttRef.value?.chart?.appointments ?? []).slice();
  ganttDtos = ganttDtos.filter((x) => x !== p);
  rawById.delete(String(p.tms2010.id));
  if (p.tms2010.id) removeTms2010Ids.push(p.tms2010.id);
  if (gsId && !ganttDtos.some((x) => x.tms2000?.id === gsId)) removeTms2000Ids.push(gsId);
  updatePointInfo(null);
  refreshOverlap();
}

/** btnRemoveStove_Click */
async function removeStove() {
  const id = ganttRef.value?.chart?.currentAppointment?.appointmentId;
  if (!id) return;
  const p = rawById.get(id);
  if (!p) return;
  const gsId = p.tms2000?.id as string | undefined;
  if (gsId) {
    const datas = arr(await frmMS2000Api.getStoveRouteDatas({ lineCode: lineCode || undefined, gsIds: [gsId] }));
    const produced = datas.filter((x) => (x.tms2010 ?? x).nActualExist);
    if (produced.length) {
      const nos = [...new Set(produced.map((x) => x.tms2000?.cStove || x.tms2000?.cPono || x.cPono))];
      toast(`禁止操作，制造命令号为‘${nos.join(",")}’的炉次已经开始实际生产，不允许该删除操作！`, 3500, "warn");
      return;
    }
  }
  const stoveNo = p.tms2000?.cStove ?? p.tms2000?.cPono ?? "";
  if (p.tms2000?.cToCurrentStoveSplitMergeTypeSign || p.tms2000?.cStoveSplitMergeTypeSign) {
    toast(`禁止操作，炉次‘${stoveNo}’参与了拆合炉，不允许通过‘删除炉次’功能删除该炉次！`, 3500, "warn");
    return;
  }
  if (p.tms2000?.cStovePlanId) {
    toast(`禁止操作，炉次‘${stoveNo}’的炉次号已经固定，不允许通过‘删除炉次’功能删除该炉次！`, 3500, "warn");
    return;
  }
  if (!window.confirm(`确定删除甘特图所表示的炉次‘${stoveNo}’的工艺路线计划？`)) return;
  const c = ganttRef.value?.chart;
  if (c) {
    for (const a of [...c.appointments]) {
      if ((rawById.get(a.appointmentId)?.tms2000?.id ?? null) === gsId) c.removeAppointment(a.appointmentId);
    }
    appointments.value = c.appointments.slice();
  }
  ganttDtos = ganttDtos.filter((x) => x.tms2000?.id !== gsId);
  if (gsId) {
    removeTms2000Ids.push(gsId);
    for (const [k, v] of rawById) if (v.tms2000?.id === gsId) rawById.delete(k);
  }
  updatePointInfo(null);
  refreshOverlap();
}

/** btnAutoResolveConflicts_Click：同机台后续点位顺延（文案照抄） */
function autoResolveConflicts() {
  const id = ganttRef.value?.chart?.currentAppointment?.appointmentId;
  const dto = id ? rawById.get(id) : undefined;
  if (!dto) {
    toast("请先选择需要解决冲突的甘特图点位！", 2500, "warn");
    return;
  }
  const machine = String(dto.tms2010?.cPlanMachineCode);
  const curBeg = pointBegEnd(dto).beg.getTime();
  let endTime = pointBegEnd(dto).end.getTime();
  const list = ganttDtos
    .filter(
      (x) =>
        x !== dto &&
        String(x.tms2010?.cPlanMachineCode) === machine &&
        pointBegEnd(x).beg.getTime() >= curBeg &&
        String(x.tms2010?.id) !== String(dto.tms2010.id),
    )
    .sort((a, b) => pointBegEnd(a).beg.getTime() - pointBegEnd(b).beg.getTime());
  const apptById = new Map((ganttRef.value?.chart?.appointments ?? []).map((a) => [a.appointmentId, a]));
  for (const item of list) {
    const { beg, end } = pointBegEnd(item);
    const span = end.getTime() - beg.getTime();
    if (beg.getTime() < endTime) {
      const nb = new Date(endTime);
      const ne = new Date(endTime + span);
      item.tms2010.dPlanBegtime = fmtTs(nb);
      item.tms2010.dPlanEndtime = fmtTs(ne);
      dirtyIds.add(String(item.tms2010.id));
      const a = apptById.get(String(item.tms2010.id));
      if (a) {
        a.startTime = nb;
        a.endTime = ne;
      }
    }
    endTime = pointBegEnd(item).end.getTime();
  }
  ganttRef.value?.chart?.invalidate();
  refreshOverlap();
  updatePointInfo(dto);
}

/** btnPlanExchange_Click：原弹窗 FrmMS2100_X_UpdateStoveSgCode 占位 */
function planExchange() {
  const id = ganttRef.value?.chart?.currentAppointment?.appointmentId;
  if (!id) return;
  toast("计划交换弹窗待接入（FrmMS2100_X_UpdateStoveSgCode；源校验服务未生成 swagger）", 3000, "warn");
}

/** btnUpdateStoveSgCode_Click → CheckAllowChangeStoveSgCode → 钢种变更弹窗占位 */
async function sgCodeChange() {
  const id = ganttRef.value?.chart?.currentAppointment?.appointmentId;
  const p = id ? rawById.get(id) : undefined;
  if (!p) return;
  await frmMS2000Api.checkAllowChangeStoveSgCode({ gsId: p.tms2000?.id, pono: p.tms2000?.cPono });
  toast("钢种变更弹窗待接入（FrmMS2000_SgCodeChange）", 2500, "warn");
}

/** btnAddStovePlan_Click */
async function addStovePlan() {
  const id = ganttRef.value?.chart?.currentAppointment?.appointmentId;
  if (!id) {
    toast("请在甘特图上选择要添加的炉次锚定的甘特图炉次点位！\r\n选择本浇次的炉次在甘特图上的任意一个点位均可！", 3500, "warn");
    return;
  }
  toast("添加计划弹窗待接入（FrmMS2000_AddStovePlan）", 2500, "warn");
  await initGantt();
  if (!asReportShow) await queryPlans();
  toast("炉次信息已添加，请在计划列表中选择并将添加的炉次信息添加到甘特图中！", 3000, "info");
}

/** 计划行双击 = 原「拖拽计划行到甘特图」web 替�� */
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
  const added = routes.map(toPointDto).filter((d) => d.tms2010?.id && !rawById.has(String(d.tms2010.id)));
  if (!added.length) {
    toast("该炉次已在甘特图中或无工艺路线点位", 2500, "warn");
    return;
  }
  rebindGantt([...ganttDtos, ...added]);
  for (const d of added) dirtyIds.add(String(d.tms2010.id));
  toast("已按工艺路线将炉次添加至甘特图（拖拽落点为骨架近似）", 2500, "success");
}

/** chkAutoRefresh_EditValueChanging：确认文案照抄 */
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

function onRouteStateChange() {
  void queryPlans();
}

function selectedPlans(onlyDisabled = false): Row[] {
  const sel = (planApi.value?.getSelectedRows() ?? []) as Row[];
  return sel.filter((r) => !onlyDisabled || r.cEnable === false);
}

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

/** btnClearRoute_Click */
async function clearRoute() {
  const sel = selectedPlans();
  if (!sel.length) return;
  const ids = [...new Set(sel.map((r) => r.id))];
  if (!window.confirm("确定清除所选的炉次的工艺路线计划？")) return;
  await frmMS2000Api.clearRoutePlanByIds({ gsIds: ids });
  await queryPlans();
  await initGantt();
}

/** btnPlanInvalid_Click */
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

async function planInvalidCancel() {
  const sel = selectedPlans(true);
  if (!sel.length) return;
  if (!window.confirm("确定取消所选的炉次的工艺路线计划的作废状态？")) return;
  const ids = [...new Set(sel.map((r) => r.id))];
  await frmMS2000Api.planInvalidCancel({ gsIds: ids });
  await queryPlans();
  await initGantt();
}

/** btnStoveMergeSplit_Click（钢水分包）：原 .cs 空实现 */
function stoveMergeSplit() {
  /* 原方法体为空 */
}

onMounted(async () => {
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
      <Button class="shrink-0 whitespace-nowrap" :loading="ganttLoading" @click="refreshGantt">
        <IconRefresh class="h-3 w-3" />刷新
      </Button>
      <Checkbox v-model="chkMoveHorizontal" binary inputId="chkMh" />
      <label for="chkMh" class="shrink-0 text-xs text-muted-foreground">水平移动</label>
      <Checkbox v-model="chkMoveVertical" binary inputId="chkMv" />
      <label for="chkMv" class="shrink-0 text-xs text-muted-foreground">垂直移动</label>
      <Checkbox v-model="chkAutoUpdateGanttPoint" binary inputId="chkAu" />
      <label for="chkAu" class="shrink-0 text-xs text-muted-foreground">同机台联动更新</label>
      <Checkbox v-model="chkAddBySameJC" binary inputId="chkJc" />
      <label for="chkJc" class="shrink-0 text-xs text-muted-foreground">同浇次批量添加</label>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="saveGanttDatas">保存</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="togglePlanPanel">{{ showPlanText }}</Button>
      <Button variant="outlined" v-if="!isLg1"  class="shrink-0 whitespace-nowrap" @click="addPoint">添加点位</Button>
      <Button variant="outlined" v-if="!isLg1"  class="shrink-0 whitespace-nowrap" @click="removePoint">删除点位</Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="removeStove">删除炉次</Button>
      <Button  variant="outlined" severity="warn" class="shrink-0 whitespace-nowrap" @click="autoResolveConflicts">解决重叠</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="planExchange">计划交换</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="sgCodeChange">钢种变更</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="addStovePlan">添加计划</Button>
      <Button variant="outlined" v-show="false" class="shrink-0 whitespace-nowrap" @click="stoveMergeSplit">钢水分包</Button>
      <Checkbox :model-value="chkAutoRefresh" binary inputId="chkAr" @update:model-value="onAutoRefreshToggle" />
      <label for="chkAr" class="shrink-0 text-xs text-muted-foreground">自动更新</label>
    </div>

    <!-- 原 stackPanel2（报表查询）+ stackPanel5（图例）+ labGanttPointInfo 合并为一行：
         报表模式查询控件靠左；点位信息居左（空则提示）；图例:[色块标签] 最右 -->
    <div class="flex h-9 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-border/60 px-2 text-xs">
      <template v-if="asReportShow">
        <Button
          text
          class="shrink-0 whitespace-nowrap"
          :loading="ganttLoading"
          @click="refreshGantt2"
        >
          <IconRefresh class="h-3 w-3" />刷新
        </Button>
        <template v-if="allowHistory">
          <Checkbox v-model="chkQueryHistory" binary inputId="chkQh" />
          <label for="chkQh" class="shrink-0 text-xs text-muted-foreground">查询历史</label>
          <DatePicker
            v-model="rBeg"
            :disabled="!historyEnabled"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            class="shrink-0"
          />
          <span class="shrink-0 text-muted-foreground">~</span>
          <DatePicker
            v-model="rEnd"
            :disabled="!historyEnabled"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            class="shrink-0"
          />
          <label class="shrink-0 text-xs text-muted-foreground">炉次/命令号</label>
          <InputText v-model="stoveNoOrPono" :disabled="!historyEnabled" class="w-36 shrink-0" />
        </template>
      </template>
      <!-- 点位信息：居左；有值加粗红字，空则占位提示 -->
      <span
        class="min-w-0 shrink truncate"
        :class="pointInfoText ? 'font-semibold text-red-600' : 'text-muted-foreground'"
        >{{ pointInfoDisplay }}</span
      >
      <!-- 图例:[色块 标签]… 最右 -->
      <span class="ml-auto inline-flex shrink-0 items-center gap-1">
        <span class="font-medium text-muted-foreground">图例:</span>
        <span class="inline-flex items-center gap-1">
          <span class="inline-flex items-center gap-0.5 text-muted-foreground">
            <span>[</span>
            <span class="h-3 w-3 border border-border/60" style="background: #00ff00"></span>
            <span>进行中]</span>
          </span>
          <span class="inline-flex items-center gap-0.5 text-muted-foreground">
            <span>[</span>
            <span class="h-3 w-3 border border-border/60" style="background: rgb(255, 90, 255)"></span>
            <span>已完成]</span>
          </span>
          <span class="inline-flex items-center gap-0.5 text-muted-foreground">
            <span>[</span>
            <span class="h-3 w-3 border border-border/60" style="background: rgb(0, 120, 0)"></span>
            <span>有产出]</span>
          </span>
          <span class="inline-flex items-center gap-0.5 text-muted-foreground">
            <span>[</span>
            <span class="h-3 w-3 border border-border/60" style="background: #ffff00"></span>
            <span>重叠]</span>
          </span>
          <span class="inline-flex items-center gap-0.5">
            <span class="text-muted-foreground">[</span>
            <span class="h-3 w-3 border border-border/60" style="background: #0078d7"></span>
            <span class="font-medium text-red-600">选中]</span>
          </span>
          <span class="inline-flex items-center gap-0.5">
            <span class="text-muted-foreground">[</span>
            <span class="h-3 w-3 border border-border/60" style="background: #0078d7"></span>
            <span class="font-medium text-amber-500">同炉]</span>
          </span>
          <span class="inline-flex items-center gap-0.5 text-muted-foreground">
            <span>[</span>
            <span class="h-3 w-3 border border-border/60" style="background: #5f9ea0"></span>
            <span>未生产]</span>
          </span>
        </span>
      </span>
    </div>

    <!-- 左右分栏（原 panelControl1(Fill)+splitterControl1(Right)+panelControl2(Right)，Designer 初始右栏隐藏） -->
    <Splitter layout="horizontal" class="min-h-0 flex-1">
      <SplitterPanel :size="showPlan ? 65 : 100" :minSize="30" class="flex flex-col overflow-hidden">
        <!-- gant1 → GanttChart（原 Dock=Fill；父容器必须有确定高度；图例已并入上一行） -->
        <div class="relative min-h-0 flex-1">
          <div
            v-if="ganttLoading"
            class="absolute inset-0 z-10 flex items-center justify-center bg-background/50 text-xs text-muted-foreground"
          >
            正在初始化甘特图信息，请稍后...
          </div>
          <GanttChart
            ref="ganttRef"
            :start-date="ganttWindow.startDate"
            :end-date="ganttWindow.endDate"
            :resources="resources"
            :appointments="appointments"
            :style="ganttStyle"
            :can-move-horizontal="chkMoveHorizontal"
            :can-move-vertical="chkMoveVertical"
            :select-model="SelectModel.Single"
            @appointment-click="onAppointmentClick"
            @gant-exception="onGantException"
            @mouse-up-after="onMouseUpAfter"
            @mouse-double-click="onAppointmentDblClick"
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
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
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