<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { IconKey, IconPencil, IconPlus, IconSearch, IconShieldCheck, IconTrash } from "@tabler/icons-vue";

import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, ensureAgGrid, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import UserEditDialog from "./UserEditDialog.vue";
import UserRoleEditDialog from "./UserRoleEditDialog.vue";
import { adminApi } from "@/api/admin/request";
import type { HmxUser as ApiUser } from "@/api/admin/types";
import { newUserId, type HmxUser } from "@/data/users";

ensureAgGrid();

const { toast } = useToast();

const theme = makeHmxGridTheme();

const allRows = ref<HmxUser[]>([]);
const keyword = ref("");
const rows = ref<HmxUser[]>([]);
const selectedId = ref<string | null>(null);
const gridApi = ref<GridApi | null>(null);

const editOpen = ref(false);
const editTarget = ref<HmxUser | null>(null);
const editPresetDeptId = ref<string | null>(null);

const roleOpen = ref(false);
const roleUserId = ref("");

const deleteOpen = ref(false);
const deleteTarget = ref<HmxUser | null>(null);

const resetOpen = ref(false);

const columnDefs: ColDef[] = [
  { colId: "id", field: "id", headerName: "登录名", width: 110 },
  { colId: "cUserName", field: "cUserName", headerName: "用户名", width: 90 },
  { colId: "cUserType", field: "cUserType", headerName: "用户类型", width: 90 },
  { colId: "cPhone", field: "cPhone", headerName: "手机", width: 110 },
  { colId: "cSex", field: "cSex", headerName: "性别", width: 60 },
  { colId: "cEmail", field: "cEmail", headerName: "邮件", width: 160 },
  { colId: "cStatus", field: "cStatus", headerName: "状态", width: 70, valueFormatter: (p) => (p.value === "0" ? "禁用" : "正常") },
  { colId: "creator", field: "creator", headerName: "创建人", width: 80 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140 },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 100 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后更新时间", width: 140, flex: 1 },
];

/** 关键字过滤已移到「服务端」（mock adapter 的 getUsers）；本页只负责发起查询 */
const querying = ref(false);

