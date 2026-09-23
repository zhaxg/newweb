<script setup lang="ts">
/** 对应 FrmTqmtp01（产品规范维护）：DDH.Winforms.SQM.Forms.Tqmtp.FrmTqmtp01
 *  已接入：tqmtp01Api.query / queryForEdit / delete / deleteMsc / setValidFlag；
 *          添加·编辑 → Tqmtp01EditDialog（tqmtp01Api.save）；添加冶金规范 → Tqmtp01AddMscDialog（tqmtp01Api.addMsc）
 *  待接入：stackPanel3「取消/选择」为选择器(Modal)模式按钮，原 !Modal 时隐藏，菜单页不迁
 *  原样保留：删除冶金规范后原程序不重新查询；生效/禁用弹完重复提示后无 return、仍继续询问（含禁用条件==Valid 的原文） */
import { onMounted, ref, shallowRef, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconBan, IconCheck, IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { tqmtp01Api, type Tqmtp01, type Tqmtp03, type Tqmtp01Dto, type Tqmtp01QueryInput, ValidFlag } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { useToast } from "@/composables/useToast";
import Tqmtp01EditDialog from "./Tqmtp01EditDialog.vue";
import Tqmtp01AddMscDialog from "./Tqmtp01AddMscDialog.vue";

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ---------- 查询条件（原 dataLayoutControl1 六项 → tqmtp01QueryInputBindingSource） ---------- */
const input = ref<Tqmtp01QueryInput>({});
const kvProdClass = ref<{ label: string; value: string }[]>([]);
const kvFactory = ref<{ label: string; value: string }[]>([]);
const kvDelivy = ref<{ label: string; value: string }[]>([]);
type KvOpt = { label: string; value: string };
async function loadKv(target: Ref<KvOpt[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}
onMounted(() => {
  loadKv(kvProdClass, "A0100:PROC_CODE");
  loadKv(kvFactory, "A0100:FAC_CODE");
  loadKv(kvDelivy, "A0100:DELIVY_STATUS");
});

/* ---------- 主/子表（原 btnQuery 返回 List<Tqmtp01Dto>，焦点行切换 Tqmtp03s） ---------- */
const dtos = shallowRef<Tqmtp01Dto[]>([]);
const mainRows = ref<Tqmtp01[]>([]);
const subRows = ref<Tqmtp03[]>([]);
const querying = ref(false);
const mainApi = ref<GridApi | null>(null);
const subApi = ref<GridApi | null>(null);
const selectedId = ref<string | null>(null);

async function onQuery() {
  querying.value = true;
  try {
    dtos.value = (await tqmtp01Api.query(input.value)) ?? [];
    mainRows.value = dtos.value.map((d) => d.tqmtp01).filter((x): x is Tqmtp01 => !!x);
    subRows.value = [];
    selectedId.value = null;
    requestAnimationFrame(() => {
      mainApi.value?.autoSizeAllColumns();
      subApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}
function onMainSelectionChanged(_e: SelectionChangedEvent) {
  const row = mainApi.value?.getSelectedRows()[0] as Tqmtp01 | undefined;
  selectedId.value = row?.id ?? null;
  subRows.value = dtos.value.find((d) => d.tqmtp01?.id === row?.id)?.tqmtp03s ?? [];
}
function currentMain(): Tqmtp01 | null {
  return mainRows.value.find((r) => r.id === selectedId.value) ?? null;
}
function currentSub(): Tqmtp03 | null {
  return (subApi.value?.getSelectedRows()[0] as Tqmtp03 | undefined) ?? null;
}

/* ---------- ShowYesNo 受控确认 ---------- */
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

/* ---------- 主表按钮（原 stackPanel1） ---------- */
const editOpen = ref(false);
const editRow = ref<Tqmtp01 | null>(null);
const addMscOpen = ref(false);

function onAdd() {
  editRow.value = null;
  editOpen.value = true;
}
async function onEdit() {
  const row = currentMain();
  if (!row) return;
  try {
    editRow.value = (await tqmtp01Api.queryForEdit(row.id)) ?? null;
    if (editRow.value) editOpen.value = true;
  } catch {
    /* 拦截层已 toast */
  }
}
function onDelete() {
  const row = currentMain();
  if (!row) return;
  askConfirm(`确定要删除产品规范${row.cPsc}？`, async () => {
    try {
      await tqmtp01Api.delete(row.id);
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}
function onValid() {
  const row = currentMain();
  if (!row) return;
  // 原程序：提示已生效后无 return，仍继续询问
  if (row.cValidFlag === ValidFlag.Valid) toast("产品规范已是生效状态，无需重复操作！", 2500, "error");
  askConfirm(`是否要生效[${row.cPsc}]`, async () => {
    try {
      await tqmtp01Api.setValidFlag(row.id, ValidFlag.Valid);
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}
function onInvalid() {
  const row = currentMain();
  if (!row) return;
  // 原程序条件即为 ==Valid（与文案不对应），照原文迁
  if (row.cValidFlag === ValidFlag.Valid) toast("产品规范已是未生效状态，无需重复操作！", 2500, "error");
  askConfirm(`是否要禁用[${row.cPsc}]`, async () => {
    try {
      await tqmtp01Api.setValidFlag(row.id, ValidFlag.Invalid);
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* ---------- 子表按钮（原 stackPanel2） ---------- */
const mscPscRow = ref<Tqmtp01 | null>(null);
function onAddMsc() {
  const row = currentMain();
  if (!row) return;
  mscPscRow.value = row;
  addMscOpen.value = true;
}
function onDeleteMsc() {
  const row = currentSub();
  if (!row) return;
  askConfirm(`确定要删除冶金规范对照${row.cPsc}-${row.cMsc}？`, async () => {
    try {
      await tqmtp01Api.deleteMsc(row.id);
      // 原程序此处不重新查询，照原样
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* ---------- colDefs（列序=VisibleIndex，中文列头=绑定实体 LDisplay） ---------- */
const mainColDefs: ColDef[] = [
  { field: "cPsc", headerName: "产品规范码", width: 125 },
  { field: "cProdCode", headerName: "品名", width: 86 },
  { field: "cProdCName", headerName: "产品名称（品名中文）", width: 190 },
  { field: "cStdSgCode", headerName: "标准牌号代码", width: 138 },
  { field: "cSgStd", headerName: "执行标准", width: 112 },
  { field: "cSgSign", headerName: "牌号", width: 86 },
  { field: "cLevel", headerName: "产品等级", width: 112 },
  { field: "cProcessPurposeCode", headerName: "加工用途代码", width: 138 },
  { field: "cProcessPurposeDesc", headerName: "加工用途叙述", width: 138 },
  { field: "cHeatAndTypeCode", headerName: "热处理状态和类型", width: 164 },
  { field: "cHeatAndTypeDesc", headerName: "热处理状态和类型叙述", width: 190 },
  { field: "cSurfaceStatus", headerName: "表面状态", width: 112 },
  { field: "cSurfaceStatusDesc", headerName: "表面状态叙述", width: 138 },
  { field: "cTolPrecGroup", headerName: "截面公差精度组别", width: 164 },
  { field: "cTolPrecGroupDesc", headerName: "截面公差精度组别叙述", width: 190 },
  { field: "cBendGroup", headerName: "弯曲度", width: 99 },
  { field: "cBendGroupDesc", headerName: "弯曲度叙述", width: 125 },
  { field: "cValidFlag", headerName: "生效标记", width: 112 },
  { field: "cCheckMaker", headerName: "检验责任者", width: 125 },
  { field: "dCheckTime", headerName: "审核时间", width: 112 },
  { field: "cProdAuth", headerName: "产品认证", width: 112 },
  { field: "cCertiTypeCode", headerName: "质保书类型代码", width: 151 },
  { field: "nCertiNum", headerName: "质保书份数", width: 125 },
  { field: "cNewProductCode", headerName: "新试产品代码1", width: 151 },
  { field: "dChangeProductDate", headerName: "转产日期1", width: 125 },
  { field: "cPscDesc", headerName: "产品规范说明", width: 138 },
  { field: "cRemark", headerName: "备注", width: 86 },
  { field: "cDelivyStatusCode", headerName: "交货状态", width: 112 },
  { field: "cDeliveryStateDesc", headerName: "交货状态描述", width: 138 },
  { field: "cProdClass", headerName: "产品大类及形状", width: 151 },
  { field: "cProdClassText", headerName: "产品大类及形状描述", width: 177 },
  { field: "nVersion", headerName: "版次", width: 86 },
  { field: "cArchiveFlag", headerName: "归档标记", width: 112 },
  { field: "cFactoryId", headerName: "制造厂别", width: 112 },
  { field: "cRemarkDesc", headerName: "合同备注", width: 112 },
  { field: "creator", headerName: "创建人", width: 99 },
  { field: "createTime", headerName: "创建时间", width: 112 },
  { field: "lastModifier", headerName: "最后修改人", width: 125 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138 },
  { field: "id", headerName: "主键", width: 86, hide: true },
  { field: "selected", headerName: "选择", width: 86, hide: true },
];
const subColDefs: ColDef[] = [
  { field: "cPsc", headerName: "产品规范码", width: 125 },
  { field: "cMsc", headerName: "冶金规范码", width: 125 },
  { field: "cPscDesc", headerName: "产品规范说明", width: 138 },
  { field: "cFinalUse1", headerName: "最终用途1", width: 125 },
  { field: "cFinCustCode", headerName: "最终用户代码", width: 138 },
  { field: "cApnDesc", headerName: "产品最终用途说明", width: 164 },
  { field: "cFinUserName", headerName: "最终用户名称", width: 138 },
  { field: "cRemark", headerName: "备注", width: 86 },
  { field: "cClientEvaluateCode", headerName: "客户评审号", width: 125 },
  { field: "cProcUseDesc", headerName: "加工用途描述", width: 138 },
  { field: "cSpecialUsagec", headerName: "特殊用途叙述", width: 138 },
  { field: "dTcTranOkTime", headerName: "电文处理成功时间", width: 164 },
  { field: "cValidFlag", headerName: "生效标记", width: 112 },
  { field: "cCheckMaker", headerName: "检验责任者", width: 125 },
  { field: "dCheckTime", headerName: "审核时间", width: 112 },
  { field: "nVersion", headerName: "版次", width: 86 },
  { field: "cArchiveFlag", headerName: "归档标记", width: 112 },
  { field: "cFactoryId", headerName: "制造厂别", width: 112 },
  { field: "cRemarkDesc", headerName: "合同备注", width: 112 },
  { field: "creator", headerName: "创建人", width: 99 },
  { field: "createTime", headerName: "创建时间", width: 112 },
  { field: "lastModifier", headerName: "最后修改人", width: 125 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 138 },
  { field: "id", headerName: "主键", width: 86, hide: true },
  { field: "selected", headerName: "选择", width: 86, hide: true },
];
function onMainReady(e: GridReadyEvent) { mainApi.value = e.api; }
function onSubReady(e: GridReadyEvent) { subApi.value = e.api; }
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl1：6 个 LayoutControlItem → grid-cols-6） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产品规范码</label>
          <InputText v-model="input.cPsc" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">标准</label>
          <InputText v-model="input.cSgStd" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种牌号</label>
          <InputText v-model="input.cSgSign" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">产品大类</label>
          <Select v-model="input.cProdClass" :options="kvProdClass" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="产品大类" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">工厂</label>
          <Select v-model="input.factoryId" :options="kvFactory" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="工厂" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">交货状态</label>
          <Select v-model="input.cDelivyStatusCode" :options="kvDelivy" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="交货状态" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 主表工具栏（原 stackPanel1：查询/添加/编辑/删除/审核生效/禁用） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
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
      <span class="mx-1 h-4 w-px bg-border" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onValid">
        <IconCheck class="h-3 w-3" />审核生效
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onInvalid">
        <IconBan class="h-3 w-3" />禁用
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">产品规范维护（{{ mainRows.length }}）</span>
    </div>

    <!-- 上下主子表（原 splitContainerControl1 SplitterPosition=282 ≈ 50%） -->
    <Splitter layout="horizontal" class="min-h-0 flex-1 border-0">
      <SplitterPanel :size="50" class="flex min-h-0 min-w-0 flex-col">
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">产品规范</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="mainColDefs" :row-data="mainRows"
            :get-row-id="(p: any) => String(p.data.id)"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false" :loading="querying"
            @grid-ready="onMainReady" @first-data-rendered="autoSizeOnFirstData"
            @selection-changed="onMainSelectionChanged" />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="50" class="flex min-h-0 min-w-0 flex-col">
        <!-- 子表工具栏（原 stackPanel2：添加/删除，高与主表列头同为 h-8） -->
        <div class="flex h-8 shrink-0 items-center gap-1 border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">冶金规范对照</span>
          <span class="mx-1 h-4 w-px bg-border" />
          <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="onAddMsc">
            <IconPlus class="h-3 w-3" />添加
          </Button>
          <Button variant="outlined" class="h-6 shrink-0 whitespace-nowrap !px-2" @click="onDeleteMsc">
            <IconTrash class="h-3 w-3" />删除
          </Button>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef" :column-defs="subColDefs" :row-data="subRows"
            :get-row-id="(p: any) => String(p.data.id)"
            :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
            :pagination="false" :animate-rows="false"
            @grid-ready="onSubReady" @first-data-rendered="autoSizeOnFirstData" />
        </div>
      </SplitterPanel>
    </Splitter>

    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
    <Dialog :visible="confirmOpen" modal header="确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event">
      <p class="text-xs">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>

    <Tqmtp01EditDialog v-model:visible="editOpen" :row="editRow" @ok="onQuery" />
    <Tqmtp01AddMscDialog v-model:visible="addMscOpen" :psc-row="mscPscRow" @ok="onQuery" />
  </div>
</template>
