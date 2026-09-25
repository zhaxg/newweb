<script setup lang="ts">
/** 对应 FrmSD2020CheckCf（中厚板拆分订单审核 / 拆分订单审批）：DDH.Winforms.SMP.Forms.FrmSD2020CheckCf
 *  已接入：tmp2000Api.getOrderCF（查询）/ getTmp2000Log（主行切换拉日志，CSwlx="CF"）
 *          / checkOrderCFApply（同意 checkApply=1、驳回 checkApply=0，入参订单号列表）
 *  待接入：无（simpleButton4「?」在 Designer 中未挂进任何容器，为孤儿控件，未渲染）
 *  布局：工具栏 h-9（查询/同意/驳回）→ 上下 Splitter：主表（拆分订单）+ 日志子表
 *  列：主表 gridView1 38 可见 + 29 hide；日志 gridView2 4 可见 + 5 hide（按提取摘要） */
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconRefresh, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { tmp2000Api, type QueryTmp2000Dto, type Tmp2000Log } from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 列（提取摘要：gridView1 38 可见 + 29 hide；gridView2 日志 4 可见 + 5 hide） ---------- */
const colDefs = ref<ColDef[]>([
  { field: "selected", headerName: "选择", width: 70 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "nFlag", headerName: "计划类型", width: 100 },
  { field: "cOrderCustCname", headerName: "订货客户", width: 150 },
  { field: "cSteelType", headerName: "钢类", width: 100 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "nNum", headerName: "订货件数", width: 100 },
  { field: "nWgt", headerName: "订单重量", width: 100 },
  { field: "nLenMin", headerName: "长度下限", width: 100 },
  { field: "nLenMax", headerName: "长度上限", width: 100 },
  { field: "cExitem4", headerName: "变更说明", width: 150 },
  { field: "nThick", headerName: "厚度", width: 80 },
  { field: "nThickMin", headerName: "厚度下限", width: 100 },
  { field: "nThickMax", headerName: "厚度上限", width: 100 },
  { field: "nWidth", headerName: "宽度", width: 80 },
  { field: "nWidthMin", headerName: "宽度下限", width: 100 },
  { field: "nWidthMax", headerName: "宽度上限", width: 100 },
  { field: "nWidthWgt", headerName: "边部宽度余量", width: 120 },
  { field: "cLengthType", headerName: "长度类型", width: 100 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 100 },
  { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 130 },
  { field: "cTrimFlag", headerName: "切边方式", width: 100 },
  { field: "cOverstepBl", headerName: "短溢装比例", width: 110 },
  { field: "cDelivyQtyFlag", headerName: "计重方式", width: 100 },
  { field: "cTol", headerName: "公差", width: 80 },
  { field: "cFlawDesc", headerName: "探伤等级", width: 100 },
  { field: "cConNo", headerName: "合同号", width: 120 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "dJhqTime", headerName: "交货期", width: 120 },
  { field: "cDelivyAddress", headerName: "流向", width: 110 },
  { field: "cSpecialMarkGy", headerName: "性能要求", width: 120 },
  { field: "cSpec", headerName: "规格", width: 120 },
  { field: "cConRemark", headerName: "特殊要求", width: 150 },
  { field: "cInboundNo", headerName: "入库标识", width: 110 },
  { field: "dTimeShipment", headerName: "预计船期", width: 130 },
  { field: "cExitem1", headerName: "是否工程单", width: 110 },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 160 },
  /* 隐藏列（提取 hide 规则） */
  { field: "id", headerName: "主键", hide: true },
  { field: "nStatus", headerName: "订单状态", hide: true },
  { field: "cOrderCustNo", headerName: "客户编码", hide: true },
  { field: "nWtMax", headerName: "单量上限", hide: true },
  { field: "nWtMin", headerName: "单量下限", hide: true },
  { field: "nThickTolMin", headerName: "厚度下偏差", hide: true },
  { field: "nThickTolMax", headerName: "厚度上偏差", hide: true },
  { field: "nWidthTolMin", headerName: "宽度下偏差", hide: true },
  { field: "nWidthTolMax", headerName: "宽度上偏差", hide: true },
  { field: "nLenTolMin", headerName: "长度下偏差", hide: true },
  { field: "nLenTolMax", headerName: "长度上偏差", hide: true },
  { field: "cSgCodeNk", headerName: "内控钢种", hide: true },
  { field: "cJrzzgyCode", headerName: "加热轧制工艺编码", hide: true },
  { field: "cJqgyCode", headerName: "剪切工艺编码", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cLineCode", headerName: "产线代码", hide: true },
  { field: "cDeptCode", headerName: "部门编码", hide: true },
  { field: "cOrderProcFlag", headerName: "合同处理标志", hide: true },
  { field: "cOrderProcUserId", headerName: "合同处理操作人", hide: true },
  { field: "dOrderProcTime", headerName: "合同处理时间", hide: true },
  { field: "cZgGyCode", headerName: "轧钢工艺编码", hide: true },
  { field: "cSendUserId", headerName: "销售提报人", hide: true },
  { field: "dSendTime", headerName: "销售提报时间", hide: true },
  { field: "cPushUserId", headerName: "下发生产人", hide: true },
  { field: "dPushTime", headerName: "下发生产时间", hide: true },
  { field: "nSfpj", headerName: "评审状态", hide: true },
  { field: "cPjName", headerName: "评审人", hide: true },
  { field: "nExitem2", headerName: "申请通知", hide: true },
]);

