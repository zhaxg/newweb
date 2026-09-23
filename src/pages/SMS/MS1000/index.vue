<script setup lang="ts">
/** 对应 FrmMS1000（炼钢总厂/一炼钢 工序机台冶炼耗用时间，2 菜单共用）：DDH.Winforms.SMS.Forms.FrmMS1000
 *  已接入：frmMS1000Api.query（查询，GetParamDto 不校验机台）/ save（保存：重复配置与耗时空校验 → 确认「确定保存数据？」→ 全量提交 → 重查）/
 *          publicQMInfoApi.getSgCode（Load 钢种下拉候选 → CSgCode 列编辑器）/
 *          tPa1000Api.queryLines+queryMachine（原 UCLine/UCMachine → ITpa1000AppService.QueryLines/QueryMachine；
 *            产线只读显示 code-name、机台下拉按产线过滤，机台变更自动触发查询——照 ucMachine1_EditValueChanged）
 *  待接入：无（添加/删除/保存为本地列表操作，保存时整表提交——原 BindingSource 非跟踪列表）
 *  cQueryString：JSON {FactoryCode, LineCode}（useMenuQuery；缺参照 C# UserFriendlyException 文案 toast）
 *  列集：5 可见 + 23 隐藏（extract FrmMS1000ViewDto；实体 LDisplay 纠偏：CMachineCode→机台、审计→最后更新人/最后更新时间）
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { computed, nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconDeviceFloppy, IconPlus, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, ValueGetterParams, ValueSetterParams } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { NextStrId } from "@/lib/yitIdHelper";
import { frmMS1000Api, publicQMInfoApi, tPa1000Api } from "@/api/mes4ddh/sms.swagger";

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
    { field: "CLineName", headerName: "产线名称", width: 120, editable: true },
    { field: "CMachineName", headerName: "机台名称", width: 120, editable: true },
    {
      field: "CSgCode",
      headerName: "钢种",
      width: 200,
      editable: true,
      // 原 RepositoryItemComboBox（候选=Load 时 GetSgCode）；无候选退化为自由文本
      cellEditorSelector: () =>
        sgCodes.value.length
          ? { component: "agSelectCellEditor", params: { values: sgCodes.value } }
          : { component: "agTextCellEditor" },
    },
    { field: "NUseTime", headerName: "工序机台耗时(分钟)", width: 129, editable: true, cellEditor: "agNumberCellEditor" },
    { field: "CBackup", headerName: "备注", width: 120, editable: true },
    { field: "Id", headerName: "主键", width: 120, hide: true },
    { field: "CFactoryCode", headerName: "工厂", width: 120, hide: true },
    { field: "CFactoryName", headerName: "工厂名称", width: 120, hide: true },
    { field: "CLineCode", headerName: "产线", width: 120, hide: true },
    { field: "CProc", headerName: "工序", width: 120, hide: true },
    { field: "CProcName", headerName: "工序名称", width: 120, hide: true },
    { field: "CMachineCode", headerName: "机台", width: 120, hide: true },
    { field: "CSgStd", headerName: "执行标准", width: 120, hide: true },
    { field: "CConditionsCode", headerName: "附加条件编码", width: 120, hide: true },
    { field: "CConditionsDesc", headerName: "附加条件描述", width: 120, hide: true },
    { field: "CConditionsNum", headerName: "附加条件数量", width: 120, hide: true },
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

const lineCode = ref("");
/** 原 ucLine.Text = 组合项显示「code-name」 */
const lineText = ref("");
const machineCode = ref<string | null>(null);
const machineOptions = ref<{ label: string; value: string }[]>([]);
const sgCodes = ref<string[]>([]);
const lineMap = ref(new Map<string, string>());

const tipStr = "注意：该操作并不会直接提交数据库，需通过“保存”将操作提交至数据库！";

/** 界面注入参数：缺参/坏参照 HandleQueryString 的 UserFriendlyException 文案 */
const qsFormat = '{"FactoryCode":null,"LineCode":null}';
function parseQs(): { FactoryCode?: string; LineCode?: string } | null {
  if (!qsRaw) {
    toast(
      `界面必须配置注入参数，MES程序版本可能已严重落后，请退出并重新打开MES程序！\n若问题仍未得到解决，请联系管理员！\n界面注入参数格式为：'${qsFormat}'`,
      4000,
      "warn",
    );
    return null;
  }
  try {
    return JSON.parse(qsRaw) as { FactoryCode?: string; LineCode?: string };
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
      const name = (r.cName ?? r.cLineName ?? "") as string;
      if (code) map.set(code, name);
    }
    lineMap.value = map;
    const name = map.get(lineCode.value);
    lineText.value = name ? `${lineCode.value}-${name}` : lineCode.value;
  } catch {
    lineText.value = lineCode.value;
    /* 拦截层已 toast */
  }
}

