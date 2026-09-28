<script setup lang="ts">
/** FrmEditMsc（编辑冶金规范）：DDH.Winforms.SQM.Forms.Tqmtm.FrmEditMsc
 *  结构：摘要表单(4列行主序，坐标回读) + 上=产线/工序双表CRUD（各自工具栏） + 下=左树(更新基表) 右=单页内容区（按节点类型切换，对应原 PageVisible）
 *  已接入：mSCApi.saveMsc（保存）；产线/工序增删改走 MscVm（本地对象图）；校验=标准牌号必填 + ValidateTestItem 全套原文
 *  待接入：关闭确认「是否保存冶金规范？」是/否/取消 三态保留；精度等级原 SetKeyValueCombobox 被注释（空下拉→文本）；
 *  偏差：原「更新基表」按钮常态无文字悬停才显示，web 常态显示文字 */
import { computed, nextTick, reactive, ref, shallowRef, watch, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconPencil, IconPlus, IconRefresh, IconTrash, IconCopy } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tqmtpa6Api, type Tqmtpa6 } from "@/api/mes4ddh/sqm.swagger";
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
  updateMscDesc,
  transLine,
  transProc,
  applyLineData,
  applyProcData,
  validateTestItems,
  type EditLineDto,
  type EditProcDto,
} from "./mscVm";
import MscIdxTree from "./MscIdxTree.vue";
import MscBasicIdxView from "./MscBasicIdxView.vue";
import Tqmtm01T1View from "./Tqmtm01T1View.vue";
import Tqmtm01P0View from "./Tqmtm01P0View.vue";
import Tqmtm01LineDialog from "./Tqmtm01LineDialog.vue";
import Tqmtm01ProcDialog from "./Tqmtm01ProcDialog.vue";

const props = defineProps<{ visible: boolean; msc: MSC | null; vm: MscVm }>();
const emit = defineEmits<{ "update:visible": [boolean]; ok: [] }>();
const { toast } = useToast();
const theme = makeHmxGridTheme();

const M = shallowRef<MSC | null>(null);
const tick = ref(0);
const bump = () => tick.value++;
const syncing = ref(false);
const saving = ref(false);

/* ---------- 表单（reactive 包一层，写穿原对象图） ---------- */
const form = computed(() => M.value?.data);
const kvProdClass = ref<{ label: string; value: string }[]>([]);
const kvProdCode = ref<{ label: string; value: string }[]>([]);
const kvSteel = ref<{ label: string; value: string }[]>([]);
const kvFactory = ref<{ label: string; value: string }[]>([]);
const kvDelivy = ref<{ label: string; value: string }[]>([]);
const kvCustStd = ref<{ label: string; value: string }[]>([]);
const sgOptions = ref<{ label: string; value: string; row: Tqmtpa6 }[]>([]);

