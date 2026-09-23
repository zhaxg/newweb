<script setup lang="ts">
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClickedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tmp2000Api, type InputTmp2000Dto, type QueryCptTmp2010Dto, type Tmp2000Log } from "@/api/mes4ddh/smp.swagger";

/** 对应 FrmSD2050（提料板长不符变更，菜单 SD2025）：DDH.Winforms.SMP.Forms.FrmSD2050
 *  已接入：tmp2000Api.getTmp2010Len（查询，Load 即查）/ getTmp2000Log(CSwlx="changeLen")（行聚焦加载变更日志）/
 *          insertOrderLenPlan（提交申请）
 *  布局：工具栏(查询/提交申请，原 stackPanel1) → 上下 Splitter：主表(gridView2 Fill) ｜ 日志(gridView3 Bottom)；原无查询条件区
 *  列集按 extract（主表35+隐藏1 / 日志4+隐藏5）；
 *  原 Selected 勾选列由 AG Grid row-selection 复选框呈现（ui-rules §7），原列以 hide:true 保留在列面板 */

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<QueryCptTmp2010Dto[]>([]);
const logRows = ref<Tmp2000Log[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const logApi = ref<GridApi | null>(null);

const colDefs: ColDef[] = [
        { field: "selected", headerName: "选择", hide: true },
      { field: "cOrderCustCname", headerName: "客户", width: 150 },
      { field: "cOrderNo", headerName: "编号", width: 150 },
      { field: "cSteelType", headerName: "品名", width: 150 },
      { field: "cSgCode", headerName: "钢种", width: 150 },
      { field: "nThick", headerName: "板厚", width: 150 },
      { field: "nThickMin", headerName: "板厚下限", width: 150 },
      { field: "nThickMax", headerName: "板厚上限", width: 150 },
      { field: "nWidth", headerName: "板宽下限", width: 150 },
      { field: "nWidthMax", headerName: "板宽上限", width: 150 },
      { field: "nWidthWgt", headerName: "边部宽度余量", width: 150 },
      { field: "nLenMin", headerName: "板长下限", width: 150 },
      { field: "nLenMax", headerName: "板长上限", width: 150 },
      { field: "nLenPlan", headerName: "生产板长", width: 150 },
      { field: "nTlStatus", headerName: "提料状态", width: 150 },
      { field: "cInboundNo", headerName: "入库标识", width: 150 },
      { field: "cDelivyStatusDesc", headerName: "交货状态", width: 150 },
      { field: "nNum", headerName: "签订件数", width: 150 },
      { field: "nWgt", headerName: "总量（吨）", width: 150 },
      { field: "cTrimFlag", headerName: "切边方式", width: 150 },
      { field: "cOverstepBl", headerName: "短溢装比例", width: 150 },
      { field: "cDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "cTol", headerName: "公差", width: 150 },
      { field: "cFlawDesc", headerName: "探伤等级", width: 150 },
      { field: "cSgStd", headerName: "执行标准", width: 150 },
      { field: "cConNo", headerName: "用户合同号", width: 150 },
      { field: "dJhqTime", headerName: "交期", width: 150 },
      { field: "cDelivyAddress", headerName: "流向", width: 150 },
      { field: "cSpecialMarkGy", headerName: "性能", width: 150 },
      { field: "nWtMin", headerName: "单重min", width: 150 },
      { field: "nWtMax", headerName: "单重max", width: 150 },
      { field: "cSpec", headerName: "订单规格", width: 150 },
      { field: "cConRemark", headerName: "合同特殊要求", width: 150 },
      { field: "nThickPlan", headerName: "生产板厚", width: 150 },
      { field: "nWidthPlan", headerName: "生产板宽", width: 150 },
      { field: "id", headerName: "主键", width: 100, hide: true },
];
const logColDefs: ColDef[] = [
        { field: "creator", headerName: "创建人", width: 150 },
      { field: "createTime", headerName: "创建时间", width: 150 },
      { field: "cOrderNo", headerName: "订单号", width: 150 },
      { field: "cRemark", headerName: "备注", width: 150 },
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

function selectedRows(): QueryCptTmp2010Dto[] {
  return (gridApi.value?.getSelectedRows() ?? []) as QueryCptTmp2010Dto[];
}

/* simpleButton1 查询 → BindData（原 GetTmp2010Len 空条件） */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tmp2000Api.getTmp2010Len({} as InputTmp2000Dto)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 gridView2_FocusedRowObjectChanged → GetTmp2000Log(CSwlx="changeLen") */
async function loadLog(row: QueryCptTmp2010Dto | null) {
  if (!row) return;
  try {
    logRows.value =
      (await tmp2000Api.getTmp2000Log({ cOrderNo: row.cOrderNo ?? null, cSwlx: "changeLen" })) ?? [];
    requestAnimationFrame(() => logApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}
function onRowClicked(e: RowClickedEvent<QueryCptTmp2010Dto>) {
  void loadLog(e.data ?? null);
}

/* btnLen 提交申请 → InsertOrderLenPlan */
async function onSubmit() {
  const nos = selectedRows()
    .map((x) => x.cOrderNo ?? "")
    .filter(Boolean);
  if (!nos.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.insertOrderLenPlan(nos)) ?? 0;
    await onQuery();
    logRows.value = [];
    toast(`提交成功${count}条！`, 2500, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 Load 即查询 */
onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：查询/提交申请） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSubmit">提交申请</Button>
    </div>

    <!-- 上下双表（原 gridControl2 Fill → splitter(Bottom) → gridControl3 日志 Bottom） -->
    <Splitter layout="vertical" class="min-h-0 flex-1 border-0">
      <SplitterPanel :size="63" :minSize="20" class="flex flex-col overflow-hidden">
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
      <SplitterPanel :size="37" :minSize="10" class="flex flex-col overflow-hidden">
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
