<script setup lang="ts">
/** 对应 FrmMS2030_FG（炼钢总厂废钢配料）：DDH.Winforms.SMS.Forms.FrmMS2030_FG
 *  已接入：frmMS2030Api.queryMain（查询 btnQuery——CWarehouseNo+begDate+endDate）/
 *          queryItem（主表焦点行切换 → 子表「斗废钢明细信息」）/
 *          save（添加废钢配料 btnAdd：原 FrmMS2030_FG_Edit 弹窗随迁 FGEditDialog，主子数据按 C# CreateItemData 拼装）/
 *          checkRemove + remove（删除废钢配料，确认文案照抄）
 *  cQueryString：{CWarehouseNo,CWarehouseDesc,LineCode}；ShiftInfo.CheckShiftInfo/请选择班次班组 web 无班次模块——
 *                新增行 dTeamDate/cShift/cTeam 留空（待接入）
 *  分栏：原 gridControl1(Fill)+splitterControl1(Bottom)+gridControl2(Bottom,250px)——上下 60/40，子表标题「斗废钢明细信息」
 *  列集按 extract：主 13可见+17隐藏 / 子 6可见+16隐藏；厂/状态/班次编码格式化器未迁，显示原始编码
 *  换班按钮原 ShiftInfo.ResetShiftInfo，web 无班次模块留 toast 占位 */
import { ref } from "vue";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { frmMS2030Api } from "@/api/mes4ddh/sms.swagger";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { NextStrId } from "@/lib/yitIdHelper";
import FGEditDialog from "./FGEditDialog.vue";

type Row = Record<string, any>;

const { toast } = useToast();
const { json: menuJson } = useMenuQuery();
const qsStr = (v: unknown) => (typeof v === "string" ? v : "");
const warehouseNo = qsStr(menuJson.CWarehouseNo) || qsStr(menuJson.cWarehouseNo);
const warehouseDesc = qsStr(menuJson.CWarehouseDesc) || qsStr(menuJson.cWarehouseDesc);
const lineCode = qsStr(menuJson.LineCode) || qsStr(menuJson.lineCode);

const theme = makeHmxGridTheme();
const mainRows = ref<Row[]>([]);
const itemRows = ref<Row[]>([]);
const mainApi = ref<GridApi | null>(null);
const itemApi = ref<GridApi | null>(null);
const querying = ref(false);
const curMain = ref<Row | null>(null);

