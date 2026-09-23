<script setup lang="ts">
/** 对应 FrmSD2000DG（带钢/商品坯/线材/棒材订单管理，4 菜单共享）：DDH.Winforms.SMP.Forms.FrmSD2000DG
 *  已接入：tmp2000Api.getOrderLst（查询，CLineCode=菜单 cQueryString）
 *          / downOrderPlan（下发排产）/ delOrder（删除）
 *          + qualityDesignApi.design（质量设计，逐单循环）
 *  待接入：批量导入订单 → FrmSD2000DGImport（二级弹窗占位；原窗体在弹窗内调 ImportTmp2000DG，swagger 未生成）
 *  菜单参数：cQueryString = ZG02 带钢 / LG01 商品坯 / ZG04 线材 / ZG03 棒材（useMenuQuery 下发为 cLineCode）
 *  布局：查询区（8 条件）→ 工具栏 h-9（查询/下发排产/批量导入订单/删除/质量设计）→ 单表
 *  列：32 可见 + 44 hide（按提取摘要） */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconRefresh, IconSearch, IconSend, IconSettings, IconTrash, IconUpload } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { tmp2000Api, type InputTmp2000Dto, type QueryTmp2000Dto } from "@/api/mes4ddh/smp.swagger";

/** swagger InputTmp2000Dto 生成缺字段（C# InputTmp2000Dto 有），页面侧交叉补齐；禁改 src/api */
type InputTmp2000Query = InputTmp2000Dto & {
  cSgStd?: string | null;
  cOrderNo2?: string | null;
  cTrimFlag?: string | null;
  cInboundNo?: string | null;
};

/** swagger QueryTmp2000Dto 生成缺字段（C# QueryTmp2000Dto 有），页面侧交叉补齐；禁改 src/api */
type OrderRow = QueryTmp2000Dto & {
  nOrderProcFlag?: number | null;
  cDesignDesc?: string | null;
};
import { qualityDesignApi, type QualityDesignOutput } from "@/api/mes4ddh/sqm.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const theme = makeHmxGridTheme();

/* ---------- 查询（原 InputTmp2000Dto；Load 默认 当月1日 ~ 今天） ---------- */
function firstDayOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const q = reactive({
  cOrderNo: "",
  cSgCode: "",
  cOrderCustCname: "",
  dates: [firstDayOfMonth(), new Date()] as [Date, Date],
  orderStatus: null as number | null,
  nFlag: null as number | null,
  cSgStd: "",
});

/* 状态：Designer Items.AddRange(OrderStatusEnum) */
const ORDER_STATUS_OPTIONS = [
  { label: "已下发", value: 0 },
  { label: "已排产", value: 10 },
  { label: "生产关闭", value: 30 },
  { label: "退回销售", value: 40 },
  { label: "结案", value: 50 },
  { label: "订单完成", value: 60 },
  { label: "拆分", value: 70 },
  { label: "未下发", value: -1 },
];
/* 计划类型：Designer Items.AddRange(OrderFlagEnum) */
const NFLAG_OPTIONS = [
  { label: "销售订单", value: 0 },
  { label: "余量板", value: 1 },
  { label: "补产订单", value: 2 },
  { label: "流通材", value: 3 },
  { label: "试验料", value: 4 },
];

function buildQuery(): InputTmp2000Query {
  return {
    cOrderNo: q.cOrderNo || null,
    cSgCode: q.cSgCode || null,
    cOrderCustCname: q.cOrderCustCname || null,
    dBegin: q.dates[0]?.toISOString() ?? null,
    dEnd: q.dates[1]?.toISOString() ?? null,
    orderStatus: (q.orderStatus ?? null) as InputTmp2000Dto["orderStatus"],
    nFlag: (q.nFlag ?? null) as InputTmp2000Dto["nFlag"],
    cSgStd: q.cSgStd || null,
    /* 原窗体 CLineCode = this.QueryString（4 菜单共享：ZG02/LG01/ZG04/ZG03） */
    cLineCode: menuQs || null,
  };
}

