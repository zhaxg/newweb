<script setup lang="ts">
/** 对应 FrmHR3610（堆冷工艺维护）：DDH.Winforms.SHR.Forms.FrmHR3610
 *  已接入：hR3610Api.getThr3010HlGys（DataBind / btnQuery_Click）·
 *          hR3610Api.saveChangeThr3010HlGy（btnSave_Click，入参为 TrackableList.SaveChangesData）
 *  待接入：无
 *  偏差：钢种查询条件原为独立 label，按平台规范改为同行 placeholder；
 *        区间列（EqualsFlag）按原 LDisplay 符号显示（≤E≤/＜E≤/≤E＜/＜E＜），
 *        原 GridColumn 为下拉编辑器，此处用 select 单元格编辑器；删除原为焦点行无确认，此处用勾选行 */

import { onMounted, ref, shallowRef } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";
import { EqualsFlag, hR3610Api, type Thr3010HlGy } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 查询条件（原 txtCSgCode） ---------- */
const cSgCode = ref("");

/* ---------- 表格（gridView1 / Thr3010HlGy，行内编辑 + TrackableList 变更跟踪） ---------- */
const trackList = shallowRef<TrackableList<Thr3010HlGy>>(new TrackableList<Thr3010HlGy>());
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}

/* 原 EqualsFlag 下拉（区间：开闭符号），候选取自 C# LDisplay，不另编值 */
const switchOptions = [
  { label: "≤E≤", value: EqualsFlag.Default },
  { label: "＜E≤", value: EqualsFlag.LeftOpen },
  { label: "≤E＜", value: EqualsFlag.RightOpen },
  { label: "＜E＜", value: EqualsFlag.Open },
];
function switchText(p: ValueFormatterParams) {
  return switchOptions.find((o) => String(o.value) === String(p.value))?.label ?? "";
}

/** 数值列：原 GridColumn 为 SpinEdit 行内编辑 */
function numCol(field: string, headerName: string): ColDef {
  return { colId: field, field, headerName, minWidth: 112, editable: true, cellEditor: "agNumberCellEditor" };
}
/** 区间列：原为 EqualsFlag 下拉（此处用 ag 内置 select 编辑器，值为枚举数字串） */
function switchCol(field: string, headerName: string): ColDef {
  return {
    colId: field,
    field,
    headerName,
    minWidth: 112,
    editable: true,
    valueFormatter: switchText,
    cellEditor: "agSelectCellEditor",
    cellEditorParams: { values: switchOptions.map((o) => String(o.value)) },
    valueParser: (p) => Number(p.newValue),
  };
}

const colDefs: ColDef[] = [
  { colId: "cSgCodeType", field: "cSgCodeType", headerName: "钢种系列", minWidth: 112, editable: true },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", minWidth: 112, editable: true },
  numCol("nThickMin", "厚度最小值"),
  switchCol("nThickSwitch", "厚度区间"),
  numCol("nThickMax", "厚度最大值"),
  numCol("nDownTempMin", "下冷床温度最小值"),
  switchCol("nDownTempSwitch", "下冷床温度区间"),
  numCol("nDownTempMax", "下冷床温度最大值"),
  numCol("nHlHourPlan", "堆冷时间目标值"),
  numCol("nHlHourMin", "堆冷时间最小值"),
  switchCol("nHlHourSwitch", "堆冷时间区间"),
  numCol("nHlHourMax", "堆冷时间最大值"),
  { colId: "creator", field: "creator", headerName: "创建人", minWidth: 112 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", minWidth: 112 },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", minWidth: 112 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", minWidth: 112 },
  { colId: "id", field: "id", headerName: "主键", minWidth: 112, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", minWidth: 112, hide: true },
];

function rowId(p: GetRowIdParams<Thr3010HlGy>) {
  return String(p.data?.id ?? "");
}

/* ---------- DataBind（原 FrmHR3610_Load / btnQuery_Click） ---------- */
async function query() {
  loading.value = true;
  try {
    const list = (await hR3610Api.getThr3010HlGys(cSgCode.value.trim() || undefined)) ?? [];
    /* 查询回填整体换引用（行内增删用 push/remove，不换引用） */
    trackList.value = new TrackableList<Thr3010HlGy>(list);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
onMounted(query);

/* ---------- 添加（原 btnAdd_Click：新行主键 NextStrId，区间默认 ≤E≤，数值默认 0） ---------- */
function onAdd() {
  const draft: Thr3010HlGy = {
    id: NextStrId(),
    cSgCodeType: "",
    cSgCode: "",
    nThickSwitch: EqualsFlag.Default,
    nDownTempSwitch: EqualsFlag.Default,
    nHlHourSwitch: EqualsFlag.Default,
    nThickMin: 0,
    nThickMax: 0,
    nDownTempMin: 0,
    nDownTempMax: 0,
    nHlHourPlan: 0,
    nHlHourMin: 0,
    nHlHourMax: 0,
    selected: false,
  };
  trackList.value.add(draft);
  const stored = trackList.value[trackList.value.length - 1];
  if (stored) api.value?.applyTransaction({ add: [stored] });
}

/* ---------- 删除（原 btnDel_Click：移除当前行，不落库直到保存） ---------- */
function onDelete() {
  const row = api.value?.getSelectedRows()[0] as Thr3010HlGy | undefined;
  if (!row) {
    toast("请先勾选要删除的工艺行", 2000, "warn");
    return;
  }
  trackList.value.remove((r) => r.id === row.id);
  api.value?.applyTransaction({ remove: [row] });
  toast("已从列表移除，点击「保存」后生效", 2000, "info");
}

/* ---------- 保存（原 btnSave_Click：ToSaveChangesData → SaveChangeThr3010HlGy） ---------- */
const confirmOpen = ref(false);
function onSave() {
  const data = trackList.value.SaveChangesData;
  if (data.addedItems.length === 0 && data.changedItems.length === 0 && data.deletedItems.length === 0) return;
  const empty = [...data.addedItems, ...data.changedItems].filter((x) => !x.cSgCode);
  if (empty.length > 0) {
    toast("钢种不能为空", 2000, "warn");
    return;
  }
  confirmOpen.value = true;
}
async function doSave() {
  confirmOpen.value = false;
  loading.value = true;
  try {
    await hR3610Api.saveChangeThr3010HlGy(trackList.value.SaveChangesData);
    toast("数据提交成功", 2000, "success");
    await query();
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="cSgCode" placeholder="钢种" class="w-40 shrink-0" @keydown.enter="query" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="ml-auto shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">缓冷工艺</span>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="trackList"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :get-row-id="rowId"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
    <Dialog v-model:visible="confirmOpen" header="保存确认" :modal="true" class="w-[26rem]" :closable="true">
      <p class="text-body">确定要保存修改吗？</p>
      <div class="mt-4 flex items-center justify-end gap-2">
        <Button variant="outlined" @click="confirmOpen = false">取消</Button>
        <Button autofocus severity="contrast" @click="doSave">保存</Button>
      </div>
    </Dialog>
  </div>
</template>
