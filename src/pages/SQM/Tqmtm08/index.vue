<script setup lang="ts">
/** 对应 FrmTqmtm08（基表挂靠标准配置）：DDH.Winforms.SQM.Forms.Tqmtm.FrmTqmtm08
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconArrowBarDown, IconArrowBarUp, IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const treeRows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const treeGridApi = ref<GridApi | null>(null);

const input = reactive({
  workType: "",
  basicTableType: "",
  prodClass: "",
  prodName: "",
  searchIdx: "",
});

// 列按 Designer.cs 排序
const colDefs: ColDef[] = [
  { field: "CBasicTableCode", headerName: "基表代码", width: 110 },
  { field: "CFacCode", headerName: "工厂", width: 80 },
  { field: "CWorkTypeCode", headerName: "作业工序类型", width: 110 },
  { field: "CBasicTableCName", headerName: "基表中文名称", width: 150 },
  { field: "CBasicTableTypeCode", headerName: "基表类型", width: 100 },
  { field: "CBasicTableEName", headerName: "基表英文名称", width: 150 },
  { field: "ValidateFlag", headerName: "有效标志", width: 90 },
  { field: "CProdClassCode", headerName: "产品大类代码", width: 120 },
  { field: "CProdCode", headerName: "产品代码", width: 110 },
  { field: "CSearchIdx", headerName: "检索索引", width: 100 },
  { field: "Creator", headerName: "创建人", width: 90 },
  { field: "CreateTime", headerName: "创建时间", width: 140 },
  { field: "LastModifier", headerName: "最后修改人", width: 100 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 140 },
];

// 树形列表列（对应原 treeList1，VisibleIndex 1-2）
const treeColDefs: ColDef[] = [
  { field: "CBasicTableCName", headerName: "中文名称", width: 150 },
  { field: "CBasicTableEName", headerName: "英文名称", width: 200 },
];

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }
function onTreeGridReady(e: GridReadyEvent) { treeGridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    treeRows.value = [];
    requestAnimationFrame(() => {
      gridApi.value?.autoSizeAllColumns();
      treeGridApi.value?.autoSizeAllColumns();
    });
  } finally {
    querying.value = false;
  }
}
function onExpand() { toast("画面迁移：展开逻辑待接入", 2000, "warn"); }
function onCollapse() { toast("画面迁移：收缩逻辑待接入", 2000, "warn"); }
function onAdd() { toast("画面迁移：添加逻辑待接入", 2000, "warn"); }
function onDelete() { toast("画面迁移：删除逻辑待接入", 2000, "warn"); }
function onSave() { toast("画面迁移：保存逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：5个条件 → 6列 grid -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">作业工序</label>
          <Select v-model="input.workType" :options="[]" show-clear class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">基表类型</label>
          <Select v-model="input.basicTableType" :options="[]" show-clear class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产品大类</label>
          <Select v-model="input.prodClass" :options="[]" show-clear class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">品名</label>
          <InputText v-model="input.prodName" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">检索索引</label>
          <InputText v-model="input.searchIdx" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 操作工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onExpand">
        <IconArrowBarUp class="h-3 w-3" />展开
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCollapse">
        <IconArrowBarDown class="h-3 w-3" />收缩
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">基表挂靠标准配置（{{ rows.length }}）</span>
    </div>

    <!-- 左右主子表：左=基表配置，右=树形列表 -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左：基表配置（对应原 gridControl1） -->
      <SplitterPanel :size="55" :minSize="30" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">基表配置（{{ rows.length }}）</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 右：树形列表（对应原 treeList1） -->
      <SplitterPanel :minSize="20" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">基表名称</span>
          <span class="flex-1" />
          <Button text class="shrink-0 whitespace-nowrap" @click="onExpand">
            <IconArrowBarUp class="h-3 w-3" />展开
          </Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onCollapse">
            <IconArrowBarDown class="h-3 w-3" />收缩
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="treeColDefs" :row-data="treeRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false"
            @grid-ready="onTreeGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
