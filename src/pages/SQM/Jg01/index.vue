<script setup lang="ts">
/** 对应 FrmJg01（轧钢工艺要点）：DDH.Winforms.SQM.Forms.Tqmjg.FrmJg01
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修
 *  注：列定义由 UCJggyView 运行时动态加载，源码无静态列 */

import { ref } from "vue";
import Button from "primevue/button";
import { IconCheck, IconCopy, IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 列由 UCJggyView 动态加载，此处为占位列
const colDefs: ColDef[] = [
  { field: "CCode", headerName: "编码", width: 120 },
  { field: "CName", headerName: "名称", width: 180 },
  { field: "CValue", headerName: "值", width: 150 },
  { field: "CRemark", headerName: "备注", width: 200 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
];

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
function onAdd() { toast("画面迁移：添加逻辑待接入", 2000, "warn"); }
function onEdit() { toast("画面迁移：编辑逻辑待接入", 2000, "warn"); }
function onCopy() { toast("画面迁移：复制逻辑待接入", 2000, "warn"); }
function onValid() { toast("画面迁移：生效逻辑待接入", 2000, "warn"); }
function onInvalid() { toast("画面迁移：作废逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：7个按钮，无查询条件 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCopy">
        <IconCopy class="h-3 w-3" />复制
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onValid">
        <IconCheck class="h-3 w-3" />生效
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onInvalid">
        <IconTrash class="h-3 w-3" />作废
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">轧钢工艺要点（{{ rows.length }}）</span>
    </div>

    <!-- 数据表格 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :suppress-column-virtualisation="true"
        :pagination="false" :animate-rows="false" :loading="querying"
        @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
