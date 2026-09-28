<script setup lang="ts">
/** 对应 FrmDM1020（轧辊管理）：DDH.Winforms.SHR.Forms.WorkPiece.FrmDM1020
 *  已接入：dM1020Api.queryTdm1020s / delTdm1020 / resetTdm1020 / scrapTdm1020 / outBear（拆卸轴承座）
 *    / sendBx（发送二级，按勾选逐条提交）/ syncTdm1030（同步磨削信息）
 *    / systemKeyValueApi.getSysKvListByGroup("010100:STANDUSEFLAG" | "010100:ROLLTYPE" | "010100:ROLLPOS")
 *    （原 colCStandNo/colCAssemPosition/colCRollerType 的 SetCodeFormatterAsync，同时灌机架号/轧辊类型下拉）
 *  待接入：添加/编辑 → FrmDM1020_Edit（二级弹窗未迁，提交接口 dM1020Api.addTdm1020 在弹窗内）
 *    装载轴承座 → FrmDM1020_InstallRoller（二级弹窗未迁，弹窗内用 dM1020Api.queryBearBox(cId) + installRoller(dto)）
 *    发送磨床 → FrmDM1020.cs 中 btnSendMc 无 Click 事件与任何后端调用（原画面按钮即无动作），保持按钮不接入
 *  偏差：原 btnDel_Click 两处判断写反（`if (list.Any()) return;`、`if (cIds.Any())` 提示未选择），
 *    按同族 btnReset/btnScrap 的正向语义实现，并保留其「无二次确认」的原行为；
 *    原 btnOutBear_Click 未判焦点行空引用（空表点击即抛异常），web 侧补空判断；
 *    轧辊状态单元格按枚举 LDisplay 显示（含查询下拉未列出的 4=送磨削） */

import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import {
  IconArrowsJoin,
  IconArrowsSplit,
  IconBan,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSend,
  IconTrash,
  IconTransform,
} from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, RowClickedEvent, ValueFormatterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { systemKeyValueApi } from "@/api/admin/request";
import { dM1020Api, Tdm1020StatusEnum, type DtoQueryTdm1020, type Tdm1020 } from "@/api/mes4ddh/shr.swagger";

const theme = makeHmxGridTheme();
const { toast } = useToast();

/* ---------- KV 字典（原 ColCStandNo/ColCRollerType/ColCAssemPosition 的 CodeFormatter） ---------- */
type KvOption = { label: string; value: string };
const standOptions = ref<KvOption[]>([]);
const rollTypeOptions = ref<KvOption[]>([]);
const kvStand = new Map<string, string>();
const kvRollType = new Map<string, string>();
const kvRollPos = new Map<string, string>();
const kvFmt = (m: Map<string, string>) => (p: ValueFormatterParams) =>
  m.get(String(p.value ?? "")) ?? String(p.value ?? "");
async function loadKv(group: string, map: Map<string, string>) {
  const list = (await systemKeyValueApi.getSysKvListByGroup(group)) ?? [];
  const options = [...list]
    .sort((a, b) => String(a.cOrder ?? "").localeCompare(String(b.cOrder ?? "")))
    .map((x) => ({ label: x.cName ?? x.cCode ?? "", value: x.cCode ?? "" }));
  for (const o of options) map.set(o.value, o.label);
  return options;
}

/* ---------- 轧辊状态下拉（原 ComNStatus AddEnum，Designer 四项 + 初值 -1=全部） ---------- */
const statusOptions = [
  { label: "下发L2", value: Tdm1020StatusEnum.Issue },
  { label: "准备完成", value: Tdm1020StatusEnum.Finish },
  { label: "下线", value: Tdm1020StatusEnum.Down },
  { label: "报废", value: Tdm1020StatusEnum.Scrap },
];
const statusMap: Record<string, string> = {
  "0": "下发L2",
  "1": "准备完成",
  "2": "下线",
  "3": "报废",
  "4": "送磨削",
};
const codeFmt = (map: Record<string, string>) => (p: ValueFormatterParams) =>
  map[String(p.value ?? "")] ?? String(p.value ?? "");

/* ---------- 查询条件（原 dataLayoutControl1 → DtoQueryTdm1020） ---------- */
const input = reactive({
  cRollerNo: "",
  cStandNo: null as string | null,
  nRollerType: null as string | null,
  nStatus: null as Tdm1020StatusEnum | null,
});
function buildDto(): DtoQueryTdm1020 {
  return {
    cRollerNo: input.cRollerNo.trim() || null,
    cStandNo: input.cStandNo,
    nRollerType: input.nRollerType,
    nStatus: input.nStatus,
  };
}

