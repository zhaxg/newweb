<script setup lang="ts">
/** 对应 FrmTsCust001（客户流向）：DDH.Winforms.SMP.Forms.FrmTsCust001
 *  已接入：tsCustomerApi.getTsCustomerList（客户名称 SearchLookUpEdit 候选，原 bscCustName）/
 *         tsCust001Api.custQuery（查询）/ deleteCust（删除选中）/
 *         crudAppService.SaveSingleData("TsCust001")（原 bscCustInfo.SaveChanges<TsCust001>() 单实体保存）
 *  待接入：无（左右分栏 430/1318≈33%，Panel1=表格、Panel2=基本信息表单） */

import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useAuthStore } from "@/stores/authStore";
import { crudAppService } from "@/api/common/crudAppService";
import { NextStrId } from "@/lib/yitIdHelper";
import { tsCustomerApi, tsCust001Api } from "@/api/mes4ddh/smp.swagger";
import type { TsCust001 } from "@/api/mes4ddh/smp.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<TsCust001[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

// 顶部查询（原 stackPanel1：客户编码/客户名称 + 查询/删除）
const txtCustNo = ref("");
const txtCustName = ref("");

// 右侧「基本信息」表单（原 dataLayoutControl1 绑定 bscCustInfo）
function emptyInfo(): TsCust001 {
  return { selected: false, id: null, creator: null, createTime: null, lastModifier: null, lastModifyTime: null,
    cCustEname: null, cInboundNo: null, cRemark: null, cCustNo: null, cStatus: null, cCustFlow: null };
}
const info = reactive<TsCust001>(emptyInfo());

// 客户名称查找候选（原 SearchLookUpEdit → bscCustName ← GetTsCustomerList）
const custOptions = ref<{ label: string; value: string; code: string }[]>([]);
const statusOptions = [
  { label: "禁用", value: "0" },
  { label: "启用", value: "1" },
];

// gvCust 列（Designer VisibleIndex 0-10，列头按 Designer Caption / TsCust001 实体）
const colDefs: ColDef[] = [
  { field: "selected", headerName: "选择", width: 70 },
  { field: "cCustEname", headerName: "客户名称", width: 112 },
  { field: "cCustNo", headerName: "客户编码", width: 112 },
  { field: "cInboundNo", headerName: "入库标识", width: 112 },
  { field: "cCustFlow", headerName: "客户流向", width: 112 },
  { field: "cStatus", headerName: "状态", width: 80 },
  { field: "cRemark", headerName: "备注", width: 140 },
  { field: "creator", headerName: "创建人", width: 112 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "lastModifier", headerName: "最后修改人", width: 112 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 150 },
];

