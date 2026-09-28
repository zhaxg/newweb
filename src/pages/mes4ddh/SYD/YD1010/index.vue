<script setup lang="ts">
/** 对应 FrmYD1010（库区垛位管理，菜单代码 TY1010）：DDH.Winforms.SYD.Forms.FrmYD1010
 *  已接入：tyd1000Api.queryRoom + queryStacks（一次拉全，前端按 cStoreCode 过滤子表）
 *          + crudAppService.SaveList("Tyd1010")（原 bindingSource2.SaveChanges<Tyd1010>()）
 *  待接入：「导入」按钮(btnImport，原 ImportDataHelper Excel 导入，web 无 xlsx 解析设施)
 *  布局：工具栏一行(刷新/垛位号/跨号/区域/数量/添加/批量添加/删除/保存/导入)
 *        → 左右Splitter：左=库区(Tyd1000 4可见) | 右=垛位(Tyd1010 14可见，行内编辑) */
import { ref, shallowRef } from "vue";
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconDeviceFloppy, IconFiles, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { TrackableList } from "@/api/common/trackableList";
import { crudAppService } from "@/api/common/crudAppService";
import { NextStrId } from "@/lib/yitIdHelper";
import { tyd1000Api, type Tyd1000, type Tyd1010 } from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* 左：库区（原 gridView1，4 可见 + 7 hide） */
const roomColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStoreCode", headerName: "库区号", width: 120 },
  { field: "cStoreDes", headerName: "库区描述", width: 180 },
  { field: "cStoreType", headerName: "库区种类", width: 120 },
  { field: "cRemark", headerName: "备注", width: 200, flex: 1 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cValidFlag", headerName: "生效标记", hide: true },
  { field: "creator", headerName: "创建人", hide: true },
  { field: "createTime", headerName: "创建时间", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "nType", headerName: "库区类型", hide: true },
]);

/* 右：垛位（原 gridView3，14 可见 + 3 hide） */
const stackColDefs = ref<ColDef[]>([
  { colId: "selected", field: "selected", headerName: "选择", hide: true },
  { field: "cStackNo", headerName: "垛位号", width: 110, editable: true },
  { field: "cStackType", headerName: "垛位分类", width: 110, editable: true },
  { field: "cHallNo", headerName: "跨号", width: 90, editable: true },
  { field: "nRow", headerName: "行号", width: 80, editable: true },
  { field: "nCol", headerName: "列号", width: 80, editable: true },
  { field: "cArer", headerName: "区域", width: 100, editable: true },
  { field: "nMaxNum", headerName: "库容最大支数", width: 120, editable: true },
  { field: "nMaxWgt", headerName: "库容最大重量", width: 130, editable: true },
  { field: "cDefault", headerName: "默认垛位", width: 100, editable: true },
  { field: "cRemark", headerName: "备注", width: 160, editable: true, flex: 1 },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 160 },
  { field: "lastModifier", headerName: "最后修改人", width: 110 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 160 },
  /* 隐藏列 */
  { field: "id", headerName: "主键", hide: true },
  { field: "cStoreCode", headerName: "库区号", hide: true },
]);

/* ---------- 状态 ---------- */
const rooms = ref<Tyd1000[]>([]);
const allStacks = ref<Tyd1010[]>([]);
const stackList = shallowRef<TrackableList<Tyd1010>>(new TrackableList<Tyd1010>());
const querying = ref(false);
const roomApi = ref<GridApi | null>(null);
const stackApi = ref<GridApi | null>(null);
const focusStore = ref<Tyd1000 | null>(null);

/* stackPanel1 批量参数（垛位号前缀 / 跨号 / 区域 / 数量） */
const txtNo = ref("");
const txtKh = ref("");
const txtArea = ref("");
const txtNum = ref<number>(1);

/** AG Grid 本版 GridApi 无 selectIndex：用 forEachNode 选中首行 */
function selectFirstRow(gridApi: GridApi | null) {
  if (!gridApi) return;
  let first = true;
  gridApi.forEachNode((node) => {
    if (first) {
      node.setSelected(true, true);
      first = false;
    }
  });
}

function onRoomReady(e: GridReadyEvent) {
  roomApi.value = e.api;
}
function onStackReady(e: GridReadyEvent) {
  stackApi.value = e.api;
}
function refresh() {
  stackApi.value?.refreshCells({ force: true });
}

function filterDetail(storeCode: string | undefined) {
  const items = storeCode ? allStacks.value.filter((x) => x.cStoreCode === storeCode) : [];
  stackList.value = new TrackableList<Tyd1010>(items);
  stackApi.value?.setGridOption("rowData", stackList.value);
  requestAnimationFrame(() => stackApi.value?.autoSizeAllColumns());
}

