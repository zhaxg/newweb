<script setup lang="ts">
/** 对应 FrmHR5200_JC（棒材剔炉作业）：DDH.Winforms.SHR.Forms.ThrBar.FrmHR5200_JC
 *  已接入：tPa1000Api.queryLines / hR5200JCTLApi.getListAsync1 / getListAsync2 / outFur / canleOutFur / furOutAsync / canleHR5200
 *  待接入：无
 *  偏差：出炉/剔炉/撤销动作原用固定 QueryString 产线，web 侧随下拉当前值提交（产线默认值取菜单 cQueryString） */

import { onMounted, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import {
  hR5200JCTLApi,
  tPa1000Api,
  ThrLogJcEnum,
  type QueryHR5200_JCDto,
  type Thr5200,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 时间范围（原 ucTimeRange1/2，默认 昨天 0 点 ~ 明天 0 点） ---------- */
function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function dayShift(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}
function defaultRange(): Date[] {
  return [dayShift(-1), dayShift(1)];
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}

/* ---------- 产线下拉（原 txtLineCode，ITpa1000AppService.QueryLines；默认产线 = 菜单 cQueryString） ---------- */
const { parts: menuQs } = useMenuQuery();
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string>(menuQs[0] ?? "ZG03");

/* ---------- 查询条件 ---------- */
const stove1 = ref("");
const pieceNo1 = ref("");
const dates1 = ref<Date[] | null>(defaultRange());
const stove2 = ref("");
const pieceNo2 = ref("");
const dates2 = ref<Date[] | null>(defaultRange());
const reason = ref("");
const nQua = ref<number>(1);

/* ---------- 上表：可剔炉材料（gridView1 / QueryHR5200_JCDto） ---------- */
const topRows = ref<QueryHR5200_JCDto[]>([]);
const topLoading = ref(false);
const topApi = ref<GridApi | null>(null);
const topCurrent = ref<QueryHR5200_JCDto | null>(null);
function onTopReady(e: GridReadyEvent) {
  topApi.value = e.api;
}
function onTopSelectionChanged() {
  topCurrent.value = (topApi.value?.getSelectedRows()[0] as QueryHR5200_JCDto | undefined) ?? null;
}

/* ---------- 下表：剔炉记录（gridView2 / Thr5200，Selected 勾选=行选择） ---------- */
const bottomRows = ref<Thr5200[]>([]);
const bottomLoading = ref(false);
const bottomApi = ref<GridApi | null>(null);
function onBottomReady(e: GridReadyEvent) {
  bottomApi.value = e.api;
}

/* ---------- 列定义（列集/顺序按 Designer VisibleIndex） ---------- */
const logTypeFmt = (p: ValueFormatterParams) =>
  (({ 10: "剔炉", 20: "轧废", 30: "撤销" }) as Record<string, string>)[String(p.value)] ?? "";
const shiftFmt = (p: ValueFormatterParams) =>
  (({ 1: "早", 2: "中", 3: "夜" }) as Record<string, string>)[String(p.value)] ?? "";
const groupFmt = (p: ValueFormatterParams) =>
  (({ A: "甲", B: "乙", C: "丙", 0: "甲", 1: "乙", 2: "丙" }) as Record<string, string>)[String(p.value)] ?? "";

const topColDefs: ColDef[] = [
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "nFinishQua", field: "nFinishQua", headerName: "完成支数", width: 112 },
  { colId: "nFinishWgt", field: "nFinishWgt", headerName: "完成重量", width: 112 },
  { colId: "nQuaTL", field: "nQuaTL", headerName: "剔炉支数", width: 112 },
  { colId: "nWgtTL", field: "nWgtTL", headerName: "剔炉重量", width: 112 },
];

const bottomColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "件次号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nThick", field: "nThick", headerName: "厚度", width: 112 },
  { colId: "nWidth", field: "nWidth", headerName: "宽度", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "长度", width: 112 },
  { colId: "nNum", field: "nNum", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "nType", field: "nType", headerName: "记录类型", width: 112, valueFormatter: logTypeFmt },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 112 },
  { colId: "cShift", field: "cShift", headerName: "班次", width: 112, valueFormatter: shiftFmt },
  { colId: "cGroup", field: "cGroup", headerName: "班组", width: 112, valueFormatter: groupFmt },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120 },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
];

