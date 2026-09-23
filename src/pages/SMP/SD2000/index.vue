<script setup lang="ts">
/** 对应 FrmSD2000（中厚板订单管理）：DDH.Winforms.SMP.Forms.FrmSD2000
 *  已接入：tmp2000Api.getOrderLst（查询，CLineCode=菜单 cQueryString=ZG01）
 *          / downOrderPlan（下发排产）/ backOrderPlan（撤回订单）/ delOrder（删除订单）
 *          + qualityDesignApi.designZHB（质量设计，逐单循环）
 *          + systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG")（切边方式字典，原 KeyValueFormatters.CUTFLAG）
 *  待接入：tmp2000Api.importByBx —— btnBXImport_Click 事件仍在 .cs，但 Designer 已无对应按钮
 *          （barButtonItem1/barCheckItem1 为 ribbon 伪元素，不迁），无可挂载入口
 *          batchUpdateOrder —— 入参取自 FrmSD2000Edit 弹窗（当前占位 toast），弹窗迁移后再接
 *          FrmSD2010（复制新增/编辑订单）、FrmImportTmp2000（批量导入订单）二级弹窗占位
 *  布局：查询区（12 条件）→ 工具栏 h-9（stackPanel2 原序）→ 单表
 *  列：57 可见 + 17 hide（按提取摘要）
 *  备注：Designer 存在孤儿控件 textEdit2/layoutControlItem2（未加入 dataLayoutControl1，无绑定），未渲染 */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import {
  IconCopy,
  IconPencil,
  IconPlayerPlay,
  IconRefresh,
  IconSearch,
  IconSend,
  IconSettings,
  IconTrash,
  IconUpload,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { tmp2000Api, type InputTmp2000Dto, type QueryTmp2000Dto } from "@/api/mes4ddh/smp.swagger";
import { qualityDesignApi, type QualityDesignOutput } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const theme = makeHmxGridTheme();

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

/* ---------- 查询（原 InputTmp2000Dto；Load 默认 当月1日 ~ 今天） ---------- */
function firstDayOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

const q = reactive({
  cSgCode: "",
  cOrderCustCname: "",
  dates: [firstDayOfMonth(), new Date()] as [Date, Date],
  cLineCode: "",
  orderStatus: null as number | null,
  cOrderNo: "",
  nFlag: null as number | null,
  cOrderNo2: "",
  cSgStd: "",
  cTrimFlag: null as string | null,
  cInboundNo: "",
});

/* 状态：原 Load 里 AddEnum(typeof(Tmp2000StatusEnum)) */
const ORDER_STATUS_OPTIONS = [
  { label: "未下发", value: -1 },
  { label: "已下发", value: 0 },
  { label: "已排产", value: 10 },
  { label: "生产关闭", value: 30 },
  { label: "退回销售", value: 40 },
  { label: "结案", value: 50 },
];
/* 计划类型：Designer Items.AddRange(OrderFlagEnum) */
const NFLAG_OPTIONS = [
  { label: "销售订单", value: 0 },
  { label: "余量板", value: 1 },
  { label: "补产订单", value: 2 },
  { label: "流通材", value: 3 },
];
/* 切边方式：原 KeyValueFormatters.CUTFLAG → 系统字典 010100:CUTFLAG */
const trimOptions = ref<{ label: string; value: string }[]>([]);

function buildQuery(): InputTmp2000Query {
  return {
    cSgCode: q.cSgCode || null,
    cOrderCustCname: q.cOrderCustCname || null,
    dBegin: q.dates[0]?.toISOString() ?? null,
    dEnd: q.dates[1]?.toISOString() ?? null,
    /* 原窗体 CLineCode = this.QueryString（菜单 cQueryString=ZG01），输入框可兜底 */
    cLineCode: menuQs || q.cLineCode || null,
    orderStatus: (q.orderStatus ?? null) as InputTmp2000Dto["orderStatus"],
    cOrderNo: q.cOrderNo || null,
    nFlag: (q.nFlag ?? null) as InputTmp2000Dto["nFlag"],
    cOrderNo2: q.cOrderNo2 || null,
    cSgStd: q.cSgStd || null,
    cTrimFlag: q.cTrimFlag || null,
    cInboundNo: q.cInboundNo || null,
  };
}

/* ---------- 列（提取摘要：57 可见 + 17 hide） ---------- */
const colDefs = ref<ColDef[]>([
  { field: "selected", headerName: "选择", hide: true },
  { field: "cOrderNo", headerName: "订单号", width: 140 },
  { field: "nStatus", headerName: "订单状态", width: 100 },
  {
    field: "nOrderProcFlag",
    headerName: "处理标志",
    width: 100,
    /* 原 gridView1_CustomDrawCell：失败红底 / 成功绿底 */
    cellClassRules: {
      "bg-red-500/25": (p) => Number(p.value) === -1,
      "bg-green-500/25": (p) => Number(p.value) === 8,
    },
  },
  { field: "cDesignDesc", headerName: "质量设计失败说明", width: 170 },
  { field: "isTl", headerName: "是否提料", width: 100 },
  { field: "nFlag", headerName: "计划类型", width: 100 },
  { field: "cOrderCustNo", headerName: "客户编码", width: 110 },
  { field: "cOrderCustCname", headerName: "订货客户", width: 150 },
  { field: "cSettleCust", headerName: "结算单位", width: 150 },
  { field: "cSgCode", headerName: "钢种", width: 100 },
  { field: "cSteelType", headerName: "品名", width: 90 },
  { field: "nNum", headerName: "订货件数", width: 100 },
  { field: "nWgt", headerName: "订单重量", width: 100 },
  { field: "nThick", headerName: "厚度", width: 80 },
  { field: "nThickMin", headerName: "厚度下限", width: 100 },
  { field: "nThickMax", headerName: "厚度上限", width: 100 },
  { field: "nWidth", headerName: "宽度", width: 80 },
  { field: "nWidthMin", headerName: "宽度下限", width: 100 },
  { field: "nWidthMax", headerName: "宽度上限", width: 100 },
  { field: "nWidthWgt", headerName: "边部宽度余量", width: 120 },
  { field: "cLengthType", headerName: "长度类型", width: 100 },
  { field: "nLenMin", headerName: "长度下限", width: 100 },
  { field: "nLenMax", headerName: "长度上限", width: 100 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 100 },
  { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 130 },
  { field: "cTrimFlag", headerName: "切边方式", width: 100 },
  { field: "cOverstepBl", headerName: "短溢装比例", width: 110 },
  { field: "cDelivyQtyFlag", headerName: "计重方式", width: 100 },
  { field: "cTol", headerName: "公差", width: 80 },
  { field: "cFlawDesc", headerName: "探伤等级", width: 100 },
  { field: "cConNo", headerName: "合同号", width: 120 },
  { field: "cSgStd", headerName: "执行标准", width: 110 },
  { field: "dJhqTime", headerName: "交货期", width: 120 },
  { field: "cDelivyAddress", headerName: "流向", width: 110 },
  { field: "cSpecialMarkGy", headerName: "性能要求", width: 130 },
  { field: "nWtMax", headerName: "单量上限", width: 100 },
  { field: "nWtMin", headerName: "单量下限", width: 100 },
  { field: "cSpec", headerName: "规格", width: 130 },
  { field: "cConRemark", headerName: "特殊要求", width: 150 },
  { field: "cCustStdDesc", headerName: "加工用途说明", width: 150 },
  { field: "orderCP", headerName: "边部是否喷印", width: 120 },
  { field: "cInboundNo", headerName: "入库标识", width: 110 },
  { field: "cExitem1", headerName: "是否工程单", width: 110 },
  { field: "cIFYlc", headerName: "是否带走余量材", width: 140 },
  { field: "cOrderTypeDesc", headerName: "订单性质说明", width: 120 },
  { field: "dTimeShipment", headerName: "预计船期", width: 130 },
  { field: "cLineCode", headerName: "产线代码", width: 100 },
  { field: "dOrderProcTime", headerName: "合同处理时间", width: 160 },
  { field: "cExitem4", headerName: "变更原因", width: 140 },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "createTime", headerName: "创建时间", width: 160 },
  { field: "lastModifier", headerName: "最后修改人", width: 110 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 160 },
  { field: "cSendUserId", headerName: "销售提报人", width: 110 },
  { field: "dSendTime", headerName: "销售提报时间", width: 160 },
  { field: "cSaleEmp", headerName: "销售业务员", width: 110 },
  /* 隐藏列（提取 hide 规则） */
  { field: "nThickTolMin", headerName: "厚度下偏差", hide: true },
  { field: "nThickTolMax", headerName: "厚度上偏差", hide: true },
  { field: "nWidthTolMin", headerName: "宽度下偏差", hide: true },
  { field: "nWidthTolMax", headerName: "宽度上偏差", hide: true },
  { field: "nLenTolMin", headerName: "长度下偏差", hide: true },
  { field: "nLenTolMax", headerName: "长度上偏差", hide: true },
  { field: "cSgCodeNk", headerName: "内控钢种", hide: true },
  { field: "cJrzzgyCode", headerName: "加热轧制工艺编码", hide: true },
  { field: "cJqgyCode", headerName: "剪切工艺编码", hide: true },
  { field: "cDeptCode", headerName: "部门编码", hide: true },
  { field: "cOrderProcUserId", headerName: "合同处理操作人", hide: true },
  { field: "cZgGyCode", headerName: "轧钢工艺编码", hide: true },
  { field: "cPushUserId", headerName: "下发生产人", hide: true },
  { field: "dPushTime", headerName: "下发生产时间", hide: true },
  { field: "nSfpj", headerName: "评审状态", hide: true },
  { field: "cPjName", headerName: "评审人", hide: true },
  { field: "id", headerName: "主键", hide: true },
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

/* ---------- 事件（对齐 FrmSD2000.cs） ---------- */
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

/** btnBack 撤回订单（原 Visible=false，按硬规则保留入口） */
async function onBackPlan() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.backOrderPlan(selected)) ?? 0;
    await bindData();
    toast(`成功撤回${count}条！`, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** btnDel 删除订单 */
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

/** btnAdd 复制新增 → FrmSD2010（二级弹窗占位） */
function onAdd() {
  toast("新增订单弹窗（FrmSD2010）待接入", 2500, "warn");
}

/** btnEdit 编辑订单 → FrmSD2010（二级弹窗占位） */
function onEdit() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  toast("编辑订单弹窗（FrmSD2010）待接入", 2500, "warn");
}

/** btnImport 批量导入订单 → FrmImportTmp2000（二级弹窗占位） */
function onImport() {
  toast("批量导入弹窗（FrmImportTmp2000）待接入", 2500, "warn");
}

/** btnBatchEdit 批量修改 → FrmSD2000Edit（二级弹窗占位；batchUpdateOrder 入参取自该弹窗） */
function onBatchEdit() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择要修改的订单！", 2000, "warn");
    return;
  }
  toast("批量修改弹窗（FrmSD2000Edit）待接入", 2500, "warn");
}

