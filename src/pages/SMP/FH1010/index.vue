<script setup lang="ts">
/** 对应 FrmFH1010（发货装车确认，菜单 cQueryString=1003）：DDH.Winforms.SMP.Forms.FrmFH1010
 *  已接入：fh2000Api.getFhJl2000Lst / getFhTyd2000 / getFh1002Lst / addFhMat / sendJL / delMat
 *          + systemKeyValueApi A0000:GROUP（班组）、A0000:SHIFT（班次）
 *  待接入：无二级弹窗
 *  布局（按需求调整过标题与按钮归属）：
 *    查询行 h-9(车牌号/物流号/查询 ……… 制卡发货明细 右) → 上下Splitter：
 *    上=制卡发货明细表（标题已并入查询行，不再有独立标题条）；下=h-9(勾选件数/重量/班组/班次 ……… 成品库存 右)
 *    → 左右Splitter：左=成品库存表（标题已上移） | 右=装车明细 h-9[材料删除|确认装车|下发计量称重 ……… 装车明细 右] + 表 */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconRefresh, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { systemKeyValueApi } from "@/api/admin/request";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  fh2000Api,
  type Fh1002,
  type InputFh1000Dto,
  type InputFh2000Dto,
  type QueryFhJl2000Dto,
  type QueryFhTyd2000Dto,
} from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: menuQs } = useMenuQuery();

const q = reactive({ cVehicleNo: "", cMatchId: "" });

/* ---------- 列 ---------- */
const jlColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cMatchId", headerName: "物流号", width: 130 },
  { field: "cBillOfLadingNo", headerName: "提货单号", width: 130 },
  { field: "cVehicleNo", headerName: "车牌号", width: 110 },
  { field: "nZcStatus", headerName: "装车状态", width: 100 },
  { field: "cOrderCustCname", headerName: "订货客户名称", width: 150 },
  { field: "cMatName", headerName: "物料名称", width: 130 },
  { field: "nNum", headerName: "提货件数", width: 90 },
  { field: "nWgt", headerName: "提货重量", width: 100 },
  { field: "nZcNum", headerName: "装车件数", width: 90 },
  { field: "nZcWgt", headerName: "装车重量", width: 100 },
  { field: "nSyNum", headerName: "剩余件数", width: 90 },
  { field: "nSyWgt", headerName: "剩余重量", width: 100 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "cSpec", headerName: "规格", width: 120 },
  { field: "nLenMin", headerName: "长度下限", width: 90 },
  { field: "nLenMax", headerName: "长度上限", width: 90 },
  { field: "cPlanId", headerName: "计划号", width: 130 },
  { field: "nTare", headerName: "皮重", width: 90 },
  { field: "dTareTime", headerName: "皮重时间", width: 150 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "cRemark", headerName: "备注", width: 130 },
  { field: "cTargetPlace", headerName: "收货地点", width: 130 },
  { field: "cShipName", headerName: "船名", width: 100 },
  { field: "cPort", headerName: "港口", width: 100 },
  { field: "cMatCode", headerName: "物料编码", width: 120 },
  { field: "cTaskId", headerName: "任务号", width: 130 },
  { field: "cOrderNo", headerName: "订单号", width: 140 },
  { field: "bcarea", headerName: "流向区域", width: 100 },
  { field: "gc", headerName: "公差", width: 80 },
  { field: "gyqbDesc", headerName: "切边", width: 80 },
  { field: "gyrcl", headerName: "交货状态", width: 90 },
  { field: "gyts", headerName: "探伤", width: 80 },
  { field: "qualitygradeDesc", headerName: "质量等级", width: 90 },
  { field: "performancemark", headerName: "性能要求", width: 100 },
  { field: "sysRemark", headerName: "系统备注", width: 130 },
  { field: "cOrderCustNo", headerName: "订货客户编码", hide: true },
  { field: "cOutStockCode", headerName: "出库仓库", hide: true },
  { field: "nThick", headerName: "厚度", hide: true },
  { field: "nWidth", headerName: "宽度", hide: true },
  { field: "cLengthType", headerName: "长度类型", hide: true },
  { field: "cQualityNo", headerName: "质量号", hide: true },
  { field: "nOutLen", headerName: "出库长度", hide: true },
  { field: "nSwlx", headerName: "事务类型", hide: true },
  { field: "cKhzd", headerName: "客户终端", hide: true },
]);

const stockColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cPieceNo", headerName: "件次号", width: 140 },
  { field: "cStackNo", headerName: "垛位号", width: 100 },
  { field: "cStackNum", headerName: "层号", width: 70 },
  { field: "cInboundNo", headerName: "入库标识", width: 100 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "cSpec", headerName: "规格", width: 120 },
  { field: "nLen", headerName: "长度", width: 90 },
  { field: "nCalWgt", headerName: "理重", width: 90 },
  { field: "nThick", headerName: "厚度", width: 80 },
  { field: "nWth", headerName: "宽度", width: 80 },
  { field: "nNum", headerName: "支数", width: 80 },
  { field: "cOrderNo", headerName: "订单号", width: 140 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "cStove", headerName: "炉号", width: 100 },
  { field: "cBatchNo", headerName: "批号", width: 110 },
  { field: "cStoreCode", headerName: "库区号", width: 100 },
  { field: "cCustName", headerName: "客户名称", width: 140 },
  { field: "cProdCode", headerName: "品名", width: 100 },
  { field: "cSpecialMarkGy", headerName: "性能要求", width: 100 },
  { field: "cWgtToler", headerName: "公差", width: 80 },
  { field: "cCutFlag", headerName: "切边方式", width: 90 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 90 },
  { field: "nQmLevel", headerName: "质量等级", width: 90 },
  { field: "cDelivyAddress", headerName: "流向", width: 120 },
  { field: "cDetectDefectLevel", headerName: "探伤等级", width: 90 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 110 },
  { field: "cSurfaceResult", headerName: "表检结果", width: 90 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 100 },
  { field: "nQmStatus", headerName: "质量状态", width: 90 },
  { field: "nLockReason", headerName: "质量封锁原因", width: 110 },
  { field: "nWgt", headerName: "实重", hide: true },
]);

const matColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cMatchId", headerName: "物流号", width: 130 },
  { field: "cMatNo", headerName: "件次号", width: 140 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "cSpec", headerName: "规格", width: 120 },
  { field: "nMatCount", headerName: "件数", width: 80 },
  { field: "nMatActWgt", headerName: "材料重量", width: 100 },
  { field: "nMatThick", headerName: "材料厚度", width: 90 },
  { field: "nMatWidth", headerName: "材料宽度", width: 90 },
  { field: "nMatLen", headerName: "材料长度", width: 90 },
  { field: "cMatName", headerName: "物料名称", width: 130 },
  { field: "cBillOfLadingNo", headerName: "提货单号", width: 130 },
  { field: "cStove", headerName: "炉号", width: 100 },
  { field: "cBatchNo", headerName: "批号", width: 110 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "cStockCode", headerName: "库区代码", width: 100 },
  { field: "cStockRoomNo", headerName: "库位号", width: 90 },
  { field: "cLayerno", headerName: "层号", width: 70 },
  { field: "cOrderNo", headerName: "订单号", width: 140 },
  { field: "nSelectMode", headerName: "装车模式", width: 90 },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "lastModifier", headerName: "最后修改人", width: 110 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
  { field: "cTaskId", headerName: "任务号", width: 130 },
  { field: "cPlanId", headerName: "计划号", width: 130 },
  { field: "nMatNetWgt", headerName: "结算重量", hide: true },
  { field: "nMatDiscrepWgt", headerName: "磅差重量", hide: true },
  { field: "cConNo", headerName: "合同号", hide: true },
  { field: "nMatNum", headerName: "材料支数", hide: true },
  { field: "cTrnpcodeact", headerName: "运输方式", hide: true },
  { field: "id", headerName: "C_ID", hide: true },
  { field: "cMatCode", headerName: "物料编码", hide: true },
]);

/* ---------- 状态 ---------- */
const jlRows = ref<QueryFhJl2000Dto[]>([]);
const stockRows = ref<QueryFhTyd2000Dto[]>([]);
const matRows = ref<Fh1002[]>([]);
const querying = ref(false);
const jlApi = ref<GridApi | null>(null);
const stockApi = ref<GridApi | null>(null);
const matApi = ref<GridApi | null>(null);

/* stackPanel2：勾选件数/重量 + 班次/班组 */
const checkedCount = ref(0);
const checkedWgt = ref(0);
const cGroupNo = ref<string | null>(null);
const cShiftNo = ref<string | null>(null);
const groupOptions = ref<{ label: string; value: string }[]>([]);
const shiftOptions = ref<{ label: string; value: string }[]>([]);

function onJlReady(e: GridReadyEvent) {
  jlApi.value = e.api;
}
function onStockReady(e: GridReadyEvent) {
  stockApi.value = e.api;
}
function onMatReady(e: GridReadyEvent) {
  matApi.value = e.api;
}

