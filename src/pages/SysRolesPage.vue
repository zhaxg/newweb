<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { Plus, Save, Search, ShieldCheck, Trash2, Users } from "@lucide/vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { ensureAgGrid, erpDefaultColDef, makeErpGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import RolePermissionDialog from "./RolePermissionDialog.vue";
import RoleUserDialog from "./RoleUserDialog.vue";
import { formatNow, loadRoles, newRoleId, saveRoles, type HmxRole } from "@/data/roles";

ensureAgGrid();

const { toast } = useToast();

const theme = makeErpGridTheme();

const rows = ref<HmxRole[]>([]);
const keyword = ref("");
const appliedKeyword = ref("");
const selectedId = ref<string | null>(null);
const gridApi = ref<GridApi | null>(null);

const confirmOpen = ref(false);
const confirmTarget = ref<HmxRole | null>(null);

const dialogRole = ref<HmxRole | null>(null);
const userOpen = ref(false);
const permOpen = ref(false);

const columnDefs: ColDef[] = [
  { colId: "cRoleName", field: "cRoleName", headerName: "角色名称", width: 200, editable: true, sortable: false },
  { colId: "cDescription", field: "cDescription", headerName: "角色描述", width: 220, editable: true, sortable: false },
  { colId: "creator", field: "creator", headerName: "创建人", width: 80 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 130 },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 90 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后更新时间", width: 130 },
  { colId: "cState", field: "cState", headerName: "状态", width: 70, valueFormatter: (p) => stateText(p.data as HmxRole) },
];

const displayed = computed(() => {
  const kw = appliedKeyword.value.trim().toLowerCase();
  if (!kw) return rows.value;
  return rows.value.filter((r) => (r.cRoleName ?? "").toLowerCase().includes(kw) || (r.cDescription ?? "").toLowerCase().includes(kw));
});

function query() {
  rows.value = loadRoles();
  appliedKeyword.value = keyword.value;
  selectedId.value = null;
}

onMounted(query);

function currentRow(): HmxRole | null {
  return rows.value.find((r) => r.id === selectedId.value) ?? null;
}

function getRowId(p: GetRowIdParams) {
  return (p.data as HmxRole).id;
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as HmxRole | undefined;
  selectedId.value = row?.id ?? null;
}

function syncGridSelection() {
  const id = selectedId.value;
  nextTick(() => {
    if (!gridApi.value || !id) return;
    gridApi.value.getRowNode(id)?.setSelected(true);
  });
}

/** 编辑提交：可编辑列禁用内部排序，行对象引用即源数据，直接回写 */
function onCellValueChanged(e: CellValueChangedEvent) {
  const row = e.data as HmxRole | undefined;
  if (!row) return;
  row.lastModifier = "admin";
  row.lastModifyTime = formatNow();
  gridApi.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}

/** 添加：直接在表尾追加可编辑新行（对应原 gridView.AppendNewRow） */
function onAdd() {
  const row: HmxRole = {
    id: newRoleId(),
    cRoleName: "",
    cDescription: "",
    creator: "admin",
    createTime: formatNow(),
    lastModifier: "",
    lastModifyTime: "",
    cState: "1",
  };
  rows.value = [...rows.value, row];
  selectedId.value = row.id;
  syncGridSelection();
}

function onDelete() {
  const row = currentRow();
  if (!row) {
    toast("当前没有可删除的角色！");
    return;
  }
  confirmTarget.value = row;
  confirmOpen.value = true;
}

function confirmDelete() {
  const target = confirmTarget.value;
  if (!target) return;
  rows.value = rows.value.filter((r) => r.id !== target.id);
  saveRoles(rows.value);
  if (selectedId.value === target.id) selectedId.value = null;
  confirmOpen.value = false;
  confirmTarget.value = null;
  toast("删除成功");
}

/** 保存：校验角色名称重复后整表落库（对应原 simpleButtonSave_Click） */
function onSave() {
  const count = new Map<string, number>();
  for (const r of rows.value) {
    const name = (r.cRoleName ?? "").trim();
    if (!name) continue;
    count.set(name, (count.get(name) ?? 0) + 1);
  }
  const dup = [...count.entries()].find(([, n]) => n > 1);
  if (dup) {
    toast(`角色名称：[${dup[0]}]重复，请检查！`);
    return;
  }
  saveRoles(rows.value);
  toast("保存成功！");
}

function requireSelection(): HmxRole | null {
  const row = currentRow();
  if (!row) {
    toast("请先选择一个角色");
    return null;
  }
  return row;
}

function onEditUsers() {
  const row = requireSelection();
  if (!row) return;
  dialogRole.value = row;
  userOpen.value = true;
}

function onEditPerms() {
  const row = requireSelection();
  if (!row) return;
  dialogRole.value = row;
  permOpen.value = true;
}

function stateText(row: HmxRole | undefined): string {
  if (!row) return "";
  if (row.cState === "1") return "正常";
  if (row.cState === "0") return "禁用";
  return "";
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（对应原 FrmRoleList stackPanel：查询/添加/删除/保存/编辑用户/菜单与功能权限） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" maxlength="100" placeholder="关键字" autocapitalize="off" spellcheck="false"
        class="w-48 shrink-0" @keydown.enter="query" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="query" label="查询">
        <template #icon>
          <Search class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAdd" label="添加">
        <template #icon>
          <Plus class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete" label="删除">
        <template #icon>
          <Trash2 class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onSave" label="保存">
        <template #icon>
          <Save class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onEditUsers" label="编辑用户">
        <template #icon>
          <Users class="h-3.5 w-3.5" />
        </template>
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onEditPerms" label="菜单与功能权限">
        <template #icon>
          <ShieldCheck class="h-3.5 w-3.5" />
        </template>
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">角色维护（{{ rows.length }}）</span>
    </div>

    <!-- 角色信息：ag-grid 行内编辑（双击或 F2 进入编辑，回车/失焦提交） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="erp-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="erpDefaultColDef" :row-data="displayed" :get-row-id="getRowId" :row-selection="'single'"
        :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN" @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged" @cell-value-changed="onCellValueChanged" />
    </div>

    <!-- 删除确认（对应原 MsgBox.ShowYesNo("是否确定删除角色「xxx」？")） -->
    <Dialog :visible="confirmOpen" modal header="删除确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-sm">是否确定删除角色「{{ confirmTarget?.cRoleName }}」？</p>
      <template #footer>
        <Button label="取消" text @click="confirmOpen = false" />
        <Button label="删除" severity="danger" raised @click="confirmDelete" />
      </template>
    </Dialog>

    <RoleUserDialog v-model:open="userOpen" :role="dialogRole" />
    <RolePermissionDialog v-model:open="permOpen" :role="dialogRole" />
  </div>
</template>
