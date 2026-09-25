<script setup lang="ts">
/** 对应 FrmHR3010（已组批计划管理）：DDH.Winforms.SHR.Forms.FrmHR3010
 *  已接入：hR3000Api.queryThr3000Dtos / queryThr3010s / moveThr3000 / cancelZp / buildPlateQy / testIsNeedQY + testJobApi.getShowedQy
 *  待接入：二级弹窗 FrmHR3010_Add（材料添加，OK 后回刷组批计划）
 *  说明：生成代表样/查看代表样仅 system 账号可见（原 EngineContext.User.UserId != "system" 隐藏）；
 *        下发/确认按钮原窗体已注释移除，未迁；colCSteelType/colCTrimFlag KV 字典翻译缺省显示原值 */

import { computed, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { useAuthStore } from "@/stores/authStore";
import {
  hR3000Api,
  Thr3000StatusEnum,
  Thr3010FurStatusEnum,
  Thr3010RollStatusEnum,
  Thr3010JqStatusEnum,
  Thr3010StatusEnum,
  type Thr3000Dto,
  type Thr3010,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";
import { testJobApi, type QyRecordItemDto } from "@/api/mes4ddh/lims.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();
const cLineCode = menuQs[0] ?? "ZG01";
const isSystem = computed(() => useAuthStore().session?.userId === "system");

/* ---------- 时间（原 ucTimeRange，默认本月） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function monthRange(): Date[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  last.setSeconds(last.getSeconds() - 1);
  return [first, last];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（DtoQueryThr3000） ---------- */
const input = reactive({
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  cBatchNo: "",
  cStove: "",
  dates: monthRange() as Date[] | null,
});

/* ---------- 上表：组批计划（gridView1 / Thr3000Dto，勾选=Selected + 聚焦行） ---------- */
const zpRows = ref<Thr3000Dto[]>([]);
const zpLoading = ref(false);
const zpApi = ref<GridApi | null>(null);
const zpCurrent = ref<Thr3000Dto | null>(null);
function onZpReady(e: GridReadyEvent) {
  zpApi.value = e.api;
}
function onZpSelectionChanged() {
  const rows = zpApi.value?.getSelectedRows() as Thr3000Dto[] | undefined;
  zpCurrent.value = rows?.[0] ?? null;
  void bindMx(rows?.[0] ?? null);
}

/* ---------- 下表：计划材料明细（gridView2 / Thr3010，勾选=Selected） ---------- */
const mxRows = ref<Thr3010[]>([]);
const mxLoading = ref(false);
const mxApi = ref<GridApi | null>(null);
const mxCurrent = ref<Thr3010 | null>(null);
function onMxReady(e: GridReadyEvent) {
  mxApi.value = e.api;
}
function onMxSelectionChanged() {
  mxCurrent.value = (mxApi.value?.getSelectedRows()[0] as Thr3010 | undefined) ?? null;
}

/* ---------- 列定义 ---------- */
const zpStatusFmt = (p: ValueFormatterParams) => {
  const m: Record<string, string> = {
    [String(Thr3000StatusEnum.Batch)]: "已组批",
    [String(Thr3000StatusEnum.Ensure)]: "已确认",
    [String(Thr3000StatusEnum.Issue)]: "已下发",
    [String(Thr3000StatusEnum.Begin)]: "开始生产",
    [String(Thr3000StatusEnum.Finish)]: "轧制完成",
    [String(Thr3000StatusEnum.Close)]: "计划关闭",
  };
  return m[String(p.value)] ?? "";
};
const l2StatusFmt = (p: ValueFormatterParams) => {
  const m: Record<string, string> = {
    [String(Thr3010StatusEnum.ZZ_UNDO)]: "轧制计划-待下发L2",
    [String(Thr3010StatusEnum.ZZ_SENDED_ERROR)]: "轧制计划-下发L2失败",
    [String(Thr3010StatusEnum.ZZ_SENDED)]: "轧制计划-已下发L2",
    [String(Thr3010StatusEnum.ZZ_RESERVED_ERROR)]: "轧制计划-L2反馈失败",
    [String(Thr3010StatusEnum.ZZ_RESERVED_SUCCESS)]: "轧制计划-L2反馈成功",
    [String(Thr3010StatusEnum.JQ_SENDED)]: "剪切计划-已下发L2",
    [String(Thr3010StatusEnum.JQ_SENDED_ERROR)]: "剪切计划-下发L2失败",
    [String(Thr3010StatusEnum.L2_DOWN)]: "L2-钢板下线",
    [String(Thr3010StatusEnum.L2_UP)]: "L2-钢板上线",
    [String(Thr3010StatusEnum.L2_DELETE)]: "L2计划删除",
  };
  return m[String(p.value)] ?? "";
};
const furStatusFmt = (p: ValueFormatterParams) =>
  (
    ({
      [String(Thr3010FurStatusEnum.Batch)]: "已组批",
      [String(Thr3010FurStatusEnum.Wait)]: "待入炉",
      [String(Thr3010FurStatusEnum.RefuseBefore)]: "炉前拒收",
      [String(Thr3010FurStatusEnum.EnterFur)]: "入炉",
      [String(Thr3010FurStatusEnum.Eliminate)]: "剔炉",
      [String(Thr3010FurStatusEnum.ExitFur)]: "出炉",
      [String(Thr3010FurStatusEnum.RefuseAfter)]: "炉后拒收",
    }) as Record<string, string>
  )[String(p.value)] ?? "";
const rollStatusFmt = (p: ValueFormatterParams) =>
  (
    ({
      [String(Thr3010RollStatusEnum.Batch)]: "已组批",
      [String(Thr3010RollStatusEnum.Wait)]: "待入轧",
      [String(Thr3010RollStatusEnum.FinishRoll)]: "轧制完成",
      [String(Thr3010RollStatusEnum.Cut)]: "切断",
      [String(Thr3010RollStatusEnum.Waste)]: "轧废",
    }) as Record<string, string>
  )[String(p.value)] ?? "";
const jqStatusFmt = (p: ValueFormatterParams) =>
  (
    ({
      [String(Thr3010JqStatusEnum.Batch)]: "已组批",
      [String(Thr3010JqStatusEnum.Wait)]: "待剪切",
      [String(Thr3010JqStatusEnum.Finish)]: "剪切完成",
    }) as Record<string, string>
  )[String(p.value)] ?? "";

const zpColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cOrderNo1", field: "cOrderNo1", headerName: "订单号1", width: 112 },
  { colId: "cOrderNo2", field: "cOrderNo2", headerName: "订单号2", width: 112 },
  { colId: "cOrderNo3", field: "cOrderNo3", headerName: "订单号3", width: 112 },
  { colId: "cOrderNo4", field: "cOrderNo4", headerName: "订单号4", width: 112 },
  { colId: "nLenTq1", field: "nLenTq1", headerName: "套切1", width: 112 },
  { colId: "nLenTq2", field: "nLenTq2", headerName: "套切2", width: 112 },
  { colId: "nLenTq3", field: "nLenTq3", headerName: "套切3", width: 112 },
  { colId: "nLenTq4", field: "nLenTq4", headerName: "套切4", width: 112 },
  { colId: "nBc", field: "nBc", headerName: "倍尺", width: 112 },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 112 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "nWgtOrder", field: "nWgtOrder", headerName: "订单重量", width: 112 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 125 },
  { colId: "nRateSj", field: "nRateSj", headerName: "实际成材率", width: 125 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 112 },
  { colId: "cRemark", field: "cRemark", headerName: "生产备注", width: 112 },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 112, valueFormatter: zpStatusFmt },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 112 },
  { colId: "cDesignNo", field: "cDesignNo", headerName: "质量设计号", width: 125 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式:四切", width: 138 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112 },
  { colId: "cOverstepBl", field: "cOverstepBl", headerName: "短溢装比例", width: 125 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112 },
  { colId: "cShape", field: "cShape", headerName: "形状代码", width: 112 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部宽度余量", width: 138 },
  { colId: "cConfirmStatus", field: "cConfirmStatus", headerName: "收料状态", width: 112 },
  { colId: "cConfirmEmp", field: "cConfirmEmp", headerName: "收料人", width: 112 },
  { colId: "dConfirm", field: "dConfirm", headerName: "收料时间", width: 140 },
  { colId: "cConfirmShift", field: "cConfirmShift", headerName: "收料班次", width: 112 },
  { colId: "cConfirmGroup", field: "cConfirmGroup", headerName: "收料班组", width: 112 },
  { colId: "cCustCode", field: "cCustCode", headerName: "客户编码", width: 112 },
  { colId: "cCustName", field: "cCustName", headerName: "客户名称", width: 112 },
  { colId: "dDeliveryDate", field: "dDeliveryDate", headerName: "交货日期", width: 140 },
  { colId: "dOrdDate", field: "dOrdDate", headerName: "订单日期", width: 140 },
  { colId: "cSpecReqText", field: "cSpecReqText", headerName: "客户特殊要求", width: 138 },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 112 },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 125 },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 164 },
  { colId: "cConsigneeCustCname", field: "cConsigneeCustCname", headerName: "收货客户中文名称", width: 164 },
  { colId: "cIsMerge", field: "cIsMerge", headerName: "是否合并提料", width: 125 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
];

const mxColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 125 },
  { colId: "nStatus", field: "nStatus", headerName: "L2计划状态", width: 125, valueFormatter: l2StatusFmt },
  { colId: "cPrintCode", field: "cPrintCode", headerName: "喷印号", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120, hide: true },
  {
    colId: "nFurStatus",
    field: "nFurStatus",
    headerName: "加热炉状态",
    width: 125,
    hide: true,
    valueFormatter: furStatusFmt,
  },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 125, hide: true },
  {
    colId: "nRollStatus",
    field: "nRollStatus",
    headerName: "轧制状态",
    width: 112,
    hide: true,
    valueFormatter: rollStatusFmt,
  },
  { colId: "cRollCode", field: "cRollCode", headerName: "轧机编号", width: 112, hide: true },
  { colId: "cFinishEmp", field: "cFinishEmp", headerName: "轧制完成人", width: 125, hide: true },
  { colId: "dRoll", field: "dRoll", headerName: "轧制完成时间", width: 138, hide: true },
  { colId: "cRollShift", field: "cRollShift", headerName: "轧制完成班次", width: 138, hide: true },
  { colId: "cRollGroup", field: "cRollGroup", headerName: "轧制完成班组", width: 138, hide: true },
  {
    colId: "nJqStatus",
    field: "nJqStatus",
    headerName: "剪切计划状态",
    width: 138,
    hide: true,
    valueFormatter: jqStatusFmt,
  },
  { colId: "cJqCode", field: "cJqCode", headerName: "剪切设备", width: 112, hide: true },
];

