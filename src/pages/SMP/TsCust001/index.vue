<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import InputText from "primevue/inputtext";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";

/** 对应 FrmTsCust001（客户流向）：DDH.Winforms.SMP.Forms.FrmTsCust001
 *  画面迁移，逻辑不迁移到
 *  2026-09-22 已完成精修 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const Root = ref("");
const ItemForCreateTime = ref("");
const ItemForLastModifier = ref("");
const ItemForLastModifyTime = ref("");
const ItemForCCustFlow = ref("");
const ItemForCCustEname = ref("");
const ItemForCInboundNo = ref("");
const ItemForCCustNo = ref("");

const colDefs: ColDef[] = [
  { field: "CCustCode", headerName: "客户编号", width: 120 },
  { field: "CCustName", headerName: "客户名称", width: 120 },
  { field: "CCustEname", headerName: "客户名称", width: 112 },
  { field: "CCustNo", headerName: "客户编码", width: 112 },
  { field: "CInboundNo", headerName: "入库单号", width: 112 },
  { field: "CCustFlow", headerName: "客户流向", width: 112 },
  { field: "CStatus", headerName: "状态", width: 112 },
  { field: "CRemark", headerName: "备注", width: 112 },
  { field: "Creator", headerName: "创建人", width: 112 },
  { field: "CreateTime", headerName: "创建时间", width: 112 },
  { field: "LastModifier", headerName: "最后修改人", width: 112 },
  { field: "LastModifyTime", headerName: "最后修改时间", width: 112 },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onbtnDel() {
  /* TODO: 接入业务逻辑 */
}
function onbtnAdd() {
  /* TODO: 接入业务逻辑 */
}
function onbtnSave() {
  /* TODO: 接入业务逻辑 */
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
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件：≥3 个，grid 最多 3 行；label 统一 text-xs text-muted-foreground -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-4 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">基本信息</label>
          <InputText v-model="Root" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
          <InputText v-model="ItemForCreateTime" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">最后修改人</label>
          <InputText v-model="ItemForLastModifier" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">最后修改时间</label>
          <InputText v-model="ItemForLastModifyTime" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">客户流向</label>
          <InputText v-model="ItemForCCustFlow" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">客户名称</label>
          <InputText v-model="ItemForCCustEname" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
          <InputText v-model="ItemForCInboundNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">客户编码</label>
          <InputText v-model="ItemForCCustNo" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 操作按钮单独一行 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onbtnDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onbtnAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onbtnSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">客户流向（{{ rows.length }}）</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
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
