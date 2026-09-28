<script setup lang="ts">
/** 对应 FrmTqmtpa6（钢种标准对照）：DDH.Winforms.SQM.Forms.Basic.FrmTqmtpa6
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const stdCode = ref("");
const sgName = ref("");

// 列按 Designer.cs 排序
const colDefs: ColDef[] = [
  { field: "CStdSgCode", headerName: "标准牌号代码", width: 130 },
  { field: "CSgStd", headerName: "钢种标准", width: 150 },
  { field: "CSgSign", headerName: "钢种", width: 90 },
  { field: "CSgClassCode", headerName: "牌号分类代码", width: 130 },
  { field: "CRemark", headerName: "备注", width: 150 },
  { field: "CStdCode", headerName: "标准代码", width: 120 },
  { field: "CSgCode", headerName: "钢种代码", width: 110 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
function onAdd() {
  /* TODO */
}
function onEdit() {
  /* TODO */
}
function onDelete() {
  /* TODO */
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：2个条件合并一行，无label用placeholder -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="stdCode" maxlength="50" placeholder="标准" class="w-40 shrink-0" @keydown.enter="onQuery" />
      <InputText v-model="sgName" maxlength="50" placeholder="钢种" class="w-40 shrink-0" @keydown.enter="onQuery" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd"> <IconPlus class="h-3 w-3" />添加 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit"> <IconPencil class="h-3 w-3" />编辑 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">钢种标准对照（{{ rows.length }}）</span>
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
        :suppress-column-virtualisation="true"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
