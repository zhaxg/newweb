<script setup lang="ts">
/** 对应 FrmRoleList（角色管理）：HmxWinForms.Forms.Admin.FrmRoleList
 *  已接入：adminApi.getRoleList / adminApi.checkBeforeRemoveRole / crudAppService.SaveList("HmxRole")
 *  本页面同时是「查询 + 行内编辑 + 增删 + TrackableList 保存」的迁移模板 */

import { nextTick, onMounted, ref, shallowRef } from "vue";
import { IconDeviceFloppy, IconPlus, IconSearch, IconShieldCheck, IconTrash, IconUsers } from "@tabler/icons-vue";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { CellValueChangedEvent, ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";

import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import RolePermissionDialog from "./RolePermissionDialog.vue";
import RoleUserDialog from "./RoleUserDialog.vue";
import { adminApi } from "@/api/admin/request";
import { crudAppService } from "@/api/common/crudAppService";
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";
import type { HmxRole } from "@/api/admin/types";

const { toast } = useToast();
const theme = makeHmxGridTheme();

// 行内编辑数据源：TrackableList 记录快照，SaveList 据此算出增/改/删（与 hmx_web 一致）
const trackList = shallowRef<TrackableList<HmxRole>>(new TrackableList<HmxRole>());
const keyword = ref("");
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

async function query() {
  try {
    const rows = (await adminApi.getRoleList(keyword.value.trim() || undefined)) ?? [];
    trackList.value = new TrackableList<HmxRole>(rows);
    selectedId.value = null;
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(query);

function currentRow(): HmxRole | null {
  return trackList.value.find((r) => r.id === selectedId.value) ?? null;
}

function getRowId(p: GetRowIdParams) {
  return String((p.data as HmxRole).id);
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
    gridApi.value.getRowNode(String(id))?.setSelected(true);
  });
}

function onCellValueChanged(e: CellValueChangedEvent) {
  gridApi.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}

function onAdd() {
  const draft: HmxRole = {
    id: NextStrId(),
    cRoleName: `角色${Math.floor(Math.random() * 10000)}`,
    cDescription: "",
    cState: "1",
    selected: false,
    creator: "",
    createTime: "",
    lastModifier: "",
    lastModifyTime: "",
  };
  trackList.value.push(draft);
  const stored = trackList.value[trackList.value.length - 1] as HmxRole;
  gridApi.value?.applyTransaction({ add: [stored] });
  selectedId.value = stored.id ?? null;
  syncGridSelection();
}

function onDelete() {
  const row = currentRow();
  if (!row) {
    toast("当前没有可删除的角色！", 2000, "warn");
    return;
  }
  adminApi
    .checkBeforeRemoveRole(row.id)
    .then(() => {
      confirmTarget.value = row;
      confirmOpen.value = true;
    })
    .catch(() => {
      /* 拦截层已 toast（如角色尚有成员） */
    });
}

function confirmDelete() {
  const target = confirmTarget.value;
  if (!target) return;
  trackList.value.remove((r) => r.id === target.id);
  gridApi.value?.applyTransaction({ remove: [target] });
  if (selectedId.value === target.id) selectedId.value = null;
  confirmOpen.value = false;
  confirmTarget.value = null;
  toast("已从列表移除，点击「保存」后生效", 2000, "info");
}

function onSave() {
  crudAppService
    .SaveList(trackList.value, "HmxRole")
    .then(() => {
      gridApi.value?.refreshCells({ force: true });
      toast("保存成功！", 2000, "success");
    })
    .catch(() => {
      /* 拦截层已 toast */
    });
}

function requireSelection(): HmxRole | null {
  const row = currentRow();
  if (!row) {
    toast("请先选择一个角色", 2000, "warn");
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
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEditUsers">
        <IconUsers class="h-3 w-3" />编辑用户
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEditPerms">
        <IconShieldCheck class="h-3 w-3" />菜单与功能权限
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">角色维护（{{ trackList.length }}）</span>
    </div>

    <!-- 角色信息：ag-grid 行内编辑（双击或 F2 进入编辑，回车/失焦提交） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :row-data="trackList" :get-row-id="getRowId" :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN" @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged" @cell-value-changed="onCellValueChanged"
        @first-data-rendered="autoSizeOnFirstData" />
    </div>

    <!-- 删除确认（对应原 MsgBox.ShowYesNo("是否确定删除角色「xxx」？")） -->
    <Dialog :visible="confirmOpen" modal header="删除确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs">是否确定删除角色「{{ confirmTarget?.cRoleName }}」？</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="删除" severity="danger" variant="outlined" @click="confirmDelete" />
      </template>
    </Dialog>

    <RoleUserDialog v-model:open="userOpen" :role="dialogRole" />
    <RolePermissionDialog v-model:open="permOpen" :role="dialogRole" />
  </div>
</template>
