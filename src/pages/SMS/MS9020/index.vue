<script setup lang="ts">
/** 对应 FrmMS9020（二炼钢板坯火切作业）：DDH.Winforms.SMS.Forms.FrmMS9020
 *  已接入：tyd2000Api.queryStorage（btnQueryStorage → BindStorage——主库存查询，CStoreCode=注入 StoreCode、炉号、件次号）
 *          + tms3000Api.hotCutStorage（btnCutItem → 确认切割，Tms3000CutItemDto）
 *          + tms3000Api.queryHotCutSJ（btnQuerySJ → BindSjRecord——火切实绩，LineCode+时间+炉号+件次号）
 *          + tms3000Api.cancelCutStorage（btnCancelCut → 取消切割，当前火切实绩行）
 *  结构（原 splitContainerControl1 Horizontal=false SplitterPosition=345）：
 *    上=splitContainerControl2 左右(900)：左=ucStorage1「材料明细」(UCStorage 127 可见+CStackNum 隐藏)、
 *      右=groupControl1「切割操作区」(总长度/长度1/长度2/长度3/炉号/规格/件次号 + 底栏确认切割)；
 *    下=stackPanel2(时间范围+炉号+件次号+查询+取消切割) + ucStorage2「火切实绩」(同 UCStorage 列集)
 *  查询条件（原 dataLayoutControl1）：炉号 / 件次号（与查询同排，原 stackPanel1）
 *  事件逻辑照 FrmMS9020.cs：焦点行→cutItem 映射；长度1 变更联动 长度2=NLen-长度1、长度3=0；
 *    长度校验「长度不正确\\r\\n母板长度…\\r\\n切断长度…=…」、确认「确认切割?\\r\\n…=…」、
 *    取消确认「确认取消?请确保火切板未入库」、库存状态拦截（≠在库）
 *  cQueryString：JSON {LineCode,StoreCode}（useMenuQuery）；StoreCode 缺失查询时照 C# 弹「库区错误」
 *  二级弹窗：无（FrmMS9020QueryStringDto 仅参数 DTO）
 *  待接入：无（tyd2000/queryStorage 的 mock 占位本批禁改未登记，Mock 模式点查询会提示未注册端点）
 *  字段桥接：extract PascalCase → 后端 JSON camelCase（PLAN_* → pLAN_*）
 *  偏差：UCStorage 原 Selected 勾选列由 row-selection 复选框呈现（ui-rules §7），原列 hide:true 保留在列面板；
 *        本页无勾选读取逻辑（切割/取消切割均作用于焦点行） */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { tms3000Api } from "@/api/mes4ddh/sms.swagger";
import { tyd2000Api, InventoryStatusEnum, type StorageInputDto } from "@/api/mes4ddh/syd.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs, json: menuJson } = useMenuQuery();
/** 原 HandleQueryString：JSON {LineCode,StoreCode}（缺失字段透传 undefined，查询时校验库区） */
const qsDto = menuJson as { LineCode?: string; StoreCode?: string };
const lineCode = qsDto.LineCode;
const storeCode = qsDto.StoreCode;

type TimeRange = { min?: string; max?: string };

const theme = makeHmxGridTheme();
const querying = ref(false);
const sjQuerying = ref(false);
const storageApi = ref<GridApi | null>(null);
const sjApi = ref<GridApi | null>(null);
const storageRows = ref<Record<string, unknown>[]>([]);
const sjRows = ref<Record<string, unknown>[]>([]);
const focusedStorage = ref<Record<string, unknown> | null>(null);
const focusedSj = ref<Record<string, unknown> | null>(null);

