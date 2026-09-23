<script setup lang="ts">
/** 对应 FrmHR3700（火切作业）：DDH.Winforms.SHR.Forms.FrmHR3700
 *  已接入：hR3700Api.getHqSlabs / queryJQPlans / createSjByPlan / checkIsQy / saveJq + systemKeyValueApi.getSysKvListByGroup(A0000:SHIFT / A0000:GROUP)
 *  待接入：原「添加/删除」实绩按钮 Designer Visible=false（画面不显示），未迁
 *  偏差：colCTrimFlag 原走 KV 字典翻译，web 显示原值；菜单参数 cQueryString 为 JSON（cStoreCode 等） */

import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { TrackableList } from "@/api/common/trackableList";
import { systemKeyValueApi } from "@/api/admin/request";
import {
  hR3700Api,
  type HqDto,
  type OrderDto,
  type Thr4000,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { json: menuJson } = useMenuQuery();

/* ---------- 时间范围（原 ucTimeRange1，默认 昨天 0 点 ~ 7 天后当前时刻） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 1);
  const b = new Date();
  b.setDate(b.getDate() + 7);
  return [a, b];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（DtoQuerySlabs，cLineCode/cStoreCode 来自菜单 JSON 参数） ---------- */
const input = reactive({
  cOrderNo: "",
  cBatchNo: "",
  cPieceNo: "",
  cStove: "",
  cSgCode: "",
  cSpec: "",
  dates: defaultRange() as Date[] | null,
});
const cLineCode = typeof menuJson.cLineCode === "string" ? menuJson.cLineCode : undefined;
const cStoreCode = typeof menuJson.cStoreCode === "string" ? menuJson.cStoreCode : undefined;
const cStoreCodes = Array.isArray(menuJson.cStoreCodes) ? (menuJson.cStoreCodes as string[]) : undefined;

/* ---------- 班次/班组下拉（原 comShift/comGroup，KV 字典 A0000:SHIFT / A0000:GROUP） ---------- */
const shiftOptions = ref<{ label: string; value: string }[]>([]);
const groupOptions = ref<{ label: string; value: string }[]>([]);
const shift = ref<string>("");
const group = ref<string>("");
const isQy = ref(false);

/* ---------- 材料信息（gridView1 / HqDto，聚焦行=单选） ---------- */
const hqRows = ref<HqDto[]>([]);
const hqLoading = ref(false);
const hqApi = ref<GridApi | null>(null);
const hqCurrent = ref<HqDto | null>(null);
function onHqReady(e: GridReadyEvent) { hqApi.value = e.api; }
function onHqSelectionChanged() {
  const row = (hqApi.value?.getSelectedRows()[0] as HqDto | undefined) ?? null;
  hqCurrent.value = row;
  void onHqFocused(row);
}

/* ---------- 剪切计划（gridView2 / OrderDto） ---------- */
const planRows = ref<OrderDto[]>([]);
const planLoading = ref(false);
const planApi = ref<GridApi | null>(null);
function onPlanReady(e: GridReadyEvent) { planApi.value = e.api; }

/* ---------- 剪切结果（gridView3 / Thr4000，TrackableList 行内编辑） ---------- */
const trackList = shallowRef<TrackableList<Thr4000>>(new TrackableList<Thr4000>());
const sjLoading = ref(false);
const sjApi = ref<GridApi | null>(null);
function onSjReady(e: GridReadyEvent) { sjApi.value = e.api; }
function onSjCellValueChanged(e: CellValueChangedEvent) {
  sjApi.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}

/* ---------- 列定义 ---------- */
const yesNoFmt = (p: ValueFormatterParams) => (p.value == null ? "" : String(p.value) === "Y" ? "是" : "否");

const hqColDefs: ColDef[] = [
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 125 },
  { colId: "cIsQy", field: "cIsQy", headerName: "取样板标记", width: 125, valueFormatter: yesNoFmt },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112 },
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWth", field: "nWth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "实重", width: 112 },
  { colId: "cProRemark", field: "cProRemark", headerName: "生产备注", width: 112 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同备注", width: 112 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 112, hide: true },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112, hide: true },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 112, hide: true },
];

const planColDefs: ColDef[] = [
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThickPlan", field: "nThickPlan", headerName: "计划厚度", width: 112 },
  { colId: "nWidthPlan", field: "nWidthPlan", headerName: "计划宽度", width: 112 },
  { colId: "nLenPlan", field: "nLenPlan", headerName: "计划长度", width: 112 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112 },
  { colId: "cConRemark", field: "cConRemark", headerName: "合同要求", width: 112 },
];