function selectedJl(): QueryFhJl2000Dto[] {
  return (jlApi.value?.getSelectedRows() ?? []) as QueryFhJl2000Dto[];
}
function selectedStock(): QueryFhTyd2000Dto[] {
  return (stockApi.value?.getSelectedRows() ?? []) as QueryFhTyd2000Dto[];
}
function selectedMat(): Fh1002[] {
  return (matApi.value?.getSelectedRows() ?? []) as Fh1002[];
}
function focusJl(): QueryFhJl2000Dto | null {
  return (jlApi.value?.getSelectedNodes()[0]?.data as QueryFhJl2000Dto | undefined) ?? null;
}

/* ---------- 事件（对齐 FrmFH1010.cs） ---------- */
async function bindData() {
  const input: InputFh2000Dto = {
    cVehicleNo: q.cVehicleNo || null,
    cMatchId: q.cMatchId || null,
    flag: "1",
    tclass: menuQs || null,
  };
  const list = ((await fh2000Api.getFhJl2000Lst(input)) ?? []) as QueryFhJl2000Dto[];
  jlRows.value = list;
  jlApi.value?.setGridOption("rowData", list);
  requestAnimationFrame(() => jlApi.value?.autoSizeAllColumns());
  stockRows.value = [];
  matRows.value = [];
  checkedCount.value = 0;
  checkedWgt.value = 0;
  stockApi.value?.setGridOption("rowData", []);
  matApi.value?.setGridOption("rowData", []);
}

async function bindZcMx(current: QueryFhJl2000Dto | null) {
  if (!current) {
    stockRows.value = [];
    matRows.value = [];
    stockApi.value?.setGridOption("rowData", []);
    matApi.value?.setGridOption("rowData", []);
    return;
  }
  const input: InputFh2000Dto = {
    cBillOfLadingNo: current.cBillOfLadingNo ?? null,
    cMatchId: current.cMatchId ?? null,
    cVehicleNo: current.cVehicleNo ?? null,
    cPlanId: current.cPlanId ?? null,
    cMatCode: current.cMatCode ?? null,
  };
  const [stock, mats] = await Promise.all([fh2000Api.getFhTyd2000(input), fh2000Api.getFh1002Lst(input)]);
  stockRows.value = (stock ?? []) as QueryFhTyd2000Dto[];
  matRows.value = (mats ?? []) as Fh1002[];
  stockApi.value?.setGridOption("rowData", stockRows.value);
  matApi.value?.setGridOption("rowData", matRows.value);
  requestAnimationFrame(() => {
    stockApi.value?.autoSizeAllColumns();
    matApi.value?.autoSizeAllColumns();
  });
}

