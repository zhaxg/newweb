<script setup lang="ts">
/** 对应 FrmYl01（炼钢工艺要点）：DDH.Winforms.SQM.Forms.Tqmyl.FrmYl01
 *  已接入：tqmylApi.queryYl01（查询）/ queryById（焦点行联动下栏）/ save（编辑弹窗保存）/ updateValidFlag（生效·禁用）
 *  布局：dataLayoutControl1 条件区 5 项（编号/名称/钢种/标准/生效状态，Location 行主序）→
 *        stackPanel1 工具栏 8 按钮 → splitContainerControl1 上下 SplitterPosition 281 + FrmYl01_Shown 覆盖为 Height/2 →
 *        splitContainerControl2 左右 813 + Shown 覆盖为 Width-Width/4（75%）
 *          上左 UCYl01 主表(Tqmyl01) / 上右 UCTqmyl02 钢种标准 / 下栏 UCProcValueTables 三层页签
 *  行着色（原 GridView1_RowCellStyle）：生效=Information 蓝加粗，未生效=Critical 红
 *  偏差：原主窗体未设置 ucProcValueTables1/ucTqmyl021 的 Editable（控件默认 true，改动不回传、原亦如此），
 *        web 侧查看态按 Editable=false 渲染（只读），编辑在 FrmYl01Edit 弹窗内完成
 *  待接入：指标属性配置(FrmYl07) / 指标报警配置(FrmYl06) 两弹窗（本轮按约定留占位）；
 *          另原 btnPreview 预览打印在 Designer 中无对应按钮、simpleButton1(二冷水) 亦未接线，不迁 */
import { computed, ref, shallowRef } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconCheck, IconCopy, IconPencil, IconPlus, IconSearch, IconSettings, IconX } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tqmylApi, ValidFlag, type Tqmyl01 } from "@/api/mes4ddh/sqm.swagger";
import { Ylgy } from "./ylgy";
import StdSignsPanel from "./StdSignsPanel.vue";
import ProcValueTables from "./ProcValueTables.vue";
import Yl01EditDialog from "./Yl01EditDialog.vue";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/** 原 cboxValidFlag = AddEnum<ValidFlag>() + AllowNullInput（可空 = 全部） */
const validOptions = [
  { label: "全部", value: null as number | null },
  { label: "未生效", value: ValidFlag.Invalid },
  { label: "已生效", value: ValidFlag.Valid },
];
const input = { cCode: "", cName: "", sgSign: "", sgStd: "", nValidFlag: null as number | null };

const querying = ref(false);
const saving = ref(false);
const rows = ref<Tqmyl01[]>([]);
const gridApi = ref<GridApi | null>(null);
/** 当前焦点行的聚合模型（原 UcYl011_FocusedRowObjectChanged → QueryById → Ylgy.FromEntityes） */
const viewModel = shallowRef<Ylgy | null>(null);

const validFmt = (p: ValueFormatterParams) =>
  p.value == null ? "" : Number(p.value) === ValidFlag.Valid ? "已生效" : "未生效";

/* 主表：UCYl01 gridView1 → Tqmyl01，VisibleIndex 0~9 + 隐藏 5 列 */
const masterColDefs: ColDef[] = [
  { field: "cCode", headerName: "编码", width: 130 },
  { field: "cName", headerName: "名称", width: 200 },
  { field: "sgSignDesc", headerName: "钢种标准", width: 140 },
  { field: "cPlanRouteDesc", headerName: "工艺路径描述", width: 220 },
  { field: "nValidFlag", headerName: "生效标记", width: 90, valueFormatter: validFmt },
  { field: "cLineCode", headerName: "产线", width: 80 },
  { field: "creator", headerName: "创建人", width: 90 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "lastModifier", headerName: "最后更新人", width: 100 },
  { field: "lastModifyTime", headerName: "最后更新时间", width: 150 },
  { field: "id", headerName: "主键", width: 150, hide: true },
  { field: "cPlanRouteCode", headerName: "工艺路径代码", width: 140, hide: true },
  { field: "cStNo", headerName: "炼钢工艺卡", width: 110, hide: true },
  { field: "cPreRemark", headerName: "产前准备", width: 150, hide: true },
  { field: "selected", headerName: "选择", width: 70, hide: true },
];

