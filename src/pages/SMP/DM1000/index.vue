<script setup lang="ts">
/** 对应 FrmDM1000（轴承/轴承箱管理）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1000
 *  已接入：dM1000Api.queryBear（轴承页签）/ queryBearBox（轴承箱页签）
 *    / tdm1000Del / tdm1010Del（删除）/ tdm1000Repair / tdm1010Repair（维修）
 *    / tdm1000Finish / tdm1010Finish（维修完成）/ tdm1000Scrap / tdm1010Scrap（报废）
 *    / outBear（拆卸轴承，入参取自轴承页签勾选行）
 *  待接入：添加/编辑 → FrmDM1000_Edit、FrmDM1010_Edit（二级弹窗未迁，提交接口 dM1000Api.tmd1000Add / tmd1010Add 在弹窗内）
 *    装载轴承 → FrmDM1000_InstallBear（二级弹窗未迁，提交接口 dM1000Api.installBear(bearNo, bearBoxNo) 在弹窗内）
 *  偏差：原「维修/维修完成/报废」的 `tdmIds == null` 判断恒不成立（Where().ToList() 不为 null），
 *    web 侧按「未勾选即提示同文案」实现，文案逐字照抄；「拆卸轴承」原逻辑比较的是**整表**是否全为装配状态
 *    （statusList.Count != list.Count），此语义原样保留；编辑/装载轴承取点击行（原 gridView.FocusedRowObject）；
 *    轴承箱类型值 3 的下拉/单元格文案照 Designer 下拉「下穿」（实体 LDisplay 为「下传」） */

