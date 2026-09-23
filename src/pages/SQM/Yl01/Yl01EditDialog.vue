<script setup lang="ts">
/** FrmYl01Edit（炼钢工艺要点 新增/编辑/复制）：DDH.Winforms.SQM.Forms.Tqmyl.FrmYl01Edit
 *  布局：splitContainerControl1 上下 SplitterPosition 251/708≈35%
 *        上栏 dataLayoutControl1（Root 1271×251，layoutControlGroup1 三段）：
 *          左 表单(369) 编码/名称/工艺路径代码/工艺路径描述/备注
 *          中 分组「工艺路径」(596)：splitContainerControl3 左右 222/572≈39%
 *             左 gridControl1 工艺路径候选(Gylj 编码/名称/>>)
 *             右 gridControl2 明细(<</序号/编码/工序名称/选择合并) + stackPanel2(Dock Right, TopDown)
 *          右 分组「工艺要点适用钢种标准」(281)：UCTqmyl02
 *        下栏 ucProcValueTables1（Editable=true）
 *  逻辑：>> → model.addGx；<< → model.removeGx；上移/下移/拆分/合并 → model.moveGxUp/Down/unmerge/merge；
 *        编号变更 → model.updateGyCode（且原编号非空时 ReadOnly）；确定 → model.validate() 后交父页 save
 *  待接入：本弹窗无独立后端调用（原 FrmYl01Edit.cs 服务调用 0 处），保存由父页 tqmylApi.save 承接 */
import { computed, reactive, ref, watch } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import Dialog from "primevue/dialog";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowsJoin,
  IconArrowsSplit,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { GyljRepo, type Gylj, type Ylgy, type YlgyGx } from "./ylgy";
import StdSignsPanel from "./StdSignsPanel.vue";
import ProcValueTables from "./ProcValueTables.vue";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ visible: boolean; model: Ylgy | null }>();
const emit = defineEmits<{ "update:visible": [boolean]; ok: [] }>();
const { toast } = useToast();
const theme = makeHmxGridTheme();

const form = reactive({ cCode: "", cName: "", cPlanRouteCode: "", cPlanRouteDesc: "", cRemark: "" });
/** 原 CCodeTextEdit.ReadOnly = !string.IsNullOrEmpty(model.Data.CCode) */
const codeReadOnly = ref(false);

const candApi = ref<GridApi | null>(null);
const routeApi = ref<GridApi | null>(null);
function onCandReady(e: GridReadyEvent) { candApi.value = e.api; }
function onRouteReady(e: GridReadyEvent) { routeApi.value = e.api; }

/* ---------- 工艺路径候选（原 gridControl1 → Gylj，Enabled=false） ---------- */
const gyljRows = ref<Gylj[]>([]);
const candCols: ColDef[] = [
  { field: "code", headerName: "编码", width: 110 },
  { field: "name", headerName: "名称", width: 170 },
  { colId: "xfer-in", headerName: ">>", width: 52, minWidth: 52, sortable: false, resizable: false, filter: false, cellRenderer: () => ">>" },
  { field: "id", headerName: "主键", width: 150, hide: true },
];

/* ---------- 已选工艺路径（原 gridControl2 → ObservableCollection<YlgyGx>，
     原 FieldName 为 Data.Xxx 的绑定路径，web 侧拍平到 YlgyGx.data 上再取值） ---------- */
const routeCols: ColDef[] = [
  { colId: "xfer-out", headerName: "<<", width: 52, minWidth: 52, sortable: false, resizable: false, filter: false, cellRenderer: () => "<<" },
  { field: "nSeq", headerName: "序号", width: 80, valueGetter: (p) => p.data?.data?.nSeq },
  { field: "cProc", headerName: "编码", width: 100, valueGetter: (p) => p.data?.data?.cProc },
  { field: "cProcName", headerName: "工序名称", width: 170, valueGetter: (p) => p.data?.data?.cProcName },
  /* 原「选择合并」勾选列：ui-rules §7 不手写勾选列，勾选由 row-selection 复选框承担，本列隐藏保留在列面板 */
  { colId: "mergeSel", headerName: "选择合并", hide: true },
  { field: "id", headerName: "主键", width: 150, hide: true, valueGetter: (p) => p.data?.data?.id },
  { field: "cTqmyl01Id", headerName: "冶炼工艺要点ID", width: 150, hide: true, valueGetter: (p) => p.data?.data?.cTqmyl01Id },
  { field: "cGyCode", headerName: "冶炼工艺要点编号", width: 140, hide: true, valueGetter: (p) => p.data?.data?.cGyCode },
];

