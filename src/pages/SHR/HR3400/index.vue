<script setup lang="ts">
/** 对应 FrmHR3400（双边剪作业）：DDH.Winforms.SHR.Forms.FrmHR3400
 *  已接入：hR3400Api.queryList / hR3000Api.queryThr3030s
 *  待接入：二级弹窗 FrmHR3410（切边操作，确认后回刷计划材料明细）
 *  偏差：colCTrimFlag 原走 KV 字典翻译（本页无数值列，不涉及）；产线固定取菜单 cQueryString（ZG01） */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import {
  hR3000Api,
  hR3400Api,
  Thr3010JqStatusEnum,
  type Thr3030,
  type Thr3040,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { parts: menuQs } = useMenuQuery();
const cLineCode = menuQs[0] ?? "ZG01";

/* ---------- 时间范围（原 ucTimeRange1，默认 昨天 0 点 ~ 7 天后当前时刻） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function defaultRange(): Date[] {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  a.setDate(a.getDate() - 1);
  const b = new Date();
  b.setDate(b.getDate() + 7);
  return [a, b];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 查询条件（DtoQueryThr3000，剪切状态固定待剪切） ---------- */
const input = reactive({
  cOrderNo: "",
  cBatchNo: "",
  cStove: "",
  cSgCode: "",
  cSgStd: "",
  cSpec: "",
  plateNo: "",
  dates: defaultRange() as Date[] | null,
});

/* ---------- 上表：计划材料明细（gridView1 / Thr3040） ---------- */
const rows1 = ref<Thr3040[]>([]);
const loading1 = ref(false);
const grid1Api = ref<GridApi | null>(null);
const current1 = ref<Thr3040 | null>(null);
function onGrid1Ready(e: GridReadyEvent) { grid1Api.value = e.api; }
function onGrid1SelectionChanged() {
  const row = (grid1Api.value?.getSelectedRows()[0] as Thr3040 | undefined) ?? null;
  current1.value = row;
  void dataBind3030(row);
}

/* ---------- 下表：剪切计划（gridView2 / Thr3030） ---------- */
const rows2 = ref<Thr3030[]>([]);
const loading2 = ref(false);
const grid2Api = ref<GridApi | null>(null);
function onGrid2Ready(e: GridReadyEvent) { grid2Api.value = e.api; }

const colDefs1: ColDef[] = [
  { colId: "cBatchOrder", field: "cBatchOrder", headerName: "组批号", width: 112 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "剪切状态", width: 112, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
];

const colDefs2: ColDef[] = [
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "子板号", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "订单规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "计划厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "计划宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "计划长度", width: 112 },
  { colId: "cId", field: "cId", headerName: "ID", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112, hide: true },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
];

async function dataBind3030(thr3040: Thr3040 | null) {
  if (!thr3040) {
    rows2.value = [];
    return;
  }
  loading2.value = true;
  try {
    const list = (await hR3000Api.queryThr3030s({
      c3040Id: thr3040.id,
      cChange: thr3040.cChange,
      cMxId: thr3040.cMxId,
    })) ?? [];
    rows2.value = list;
    requestAnimationFrame(() => grid2Api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading2.value = false;
  }
}

async function onQuery() {
  loading1.value = true;
  try {
    const list = (await hR3400Api.queryList({
      cLineCode,
      cOrderNo: input.cOrderNo.trim() || undefined,
      cBatchNo: input.cBatchNo.trim() || undefined,
      cStove: input.cStove.trim() || undefined,
      cSgCode: input.cSgCode.trim() || undefined,
      cSgStd: input.cSgStd.trim() || undefined,
      cSpec: input.cSpec.trim() || undefined,
      plateNo: input.plateNo.trim() || undefined,
      nJqStatus: Thr3010JqStatusEnum.Wait,
      dCreateTimeRange: toTimeRange(input.dates),
    })) ?? [];
    rows1.value = list;
    current1.value = null;
    rows2.value = [];
    requestAnimationFrame(() => grid1Api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading1.value = false;
  }
}

function onAdd() {
  const row = current1.value;
  if (!row) return;
  // 原 FrmHR3410：切边弹窗（选子板计划提交剪切实绩，OK 后回刷），待接入
  toast("切边弹窗 FrmHR3410 待接入", 2500, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1 八条件） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">规格</label>
        <InputText v-model="input.cSpec" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢板号</label>
        <InputText v-model="input.plateNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
        <DatePicker v-model="input.dates" selection-mode="range" :manual-input="false" date-format="yy-mm-dd"
          show-time hour-format="24" show-icon placeholder="开始 至 结束" class="min-w-0 flex-1" />
      </div>
    </div>
    <!-- 工具栏（原 stackPanel1：查询/切边） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading1" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">切边</Button>
    </div>

    <!-- 上下主子表：原 splitContainerControl1 556/900 ≈ 62% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="62" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">计划材料明细</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs1" :row-data="rows1"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="loading1"
            @grid-ready="onGrid1Ready" @selection-changed="onGrid1SelectionChanged"
            @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">剪切计划</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="colDefs2" :row-data="rows2"
            :pagination="false" :animate-rows="false" :loading="loading2"
            @grid-ready="onGrid2Ready" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
