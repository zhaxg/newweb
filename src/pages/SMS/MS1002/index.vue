<script setup lang="ts">
/** 对应 FrmMS1002（系数信息维护 / 菜单 cCode=MS1053）：DDH.Winforms.SMS.Forms.FrmMS1002
 *  已接入：frmMS1002Api.query（Load 自动查询，参数 {_QueryDto}）/
 *          frmMS1002Api.createData（添加：服务端生成行 → 入 TrackableList）/
 *          frmMS1002Api.checkSave + save（保存：TrackableList.SaveChangesData → CheckSave 校验 →
 *            确认「确定保存？」→ Save(paramDto, data) → 重查；提取器标 tracking 通路，
 *            .cs 实调 Proxy.CheckSave/Save，未走 crudAppService.SaveList）
 *  待接入：无（删除为本地 RemoveCurrent，无确认框——照 .cs）
 *  cQueryString：可空（非空才解析为 _QueryDto；种子为空串）
 *  列集：9 可见 + 20 隐藏（extract FrmMS1002ViewDto；实体纠偏：审计→最后更新人/最后更新时间、CMachineCode→机台）
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写）；行跟踪 TrackableList（原 AsTrackable+GetTrackingList） */
import { nextTick, onMounted, ref, shallowRef } from "vue";
import Button from "primevue/button";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GetRowIdParams, GridApi, GridReadyEvent, SelectionChangedEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { TrackableList } from "@/api/common/trackableList";
import { NextStrId } from "@/lib/yitIdHelper";
import { frmMS1002Api } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { json: qsJson, raw: qsRaw } = useMenuQuery();
const theme = makeHmxGridTheme();

/** extract 字段 PascalCase → 后端 JSON camelCase 桥接 */
function bridge(cols: ColDef[]): ColDef[] {
  return cols.map((c) => {
    if (!c.field) return c;
    const f = c.field;
    const ck = f.charAt(0).toLowerCase() + f.slice(1);
    return {
      ...c,
      valueGetter: (p: ValueGetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        return d ? (d[ck] ?? d[f]) : undefined;
      },
      valueSetter: (p: ValueSetterParams) => {
        const d = p.data as Record<string, unknown> | undefined;
        if (!d) return false;
        d[ck] = p.newValue;
        d[f] = p.newValue;
        return true;
      },
    };
  });
}

const colDefs = ref<ColDef[]>(
  bridge([
    { field: "CLineCode", headerName: "产线", width: 120, editable: true },
    { field: "CLineName", headerName: "产线名称", width: 120, editable: true },
    { field: "NCalcCoef", headerName: "计算系数", width: 120, editable: true, cellEditor: "agNumberCellEditor" },
    { field: "CEnable", headerName: "启用", width: 90, editable: true, cellRenderer: "agCheckboxCellRenderer" },
    { field: "CBackup", headerName: "备注", width: 140, editable: true },
    { field: "Creator", headerName: "创建人", width: 112 },
    { field: "CreateTime", headerName: "创建时间", width: 150 },
    { field: "LastModifier", headerName: "最后更新人", width: 112 },
    { field: "LastModifyTime", headerName: "最后更新时间", width: 150 },
    { field: "Id", headerName: "主键", width: 120, hide: true },
    { field: "CType", headerName: "类型", width: 120, hide: true },
    { field: "CFactoryCode", headerName: "工厂", width: 120, hide: true },
    { field: "CFactoryName", headerName: "工厂名称", width: 120, hide: true },
    { field: "CProc", headerName: "工序", width: 120, hide: true },
    { field: "CProcName", headerName: "工序名称", width: 120, hide: true },
    { field: "CMachineCode", headerName: "机台", width: 120, hide: true },
    { field: "CMachineName", headerName: "机台名称", width: 120, hide: true },
    { field: "CSiloCode", headerName: "料仓编码", width: 120, hide: true },
    { field: "CSiloName", headerName: "料仓描述", width: 120, hide: true },
    { field: "CMtrlCode", headerName: "物料编码", width: 120, hide: true },
    { field: "CMtrlName", headerName: "物料描述", width: 120, hide: true },
    { field: "CTimestamp", headerName: "时间戳", width: 120, hide: true },
    { field: "CSw01", headerName: "备用字段1", width: 120, hide: true },
    { field: "CSw02", headerName: "备用字段2", width: 120, hide: true },
    { field: "CSw03", headerName: "备用字段3", width: 120, hide: true },
    { field: "CSw04", headerName: "备用字段4", width: 120, hide: true },
    { field: "CSw05", headerName: "备用字段5", width: 120, hide: true },
    { field: "CSw06", headerName: "备用字段6", width: 120, hide: true },
    { field: "Selected", headerName: "选择", width: 80, hide: true },
  ]),
);

type Row = Record<string, unknown>;
// 行跟踪：原 bsc.AsTrackable() + GetTrackingList().ToSaveChangesData()
const trackList = shallowRef<TrackableList<Row>>(new TrackableList<Row>());
const querying = ref(false);
const gridApi = ref<GridApi | null>();
const selected = ref<Row | null>(null);

/** FrmMS1002paramDto { _QueryDto }；种子 cQueryString 为空 → null（照 HandleQueryString 仅非空才解析） */
function paramDto() {
  return { _QueryDto: qsRaw ? qsJson : null };
}

function getRowId(p: GetRowIdParams) {
  return String((p.data as Row).id ?? "");
}

async function query() {
  querying.value = true;
  try {
    const list = (await frmMS1002Api.query(paramDto())) ?? [];
    trackList.value = new TrackableList<Row>(Array.isArray(list) ? (list as Row[]) : []);
    selected.value = null;
    await nextTick();
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function onSelectionChanged(e: SelectionChangedEvent) {
  selected.value = (e.api.getSelectedRows()[0] as Row | undefined) ?? null;
}

/** btnAdd_Click：CreateData 服务端生成行后入列表（mock 返回 null 时以 NextStrId 空行兜底） */
async function onAdd() {
  try {
    const dto = ((await frmMS1002Api.createData(paramDto())) ?? { id: NextStrId() }) as Row;
    if (!dto.id) dto.id = NextStrId();
    trackList.value.push(dto);
    const stored = trackList.value[trackList.value.length - 1] as Row;
    gridApi.value?.applyTransaction({ add: [stored] });
  } catch {
    /* 拦截层已 toast */
  }
}

/** btnRemove_Click：RemoveCurrent，无确认框 */
function onRemove() {
  const row = selected.value;
  if (!row) return;
  trackList.value.remove((r) => (r as Row).id === row.id);
  gridApi.value?.applyTransaction({ remove: [row] });
  selected.value = null;
}

async function onSave() {
  const saveData = trackList.value.SaveChangesData;
  if (!saveData.addedItems.length && !saveData.changedItems.length && !saveData.deletedItems.length) return;
  const p = paramDto();
  querying.value = true;
  try {
    await frmMS1002Api.checkSave({ paramDto: p, data: saveData });
    if (!window.confirm("确定保存？")) return;
    await frmMS1002Api.save({ paramDto: p, data: saveData });
    await query();
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(query);
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：查询/添加/删除/保存（原窗体无查询条件输入） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onRemove">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="trackList" :get-row-id="getRowId"
        :pagination="false" :loading="querying" :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        @grid-ready="onGridReady" @selection-changed="onSelectionChanged" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