function candRowId(p: { data: Gylj }) { return String(p.data.id ?? p.data.code ?? ""); }
function routeRowId(p: { data: YlgyGx }) { return String(p.data.data.id ?? ""); }

const routeRows = computed(() => props.model?.gylj ?? []);
function syncRoute() {
  requestAnimationFrame(() => {
    routeApi.value?.forEachNode((n) => n.setData({ ...(n.data as YlgyGx) }));
    routeApi.value?.autoSizeAllColumns();
    candApi.value?.autoSizeAllColumns();
  });
}

/* ---------- 打开时装载 ---------- */
watch(
  () => props.visible,
  async (v) => {
    if (!v || !props.model) return;
    Object.assign(form, {
      cCode: props.model.data.cCode ?? "",
      cName: props.model.data.cName ?? "",
      cPlanRouteCode: props.model.data.cPlanRouteCode ?? "",
      cPlanRouteDesc: props.model.data.cPlanRouteDesc ?? "",
      cRemark: props.model.data.cRemark ?? "",
    });
    codeReadOnly.value = !!props.model.data.cCode;
    gyljRows.value = await GyljRepo.getAll();
    syncRoute();
  },
  { immediate: true },
);

/** 把左列表单回写到 model（原 DataBindings + CCodeTextEdit_EditValueChanged） */
function pushForm() {
  const m = props.model;
  if (!m) return;
  m.data.cName = form.cName;
  m.data.cRemark = form.cRemark;
  // cPlanRouteCode / cPlanRouteDesc 由 RefreshRoute 计算，不从输入框回写
  if (form.cCode !== (m.data.cCode ?? "")) {
    m.updateGyCode(form.cCode);
    form.cPlanRouteCode = m.data.cPlanRouteCode ?? "";
    form.cPlanRouteDesc = m.data.cPlanRouteDesc ?? "";
  }
}

function onCodeInput(v?: string) {
  const m = props.model;
  if (!m) return;
  form.cCode = v ?? "";
  m.updateGyCode(form.cCode);
  form.cPlanRouteCode = m.data.cPlanRouteCode ?? "";
  form.cPlanRouteDesc = m.data.cPlanRouteDesc ?? "";
}

/* ---------- 原 gridDataMoveHelper1_LeftMoveToRight / RightMoveToLeft ---------- */
async function transferIn() {
  const m = props.model;
  if (!m) return;
  const sel = (candApi.value?.getSelectedRows() ?? []) as Gylj[];
  if (!sel.length) return;
  for (const g of sel) await m.addGx(g);
  syncRoute();
}
function transferOut() {
  const m = props.model;
  if (!m) return;
  const sel = (routeApi.value?.getSelectedRows() ?? []) as YlgyGx[];
  for (const g of sel) m.removeGx(g.data);
  syncRoute();
  form.cPlanRouteCode = m.data.cPlanRouteCode ?? "";
  form.cPlanRouteDesc = m.data.cPlanRouteDesc ?? "";
}

function currentGx(): YlgyGx | null {
  return (routeApi.value?.getSelectedRows()[0] as YlgyGx | undefined) ?? null;
}
function focusGx(gx: YlgyGx | null) {
  if (!gx) return;
  requestAnimationFrame(() => routeApi.value?.getRowNode(String(gx.data.id ?? ""))?.setSelected(true));
}

/** 原 gridControl2 的 Selected（选择合并）勾选态：由 row-selection 回写到 YlgyGx.data.selected，
 *  保存 payload（toEntities → tqmyl03s）仍带该字段，保持后端契约不变 */
function onRouteSelectionChanged() {
  routeApi.value?.forEachNode((n) => {
    const d = (n.data as YlgyGx | undefined)?.data;
    if (d) d.selected = n.isSelected();
  });
}

