<script setup lang="ts">
import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconPlayerPlay, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { tmp2020Api, OrderReviewEnum, type InputTmp2010Dto, type ZgPlanDto } from "@/api/mes4ddh/smp.swagger";

/** 对应 FrmMP2020（轧钢计划管理，4菜单共享 ZG01/02/03/04）：DDH.Winforms.SMP.Forms.FrmMP2020
 *  已接入：tmp2020Api.queryOrder（上表查询）/ queryPlans（下表查询）/ addTmp2020s（生成）/ deleteTmp2020s（删除）
 *  待接入：mock 缺 tmp2020/queryOrder、queryPlans、addTmp2020s、deleteTmp2020s
 *  布局：查询区(评审时间/钢种/标准/订单号，订单状态与 NReview Status 为 HiddenItems) → 查询按钮 →
 *        上下 Splitter：gridControl1(生成来源) ｜ 备注说明+生成 → 创建时间+订单号+查询+删除 → gridControl2(Fill)
 *  cQueryString（ZG01/02/03/04）经 useMenuQuery 作 cLineCode；列集按 extract（上79+隐藏6 / 下78+隐藏7） */

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const theme = makeHmxGridTheme();
const rows1 = ref<ZgPlanDto[]>([]);
const rows2 = ref<ZgPlanDto[]>([]);
const querying = ref(false);
const grid1Api = ref<GridApi | null>(null);
const grid2Api = ref<GridApi | null>(null);

function monthRange(): Date[] {
  const d = new Date();
  return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 0)];
}
function toRange(d: Date[] | null | undefined) {
  return d && d.length === 2 && d[0] && d[1] ? { min: d[0].toISOString(), max: d[1].toISOString() } : undefined;
}

/* 原 inputTmp2010DtoBindingSource（dataLayoutControl：评审时间/钢种/标准/订单号 + Hidden: 订单状态/NReview Status） */
const q1 = reactive({
  timeRange: monthRange() as Date[] | null,
  cSgCode: "",
  cSgStd: "",
  cOrderNo: "",
  nOrderStatus: null as number | null,
  nReviewStatus: null as number | null,
});
/* 原 stackPanel2/3：备注说明 txtRemark、创建时间 ucTimeRange2、订单号 txtOrder */
const txtRemark = ref("");
const q2 = reactive({
  timeRange: monthRange() as Date[] | null,
  cOrderNo: "",
});

/* 订单状态：extract 下拉[下发生产处/已排产/生产关闭/退回销售/结案/订单完成/未下发]（OrderStatusEnum） */
const statusOptions = [
  { label: "下发生产处", value: 0 },
  { label: "已排产", value: 10 },
  { label: "生产关闭", value: 30 },
  { label: "退回销售", value: 40 },
  { label: "结案", value: 50 },
  { label: "订单完成", value: 60 },
  { label: "未下发", value: -1 },
];
/* NReview Status：extract 下拉[未评审/已评审]（原 HiddenItems） */
const reviewOptions = [
  { label: "未评审", value: OrderReviewEnum.NoReview },
  { label: "已评审", value: OrderReviewEnum.YesReview },
];