const sjColDefs: ColDef[] = [
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112, editable: true },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112, editable: true },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112, editable: true },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112, editable: true },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112, editable: true },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112, editable: true },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112, editable: true },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112, editable: true },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112, editable: true },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 112, editable: true },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112, editable: true },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112, editable: true },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112, editable: true },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cPlanId", field: "cPlanId", headerName: "THR2000", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000", width: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112, hide: true },
  { colId: "cMatCode", field: "cMatCode", headerName: "物料编码", width: 112, hide: true },
  { colId: "cMatName", field: "cMatName", headerName: "物料描述", width: 112, hide: true },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 112, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 112, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 112, hide: true },
  { colId: "cEngMinThick", field: "cEngMinThick", headerName: "厚度下偏差", width: 125, hide: true },
  { colId: "cEngMaxThick", field: "cEngMaxThick", headerName: "厚度上偏差", width: 125, hide: true },
  { colId: "cEngMinWidth", field: "cEngMinWidth", headerName: "宽度下偏差", width: 125, hide: true },
  { colId: "cEngMaxWidth", field: "cEngMaxWidth", headerName: "宽度上偏差", width: 125, hide: true },
  { colId: "cEngMinLen", field: "cEngMinLen", headerName: "长度下偏差", width: 125, hide: true },
  { colId: "cEngMaxLen", field: "cEngMaxLen", headerName: "长度上偏差", width: 125, hide: true },
  { colId: "cCustCode", field: "cCustCode", headerName: "客户编码", width: 112, hide: true },
  { colId: "cCustName", field: "cCustName", headerName: "客户名称", width: 112, hide: true },
  { colId: "dDeliveryDate", field: "dDeliveryDate", headerName: "交货日期", width: 140, hide: true },
  { colId: "dOrdDate", field: "dOrdDate", headerName: "订单日期", width: 140, hide: true },
  { colId: "cSpecReqText", field: "cSpecReqText", headerName: "客户特殊要求", width: 138, hide: true },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 112, hide: true },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112, hide: true },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态代码", width: 138, hide: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125, hide: true },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 164, hide: true },
  { colId: "cConsigneeCustCname", field: "cConsigneeCustCname", headerName: "收货客户中文名称", width: 164, hide: true },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "坯料件次号", width: 125, hide: true },
  { colId: "cSgCodeSlab", field: "cSgCodeSlab", headerName: "坯料钢种", width: 112, hide: true },
  { colId: "cSgStdSlab", field: "cSgStdSlab", headerName: "坯料执行标准", width: 138, hide: true },
  { colId: "cSpecSlab", field: "cSpecSlab", headerName: "坯料规格", width: 112, hide: true },
  { colId: "nThickSlab", field: "nThickSlab", headerName: "坯料厚度", width: 112, hide: true },
  { colId: "nWidthSlab", field: "nWidthSlab", headerName: "坯料宽度", width: 112, hide: true },
  { colId: "nLenSlab", field: "nLenSlab", headerName: "坯料长度", width: 112, hide: true },
  { colId: "nQuaSlab", field: "nQuaSlab", headerName: "坯料支数", width: 112, hide: true },
  { colId: "nWgtSlab", field: "nWgtSlab", headerName: "坯料重量", width: 112, hide: true },
  { colId: "cMatCodeSlab", field: "cMatCodeSlab", headerName: "坯料物料编码", width: 138, hide: true },
  { colId: "cMatNameSlab", field: "cMatNameSlab", headerName: "坯料物料名称", width: 138, hide: true },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 112, hide: true },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 125, hide: true },
  { colId: "cRollCode", field: "cRollCode", headerName: "轧机编号", width: 112, hide: true },
  { colId: "dFinish", field: "dFinish", headerName: "完成时间", width: 140, hide: true },
  { colId: "cFinishShift", field: "cFinishShift", headerName: "完成班次", width: 112, hide: true },
  { colId: "cFinishGroup", field: "cFinishGroup", headerName: "完成班组", width: 112, hide: true },
  { colId: "cFinishEmp", field: "cFinishEmp", headerName: "收料完成人", width: 125, hide: true },
  { colId: "cConfirmStatus", field: "cConfirmStatus", headerName: "收料状态", width: 112, hide: true },
  { colId: "cConfirmShift", field: "cConfirmShift", headerName: "收料班次", width: 112, hide: true },
  { colId: "cConfirmGroup", field: "cConfirmGroup", headerName: "收料班组", width: 112, hide: true },
  { colId: "cConfirmEmp", field: "cConfirmEmp", headerName: "收料完成人", width: 125, hide: true },
  { colId: "dConfirm", field: "dConfirm", headerName: "收料完成时间", width: 138, hide: true },
  { colId: "cSurfaceResult", field: "cSurfaceResult", headerName: "表检结果", width: 112, hide: true },
  { colId: "dSurfaceTime", field: "dSurfaceTime", headerName: "表检时间", width: 140, hide: true },
  { colId: "cSurfaceUser", field: "cSurfaceUser", headerName: "表检人", width: 112, hide: true },
  { colId: "cSurfaceRemark", field: "cSurfaceRemark", headerName: "表检说明", width: 112, hide: true },
  { colId: "cRespDept", field: "cRespDept", headerName: "责任部门", width: 112, hide: true },
  { colId: "cFaceHandleAdvice", field: "cFaceHandleAdvice", headerName: "处置意见", width: 112, hide: true },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 112, hide: true },
  { colId: "cSampleLotNoSlab", field: "cSampleLotNoSlab", headerName: "坯料试批号", width: 125, hide: true },
  { colId: "cQmHandleDesc", field: "cQmHandleDesc", headerName: "处置注释", width: 112, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "入库状态", width: 112, hide: true },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 112, hide: true },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 112, hide: true },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 112, hide: true },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112, hide: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112, hide: true },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名", width: 112, hide: true },
  { colId: "cWgtToler", field: "cWgtToler", headerName: "重量偏差等级", width: 138, hide: true },
  { colId: "nOrderThick", field: "nOrderThick", headerName: "合同厚度", width: 112, hide: true },
  { colId: "nOrderWidth", field: "nOrderWidth", headerName: "合同宽度", width: 112, hide: true },
  { colId: "cOrderLenType", field: "cOrderLenType", headerName: "合同长度类型", width: 138, hide: true },
  { colId: "nOrderLenMax", field: "nOrderLenMax", headerName: "合同长度上限", width: 138, hide: true },
  { colId: "nOrderLenMin", field: "nOrderLenMin", headerName: "合同长度下限", width: 138, hide: true },
  { colId: "nOrderLen", field: "nOrderLen", headerName: "合同长度", width: 112, hide: true },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 112, hide: true },
  { colId: "cPrint", field: "cPrint", headerName: "喷印完成标记", width: 125, hide: true },
  { colId: "cSlCode", field: "cSlCode", headerName: "剪切线代码", width: 125, hide: true },
  { colId: "dPrint", field: "dPrint", headerName: "喷印完成时间(停用)", width: 164, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
];