function fmt(d: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function today(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/* 原 stackPanel1：日期 deBegDate ≤日期≤ deEndDate + 查询/添加/删除/换班 */
const deBegDate = ref<Date | null>(today());
const deEndDate = ref<Date | null>(today());

/* 主表（原 gridControl1/gridView1：FrmMS2030ViewDto_Main 13 可见 + 17 隐藏） */
const mainCols = ref<ColDef[]>([
  { field: "cContainerNo", headerName: "斗号", width: 86 },
  { field: "nWgt", headerName: "坯重", width: 86 },
  { field: "cUnit", headerName: "单片钢坯", width: 112 },
  { field: "cUseFactory", headerName: "配料使用工厂", width: 95 },
  { field: "cUsedStoveNo", headerName: "使用炉号", width: 112 },
  { field: "cUsedPono", headerName: "使用炉次制造命令号", width: 131 },
  { field: "dTeamDate", headerName: "虚拟或占用炉号班次日期", width: 203 },
  { field: "cShift", headerName: "班次", width: 86 },
  { field: "cTeam", headerName: "班组", width: 86 },
  { field: "cState", headerName: "铁水状态", width: 112 },
  { field: "nWgtUse", headerName: "炉次耗用重量", width: 95 },
  { field: "creator", headerName: "创建人", width: 99 },
  { field: "createTime", headerName: "创建时间", width: 112 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cConfigStoveNo", headerName: "配料炉号", hide: true },
  { field: "cEnable", headerName: "启用", hide: true },
  { field: "cBackup", headerName: "备注", hide: true },
  { field: "cTimestamp", headerName: "时间戳", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cSw01", headerName: "备用字段1", hide: true },
  { field: "cSw02", headerName: "备用字段2", hide: true },
  { field: "cSw03", headerName: "备用字段3", hide: true },
  { field: "cSw04", headerName: "备用字段4", hide: true },
  { field: "cSw05", headerName: "备用字段5", hide: true },
  { field: "cSw06", headerName: "备用字段6", hide: true },
  { field: "selected", headerName: "选择", hide: true },
  { field: "cWarehouseDesc", headerName: "废钢库房名称", hide: true },
  { field: "cWarehouseNo", headerName: "废钢库房编码", hide: true },
  { field: "wgtIsPartUsed", headerName: "是否是部分耗用", hide: true },
]);
/* 子表（原 gridControl2/gridView2 ViewCaption=斗废钢明细信息：FrmMS2030ViewDto_Item 6 可见 + 16 隐藏） */
const itemCols = ref<ColDef[]>([
  { field: "cContainerNo", headerName: "斗号", width: 86 },
  { field: "cMtrlDesc", headerName: "物料描述", width: 112 },
  { field: "nWgt", headerName: "坯重", width: 86 },
  { field: "cUnit", headerName: "单片钢坯", width: 112 },
  { field: "creator", headerName: "创建人", width: 99 },
  { field: "createTime", headerName: "创建时间", width: 112 },
  { field: "id", headerName: "主键", hide: true },
  { field: "cTms2040Id", headerName: "父id", hide: true },
  { field: "cMtrlCode", headerName: "物料编码", hide: true },
  { field: "cFgLevel", headerName: "废钢等级", hide: true },
  { field: "cEnable", headerName: "启用", hide: true },
  { field: "cBackup", headerName: "备注", hide: true },
  { field: "cTimestamp", headerName: "时间戳", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cSw01", headerName: "备用字段1", hide: true },
  { field: "cSw02", headerName: "备用字段2", hide: true },
  { field: "cSw03", headerName: "备用字段3", hide: true },
  { field: "cSw04", headerName: "备用字段4", hide: true },
  { field: "cSw05", headerName: "备用字段5", hide: true },
  { field: "cSw06", headerName: "备用字段6", hide: true },
  { field: "selected", headerName: "选择", hide: true },
]);

function onMainReady(e: GridReadyEvent) {
  mainApi.value = e.api;
}
function onItemReady(e: GridReadyEvent) {
  itemApi.value = e.api;
}

/** btnQuery_Click_Real → Proxy.QueryMain；查询后原代码以 null 焦点清空子表（不自动拉第一条） */
async function queryMain() {
  querying.value = true;
  try {
    mainRows.value =
      (await frmMS2030Api.queryMain({
        wareHouseNo: warehouseNo || undefined,
        begDate: fmt(deBegDate.value),
        endDate: fmt(deEndDate.value),
      })) ?? [];
    requestAnimationFrame(() => mainApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
  curMain.value = null;
  itemRows.value = [];
}

/** gridView1_FocusedRowChanged → Proxy.QueryItem(mainId) */
async function onMainSelection(e: SelectionChangedEvent) {
  const row = (e.api.getSelectedRows()[0] ?? null) as Row | null;
  curMain.value = row;
  if (!row) {
    itemRows.value = [];
    return;
  }
  itemRows.value = (await frmMS2030Api.queryItem({ mainId: row.id })) ?? [];
  requestAnimationFrame(() => itemApi.value?.autoSizeAllColumns());
}

/** btnAdd_Click → FrmMS2030_FG_Edit(随迁) → Proxy.Save(main, items)（外购/自循环两条明细按 CreateItemData 拼装） */
const editOpen = ref(false);
function onAdd() {
  /* 原 ShiftInfo.CheckShiftInfo + 「请选择班次班组！」——web 无班次模块，跳过（见来源注释待接入） */
  editOpen.value = true;
}
async function onEditConfirm(info: {
  cContainerNo: string;
  nWgtWG: number;
  nWgtZC: number;
  cUseFactory: string | undefined;
}) {
  editOpen.value = false;
  const mainId = NextStrId();
  const main: Row = {
    id: mainId,
    cWarehouseNo: warehouseNo,
    cWarehouseDesc: warehouseDesc,
    cContainerNo: info.cContainerNo,
    nWgt: info.nWgtWG + info.nWgtZC,
    cUnit: "吨",
    cUseFactory: info.cUseFactory,
    cState: "WaitUsed",
    cEnable: true,
    /* ShiftInfo 班次班组：web 无班次模块留空（待接入） */
  };
  const mkItem = (mtrlName: string, wgt: number): Row => ({
    id: NextStrId(),
    cTms2040Id: mainId,
    cContainerNo: info.cContainerNo,
    cMtrlDesc: mtrlName,
    nWgt: wgt,
    cUnit: "吨",
    cEnable: true,
  });
  const items = [mkItem("外购废钢", info.nWgtWG), mkItem("自循环废钢", info.nWgtZC)];
  await frmMS2030Api.save({ main, items });
  await queryMain();
}

/** btnRemove_Click → Proxy.CheckRemove → 确认 → Proxy.Remove */
async function onRemove() {
  const row = curMain.value;
  if (!row) return;
  await frmMS2030Api.checkRemove({ mainId: row.id });
  if (!window.confirm(`确定删除斗号为‘${row.cContainerNo}’的废钢配料数据？`)) return;
  await frmMS2030Api.remove({ mainId: row.id });
  await queryMain();
}

/** btnRefreshTeamInfo_Click 原 ShiftInfo.ResetShiftInfo（web 无班次模块占位） */
function onRefreshTeam() {
  toast("换班：web 端无 ShiftInfo 班次模块，暂不可用", 2500, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询/操作行（原 stackPanel1 Dock=Top） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">日期</label>
      <DatePicker v-model="deBegDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">≤日期≤</label>
      <DatePicker v-model="deEndDate" :manual-input="false" date-format="yy-mm-dd" show-icon class="shrink-0" />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="queryMain">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd">添加废钢配料</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onRemove">删除废钢配料</Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onRefreshTeam">换班</Button>
    </div>

    <!-- 上下分栏（原 gridControl1 Fill / splitterControl1 Bottom / gridControl2 Bottom,250px ≈ 60/40） -->
    <Splitter layout="vertical" class="min-h-0 flex-1">
      <SplitterPanel :size="60" :minSize="20" class="flex flex-col overflow-hidden">
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="mainCols"
            :row-data="mainRows"
            :pagination="false"
            :loading="querying"
            :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
            @grid-ready="onMainReady"
            @selection-changed="onMainSelection"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="40" :minSize="15" class="flex flex-col overflow-hidden">
        <!-- 子表标题（原 gridView2.ViewCaption，无按钮 → h-8） -->
        <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
          <span class="text-xs font-medium text-muted-foreground">斗废钢明细信息</span>
        </div>
        <div class="min-h-0 flex-1 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="itemCols"
            :row-data="itemRows"
            :pagination="false"
            @grid-ready="onItemReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>

    <FGEditDialog v-model:open="editOpen" :line-code="lineCode" @confirm="onEditConfirm" />
  </div>
</template>