/* 主库存/火切结果共用 UCStorage 列集（extract：127 可见 + CStackNum 隐藏；列头 ←LDisplay:Tyd2000Dto） */
const storageCols = ref<ColDef[]>([
  { field: "selected", headerName: "选择", hide: true },
  { field: "id", headerName: "主键", width: 149 },
  { field: "cStove", headerName: "炉号", width: 149 },
  { field: "cPieceNo", headerName: "件次号", width: 149 },
  { field: "nProType", headerName: "库存分类", width: 149 },
  { field: "cPrintCode", headerName: "喷号", width: 149 },
  { field: "cLineCode", headerName: "产线", width: 149 },
  { field: "cProc", headerName: "工序代码", width: 149 },
  { field: "cMachine", headerName: "机台号", width: 149 },
  { field: "cStrandNo", headerName: "流号", width: 149 },
  { field: "cPlanId", headerName: "计划号", width: 149 },
  { field: "cConNo", headerName: "合同号", width: 149 },
  { field: "cOrderNo", headerName: "订单号", width: 149 },
  { field: "cMatCode", headerName: "物料编码", width: 149 },
  { field: "cSgCode", headerName: "钢种", width: 149 },
  { field: "cSgStd", headerName: "执行标准", width: 149 },
  { field: "nThick", headerName: "厚度", width: 149 },
  { field: "nWth", headerName: "宽度", width: 149 },
  { field: "nLen", headerName: "长度", width: 149 },
  { field: "cSpec", headerName: "规格", width: 149 },
  { field: "nNum", headerName: "支数", width: 149 },
  { field: "nCalWgt", headerName: "理重", width: 149 },
  { field: "nWgt", headerName: "实重", width: 149 },
  { field: "dProTime", headerName: "产出时间", width: 149 },
  { field: "cProUser", headerName: "产出人", width: 149 },
  { field: "cShiftNo", headerName: "产出班次", width: 149 },
  { field: "cGroupNo", headerName: "产出班组", width: 149 },
  { field: "dInTime", headerName: "入库时间", width: 149 },
  { field: "cInUser", headerName: "入库人", width: 149 },
  { field: "cStoreCode", headerName: "库区号", width: 149 },
  { field: "cArer", headerName: "区域", width: 149 },
  { field: "cStackNo", headerName: "垛位号", width: 149 },
  { field: "nStackNum", headerName: "层号", width: 150 },
  { field: "cSourceStoreCode", headerName: "原库区号", width: 149 },
  { field: "cSourceStackNo", headerName: "原垛位号", width: 149 },
  { field: "cSourceStackNum", headerName: "原层号", width: 149 },
  { field: "nStatus", headerName: "库存状态", width: 149 },
  { field: "cIsHot", headerName: "热送区分", width: 149 },
  { field: "cProRemark", headerName: "生产备注", width: 149 },
  { field: "nCastDivCode", headerName: "模连铸标识", width: 149 },
  { field: "cLockedLine", headerName: "占用产线", width: 149 },
  { field: "cLockedPlan", headerName: "占用计划", width: 149 },
  { field: "cMatType", headerName: "产品大类", width: 149 },
  { field: "cProdCode", headerName: "品名", width: 149 },
  { field: "cSteelType", headerName: "钢类", width: 149 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 149 },
  { field: "cCustStdCode", headerName: "加工用途代码", width: 149 },
  { field: "cBatchNo", headerName: "批号", width: 149 },
  { field: "cOrderNoLast", headerName: "原始订单号", width: 149 },
  { field: "cDestination", headerName: "去向", width: 149 },
  { field: "cHotNo", headerName: "退火炉回号", width: 149 },
  { field: "cSlabType", headerName: "坯类", width: 149 },
  { field: "cPieceNoSlab", headerName: "板坯号", width: 149 },
  { field: "nQmStatus", headerName: "质量状态", width: 149 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 149 },
  { field: "nQmLevel", headerName: "质量等级", width: 149 },
  { field: "cIsSurface", headerName: "是否表检", width: 149 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 149 },
  { field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 149 },
  { field: "cSurfaceDesc", headerName: "表检描述", width: 149 },
  { field: "cSurfaceUser", headerName: "表面判定人", width: 149 },
  { field: "dSurfaceTime", headerName: "表面判定时间", width: 149 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 149 },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 149 },
  { field: "cDefectDefectCode", headerName: "探伤判定缺陷代码", width: 149 },
  { field: "cDefectDefectMark", headerName: "探伤判定缺陷描述", width: 149 },
  { field: "cDefectUser", headerName: "表面判定人", width: 149 },
  { field: "dDefectTime", headerName: "表面判定时间", width: 149 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 149 },
  { field: "cComplexDesc", headerName: "综判描述", width: 149 },
  { field: "cComplexUser", headerName: "综判人", width: 149 },
  { field: "dComplexTime", headerName: "综判时间", width: 149 },
  { field: "cQmHandleCode", headerName: "处置结果", width: 149 },
  { field: "cQmHandleDesc", headerName: "处置注释", width: 149 },
  { field: "cQmHandleUser", headerName: "处置人", width: 149 },
  { field: "dQmHandleTime", headerName: "处置时间", width: 149 },
  { field: "cSampleLotNo", headerName: "试批号", width: 149 },
  { field: "cSampleLotNoPre", headerName: "前试批号", width: 149 },
  { field: "cCutFlag", headerName: "切边方式", width: 149 },
  { field: "cInboundNo", headerName: "入库标识", width: 149 },
  { field: "cDelivyAddress", headerName: "流向", width: 149 },
  { field: "cWgtToler", headerName: "公差等级", width: 149 },
  { field: "cBilletTypeCode", headerName: "铸坯标识", width: 149 },
  { field: "cCusName", headerName: "客户名称", width: 149 },
  { field: "pLAN_CSpec", headerName: "剪切计划规格", width: 149 },
  { field: "pLAN_NThickPlan", headerName: "轧制厚", width: 149 },
  { field: "pLAN_NWidthPlan", headerName: "轧制宽", width: 149 },
  { field: "pLAN_NLlCleanLen", headerName: "轧制长", width: 149 },
  { field: "pLAN_COrderNo1", headerName: "订单号1", width: 149 },
  { field: "pLAN_COrderNo2", headerName: "订单号2", width: 149 },
  { field: "pLAN_COrderNo3", headerName: "订单号3", width: 149 },
  { field: "pLAN_COrderNo4", headerName: "订单号4", width: 149 },
  { field: "pLAN_COrderNo5", headerName: "订单号5", width: 149 },
  { field: "pLAN_COrderNo6", headerName: "订单号6", width: 149 },
  { field: "pLAN_NLenPlan1", headerName: "套切长度1", width: 149 },
  { field: "pLAN_NLenPlan2", headerName: "套切长度2", width: 149 },
  { field: "pLAN_NLenPlan3", headerName: "套切长度3", width: 149 },
  { field: "pLAN_NLenPlan4", headerName: "套切长度4", width: 149 },
  { field: "pLAN_NLenPlan5", headerName: "套切长度5", width: 149 },
  { field: "pLAN_NLenPlan6", headerName: "套切长度6", width: 149 },
  { field: "nKSgCode", headerName: "国标钢种", width: 149 },
  { field: "cPlanTime", headerName: "计划日期", width: 149 },
  { field: "cTol", headerName: "公差", width: 149 },
  { field: "typeValues", headerName: "钢板分类", width: 73 },
  { field: "cAutoJudgeResult", headerName: "委托自动判定结果", width: 149 },
  { field: "cJudgeRemark", headerName: "委托判定备注", width: 149 },
  { field: "cJudgeResult", headerName: "委托最终判定结果", width: 149 },
  { field: "cJudgeUser", headerName: "委托判定人", width: 149 },
  { field: "cRecheckFlag", headerName: "复验标记", width: 149 },
  { field: "cStatus", headerName: "委托单状态", width: 149 },
  { field: "dJudgeTime", headerName: "委托判定时间", width: 149 },
  { field: "cTlSgCode", headerName: "炼钢钢种", width: 130 },
  { field: "cOutUser", headerName: "出库人", width: 100 },
  { field: "dOutTime", headerName: "出库时间", width: 100 },
  { field: "cInboundNo1", headerName: "入库标识1", width: 150 },
  { field: "cInboundNo2", headerName: "入库标识2", width: 150 },
  { field: "cInboundNo3", headerName: "入库标识3", width: 150 },
  { field: "cInboundNo4", headerName: "入库标识4", width: 150 },
  { field: "cInboundNo5", headerName: "入库标识5", width: 150 },
  { field: "cInboundNo6", headerName: "入库标识6", width: 150 },
  { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
  { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
  { field: "nDbc", headerName: "倍尺", width: 150 },
  { field: "lastModifier", headerName: "最后修改人", width: 150 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
  { field: "cIsMatchOrder", headerName: "是否满足订单要求", width: 150 },
  { field: "nTransferNo", headerName: "吊号", width: 150 },
  { field: "cStackNum", headerName: "层号", hide: true },
]);

/* 主库存查询（原 dataLayoutControl1：炉号/件次号；Load 默认时间=上周~明天） */
function dayAt(offset: number, h = 0, m = 0, s = 0): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset, h, m, s);
}
const q = reactive({ cStove: "", cPieceNo: "" });
const sjQ = reactive({
  cStove: "",
  cPieceNo: "",
  dates: [dayAt(-7), dayAt(1, 23, 59, 59)] as Date[] | null,
});