/* btnRefresh → QueryRoom + QueryStacks，一次拉全前端过滤（与原 C# 一致） */
async function onQuery() {
  querying.value = true;
  try {
    const [roomList, stackSource] = await Promise.all([tyd1000Api.queryRoom(""), tyd1000Api.queryStacks("")]);
    rooms.value = (roomList ?? []) as Tyd1000[];
    allStacks.value = (stackSource ?? []) as Tyd1010[];
    roomApi.value?.setGridOption("rowData", rooms.value);
    requestAnimationFrame(() => roomApi.value?.autoSizeAllColumns());
    // 默认选中第一行库区
    if (rooms.value.length) {
      selectFirstRow(roomApi.value);
      focusStore.value = rooms.value[0]!;
      filterDetail(focusStore.value.cStoreCode ?? undefined);
    } else {
      focusStore.value = null;
      filterDetail(undefined);
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onRoomSelectionChanged() {
  const row = (roomApi.value?.getSelectedNodes()[0]?.data as Tyd1000 | undefined) ?? null;
  focusStore.value = row;
  filterDetail(row?.cStoreCode ?? undefined);
}

function makeStack(partial: Partial<Tyd1010> = {}): Tyd1010 {
  return {
    id: NextStrId(),
    cStoreCode: focusStore.value?.cStoreCode ?? null,
    cHallNo: txtKh.value || null,
    cArer: txtArea.value || null,
    selected: false,
    ...partial,
  } as Tyd1010;
}

function requireStore(): boolean {
  if (!focusStore.value) {
    toast("请先选择库区", 2000, "warn");
    return false;
  }
  return true;
}

/* simpleButton3 添加 */
function onAdd() {
  if (!requireStore()) return;
  stackList.value.push(makeStack());
  const stored = stackList.value[stackList.value.length - 1] as Tyd1010;
  stackApi.value?.applyTransaction({ add: [stored] });
  refresh();
}

/* simpleButton7 批量添加：垛位号 = 前缀 + 01..NN */
function onAddAll() {
  if (!requireStore()) return;
  const header = txtNo.value;
  const num = txtNum.value || 0;
  if (num <= 0) {
    toast("数量需大于 0", 2000, "warn");
    return;
  }
  const added: Tyd1010[] = [];
  for (let i = 0; i < num; i++) {
    const obj = makeStack({ cStackNo: `${header}${String(i + 1).padStart(2, "0")}` });
    stackList.value.push(obj);
    added.push(stackList.value[stackList.value.length - 1] as Tyd1010);
  }
  stackApi.value?.applyTransaction({ add: added });
  refresh();
}

/* simpleButton5 删除 */
function onDelete() {
  const selected = selectedStacks();
  if (!selected.length) {
    toast("请选择要删除的垛位", 2000, "warn");
    return;
  }
  stackList.value.remove((r) => selected.includes(r));
  stackApi.value?.applyTransaction({ remove: selected });
}

function selectedStacks(): Tyd1010[] {
  const byGrid = (stackApi.value?.getSelectedRows() ?? []) as Tyd1010[];
  if (byGrid.length) return byGrid;
  return stackList.value.filter((x) => x.selected);
}

/* simpleButton6 保存 → bindingSource2.SaveChanges<Tyd1010>() */
async function onSave() {
  if (!window.confirm("确定保存当前改动吗？")) return;
  querying.value = true;
  try {
    await crudAppService.SaveList(stackList.value, "Tyd1010");
    await onQuery();
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnImport（原 ImportDataHelper Excel 导入）→ 待接入 */
function onImport() {
  toast("Excel 导入待接入（web 无 xlsx 解析设施）", 2500, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconRefresh class="h-3 w-3" />刷新
      </Button>
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">垛位号</label>
      <InputText v-model="txtNo" class="w-28 shrink-0" />
      <label class="ml-1 shrink-0 text-xs text-muted-foreground">跨号</label>
      <InputText v-model="txtKh" class="w-20 shrink-0" />
      <label class="ml-1 shrink-0 text-xs text-muted-foreground">区域</label>
      <InputText v-model="txtArea" class="w-24 shrink-0" />
      <label class="ml-1 shrink-0 text-xs text-muted-foreground">数量</label>
      <div class="w-24 shrink-0">
        <InputNumber v-model="txtNum" :min="0" :show-buttons="false" fluid />
      </div>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddAll">
        <IconFiles class="h-3 w-3" />批量添加
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onImport">导入</Button>
      <span class="ml-auto text-xs text-muted-foreground">垛位（{{ stackList.length }}）</span>
    </div>

    <!-- 左右分栏（原 gridControl1 Dock.Left + splitterControl1 + cusGridConrol1 Dock.Fill） -->
    <Splitter class="min-h-0 flex-1">
      <SplitterPanel :size="30" :minSize="15" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">库区</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="roomColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="rooms"
            :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onRoomReady"
            @selection-changed="onRoomSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="70" :minSize="30" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="ml-auto text-xs font-medium text-muted-foreground">
            垛位{{ focusStore ? `（库区 ${focusStore.cStoreCode}）` : "" }}
          </span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="stackColDefs"
            :default-col-def="hmxDefaultColDef"
            :row-data="stackList"
            :locale-text="AG_GRID_LOCALE_CN"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            @grid-ready="onStackReady"
            @first-data-rendered="autoSizeOnFirstData"
            @cell-value-changed="refresh"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
