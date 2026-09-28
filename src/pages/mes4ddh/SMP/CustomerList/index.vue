<script setup lang="ts">
/** 对应 FrmCustomerList（客户档案查询 / 窗体标题「客户经销商」）：DDH.Winforms.SMP.Forms.FrmCustomerList
 *  已接入：tsCustomerApi.getTsCustomerList（查询，Load 即加载）/ removeTsCustomer（删除）/ syncCust（同步客户信息）
 *  待接入：FrmCustomerAdd 弹窗占位（编辑按钮 → 占位 toast；addTsCustomer/updateTsCustomer 随弹窗接入）；
 *         添加按钮原 Visible=false，按约定未显示 */

import { onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import { IconPencil, IconRefresh, IconSearch, IconTrash } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tsCustomerApi } from "@/api/mes4ddh/smp.swagger";
import type { TsCustomer } from "@/api/mes4ddh/smp.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<TsCustomer[]>([]);
const querying = ref(false);
const syncing = ref(false);
const gridApi = ref<GridApi | null>(null);

const txtcode = ref(""); // 客户编码（原 txtcode）
const txtcustname = ref(""); // 客户名称（原 txtcustname）

// Designer 可见 8 列 + 其余 24 列 hide:true（列头按 TsCustomer 实体 [LDisplay]）
const colDefs: ColDef[] = [
  { field: "cCustCode", headerName: "客户编码", width: 116 },
  { field: "cCustName", headerName: "客户名称", width: 130 },
  { field: "cStatus", headerName: "状态", width: 80 },
  { field: "cCustClass", headerName: "客户分类", width: 133 },
  { field: "creator", headerName: "创建人", width: 126 },
  { field: "createTime", headerName: "创建时间", width: 166 },
  { field: "lastModifier", headerName: "最后修改人", width: 126 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 183 },
  { field: "cRemark", headerName: "备注", hide: true },
  { field: "cType", headerName: "类别：G国内，W国贸", hide: true },
  { field: "cAddress", headerName: "地址", hide: true },
  { field: "cTel", headerName: "电话", hide: true },
  { field: "cFax", headerName: "传真", hide: true },
  { field: "cEmail", headerName: "邮箱", hide: true },
  { field: "cBank", headerName: "开户行", hide: true },
  { field: "cTax", headerName: "税号", hide: true },
  { field: "cLegalPerson", headerName: "法人", hide: true },
  { field: "cContacts", headerName: "联系人", hide: true },
  { field: "cCurrency", headerName: "结算货币", hide: true },
  { field: "cArea", headerName: "市场A亚洲地区U美洲地区E欧洲/澳大利亚地区", hide: true },
  { field: "cSaleEmp", headerName: "销售员", hide: true },
  { field: "cAccount", headerName: "账号", hide: true },
  { field: "cJsfs", headerName: "结算方式：S转账，X现款，J寄售", hide: true },
  { field: "cAbcd", headerName: "A战略客户，B重点客户，C普通客户，D潜在客户", hide: true },
  { field: "cPostCode", headerName: "邮编", hide: true },
  { field: "cSaleUserNum", headerName: "卖方客户代码", hide: true },
  { field: "cDept", headerName: "所属部门", hide: true },
  { field: "cEnCustName", headerName: "客户名称英文", hide: true },
  { field: "cEnShortCustName", headerName: "客户名称英文简写", hide: true },
  { field: "cEnAddr", headerName: "客户地址英文", hide: true },
  { field: "id", headerName: "C_ID", hide: true },
  { field: "selected", headerName: "选择", hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function focusedRow(): TsCustomer | undefined {
  return (gridApi.value?.getSelectedRows() ?? [])[0] as TsCustomer | undefined;
}

/** 原 LoadCustomerData：GetTsCustomerList(txtcode, txtcustname) */
async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await tsCustomerApi.getTsCustomerList({ cCustCode: txtcode.value, cCustName: txtcustname.value })) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 btnEdit_Click：先取焦点行，再开 FrmCustomerAdd（弹窗占位） */
function onEdit() {
  const row = focusedRow();
  if (!row) {
    toast("请先选择需要编辑的客户记录！", 2000, "warn");
    return;
  }
  toast("FrmCustomerAdd 弹窗待接入", 2000, "warn");
}

/** 原 btnDel_Click：选中校验 → ShowYesNo 确认 → RemoveTsCustomer → 刷新 */
async function onDel() {
  const row = focusedRow();
  if (!row) {
    toast("请先选择要删除的客户记录", 2000, "warn");
    return;
  }
  const confirmMessage = `确定删除客户 ${row.cCustCode} - ${row.cCustName} 吗？`;
  if (!window.confirm(confirmMessage)) return;
  await tsCustomerApi.removeTsCustomer(row);
  toast(`客户 ${row.cCustName} 删除成功`, 2000, "success");
  await onQuery();
}

/** 原 simpleButton1_Click：SyncCust(当前查询条件)（C# 完成后无提示、不刷新） */
async function onSync() {
  syncing.value = true;
  try {
    await tsCustomerApi.syncCust({ cCustCode: txtcode.value, cCustName: txtcustname.value });
  } catch {
    /* 拦截层已 toast */
  } finally {
    syncing.value = false;
  }
}

onMounted(() => {
  void onQuery(); // 原 FrmCustomerList_Load → LoadCustomerData
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1）：客户编码/客户名称输入 + 查询/编辑/删除/同步客户信息（添加 Visible=false 未显示） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="txtcode" placeholder="客户编码" class="w-36 shrink-0" />
      <InputText v-model="txtcustname" placeholder="客户名称" class="w-36 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="syncing" @click="onSync">
        <IconRefresh class="h-3 w-3" />同步客户信息
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">客户档案查询（{{ rows.length }}）</span>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
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