/* 切割操作区（原 bscCutItemDto : Tms3000CutItemDto；焦点行 MapTo 填充） */
const cut = reactive({
  id: undefined as string | undefined,
  cStove: "",
  cPieceNo: "",
  cSgCode: "",
  cSgStd: "",
  nThick: 0,
  nWth: null as number | null,
  nLen: null as number | null,
  cSpec: "",
  nLen1: 0,
  nLen2: 0,
  nLen3: 0,
});

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function onStorageReady(e: GridReadyEvent) { storageApi.value = e.api; }
function onSjReady(e: GridReadyEvent) { sjApi.value = e.api; }
function autosize(api: GridApi | null) { requestAnimationFrame(() => api?.autoSizeAllColumns()); }

/** 原 UcStorage1_FocusedRowObjectChanged：焦点行 MapTo→bscCutItemDto（长度1~3 归零） */
function onStorageRowClicked(e: { data?: Record<string, unknown> }) {
  const r = e.data;
  if (!r) return;
  focusedStorage.value = r;
  cut.id = (r.id ?? r.Id) as string | undefined;
  cut.cStove = String(r.cStove ?? r.CStove ?? "");
  cut.cPieceNo = String(r.cPieceNo ?? r.CPieceNo ?? "");
  cut.cSgCode = String(r.cSgCode ?? r.CSgCode ?? "");
  cut.cSgStd = String(r.cSgStd ?? r.CSgStd ?? "");
  cut.nThick = num(r.nThick ?? r.NThick);
  cut.nWth = (r.nWth ?? r.NWth) as number | null;
  cut.nLen = (r.nLen ?? r.NLen) as number | null;
  cut.cSpec = String(r.cSpec ?? r.CSpec ?? "");
  cut.nLen1 = 0;
  cut.nLen2 = 0;
  cut.nLen3 = 0;
}
function onSjRowClicked(e: { data?: Record<string, unknown> }) {
  if (e.data) focusedSj.value = e.data;
}

