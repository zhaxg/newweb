<script setup lang="ts">
/** UCTqmyl02（工艺要点适用钢种标准）+ 内嵌 UCSelectNKGZ 选择器：
 *  DDH.Winforms.SQM.Forms.Tqmyl.UCTqmyl02 / DDH.Winforms.SQM.Controls.UCSelectNKGZ
 *  布局（原 form Controls.Add(grid, stackPanel, dataLayout) → Dock 自上而下）：
 *    dataLayoutControl1「钢种标准」+ ucSelectnkgz1 → stackPanel1[添加|删除] → gridControl1
 *  列集：Tqmyl02 VisibleIndex 0=cSgSign 钢种牌号 / 1=cSgStd 执行标准，其余 8 列 hide:true
 *  已接入：tqmtpa6Api.query + tqm1000Api.getTqm1000List + tqmylApi.queryAllSGSign（UCSelectNKGZ.GetData 三路合成）
 *  偏差：colCSgClassCode 原走 KeyValueFormatters.SteelType（KV A0100:STEEL_TYPE）转义，按字典灌 valueFormatter；
 *        UCSelectNKGZ 是 UCGridLookUpEdit（弹出网格 9 列，提取器不按表格计），web 侧改为可筛选 Select，
 *        选项文案 = 标准 · 牌号 · 钢种分类，其余列（备注/版本号 + 4 隐藏）未逐列迁移 */
import { ref, watch, type PropType } from "vue";
import Button from "primevue/button";
import Select from "primevue/select";
import { IconPlus, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { hmxDefaultColDef, makeHmxGridTheme, autoSizeOnFirstData } from "@/lib/agGrid";
import {
  tqm1000Api,
  tqmtpa6Api,
  tqmylApi,
  type SgStdSignPair,
  type Tqmyl01,
  type Tqmyl02,
} from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { NextStrId } from "@/lib/yitIdHelper";
import { useToast } from "@/composables/useToast";

const props = defineProps({
  tqmyl01: { type: Object as PropType<Tqmyl01 | null>, default: null },
  rows: { type: Array as PropType<Tqmyl02[]>, required: true },
  editable: { type: Boolean, default: true },
});
const emit = defineEmits<{ change: [] }>();
const { toast } = useToast();
const theme = makeHmxGridTheme();

const gridApi = ref<GridApi | null>(null);
function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}
function currentRow(): Tqmyl02 | null {
  return (gridApi.value?.getSelectedRows()[0] as Tqmyl02 | undefined) ?? null;
}

/* ---------- UCSelectNKGZ：钢种分类字典（colCSgClassCode 原 SteelType 格式化器） ---------- */
const kvSteelType = ref<{ label: string; value: string }[]>([]);
async function loadSteelType() {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList("A0100:STEEL_TYPE")) ?? [];
    kvSteelType.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}
const steelTypeLabel = (code?: string | null) => (code && kvSteelType.value.find((o) => o.value === code)?.label) || "";

