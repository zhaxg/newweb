<script setup lang="ts">
/** 对应 FrmMS1001（炼钢总厂/一炼钢 工序机台间转运耗时，2 菜单共用）：DDH.Winforms.SMS.Forms.FrmMS1001
 *  已接入：frmMS1001Api.query（查询，GetParamDto 不校验）/ save（保存：四元校验 → 整表提交 → 重查；C# btnSave 无确认框）/
 *          tPa1000Api.queryLines+queryMachine（源/目标产线只读显示 code-name，源/目标机台各自按产线过滤；
 *            任一机台变更自动触发查询——照 ucMachine1/ucMachine2_EditValueChanged）
 *  待接入：无（添加插入表头并 toast 提示需保存；删除/添加均为本地列表操作）
 *  已知偏差：原 ucLine2_EditValueChanged 误用 ucLine1.EditValue 刷新目标机台（C# 笔误），web 按 LineCodeT 过滤目标机台
 *  cQueryString：JSON {FactoryCodeS, LineCodeS, FactoryCodeT, LineCodeT}（useMenuQuery；缺参照 C# 文案 toast）
 *  列集：5 可见 + 22 隐藏（extract FrmMS1001ViewDto；实体纠偏：NUseTime→产线机台间转运耗时(分钟)、审计→最后更新人/最后更新时间）
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  SelectionChangedEvent,
  ValueGetterParams,
  ValueSetterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { NextStrId } from "@/lib/yitIdHelper";
import { frmMS1001Api, tPa1000Api } from "@/api/mes4ddh/sms.swagger";

const { toast } = useToast();
const { raw: qsRaw } = useMenuQuery();
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
    { field: "CLineNameS", headerName: "源产线名称", width: 83, editable: true },
    { field: "CMachineNameS", headerName: "源机台名称", width: 83, editable: true },
    { field: "CLineNameT", headerName: "目标产线名称", width: 95, editable: true },
    { field: "CMachineNameT", headerName: "目标机台名称", width: 95, editable: true },
    {
      field: "NUseTime",
      headerName: "产线机台间转运耗时(分钟)",
      width: 165,
      editable: true,
      cellEditor: "agNumberCellEditor",
    },
    { field: "Id", headerName: "主键", width: 120, hide: true },
    { field: "CFactoryCodeS", headerName: "源工厂", width: 120, hide: true },
    { field: "CFactoryNameS", headerName: "源工厂名称", width: 120, hide: true },
    { field: "CLineCodeS", headerName: "源产线", width: 120, hide: true },
    { field: "CMachineCodeS", headerName: "源机台", width: 120, hide: true },
    { field: "CFactoryCodeT", headerName: "目标工厂", width: 120, hide: true },
    { field: "CFactoryNameT", headerName: "目标工厂名称", width: 120, hide: true },
    { field: "CLineCodeT", headerName: "目标产线", width: 120, hide: true },
    { field: "CMachineCodeT", headerName: "目标机台", width: 120, hide: true },
    { field: "CBackup", headerName: "备注", width: 120, hide: true },
    { field: "CTimestamp", headerName: "时间戳", width: 120, hide: true },
    { field: "Creator", headerName: "创建人", width: 120, hide: true },
    { field: "CreateTime", headerName: "创建时间", width: 120, hide: true },
    { field: "LastModifier", headerName: "最后更新人", width: 120, hide: true },
    { field: "LastModifyTime", headerName: "最后更新时间", width: 120, hide: true },
    { field: "CSw01", headerName: "备用字段1", width: 120, hide: true },
    { field: "CSw02", headerName: "备用字段2", width: 120, hide: true },
    { field: "CSw03", headerName: "备用字段3", width: 120, hide: true },
    { field: "CSw04", headerName: "备用字段4", width: 120, hide: true },
    { field: "CSw05", headerName: "备用字段5", width: 120, hide: true },
    { field: "CSw06", headerName: "备用字段6", width: 120, hide: true },
    { field: "Selected", headerName: "选择", width: 80, hide: true },
  ]),
);

const rows = ref<any[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>();
const selected = ref<any | null>(null);

const lineCodeS = ref("");
const lineCodeT = ref("");
const lineTextS = ref("");
const lineTextT = ref("");
const machineCodeS = ref<string | null>(null);
const machineCodeT = ref<string | null>(null);
const machineOptionsS = ref<{ label: string; value: string }[]>([]);
const machineOptionsT = ref<{ label: string; value: string }[]>([]);

const qsFormat = '{"FactoryCodeS":null,"LineCodeS":null,"FactoryCodeT":null,"LineCodeT":null}';
function parseQs(): { LineCodeS?: string; LineCodeT?: string } | null {
  if (!qsRaw) {
    toast(
      `界面必须配置注入参数，MES程序版本可能已严重落后，请退出并重新打开MES程序！\n若问题仍未得到解决，请联系管理员！\n界面注入参数格式为：'${qsFormat}'`,
      4000,
      "warn",
    );
    return null;
  }
  try {
    return JSON.parse(qsRaw) as { LineCodeS?: string; LineCodeT?: string };
  } catch {
    toast(`界面参数错误应为:${qsFormat}，\nMES程序版本可能已严重落后，请退出并重新打开MES程序！`, 4000, "warn");
    return null;
  }
}

async function loadLines() {
  try {
    const list = (await tPa1000Api.queryLines()) ?? [];
    const map = new Map<string, string>();
    for (const r of list as Array<Record<string, unknown>>) {
      const code = (r.cCode ?? r.cLineCode ?? "") as string;
      if (code) map.set(code, (r.cName ?? r.cLineName ?? "") as string);
    }
    const ns = map.get(lineCodeS.value);
    const nt = map.get(lineCodeT.value);
    lineTextS.value = ns ? `${lineCodeS.value}-${ns}` : lineCodeS.value;
    lineTextT.value = nt ? `${lineCodeT.value}-${nt}` : lineCodeT.value;
  } catch {
    lineTextS.value = lineCodeS.value;
    lineTextT.value = lineCodeT.value;
    /* 拦截层已 toast */
  }
}