/* ---------- 查询 ---------- */
async function dataBind() {
  topLoading.value = true;
  try {
    const list =
      (await hR5200JCTLApi.getListAsync1({
        cLineCode: lineCode.value || undefined,
        cStove: stove1.value.trim() || undefined,
        cPieceNo: pieceNo1.value.trim() || undefined,
        timeRange: toTimeRange(dates1.value),
      })) ?? [];
    topRows.value = list;
    topCurrent.value = null;
    requestAnimationFrame(() => topApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    topLoading.value = false;
  }
}

async function dataBindThrLogJc() {
  bottomLoading.value = true;
  try {
    const list =
      (await hR5200JCTLApi.getListAsync2({
        cLineCode: lineCode.value || undefined,
        cStove: stove2.value.trim() || undefined,
        cPieceNo: pieceNo2.value.trim() || undefined,
        timeRange: toTimeRange(dates2.value),
      })) ?? [];
    bottomRows.value = list;
    requestAnimationFrame(() => bottomApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    bottomLoading.value = false;
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

/* ---------- 出炉 / 撤销出炉 / 剔炉 / 撤销剔炉 ---------- */
async function doOutFur() {
  const cur = topCurrent.value;
  if (!cur) return;
  try {
    await hR5200JCTLApi.outFur({
      cLineCode: lineCode.value,
      nQuaTL: nQua.value ?? 0,
      cStoveNo: cur.cStove,
      cSgCode: cur.cSgCode,
      cSpec: cur.cSpec,
      nQua: cur.nQua ?? 0,
    });
    await dataBind();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnOut() {
  const cur = topCurrent.value;
  if (!cur) return;
  const n = nQua.value ?? 0;
  if (n <= 0 || n > (cur.nQua ?? 0)) {
    toast("出炉支数必须大于0且小于该炉剩余支数！", 2000, "warn");
    return;
  }
  askConfirm(`确认炉号：${cur.cStove} 出炉${n} 条数据？`, doOutFur);
}

async function doCanleOutFur() {
  const cur = topCurrent.value;
  if (!cur) return;
  try {
    await hR5200JCTLApi.canleOutFur({
      cLineCode: lineCode.value,
      nQuaTL: nQua.value ?? 0,
      cStoveNo: cur.cStove,
      cSgCode: cur.cSgCode,
      cSpec: cur.cSpec,
      nQua: cur.nQua ?? 0,
    });
    await dataBind();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnCanleCL() {
  const cur = topCurrent.value;
  if (!cur) return;
  const n = nQua.value ?? 0;
  if (n <= 0 || n > (cur.nFinishQua ?? 0)) {
    toast("撤销出炉支数必须大于0且小于该炉完成支数！", 2000, "warn");
    return;
  }
  askConfirm(`确认撤销炉号：${cur.cStove} 出炉${n} 条数据？`, doCanleOutFur);
}

async function doFurOut() {
  const cur = topCurrent.value;
  if (!cur) return;
  try {
    await hR5200JCTLApi.furOutAsync({
      cLineCode: lineCode.value,
      nQuaTL: nQua.value ?? 0,
      reason: reason.value.trim(),
      cStoveNo: cur.cStove,
      cSgCode: cur.cSgCode,
      cSpec: cur.cSpec,
      nQua: cur.nQua ?? 0,
    });
    toast("剔炉成功！", 2000, "success");
    await dataBind();
    await dataBindThrLogJc();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnTL() {
  const cur = topCurrent.value;
  if (!cur) return;
  const n = nQua.value ?? 0;
  if (n <= 0 || n > (cur.nQua ?? 0)) {
    toast("剔炉支数必须大于0且小于该炉剩余支数！", 2000, "warn");
    return;
  }
  if (!reason.value.trim()) {
    toast("请输入剔炉原因！", 2000, "warn");
    return;
  }
  askConfirm(`确认炉号：${cur.cStove} 剔炉${n} 条数据？`, doFurOut);
}

async function doCanleTL() {
  const sel = (bottomApi.value?.getSelectedRows() ?? []) as Thr5200[];
  const pieceNos = sel.map((x) => x.cPieceNo).filter((x): x is string => !!x);
  try {
    await hR5200JCTLApi.canleHR5200(ThrLogJcEnum.Tl, pieceNos);
    await dataBind();
    await dataBindThrLogJc();
  } catch {
    /* 拦截层已 toast */
  }
}
function btnCanleTL() {
  if (bottomRows.value.length === 0) return;
  const sel = (bottomApi.value?.getSelectedRows() ?? []) as Thr5200[];
  if (sel.length === 0) {
    toast("请选择至少1条数据！", 2000, "warn");
    return;
  }
  askConfirm("是否确定撤销选择数据的剔炉记录？", doCanleTL);
}

onMounted(async () => {
  try {
    const devices = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = devices.map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 上下主子表：原 splitContainerControl1 SplitterPosition=608/988 ≈ 62% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="62" :minSize="25" class="flex flex-col overflow-hidden">
        <!-- stackPanel1：产线/时间范围/炉号/件次号 + 查询 -->
        <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
            <Select
              v-model="lineCode"
              :options="lineOptions"
              option-label="label"
              option-value="value"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
            <DatePicker
              v-model="dates1"
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
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
            <InputText v-model="stove1" class="min-w-0 flex-1" @keydown.enter="dataBind" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
            <InputText v-model="pieceNo1" class="min-w-0 flex-1" @keydown.enter="dataBind" />
          </div>
          <div class="flex min-w-0 items-center gap-1">
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="topLoading" @click="dataBind">
              <IconSearch class="h-3 w-3" />查询
            </Button>
          </div>
        </div>
        <!-- stackPanel2 + 表标题：按钮/条件左、标题右，同一 h-9（省一条标题栏） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <label class="w-8 shrink-0 text-xs text-muted-foreground">原因</label>
          <InputText v-model="reason" class="w-48 shrink-0" />
          <label class="ml-2 shrink-0 text-xs text-muted-foreground">支数</label>
          <!-- 定宽容器 + fluid：非 fluid 时 input 默认 intrinsic 宽 > w-28，溢出后被右侧按钮叠画 -->
          <div class="w-28 shrink-0">
            <InputNumber v-model="nQua" :min="0" :max="99999" :show-buttons="false" :use-grouping="false" fluid />
          </div>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnOut">出炉</Button>
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="btnCanleCL">撤销出炉</Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="btnTL">剔炉</Button>
          <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground">可剔炉材料</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="topColDefs"
            :row-data="topRows"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false"
            :animate-rows="false"
            :loading="topLoading"
            @grid-ready="onTopReady"
            @selection-changed="onTopSelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <!-- stackPanel3 + 表标题：条件/按钮左、标题右，同一 h-9（省一条标题栏） -->
        <div class="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">时间范围</label>
          <DatePicker
            v-model="dates2"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            placeholder="开始 至 结束"
            class="w-72 shrink-0"
          />
          <label class="shrink-0 text-xs text-muted-foreground">件次号</label>
          <InputText v-model="pieceNo2" class="w-36 shrink-0" @keydown.enter="dataBindThrLogJc" />
          <label class="shrink-0 text-xs text-muted-foreground">炉号</label>
          <InputText v-model="stove2" class="w-36 shrink-0" @keydown.enter="dataBindThrLogJc" />
          <Button
            variant="outlined"
            class="shrink-0 whitespace-nowrap"
            :loading="bottomLoading"
            @click="dataBindThrLogJc"
          >
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="btnCanleTL">
            撤销剔炉
          </Button>
          <span class="ml-auto shrink-0 text-xs font-medium text-muted-foreground">剔炉记录</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="bottomColDefs"
            :row-data="bottomRows"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            :loading="bottomLoading"
            @grid-ready="onBottomReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

    <!-- ShowYesNo 受控确认 -->
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
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