import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import {
  IconArrowsJoin,
  IconArrowsSplit,
  IconBan,
  IconCircleCheck,
  IconPencil,
  IconPlus,
  IconSearch,
  IconTools,
  IconTrash,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClickedEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import {
  BearBoxType,
  BearType,
  dM1000Api,
  Tdm1000StatusEnum,
  Tdm1010AssemblyFlag,
  type DtoQueryTdm1000,
  type Tdm1000,
  type Tdm1010,
} from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- 下拉候选（原 ComNStatus / ComNBearType / ComNBearBoxType 的 AddEnum） ---------- */
const statusOptions = [
  { label: "备用", value: Tdm1000StatusEnum.Spare },
  { label: "装配", value: Tdm1000StatusEnum.Assembly },
  { label: "维修", value: Tdm1000StatusEnum.Repair },
  { label: "报废", value: Tdm1000StatusEnum.Scrap },
];
const bearTypeOptions = [
  { label: "四列", value: BearType.Four },
  { label: "双列", value: BearType.Two },
  { label: "锥套", value: BearType.Taper },
  { label: "衬套", value: BearType.Bush },
];
const bearBoxTypeOptions = [
  { label: "上操", value: BearBoxType.UpOper },
  { label: "下操", value: BearBoxType.DowmOper },
  { label: "上传", value: BearBoxType.UpPass },
  { label: "下穿", value: BearBoxType.DowmPass },
  { label: "上", value: BearBoxType.Up },
  { label: "下", value: BearBoxType.Down },
];
const codeFmt = (map: Record<string, string>) => (p: ValueFormatterParams) =>
  map[String(p.value ?? "")] ?? String(p.value ?? "");
const statusMap: Record<string, string> = { "0": "备用", "1": "装配", "2": "维修", "3": "报废" };
const bearTypeMap: Record<string, string> = { "0": "四列", "1": "双列", "2": "锥套", "3": "衬套" };
const bearBoxTypeMap: Record<string, string> = {
  "0": "上操",
  "1": "下操",
  "2": "上传",
  "3": "下穿",
  "4": "上",
  "5": "下",
};
const assemblyFlagMap: Record<string, string> = {
  [String(Tdm1010AssemblyFlag.Not)]: "未装配",
  [String(Tdm1010AssemblyFlag.Already)]: "已装配",
};

/* ---------- 查询条件（原 dataLayoutControl1 + bscQueryTDM1000Dto → DtoQueryTdm1000） ---------- */
const input = reactive({
  cBearNo: "",
  cBearBoxNo: "",
  nStatus: null as Tdm1000StatusEnum | null,
  nBearType: null as BearType | null,
  nBearBoxType: null as BearBoxType | null,
});
function buildDto(): DtoQueryTdm1000 {
  return {
    cBearNo: input.cBearNo.trim() || null,
    cBearBoxNo: input.cBearBoxNo.trim() || null,
    nStatus: input.nStatus,
    nBearType: input.nBearType,
    nBearBoxType: input.nBearBoxType,
  };
}

/* ---------- 页签（原 xtraTabControl1：0 轴承 / 1 轴承箱；切换即重绑当前表） ---------- */
const activeTab = ref(0);

/* ---------- 轴承（gridView1 / Tdm1000） ---------- */
const bearRows = ref<Tdm1000[]>([]);
const bearLoading = ref(false);
const bearApi = ref<GridApi | null>(null);
const bearCurrent = ref<Tdm1000 | null>(null);
function onBearReady(e: GridReadyEvent) {
  bearApi.value = e.api;
}
function onBearRowClicked(e: RowClickedEvent) {
  bearCurrent.value = (e.data as Tdm1000 | undefined) ?? null;
}
function bearSelectedIds(): string[] {
  return ((bearApi.value?.getSelectedRows() as Tdm1000[] | undefined) ?? []).map((x) => x.id ?? "").filter(Boolean);
}

const bearColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 60, hide: true },
  { colId: "cBearNo", field: "cBearNo", headerName: "轴承号", width: 130 },
  { colId: "cBearBoxNo", field: "cBearBoxNo", headerName: "轴承箱号", width: 130 },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 80, valueFormatter: codeFmt(statusMap) },
  { colId: "cAssembler", field: "cAssembler", headerName: "装配人", width: 100 },
  { colId: "dAssemblyTime", field: "dAssemblyTime", headerName: "装配时间", width: 150 },
  { colId: "nBearType", field: "nBearType", headerName: "轴承类型", width: 96, valueFormatter: codeFmt(bearTypeMap) },
  { colId: "cFactory", field: "cFactory", headerName: "厂家", width: 110 },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 140 },
  { colId: "nOnMachineNum", field: "nOnMachineNum", headerName: "上机次数", width: 96, minWidth: 90 },
  { colId: "nRunTime", field: "nRunTime", headerName: "本次运行时间min", width: 112, minWidth: 105 },
  { colId: "nRollWgt", field: "nRollWgt", headerName: "本次轧制重量t", width: 112, minWidth: 105 },
  { colId: "nRollLen", field: "nRollLen", headerName: "本次轧制长度", width: 112, minWidth: 105 },
  { colId: "nAllRunTime", field: "nAllRunTime", headerName: "累计运行时间", width: 110 },
  { colId: "nAllRollWgt", field: "nAllRollWgt", headerName: "累计轧制重量", width: 110 },
  { colId: "nAllRollLen", field: "nAllRollLen", headerName: "累计轧制长度", width: 110 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 100, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 110, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
];

/* ---------- 轴承箱（gridView2 / Tdm1010） ---------- */
const boxRows = ref<Tdm1010[]>([]);
const boxLoading = ref(false);
const boxApi = ref<GridApi | null>(null);
const boxCurrent = ref<Tdm1010 | null>(null);
function onBoxReady(e: GridReadyEvent) {
  boxApi.value = e.api;
}
function onBoxRowClicked(e: RowClickedEvent) {
  boxCurrent.value = (e.data as Tdm1010 | undefined) ?? null;
}
function boxSelectedIds(): string[] {
  return ((boxApi.value?.getSelectedRows() as Tdm1010[] | undefined) ?? []).map((x) => x.id ?? "").filter(Boolean);
}

const boxColDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 60, hide: true },
  { colId: "cBearNo", field: "cBearNo", headerName: "轴承座号", width: 130 },
  { colId: "cFourBearNo", field: "cFourBearNo", headerName: "四列轴承号", width: 120 },
  { colId: "cTwoBearNo", field: "cTwoBearNo", headerName: "双列轴承号", width: 120 },
  { colId: "cConeBearNo", field: "cConeBearNo", headerName: "锥套轴承号", width: 120 },
  { colId: "cBushBearNo", field: "cBushBearNo", headerName: "衬套轴承号", width: 120 },
  { colId: "cAssembler", field: "cAssembler", headerName: "装配人", width: 100 },
  { colId: "dAssemblyTime", field: "dAssemblyTime", headerName: "装配时间", width: 150 },
  { colId: "nStatus", field: "nStatus", headerName: "状态", width: 80, valueFormatter: codeFmt(statusMap) },
  {
    colId: "nAssemblyFlag",
    field: "nAssemblyFlag",
    headerName: "装配轴承标记",
    width: 112,
    minWidth: 105,
    valueFormatter: codeFmt(assemblyFlagMap),
  },
  {
    colId: "nBearSeatType",
    field: "nBearSeatType",
    headerName: "轴承座类型",
    width: 105,
    valueFormatter: codeFmt(bearBoxTypeMap),
  },
  { colId: "cFactory", field: "cFactory", headerName: "厂家", width: 110 },
  { colId: "nOnMachineNum", field: "nOnMachineNum", headerName: "上机次数", width: 96, minWidth: 90 },
  { colId: "cRemark", field: "cRemark", headerName: "备注", width: 140 },
  { colId: "nRunTime", field: "nRunTime", headerName: "本次运行时间min", width: 112, minWidth: 105 },
  { colId: "nRollWgt", field: "nRollWgt", headerName: "本次轧制重量t", width: 112, minWidth: 105 },
  { colId: "nRollLen", field: "nRollLen", headerName: "本次轧制长度", width: 112, minWidth: 105 },
  { colId: "nAllRunTime", field: "nAllRunTime", headerName: "累计运行时间", width: 110 },
  { colId: "nAllRollWgt", field: "nAllRollWgt", headerName: "累计轧制重量", width: 110 },
  { colId: "nAllRollLen", field: "nAllRollLen", headerName: "累计轧制长度", width: 110 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 100, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 110, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
];