function syncGridSelection() {
  const id = selectedId.value;
  nextTick(() => {
    if (!gridApi.value || !id) return;
    gridApi.value.getRowNode(id)?.setSelected(true);
  });
}

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    // mock「服务端」数据源即本地扩展模型（含 cDeptId 等 UI 字段）；接真实后端时页面模型向后端 DTO 对齐
    allRows.value = (await adminApi.getUsers(keyword.value.trim() || undefined)) as unknown as HmxUser[];
    rows.value = allRows.value;
    selectedId.value = null;
  } catch {
    /* 失败提示已由请求拦截层统一 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(query);

const selectedRow = computed(() => rows.value.find((r) => r.id === selectedId.value) ?? null);

function getRowId(p: GetRowIdParams) {
  return (p.data as HmxUser).id;
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function onSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as HmxUser | undefined;
  selectedId.value = row?.id ?? null;
}

function onRowDoubleClicked(e: { data?: HmxUser }) {
  if (e.data) openEdit(e.data, null);
}

function openEdit(target: HmxUser | null, presetDeptId: string | null) {
  editTarget.value = target;
  editPresetDeptId.value = presetDeptId;
  editOpen.value = true;
}

function requireSelection(): boolean {
  if (!selectedRow.value) {
    toast("请先选择一个用户", 2000, "warn");
    return false;
  }
  return true;
}

function onAdd() {
  openEdit(null, null);
}

function onEdit() {
  if (!requireSelection()) return;
  openEdit(selectedRow.value, null);
}

function onDelete() {
  if (!requireSelection()) return;
  deleteTarget.value = selectedRow.value;
  deleteOpen.value = true;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target) return;
  try {
    await adminApi.deleteUser(target.id);
  } catch {
    return; // 拦截层已 toast，保持列表与确认弹窗原状
  }
  allRows.value = allRows.value.filter((r) => r.id !== target.id);
  rows.value = allRows.value;
  if (selectedId.value === target.id) selectedId.value = null;
  deleteOpen.value = false;
  deleteTarget.value = null;
  syncGridSelection();
  toast("删除成功", 2000, "success");
}

function onResetPwd() {
  if (!requireSelection()) return;
  resetOpen.value = true;
}

async function confirmResetPwd() {
  const target = selectedRow.value;
  if (!target) return;
  let newPwd = "";
  try {
    newPwd = await adminApi.resetPassword(target.id);
  } catch {
    return; // 拦截层已 toast
  }
  resetOpen.value = false;
  toast(`密码已经重置为 ${newPwd || "Abc@123456"} , 请通知用户尽快修改密码！`, 2000, "success");
}

function onRoleEdit() {
  if (!requireSelection()) return;
  roleUserId.value = selectedRow.value!.id;
  roleOpen.value = true;
}

function formatNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function onSaveUser(user: HmxUser) {
  const now = formatNow();
  const editing = editTarget.value;
  const record: HmxUser = editing
    ? { ...user, id: editing.id, creator: editing.creator, createTime: editing.createTime, lastModifier: "admin", lastModifyTime: now }
    : { ...user, id: user.id || newUserId(), creator: "admin", createTime: now, lastModifier: "", lastModifyTime: "" };
  try {
    await adminApi.addOrEditUser(record as unknown as ApiUser);
  } catch {
    return; // 校验/网络失败：拦截层已 toast，编辑弹窗保持可修改
  }
  allRows.value = editing ? allRows.value.map((r) => (r.id === editing.id ? record : r)) : [...allRows.value, record];
  rows.value = allRows.value;
  syncGridSelection();
  editOpen.value = false;
  toast("保存成功", 2000, "success");
}

function onInvalid(message: string) {
  toast(message, 2000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（对应原 FrmUserList 工具栏：查询/添加/编辑/删除/角色维护/重置密码） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="keyword" maxlength="100" placeholder="关键字" autocapitalize="off" spellcheck="false"
        class="w-48 shrink-0" @keydown.enter="query" />
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="query">
        <IconSearch class="h-3.5 w-3.5" />查询
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3.5 w-3.5" />添加
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3.5 w-3.5" />编辑
      </Button>
      <Button text size="small" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3.5 w-3.5" />删除
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onRoleEdit">
        <IconShieldCheck class="h-3.5 w-3.5" />角色维护
      </Button>
      <Button text size="small" class="shrink-0 whitespace-nowrap" @click="onResetPwd">
        <IconKey class="h-3.5 w-3.5" />重置密码
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">用户维护（{{ rows.length }}）</span>
    </div>

    <!-- 表格：ag-grid（单选行、双击编辑） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="columnDefs"
        :default-col-def="hmxDefaultColDef" :row-data="rows" :get-row-id="getRowId" :row-selection="'single'"
        :loading="querying" :pagination="false" :animate-rows="false" :locale-text="AG_GRID_LOCALE_CN"
        @grid-ready="onGridReady" @selection-changed="onSelectionChanged" @row-double-clicked="onRowDoubleClicked"
        @first-data-rendered="autoSizeOnFirstData" />
    </div>

    <UserEditDialog v-model:open="editOpen" :editing="editTarget" :preset-dept-id="editPresetDeptId" @save="onSaveUser"
      @invalid="onInvalid" />
    <UserRoleEditDialog v-model:open="roleOpen" :user-id="roleUserId" />

    <!-- 删除确认（对应原 MsgBox.ShowYesNo） -->
    <Dialog :visible="deleteOpen" modal header="删除确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="deleteOpen = $event">
      <p class="text-sm">是否确定删除该用户[{{ deleteTarget?.id }}]（如果存在子级用户会级联删除），是否继续！</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="deleteOpen = false" />
        <Button label="删除" severity="danger" variant="outlined" @click="confirmDelete" />
      </template>
    </Dialog>

    <!-- 重置密码确认 -->
    <Dialog :visible="resetOpen" modal header="重置密码" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="resetOpen = $event">
      <p class="text-sm">是否确定重置密码？</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="resetOpen = false" />
        <Button label="确定" variant="outlined" @click="confirmResetPwd" />
      </template>
    </Dialog>
  </div>
</template>