/* 明细列（按 VisibleIndex 0/1 + 隐藏 8 列） */
const colDefs = (): ColDef[] => [
  { field: "cSgSign", headerName: "钢种牌号", width: 130 },
  { field: "cSgStd", headerName: "执行标准", width: 150 },
  { field: "id", headerName: "主键", width: 150, hide: true },
  { field: "creator", headerName: "创建人", width: 90, hide: true },
  { field: "createTime", headerName: "创建时间", width: 150, hide: true },
  { field: "lastModifier", headerName: "最后修改人", width: 100, hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", width: 150, hide: true },
  { field: "cTqmyl01Id", headerName: "冶炼工艺要点ID", width: 150, hide: true },
  { field: "cGyCode", headerName: "冶炼工艺要点编号", width: 140, hide: true },
  { field: "selected", headerName: "选择", width: 70, hide: true },
];
const columns = colDefs();
function getRowId(p: { data: Tqmyl02 }) {
  return String(p.data.id ?? "");
}

/* ---------- UCSelectNKGZ.GetData：三路合成候选 ---------- */
/** 选择器候选行：Tqmyl02 落库字段 + UCSelectNKGZ 查询用的钢种分类/合成编码 */
type SelectRow = Tqmyl02 & { cSgClassCode?: string | null; cStdSgCode?: string | null };
type Opt = { label: string; value: number; row: SelectRow };
const options = ref<Opt[]>([]);
const picked = ref<number | null>(null);
const loadingOpts = ref(false);

async function loadOptions() {
  loadingOpts.value = true;
  try {
    const [tpa6s, nkgz, pairs] = await Promise.all([
      tqmtpa6Api.query({}),
      tqm1000Api.getTqm1000List(),
      tqmylApi.queryAllSGSign(),
    ]);
    const a = tpa6s ?? [];
    const b = nkgz ?? [];
    const nkBySgCode = new Map(b.map((w) => [w.cSgCode ?? "", w]));

    // ① 标准牌号 ∩ 内控钢种：牌号取内控码
    const joined: SelectRow[] = a
      .filter((x) => nkBySgCode.has(x.cSgSign ?? ""))
      .map((x) => {
        const nk = nkBySgCode.get(x.cSgSign ?? "");
        return {
          cSgStd: x.cSgStd,
          cSgSign: nk?.cSgCodeNk,
          cSgClassCode: x.cSgClassCode,
          cStdSgCode: `${x.cSgStd ?? ""}${nk?.cSgCodeNk ?? ""}`,
        };
      });
    // ② 内控钢种里没有的标准牌号：原样保留
    const rest: SelectRow[] = a.filter((x) => !nkBySgCode.has(x.cSgSign ?? ""));
    // ③ 已在工艺要点里出现、且不属上面两批的 (牌号,标准) 对
    const used = new Set<string>();
    for (const x of joined) used.add(`${x.cSgSign}|${x.cSgStd}`);
    for (const x of rest) used.add(`${x.cSgSign}|${x.cSgStd}`);
    const fromYlgy: SelectRow[] = (pairs ?? [])
      .map((p: SgStdSignPair) => ({
        cSgStd: p.sgStd ?? p.item2 ?? null,
        cSgSign: p.sgSign ?? p.item1 ?? null,
      }))
      .filter((x) => !!x.cSgSign && !!x.cSgStd && !used.has(`${x.cSgSign}|${x.cSgStd}`))
      .map((x) => ({ ...x, cStdSgCode: `${x.cSgStd}${x.cSgSign}` }));

    const all = [...joined, ...rest, ...fromYlgy];
    // 选项文案：标准 · 牌号 · 钢种分类（原 colCSgClassCode 走 SteelType 字典）
    options.value = all.map((row, i) => ({
      label: [row.cSgStd, row.cSgSign, steelTypeLabel(row.cSgClassCode)].filter(Boolean).join(" · "),
      value: i,
      row,
    }));
    picked.value = null;
  } catch {
    /* 拦截层已 toast */
    options.value = [];
  } finally {
    loadingOpts.value = false;
  }
}

watch(
  () => props.tqmyl01,
  () => {
    if (!props.editable) return;
    picked.value = null;
    void Promise.all([loadSteelType(), loadOptions()]);
  },
  { immediate: true },
);

/* ---------- 按钮（原 btnAdd_Click / btnRemove_Click） ---------- */
function onAdd() {
  if (!props.tqmyl01) return;
  const opt = options.value.find((o) => o.value === picked.value);
  if (!opt) {
    toast("请先选择标准牌号", 2500, "warn");
    return;
  }
  props.rows.push({
    id: NextStrId(),
    cGyCode: props.tqmyl01.cCode,
    cSgSign: opt.row.cSgSign,
    cSgStd: opt.row.cSgStd,
    cTqmyl01Id: props.tqmyl01.id,
  });
  picked.value = null;
  emit("change");
  requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
}

function onRemove() {
  const row = currentRow();
  if (!row) return;
  const i = props.rows.indexOf(row);
  if (i >= 0) props.rows.splice(i, 1);
  emit("change");
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <!-- dataLayoutControl1：标签「钢种标准」+ UCSelectNKGZ -->
    <div v-if="props.editable" class="flex h-9 shrink-0 items-center gap-1.5 border-b border-border/60 px-2">
      <label class="w-16 shrink-0 text-xs text-muted-foreground">钢种标准</label>
      <Select
        v-model="picked"
        :options="options"
        :filter="true"
        show-clear
        option-label="label"
        option-value="value"
        placeholder="选择标准牌号"
        :loading="loadingOpts"
        class="min-w-0 flex-1"
      />
    </div>

    <!-- stackPanel1：添加 / 删除 -->
    <div v-if="props.editable" class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd"> <IconPlus class="h-3 w-3" />添加 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onRemove">
        <IconTrash class="h-3 w-3" />删除
      </Button>
    </div>

    <!-- gridControl1：Tqmyl02 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="columns"
        :row-data="props.rows"
        :get-row-id="getRowId"
        :row-selection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :suppress-column-virtualisation="true"
        :pagination="false"
        :animate-rows="false"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>
  </div>
</template>
