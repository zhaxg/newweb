<script setup lang="ts">
/** 对应 FrmTqmtp01（产品规范维护）：DDH.Winforms.SQM.Forms.Tqmtp.FrmTqmtp01
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconCheck, IconPencil, IconPlus, IconSearch, IconTrash, IconX } from "@tabler/icons-vue";
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
  psc: "",
  sgStd: "",
  sgSign: "",
  prodClass: "",
  factoryId: "",
});

// 列按 Designer.cs 排序（部分列）
const colDefs: ColDef[] = [
      { field: "CPsc", headerName: "CPsc", width: 120 },
      { field: "CProdCode", headerName: "CProdCode", width: 120 },
      { field: "CMsc", headerName: "CMsc", width: 120 },
      { field: "CProdCName", headerName: "CProdCName", width: 120 },
      { field: "CPscDesc", headerName: "CPscDesc", width: 120 },
      { field: "CStdSgCode", headerName: "CStdSgCode", width: 120 },
      { field: "CFinalUse1", headerName: "CFinalUse1", width: 120 },
      { field: "CSgStd", headerName: "CSgStd", width: 120 },
      { field: "CFinCustCode", headerName: "CFinCustCode", width: 120 },
      { field: "CSgSign", headerName: "CSgSign", width: 120 },
      { field: "CApnDesc", headerName: "CApnDesc", width: 120 },
      { field: "CLevel", headerName: "CLevel", width: 120 },
      { field: "CFinUserName", headerName: "CFinUserName", width: 120 },
      { field: "CProcessPurposeCode", headerName: "CProcessPurposeCode", width: 120 },
      { field: "CRemark", headerName: "CRemark", width: 120 },
      { field: "CProcessPurposeDesc", headerName: "CProcessPurposeDesc", width: 120 },
      { field: "CClientEvaluateCode", headerName: "CClientEvaluateCode", width: 120 },
      { field: "CHeatAndTypeCode", headerName: "CHeatAndTypeCode", width: 120 },
      { field: "CProcUseDesc", headerName: "CProcUseDesc", width: 120 },
      { field: "CHeatAndTypeDesc", headerName: "CHeatAndTypeDesc", width: 120 },
      { field: "CSpecialUsagec", headerName: "CSpecialUsagec", width: 120 },
      { field: "CSurfaceStatus", headerName: "CSurfaceStatus", width: 120 },
      { field: "DTcTranOkTime", headerName: "DTcTranOkTime", width: 120 },
      { field: "CSurfaceStatusDesc", headerName: "CSurfaceStatusDesc", width: 120 },
      { field: "CValidFlag", headerName: "CValidFlag", width: 120 },
      { field: "CTolPrecGroup", headerName: "CTolPrecGroup", width: 120 },
      { field: "CCheckMaker", headerName: "CCheckMaker", width: 120 },
      { field: "CTolPrecGroupDesc", headerName: "CTolPrecGroupDesc", width: 120 },
      { field: "DCheckTime", headerName: "DCheckTime", width: 120 },
      { field: "CBendGroup", headerName: "CBendGroup", width: 120 },
      { field: "NVersion", headerName: "NVersion", width: 120 },
      { field: "CBendGroupDesc", headerName: "CBendGroupDesc", width: 120 },
      { field: "CArchiveFlag", headerName: "CArchiveFlag", width: 120 },
      { field: "CFactoryId", headerName: "CFactoryId", width: 120 },
      { field: "CRemarkDesc", headerName: "CRemarkDesc", width: 120 },
      { field: "CProdAuth", headerName: "CProdAuth", width: 120 },
      { field: "CCertiTypeCode", headerName: "CCertiTypeCode", width: 120 },
      { field: "NCertiNum", headerName: "NCertiNum", width: 120 },
      { field: "CNewProductCode", headerName: "CNewProductCode", width: 120 },
      { field: "DChangeProductDate", headerName: "DChangeProductDate", width: 120 },
      { field: "CDelivyStatusCode", headerName: "CDelivyStatusCode", width: 120 },
      { field: "CDeliveryStateDesc", headerName: "CDeliveryStateDesc", width: 120 },
      { field: "CProdClass", headerName: "CProdClass", width: 120 },
      { field: "CProdClassText", headerName: "CProdClassText", width: 120 },
      { field: "Selected", headerName: "Selected", width: 120 },
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
function onAdd() { toast("画面迁移：添加逻辑待接入", 2000, "warn"); }
function onEdit() { toast("画面迁移：编辑逻辑待接入", 2000, "warn"); }
function onDelete() { toast("画面迁移：删除逻辑待接入", 2000, "warn"); }
function onValid() { toast("画面迁移：审核生效逻辑待接入", 2000, "warn"); }
function onInvalid() { toast("画面迁移：禁用逻辑待接入", 2000, "warn"); }
function onCancel() { toast("画面迁移：取消逻辑待接入", 2000, "warn"); }
function onOk() { toast("画面迁移：选择逻辑待接入", 2000, "warn"); }
function onAddMsc() { toast("画面迁移：添加冶金规范逻辑待接入", 2000, "warn"); }
function onDeleteMsc() { toast("画面迁移：删除冶金规范逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：5个条件 → 6列 grid -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产品规范码</label>
          <InputText v-model="input.psc" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">标准</label>
          <InputText v-model="input.sgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种牌号</label>
          <InputText v-model="input.sgSign" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产品大类</label>
          <InputText v-model="input.prodClass" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">工厂</label>
          <InputText v-model="input.factoryId" class="min-w-0 flex-1" />
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
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onValid">
        <IconCheck class="h-3 w-3" />审核生效
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onInvalid">
        <IconX class="h-3 w-3" />禁用
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAddMsc">
        <IconPlus class="h-3 w-3" />添加规范
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDeleteMsc">
        <IconTrash class="h-3 w-3" />删除规范
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onCancel">
        <IconX class="h-3 w-3" />取消
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onOk">
        <IconCheck class="h-3 w-3" />选择
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">产品规范维护（{{ rows.length }}）</span>
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