/* ---------- 数据绑定 ---------- */
async function onQuery() {
  hqLoading.value = true;
  try {
    const list = (await hR3700Api.getHqSlabs({
      cLineCode,
      cStoreCode,
      cStoreCodes,
      cOrderNo: input.cOrderNo.trim() || undefined,
      cBatchNo: input.cBatchNo.trim() || undefined,
      cPieceNo: input.cPieceNo.trim() || undefined,
      cStove: input.cStove.trim() || undefined,
      cSgCode: input.cSgCode.trim() || undefined,
      cSpec: input.cSpec.trim() || undefined,
      dProTime: toTimeRange(input.dates),
    })) ?? [];
    hqRows.value = list;
    hqCurrent.value = null;
    planRows.value = [];
    trackList.value = new TrackableList<Thr4000>();
    requestAnimationFrame(() => hqApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    hqLoading.value = false;
  }
}

async function onHqFocused(item: HqDto | null) {
  planLoading.value = true;
  try {
    const plans = item ? (await hR3700Api.queryJQPlans(item.cPieceNo ?? undefined)) ?? [] : [];
    planRows.value = plans as OrderDto[];
    isQy.value = !!item && item.cIsQy === "Y";
    trackList.value = new TrackableList<Thr4000>();
    requestAnimationFrame(() => planApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    planLoading.value = false;
  }
}

/* ---------- 按计划产出 ---------- */
async function onRefresh() {
  const item = hqCurrent.value;
  if (!item) return;
  sjLoading.value = true;
  try {
    trackList.value = new TrackableList<Thr4000>();
    const list = (await hR3700Api.createSjByPlan(item.id ?? undefined)) ?? [];
    for (const row of list) trackList.value.push(row);
    requestAnimationFrame(() => sjApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    sjLoading.value = false;
  }
}

/* ---------- ShowYesNo 受控确认 ---------- */
const confirmOpen = ref(false);
const confirmMsg = ref("");
let confirmAction: (() => Promise<void>) | null = null;
function askConfirm(msg: string, action: () => Promise<void>) {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmOpen.value = true;
}
async function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  if (act) await act();
}

/* ---------- 保存 ---------- */
async function doSave(item: HqDto, cIsNew: string) {
  try {
    await hR3700Api.saveJq({
      cSlabId: item.id,
      cShift: shift.value || undefined,
      cGroup: group.value || undefined,
      cIsQy: isQy.value ? "Y" : "N",
      cIsNew,
      thr4000s: trackList.value.SaveChangesData,
    });
    await onQuery();
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}
async function onSave() {
  const item = hqCurrent.value;
  if (!item) return;
  const diff = trackList.value.SaveChangesData;
  if (diff.addedItems.length === 0 && diff.deletedItems.length === 0 && diff.changedItems.length === 0) return;
  let msg = "是否确认保存修改？";
  let cIsNew = "N";
  if (isQy.value) {
    try {
      const res = await hR3700Api.checkIsQy(item.cPieceNo ?? undefined);
      if (res === "Y") {
        msg = `${item.cPieceNo}的试坯已取样，是否生成新的代表样并保存产出？`;
        cIsNew = "Y";
      }
    } catch {
      /* 拦截层已 toast */
      return;
    }
  }
  askConfirm(msg, () => doSave(item, cIsNew));
}

onMounted(async () => {
  try {
    const [shifts, groups] = await Promise.all([
      systemKeyValueApi.getSysKvListByGroup("A0000:SHIFT"),
      systemKeyValueApi.getSysKvListByGroup("A0000:GROUP"),
    ]);
    shiftOptions.value = [...(shifts ?? [])]
      .sort((a, b) => String(a.cOrder ?? "").localeCompare(String(b.cOrder ?? "")))
      .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    groupOptions.value = [...(groups ?? [])]
      .sort((a, b) => String(a.cOrder ?? "").localeCompare(String(b.cOrder ?? "")))
      .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    if (shiftOptions.value.length) shift.value = shiftOptions.value[0].value;
    if (groupOptions.value.length) group.value = groupOptions.value[0].value;
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：订单号/批号/件次号/炉号/钢种/规格/产出时间） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">规格</label>
        <InputText v-model="input.cSpec" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
        <DatePicker v-model="input.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
    </div>
    <!-- 查询按钮行（原 stackPanel1） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="hqLoading" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 上（材料信息 | 剪切计划）下（剪切结果）：原 split1 422/851≈50%、split2 1455/1896≈77% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="50" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
        <Splitter class="min-h-0 flex-1">
          <SplitterPanel :size="77" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">材料信息</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="hqColDefs" :row-data="hqRows"
                :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
                :pagination="false" :animate-rows="false" :loading="hqLoading"
                @grid-ready="onHqReady" @selection-changed="onHqSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
          <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">剪切计划</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="planColDefs" :row-data="planRows"
                :pagination="false" :animate-rows="false" :loading="planLoading"
                @grid-ready="onPlanReady" @first-data-rendered="autoSizeOnFirstData" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 剪切结果工具栏（原 stackPanel2：按计划产出/班次/班组/取样板标记/保存；添加/删除原画面隐藏未迁） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="sjLoading" @click="onRefresh">
            按计划产出
          </Button>
          <label class="ml-2 shrink-0 text-xs text-muted-foreground">班次</label>
          <Select v-model="shift" :options="shiftOptions" option-label="label" option-value="value"
            class="w-28 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">班组</label>
          <Select v-model="group" :options="groupOptions" option-label="label" option-value="value"
            class="w-28 shrink-0" />
          <div class="ml-2 flex shrink-0 items-center gap-1.5">
            <Checkbox v-model="isQy" binary inputId="checkQy" />
            <label for="checkQy" class="text-xs text-muted-foreground">取样板标记</label>
          </div>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
            <IconDeviceFloppy class="h-3 w-3" />保存
          </Button>
        </div>
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">剪切结果</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="sjColDefs" :row-data="trackList"
            :pagination="false" :animate-rows="false" :loading="sjLoading"
            @grid-ready="onSjReady" @cell-value-changed="onSjCellValueChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>

    <Dialog :visible="confirmOpen" modal header="确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
