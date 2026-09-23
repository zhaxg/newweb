<script setup lang="ts">
/** 对应 FrmTqmtpa5（标准维护）：DDH.Winforms.SQM.Forms.Basic.FrmTqmtpa5
 *  已接入：tqmtpa5Api.query（TrackableList 回填）/ tqmtpa5Api.save（ToSaveChangesData）
 *  列集：Designer VisibleIndex 0~7 + 隐藏 5 列，中文头取绑定实体 Tqmtpa5 的 LDisplay
 *  逻辑：btnQuery 组 Tqmtpa5QueryInput（CSgStd/CStdCode）；btnAdd=AddNew+GenerateID+CValidFlag=Valid；
 *        btnDel=RemoveCurrent；btnSave=ToSaveChangesData → Proxy.Save → 回查
 *  待接入：无 */

import { ref, shallowRef } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { TrackableList } from "@/api/common/trackableList";
import { tqmtpa5Api, ValidFlag, type Tqmtpa5 } from "@/api/mes4ddh/sqm.swagger";
import { NextStrId } from "@/lib/yitIdHelper";

const theme = makeHmxGridTheme();

const trackList = shallowRef<TrackableList<Tqmtpa5>>(new TrackableList<Tqmtpa5>());
const querying = ref(false);
const saving = ref(false);
const gridApi = ref<GridApi | null>(null);

/* 查询条件（原 stackPanel1 内 txtStdCode / txtSgStd；Designer 标签原文为「钢种代码」「钢种」） */
const input = ref({ stdCode: "", sgStd: "" });

/* 主表：按 Designer VisibleIndex 0~7；Id/原标准代码1/生效标记/版次/归档标记 未排入 → hide */
const colDefs: ColDef[] = [
  /* 原 Selected 勾选列：ui-rules §7 不手写勾选列，行选择由 row-selection 复选框承担，本列隐藏保留在列面板 */
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStdCode", headerName: "标准代码", width: 140 },
  { field: "cSgStd", headerName: "执行标准", width: 160 },
  { field: "cRemark", headerName: "备注", width: 180 },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "lastModifier", headerName: "最后修改人", width: 100 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
  { field: "id", headerName: "主键", width: 150, hide: true },
  { field: "cStdCodeOld", headerName: "原标准代码1", width: 130, hide: true },
  { field: "cValidFlag", headerName: "生效标记", width: 90, hide: true },
  { field: "nVersion", headerName: "版次", width: 70, hide: true },
  { field: "cArchiveFlag", headerName: "归档标记", width: 90, hide: true },
];

function getRowId(p: { data: Tqmtpa5 }) {
  return String(p.data.id);
}

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

function currentRow(): Tqmtpa5 | null {
  return (gridApi.value?.getSelectedRows()[0] as Tqmtpa5 | undefined) ?? null;
}

async function onQuery() {
  querying.value = true;
  try {
    const list =
      (await tqmtpa5Api.query({
        cStdCode: input.value.stdCode.trim() || null,
        cSgStd: input.value.sgStd.trim() || null,
      })) ?? [];
    trackList.value = new TrackableList<Tqmtpa5>(list);
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 btnAdd_Click：AddNew + GenerateID + CValidFlag = ValidFlag.Valid */
function onAdd() {
  const draft = { id: NextStrId(), selected: false, cValidFlag: ValidFlag.Valid } as Tqmtpa5;
  trackList.value.push(draft);
  const stored = trackList.value[trackList.value.length - 1] as Tqmtpa5;
  requestAnimationFrame(() => {
    gridApi.value?.getRowNode(String(stored.id))?.setSelected(true);
  });
}

/** 原 btnDel_Click：bindingSource.RemoveCurrent() */
function onDelete() {
  const row = currentRow();
  if (!row) return;
  trackList.value.remove((r) => r.id === row.id);
}

/** 原 btnSave_Click：ToSaveChangesData → Proxy.Save → 回查 */
async function onSave() {
  saving.value = true;
  try {
    await tqmtpa5Api.save(trackList.value.SaveChangesData);
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 原 stackPanel1：2 条件 + 4 按钮同一行（ui-rules §6） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="input.stdCode" maxlength="100" placeholder="钢种代码" class="w-40 shrink-0" @keydown.enter="onQuery" />
      <InputText v-model="input.sgStd" maxlength="100" placeholder="钢种" class="w-40 shrink-0" @keydown.enter="onQuery" />
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
      <span class="ml-auto text-xs text-muted-foreground">标准维护（{{ trackList.length }}）</span>
    </div>

    <!-- 数据表格（原 gridControl1 / gridView1，Tqmtpa5） -->
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