/* ---------- 数据绑定（原 Tdm1000Bind / Tdm1010Bind） ---------- */
async function bearBind() {
  bearLoading.value = true;
  try {
    bearRows.value = (await dM1000Api.queryBear(buildDto())) ?? [];
    bearCurrent.value = null;
    requestAnimationFrame(() => bearApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    bearLoading.value = false;
  }
}
async function boxBind() {
  boxLoading.value = true;
  try {
    boxRows.value = (await dM1000Api.queryBearBox(buildDto())) ?? [];
    boxCurrent.value = null;
    requestAnimationFrame(() => boxApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    boxLoading.value = false;
  }
}

/* 原 btnQuery_Click：两张表一起刷 */
async function onQuery() {
  await Promise.all([bearBind(), boxBind()]);
}
/* 原 xtraTabControl1_SelectedPageChanged：切页签只重绑当前表 */
async function onTabChange(value: number) {
  activeTab.value = value;
  if (value === 0) await bearBind();
  else await boxBind();
}

/* ---------- ShowYesNo 受控确认（原 MsgBox.ShowYesNo） ---------- */
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

/* ---------- 按钮（stackPanel1 原序：查询 添加 编辑 删除 维修 维修完成 报废 装载轴承 拆卸轴承） ---------- */
async function onSubmit(msg: string, action: () => Promise<unknown>) {
  try {
    await action();
    await (activeTab.value === 0 ? bearBind() : boxBind());
    toast(msg, 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

function onAdd() {
  toast(
    activeTab.value === 0 ? "轴承添加弹窗（FrmDM1000_Edit）待接入" : "轴承箱添加弹窗（FrmDM1010_Edit）待接入",
    2000,
    "warn",
  );
}

function onEdit() {
  if (activeTab.value === 0) {
    const row = bearCurrent.value;
    if (!row) return;
    if (row.nStatus !== Tdm1000StatusEnum.Spare) {
      toast("非备用状态不可修改！", 2000, "warn");
      return;
    }
    toast("轴承编辑弹窗（FrmDM1000_Edit）待接入", 2000, "warn");
  } else {
    const row = boxCurrent.value;
    if (!row) return;
    if (row.nStatus !== Tdm1000StatusEnum.Spare) {
      toast("非备用状态不可修改！", 2000, "warn");
      return;
    }
    toast("轴承箱编辑弹窗（FrmDM1010_Edit）待接入", 2000, "warn");
  }
}

function onDel() {
  if (activeTab.value === 0) {
    const ids = bearSelectedIds();
    if (ids.length === 0) {
      toast("请选择数据操作！", 2000, "warn");
      return;
    }
    askConfirm("是否确认删除选择的轴承信息！", () => onSubmit("数据提交成功！", () => dM1000Api.tdm1000Del(ids)));
  } else {
    const ids = boxSelectedIds();
    if (ids.length === 0) {
      toast("请选择数据操作！", 2000, "warn");
      return;
    }
    askConfirm("是否确认删除选择的轴承箱信息！", () => onSubmit("数据提交成功！", () => dM1000Api.tdm1010Del(ids)));
  }
}

function onRepair() {
  if (activeTab.value === 0) {
    const ids = bearSelectedIds();
    if (ids.length === 0) {
      toast("请选择轴承信息操作！", 2000, "warn");
      return;
    }
    askConfirm("是否确认维修当前选择的轴承！", () => onSubmit("数据提交成功！", () => dM1000Api.tdm1000Repair(ids)));
  } else {
    const ids = boxSelectedIds();
    if (ids.length === 0) {
      toast("请选择轴承箱信息操作！", 2000, "warn");
      return;
    }
    askConfirm("是否确认维修当前选择的轴承箱！", () => onSubmit("数据提交成功！", () => dM1000Api.tdm1010Repair(ids)));
  }
}

function onRepairFinish() {
  if (activeTab.value === 0) {
    const ids = bearSelectedIds();
    if (ids.length === 0) {
      toast("请选择轴承信息操作！", 2000, "warn");
      return;
    }
    askConfirm("是否确认维修完成所选轴承！", () => onSubmit("数据提交成功！", () => dM1000Api.tdm1000Finish(ids)));
  } else {
    const ids = boxSelectedIds();
    if (ids.length === 0) {
      toast("请选择轴承箱信息操作！", 2000, "warn");
      return;
    }
    askConfirm("是否确认维修完成所选轴承箱！", () => onSubmit("数据提交成功！", () => dM1000Api.tdm1010Finish(ids)));
  }
}

function onScrap() {
  if (activeTab.value === 0) {
    const ids = bearSelectedIds();
    if (ids.length === 0) {
      toast("请选择轴承信息操作！", 2000, "warn");
      return;
    }
    askConfirm("是否确认报废所选轴承！", () => onSubmit("数据提交成功！", () => dM1000Api.tdm1000Scrap(ids)));
  } else {
    const ids = boxSelectedIds();
    if (ids.length === 0) {
      toast("请选择轴承箱信息操作！", 2000, "warn");
      return;
    }
    askConfirm("是否确认报废所选轴承箱！", () => onSubmit("数据提交成功！", () => dM1000Api.tdm1010Scrap(ids)));
  }
}

/* 原 btnInstall_Click：仅轴承页签可见，取焦点行且须为备用状态 → FrmDM1000_InstallBear */
function onInstall() {
  const row = bearCurrent.value;
  if (!row) return;
  if (row.nStatus !== Tdm1000StatusEnum.Spare) {
    toast("请选择备用轴承装载！", 2000, "warn");
    return;
  }
  toast("装载轴承弹窗（FrmDM1000_InstallBear）待接入", 2000, "warn");
}

/* 原 btnOut_Click：仅轴承页签可见 */
function onOut() {
  const ids = bearSelectedIds();
  if (ids.length === 0) {
    toast("请选择轴承数据进行操作！", 2000, "warn");
    return;
  }
  const allAssembly = bearRows.value.every((x) => x.nStatus === Tdm1000StatusEnum.Assembly);
  if (!allAssembly) {
    toast("轴承状态有误，无法拆卸！", 2000, "warn");
    return;
  }
  askConfirm("是否确认拆卸所选的轴承！", () => onSubmit("数据提交成功！", () => dM1000Api.outBear(ids)));
}

onMounted(bearBind);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：轴承号/轴承箱号/状态/轴承类型/轴承箱类型） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轴承号</label>
        <InputText v-model="input.cBearNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轴承箱号</label>
        <InputText v-model="input.cBearBoxNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">状态</label>
        <Select
          v-model="input.nStatus"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轴承类型</label>
        <Select
          v-model="input.nBearType"
          :options="bearTypeOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轴承箱类型</label>
        <Select
          v-model="input.nBearBoxType"
          :options="bearBoxTypeOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1 的 9 个按钮，装载/拆卸仅轴承页签可见） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDel">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRepair">
        <IconTools class="h-3 w-3" />维修
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRepairFinish">
        <IconCircleCheck class="h-3 w-3" />维修完成
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onScrap">
        <IconBan class="h-3 w-3" />报废
      </Button>
      <Button v-if="activeTab === 0" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onInstall">
        <IconArrowsJoin class="h-3 w-3" />装载轴承
      </Button>
      <Button v-if="activeTab === 0" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onOut">
        <IconArrowsSplit class="h-3 w-3" />拆卸轴承
      </Button>
    </div>

    <!-- 轴承 / 轴承箱 双表（原 xtraTabControl1 + gridControl1/gridControl2） -->
    <Tabs :value="activeTab" class="flex min-h-0 flex-1 flex-col" @update:value="onTabChange">
      <TabList class="flex-wrap">
        <Tab :value="0">轴承</Tab>
        <Tab :value="1">轴承箱</Tab>
      </TabList>
      <TabPanels class="min-h-0 flex-1">
        <TabPanel :value="0" class="h-full p-0">
          <div class="h-full min-h-0 overflow-hidden">
            <AgGridVue
              class="hmx-ag-grid h-full w-full"
              :theme="theme"
              :locale-text="AG_GRID_LOCALE_CN"
              :default-col-def="hmxDefaultColDef"
              :column-defs="bearColDefs"
              :row-data="bearRows"
              :row-selection="{
                mode: 'multiRow',
                checkboxes: true,
                headerCheckbox: true,
                enableClickSelection: true,
                enableSelectionWithoutKeys: true,
              }"
              :pagination="false"
              :animate-rows="false"
              :loading="bearLoading"
              @grid-ready="onBearReady"
              @row-clicked="onBearRowClicked"
              @first-data-rendered="autoSizeOnFirstData"
            />
          </div>
        </TabPanel>
        <TabPanel :value="1" class="h-full p-0">
          <div class="h-full min-h-0 overflow-hidden">
            <AgGridVue
              class="hmx-ag-grid h-full w-full"
              :theme="theme"
              :locale-text="AG_GRID_LOCALE_CN"
              :default-col-def="hmxDefaultColDef"
              :column-defs="boxColDefs"
              :row-data="boxRows"
              :row-selection="{
                mode: 'multiRow',
                checkboxes: true,
                headerCheckbox: true,
                enableClickSelection: true,
                enableSelectionWithoutKeys: true,
              }"
              :pagination="false"
              :animate-rows="false"
              :loading="boxLoading"
              @grid-ready="onBoxReady"
              @row-clicked="onBoxRowClicked"
              @first-data-rendered="autoSizeOnFirstData"
            />
          </div>
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
        <Button label="确定" variant="outlined" autofocus @click="onConfirmOk" />
      </template>
    </Dialog>
  </div>
</template>
