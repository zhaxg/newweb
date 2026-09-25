<script setup lang="ts">
/** 对应 FrmHR4010（遗留台账登记）：DDH.Winforms.SHR.Forms.FrmHR4010
 *  已接入：hR4000Api.queryYl（主表+班组遗留统计一次性返回）/ saveYc（勾选行标记异常）
 *  偏差：遗留原因原为可编辑下拉（预置 规格异常/表面异常）→ 文本输入；原「开始/结束产出时间」死绑定（DProStart/DProzEnd 不存在）未渲染，
 *       产出时间走 ucTimeRange→dProTime；库区/班组等 KV 列显示原值 */
import { onMounted, reactive, ref, shallowRef } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import { IconDeviceFloppy, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  hR4000Api,
  tPa1000Api,
  type DtoQuerySlabs,
  type GroupYcDto,
  type Thr4000Dto,
  type TimeRange,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();
const { parts: menuQs } = useMenuQuery();

function isoLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function toTimeRange(dates: Date[] | null): TimeRange | undefined {
  if (!dates || dates.length < 2) return undefined;
  return { min: isoLocal(dates[0]), max: isoLocal(dates[dates.length - 1]) };
}
function defaultRange(): Date[] {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return [new Date(now.getFullYear(), now.getMonth(), now.getDate()), end];
}

/* 产线（原 comLine，菜单参数初始化；菜单 qs 可能为 "ZG01,xx" 取前段） */
const qs = menuQs[0] ?? "ZG01";
const lineOptions = ref<{ label: string; value: string }[]>([]);
const lineCode = ref<string>(qs);

const input = reactive({
  cStoreCode: "",
  cBatchNo: "",
  cPieceNo: "",
  cStove: "",
  cSgCode: "",
  cSgStd: "",
  cInboundNo: "",
  cOrderNo: "",
  dates: defaultRange() as Date[] | null,
});
const reason = ref("");
const remark = ref("");

const rows = shallowRef<Thr4000Dto[]>([]);
const hzRows = shallowRef<GroupYcDto[]>([]);
const loading = ref(false);
const saving = ref(false);
const api = ref<GridApi | null>(null);
const hzApi = ref<GridApi | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onHzReady(e: GridReadyEvent) {
  hzApi.value = e.api;
}

const colDefs: ColDef[] = [
  /*  { colId: "selected", field: "selected", headerName: "选择", width: 150 },
  { colId: "cReason", field: "cReason", headerName: "遗留原因", width: 150 },
  { colId: "cYcRemark", field: "cYcRemark", headerName: "备注说明", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "处理标记", width: 150 },
  { colId: "cStoreCode", field: "cStoreCode", headerName: "库区号", width: 150 },
  { colId: "cStackNo", field: "cStackNo", headerName: "垛位号", width: 150 },
  { colId: "cStackNum", field: "cStackNum", headerName: "层号", width: 150 },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150 },
  { colId: "cSlCode", field: "cSlCode", headerName: "剪切线代码", width: 150 },
  { colId: "cOrderNo", field: "cOrderNo", headerName: "订单号", width: 150 },
  { colId: "cBatchNo", field: "cBatchNo", headerName: "批号", width: 150 },
  { colId: "cStove", field: "cStove", headerName: "炉号", width: 150 },
  { colId: "cPieceNo", field: "cPieceNo", headerName: "头侧件次号", width: 150 },
  { colId: "cIsGcd", field: "cIsGcd", headerName: "是否工程单", width: 150 },
  { colId: "cIsCc", field: "cIsCc", headerName: "是否超长", width: 150 },
  { colId: "cIsDc", field: "cIsDc", headerName: "是否短尺", width: 150 },
  { colId: "cSgCode", field: "cSgCode", headerName: "钢种", width: 150 },
  { colId: "cSgStd", field: "cSgStd", headerName: "执行标准", width: 150 },
  { colId: "cSpec", field: "cSpec", headerName: "规格", width: 150 },
  { colId: "cTrimFlag", field: "cTrimFlag", headerName: "切边方式", width: 150 },
  { colId: "cInboundNo", field: "cInboundNo", headerName: "入库标识", width: 150 },
  { colId: "nWgt", field: "nWgt", headerName: "坯重", width: 150 },
  { colId: "cJqGroup", field: "cJqGroup", headerName: "剪切班组", width: 150 },
  { colId: "cJqShift", field: "cJqShift", headerName: "剪切班次", width: 150 },
  { colId: "cJqUser", field: "cJqUser", headerName: "剪切人", width: 150 },
  { colId: "dJq", field: "dJq", headerName: "剪切时间", width: 150 },
  { colId: "cRemark", field: "cRemark", headerName: "反馈结果", width: 150 },
  { colId: "nSurfaceResult", field: "nSurfaceResult", headerName: "表检结果", width: 150 },
  { colId: "dSurfaceTime", field: "dSurfaceTime", headerName: "表面判定时间", width: 150 },
  { colId: "cSurfaceUser", field: "cSurfaceUser", headerName: "表面判定人", width: 150 },
  { colId: "cSurfaceRemark", field: "cSurfaceRemark", headerName: "缺陷描述", width: 150 },
  { colId: "cShiftNo", field: "cShiftNo", headerName: "表判班次", width: 150 },
  { colId: "cGroupNo", field: "cGroupNo", headerName: "表判班组", width: 150 },
  { colId: "cSurfaceCategory", field: "cSurfaceCategory", headerName: "判定分类", width: 150 },
  { colId: "cSurfaceDefectCode", field: "cSurfaceDefectCode", headerName: "表面缺陷代码", width: 150 },
  { colId: "cSurfaceDefectPosition", field: "cSurfaceDefectPosition", headerName: "表面缺陷位置", width: 150 },
  { colId: "nSurfaceLen", field: "nSurfaceLen", headerName: "尺寸长", width: 150 },
  { colId: "nSurfaceThick1", field: "nSurfaceThick1", headerName: "尺寸厚1", width: 150 },
  { colId: "nSurfaceThick2", field: "nSurfaceThick2", headerName: "尺寸厚2", width: 150 },
  { colId: "nSurfaceThick3", field: "nSurfaceThick3", headerName: "尺寸厚3", width: 150 },
  { colId: "nSurfaceWidth", field: "nSurfaceWidth", headerName: "尺寸宽", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 150, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "cPlanId", field: "cPlanId", headerName: "计划ID", width: 150, hide: true },
  { colId: "cZpId", field: "cZpId", headerName: "thr3000主键", width: 150, hide: true },
  { colId: "cMxId", field: "cMxId", headerName: "THR3010主键", width: 150, hide: true },
  { colId: "cLineCode", field: "cLineCode", headerName: "产线", width: 150, hide: true },
  { colId: "nThick", field: "nThick", headerName: "坯厚", width: 150, hide: true },
  { colId: "nWidth", field: "nWidth", headerName: "坯宽", width: 150, hide: true },
  { colId: "nLen", field: "nLen", headerName: "坯长", width: 150, hide: true },
  { colId: "nQua", field: "nQua", headerName: "支数", width: 150, hide: true },
  { colId: "cMatCode", field: "cMatCode", headerName: "物料编码", width: 150, hide: true },
  { colId: "cMatName", field: "cMatName", headerName: "物料名称", width: 150, hide: true },
  { colId: "cLengthType", field: "cLengthType", headerName: "长度类型", width: 150, hide: true },
  { colId: "nLenMin", field: "nLenMin", headerName: "长度下限", width: 150, hide: true },
  { colId: "nLenMax", field: "nLenMax", headerName: "长度上限", width: 150, hide: true },
  { colId: "cEngMinThick", field: "cEngMinThick", headerName: "厚度下偏差", width: 150, hide: true },
  { colId: "cEngMaxThick", field: "cEngMaxThick", headerName: "厚度上偏差", width: 150, hide: true },
  { colId: "cEngMinWidth", field: "cEngMinWidth", headerName: "宽度下偏差", width: 150, hide: true },
  { colId: "cEngMaxWidth", field: "cEngMaxWidth", headerName: "宽度上偏差", width: 150, hide: true },
  { colId: "cEngMinLen", field: "cEngMinLen", headerName: "长度下偏差", width: 150, hide: true },
  { colId: "cEngMaxLen", field: "cEngMaxLen", headerName: "长度上偏差", width: 150, hide: true },
  { colId: "cCustCode", field: "cCustCode", headerName: "客户编码", width: 150, hide: true },
  { colId: "cCustName", field: "cCustName", headerName: "客户名称", width: 150, hide: true },
  { colId: "dDeliveryDate", field: "dDeliveryDate", headerName: "交货日期", width: 150, hide: true },
  { colId: "dOrdDate", field: "dOrdDate", headerName: "订单日期", width: 150, hide: true },
  { colId: "cSpecReqText", field: "cSpecReqText", headerName: "客户特殊要求", width: 150, hide: true },
  { colId: "cConNo", field: "cConNo", headerName: "合同号", width: 150, hide: true },
  { colId: "cSteelType", field: "cSteelType", headerName: "钢种大类", width: 150, hide: true },
  { colId: "cDelivyStatusCode", field: "cDelivyStatusCode", headerName: "交货状态", width: 150, hide: true },
  { colId: "cCustStdCode", field: "cCustStdCode", headerName: "加工用途代码", width: 150, hide: true },
  { colId: "cOrderCustCname", field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150, hide: true },
  { colId: "cConsigneeCustCname", field: "cConsigneeCustCname", headerName: "收货客户中文名称", width: 150, hide: true },
  { colId: "cPieceNoSlab", field: "cPieceNoSlab", headerName: "板坯号", width: 150, hide: true },
  { colId: "cSgCodeSlab", field: "cSgCodeSlab", headerName: "钢坯钢种", width: 150, hide: true },
  { colId: "cSgStdSlab", field: "cSgStdSlab", headerName: "坯料执行标准", width: 150, hide: true },
  { colId: "cSpecSlab", field: "cSpecSlab", headerName: "板坯规格", width: 150, hide: true },
  { colId: "nThickSlab", field: "nThickSlab", headerName: "坯料厚度", width: 150, hide: true },
  { colId: "nWidthSlab", field: "nWidthSlab", headerName: "坯料宽度", width: 150, hide: true },
  { colId: "nLenSlab", field: "nLenSlab", headerName: "坯料长度", width: 150, hide: true },
  { colId: "nQuaSlab", field: "nQuaSlab", headerName: "钢坯总支数", width: 150, hide: true },
  { colId: "nWgtSlab", field: "nWgtSlab", headerName: "坯重", width: 150, hide: true },
  { colId: "cMatCodeSlab", field: "cMatCodeSlab", headerName: "坯料物料编码", width: 150, hide: true },
  { colId: "cMatNameSlab", field: "cMatNameSlab", headerName: "坯料物料名称", width: 150, hide: true },
  { colId: "nFurType", field: "nFurType", headerName: "装炉方式", width: 150, hide: true },
  { colId: "cFurCode", field: "cFurCode", headerName: "加热炉编号", width: 150, hide: true },
  { colId: "cRollCode", field: "cRollCode", headerName: "轧机编号", width: 150, hide: true },
  { colId: "dFinish", field: "dFinish", headerName: "完成时间", width: 150, hide: true },
  { colId: "cFinishShift", field: "cFinishShift", headerName: "完成班次", width: 150, hide: true },
  { colId: "cFinishGroup", field: "cFinishGroup", headerName: "完成班组", width: 150, hide: true },
  { colId: "cFinishEmp", field: "cFinishEmp", headerName: "轧制完成人", width: 150, hide: true },
  { colId: "cConfirmStatus", field: "cConfirmStatus", headerName: "确认判定状态", width: 150, hide: true },
  { colId: "cConfirmShift", field: "cConfirmShift", headerName: "收料班次", width: 150, hide: true },
  { colId: "cConfirmGroup", field: "cConfirmGroup", headerName: "收料班组", width: 150, hide: true },
  { colId: "cConfirmEmp", field: "cConfirmEmp", headerName: "收料人", width: 150, hide: true },
  { colId: "dConfirm", field: "dConfirm", headerName: "收料时间", width: 150, hide: true },
  { colId: "cRespDept", field: "cRespDept", headerName: "责任部门", width: 150, hide: true },
  { colId: "cFaceHandleAdvice", field: "cFaceHandleAdvice", headerName: "处置措施", width: 150, hide: true },
  { colId: "cSampleLotNo", field: "cSampleLotNo", headerName: "试批号", width: 150, hide: true },
  { colId: "cSampleLotNoSlab", field: "cSampleLotNoSlab", headerName: "坯料试批号", width: 150, hide: true },
  { colId: "cQmHandleDesc", field: "cQmHandleDesc", headerName: "处置注释", width: 150, hide: true },
  { colId: "cFlawDesc", field: "cFlawDesc", headerName: "探伤等级", width: 150, hide: true },
  { colId: "cDelivyAddress", field: "cDelivyAddress", headerName: "流向", width: 150, hide: true },
  { colId: "cProdCode", field: "cProdCode", headerName: "品名", width: 150, hide: true },
  { colId: "nCalWgt", field: "nCalWgt", headerName: "理重", width: 150, hide: true },
  { colId: "cWgtToler", field: "cWgtToler", headerName: "重量偏差等级", width: 150, hide: true },
  { colId: "cPrint", field: "cPrint", headerName: "喷印完成标记", width: 150, hide: true },
  { colId: "nOrderThick", field: "nOrderThick", headerName: "订货厚", width: 150, hide: true },
  { colId: "nOrderWidth", field: "nOrderWidth", headerName: "订货宽", width: 150, hide: true },
  { colId: "nOrderLen", field: "nOrderLen", headerName: "订货长mm", width: 150, hide: true },
  { colId: "nOrderLenMax", field: "nOrderLenMax", headerName: "订单长2", width: 150, hide: true },
  { colId: "nOrderLenMin", field: "nOrderLenMin", headerName: "订单长", width: 150, hide: true },
  { colId: "cOrderLenType", field: "cOrderLenType", headerName: "合同长度类型", width: 150, hide: true },
  { colId: "lastPrintTime", field: "lastPrintTime", headerName: "最后打印时间", width: 150, hide: true },
  { colId: "lastPrintUser", field: "lastPrintUser", headerName: "最后打印人", width: 150, hide: true },
  { colId: "printCount", field: "printCount", headerName: "打印次数", width: 150, hide: true },
  { colId: "dPrint", field: "dPrint", headerName: "喷印完成时间", width: 150, hide: true },
  { colId: "cJqCode", field: "cJqCode", headerName: "剪切设备", width: 150, hide: true },
  { colId: "cPlateNo", field: "cPlateNo", headerName: "大板号", width: 150, hide: true },*/
];
const hzColDefs: ColDef[] = [
  /*  { colId: "cDate", field: "cDate", headerName: "日期", width: 150 },
  { colId: "cGroup", field: "cGroup", headerName: "班组", width: 150 },
  { colId: "nQuaNotIn", field: "nQuaNotIn", headerName: "待入库支数", width: 150 },
  { colId: "nQuaJz", field: "nQuaJz", headerName: "待精整支数", width: 150 },*/
];

async function query() {
  loading.value = true;
  try {
    const dto: DtoQuerySlabs = {
      cLineCode: lineCode.value || null,
      cStoreCode: input.cStoreCode.trim() || null,
      cBatchNo: input.cBatchNo.trim() || null,
      cPieceNo: input.cPieceNo.trim() || null,
      cStove: input.cStove.trim() || null,
      cSgCode: input.cSgCode.trim() || null,
      cSgStd: input.cSgStd.trim() || null,
      cInboundNo: input.cInboundNo.trim() || null,
      cOrderNo: input.cOrderNo.trim() || null,
      dProTime: toTimeRange(input.dates),
    };
    const res = (await hR4000Api.queryYl(dto)) ?? { groupHzs: [], thr4000Dtos: [] };
    rows.value = res.thr4000Dtos ?? [];
    hzRows.value = res.groupHzs ?? [];
    requestAnimationFrame(() => {
      api.value?.autoSizeAllColumns();
      hzApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

async function btnSave() {
  const selected = (api.value?.getSelectedRows() as Thr4000Dto[] | undefined) ?? [];
  if (rows.value.length === 0 || selected.length === 0) {
    toast("请勾选需要记录的产出实绩！", 2500, "warn");
    return;
  }
  if (!reason.value.trim()) {
    toast("请选择或者输入异常类型！", 2500, "warn");
    return;
  }
  askConfirm("是否确认标记勾选的产出实绩异常？", async () => {
    saving.value = true;
    try {
      await hR4000Api.saveYc({
        cPieceNos: selected.map((x) => x.cPieceNo ?? "").filter(Boolean),
        cReason: reason.value,
        cRemark: remark.value,
      });
      toast("数据保存成功！", 2000, "success");
      await query();
    } catch {
      /* 拦截层已 toast */
    } finally {
      saving.value = false;
    }
  });
}

/* ---------- 受控确认 ---------- */
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

onMounted(async () => {
  try {
    const devices = (await tPa1000Api.queryLines()) ?? [];
    lineOptions.value = devices.map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
    if (!lineCode.value && lineOptions.value.length) lineCode.value = lineOptions.value[0].value;
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
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
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">库区</label>
        <InputText v-model="input.cStoreCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="input.cBatchNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="input.cPieceNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="input.cStove" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="input.cInboundNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="col-span-3 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">产出时间</label>
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
      <div class="flex min-w-0 items-center gap-1">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="query">
          <IconSearch class="h-3 w-3" />查询
        </Button>
      </div>
    </div>

    <!-- 遗留钢板指定 + 勾选保存 -->
    <div class="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
      <span class="text-xs font-medium text-muted-foreground">遗留钢板指定</span>
      <label class="ml-2 shrink-0 text-xs text-muted-foreground">遗留原因</label>
      <InputText v-model="reason" placeholder="规格异常 / 表面异常 / 自定义" class="w-44 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">备注说明</label>
      <InputText v-model="remark" class="w-44 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="saving" @click="btnSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
    </div>

    <div class="min-h-0 flex-[5] overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <Tabs :value="0" class="flex min-h-0 flex-[5] flex-col border-t border-border/60">
      <TabList>
        <Tab :value="0">班组遗留统计</Tab>
      </TabList>
      <TabPanels class="min-h-0 flex-1">
        <TabPanel :value="0" class="h-full p-0">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="hzColDefs"
            :row-data="hzRows"
            :pagination="false"
            :animate-rows="false"
            @grid-ready="onHzReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>

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
