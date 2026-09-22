<script setup lang="ts">
/** 对应 FrmTqmtm01（冶金规范）：DDH.Winforms.SQM.Forms.Tqmtm.FrmTqmtm01
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconCheck, IconCopy, IconEye, IconPencil, IconPlus, IconSearch, IconTrash, IconX } from "@tabler/icons-vue";
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
  status: "",
  steelType: "",
  testItemStd: "",
  mscBasic: "",
  lineCode: "",
  procCode: "",
  mscCode: "",
});

// 列按 Designer.cs 排序（Data.* 嵌套字段）
const colDefs: ColDef[] = [
      { field: "DisplayTxt", headerName: "节点", width: 120 },
      { field: "Data.CMsc", headerName: "Data.CMsc", width: 120 },
      { field: "Data.CMscLineNo", headerName: "Data.CMscLineNo", width: 120 },
      { field: "Data.CBasicTableTypeCode", headerName: "基表类型", width: 120 },
      { field: "Data.CMscDesc", headerName: "Data.CMscDesc", width: 77 },
      { field: "Data.CValidFlag", headerName: "Data.CValidFlag", width: 120 },
      { field: "Data.CWholeBacklog", headerName: "Data.CWholeBacklog", width: 120 },
      { field: "Data.NWholeBacklogSeq", headerName: "Data.NWholeBacklogSeq", width: 120 },
      { field: "Data.CIdxNo", headerName: "Data.CIdxNo", width: 120 },
      { field: "Data.CProdClassCode", headerName: "产品大类", width: 120 },
      { field: "Data.CWholeBacklogDesc", headerName: "Data.CWholeBacklogDesc", width: 120 },
      { field: "Data.CWholeBacklogCode", headerName: "全程工序", width: 120 },
      { field: "Data.CProdCode", headerName: "品名", width: 120 },
      { field: "Data.CStNo2", headerName: "Data.CStNo2", width: 120 },
      { field: "Data.CWholeBacklogName", headerName: "Data.CWholeBacklogName", width: 120 },
      { field: "Data.CBasicTableCode", headerName: "Data.CBasicTableCode", width: 120 },
      { field: "Data.CSteelType", headerName: "Data.CSteelType", width: 120 },
      { field: "Data.CStNo3", headerName: "Data.CStNo3", width: 120 },
      { field: "Data.CRemark", headerName: "Data.CRemark", width: 120 },
      { field: "Data.CBasicTableEName", headerName: "Data.CBasicTableEName", width: 120 },
      { field: "Data.CSgStd", headerName: "Data.CSgStd", width: 73 },
      { field: "Data.CreateTime", headerName: "Data.CreateTime", width: 120 },
      { field: "Data.CBasicTableCName", headerName: "Data.CBasicTableCName", width: 120 },
      { field: "Data.CSgSign", headerName: "Data.CSgSign", width: 73 },
      { field: "Data.Creator", headerName: "Data.Creator", width: 120 },
      { field: "Data.LastModifyTime", headerName: "Data.LastModifyTime", width: 120 },
      { field: "Data.CItemMustFlag", headerName: "Data.CItemMustFlag", width: 120 },
      { field: "Data.CStdSgCode", headerName: "Data.CStdSgCode", width: 92 },
      { field: "Data.LastModifier", headerName: "Data.LastModifier", width: 120 },
      { field: "Data.CDelivyStatusCode", headerName: "Data.CDelivyStatusCode", width: 120 },
      { field: "Data.CCustStdCode", headerName: "Data.CCustStdCode", width: 120 },
      { field: "Data.CDefaultFlag", headerName: "Data.CDefaultFlag", width: 120 },
      { field: "Data.NVersion", headerName: "Data.NVersion", width: 72 },
      { field: "Data.CHoldFlag", headerName: "Data.CHoldFlag", width: 120 },
      { field: "Data.CFactoryId", headerName: "Data.CFactoryId", width: 120 },
      { field: "Data.CAccuGradeCode", headerName: "Data.CAccuGradeCode", width: 120 },
      { field: "Data.CMscSrc", headerName: "Data.CMscSrc", width: 72 },
      { field: "Data.CCheckMaker", headerName: "Data.CCheckMaker", width: 120 },
      { field: "Data.DCheckTime", headerName: "Data.DCheckTime", width: 120 },
      { field: "IdxRefObj", headerName: "IdxRefObj", width: 120 },
      { field: "Data.Id", headerName: "Data.Id", width: 120 },
      { field: "Data.CArchiveFlag", headerName: "Data.CArchiveFlag", width: 120 },
      { field: "Data.CArchiveStampNo", headerName: "Data.CArchiveStampNo", width: 120 },
      { field: "Data.CCompanyCode", headerName: "Data.CCompanyCode", width: 120 },
      { field: "Data.CCompanyName", headerName: "Data.CCompanyName", width: 120 },
      { field: "Data.CBasicTableType", headerName: "Data.CBasicTableType", width: 120 },
      { field: "Data.CWholeBacklogSeq", headerName: "Data.CWholeBacklogSeq", width: 120 },
      { field: "Data.CNeedJudgeFlag", headerName: "Data.CNeedJudgeFlag", width: 120 },
      { field: "Data.CStdDb", headerName: "Data.CStdDb", width: 120 },
      { field: "Data.CTqmtm100Id", headerName: "Data.CTqmtm100Id", width: 120 },
      { field: "Data.CTqmtm101Id", headerName: "Data.CTqmtm101Id", width: 120 },
      { field: "Data.CTqmtm102Id", headerName: "Data.CTqmtm102Id", width: 120 },
      { field: "Data.NSeq1", headerName: "Data.NSeq1", width: 120 },
      { field: "Data.NSeq2", headerName: "Data.NSeq2", width: 120 },
      { field: "Data.CSearchIdx", headerName: "Data.CSearchIdx", width: 120 },
      { field: "Data.Selected", headerName: "Data.Selected", width: 120 },
      { field: "Data.CProdClassDesc", headerName: "Data.CProdClassDesc", width: 120 },
      { field: "Data.CProdCName", headerName: "Data.CProdCName", width: 120 },
      { field: "Data.NWholeBacklogNo", headerName: "Data.NWholeBacklogNo", width: 120 },
      { field: "Data.CStNo", headerName: "Data.CStNo", width: 120 },
      { field: "Data.CStNo1", headerName: "Data.CStNo1", width: 120 },
      { field: "Data.CStNo4", headerName: "Data.CStNo4", width: 120 },
      { field: "Data.CStNo5", headerName: "Data.CStNo5", width: 120 },
      { field: "Data.CStNo6", headerName: "Data.CStNo6", width: 120 },
      { field: "Data.CStNo7", headerName: "Data.CStNo7", width: 120 },
      { field: "Data.CStNo8", headerName: "Data.CStNo8", width: 120 },
      { field: "Data.CStNo9", headerName: "Data.CStNo9", width: 120 },
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
function onCopy() { toast("画面迁移：复制逻辑待接入", 2000, "warn"); }
function onPreview() { toast("画面迁移：预览逻辑待接入", 2000, "warn"); }
function onEnable() { toast("画面迁移：生效逻辑待接入", 2000, "warn"); }
function onDisable() { toast("画面迁移：禁用逻辑待接入", 2000, "warn"); }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：7个条件 → 4列 grid（2行） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-4 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">表格验证状态</label>
          <InputText v-model="input.status" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">标准钢种</label>
          <InputText v-model="input.steelType" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">试验项目标准</label>
          <InputText v-model="input.testItemStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">冶金规范基本信息</label>
          <InputText v-model="input.mscBasic" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <InputText v-model="input.lineCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">工序</label>
          <InputText v-model="input.procCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">冶金规范码</label>
          <InputText v-model="input.mscCode" class="min-w-0 flex-1" />
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
      <Button text class="shrink-0 whitespace-nowrap" @click="onCopy">
        <IconCopy class="h-3 w-3" />复制
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onPreview">
        <IconEye class="h-3 w-3" />预览
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEnable">
        <IconCheck class="h-3 w-3" />生效
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDisable">
        <IconX class="h-3 w-3" />禁用
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">冶金规范（{{ rows.length }}）</span>
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
