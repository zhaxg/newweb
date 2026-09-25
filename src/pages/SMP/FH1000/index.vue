<script setup lang="ts">
/** 对应 FrmFH1000（装车码单管理）：DDH.Winforms.SMP.Forms.FrmFH1000
 *  已接入：fh2000Api.getFh1000Lst / getFh1002Lst / sendJL / sendJLCancel / sendJL2 / delMat
 *          + systemKeyValueApi A0000:ZBS_MODEL（质保书模板下拉）
 *  待接入：打印质保书 → FrmZbsView（二级弹窗）
 *  布局：查询区(12条件+查询) → 主表(码单) → 上下Splitter → 按钮条(下发/撤销/删除原因/删除/模板/打印) → 子表(材料明细) */
import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconPrinter, IconRefresh, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { systemKeyValueApi } from "@/api/admin/request";
import { fh2000Api, type Fh1000, type Fh1002, type InputFh2000Dto } from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 查询（原 InputFh2000Dto：Load 默认昨天 0 点 ~ 今天末） ---------- */
function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}

const ZC_STATUS_OPTIONS = [
  { label: "准备", value: 0 },
  { label: "确认装车", value: 1 },
  { label: "下发计量称重", value: 2 },
  { label: "称重完成", value: 3 },
  { label: "作废", value: 98 },
  { label: "出厂", value: 99 },
];

const q = reactive({
  cBillOfLadingNo: "",
  cShipName: "",
  cVehicleNo: "",
  cMatchId: "",
  cOrderCustCname: "",
  cSgCode: "",
  cStove: "",
  cInboundNo: "",
  cPieceNo: "",
  nZcStatus: null as number | null,
  dates: defaultRange() as Date[] | null,
});

function buildQuery(): InputFh2000Dto {
  return {
    cBillOfLadingNo: q.cBillOfLadingNo || null,
    cShipName: q.cShipName || null,
    cVehicleNo: q.cVehicleNo || null,
    cMatchId: q.cMatchId || null,
    cOrderCustCname: q.cOrderCustCname || null,
    cSgCode: q.cSgCode || null,
    cStove: q.cStove || null,
    cInboundNo: q.cInboundNo || null,
    cPieceNo: q.cPieceNo || null,
    nZcStatus: (q.nZcStatus ?? null) as InputFh2000Dto["nZcStatus"],
    dBegin: q.dates?.[0]?.toISOString() ?? null,
    dEnd: q.dates?.[1]?.toISOString() ?? null,
  };
}

/* ---------- 列（按提取摘要：主表 Fh1000 19 可见 + 15 hide；子表 Fh1002 30 可见 + 7 hide） ---------- */
const mainColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cMatchId", headerName: "物流号", width: 130 },
  { field: "cOrderCustCname", headerName: "订货客户名称", width: 150 },
  { field: "cVehicleNo", headerName: "车号", width: 110 },
  { field: "nPlanNum", headerName: "计划件数", width: 90 },
  { field: "nPiece", headerName: "装车件数", width: 90 },
  { field: "nActWgt", headerName: "材料重量", width: 100 },
  { field: "nGrossWgt", headerName: "过磅重量", width: 100 },
  { field: "dWeighTime", headerName: "计量称重时间", width: 150 },
  { field: "nStatus", headerName: "装车状态", width: 100 },
  { field: "cOutStockCode", headerName: "出库仓库", width: 110 },
  { field: "dDelivyTime", headerName: "出厂时刻", width: 150 },
  { field: "cBillOfLadingNo", headerName: "提货单号", width: 130 },
  { field: "cPort", headerName: "港口", width: 100 },
  { field: "cShipName", headerName: "船名", width: 100 },
  { field: "cTaskId", headerName: "任务号", width: 130 },
  { field: "cKhzd", headerName: "客户终端", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "cConNo", headerName: "合同号", hide: true },
  { field: "nNetWgt", headerName: "结算重量", hide: true },
  { field: "nDiscrepWgt", headerName: "磅差重量", hide: true },
  { field: "nNum", headerName: "码单支数", hide: true },
  { field: "nStackingStatus", headerName: "过磅状态", hide: true },
  { field: "cBoxNo", headerName: "出厂箱号", hide: true },
  { field: "cDelivyRemark", headerName: "出厂备注", hide: true },
  { field: "cShipLotNo", headerName: "计量磅秤编号", hide: true },
  { field: "nAmountTax", headerName: "包装皮重", hide: true },
  { field: "nCompareFalg", headerName: "计量校验3‰", hide: true },
  { field: "cStackingFlag", headerName: "是否整车过磅", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "id", headerName: "C_ID", hide: true },
  { field: "cOrderCustNo", headerName: "订货客户编码", hide: true },
]);

const detailColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cMatchId", headerName: "物流号", width: 130 },
  { field: "cMatNo", headerName: "件次号", width: 140 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "cSpec", headerName: "规格", width: 120 },
  { field: "cTrimFlag", headerName: "切边方式", width: 90 },
  { field: "nMatCount", headerName: "件数", width: 80 },
  { field: "nMatActWgt", headerName: "材料重量", width: 100 },
  { field: "nMatNetWgt", headerName: "结算重量", width: 100 },
  { field: "nMatThick", headerName: "材料厚度", width: 90 },
  { field: "nMatWidth", headerName: "材料宽度", width: 90 },
  { field: "nMatLen", headerName: "材料长度", width: 90 },
  { field: "cMatName", headerName: "物料名称", width: 130 },
  { field: "cStove", headerName: "炉号", width: 100 },
  { field: "cBatchNo", headerName: "批号", width: 110 },
  { field: "nMatDiscrepWgt", headerName: "磅差重量", width: 90 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "cStockCode", headerName: "库区代码", width: 100 },
  { field: "cStockRoomNo", headerName: "库位号", width: 90 },
  { field: "cLayerno", headerName: "层号", width: 70 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 100 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 110 },
  { field: "cInboundNo", headerName: "入库标识", width: 100 },
  { field: "cOrderNo", headerName: "订单号", width: 140 },
  { field: "nSelectMode", headerName: "装车模式", width: 90 },
  { field: "cTaskId", headerName: "任务号", width: 130 },
  { field: "cBillOfLadingNo", headerName: "提货单号", width: 130 },
  { field: "cMatCode", headerName: "物料编码", width: 120 },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "cConNo", headerName: "合同号", hide: true },
  { field: "nMatNum", headerName: "材料支数", hide: true },
  { field: "cTrnpcodeact", headerName: "运输方式", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "id", headerName: "C_ID", hide: true },
  { field: "cPlanId", headerName: "计划号", hide: true },
]);

/* ---------- 状态 ---------- */
const rows = ref<Fh1000[]>([]);
const detailRows = ref<Fh1002[]>([]);
const querying = ref(false);
const mainApi = ref<GridApi | null>(null);
const detailApi = ref<GridApi | null>(null);

/* 原 stackPanel2：删除原因 + 质保书模板 */
const delRemark = ref("");
const zbsModel = ref<string | null>(null);
const zbsModelOptions = ref<{ label: string; value: string }[]>([]);

function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}
function onDetailReady(e: GridReadyEvent) {
  detailApi.value = e.api;
}

function selectedMain(): Fh1000[] {
  return (mainApi.value?.getSelectedRows() ?? []) as Fh1000[];
}
function selectedDetail(): Fh1002[] {
  return (detailApi.value?.getSelectedRows() ?? []) as Fh1002[];
}

/* ---------- 事件（对齐 FrmFH1000.cs） ---------- */
async function bindData() {
  const list = ((await fh2000Api.getFh1000Lst(buildQuery())) ?? []) as Fh1000[];
  rows.value = list;
  mainApi.value?.setGridOption("rowData", list);
  requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
  detailRows.value = [];
  detailApi.value?.setGridOption("rowData", []);
}

