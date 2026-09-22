<script setup lang="ts">
import { ref } from "vue";
import { IconCheck, IconPencil, IconPlus, IconPrinter, IconRefresh, IconTrash } from "@tabler/icons-vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

/** 对应 FrmXtraReportTemplateManager（报表打印模板）：Hmx.WinForms.Widgets.Reportprint.FrmXtraReportTemplateManager
 *  画面迁移，逻辑不迁移到 */

const { toast } = useToast();
const theme = makeHmxGridTheme();

interface ReportTemplate {
  id: string;
  cDataType?: string;
  createTime?: string;
  lastModifyTime?: string;
  cComments?: string;
  nTemplateType?: number;
  creator?: string;
  lastModifier?: string;
}

const rows = ref<ReportTemplate[]>([]);
const querying = ref(false);
const keyword = ref("");

const columnDefs: ColDef[] = [
  { colId: "id", field: "id", headerName: "Id", width: 150 },
  { colId: "cDataType", field: "cDataType", headerName: "数据类型", width: 120 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "更新时间", width: 150 },
  { colId: "cComments", field: "cComments", headerName: "说明", width: 160 },
  { colId: "nTemplateType", field: "nTemplateType", headerName: "模板类型", width: 100 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 100 },
  { colId: "lastModifier", field: "lastModifier", headerName: "更新人", width: 100, flex: 1 },
];

function getRowId(p: GetRowIdParams) {
  return (p.data as ReportTemplate).id;
}

// ---------- 工具栏（逻辑不迁移，占位） ----------
async function onQuery() {
  querying.value = true;
  try {
    // TODO: 接入报表打印模板查询服务（关键字 keyword）
    rows.value = [];
  } finally {
    querying.value = false;
  }
  toast("画面迁移：查询逻辑待接入", 2000, "warn");
}

function onAdd() {
  // TODO: 原窗体二级编辑弹窗，按 README §8.4 暂留占位
  toast("画面迁移：添加逻辑待接入", 2000, "warn");
}

function onEdit() {
  // TODO: 原窗体二级编辑弹窗，按 README §8.4 暂留占位
  toast("画面迁移：编辑逻辑待接入", 2000, "warn");
}

function onDelete() {
  // TODO: 原窗体未绑定事件
  toast("画面迁移：删除逻辑待接入", 2000, "warn");
}

function onSave() {
  // TODO: 原窗体未绑定事件
  toast("画面迁移：保存逻辑待接入", 2000, "warn");
}

function onPrintMock() {
  // TODO: 原窗体未绑定事件
  toast("画面迁移：打印模拟数据逻辑待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件 + 工具栏（对应原 stackPanel） -->
    <div class="flex h-10 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">关键字</label>
      <InputText v-model="keyword" class="w-44" />
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconRefresh class="h-3.5 w-3.5" />查询
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3.5 w-3.5" />添加
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3.5 w-3.5" />编辑
      </Button>
      <Button variant="outlined" size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3.5 w-3.5" />删除
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconCheck class="h-3.5 w-3.5" />保存
      </Button>
      <Button variant="outlined" size="small" class="shrink-0 whitespace-nowrap" @click="onPrintMock">
        <IconPrinter class="h-3.5 w-3.5" />打印模拟数据
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">报表打印模板（{{ rows.length }}）</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :row-data="rows" :get-row-id="getRowId" :row-selection="'single'"
        :pagination="false" :animate-rows="false" :loading="querying" :locale-text="AG_GRID_LOCALE_CN"
        @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
