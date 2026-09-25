<script setup lang="ts">
/** 对应 FrmMS1040（自定义 PLC 点位展示内容设计，2 菜单共用）：DDH.Winforms.SMS.Forms.FrmMS1040
 *  已接入：frmMS1040Api.queryPLCPointInfo（查询：产线/机台校验 → 点位清单 + 展示区加载，原 btnQuery_Click）/
 *          uCCustomPLCPointShowInfoApi.query（展示项加载，原 LoadAndShowPLCPointInfo）/
 *          uCCustomPLCPointShowInfoApi.save（保存：保存展示布局 → 重查点位 + 重载展示，原 SaveShowPLCPointInfo 链路）/
 *          tPa1000Api.queryLines+queryMachine（产线只读 code-name；机台变更自动查询；Load 默认选中首机台后自动查询
 *            ——照 ucLine1→ucMachine1.SelectedIndex=0→btnQuery 链）/
 *          添加固定内容（确认文案照抄）+ 网格行拖入展示区（AG Grid rowDrag + addRowDropZone 近似原 GridViewDragDropHelper）
 *  待接入：uCCustomPLCPointShowInfoApi.getPointInfoFromRedis（swagger 未生成，DisplayOnly 定时刷新/键盘取值链路）；
 *          展示项拖动改位已迁（HTML5 拖放更新 nPointX/nPointY，随保存提交）
 *  cQueryString：JSON {PlantCode, LineCode}（useMenuQuery；缺参照 C# 文案 toast）
 *  分栏：原 gridControl Dock=Left + splitterControl1 + groupBox(Fill) → 左右 Splitter；groupBox 标题照 ctor 全文
 *  列集：5 可见 + 32 隐藏（extract FrmMS1040ViewDto_PLCPointInfo；实体纠偏：CMachineCode→机台、CUnit→点位采集值单位、
 *        审计→最后更新人/最后更新时间）；原 gridView OptionsBehavior.Editable=false → 全列只读
 *  字段桥接：extract PascalCase → 后端 camelCase（bridge 双写） */
import { nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconDeviceFloppy, IconPlus, IconSearch } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type {
  ColDef,
  GridApi,
  GridReadyEvent,
  RowDragEndEvent,
  ValueGetterParams,
  ValueSetterParams,
} from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { useMenuQuery } from "@/lib/menuQuery";
import { useToast } from "@/composables/useToast";
import { NextStrId } from "@/lib/yitIdHelper";
import { frmMS1040Api, tPa1000Api, uCCustomPLCPointShowInfoApi } from "@/api/mes4ddh/sms.swagger";

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

/** 点位用途列（原 RdbUseTypeEnumFormatter） */
const USAGE_FMT: Record<string, string> = {
  F: "投料",
  O: "开始/结束/产出/自定义实现",
  P: "工参",
  M: "广播",
  "0": "投料",
  "10": "开始/结束/产出/自定义实现",
  "20": "工参",
  "30": "广播",
};
const usageFmt = (p: { value?: unknown }) => {
  const v = p.value == null ? "" : String(p.value);
  return v ? (USAGE_FMT[v] ?? v) : "";
};

