<script setup lang="ts">
/** 对应 FrmInventoryResult（库存盘点结果，菜单代码 TD9000）：DDH.Winforms.SYD.Forms.Inven.FrmInventoryResult
 *  已接入：inventoryApi.queryInventoryResult（查询）
 *  待接入：「盘点结果导入」按钮（原 btnImport_Click 方法体即为空，按原样保留入口不做实现）
 *  布局：工具栏一行(盘点计划号+查询+盘点结果导入) → 单表(Tyd2000PdResult 16可见 + 6 hide) */
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconSearch, IconUpload } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { inventoryApi, type Tyd2000PdResult } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const colDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cPdResult", headerName: "盘点结果", width: 110 },
  { field: "cStove", headerName: "炉号", width: 120 },
  { field: "cPieceNo", headerName: "头侧件次号", width: 150 },
  { field: "cStackNo", headerName: "垛位号", width: 110 },
  { field: "cStackNum", headerName: "层号", width: 80 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 110 },
  { field: "cSgStd", headerName: "执行标准", width: 130 },
  { field: "nThick", headerName: "坯厚", width: 90 },
  { field: "nWth", headerName: "宽度", width: 90 },
  { field: "nLen", headerName: "坯长", width: 90 },
  { field: "nCalWgt", headerName: "理重", width: 100 },
  { field: "nWgt", headerName: "坯重", width: 100 },
  { field: "cInventoryPlanNo", headerName: "盘点计划号", width: 170 },
  { field: "cStoreCode", headerName: "库区号", width: 120, flex: 1 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cPrintCode", headerName: "喷号", hide: true },
]);

const inventoryPlanNo = ref("");
const rows = ref<Tyd2000PdResult[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

/* btnQuery → QueryInventoryResult(planNo) */
async function onQuery() {
  querying.value = true;
  try {
    const list = ((await inventoryApi.queryInventoryResult(inventoryPlanNo.value.trim() || undefined)) ??
      []) as Tyd2000PdResult[];
    rows.value = list;
    api.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    if (!list.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnImport → 原 C# 方法体为空，按原样保留 */
function onImport() {
  toast("盘点结果导入（原实现为空）", 2000, "info");
}

onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：盘点计划号 + 查询 + 盘点结果导入） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">盘点计划号</label>
      <InputText v-model="inventoryPlanNo" class="w-56 shrink-0" @keydown.enter="onQuery" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onImport">
        <IconUpload class="h-3 w-3" />盘点结果导入
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">盘点结果（{{ rows.length }}）</span>
    </div>

    <!-- 单表（原 gridControl1 Dock.Fill） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
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
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
