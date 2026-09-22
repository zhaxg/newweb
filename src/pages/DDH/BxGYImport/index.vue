<script setup lang="ts">
/** 对应 FrmBxGYImport（规范挂靠组合）：DDH.Winforms.Forms.FrmBxGYImport
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import Button from "primevue/button";
import { IconFileImport, IconSearch, IconUpload } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const route = useRoute();
const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 根据路由路径确定页面标题（cQueryString 未传递到路由，用 cResPath 区分）
const pageTitle = computed(() => {
  const p = route.path;
  if (p.includes("bxgyimport-020421")) return "加热轧制要求"; // HR02
  if (p.includes("bxgyimport-325893")) return "剪切要求";     // HR03
  return "规范挂靠组合"; // HR00
});

const fileName = ref("");

// 列按业务语义
const colDefs: ColDef[] = [
  { field: "CCode", headerName: "编码", width: 130 },
  { field: "CName", headerName: "名称", width: 180 },
  { field: "CValue", headerName: "值", width: 120 },
  { field: "CDesc", headerName: "描述", width: 250 },
  { field: "COrder", headerName: "排序", width: 80 },
  { field: "CGroup", headerName: "分组", width: 100 },
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

function onImportByJson() {
  toast("画面迁移：JSON导入逻辑待接入", 2000, "warn");
}

function onPickFile() {
  toast("画面迁移：文件选择逻辑待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：查询 + JSON导入 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onImportByJson">
        <IconFileImport class="h-3 w-3" />JSON导入
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onPickFile">
        <IconUpload class="h-3 w-3" />选择文件
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">{{ pageTitle }}（{{ rows.length }}）</span>
    </div>

    <!-- 文件选择区 -->
    <div class="flex h-12 shrink-0 items-center gap-2 border-b border-border/60 px-3">
      <span class="text-xs text-muted-foreground">{{ fileName || "未选择文件" }}</span>
      <span class="ml-auto text-xs text-muted-foreground">支持 .json 格式</span>
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