function getRowId(p: GetRowIdParams) {
  return String((p.data as Tqmyl01).id ?? "");
}
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function currentRow(): Tqmyl01 | null {
  return (gridApi.value?.getSelectedRows()[0] as Tqmyl01 | undefined) ?? null;
}

/** 原 btnQuery_Click：QueryYl01（原成功后 BestFitColumns） */
async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await tqmylApi.queryYl01({
        code: input.cCode.trim() || null,
        name: input.cName.trim() || null,
        sgSign: input.sgSign.trim() || null,
        sgStd: input.sgStd.trim() || null,
        validFlag: (input.nValidFlag ?? undefined) as ValidFlag | undefined,
      })) ?? [];
    if (rows.value.length) {
      gridApi.value?.getRowNode(String(rows.value[0].id ?? ""))?.setSelected(true);
    } else {
      viewModel.value = null;
    }
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 UcYl011_FocusedRowObjectChanged：QueryById → Ylgy.FromEntityes → 下栏/右栏 BindData */
async function loadDetail(row?: Tqmyl01 | null) {
  if (!row?.id) {
    viewModel.value = null;
    return;
  }
  try {
    const entities = await tqmylApi.queryById(row.id);
    viewModel.value = await Ylgy.fromEntities(entities ?? {});
  } catch {
    /* 拦截层已 toast */
    viewModel.value = null;
  }
}
async function onSelectionChanged() {
  await loadDetail(currentRow());
}

/* ---------- 编辑弹窗（原 Edit()：FrmYl01Edit + OkClickAsync → Save） ---------- */
const editOpen = ref(false);

async function openEdit(model: Ylgy) {
  viewModel.value = model;
  editOpen.value = true;
}

/** 原 btnAdd_Click：new Ylgy() → Edit(model) */
function onAdd() {
  void openEdit(new Ylgy());
}

/** 原 btnEdit_Click / btnCopy_Click：焦点行 → QueryById → FromEntityes（复制再走 model.Copy()） */
async function onEdit(copy: boolean) {
  const row = currentRow();
  if (!row?.id) return;
  try {
    const entities = await tqmylApi.queryById(row.id);
    let model = await Ylgy.fromEntities(entities ?? {});
    if (copy) model = await model.copy();
    await openEdit(model);
  } catch {
    /* 拦截层已 toast */
  }
}