const colDefs = ref<ColDef[]>(
  bridge([
    // 原 PLCAddr 列开行拖拽（rowDrag handle），拖入右侧展示区
    { field: "PLCAddr", headerName: "PLC地址", width: 140, rowDrag: true },
    { field: "PLCDesc", headerName: "PLC描述", width: 160 },
    { field: "CTagUsage", headerName: "点位用途", width: 150, valueFormatter: usageFmt },
    { field: "CLineName", headerName: "产线名称", width: 120 },
    { field: "CMachineName", headerName: "机台名称", width: 120 },
    { field: "Id", headerName: "主键", width: 120, hide: true },
    { field: "CFactoryCode", headerName: "工厂", width: 120, hide: true },
    { field: "CFactoryName", headerName: "工厂名称", width: 120, hide: true },
    { field: "CLineCode", headerName: "产线", width: 120, hide: true },
    { field: "CMachineCode", headerName: "机台", width: 120, hide: true },
    { field: "CStationNo", headerName: "站点编码", width: 120, hide: true },
    { field: "CStationDesc", headerName: "站点描述", width: 120, hide: true },
    { field: "CMesTag", headerName: "MES点位", width: 120, hide: true },
    { field: "CSmnsTag", headerName: "自动化点位", width: 130, hide: true },
    { field: "CTagNm", headerName: "点位描述", width: 120, hide: true },
    { field: "CTagType", headerName: "点位类型", width: 120, hide: true },
    { field: "CValueStyle", headerName: "数据类型", width: 120, hide: true },
    { field: "CFunction", headerName: "点位功能", width: 120, hide: true },
    { field: "CTableField", headerName: "存储位置", width: 120, hide: true },
    { field: "NEnable", headerName: "是否启用", width: 100, hide: true },
    { field: "CUnit", headerName: "点位采集值单位", width: 140, hide: true },
    { field: "NCovMom", headerName: "倍率", width: 90, hide: true },
    { field: "NDecimals", headerName: "修约", width: 90, hide: true },
    { field: "NAddRecord", headerName: "是否记录日志", width: 130, hide: true },
    { field: "CBackup", headerName: "备注", width: 120, hide: true },
    { field: "CTimestamp", headerName: "时间戳", width: 150, hide: true },
    { field: "Creator", headerName: "创建人", width: 112, hide: true },
    { field: "CreateTime", headerName: "创建时间", width: 150, hide: true },
    { field: "LastModifier", headerName: "最后更新人", width: 112, hide: true },
    { field: "LastModifyTime", headerName: "最后更新时间", width: 150, hide: true },
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
/** 展示区项（UCCustomPLCPointShowInfoDto：ctext/cName/nPointX/nPointY/cPlcPointConfigId/cEnable） */
const showItems = ref<Array<Record<string, unknown>>>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>();
const showPanel = ref<HTMLElement | null>(null);

const lineCode = ref("");
const lineText = ref("");
const machineCode = ref<string | null>(null);
const machineOptions = ref<{ label: string; value: string }[]>([]);
const fixedValue = ref("");
/** 面板内标签拖动暂存 */
const dragItemId = ref<string | null>(null);

const qsFormat = '{"PlantCode":null,"LineCode":null}';
function parseQs(): { LineCode?: string } | null {
  if (!qsRaw) {
    toast(
      `界面必须配置注入参数，MES程序版本可能已严重落后，请退出并重新打开MES程序！\n若问题仍未得到解决，请联系管理员！\n界面注入参数格式为：'${qsFormat}'`,
      4000,
      "warn",
    );
    return null;
  }
  try {
    return JSON.parse(qsRaw) as { LineCode?: string };
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
    const n = map.get(lineCode.value);
    lineText.value = n ? `${lineCode.value}-${n}` : lineCode.value;
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

/** _lineCode / _machineCode getter 校验（照抄：产线不得为空 / 机台不得为空！） */
function checkedParams(): { lineCode: string; machineCode: string } | null {
  if (!lineCode.value) {
    toast("产线不得为空", 2500, "warn");
    return null;
  }
  if (!machineCode.value) {
    toast("机台不得为空！", 2500, "warn");
    return null;
  }
  return { lineCode: lineCode.value, machineCode: machineCode.value };
}

/** LoadAndShowPLCPointInfo：拉取展示布局 */
async function loadShowItems() {
  const p = checkedParams();
  if (!p) return;
  try {
    const list = (await uCCustomPLCPointShowInfoApi.query(p)) ?? [];
    showItems.value = Array.isArray(list) ? (list as Array<Record<string, unknown>>) : [];
  } catch {
    showItems.value = [];
    /* 拦截层已 toast */
  }
}

async function query() {
  const p = checkedParams();
  if (!p) return;
  querying.value = true;
  try {
    const list = (await frmMS1040Api.queryPLCPointInfo(p)) ?? [];
    rows.value = Array.isArray(list) ? list : [];
    await nextTick();
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
    await loadShowItems();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
  // 外部拖放区：网格行拖到右侧展示面板（近似原 GridViewDragDropHelper）
  nextTick(() => {
    const el = showPanel.value;
    if (!el) return;
    e.api.addRowDropZone({
      getContainer: () => el,
      onDragStop: (ev: RowDragEndEvent) => onRowDropped(ev),
    });
  });
}

/** 原 AddShowPLCPointInfoByPLCInfo：落点生成「描述:」+「描述展示值」两条标签 */
function onRowDropped(ev: RowDragEndEvent) {
  const el = showPanel.value;
  const row = ev.node.data as Record<string, unknown> | undefined;
  if (!el || !row) return;
  const rect = el.getBoundingClientRect();
  const mouse = ev.event as MouseEvent | undefined;
  const x = Math.max(0, Math.round((mouse?.clientX ?? rect.left) - rect.left));
  const y = Math.max(0, Math.round((mouse?.clientY ?? rect.top) - rect.top));
  const desc = String(row.plcDesc ?? row.PLCDesc ?? "");
  const addr = String(row.plcAddr ?? row.PLCAddr ?? "");
  const cfgId = String(row.id ?? "");
  const id1 = NextStrId();
  const w1 = Math.max(26, `${desc}:`.length * 8);
  showItems.value = [
    ...showItems.value,
    {
      id: id1,
      cLineCode: lineCode.value,
      cMachineCode: machineCode.value ?? "",
      cText: `${desc}:`,
      cName: `FiexdValue=(*^▽^*)=${id1}`,
      nPointX: x,
      nPointY: y,
      cPlcPointConfigId: cfgId,
      cEnable: true,
    },
    (() => {
      const id2 = NextStrId();
      return {
        id: id2,
        cLineCode: lineCode.value,
        cMachineCode: machineCode.value ?? "",
        cText: `${desc}展示值`,
        cName: `${addr}=(*^▽^*)=${id2}`,
        nPointX: x + w1,
        nPointY: y,
        cPlcPointConfigId: cfgId,
        cEnable: true,
      };
    })(),
  ];
}

/** btnAdd_Click：添加固定显示内容（确认文案照抄；No 也清空输入） */
function onAddFixed() {
  if (!fixedValue.value) {
    toast("禁止操作，要添加的固定显示内容不得为空！", 3000, "warn");
    return;
  }
  const ok = window.confirm(`确定添加一个值为‘${fixedValue.value}’的固定信息？`);
  if (!ok) {
    fixedValue.value = "";
    return;
  }
  const id = NextStrId();
  showItems.value = [
    ...showItems.value,
    {
      id,
      cLineCode: lineCode.value,
      cMachineCode: machineCode.value ?? "",
      cText: fixedValue.value,
      cName: "FiexdValue",
      nPointX: 10,
      nPointY: 10,
      cPlcPointConfigId: "",
      cEnable: true,
    },
  ];
  fixedValue.value = "";
}

/** btnSave_Click：SaveShowPLCPointInfo → 重查点位 + 重载展示 */
async function onSave() {
  const p = checkedParams();
  if (!p) return;
  querying.value = true;
  try {
    await uCCustomPLCPointShowInfoApi.save({
      lineCode: p.lineCode,
      machineCode: p.machineCode,
      datas: showItems.value,
    });
    toast("保存成功！", 2000, "success");
    await query();
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

/** 展示项拖动改位（原 EnableControlDrag 设计态拖拽） */
function onItemDragStart(id: string) {
  dragItemId.value = id;
}
function onPanelDrop(e: DragEvent) {
  const id = dragItemId.value;
  dragItemId.value = null;
  if (!id || !showPanel.value || !e.clientX) return;
  const rect = showPanel.value.getBoundingClientRect();
  const x = Math.max(0, Math.round(e.clientX - rect.left));
  const y = Math.max(0, Math.round(e.clientY - rect.top));
  showItems.value = showItems.value.map((it) => (it.id === id ? { ...it, nPointX: x, nPointY: y } : it));
}

function onMachineChange() {
  void query();
}

onMounted(async () => {
  const qs = parseQs();
  lineCode.value = qs?.LineCode ?? "";
  await Promise.all([loadLines(), loadMachines()]);
  // 原 ucLine1_EditValueChanged → ucMachine1.SelectedIndex = 0 → ucMachine1_EditValueChanged → 查询
  if (machineOptions.value.length) {
    machineCode.value = machineOptions.value[0].value;
    await query();
  }
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- stackPanel1：产线/机台/查询/固定显示内容/添加/保存（顺序照 Controls.Add） -->
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <label class="shrink-0 text-xs text-muted-foreground">产线</label>
      <InputText :model-value="lineText" disabled class="w-32 shrink-0" />
      <label class="shrink-0 text-xs text-muted-foreground">机台</label>
      <Select
        v-model="machineCode"
        :options="machineOptions"
        option-label="label"
        option-value="value"
        show-clear
        placeholder="请选择"
        class="w-36 shrink-0"
        @value-change="onMachineChange"
      />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <label class="shrink-0 text-xs text-muted-foreground">固定显示内容</label>
      <InputText v-model="fixedValue" placeholder="固定显示内容" class="w-40 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onAddFixed">
        <IconPlus class="h-3 w-3" />添加
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onSave">
        <IconDeviceFloppy class="h-3 w-3" />保存
      </Button>
    </div>

    <!-- 原 gridControl(Dock=Left) + splitterControl1 + groupBox1(Fill)：左右分栏 -->
    <Splitter layout="horizontal" class="min-h-0 flex-1">
      <SplitterPanel :size="45" :minSize="25" class="flex min-h-0 flex-col overflow-hidden">
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
            :row-drag-managed="false"
            @grid-ready="onGridReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :minSize="30" class="flex min-h-0 flex-col overflow-hidden">
        <!-- groupBox1：标题照 ctor 设置全文 -->
        <div class="flex min-h-0 flex-1 flex-col border border-border/60 m-2">
          <div class="flex h-8 shrink-0 items-center border-b border-border/60 px-2">
            <span class="text-xs font-medium text-muted-foreground">
              选择并拖拽需要显示的PLC点位信息到该区域内。注意：尽量将要展示的内容向左上角靠拢！
            </span>
          </div>
          <div
            ref="showPanel"
            class="relative min-h-0 flex-1 overflow-auto bg-muted/20"
            @dragover.prevent
            @drop.prevent="onPanelDrop"
          >
            <span
              v-for="it in showItems"
              :key="String(it.id)"
              draggable="true"
              class="absolute cursor-move whitespace-nowrap text-xs text-foreground"
              :style="{ left: `${Number(it.nPointX ?? 0)}px`, top: `${Number(it.nPointY ?? 0)}px` }"
              @dragstart="onItemDragStart(String(it.id))"
              >{{ it.cText }}</span
            >
            <span v-if="!showItems.length" class="absolute left-2 top-2 text-xs text-muted-foreground">
              （从左侧网格拖入点位，或用「固定显示内容」添加）
            </span>
          </div>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
