<script setup lang="ts">
/** 对应 FrmTmp1210（米单重管理）：DDH.Winforms.SQM.Forms.Tmptq.FrmTmp1210
 *  已接入：tmp1210Api.getTmp1210List / addTmp1210 / updateTmp1210 / removeTmp1210
 *  二级弹窗 FrmTmp1210Edit（新增/编辑米单重记录，钢类/钢种/宽度/厚度/订单重量/备注）
 *    按简单表单内联迁移（原 ShowDialog + btnSave_Click / btnCancel_Click），校验文案逐字照抄
 *  查询条件：原 stackPanel1 内 钢类 txtSteelType、钢种 txtSteelGrade（2 条件与按钮同行） */

import { onMounted, ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import { IconPencil, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { tmp1210Api, type Tmp1210 } from "@/api/mes4ddh/sqm.swagger";
import { NextStrId } from "@/lib/yitIdHelper";

const { toast } = useToast();
const theme = makeHmxGridTheme();

// 查询条件（原 txtSteelType / txtSteelGrade）
const query = ref({ steelType: "", steelGrade: "" });
const rows = ref<Tmp1210[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const selectedRow = ref<Tmp1210 | null>(null);

// 列按 Designer VisibleIndex；隐藏列以 hide: true 迁入（右键列面板可唤出）
const colDefs = ref<ColDef[]>([
  { field: "cSteelType", headerName: "钢种大类", width: 112 },
  { field: "cSgCode", headerName: "钢种", width: 112 },
  { field: "nThick", headerName: "坯厚", width: 112 },
  { field: "nWidth", headerName: "坯宽", width: 112 },
  { field: "nWgt", headerName: "坯重", width: 112 },
  { field: "cRemark", headerName: "反馈结果", width: 112 },
  { field: "creator", headerName: "创建人", width: 112 },
  { field: "createTime", headerName: "创建时间", width: 112 },
  { field: "lastModifier", headerName: "最后修改人", width: 112 },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 112 },
  { field: "cId", headerName: "ID", width: 112, hide: true },
  { field: "id", headerName: "主键", width: 112, hide: true },
  { field: "selected", headerName: "选择", width: 112, hide: true },
]);

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onSelectionChanged(e: SelectionChangedEvent) {
  selectedRow.value = (e.api.getSelectedRows()[0] as Tmp1210 | undefined) ?? null;
}

async function onQuery() {
  querying.value = true;
  try {
    rows.value =
      (await tmp1210Api.getTmp1210List(
        query.value.steelType.trim() || undefined,
        query.value.steelGrade.trim() || undefined,
      )) ?? [];
    selectedRow.value = null;
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
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

/* ---------- 主表按钮（原 stackPanel1：查询/添加/编辑/删除） ---------- */
function onDelete() {
  const row = selectedRow.value;
  if (!row) {
    toast("请先选择要删除的记录", 2000, "warn");
    return;
  }
  askConfirm(`确定删除【${row.cSteelType} - ${row.cSgCode}】这条记录吗？`, async () => {
    try {
      await tmp1210Api.removeTmp1210(row);
      toast(`[${row.cSgCode}] 删除成功`, 2000, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}

/* ---------- FrmTmp1210Edit（原 ShowDialog：新增/编辑米单重记录） ---------- */
const editOpen = ref(false);
const editRow = ref<Tmp1210 | null>(null);
const editForm = ref({
  cSteelType: "",
  cSgCode: "",
  nWidth: null as number | null,
  nThick: null as number | null,
  nWgt: null as number | null,
  cRemark: "",
});

function onAdd() {
  editRow.value = null;
  editForm.value = { cSteelType: "", cSgCode: "", nWidth: null, nThick: null, nWgt: null, cRemark: "" };
  editOpen.value = true;
}
function onEdit() {
  const row = selectedRow.value;
  if (!row) {
    toast("请先选择需要编辑的信息！", 2000, "warn");
    return;
  }
  editRow.value = row;
  editForm.value = {
    cSteelType: row.cSteelType ?? "",
    cSgCode: row.cSgCode ?? "",
    nWidth: row.nWidth ?? null,
    nThick: row.nThick ?? null,
    nWgt: row.nWgt ?? null,
    cRemark: row.cRemark ?? "",
  };
  editOpen.value = true;
}

async function onSaveEdit() {
  const f = editForm.value;
  if (!f.cSteelType.trim()) {
    toast("钢类不可为空", 2000, "warn");
    return;
  }
  if (!f.cSgCode.trim()) {
    toast("钢种不可为空", 2000, "warn");
    return;
  }
  if (f.nWidth == null || !(f.nWidth > 0)) {
    toast("宽度必须填写大于0的有效数值", 2000, "warn");
    return;
  }
  if (f.nThick == null || !(f.nThick > 0)) {
    toast("厚度必须填写大于0的有效数值", 2000, "warn");
    return;
  }
  if (f.nWgt == null || !(f.nWgt > 0)) {
    toast("重量必须填写大于0的有效数值", 2000, "warn");
    return;
  }
  try {
    const model: Tmp1210 = {
      id: editRow.value?.id ?? undefined,
      cSteelType: f.cSteelType.trim(),
      cSgCode: f.cSgCode.trim(),
      nWidth: f.nWidth,
      nThick: f.nThick,
      nWgt: f.nWgt,
      cRemark: f.cRemark.trim(),
    };
    if (editRow.value) {
      await tmp1210Api.updateTmp1210(model);
      editOpen.value = false;
      toast("信息更新成功！", 2000, "success");
    } else {
      model.id = NextStrId();
      await tmp1210Api.addTmp1210(model);
      editOpen.value = false;
      toast("添加成功", 2000, "success");
    }
    await onQuery();
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 工具栏（原 stackPanel1：钢类/钢种 2 条件 + 查询/添加/编辑/删除 同行） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <InputText v-model="query.steelType" placeholder="钢类" class="w-36 shrink-0" @keydown.enter="onQuery" />
      <InputText v-model="query.steelGrade" placeholder="钢种" class="w-36 shrink-0" @keydown.enter="onQuery" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onEdit">
        <IconPencil class="h-3 w-3" />编辑
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
    </div>

    <!-- 主表（gridControl1 / gridView1，绑定实体 Tmp1210） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :pagination="false"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :loading="querying"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
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
        <Button label="确定" variant="outlined" @click="onConfirmOk" />
      </template>
    </Dialog>

    <!-- FrmTmp1210Edit（原 ShowDialog，标题随新增/编辑切换） -->
    <Dialog
      :visible="editOpen"
      modal
      :header="editRow ? '编辑米单重记录' : '新增米单重记录'"
      :style="{ width: 'min(34rem, calc(100vw - 2rem))' }"
      @update:visible="editOpen = $event"
    >
      <div class="grid grid-cols-2 gap-x-3 gap-y-2">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢类</label>
          <InputText v-model="editForm.cSteelType" maxlength="100" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种</label>
          <InputText v-model="editForm.cSgCode" maxlength="100" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">宽度</label>
          <InputNumber v-model="editForm.nWidth" :min="0" fluid class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">厚度</label>
          <InputNumber v-model="editForm.nThick" :min="0" fluid class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单重量</label>
          <InputNumber v-model="editForm.nWgt" :min="0" fluid class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">备注</label>
          <InputText v-model="editForm.cRemark" class="min-w-0 flex-1" />
        </div>
      </div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="editOpen = false" />
        <Button label="保存" variant="outlined" @click="onSaveEdit" />
      </template>
    </Dialog>
  </div>
</template>
