<script setup lang="ts">
/** 对应 FrmHR3600（堆冷作业）：DDH.Winforms.SHR.Forms.FrmHR3600
 *  已接入：systemKeyValueApi.getSysKvListByGroup（A0000:SHIFT / A0000:GROUP 班次班组灌值，FrmHR3600_Load）·
 *          tyd1000Api.getStack（垛位候选与当前默认垛位，FrmHR3600_Load）·
 *          tyd1100Api.tyd1100Query（车辆信息候选，FrmHR3600_Load）·
 *          hR3600Api.querySlabs（btnQueryStore_Click）· hR3600Api.queryHls（btnQuery_Click）·
 *          hR3600Api.startHl（btnStart_Click）· hR3600Api.endHl（btnEnd_Click）·
 *          hR3600Api.setDefaultStack（btnSet_Click）
 *  待接入：倒垛 btnDd 原开 FrmHR3601 二级弹窗（垛位类型 HL/DLDW，内部窗体未迁移）
 *  偏差：1) 画面参数原由菜单 QueryString 反序列化为 DtoQuerySlabs（cLineCode/cStoreCode/cStackType），
 *           此处用 useMenuQuery().json 读取，缺失时 cStackType 回落 StackTypeEnum.HL；
 *        2) 上表「选择」列表格列改由行选择复选框承担（数据列以 hide 收着），勾选取 api.getSelectedData()；
 *        3) txtStack/txtStack1 原为可编辑下拉（取 .Text），此处为可清除下拉，只能选垛位号；
 *        4) 查询入参 cStackType/cDldq/cPieceNos 与写操作入参 cStoreCode/cStackType/cDestination/carNo
 *           在 swagger 生成类型中缺失，以本地扩展类型补传（不改 src/api）；
 *        5) 去向原 AddEnum(HlDesEnum,true) 首项为空，此处用下拉清除按钮表达；默认值仍为「剪切线」；
 *        6) 班次/班组/切边/钢类/库区/开始人等列原为 CodeFormatter 翻译，web 侧显示原值；
 *        7) Designer 残留未布局控件 textEdit3/textEdit4 不呈现；
 *        8) 剩余堆冷时间 nHlHourSy<=0 的行整行浅绿底（原 RowStyle GreenYellow） */