/* ---------- 查询 ---------- */
async function queryZp() {
  zpLoading.value = true;
  try {
    const list =
      (await hR3000Api.queryThr3000Dtos({
        cLineCode,
        cOrderNo: input.cOrderNo.trim() || undefined,
        cSgCode: input.cSgCode.trim() || undefined,
        cSgStd: input.cSgStd.trim() || undefined,
        cBatchNo: input.cBatchNo.trim() || undefined,
        cStove: input.cStove.trim() || undefined,
        dCreateTimeRange: toTimeRange(input.dates),
      })) ?? [];
    zpRows.value = list;
    zpCurrent.value = null;
    mxRows.value = [];
    requestAnimationFrame(() => zpApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    zpLoading.value = false;
  }
}

async function bindMx(thr3000: Thr3000Dto | null) {
  mxLoading.value = true;
  try {
    const list = thr3000 ? ((await hR3000Api.queryThr3010s(thr3000.id ?? undefined)) ?? []) : [];
    mxRows.value = list;
    mxCurrent.value = null;
    requestAnimationFrame(() => mxApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    mxLoading.value = false;
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

/* ---------- 上移 / 下移 ---------- */
async function doMove(up: boolean) {
  const row = zpCurrent.value;
  if (!row) return;
  try {
    await hR3000Api.moveThr3000({
      cZpId: row.cBatchNo,
      cLineCode: row.cLineCode,
      up,
      dCreateTimeRange: toTimeRange(input.dates),
    });
    toast("数据保存成功！", 2000, "success");
    await queryZp();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnMoveUp() {
  const row = zpCurrent.value;
  if (!row) return;
  askConfirm(`是否确认上移批号${row.cBatchNo}？`, () => doMove(true));
}
function btnMoveDown() {
  const row = zpCurrent.value;
  if (!row) return;
  askConfirm(`是否确认下移批号${row.cBatchNo}？`, () => doMove(false));
}

/* ---------- 材料添加（二级弹窗待接入） ---------- */
function btnAdd() {
  const row = zpCurrent.value;
  if (!row) {
    toast("请选择组批计划操作！", 2000, "warn");
    return;
  }
  // 原 FrmHR3010_Add：材料添加弹窗（向组批计划追加坯料），OK 后回刷，待接入
  toast("材料添加弹窗 FrmHR3010_Add 待接入", 2500, "warn");
}

/* ---------- 撤销组批 ---------- */
async function doCancelZp() {
  const sel = (mxApi.value?.getSelectedRows() ?? []) as Thr3010[];
  const cMxIds = sel.map((x) => x.id).filter((x): x is string => !!x);
  try {
    await hR3000Api.cancelZp(cMxIds);
    toast("撤销成功！", 2000, "success");
    await queryZp();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnCancel() {
  if (mxRows.value.length === 0) {
    toast("请勾选组批计划明细操作！", 2000, "warn");
    return;
  }
  const sel = (mxApi.value?.getSelectedRows() ?? []) as Thr3010[];
  if (sel.length === 0) {
    toast("请勾选组批计划明细操作！", 2000, "warn");
    return;
  }
  askConfirm("是否确认取消组批选中的材料？", doCancelZp);
}

/* ---------- 生成代表样 / 查看代表样（system 专属） ---------- */
async function doBuildQy() {
  const row = zpCurrent.value;
  if (!row) return;
  try {
    await hR3000Api.buildPlateQy(row.cBatchNo ?? undefined);
    toast("数据提交成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}
function btnBuildQy() {
  const row = zpCurrent.value;
  if (!row) {
    toast("请选择批次后再操作", 2000, "warn");
    return;
  }
  askConfirm(`确认生成批次${row.cBatchNo}所在当天所有取样信息？`, doBuildQy);
}

const qyOpen = ref(false);
const qyMsg = ref("");
async function btnShowQy() {
  const row = mxCurrent.value;
  if (!row) {
    toast("请选择批次后查看", 2000, "warn");
    return;
  }
  try {
    const data = (await testJobApi.getShowedQy(row.cPieceNo ?? undefined)) ?? [];
    const str = data
      .map((w: QyRecordItemDto) => `${w.cStove} ${w.cSampBatchNo} ${w.cBatchNo}-${w.nOrder} ${w.cPieceNo} ${w.isQy}`)
      .join("\r\n");
    const str2 = await hR3000Api.testIsNeedQY(
      row.cBatchNo ?? undefined,
      Number(row.nOrder ?? 0),
      row.cPieceNo ?? undefined,
    );
    qyMsg.value = str + "\r\n" + String(str2 ?? "");
    qyOpen.value = true;
  } catch {
    /* 拦截层已 toast */
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下分栏：原 splitContainerControl1 261/490 ≈ 53% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="53" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">组批计划</span>
        </div>
        <!-- 查询条件区（订单号/钢种/执行标准/批号/炉号/组批时间） -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
            <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="queryZp" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
            <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="queryZp" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
            <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="queryZp" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
            <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="queryZp" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
            <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="queryZp" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">组批时间</label>
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
        <!-- 工具栏（查询/上移/下移/材料添加/撤销组批 [+system: 生成代表样/查看代表样]） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="zpLoading" @click="queryZp">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnMoveUp">上移</Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnMoveDown">下移</Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnAdd">材料添加</Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="btnCancel">
            撤销组批
          </Button>
          <template v-if="isSystem">
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnBuildQy">生成代表样</Button>
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnShowQy">查看代表样</Button>
          </template>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="zpColDefs"
            :row-data="zpRows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            :loading="zpLoading"
            @grid-ready="onZpReady"
            @selection-changed="onZpSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">计划材料明细</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="mxColDefs"
            :row-data="mxRows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            :loading="mxLoading"
            @grid-ready="onMxReady"
            @selection-changed="onMxSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

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

    <!-- 查看代表样结果（原 MsgBox.Show） -->
    <Dialog
      :visible="qyOpen"
      modal
      header="代表样"
      :style="{ width: 'min(36rem, calc(100vw - 2rem))' }"
      @update:visible="qyOpen = $event"
    >
      <pre class="text-xs whitespace-pre-wrap">{{ qyMsg }}</pre>
      <template #footer>
        <Button label="关闭" variant="outlined" @click="qyOpen = false" />
      </template>
    </Dialog>
  </div>
</template>