const logColDefs = ref<ColDef[]>([
  { field: "creator", headerName: "创建人", width: 110 },
  { field: "createTime", headerName: "创建时间", width: 160 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "cRemark", headerName: "备注", width: 300 },
  /* 隐藏列 */
  { field: "id", headerName: "C_ID", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cSwlx", headerName: "事务类型", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);

/* ---------- 状态 ---------- */
const rows = ref<QueryTmp2000Dto[]>([]);
const logRows = ref<Tmp2000Log[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const logApi = ref<GridApi | null>(null);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onLogReady(e: GridReadyEvent) {
  logApi.value = e.api;
}

function selectedRows(): QueryTmp2000Dto[] {
  return (gridApi.value?.getSelectedRows() ?? []) as QueryTmp2000Dto[];
}

function autoSizeAll() {
  requestAnimationFrame(() => {
    gridApi.value?.autoSizeAllColumns();
    logApi.value?.autoSizeAllColumns();
  });
}

/* ---------- 事件（对齐 FrmSD2020CheckCf.cs） ---------- */
async function bindData() {
  const list = (await tmp2000Api.getOrderCF()) ?? [];
  rows.value = list;
  gridApi.value?.setGridOption("rowData", list);
  logRows.value = [];
  logApi.value?.setGridOption("rowData", []);
  autoSizeAll();
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

/* 主行切换 → GetTmp2000Log(COrderNo, CSwlx="CF") */
async function onSelectionChanged() {
  const row = (gridApi.value?.getSelectedNodes()[0]?.data as QueryTmp2000Dto | undefined) ?? null;
  if (!row) {
    logRows.value = [];
    logApi.value?.setGridOption("rowData", []);
    return;
  }
  try {
    const list = (await tmp2000Api.getTmp2000Log({ cOrderNo: row.cOrderNo ?? null, cSwlx: "CF" })) ?? [];
    logRows.value = list;
    logApi.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => logApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}

function selectedOrderNos(): string[] {
  return selectedRows()
    .map((x) => x.cOrderNo ?? "")
    .filter(Boolean);
}

/** btnOk 同意（CheckApplyEnum.Yes = 1） */
async function onAgree() {
  const selected = selectedOrderNos();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.checkOrderCFApply(1, selected)) ?? 0;
    await bindData();
    toast(`成功同意${count}条！`, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** btnBack 驳回（CheckApplyEnum.No = 0） */
async function onReject() {
  const selected = selectedOrderNos();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.checkOrderCFApply(0, selected)) ?? 0;
    await bindData();
    toast(`成功驳回${count}条！`, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：查询 / 同意 / 驳回） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconRefresh class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAgree">
        <IconCheck class="h-3 w-3" />同意
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onReject">
        <IconX class="h-3 w-3" />驳回
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">拆分订单审核（{{ rows.length }}）</span>
    </div>

    <!-- 上下分栏（原 gridControl1 Dock.Fill + splitterControl1 Dock.Bottom + gridControl2 Dock.Bottom） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="65" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onGridReady"
            @selection-changed="onSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="35" :minSize="15" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">日志（{{ logRows.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="logColDefs"
            :row-data="logRows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
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