async function onQuery() {
  querying.value = true;
  try {
    await bindData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 主行变化 → GetFh1002Lst 子表 */
async function onMainSelectionChanged() {
  const row = (mainApi.value?.getSelectedNodes()[0]?.data as Fh1000 | undefined) ?? null;
  if (!row) {
    detailRows.value = [];
    detailApi.value?.setGridOption("rowData", []);
    return;
  }
  try {
    const list = ((await fh2000Api.getFh1002Lst({
      cBillOfLadingNo: row.cBillOfLadingNo ?? null,
      cMatchId: row.cMatchId ?? null,
    })) ?? []) as Fh1002[];
    detailRows.value = list;
    detailApi.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => detailApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}

/* btnDown 下发计量称重 */
async function onSendJL() {
  const selected = selectedMain();
  if (!selected.length) {
    toast("请选择物流号!", 2000, "warn");
    return;
  }
  const ids = selected.map((x) => x.cMatchId!).filter(Boolean);
  const okYes = window.confirm(`物流号：${ids.join(",")},确定下发计量称重吗？`);
  if (!okYes) return;
  querying.value = true;
  try {
    await fh2000Api.sendJL(ids);
    await bindData();
    toast("下发成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnJLCanecl 撤销计量称重 */
async function onCancelJL() {
  const selected = selectedMain();
  if (!selected.length) {
    toast("请选择物流号!", 2000, "warn");
    return;
  }
  const ids = selected.map((x) => x.cMatchId!).filter(Boolean);
  if (!window.confirm(`物流号：${ids.join(",")},确定撤销吗？`)) return;
  querying.value = true;
  try {
    await fh2000Api.sendJLCancel(ids);
    await bindData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnDel 删除材料 */
async function onDelMat() {
  const selected = selectedDetail();
  if (!selected.length) {
    toast("请选择材料号!", 2000, "warn");
    return;
  }
  if (!delRemark.value.trim()) {
    toast("请输入删除原因！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    await fh2000Api.delMat(selected);
    await bindData();
    await onMainSelectionChanged();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnPrint 打印质保书 → FrmZbsView（占位） */
function onPrint() {
  const selected = selectedDetail();
  if (!selected.length) {
    toast("请选择材料号!", 2000, "warn");
    return;
  }
  const groups = new Set(selected.map((x) => `${x.cSgCode}|${x.cSgStd}`));
  if (groups.size > 1) {
    toast("请选择同一个钢种/标准的材料操作！", 2000, "warn");
    return;
  }
  if (!zbsModel.value) {
    toast("请选择模版！", 2000, "warn");
    return;
  }
  toast("打印预览弹窗（FrmZbsView）待接入", 2500, "warn");
}

/* simpleButton1 异常处理计量材料号（原 Visible=false，按硬规则保留入口） */
async function onSendJL2() {
  const selected = selectedMain();
  if (!selected.length) {
    toast("请选择物流号!", 2000, "warn");
    return;
  }
  const ids = selected.map((x) => x.cMatchId!).filter(Boolean);
  try {
    const count = (await fh2000Api.sendJL2(ids)) ?? 0;
    toast(`处理成功，共处理${count}条数据！`, 2500, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

async function loadModels() {
  try {
    const list = (await systemKeyValueApi.getSysKvListByGroup("A0000:ZBS_MODEL")) ?? [];
    zbsModelOptions.value = list
      .filter((x) => x.cCode != null)
      .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode! }));
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(() => {
  void loadModels();
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：12 条件 + 查询） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">提货单号</label>
        <InputText v-model="q.cBillOfLadingNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">船名</label>
        <InputText v-model="q.cShipName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">车牌号</label>
        <InputText v-model="q.cVehicleNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">物流号</label>
        <InputText v-model="q.cMatchId" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">收货单位</label>
        <InputText v-model="q.cOrderCustCname" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="q.cInboundNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">装车状态</label>
        <Select
          v-model="q.nZcStatus"
          :options="ZC_STATUS_OPTIONS"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="全部"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">装车时间</label>
        <DatePicker
          v-model="q.dates"
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
      <div class="flex items-center">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 上下分栏（原 gridControl1 Dock.Top + splitterControl1 + stackPanel2 + gridControl2 Dock.Fill） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="45" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="mainColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="rows"
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
            @grid-ready="onMainReady"
            @selection-changed="onMainSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="55" :minSize="20" class="flex flex-col overflow-hidden">
        <!-- 按钮条（原 stackPanel2：下发/撤销/删除原因/删除/模板/打印/异常处理） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSendJL">
            <IconRefresh class="h-3 w-3" />下发计量称重
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelJL">
            <IconRefresh class="h-3 w-3" />撤销计量称重
          </Button>
          <label class="ml-2 shrink-0 text-xs text-muted-foreground">删除原因</label>
          <InputText v-model="delRemark" class="w-40 shrink-0" />
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelMat">
            <IconTrash class="h-3 w-3" />删除材料
          </Button>
          <label class="ml-2 shrink-0 text-xs text-muted-foreground">质保书模板</label>
          <Select
            v-model="zbsModel"
            :options="zbsModelOptions"
            option-label="label"
            option-value="value"
            show-clear
            filter
            placeholder="选择模板"
            class="w-48 shrink-0"
          />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onPrint">
            <IconPrinter class="h-3 w-3" />打印质保书
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSendJL2">异常处理计量材料号</Button>
          <span class="ml-auto text-xs text-muted-foreground">码单材料明细（{{ detailRows.length }}）</span>
        </div>

        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="detailColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="detailRows"
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
            @grid-ready="onDetailReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
