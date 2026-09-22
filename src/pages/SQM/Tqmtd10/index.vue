<script setup lang="ts">
/** 对应 FrmTqmtd10（执行标准管理）：DDH.Winforms.SQM.Forms.Tqmtd.FrmTqmtd10
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import { IconCheck, IconCopy, IconList, IconPencil, IconPlus, IconRefresh, IconSearch, IconSettings, IconTrash, IconX } from "@tabler/icons-vue";
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

// 列由配置动态加载，此处为占位列
const colDefs: ColDef[] = [
  { field: "CCode", headerName: "标准编码", width: 130 },
  { field: "CName", headerName: "标准名称", width: 200 },
  { field: "CStatus", headerName: "状态", width: 90 },
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
function onDelete() { toast("画面迁移：删除逻辑待接入", 2000, "warn"); }
function onCheck() { toast("画面迁移：审核生效逻辑待接入", 2000, "warn"); }
function onDisable() { toast("画面迁移：禁用逻辑待接入", 2000, "warn"); }
function onQueryRecord() { toast("画面迁移：修改履历逻辑待接入", 2000, "warn"); }
function onUpdateTestItem() { toast("画面迁移：更新检验项目逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：9个按钮，无查询条件 -->
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
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onCheck">
        <IconCheck class="h-3 w-3" />审核生效
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDisable">
        <IconX class="h-3 w-3" />禁用
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onQueryRecord">
        <IconList class="h-3 w-3" />修改履历
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onUpdateTestItem">
        <IconRefresh class="h-3 w-3" />更新检验项目
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">执行标准管理（{{ rows.length }}）</span>
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
