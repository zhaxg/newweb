<script setup lang="ts">
/** 对应 FrmBxGYImport（规范挂靠组合 HR00 / 加热轧制要求 HR02 / 剪切要求 HR03 共用）：DDH.Winforms.Forms.FrmBxGYImport
 *  基类 FrmTableView（Hmx 表配置视图）：列由 queryTableConfig(TableColumnSettings) 动态生成（CProName 表头 / CValue{NSeq} 字段 / CVisible!=Y 以 hide 迁入 / 审计4列固定追加）
 *  已接入：tableConfigApi.queryTableConfig / queryData / save（TrackableList 跟踪 + DataStatus）；JSON导入 → removeAllAndSave
 *  待接入：Excel 模板导出（原 JSON导入 先弹 FrmOpenExcel(typeof(ImportHR2000Dto)) 且结果未用，按既有「不引 xlsx 依赖」决策不迁）
 *  偏差：原「选择」按钮在无参构造中已隐藏（chooser 模式专用），不渲染；枚举/字典/日期编辑器退化为文本（原 DefaultTableViewLoader 运行时按 NSourceType 分支取值域，值域来源未接） */
import { computed, onMounted, ref, shallowRef } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Dialog from "primevue/dialog";
import { IconDeviceFloppy, IconFileImport, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  tableConfigApi,
  type TsTablePro,
  type TsTableProValDto,
  type TsTableSettingDto,
} from "@/api/mes4ddh/ddh.swagger";
import { DataStatusEnum, ValidFlag, type TsTableProVal } from "@/api/mes4ddh/sqm.swagger";
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { raw: tableCode } = useMenuQuery(); // cQueryString：TQMTHR02 / TQMTHR03 / TqmHR00

const setting = ref<TsTableSettingDto | null>(null);
const colDefs = ref<ColDef[]>([]);
const trackList = shallowRef<TrackableList<TsTableProValDto>>(new TrackableList<TsTableProValDto>());
const keyword = ref("");
const querying = ref(false);
const saving = ref(false);
const gridApi = ref<GridApi | null>(null);
const saveEnabled = computed(() => setting.value?.tableSetting?.cValidFlag === ValidFlag.Valid);

const fitWidth = (name?: string | null) => Math.max((name ?? "").length * 13 + 60, 80);

