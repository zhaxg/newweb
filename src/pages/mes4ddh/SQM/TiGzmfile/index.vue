<script setup lang="ts">
/** 对应 FrmTiGzmfile（标准/工艺文件管理）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTiGzmfile
 *  已接入：tiGzmfileApi.getGzmfiles / zFGzmfiles / canleZFGzmfiles / delGzmfiles；修改走 TiGzmfileEditDialog → addEditGzmfiles
 *  布局：form Controls.Add(gridControl, stackPanel1, dataLayoutControl1) + Dock Top
 *        → 查询条件区(6 项) → 工具栏 10 按钮 h-9 → 表格
 *  查询条件（坐标回读，行主序）：文件种类|工艺规程号|文件名称 / 标准|使用单位|厂别区分
 *  列集：Designer VisibleIndex 0~17 + 隐藏 31，中文头取绑定实体 TiGzmfile 的 LDisplay
 *  逻辑：查询默认 ControlState=非保密 + 启用=Y；保密=ControlState:保密；作废=ControlState:0 + 启用=N；
 *        作废/取消作废/删除 均按 GetFocusedRowObject 取行 + 原中文提示逐字校验与确认
 *  偏差：原 colDutyMan/colCUptUser/colCScrapUser 走 UserFormatter（IAdminAppService.GetUsersAsync）转义用户名，
 *        按仓库既有做法（QL3000/QL3100/HR2200/Tql1050）web 显示原始代码
 *  待接入：「上传」依赖原 FtpHelper(10.11.5.63:8021) 硬编码 FTP，web 侧无对应后端 → 占位；
 *        「下载」同为 FTP 拉取 → 占位 */

