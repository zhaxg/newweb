<script setup lang="ts">
import { ref } from "vue";
import { IconSearch, IconPlus, IconPencil, IconTrash } from "@tabler/icons-vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTql1121（表判缺陷描述）：DDH.Winforms.SQM.Forms.Tmptq.FrmTql1121
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const keyword = ref("");

const colDefs = ref<ColDef[]>([
  { field: "CTypeId", headerName: "类型代码", width: 112 },
  { field: "CDescCode", headerName: "缺陷代码", width: 112 },
  { field: "CDescName", headerName: "缺陷名称", width: 112 },
  { field: "CDescDetail", headerName: "缺陷详情", width: 112 },
  { field: "Creator", headerName: "创建人", width: 112 },
  { field: "CreateTime", headerName: "创建时间", width: 112 },
  { field: "LastModifier", headerName: "最后修改人", width: 112 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
]);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onQuery() {
  /* TODO: 接入业务逻辑 */
}
function onAdd() {
  /* TODO: 接入业务逻辑 */
}
function onEdit() {
  /* TODO: 接入业务逻辑 */
}
function onDel() {
  /* TODO: 接入业务逻辑 */
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：关键字 + 查询/添加/编辑/删除 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText
        v-model="keyword"
        maxlength="100"
        placeholder="关键字"
        class="w-60 shrink-0"
        @keydown.enter="onQuery"
      />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3.5 w-3.5" />查询
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3.5 w-3.5" />添加
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3.5 w-3.5" />编辑
      </Button>
      <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3.5 w-3.5" />删除
      </Button>
    </div>

    <!-- 数据表格 -->
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
        @grid-ready="onGridReady"
      />
    </div>
  </div>
</template>
