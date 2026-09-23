<script setup lang="ts">
/** 对应 FrmYD1050（库管科人员名单）：DDH.Winforms.SYD.Forms.FrmYD1050
 *  已接入：tyd1050Api.getListAsync（查询，swagger 补整个 Api）/ deleteAsync（删除，文案照抄
 *          「确定删除 {姓名} - {工号} 吗？」→ 成功「人员 {姓名} 删除成功」）
 *          班组列（CTeam）字典按原 RepositoryItem：甲=A / 乙=B / 丙=C，valueFormatter 翻译
 *  待接入：添加/编辑 → FrmYD1050_Edit（二级弹窗，按 skill 默认占位；addAsync/updateAsync 已补进 swagger 待弹窗接入）
 *  布局：工具栏一行(关键字+查询/添加/编辑/删除) → 单表(Tyd1050 8可见 + 2 hide) */
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tyd1050Api, type Tyd1050 } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* 班组字典（原 Load 里 RepositoryItem：显示「甲/乙/丙」值 A/B/C） */
const TEAM_LABELS: Record<string, string> = { A: "甲", B: "乙", C: "丙" };
const teamFmt = (p: ValueFormatterParams) => TEAM_LABELS[String(p.value ?? "")] ?? String(p.value ?? "");

const colDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cCode", headerName: "序号", width: 110 },
  { field: "cName", headerName: "姓名", width: 140 },
  { field: "cEmployeeId", headerName: "晟源鸿工号", width: 150 },
  { field: "cTeam", headerName: "班组", width: 100, valueFormatter: teamFmt },
  { field: "creator", headerName: "创建人", width: 110 },
  { field: "createTime", headerName: "创建时间", width: 170 },
  { field: "lastModifier", headerName: "最后修改人", width: 120 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 170, flex: 1 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
]);

const keyword = ref("");
const rows = ref<Tyd1050[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

function focus(): Tyd1050 | null {
  return (api.value?.getSelectedNodes()[0]?.data as Tyd1050 | undefined) ?? null;
}

/* LoadDataAsync → GetListAsync({ Key }) */
async function onQuery() {
  querying.value = true;
  try {
    const list = ((await tyd1050Api.getListAsync({ key: keyword.value.trim() || null })) ?? []) as Tyd1050[];
    rows.value = list;
    api.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnAdd → FrmYD1050_Edit（二级弹窗，占位） */
function onAdd() {
  toast("新增人员弹窗（FrmYD1050_Edit）待接入", 2500, "warn");
}

/* btnEdit → FrmYD1050_Edit(selected)（二级弹窗，占位） */
function onEdit() {
  if (!focus()) {
    toast("请先选择要编辑的记录", 2000, "warn");
    return;
  }
  toast("编辑人员弹窗（FrmYD1050_Edit）待接入", 2500, "warn");
}

/* btnDelete → DeleteAsync(id) */
async function onDelete() {
  const row = focus();
  if (!row) {
    toast("请先选择要删除的人员信息", 2000, "warn");
    return;
  }
  if (!window.confirm(`确定删除 ${row.cName} - ${row.cEmployeeId} 吗？`)) return;
  querying.value = true;
  try {
    await tyd1050Api.deleteAsync(row.id ?? undefined);
    toast(`人员 ${row.cName} 删除成功`, 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：关键字 + 查询/添加/编辑/删除） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">关键字</label>
      <InputText v-model="keyword" class="w-56 shrink-0" @keydown.enter="onQuery" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">人员（{{ rows.length }}）</span>
    </div>

    <!-- 单表（原 gridControl1 Dock.Fill） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="colDefs"
        :default-col-def="hmxDefaultColDef" :row-data="rows" :locale-text="AG_GRID_LOCALE_CN"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :pagination="false" :animate-rows="false" :loading="querying"
        @grid-ready="onReady" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
