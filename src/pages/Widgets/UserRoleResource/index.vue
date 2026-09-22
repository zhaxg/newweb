<script setup lang="ts">
import { ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";

/** 对应 FrmUserRoleResource（用户角色权限查询）：Hmx.WinForms.Widgets.SysForms.FrmUserRoleResource
 *  画面迁移，逻辑不迁移到 */

const theme = makeHmxGridTheme();
const rows = ref<any[]>([]);
const roles = ref<any[]>([]);
const perms = ref<any[]>([]);
const treeRows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

const queryType = ref("");
const keyword = ref("");

const queryTypeOptions = [
  { label: "用户名", value: "CUserName" },
  { label: "部门", value: "CDepartment" },
  { label: "角色名", value: "CRoleName" },
  { label: "功能名称", value: "CTitle" },
];

// 用户列表列
const userColDefs: ColDef[] = [
  { field: "Id", headerName: "用户ID", width: 100 },
  { field: "CUserName", headerName: "用户名", width: 120 },
  { field: "CDepartment", headerName: "部门", width: 140 },
  { field: "CMaster", headerName: "主管", width: 100 },
];

// 角色列表列
const roleColDefs: ColDef[] = [
  { field: "Id", headerName: "角色ID", width: 100 },
  { field: "CRoleName", headerName: "角色名称", width: 150 },
  { field: "CDescription", headerName: "描述", width: 200 },
  ];

// 用户权限列
const permColDefs: ColDef[] = [
  { field: "Id", headerName: "用户ID", width: 100 },
  { field: "CUserName", headerName: "用户名", width: 120 },
  { field: "CDepartment", headerName: "部门", width: 140 },
  { field: "CMaster", headerName: "主管", width: 100 },
];

// 功能树列
const treeColDefs: ColDef[] = [
  { field: "CTitle", headerName: "功能名称", width: 200, flexible: true },
  { field: "CCode", headerName: "功能编码", width: 150 },
  { field: "Id", headerName: "功能ID", width: 150 },
];

function onGridReady(e: GridReadyEvent) { gridApi.value = e.api; }

async function onQuery() {
  querying.value = true;
  try {
    rows.value = [];
    roles.value = [];
    perms.value = [];
    treeRows.value = [];
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏：查询 | 查询类型 | 关键字 | 查询按钮（1-2个条件合并一行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 whitespace-nowrap text-xs text-muted-foreground">查询</label>
      <Select v-model="queryType" :options="queryTypeOptions" option-label="label" option-value="value"
        placeholder="类型" show-clear class="w-36 shrink-0" />
      <label class="shrink-0 whitespace-nowrap text-xs text-muted-foreground">关键字</label>
      <InputText v-model="keyword" maxlength="100" placeholder="关键字" autocapitalize="off" spellcheck="false"
        class="w-48 shrink-0" @keydown.enter="onQuery" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">用户角色权限（{{ rows.length }}）</span>
    </div>

    <!-- 主区：左右 Splitter（左=用户列表，右=上下结构） -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- 左栏：用户列表 -->
      <SplitterPanel :size="30" :minSize="20" class="flex flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">用户列表</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="userColDefs" :row-data="rows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }" :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onGridReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <!-- 右栏：上下 Splitter（上=角色+权限，下=功能树） -->
      <SplitterPanel :minSize="40" class="flex flex-col">
        <Splitter class="min-h-0 flex-1" layout="vertical">
          <!-- 上栏：角色列表 + 权限列表 -->
          <SplitterPanel :size="50" :minSize="30" class="flex flex-col">
            <Splitter class="min-h-0 flex-1" layout="horizontal">
              <!-- 角色列表 -->
              <SplitterPanel :size="50" :minSize="30" class="flex flex-col">
                <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                  <span class="text-xs font-medium text-muted-foreground">角色列表</span>
                </div>
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="roleColDefs" :row-data="roles"
                    :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }" :pagination="false" :animate-rows="false" />
                </div>
              </SplitterPanel>
              <!-- 用户权限 -->
              <SplitterPanel :minSize="30" class="flex flex-col">
                <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
                  <span class="text-xs font-medium text-muted-foreground">用户权限</span>
                </div>
                <div class="min-h-0 flex-1 overflow-hidden">
                  <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                    :default-col-def="hmxDefaultColDef" :column-defs="permColDefs" :row-data="perms"
                    :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }" :pagination="false" :animate-rows="false" />
                </div>
              </SplitterPanel>
            </Splitter>
          </SplitterPanel>

          <!-- 下栏：功能树 -->
          <SplitterPanel :minSize="30" class="flex flex-col">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">功能树</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="treeColDefs" :row-data="treeRows"
                :pagination="false" :animate-rows="false" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
