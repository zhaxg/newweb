<script setup lang="ts">
/** 对应 FrmTiGzmfile（标准/工艺文件管理）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTiGzmfile
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import { IconDownload, IconEye, IconPencil, IconPlus, IconRefresh, IconSearch, IconTrash, IconUpload, IconX } from "@tabler/icons-vue";
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

// 列按 Designer.cs 排序
const colDefs: ColDef[] = [
      { field: "Selected", headerName: "Selected", width: 120 },
      { field: "UseUnit", headerName: "UseUnit", width: 60 },
      { field: "MatKind", headerName: "MatKind", width: 60 },
      { field: "ControlState", headerName: "ControlState", width: 60 },
      { field: "Variety", headerName: "Variety", width: 60 },
      { field: "RegulateNo", headerName: "RegulateNo", width: 60 },
      { field: "RegulateName", headerName: "RegulateName", width: 60 },
      { field: "SgStd", headerName: "SgStd", width: 60 },
      { field: "SgSign", headerName: "SgSign", width: 60 },
      { field: "VersionNo", headerName: "VersionNo", width: 60 },
      { field: "CIsEnable", headerName: "CIsEnable", width: 60 },
      { field: "DutyMan", headerName: "DutyMan", width: 60 },
      { field: "PublishDate", headerName: "PublishDate", width: 60 },
      { field: "Remark", headerName: "Remark", width: 60 },
      { field: "CUptUser", headerName: "CUptUser", width: 60 },
      { field: "DUptDate", headerName: "DUptDate", width: 60 },
      { field: "CScrapUser", headerName: "CScrapUser", width: 60 },
      { field: "DScrapDate", headerName: "DScrapDate", width: 60 },
      { field: "SerialNo", headerName: "SerialNo", width: 60 },
      { field: "RegulateContent", headerName: "RegulateContent", width: 60 },
      { field: "Rcn", headerName: "Rcn", width: 60 },
      { field: "RcnPage", headerName: "RcnPage", width: 60 },
      { field: "AsumeUnit", headerName: "AsumeUnit", width: 60 },
      { field: "DraftUnit", headerName: "DraftUnit", width: 60 },
      { field: "DraftMan", headerName: "DraftMan", width: 60 },
      { field: "CheckMake", headerName: "CheckMake", width: 60 },
      { field: "ApproveMan", headerName: "ApproveMan", width: 60 },
      { field: "Operater", headerName: "Operater", width: 60 },
      { field: "UseDate", headerName: "UseDate", width: 60 },
      { field: "OperateDate", headerName: "OperateDate", width: 60 },
      { field: "ControlId", headerName: "ControlId", width: 60 },
      { field: "Holder", headerName: "Holder", width: 60 },
      { field: "Type", headerName: "Type", width: 60 },
      { field: "CSource", headerName: "CSource", width: 60 },
      { field: "MatKindName", headerName: "MatKindName", width: 60 },
      { field: "RegulateNameReplace", headerName: "RegulateNameReplace", width: 60 },
      { field: "DCloseDate", headerName: "DCloseDate", width: 60 },
      { field: "CSgStds", headerName: "CSgStds", width: 60 },
      { field: "CPid", headerName: "CPid", width: 60 },
      { field: "CGywjType", headerName: "CGywjType", width: 60 },
      { field: "CMachineCodes", headerName: "CMachineCodes", width: 60 },
      { field: "CMachineNames", headerName: "CMachineNames", width: 60 },
      { field: "CSgCodes", headerName: "CSgCodes", width: 60 },
      { field: "CSgStdCodes", headerName: "CSgStdCodes", width: 70 },
];;

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
function onLook() { toast("画面迁移：预览逻辑待接入", 2000, "warn"); }
function onQueryBM() { toast("画面迁移：保密文件查询逻辑待接入", 2000, "warn"); }
function onQueryZF() { toast("画面迁移：作废文件查询逻辑待接入", 2000, "warn"); }
function onAdd() { toast("画面迁移：上传逻辑待接入", 2000, "warn"); }
function onEdit() { toast("画面迁移：修改逻辑待接入", 2000, "warn"); }
function onZf() { toast("画面迁移：作废逻辑待接入", 2000, "warn"); }
function onCancelZf() { toast("画面迁移：取消作废逻辑待接入", 2000, "warn"); }
function onDownload() { toast("画面迁移：下载逻辑待接入", 2000, "warn"); }
function onDelete() { toast("画面迁移：删除逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：10个按钮，无查询条件 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onLook">
        <IconEye class="h-3 w-3" />预览
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onQueryBM">
        <IconSearch class="h-3 w-3" />保密文件查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onQueryZF">
        <IconSearch class="h-3 w-3" />作废文件查询
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconUpload class="h-3 w-3" />上传
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />修改
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onZf">
        <IconX class="h-3 w-3" />作废
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCancelZf">
        <IconRefresh class="h-3 w-3" />取消作废
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDownload">
        <IconDownload class="h-3 w-3" />下载
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">标准/工艺文件（{{ rows.length }}）</span>
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
