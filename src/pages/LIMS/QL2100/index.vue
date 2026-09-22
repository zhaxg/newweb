<script setup lang="ts">
/** 对应 FrmQL2100（炉次成分判定）：DDH.Winforms.LIMS.Forms.FrmQL2100
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconFlask, IconPlus, IconRefresh, IconSearch, IconSend, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const processRows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 主表：炉次列表（按 VisibleIndex）
const colDefs: ColDef[] = [
      { field: "CStove", headerName: "CStove", width: 120 },
      { field: "CSgSign", headerName: "CSgSign", width: 120 },
      { field: "CPStove", headerName: "CPStove", width: 120 },
      { field: "CSgStd", headerName: "CSgStd", width: 120 },
      { field: "CStNo", headerName: "CStNo", width: 120 },
      { field: "CJudgeRemark", headerName: "CJudgeRemark", width: 120 },
      { field: "CAutoJudgeResult", headerName: "CAutoJudgeResult", width: 120 },
      { field: "CLineCode", headerName: "CLineCode", width: 120 },
      { field: "CMachine", headerName: "CMachine", width: 120 },
      { field: "CAutoJudgeResultNk", headerName: "CAutoJudgeResultNk", width: 120 },
      { field: "CJudgeResult", headerName: "CJudgeResult", width: 120 },
      { field: "CConfirmFlag", headerName: "CConfirmFlag", width: 120 },
      { field: "CJudgeUser", headerName: "CJudgeUser", width: 120 },
      { field: "DJudgeTime", headerName: "DJudgeTime", width: 120 },
      { field: "Selected", headerName: "Selected", width: 120 },
      { field: "CPoNo", headerName: "CPoNo", width: 120 },
      { field: "COrderNo", headerName: "COrderNo", width: 120 },
      { field: "COrderTsyq", headerName: "COrderTsyq", width: 120 },
      { field: "CRouteCode", headerName: "CRouteCode", width: 120 },
      { field: "CSpec", headerName: "CSpec", width: 120 },
      { field: "NThick", headerName: "NThick", width: 120 },
      { field: "NWth", headerName: "NWth", width: 120 },
      { field: "NLen", headerName: "NLen", width: 120 },
      { field: "CIngotCode", headerName: "CIngotCode", width: 120 },
      { field: "NPlanWgt", headerName: "NPlanWgt", width: 120 },
      { field: "DProdTime", headerName: "DProdTime", width: 120 },
      { field: "CRecheckFlag", headerName: "CRecheckFlag", width: 120 },
];;

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    processRows.value = [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}
function onRelease() { toast("画面迁移：放行逻辑待接入", 2000, "warn"); }
function onUnqualified() { toast("画面迁移：判不合逻辑待接入", 2000, "warn"); }
function onLabRecheck() { toast("画面迁移：试验室复验逻辑待接入", 2000, "warn"); }
function onQMRecheck() { toast("画面迁移：质检复验逻辑待接入", 2000, "warn"); }
function onAutoJudge() { toast("画面迁移：重新自动判定逻辑待接入", 2000, "warn"); }
function onAddStove() { toast("画面迁移：添加炉次信息逻辑待接入", 2000, "warn"); }
function onSyncStove() { toast("画面迁移：同步成分信息逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：8个按钮，无查询条件 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onRelease">
        <IconCheck class="h-3 w-3" />放行
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onUnqualified">
        <IconX class="h-3 w-3" />判不合
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onLabRecheck">
        <IconFlask class="h-3 w-3" />试验室复验
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onQMRecheck">
        <IconFlask class="h-3 w-3" />质检复验
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAutoJudge">
        <IconRefresh class="h-3 w-3" />重新自动判定
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAddStove">
        <IconPlus class="h-3 w-3" />添加炉次信息
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSyncStove">
        <IconRefresh class="h-3 w-3" />同步成分信息
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">炉次成分判定（{{ rows.length }}）</span>
    </div>

    <!-- 左右主子表：左=炉次列表，右=判定结果 -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左：炉次列表 -->
      <SplitterPanel :size="45" :minSize="30" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">炉次列表</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :suppress-column-virtualisation="true"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 右：判定结果详情（对应原 ucCfResult1） -->
      <SplitterPanel :minSize="25" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">判定结果详情</span>
        </div>
        <div class="flex min-h-0 flex-1 items-center justify-center bg-muted/30">
          <p class="text-xs text-muted-foreground">选择左侧炉次查看判定结果详情</p>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
