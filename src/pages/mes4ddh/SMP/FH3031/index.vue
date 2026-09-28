<script setup lang="ts">
/** 对应 FrmFH3031（质保书打印）：DDH.Winforms.SMP.Forms.FrmFH3031
 *  已接入：fh2000Api.getZcDetailLst、getZbsDetailLst（swagger 补）/ systemKeyValueApi A0000:ZBS_MODEL 模板下拉
 *  待接入：打印质保书 → FrmZbsView（二级弹窗，按件次号+模板打开）
 *  布局：查询区（12 项+开始/截止时间）→ 工具栏（查询+质保书模板+打印质保书）→ 左右 78%（材料明细多选 | 质保书记录） */
import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconPrinter, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { systemKeyValueApi } from "@/api/admin/request";
import { fh2000Api, type InputFh2000Dto, type QueryMatOutDto, type ZbsPrintDto } from "@/api/mes4ddh/smp.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 查询（原 InputFh2000Dto：Load 默认昨天 0 点 ~ 今天末） ---------- */
function defaultRange(): [Date, Date] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);
  const end = new Date();
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  end.setSeconds(end.getSeconds() - 1);
  return [start, end];
}

const q = reactive({
  cMatchId: "",
  cVehicleNo: "",
  cBillOfLadingNo: "",
  cShipName: "",
  creator: "",
  cPieceNo: "",
  cOrderCustCname: "",
  cSgCode: "",
  cInboundNo: "",
  cStove: "",
  dates: defaultRange() as Date[] | null,
});

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function buildQuery(): InputFh2000Dto {
  return {
    cMatchId: q.cMatchId.trim() || undefined,
    cVehicleNo: q.cVehicleNo.trim() || undefined,
    cBillOfLadingNo: q.cBillOfLadingNo.trim() || undefined,
    cShipName: q.cShipName.trim() || undefined,
    creator: q.creator.trim() || undefined,
    cPieceNo: q.cPieceNo.trim() || undefined,
    cOrderCustCname: q.cOrderCustCname.trim() || undefined,
    cSgCode: q.cSgCode.trim() || undefined,
    cInboundNo: q.cInboundNo.trim() || undefined,
    cStove: q.cStove.trim() || undefined,
    dBegin: q.dates?.[0] ? isoLocal(q.dates[0]) : undefined,
    dEnd: q.dates?.[1] ? isoLocal(q.dates[1]) : undefined,
  };
}

/* ---------- 左表：QueryMatOutDto 33 可见 + 5 隐藏 ---------- */
const rows = shallowRef<QueryMatOutDto[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
const focusMatNo = ref<string | null>(null);

const colDefs = ref<ColDef[]>([
  { field: "selected", headerName: "选择", hide: true },
  { field: "cMatchId", headerName: "物流号", width: 150 },
  { field: "cOrderCustCname", headerName: "订货客户名称", width: 150 },
  { field: "cVehicleNo", headerName: "车号", width: 120 },
  { field: "nStatus", headerName: "装车状态", width: 100 },
  { field: "cMatNo", headerName: "件次号", width: 150 },
  { field: "nMatCount", headerName: "件数", width: 80 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "nMatActWgt", headerName: "材料重量", width: 100 },
  { field: "nMatThick", headerName: "材料厚度", width: 90 },
  { field: "nMatWidth", headerName: "材料宽度", width: 90 },
  { field: "nMatLen", headerName: "材料长度", width: 90 },
  { field: "cTrimFlag", headerName: "切边方式", width: 90 },
  { field: "cWgtToler", headerName: "公差", width: 80 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 90 },
  { field: "cComplexDecideCode", headerName: "综判结果", width: 120 },
  { field: "cDetectResultCode", headerName: "探伤判定结果", width: 130 },
  { field: "cInboundNo", headerName: "入库标识", width: 100 },
  { field: "cShiftNo", headerName: "出库班次", width: 90 },
  { field: "cGroupNo", headerName: "出库班组", width: 90 },
  { field: "creator", headerName: "发货人", width: 100 },
  { field: "createTime", headerName: "发货时间", width: 150 },
  { field: "cShipName", headerName: "船名", width: 110 },
  { field: "cPort", headerName: "港口", width: 100 },
  { field: "nSelectMode", headerName: "PDA模式", width: 90 },
  { field: "cBillOfLadingNo", headerName: "提货单号", width: 140 },
  { field: "cTaskId", headerName: "任务号", width: 120 },
  { field: "cMatCode", headerName: "物料编码", width: 120 },
  { field: "cMatName", headerName: "物料名称", width: 140 },
  { field: "cRemark", headerName: "备注", width: 140 },
  { field: "cStockRoomNo", headerName: "库位号", width: 120 },
  { field: "cArer", headerName: "区域", width: 90 },
  { field: "cReserveField1", headerName: "钢板分类", width: 120 },
  { field: "cGcStd", headerName: "公差标准", hide: true },
  { field: "cTsStd", headerName: "探伤标准", hide: true },
  { field: "cSgStd", headerName: "执行标准", hide: true },
  { field: "cStove", headerName: "炉号", hide: true },
  { field: "cZStd", headerName: "Z性能标准", hide: true },
  { field: "id", headerName: "主键", hide: true },
]);

/* ---------- 右表：质保书记录 ---------- */
const zbsRows = shallowRef<ZbsPrintDto[]>([]);
const zbsApi = ref<GridApi | null>(null);
const zbsColDefs = ref<ColDef[]>([
  { field: "cPieceNo", headerName: "件次号", width: 130 },
  { field: "cZbsCode", headerName: "质保书编码", width: 130 },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 150 },
]);

