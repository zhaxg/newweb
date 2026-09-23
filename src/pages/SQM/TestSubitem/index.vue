<script setup lang="ts">
/** 对应 FrmTestSubitem（试验子项目维护）：DDH.Winforms.SQM.Forms.Basic.FrmTestSubitem
 *  已接入：testItemApi.query（关键字）/ insertOrUpdate / delete；二级弹窗 TestSubitemEditDialog
 *  列集：Designer VisibleIndex 0~14 + 隐藏 4 列，中文头取绑定实体 TestSubItem 的 LDisplay
 *  列编辑器：colTestItemType.SetCodeFormatter(TestItemType=KV A0100:TEST_ITEM_TYPE)；
 *            colTestItemCode = RepositoryItemKvGridLookUpEdit(PCode=KV A0100:TEST_ITEM，显示「编码 - 组名」）
 *  逻辑：btnQuery→Query(kw)；btnAdd→新行进弹窗；btnEdit→焦点行 Clone 进弹窗；BtnDel_Click→确认后 Delete→回查
 *  待接入：无 */

import { computed, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { testItemApi, type TestSubItem } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { NextStrId } from "@/lib/yitIdHelper";
import { useToast } from "@/composables/useToast";
import TestSubitemEditDialog from "./TestSubitemEditDialog.vue";
import type { Ref } from "vue";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const rows = ref<TestSubItem[]>([]);
const querying = ref(false);
const saving = ref(false);
const gridApi = ref<GridApi | null>(null);

/* 查询条件（原 textEdit1，标签「关键字」） */
const keyword = ref("");

type KvOpt = { label: string; value: string };
const kvItemType = ref<KvOpt[]>([]);
const kvTestItem = ref<KvOpt[]>([]);

async function loadKv(target: Ref<KvOpt[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}

const itemTypeLabel = (v?: string | null) => kvItemType.value.find((o) => o.value === v)?.label ?? v ?? "";

/* 主表：按 Designer VisibleIndex 0~14；试验项目种类说明/试验项目名称/TableCode/主键 未排入 → hide */
const colDefs = computed<ColDef[]>(() => [
  {
    field: "testItemType",
    headerName: "试验项目种类",
    width: 130,
    valueFormatter: (p: ValueFormatterParams) => itemTypeLabel(p.value as string),
  },
  {
    field: "testItemCode",
    headerName: "试验项目代码",
    width: 140,
    cellEditor: "agSelectCellEditor",
    // 原 RepositoryItemKvGridLookUpEdit.ConfigDisplayText($"{CCode} - {CName}")
    cellEditorParams: { values: kvTestItem.value.map((o) => o.label) },
    valueFormatter: (p: ValueFormatterParams) => kvTestItem.value.find((o) => o.value === p.value)?.label ?? p.value ?? "",
    valueParser: (p) => kvTestItem.value.find((o) => o.label === p.newValue)?.value ?? p.newValue,
  },
  { field: "testSubItemCode", headerName: "试验子项目代码", width: 140 },
  { field: "testSubItemName", headerName: "试验子项目名称", width: 160 },
  { field: "dlDxFlag", headerName: "定量定性标识", width: 120 },
  { field: "unit", headerName: "单位", width: 70 },
  { field: "other1", headerName: "试验子项目描述", width: 150 },
  { field: "other2", headerName: "值来源", width: 100 },
  { field: "other3", headerName: "显示名称来源", width: 120 },
  { field: "other4", headerName: "试验子项目英文名称", width: 170 },
  { field: "other5", headerName: "精度", width: 70 },
  { field: "other6", headerName: "预留6", width: 80 },
  { field: "other7", headerName: "预留7", width: 80 },
  { field: "other8", headerName: "预留8", width: 80 },
  { field: "seq", headerName: "录入排序", width: 90 },
  { field: "testItemTypeDesc", headerName: "试验项目种类说明", width: 160, hide: true },
  { field: "testItemName", headerName: "试验项目名称", width: 140, hide: true },
  // 实体上是只读计算属性、无 LDisplay，按原列名迁入
  { field: "tableCode", headerName: "TableCode", width: 110, hide: true },
  { field: "id", headerName: "主键", width: 150, hide: true },
]);

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function currentRow(): TestSubItem | null {
  return (gridApi.value?.getSelectedRows()[0] as TestSubItem | undefined) ?? null;
}

async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await testItemApi.query(keyword.value.trim() || undefined)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* ---------- 二级弹窗（原 FrmTestSubitemEdit.ShowDialog） ---------- */
const editOpen = ref(false);
const editRow = ref<TestSubItem | null>(null);
const isNew = ref(false);

/** 原 btnAdd_Click：new TestSubItem { Id = GenerateID() } → Edit(row) */
function onAdd() {
  isNew.value = true;
  editRow.value = { id: NextStrId() } as TestSubItem;
  editOpen.value = true;
}

/** 原 btnEdit_Click：焦点行 GetFocusedRow().Clone() → Edit(row) */
function onEdit() {
  const row = currentRow();
  if (!row) return;
  isNew.value = false;
  editRow.value = { ...row };
  editOpen.value = true;
}

/** 原 Edit()：frm.OkClickAsync → InsertOrUpdate(row) → 回查 */
async function onDialogOk(row: TestSubItem) {
  saving.value = true;
  try {
    await testItemApi.insertOrUpdate(row);
    editOpen.value = false;
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

/** 原 BtnDel_Click：确认「确定删除{code} - {name}？」→ Delete(row) → 回查 */
const confirmOpen = ref(false);
function onDelete() {
  const row = currentRow();
  if (!row) return;
  editRow.value = row;
  confirmOpen.value = true;
}
async function onConfirmDelete() {
  confirmOpen.value = false;
  const row = editRow.value;
  if (!row) return;
  saving.value = true;
  try {
    await testItemApi.delete(row);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

void loadKv(kvItemType, "A0100:TEST_ITEM_TYPE");
void loadKv(kvTestItem, "A0100:TEST_ITEM");
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 确认（对应原 MsgBox.ShowYesNo("确定删除{code} - {name}？")） -->
    <Dialog :visible="confirmOpen" modal header="删除确认" :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs whitespace-pre-wrap">
        确定删除{{ editRow?.testSubItemCode }} - {{ editRow?.testSubItemName }}？
      </p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="删除" severity="danger" variant="outlined" :loading="saving" @click="onConfirmDelete" />
      </template>
    </Dialog>

    <!-- 原 stackPanel1：1 条件 + 4 按钮同一行（ui-rules §6） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" maxlength="100" placeholder="关键字" class="w-48 shrink-0" @keydown.enter="onQuery" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">试验子项目维护（{{ rows.length }}）</span>
    </div>

    <!-- 数据表格（原 gridControl1 / gridView1，TestSubItem） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :suppress-column-virtualisation="true"
        :pagination="false" :animate-rows="false" :loading="querying || saving"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>

    <TestSubitemEditDialog v-model:visible="editOpen" :row="editRow" :is-new="isNew" @ok="onDialogOk" />
  </div>
</template>
