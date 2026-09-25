<script setup lang="ts">
/** 对应 FrmTsMatrl（物料查询）：DDH.Winforms.SMP.Forms.FrmTsMatrl
 *  已接入：tsMatrlApi.queryMatrl（查询）/ syncMatrl（同步物料，完成提示「同步完成！」）
 *  待接入：无（NStatus 状态列已按 Designer Caption 迁入） */

import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconRefresh, IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tsMatrlApi } from "@/api/mes4ddh/smp.swagger";
import type { TsMatrl } from "@/api/mes4ddh/smp.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<TsMatrl[]>([]);
const querying = ref(false);
const syncing = ref(false);
const gridApi = ref<GridApi | null>(null);

const txtCMatCode = ref(""); // 物料编码（原 txtCMatCode）
const txtCMatName = ref(""); // 物料名称（原 txtCMatName）

// gvMatrl 15 列（VisibleIndex 0-14，列头按 TsMatrl 实体 [LDisplay]；NStatus 列头为 Designer Caption）
const colDefs: ColDef[] = [
  { field: "cMatCode", headerName: "物料编码", width: 149 },
  { field: "cMatName", headerName: "物料名称", width: 149 },
  { field: "cMatGroupCode", headerName: "物料组编码", width: 149 },
  { field: "cMatGroupName", headerName: "物料组名称", width: 149 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "cSpec", headerName: "规格", width: 140 },
  { field: "nThick", headerName: "厚度", width: 80 },
  { field: "nWidth", headerName: "宽度", width: 80 },
  { field: "nLen", headerName: "长度", width: 80 },
  { field: "nWeight", headerName: "理重", width: 80 },
  { field: "nStatus", headerName: "状态", width: 70 },
  { field: "creator", headerName: "创建人", width: 112 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "lastModifier", headerName: "最后修改人", width: 112 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/** 原 BindData：QueryMatrl(CMatCode, CMatName) */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tsMatrlApi.queryMatrl({ cMatCode: txtCMatCode.value, cMatName: txtCMatName.value })) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 btnSync_Click：SyncMatrl() → MessageBox「同步完成！」 */
async function onSync() {
  syncing.value = true;
  try {
    await tsMatrlApi.syncMatrl();
    toast("同步完成！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    syncing.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1 单行）：物料编码/物料名称 + 查询/同步物料 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="txtCMatCode" placeholder="物料编码" class="w-40 shrink-0" />
      <InputText v-model="txtCMatName" placeholder="物料名称" class="w-40 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="syncing" @click="onSync">
        <IconRefresh class="h-3 w-3" />同步物料
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">物料查询（{{ rows.length }}）</span>
    </div>
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
