<script setup lang="ts">
/** 对应 FrmHR4000（剪切实绩查询，HR4101/4102/4103 共用）：DDH.Winforms.SHR.Forms.FrmHR4000
 *  已接入：hR4000Api.queryPrintSjs / editSj / sdsl / querySg + systemKeyValueApi.getSysKvListByGroup(010100:CUTFLAG)
 *  待接入：手动打印/手动打印2（原 XtraReport 模板 400c11c8…/330d7961…）、装车调拨入库弹窗 FrmHR4000DB、添加实绩弹窗 FrmHR4000New、
 *         自动打印（原系统打印队列轮询）— 均为 web 侧占位提示
 *  偏差：手动同步仅 system 账号可见（同原）；原「开始/结束产出时间」死绑定未渲染（产出时间走 ucTimeRange→dProTime）；
 *       钢种下拉取 querySg 的 CSgSign，切边方式下拉取 kv（KV 列仍显示原值） */
import { computed, onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconDeviceFloppy, IconPlus, IconPrinter, IconRefresh, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { useAuthStore } from "@/stores/authStore";
import { systemKeyValueApi } from "@/api/admin/request";
import { hR4000Api, tPa1000Api, type DtoQuerySlabs, type Thr4000Dto, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const { parts: menuQs } = useMenuQuery();
const isSystem = computed(() => useAuthStore().session?.userId === "system");

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
function defaultRange(): Date[] {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return [new Date(now.getFullYear(), now.getMonth(), now.getDate()), end];
}

/* 产线/剪切线（菜单参数 "line" 或 "line,sl"） */
const qsParts = menuQs;
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string>(qsParts[0] ?? "");
const slCode = qsParts[1] ?? "";

const input = reactive({
  cStoreCode: "",
  cBatchNo: "",
  cPieceNo: "",
  cStove: "",
  cSgCode: "",
  cSgStd: "",
  cInboundNo: "",
  cOrderNo: "",
  dates: defaultRange() as Date[] | null,
});
// 原 dStart：自动打印起始时间（默认当前）
const printStart = ref<Date | null>(new Date());
const autoPrint = ref(false);

const rows = shallowRef<Thr4000Dto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 150 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 150 },
  { colId: "cSlCode", field: "cSlCode", headerName: "剪切线代码", width: 150 },
  { colId: "cPrint", field: "cPrint", headerName: "喷印完成标记", width: 150 },
  { colId: "printCount", field: "printCount", headerName: "打印次数", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "头侧件次号", width: 150 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 150 },
  { colId: "cIsCc", field: "cIsCc", headerName: "是否超长", width: 150 },
  { colId: "cIsDc", field: "cIsDc", headerName: "是否短尺", width: 150 },
  { colId: "cIsMatchOrder", field: "cIsMatchOrder", headerName: "是否满足订单要求", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "坯重", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "处理标记", width: 150 },
  { colId: "cJqShift", field: "cJqShift", headerName: "剪切班次", width: 150 },
  { colId: "cJqGroup", field: "cJqGroup", headerName: "剪切班组", width: 150 },
  { colId: "cJqCode", field: "cJqCode", headerName: "剪切设备", width: 150 },
  { colId: "cJqUser", field: "cJqUser", headerName: "剪切人", width: 150 },
  { colId: "dJq", field: "dJq", headerName: "剪切时间", width: 150 },
  { colId: "nOrderThick", field: "nOrderThick", headerName: "订货厚", width: 150 },
  { colId: "nOrderWidth", field: "nOrderWidth", headerName: "订货宽", width: 150 },
  { colId: "cOrderLenType", field: "cOrderLenType", headerName: "合同长度类型", width: 150 },
  { colId: "nOrderLen", field: "nOrderLen", headerName: "订货长mm", width: 150 },
  { colId: "nOrderLenMin", field: "nOrderLenMin", headerName: "订单长", width: 150 },
  { colId: "nOrderLenMax", field: "nOrderLenMax", headerName: "订单长2", width: 150 },
  { colId: "cEngMinThick", field: "cEngMinThick", headerName: "厚度下偏差", width: 150 },
  { colId: "cEngMaxThick", field: "cEngMaxThick", headerName: "厚度上偏差", width: 150 },
  { colId: "cEngMinWidth", field: "cEngMinWidth", headerName: "宽度下偏差", width: 150 },
  { colId: "cEngMaxWidth", field: "cEngMaxWidth", headerName: "宽度上偏差", width: 150 },
  { colId: "cEngMinLen", field: "cEngMinLen", headerName: "长度下偏差", width: 150 },
  { colId: "cEngMaxLen", field: "cEngMaxLen", headerName: "长度上偏差", width: 150 },
  { colId: "cCustName", field: "cCustName", headerName: "客户名称", width: 150 },
  { colId: "dDeliveryDate", field: "dDeliveryDate", headerName: "交货日期", width: 150 },
  { colId: "dOrdDate", field: "dOrdDate", headerName: "订单日期", width: 150 },
  { colId: "cSpecReqText", field: "cSpecReqText", headerName: "客户特殊要求", width: 150 },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 150 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 150 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 150 },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 150 },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
  { colId: "cConsigneeCustCname", field: "cConsigneeCustCname", headerName: "收货客户中文名称", width: 150 },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150 },
  { colId: "cSgCodeSlab", field: "cSgCodeSlab", headerName: "钢坯钢种", width: 150 },
  { colId: "cSgStdSlab", field: "cSgStdSlab", headerName: "坯料执行标准", width: 150 },
  { colId: "cSpecSlab", field: "cSpecSlab", headerName: "板坯规格", width: 150 },
  { colId: "nThickSlab", field: "nThickSlab", headerName: "坯料厚度", width: 150 },
  { colId: "nWidthSlab", field: "nWidthSlab", headerName: "坯料宽度", width: 150 },
  { colId: "nLenSlab", field: "nLenSlab", headerName: "坯料长度", width: 150 },
  { colId: "cSurfaceResult", field: "cSurfaceResult", headerName: "表检结果", width: 150 },
  { colId: "nQuaSlab", field: "nQuaSlab", headerName: "钢坯总支数", width: 150 },
  { colId: "nWgtSlab", field: "nWgtSlab", headerName: "坯重", width: 150 },
  { colId: "cMatCodeSlab", field: "cMatCodeSlab", headerName: "坯料物料编码", width: 150 },
  { colId: "cMatNameSlab", field: "cMatNameSlab", headerName: "坯料物料名称", width: 150 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 150 },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 150 },
  { colId: "cRollCode", field: "cRollCode", headerName: "轧机编号", width: 150 },
  { colId: "dSurfaceTime", field: "dSurfaceTime", headerName: "表面判定时间", width: 150 },
  { colId: "cSurfaceUser", field: "cSurfaceUser", headerName: "表面判定人", width: 150 },
  { colId: "cSurfaceRemark", field: "cSurfaceRemark", headerName: "缺陷描述", width: 150 },
  { colId: "cRespDept", field: "cRespDept", headerName: "责任部门", width: 150 },
  { colId: "cFaceHandleAdvice", field: "cFaceHandleAdvice", headerName: "处置措施", width: 150 },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 150 },
  { colId: "cSampleLotNoSlab", field: "cSampleLotNoSlab", headerName: "坯料试批号", width: 150 },
  { colId: "cQmHandleDesc", field: "cQmHandleDesc", headerName: "处置注释", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 150 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 150 },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名", width: 150 },
  { colId: "cWgtToler", field: "cWgtToler", headerName: "重量偏差等级", width: 150 },
  { colId: "lastPrintTime", field: "lastPrintTime", headerName: "最后打印时间", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "cPlanId", field: "cPlanId", headerName: "计划ID", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "thr3000主键", width: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 150, hide: true },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 150, hide: true },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 150, hide: true },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 150, hide: true },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 150, hide: true },
  { colId: "cMatCode", field: "cMatCode", headerName: "物料编码", width: 150, hide: true },
  { colId: "cMatName", field: "cMatName", headerName: "物料名称", width: 150, hide: true },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 150, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 150, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 150, hide: true },
  { colId: "cCustCode", field: "cCustCode", headerName: "客户编码", width: 150, hide: true },
  { colId: "dFinish", field: "dFinish", headerName: "完成时间", width: 150, hide: true },
  { colId: "cFinishShift", field: "cFinishShift", headerName: "完成班次", width: 150, hide: true },
  { colId: "cFinishGroup", field: "cFinishGroup", headerName: "完成班组", width: 150, hide: true },
  { colId: "cFinishEmp", field: "cFinishEmp", headerName: "轧制完成人", width: 150, hide: true },
  { colId: "cConfirmStatus", field: "cConfirmStatus", headerName: "确认判定状态", width: 150, hide: true },
  { colId: "cConfirmShift", field: "cConfirmShift", headerName: "收料班次", width: 150, hide: true },
  { colId: "cConfirmGroup", field: "cConfirmGroup", headerName: "收料班组", width: 150, hide: true },
  { colId: "cConfirmEmp", field: "cConfirmEmp", headerName: "收料人", width: 150, hide: true },
  { colId: "dConfirm", field: "dConfirm", headerName: "收料时间", width: 150, hide: true },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 150, hide: true },
  { colId: "lastPrintUser", field: "lastPrintUser", headerName: "最后打印人", width: 150, hide: true },
  { colId: "dPrint", field: "dPrint", headerName: "喷印完成时间", width: 150, hide: true },
];