/** btnDesign 质量设计（qualityDesignApi.designZHB 逐单循环） */
async function onDesign() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择要质量设计的订单！", 2000, "warn");
    return;
  }
  if (!window.confirm(`确认对选中的 ${selected.length} 个订单进行质量设计？`)) return;
  querying.value = true;
  try {
    const res: QualityDesignOutput[] = [];
    for (const order of selected) {
      const output = (await qualityDesignApi.designZHB({ orderNo: order.cOrderNo ?? "" })) ?? ({} as QualityDesignOutput);
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

async function loadTrimOptions() {
  try {
    const list = (await systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG")) ?? [];
    trimOptions.value = list.map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(() => {
  void loadTrimOptions();
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：12 条件） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订货客户</label>
        <InputText v-model="q.cOrderCustCname" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">产线</label>
        <InputText v-model="q.cLineCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-12 shrink-0 text-xs text-muted-foreground">状态</label>
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
        <label class="w-14 shrink-0 text-xs text-muted-foreground">计划类型</label>
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
        <label class="w-14 shrink-0 text-xs text-muted-foreground">开始时间</label>
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
        <label class="w-14 shrink-0 text-xs text-muted-foreground">截止时间</label>
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
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="q.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">订单号(模糊)</label>
        <InputText v-model="q.cOrderNo2" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>

      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-14 shrink-0 text-xs text-muted-foreground">切边方式</label>
        <Select
          v-model="q.cTrimFlag"
          :options="trimOptions"
          option-label="label"
          option-value="value"
          show-clear
          filter
          placeholder="全部"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="q.cInboundNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel2：查询/下发排产/复制新增/编辑订单/撤回订单/删除订单/批量导入订单/质量设计/批量修改） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDownPlan">
        <IconSend class="h-3 w-3" />下发排产
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconCopy class="h-3 w-3" />复制新增
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑订单
      </Button>
      <!-- 原 btnBack Visible=false，按硬规则保留入口 -->
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onBackPlan">
        <IconRefresh class="h-3 w-3" />撤回订单
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除订单
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onImport">
        <IconUpload class="h-3 w-3" />批量导入订单
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDesign">
        <IconSettings class="h-3 w-3" />质量设计
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onBatchEdit">
        <IconPlayerPlay class="h-3 w-3" />批量修改
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">中厚板订单管理（{{ rows.length }}）</span>
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
