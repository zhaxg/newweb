<script setup lang="ts">
/** 对应 FrmTqmtm01（冶金规范）：DDH.Winforms.SQM.Forms.Tqmtm.FrmTqmtm01
 *  结构：查询7条件 + 工具栏8按钮 + 上=三页签(基本信息/产线/工序)+分页条 下=左树 右=单页内容区（按节点类型 PageVisible 切换）
 *  已接入：mSCApi.queryMSCs（分页查询）/deleteMsc/effectMsc；增·编·复制 → Tqmtm01BuildDialog(FrmTqmtm011) + Tqmtm01EditDialog(FrmEditMsc)
 *  待接入：预览（原 btnPreview_Click 整段注释，XtraReport 打印）占位
 *  偏差：底部原 4 页签在选中树节点后以 PageVisible 只留一页，web 恒按节点类型单页显示；分页条为独立组件 */
import { computed, onMounted, reactive, ref, shallowRef, watch, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import { IconBan, IconCopy, IconEye, IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { Tabs, TabList, Tab, TabPanels, TabPanel } from "primevue";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import {
  mSCApi,
  ValidFlag,
  type MSCQueryPara,
  type MSCQueryParaPaginationQueryInput,
} from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { useToast } from "@/composables/useToast";
import {
  MscVm,
  MSC,
  MSCIdx,
  MSCLine,
  MSCProc,
  MSCTestItemNode,
  Tqmtmt1Idx,
  buildTree,
  type IdxReferenceTree,
} from "./mscVm";
import MscIdxTree from "./MscIdxTree.vue";
import MscPaginationBar from "./MscPaginationBar.vue";
import MscBasicIdxView from "./MscBasicIdxView.vue";
import Tqmtm01T1View from "./Tqmtm01T1View.vue";
import Tqmtm01P0View from "./Tqmtm01P0View.vue";
import Tqmtm01BuildDialog, { type BuildResult } from "./Tqmtm01BuildDialog.vue";
import Tqmtm01EditDialog from "./Tqmtm01EditDialog.vue";

const { toast } = useToast();
const theme = makeHmxGridTheme();
const vm = new MscVm();

/* ---------- 查询（原 dataLayoutControl1 → MSCQueryPara） ---------- */
const para = reactive<MSCQueryPara>({});
const kvProdClass = ref<{ label: string; value: string }[]>([]);
const kvProdCode = ref<{ label: string; value: string }[]>([]);
const kvFactory = ref<{ label: string; value: string }[]>([]);
async function loadKv(target: Ref<{ label: string; value: string }[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}

const querying = ref(false);
const dataCount = ref(0);
const pageIndex = ref(0);
const pageSize = ref(50);
const tick = ref(0);
const bump = () => tick.value++;

async function queryData(page = pageIndex.value, size = pageSize.value) {
  querying.value = true;
  try {
    const input: MSCQueryParaPaginationQueryInput = {
      pageIndex: page,
      pageSize: size,
      skip: page * size,
      enablePaging: true,
      data: { ...para },
    };
    dataCount.value = await vm.queryPage(input);
    pageIndex.value = page;
    pageSize.value = size;
    selectedTreeId.value = null;
    activeTab.value = "msc";
    selectedMsc.value = null;
    selectedLine.value = null;
    selectedProc.value = null;
    bottomKind.value = "idx";
    bottomIdx.value = null;
    bottomNode.value = null;
    bump();
    requestAnimationFrame(() => {
      mscApi.value?.autoSizeAllColumns();
      lineApi.value?.autoSizeAllColumns();
      procApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
function onPageChange(p: number, size: number) {
  void queryData(p, size);
}
onMounted(async () => {
  await Promise.all([
    loadKv(kvProdClass, "A0100:PRODUCT_CLASS"),
    loadKv(kvProdCode, "A0100:PROC_CODE"), // 原 colCProdCode 用 ProcCode 格式化器
    loadKv(kvFactory, "A0100:FAC_CODE"),
  ]);
  await queryData();
});

/* ---------- 网格列 ---------- */
const VALID_NAME = (p: { value: unknown }) =>
  p.value == null ? "" : (ValidFlag.Valid === Number(p.value) ? "Valid" : "Invalid"); // 原枚举单元格 ToString
const TYPE_NAME = (p: { value: unknown }) =>
  ({ 0: "None", 1: "A", 2: "B", 3: "C", 4: "D" })[Number(p.value)] ?? String(p.value ?? ""); // ToString 形态
const kvFmt = (get: () => { label: string; value: string }[]) => (p: { value: unknown }) =>
  get().find((x) => x.value === String(p.value ?? ""))?.label ?? String(p.value ?? "");

const mscColDefs: ColDef[] = [
  { field: "data.cMsc", headerName: "冶金规范码", width: 125 },
  { field: "data.cMscDesc", headerName: "冶金规范说明", width: 138 },
  { field: "data.cValidFlag", headerName: "生效标记", width: 112, valueFormatter: VALID_NAME },
  { field: "data.cProdClassCode", headerName: "产品大类", width: 112, valueFormatter: kvFmt(() => kvProdClass.value) },
  { field: "data.cProdCode", headerName: "品名", width: 86, valueFormatter: kvFmt(() => kvProdCode.value) },
  { field: "data.cSteelType", headerName: "钢种大类", width: 112 },
  { field: "data.cSgStd", headerName: "标准", width: 86 },
  { field: "data.cSgSign", headerName: "钢种牌号", width: 112 },
  { field: "data.cRemark", headerName: "备注", width: 86 },
  { field: "data.cStdSgCode", headerName: "标准牌号代码", width: 138 },
  { field: "data.cDelivyStatusCode", headerName: "交货状态代码", width: 138 },
  { field: "data.cCustStdCode", headerName: "加工用途代码（用户标准代码）", width: 242 },
  { field: "data.nVersion", headerName: "版次", width: 86 },
  { field: "data.cFactoryId", headerName: "制造厂别", width: 112, valueFormatter: kvFmt(() => kvFactory.value) },
  { field: "data.cAccuGradeCode", headerName: "精度等级代码", width: 138 },
  { field: "data.cMscSrc", headerName: "来源msc", width: 125 },
  { field: "data.creator", headerName: "创建人", width: 99 },
  { field: "data.createTime", headerName: "创建时间", width: 112 },
  { field: "data.cCheckMaker", headerName: "检验责任者", width: 125 },
  { field: "data.dCheckTime", headerName: "检验时间1", width: 125 },
  { field: "data.lastModifyTime", headerName: "最后修改时间", width: 138 },
  { field: "data.lastModifier", headerName: "最后修改人", width: 125 },
  { field: "data.id", headerName: "主键", width: 86, hide: true },
];
const lineColDefs: ColDef[] = [
  { field: "data.cMscLineNo", headerName: "产线号", width: 99 },
  { field: "data.cMsc", headerName: "冶金规范码", width: 125 },
  { field: "data.cWholeBacklog", headerName: "全程途径码", width: 125 },
  { field: "data.cWholeBacklogDesc", headerName: "全程途径说明", width: 138 },
  { field: "data.cStNo2", headerName: "坯料类型", width: 112 },
  { field: "data.cStNo3", headerName: "精密全程路径标记", width: 164 },
  { field: "data.cRemark", headerName: "备注", width: 86 },
  { field: "data.createTime", headerName: "创建时间", width: 112 },
  { field: "data.creator", headerName: "创建人", width: 99 },
  { field: "data.lastModifyTime", headerName: "最后修改时间", width: 138 },
  { field: "data.lastModifier", headerName: "最后修改人", width: 125 },
  { field: "data.cDefaultFlag", headerName: "Data.CDefaultFlag", width: 281 },
  { field: "data.cHoldFlag", headerName: "产线已禁用", width: 125 },
  { field: "data.id", headerName: "主键", width: 86, hide: true },
];
const procColDefs: ColDef[] = [
  { field: "data.cMscLineNo", headerName: "产线号", width: 99 },
  { field: "data.cMsc", headerName: "冶金规范码", width: 125 },
  { field: "data.nWholeBacklogSeq", headerName: "全程工序顺序号", width: 151 },
  { field: "data.cWholeBacklogCode", headerName: "全程工序", width: 112 },
  { field: "data.cWholeBacklogName", headerName: "全程工序名称", width: 138 },
  { field: "data.cRemark", headerName: "备注", width: 86 },
  { field: "data.createTime", headerName: "创建时间", width: 112 },
  { field: "data.creator", headerName: "创建人", width: 99 },
  { field: "data.lastModifyTime", headerName: "最后修改时间", width: 138 },
  { field: "data.lastModifier", headerName: "最后修改人", width: 125 },
  { field: "data.id", headerName: "主键", width: 86, hide: true },
];
const idxColDefs: ColDef[] = [
  { field: "data.cMsc", headerName: "冶金规范码", width: 125 },
  { field: "data.cBasicTableTypeCode", headerName: "基表类型", width: 112, valueFormatter: TYPE_NAME },
  { field: "data.cMscLineNo", headerName: "产线号", width: 99 },
  { field: "data.cIdxNo", headerName: "索引号", width: 99 },
  { field: "data.cWholeBacklogCode", headerName: "全程工序", width: 112 },
  { field: "data.cBasicTableCode", headerName: "基表代码", width: 112 },
  { field: "data.cBasicTableEName", headerName: "基表英文名称", width: 138 },
  { field: "data.cBasicTableCName", headerName: "基表中文名称", width: 138 },
  { field: "data.cRemark", headerName: "备注", width: 86 },
  { field: "data.cItemMustFlag", headerName: "必须项标记", width: 125 },
  { field: "data.id", headerName: "主键", width: 86, hide: true },
];

/* ---------- 选中态与联动（原三表 FocusedRow ↔ 树 ↔ 页签） ---------- */
const mscApi = ref<GridApi | null>(null);
const lineApi = ref<GridApi | null>(null);
const procApi = ref<GridApi | null>(null);
const activeTab = ref("msc");
const selectedMsc = shallowRef<MSC | null>(null);
const selectedLine = shallowRef<MSCLine | null>(null);
const selectedProc = shallowRef<MSCProc | null>(null);
const selectedTreeId = ref<string | null>(null);
const bottomKind = ref<"idx" | "basic" | "t1" | "p0">("idx");
const bottomIdx = shallowRef<MSCIdx | null>(null);
const bottomNode = shallowRef<MSCTestItemNode | null>(null);
const syncing = ref(false);

const mscRows = computed(() => {
  void tick.value;
  return [...vm.mscs];
});
const lineRows = computed(() => {
  void tick.value;
  return selectedMsc.value ? [...selectedMsc.value.lines] : [];
});
const procRows = computed(() => {
  void tick.value;
  return selectedLine.value ? [...selectedLine.value.procs] : [];
});
const treeNodes = computed<IdxReferenceTree[]>(() => {
  void tick.value;
  return vm.mscs.length ? vm.mscs.flatMap((m) => buildTree(m)) : [];
});
const idxRows = computed(() => {
  void tick.value;
  const node = treeNodes.value.find((n) => n.id === selectedTreeId.value);
  const owner = node?.idxRefObj ?? selectedMsc.value;
  return owner ? [...owner.idxes] : [];
});

function setBottomByNode(obj: unknown) {
  if (obj instanceof MSCTestItemNode) {
    bottomKind.value = "p0";
    bottomNode.value = obj;
    bottomIdx.value = null;
  } else if (obj instanceof Tqmtmt1Idx) {
    bottomKind.value = "t1";
    bottomIdx.value = obj;
    bottomNode.value = null;
  } else if (obj instanceof MSCIdx) {
    bottomKind.value = "basic";
    bottomIdx.value = obj;
    bottomNode.value = null;
  } else {
    bottomKind.value = "idx";
    bottomIdx.value = null;
    bottomNode.value = null;
  }
}
function focusGridsByObj(obj: unknown): MSC | null {
  if (obj instanceof MSC) {
    activeTab.value = "msc";
    selectedMsc.value = obj;
    return obj;
  }
  if (obj instanceof MSCLine) {
    const m = focusGridsByObj(obj.msc);
    selectedLine.value = obj;
    activeTab.value = "line";
    return m;
  }
  if (obj instanceof MSCProc) {
    const m = focusGridsByObj(obj.line.msc);
    selectedLine.value = obj.line;
    selectedProc.value = obj;
    activeTab.value = "proc";
    return m;
  }
  if (obj instanceof MSCIdx) return focusGridsByObj(obj.parent);
  return null;
}
/** 树 → 网格/页签/内容区 */
function onTreeSelect(node: IdxReferenceTree) {
  if (syncing.value) return;
  syncing.value = true;
  selectedTreeId.value = node.id;
  const m = focusGridsByObj(node.idxRefObj);
  if (m) selectedMsc.value = m;
  setBottomByNode(node.idxRefObj);
  syncing.value = false;
  bump();
}
/** 网格焦点 → 树节点 + 回「基表信息」（原 SetFocusedTreeNode） */
function selectTreeFor(id: string) {
  if (syncing.value) return;
  syncing.value = true;
  selectedTreeId.value = id;
  bottomKind.value = "idx";
  bottomIdx.value = null;
  bottomNode.value = null;
  syncing.value = false;
}
function onMscSelectionChanged(_e: SelectionChangedEvent) {
  const row = (mscApi.value?.getSelectedRows()[0] ?? null) as MSC | null;
  selectedMsc.value = row;
  selectedLine.value = null;
  selectedProc.value = null;
  if (row) selectTreeFor(row.id);
  bump();
}
function onLineSelectionChanged() {
  const row = (lineApi.value?.getSelectedRows()[0] ?? null) as MSCLine | null;
  selectedLine.value = row;
  selectedProc.value = null;
  if (row) selectTreeFor(row.id);
  bump();
}
function onProcSelectionChanged() {
  const row = (procApi.value?.getSelectedRows()[0] ?? null) as MSCProc | null;
  selectedProc.value = row;
  if (row) selectTreeFor(row.id);
  bump();
}
function refreshAll() {
  bump();
  requestAnimationFrame(() => {
    mscApi.value?.forEachNode((n) => n.setSelected(!!selectedMsc.value && n.data === selectedMsc.value));
  });
}

/* ---------- 工具栏按钮（原 stackPanel1） ---------- */
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

const buildOpen = ref(false);
const buildMode = ref<"add" | "copy">("add");
const editOpen = ref(false);
const editTarget = shallowRef<MSC | null>(null);
const pendingMsc = shallowRef<MSC | null>(null); // 新建/复制：向导产出、待编辑确认后入列

function onAdd() {
  buildMode.value = "add";
  buildOpen.value = true;
}
function onCopy() {
  if (!selectedMsc.value) return;
  buildMode.value = "copy";
  buildOpen.value = true;
}
async function onBuildOk(r: BuildResult) {
  try {
    let msc: MSC;
    if (buildMode.value === "add") {
      msc = vm.createMsc(r.msc);
    } else {
      if (!selectedMsc.value) return;
      msc = await vm.copyMsc(selectedMsc.value, r.msc);
    }
    msc.data.cFactoryId = r.fac;
    msc.data.cStdSgCode = r.stdSgCode;
    msc.data.cSgSign = r.sgSign;
    msc.data.cSgStd = r.sgStd;
    msc.data.cSteelType = r.sgClassCode;
    msc.data.cProdClassCode = r.productClass;
    msc.data.cProdClassDesc = r.productClassDesc;
    msc.data.cProdCName = r.prodName;
    msc.data.cProdCode = r.prodCode;
    // 原 _vm.UpdateMSCDesc(msc)
    msc.data.cMscDesc = `${r.productClassDesc ?? ""} ${r.prodName ?? ""} ${msc.data.cDeliveryStateDesc ?? ""} ${msc.data.cCustStd ?? ""}`;
    pendingMsc.value = msc;
    editTarget.value = msc;
    editOpen.value = true;
  } catch (e) {
    toast((e as Error).message, 3000, "error");
  }
}
function onEdit() {
  if (!selectedMsc.value) return;
  void (async () => {
    try {
      editTarget.value = await vm.beginEdit(selectedMsc.value!);
      editOpen.value = true;
    } catch (e) {
      toast((e as Error).message, 3000, "error");
    }
  })();
}
function onEditOk() {
  // DialogResult.OK：新建/复制 → 入列；编辑 → 备份提交
  if (pendingMsc.value) {
    vm.addMsc(pendingMsc.value);
    pendingMsc.value = null;
  } else {
    vm.completeEdit();
  }
  refreshAll();
}
watch(editOpen, (v) => {
  if (!v) {
    if (pendingMsc.value) pendingMsc.value = null;
    else vm.rollbackEdit();
    pendingMsc.value = null;
    bump();
  }
});
function onDelete() {
  if (!selectedMsc.value) return;
  askConfirm("确定要删除？", async () => {
    try {
      await vm.delete(selectedMsc.value!);
      selectedMsc.value = null;
      refreshAll();
    } catch (e) {
      toast((e as Error).message, 3000, "error");
    }
  });
}
function onPreview() {
  toast("预览待接入：原 XtraReport 打印（btnPreview_Click 原程序整段注释）", 2500, "warn");
}
async function onEnable() {
  if (!selectedMsc.value) return;
  askConfirm("确定启用冶金规范？", async () => {
    try {
      await vm.effect(selectedMsc.value!, ValidFlag.Valid);
      refreshAll();
    } catch (e) {
      toast((e as Error).message, 3000, "error"); // 「冶金规范生效，不需要操作」
    }
  });
}
async function onDisable() {
  if (!selectedMsc.value) return;
  askConfirm("确定禁用冶金规范？", async () => {
    try {
      await vm.effect(selectedMsc.value!, ValidFlag.Invalid);
      refreshAll();
    } catch (e) {
      toast((e as Error).message, 3000, "error");
    }
  });
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 DataLayout 7 项） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">冶金规范码</label>
          <InputText v-model="para.cMsc" class="min-w-0 flex-1" @keydown.enter="queryData(0, pageSize)" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">标准牌号</label>
          <InputText v-model="para.cStdSgCode" class="min-w-0 flex-1" @keydown.enter="queryData(0, pageSize)" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">牌号</label>
          <InputText v-model="para.cSgSign" class="min-w-0 flex-1" @keydown.enter="queryData(0, pageSize)" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产品大类</label>
          <Select v-model="para.cProdClassCode" :options="kvProdClass" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="产品大类" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">品名</label>
          <Select v-model="para.cProdCode" :options="kvProdCode" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="品名" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">制造厂别</label>
          <Select v-model="para.factoryId" :options="kvFactory" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="制造厂别" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">标准</label>
          <InputText v-model="para.cSgStd" class="min-w-0 flex-1" @keydown.enter="queryData(0, pageSize)" />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1：查询/添加/编辑/删除/复制/预览/生效/禁用） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="queryData(0, pageSize)">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onCopy">
        <IconCopy class="h-3 w-3" />复制
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onPreview">
        <IconEye class="h-3 w-3" />预览
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEnable">生效</Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onDisable">
        <IconBan class="h-3 w-3" />禁用
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">冶金规范（{{ dataCount }}）</span>
    </div>

    <!-- 上：三页签 + 分页条（原 split2 上 280px） -->
    <Splitter layout="horizontal" class="min-h-0 flex-1 border-0">
      <SplitterPanel :size="47" class="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <Tabs v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col overflow-hidden pt-1">
          <TabList>
            <Tab value="msc">冶金规范基本信息</Tab>
            <Tab value="line">产线</Tab>
            <Tab value="proc">工序</Tab>
          </TabList>
          <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
            <TabPanel value="msc" class="h-full overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="mscColDefs" :row-data="mscRows"
                :get-row-id="(p: any) => String(p.data.id)"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :pagination="false" @grid-ready="(e: GridReadyEvent) => (mscApi = e.api)"
                @first-data-rendered="autoSizeOnFirstData" @selection-changed="onMscSelectionChanged" />
            </TabPanel>
            <TabPanel value="line" class="h-full overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="lineColDefs" :row-data="lineRows"
                :get-row-id="(p: any) => String(p.data.id)"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :pagination="false" @grid-ready="(e: GridReadyEvent) => (lineApi = e.api)"
                @first-data-rendered="autoSizeOnFirstData" @selection-changed="onLineSelectionChanged" />
            </TabPanel>
            <TabPanel value="proc" class="h-full overflow-hidden">
              <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef" :column-defs="procColDefs" :row-data="procRows"
                :get-row-id="(p: any) => String(p.data.id)"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :pagination="false" @grid-ready="(e: GridReadyEvent) => (procApi = e.api)"
                @first-data-rendered="autoSizeOnFirstData" @selection-changed="onProcSelectionChanged" />
            </TabPanel>
          </TabPanels>
        </Tabs>
        <MscPaginationBar :data-count="dataCount" :page-index="pageIndex" :page-size="pageSize"
          @change="onPageChange" />
      </SplitterPanel>

      <!-- 下：左树 | 右单页内容（原 split2 Panel2 → split1 左右 248 宽） -->
      <SplitterPanel :size="53" class="flex min-h-0 min-w-0 flex-col overflow-hidden">
        <Splitter layout="horizontal" class="min-h-0 flex-1 border-0">
          <SplitterPanel :size="22" class="flex min-h-0 min-w-0 flex-col">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">节点</span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <MscIdxTree :nodes="treeNodes" :selected-id="selectedTreeId" @select="onTreeSelect" />
            </div>
          </SplitterPanel>
          <SplitterPanel :size="78" class="flex min-h-0 min-w-0 flex-col overflow-hidden">
            <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
              <span class="text-xs font-medium text-muted-foreground">
                {{ bottomKind === "idx" ? "基表信息" : bottomKind === "basic" ? "基表数据明细" : bottomKind === "t1" ? "试验项目要求" : "试验项目标准" }}
              </span>
            </div>
            <div class="min-h-0 flex-1 overflow-hidden">
              <div v-show="bottomKind === 'idx'" class="h-full overflow-hidden">
                <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                  :default-col-def="hmxDefaultColDef" :column-defs="idxColDefs" :row-data="idxRows"
                  :get-row-id="(p: any) => String(p.data.id)"
                  :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                  :pagination="false" @first-data-rendered="autoSizeOnFirstData" />
              </div>
              <MscBasicIdxView v-show="bottomKind === 'basic'" class="h-full"
                :idx="bottomKind === 'basic' ? bottomIdx : null" />
              <Tqmtm01T1View v-show="bottomKind === 't1'" class="h-full"
                :idx="bottomKind === 't1' ? (bottomIdx as Tqmtmt1Idx) : null" @data-changed="bump" />
              <Tqmtm01P0View v-show="bottomKind === 'p0'" class="h-full"
                :node="bottomKind === 'p0' ? bottomNode : null" @data-changed="bump" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（原 MsgBox.ShowYesNo） -->
    <Dialog :visible="confirmOpen" modal header="确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>

    <Tqmtm01BuildDialog :visible="buildOpen" @update:visible="buildOpen = $event" @ok="onBuildOk" />
    <Tqmtm01EditDialog :visible="editOpen" :msc="editTarget" :vm="vm" @update:visible="editOpen = $event"
      @ok="onEditOk" />
  </div>
</template>