const colDefs1: ColDef[] = [
      { field: "selected", headerName: "选择", hide: true },
      { field: "cLineCode", headerName: "产线代码", width: 150 },
      { field: "nOrder", headerName: "生产顺序", width: 150 },
      { field: "cPlanTime", headerName: "计划日期", width: 150 },
      { field: "cCool", headerName: "是否冷坯计划", width: 150 },
      { field: "cOrderNo", headerName: "提料计划号", width: 150 },
      { field: "cIsMerge", headerName: "是否合并提料", width: 150 },
      { field: "cOrderNo1", headerName: "订单号1", width: 150 },
      { field: "cOrderNo2", headerName: "订单号2", width: 150 },
      { field: "cOrderNo3", headerName: "订单号3", width: 150 },
      { field: "cOrderNo4", headerName: "订单号4", width: 150 },
      { field: "nLenTq1", headerName: "套切1", width: 150 },
      { field: "nLenTq2", headerName: "套切2", width: 150 },
      { field: "nLenTq3", headerName: "套切3", width: 150 },
      { field: "nLenTq4", headerName: "套切4", width: 150 },
      { field: "cSgCode", headerName: "钢种", width: 150 },
      { field: "cSgStd", headerName: "执行标准", width: 150 },
      { field: "cSpec", headerName: "规格", width: 150 },
      { field: "nPlanedWgt", headerName: "计划重量", width: 150 },
      { field: "nThick", headerName: "厚度", width: 150 },
      { field: "nThickMin", headerName: "厚度下限", width: 150 },
      { field: "nThickMax", headerName: "厚度上限", width: 150 },
      { field: "nWidth", headerName: "宽度", width: 150 },
      { field: "nWidthMin", headerName: "宽度下限", width: 150 },
      { field: "nWidthMax", headerName: "宽度上限", width: 150 },
      { field: "nLen", headerName: "长度", width: 150 },
      { field: "cLengthType", headerName: "长度类型", width: 150 },
      { field: "nLenMin", headerName: "长度下限", width: 150 },
      { field: "nLenMax", headerName: "长度上限", width: 150 },
      { field: "cSteelType", headerName: "钢类", width: 150 },
      { field: "cProdCode", headerName: "品名代码", width: 150 },
      { field: "nDbc", headerName: "倍尺", width: 150 },
      { field: "nBc", headerName: "倍尺", width: 150 },
      { field: "nNum", headerName: "订货件数", width: 150 },
      { field: "cSlabSource", headerName: "供坯单位", width: 150 },
      { field: "cTlSgCode", headerName: "炼钢钢种", width: 150 },
      { field: "cTlSgStd", headerName: "炼钢标准", width: 150 },
      { field: "cSlabSize", headerName: "钢坯规格", width: 150 },
      { field: "nSlabThick", headerName: "坯厚", width: 150 },
      { field: "nSlabWidth", headerName: "坯宽", width: 150 },
      { field: "nSlabLen", headerName: "冷态坯长", width: 150 },
      { field: "nSlabQua", headerName: "计划生产钢坯块数", width: 150 },
      { field: "nWgtUnit", headerName: "钢坯单重", width: 150 },
      { field: "nRate", headerName: "理论成材率", width: 150 },
      { field: "nSlabWgt", headerName: "生产钢坯重量", width: 150 },
      { field: "cDelivyStatusCode", headerName: "交货状态", width: 150 },
      { field: "cCustStdCode", headerName: "加工用途代码", width: 150 },
      { field: "cOrderCustNo", headerName: "订货客户编码", width: 150 },
      { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
      { field: "cOrderCustEname", headerName: "订货客户英文名称", width: 150 },
      { field: "cProductH", headerName: "重点品种", width: 150 },
      { field: "cOrderTypeCode", headerName: "合同性质QAA期货", width: 150 },
      { field: "cExportFlag", headerName: "出口标志", width: 150 },
      { field: "dOrderTime", headerName: "订单日期", width: 150 },
      { field: "dJhqTime", headerName: "合同交货期", width: 150 },
      { field: "cSlabType", headerName: "自备坯R", width: 150 },
      { field: "cConRemark", headerName: "合同备注", width: 150 },
      { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
      { field: "cWarrantyDesc", headerName: "质保书要求", width: 150 },
      { field: "cPackCode", headerName: "特殊包装要求", width: 150 },
      { field: "cDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "cDeptCode", headerName: "部门编码", width: 150 },
      { field: "nFlag", headerName: "计划类型", width: 150 },
      { field: "cProdName", headerName: "品名名称", width: 150 },
      { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 150 },
      { field: "cCustStdDesc", headerName: "加工用途说明", width: 150 },
      { field: "nWtMax", headerName: "单量上限", width: 150 },
      { field: "nWtMin", headerName: "单量下限", width: 150 },
      { field: "nWidthWgt", headerName: "边部宽度余量", width: 150 },
      { field: "cTrimFlag", headerName: "切边方式:四切", width: 150 },
      { field: "cFlawDesc", headerName: "探伤等级", width: 150 },
      { field: "cDelivyAddress", headerName: "流向", width: 150 },
      { field: "cTol", headerName: "公差", width: 150 },
      { field: "cOverstepBl", headerName: "短溢装比例", width: 150 },
      { field: "cInboundNo", headerName: "入库标识", width: 150 },
      { field: "cShape", headerName: "形状代码", width: 150 },
      { field: "cSlabRemark", headerName: "提料备注", width: 150 },
      { field: "cTlOrderFlag", headerName: "是否提料订单", width: 150 },
      { field: "cStNo", headerName: "炼钢工艺卡", width: 150 },
      { field: "id", headerName: "主键", width: 100, hide: true },
      { field: "creator", headerName: "创建人", width: 100, hide: true },
      { field: "createTime", headerName: "创建时间", width: 100, hide: true },
      { field: "lastModifier", headerName: "最后修改人", width: 100, hide: true },
      { field: "lastModifyTime", headerName: "最后修改时间", width: 100, hide: true },
      { field: "nStatus", headerName: "订单状态", width: 100, hide: true },
];
const colDefs2: ColDef[] = [
      { field: "selected", headerName: "选择", hide: true },
      { field: "cLineCode", headerName: "产线代码", width: 150 },
      { field: "cPlanTime", headerName: "计划日期", width: 150 },
      { field: "cCool", headerName: "是否冷坯计划", width: 150 },
      { field: "cOrderNo", headerName: "提料计划号", width: 150 },
      { field: "cOrderNo1", headerName: "订单号1", width: 150 },
      { field: "cOrderNo2", headerName: "订单号2", width: 150 },
      { field: "cOrderNo3", headerName: "订单号3", width: 150 },
      { field: "cOrderNo4", headerName: "订单号4", width: 150 },
      { field: "nLenTq1", headerName: "套切1", width: 150 },
      { field: "nLenTq2", headerName: "套切2", width: 150 },
      { field: "nLenTq3", headerName: "套切3", width: 150 },
      { field: "nLenTq4", headerName: "套切4", width: 150 },
      { field: "nOrder", headerName: "生产顺序", width: 150 },
      { field: "cSgCode", headerName: "钢种", width: 150 },
      { field: "cSgStd", headerName: "执行标准", width: 150 },
      { field: "cSpec", headerName: "规格", width: 150 },
      { field: "nPlanedWgt", headerName: "计划重量", width: 150 },
      { field: "nThick", headerName: "厚度", width: 150 },
      { field: "nThickMin", headerName: "厚度下限", width: 150 },
      { field: "nThickMax", headerName: "厚度上限", width: 150 },
      { field: "nWidth", headerName: "宽度", width: 150 },
      { field: "nWidthMin", headerName: "宽度下限", width: 150 },
      { field: "nWidthMax", headerName: "宽度上限", width: 150 },
      { field: "nLen", headerName: "长度", width: 150 },
      { field: "cLengthType", headerName: "长度类型", width: 150 },
      { field: "nLenMin", headerName: "长度下限", width: 150 },
      { field: "nLenMax", headerName: "长度上限", width: 150 },
      { field: "cSteelType", headerName: "钢类", width: 150 },
      { field: "cProdCode", headerName: "品名代码", width: 150 },
      { field: "nDbc", headerName: "倍尺", width: 150 },
      { field: "nBc", headerName: "倍尺", width: 150 },
      { field: "nNum", headerName: "订货件数", width: 150 },
      { field: "cSlabSource", headerName: "供坯单位", width: 150 },
      { field: "cTlSgCode", headerName: "炼钢钢种", width: 150 },
      { field: "cTlSgStd", headerName: "炼钢标准", width: 150 },
      { field: "cSlabSize", headerName: "钢坯规格", width: 150 },
      { field: "nSlabThick", headerName: "坯厚", width: 150 },
      { field: "nSlabWidth", headerName: "坯宽", width: 150 },
      { field: "nSlabLen", headerName: "冷态坯长", width: 150 },
      { field: "nSlabQua", headerName: "计划生产钢坯块数", width: 150 },
      { field: "nWgtUnit", headerName: "钢坯单重", width: 150 },
      { field: "nRate", headerName: "理论成材率", width: 150 },
      { field: "nSlabWgt", headerName: "生产钢坯重量", width: 150 },
      { field: "cDelivyStatusCode", headerName: "交货状态", width: 150 },
      { field: "cCustStdCode", headerName: "加工用途代码", width: 150 },
      { field: "cOrderCustNo", headerName: "订货客户编码", width: 150 },
      { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
      { field: "cOrderCustEname", headerName: "订货客户英文名称", width: 150 },
      { field: "cProductH", headerName: "重点品种", width: 150 },
      { field: "cOrderTypeCode", headerName: "合同性质QAA期货", width: 150 },
      { field: "cExportFlag", headerName: "出口标志", width: 150 },
      { field: "dOrderTime", headerName: "订单日期", width: 150 },
      { field: "dJhqTime", headerName: "合同交货期", width: 150 },
      { field: "cSlabType", headerName: "自备坯R", width: 150 },
      { field: "cConRemark", headerName: "合同备注", width: 150 },
      { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 150 },
      { field: "cWarrantyDesc", headerName: "质保书要求", width: 150 },
      { field: "cPackCode", headerName: "特殊包装要求", width: 150 },
      { field: "cDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "cDeptCode", headerName: "部门编码", width: 150 },
      { field: "nFlag", headerName: "计划类型", width: 150 },
      { field: "cProdName", headerName: "品名名称", width: 150 },
      { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 150 },
      { field: "cCustStdDesc", headerName: "加工用途说明", width: 150 },
      { field: "nWtMax", headerName: "单量上限", width: 150 },
      { field: "nWtMin", headerName: "单量下限", width: 150 },
      { field: "nWidthWgt", headerName: "边部宽度余量", width: 150 },
      { field: "cTrimFlag", headerName: "切边方式:四切", width: 150 },
      { field: "cFlawDesc", headerName: "探伤等级", width: 150 },
      { field: "cDelivyAddress", headerName: "流向", width: 150 },
      { field: "cTol", headerName: "公差", width: 150 },
      { field: "cOverstepBl", headerName: "短溢装比例", width: 150 },
      { field: "cInboundNo", headerName: "入库标识", width: 150 },
      { field: "cShape", headerName: "形状代码", width: 150 },
      { field: "cSlabRemark", headerName: "提料备注", width: 150 },
      { field: "cTlOrderFlag", headerName: "是否提料订单", width: 150 },
      { field: "cStNo", headerName: "炼钢工艺卡", width: 150 },
      { field: "id", headerName: "主键", width: 100, hide: true },
      { field: "creator", headerName: "创建人", width: 100, hide: true },
      { field: "createTime", headerName: "创建时间", width: 100, hide: true },
      { field: "lastModifier", headerName: "最后修改人", width: 100, hide: true },
      { field: "lastModifyTime", headerName: "最后修改时间", width: 100, hide: true },
      { field: "nStatus", headerName: "订单状态", width: 100, hide: true },
      { field: "cIsMerge", headerName: "是否合并提料", width: 100, hide: true },
];

function onGrid1Ready(e: GridReadyEvent) {
  grid1Api.value = e.api;
}
function onGrid2Ready(e: GridReadyEvent) {
  grid2Api.value = e.api;
}

function selectedOf(api: GridApi | null): ZgPlanDto[] {
  return (api?.getSelectedRows() ?? []) as ZgPlanDto[];
}
function idsOf(list: ZgPlanDto[]): string[] {
  return list.map((x) => x.id ?? "").filter(Boolean);
}

/* btnQuery 查询（上表，原 dpc QueryOrder(dto)） */
async function queryTop() {
  querying.value = true;
  try {
    const input: InputTmp2010Dto = {
      cSgCode: q1.cSgCode || null,
      cSgStd: q1.cSgStd || null,
      cOrderNo: q1.cOrderNo || null,
      nOrderStatus: (q1.nOrderStatus ?? null) as InputTmp2010Dto["nOrderStatus"],
      nReviewStatus: (q1.nReviewStatus ?? null) as OrderReviewEnum | null,
      timeRange: toRange(q1.timeRange),
      cLineCode: menuQs || null,
    };
    rows1.value = (await tmp2020Api.queryOrder(input)) ?? [];
    /* 原勾选列 Selected 字段：查询回填后按数据字段回灌行选择勾选态 */
    requestAnimationFrame(() => {
      grid1Api.value?.forEachNode((node) => node.setSelected(!!(node.data as ZgPlanDto).selected));
      grid1Api.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnQuery2020 查询（下表，原 NStatus 固定 PlanStatusEnum.NoDown=0） */
async function queryBottom() {
  querying.value = true;
  try {
    rows2.value =
      (await tmp2020Api.queryPlans({
        timeRange: toRange(q2.timeRange),
        cOrderNo: q2.cOrderNo || null,
        nStatus: 0,
        cLineCode: menuQs || null,
      })) ?? [];
    requestAnimationFrame(() => {
      grid2Api.value?.forEachNode((node) => node.setSelected(!!(node.data as ZgPlanDto).selected));
      grid2Api.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

async function queryAll() {
  await queryTop();
  await queryBottom();
}

/* btnS/查询按钮（stackPanel1）→ 上表查询 */
function onQuery() {
  void queryTop();
}

/* btnSave 生成 → AddTmp2020s */
async function onGenerate() {
  if (!rows1.value.length) return;
  const listOrder = selectedOf(grid1Api.value).map((x) => ({
    cId: x.id ?? undefined,
    nOrder: x.nOrder ?? undefined,
  }));
  if (!listOrder.length) {
    toast("请勾选需要下发的计划", 2000, "warn");
    return;
  }
  if (!window.confirm("是否确认批量生成勾选订单的轧制计划？")) return;
  querying.value = true;
  try {
    await tmp2020Api.addTmp2020s({ listOrder, cRemark: txtRemark.value || null });
    toast("数据保存成功！", 2000, "success");
    await queryAll();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnDelete 删除 → DeleteTmp2020s */
async function onDelete() {
  if (!rows2.value.length) return;
  const ids = idsOf(selectedOf(grid2Api.value));
  if (!ids.length) {
    toast("请勾选轧制计划！", 2000, "warn");
    return;
  }
  if (!window.confirm("是否确认删除选中的轧制计划？")) return;
  querying.value = true;
  try {
    await tmp2020Api.deleteTmp2020s(ids);
    toast("数据保存成功！", 2000, "success");
    await queryAll();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl：评审时间/钢种/标准/订单号；订单状态与 NReview Status 为 HiddenItems） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">评审时间</label>
          <DatePicker
            v-model="q1.timeRange"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="q1.cSgCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">标准</label>
          <InputText v-model="q1.cSgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="q1.cOrderNo" class="min-w-0 flex-1" />
        </div>
        <div class="hidden min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单状态</label>
          <Select
            v-model="q1.nOrderStatus"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="hidden min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">NReview Status</label>
          <Select
            v-model="q1.nReviewStatus"
            :options="reviewOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 查询按钮（原 stackPanel1） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
    </div>

    <!-- 上下双表（原 gridControl1 Dock.Top → splitter → stackPanel2/3 → gridControl2 Dock.Fill） -->
    <Splitter layout="vertical" class="min-h-0 flex-1 border-0">
      <SplitterPanel :size="45" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs1"
            :row-data="rows1"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onGrid1Ready"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>

      <SplitterPanel :size="55" :minSize="15" class="flex flex-col overflow-hidden">
        <!-- 备注说明 + 生成（原 stackPanel2） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">备注说明</label>
          <InputText v-model="txtRemark" class="w-64 shrink-0" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onGenerate">
            <IconPlayerPlay class="h-3 w-3" />生成
          </Button>
        </div>
        <!-- 创建时间 + 订单号 + 查询/删除（原 stackPanel3） -->
        <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <label class="shrink-0 text-xs text-muted-foreground">创建时间</label>
          <DatePicker
            v-model="q2.timeRange"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            class="w-72 shrink-0"
          />
          <label class="ml-2 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="q2.cOrderNo" class="w-48 shrink-0" />
          <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="queryBottom">
            <IconSearch class="h-3 w-3" />查询
          </Button>
          <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
            <IconTrash class="h-3 w-3" />删除
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="colDefs2"
            :row-data="rows2"
            :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onGrid2Ready"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
