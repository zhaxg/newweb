<script setup lang="ts">
/** 对应 FrmTqmtpa4（钢种维护）：DDH.Winforms.SQM.Forms.Basic.FrmTqmtpa4
 *  已接入：tqmtpa4Api.query（TrackableList 回填）/ tqmtpa4Api.save（ToSaveChangesData）
 *  列集：Designer VisibleIndex 0~8 + 隐藏 5 列，中文头取绑定实体 Tqmtpa4 的 LDisplay
 *  逻辑：btnQuery 组 Tqmtpa4QueryInput；btnAdd=AddNew+GenerateID；btnDelete=RemoveCurrent；
 *        btnSave 校验牌号不含空格（MsgBox.ShowError 原文照抄）后 Save 再回查
 *  待接入：牌号分类代码列原 SetKVEdit(A0100:PRODUCT_CODE)，选项为运行时字典（已按字典灌下拉） */

import { computed, onMounted, ref, shallowRef, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { TrackableList } from "@/api/common/trackableList";
import { tqmtpa4Api, type Tqmtpa4 } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { NextStrId } from "@/lib/yitIdHelper";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const trackList = shallowRef<TrackableList<Tqmtpa4>>(new TrackableList<Tqmtpa4>());
const querying = ref(false);
const saving = ref(false);
const gridApi = ref<GridApi | null>(null);

/* 查询条件（原 stackPanel1 内 txtSgCode / txtSgSign，标签「钢种代码」「钢种」） */
const input = ref({ sgCode: "", sgSign: "" });

type KvOpt = { label: string; value: string };
/** 原 colCSgClassCode.SetKVEdit(KeyValueConst.PRODUCT_CODE)：选项运行时灌字典 */
const kvProdCode = ref<KvOpt[]>([]);
async function loadKv(target: Ref<KvOpt[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}

const kvLabel = (code?: string | null) => kvProdCode.value.find((o) => o.value === code)?.label ?? code ?? "";

/* 主表：按 Designer VisibleIndex 0~8；Id/原钢种代码/生效标记/版次/归档标记 未排入 → hide */
const colDefs = computed<ColDef[]>(() => [
  /* 原 Selected 勾选列：ui-rules §7 不手写勾选列，行选择由 row-selection 复选框承担，本列隐藏保留在列面板 */
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cSgCode", headerName: "钢种", width: 130 },
  { field: "cSgSign", headerName: "牌号", width: 130 },
  {
    field: "cSgClassCode",
    headerName: "牌号分类代码",
    width: 140,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: kvProdCode.value.map((o) => o.label) },
    valueFormatter: (p: ValueFormatterParams) => kvLabel(p.value as string),
    valueParser: (p) => kvProdCode.value.find((o) => o.label === p.newValue)?.value ?? p.newValue,
  },
  { field: "cRemark", headerName: "备注", width: 160 },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "lastModifier", headerName: "最后修改人", width: 100 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
  { field: "id", headerName: "主键", width: 150, hide: true },
  { field: "cOldSgCode", headerName: "原钢种代码", width: 120, hide: true },
  { field: "cValidFlag", headerName: "生效标记", width: 90, hide: true },
  { field: "nVersion", headerName: "版次", width: 70, hide: true },
  { field: "cArchiveFlag", headerName: "归档标记", width: 90, hide: true },
]);

function getRowId(p: { data: Tqmtpa4 }) {
  return String(p.data.id);
}

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function currentRow(): Tqmtpa4 | null {
  return (gridApi.value?.getSelectedRows()[0] as Tqmtpa4 | undefined) ?? null;
}

async function onQuery() {
  querying.value = true;
  try {
    const list =
      (await tqmtpa4Api.query({
        cSgCode: input.value.sgCode.trim() || null,
        cSgSign: input.value.sgSign.trim() || null,
      })) ?? [];
    trackList.value = new TrackableList<Tqmtpa4>(list);
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 btnAdd_Click：bindingSource.AddNew() + SequenceUtility.GenerateID() */
function onAdd() {
  const draft = { id: NextStrId(), selected: false } as Tqmtpa4;
  trackList.value.push(draft);
  const stored = trackList.value[trackList.value.length - 1] as Tqmtpa4;
  requestAnimationFrame(() => {
    const node = gridApi.value?.getRowNode(String(stored.id));
    if (!node) return;
    node.setSelected(true);
    if (typeof node.rowIndex === "number" && node.rowIndex >= 0) gridApi.value?.ensureIndexVisible(node.rowIndex);
  });
}

/** 原 BtnDelete_Click：bindingSource.RemoveCurrent() */
function onDelete() {
  const row = currentRow();
  if (!row) return;
  trackList.value.remove((r) => r.id === row.id);
}

/** 原 btnSave_Click：ToSaveChangesData → 校验牌号无空格 → Proxy.Save → 回查 */
async function onSave() {
  const list = trackList.value.SaveChangesData;
  const invalid = [...list.addedItems, ...list.changedItems].filter((x) => (x.cSgSign ?? "").match(/\s/));
  if (invalid.length) {
    // 原 MsgBox.ShowError($"钢种不能包含空格:{NewLine}[{每个牌号}]")
    toast(`钢种不能包含空格:\n[${invalid.map((x) => x.cSgSign).join("]\n[")}]`, 4000, "error");
    return;
  }
  saving.value = true;
  try {
    await tqmtpa4Api.save(list);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  void loadKv(kvProdCode, "A0100:PRODUCT_CODE");
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 原 stackPanel1：2 条件 + 4 按钮同一行（ui-rules §6：1~2 条件与按钮同行，无 label 用 placeholder） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="input.sgCode" maxlength="100" placeholder="钢种代码" class="w-40 shrink-0" @keydown.enter="onQuery" />
      <InputText v-model="input.sgSign" maxlength="100" placeholder="钢种" class="w-40 shrink-0" @keydown.enter="onQuery" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" :loading="saving" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">钢种维护（{{ trackList.length }}）</span>
    </div>

    <!-- 数据表格（原 gridControl1 / gridView1，Tqmtpa4） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="trackList" :get-row-id="getRowId"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :suppress-column-virtualisation="true"
        :pagination="false" :animate-rows="false" :loading="querying || saving"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
