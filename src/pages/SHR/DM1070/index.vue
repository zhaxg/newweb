<script setup lang="ts">
/** 对应 FrmDM1070（油品备件）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1070
 *  已接入：dM1070Api.getTdm1070（DataBind，TimeRange{min,max}）· dM1070Api.delTdm1070（btnDel，按勾选行 id 批量删除）
 *  待接入：添加 / 编辑（原 FrmDM1070_Edit 二级弹窗未迁移，仅占位）
 *  偏差：原 dateMin/dateMax 两个 DateEdit（默认 [当年1月1日, 下月今天]）→ 两个单日 DatePicker；
 *        原 Selected 勾选列 → AG Grid multiRow 复选框（列以 hide:true 收着，与 DM1020 一致） */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClickedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { dM1070Api, type Tdm1070, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 时间（原 FrmDM1070_Load：dateMin = 当年1月1日，dateMax = 下月今天） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
const now = new Date();
const input = reactive({
  min: new Date(now.getFullYear(), 0, 1) as Date | null,
  max: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()) as Date | null,
});

/* ---------- 表格（gridView1 / Tdm1070：18 数据列 + Selected，5 列隐藏） ---------- */
const rows = ref<Tdm1070[]>([]);
const loading = ref(false);
const gridApi = ref<GridApi | null>(null);
const current = ref<Tdm1070 | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onRowClicked(e: RowClickedEvent) {
  current.value = (e.data as Tdm1070 | undefined) ?? null;
}

const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 60, hide: true },
  { colId: "dMonth", field: "dMonth", headerName: "日期", width: 112 },
  { colId: "nInBound", field: "nInBound", headerName: "油品入库量", width: 112 },
  { colId: "nBeforeInventory", field: "nBeforeInventory", headerName: "油品前库存", width: 112 },
  { colId: "nReceive", field: "nReceive", headerName: "油品本月领取", width: 112 },
  { colId: "nAfterInventory", field: "nAfterInventory", headerName: "油品月底库存", width: 112 },
  { colId: "nSjUse", field: "nSjUse", headerName: "油品实际消耗", width: 112 },
  { colId: "nUse", field: "nUse", headerName: "油品单耗", width: 112 },
  { colId: "nAmount", field: "nAmount", headerName: "油品金额", width: 112 },
  { colId: "nWrollerUseAll", field: "nWrollerUseAll", headerName: "工作辊消耗量", width: 112 },
  { colId: "nWrollerUse", field: "nWrollerUse", headerName: "工作辊单耗", width: 112 },
  { colId: "nWrollerAmount", field: "nWrollerAmount", headerName: "工作辊金额", width: 112 },
  { colId: "nBrollerUseAll", field: "nBrollerUseAll", headerName: "支撑辊消耗量", width: 112 },
  { colId: "nBrollerUse", field: "nBrollerUse", headerName: "支撑辊单耗", width: 112 },
  { colId: "nBrollerAmount", field: "nBrollerAmount", headerName: "支撑辊金额", width: 112 },
  { colId: "nRollerUse", field: "nRollerUse", headerName: "轧辊累计单耗", width: 112 },
  { colId: "nRollerAmount", field: "nRollerAmount", headerName: "轧辊累计金额", width: 112 },
  { colId: "nSpareReceiveAmount", field: "nSpareReceiveAmount", headerName: "备件领取金额", width: 112 },
  { colId: "nSpareUse", field: "nSpareUse", headerName: "备件单耗", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 112, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 112, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 112, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 112, hide: true },
];

/* 原 TimeRange(min, max)：两值都空则不下发条件 */
function toTimeRange(): TimeRange | undefined {
  if (!input.min && !input.max) return undefined;
  return { min: input.min ? isoLocal(input.min) : undefined, max: input.max ? isoLocal(input.max) : undefined };
}

/* 原 DataBind */
async function onQuery() {
  loading.value = true;
  try {
    rows.value = (await dM1070Api.getTdm1070(toTimeRange())) ?? [];
    current.value = null;
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* 原 btnAdd_Click / btnEdit_Click：FrmDM1070_Edit 二级弹窗（未迁移） */
function onAdd() {
  toast("添加（二级弹窗 FrmDM1070_Edit）待接入", 2500, "warn");
}
function onEdit() {
  if (!current.value) return;
  toast("编辑（二级弹窗 FrmDM1070_Edit）待接入", 2500, "warn");
}

/* ---------- ShowYesNo 受控确认 ---------- */
const confirmOpen = ref(false);
const confirmMsg = ref("");
let confirmAction: (() => Promise<void>) | null = null;
function askConfirm(msg: string, action: () => Promise<void>) {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmOpen.value = true;
}
async function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  if (act) await act();
}

/* 原 btnDel_Click：Selected 行 → ids → 确认 → DelTdm1070 → 重查 */
function onDel() {
  if (rows.value.length === 0) return;
  const ids = ((gridApi.value?.getSelectedRows() as Tdm1070[] | undefined) ?? [])
    .map((x) => x.id ?? "")
    .filter(Boolean);
  if (ids.length === 0) {
    toast("请选择数据进行操作！", 2000, "warn");
    return;
  }
  askConfirm("确定要删除选中的数据吗？", async () => {
    try {
      await dM1070Api.delTdm1070(ids);
      await onQuery();
      toast("数据提交成功", 2000, "success");
    } catch {
      /* 拦截层已 toast */
    }
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1 顺序：查询 添加 编辑 删除）+ 时间范围（原 dateMin / dateMax） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <label class="ml-auto w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
      <DatePicker
        v-model="input.min"
        date-format="yy-mm-dd"
        :manual-input="false"
        show-icon
        placeholder="开始日期"
        class="w-40 shrink-0"
      />
      <span class="shrink-0 text-xs text-muted-foreground">至</span>
      <DatePicker
        v-model="input.max"
        date-format="yy-mm-dd"
        :manual-input="false"
        show-icon
        placeholder="结束日期"
        class="w-40 shrink-0"
      />
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
        :loading="loading"
        @grid-ready="onGridReady"
        @row-clicked="onRowClicked"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" autofocus @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
