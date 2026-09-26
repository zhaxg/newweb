<script setup lang="ts">
/** 对应 FrmHRSamp（检验打印）：DDH.Winforms.SHR.Forms.FrmHRSamp
 *  已接入：btnQuery_Click / BindData → thrSampApi.queryLog(关键字)
 *          btnSave_Click → 确认后 thrSampApi.addLog(thrSamp) → BindData（重查 + 重新生成主键）
 *  待接入：打印预览（原 XtraReportPrinter.PrintPreview(ThrSampPrint, 报表模板
 *          aa910d9c97c949ddb3ca880eeed662cf)）——web 侧无报表打印能力，暂以提示占位
 *  偏差：原 MsgBox.ShowYesNo 改为受控 Dialog（文案逐字保留）；原 gridView1.BestFitColumns()
 *  以 autoSizeAllColumns 等效；原 WaitDialog 遮罩以按钮 loading 等效 */

import { reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import { IconCheck, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { NextStrId } from "@/lib/yitIdHelper";
import { useToast } from "@/composables/useToast";
import { thrSampApi, type ThrSamp } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 查询条件（textEdit1，原 Load 不自动查询） ---------- */
const key = ref("");

/* ---------- 录入表单（thrSampBindingSource1 → thrSamp，主键原 YitIdHelper.NextStrId） ---------- */
const samp = reactive({
  id: NextStrId(),
  cBatchNo: "",
  cSgCode: "",
  cStove: "",
  nThick: 0 as number | null,
});

/* ---------- 表格（gridView1 / ThrSamp） ---------- */
const rows = shallowRef<ThrSamp[]>([]);
const loading = ref(false);
const saving = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

const colDefs: ColDef[] = [
  { colId: "creator", field: "creator", headerName: "创建人", width: 150 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 150, hide: true },
];

/* ---------- btnQuery_Click ---------- */
async function query() {
  loading.value = true;
  try {
    rows.value = (await thrSampApi.queryLog(key.value)) ?? [];
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* ---------- BindData（保存后重查 + 换新主键，其余录入值保留，同原逻辑） ---------- */
async function bindData() {
  rows.value = (await thrSampApi.queryLog(key.value)) ?? [];
  requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  samp.id = NextStrId();
}

/* ---------- btnSave_Click ---------- */
const confirmOpen = ref(false);
function askPrint() {
  confirmOpen.value = true;
}
async function btnSave() {
  confirmOpen.value = false;
  /* 原：构造 ThrSampPrint { Samp = thrSamp } 后 printer.PrintPreview(print, 模板号) */
  toast("打印预览待接入（原报表模板 aa910d9c97c949ddb3ca880eeed662cf）", 2500, "warn");
  saving.value = true;
  try {
    await thrSampApi.addLog({
      id: samp.id,
      cBatchNo: samp.cBatchNo,
      cSgCode: samp.cSgCode,
      cStove: samp.cStove,
      nThick: samp.nThick ?? 0,
    });
    await bindData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="key" placeholder="关键字" class="w-44 shrink-0" @keydown.enter="query" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
      <InputText v-model="samp.cBatchNo" class="w-32 shrink-0" />
      <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
      <InputText v-model="samp.cSgCode" class="w-32 shrink-0" />
      <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
      <InputText v-model="samp.cStove" class="w-32 shrink-0" />
      <label class="w-16 shrink-0 text-xs text-muted-foreground">厚度</label>
      <div class="w-24 shrink-0">
        <InputNumber v-model="samp.nThick" :min="0" :show-buttons="false" :use-grouping="false" fluid />
      </div>
    </div>
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="askPrint">
        <IconCheck class="h-3 w-3" />保存
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 原 MsgBox.ShowYesNo("是否确认打印填写的信息？") -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(28rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">是否确认打印填写的信息？</p>
      <template #footer>
        <Button label="否" variant="outlined" @click="confirmOpen = false" />
        <Button label="是" variant="outlined" autofocus @click="btnSave" />
      </template>
    </Dialog>
  </div>
</template>