/** 原 OkClickAsync：Proxy.Save(model.ToEntities()) → 「保存成功！」 → 回查 */
async function onDialogOk() {
  const model = viewModel.value;
  if (!model) return;
  saving.value = true;
  try {
    await tqmylApi.save(model.toEntities());
    toast("保存成功！", 2500, "success");
    editOpen.value = false;
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

/* ---------- 生效 / 禁用（原 btnValid_Click / btnInvalid_Click） ---------- */
const confirmOpen = ref(false);
const confirmMsg = ref("");
let confirmAction: (() => void) | null = null;
function askConfirm(msg: string, action: () => void) {
  confirmMsg.value = msg;
  confirmAction = action;
  confirmOpen.value = true;
}
function onConfirmOk() {
  confirmOpen.value = false;
  const act = confirmAction;
  confirmAction = null;
  act?.();
}

function setValid(target: ValidFlag) {
  const row = currentRow();
  if (!row?.id) return;
  const label = target === ValidFlag.Valid ? "生效" : "作废";
  if (row.nValidFlag === target) return;
  askConfirm(`确定${label}[${row.cCode}]？`, async () => {
    saving.value = true;
    try {
      await tqmylApi.updateValidFlag(row.id ?? undefined, target);
      toast(`${label}成功`, 2500, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    } finally {
      saving.value = false;
    }
  });
}
function onEnable() {
  setValid(ValidFlag.Valid);
}
function onDisable() {
  setValid(ValidFlag.Invalid);
}

/* ---------- 两个配置弹窗（FrmYl07 / FrmYl06）：本轮留占位 ---------- */
function onItemConfig() {
  toast("画面迁移：指标属性配置（FrmYl07）逻辑待接入", 3000, "warn");
}
function onAlarmConfig() {
  toast("画面迁移：指标报警配置（FrmYl06）逻辑待接入", 3000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 确认（对应原 MsgBox.ShowYesNo("确定生效/作废[{code}]？")） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs whitespace-pre-wrap">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" :loading="saving" @click="onConfirmOk" />
      </template>
    </Dialog>

    <!-- 查询条件：dataLayoutControl1 单行 5 项（Location 行主序：编号/名称/钢种/标准/生效状态） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">编号</label>
        <InputText v-model="input.cCode" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">名称</label>
        <InputText v-model="input.cName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
        <InputText v-model="input.sgSign" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">标准</label>
        <InputText v-model="input.sgStd" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">生效状态</label>
        <Select
          v-model="input.nValidFlag"
          :options="validOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="全部"
          class="min-w-0 flex-1"
        />
      </div>
    </div>

    <!-- 操作工具栏：stackPanel1 八按钮，顺序照原 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" :loading="saving" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit(false)">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit(true)"> <IconCopy class="h-3 w-3" />复制 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEnable"> <IconCheck class="h-3 w-3" />生效 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDisable">
        <IconX class="h-3 w-3" />禁用
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onItemConfig">
        <IconSettings class="h-3 w-3" />指标属性配置
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAlarmConfig">
        <IconSettings class="h-3 w-3" />指标报警配置
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">炼钢工艺要点（{{ rows.length }}）</span>
    </div>

    <!-- splitContainerControl1：上下（原 281 + FrmYl01_Shown 覆盖为 Height/2 → 50%） -->
    <Splitter class="min-h-0 flex-1" layout="vertical">
      <!-- splitContainerControl2：左右（原 813 + Shown 覆盖为 Width-Width/4 → 75%） -->
      <SplitterPanel :size="50" :minSize="20" class="flex min-h-0 flex-col overflow-hidden">
        <Splitter class="min-h-0 flex-1" layout="horizontal">
          <!-- 左：UCYl01 主表 -->
          <SplitterPanel :size="75" :minSize="30" class="flex flex-col overflow-hidden">
            <div class="min-h-0 flex-1 overflow-hidden">
              <AgGridVue
                class="hmx-ag-grid h-full w-full"
                :theme="theme"
                :locale-text="AG_GRID_LOCALE_CN"
                :default-col-def="hmxDefaultColDef"
                :column-defs="masterColDefs"
                :row-data="rows"
                :get-row-id="getRowId"
                :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
                :suppress-column-virtualisation="true"
                :pagination="false"
                :animate-rows="false"
                :loading="querying || saving"
                @grid-ready="onGridReady"
                @selection-changed="onSelectionChanged"
                @first-data-rendered="autoSizeOnFirstData"
              />
            </div>
          </SplitterPanel>

          <!-- 右：UCTqmyl02 钢种标准（查看态 Editable=false，见来源注释偏差） -->
          <SplitterPanel :minSize="15" class="flex flex-col overflow-hidden">
            <div class="min-h-0 flex-1 overflow-hidden">
              <StdSignsPanel :tqmyl01="viewModel?.data ?? null" :rows="viewModel?.stdSigns ?? []" :editable="false" />
            </div>
          </SplitterPanel>
        </Splitter>
      </SplitterPanel>

      <!-- 下栏：UCProcValueTables 三层页签（查看态 Editable=false） -->
      <SplitterPanel :minSize="25" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <ProcValueTables :model="viewModel" :editable="false" />
        </div>
      </SplitterPanel>
    </Splitter>

    <Yl01EditDialog v-model:visible="editOpen" :model="viewModel" @ok="onDialogOk" />
  </div>
</template>