/* ---------- 列（提取摘要：32 可见 + 44 hide；swagger Input/Query 类型缺字段处以列字段名直取） ---------- */
const colDefs = ref<ColDef[]>([
  { field: "selected", headerName: "选择", width: 70 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "nOrderProcFlag", headerName: "处理标志", width: 100 },
  { field: "cDesignDesc", headerName: "质量设计失败说明", width: 160 },
  { field: "nStatus", headerName: "订单状态", width: 100 },
  { field: "isTl", headerName: "是否已提料", width: 110 },
  { field: "cOrderCustNo", headerName: "客户编码", width: 110 },
  { field: "cOrderCustCname", headerName: "订货客户", width: 150 },
  { field: "cSteelType", headerName: "钢类", width: 90 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "cSgCodeNk", headerName: "内控钢种", width: 110 },
  { field: "cSpec", headerName: "规格", width: 130 },
  { field: "nThick", headerName: "厚度", width: 80 },
  { field: "nWidth", headerName: "宽度", width: 80 },
  { field: "nLen", headerName: "长度", width: 80 },
  { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 130 },
  { field: "nNum", headerName: "订货件数", width: 100 },
  { field: "nWgt", headerName: "订单重量", width: 100 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "cConRemark", headerName: "备注", width: 150 },
  { field: "dJhqTime", headerName: "交货期", width: 120 },
  { field: "nThickTolMin", headerName: "厚度下偏差", width: 110 },
  { field: "nThickTolMax", headerName: "厚度上偏差", width: 110 },
  { field: "nWidthTolMin", headerName: "宽度下偏差", width: 110 },
  { field: "nWidthTolMax", headerName: "宽度上偏差", width: 110 },
  { field: "cLineCode", headerName: "产线代码", width: 100 },
  { field: "nFlag", headerName: "计划类型", width: 100 },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 160 },
  { field: "cSendUserId", headerName: "销售提报人", width: 110 },
  { field: "dSendTime", headerName: "销售提报时间", width: 160 },
  { field: "cShape", headerName: "产品大类", width: 100 },
  /* 隐藏列（提取 hide 规则） */
  { field: "id", headerName: "主键", hide: true },
  { field: "nThickMin", headerName: "厚度下限", hide: true },
  { field: "nThickMax", headerName: "厚度上限", hide: true },
  { field: "nWidthMin", headerName: "宽度下限", hide: true },
  { field: "nWidthMax", headerName: "宽度上限", hide: true },
  { field: "nWidthWgt", headerName: "边部宽度余量", hide: true },
  { field: "cLengthType", headerName: "长度类型", hide: true },
  { field: "nLenMin", headerName: "长度下限", hide: true },
  { field: "nLenMax", headerName: "长度上限", hide: true },
  { field: "cDelivyStatusCode", headerName: "交货状态", hide: true },
  { field: "cTrimFlag", headerName: "切边方式", hide: true },
  { field: "cOverstepBl", headerName: "短溢装比例", hide: true },
  { field: "cDelivyQtyFlag", headerName: "计重方式", hide: true },
  { field: "cTol", headerName: "公差", hide: true },
  { field: "cFlawDesc", headerName: "探伤等级", hide: true },
  { field: "cConNo", headerName: "合同号", hide: true },
  { field: "cDelivyAddress", headerName: "流向", hide: true },
  { field: "cSpecialMarkGy", headerName: "性能要求", hide: true },
  { field: "nWtMax", headerName: "单量上限", hide: true },
  { field: "nWtMin", headerName: "单量下限", hide: true },
  { field: "cInboundNo", headerName: "入库标识", hide: true },
  { field: "nLenTolMin", headerName: "长度下偏差", hide: true },
  { field: "nLenTolMax", headerName: "长度上偏差", hide: true },
  { field: "dTimeShipment", headerName: "预计船期", hide: true },
  { field: "cJrzzgyCode", headerName: "加热轧制工艺编码", hide: true },
  { field: "cJqgyCode", headerName: "剪切工艺编码", hide: true },
  { field: "cExitem1", headerName: "是否工程单", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cDeptCode", headerName: "部门编码", hide: true },
  { field: "cOrderProcUserId", headerName: "合同处理操作人", hide: true },
  { field: "dOrderProcTime", headerName: "合同处理时间", hide: true },
  { field: "cZgGyCode", headerName: "轧钢工艺编码", hide: true },
  { field: "cPushUserId", headerName: "下发生产人", hide: true },
  { field: "dPushTime", headerName: "下发生产时间", hide: true },
  { field: "nSfpj", headerName: "评审状态", hide: true },
  { field: "cPjName", headerName: "评审人", hide: true },
  { field: "nExitem2", headerName: "申请通知", hide: true },
  { field: "cOrderTypeCode", headerName: "订单性质编码", hide: true },
  { field: "cOrderTypeDesc", headerName: "订单性质说明", hide: true },
  { field: "cExitem4", headerName: "变更原因", hide: true },
  { field: "cExitem3", headerName: "原始订单号", hide: true },
  { field: "orderCP", headerName: "侧喷要求", hide: true },
  { field: "cGf", headerName: "平直度", hide: true },
]);

