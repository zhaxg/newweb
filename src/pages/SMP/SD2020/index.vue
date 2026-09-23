<script setup lang="ts">
import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconArrowBack, IconPlus, IconSearch, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClickedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  tmp2000Api,
  OrderFlagEnum,
  type InputTmp2000Dto,
  type QueryTmp2000Dto,
  type Tmp2000Log,
} from "@/api/mes4ddh/smp.swagger";

/** 对应 FrmSD2020（中厚板订单查询）：DDH.Winforms.SMP.Forms.FrmSD2020
 *  已接入：tmp2000Api.getOrderLst2（查询）/ delYLOrderPlan（删除订单）/ backSaleOrder（退回销售订单）/
 *          finishOrder(flag=Y/N)（订单结案/取消结案）/ getTmp2000Log（行聚焦加载日志）
 *  待接入：二级弹窗占位 FrmSD2020Add（新增余量板/申请补产/新增开坯）、FrmSD2020CF（拆分订单）、FrmSD2020StockFlag（入库标识修改）；
 *          mock 缺 delYLOrderPlan、getTmp2000Log
 *  布局：查询区(钢种/订货客户/开始时间/截止时间/产线hidden/订单号/计划类型/订单号/执行标准 + textEdit2 未挂组不迁) →
 *        查询标签全页统一 w-16（原「订单号(模糊)」7字含半角括号≈74px 装不下 w-16/w-18，按 ui-rules 阶梯顺位4
 *        改为「订单号」+ placeholder「支持模糊」，与同名的精确匹配框靠提示词区分）
 *        工具栏(10 按钮) → 上下 Splitter：主表 Fill ｜ 日志表 Bottom
 *  产线为 HiddenItems；查询 CLineCode 取菜单 cQueryString（原 C# BindData）；列集按 extract（主表57+隐藏13 / 日志4+隐藏5） */

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const theme = makeHmxGridTheme();

/** swagger 的 QueryTmp2000Dto/InputTmp2000Dto 缺实体字段 IsTl/CExitem4/COrderNo2（Designer 列/绑定存在），页面本地补型，不改 src/api */
type Row2000 = QueryTmp2000Dto & {
  isTl?: string | null;
  cExitem4?: string | null;
};
type Input2000 = InputTmp2000Dto & {
  cOrderNo2?: string | null;
  cSgStd?: string | null;
};

