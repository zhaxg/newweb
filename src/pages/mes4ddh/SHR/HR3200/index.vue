<script setup lang="ts">
/** 对应 FrmHR3200（轧制作业）：DDH.Winforms.SHR.Forms.FrmHR3200
 *  已接入：hR3010Api.querySlabs / queryTiL2me021s / waste
 *  待接入：二级弹窗 FrmHR3210（轧制完成：录入轧制实绩后提交 finishRoll）
 *  说明：原「撤消完成」按钮 Designer Visible=false（画面不显示），未迁；撤销轧废走 waste 同族接口 cancelFinish，画面无入口 */

import { reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
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
  hR3010Api,
  Thr3010RollStatusEnum,
  Thr3010StatusEnum,
  type DtoThr3010,
  type TiL2me021,
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

/* ---------- 查询条件（DtoQueryThr3000，轧制状态默认待入轧） ---------- */
const input = reactive({
  cOrderNo: "",
  cBatchNo: "",
  cStove: "",
  cSgCode: "",
  cSgStd: "",
  nRollStatus: Thr3010RollStatusEnum.Wait as number,
  dates: defaultRange() as Date[] | null,
});
/* 原 comStatus：AddEnum(Thr3010RollStatusEnum) 去掉 已组批/切断/轧废 */
const statusOptions = [
  { label: "待入轧", value: Thr3010RollStatusEnum.Wait },
  { label: "轧制完成", value: Thr3010RollStatusEnum.FinishRoll },
];
const reason = ref("");

/* ---------- 上表：计划材料（gridView1 / DtoThr3010，勾选=Selected） ---------- */
const rows1 = ref<DtoThr3010[]>([]);
const loading1 = ref(false);
const grid1Api = ref<GridApi | null>(null);
const current1 = ref<DtoThr3010 | null>(null);
function onGrid1Ready(e: GridReadyEvent) {
  grid1Api.value = e.api;
}
function onGrid1SelectionChanged() {
  const rows = grid1Api.value?.getSelectedRows() as DtoThr3010[] | undefined;
  current1.value = rows?.[0] ?? null;
  void dataBindL2(current1.value);
}

/* ---------- 下表：轧制记录（gridView2 / TiL2me021） ---------- */
const rows2 = ref<TiL2me021[]>([]);
const loading2 = ref(false);
const grid2Api = ref<GridApi | null>(null);
function onGrid2Ready(e: GridReadyEvent) {
  grid2Api.value = e.api;
}

/* ---------- 列定义（列集/顺序按 Designer VisibleIndex） ---------- */
const l2StatusFmt = (p: ValueFormatterParams) => {
  const m: Record<string, string> = {
    [String(Thr3010StatusEnum.ZZ_UNDO)]: "轧制计划-待下发L2",
    [String(Thr3010StatusEnum.ZZ_SENDED_ERROR)]: "轧制计划-下发L2失败",
    [String(Thr3010StatusEnum.ZZ_SENDED)]: "轧制计划-已下发L2",
    [String(Thr3010StatusEnum.ZZ_RESERVED_ERROR)]: "轧制计划-L2反馈失败",
    [String(Thr3010StatusEnum.ZZ_RESERVED_SUCCESS)]: "轧制计划-L2反馈成功",
    [String(Thr3010StatusEnum.JQ_SENDED)]: "剪切计划-已下发L2",
    [String(Thr3010StatusEnum.JQ_SENDED_ERROR)]: "剪切计划-下发L2失败",
    [String(Thr3010StatusEnum.L2_DOWN)]: "L2-钢板下线",
    [String(Thr3010StatusEnum.L2_UP)]: "L2-钢板上线",
    [String(Thr3010StatusEnum.L2_DELETE)]: "L2计划删除",
  };
  return m[String(p.value)] ?? "";
};

const colDefs1: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线代码", width: 112 },
  { colId: "nOrder", field: "nOrder", headerName: "生产顺序号", width: 125 },
  { colId: "nL2Status", field: "nL2Status", headerName: "L2计划状态", width: 138, valueFormatter: l2StatusFmt },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "提料计划号", width: 120 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 112 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 112 },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "钢板号", width: 112 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "熔炼序号", width: 112 },
  { colId: "cSgCode", field: "cSgCode", headerName: "冶炼钢种", width: 112 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 112 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 112 },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 112 },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 112 },
  { colId: "nWgt", field: "nWgt", headerName: "重量", width: 112 },
  { colId: "cSgCodePlan", field: "cSgCodePlan", headerName: "计划钢种", width: 112 },
  { colId: "cSgStdPlan", field: "cSgStdPlan", headerName: "计划执行标准", width: 138 },
  { colId: "cSpecPlan", field: "cSpecPlan", headerName: "计划规格", width: 112 },
  { colId: "nLenPlan", field: "nLenPlan", headerName: "计划长度", width: 112 },
  { colId: "nQuaPlan", field: "nQuaPlan", headerName: "计划收料支数", width: 138 },
  { colId: "nWgtPlan", field: "nWgtPlan", headerName: "计划重量", width: 112 },
  { colId: "nWgtOrder", field: "nWgtOrder", headerName: "订单重量", width: 112 },
  { colId: "nRateLl", field: "nRateLl", headerName: "理论成材率", width: 125 },
  { colId: "nRateSj", field: "nRateSj", headerName: "实际成材率", width: 125 },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 112 },
  { colId: "nWidthWgt", field: "nWidthWgt", headerName: "边部余量", width: 112 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 112 },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 112 },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 112 },
  { colId: "cTol", field: "cTol", headerName: "公差", width: 112 },
  { colId: "cOverstepBl", field: "cOverstepBl", headerName: "短溢装比例", width: 125 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 112 },
  { colId: "cShape", field: "cShape", headerName: "形状代码", width: 112 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cOrderId", field: "cOrderId", headerName: "THR2000主键", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "THR3000主键", width: 150, hide: true },
  { colId: "cSlabId", field: "cSlabId", headerName: "TYD2000主键", width: 150, hide: true },
  { colId: "nFurStatus", field: "nFurStatus", headerName: "加热炉状态", width: 125, hide: true },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 125, hide: true },
  { colId: "cRowNo", field: "cRowNo", headerName: "道次", width: 112, hide: true },
  { colId: "cRollCode", field: "cRollCode", headerName: "轧机编号", width: 112, hide: true },
  { colId: "cFinishEmp", field: "cFinishEmp", headerName: "轧制完成人", width: 125, hide: true },
  { colId: "dRoll", field: "dRoll", headerName: "开轧/终轧时间", width: 138, hide: true },
  { colId: "cRollShift", field: "cRollShift", headerName: "轧制完成班次", width: 138, hide: true },
  { colId: "cRollGroup", field: "cRollGroup", headerName: "轧制完成班组", width: 138, hide: true },
  { colId: "nJqStatus", field: "nJqStatus", headerName: "剪切状态", width: 112, hide: true },
  { colId: "cJqCode", field: "cJqCode", headerName: "剪切设备", width: 112, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 112, hide: true },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 112, hide: true },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 112, hide: true },
  { colId: "nThickPlan", field: "nThickPlan", headerName: "计划厚度", width: 112, hide: true },
  { colId: "nWidthPlan", field: "nWidthPlan", headerName: "计划宽度", width: 112, hide: true },
];