/* ---------- 表格（gridView1 / Tdm1020） ---------- */
const rows = ref<Tdm1020[]>([]);
const loading = ref(false);
const api = ref<GridApi | null>(null);
const current = ref<Tdm1020 | null>(null);
function onReady(e: GridReadyEvent) {
  api.value = e.api;
}
function onRowClicked(e: RowClickedEvent) {
  current.value = (e.data as Tdm1020 | undefined) ?? null;
}
function selectedIds(): string[] {
  return ((api.value?.getSelectedRows() as Tdm1020[] | undefined) ?? []).map((x) => x.id ?? "").filter(Boolean);
}
function selectedRollerNos(): string[] {
  return ((api.value?.getSelectedRows() as Tdm1020[] | undefined) ?? []).map((x) => x.cRollerNo ?? "").filter(Boolean);
}

const colDefs: ColDef[] = [
  { colId: "selected", field: "selected", headerName: "选择", width: 60, hide: true },
  { colId: "nStatus", field: "nStatus", headerName: "轧辊状态", width: 100, valueFormatter: codeFmt(statusMap) },
  { colId: "cRollerNo", field: "cRollerNo", headerName: "轧辊号", width: 130 },
  { colId: "cStandNo", field: "cStandNo", headerName: "机架号", width: 100, valueFormatter: kvFmt(kvStand) },
  {
    colId: "cAssemPosition",
    field: "cAssemPosition",
    headerName: "装配位置",
    width: 100,
    valueFormatter: kvFmt(kvRollPos),
  },
  { colId: "cRollerMaterial", field: "cRollerMaterial", headerName: "轧辊材质", width: 110 },
  { colId: "nRollerPath", field: "nRollerPath", headerName: "辊径mm", width: 100 },
  { colId: "nRollerCrown", field: "nRollerCrown", headerName: "轧辊凸度mm", width: 110 },
  { colId: "cRollerType", field: "cRollerType", headerName: "轧辊类型", width: 100, valueFormatter: kvFmt(kvRollType) },
  { colId: "cRollerRollType", field: "cRollerRollType", headerName: "轧辊辊型", width: 100 },
  { colId: "cOperateBear", field: "cOperateBear", headerName: "操作侧轴承座", width: 125 },
  { colId: "cTranBear", field: "cTranBear", headerName: "传动侧轴承座", width: 125 },
  { colId: "nRollNum", field: "nRollNum", headerName: "本次轧制块数", width: 112, minWidth: 105 },
  { colId: "nRollLen", field: "nRollLen", headerName: "本次轧制长度", width: 112, minWidth: 105 },
  { colId: "nRollTime", field: "nRollTime", headerName: "本次轧制时间", width: 112, minWidth: 105 },
  { colId: "nRollWgt", field: "nRollWgt", headerName: "本次轧制重量", width: 112, minWidth: 105 },
  { colId: "nAllNum", field: "nAllNum", headerName: "累计块数", width: 96 },
  { colId: "nAllLen", field: "nAllLen", headerName: "累计长度", width: 96 },
  { colId: "nAllTime", field: "nAllTime", headerName: "累计时长", width: 96 },
  { colId: "nAllWgt", field: "nAllWgt", headerName: "累计重量", width: 96 },
  { colId: "dPlanTime", field: "dPlanTime", headerName: "计划时间", width: 150 },
  { colId: "dDownTime", field: "dDownTime", headerName: "下发时间", width: 150 },
  { colId: "id", field: "id", headerName: "主键", width: 150, hide: true },
  { colId: "creator", field: "creator", headerName: "创建人", width: 100, hide: true },
  { colId: "createTime", field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { colId: "lastModifier", field: "lastModifier", headerName: "最后修改人", width: 110, hide: true },
  { colId: "lastModifyTime", field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { colId: "dSyncTime", field: "dSyncTime", headerName: "最后磨削时间", width: 150, hide: true },
];

/* ---------- 数据绑定（原 DataBind） ---------- */
async function onQuery() {
  loading.value = true;
  try {
    rows.value = (await dM1020Api.queryTdm1020s(buildDto())) ?? [];
    current.value = null;
    requestAnimationFrame(() => api.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
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

async function submit(action: () => Promise<unknown>) {
  try {
    await action();
    await onQuery();
    toast("数据提交成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

/* ---------- 按钮（stackPanel1 原序：查询 添加 编辑 删除 重置 报废 发送二级 发送磨床 装载轴承座 拆卸轴承座 同步磨削信息） ---------- */
function onAdd() {
  toast("轧辊添加弹窗（FrmDM1020_Edit）待接入", 2000, "warn");
}
function onEdit() {
  if (!current.value) return;
  toast("轧辊编辑弹窗（FrmDM1020_Edit）待接入", 2000, "warn");
}
function onDel() {
  if (rows.value.length === 0) return;
  const ids = selectedIds();
  if (ids.length === 0) {
    toast("请选择数据操作！", 2000, "warn");
    return;
  }
  void submit(() => dM1020Api.delTdm1020(ids));
}
function onReset() {
  if (rows.value.length === 0) return;
  const ids = selectedIds();
  if (ids.length === 0) {
    toast("请选择轧辊信息操作！", 2000, "warn");
    return;
  }
  askConfirm("是否确认重置选择的轧辊信息！", () => submit(() => dM1020Api.resetTdm1020(ids)));
}
function onScrap() {
  if (rows.value.length === 0) return;
  const ids = selectedIds();
  if (ids.length === 0) {
    toast("请选择轧辊信息操作！", 2000, "warn");
    return;
  }
  askConfirm("是否确认报废选择的轧辊信息！", () => submit(() => dM1020Api.scrapTdm1020(ids)));
}
async function onSend() {
  if (rows.value.length === 0) return;
  const ids = selectedIds();
  if (ids.length === 0) {
    toast("请勾选要发送的轧辊！", 2000, "warn");
    return;
  }
  askConfirm("是否确认把勾选的轧辊发送二级系统？", async () => {
    try {
      for (const id of ids) await dM1020Api.sendBx(id);
      await onQuery();
      toast("数据提交成功！", 2000, "success");
    } catch {
      /* 拦截层已 toast */
    }
  });
}
function onSendMc() {
  toast("发送磨床：原窗体未实现该按钮动作，待接入", 2000, "warn");
}
function onInstallBear() {
  const item = current.value;
  if (!item) return;
  if (item.cTranBear || item.cOperateBear) {
    toast("已装载轴承座！", 2000, "warn");
    return;
  }
  toast("装载轴承座弹窗（FrmDM1020_InstallRoller）待接入", 2000, "warn");
}
function onOutBear() {
  const item = current.value;
  if (!item) return;
  if (item.nStatus === Tdm1020StatusEnum.Issue) {
    toast("已下发轧辊不可拆卸！", 2000, "warn");
    return;
  }
  if (!item.cOperateBear || !item.cTranBear) {
    toast("未装载轴承座！", 2000, "warn");
    return;
  }
  askConfirm("是否拆卸选择轧辊的轴承座！", async () => {
    try {
      await dM1020Api.outBear(item.id ?? undefined);
      toast("数据提交成功！", 2000, "success");
      await onQuery();
    } catch {
      /* 拦截层已 toast */
    }
  });
}
function onSync() {
  if (rows.value.length === 0) return;
  const rollNos = selectedRollerNos();
  if (rollNos.length !== 1) {
    toast("一次只能同步一条轧辊数据！", 2000, "warn");
    return;
  }
  const rollerNo = rollNos[0];
  askConfirm(`是否开始同步轧辊号：${rollerNo} 的轧辊磨削后辊径数据！`, () =>
    submit(() => dM1020Api.syncTdm1030({ cRollerNo: rollerNo })),
  );
}

onMounted(async () => {
  try {
    const [stand, rollType, rollPos] = await Promise.all([
      loadKv("010100:STANDUSEFLAG", kvStand),
      loadKv("010100:ROLLTYPE", kvRollType),
      loadKv("010100:ROLLPOS", kvRollPos),
    ]);
    standOptions.value = stand;
    rollTypeOptions.value = rollType;
    api.value?.refreshCells({ force: true });
  } catch {
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件区（原 dataLayoutControl1：轧辊号/机架号/轧辊类型/轧辊状态） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轧辊号</label>
        <InputText v-model="input.cRollerNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">机架号</label>
        <Select
          v-model="input.cStandNo"
          :options="standOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轧辊类型</label>
        <Select
          v-model="input.nRollerType"
          :options="rollTypeOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轧辊状态</label>
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
    </div>

    <!-- 工具栏（原 stackPanel1 的 11 个按钮，顺序照 Controls.Add） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="onQuery">
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
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onReset">
        <IconRefresh class="h-3 w-3" />重置
      </Button>
      <Button variant="outlined" severity="danger" class="shrink-0 whitespace-nowrap" @click="onScrap">
        <IconBan class="h-3 w-3" />报废
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSend">
        <IconSend class="h-3 w-3" />发送二级
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSendMc">
        <IconSend class="h-3 w-3" />发送磨床
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onInstallBear">
        <IconArrowsJoin class="h-3 w-3" />装载轴承座
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onOutBear">
        <IconArrowsSplit class="h-3 w-3" />拆卸轴承座
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSync">
        <IconTransform class="h-3 w-3" />同步磨削信息
      </Button>
    </div>

    <!-- 表格分组标题（原 groupControl1） -->
    <div class="flex h-8 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <span class="text-xs font-medium text-muted-foreground">
        轧辊信息 :单位换算 1毫米 mm=100 (道/丝)= 1000微米 μm
      </span>
    </div>
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
        :pagination="false"
        :animate-rows="false"
        :loading="loading"
        @grid-ready="onReady"
        @row-clicked="onRowClicked"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

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