function getRowId(p: { data: TsCust001 }) {
  return String(p.data.id);
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

/** AllowSyncRowStateToCheckboxSelection：行选择 ↔ Selected 列同步 */
function onSelectionChanged() {
  const set = new Set((gridApi.value?.getSelectedRows() ?? []).map((r) => (r as TsCust001).id));
  for (const r of rows.value) r.selected = r.id != null && set.has(r.id);
  gridApi.value?.refreshCells({ force: true, columns: ["selected"] });
}

/** 原 QueryCust：CustQuery(custNo, custName) */
async function query() {
  querying.value = true;
  try {
    rows.value = (await tsCust001Api.custQuery(txtCustNo.value || undefined, txtCustName.value || undefined)) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 gvCust_FocusedRowObjectChanged → bscInfoSet(row.Clone()) */
function onRowClicked(e: { data: TsCust001 }) {
  Object.assign(info, emptyInfo(), e.data);
}

/** 原 CCustEnameTextEdit_Closed：选中客户后回填客户编码/客户名称 */
function onCustChange() {
  const hit = custOptions.value.find((o) => o.value === info.cCustEname);
  if (hit) info.cCustNo = hit.code;
}

/** 原 btnDel_Click：Selected 勾选 → 确认 → DeleteCustAsync → 重查 */
async function onDel() {
  if (!rows.value.length) return;
  const selected = rows.value.filter((x) => x.selected);
  if (selected.length <= 0) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("是否确定删除用户，是否继续！")) return;
  await tsCust001Api.deleteCust(selected.map((x) => x.id).filter((x): x is string => !!x));
  await query();
  toast("用户已经删除！", 2000, "success");
}

function nowStr(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 原 EditCust(editType)：校验 → 单实体 SaveChanges → 网格增/改 */
async function editCust(isAdd: boolean) {
  if (!(info.cCustEname ?? "").trim()) {
    toast("客户名称不可空", 2000, "warn");
    return;
  }
  if (!(info.cInboundNo ?? "").trim()) {
    toast("入库标识不可空", 2000, "warn");
    return;
  }
  const userId = useAuthStore().session?.userId ?? "";
  info.lastModifyTime = nowStr();
  info.lastModifier = userId;
  if (isAdd) {
    info.id = NextStrId();
    info.createTime = nowStr();
    info.creator = userId;
    info.selected = false;
  }
  await crudAppService.SaveSingleData({ ...info }, "TsCust001");
  if (isAdd) {
    const stored = { ...info };
    rows.value.unshift(stored);
    gridApi.value?.applyTransaction({ add: [stored], addIndex: 0 });
  } else {
    const idx = rows.value.findIndex((x) => x.id === info.id);
    if (idx !== -1) {
      Object.assign(rows.value[idx], { ...info });
      gridApi.value?.refreshCells({ force: true });
    }
    toast("更新已完成！", 2000, "success");
  }
}

async function loadCustOptions() {
  try {
    const list = (await tsCustomerApi.getTsCustomerList()) ?? [];
    custOptions.value = list.map((x) => ({ label: x.cCustName ?? "", value: x.cCustName ?? "", code: x.cCustCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(async () => {
  await loadCustOptions(); // 原 FrmTsCust001_Load：bscCustName.DataSource
  await query(); // QueryCust()
  Object.assign(info, emptyInfo()); // bscInfoSet(new TsCust001())
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 顶部（原 stackPanel1 单行）：客户编码/客户名称 + 查询/删除 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="txtCustNo" placeholder="客户编码" class="w-36 shrink-0" />
      <InputText v-model="txtCustName" placeholder="客户名称" class="w-36 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">客户流向（{{ rows.length }}）</span>
    </div>

    <!-- 左右分栏（原 splitContainerControl1，SplitterPosition 430/1318≈33%） -->
    <Splitter :gutter-size="1" layout="horizontal" class="min-h-0 flex-1 border-0">
      <SplitterPanel :size="33" :min-size="20">
        <div class="h-full min-h-0 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
            :get-row-id="getRowId"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onGridReady"
            @selection-changed="onSelectionChanged"
            @row-clicked="onRowClicked"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="67" :min-size="30">
        <!-- Panel2：groupControl1「基本信息」，内含 dataLayoutControl1 表单 + 添加/保存 -->
        <div class="flex h-full min-h-0 flex-col">
          <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
            <span class="text-xs font-medium text-muted-foreground">基本信息</span>
          </div>
          <div class="min-h-0 flex-1 overflow-auto p-3">
            <!-- 字段顺序照原 dataLayoutControl1.Controls.Add -->
            <div class="grid grid-cols-2 items-center gap-x-3 gap-y-2">
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">创建人</label>
                <InputText v-model="info.creator" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">创建时间</label>
                <InputText v-model="info.createTime" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">最后修改人</label>
                <InputText v-model="info.lastModifier" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">最后修改时间</label>
                <InputText v-model="info.lastModifyTime" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">入库标识</label>
                <InputText v-model="info.cInboundNo" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">备注</label>
                <InputText v-model="info.cRemark" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">客户编码</label>
                <InputText v-model="info.cCustNo" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">状态</label>
                <Select v-model="info.cStatus" :options="statusOptions" option-label="label" option-value="value"
                  show-clear placeholder="请选择" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">客户流向</label>
                <InputText v-model="info.cCustFlow" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 flex-col gap-1">
                <label class="text-xs text-muted-foreground">客户名称</label>
                <Select v-model="info.cCustEname" :options="custOptions" option-label="label" option-value="value"
                  filter show-clear placeholder="请选择" class="min-w-0 flex-1" @change="onCustChange" />
              </div>
            </div>
          </div>
          <!-- 原 layoutControlItem1/2（TextVisible=false）：添加 / 保存 -->
          <div class="flex h-9 shrink-0 items-center gap-1 border-t border-border/60 px-2">
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="editCust(true)">
              <IconPlus class="h-3 w-3" />添加
            </Button>
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="editCust(false)">
              <IconDeviceFloppy class="h-3 w-3" />保存
            </Button>
          </div>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