async function loadKv(target: Ref<{ label: string; value: string }[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}
const labelOf = (src: { label: string; value: string }[], v: string | null) =>
  src.find((x) => x.value === v)?.label ?? null;

watch(
  () => props.visible,
  async (v) => {
    if (!v) {
      M.value = null;
      return;
    }
    M.value = props.msc ? reactiveMSC(props.msc) : null;
    selectedLine.value = null;
    selectedProc.value = null;
    selectedTreeId.value = null;
    bottomKind.value = "idx";
    bottomIdx.value = null;
    bottomNode.value = null;
    await Promise.all([
      loadKv(kvProdClass, "A0100:PRODUCT_CLASS"),
      loadKv(kvProdCode, "A0100:PRODUCT_CODE"),
      loadKv(kvSteel, "A0100:STEEL_TYPE"),
      loadKv(kvFactory, "A0100:FAC_CODE"),
      loadKv(kvDelivy, "A0100:DELIVY_STATUS"),
      loadKv(kvCustStd, "A0100:CUST_STD"),
    ]);
    try {
      const list = (await tqmtpa6Api.query({})) ?? [];
      sgOptions.value = list.map((x) => ({
        label: [x.cStdSgCode, x.cSgSign, x.cSgStd].filter(Boolean).join(" "),
        value: x.cStdSgCode ?? "",
        row: x,
      }));
    } catch {
      /* 拦截层已 toast */
    }
    await nextTick();
    bump();
  },
);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reactiveMSC(m: MSC): MSC {
  return reactive(m) as unknown as MSC;
}

/* ---------- 表单变更（照原 EditValueChanged 回写） ---------- */
function onMscChanged(v: string | null | undefined) {
  M.value?.updateMsc(v ?? "");
  bump();
}
function onProdClassChange(v: string | null) {
  if (!M.value) return;
  M.value.data.cProdClassCode = v;
  M.value.data.cProdClassDesc = labelOf(kvProdClass.value, v);
  updateMscDesc(M.value);
}
function onProdCodeChange(v: string | null) {
  if (!M.value) return;
  M.value.data.cProdCode = v;
  M.value.data.cProdCName = labelOf(kvProdCode.value, v);
  updateMscDesc(M.value);
  bump();
}
function onSgChange(v: string | null) {
  if (!M.value || !v) return;
  const o = sgOptions.value.find((x) => x.value === v)?.row;
  M.value.data.cSgStd = o?.cSgStd ?? null;
  M.value.data.cSgSign = o?.cSgSign ?? null;
  M.value.data.cStdSgCode = o?.cStdSgCode ?? null;
  M.value.data.cSteelType = o?.cSgClassCode ?? null;
  updateMscDesc(M.value);
}
function onDelivyChange(v: string | null) {
  if (!M.value) return;
  M.value.data.cDelivyStatusCode = v;
  M.value.data.cDeliveryStateDesc = labelOf(kvDelivy.value, v);
  updateMscDesc(M.value);
}
function onCustStdChange(v: string | null) {
  if (!M.value) return;
  M.value.data.cCustStdCode = v;
  M.value.data.cCustStd = labelOf(kvCustStd.value, v);
  updateMscDesc(M.value);
}

/* ---------- 产线/工序双表 ---------- */
const lineApi = ref<GridApi | null>(null);
const procApi = ref<GridApi | null>(null);
const selectedLine = shallowRef<MSCLine | null>(null);
const selectedProc = shallowRef<MSCProc | null>(null);
const lineColDefs: ColDef[] = [
  { field: "data.cMscLineNo", headerName: "产线号", width: 99 },
  { field: "data.cMsc", headerName: "冶金规范码", width: 125 },
  { field: "data.cWholeBacklog", headerName: "全程途径码", width: 125 },
  { field: "data.cWholeBacklogDesc", headerName: "全程途径说明", width: 138 },
  { field: "data.cDefaultFlag", headerName: "优选顺序", width: 112 },
  { field: "data.cHoldFlag", headerName: "产线已禁用", width: 125 },
  { field: "data.cStNo2", headerName: "坯料类型", width: 112 },
  { field: "data.cRemark", headerName: "备注", width: 86 },
  { field: "data.createTime", headerName: "创建时间", width: 112 },
  { field: "data.creator", headerName: "创建人", width: 99 },
  { field: "data.lastModifyTime", headerName: "最后修改时间", width: 138 },
  { field: "data.lastModifier", headerName: "最后修改人", width: 125 },
  { field: "data.id", headerName: "主键", width: 86, hide: true },
];
const procColDefs: ColDef[] = [
  { field: "data.cMscLineNo", headerName: "产线号", width: 99 },
  { field: "data.cMsc", headerName: "冶金规范码", width: 125 },
  { field: "data.nWholeBacklogSeq", headerName: "全程工序顺序号", width: 151 },
  { field: "data.cWholeBacklogCode", headerName: "全程工序", width: 112 },
  { field: "data.cRemark", headerName: "备注", width: 86 },
  { field: "data.creator", headerName: "创建人", width: 99 },
  { field: "data.createTime", headerName: "创建时间", width: 112 },
  { field: "data.lastModifier", headerName: "最后修改人", width: 125 },
  { field: "data.lastModifyTime", headerName: "最后修改时间", width: 138 },
  { field: "data.id", headerName: "主键", width: 86, hide: true },
];
const idxColDefs: ColDef[] = [
  { field: "data.cMsc", headerName: "冶金规范码", width: 125 },
  { field: "data.cBasicTableTypeCode", headerName: "基表类型", width: 112 },
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

const lineRows = computed(() => {
  void tick.value;
  return M.value ? [...M.value.lines] : [];
});
const procRows = computed(() => {
  void tick.value;
  return selectedLine.value ? [...selectedLine.value.procs] : [];
});

const lineOpen = ref(false);
const procOpen = ref(false);
const lineDto = ref<EditLineDto | null>(null);
const procDto = ref<EditProcDto | null>(null);

function onAddLine() {
  const m = M.value;
  if (!m) return;
  if (!m.data.cProdCode) {
    toast("请先选择品名", 2500, "warn");
    return;
  }
  const line = props.vm.createLine(m);
  lineDto.value = transLine(line);
  pendingLine.value = line;
  lineOpen.value = true;
}
const pendingLine = shallowRef<MSCLine | null>(null);
const editLine = shallowRef<MSCLine | null>(null);
function onEditLine() {
  if (!selectedLine.value) return;
  editLine.value = selectedLine.value;
  lineDto.value = transLine(selectedLine.value);
  pendingLine.value = null;
  lineOpen.value = true;
}
function onLineDialogOk(dto: EditLineDto) {
  if (pendingLine.value && M.value) {
    applyLineData(dto, pendingLine.value);
    props.vm.addLine(M.value, pendingLine.value);
  } else if (editLine.value) {
    props.vm.updateLine(editLine.value, dto);
  }
  selectedLine.value = null;
  bump();
}
function onDelLine() {
  const line = selectedLine.value;
  if (!line || !M.value) return;
  askConfirm("确定要删除吗", async () => {
    props.vm.removeLine(M.value!, line.data.cMscLineNo ?? "");
    selectedLine.value = null;
    bump();
  });
}
async function onCopyLine() {
  const line = selectedLine.value;
  if (!line || !M.value) return;
  const tmp = await line.copy(M.value);
  tmp.updateLineNo(M.value.generateNextLineNo());
  bump();
}
function onAddProc() {
  const line = selectedLine.value;
  if (!line) return;
  const proc = props.vm.createProc(line);
  procDto.value = transProc(proc);
  pendingProc.value = proc;
  editProc.value = null;
  procOpen.value = true;
}
const pendingProc = shallowRef<MSCProc | null>(null);
const editProc = shallowRef<MSCProc | null>(null);
function onEditProc() {
  const proc = selectedProc.value;
  if (!proc) return;
  editProc.value = proc;
  procDto.value = transProc(proc);
  pendingProc.value = null;
  procOpen.value = true;
}
function onProcDialogOk(dto: EditProcDto) {
  const line = selectedLine.value;
  if (!line) return;
  if (pendingProc.value) {
    applyProcData(dto, pendingProc.value);
    props.vm.addProc(line, pendingProc.value);
  } else if (editProc.value) {
    props.vm.updateProc(editProc.value, dto);
  }
  selectedProc.value = null;
  bump();
}
function onDelProc() {
  const line = selectedLine.value;
  const proc = selectedProc.value;
  if (!line || !proc) return;
  askConfirm("确定要删除吗？", async () => {
    props.vm.removeProc(line, proc.id);
    selectedProc.value = null;
    bump();
  });
}
function onRefreshBase() {
  if (!M.value) return;
  props.vm.addNotExistsIdxTabs(M.value);
  bump();
}

/* ---------- 树 + 底部内容区 ---------- */
const selectedTreeId = ref<string | null>(null);
const bottomKind = ref<"idx" | "basic" | "t1" | "p0">("idx");
const bottomIdx = shallowRef<MSCIdx | null>(null);
const bottomNode = shallowRef<MSCTestItemNode | null>(null);
const treeNodes = computed(() => {
  void tick.value;
  return M.value ? buildTree(M.value) : [];
});
const idxRows = computed(() => {
  void tick.value;
  const node = treeNodes.value.find((n) => n.id === selectedTreeId.value);
  const owner = node?.idxRefObj ?? M.value;
  return owner ? [...owner.idxes] : [];
});

function focusGridsByObj(obj: unknown) {
  if (obj instanceof MSCLine) {
    selectedLine.value = obj;
    selectedProc.value = null;
  } else if (obj instanceof MSCProc) {
    selectedLine.value = obj.line;
    selectedProc.value = obj;
  } else if (obj instanceof MSCIdx) {
    focusGridsByObj(obj.parent);
  }
}
function setBottomByNode(node: { idxRefObj: unknown }) {
  const obj = node.idxRefObj;
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
/** 原 TreeList1_FocusedNodeChanged：回选网格行 + 按节点类型切换底部内容 */
function onTreeSelect(nodeId: string) {
  if (syncing.value) return;
  syncing.value = true;
  selectedTreeId.value = nodeId;
  const node = treeNodes.value.find((n) => n.id === nodeId);
  if (node) {
    focusGridsByObj(node.idxRefObj);
    setBottomByNode(node);
  }
  syncing.value = false;
}
/** 原 SetFocusedTreeNode：网格焦点 → 树节点 + 回到「基表信息」 */
function selectTreeFor(obj: unknown, id: string) {
  if (syncing.value) return;
  syncing.value = true;
  selectedTreeId.value = id;
  bottomKind.value = "idx";
  bottomIdx.value = null;
  bottomNode.value = null;
  syncing.value = false;
}
function onLineSelectionChanged() {
  const api = lineApi.value;
  const row = (api?.getSelectedRows()[0] ?? null) as MSCLine | null;
  selectedLine.value = row;
  selectedProc.value = null;
  if (row) selectTreeFor(row, row.id);
  bump();
}
function onProcSelectionChanged() {
  const row = (procApi.value?.getSelectedRows()[0] ?? null) as MSCProc | null;
  selectedProc.value = row;
  if (row) selectTreeFor(row, row.id);
  bump();
}

/* ---------- 关闭确认 + 保存（原 FormClosing 三态 / btnSave） ---------- */
const closeConfirm = ref(false);
function requestClose() {
  closeConfirm.value = true;
}
async function doSave() {
  const m = M.value;
  if (!m) return;
  if (!m.data.cStdSgCode) {
    toast("请选择标准牌号", 2500, "error");
    return;
  }
  const msg = validateTestItems(m);
  if (msg) {
    toast(msg.replaceAll("<b>", "").replaceAll("</b>", ""), 6000, "error");
    return;
  }
  saving.value = true;
  try {
    await props.vm.save(m);
    toast("保存成功！", 2000, "success");
    emit("ok");
    closeConfirm.value = false;
    emit("update:visible", false);
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}
function closeCancel() {
  closeConfirm.value = false;
  emit("update:visible", false); // 否：直接关闭（编辑模式由父级回滚备份）
}

/* ShowYesNo 受控确认（删除产线/工序） */
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
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    header="编辑冶金规范信息"
    :style="{ width: 'min(74rem, calc(100vw - 2rem))', height: 'min(44rem, calc(100vh - 4rem))' }"
    @update:visible="requestClose"
  >
    <div class="flex h-full min-h-0 flex-col gap-2">
      <!-- 摘要（原 groupControl1「冶金规范摘要信息」包 dataLayoutControl1，4列行主序） -->
      <div class="shrink-0 rounded-border border border-border/60">
        <div class="flex h-8 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">冶金规范摘要信息</span>
          <span class="ml-auto" />
          <Button label="更新基表" variant="outlined" class="h-6 whitespace-nowrap !px-2" @click="onRefreshBase">
            <IconRefresh class="h-3 w-3" />更新基表
          </Button>
          <Button label="保存" variant="outlined" class="h-6 whitespace-nowrap !px-2" :loading="saving" @click="doSave">
            保存
          </Button>
        </div>
        <div v-if="form" class="grid grid-cols-4 items-start gap-x-3 gap-y-1.5 p-2">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">冶金规范码</label>
            <InputText
              :model-value="form.cMsc ?? ''"
              class="min-w-0 flex-1"
              @update:model-value="(v: string | undefined) => onMscChanged(v)"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">产品大类</label>
            <Select
              :model-value="form.cProdClassCode ?? null"
              :options="kvProdClass"
              :filter="true"
              show-clear
              option-label="label"
              option-value="value"
              placeholder="产品大类"
              class="min-w-0 flex-1"
              @update:model-value="onProdClassChange"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">品名</label>
            <Select
              :model-value="form.cProdCode ?? null"
              :options="kvProdCode"
              :filter="true"
              show-clear
              option-label="label"
              option-value="value"
              placeholder="品名"
              class="min-w-0 flex-1"
              @update:model-value="onProdCodeChange"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">交货状态</label>
            <Select
              :model-value="form.cDelivyStatusCode ?? null"
              :options="kvDelivy"
              :filter="true"
              show-clear
              option-label="label"
              option-value="value"
              placeholder="交货状态"
              class="min-w-0 flex-1"
              @update:model-value="onDelivyChange"
            />
          </div>

          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">钢种大类</label>
            <Select
              v-model="form.cSteelType"
              :options="kvSteel"
              :filter="true"
              show-clear
              option-label="label"
              option-value="value"
              placeholder="钢种大类"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">标准牌号</label>
            <Select
              :model-value="form.cStdSgCode ?? null"
              :options="sgOptions"
              :filter="true"
              show-clear
              option-label="label"
              option-value="value"
              placeholder="标准牌号"
              class="min-w-0 flex-1"
              @update:model-value="onSgChange"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">标准描述</label>
            <InputText v-model="form.cSgStd" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">牌号</label>
            <InputText v-model="form.cSgSign" class="min-w-0 flex-1" />
          </div>

          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">加工用途</label>
            <Select
              :model-value="form.cCustStdCode ?? null"
              :options="kvCustStd"
              :filter="true"
              show-clear
              option-label="label"
              option-value="value"
              placeholder="加工用途"
              class="min-w-0 flex-1"
              @update:model-value="onCustStdChange"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">精度等级</label>
            <InputText v-model="form.cAccuGradeCode" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">制造厂别</label>
            <Select
              v-model="form.cFactoryId"
              :options="kvFactory"
              :filter="true"
              show-clear
              option-label="label"
              option-value="value"
              placeholder="制造厂别"
              class="min-w-0 flex-1"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">来源MSC</label>
            <InputText v-model="form.cMscSrc" class="min-w-0 flex-1" />
          </div>

          <div class="col-span-2 min-w-0">
            <div class="flex min-w-0 items-start gap-1.5">
              <label class="w-24 shrink-0 pt-1.5 text-xs text-muted-foreground">备注</label>
              <Textarea v-model="form.cRemark" rows="2" class="min-w-0 flex-1" />
            </div>
          </div>
          <div class="col-span-2 min-w-0">
            <div class="flex min-w-0 items-start gap-1.5">
              <label class="w-24 shrink-0 pt-1.5 text-xs text-muted-foreground">冶金规范说明</label>
              <Textarea v-model="form.cMscDesc" rows="2" class="min-w-0 flex-1" />
            </div>
          </div>
        </div>
      </div>

      <!-- 上：产线/工序（原 split1 200px；内 split 652 宽≈57%） -->
      <Splitter layout="horizontal" class="min-h-0 shrink-0 border border-border/60" style="height: 11rem">
        <SplitterPanel :size="57" class="flex min-h-0 min-w-0 flex-col">
          <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
            <span class="text-xs font-medium text-muted-foreground">产线</span>
            <span class="mx-1 h-4 w-px bg-border" />
            <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="onAddLine">
              <IconPlus class="h-3 w-3" />添加
            </Button>
            <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="onEditLine">
              <IconPencil class="h-3 w-3" />编辑
            </Button>
            <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="onDelLine">
              <IconTrash class="h-3 w-3" />删除
            </Button>
            <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="onCopyLine">
              <IconCopy class="h-3 w-3" />复制
            </Button>
          </div>
          <div class="min-h-0 flex-1 overflow-hidden">
            <AgGridVue
              class="hmx-ag-grid h-full w-full"
              :theme="theme"
              :locale-text="AG_GRID_LOCALE_CN"
              :default-col-def="hmxDefaultColDef"
              :column-defs="lineColDefs"
              :row-data="lineRows"
              :get-row-id="(p: any) => String(p.data.id)"
              :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
              :pagination="false"
              @grid-ready="(e: GridReadyEvent) => (lineApi = e.api)"
              @first-data-rendered="autoSizeOnFirstData"
              @selection-changed="onLineSelectionChanged"
            />
          </div>
        </SplitterPanel>
        <SplitterPanel :size="43" class="flex min-h-0 min-w-0 flex-col">
          <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
            <span class="text-xs font-medium text-muted-foreground">工序</span>
            <span class="mx-1 h-4 w-px bg-border" />
            <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="onAddProc">
              <IconPlus class="h-3 w-3" />添加
            </Button>
            <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="onEditProc">
              <IconPencil class="h-3 w-3" />编辑
            </Button>
            <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="onDelProc">
              <IconTrash class="h-3 w-3" />删除
            </Button>
          </div>
          <div class="min-h-0 flex-1 overflow-hidden">
            <AgGridVue
              class="hmx-ag-grid h-full w-full"
              :theme="theme"
              :locale-text="AG_GRID_LOCALE_CN"
              :default-col-def="hmxDefaultColDef"
              :column-defs="procColDefs"
              :row-data="procRows"
              :get-row-id="(p: any) => String(p.data.id)"
              :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
              :pagination="false"
              @grid-ready="(e: GridReadyEvent) => (procApi = e.api)"
              @first-data-rendered="autoSizeOnFirstData"
              @selection-changed="onProcSelectionChanged"
            />
          </div>
        </SplitterPanel>
      </Splitter>

      <!-- 下：左树 | 右内容（原 split3 tree 269 宽≈24%） -->
      <Splitter layout="horizontal" class="min-h-0 flex-1 border border-border/60">
        <SplitterPanel :size="24" class="flex min-h-0 min-w-0 flex-col">
          <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
            <span class="text-xs font-medium text-muted-foreground">基表结构</span>
          </div>
          <div class="min-h-0 flex-1 overflow-hidden">
            <MscIdxTree :nodes="treeNodes" :selected-id="selectedTreeId" @select="(n) => onTreeSelect(n.id)" />
          </div>
        </SplitterPanel>
        <SplitterPanel :size="76" class="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
            <span class="text-xs font-medium text-muted-foreground">
              {{
                bottomKind === "idx"
                  ? "基表信息"
                  : bottomKind === "basic"
                    ? "基表数据明细"
                    : bottomKind === "t1"
                      ? "试验项目要求"
                      : "试验项目标准"
              }}
            </span>
          </div>
          <div class="min-h-0 flex-1 overflow-hidden">
            <div v-show="bottomKind === 'idx'" class="h-full overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="idxColDefs"
                :row-data="idxRows"
                :get-row-id="(p: any) => String(p.data.id)"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :pagination="false"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
            <MscBasicIdxView
              v-show="bottomKind === 'basic'"
              class="h-full"
              :idx="bottomKind === 'basic' ? bottomIdx : null"
            />
            <Tqmtm01T1View
              v-show="bottomKind === 't1'"
              class="h-full"
              :idx="bottomKind === 't1' ? (bottomIdx as Tqmtmt1Idx) : null"
              @data-changed="bump"
            />
            <Tqmtm01P0View
              v-show="bottomKind === 'p0'"
              class="h-full"
              :node="bottomKind === 'p0' ? bottomNode : null"
              @data-changed="bump"
            />
          </div>
        </SplitterPanel>
      </Splitter>
    </div>

    <Tqmtm01LineDialog :visible="lineOpen" :dto="lineDto" @update:visible="lineOpen = $event" @ok="onLineDialogOk" />
    <Tqmtm01ProcDialog :visible="procOpen" :dto="procDto" @update:visible="procOpen = $event" @ok="onProcDialogOk" />

    <!-- 确认（原 MsgBox.ShowYesNo） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(24rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>

    <!-- 原 FormClosing：XtraMessageBox Yes/No/Cancel -->
    <Dialog
      :visible="closeConfirm"
      modal
      header="确认"
      :style="{ width: 'min(24rem, calc(100vw - 2rem))' }"
      @update:visible="
        (v: boolean) => {
          if (!v) closeConfirm = false;
        }
      "
    >
      <p class="text-xs">是否保存冶金规范？</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="closeConfirm = false" />
        <Button label="否" variant="outlined" @click="closeCancel" />
        <Button label="是" variant="outlined" :loading="saving" @click="doSave" />
      </template>
    </Dialog>
  </Dialog>
</template>
