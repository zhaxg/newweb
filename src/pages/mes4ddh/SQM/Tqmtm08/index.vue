<script setup lang="ts">
/** 对应 FrmTqmtm08（基表挂靠标准配置）：DDH.Winforms.SQM.Forms.Tqmtm.FrmTqmtm08
 *  已接入：tqmtm104Api.queryGrp（bindData）/ queryTreeSource（明细树默认源）/ save（SaveChangesData）
 *  布局：splitContainerControl1 左右 SplitterPosition 577/1162≈50%（Panel1=gridControl1，Panel2=stackPanel2+treeList1）
 *        栈序：form Controls.Add(splitContainer, stackPanel3, stackPanel1) → 栈3=查询/添加/删除/保存(Dock Top)
 *  查询条件 5 项（stackPanel1，左→右：作业工序/基表类型/品名/产品大类/检索索引）
 *  偏差：原 stackPanel1.Visible=false（查询条件区在原系统隐藏），按 ui-rules「元素齐全」仍渲染
 *  列集：左表 VisibleIndex 0~5 + 隐藏 3；树 VisibleIndex 0~3（代码/中文名称/英文名称/必须项）
 *  逻辑：btnAdd=AddNew+SourceId 并灌 queryTreeSource 默认明细；树勾选→detailSnapshotStr=GetDetailSnapshot；
 *        btnSave 按 added/changed/deleted 剔除「未勾选或无父」明细后 Proxy.Save → 回查
 *  偏差：原父节点半选态 Indeterminate，AG Grid 无此态（部分选中时父节点显示未勾）
 *  待接入：无 */