async function loadMachines() {
  try {
    const list = (await tPa1000Api.queryMachine(lineCode.value || null)) ?? [];
    machineOptions.value = (list as Array<Record<string, unknown>>)
      .filter((r) => r.cCode != null)
      .map((r) => ({ label: (r.cSimpName ?? r.cName ?? r.cCode) as string, value: r.cCode as string }));
  } catch {
    machineOptions.value = [];
    /* 拦截层已 toast */
  }
}

/** GetParamDto(check)：check=true 时产线/机台均不得为空 */
function paramDto(check: boolean) {
  if (check && (!lineCode.value || !machineCode.value)) {
    toast("禁止操作，产线和机台均不得为空！", 2500, "warn");
    return null;
  }
  const mo = machineOptions.value.find((o) => o.value === machineCode.value);
  return {
    lineCode: lineCode.value,
    lineName: lineText.value,
    machineCode: machineCode.value ?? "",
    machineName: mo?.label ?? machineCode.value ?? "",
  };
}

async function query() {
  const p = paramDto(false);
  if (!p) return;
  querying.value = true;
  try {
    const list = (await frmMS1000Api.query(p)) ?? [];
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

function gv(r: Record<string, unknown>, f: string) {
  const ck = f.charAt(0).toLowerCase() + f.slice(1);
  return r[ck] ?? r[f];
}

function onAdd() {
  const p = paramDto(true);
  if (!p) return;
  rows.value = [
    ...rows.value,
    { id: NextStrId(), cLineCode: p.lineCode, cLineName: p.lineName, cMachineCode: p.machineCode, cMachineName: p.machineName },
  ];
}

function onRemove() {
  const p = paramDto(true);
  if (!p) return;
  const row = selected.value;
  if (!row) return;
  const ok = window.confirm(`确定删除选择的机台为：‘${gv(row, "CMachineName") ?? ""}’，钢种为：‘${gv(row, "CSgCode") ?? ""}’的配置数据？`);
  if (!ok) return;
  rows.value = rows.value.filter((r) => r !== row);
  selected.value = null;
}

async function onSave() {
  const p = paramDto(true);
  if (!p) return;
  const datas = rows.value;
  if (datas.length > 0) {
    const key = (r: Record<string, unknown>) =>
      [gv(r, "CFactoryCode"), gv(r, "CLineCode"), gv(r, "CProc"), gv(r, "CMachineCode"), gv(r, "CSgCode"), gv(r, "CSgStd"), gv(r, "CConditionsCode")]
        .map((x) => String(x ?? ""))
        .join("\u0001");
    const first = new Map<string, Record<string, unknown>>();
    for (const r of datas as Array<Record<string, unknown>>) {
      const k = key(r);
      if (first.has(k)) {
        toast(`禁止操作，钢种‘${String(gv(r, "CSgCode") ?? "")}’存在重复的配置数据！`, 3000, "warn");
        return;
      }
      first.set(k, r);
    }
    if (datas.some((r) => (r as Record<string, unknown>).nUseTime == null && (r as Record<string, unknown>).NUseTime == null)) {
      toast("禁止操作，存在工序机台耗时（分钟）为空的数据！", 3000, "warn");
      return;
    }
  }
  if (!window.confirm("确定保存数据？")) return;
  querying.value = true;
  try {
    await frmMS1000Api.save({ paramDto: p, datas });
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
  lineCode.value = qs?.LineCode ?? "";
  await Promise.all([loadLines(), loadMachines()]);
  try {
    const list = (await publicQMInfoApi.getSgCode()) ?? [];
    sgCodes.value = (list as unknown[]).map((s) => (typeof s === "string" ? s : String((s as Record<string, unknown>).cName ?? (s as Record<string, unknown>).cCode ?? ""))).filter(Boolean);
  } catch {
    sgCodes.value = [];
    /* 拦截层已 toast */
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：产线/机台 + 查询/添加/删除/保存（顺序照 Controls.Add） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineText" disabled class="w-32 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <Select v-model="machineCode" :options="machineOptions" option-label="label" option-value="value" show-clear
        placeholder="请选择" class="w-36 shrink-0" @value-change="onMachineChange" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :title="tipStr" @click="onAdd">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :title="tipStr" @click="onRemove">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue class="hmx-ag-grid h-full w-full" :theme="theme" :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef" :column-defs="colDefs" :row-data="rows" :pagination="false"
        :loading="querying" :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        @grid-ready="onGridReady" @selection-changed="onSelectionChanged" @first-data-rendered="autoSizeOnFirstData" />
    </div>
  </div>
</template>
