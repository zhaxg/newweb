<script setup lang="ts">
/** 对应 FrmSD2050Check（中厚板提料板长审批 / 提料板长审核）：DDH.Winforms.SMP.Forms.FrmSD2050Check
 *  已接入：tmp2000Api.getTmp2010ApplyLen（查询）/ getTmp2000Log（主行切换拉日志，CSwlx="changeLen"）
 *          / checkTmp2010ApplyLen（同意 checkApply=1、驳回 checkApply=0）
 *  待接入：无
 *  布局：工具栏 h-9（查询/同意/驳回）→ 上下 Splitter：主表（板长申请）+ 日志子表
 *  列：主表 gridView1 35 可见 + 4 hide；日志 gridView3 4 可见 + 5 hide（按提取摘要） */
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconRefresh, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { tmp2000Api, type QueryCptTmp2010Dto, type Tmp2000Log } from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 列（提取摘要：gridView1 主表 35 可见 + 4 hide；gridView3 日志 4 可见 + 5 hide） ---------- */
const colDefs = ref<ColDef[]>([
  { field: "selected", headerName: "选择", width: 70 },
  { field: "cOrderCustCname", headerName: "客户", width: 150 },
  { field: "cOrderNo", headerName: "编号", width: 150 },
  { field: "cSteelType", headerName: "品名", width: 100 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "nLenMin", headerName: "板长下限", width: 100 },
  { field: "nLenMax", headerName: "板长上限", width: 100 },
  { field: "nLenPlan", headerName: "生产板长", width: 100 },
  { field: "cInboundNo", headerName: "入库标识", width: 110 },
  { field: "nOrderProcFlag", headerName: "质量处理结果", width: 120 },
  { field: "cDesignDesc", headerName: "质量设计失败说明", width: 160 },
  { field: "nThick", headerName: "板厚", width: 80 },
  { field: "nThickMin", headerName: "板厚下限", width: 100 },
  { field: "nThickMax", headerName: "板厚上限", width: 100 },
  { field: "nWidth", headerName: "板宽下限", width: 100 },
  { field: "nWidthMax", headerName: "板宽上限", width: 100 },
  { field: "nWidthWgt", headerName: "边部宽度余量", width: 120 },
  { field: "cDelivyStatusDesc", headerName: "交货状态", width: 100 },
  { field: "nNum", headerName: "签订件数", width: 100 },
  { field: "nWgt", headerName: "总量（吨）", width: 100 },
  { field: "cTrimFlag", headerName: "切边方式", width: 100 },
  { field: "cOverstepBl", headerName: "短溢装比例", width: 110 },
  { field: "cDelivyQtyFlag", headerName: "计重方式", width: 100 },
  { field: "cTol", headerName: "公差", width: 80 },
  { field: "cFlawDesc", headerName: "探伤等级", width: 100 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "cConNo", headerName: "用户合同号", width: 120 },
  { field: "dJhqTime", headerName: "交期", width: 120 },
  { field: "cDelivyAddress", headerName: "流向", width: 110 },
  { field: "cSpecialMarkGy", headerName: "性能", width: 110 },
  { field: "nWtMin", headerName: "单重min", width: 100 },
  { field: "nWtMax", headerName: "单重max", width: 100 },
  { field: "cSpec", headerName: "订单规格", width: 120 },
  { field: "cConRemark", headerName: "合同特殊要求", width: 150 },
  { field: "cLengthType", headerName: "长度类型", width: 100 },
  /* 隐藏列（提取 hide 规则，右键列面板可唤出） */
  { field: "nThickPlan", headerName: "生产板厚", hide: true },
  { field: "nWidthPlan", headerName: "生产板宽", hide: true },
  { field: "nStatus", headerName: "状态", hide: true },
  { field: "id", headerName: "主键", hide: true },
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
const rows = ref<QueryCptTmp2010Dto[]>([]);
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

function selectedRows(): QueryCptTmp2010Dto[] {
  return (gridApi.value?.getSelectedRows() ?? []) as QueryCptTmp2010Dto[];
}

function autoSizeAll() {
  requestAnimationFrame(() => {
    gridApi.value?.autoSizeAllColumns();
    logApi.value?.autoSizeAllColumns();
  });
}

/* ---------- 事件（对齐 FrmSD2050Check.cs） ---------- */
async function bindData() {
  const list = (await tmp2000Api.getTmp2010ApplyLen()) ?? [];
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

/* 主行切换 → GetTmp2000Log(COrderNo, CSwlx="changeLen") */
async function onSelectionChanged() {
  const row = (gridApi.value?.getSelectedNodes()[0]?.data as QueryCptTmp2010Dto | undefined) ?? null;
  if (!row) {
    logRows.value = [];
    logApi.value?.setGridOption("rowData", []);
    return;
  }
  try {
    const list = (await tmp2000Api.getTmp2000Log({ cOrderNo: row.cOrderNo ?? null, cSwlx: "changeLen" })) ?? [];
    logRows.value = list;
    logApi.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => logApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}

/** btnOk 同意（CheckApplyEnum.Yes = 1） */
async function onAgree() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.checkTmp2010ApplyLen(1, selected)) ?? 0;
    await bindData();
    toast(`同意${count}条！`, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** btnNo 驳回（CheckApplyEnum.No = 0） */
async function onReject() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.checkTmp2010ApplyLen(0, selected)) ?? 0;
    await bindData();
    toast(`驳回${count}条！`, 2000, "success");
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
      <span class="ml-auto text-xs text-muted-foreground">提料板长审核（{{ rows.length }}）</span>
    </div>

    <!-- 上下分栏（原 gridControl1 Dock.Top + splitterControl1 Dock.Bottom + gridControl3 Dock.Bottom） -->
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
