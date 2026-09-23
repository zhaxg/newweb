<script setup lang="ts">
/** 对应 FrmTiGzmFileRecord（标准/工艺文件管理操作履历）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTiGzmFileRecord
 *  已接入：tiGzmfileApi.getGzmFilesRecord（时间范围 + 文件名称 + 工艺规程号）
 *  列集：Designer VisibleIndex 0~6 + 隐藏 2 列，中文头取绑定实体 TiGzmfileRecord 的 LDisplay
 *        （SerialNo 实体 LDisplay =「文件名」，非旧页误写的「老mesID」）
 *  逻辑：Load 默认时间范围 = [今天-7日 00:00, 明日 00:00]（原 ucTimeRange1.Value）
 *  偏差：原 colOperater 走 UserFormatter 转义用户名，按仓库既有做法 web 显示原始代码 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tiGzmfileApi, type TiGzmfileRecord } from "@/api/mes4ddh/sqm.swagger";

const theme = makeHmxGridTheme();

const rows = ref<TiGzmfileRecord[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** 原 ucTimeRange1.Value = new TimeRange(今天-7日.Date, 今天.Date.AddDays(1)) */
const input = reactive({
  timeRange: [dayStart(new Date(Date.now() - 7 * 86400000)), dayStart(new Date(Date.now() + 86400000))] as Date[] | null,
  fileName: "",
  regulateNo: "",
});

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} 00:00:00`;

/* 主表：按 Designer VisibleIndex 0~6；Id/文件id 未排入 → hide（原 9 列，无审计四列） */
const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 70, minWidth: 70, hide: true },
  { field: "regulateNo", headerName: "工艺规程号", width: 130 },
  { field: "serialNo", headerName: "文件名", width: 200 },
  { field: "operater", headerName: "操作者", width: 100 },
  { field: "operateDate", headerName: "操作日期", width: 160 },
  { field: "operateType", headerName: "操作类型", width: 100 },
  { field: "cRemark", headerName: "备注", width: 220 },
  { field: "id", headerName: "C_ID", width: 150, hide: true },
  { field: "fileId", headerName: "文件id", width: 150, hide: true },
];

function getRowId(p: GetRowIdParams) {
  const d = p.data as TiGzmfileRecord;
  return String(d.id ?? "");
}

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    const [from, to] = input.timeRange ?? [];
    rows.value =
      (await tiGzmfileApi.getGzmFilesRecord({
        timeRange: from && to ? { min: fmt(from), max: fmt(to) } : undefined,
        regulateName: input.fileName.trim() || null,
        regulateNo: input.regulateNo.trim() || null,
      })) ?? [];
    // 原 AllowSyncRowStateToCheckboxSelection=true：勾选态由 Selected 字段回灌
    requestAnimationFrame(() => {
      gridApi.value?.forEachNode((node) => node.setSelected(!!(node.data as TiGzmfileRecord).selected));
      gridApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 3 项：时间范围 / 文件名称 / 工艺规程号；日期范围占 col-span-2） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
          <DatePicker v-model="input.timeRange" selection-mode="range" :manual-input="false"
            date-format="yy-mm-dd" show-time hour-format="24" show-icon placeholder="开始 至 结束"
            class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">文件名称</label>
          <InputText v-model="input.fileName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">工艺规程号</label>
          <InputText v-model="input.regulateNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
      </div>
    </div>

    <!-- 操作工具栏（原 stackPanel1，仅「查询」一钮） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">操作履历（{{ rows.length }}）</span>
    </div>

    <!-- 数据表格（原 gridControl1 / gridView1，TiGzmfileRecord） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :get-row-id="getRowId"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :suppress-column-virtualisation="true"
        :pagination="false" :animate-rows="false" :loading="querying"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
