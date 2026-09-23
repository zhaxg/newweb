<script setup lang="ts">
/** 对应 FrmSD2000DG_SYL（带钢钢坯提料，菜单 cQueryString=ZG02）：DDH.Winforms.SMP.Forms.FrmSD2000DG_SYL
 *  已接入：tmp2000Api.getOrderLst（查询，btnQuery/BindData——原 .cs 固定 nFlag=OrderFlagEnum.GP(8)、读取状态下拉，计划类型下拉绑定但查询不入参）
 *          + tmp2000Api.downOrderPlan（下发排产，整行提交 → 「成功下发{n}条！」）
 *          + tmp2000Api.delGPOrder（删除，整行提交 → 「成功删除{n}条！」）
 *          + tmp2000Api.matchNkSgCode（质量设计 btnDesign，原 Designer Visible=false 隐藏保留 → 「成功匹配{n}条！」无确认，照 .cs）
 *  列集：gridView1 全列 32 可见（含 Selected 选择/NStatus 订单状态）+ 44 hide:true，按 extract 一一对应
 *  待接入：批量导入订单（原 ImportDataHelper + 二级弹窗 FrmSD2000DGImport2，按 skill 弹窗占位）
 *  字段桥接：extract 为 C# PascalCase，后端 JSON 为 camelCase —— valueGetter/valueSetter 双写 */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconSearch, IconSettings, IconTrash, IconUpload } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { tmp2000Api, type InputTmp2000Dto, type QueryTmp2000Dto } from "@/api/mes4ddh/smp.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const lineCode = menuQs || undefined;

/** 原 OrderFlagEnum.GP（钢坯）= 8，swagger 枚举未含 GP 成员，按 C# 值发送 */
const ORDER_FLAG_GP = 8;

const theme = makeHmxGridTheme();
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/** extract 字段为 PascalCase、后端 JSON 为 camelCase：统一桥接读写 */
function bridge(cols: ColDef[]): ColDef[] {
  return cols.map((c) => {
    if (!c.field) return c;
    const f = c.field;
    const ck = f.charAt(0).toLowerCase() + f.slice(1);
    return {
      ...c,
      valueGetter: (p: ValueGetterParams) => (p.data as Record<string, unknown> | undefined)?.[ck] ?? (p.data as Record<string, unknown> | undefined)?.[f],
      valueSetter: (p: ValueSetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        if (!d) return false;
        d[ck] = p.newValue;
        d[f] = p.newValue;
        return true;
      },
    };
  });
}

type Row = QueryTmp2000Dto & { Selected?: boolean; COrderNo?: string; NFlag?: number };
const rows = ref<Row[]>([]);