const colDefs2: ColDef[] = [
  { colId: "passNo", field: "passNo", headerName: "轧制道次", width: 112 },
  { colId: "temp", field: "temp", headerName: "测量温度", width: 112 },
  { colId: "tempCal", field: "tempCal", headerName: "计算温度", width: 112 },
  { colId: "thickCal", field: "thickCal", headerName: "计算厚度", width: 112 },
  { colId: "spray", field: "spray", headerName: "除鳞应用", width: 112 },
  { colId: "turnFlag", field: "turnFlag", headerName: "转钢标记", width: 112 },
  { colId: "forceCal", field: "forceCal", headerName: "预算轧制力", width: 125 },
  { colId: "forceAct", field: "forceAct", headerName: "实际轧制力", width: 125 },
  { colId: "torqueCal", field: "torqueCal", headerName: "预算扭矩", width: 112 },
  { colId: "torqueAct", field: "torqueAct", headerName: "实际扭矩", width: 112 },
  { colId: "bendForceCal", field: "bendForceCal", headerName: "预算弯辊力", width: 125 },
  { colId: "bendForceAct", field: "bendForceAct", headerName: "实际弯辊力", width: 125 },
  { colId: "threadSpeed", field: "threadSpeed", headerName: "咬钢速度", width: 112 },
  { colId: "runSpeed", field: "runSpeed", headerName: "轧制速度", width: 112 },
  { colId: "entryTemp", field: "entryTemp", headerName: "入口温度", width: 112 },
  { colId: "outSpeed", field: "outSpeed", headerName: "出口速度", width: 112 },
  { colId: "tempCalEn", field: "tempCalEn", headerName: "入口计算温度", width: 138 },
  { colId: "widthEn", field: "widthEn", headerName: "入口宽度", width: 112 },
  { colId: "widthEx", field: "widthEx", headerName: "出口宽度", width: 112 },
  { colId: "lengthEx", field: "lengthEx", headerName: "出口长度", width: 112 },
  { colId: "rollTimeStart", field: "rollTimeStart", headerName: "咬钢时间", width: 140 },
  { colId: "rollTimeStop", field: "rollTimeStop", headerName: "轧制时刻", width: 140 },
  { colId: "id", field: "id", headerName: "thr3010 id", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 112, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 140, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 120, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 140, hide: true },
  { colId: "cPid", field: "cPid", headerName: "PMS轧制生产实绩表主键", width: 180, hide: true },
  { colId: "falgN", field: "falgN", headerName: "FALG_N", width: 112, hide: true },
  { colId: "falgC", field: "falgC", headerName: "FALG_C", width: 112, hide: true },
  { colId: "selected", field: "selected", headerName: "选择", width: 112, hide: true },
];

