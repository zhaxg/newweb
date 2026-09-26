<script setup lang="ts">
/** 对应 FrmHR1000（组批规范维护）：DDH.Winforms.SHR.Forms.FrmHR1000
 *  已接入：hR1000Api.queryList（关键字）/ hR1000Api.saveChange（TrackableList 增删改）
 *  待接入：无
 *  偏差：原新增行 CLineCode 取菜单 QueryString（本菜单 ZG01），此处经 useMenuQuery 读取；
 *        删除原为 gridView RemoveCurrent（即时移除），此处以选中行移除后再随保存落库 */

import { ref, shallowRef } from "vue";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";

import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { hR1000Api, type Thr1000 } from "@/api/mes4ddh/shr.swagger";
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const { parts: menuQs } = useMenuQuery();
const cLineCode = menuQs[0] ?? "";

const trackList = shallowRef<TrackableList<Thr1000>>(new TrackableList<Thr1000>());
const keyword = ref("");
const loading = ref(false);
const saving = ref(false);
const gridApi = ref<GridApi | null>(null);
const selectedId = ref<string | null>(null);

const confirmOpen = ref(false);

const colDefs: ColDef[] = [
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150, editable: true },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150, editable: true },
  {
    colId: "nThickMin",
    field: "nThickMin",
    headerName: "厚度下限",
    width: 150,
    editable: true,
    cellEditor: "agNumberCellEditor",
  },
  {
    colId: "nThickMax",
    field: "nThickMax",
    headerName: "厚度上限",
    width: 150,
    editable: true,
    cellEditor: "agNumberCellEditor",
  },
  {
    colId: "nWgt",
    field: "nWgt",
    headerName: "组批重量",
    width: 150,
    editable: true,
    cellEditor: "agNumberCellEditor",
  },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },
];

function getRowId(p: GetRowIdParams) {
  return String((p.data as Thr1000).id);
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as Thr1000 | undefined;
  selectedId.value = row?.id ?? null;
}

function onCellValueChanged(e: CellValueChangedEvent) {
  gridApi.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}

function currentRow(): Thr1000 | null {
  return trackList.value.find((r) => r.id === selectedId.value) ?? null;
}

async function query() {
  loading.value = true;
  try {
    const rows = (await hR1000Api.queryList(keyword.value.trim() || undefined)) ?? [];
    trackList.value = new TrackableList<Thr1000>(rows);
    selectedId.value = null;
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

function onAdd() {
  const draft: Thr1000 = {
    id: NextStrId(),
    cLineCode,
    selected: false,
    creator: "",
    createTime: "",
    lastModifier: "",
    lastModifyTime: "",
  };
  trackList.value.push(draft);
  const stored = trackList.value[trackList.value.length - 1] as Thr1000;
  gridApi.value?.applyTransaction({ add: [stored] });
  gridApi.value?.ensureIndexVisible(trackList.value.length - 1, "bottom");
  selectedId.value = stored.id ?? null;
}

function onDelete() {
  const row = currentRow();
  if (!row) {
    toast("当前没有可删除的行", 2000, "warn");
    return;
  }
  trackList.value.remove((r) => r.id === row.id);
  gridApi.value?.applyTransaction({ remove: [row] });
  if (selectedId.value === row.id) selectedId.value = null;
  gridApi.value?.refreshCells({ force: true });
  toast("已从列表移除，点击「保存」后生效", 2000, "info");
}

function onSave() {
  const data = trackList.value.SaveChangesData;
  if (!data.addedItems.length && !data.changedItems.length && !data.deletedItems.length) {
    toast("没有需要保存的修改", 2000, "info");
    return;
  }
  confirmOpen.value = true;
}

async function doSave() {
  confirmOpen.value = false;
  saving.value = true;
  try {
    await hR1000Api.saveChange(trackList.value.SaveChangesData);
    await query();
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel：查询/添加/删除/保存 + 关键字 textEdit1） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText
        v-model="keyword"
        maxlength="100"
        placeholder="关键字"
        autocapitalize="off"
        spellcheck="false"
        class="w-48 shrink-0"
        @keydown.enter="query"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">组批规范（{{ trackList.length }}）</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="trackList"
        :get-row-id="getRowId"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @cell-value-changed="onCellValueChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 保存确认（原 MsgBox.ShowYesNo("是否确认保存修改？")） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="保存确认"
      :style="{ width: 'min(24rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">是否确认保存修改？</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="保存" variant="outlined" autofocus @click="doSave" />
      </template>
    </Dialog>
  </div>
</template>
