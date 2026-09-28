<script setup lang="ts">
/** 对应 FrmTqmts0x（炼钢工艺卡）：DDH.Winforms.SQM.Forms.Tqmts.FrmTqmts0x
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
  factoryId: "",
  stNo: "",
  sgStd: "",
  sgSign: "",
  prodClass: "",
});

// 列由配置动态加载，此处为占位列
const colDefs: ColDef[] = [
  { field: "CStNo", headerName: "炼钢工艺号", width: 130 },
  { field: "CFacCode", headerName: "厂别区分", width: 90 },
  { field: "CSgStd", headerName: "执行标准", width: 120 },
  { field: "CSgSign", headerName: "钢种牌号", width: 100 },
  { field: "CProdClass", headerName: "产品大类", width: 100 },
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
function onAdd() {
  toast("画面迁移：添加逻辑待接入", 2000, "warn");
}
function onEdit() {
  toast("画面迁移：编辑逻辑待接入", 2000, "warn");
}
function onDelete() {
  toast("画面迁移：删除逻辑待接入", 2000, "warn");
}
function onPreview() {
  toast("画面迁移：预览逻辑待接入", 2000, "warn");
}
function onCopy() {
  toast("画面迁移：复制逻辑待接入", 2000, "warn");
}
function onEnable() {
  toast("画面迁移：生效逻辑待接入", 2000, "warn");
}
function onDisable() {
  toast("画面迁移：禁用逻辑待接入", 2000, "warn");
}
function onCancel() {
  toast("画面迁移：取消逻辑待接入", 2000, "warn");
}
function onOk() {
  toast("画面迁移：选择逻辑待接入", 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：5个条件 → 6列 grid -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">厂别区分</label>
          <InputText v-model="input.factoryId" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">炼钢工艺号</label>
          <InputText v-model="input.stNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
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
      </div>
    </div>

    <!-- 操作工具栏 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd"> <IconPlus class="h-3 w-3" />添加 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit"> <IconPencil class="h-3 w-3" />编辑 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onPreview"> <IconEye class="h-3 w-3" />预览 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCopy"> <IconCopy class="h-3 w-3" />复制 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEnable"> <IconCheck class="h-3 w-3" />生效 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDisable">
        <IconX class="h-3 w-3" />禁用
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onCancel"> <IconX class="h-3 w-3" />取消 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onOk"> <IconCheck class="h-3 w-3" />选择 </Button>
      <span class="ml-auto text-xs text-muted-foreground">炼钢工艺卡（{{ rows.length }}）</span>
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