import { computed, onMounted, reactive, ref, shallowRef, watch, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconArrowBarDown, IconArrowBarUp, IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  AutoGroupColumnDef,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  RowSelectionOptions,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { TrackableList } from "@/api/common/trackableList";
import { TableType, tqmtm104Api, type Tqmtm104DetailDto, type Tqmtm104Dto } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { NextStrId } from "@/lib/yitIdHelper";

const theme = makeHmxGridTheme();

/* ---------- 查询条件（原 stackPanel1：作业工序 / 基表类型 / 品名 / 产品大类 / 检索索引） ---------- */
type Opt = { label: string; value: string };
const input = reactive({
  workType: null as string | null,
  basicTableType: null as TableType | null,
  prodName: null as string | null,
  prodClass: null as string | null,
  searchIdx: "",
});

/** 原 cboJblx.Properties.AddEnum<Tqmtm08.TableType>() */
const tableTypeOpts: Opt[] = [
  { label: "冶金规范类", value: String(TableType.A) },
  { label: "产线类", value: String(TableType.B) },
  { label: "工序类", value: String(TableType.C) },
];
const kvWorkType = ref<Opt[]>([]);
const kvProdClass = ref<Opt[]>([]);
const kvProdCode = ref<Opt[]>([]);

async function loadKv(target: Ref<Opt[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}
const labelOf = (opts: Opt[], v?: string | number | null) =>
  opts.find((o) => o.value === String(v ?? ""))?.label ?? (v == null ? "" : String(v));

/* ---------- 主表（gridControl1 → Tqmtm104Dto，VisibleIndex 0~5 + 隐藏 3） ---------- */
const trackList = shallowRef<TrackableList<Tqmtm104Dto>>(new TrackableList<Tqmtm104Dto>());
const querying = ref(false);
const saving = ref(false);
const gridApi = ref<GridApi | null>(null);
const treeApi = ref<GridApi | null>(null);

const colDefs = computed<ColDef[]>(() => [
  { field: "cFacCode", headerName: "工厂", width: 80 },
  {
    field: "cWorkTypeCode",
    headerName: "作业工序类型",
    width: 130,
    valueFormatter: (p: ValueFormatterParams) => labelOf(kvWorkType.value, p.value),
  },
  {
    field: "cBasicTableTypeCode",
    headerName: "基表类型",
    width: 110,
    valueFormatter: (p: ValueFormatterParams) => labelOf(tableTypeOpts, p.value),
  },
  {
    field: "cProdClassCode",
    headerName: "产品大类",
    width: 120,
    valueFormatter: (p: ValueFormatterParams) => labelOf(kvProdClass.value, p.value),
  },
  {
    field: "cProdCode",
    headerName: "品名",
    width: 120,
    valueFormatter: (p: ValueFormatterParams) => labelOf(kvProdCode.value, p.value),
  },
  { field: "cSearchIdx", headerName: "检索索引", width: 120 },
  { field: "nSeq1", headerName: "工序排序", width: 90, hide: true },
  { field: "isChanged", headerName: "修改标识", width: 90, hide: true },
  { field: "detailSnapshotStr", headerName: "明细基表数据快照", width: 150, hide: true },
]);

/** 后端行未必带 sourceId，回落 TrackableList 的 __trackId，保证行 id 不重复 */
function getRowId(p: GetRowIdParams) {
  const d = p.data as Tqmtm104Dto & { __trackId?: string };
  return String(d.sourceId ?? d.__trackId ?? "");
}

/* ---------- 右树（treeList1 → Tqmtm104DetailDto，VisibleIndex 0~3） ---------- */
/** 原 queryTreeSource 的默认明细（新增时整树复制 + Selected=false） */
const treeDefault = ref<Tqmtm104DetailDto[]>([]);
/** 焦点行的明细（原 bindingSource2 = _treeSourceUnSel） */
const treeRows = ref<(Tqmtm104DetailDto & { path: string[] })[]>([]);
const focusedSourceId = ref<string | null>(null);

const treeColDefs: ColDef[] = [
  { field: "cBasicTableCName", headerName: "中文名称", width: 160 },
  { field: "cBasicTableEName", headerName: "英文名称", width: 200 },
  {
    field: "validateFlag",
    headerName: "必须项",
    width: 80,
    cellRenderer: "agCheckboxCellRenderer",
    editable: true,
    sortable: false,
  },
];
/** 树首列即 Designer 的「代码」（VisibleIndex 0），勾选框挂在这列上，避免多出一列 */
const autoGroupColumnDef: AutoGroupColumnDef = {
  headerName: "代码",
  field: "cBasicTableCode",
  minWidth: 160,
  flex: 1,
  sortable: false,
};

const treeSelection: RowSelectionOptions = {
  mode: "multiRow",
  checkboxes: true,
  checkboxLocation: "autoGroupColumn",
  headerCheckbox: false,
  enableClickSelection: true,
  groupSelects: "descendants",
};

/** 平铺明细（parentID）→ 带 path 的树行；保持行数据与原对象一一对应（按 id 回写） */
function toTreeRows(list: Tqmtm104DetailDto[]) {
  const ids = new Set(list.map((x) => String(x.id ?? "")));
  const byPid = new Map<string, Tqmtm104DetailDto[]>();
  for (const n of list) {
    const key = n.parentID && ids.has(String(n.parentID)) ? String(n.parentID) : "";
    const arr = byPid.get(key) ?? [];
    arr.push(n);
    byPid.set(key, arr);
  }
  const out: (Tqmtm104DetailDto & { path: string[] })[] = [];
  const walk = (pid: string, path: string[]) => {
    for (const n of byPid.get(pid) ?? []) {
      const key = String(n.id ?? "");
      const rowPath = [...path, key];
      out.push({ ...n, path: rowPath });
      walk(key, rowPath);
    }
  };
  walk("", []);
  return out;
}

/** 原 Tqmtm104Dto.GetDetailSnapshot：对有父的明细逐个取 selected ? (validateFlag ? "2" : "1") : "0" */
function detailSnapshot(d: Tqmtm104Dto) {
  return (d.details ?? [])
    .filter((x) => x.parentID)
    .map((x) => (x.selected ? (x.validateFlag ? "2" : "1") : "0"))
    .join("");
}

function currentRow(): Tqmtm104Dto | null {
  if (!focusedSourceId.value) return null;
  return (
    trackList.value.find(
      (r) => String(r.sourceId ?? (r as { __trackId?: string }).__trackId ?? "") === focusedSourceId.value,
    ) ?? null
  );
}

/** 原 gridView1_FocusedRowObjectChanged：右树数据源 = 焦点行 Details ?? 默认明细 */
function applyTreeSource() {
  const cur = currentRow();
  const list = cur?.details ?? treeDefault.value ?? [];
  treeRows.value = toTreeRows(list);
  requestAnimationFrame(() => {
    const api = treeApi.value;
    if (!api) return;
    api.forEachNode((node) => {
      const d = node.data as (Tqmtm104DetailDto & { path: string[] }) | undefined;
      if (d) node.setSelected(!!d.selected);
    });
    // 原 initTreeExpend：展开含选中子节点的父链
    api.forEachNode((node) => {
      if (!node.allChildrenCount) return;
      let hasSel = false;
      node.allLeafChildren?.forEach((leaf) => {
        if (leaf.isSelected()) hasSel = true;
      });
      if (hasSel) node.setExpanded(true);
    });
    api.autoSizeAllColumns();
  });
}

watch(focusedSourceId, applyTreeSource);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onTreeReady(e: GridReadyEvent) {
  treeApi.value = e.api;
}

/** 主表选中行 → 记录 sourceId（缺省回落 __trackId），驱动右树切换 */
function onMainSelectionChanged() {
  const row = gridApi.value?.getSelectedRows()[0] as (Tqmtm104Dto & { __trackId?: string }) | undefined;
  focusedSourceId.value = row ? String(row.sourceId ?? row.__trackId ?? "") : null;
}

function onSelectionChanged() {
  const cur = currentRow();
  if (!cur) return;
  const api = treeApi.value;
  if (!api) return;
  const selectedIds = new Set<string>();
  api.forEachNode((node) => {
    if (node.isSelected()) selectedIds.add(String((node.data as Tqmtm104DetailDto).id ?? ""));
  });
  for (const d of cur.details ?? []) {
    const now = selectedIds.has(String(d.id ?? ""));
    if (!!d.selected !== now) d.selected = now;
  }
  // 原 treeList1_NodeChanged → SetDetailChanged：回写快照并让主表行算作已改
  cur.detailSnapshotStr = detailSnapshot(cur);
}

/** 原 treeList1_CellValueChanged（必须项列）→ 同样回写快照 */
function onTreeCellValueChanged() {
  const cur = currentRow();
  if (!cur) return;
  for (const d of cur.details ?? []) {
    const row = treeRows.value.find((r) => String(r.id ?? "") === String(d.id ?? ""));
    if (row) d.validateFlag = row.validateFlag;
  }
  cur.detailSnapshotStr = detailSnapshot(cur);
  gridApi.value?.refreshCells({ force: true });
}

async function bindData() {
  querying.value = true;
  try {
    const [grp, tree] = await Promise.all([
      tqmtm104Api.queryGrp({
        cWorkTypeCode: input.workType,
        cBasicTableTypeCode: input.basicTableType,
        cProdClassCode: input.prodClass,
        cProdCode: input.prodName,
        cSearchIdx: input.searchIdx.trim(),
      }),
      tqmtm104Api.queryTreeSource(),
    ]);
    // 原 rlt.ForEach(x => x.SetSnapshot())
    for (const x of grp ?? []) x.detailSnapshotStr = detailSnapshot(x);
    treeDefault.value = tree ?? [];
    trackList.value = new TrackableList<Tqmtm104Dto>(grp ?? []);
    focusedSourceId.value = null;
    applyTreeSource();
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onQuery() {
  void bindData();
}

/** 原 btnAdd_Click：AddNew + SourceId=GenerateID，明细= queryTreeSource 整份复制（Selected=false） */
function onAdd() {
  const sourceId = NextStrId();
  const details = treeDefault.value.map((x) => ({ ...x, selected: false, sourceId }));
  const draft: Tqmtm104Dto = { sourceId, details, detailSnapshotStr: "" };
  trackList.value.push(draft);
  focusedSourceId.value = sourceId;
  requestAnimationFrame(() => {
    gridApi.value?.getRowNode(sourceId)?.setSelected(true);
  });
}

/** 原 btnDel_Click：gridControl1.Remove()（移除当前行，随保存进 deletedItems） */
function onDelete() {
  const cur = currentRow();
  if (!cur) return;
  trackList.value.remove(
    (r) => (r as Tqmtm104Dto & { __trackId?: string }).__trackId === (cur as { __trackId?: string }).__trackId,
  );
  focusedSourceId.value = null;
  applyTreeSource();
}

/** 原 btnSave_Click：added/changed/deleted 各自剔除「未勾选或无父」明细 → Proxy.Save → 回查 */
async function onSave() {
  const list = trackList.value.SaveChangesData;
  const strip = (items: Tqmtm104Dto[]) =>
    items.map((x) => ({
      ...x,
      details: (x.details ?? []).filter((l) => l.selected && l.parentID),
    }));
  saving.value = true;
  try {
    await tqmtm104Api.save({
      addedItems: strip(list.addedItems),
      changedItems: strip(list.changedItems),
      deletedItems: strip(list.deletedItems),
    });
    await bindData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

function onExpand() {
  treeApi.value?.expandAll();
}
function onCollapse() {
  treeApi.value?.collapseAll();
}

onMounted(() => {
  void Promise.all([
    loadKv(kvWorkType, "A0100:PROC_CODE"),
    loadKv(kvProdClass, "A0100:PRODUCT_CLASS"),
    loadKv(kvProdCode, "A0100:PRODUCT_CODE"),
  ]);
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 stackPanel1：5 项，左→右 作业工序/基表类型/品名/产品大类/检索索引） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">作业工序</label>
          <Select
            v-model="input.workType"
            :options="kvWorkType"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">基表类型</label>
          <Select
            v-model="input.basicTableType"
            :options="tableTypeOpts"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">品名</label>
          <Select
            v-model="input.prodName"
            :options="kvProdCode"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产品大类</label>
          <Select
            v-model="input.prodClass"
            :options="kvProdClass"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">检索索引</label>
          <InputText v-model="input.searchIdx" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
      </div>
    </div>

    <!-- 操作工具栏（原 stackPanel3：查询/添加/删除/保存） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd"> <IconPlus class="h-3 w-3" />添加 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" :loading="saving" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">基表挂靠标准配置（{{ trackList.length }}）</span>
    </div>

    <!-- 左右分栏（原 splitContainerControl1，SplitterPosition 577/1162≈50%） -->
    <Splitter class="min-h-0 flex-1" layout="horizontal">
      <!-- Panel1：gridControl1 -->
      <SplitterPanel :size="50" :minSize="30" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="trackList"
            :get-row-id="getRowId"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying || saving"
            @grid-ready="onGridReady"
            @cell-value-changed="() => gridApi?.refreshCells({ force: true })"
            @selection-changed="onMainSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <!-- Panel2：stackPanel2（展开/收缩，Dock Top）+ treeList1 -->
      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <Button text class="shrink-0 whitespace-nowrap" @click="onExpand">
            <IconArrowBarUp class="h-3 w-3" />展开
          </Button>
          <Button text class="shrink-0 whitespace-nowrap" @click="onCollapse">
            <IconArrowBarDown class="h-3 w-3" />收缩
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :auto-group-column-def="autoGroupColumnDef"
            :column-defs="treeColDefs"
            :row-data="treeRows"
            :get-data-path="(d) => d.path"
            :get-row-id="(p) => String(p.data.id ?? '')"
            :tree-data="true"
            :row-selection="treeSelection"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            @grid-ready="onTreeReady"
            @selection-changed="onSelectionChanged"
            @cell-value-changed="onTreeCellValueChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