const colDefs = ref<ColDef[]>(bridge([
      { field: "Selected", headerName: "选择", width: 64, minWidth: 64, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false },
      { field: "COrderNo", headerName: "订单号", width: 150 },
      { field: "NFlag", headerName: "计划类型", width: 150 },
      { field: "NOrderProcFlag", headerName: "处理标志", width: 150 },
      { field: "CDesignDesc", headerName: "质量设计失败说明", width: 150 },
      { field: "NStatus", headerName: "订单状态", width: 150 },
      { field: "IsTl", headerName: "是否已提料", width: 150 },
      { field: "COrderCustNo", headerName: "客户编码", width: 150 },
      { field: "COrderCustCname", headerName: "订货客户", width: 150 },
      { field: "CSteelType", headerName: "钢类", width: 150 },
      { field: "CSgCode", headerName: "钢种", width: 150 },
      { field: "CSgCodeNk", headerName: "内控钢种", width: 150 },
      { field: "CSpec", headerName: "规格", width: 150 },
      { field: "NThick", headerName: "厚度", width: 150 },
      { field: "NWidth", headerName: "宽度", width: 150 },
      { field: "NLen", headerName: "长度", width: 150 },
      { field: "CDelivyStatusDesc", headerName: "交货状态说明", width: 150 },
      { field: "NNum", headerName: "订货件数", width: 150 },
      { field: "NWgt", headerName: "订单重量", width: 150 },
      { field: "CSgStd", headerName: "执行标准", width: 150 },
      { field: "CConRemark", headerName: "备注", width: 150 },
      { field: "DJhqTime", headerName: "交货期", width: 150 },
      { field: "NThickTolMin", headerName: "厚度下偏差", width: 150 },
      { field: "NThickTolMax", headerName: "厚度上偏差", width: 150 },
      { field: "NWidthTolMin", headerName: "宽度下偏差", width: 150 },
      { field: "NWidthTolMax", headerName: "宽度上偏差", width: 150 },
      { field: "CLineCode", headerName: "产线代码", width: 150 },
      { field: "Creator", headerName: "创建人", width: 150 },
      { field: "CreateTime", headerName: "创建时间", width: 150 },
      { field: "CSendUserId", headerName: "销售提报人", width: 150 },
      { field: "DSendTime", headerName: "销售提报时间", width: 150 },
      { field: "CShape", headerName: "产品大类", width: 150 },
      { field: "Id", headerName: "主键", hide: true },
      { field: "NThickMin", headerName: "厚度下限", hide: true },
      { field: "NThickMax", headerName: "厚度上限", hide: true },
      { field: "NWidthMin", headerName: "宽度下限", hide: true },
      { field: "NWidthMax", headerName: "宽度上限", hide: true },
      { field: "NWidthWgt", headerName: "边部宽度余量", hide: true },
      { field: "CLengthType", headerName: "长度类型", hide: true },
      { field: "NLenMin", headerName: "长度下限", hide: true },
      { field: "NLenMax", headerName: "长度上限", hide: true },
      { field: "CDelivyStatusCode", headerName: "交货状态", hide: true },
      { field: "CTrimFlag", headerName: "切边方式", hide: true },
      { field: "COverstepBl", headerName: "短溢装比例", hide: true },
      { field: "CDelivyQtyFlag", headerName: "计重方式", hide: true },
      { field: "CTol", headerName: "公差", hide: true },
      { field: "CFlawDesc", headerName: "探伤等级", hide: true },
      { field: "CConNo", headerName: "合同号", hide: true },
      { field: "CDelivyAddress", headerName: "流向", hide: true },
      { field: "CSpecialMarkGy", headerName: "性能要求", hide: true },
      { field: "NWtMax", headerName: "单量上限", hide: true },
      { field: "NWtMin", headerName: "单量下限", hide: true },
      { field: "CInboundNo", headerName: "入库标识", hide: true },
      { field: "NLenTolMin", headerName: "长度下偏差", hide: true },
      { field: "NLenTolMax", headerName: "长度上偏差", hide: true },
      { field: "DTimeShipment", headerName: "预计船期", hide: true },
      { field: "CJrzzgyCode", headerName: "加热轧制工艺编码", hide: true },
      { field: "CJqgyCode", headerName: "剪切工艺编码", hide: true },
      { field: "CExitem1", headerName: "是否工程单", hide: true },
      { field: "LastModifier", headerName: "最后修改人", hide: true },
      { field: "LastModifyTime", headerName: "最后修改时间", hide: true },
      { field: "CDeptCode", headerName: "部门编码", hide: true },
      { field: "COrderProcUserId", headerName: "合同处理操作人", hide: true },
      { field: "DOrderProcTime", headerName: "合同处理时间", hide: true },
      { field: "CZgGyCode", headerName: "轧钢工艺编码", hide: true },
      { field: "CPushUserId", headerName: "下发生产人", hide: true },
      { field: "DPushTime", headerName: "下发生产时间", hide: true },
      { field: "NSfpj", headerName: "评审状态", hide: true },
      { field: "CPjName", headerName: "评审人", hide: true },
      { field: "NExitem2", headerName: "申请通知", hide: true },
      { field: "COrderTypeCode", headerName: "订单性质编码", hide: true },
      { field: "COrderTypeDesc", headerName: "订单性质说明", hide: true },
      { field: "CExitem4", headerName: "变更原因", hide: true },
      { field: "CExitem3", headerName: "原始订单号", hide: true },
      { field: "OrderCP", headerName: "侧喷要求", hide: true },
      { field: "CGf", headerName: "平直度", hide: true },
]));

