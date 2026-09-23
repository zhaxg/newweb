<script setup lang="ts">
import { reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import { IconSearch, IconSend, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { useMenuQuery } from "@/lib/menuQuery";
import { tmp2020Api, type ZgPlanDto } from "@/api/mes4ddh/smp.swagger";
import { bxcomTestApi } from "@/api/mes4ddh/ddh.swagger";

/** 对应 FrmMP2021（轧钢计划下发，4菜单共享 ZG01/02/03/04）：DDH.Winforms.SMP.Forms.FrmMP2021
 *  已接入：tmp2020Api.queryPlans（查询）/ downTmp2020s(cLineCode, ids)（下发）/
 *          closeDownPlan / closeTmp2020s("", ids)（关闭：状态=已生成日计划(20)走前者，否则后者）/
 *          bxcomTestApi.validL2Message（测试生成二级消息 → 「二级消息展示」Dialog）
 *  待接入：mock 缺 tmp2020/queryPlans、downTmp2020s、closeTmp2020s
 *  布局：查询区(评审时间/钢种/标准/订单号/状态，NReview Status 为 HiddenItems) → 工具栏(查询/下发/关闭/测试生成二级消息) → 单表 Fill
 *  cQueryString（ZG01/02/03/04）经 useMenuQuery 作 cLineCode；列集按 extract（可见60+隐藏26=86）；
 *  Designer 孤儿 simpleButton1(Text="?") 未挂入任何容器，不迁 */

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();
const theme = makeHmxGridTheme();
const rows = ref<ZgPlanDto[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);

function monthRange(): Date[] {
  const d = new Date();
  return [new Date(d.getFullYear(), d.getMonth(), 1), new Date(d.getFullYear(), d.getMonth() + 1, 0)];
}
function toRange(d: Date[] | null | undefined) {
  return d && d.length === 2 && d[0] && d[1] ? { min: d[0].toISOString(), max: d[1].toISOString() } : undefined;
}

/* 原 inputTmp2020DtoBindingSource：评审时间/钢种/标准/订单号/状态（NReview Status 为 HiddenItems，未绑定查询） */
const q = reactive({
  timeRange: monthRange() as Date[] | null,
  cSgCode: "",
  cSgStd: "",
  cOrderNo: "",
  nStatus: 0 as number | null,
  nReviewStatus: null as number | null,
});

/* 状态：原 SetEnumCombobox<PlanStatusEnum> 默认 NoDown */
const statusOptions = [
  { label: "未下发", value: 0 },
  { label: "已下发", value: 10 },
  { label: "已生成日计划", value: 20 },
  { label: "关闭", value: 40 },
];
const reviewOptions = [
  { label: "未评审", value: 0 },
  { label: "已评审", value: 10 },
];

const colDefs: ColDef[] = [
        { field: "selected", headerName: "选择", width: 56, minWidth: 56, cellRenderer: "agCheckboxCellRenderer", editable: true, sortable: false, filter: false },
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
      { field: "nWidth", headerName: "宽度", width: 150 },
      { field: "nLen", headerName: "长度", width: 150 },
      { field: "cSteelType", headerName: "钢类", width: 150 },
      { field: "cProdCode", headerName: "品名代码", width: 150 },
      { field: "nDbc", headerName: "倍尺", width: 150 },
      { field: "nNum", headerName: "订货件数", width: 150 },
      { field: "cSlabSource", headerName: "供坯单位", width: 150 },
      { field: "cTlSgCode", headerName: "炼钢钢种", width: 150 },
      { field: "cTlSgStd", headerName: "炼钢标准", width: 150 },
      { field: "cSlabSize", headerName: "钢坯规格", width: 150 },
      { field: "nSlabThick", headerName: "坯厚", width: 150 },
      { field: "nSlabWidth", headerName: "坯宽", width: 150 },
      { field: "nSlabLen", headerName: "冷态坯长", width: 150 },
      { field: "nSlabQua", headerName: "计划生产钢坯块数", width: 150 },
      { field: "nSlabWgt", headerName: "生产钢坯重量", width: 150 },
      { field: "nWgtUnit", headerName: "钢坯单重", width: 150 },
      { field: "nRate", headerName: "理论成材率", width: 150 },
      { field: "cDelivyStatusCode", headerName: "交货状态", width: 150 },
      { field: "cCustStdCode", headerName: "加工用途代码", width: 150 },
      { field: "cOrderCustNo", headerName: "订货客户编码", width: 150 },
      { field: "cOrderCustCname", headerName: "订货客户中文名称", width: 150 },
      { field: "cDelivyQtyFlag", headerName: "计重方式", width: 150 },
      { field: "cDeptCode", headerName: "部门编码", width: 150 },
      { field: "nFlag", headerName: "计划类型", width: 150 },
      { field: "cProdName", headerName: "品名名称", width: 150 },
      { field: "cDelivyStatusDesc", headerName: "交货状态说明", width: 150 },
      { field: "cCustStdDesc", headerName: "加工用途说明", width: 150 },
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
      { field: "nBoarCleanLen", headerName: "母板净长", width: 150 },
      { field: "nLlCleanLen", headerName: "理论毛长", width: 150 },
      { field: "nPlanBoarLen", headerName: "计划母板长", width: 150 },
      { field: "id", headerName: "主键", width: 100, hide: true },
      { field: "creator", headerName: "创建人", width: 100, hide: true },
      { field: "createTime", headerName: "创建时间", width: 100, hide: true },
      { field: "lastModifier", headerName: "最后修改人", width: 100, hide: true },
      { field: "lastModifyTime", headerName: "最后修改时间", width: 100, hide: true },
      { field: "nStatus", headerName: "订单状态", width: 100, hide: true },
      { field: "nThickMin", headerName: "厚度下限", width: 100, hide: true },
      { field: "nThickMax", headerName: "厚度上限", width: 100, hide: true },
      { field: "nWidthMin", headerName: "宽度下限", width: 100, hide: true },
      { field: "nWidthMax", headerName: "宽度上限", width: 100, hide: true },
      { field: "cLengthType", headerName: "长度类型", width: 100, hide: true },
      { field: "nLenMin", headerName: "长度下限", width: 100, hide: true },
      { field: "nLenMax", headerName: "长度上限", width: 100, hide: true },
      { field: "nBc", headerName: "倍尺", width: 100, hide: true },
      { field: "cOrderCustEname", headerName: "订货客户英文名称", width: 100, hide: true },
      { field: "cProductH", headerName: "重点品种", width: 100, hide: true },
      { field: "cOrderTypeCode", headerName: "合同性质QAA期货", width: 100, hide: true },
      { field: "cExportFlag", headerName: "出口标志", width: 100, hide: true },
      { field: "dOrderTime", headerName: "订单日期", width: 100, hide: true },
      { field: "dJhqTime", headerName: "合同交货期", width: 100, hide: true },
      { field: "cConRemark", headerName: "合同备注", width: 100, hide: true },
      { field: "cSpecialMarkGy", headerName: "工艺/性能要求", width: 100, hide: true },
      { field: "cWarrantyDesc", headerName: "质保书要求", width: 100, hide: true },
      { field: "cPackCode", headerName: "特殊包装要求", width: 100, hide: true },
      { field: "nWtMax", headerName: "单量上限", width: 100, hide: true },
      { field: "nWtMin", headerName: "单量下限", width: 100, hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function selectedIds(): string[] {
  const byGrid = (gridApi.value?.getSelectedRows() ?? []) as ZgPlanDto[];
  const byCheck = rows.value.filter((x) => x.selected);
  const list = Array.from(new Set([...byGrid, ...byCheck]));
  return list
    .map((x) => x.id ?? "")
    .filter(Boolean);
}

/* 原 gridView2.GetFocusedRow（点击行聚焦单元格优先，回退勾选行） */
function focusedRow(): ZgPlanDto | null {
  const pos = gridApi.value?.getFocusedCell();
  if (pos) {
    const node = gridApi.value?.getDisplayedRowAtIndex(pos.rowIndex);
    if (node?.data) return node.data as ZgPlanDto;
  }
  return ((gridApi.value?.getSelectedRows() ?? [])[0] as ZgPlanDto) ?? null;
}

/* btnQuery 查询 → QueryPlans(dto) */
async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await tmp2020Api.queryPlans({
        timeRange: toRange(q.timeRange),
        cLineCode: menuQs || null,
        cOrderNo: q.cOrderNo || null,
        cSgCode: q.cSgCode || null,
        cSgStd: q.cSgStd || null,
        nStatus: q.nStatus ?? null,
      })) ?? [];
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnDown 下发 → DownTmp2020s(cLineCode, ids) */
async function onDown() {
  const ids = selectedIds();
  if (!ids.length) {
    toast("请勾选下发的计划！", 2000, "warn");
    return;
  }
  if (!window.confirm("是否确认下发勾选的轧制计划？")) return;
  querying.value = true;
  try {
    await tmp2020Api.downTmp2020s(menuQs || undefined, ids);
    toast("数据保存成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnClose 关闭：状态=已生成日计划(Finish=20) → CloseDownPlan，否则 CloseTmp2020s(ids, "") */
async function onClose() {
  const ids = selectedIds();
  if (!ids.length) {
    toast("请勾选下发的计划！", 2000, "warn");
    return;
  }
  if (!window.confirm("是否确认关闭勾选的轧制计划？")) return;
  querying.value = true;
  try {
    if (q.nStatus === 20) {
      await tmp2020Api.closeDownPlan(ids);
    } else {
      await tmp2020Api.closeTmp2020s("", ids);
    }
    toast("数据保存成功！", 2000, "success");
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/* btnTest 测试生成二级消息 → ValidL2Message(current.Id)，弹「二级消息展示」 */
const l2Visible = ref(false);
const l2Json = ref("");
async function onTest() {
  const current = focusedRow();
  if (!current) {
    toast("请选择后再操作", 2000, "warn");
    return;
  }
  querying.value = true;
  try {
    const msgs = await bxcomTestApi.validL2Message(current.id ?? undefined);
    l2Json.value = JSON.stringify(msgs ?? null, null, 2);
    l2Visible.value = true;
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl：评审时间/钢种/标准/订单号/状态；NReview Status 为 HiddenItems） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="col-span-2 flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">评审时间</label>
          <DatePicker
            v-model="q.timeRange"
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
          <InputText v-model="q.cSgCode" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">标准</label>
          <InputText v-model="q.cSgStd" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="q.cOrderNo" class="min-w-0 flex-1" />
        </div>
        <div class="hidden min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">NReview Status</label>
          <Select
            v-model="q.nReviewStatus"
            :options="reviewOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
          <Select
            v-model="q.nStatus"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            show-clear
            placeholder="请选择"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1：查询/下发/关闭/测试生成二级消息） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDown">
        <IconSend class="h-3 w-3" />下发
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onClose">
        <IconX class="h-3 w-3" />关闭
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onTest">测试生成二级消息</Button>
    </div>

    <!-- 数据表格（原 gridControl2 Dock.Fill） -->
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

    <!-- 原 FrmDialogBase.With(MemoEdit)「二级消息展示」 -->
    <Dialog v-model:visible="l2Visible" modal header="二级消息展示" :style="{ width: 'min(40rem, calc(100vw - 2rem))' }">
      <pre class="max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">{{ l2Json }}</pre>
    </Dialog>
  </div>
</template>