/* ---------- 产出实绩修改面板（原 detail GroupControl + FocusedRow 填充） ---------- */
const detail = reactive({
  cPieceNo: "",
  cInboundNo: "",
  nThick: null as number | null,
  nWidth: null as number | null,
  nLen: null as number | null,
  cSgCode: "",
  cTrimFlag: null as string | null,
  cOrderNo: "",
});
const sgOptions = ref<{ label: string; value: string }[]>([]);
const trimOptions = ref<{ label: string; value: string }[]>([]);

function onSelectionChanged() {
  const row = (api.value?.getSelectedRows()[0] as Thr4000Dto | undefined) ?? null;
  if (!row) return;
  detail.cPieceNo = row.cPieceNo ?? "";
  detail.cInboundNo = row.cInboundNo ?? "";
  detail.nThick = row.nThick ?? null;
  detail.nWidth = row.nWidth ?? null;
  detail.nLen = row.nLen ?? null;
  detail.cSgCode = row.cSgCode ?? "";
  detail.cTrimFlag = row.cTrimFlag ?? null;
  detail.cOrderNo = row.cOrderNo ?? "";
}

async function query() {
  loading.value = true;
  try {
    const dto: DtoQuerySlabs = {
      cLineCode: lineCode.value || null,
      cSlCode: slCode || null,
      cStoreCode: input.cStoreCode.trim() || null,
      cBatchNo: input.cBatchNo.trim() || null,
      cPieceNo: input.cPieceNo.trim() || null,
      cStove: input.cStove.trim() || null,
      cSgCode: input.cSgCode.trim() || null,
      cSgStd: input.cSgStd.trim() || null,
      cInboundNo: input.cInboundNo.trim() || null,
      cOrderNo: input.cOrderNo.trim() || null,
      dProTime: toTimeRange(input.dates),
    };
    rows.value = (await hR4000Api.queryPrintSjs(dto)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

function selectedRows(): Thr4000Dto[] {
  return (api.value?.getSelectedRows() as Thr4000Dto[] | undefined) ?? [];
}

/* ---------- 受控确认 ---------- */
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

/* ---------- 手动打印 / 手动打印2（占位：原 XtraReport 报表） ---------- */
function doPrint(which: 1 | 2) {
  if (rows.value.length === 0) return;
  const select = selectedRows();
  if (select.length === 0) {
    toast("请勾选打印的数据！", 2500, "warn");
    return;
  }
  const notPrinted = select.filter((x) => x.cPrint !== "1");
  const go = () => toast(`打印功能待接入（原报表模板 ${which === 1 ? "400c11c8…" : "330d7961…"}）`, 2500, "warn");
  if (notPrinted.length > 0) {
    const piece = notPrinted.map((x) => x.cPieceNo ?? "").join(",");
    askConfirm(piece + "还未喷印完成，是否确认手动打印？", async () => go());
  } else {
    go();
  }
}

/* ---------- 装车调拨入库（原 FrmHR4000DB 弹窗未迁移） ---------- */
function btnZC() {
  const select = selectedRows();
  if (select.length === 0) {
    toast("请选择后再操作", 2500, "warn");
    return;
  }
  if (new Set(select.map((w) => w.cStoreCode)).size > 1) {
    toast("请选择同一库区的数据进行操作", 2500, "warn");
    return;
  }
  askConfirm("调拨入库弹窗（FrmHR4000DB）待迁移，是否继续？", async () => {
    toast("装车调拨入库待接入（原 FrmHR4000DB 弹窗）", 2500, "warn");
  });
}

/* ---------- 添加实绩（原 FrmHR4000New 弹窗未迁移） ---------- */
function btnAdd() {
  toast("添加实绩弹窗（FrmHR4000New）待迁移", 2500, "warn");
}

/* ---------- 手动同步（system 账号） ---------- */
const syncing = ref(false);
async function btnTb() {
  syncing.value = true;
  try {
    await hR4000Api.sdsl();
    toast("同步成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    syncing.value = false;
  }
}

/* ---------- 自动打印开关（占位：原系统打印队列轮询） ---------- */
function toggleAutoPrint() {
  autoPrint.value = !autoPrint.value;
  if (autoPrint.value) toast("自动打印待接入（原 XtraReport 系统打印队列轮询）", 2500, "warn");
}

/* ---------- 保存（产出实绩修改 → EditSj） ---------- */
async function doSave() {
  if (!detail.cPieceNo) return;
  try {
    await hR4000Api.editSj({
      cPieceNo: detail.cPieceNo,
      cInboundNo: detail.cInboundNo,
      cSgCode: detail.cSgCode,
      nThick: detail.nThick ?? undefined,
      nWidth: detail.nWidth ?? undefined,
      nLen: detail.nLen ?? undefined,
      cOrderNo: detail.cOrderNo,
      cTrimFlag: detail.cTrimFlag ?? undefined,
    } as Parameters<typeof hR4000Api.editSj>[0]);
    toast("数据修改成功！", 2000, "success");
    await query();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnSave() {
  if (!detail.cPieceNo) return;
  askConfirm("是否确认修改子板" + detail.cPieceNo + "的信息？", doSave);
}

onMounted(async () => {
  try {
    const [devices, kv, sg] = await Promise.all([
      tPa1000Api.queryLines() ?? [],
      systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG") ?? [],
      hR4000Api.querySg() ?? [],
    ]);
    lineOptions.value = devices.map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    if (!lineCode.value && lineOptions.value.length) lineCode.value = lineOptions.value[0].value;
    trimOptions.value = kv.map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    sgOptions.value = sg.map((x) => ({ label: x.cSgSign ?? "", value: x.cSgSign ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件 -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
        <Select
          v-model="lineCode"
          :options="lineOptions"
          option-label="label"
          option-value="value"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">库区</label>
        <InputText v-model="input.cStoreCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="input.cInboundNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <!-- 产出时间：占两列（同 ui-rules 日期范围 col-span-2） -->
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
        <DatePicker
          v-model="input.dates"
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
    </div>

    <!-- 工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="doPrint(1)">
        <IconPrinter class="h-3 w-3" />手动打印
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="doPrint(2)">
        <IconPrinter class="h-3 w-3" />手动打印2
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnZC">装车调拨入库</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnAdd">
        <IconPlus class="h-3 w-3" />添加实绩
      </Button>
      <Button v-if="isSystem" variant="outlined" class="shrink-0 whitespace-nowrap" :loading="syncing" @click="btnTb">
        <IconRefresh class="h-3 w-3" />手动同步
      </Button>
      <Checkbox :model-value="autoPrint" binary input-id="autoPrint" @update:model-value="toggleAutoPrint" />
      <label for="autoPrint" class="text-xs text-muted-foreground">自动打印</label>
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">打印起始时间</label>
      <DatePicker
        v-model="printStart"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        class="w-44 shrink-0"
      />
    </div>

    <!-- 表格 -->
    <div class="min-h-0 flex-[7] overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @selection-changed="onSelectionChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 产出实绩修改 -->
    <div class="flex shrink-0 flex-col border-t border-border/60">
      <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="text-xs font-medium text-muted-foreground">产出实绩修改</span>
      </div>
      <!-- 一行网格：标签在上、控件占满格宽；订单号格 col-span-2，input 右侧紧挨保存 -->
      <div class="grid shrink-0 grid-cols-10 items-end gap-x-2 gap-y-1 px-3 py-2">
        <div class="flex min-w-0 flex-col gap-0.5">
          <label class="truncate text-xs text-muted-foreground">子板号</label>
          <InputText v-model="detail.cPieceNo" class="w-full min-w-0" />
        </div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <label class="truncate text-xs text-muted-foreground">入库标识</label>
          <InputText v-model="detail.cInboundNo" class="w-full min-w-0" />
        </div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <label class="truncate text-xs text-muted-foreground">厚度</label>
          <InputNumber
            v-model="detail.nThick"
            :min="0"
            :max="9999"
            :use-grouping="false"
            class="w-full min-w-0"
            :show-buttons="false"
            input-class="w-full"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <label class="truncate text-xs text-muted-foreground">宽度</label>
          <InputNumber
            v-model="detail.nWidth"
            :min="0"
            :max="9999"
            :use-grouping="false"
            class="w-full min-w-0"
            :show-buttons="false"
            input-class="w-full"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <label class="truncate text-xs text-muted-foreground">长度</label>
          <InputNumber
            v-model="detail.nLen"
            :min="0"
            :max="99999"
            :use-grouping="false"
            class="w-full min-w-0"
            :show-buttons="false"
            input-class="w-full"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <label class="truncate text-xs text-muted-foreground">钢种</label>
          <Select
            v-model="detail.cSgCode"
            :options="sgOptions"
            option-label="label"
            option-value="value"
            class="w-full min-w-0"
          />
        </div>
        <div class="flex min-w-0 flex-col gap-0.5">
          <label class="truncate text-xs text-muted-foreground">切边方式</label>
          <Select
            v-model="detail.cTrimFlag"
            :options="trimOptions"
            option-label="label"
            option-value="value"
            class="w-full min-w-0"
          />
        </div>
        <!-- 订单号 + 保存：按钮紧挨 input -->
        <div class="col-span-2 flex min-w-0 flex-col gap-0.5">
          <label class="truncate text-xs text-muted-foreground">订单号</label>
          <div class="flex min-w-0 items-center gap-1.5">
            <InputText v-model="detail.cOrderNo" class="min-w-0 flex-1" />
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnSave">
              <IconDeviceFloppy class="h-3 w-3" />保存
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