/** 原 spinEdit2_EditValueChanging（长度1）：长度2=NLen-长度1、长度3=0 */
function onLen1Change(v: number | null | undefined) {
  cut.nLen1 = v ?? 0;
  cut.nLen2 = (cut.nLen ?? 0) - cut.nLen1;
  cut.nLen3 = 0;
}

/** 原 btnQueryStorage_Click → BindStorage（StoreCode 缺失照 C# UserFriendlyException「库区错误」） */
async function loadStorage() {
  if (!storeCode) {
    toast("库区错误", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    const input: StorageInputDto = {
      cStoreCode: storeCode,
      cStove: q.cStove.trim() || undefined,
      cPieceNo: q.cPieceNo.trim() || undefined,
    };
    storageRows.value = ((await tyd2000Api.queryStorage(input)) ?? []) as Record<string, unknown>[];
    focusedStorage.value = null;
    autosize(storageApi.value);
  } finally {
    querying.value = false;
  }
}

/** 原 btnQuerySJ_Click → BindSjRecord */
async function loadSj() {
  sjQuerying.value = true;
  try {
    const input = {
      lineCode,
      timeRange: toTimeRange(sjQ.dates),
      cStove: sjQ.cStove.trim() || undefined,
      cPieceNo: sjQ.cPieceNo.trim() || undefined,
    };
    sjRows.value = ((await tms3000Api.queryHotCutSJ(input)) ?? []) as Record<string, unknown>[];
    focusedSj.value = null;
    autosize(sjApi.value);
  } finally {
    sjQuerying.value = false;
  }
}

/** 原 btnCutItem_Click：选中/库存状态/长度校验 + 确认 → HotCutStorage → 双表重查 */
async function onCut() {
  if (!focusedStorage.value) {
    toast("请选择数据后再操作", 2000, "warn");
    return;
  }
  if (num(focusedStorage.value.nStatus ?? focusedStorage.value.NStatus) !== InventoryStatusEnum.Normal) {
    toast("库存状态错误，不允许操作", 2500, "warn");
    return;
  }
  const lens = [cut.nLen1, cut.nLen2, cut.nLen3].filter((l) => l > 0);
  const sum = lens.reduce((a, b) => a + b, 0);
  const total = cut.nLen;
  if (total == null || sum !== total || lens.length === 1) {
    const parts = lens.join("+");
    toast(`长度不正确\n母板长度${total ?? ""}\n切断长度${parts}=${sum}`, 4000, "warn");
    return;
  }
  const parts = lens.join("+");
  if (!window.confirm(`确认切割?\n${parts}=${sum}`)) return;
  await tms3000Api.hotCutStorage({ ...cut });
  await loadStorage();
  await loadSj();
}

/** 原 btnCancelCut_Click：确认 → CancelCutStorage(ucStorage2.CurrentData) → 双表重查 */
async function onCancelCut() {
  if (!window.confirm("确认取消?请确保火切板未入库")) return;
  await tms3000Api.cancelCutStorage(focusedSj.value ?? undefined);
  await loadStorage();
  await loadSj();
}

onMounted(() => {
  /* 原构造：ucTimeRange1 = 上周 ~ 明天-1 秒（已入默认值）；查询由按钮触发 */
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部查询（原 dataLayoutControl1 炉号/件次号 + stackPanel1 查询；1~2 条件与按钮同排） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <InputText v-model="q.cStove" placeholder="炉号" class="w-40 shrink-0" @keydown.enter="loadStorage" />
      <InputText v-model="q.cPieceNo" placeholder="件次号" class="w-40 shrink-0" @keydown.enter="loadStorage" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="loadStorage">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 上下分栏（原 splitContainerControl1 Horizontal=false SplitterPosition=345 ≈ 上50%） -->
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="50" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 左右分栏（原 splitContainerControl2 左右 SplitterPosition=900 ≈ 左80%） -->
        <Splitter layout="horizontal" class="min-h-0 flex-1">
          <!-- ucStorage1「材料明细」 -->
          <SplitterPanel :size="80" :minSize="40" class="flex flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">材料明细</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="storageCols"
                :row-data="storageRows"
                :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                :pagination="false"
                :loading="querying"
                @grid-ready="onStorageReady"
                @row-clicked="onStorageRowClicked"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>

          <!-- groupControl1「切割操作区」：dataLayoutControl2 字段 + stackPanel3 底栏确认切割 -->
          <SplitterPanel :size="20" :minSize="12" class="flex flex-col overflow-hidden border-l border-border/60">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">切割操作区</span>
            </div>
            <div class="flex min-h-0 flex-1 flex-col gap-y-1.5 overflow-y-auto px-2 py-1.5">
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-14 shrink-0 text-xs text-muted-foreground">总长度</label>
                <InputNumber v-model="cut.nLen" :show-buttons="false" fluid class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-14 shrink-0 text-xs text-muted-foreground">长度1</label>
                <InputNumber v-model="cut.nLen1" :show-buttons="false" fluid class="min-w-0 flex-1" @update:model-value="onLen1Change" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-14 shrink-0 text-xs text-muted-foreground">长度2</label>
                <InputNumber v-model="cut.nLen2" :show-buttons="false" fluid class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-14 shrink-0 text-xs text-muted-foreground">长度3</label>
                <InputNumber v-model="cut.nLen3" :show-buttons="false" fluid class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-14 shrink-0 text-xs text-muted-foreground">炉号</label>
                <InputText v-model="cut.cStove" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-14 shrink-0 text-xs text-muted-foreground">规格</label>
                <InputText v-model="cut.cSpec" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-14 shrink-0 text-xs text-muted-foreground">件次号</label>
                <InputText v-model="cut.cPieceNo" class="min-w-0 flex-1" />
              </div>
            </div>
            <!-- stackPanel3（Dock=Bottom）：确认切割 -->
            <div class="flex h-9 shrink-0 items-center gap-1 border-t border-border/60 px-2">
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCut">确认切割</Button>
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <!-- 下：stackPanel2（火切查询+取消） + ucStorage2「火切实绩」 -->
      <SplitterPanel :size="50" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">时间</label>
          <DatePicker
            v-model="sjQ.dates"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            class="w-80 shrink-0"
          />
          <label class="shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="sjQ.cStove" placeholder="输入炉号查询" class="w-32 shrink-0" @keydown.enter="loadSj" />
          <label class="shrink-0 text-xs text-muted-foreground">件次号</label>
          <InputText v-model="sjQ.cPieceNo" placeholder="输入件次号查询" class="w-36 shrink-0" @keydown.enter="loadSj" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="sjQuerying" @click="loadSj">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelCut">取消切割</Button>
          <span class="ml-auto text-xs font-medium text-muted-foreground">火切实绩</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="storageCols"
            :row-data="sjRows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false"
            :loading="sjQuerying"
            @grid-ready="onSjReady"
            @row-clicked="onSjRowClicked"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