import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Textarea from "primevue/textarea";
import { IconArrowBackUp, IconClockOff, IconClockPlay, IconPinned, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent, RowClassParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { systemKeyValueApi } from "@/api/admin/request";
import { tyd1000Api, tyd1100Api } from "@/api/mes4ddh/syd.swagger";
import type { HmxKv } from "@/api/admin/types";
import {
  hR3600Api,
  StackTypeEnum,
  Thr3010HlStatusEnum,
  type DtoQuerySlabs,
  type HlDto,
  type Thr3010Hl,
  type TimeRange,
  type Tyd2000,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 列宽助手（与摘要 GridColumn 宽度一一对应） ---------- */
function col(field: string, headerName: string, width = 149): ColDef {
  return { colId: field, field, headerName, minWidth: width };
}
function hid(field: string, headerName: string): ColDef {
  return { colId: field, field, headerName, minWidth: 149, hide: true };
}
function planCols(prefix: string, names: [string, string][], width = 149): ColDef[] {
  return names.map(([field, headerName]) => col(`${prefix}${field}`, headerName, width));
}

/* ---------- 菜单参数（原 QueryString → DtoQuerySlabs） ---------- */
const { json: menuJson } = useMenuQuery();
function menuStr(...keys: string[]): string {
  for (const k of keys) {
    const v = menuJson[k];
    if (typeof v === "string" && v) return v;
  }
  return "";
}
const cLineCode = menuStr("cLineCode", "CLineCode");
const cStoreCode = menuStr("cStoreCode", "CStoreCode");
const menuStackType = menuJson.cStackType ?? menuJson.CStackType;
const cStackType: StackTypeEnum =
  typeof menuStackType === "number" || typeof menuStackType === "string"
    ? (Number(menuStackType) as StackTypeEnum)
    : StackTypeEnum.HL;

/* ---------- 时间工具（与后端 TimeRange {min,max} 对齐） ---------- */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
/** 原 Load：产出时间默认 [本月1日, 下月1日-1秒] */
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
/** 原 Load：开始时间默认 [今天-7天, 今天+7天] */
function week7Range(): Date[] {
  const now = new Date();
  const begin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, now.getHours(), now.getMinutes());
  return [begin, end];
}
function nowDate(): Date {
  return new Date();
}
/** 多选下拉里的件次号原文按行拆（原 Split(['\r','\n'], RemoveEmptyEntries)） */
function splitLines(text: string): string[] {
  return text.split(/[\r\n]+/).filter(Boolean);
}

/* ---------- 下拉候选（原 FrmHR3600_Load 灌值） ---------- */
type Option = { label: string; value: string };
/** KV 字典（班次/班组）转下拉候选：原 ImageComboBoxItem(CName, CCode) */
function kvToOption(list: HmxKv[]): Option[] {
  return list.map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
}
const shiftOptions = ref<Option[]>([]);
const groupOptions = ref<Option[]>([]);
const stackOptions = ref<Option[]>([]);
const carOptions = ref<Option[]>([]);
/** 堆冷状态（原 AddEnum<Thr3010HlStatusEnum>()，LDisplay：已开始/已结束） */
const hlStatusOptions: Option[] = [
  { label: "已开始", value: String(Thr3010HlStatusEnum.EnterFur) },
  { label: "已结束", value: String(Thr3010HlStatusEnum.ExitFur) },
];
/** 去向（原 AddEnum(typeof(HlDesEnum), true)，LDisplay：剪切线/火切；默认剪切线） */
const hlDesOptions: Option[] = [
  { label: "剪切线", value: "10" },
  { label: "火切", value: "20" },
];

/* ---------- 上表查询与开始堆冷参数（stackPanel1 / stackPanel2 / dataLayoutControl1） ---------- */
const topInput = reactive({
  dates: monthRange() as Date[] | null,
  cBatchOrder: "",
  cPieceNoSlab: "",
  pieceNos: "",
  cStack: "" as string | null,
  nWd: null as number | null,
  dOpe: nowDate() as Date | null,
  cShift: "" as string,
  cGroup: "" as string,
  defaultStack: "" as string,
});

/* ---------- 下表查询与结束堆冷参数（stackPanel3 / stackPanel4） ---------- */
const bottomInput = reactive({
  cStack: "" as string | null,
  cBatchOrder: "",
  /** 原标签「板坯号」，但 C# 传给 queryDto.CPieceNo（照抄原接线） */
  cPieceNo: "",
  pieceNos: "",
  cdldq: false,
  nHlStatus: String(Thr3010HlStatusEnum.EnterFur) as string,
  dates: week7Range() as Date[] | null,
  nWd: null as number | null,
  dOpe: nowDate() as Date | null,
  cShift: "" as string,
  cGroup: "" as string,
  cDestination: "10" as string | null,
  carNo: "" as string | null,
});

/* ---------- 表格（gridView1 / Tyd2000Dto，gridView2 / Thr3010HlDto） ---------- */
const slabRows = shallowRef<Tyd2000[]>([]);
const hlRows = shallowRef<Thr3010Hl[]>([]);
const slabLoading = ref(false);
const hlLoading = ref(false);
const slabApi = ref<GridApi | null>(null);
const hlApi = ref<GridApi | null>(null);
function onSlabReady(e: GridReadyEvent) {
  slabApi.value = e.api;
}
function onHlReady(e: GridReadyEvent) {
  hlApi.value = e.api;
}
function rowId(p: GetRowIdParams) {
  return String(p.data?.id ?? "");
}

const slabColDefs: ColDef[] = [
  col("cOrderNo", "订单号"),
  col("cBatchOrder", "组批号"),
  col("cPieceNo", "件次号"),
  col("cPieceNoSlab", "板坯号"),
  col("cSgCode", "钢种"),
  col("nKSgCode", "国标钢种"),
  col("nStatus", "库存状态"),
  col("nThick", "厚度"),
  col("nWth", "宽度"),
  col("nLen", "长度"),
  col("nWgt", "实重"),
  col("dProTime", "产出时间"),
  col("cProUser", "产出人"),
  col("cShiftNo", "产出班次"),
  col("cGroupNo", "产出班组"),
  col("cStackNo", "垛位号"),
  col("cStackNum", "层号"),
  col("cCutFlag", "切边方式"),
  col("cCusName", "客户名称"),
  col("pLAN_CSpec", "剪切计划规格"),
  col("cOrderCustCname", "订货客户中文名称"),
  ...planCols("pLAN_COrderNo", [
    ["1", "订单号1"],
    ["2", "订单号2"],
    ["3", "订单号3"],
    ["4", "订单号4"],
    ["5", "订单号5"],
    ["6", "订单号6"],
  ]),
  ...planCols("pLAN_NLenPlan", [
    ["1", "套切长度1"],
    ["2", "套切长度2"],
    ["3", "套切长度3"],
    ["4", "套切长度4"],
    ["5", "套切长度5"],
    ["6", "套切长度6"],
  ]),
  col("nDbc", "倍尺"),
  col("cInboundNo", "入库标识"),
  hid("selected", "选择"),
  hid("id", "主键"),
  hid("cStove", "炉号"),
  hid("nProType", "库存分类"),
  hid("cPrintCode", "喷号"),
  hid("cLineCode", "产线"),
  hid("cProc", "工序代码"),
  hid("cMachine", "机台号"),
  hid("cStrandNo", "流号"),
  hid("cPlanId", "计划号"),
  hid("cConNo", "合同号"),
  hid("cMatCode", "物料编码"),
  hid("cSgStd", "执行标准"),
  hid("cSpec", "规格"),
  hid("nNum", "支数"),
  hid("nCalWgt", "理重"),
  hid("dInTime", "入库时间"),
  hid("cInUser", "入库人"),
  hid("cStoreCode", "库区号"),
  hid("cSourceStoreCode", "原库区号"),
  hid("cSourceStackNo", "原垛位号"),
  hid("cSourceStackNum", "原层号"),
  hid("cIsHot", "热送区分"),
  hid("cProRemark", "生产备注"),
  hid("nCastDivCode", "模连铸标识"),
  hid("cLockedLine", "占用产线"),
  hid("cLockedPlan", "占用计划"),
  hid("cMatType", "产品大类"),
  hid("cProdCode", "品名"),
  hid("cSteelType", "钢类"),
  hid("cDelivyStatusCode", "交货状态"),
  hid("cCustStdCode", "加工用途代码"),
  hid("cBatchNo", "批号"),
  hid("cOrderNoLast", "原始订单号"),
  hid("cDestination", "去向"),
  hid("cHotNo", "退火炉回号"),
  hid("cSlabType", "坯类"),
  hid("nQmStatus", "质量状态"),
  hid("nLockReason", "质量封锁原因"),
  hid("nQmLevel", "质量等级"),
  hid("cIsSurface", "是否表检"),
  hid("cSurfaceResult", "表检结果"),
  hid("cSurfaceDefectCode", "表面缺陷代码"),
  hid("cSurfaceDesc", "表检描述"),
  hid("cSurfaceUser", "表面判定人"),
  hid("dSurfaceTime", "表面判定时间"),
  hid("cDetectResultCode", "探伤判定结果"),
  hid("cDetectDefectLevel", "探伤等级"),
  hid("cDefectDefectCode", "探伤判定缺陷代码"),
  hid("cDefectDefectMark", "探伤判定缺陷描述"),
  hid("cDefectUser", "表面判定人"),
  hid("dDefectTime", "表面判定时间"),
  hid("cComplexDecideCode", "综判结果"),
  hid("cComplexDesc", "综判描述"),
  hid("cComplexUser", "综判人"),
  hid("dComplexTime", "综判时间"),
  hid("cQmHandleCode", "处置结果"),
  hid("cQmHandleDesc", "处置注释"),
  hid("cQmHandleUser", "处置人"),
  hid("dQmHandleTime", "处置时间"),
  hid("cSampleLotNo", "试批号"),
  hid("cSampleLotNoPre", "前试批号"),
  hid("cPlanTime", "计划日期"),
  hid("cDelivyAddress", "流向"),
  hid("cWgtToler", "公差等级"),
  hid("cBilletTypeCode", "铸坯标识"),
  hid("pLAN_NThickPlan", "轧制厚"),
  hid("pLAN_NWidthPlan", "轧制宽"),
  hid("pLAN_NLlCleanLen", "轧制长"),
  hid("cSpecialMarkGy", "工艺/性能要求"),
  hid("nBoarCleanLen", "母板净长"),
  hid("cTol", "公差"),
];

const hlColDefs: ColDef[] = [
  col("cPieceNo", "头侧件次号"),
  col("cHlStack", "堆冷垛位"),
  col("cHlStackNum", "堆冷层"),
  col("cOrderNo", "订单号"),
  ...planCols(
    "",
    [
      ["cOrderNo1", "订单号1"],
      ["cOrderNo2", "订单号2"],
      ["cOrderNo3", "订单号3"],
      ["cOrderNo4", "订单号4"],
    ],
    150,
  ),
  col("nThickOrder", "订单厚度", 150),
  ...planCols(
    "",
    [
      ["cInboundNo1", "入库标识1"],
      ["cInboundNo2", "入库标识2"],
      ["cInboundNo3", "入库标识3"],
      ["cInboundNo4", "入库标识4"],
    ],
    150,
  ),
  col("cBatchOrder", "组批号"),
  col("cStove", "炉号"),
  col("cIsQy", "取样板标记", 151),
  col("cPieceNoSlab", "板坯号"),
  col("cSgCode", "钢种"),
  col("cSgStd", "执行标准"),
  col("cSpec", "规格"),
  col("cSpecPlan", "剪切计划规格", 150),
  col("nThick", "坯厚"),
  col("nWidth", "坯宽"),
  col("nLen", "坯长"),
  col("nNum", "提货件数"),
  col("nWgt", "坯重"),
  col("nHlStatus", "缓冷状态"),
  col("nWdIn", "开始温度"),
  col("cHlShiftIn", "开始班次"),
  col("cHlGroupIn", "开始班组"),
  col("dLcIn", "上冷床时间", 150),
  col("nLcWd", "上冷床温度", 150),
  col("nLc", "冷床冷却时长", 150),
  col("dHlIn", "开始时间"),
  col("cHlUserIn", "开始人"),
  col("nHlHour", "计划堆冷时间"),
  col("nHlHourSj", "实际堆冷时间"),
  col("nHlHourSy", "剩余堆冷时间"),
  col("nWdOut", "结束温度"),
  col("cHlShiftOut", "结束班次"),
  col("cHlGroupOut", "结束班组"),
  col("dHlOut", "结束时间"),
  col("cHlUserOut", "结束人"),
  col("cOrderCustCname", "订货客户", 150),
  ...planCols(
    "",
    [
      ["nLenPlan1", "套切长度1"],
      ["nLenPlan2", "套切长度2"],
      ["nLenPlan3", "套切长度3"],
      ["nLenPlan4", "套切长度4"],
    ],
    150,
  ),
  ...planCols(
    "",
    [
      ["nWidthPlan1", "套切宽度1"],
      ["nWidthPlan2", "套切宽度2"],
      ["nWidthPlan3", "套切宽度3"],
      ["nWidthPlan4", "套切宽度4"],
    ],
    150,
  ),
  col("cExitem1", "是否工程单", 150),
  col("cTrimFlag", "切边方式", 150),
  col("cDestination", "去向", 150),
  col("cStoreCode", "库区号", 150),
  hid("selected", "选择"),
  hid("id", "主键"),
  hid("creator", "创建人"),
  hid("createTime", "创建时间"),
  hid("lastModifier", "最后修改人"),
  hid("lastModifyTime", "最后修改时间"),
  hid("cMxId", "THR3010主键"),
  hid("cLineCode", "产线"),
  hid("cBatchNo", "批号"),
  hid("cHlCode", "堆冷设备"),
  hid("cPlanNo", "计划号"),
  hid("cOrderNo5", "订单号5"),
  hid("cOrderNo6", "订单号6"),
  hid("nLenPlan5", "套切长度5"),
  hid("nLenPlan6", "套切长度6"),
  hid("cInboundNo5", "入库标识5"),
  hid("cInboundNo6", "入库标识6"),
  hid("nWidthPlan5", "套切宽度5"),
  hid("nWidthPlan6", "套切宽度6"),
];

/** 原 gridView2_RowStyle：剩余堆冷时间 <= 0 → GreenYellow */
function hlRowStyle(p: RowClassParams<Thr3010Hl>) {
  const sy = Number(p.data?.nHlHourSy);
  if (!Number.isNaN(sy) && p.data?.nHlHourSy != null && sy <= 0) {
    return { backgroundColor: "#d9f99d", color: "#3f6212" };
  }
  return undefined;
}

/* ---------- 通用确认（原 MsgBox.ShowYesNo） ---------- */
const confirmOpen = ref(false);
const confirmText = ref("");
let confirmAction: (() => Promise<void>) | null = null;
function askConfirm(text: string, action: () => Promise<void>) {
  confirmText.value = text;
  confirmAction = action;
  confirmOpen.value = true;
}
async function runConfirm() {
  const action = confirmAction;
  confirmOpen.value = false;
  confirmAction = null;
  if (action) await action();
}

/* ---------- 台账查询入参（DtoQuerySlabs 缺字段用本地扩展补传） ---------- */
type SlabsQuery = DtoQuerySlabs & { cStackType?: StackTypeEnum | null; cDldq?: boolean; cPieceNos?: string[] };
type HlPayload = HlDto & {
  cStoreCode?: string | null;
  cStackType?: StackTypeEnum | null;
  cDestination?: string | null;
  carNo?: string | null;
};

/** btnQueryStore_Click → hR3600Api.querySlabs */
async function querySlabs() {
  slabLoading.value = true;
  try {
    const dto: SlabsQuery = {
      cLineCode,
      cStoreCode,
      cStackType,
      dProTime: toTimeRange(topInput.dates),
      cBatchOrder: topInput.cBatchOrder.trim() || null,
      cPieceNoSlab: topInput.cPieceNoSlab.trim() || null,
      cPieceNos: splitLines(topInput.pieceNos),
    };
    slabRows.value = (await hR3600Api.querySlabs(dto)) ?? [];
    requestAnimationFrame(() => slabApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    slabLoading.value = false;
  }
}

/** btnQuery_Click → hR3600Api.queryHls */
async function queryHls() {
  hlLoading.value = true;
  try {
    const dto: SlabsQuery = {
      timeRange: toTimeRange(bottomInput.dates),
      cPieceNo: bottomInput.cPieceNo.trim() || null,
      cStack: bottomInput.cStack || null,
      cStackType,
      nHlStatus: Number(bottomInput.nHlStatus) as Thr3010HlStatusEnum,
      cBatchOrder: bottomInput.cBatchOrder.trim() || null,
      cDldq: bottomInput.cdldq,
      cPieceNos: splitLines(bottomInput.pieceNos),
    };
    hlRows.value = (await hR3600Api.queryHls(dto)) ?? [];
    requestAnimationFrame(() => hlApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    hlLoading.value = false;
  }
}

/** btnStart_Click → hR3600Api.startHl（上表勾选 → 开始堆冷） */
function onStart() {
  const select = (slabApi.value?.getSelectedData() as Tyd2000[] | undefined) ?? [];
  if (slabRows.value.length === 0 || select.length === 0) return;
  const dOpe = topInput.dOpe ?? new Date();
  if (Math.abs((Date.now() - dOpe.getTime()) / 86400000) > 7) {
    toast("开始堆冷时间有误，请选择前后7天以内的日期！", 2500, "warn");
    return;
  }
  if (!topInput.cStack) {
    toast("请选择垛位！", 2000, "warn");
    return;
  }
  askConfirm("是否确认勾选的材料开始堆冷？", async () => {
    const payload: HlPayload = {
      cIds: select.map((x) => String(x.id ?? "")),
      cShift: topInput.cShift || null,
      cGroup: topInput.cGroup || null,
      cStack: topInput.cStack,
      cStoreCode,
      cStackType,
      nWd: topInput.nWd ?? 0,
      dOpe: isoLocal(dOpe),
    };
    try {
      await hR3600Api.startHl(payload);
      toast("数据提交成功!", 2000, "success");
      await Promise.all([querySlabs(), queryHls()]);
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/** btnEnd_Click → hR3600Api.endHl（下表勾选 → 结束堆冷） */
function onEnd() {
  const select = (hlApi.value?.getSelectedData() as Thr3010Hl[] | undefined) ?? [];
  if (hlRows.value.length === 0 || select.length === 0) return;
  askConfirm("是否确认勾选的材料结束堆冷？", async () => {
    const payload: HlPayload = {
      cStoreCode,
      cIds: select.map((x) => String(x.id ?? "")),
      nWd: bottomInput.nWd ?? 0,
      cShift: bottomInput.cShift || null,
      cGroup: bottomInput.cGroup || null,
      dOpe: isoLocal(bottomInput.dOpe ?? new Date()),
      cDestination: bottomInput.cDestination ?? null,
      carNo: bottomInput.carNo ?? null,
    };
    try {
      await hR3600Api.endHl(payload);
      toast("数据提交成功!", 2000, "success");
      await queryHls();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/** btnDd_Click → 原开 FrmHR3601 倒垛弹窗（未迁移）：仅保留勾选校验与提示 */
function onDd() {
  const select = (hlApi.value?.getSelectedData() as Thr3010Hl[] | undefined) ?? [];
  if (hlRows.value.length === 0) return;
  if (select.length === 0) {
    toast("请勾选需要倒垛的材料！", 2000, "warn");
    return;
  }
  if (select.some((x) => x.nHlStatus === Thr3010HlStatusEnum.ExitFur)) {
    toast("请选择堆冷中材料操作！", 2000, "warn");
    return;
  }
  toast("倒垛弹窗（FrmHR3601）待接入", 2000, "warn");
}

/** btnSet_Click → hR3600Api.setDefaultStack（当前默认垛位 → 指定） */
function onSet() {
  if (!topInput.defaultStack) {
    toast("请选择要指定的垛位！", 2000, "warn");
    return;
  }
  askConfirm(`是否确认设置默认垛位为${topInput.defaultStack}？`, async () => {
    try {
      await hR3600Api.setDefaultStack({ cStoreCode, cStackType, cStackNo: topInput.defaultStack });
      toast("数据提交成功!", 2000, "success");
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* ---------- 初始化（原 FrmHR3600_Load：KV 灌值 + 垛位/车辆候选，不自动查询） ---------- */
onMounted(async () => {
  try {
    const [shifts, groups] = await Promise.all([
      systemKeyValueApi.getSysKvListByGroup("A0000:SHIFT"),
      systemKeyValueApi.getSysKvListByGroup("A0000:GROUP"),
    ]);
    shiftOptions.value = kvToOption(shifts ?? []);
    groupOptions.value = kvToOption(groups ?? []);
    /* 原 SelectedIndex = 0 */
    topInput.cShift = shiftOptions.value[0]?.value ?? "";
    topInput.cGroup = groupOptions.value[0]?.value ?? "";
    bottomInput.cShift = topInput.cShift;
    bottomInput.cGroup = topInput.cGroup;

    const stacks = (await tyd1000Api.getStack(cStoreCode, cStackType)) ?? [];
    stackOptions.value = stacks.map((x) => ({ label: x.cStackNo ?? "", value: x.cStackNo ?? "" }));
    /* 原 comStackCurrent 预选 cDefault == StackDefaultEnum.Default(0) 的垛位 */
    topInput.defaultStack = stacks.find((x) => String(x.cDefault ?? "") === "0")?.cStackNo ?? "";

    const cars = (await tyd1100Api.tyd1100Query("", cStoreCode)) ?? [];
    carOptions.value = cars.map((x) => ({ label: x.cCarNo ?? "", value: x.cCarNo ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Splitter layout="vertical" class="min-h-0 flex-1 border-0 bg-transparent">
      <SplitterPanel :size="50" :grow="false" class="flex min-h-0 flex-col overflow-hidden">
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">产出时间</label>
            <DatePicker
              v-model="topInput.dates"
              selection-mode="range"
              :manual-input="false"
              date-format="yy-mm-dd"
              show-time
              hour-format="24"
              show-icon
              placeholder="开始 至 结束"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">组批号</label>
            <InputText v-model="topInput.cBatchOrder" class="min-w-0 flex-1" @keydown.enter="querySlabs" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">板坯号</label>
            <InputText v-model="topInput.cPieceNoSlab" class="min-w-0 flex-1" @keydown.enter="querySlabs" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">件次号</label>
            <Textarea v-model="topInput.pieceNos" :rows="1" auto-resize fluid class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">垛位</label>
            <Select
              v-model="topInput.cStack"
              :options="stackOptions"
              option-label="label"
              option-value="value"
              :show-clear="true"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">开始温度</label>
            <div class="w-24 shrink-0">
              <InputNumber v-model="topInput.nWd" fluid :show-buttons="false" :min-fraction-digits="0" />
            </div>
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">开始时间</label>
            <DatePicker
              v-model="topInput.dOpe"
              :manual-input="false"
              date-format="yy-mm-dd"
              show-time
              hour-format="24"
              show-icon
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">班次</label>
            <Select
              v-model="topInput.cShift"
              :options="shiftOptions"
              option-label="label"
              option-value="value"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">班组</label>
            <Select
              v-model="topInput.cGroup"
              :options="groupOptions"
              option-label="label"
              option-value="value"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">当前默认垛位</label>
            <Select
              v-model="topInput.defaultStack"
              :options="stackOptions"
              option-label="label"
              option-value="value"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="slabLoading" @click="querySlabs">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onStart">
            <IconClockPlay class="h-3 w-3" />开始堆冷
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSet">
            <IconPinned class="h-3 w-3" />指定
          </Button>
          <span class="ml-auto shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">在制品材料</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="slabColDefs"
            :row-data="slabRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, enableClickSelection: true }"
            :get-row-id="rowId"
            :pagination="false"
            :animate-rows="false"
            :loading="slabLoading"
            @grid-ready="onSlabReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="50" :grow="false" class="flex min-h-0 flex-col overflow-hidden">
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">开始时间</label>
            <DatePicker
              v-model="bottomInput.dates"
              selection-mode="range"
              :manual-input="false"
              date-format="yy-mm-dd"
              show-time
              hour-format="24"
              show-icon
              placeholder="开始 至 结束"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">垛位</label>
            <Select
              v-model="bottomInput.cStack"
              :options="stackOptions"
              option-label="label"
              option-value="value"
              :show-clear="true"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">组批号</label>
            <InputText v-model="bottomInput.cBatchOrder" class="min-w-0 flex-1" @keydown.enter="queryHls" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">板坯号</label>
            <InputText v-model="bottomInput.cPieceNo" class="min-w-0 flex-1" @keydown.enter="queryHls" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">件次号</label>
            <Textarea v-model="bottomInput.pieceNos" :rows="1" auto-resize fluid class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">堆冷状态</label>
            <Select
              v-model="bottomInput.nHlStatus"
              :options="hlStatusOptions"
              option-label="label"
              option-value="value"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">已到期</label>
            <Checkbox v-model="bottomInput.cdldq" :binary="true" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">结束温度</label>
            <div class="w-24 shrink-0">
              <InputNumber v-model="bottomInput.nWd" fluid :show-buttons="false" :min-fraction-digits="0" />
            </div>
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">结束时间</label>
            <DatePicker
              v-model="bottomInput.dOpe"
              :manual-input="false"
              date-format="yy-mm-dd"
              show-time
              hour-format="24"
              show-icon
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">班次</label>
            <Select
              v-model="bottomInput.cShift"
              :options="shiftOptions"
              option-label="label"
              option-value="value"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">班组</label>
            <Select
              v-model="bottomInput.cGroup"
              :options="groupOptions"
              option-label="label"
              option-value="value"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">去向</label>
            <Select
              v-model="bottomInput.cDestination"
              :options="hlDesOptions"
              option-label="label"
              option-value="value"
              :show-clear="true"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-18 shrink-0 text-xs text-muted-foreground">车辆信息</label>
            <Select
              v-model="bottomInput.carNo"
              :options="carOptions"
              option-label="label"
              option-value="value"
              :show-clear="true"
              fluid
              class="min-w-0 flex-1"
            />
          </div>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="hlLoading" @click="queryHls">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDd">
            <IconArrowBackUp class="h-3 w-3" />倒垛
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEnd">
            <IconClockOff class="h-3 w-3" />结束堆冷
          </Button>
          <span class="ml-auto shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">缓冷材料</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="hlColDefs"
            :row-data="hlRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, enableClickSelection: true }"
            :get-row-id="rowId"
            :pagination="false"
            :animate-rows="false"
            :loading="hlLoading"
            :get-row-style="hlRowStyle"
            @grid-ready="onHlReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
    <Dialog v-model:visible="confirmOpen" header="操作确认" :modal="true" class="w-[26rem]" :closable="true">
      <p class="text-body">{{ confirmText }}</p>
      <div class="mt-4 flex items-center justify-end gap-2">
        <Button variant="outlined" @click="confirmOpen = false">取消</Button>
        <Button autofocus severity="contrast" @click="runConfirm">确定</Button>
      </div>
    </Dialog>
  </div>
</template>
