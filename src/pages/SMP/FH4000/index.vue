<script setup lang="ts">
/** 对应 FrmFH4000（退货录入）：DDH.Winforms.SMP.Forms.FrmFH4000
 *  已接入：fh2000Api.getTsd3000Lst（查询）/ insertTsd3000（确认退货，swagger 补两个方法）
 *  待接入：件次号（原 menoMat MemoExEdit，与查询条件无关的多行录入，按原样保留为文本域）
 *  布局：顶部 stackPanel1 一行内联（任务号/物流号/件次号/退货说明 + 查询/手动录入/删除/确认退货）→ 单表(16列) */
import { ref, shallowRef } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { TrackableList } from "@/api/common/trackableList";
import { fh2000Api, type QueryTsd3000Dto } from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 列（原 gridView1，16 列全部可见） ---------- */
const colDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cCustName", headerName: "退货单位", width: 140 },
  { field: "cMatNo", headerName: "件次号", width: 150, editable: true },
  { field: "cStove", headerName: "炉号", width: 100, editable: true },
  { field: "nMatWgt", headerName: "退货重量", width: 100, editable: true },
  { field: "nMatNum", headerName: "件数", width: 90, editable: true },
  { field: "nMatThick", headerName: "材料厚度", width: 90, editable: true },
  { field: "nMatWidth", headerName: "材料宽度", width: 90, editable: true },
  { field: "nMatLen", headerName: "材料长度", width: 90, editable: true },
  { field: "cSgCode", headerName: "钢种", width: 100, editable: true },
  { field: "cSgStd", headerName: "执行标准", width: 110, editable: true },
  { field: "cOrderNo", headerName: "订单号", width: 140, editable: true },
  { field: "cMatName", headerName: "物料名称", width: 140, editable: true },
  { field: "cMatchId", headerName: "物流号", width: 130, editable: true },
  { field: "cBillOfLadingNo", headerName: "提货单号", width: 130, editable: true },
  { field: "cTaskId", headerName: "任务号", width: 130, editable: true, flex: 1 },
]);

/* ---------- 状态（行内增删，保存走 insertTsd3000） ---------- */
const trackList = shallowRef<TrackableList<QueryTsd3000Dto>>(new TrackableList<QueryTsd3000Dto>());
const querying = ref(false);
const api = ref<GridApi | null>(null);

/* 查询条件（原 txtCTaskId / txtCMatchId） */
const cTaskId = ref("");
const cMatchId = ref("");
/* 原 menoMat 件次号（多行文本，原 C# 未参与 DataBind 过滤，按原样保留） */
const pieceNos = ref("");
const remark = ref("");

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

function refresh() {
  api.value?.refreshCells({ force: true });
}

/* btnQuery → GetTsd3000Lst */
async function onQuery() {
  querying.value = true;
  try {
    const list = ((await fh2000Api.getTsd3000Lst({
      cTaskId: cTaskId.value || null,
      cMatchId: cMatchId.value || null,
    })) ?? []) as QueryTsd3000Dto[];
    trackList.value = new TrackableList<QueryTsd3000Dto>(list);
    api.value?.setGridOption("rowData", trackList.value);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
    if (!list.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnRow 手动录入：追加一行（原 NMatNum = 1） */
function onAddRow() {
  trackList.value.push({ nMatNum: 1 } as QueryTsd3000Dto);
  const stored = trackList.value[trackList.value.length - 1] as QueryTsd3000Dto;
  api.value?.applyTransaction({ add: [stored] });
  refresh();
}

/* btnDelRow 删除勾选行（原按 x.Selected 删除） */
function onDeleteRows() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择行操作！", 2000, "warn");
    return;
  }
  trackList.value.remove((r) => selected.includes(r));
  api.value?.applyTransaction({ remove: selected });
}

function selectedRows(): QueryTsd3000Dto[] {
  const byGrid = (api.value?.getSelectedRows() ?? []) as QueryTsd3000Dto[];
  if (byGrid.length) return byGrid;
  // 兼容勾选列 Selected 字段
  return trackList.value.filter((x) => x.selected);
}

/* btnOK 确认退货 → InsertTsd3000 */
async function onConfirm() {
  if (!remark.value.trim()) {
    toast("请输入退货原因！", 2000, "warn");
    return;
  }
  const selected = selectedRows();
  if (selected.length <= 0) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await fh2000Api.insertTsd3000(selected, remark.value)) ?? 0;
    toast(`提交成功${count}条`, 2500, "success");
    // 原 C#：提交后清空表格
    trackList.value = new TrackableList<QueryTsd3000Dto>();
    api.value?.setGridOption("rowData", trackList.value);
    remark.value = "";
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部工具栏（原 stackPanel1：任务号/物流号/件次号/退货说明 + 查询/手动录入/删除/确认退货，Dock.Top 单行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">任务号</label>
      <InputText v-model="cTaskId" class="w-44 shrink-0" @keydown.enter="onQuery" />
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">物流号</label>
      <InputText v-model="cMatchId" class="w-44 shrink-0" @keydown.enter="onQuery" />
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">件次号</label>
      <InputText v-model="pieceNos" class="w-56 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddRow">
        <IconPlus class="h-3 w-3" />手动录入
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteRows">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">退货说明</label>
      <InputText v-model="remark" class="w-56 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onConfirm">确认退货</Button>
      <span class="ml-auto text-xs text-muted-foreground">退货明细（{{ trackList.length }}）</span>
    </div>

    <!-- 单表（原 gridControl1 Dock.Fill） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="colDefs"
        :default-col-def="hmxDefaultColDef" :row-data="trackList" :locale-text="AG_GRID_LOCALE_CN"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :pagination="false" :animate-rows="false" :loading="querying"
        @grid-ready="onReady" @first-data-rendered="autoSizeOnFirstData" @cell-value-changed="refresh" />
    </div>
  </div>
</template>