/* 查询条件（原 dataLayoutControl1，8 条件） */
const q = reactive({
  cOrderNo: "",
  cSgCode: "",
  cOrderCustCname: "",
  dBegin: null as Date | null,
  dEnd: null as Date | null,
  orderStatus: null as number | null,
  nFlag: null as number | null,
  cSgStd: "",
});
const statusOptions = [
  { label: "已下发", value: 0 },
  { label: "已排产", value: 10 },
  { label: "生产关闭", value: 30 },
  { label: "退回销售", value: 40 },
  { label: "结案", value: 50 },
  { label: "订单完成", value: 60 },
  { label: "拆分", value: 70 },
  { label: "未下发", value: -1 },
];
const flagOptions = [
  { label: "销售订单", value: 0 },
  { label: "余量板", value: 1 },
  { label: "补产订单", value: 2 },
  { label: "流通材", value: 3 },
  { label: "试验料", value: 4 },
];

function fmt(d?: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function pickedRows(): Row[] {
  return rows.value.filter((r) => Boolean(r.selected ?? r.Selected));
}
function orderNos(list: Row[]): string[] {
  return list.map((r) => r.cOrderNo ?? r.COrderNo ?? "").filter(Boolean);
}

async function query() {
  querying.value = true;
  try {
    const input = {
      cOrderNo: q.cOrderNo || undefined,
      cSgCode: q.cSgCode || undefined,
      cOrderCustCname: q.cOrderCustCname || undefined,
      dBegin: fmt(q.dBegin),
      dEnd: fmt(q.dEnd),
      orderStatus: q.orderStatus ?? undefined,
      cLineCode: lineCode,
      nFlag: ORDER_FLAG_GP,
    } as unknown as InputTmp2000Dto;
    rows.value = ((await tmp2000Api.getOrderLst(input)) ?? []) as Row[];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}

/** 下发排产：btnDown_Click → DownOrderPlan(整行) */
async function onDown() {
  const sel = pickedRows();
  if (!sel.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const count = (await tmp2000Api.downOrderPlan(sel as QueryTmp2000Dto[])) ?? 0;
  await query();
  toast(`成功下发${count}条！`, 2000, "success");
}

/** 批量导入订单：btnImport_Click（ImportDataHelper + FrmSD2000DGImport2）——二级弹窗占位 */
function onImport() {
  toast("批量导入订单弹窗（FrmSD2000DGImport2）待接入", 2500, "warn");
}

/** 删除：btnDel_Click → DelGPOrder(整行) */
async function onDel() {
  const sel = pickedRows();
  if (sel.length <= 0) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const count = (await tmp2000Api.delGPOrder(sel as QueryTmp2000Dto[])) ?? 0;
  await query();
  toast(`成功删除${count}条！`, 2000, "success");
}

/** 质量设计：btnDesign_Click → MatchNkSgCode（原 Designer Visible=false，无确认，照 .cs） */
async function onDesign() {
  const sel = pickedRows();
  if (sel.length <= 0) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  const count = (await tmp2000Api.matchNkSgCode(lineCode, orderNos(sel))) ?? 0;
  await query();
  toast(`成功匹配${count}条！`, 2000, "success");
}

onMounted(() => {
  const now = new Date();
  q.dBegin = new Date(now.getFullYear(), now.getMonth(), 1);
  q.dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：8 条件；查询按钮在下方工具栏） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="q.cOrderNo" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="q.cSgCode" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订货客户</label>
        <InputText v-model="q.cOrderCustCname" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
        <DatePicker v-model="q.dBegin" :manual-input="false" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">截止时间</label>
        <DatePicker v-model="q.dEnd" :manual-input="false" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
        <Select v-model="q.orderStatus" :options="statusOptions" option-label="label" option-value="value"
          placeholder="请选择" show-clear class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">计划类型</label>
        <Select v-model="q.nFlag" :options="flagOptions" option-label="label" option-value="value"
          placeholder="请选择" show-clear class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="q.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1：查询/下发排产/批量导入订单/删除/质量设计(隐藏)） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDown">下发排产</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onImport">
        <IconUpload class="h-3 w-3" />批量导入订单
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <!-- 原 btnDesign Visible=false：元素保留、不可见 -->
      <Button text class="hidden shrink-0 whitespace-nowrap" @click="onDesign">
        <IconSettings class="h-3 w-3" />质量设计
      </Button>
    </div>

    <!-- 主表（原 gridControl1/gridView1） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
