<script setup lang="ts">
/** 对应 FrmDM1040（换辊实绩）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1040
 *  已接入：dM1040Api.queryTdm1040s（原 Svc<IDM1040AppService>.Proxy.QueryTdm1040s(DtoQueryTdm1030)）
 *    / dM1040Api.updateTdm1040(trackList.SaveChangesData)（原 GetTrackingList + ToSaveChangesData）
 *    / systemKeyValueApi.getSysKvListByGroup("010100:ROLLTYPE" | "010100:STANDUSEFLAG")
 *    （原 colNRollerType/colCStandNo.SetCodeFormatterAsync，同时灌轧辊类型下拉）
 *  待接入：无
 *  偏差：Selected 列原即在 Designer 中隐藏，勾选/焦点均无业务含义，故不提供复选框列；
 *    行内编辑仅开放原 OptionsColumn.ReadOnly=false 的列（辊号/机架号/轧辊类型/换辊序号只读） */

import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  CellValueChangedEvent,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  ValueFormatterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { TrackableList } from "@/api/common/trackableList";
import { systemKeyValueApi } from "@/api/admin/request";
import { dM1040Api, type DtoQueryTdm1030, type Tdm1040, type TimeRange } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 时间（原 ucTimeRange1，默认 [本月1日, 明天0点]） ---------- */
function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const now = new Date();
  return [
    new Date(now.getFullYear(), now.getMonth(), 1),
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
  ];
}
function toTimeRange(list: Date[] | null): TimeRange | undefined {
  if (!list || list.length < 2) return undefined;
  return { min: isoLocal(list[0]), max: isoLocal(list[list.length - 1]) };
}

/* ---------- KV 字典 ---------- */
type KvOption = { label: string; value: string };
const rollTypeOptions = ref<KvOption[]>([]);
const kvRollType = new Map<string, string>();
const kvStand = new Map<string, string>();
const kvFmt = (m: Map<string, string>) => (p: ValueFormatterParams) =>
  m.get(String(p.value ?? "")) ?? String(p.value ?? "");
async function loadKv(group: string, map: Map<string, string>): Promise<KvOption[]> {
  const list = (await systemKeyValueApi.getSysKvListByGroup(group)) ?? [];
  const options = [...list]
    .sort((a, b) => String(a.cOrder ?? "").localeCompare(String(b.cOrder ?? "")))
    .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
  for (const o of options) map.set(o.value, o.label);
  return options;
}

/* ---------- 查询条件（原 txtRollerNo / comRollerType / ucTimeRange1，均走 DtoQueryTdm1030） ---------- */
const input = reactive({
  cRollerNo: "",
  nRollerType: null as string | null,
  dates: defaultRange() as Date[] | null,
});

/* ---------- 表格（gridView1 / Tdm1040，TrackableList 行内编辑） ---------- */
const trackList = shallowRef<TrackableList<Tdm1040>>(new TrackableList<Tdm1040>());
const loading = ref(false);
const api = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function getRowId(p: GetRowIdParams) {
  return String((p.data as Tdm1040).id ?? "");
}
function onCellValueChanged(e: CellValueChangedEvent) {
  api.value?.refreshCells({ rowNodes: e.node ? [e.node] : undefined, force: true });
}

const numEditable = { editable: true, cellEditor: "agNumberCellEditor" } as const;
const colDefs: ColDef[] = [
  { colId: "cRollerNo", field: "cRollerNo", headerName: "辊号", width: 130 },
  { colId: "cStandNo", field: "cStandNo", headerName: "机架号", width: 100, valueFormatter: kvFmt(kvStand) },
  {
    colId: "nRollerType",
    field: "nRollerType",
    headerName: "轧辊类型",
    width: 100,
    valueFormatter: kvFmt(kvRollType),
  },
  { colId: "dUpTime", field: "dUpTime", headerName: "上机时间", width: 150, editable: true },
  { colId: "dDownTime", field: "dDownTime", headerName: "下机时间", width: 150, editable: true },
  {
    colId: "nAllRollTime",
    field: "nAllRollTime",
    headerName: "总轧制时间min",
    width: 112,
    minWidth: 105,
    ...numEditable,
  },
  { colId: "nRollLen", field: "nRollLen", headerName: "轧制长度m", width: 112, minWidth: 105, ...numEditable },
  { colId: "nRollWgt", field: "nRollWgt", headerName: "轧制吨数kg", width: 112, minWidth: 105, ...numEditable },
  { colId: "nAllRollRow", field: "nAllRollRow", headerName: "总轧制道次", width: 105, ...numEditable },
  { colId: "nRollNum", field: "nRollNum", headerName: "轧制块数", width: 96, ...numEditable },
  { colId: "cStartPlateNo", field: "cStartPlateNo", headerName: "起始钢板号", width: 130, editable: true },
  { colId: "cEndPlateNo", field: "cEndPlateNo", headerName: "结束钢板号", width: 130, editable: true },
  { colId: "cReason", field: "cReason", headerName: "换辊原因", width: 140, editable: true },
  { colId: "nOrderNum", field: "nOrderNum", headerName: "换辊序号", width: 96 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 100, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 110, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 60, hide: true },
];

/* ---------- 数据绑定（原 DataBind） ---------- */
async function onQuery() {
  loading.value = true;
  try {
    const list = await dM1040Api.queryTdm1040s({
      cRollerNo: input.cRollerNo.trim() || null,
      nRollerType: input.nRollerType,
      timeRange: toTimeRange(input.dates),
    } satisfies DtoQueryTdm1030);
    trackList.value = new TrackableList<Tdm1040>(list ?? []);
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* ---------- ShowYesNo 受控确认 ---------- */
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

/* ---------- 按钮（stackPanel1 原序：查询 保存） ---------- */
function onSave() {
  const diff = trackList.value.SaveChangesData;
  if (diff.changedItems.length === 0) return;
  askConfirm("是否保存当前修改数据！", async () => {
    loading.value = true;
    try {
      await dM1040Api.updateTdm1040(diff);
      toast("数据提交成功！", 2000, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    } finally {
      loading.value = false;
    }
  });
}

onMounted(async () => {
  try {
    const [rollType, stand] = await Promise.all([
      loadKv("010100:ROLLTYPE", kvRollType),
      loadKv("010100:STANDUSEFLAG", kvStand),
    ]);
    rollTypeOptions.value = rollType;
    api.value?.refreshCells({ force: true });
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 LabelControl + txtRollerNo / comRollerType / ucTimeRange1） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轧辊号</label>
        <InputText v-model="input.cRollerNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轧辊类型</label>
        <Select
          v-model="input.nRollerType"
          :options="rollTypeOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
        <DatePicker
          v-model="input.dates"
          selection-mode="range"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          placeholder="开始 至 结束"
          class="min-w-0 flex-1"
        />
      </div>
    </div>

    <!-- 工具栏（stackPanel1 原序：查询 保存） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">换辊实绩（{{ trackList.length }}）</span>
    </div>
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="trackList"
        :get-row-id="getRowId"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @cell-value-changed="onCellValueChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" autofocus @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
