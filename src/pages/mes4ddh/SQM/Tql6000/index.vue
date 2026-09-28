<script setup lang="ts">
/** 对应 FrmTql6000（二炼钢扒皮台账）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTql6000
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
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

// 列按 Designer.cs 排序
const colDefs: ColDef[] = [
  { field: "CStove", headerName: "炉号", width: 90 },
  { field: "CPieceNo", headerName: "头侧件次号", width: 110 },
  { field: "CLineCode", headerName: "产线", width: 70 },
  { field: "NProType", headerName: "库存类型", width: 80 },
  { field: "CSgCode", headerName: "钢种", width: 90 },
  { field: "NThick", headerName: "厚度", width: 70 },
  { field: "NWth", headerName: "宽度", width: 70 },
  { field: "NLen", headerName: "长度", width: 70 },
  { field: "NLenMin", headerName: "最小长度", width: 90 },
  { field: "NLenMax", headerName: "最大长度", width: 90 },
  { field: "CSpec", headerName: "规格", width: 120 },
  { field: "NNum", headerName: "件数", width: 60 },
  { field: "NCalWgt", headerName: "理重", width: 70 },
  { field: "NWgt", headerName: "重量", width: 70 },
  { field: "CSgStd", headerName: "钢种标准", width: 100 },
  { field: "HasFile", headerName: "是否已上传", width: 90 },
  { field: "CSurfaceResult", headerName: "表检结果", width: 90 },
  { field: "CSurfaceDefectCode", headerName: "表面缺陷代码", width: 110 },
  { field: "CSurfaceDesc", headerName: "表检描述", width: 150 },
  { field: "CSurfaceUser", headerName: "表面判定人", width: 100 },
  { field: "DSurfaceTime", headerName: "表面判定时间", width: 140 },
  { field: "CFaceHandleAdvice", headerName: "处置措施", width: 110 },
  { field: "NSurfaceThick1", headerName: "尺寸厚1", width: 80 },
  { field: "NSurfaceThick2", headerName: "尺寸厚2", width: 80 },
  { field: "NSurfaceThick3", headerName: "尺寸厚3", width: 80 },
  { field: "NSurfaceLen", headerName: "尺寸长", width: 80 },
  { field: "NSurfaceWidth", headerName: "尺寸宽", width: 80 },
  { field: "CShiftNo", headerName: "结果录入班次", width: 100 },
  { field: "CGroupNo", headerName: "结果录入班组", width: 100 },
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
function onUploadFile() {
  toast("画面迁移：图片查看/上传逻辑待接入", 2000, "warn");
}
function onDownload() {
  toast("画面迁移：下载图片逻辑待接入", 2000, "warn");
}
function onExport() {
  toast("画面迁移：导出数据与图片逻辑待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：4个按钮，无查询条件 -->
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
      <span class="ml-auto text-xs text-muted-foreground">二炼钢扒皮台账（{{ rows.length }}）</span>
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
