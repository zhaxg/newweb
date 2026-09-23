<script setup lang="ts">
/** 对应 FrmTL2000DG（带钢/线材/棒材评审，3 菜单共用 cQueryString=ZG02/ZG03/ZG04）：DDH.Winforms.SMP.Forms.FrmTL2000DG
 *  已接入：tLApi.queryOrderNew（查询，btnQuery/BindData——DTimeStart/DTimeEnd/CLineCode/NTlStatus + 订单号按换行拆 OrderLst）
 *          + tLZG02Api.checkedTlNew（审核，「选择操作项！」「确定吗？」→「审核成功{n}条！」）
 *          + tLZG02Api.cancleCheckedTlNew（取消审核 → 「取消审核{n}条！」）
 *          + tLZG02Api.delTl（删除 → 「删除{n}条！」）
 *          + tLApi.tlProdClose（已审提料生产关闭，整行提交、.cs 不回查 → 「执行成功{n}条！」）
 *  列集：gridView1 全列 26 可见（含 Selected 选择）+ 149 hide:true，按 extract 一一对应
 *  原 Load 塞入状态下拉 OrderTlEnum（未提料/已提料/已审核）；钢种/订货客户控件绑定但 BindData 不入参，照 .cs 不发送
 *  原 Designer 另有 orphan 控件 simpleButton3（未加入任何容器），不渲染
 *  待接入：无；SimpleButton simpleButton3 为未挂载孤儿控件（Designer Controls.Add 缺席）
 *  字段桥接：extract 为 C# PascalCase，后端 JSON 为 camelCase —— valueGetter/valueSetter 双写 */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconCheck, IconSearch, IconTrash, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { tLApi, tLZG02Api, OrderTlEnum, type InputTmp2010Dto, type Tmp2005Dto } from "@/api/mes4ddh/smp.swagger";
import BatchIdInput from "@/pages/Widgets/BatchIdInput/index.vue";
import { parseBatchIds } from "@/pages/Widgets/BatchIdInput/parse";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const lineCode = menuQs || undefined;

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

type Row = Tmp2005Dto & { Selected?: boolean; COrderNo?: string };
const rows = ref<Row[]>([]);

