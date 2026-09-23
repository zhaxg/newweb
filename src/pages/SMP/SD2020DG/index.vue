<script setup lang="ts">
/** 对应 FrmSD2020DG（带钢/线材/棒材提料，3 菜单共用 cQueryString=ZG02/ZG03/ZG04）：DDH.Winforms.SMP.Forms.FrmSD2020DG
 *  已接入：tmp2000Api.getOrderLst2（查询，btnQuery/BindData）
 *          + tmp2000Api.backSaleOrder（退回销售，「成功退回销售订单{n}条！」）
 *          + tLZG02Api.insertTLZG02（生成提料单，校验「请选择计划日期！」「请选择坯型！」→「成功生成提料单{n}条！」）
 *          + tmp2000Api.finishOrder("Y"/"N")（订单结案/取消结案，「操作成功{n}条！」）
 *          + tLZG02Api.getSlabCodeList（提料坯型下拉，原 SearchLookUpEdit DisplayMember=CName/ValueMember=CCode，NullText=请选择坯型）
 *  列集：gridView1 全列 28 可见（含 Selected 选择/NStatus 订单状态）+ 47 hide:true，按 extract 一一对应；
 *        searchLookUpEdit1View（提料坯型弹出视图，同 28+47 列）按 ui-rules LookUpEdit→Select 映射为下拉，不单独成表
 *  原 BindData 未读取状态下拉（绑定存在但查询不入参），web 照 .cs 不发送 orderStatus；状态/计划类型枚举下拉照 Designer 照抄
 *  字段桥接：extract 为 C# PascalCase，后端 JSON 为 camelCase —— valueGetter/valueSetter 双写（PLAN_* → pLAN_* 同后端契约）
 *  待接入：无（打印/导入等原窗体未提供） */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import ToggleSwitch from "primevue/toggleswitch";
