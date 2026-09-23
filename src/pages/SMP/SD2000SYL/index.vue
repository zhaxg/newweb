<script setup lang="ts">
import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import { IconSearch, IconSettings, IconTrash, IconUpload } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  tmp2000Api,
  OrderProcEnum,
  OrderStatusEnum,
  OrderFlagEnum,
  type InputTmp2000Dto,
  type QueryTmp2000Dto,
} from "@/api/mes4ddh/smp.swagger";
import { qualityDesignApi } from "@/api/mes4ddh/sqm.swagger";

/** swagger 的 QueryTmp2000Dto 缺实体字段 NOrderProcFlag/CDesignDesc（Designer 列存在），页面本地补型，不改 src/api */
type Row2000 = QueryTmp2000Dto & {
  nOrderProcFlag?: number | null;
  cDesignDesc?: string | null;
};

/** 对应 FrmSD2000SYL（中厚板试验料订单查询）：DDH.Winforms.SMP.Forms.FrmSD2000SYL
 *  已接入：tmp2000Api.getSylOrderLst（查询）/ downOrderPlan（下发排产）/ delOrder（删除订单）/
 *          importByBx（批量导入订单·JSON，原 btnBXImport_Click 通路）/ qualityDesignApi.designZHB（质量设计逐单）
 *  待接入：backOrderPlan（.cs btnBack_Click 为孤儿处理器，Designer 无按钮，未发明控件）；
 *          Excel 批量导入（ImportDataHelper + FrmImportTmp2000）与 FrmSD2010 弹窗无 web 通路；mock 缺 delOrder/downOrderPlan/importByBx
 *  产线输入为 HiddenItems（原画面隐藏）；查询 CLineCode 取菜单 cQueryString、NFlag 固定试验料(SYL=4)（原 C# BindData）；
 *  ribbon barButtonItem1/barCheckItem1 按约定忽略；列集按 extract（可见49+隐藏17=66）；
 *  原 Selected 勾选列由 AG Grid row-selection 复选框呈现（ui-rules §7），原列以 hide:true 保留在列面板 */

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const theme = makeHmxGridTheme();
const rows = ref<Row2000[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

/* OrderFlagEnum.SYL=4（TS 枚举未生成该成员） */
const SYL_FLAG = 4 as unknown as OrderFlagEnum;

function dayStart(y: number, m: number, d: number) {
  return new Date(y, m, d);
}

/* 原 dataLayoutControl 查询区（产线为 HiddenItems；textEdit2 未挂入布局组，不迁） */
const input = reactive({
  cSgCode: "",
  cOrderCustCname: "",
  dBegin: dayStart(new Date().getFullYear(), new Date().getMonth(), 1),
  dEnd: dayStart(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()),
  cLineCode: "",
  orderStatus: null as number | null,
  cOrderNo: "",
  nFlag: null as number | null,
});

/* 状态：原 AddEnum(Tmp2000StatusEnum) */
const statusOptions = [
  { label: "未下发", value: -1 },
  { label: "已下发", value: 0 },
  { label: "已排产", value: 10 },
  { label: "生产关闭", value: 30 },
  { label: "退回销售", value: 40 },
  { label: "结案", value: 50 },
];
/* 计划类型：extract 下拉[销售订单/余量板/补产订单/流通材] */
const flagOptions = [
  { label: "销售订单", value: 0 },
  { label: "余量板", value: 1 },
  { label: "补产订单", value: 2 },
  { label: "流通材", value: 3 },
];

const colDefs: ColDef[] = [
        { field: "selected", headerName: "选择", hide: true },
      { field: "cOrderNo", headerName: "订单号", width: 100 },
      { field: "nStatus", headerName: "订单状态", width: 100 },
      { field: "cOrderCustNo", headerName: "客户编码", width: 100 },
      { field: "cOrderCustCname", headerName: "订货客户", width: 100 },
      { field: "cSteelType", headerName: "品名", width: 100 },
      { field: "cSgCode", headerName: "钢种", width: 100 },
      { field: "nOrderProcFlag", headerName: "处理标志", width: 100 },
      { field: "cDesignDesc", headerName: "质量设计失败说明", width: 100 },
      { field: "nThick", headerName: "厚度", width: 100 },
      { field: "nThickMin", headerName: "厚度下限", width: 100 },
      { field: "nThickMax", headerName: "厚度上限", width: 100 },
      { field: "nWidth", headerName: "宽度", width: 100 },
      { field: "nWidthMin", headerName: "宽度下限", width: 100 },
      { field: "nWidthMax", headerName: "宽度上限", width: 100 },
      { field: "nWidthWgt", headerName: "边部宽度余量", width: 100 },
      { field: "cLengthType", headerName: "长度类型", width: 100 },
      { field: "nLenMin", headerName: "长度下限", width: 100 },
      { field: "nLenMax", headerName: "长度上限", width: 100 },
      { field: "cDelivyStatusCode", headerName: "交货状态", width: 100 },
      { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 100 },
      { field: "nNum", headerName: "订货件数", width: 100 },
      { field: "nWgt", headerName: "订单重量", width: 100 },
      { field: "cTrimFlag", headerName: "切边方式", width: 100 },
      { field: "cOverstepBl", headerName: "短溢装比例", width: 100 },
      { field: "cDelivyQtyFlag", headerName: "计重方式", width: 100 },
      { field: "cTol", headerName: "公差", width: 100 },
      { field: "cFlawDesc", headerName: "探伤等级", width: 100 },
      { field: "cConNo", headerName: "合同号", width: 100 },
      { field: "cSgStd", headerName: "执行标准", width: 100 },
      { field: "dJhqTime", headerName: "交货期", width: 100 },
      { field: "cDelivyAddress", headerName: "流向", width: 100 },
      { field: "cSpecialMarkGy", headerName: "性能要求", width: 100 },
      { field: "nWtMax", headerName: "单量上限", width: 100 },
      { field: "nWtMin", headerName: "单量下限", width: 100 },
      { field: "cSpec", headerName: "规格", width: 100 },
      { field: "cConRemark", headerName: "特殊要求", width: 100 },
      { field: "cInboundNo", headerName: "入库标识", width: 100 },
      { field: "cExitem1", headerName: "是否工程单", width: 100 },
      { field: "cOrderTypeDesc", headerName: "订单性质说明", width: 40 },
      { field: "dTimeShipment", headerName: "预计船期", width: 100 },
      { field: "cLineCode", headerName: "产线代码", width: 100 },
      { field: "dOrderProcTime", headerName: "合同处理时间", width: 100 },
      { field: "creator", headerName: "创建人", width: 100 },
      { field: "createTime", headerName: "创建时间", width: 100 },
      { field: "lastModifier", headerName: "最后修改人", width: 100 },
      { field: "lastModifyTime", headerName: "最后修改时间", width: 100 },
      { field: "cSendUserId", headerName: "销售提报人", width: 100 },
      { field: "dSendTime", headerName: "销售提报时间", width: 100 },
      { field: "nThickTolMin", headerName: "厚度下偏差", width: 100, hide: true },
      { field: "nThickTolMax", headerName: "厚度上偏差", width: 100, hide: true },
      { field: "nWidthTolMin", headerName: "宽度下偏差", width: 100, hide: true },
      { field: "nWidthTolMax", headerName: "宽度上偏差", width: 100, hide: true },
      { field: "nLenTolMin", headerName: "长度下偏差", width: 100, hide: true },
      { field: "nLenTolMax", headerName: "长度上偏差", width: 100, hide: true },
      { field: "cSgCodeNk", headerName: "内控钢种", width: 100, hide: true },
      { field: "cJrzzgyCode", headerName: "加热轧制工艺编码", width: 100, hide: true },
      { field: "cJqgyCode", headerName: "剪切工艺编码", width: 100, hide: true },
      { field: "cDeptCode", headerName: "部门编码", width: 100, hide: true },
      { field: "cOrderProcUserId", headerName: "合同处理操作人", width: 100, hide: true },
      { field: "cZgGyCode", headerName: "轧钢工艺编码", width: 100, hide: true },
      { field: "cPushUserId", headerName: "下发生产人", width: 100, hide: true },
      { field: "dPushTime", headerName: "下发生产时间", width: 100, hide: true },
      { field: "nSfpj", headerName: "评审状态", width: 100, hide: true },
      { field: "cPjName", headerName: "评审人", width: 100, hide: true },
      { field: "id", headerName: "主键", width: 100, hide: true },
];

/* NOrderProcFlag 失败红底/成功绿底（原 gridView1_CustomDrawCell，alpha 63） */
const procCol = colDefs.find((c) => c.field === "nOrderProcFlag");
if (procCol) {
  procCol.cellClassRules = {
    "proc-fail": (p) => p.data?.nOrderProcFlag === OrderProcEnum.Fail,
    "proc-ok": (p) => p.data?.nOrderProcFlag === OrderProcEnum.Success,
  };
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function selectedRows(): Row2000[] {
  return (gridApi.value?.getSelectedRows() ?? []) as Row2000[];
}

function buildInput(): InputTmp2000Dto {
  return {
    cOrderNo: input.cOrderNo || null,
    cSgCode: input.cSgCode || null,
    cOrderCustCname: input.cOrderCustCname || null,
    dBegin: input.dBegin?.toISOString() ?? null,
    dEnd: input.dEnd?.toISOString() ?? null,
    orderStatus: (input.orderStatus ?? null) as OrderStatusEnum | null,
    cLineCode: menuQs || null,
    nFlag: SYL_FLAG,
  };
}

/* btnS 查询 → GetSylOrderLst */
async function onQuery() {
  querying.value = true;
  try {
    rows.value = (await tmp2000Api.getSylOrderLst(buildInput())) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

async function afterAction(run: () => Promise<unknown>) {
  querying.value = true;
  try {
    await run();
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnDown 下发排产 → DownOrderPlan */
async function onDown() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.downOrderPlan(selected)) ?? 0;
    await onQuery();
    toast(`成功下发${count}条！`, 2500, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnDel 删除订单 → DelOrder */
async function onDelete() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择项！", 2000, "warn");
    return;
  }
  if (!window.confirm("确定吗？")) return;
  querying.value = true;
  try {
    const count = (await tmp2000Api.delOrder(selected)) ?? 0;
    await onQuery();
    toast(`成功删除${count}条！`, 2500, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnImport 批量导入订单 → 原 btnBXImport_Click：*.json|*.txt → ImportByBx
   （原 Excel ImportDataHelper + FrmImportTmp2000 无 web 通路，见「待接入」） */
const fileInput = ref<HTMLInputElement | null>(null);
function onImportClick() {
  fileInput.value?.click();
}
async function onImportFile(e: Event) {
  const el = e.target as HTMLInputElement;
  const file = el.files?.[0];
  el.value = "";
  if (!file) return;
  const text = await file.text();
  let orders: unknown;
  try {
    orders = JSON.parse(text);
  } catch {
    toast("文件不存在或格式错误", 2000, "warn");
    return;
  }
  await afterAction(() => tmp2000Api.importByBx(orders as Parameters<typeof tmp2000Api.importByBx>[0]));
}

/* btnDesign 质量设计 → DesignZHB（逐单，完成后回读） */
async function onDesign() {
  const selected = selectedRows();
  if (!selected.length) {
    toast("请选择要质量设计的订单！", 2000, "warn");
    return;
  }
  if (!window.confirm(`确认对选中的 ${selected.length} 个订单进行质量设计？`)) return;
  querying.value = true;
  try {
    const res: { success?: boolean }[] = [];
    for (const order of selected) {
      const output = await qualityDesignApi.designZHB({ orderNo: order.cOrderNo ?? "" });
      order.nOrderProcFlag = output.success ? OrderProcEnum.Success : OrderProcEnum.Fail;
      order.cDesignDesc = output.message ?? null;
      res.push(output);
    }
    gridApi.value?.refreshCells({ force: true });
    const okCount = res.filter((x) => x.success).length;
    toast(`操作完成，成功：${okCount}，失败：${res.length - okCount}`, 3000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl：钢种/订货客户/开始时间/截止时间/产线(hidden)/状态/订单号/计划类型） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="input.cSgCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订货客户</label>
          <InputText v-model="input.cOrderCustCname" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
          <DatePicker v-model="input.dBegin" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">截止时间</label>
          <DatePicker v-model="input.dEnd" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
        <div class="hidden min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产线</label>
          <InputText v-model="input.cLineCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
          <Select
            v-model="input.orderStatus"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="input.cOrderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">计划类型</label>
          <Select
            v-model="input.nFlag"
            :options="flagOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel2：查询/下发排产/删除订单/批量导入订单/质量设计） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDown">下发排产</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除订单
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onImportClick">
        <IconUpload class="h-3 w-3" />批量导入订单
      </Button>
      <input ref="fileInput" type="file" accept=".json,.txt" class="hidden" @change="onImportFile" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDesign">
        <IconSettings class="h-3 w-3" />质量设计
      </Button>
    </div>

    <!-- 数据表格（原 gridControl1 Dock.Fill） -->
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

<style scoped>
:deep(.proc-fail) {
  background-color: rgba(255, 0, 0, 0.247);
}
:deep(.proc-ok) {
  background-color: rgba(0, 255, 0, 0.247);
}
</style>