/* 原 DefaultTableViewLoader.InitControl：按 TableColumnSettings 建列（NSeq=顺序，CVisible 控显隐），审计4列固定追加在最大 NSeq 之后 */
function buildColumns(s: TsTableSettingDto) {
  const props = [...(s.tableColumnSettings ?? [])]
    .filter((p) => p.nSeq != null)
    .sort((a, b) => (a.nSeq ?? 0) - (b.nSeq ?? 0));
  const valueCols: ColDef[] = props.map((p) => ({
    field: `cValue${p.nSeq}`,
    headerName: p.cProName ?? "",
    width: fitWidth(p.cProName),
    hide: p.cVisible !== "Y",
    editable: p.cVisible === "Y",
    cellEditor: p.nSourceType === 1 ? "agNumberCellEditor" : undefined,
  }));
  const auditCols: ColDef[] = [
    { field: "creator", headerName: "创建人", width: 99, editable: false },
    { field: "createTime", headerName: "创建时间", width: 138, editable: false },
    { field: "lastModifier", headerName: "最后修改人", width: 125, editable: false },
    { field: "lastModifyTime", headerName: "最后修改时间", width: 138, editable: false },
  ];
  colDefs.value = [...valueCols, ...auditCols];
}
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function bindData() {
  querying.value = true;
  try {
    const list = (await tableConfigApi.queryData(tableCode || undefined, [keyword.value.trim()])) ?? [];
    trackList.value = new TrackableList<TsTableProValDto>(list);
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(async () => {
  if (!tableCode) return;
  try {
    setting.value = (await tableConfigApi.queryTableConfig(tableCode)) ?? null;
    if (setting.value?.tableSetting == null) {
      toast(`表配置不能为空`, 2500, "error"); // 原 InitView：MsgBox.ShowError("表配置不能为空")
      return;
    }
    buildColumns(setting.value);
  } catch {
    /* 拦截层已 toast */
    return;
  }
  await bindData(); // 原 Load 末尾 btnQuery_Click(null, null)
});

/* ---------- 原 btnAdd/btnDel/btnSave ---------- */
function onAdd() {
  const draft: TsTableProValDto = {
    id: NextStrId(),
    cTbCode: tableCode || null,
    cValue0: keyword.value.trim() || null,
  };
  trackList.value.push(draft);
  const stored = trackList.value[trackList.value.length - 1] as TsTableProValDto;
  gridApi.value?.applyTransaction({ add: [stored] });
}
function onDelete() {
  const sel = (gridApi.value?.getSelectedRows() ?? []) as TsTableProValDto[];
  if (!sel.length) return;
  const ids = new Set(sel.map((r) => r.id ?? ""));
  trackList.value.remove((r) => ids.has(r.id ?? ""));
  gridApi.value?.applyTransaction({ remove: sel });
}

/* ShowYesNo(cusGridControl.SaveValidate())：无变更 → 抛「没有数据需要保存，请确认」；有变更 → 「当前操作共计：新增N组，…是否确认保存?」 */
function onSave() {
  const sd = trackList.value.SaveChangesData;
  const { addedItems, changedItems, deletedItems } = sd;
  if (!addedItems.length && !changedItems.length && !deletedItems.length) {
    toast("没有数据需要保存，请确认", 2500, "error");
    return;
  }
  const parts =
    (addedItems.length ? `新增${addedItems.length}组，` : "") +
    (changedItems.length ? `修改${changedItems.length}组，` : "") +
    (deletedItems.length ? `删除${deletedItems.length}组，` : "");
  askConfirm(`当前操作共计：${parts}是否确认保存?`, async () => {
    const payload: TsTableProValDto[] = [
      ...addedItems.map((x) => ({ ...x, dataStatus: DataStatusEnum.Add })),
      ...changedItems.map((x) => ({ ...x, dataStatus: DataStatusEnum.Update })),
      ...deletedItems.map((x) => ({ ...x, dataStatus: DataStatusEnum.Delete })),
    ];
    saving.value = true;
    try {
      await tableConfigApi.save(payload);
      await bindData();
    } catch {
      /* 拦截层已 toast */
    } finally {
      saving.value = false;
    }
  });
}

/* ShowYesNo 受控确认 */
const confirmOpen = ref(false);
const confirmMsg = ref("");
let confirmAction: (() => Promise<void>) | null = null;
function askConfirm(msg: string, action: () => Promise<void>) {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmOpen.value = true;
}
async function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  if (act) await act();
}

/* ---------- 原 btnImportByJson_Click（FrmBxGYImport）：读 JSON → ToTableProVlaue → 确认 → RemoveAllAndSave ---------- */
const fileInput = ref<HTMLInputElement | null>(null);
const ALLOWED = ["TQMTHR02", "TQMTHR03", "TqmHR00"];
const pickJson = () => fileInput.value?.click();

function toJsonRows(list: Record<string, unknown>[]): TsTableProVal[] {
  const props = (setting.value?.tableColumnSettings ?? []).filter((p) => p.nSeq != null && p.cProCode);
  return list.map((r) => {
    const row: TsTableProVal = {
      id: (r.Id as string) || NextStrId(),
      cTbCode: tableCode || null,
    };
    for (const p of props) {
      const code = p.cProCode as string;
      // 原反射 GetProperty(CProCode) → 槽位 CValue{NSeq}；兼容 Pascal/camel 两种 JSON 键
      const v = r[code] ?? r[code[0].toLowerCase() + code.slice(1)];
      (row as Record<string, unknown>)[`cValue${p.nSeq}`] = v == null ? null : String(v);
    }
    row.creator = (r.Creator as string) ?? null;
    row.createTime = (r.CreateTime as string) ?? null;
    row.lastModifier = (r.LastModifier as string) ?? null;
    row.lastModifyTime = (r.LastModifyTime as string) ?? null;
    return row;
  });
}
async function onJsonFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  if (!ALLOWED.includes(tableCode)) {
    toast(`未指定${tableCode}序列化数据源`, 2500, "error");
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    toast("JSON文件解析失败", 2500, "error");
    return;
  }
  if (!Array.isArray(parsed)) {
    toast("JSON文件解析失败", 2500, "error");
    return;
  }
  const values = toJsonRows(parsed as Record<string, unknown>[]);
  askConfirm(`确定删除现有数据，重新导入？数量${values.length}`, async () => {
    try {
      await tableConfigApi.removeAllAndSave(values);
      await bindData();
    } catch {
      /* 拦截层已 toast */
    }
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 原 stackPanel1：关键字 + 查询/添加/删除/保存（选择按钮无参构造已隐藏）+ 运行时新增「JSON导入」 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <label class="w-16 shrink-0 text-xs text-muted-foreground">关键字</label>
      <InputText v-model="keyword" class="w-48" @keydown.enter="bindData" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="bindData">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button
        variant="outlined"
        class="shrink-0 whitespace-nowrap"
        :disabled="!saveEnabled"
        :loading="saving"
        @click="onSave"
      >
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="pickJson">
        <IconFileImport class="h-3 w-3" />JSON导入
      </Button>
      <input ref="fileInput" type="file" accept=".json,application/json" class="hidden" @change="onJsonFile" />
      <span class="ml-auto text-xs text-muted-foreground">{{ tableCode }}</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="trackList"
        :get-row-id="(p: any) => String(p.data.id)"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(30rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" :loading="saving" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