async function dataBindL2(dto: DtoThr3010 | null) {
  loading2.value = true;
  try {
    const list = dto ? ((await hR3010Api.queryTiL2me021s({ slabNo: dto.cPieceNo })) ?? []) : [];
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
    const list =
      (await hR3010Api.querySlabs({
        cLineCode,
        cOrderNo: input.cOrderNo.trim() || undefined,
        cBatchNo: input.cBatchNo.trim() || undefined,
        cStove: input.cStove.trim() || undefined,
        cSgCode: input.cSgCode.trim() || undefined,
        cSgStd: input.cSgStd.trim() || undefined,
        nRollStatus: input.nRollStatus as Thr3010RollStatusEnum,
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

/* ---------- 轧制完成（二级弹窗待接入） ---------- */
function onFinish() {
  const row = current1.value;
  if (!row) return;
  // 原 FrmHR3210：轧制完成弹窗（录入开轧/终轧时间等实绩后 finishRoll 提交，Yes 后回刷），待接入
  toast("轧制完成弹窗 FrmHR3210 待接入", 2500, "warn");
}

/* ---------- 轧废 ---------- */
async function doWaste() {
  const sel = (grid1Api.value?.getSelectedRows() ?? []) as DtoThr3010[];
  const cMxIds = sel.map((x) => x.id).filter((x): x is string => !!x);
  try {
    await hR3010Api.waste({
      cLineCode,
      cMxIds,
      cRollCode: undefined,
      cReason: reason.value,
    });
    toast("数据提交成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}
function onWaste() {
  if (rows1.value.length === 0) return;
  const sel = (grid1Api.value?.getSelectedRows() ?? []) as DtoThr3010[];
  if (sel.length === 0) return;
  askConfirm("是否确认轧废勾选的材料？", doWaste);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：订单号/批号/炉号/钢种/执行标准/轧制状态/创建时间） -->
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轧制状态</label>
        <Select
          v-model="input.nRollStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">创建时间</label>
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
    <!-- 工具栏（原 stackPanel1：查询/轧制完成；stackPanel3：原因/吊销） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading1" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onFinish">轧制完成</Button>
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">原因</label>
      <InputText v-model="reason" class="w-48 shrink-0" />
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onWaste">吊销</Button>
    </div>

    <!-- 上下主子表：原 splitContainerControl1 537/878 ≈ 61% -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <SplitterPanel :size="61" :minSize="25" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">计划材料</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs1"
            :row-data="rows1"
            :row-selection="{
              mode: 'multiRow',
              checkboxes: true,
              headerCheckbox: true,
              enableClickSelection: true,
              enableSelectionWithoutKeys: true,
            }"
            :pagination="false"
            :animate-rows="false"
            :loading="loading1"
            @grid-ready="onGrid1Ready"
            @selection-changed="onGrid1SelectionChanged"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :minSize="20" class="flex flex-col overflow-hidden">
        <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">轧制记录</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs2"
            :row-data="rows2"
            :pagination="false"
            :animate-rows="false"
            :loading="loading2"
            @grid-ready="onGrid2Ready"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

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
