<script setup lang="ts">
/** 对应 FrmTql6100（中厚板质量异常汇总）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTql6100
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import { IconDownload, IconFileExport, IconSearch, IconUpload } from "@tabler/icons-vue";
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

const input = reactive({
  timeRange: null as Date[] | null,
  stoveNo: "",
  slabNo: "",
});

// 列按 Designer.cs 排序
const colDefs: ColDef[] = [
      { field: "Selected", headerName: "Selected", width: 112 },
      { field: "DTime", headerName: "DTime", width: 112 },
      { field: "HasFile", headerName: "HasFile", width: 112 },
      { field: "CStoveNo", headerName: "CStoveNo", width: 112 },
      { field: "CSgCode", headerName: "CSgCode", width: 112 },
      { field: "CPieceNoSlab", headerName: "CPieceNoSlab", width: 112 },
      { field: "NThickSlab", headerName: "NThickSlab", width: 112 },
      { field: "NWidthSlab", headerName: "NWidthSlab", width: 112 },
      { field: "NLenSlab", headerName: "NLenSlab", width: 112 },
      { field: "DTimeJL", headerName: "DTimeJL", width: 112 },
      { field: "DTimeKJ", headerName: "DTimeKJ", width: 112 },
      { field: "DFurTime", headerName: "DFurTime", width: 112 },
      { field: "CFurType", headerName: "CFurType", width: 112 },
      { field: "CPieceNo", headerName: "CPieceNo", width: 112 },
      { field: "CInboundNo", headerName: "CInboundNo", width: 112 },
      { field: "NThickPlate", headerName: "NThickPlate", width: 112 },
      { field: "NWidthPlate", headerName: "NWidthPlate", width: 112 },
      { field: "NLenPlate", headerName: "NLenPlate", width: 112 },
      { field: "CTolType", headerName: "CTolType", width: 112 },
      { field: "CTrimFlag", headerName: "CTrimFlag", width: 112 },
      { field: "CZrDw", headerName: "CZrDw", width: 112 },
      { field: "CDefectType", headerName: "CDefectType", width: 112 },
      { field: "CDefectPosition", headerName: "CDefectPosition", width: 112 },
      { field: "CDefectDesc", headerName: "CDefectDesc", width: 112 },
      { field: "CLgReason", headerName: "CLgReason", width: 112 },
      { field: "CZgReason", headerName: "CZgReason", width: 112 },
      { field: "DRollTime", headerName: "DRollTime", width: 112 },
      { field: "DJyTime", headerName: "DJyTime", width: 112 },
      { field: "CResult", headerName: "CResult", width: 112 },
      { field: "CSurfaceCategory", headerName: "CSurfaceCategory", width: 106 },
      { field: "CPutPos", headerName: "CPutPos", width: 112 },
      { field: "CZgGroup", headerName: "CZgGroup", width: 112 },
      { field: "CUser", headerName: "CUser", width: 112 },
      { field: "CLgGroup", headerName: "CLgGroup", width: 112 },
      { field: "DHandleTime", headerName: "DHandleTime", width: 112 },
      { field: "CHandleResult", headerName: "CHandleResult", width: 112 },
      { field: "CGroup", headerName: "CGroup", width: 112 },
      { field: "CUser2", headerName: "CUser2", width: 112 },
      { field: "CInPos", headerName: "CInPos", width: 112 },
      { field: "CRemark", headerName: "CRemark", width: 112 },
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
function onUploadFile() { toast("画面迁移：图片查看/上传逻辑待接入", 2000, "warn"); }
function onDownload() { toast("画面迁移：下载图片逻辑待接入", 2000, "warn"); }
function onExport() { toast("画面迁移：导出数据与图片逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：3个条件 → 6列 grid -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
          <DatePicker v-model="input.timeRange" selection-mode="range" :manual-input="false"
            date-format="yy-mm-dd" show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="input.stoveNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">材料号</label>
          <InputText v-model="input.slabNo" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 操作工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onUploadFile">
        <IconUpload class="h-3 w-3" />图片查看/上传
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDownload">
        <IconDownload class="h-3 w-3" />下载图片
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onExport">
        <IconFileExport class="h-3 w-3" />导出数据与图片
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">质量异常汇总（{{ rows.length }}）</span>
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