import { IconPlayerPlay, IconSearch, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { tmp2000Api, tLZG02Api, type InputTmp2000Dto, type QueryTmp2000Dto, type TLSlabDto, type InsertTlZG02Dto } from "@/api/mes4ddh/smp.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const lineCode = menuQs || undefined;

const theme = makeHmxGridTheme();
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/** extract 字段为 PascalCase、后端 JSON 为 camelCase：统一桥接读写（PLAN_* 首字母小写即 pLAN_* 契约） */
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
      { field: "NStatus", headerName: "订单状态", width: 150 },
      { field: "IsTl", headerName: "是否已提料", width: 150 },
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
      { field: "CTol", headerName: "公差", width: 150 },
      { field: "CSgStd", headerName: "执行标准", width: 150 },
      { field: "CConRemark", headerName: "备注", width: 150 },
      { field: "NThickTolMin", headerName: "厚度下偏差", width: 150 },
      { field: "NThickTolMax", headerName: "厚度上偏差", width: 150 },
      { field: "NWidthTolMin", headerName: "宽度下偏差", width: 150 },
      { field: "NWidthTolMax", headerName: "宽度上偏差", width: 150 },
      { field: "CLineCode", headerName: "产线代码", width: 150 },
      { field: "Creator", headerName: "创建人", width: 150 },
      { field: "CreateTime", headerName: "创建时间", width: 150 },
      { field: "CSendUserId", headerName: "销售提报人", width: 150 },
      { field: "DSendTime", headerName: "销售提报时间", width: 150 },
      { field: "Id", headerName: "主键", hide: true },
      { field: "COrderCustNo", headerName: "客户编码", hide: true },
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
      { field: "CFlawDesc", headerName: "探伤等级", hide: true },
      { field: "CConNo", headerName: "合同号", hide: true },
      { field: "DJhqTime", headerName: "交货期", hide: true },
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
      { field: "CDesignDesc", headerName: "质量设计失败说明", hide: true },
      { field: "NOrderProcFlag", headerName: "合同处理标志（", hide: true },
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

/* 查询条件（原 dataLayoutControl1；下拉枚举照 Designer 提取摘要抄写） */
const q = reactive({
  cOrderNo: "",
  cSgCode: "",
  cSgStd: "",
  cOrderCustCname: "",
  dBegin: null as Date | null,
  dEnd: null as Date | null,
  orderStatus: null as number | null,
  nFlag: null as number | null,
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

/* stackPanel1 内的提料参数：计划日期 datePlan / 提料坯型 searchLookUpEdit1 / 是否冷坯计划 SlabSwitch */
const dtPlan = ref<Date | null>(null);
const slabCode = ref<string | null>(null);
const slabCool = ref(false);
const slabOptions = ref<TLSlabDto[]>([]);

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
      cSgStd: q.cSgStd || undefined,
      cOrderCustCname: q.cOrderCustCname || undefined,
      dBegin: fmt(q.dBegin),
      dEnd: fmt(q.dEnd),
      cLineCode: lineCode,
      nFlag: q.nFlag ?? undefined,
    } as unknown as InputTmp2000Dto;
    rows.value = ((await tmp2000Api.getOrderLst2(input)) ?? []) as Row[];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}

/** 退回销售：btnBack_Click */
async function onBack() {
  const nos = orderNos(pickedRows());
  if (nos.length <= 0) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const count = (await tmp2000Api.backSaleOrder(nos)) ?? 0;
  await query();
  toast(`成功退回销售订单${count}条！`, 2000, "success");
}

/** 生成提料单：btnTL_Click（校验计划日期/坯型后 InsertTLZG02） */
async function onGen() {
  const nos = orderNos(pickedRows());
  if (nos.length <= 0) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!dtPlan.value) {
    toast("请选择计划日期！", 2000, "warn");
    return;
  }
  if (!slabCode.value) {
    toast("请选择坯型！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const mod = {
    cPlanTime: fmt(dtPlan.value),
    slabCode: slabCode.value,
    cCool: slabCool.value ? "Y" : "N",
    cLineCode: lineCode,
  } as InsertTlZG02Dto;
  const count = (await tLZG02Api.insertTLZG02(mod, nos)) ?? 0;
  await query();
  toast(`成功生成提料单${count}条！`, 2000, "success");
}

/** 订单结案：btnCloseCase_Click → FinishOrder(selected,"Y") */
async function onCloseCase() {
  const nos = orderNos(pickedRows());
  if (!nos.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const count = (await tmp2000Api.finishOrder("Y", nos)) ?? 0;
  await query();
  toast(`操作成功${count}条！`, 2000, "success");
}

/** 取消结案：btnCancelCloseCase_Click → FinishOrder(selected,"N")，确认文案带勾选条数 */
async function onCancelClose() {
  const nos = orderNos(pickedRows());
  if (!nos.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm(`勾选订单${nos.length}条，确定吗？`)) return;
  const count = (await tmp2000Api.finishOrder("N", nos)) ?? 0;
  await query();
  toast(`操作成功${count}条！`, 2000, "success");
}

onMounted(async () => {
  const now = new Date();
  q.dBegin = new Date(now.getFullYear(), now.getMonth(), 1);
  q.dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  slabOptions.value = (await tLZG02Api.getSlabCodeList()) ?? [];
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：8 条件；查询按钮在下方 stackPanel1 行首） -->
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
        <label class="w-16 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="q.cSgStd" class="min-w-0 flex-1" @keydown.enter="query" />
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
    </div>

    <!-- 工具栏（原 stackPanel1 单行：查询/退回销售 → 计划日期·提料坯型·是否冷坯计划 → 生成提料单/订单结案/取消结案） -->
    <div class="flex h-9 shrink-0 flex-wrap items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onBack">退回销售</Button>
      <label class="ml-2 shrink-0 whitespace-nowrap text-xs text-muted-foreground">计划日期</label>
      <DatePicker v-model="dtPlan" :manual-input="false" date-format="yy-mm-dd" show-icon class="!w-36 shrink-0" />
      <label class="ml-2 shrink-0 whitespace-nowrap text-xs text-muted-foreground">提料坯型</label>
      <Select v-model="slabCode" :options="slabOptions" option-label="cName" option-value="cCode"
        placeholder="请选择坯型" show-clear class="!w-44 shrink-0" />
      <label class="ml-2 shrink-0 whitespace-nowrap text-xs text-muted-foreground">是否冷坯计划</label>
      <ToggleSwitch v-model="slabCool" class="shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onGen">
        <IconPlayerPlay class="h-3 w-3" />生成提料单
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCloseCase">订单结案</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCancelClose">
        <IconX class="h-3 w-3" />取消结案
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
