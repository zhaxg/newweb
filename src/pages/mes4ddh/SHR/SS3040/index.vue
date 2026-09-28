<script setup lang="ts">
/** 对应 FrmSS3040（钢卷称重实绩）：DDH.Winforms.SHR.Forms.StripSteel.FrmSS3040
 *  已接入：e1000Api.queryTiE3040List / bkmskApi.handleSSLog（原逐条 HandleSSLog 同步）
 *  待接入：无
 *  偏差：原 Selected 选择列由 AG Grid row-selection 复选框呈现，原列以 hide:true 保留在列面板；
 *        查询条件按 ui-rules §6 与按钮同行、以 placeholder 代替原 LabelControl；
 *        默认时间范围取原 uctimeRange1._Load 的「本月1日 ~ 次日」 */

import { ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import { IconRefresh, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { bkmskApi, e1000Api, type PlanQueryDto, type TiE3040, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* 时间范围默认值（原 uctimeRange1._Load：本月1日 ~ 次日） */
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    p(d.getMonth() + 1) +
    "-" +
    p(d.getDate()) +
    "T" +
    p(d.getHours()) +
    ":" +
    p(d.getMinutes()) +
    ":" +
    p(d.getSeconds())
  );
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

const keyword = ref("");
const dates = ref<Date[] | null>(defaultRange());
const rows = ref<TiE3040[]>([]);
const querying = ref(false);
const syncing = ref(false);
const gridApi = ref<GridApi | null>(null);

const colDefs: ColDef[] = [
  { field: "selected", headerName: "选择", width: 112, hide: true },
  { field: "nOrder", headerName: "消息排序号", width: 125 },
  { field: "createTime", headerName: "创建时间", width: 112 },
  { field: "slabNo", headerName: "板坯号", width: 112 },
  { field: "coilNo", headerName: "钢卷号", width: 112 },
  { field: "coilWeight", headerName: "钢卷重量", width: 112 },
  { field: "plantCode", headerName: "机组代码", width: 112 },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "creator", headerName: "创建人", width: 112, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 125, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138, hide: true },
  { field: "readTime", headerName: "读取时间", width: 112, hide: true },
  { field: "readStatus", headerName: "读取状态", width: 112, hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/* 原 btnQuery_Click：PlanQueryDto{PlanKeyword, TimeRange} → BestFitColumns */
async function onQuery() {
  querying.value = true;
  try {
    const query: PlanQueryDto = {
      planKeyword: keyword.value,
      timeRange: toTimeRange(dates.value),
    };
    rows.value = (await e1000Api.queryTiE3040List(query)) ?? [];
    /* 原 AllowSyncRowStateToCheckboxSelection=true：勾选态由 Selected 字段回灌 */
    requestAnimationFrame(() => {
      gridApi.value?.forEachNode((node) => node.setSelected(!!(node.data as TiE3040).selected));
      gridApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 原 btnSync_Click：空表静默返回 → 未勾选「请勾选记录！」→ 逐条 HandleSSLog → 重查 */
async function onSync() {
  if (!rows.value.length) return;
  const sel = (gridApi.value?.getSelectedRows() ?? []) as TiE3040[];
  if (!sel.length) {
    toast("请勾选记录！", 2000, "warn");
    return;
  }
  syncing.value = true;
  try {
    for (const item of sel) {
      await bkmskApi.handleSSLog(item);
    }
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    syncing.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 按钮行（原 stackPanel1：板坯号 textEdit1 + 日期 uctimeRange1 + 查询 + 同步）；ui-rules §6 与按钮同行、用 placeholder -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" placeholder="板坯号" class="w-40" @keydown.enter="onQuery" />
      <DatePicker
        v-model="dates"
        selection-mode="range"
        :manual-input="false"
        date-format="yy-mm-dd"
        show-time
        hour-format="24"
        show-icon
        placeholder="日期"
        class="w-80"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="syncing" @click="onSync">
        <IconRefresh class="h-3 w-3" />同步
      </Button>
    </div>
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
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