async function loadMachines() {
  try {
    const [s, t] = await Promise.all([
      tPa1000Api.queryMachine(lineCodeS.value || null) ?? [],
      tPa1000Api.queryMachine(lineCodeT.value || null) ?? [],
    ]);
    const map = (list: unknown) =>
      ((list ?? []) as Array<Record<string, unknown>>)
        .filter((r) => r.cCode != null)
        .map((r) => ({ label: (r.cSimpName ?? r.cName ?? r.cCode) as string, value: r.cCode as string }));
    machineOptionsS.value = map(s);
    machineOptionsT.value = map(t);
  } catch {
    machineOptionsS.value = [];
    machineOptionsT.value = [];
    /* 拦截层已 toast */
  }
}

/** GetParamDto(check)：check=true 时源/目标产线与机台均不得为空 */
function paramDto(check: boolean) {
  if (check && (!lineCodeS.value || !lineCodeT.value || !machineCodeS.value || !machineCodeT.value)) {
    toast("禁止操作，源和目标的产线和机台均不得为空！", 3000, "warn");
    return null;
  }
  const so = machineOptionsS.value.find((o) => o.value === machineCodeS.value);
  const to = machineOptionsT.value.find((o) => o.value === machineCodeT.value);
  return {
    lineCodeS: lineCodeS.value,
    lineNameS: lineTextS.value,
    machineCodeS: machineCodeS.value ?? "",
    machineNameS: so?.label ?? machineCodeS.value ?? "",
    lineCodeT: lineCodeT.value,
    lineNameT: lineTextT.value,
    machineCodeT: machineCodeT.value ?? "",
    machineNameT: to?.label ?? machineCodeT.value ?? "",
  };
}

async function query() {
  const p = paramDto(false);
  if (!p) return;
  querying.value = true;
  try {
    const list = (await frmMS1001Api.query(p)) ?? [];
    rows.value = Array.isArray(list) ? list : [];
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
  selected.value = e.api.getSelectedRows()[0] ?? null;
}

function onAdd() {
  const p = paramDto(true);
  if (!p) return;
  rows.value = [
    {
      id: NextStrId(),
      cLineCodeS: p.lineCodeS,
      cLineNameS: p.lineNameS,
      cMachineCodeS: p.machineCodeS,
      cMachineNameS: p.machineNameS,
      cLineCodeT: p.lineCodeT,
      cLineNameT: p.lineNameT,
      cMachineCodeT: p.machineCodeT,
      cMachineNameT: p.machineNameT,
    },
    ...rows.value,
  ];
  toast("注意：添加的数据需通过“保存”按钮提交至数据库！", 3000, "info");
}

function onRemove() {
  const row = selected.value;
  if (!row) return;
  const p = paramDto(true);
  if (!p) return;
  const ok = window.confirm("确定删除所选的配置数据？\n注意：删除的数据需通过“保存”按钮提交至数据库！");
  if (!ok) return;
  rows.value = rows.value.filter((r) => r !== row);
  selected.value = null;
}

async function onSave() {
  const p = paramDto(true);
  if (!p) return;
  if (!rows.value) return;
  querying.value = true;
  try {
    await frmMS1001Api.save({ paramDto: p, datas: rows.value });
    await query();
    toast("保存成功！", 2000, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onMachineChange() {
  void query();
}

onMounted(async () => {
  const qs = parseQs();
  lineCodeS.value = qs?.LineCodeS ?? "";
  lineCodeT.value = qs?.LineCodeT ?? "";
  await Promise.all([loadLines(), loadMachines()]);
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：源产线/源机台/目标产线/目标机台 + 查询/添加/删除/保存（顺序照 Controls.Add） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">源产线</label>
      <InputText :model-value="lineTextS" disabled class="w-28 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">源机台</label>
      <Select
        v-model="machineCodeS"
        :options="machineOptionsS"
        option-label="label"
        option-value="value"
        show-clear
        placeholder="请选择"
        class="w-32 shrink-0"
        @value-change="onMachineChange"
      />
      <label class="shrink-0 text-xs text-muted-foreground">目标产线</label>
      <InputText :model-value="lineTextT" disabled class="w-28 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">目标机台</label>
      <Select
        v-model="machineCodeT"
        :options="machineOptionsT"
        option-label="label"
        option-value="value"
        show-clear
        placeholder="请选择"
        class="w-32 shrink-0"
        @value-change="onMachineChange"
      />
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
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        :loading="querying"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        @grid-ready="onGridReady"
        @selection-changed="onSelectionChanged"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