const rows = ref<Row2000[]>([]);
const logRows = ref<Tmp2000Log[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const logApi = ref<GridApi | null>(null);

function day(y: number, m: number, d: number) {
  return new Date(y, m, d);
}
const now = new Date();

/* 原 dataLayoutControl 查询区（产线 HiddenItems；textEdit2 未挂入布局组，不迁） */
const input = reactive({
  cSgCode: "",
  cOrderCustCname: "",
  dBegin: day(now.getFullYear(), now.getMonth(), 1),
  dEnd: day(now.getFullYear(), now.getMonth(), now.getDate()),
  cLineCode: "",
  cOrderNo: "",
  nFlag: null as number | null,
  cOrderNo2: "",
  cSgStd: "",
});

/* 计划类型：原 AddEnum(OrderFlagEnum) */
const flagOptions = [
  { label: "销售订单", value: 0 },
  { label: "余量板", value: 1 },
  { label: "补产订单", value: 2 },
  { label: "流通材", value: 3 },
  { label: "试验料(材)", value: 4 },
  { label: "开坯订单", value: 7 },
  { label: "钢坯", value: 8 },
];

const colDefs: ColDef[] = [
        { field: "selected", headerName: "选择", width: 56, minWidth: 56, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false, filter: false },
      { field: "cOrderNo", headerName: "订单号", width: 150 },
      { field: "nStatus", headerName: "订单状态", width: 150 },
      { field: "nFlag", headerName: "计划类型", width: 150 },
      { field: "isTl", headerName: "是否提料", width: 150 },
      { field: "cOrderCustCname", headerName: "订货客户", width: 150 },
      { field: "cSteelType", headerName: "品名", width: 150 },
      { field: "cSgCode", headerName: "钢种", width: 150 },
      { field: "nNum", headerName: "订货件数", width: 150 },
      { field: "nWgt", headerName: "订单重量", width: 150 },
      { field: "nThick", headerName: "厚度", width: 150 },
      { field: "nThickMin", headerName: "厚度下限", width: 150 },
      { field: "nThickMax", headerName: "厚度上限", width: 150 },
      { field: "nWidth", headerName: "宽度", width: 150 },
      { field: "nWidthMin", headerName: "宽度下限", width: 150 },
      { field: "nWidthMax", headerName: "宽度上限", width: 150 },
      { field: "nWidthWgt", headerName: "边部宽度余量", width: 150 },
      { field: "cLengthType", headerName: "长度类型", width: 150 },
      { field: "nLenMin", headerName: "长度下限", width: 150 },
      { field: "nLenMax", headerName: "长度上限", width: 150 },
      { field: "cDelivyStatusCode", headerName: "交货状态", width: 150 },
      { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 150 },
      { field: "cTrimFlag", headerName: "切边方式", width: 150 },
      { field: "cOverstepBl", headerName: "短溢装比例", width: 150 },
      { field: "cDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "cTol", headerName: "公差", width: 150 },
      { field: "cFlawDesc", headerName: "探伤等级", width: 150 },
      { field: "cConNo", headerName: "合同号", width: 150 },
      { field: "cSgStd", headerName: "执行标准", width: 150 },
      { field: "dJhqTime", headerName: "交货期", width: 150 },
      { field: "cDelivyAddress", headerName: "流向", width: 150 },
      { field: "cSpecialMarkGy", headerName: "性能要求", width: 150 },
      { field: "nWtMax", headerName: "单量上限", width: 150 },
      { field: "nWtMin", headerName: "单量下限", width: 150 },
      { field: "cSpec", headerName: "规格", width: 150 },
      { field: "cConRemark", headerName: "特殊要求", width: 150 },
      { field: "cInboundNo", headerName: "入库标识", width: 150 },
      { field: "cSgCodeNk", headerName: "内控钢种", width: 150 },
      { field: "nThickTolMin", headerName: "厚度下偏差", width: 150 },
      { field: "nThickTolMax", headerName: "厚度上偏差", width: 150 },
      { field: "nWidthTolMin", headerName: "宽度下偏差", width: 150 },
      { field: "nWidthTolMax", headerName: "宽度上偏差", width: 150 },
      { field: "nLenTolMin", headerName: "长度下偏差", width: 150 },
      { field: "nLenTolMax", headerName: "长度上偏差", width: 150 },
      { field: "cExitem1", headerName: "是否工程单", width: 150 },
      { field: "cIFYlc", headerName: "是否带走余量材", width: 150 },
      { field: "dTimeShipment", headerName: "预计船期", width: 150 },
      { field: "nExitem2", headerName: "申请通知", width: 150 },
      { field: "cExitem4", headerName: "变更原因", width: 150 },
      { field: "cLineCode", headerName: "产线代码", width: 150 },
      { field: "creator", headerName: "创建人", width: 150 },
      { field: "createTime", headerName: "创建时间", width: 150 },
      { field: "lastModifier", headerName: "最后修改人", width: 150 },
      { field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
      { field: "cSendUserId", headerName: "销售提报人", width: 150 },
      { field: "dSendTime", headerName: "销售提报时间", width: 150 },
      { field: "cExitem3", headerName: "原始订单号", width: 150 },
      { field: "cOrderCustNo", headerName: "客户编码", width: 100, hide: true },
      { field: "cJrzzgyCode", headerName: "加热轧制工艺编码", width: 100, hide: true },
      { field: "cJqgyCode", headerName: "剪切工艺编码", width: 100, hide: true },
      { field: "cDeptCode", headerName: "部门编码", width: 100, hide: true },
      { field: "cOrderProcFlag", headerName: "合同处理标志（", width: 100, hide: true },
      { field: "cOrderProcUserId", headerName: "合同处理操作人", width: 100, hide: true },
      { field: "dOrderProcTime", headerName: "合同处理时间", width: 100, hide: true },
      { field: "cZgGyCode", headerName: "轧钢工艺编码", width: 100, hide: true },
      { field: "cPushUserId", headerName: "下发生产人", width: 100, hide: true },
      { field: "dPushTime", headerName: "下发生产时间", width: 100, hide: true },
      { field: "nSfpj", headerName: "评审状态", width: 100, hide: true },
      { field: "cPjName", headerName: "评审人", width: 100, hide: true },
      { field: "id", headerName: "主键", width: 100, hide: true },
];
const logColDefs: ColDef[] = [
        { field: "creator", headerName: "创建人", width: 240 },
      { field: "createTime", headerName: "创建时间", width: 248 },
      { field: "cOrderNo", headerName: "订单号", width: 551 },
      { field: "cRemark", headerName: "备注", width: 559 },
      { field: "id", headerName: "C_ID", width: 100, hide: true },
      { field: "lastModifier", headerName: "最后修改人", width: 100, hide: true },
      { field: "lastModifyTime", headerName: "最后修改时间", width: 100, hide: true },
      { field: "cSwlx", headerName: "事务类型", width: 100, hide: true },
      { field: "selected", headerName: "选择", width: 56, hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onLogReady(e: GridReadyEvent) {
  logApi.value = e.api;
}

function selectedRows(): Row2000[] {
  const byGrid = (gridApi.value?.getSelectedRows() ?? []) as Row2000[];
  const byCheck = rows.value.filter((x) => x.selected);
  return Array.from(new Set([...byGrid, ...byCheck]));
}
function selectedOrderNos(): string[] {
  return selectedRows()
    .map((x) => x.cOrderNo ?? "")
    .filter(Boolean);
}
/* 原 gridView1.FocusedRowObject（点击行聚焦优先，回退勾选行） */
function focusedRow(): Row2000 | null {
  const pos = gridApi.value?.getFocusedCell();
  if (pos) {
    const node = gridApi.value?.getDisplayedRowAtIndex(pos.rowIndex);
    if (node?.data) return node.data as Row2000;
  }
  return selectedRows()[0] ?? null;
}
/* 单选校验：原「请选择项！/勾选多条数据…」两段 */
function pickOne(): Row2000 | null {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return null;
  }
  if (selected.length > 1) {
    toast("勾选多条数据，请重新查询，请选择一条数据执行！", 2500, "warn");
    return null;
  }
  return selected[0] ?? null;
}
function joinNos(list: string[]): string {
  return list.join(",");
}

function buildInput(): Input2000 {
  return {
    cOrderNo: input.cOrderNo || null,
    cSgCode: input.cSgCode || null,
    cOrderCustCname: input.cOrderCustCname || null,
    dBegin: input.dBegin?.toISOString() ?? null,
    dEnd: input.dEnd?.toISOString() ?? null,
    cLineCode: menuQs || null,
    nFlag: (input.nFlag ?? null) as OrderFlagEnum | null,
    cOrderNo2: input.cOrderNo2 || null,
    cSgStd: input.cSgStd || null,
  };
}

/* btnS 查询 → GetOrderLst2 */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tmp2000Api.getOrderLst2(buildInput())) ?? [];
    logRows.value = [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 gridView1_FocusedRowObjectChanged：补产订单或有变更原因时加载 GetTmp2000Log */
async function loadLog(row: Row2000 | null) {
  if (!row) return;
  if (row.nFlag === OrderFlagEnum.BC || (row.cExitem4 && row.cExitem4.length > 0)) {
    try {
      logRows.value = (await tmp2000Api.getTmp2000Log({ cOrderNo: row.cOrderNo ?? null })) ?? [];
      requestAnimationFrame(() => logApi.value?.autoSizeAllColumns());
    } catch {
      /* 拦截层已 toast */
    }
  } else {
    logRows.value = [];
  }
}
function onRowClicked(e: RowClickedEvent<Row2000>) {
  void loadLog(e.data ?? null);
}

/* btnAdd 新增余量板订单 → FrmSD2020Add 占位 */
function onAdd() {
  const row = pickOne();
  if (!row) return;
  if (row.nFlag === OrderFlagEnum.YL) {
    toast(`订单号${row.cOrderNo}以上余量板订单，请选择原销售或补产订单操作！`, 3000, "warn");
    return;
  }
  toast("FrmSD2020Add 弹窗待迁移", 2000, "warn");
}

/* btnBC 申请补产订单 → FrmSD2020Add 占位 */
function onBC() {
  const row = pickOne();
  if (!row) return;
  if (row.nFlag === OrderFlagEnum.BC) {
    toast(`订单号${row.cOrderNo}以上补产订单，请选择原销售订单操作！`, 3000, "warn");
    return;
  }
  if (row.nFlag === OrderFlagEnum.YL) {
    toast(`订单号${row.cOrderNo}以上余量订单，请选择原销售订单操作！`, 3000, "warn");
    return;
  }
  toast("FrmSD2020Add 弹窗待迁移", 2000, "warn");
}

/* btnKP 新增开坯订单 → FrmSD2020Add 占位 */
function onKP() {
  const row = pickOne();
  if (!row) return;
  toast("FrmSD2020Add 弹窗待迁移", 2000, "warn");
}

/* btnCF 拆分订单 → FrmSD2020CF 占位 */
function onCF() {
  const row = focusedRow();
  if (!row) return;
  if (row.isTl === "Y") {
    toast(`订单号${row.cOrderNo},已提料计划，不允许拆分！`, 3000, "warn");
    return;
  }
  toast("FrmSD2020CF 弹窗待迁移", 2000, "warn");
}

/* btnDel 删除订单(余量/补产) → DelYLOrderPlan */
async function onDelete() {
  const nos = selectedOrderNos();
  if (!nos.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.delYLOrderPlan(nos)) ?? 0;
    await onQuery();
    toast(`成功删除${count}条！`, 2500, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnBack 退回销售订单 → BackSaleOrder */
async function onBack() {
  const nos = selectedOrderNos();
  if (!nos.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.backSaleOrder(nos)) ?? 0;
    await onQuery();
    toast(`成功退回销售订单${count}条！`, 2500, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnStockFlag 余量订单入库标识修改 → FrmSD2020StockFlag 占位 */
function onStockFlag() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (selected.some((x) => x.nFlag !== OrderFlagEnum.YL)) {
    toast("请选择余量订单操作！", 2000, "warn");
    return;
  }
  const tlNos = selected.filter((x) => x.isTl === "Y").map((x) => x.cOrderNo ?? "");
  if (tlNos.length) {
    toast(`当前订单${joinNos(tlNos)},已提料！`, 3000, "warn");
    return;
  }
  toast("FrmSD2020StockFlag 弹窗待迁移", 2000, "warn");
}

/* btnCloseCase 订单结案 → FinishOrder("Y") */
async function onCloseCase() {
  const nos = selectedOrderNos();
  if (!nos.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.finishOrder("Y", nos)) ?? 0;
    await onQuery();
    toast(`操作成功${count}条！`, 2500, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnCancelCloseCase 取消结案 → FinishOrder("N") */
async function onCancelCloseCase() {
  const nos = selectedOrderNos();
  if (!nos.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm(`勾选订单${nos.length}条，确定吗？`)) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.finishOrder("N", nos)) ?? 0;
    await onQuery();
    toast(`操作成功${count}条！`, 2500, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl：钢种/订货客户/开始时间/截止时间/产线hidden/订单号/计划类型/订单号模糊/执行标准） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.cSgCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订货客户</label>
          <InputText v-model="input.cOrderCustCname" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
          <DatePicker v-model="input.dBegin" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">截止时间</label>
          <DatePicker v-model="input.dEnd" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
        <div class="hidden min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <InputText v-model="input.cLineCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">计划类型</label>
          <Select
            v-model="input.nFlag"
            :options="flagOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.cOrderNo2" placeholder="支持模糊" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
          <InputText v-model="input.cSgStd" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel2，10 个按钮按 Designer 原序） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">新增余量板订单</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onBC">
        <IconPlus class="h-3 w-3" />申请补产订单
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onKP">新增开坯订单</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCF">拆分订单</Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        删除订单(余量/补产)
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onBack">
        <IconArrowBack class="h-3 w-3" />退回销售订单
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onStockFlag">余量订单入库标识修改</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCloseCase">订单结案</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCancelCloseCase">
        <IconX class="h-3 w-3" />取消结案
      </Button>
    </div>

    <!-- 上下双表（原 gridControl1 Fill → splitter(Bottom) → gridControl2 日志 Bottom） -->
    <Splitter layout="vertical" class="min-h-0 flex-1 border-0">
      <SplitterPanel :size="68" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onGridReady"
            @first-data-rendered="autoSizeOnFirstData"
            @row-clicked="onRowClicked"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="32" :minSize="10" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="logColDefs"
            :row-data="logRows"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            @grid-ready="onLogReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