async function onQuery() {
  if (!q.cVehicleNo.trim() && !q.cMatchId.trim()) {
    toast("请输入车号或物流号", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    await bindData();
    if (!jlRows.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 主行变化 → 装车材料/库存（原 gridView1_FocusedRowChanged） */
async function onJlSelectionChanged() {
  const row = focusJl();
  if (row) row.cKhzd = "PC";
  querying.value = true;
  try {
    await bindZcMx(row);
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 勾选件数/重量（原 EventAggregator_GlobalCheckedChanged，作用于成品库存表） */
function onStockSelectionChanged() {
  const sel = selectedStock();
  checkedCount.value = sel.reduce((s, x) => s + (x.nNum ?? 0), 0);
  checkedWgt.value = sel.reduce((s, x) => s + (x.nWgt ?? 0), 0);
}

/* btnOk 确认装车 → AddFhMat */
async function onConfirm() {
  const selected = selectedJl();
  if (!selected.length) {
    toast("请选择上方物流项！", 2000, "warn");
    return;
  }
  if (selected.length > 1) {
    toast("只能选择一项发货明细操作！", 2000, "warn");
    return;
  }
  const mats = selectedStock();
  if (!mats.length) {
    toast("请选择要发货的材料！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const jlmx = selected[0]!;
  const payload: InputFh1000Dto = {
    cMatchId: jlmx.cMatchId ?? null,
    cVehicleNo: jlmx.cVehicleNo ?? null,
    cMatCode: jlmx.cMatCode ?? null,
    cKhzd: "PC",
    cGroupNo: cGroupNo.value ?? null,
    cShiftNo: cShiftNo.value ?? null,
    matLst: mats.map((x) => ({ cPieceNo: x.cPieceNo ?? null })),
  };
  querying.value = true;
  try {
    await fh2000Api.addFhMat(payload);
    await bindData();
    await bindZcMx(jlmx);
    toast("提交成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnDown 下发计量称重 → SendJL */
async function onSendJL() {
  const selected = selectedJl();
  if (!selected.length) {
    toast("请选中发货明细", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const ids = selected.map((x) => x.cMatchId!).filter(Boolean);
  querying.value = true;
  try {
    await fh2000Api.sendJL(ids);
    await bindData();
    toast("提交成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnDelMat 材料删除 → DelMat */
async function onDelMat() {
  const selected = selectedMat();
  if (!selected.length) {
    toast("请选中装车明细材料", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    await fh2000Api.delMat(selected);
    await bindData();
    await bindZcMx(focusJl());
    toast("删除成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

async function loadDicts() {
  try {
    const [groups, shifts] = await Promise.all([
      systemKeyValueApi.getSysKvListByGroup("A0000:GROUP"),
      systemKeyValueApi.getSysKvListByGroup("A0000:SHIFT"),
    ]);
    groupOptions.value = (groups ?? [])
      .filter((x) => x.cCode != null)
      .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode! }));
    shiftOptions.value = (shifts ?? [])
      .filter((x) => x.cCode != null)
      .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode! }));
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(() => {
  void loadDicts();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询行（原 stackPanel1：车牌号 / 物流号 / 查询 —— 1~2 条件与按钮同行，不用 label 网格） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">车牌号</label>
      <InputText v-model="q.cVehicleNo" class="w-48 shrink-0" @keydown.enter="onQuery" />
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">物流号</label>
      <InputText v-model="q.cMatchId" class="w-48 shrink-0" @keydown.enter="onQuery" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <!-- 原上栏独立 h-8 标题条，按需求并入查询工具栏（按钮左、标题右 ml-auto） -->
      <span class="ml-auto text-xs font-medium text-muted-foreground">制卡发货明细</span>
    </div>

    <!-- 上下分栏（原 gridControl1 Top + splitterControl1 + stackPanel2 + [gridControl2 | navigationPane1]） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- 制卡发货明细（标题已并入顶部查询工具栏） -->
      <SplitterPanel :size="55" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="jlColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="jlRows"
            :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onJlReady"
            @selection-changed="onJlSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <!-- 下半：按钮条 → 左右分栏 -->
      <SplitterPanel :size="45" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">勾选件数</label>
          <InputText :model-value="String(checkedCount)" readonly class="w-24 shrink-0" />
          <label class="shrink-0 text-xs text-muted-foreground">重量</label>
          <InputText :model-value="String(checkedWgt)" readonly class="w-28 shrink-0" />
          <label class="ml-2 shrink-0 text-xs text-muted-foreground">班组</label>
          <Select
            v-model="cGroupNo"
            :options="groupOptions"
            option-label="label"
            option-value="value"
            show-clear
            filter
            placeholder="选择班组"
            class="w-36 shrink-0"
          />
          <label class="shrink-0 text-xs text-muted-foreground">班次</label>
          <Select
            v-model="cShiftNo"
            :options="shiftOptions"
            option-label="label"
            option-value="value"
            show-clear
            filter
            placeholder="选择班次"
            class="w-36 shrink-0"
          />
          <!-- 原「确认装车 / 下发计量称重」按需求移到右栏「材料删除」之后 -->
          <span class="ml-auto text-xs font-medium text-muted-foreground">成品库存</span>
        </div>

        <Splitter class="min-h-0 flex-1">
          <!-- 成品库存（原 gridView2 ViewCaption=成品库存；标题已按需求移到班组/班次工具栏末尾） -->
          <SplitterPanel :size="47" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :column-defs="stockColDefs"
                :default-col-def="hmxDefaultColDef"
                :row-data="stockRows"
                :locale-text="AG_GRID_LOCALE_CN"
                :row-selection="{
                  mode: 'multiRow',
                  checkboxes: true,
                  headerCheckbox: true,
                  enableClickSelection: true,
                  enableSelectionWithoutKeys: true,
                }"
                :pagination="false"
                :animate-rows="false"
                @grid-ready="onStockReady"
                @selection-changed="onStockSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>

          <!-- 装车明细（原 navigationPage1.Caption=装车明细：stackPanel3[材料删除] + gridControl3） -->
          <SplitterPanel :size="53" :minSize="25" class="flex flex-col overflow-hidden">
            <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
              <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelMat">
                <IconTrash class="h-3 w-3" />材料删除
              </Button>
              <!-- 原在班组/班次工具栏，按需求移到「材料删除」之后 -->
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onConfirm">确认装车</Button>
              <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSendJL">
                <IconRefresh class="h-3 w-3" />下发计量称重
              </Button>
              <span class="ml-auto text-xs font-medium text-muted-foreground">装车明细</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :column-defs="matColDefs"
                :default-col-def="hmxDefaultColDef"
                :row-data="matRows"
                :locale-text="AG_GRID_LOCALE_CN"
                :row-selection="{
                  mode: 'multiRow',
                  checkboxes: true,
                  headerCheckbox: true,
                  enableClickSelection: true,
                  enableSelectionWithoutKeys: true,
                }"
                :pagination="false"
                :animate-rows="false"
                @grid-ready="onMatReady"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