const colDefs = ref<ColDef[]>(bridge([
      { field: "Selected", headerName: "选择", width: 64, minWidth: 64, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false },
      { field: "CCool", headerName: "是否冷坯计划", width: 114 },
      { field: "NTlStatus", headerName: "提料状态", width: 100 },
      { field: "CPlanTime", headerName: "计划日期", width: 114 },
      { field: "COrderNo", headerName: "提料计划号", width: 150 },
      { field: "COrderCustCname", headerName: "订货客户", width: 100 },
      { field: "COrderNo1", headerName: "订单号1", width: 100 },
      { field: "CSgCode", headerName: "钢种", width: 150 },
      { field: "CSgStd", headerName: "执行标准", width: 150 },
      { field: "NThick", headerName: "厚度", width: 150 },
      { field: "NWidth", headerName: "宽度", width: 116 },
      { field: "CSpec", headerName: "成品规格", width: 150 },
      { field: "NNum", headerName: "订货件数", width: 116 },
      { field: "CTol", headerName: "公差", width: 100 },
      { field: "CTlSgCode", headerName: "炼钢钢种", width: 100 },
      { field: "NSlabThick", headerName: "钢坯厚度", width: 100 },
      { field: "NSlabWidth", headerName: "钢坯宽度", width: 100 },
      { field: "NSlabQua", headerName: "钢坯支数", width: 100 },
      { field: "NWgtUnit", headerName: "钢坯单支重量", width: 100 },
      { field: "NSlabLenMin", headerName: "钢坯长度最小值", width: 100 },
      { field: "NSlabWgt", headerName: "坯料重量", width: 100 },
      { field: "CSlabSize", headerName: "坯料规格", width: 100 },
      { field: "NThickTolMin", headerName: "厚度下偏差", width: 100 },
      { field: "NThickTolMax", headerName: "厚度上偏差", width: 100 },
      { field: "NWidthTolMin", headerName: "宽度下偏差", width: 100 },
      { field: "NWidthTolMax", headerName: "宽度上偏差", width: 100 },
      { field: "Id", headerName: "主键", hide: true },
      { field: "Creator", headerName: "创建人", hide: true },
      { field: "CreateTime", headerName: "创建时间", hide: true },
      { field: "LastModifier", headerName: "最后修改人", hide: true },
      { field: "LastModifyTime", headerName: "最后修改时间", hide: true },
      { field: "NStatus", headerName: "订单状态", hide: true },
      { field: "CTlOrderNo", headerName: "提料订单号", hide: true },
      { field: "CLineCode", headerName: "产线代码", hide: true },
      { field: "CConNo", headerName: "合同号", hide: true },
      { field: "NWgt", headerName: "订单重量", hide: true },
      { field: "NWgtSy", headerName: "剩余重量", hide: true },
      { field: "NThickMin", headerName: "厚度下限", hide: true },
      { field: "NThickMax", headerName: "厚度上限", hide: true },
      { field: "NWidthMin", headerName: "宽度下限", hide: true },
      { field: "NWidthMax", headerName: "宽度上限", hide: true },
      { field: "NLen", headerName: "长度", hide: true },
      { field: "CLengthType", headerName: "长度类型", hide: true },
      { field: "NLenMin", headerName: "长度下限", hide: true },
      { field: "NLenMax", headerName: "长度上限", hide: true },
      { field: "CSteelType", headerName: "钢类", hide: true },
      { field: "CProdCode", headerName: "品名代码", hide: true },
      { field: "NDbc", headerName: "单倍尺", hide: true },
      { field: "CMsc", headerName: "冶金规范", hide: true },
      { field: "CPsc", headerName: "产品规范码", hide: true },
      { field: "CMscLineNo", headerName: "冶金规范产线号", hide: true },
      { field: "CMscLineDesc", headerName: "产线描述", hide: true },
      { field: "CWholeBacklog", headerName: "全程工序码", hide: true },
      { field: "CWholeBacklogDesc", headerName: "全程工序说明", hide: true },
      { field: "CDelivyStatusCode", headerName: "交货状态", hide: true },
      { field: "CCustStdCode", headerName: "加工用途代码", hide: true },
      { field: "COrderCustNo", headerName: "订货客户编码", hide: true },
      { field: "COrderCustEname", headerName: "订货客户英文名称", hide: true },
      { field: "CProductH", headerName: "重点品种", hide: true },
      { field: "COrderTypeCode", headerName: "合同性质QAA期货", hide: true },
      { field: "CExportFlag", headerName: "出口标志", hide: true },
      { field: "DOrderTime", headerName: "订单日期", hide: true },
      { field: "DJhqTime", headerName: "合同交货期", hide: true },
      { field: "CMatCode", headerName: "物料编码", hide: true },
      { field: "CMatName", headerName: "物料名称", hide: true },
      { field: "CSlabType", headerName: "自备坯R", hide: true },
      { field: "CConRemark", headerName: "合同备注", hide: true },
      { field: "CSpecialMarkGy", headerName: "工艺/性能要求", hide: true },
      { field: "CWarrantyDesc", headerName: "质保书要求", hide: true },
      { field: "CPackCode", headerName: "特殊包装要求", hide: true },
      { field: "COrderProcFlag", headerName: "合同处理标志（", hide: true },
      { field: "CDelivyQtyFlag", headerName: "计重方式", hide: true },
      { field: "CDeptCode", headerName: "部门编码", hide: true },
      { field: "NFlag", headerName: "计划类型", hide: true },
      { field: "CProdName", headerName: "品名名称", hide: true },
      { field: "CDelivyStatusDesc", headerName: "交货状态说明", hide: true },
      { field: "CCustStdDesc", headerName: "加工用途说明", hide: true },
      { field: "NApplyCloseStatus", headerName: "1待封锁", hide: true },
      { field: "CApplyCloseEmp", headerName: "申请关闭人", hide: true },
      { field: "DApplyCloseDt", headerName: "申请关闭时间", hide: true },
      { field: "CApplyCloseRemark", headerName: "申请关闭说明", hide: true },
      { field: "CDesignNo", headerName: "质量设计号", hide: true },
      { field: "CDesignDesc", headerName: "质量设计失败说明", hide: true },
      { field: "NWtMax", headerName: "单量上限", hide: true },
      { field: "NWtMin", headerName: "单量下限", hide: true },
      { field: "NSendNum", headerName: "发送次数", hide: true },
      { field: "NWidthWgt", headerName: "边部宽度余量", hide: true },
      { field: "CTrimFlag", headerName: "切边方式", hide: true },
      { field: "CFlawDesc", headerName: "探伤等级", hide: true },
      { field: "CDelivyAddress", headerName: "流向", hide: true },
      { field: "COverstepBl", headerName: "短溢装比例", hide: true },
      { field: "CInboundNo", headerName: "入库标识", hide: true },
      { field: "CShape", headerName: "形状代码", hide: true },
      { field: "CSlabSource", headerName: "供坯单位", hide: true },
      { field: "CTlSgStd", headerName: "炼钢标准", hide: true },
      { field: "NSlabLenMax", headerName: "钢坯长度最大值", hide: true },
      { field: "NWgtMeter", headerName: "钢坯米单重", hide: true },
      { field: "NRate", headerName: "理论成材率", hide: true },
      { field: "NSlabWgtSy", headerName: "坯料剩余重量", hide: true },
      { field: "CSlabRemark", headerName: "提料备注", hide: true },
      { field: "CTlRemark", headerName: "提料失败说明", hide: true },
      { field: "CTlName", headerName: "提料操作人", hide: true },
      { field: "DTlTime", headerName: "提料时间", hide: true },
      { field: "CTlOrderFlag", headerName: "是否提料订单", hide: true },
      { field: "CCcmCode", headerName: "连铸机编码", hide: true },
      { field: "NSfpj", headerName: "评审状态", hide: true },
      { field: "CPjName", headerName: "评审人", hide: true },
      { field: "DPjTime", headerName: "评审时间", hide: true },
      { field: "CPjRemark", headerName: "评审失败原因", hide: true },
      { field: "CStNo", headerName: "炼钢工艺卡", hide: true },
      { field: "CIsMerge", headerName: "是否合并提料", hide: true },
      { field: "CZggyCode", headerName: "轧钢工艺编码", hide: true },
      { field: "NLenPlan", headerName: "生产板长", hide: true },
      { field: "NThickPlan", headerName: "生产板厚", hide: true },
      { field: "NWidthPlan", headerName: "生产板宽", hide: true },
      { field: "NLgPlanStatus", headerName: "炼钢计划状态", hide: true },
      { field: "NSteelSingleWgt", headerName: "钢板单重", hide: true },
      { field: "NPlanedBoardNum", headerName: "排产子板数", hide: true },
      { field: "NPlanedWgt", headerName: "排产净重", hide: true },
      { field: "NConSteelKs", headerName: "合同带出钢板块数", hide: true },
      { field: "NConSteelNum", headerName: "合同带出钢板数量", hide: true },
      { field: "NLlBoardWgt", headerName: "理论子板重（含板边）", hide: true },
      { field: "NLlBoardEndWgt", headerName: "理论板头重", hide: true },
      { field: "NLlBoardEdge", headerName: "理论板边", hide: true },
      { field: "NLlBoardEnd", headerName: "理论板头", hide: true },
      { field: "NLlBurnLoss", headerName: "理论烧损", hide: true },
      { field: "NLlCleanLen", headerName: "理论毛长", hide: true },
      { field: "NBoarCleanLen", headerName: "母板净长", hide: true },
      { field: "CThickRange", headerName: "厚度区间", hide: true },
      { field: "NTlTol", headerName: "提料公差", hide: true },
      { field: "CFlawStand", headerName: "探伤标准", hide: true },
      { field: "CTransType", headerName: "运输方式", hide: true },
      { field: "CStoreRoom", headerName: "库房", hide: true },
      { field: "CRzFlag", headerName: "是否认证", hide: true },
      { field: "CSampleSpec", headerName: "样品规格", hide: true },
      { field: "CAddress", headerName: "到货地址", hide: true },
      { field: "CThickRangeDis", headerName: "厚度区分", hide: true },
      { field: "CSingleSlab", headerName: "单片钢坯", hide: true },
      { field: "CThreading1", headerName: "套切1", hide: true },
      { field: "CThreading2", headerName: "套切2", hide: true },
      { field: "CThreading3", headerName: "套切3", hide: true },
      { field: "CThreading4", headerName: "套切4", hide: true },
      { field: "CVirtualStoreCode", headerName: "虚拟炉号", hide: true },
      { field: "CStoreShift", headerName: "炉次", hide: true },
      { field: "NZlWgt", headerName: "组炉重量", hide: true },
      { field: "NPlanBoarLen", headerName: "计划母板长", hide: true },
      { field: "CYcAlert", headerName: "异常提醒", hide: true },
      { field: "CRollType", headerName: "轧制方式", hide: true },
      { field: "NLlProduceKs", headerName: "理论生产块数", hide: true },
      { field: "NDcLen", headerName: "带出长度", hide: true },
      { field: "CZWidth", headerName: "展宽比", hide: true },
      { field: "CRollNo", headerName: "补轧标识", hide: true },
      { field: "NColdSlabKs", headerName: "冷坯块数", hide: true },
      { field: "NColdSlabNum", headerName: "冷坯吨数", hide: true },
      { field: "CRepairProduce", headerName: "补产", hide: true },
      { field: "NLenTolMin", headerName: "长度下偏差", hide: true },
      { field: "NLenTolMax", headerName: "长度上偏差", hide: true },
      { field: "DTimeShipment", headerName: "预计船期", hide: true },
      { field: "CJrzzgyCode", headerName: "加热轧制工艺编码", hide: true },
      { field: "CJqgyCode", headerName: "剪切工艺编码", hide: true },
      { field: "CSpecPlan", headerName: "生产规格", hide: true },
      { field: "COrderNoOld", headerName: "原始订单号", hide: true },
      { field: "COrderNo2", headerName: "订单号2", hide: true },
      { field: "COrderNo3", headerName: "订单号3", hide: true },
      { field: "COrderNo4", headerName: "订单号4", hide: true },
      { field: "COrderNo5", headerName: "订单号5", hide: true },
      { field: "COrderNo6", headerName: "订单号6", hide: true },
      { field: "NLenPlan1", headerName: "套切长度1", hide: true },
      { field: "NLenPlan2", headerName: "套切长度2", hide: true },
      { field: "NLenPlan3", headerName: "套切长度3", hide: true },
      { field: "NLenPlan4", headerName: "套切长度4", hide: true },
      { field: "NLenPlan5", headerName: "套切长度5", hide: true },
      { field: "NLenPlan6", headerName: "套切长度6", hide: true },
      { field: "CPieceNo", headerName: "板坯号", hide: true },
      { field: "CCheckRemark", headerName: "备注说明", hide: true },
]));