/** 原 btnUp_Click / btnDown_Click / btnUnmerge_Click / btnMerge_Click */
function moveUp() {
  const m = props.model;
  const gx = currentGx();
  if (!m || !gx) return;
  m.moveGxUp(gx);
  syncRoute();
  focusGx(gx);
  form.cPlanRouteCode = m.data.cPlanRouteCode ?? "";
  form.cPlanRouteDesc = m.data.cPlanRouteDesc ?? "";
}
function moveDown() {
  const m = props.model;
  const gx = currentGx();
  if (!m || !gx) return;
  m.moveGxDown(gx);
  syncRoute();
  focusGx(gx);
  form.cPlanRouteCode = m.data.cPlanRouteCode ?? "";
  form.cPlanRouteDesc = m.data.cPlanRouteDesc ?? "";
}
function unmerge() {
  const m = props.model;
  const gx = currentGx();
  if (!m || !gx) return;
  m.unmerge(gx);
  syncRoute();
  focusGx(gx);
  form.cPlanRouteCode = m.data.cPlanRouteCode ?? "";
  form.cPlanRouteDesc = m.data.cPlanRouteDesc ?? "";
}
function merge() {
  const m = props.model;
  if (!m) return;
  const picked = (routeApi.value?.getSelectedRows() ?? []) as YlgyGx[];
  if (picked.length < 2) {
    toast("请先勾选要合并的工序", 2500, "warn");
    return;
  }
  try {
    m.merge(picked);
    /* 合并后清空勾选（selection-changed 会回写 selected=false） */
    routeApi.value?.deselectAll();
  } catch (e) {
    toast((e as Error).message, 3000, "error");
    return;
  }
  syncRoute();
  form.cPlanRouteCode = m.data.cPlanRouteCode ?? "";
  form.cPlanRouteDesc = m.data.cPlanRouteDesc ?? "";
}

/** 原 OnOkClick：Model.Validate() 通过后才关窗，保存由父页 tqmylApi.save 承接 */
function onOk() {
  pushForm();
  try {
    props.model?.validate();
  } catch (e) {
    toast((e as Error).message, 3000, "warn");
    return;
  }
  emit("update:visible", false);
  emit("ok");
}
</script>