/* ---------- 质保书模板下拉（原 cmbModel，KV A0000:ZBS_MODEL） ---------- */
const zbsModel = ref<string | null>(null);
const zbsModelOptions = ref<{ label: string; value: string }[]>([]);
async function loadModels() {
  try {
    const list = (await systemKeyValueApi.getSysKvListByGroup("A0000:ZBS_MODEL")) ?? [];
    zbsModelOptions.value = list
      .filter((x) => x.cCode != null)
      .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode! }));
  } catch {
    /* 拦截层已 toast；KV 缺省时保持空下拉 */
  }
}

function onGridReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onZbsReady(e: GridReadyEvent) {
  zbsApi.value = e.api;
}

/* 原 btnS_Click → GetZcDetailLst */
async function onQuery() {
  loading.value = true;
  try {
    const list = ((await fh2000Api.getZcDetailLst(buildQuery())) ?? []) as QueryMatOutDto[];
    rows.value = list;
    zbsRows.value = [];
    focusMatNo.value = null;
    api.value?.setGridOption("rowData", list);
    /* 原勾选列 Selected 字段：查询回填后按数据字段回灌行选择勾选态 */
    requestAnimationFrame(() => {
      api.value?.forEachNode((node) => node.setSelected(!!(node.data as QueryMatOutDto).selected));
      api.value?.autoSizeAllColumns();
    });
    if (!list.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

/* 原 gridView1_FocusedRowChanged → GetZbsDetailLst */
async function onSelectionChanged() {
  const node = api.value?.getSelectedNodes()[0];
  const row = (node?.data as QueryMatOutDto | undefined) ?? null;
  const matNo = row?.cMatNo ?? null;
  focusMatNo.value = matNo;
  if (!matNo) {
    zbsRows.value = [];
    zbsApi.value?.setGridOption("rowData", []);
    return;
  }
  try {
    const list = ((await fh2000Api.getZbsDetailLst(matNo)) ?? []) as ZbsPrintDto[];
    if (focusMatNo.value !== matNo) return;
    zbsRows.value = list;
    zbsApi.value?.setGridOption("rowData", list);
    requestAnimationFrame(() => zbsApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  }
}

/* 原 btnPrint_Click → FrmZbsView（占位）；勾选行 = row-selection 选中行（原「Selected 字段优先」逻辑并入） */
function onPrint() {
  const use = (api.value?.getSelectedRows() ?? []) as QueryMatOutDto[];
  if (!use.length) {
    toast("请选择材料号!", 2000, "warn");
    return;
  }
  const groups = new Set(use.map((x) => `${x.cSgCode}|${x.cSgStd}`));
  if (groups.size > 1) {
    toast("请选择同一个钢种/标准的材料操作！", 2000, "warn");
    return;
  }
  if (!zbsModel.value) {
    toast("请选择模版！", 2000, "warn");
    return;
  }
  toast("打印预览弹窗（FrmZbsView）待接入", 2500, "warn");
}

onMounted(() => {
  void loadModels();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：12 条件 + 开始/截止时间 + 查询） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">物流号</label>
        <InputText v-model="q.cMatchId" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">车号</label>
        <InputText v-model="q.cVehicleNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">提货单号</label>
        <InputText v-model="q.cBillOfLadingNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">船名</label>
        <InputText v-model="q.cShipName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">发货人</label>
        <InputText v-model="q.creator" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订货单位</label>
        <InputText v-model="q.cOrderCustCname" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="q.cInboundNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
        <DatePicker
          v-model="q.dates"
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

    <!-- 工具栏：查询 + 质保书模板 + 打印质保书（原 stackPanel2 并入查询按钮后） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
        <IconSearch class="h-3 w-3" />查 询
      </Button>
      <label class="ml-3 shrink-0 text-xs text-muted-foreground">质保书模板</label>
      <Select
        v-model="zbsModel"
        :options="zbsModelOptions"
        option-label="label"
        option-value="value"
        show-clear
        filter
        placeholder="选择模板"
        class="w-56 shrink-0"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onPrint">
        <IconPrinter class="h-3 w-3" />打印质保书
      </Button>
    </div>

    <!-- 左右（原 SplitterPosition 1150/1478≈78%） -->
    <Splitter class="min-h-0 flex-1">
      <SplitterPanel :size="78" :minSize="35" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">装车材料明细</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs"
            :row-data="rows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            :loading="loading"
            @grid-ready="onGridReady"
            @selection-changed="onSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="18" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">质保书记录</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="zbsColDefs"
            :row-data="zbsRows"
            :pagination="false"
            :animate-rows="false"
            @grid-ready="onZbsReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
