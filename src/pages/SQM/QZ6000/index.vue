<script setup lang="ts">
/** 对应 FrmQZ6000（库内材料质量处置）：DDH.Winforms.SQM.Forms.QualityDisposition.FrmQZ6000
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { ref } from "vue";
import Button from "primevue/button";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconRefresh, IconSearch, IconSend, IconX } from "@tabler/icons-vue";
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

// 主要列（完整 87 列从原 Designer.cs 提取，此处列出常用列）
const colDefs: ColDef[] = [
      { field: "Selected", headerName: "Selected", width: 120 },
      { field: "CStove", headerName: "CStove", width: 120 },
      { field: "CPieceNo", headerName: "CPieceNo", width: 120 },
      { field: "CBatchNo", headerName: "CBatchNo", width: 120 },
      { field: "CSgCode", headerName: "CSgCode", width: 120 },
      { field: "CSgStd", headerName: "CSgStd", width: 120 },
      { field: "CSpec", headerName: "CSpec", width: 120 },
      { field: "COrderNo", headerName: "COrderNo", width: 120 },
      { field: "NQmStatus", headerName: "NQmStatus", width: 120 },
      { field: "CQmHandleCode", headerName: "CQmHandleCode", width: 120 },
      { field: "CProRemark", headerName: "CProRemark", width: 120 },
      { field: "CSpecialMarkGy", headerName: "CSpecialMarkGy", width: 120 },
      { field: "NQmLevel", headerName: "NQmLevel", width: 120 },
      { field: "TestJobJudgeResult", headerName: "理化结果", width: 120 },
      { field: "CSurfaceResult", headerName: "CSurfaceResult", width: 120 },
      { field: "CDetectResultCode", headerName: "CDetectResultCode", width: 120 },
      { field: "CComplexDecideCode", headerName: "CComplexDecideCode", width: 120 },
      { field: "CSampleLotNo", headerName: "CSampleLotNo", width: 120 },
      { field: "NotJudgeReason", headerName: "NotJudgeReason", width: 120 },
      { field: "NLockReason", headerName: "NLockReason", width: 120 },
      { field: "CSurfaceDefectCode", headerName: "CSurfaceDefectCode", width: 120 },
      { field: "CSurfaceDesc", headerName: "CSurfaceDesc", width: 120 },
      { field: "CSurfaceUser", headerName: "CSurfaceUser", width: 120 },
      { field: "DSurfaceTime", headerName: "DSurfaceTime", width: 120 },
      { field: "CComplexUser", headerName: "CComplexUser", width: 120 },
      { field: "DComplexTime", headerName: "DComplexTime", width: 120 },
      { field: "CCutFlag", headerName: "CCutFlag", width: 120 },
      { field: "CLineCode", headerName: "CLineCode", width: 120 },
      { field: "NThick", headerName: "NThick", width: 120 },
      { field: "NWth", headerName: "NWth", width: 120 },
      { field: "NLen", headerName: "NLen", width: 120 },
      { field: "NNum", headerName: "NNum", width: 120 },
      { field: "NCalWgt", headerName: "NCalWgt", width: 120 },
      { field: "NWgt", headerName: "NWgt", width: 120 },
      { field: "DProTime", headerName: "DProTime", width: 120 },
      { field: "CProUser", headerName: "CProUser", width: 120 },
      { field: "CShiftNo", headerName: "CShiftNo", width: 120 },
      { field: "CGroupNo", headerName: "CGroupNo", width: 120 },
      { field: "DInTime", headerName: "DInTime", width: 120 },
      { field: "CInUser", headerName: "CInUser", width: 120 },
      { field: "CStoreCode", headerName: "CStoreCode", width: 120 },
      { field: "CStackNo", headerName: "CStackNo", width: 120 },
      { field: "CStackNum", headerName: "CStackNum", width: 120 },
      { field: "CSourceStoreCode", headerName: "CSourceStoreCode", width: 120 },
      { field: "CSourceStackNo", headerName: "CSourceStackNo", width: 120 },
      { field: "CSourceStackNum", headerName: "CSourceStackNum", width: 120 },
      { field: "CIsHot", headerName: "CIsHot", width: 120 },
      { field: "NCastDivCode", headerName: "NCastDivCode", width: 120 },
      { field: "CLockedLine", headerName: "CLockedLine", width: 120 },
      { field: "CLockedPlan", headerName: "CLockedPlan", width: 120 },
      { field: "CMatType", headerName: "CMatType", width: 120 },
      { field: "CProdCode", headerName: "CProdCode", width: 120 },
      { field: "CSteelType", headerName: "CSteelType", width: 120 },
      { field: "CDelivyStatusCode", headerName: "CDelivyStatusCode", width: 120 },
      { field: "CCustStdCode", headerName: "CCustStdCode", width: 120 },
      { field: "COrderNoLast", headerName: "COrderNoLast", width: 120 },
      { field: "CDestination", headerName: "CDestination", width: 120 },
      { field: "CHotNo", headerName: "CHotNo", width: 120 },
      { field: "CSlabType", headerName: "CSlabType", width: 120 },
      { field: "CPieceNoSlab", headerName: "CPieceNoSlab", width: 120 },
      { field: "CIsSurface", headerName: "CIsSurface", width: 120 },
      { field: "CDetectDefectLevel", headerName: "CDetectDefectLevel", width: 120 },
      { field: "CDefectDefectCode", headerName: "CDefectDefectCode", width: 120 },
      { field: "CDefectDefectMark", headerName: "CDefectDefectMark", width: 120 },
      { field: "CDefectUser", headerName: "CDefectUser", width: 120 },
      { field: "DDefectTime", headerName: "DDefectTime", width: 120 },
      { field: "CComplexDesc", headerName: "CComplexDesc", width: 120 },
      { field: "CQmHandleDesc", headerName: "CQmHandleDesc", width: 120 },
      { field: "CQmHandleUser", headerName: "CQmHandleUser", width: 120 },
      { field: "DQmHandleTime", headerName: "DQmHandleTime", width: 120 },
      { field: "CSampleLotNoPre", headerName: "CSampleLotNoPre", width: 120 },
      { field: "CInboundNo", headerName: "CInboundNo", width: 120 },
      { field: "CDelivyAddress", headerName: "CDelivyAddress", width: 120 },
      { field: "CWgtToler", headerName: "CWgtToler", width: 120 },
      { field: "CBilletTypeCode", headerName: "CBilletTypeCode", width: 120 },
      { field: "CCusName", headerName: "CCusName", width: 120 },
      { field: "CQxDl", headerName: "CQxDl", width: 120 },
      { field: "CQxXl", headerName: "CQxXl", width: 120 },
      { field: "TestJobReceiveUser", headerName: "TestJobReceiveUser", width: 120 },
      { field: "TestJobReceiveTime", headerName: "TestJobReceiveTime", width: 120 },
      { field: "TestUser", headerName: "TestUser", width: 120 },
      { field: "TestCompeteTime", headerName: "TestCompeteTime", width: 120 },
      { field: "IsRecheck", headerName: "IsRecheck", width: 120 },
      { field: "CPrintCode", headerName: "CPrintCode", width: 120 },
      { field: "CProc", headerName: "CProc", width: 120 },
      { field: "CMachine", headerName: "CMachine", width: 120 },
      { field: "CStrandNo", headerName: "CStrandNo", width: 120 },
      { field: "CPlanId", headerName: "CPlanId", width: 120 },
      { field: "CConNo", headerName: "CConNo", width: 120 },
      { field: "CMatCode", headerName: "CMatCode", width: 120 },
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
function onDisposal() { toast("画面迁移：处置逻辑待接入", 2000, "warn"); }
function onDecide() { toast("画面迁移：综判逻辑待接入", 2000, "warn"); }
function onCancelDecide() { toast("画面迁移：取消综判逻辑待接入", 2000, "warn"); }
function onSyncComponent() { toast("画面迁移：同步成分逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：5个按钮，无查询条件 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDisposal">
        <IconSend class="h-3 w-3" />处置
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDecide">
        <IconCheck class="h-3 w-3" />综判
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onCancelDecide">
        <IconX class="h-3 w-3" />取消综判
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onSyncComponent">
        <IconRefresh class="h-3 w-3" />同步成分
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">库内材料质量处置（{{ rows.length }}）</span>
    </div>

    <!-- 左右主子表：左=材料列表，右=处置详情 -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <SplitterPanel :size="55" :minSize="35" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">材料列表</span>
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

      <SplitterPanel :minSize="25" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">处置详情</span>
        </div>
        <div class="flex min-h-0 flex-1 items-center justify-center bg-muted/30">
          <p class="text-xs text-muted-foreground">选择左侧材料查看处置详情</p>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