<template>
  <Dialog :visible="props.visible" modal header="炼钢工艺要点"
    :style="{ width: 'min(86rem, calc(100vw - 2rem))', height: 'min(48rem, calc(100vh - 2rem))' }"
    @update:visible="emit('update:visible', $event)">
    <div class="flex h-full min-h-0 flex-col">
      <!-- 原 splitContainerControl1 上下 251/708≈35% -->
      <Splitter class="min-h-0 flex-[35] shrink" layout="vertical">
        <!-- 上栏 dataLayoutControl1（三段） -->
        <SplitterPanel :size="35" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
          <!-- 原 layoutControlGroup1：左表单(369) | 中「工艺路径」(596) | 右「工艺要点适用钢种标准」(281) -->
          <div class="grid min-h-0 flex-1 grid-cols-[29fr_48fr_23fr] gap-3 overflow-hidden p-1">
            <!-- 左：ItemForCCode / CName / CPlanRouteCode / CPlanRouteDesc + layoutControlItem2 备注 -->
            <div class="flex min-h-0 flex-col gap-1.5 overflow-auto pr-1">
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-24 shrink-0 text-xs text-muted-foreground">编码</label>
                <InputText :model-value="form.cCode" :readonly="codeReadOnly" class="min-w-0 flex-1"
                  @update:model-value="onCodeInput" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-24 shrink-0 text-xs text-muted-foreground">名称</label>
                <InputText v-model="form.cName" class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-24 shrink-0 text-xs text-muted-foreground">工艺路径代码</label>
                <InputText v-model="form.cPlanRouteCode" readonly class="min-w-0 flex-1" />
              </div>
              <div class="flex min-w-0 items-center gap-1.5">
                <label class="w-24 shrink-0 text-xs text-muted-foreground">工艺路径描述</label>
                <InputText v-model="form.cPlanRouteDesc" readonly class="min-w-0 flex-1" />
              </div>
              <div class="flex min-h-0 flex-1 items-start gap-1.5">
                <label class="w-24 shrink-0 pt-1.5 text-xs text-muted-foreground">备注</label>
                <Textarea v-model="form.cRemark" rows="6" class="min-h-0 min-w-0 flex-1" />
              </div>
            </div>

            <!-- 中：分组「工艺路径」 -->
            <fieldset class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-sm border border-border/60">
              <legend class="px-1.5 text-xs text-muted-foreground">工艺路径</legend>
              <Splitter class="min-h-0 flex-1 !border-0" layout="horizontal">
                <!-- 原 gridControl1：Gylj 候选 -->
                <SplitterPanel :size="39" :minSize="20" class="flex flex-col overflow-hidden">
                  <div class="min-h-0 flex-1 overflow-hidden">
                    <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                      :default-col-def="hmxDefaultColDef" :column-defs="candCols" :row-data="gyljRows"
                      :get-row-id="candRowId"
                      :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                      :suppress-column-virtualisation="true" :pagination="false" :animate-rows="false"
                      @grid-ready="onCandReady" @first-data-rendered="autoSizeOnFirstData"
                      @cell-double-clicked="transferIn" />
                  </div>
                </SplitterPanel>
                <!-- 原 gridControl2(Dock Fill) + stackPanel2(Dock Right, TopDown) -->
                <SplitterPanel :minSize="30" class="flex min-h-0 overflow-hidden">
                  <div class="min-h-0 min-w-0 flex-1 overflow-hidden">
                    <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
                      :default-col-def="hmxDefaultColDef" :column-defs="routeCols" :row-data="routeRows"
                      :get-row-id="routeRowId"
                      :row-selection="{ mode: 'multiRow', checkboxes: true, headerCheckbox: true, enableClickSelection: true, enableSelectionWithoutKeys: true }"
                      :suppress-column-virtualisation="true" :pagination="false" :animate-rows="false"
                      @grid-ready="onRouteReady" @first-data-rendered="autoSizeOnFirstData"
                      @selection-changed="onRouteSelectionChanged" @cell-value-changed="syncRoute" />
                  </div>
                  <!-- 原 stackPanel2（Dock Right，TopDown；Text=" " + ToolTip 承载文案） -->
                  <div class="flex w-9 shrink-0 flex-col items-center gap-1 border-l border-border/60 py-1">
                    <Button text severity="secondary" title="上移" class="!p-1.5" @click="moveUp">
                      <IconArrowUp class="h-4 w-4" />
                    </Button>
                    <Button text severity="secondary" title="下移" class="!p-1.5" @click="moveDown">
                      <IconArrowDown class="h-4 w-4" />
                    </Button>
                    <Button text severity="secondary" title="工序拆分" class="!p-1.5" @click="unmerge">
                      <IconArrowsSplit class="h-4 w-4" />
                    </Button>
                    <Button text severity="secondary" title="工序合并" class="!p-1.5" @click="merge">
                      <IconArrowsJoin class="h-4 w-4" />
                    </Button>
                  </div>
                </SplitterPanel>
              </Splitter>
            </fieldset>

            <!-- 右：分组「工艺要点适用钢种标准」 -->
            <fieldset class="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-sm border border-border/60">
              <legend class="px-1.5 text-xs text-muted-foreground">工艺要点适用钢种标准</legend>
              <div class="min-h-0 flex-1 overflow-hidden">
                <StdSignsPanel :tqmyl01="model?.data ?? null" :rows="model?.stdSigns ?? []" :editable="true" />
              </div>
            </fieldset>
          </div>
        </SplitterPanel>

        <!-- 下栏 ucProcValueTables1（原 Editable=true） -->
        <SplitterPanel :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
          <div class="min-h-0 flex-1 overflow-hidden">
            <ProcValueTables :model="model" :editable="true" />
          </div>
        </SplitterPanel>
      </Splitter>

      <!-- 原 FrmDialogBase 的 确定 / 取消 -->
      <div class="flex shrink-0 justify-end gap-2 border-t border-border/60 px-3 py-2">
        <Button label="取消" variant="outlined" @click="emit('update:visible', false)" />
        <Button label="确定" variant="outlined" @click="onOk" />
      </div>
    </div>
  </Dialog>
</template>