/* 查询条件（原 stackPanel1 上方 DataLayout 式 6 条件；状态=运行时 AddEnum(OrderTlEnum)） */
const q = reactive({
  cSgCode: "",
  cOrderCustCname: "",
  dBegin: null as Date | null,
  dEnd: null as Date | null,
  nTlStatus: null as number | null,
  cOrderNo: "",
});
const tlStatusOptions = [
  { label: "未提料", value: OrderTlEnum.NoTl },
  { label: "已提料", value: OrderTlEnum.YesTl },
  { label: "已审核", value: OrderTlEnum.Checked },
];

function fmt(d?: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function orderLst(): string[] | undefined {
  const list = parseBatchIds(q.cOrderNo);
  return list.length ? list : undefined;
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
      dTimeStart: fmt(q.dBegin),
      dTimeEnd: fmt(q.dEnd),
      cLineCode: lineCode,
      nTlStatus: q.nTlStatus ?? undefined,
      orderLst: orderLst(),
    } as InputTmp2010Dto;
    rows.value = ((await tLApi.queryOrderNew(input)) ?? []) as Row[];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}

/** 审核：btnCheck_Click → ITLZG02AppService.CheckedTlNew */
async function onCheck() {
  const nos = orderNos(pickedRows());
  if (nos.length <= 0) {
    toast("选择操作项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const count = (await tLZG02Api.checkedTlNew(nos)) ?? 0;
  await query();
  toast(`审核成功${count}条！`, 2000, "success");
}

/** 取消审核：btnCancel_Click → CancleCheckedTlNew */
async function onCancelCheck() {
  const nos = orderNos(pickedRows());
  if (nos.length <= 0) {
    toast("选择操作项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const count = (await tLZG02Api.cancleCheckedTlNew(nos)) ?? 0;
  await query();
  toast(`取消审核${count}条！`, 2000, "success");
}

/** 删除：btnDelTl_Click → DelTl */
async function onDel() {
  const nos = orderNos(pickedRows());
  if (nos.length <= 0) {
    toast("选择操作项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const count = (await tLZG02Api.delTl(nos)) ?? 0;
  await query();
  toast(`删除${count}条！`, 2000, "success");
}

/** 已审提料生产关闭：btnProdClose_Click → ITLAppService.TLProdClose(整行)，原 .cs 不回查 */
async function onProdClose() {
  const sel = pickedRows();
  if (sel.length <= 0) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  const count = (await tLApi.tlProdClose(sel as Tmp2005Dto[])) ?? 0;
  toast(`执行成功${count}条！`, 2000, "success");
}

onMounted(() => {
  const now = new Date();
  q.dBegin = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
  q.dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：6 条件；查询按钮在下方 stackPanel1） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
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
        <Select v-model="q.nTlStatus" :options="tlStatusOptions" option-label="label" option-value="value"
          placeholder="请选择" show-clear class="min-w-0 flex-1" />
      </div>
      <BatchIdInput v-model="q.cOrderNo" label="批量订单号" class="min-w-0" />
    </div>

    <!-- 工具栏（原 stackPanel1：查询/审核/取消审核/删除/已审提料生产关闭——simpleButton3 为未挂载孤儿控件不渲染） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCheck">
        <IconCheck class="h-3 w-3" />审核
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCancelCheck">
        <IconX class="h-3 w-3" />取消审核
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onProdClose">已审提料生产关闭</Button>
    </div>

    <!-- 数据表格（原 gridControl1/gridView1） -->
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