/* ---------- 状态 ---------- */
const rows = ref<OrderRow[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function selectedRows(): OrderRow[] {
  return (gridApi.value?.getSelectedRows() ?? []) as OrderRow[];
}

/* ---------- 事件（对齐 FrmSD2000DG.cs） ---------- */
async function bindData() {
  const list = ((await tmp2000Api.getOrderLst(buildQuery())) ?? []) as OrderRow[];
  rows.value = list;
  gridApi.value?.setGridOption("rowData", list);
  requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
}

async function onQuery() {
  querying.value = true;
  try {
    await bindData();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** btnDown 下发排产 */
async function onDownPlan() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.downOrderPlan(selected)) ?? 0;
    await bindData();
    toast(`成功下发${count}条！`, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** btnDel 删除 */
async function onDel() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.delOrder(selected)) ?? 0;
    await bindData();
    toast(`成功删除${count}条！`, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** btnImport 批量导入订单 → FrmSD2000DGImport（二级弹窗占位） */
function onImport() {
  toast("批量导入订单弹窗（FrmSD2000DGImport）待接入", 2500, "warn");
}

/** btnDesign 质量设计（原 Design，逐单循环） */
async function onDesign() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    const res: QualityDesignOutput[] = [];
    for (const order of selected) {
      const output = (await qualityDesignApi.design({ orderNo: order.cOrderNo ?? "" })) ?? ({} as QualityDesignOutput);
      order.nOrderProcFlag = output.success ? 8 : -1;
      order.cDesignDesc = output.message ?? null;
      res.push(output);
      gridApi.value?.refreshCells({ force: true });
    }
    const okCount = res.filter((x) => x.success).length;
    toast(`操作完成，成功：${okCount}，失败：${res.length - okCount}`, 2500, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：8 条件） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="q.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订货客户</label>
        <InputText v-model="q.cOrderCustCname" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
        <Select
          v-model="q.orderStatus"
          :options="ORDER_STATUS_OPTIONS"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="全部"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">计划类型</label>
        <Select
          v-model="q.nFlag"
          :options="NFLAG_OPTIONS"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="全部"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="q.cSgStd" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
        <DatePicker
          v-model="q.dates[0]"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          class="min-w-0 flex-1"
        />
      </div>
      <div class="col-span-2 flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">截止时间</label>
        <DatePicker
          v-model="q.dates[1]"
          :manual-input="false"
          date-format="yy-mm-dd"
          show-time
          hour-format="24"
          show-icon
          class="min-w-0 flex-1"
        />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1：查询/下发排产/批量导入订单/删除/质量设计） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDownPlan">
        <IconSend class="h-3 w-3" />下发排产
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onImport">
        <IconUpload class="h-3 w-3" />批量导入订单
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDesign">
        <IconSettings class="h-3 w-3" />质量设计
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">订单管理（{{ rows.length }}）</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
        :suppress-column-virtualisation="true"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