import { reactive, ref, onMounted, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import {
  IconDownload,
  IconEye,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { GzmFileControlStateEnum, GzmFileVarietyEnum, tiGzmfileApi, type TiGzmfile } from "@/api/mes4ddh/sqm.swagger";
import { tPa1000Api, type Tpa1000 } from "@/api/mes4ddh/shr.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { useToast } from "@/composables/useToast";
import TiGzmfileEditDialog from "./TiGzmfileEditDialog.vue";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const rows = ref<TiGzmfile[]>([]);
const querying = ref(false);
const saving = ref(false);
const gridApi = ref<GridApi | null>(null);

type Opt = { label: string; value: string };
/** 原 VarietyTextEdit 无 Designer Items，由 AccessibleName(A0000:TIGZMFILE_FILE_TYPE) 运行时灌字典；
 *  同字段在 FrmTiGzmfileEdit 的 Designer 写死 Items=[工艺文件/结论文件]，取该组以免 mock 字典缺组导致空下拉 */
const varietyOpts: Opt[] = [
  { label: "工艺文件", value: String(GzmFileVarietyEnum.GYFile) },
  { label: "结论文件", value: String(GzmFileVarietyEnum.JLFile) },
];
const kvUseUnit = ref<Opt[]>([]);
const lineOpts = ref<Opt[]>([]);

async function loadKv(target: Ref<Opt[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}

/* 查询条件（原 dataLayoutControl1 六项，坐标回读行主序） */
const input = reactive({
  variety: null as string | null,
  regulateNo: "",
  regulateName: "",
  sgStd: "",
  useUnit: null as string | null,
  matKind: null as string | null,
});

const labelOf = (opts: Opt[], v?: string | null) => opts.find((o) => o.value === v)?.label ?? v ?? "";

/* 列：按 Designer VisibleIndex 0~17；其余 31 列未排入 → hide:true */
const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 70, minWidth: 70, hide: true },
  {
    field: "useUnit",
    headerName: "使用单位",
    width: 110,
    valueFormatter: (p: ValueFormatterParams) => labelOf(kvUseUnit.value, p.value as string),
  },
  {
    field: "matKind",
    headerName: "厂别区分",
    width: 110,
    valueFormatter: (p: ValueFormatterParams) => labelOf(lineOpts.value, p.value as string),
  },
  {
    field: "controlState",
    headerName: "受控状态",
    width: 90,
    valueFormatter: (p: ValueFormatterParams) =>
      String(p.value ?? "") === String(GzmFileControlStateEnum.C)
        ? "保密"
        : String(p.value ?? "") === String(GzmFileControlStateEnum.NC)
          ? "非保密"
          : "",
  },
  {
    field: "variety",
    headerName: "文件种类",
    width: 100,
    valueFormatter: (p: ValueFormatterParams) => labelOf(varietyOpts, p.value as string),
  },
  { field: "regulateNo", headerName: "工艺规程号", width: 130 },
  { field: "regulateName", headerName: "文件名称", width: 200 },
  { field: "sgStd", headerName: "标准", width: 140 },
  { field: "sgSign", headerName: "钢种牌号", width: 110 },
  { field: "versionNo", headerName: "版本号", width: 80 },
  { field: "cIsEnable", headerName: "是否启用", width: 90 },
  { field: "dutyMan", headerName: "负责人", width: 90 },
  { field: "publishDate", headerName: "发布日期", width: 110 },
  { field: "remark", headerName: "备注", width: 160 },
  { field: "cUptUser", headerName: "修改人", width: 90 },
  { field: "dUptDate", headerName: "修改时间", width: 150 },
  { field: "cScrapUser", headerName: "作废人", width: 90 },
  { field: "dScrapDate", headerName: "作废时间", width: 150 },
  { field: "id", headerName: "C_ID", width: 150, hide: true },
  { field: "creator", headerName: "创建人", width: 90, hide: true },
  { field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 100, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { field: "serialNo", headerName: "老mesID(上传到服务器后的文件名也用这个)", width: 220, hide: true },
  { field: "regulateContent", headerName: "工艺规程文件", width: 120, hide: true },
  { field: "rcn", headerName: "修订", width: 70, hide: true },
  { field: "rcnPage", headerName: "修订页", width: 90, hide: true },
  { field: "asumeUnit", headerName: "提出单位", width: 100, hide: true },
  { field: "draftUnit", headerName: "起草单位", width: 100, hide: true },
  { field: "draftMan", headerName: "起草人", width: 90, hide: true },
  { field: "checkMake", headerName: "审核者", width: 90, hide: true },
  { field: "approveMan", headerName: "批准人", width: 90, hide: true },
  { field: "operater", headerName: "操作者", width: 90, hide: true },
  { field: "useDate", headerName: "实施日期", width: 110, hide: true },
  { field: "operateDate", headerName: "操作日期", width: 150, hide: true },
  { field: "controlId", headerName: "受控编号", width: 100, hide: true },
  { field: "holder", headerName: "持有者", width: 90, hide: true },
  { field: "type", headerName: "文件类别", width: 90, hide: true },
  { field: "cSource", headerName: "老mes", width: 90, hide: true },
  { field: "matKindName", headerName: "厂区名称", width: 110, hide: true },
  { field: "regulateNameReplace", headerName: "替换后文件名", width: 150, hide: true },
  { field: "dCloseDate", headerName: "关闭日期", width: 110, hide: true },
  { field: "cSgStds", headerName: "制造标准", width: 130, hide: true },
  { field: "cPid", headerName: "计划文件主键", width: 150, hide: true },
  { field: "cGywjType", headerName: "工艺文件大类", width: 130, hide: true },
  { field: "cMachineCodes", headerName: "铸机代码", width: 110, hide: true },
  { field: "cMachineNames", headerName: "铸机名称", width: 130, hide: true },
  { field: "cSgCodes", headerName: "钢种代码", width: 130, hide: true },
  { field: "cSgStdCodes", headerName: "标准牌号代码", width: 140, hide: true },
];

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

function currentRow(): TiGzmfile | null {
  return (gridApi.value?.getSelectedRows()[0] as TiGzmfile | undefined) ?? null;
}

/** 原 ViewControl.AllowSyncRowStateToCheckboxSelection=true：
 *  Selected 列由 row-selection 复选框呈现（原列 hide:true 留在列面板），勾选态与 selected 字段双向一致 */
function syncSelectionFromField() {
  gridApi.value?.forEachNode((node) => node.setSelected(!!(node.data as TiGzmfile).selected));
}
function onSelectionChanged() {
  gridApi.value?.forEachNode((node) => {
    const d = node.data as TiGzmfile | undefined;
    if (d) d.selected = node.isSelected();
  });
}

/** 原 DataBind(stateEnum = NC, isEnable = "Y")，三个查询按钮各自传不同参数
 *  作废查询原传 default(GzmFileControlStateEnum)=0（非枚举成员），故入参放 number、调用处断言 */
async function dataBind(controlState: number, cIsEnable: string) {
  querying.value = true;
  try {
    rows.value =
      (await tiGzmfileApi.getGzmfiles({
        variety: input.variety,
        regulateNo: input.regulateNo.trim() || null,
        regulateName: input.regulateName.trim() || null,
        sgStd: input.sgStd.trim() || null,
        useUnit: input.useUnit,
        matKind: input.matKind,
        controlState: controlState as GzmFileControlStateEnum,
        cIsEnable,
      })) ?? [];
    requestAnimationFrame(() => {
      syncSelectionFromField();
      gridApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 原 btnQuery_Click → DataBind()：非保密 + 启用 */
function onQuery() {
  void dataBind(GzmFileControlStateEnum.NC, "Y");
}
/** 原 btnQueryBM_Click → DataBind(C)：保密 + 启用 */
function onQueryBM() {
  void dataBind(GzmFileControlStateEnum.C, "Y");
}
/** 原 btnQueryZF_Click → DataBind(default, "N")：作废件（原传 default(GzmFileControlStateEnum)=0） */
function onQueryZF() {
  void dataBind(0, "N");
}

/** 原 btnLook_Click：HmxWebViewForm("http://10.11.5.63:8080/" + RegulateNameReplace) */
function onLook() {
  const cur = currentRow();
  if (!cur) {
    toast("请选择一条数据后重试！", 2500, "warn");
    return;
  }
  window.open(`http://10.11.5.63:8080/${cur.regulateNameReplace ?? ""}`, "_blank");
}

/** 原 btnZf_Click */
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

function onZf() {
  const cur = currentRow();
  if (!cur) {
    toast("请选择一条数据后重试！", 2500, "warn");
    return;
  }
  if (cur.cIsEnable !== "Y") {
    toast("已作废文件禁止再次作废！！！", 3000, "warn");
    return;
  }
  askConfirm(`是否确定作废文件：${cur.regulateName}`, async () => {
    saving.value = true;
    try {
      await tiGzmfileApi.zFGzmfiles(cur.id ?? undefined);
      await dataBind(GzmFileControlStateEnum.NC, "Y");
    } catch {
      /* 拦截层已 toast */
    } finally {
      saving.value = false;
    }
  });
}

function onCancelZf() {
  const cur = currentRow();
  if (!cur) {
    toast("请选择一条数据后重试！", 2500, "warn");
    return;
  }
  if (cur.cIsEnable !== "N") {
    toast("未作废文件禁止取消作废！！！", 3000, "warn");
    return;
  }
  askConfirm(`是否确定取消作废文件：${cur.regulateName}`, async () => {
    saving.value = true;
    try {
      await tiGzmfileApi.canleZFGzmfiles(cur.id ?? undefined);
      await dataBind(GzmFileControlStateEnum.NC, "Y");
    } catch {
      /* 拦截层已 toast */
    } finally {
      saving.value = false;
    }
  });
}

function onDelete() {
  const cur = currentRow();
  if (!cur) {
    toast("请选中需要删除的行", 2500, "warn");
    return;
  }
  askConfirm(`是否确认删除文件：${cur.regulateName}`, async () => {
    saving.value = true;
    try {
      await tiGzmfileApi.delGzmfiles(cur.id ?? undefined);
      toast(`文件：${cur.regulateName}删除成功！`, 2500, "success");
      await dataBind(GzmFileControlStateEnum.NC, "Y");
    } catch {
      /* 拦截层已 toast */
    } finally {
      saving.value = false;
    }
  });
}

/* ---------- 修改（原 btnEdit_Click → FrmTiGzmfileEdit.ShowDialog，_flag=false → AddEditGzmfiles） ---------- */
const editOpen = ref(false);
const editRow = ref<TiGzmfile | null>(null);
function onEdit() {
  const cur = currentRow();
  if (!cur) {
    toast("请选择一条数据进行操作！", 2500, "warn");
    return;
  }
  editRow.value = { ...cur };
  editOpen.value = true;
}
async function onDialogOk(row: TiGzmfile) {
  saving.value = true;
  try {
    await tiGzmfileApi.addEditGzmfiles(row);
    editOpen.value = false;
    await dataBind(GzmFileControlStateEnum.NC, "Y");
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

/** 原 btnAdd_Click（FrmTiGzmfileEdit._flag=true）：保存链路依赖 FtpHelper 上传到 10.11.5.63，web 无对应后端 */
function onAdd() {
  toast("上传依赖原 FtpHelper(10.11.5.63) 硬编码 FTP，web 侧未提供对应后端，待接入", 4000, "warn");
}
/** 原 btnDownLoad_Click：xtraFolderBrowserDialog + FtpHelper.DownloadFile，同上 → 占位 */
function onDownload() {
  const picked = rows.value.filter((r) => r.selected);
  if (!picked.length) {
    toast("请勾选需要下载的项", 2500, "warn");
    return;
  }
  toast("下载依赖原 FtpHelper(10.11.5.63) 硬编码 FTP，web 侧未提供对应后端，待接入", 4000, "warn");
}

onMounted(() => {
  void Promise.all([
    loadKv(kvUseUnit, "A0000:TIGZMFILE_DEPT"),
    (async () => {
      try {
        const lines = (await tPa1000Api.queryLines()) ?? [];
        lineOpts.value = (lines as Tpa1000[])
          .filter((x) => x.cCode)
          .map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
      } catch {
        /* 拦截层已 toast */
      }
    })(),
  ]);
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 确认（对应原 MsgBox.ShowYesNo） -->
    <Dialog
      :visible="confirmOpen"
      modal
      header="确认"
      :style="{ width: 'min(30rem, calc(100vw - 2rem))' }"
      @update:visible="confirmOpen = $event"
    >
      <p class="text-xs whitespace-pre-wrap">{{ confirmMsg }}</p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmOpen = false" />
        <Button label="确定" variant="outlined" :loading="saving" @click="onConfirmOk" />
      </template>
    </Dialog>

    <!-- 查询条件（原 dataLayoutControl1，Dock Top，6 项行主序） -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">文件种类</label>
          <Select
            v-model="input.variety"
            :options="varietyOpts"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">工艺规程号</label>
          <InputText v-model="input.regulateNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">文件名称</label>
          <InputText v-model="input.regulateName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">标准</label>
          <InputText v-model="input.sgStd" class="min-w-0 flex-1" @keydown.enter="onQuery" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">使用单位</label>
          <Select
            v-model="input.useUnit"
            :options="kvUseUnit"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">厂别区分</label>
          <Select
            v-model="input.matKind"
            :options="lineOpts"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="全部"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1，Dock Top，10 按钮按 Controls.Add 原序） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onLook"> <IconEye class="h-3 w-3" />预览 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onQueryBM">
        <IconSearch class="h-3 w-3" />保密文件查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onQueryZF">
        <IconSearch class="h-3 w-3" />作废文件查询
      </Button>
      <span class="mx-1 h-4 w-px bg-border" />
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd"> <IconUpload class="h-3 w-3" />上传 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit"> <IconPencil class="h-3 w-3" />修改 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onZf">
        <IconX class="h-3 w-3" />作废
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onCancelZf">
        <IconRefresh class="h-3 w-3" />取消作废
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onDownload">
        <IconDownload class="h-3 w-3" />下载
      </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">标准/工艺文件（{{ rows.length }}）</span>
    </div>

    <!-- 数据表格（原 gridControl1 / gridView1，TiGzmfile） -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{
          mode: 'multiRow',
          checkboxes: true,
          headerCheckbox: true,
          enableClickSelection: true,
          enableSelectionWithoutKeys: true,
        }"
        :suppress-column-virtualisation="true"
        :pagination="false"
        :animate-rows="false"
        :loading="querying || saving"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <TiGzmfileEditDialog v-model:visible="editOpen" :row="editRow" @ok="onDialogOk" />
  </div>
</template>
