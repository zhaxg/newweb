<script setup lang="ts">
/** 对应 FrmYD1100（库区车辆管理）：DDH.Winforms.SYD.Forms.FrmYD1100
 *  已接入：tyd1000Api.queryRoom（库区下拉）+ tyd1100Api.tyd1100Query / addTyd1100 / saveTyd1100 / delTyd1100
 *  待接入：无二级弹窗
 *  布局：工具栏一行(车号/库区号/查询/删除) → 左右Splitter：左=车辆列表(Tyd1100 7可见) | 右=编辑表单(库区号/车号+添加/保存)
 *  偏差：原 SplitterPosition 435/1560 ≈ 左28%(右72%)、FixedPanel=Panel2，
 *        按需求右栏「车辆信息」固定为内容区 20% → :size 80/20，minSize 同值锁定（分隔条不可拖动）；
 *        右栏随之由 grid-cols-2 改单列、label 统一 w-16 */
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { NextStrId } from "@/lib/yitIdHelper";
import { tyd1000Api, tyd1100Api, type Tyd1000, type Tyd1100 } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* 原 gridView1：Tyd1100，7 可见 + 1 hide（Selected 走行选择） */
const colDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStoreCode", headerName: "库区号", width: 140 },
  { field: "cCarNo", headerName: "车号", width: 160 },
  { field: "creator", headerName: "创建人", width: 110 },
  { field: "createTime", headerName: "创建时间", width: 170 },
  { field: "lastModifier", headerName: "最后修改人", width: 120 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 170, flex: 1 },
  { field: "id", headerName: "主键", hide: true },
]);

/* 查询条件（原 stackPanel1：车号 + 库区号） */
const qCarNo = ref("");
const qStoreCode = ref<string | null>(null);

/* 编辑表单（原 dataLayoutControl1：库区号/车号 + 添加/保存，绑 bscTyd1100Info） */
const form = ref<{ id: string | null; cCarNo: string; cStoreCode: string | null }>({
  id: null,
  cCarNo: "",
  cStoreCode: null,
});

const storeOptions = ref<{ label: string; value: string }[]>([]);
const rows = ref<Tyd1100[]>([]);
const querying = ref(false);
const api = ref<GridApi | null>(null);

function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

function selectedRows(): Tyd1100[] {
  const byGrid = (api.value?.getSelectedRows() ?? []) as Tyd1100[];
  if (byGrid.length) return byGrid;
  return rows.value.filter((x) => x.selected);
}

/* FrmYD1100_Load：QueryRoom 灌库区下拉（显示 CStoreDes / 值 CStoreCode） */
async function loadStores() {
  try {
    const list = ((await tyd1000Api.queryRoom("")) ?? []) as Tyd1000[];
    storeOptions.value = list
      .filter((x) => x.cStoreCode != null)
      .map((x) => ({ label: x.cStoreDes ?? x.cStoreCode ?? "", value: x.cStoreCode! }));
    if (storeOptions.value.length) qStoreCode.value = storeOptions.value[0]!.value;
  } catch {
    /* 拦截层已 toast */
  }
}

/* btnQuery → Tyd1100Query(carNo, storeCode) */
async function onQuery() {
  querying.value = true;
  try {
    const list = ((await tyd1100Api.tyd1100Query(
      qCarNo.value.trim() || undefined,
      qStoreCode.value ?? undefined,
    )) ?? []) as Tyd1100[];
    rows.value = list;
    api.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* 主行变化 → 复制到右侧编辑表单（原 Clone） */
function onSelectionChanged() {
  const row = (api.value?.getSelectedNodes()[0]?.data as Tyd1100 | undefined) ?? null;
  if (!row) return;
  form.value = { id: row.id ?? null, cCarNo: row.cCarNo ?? "", cStoreCode: row.cStoreCode ?? null };
}

/* btnDel → DelTyd1100(勾选行 Id) */
async function onDelete() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择要删除的车辆", 2000, "warn");
    return;
  }
  const ids = selected.map((x) => x.id!).filter(Boolean);
  querying.value = true;
  try {
    await tyd1100Api.delTyd1100(ids);
    toast("数据删除成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnAdd → AddTyd1100 */
async function onAdd() {
  if (!form.value.cCarNo.trim()) {
    toast("请输入车号", 2000, "warn");
    return;
  }
  if (!form.value.cStoreCode) {
    toast("请选择库区号", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    await tyd1100Api.addTyd1100({
      id: NextStrId(),
      cCarNo: form.value.cCarNo,
      cStoreCode: form.value.cStoreCode,
    } as Tyd1100);
    toast("数据提交成功！", 2000, "success");
    form.value.cCarNo = "";
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnSave → SaveTyd1100(当前编辑行) */
async function onSave() {
  if (!form.value.id) {
    toast("请先选择要保存的记录", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    await tyd1100Api.saveTyd1100({
      id: form.value.id,
      cCarNo: form.value.cCarNo,
      cStoreCode: form.value.cStoreCode,
    } as Tyd1100);
    toast("数据提交成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  void loadStores().then(() => onQuery());
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询/删除工具栏（原 stackPanel1：车号 + 库区号 + 查询 + 删除） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">车号</label>
      <InputText v-model="qCarNo" class="w-44 shrink-0" @keydown.enter="onQuery" />
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">库区号</label>
      <Select v-model="qStoreCode" :options="storeOptions" option-label="label" option-value="value" show-clear
        filter placeholder="全部库区" class="w-56 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">车辆（{{ rows.length }}）</span>
    </div>

    <!-- 左右分栏（原 splitContainerControl1 SplitterPosition=435/1560 ≈ 左 28%、FixedPanel=Panel2，
         Panel1=gridControl1 / Panel2=dataLayoutControl1）
         按需求右栏「车辆信息」固定为内容区 20%：左 80 / 右 20，两端 minSize 相加 = 100 → 分隔条不可拖动 -->
    <Splitter class="min-h-0 flex-1">
      <SplitterPanel :size="80" :minSize="80" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :column-defs="colDefs"
            :default-col-def="hmxDefaultColDef" :row-data="rows" :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onReady" @selection-changed="onSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="20" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">车辆信息</span>
        </div>
        <!-- 20% 宽（≈280px）放不下两列，表单改单列；label 统一 w-16 -->
        <div class="grid shrink-0 grid-cols-1 items-center gap-x-3 gap-y-1.5 px-3 py-3">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">库区号</label>
            <Select v-model="form.cStoreCode" :options="storeOptions" option-label="label" option-value="value"
              show-clear filter placeholder="选择库区" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">车号</label>
            <InputText v-model="form.cCarNo" class="min-w-0 flex-1" />
          </div>
        </div>
        <div class="flex h-9 shrink-0 items-center gap-1 border-y border-border/60 px-2">
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
            <IconPlus class="h-3 w-3" />添加
          </Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
            <IconDeviceFloppy class="h-3 w-3" />保存
          </Button>
        </div>
        <div class="flex min-h-0 flex-1 items-start justify-center px-4 py-6">
          <p class="text-xs text-muted-foreground">从左侧选择记录以编辑，或直接填写车号/库区后点「添加」。</p>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
