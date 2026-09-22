<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconDeviceFloppy, IconPlus, IconRefresh, IconSearch, IconTrash } from "@tabler/icons-vue";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

/** 对应 FrmInterfaceConfig（接口配置）：Hmx.WinForms.Widgets.Interfaceplatform.FrmInterfaceConfig
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 下方详情编辑区（对应原 layoutControl1 + memoEdit1/2）
const endpointDesc = ref("");
const configJson = ref("");

// 列按 Designer.cs VisibleIndex 排序（CWsdlUrl/CEndpointUrl 无显式 VisibleIndex 排末尾）
const colDefs: ColDef[] = [
  { field: "CEndpointCode", headerName: "端点代码", width: 166 },
  { field: "CEndpointName", headerName: "端点名称", width: 166 },
  { field: "CSourceSystem", headerName: "发方系统", width: 166 },
  { field: "CTargetSystem", headerName: "收方系统", width: 166 },
  { field: "CUserName", headerName: "用户名", width: 145 },
  { field: "CPassword", headerName: "密码", width: 124 },
  { field: "un_InterfaceStatus", headerName: "接口状态", width: 120 },
  { field: "CWsdlUrl", headerName: "WSDL地址", width: 300 },
  { field: "CEndpointUrl", headerName: "端点地址", width: 300 },
  { field: "Id", headerName: "ID", width: 130 },
];

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try { rows.value = []; } finally { querying.value = false; }
}
function onAdd() { /* TODO */ }
function onDelete() { /* TODO */ }
function onSave() { /* TODO */ }
function onRefresh() { /* TODO */ }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：无查询条件，仅按钮 -->
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
      <Button text class="shrink-0 whitespace-nowrap" @click="onRefresh">
        <IconRefresh class="h-3 w-3" />刷新
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">接口配置（{{ rows.length }}）</span>
    </div>

    <!-- 上下主子表：上=接口列表，下=详情编辑区 -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- 上：接口列表 -->
      <SplitterPanel :size="55" :minSize="30" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">接口列表</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }" :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 下：详情编辑区（对应原 layoutControl1 + memoEdit） -->
      <SplitterPanel :minSize="20" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">接口详情</span>
        </div>
        <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">
          <div class="flex items-start gap-2">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">端点描述</label>
            <textarea v-model="endpointDesc" rows="3"
              class="min-w-0 flex-1 resize-y rounded border border-border bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div class="flex items-start gap-2">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">配置内容</label>
            <textarea v-model="configJson" rows="5"
              class="min-w-0 flex-1 resize-y rounded border border-border bg-transparent px-2 py-1 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
