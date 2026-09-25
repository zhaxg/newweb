<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import { IconPencil, IconPlus, IconPrinter, IconSearch, IconTrash } from "@tabler/icons-vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { printReportApi, type PrintTemplateRow } from "@/api/mes4ddh/printReport";
import { PRINT_SCHEMAS, buildSamplePayload, findPrintSchema } from "./printSchemas";
import { ensurePrintDesigner } from "./loadPrintDesigner";
import { useToast } from "@/composables/useToast";

/** 对应 FrmXtraReportTemplateManager（报表打印模板）：Hmx.WinForms.Widgets.Reportprint.FrmXtraReportTemplateManager
 *  已接入：printReportApi.queryAllTemplates / saveOrUpdateTemplate / readFromTemplate / removeTemplate（删为 web 扩展）
 *  编辑/添加 → 新窗打开 /print-designer（空布局，不进 MainLayout/页签）
 *  打印模拟数据：离屏 print-designer 加载模板 → 一条样例 setVariables → 浏览器打印（不打开设计器）
 *  数据源：./printSchemas 六类 AQN；模板体 JSON，不兼容旧 XR byte[]
 *  【偏差】不复刻 XR Ribbon；删除原为空实现，web 实现真删 */

const { toast } = useToast();
const theme = makeHmxGridTheme();
const rows = ref<PrintTemplateRow[]>([]);
const allRows = ref<PrintTemplateRow[]>([]);
const querying = ref(false);
const gridApi = ref<GridApi | null>(null);
const keyword = ref("");
const typeFilter = ref<string | null>(null);

const addOpen = ref(false);
const addAqn = ref("");
const printingMock = ref(false);
const printHostRef = ref<HTMLElement | null>(null);

const typeOptions = [{ label: "全部类型", value: "" }, ...PRINT_SCHEMAS.map((s) => ({ label: s.title, value: s.aqn }))];

const colDefs: ColDef[] = [
  { field: "id", headerName: "ID", width: 160 },
  { field: "cDataType", headerName: "数据类型", width: 220, valueFormatter: (p) => fmtType(p.value) },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "lastModifyTime", headerName: "更新时间", width: 150 },
  { field: "cComments", headerName: "说明", width: 200, flex: 1 },
  {
    field: "nTemplateType",
    headerName: "模板类型",
    width: 100,
    valueFormatter: (p) => (Number(p.value) === 2 ? "XtraReport" : String(p.value ?? "")),
  },
  { field: "creator", headerName: "创建人", width: 100 },
  { field: "lastModifier", headerName: "更新人", width: 100 },
];

function fmtType(aqn: unknown): string {
  const s = findPrintSchema(String(aqn ?? ""));
  if (s) return `${s.name}`;
  if (!aqn) return "";
  const part = String(aqn).split(",")[0] ?? "";
  return part.split(".").pop() ?? part;
}

function applyFilter() {
  const kw = keyword.value.trim().toLowerCase();
  const tf = typeFilter.value || "";
  rows.value = allRows.value.filter((r) => {
    if (tf && r.cDataType !== tf && !String(r.cDataType).includes(tf)) return false;
    if (!kw) return true;
    const hay = [r.id, r.cDataType, r.cComments, r.creator, r.lastModifier].join(" ").toLowerCase();
    return hay.includes(kw);
  });
}

function selected(): PrintTemplateRow | null {
  const list = (gridApi.value?.getSelectedRows() ?? []) as PrintTemplateRow[];
  return list[0] ?? null;
}

function onGridReady(e: GridReadyEvent) {
  gridApi.value = e.api;
}

async function onQuery() {
  querying.value = true;
  try {
    allRows.value = (await printReportApi.queryAllTemplates(2)) ?? [];
    applyFilter();
    requestAnimationFrame(() => gridApi.value?.autoSizeAllColumns());
  } finally {
    querying.value = false;
  }
}

/** 新窗打开空布局设计器（不挂 MainLayout） */
function openDesignTab(row: PrintTemplateRow | null, aqn = "") {
  const query: Record<string, string> = { design: row?.id ?? "new" };
  if (!row && aqn) query.aqn = aqn;
  const qs = new URLSearchParams(query).toString();
  window.open(`/print-designer?${qs}`, "_blank", "noopener");
}

function onAdd() {
  addAqn.value = "";
  addOpen.value = true;
}

function confirmAdd() {
  if (!addAqn.value) {
    toast("请选择数据类型", 2500, "warn");
    return;
  }
  addOpen.value = false;
  openDesignTab(null, addAqn.value);
}

function onEdit() {
  const row = selected();
  if (!row) {
    toast("请先选择一条模板", 2500, "warn");
    return;
  }
  openDesignTab(row);
}

async function onDelete() {
  const row = selected();
  if (!row) {
    toast("请先选择一条模板", 2500, "warn");
    return;
  }
  if (!window.confirm("确定删除该打印模板？")) return;
  await printReportApi.removeTemplate(row.id);
  toast("已删除", 2000, "success");
  await onQuery();
}

function waitPrintReady(el: HTMLElement, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    const done = () => resolve();
    const timer = window.setTimeout(done, timeoutMs);
    el.addEventListener(
      "ready",
      () => {
        window.clearTimeout(timer);
        done();
      },
      { once: true },
    );
    if ((el as unknown as { getTemplateData?: unknown }).getTemplateData) {
      window.clearTimeout(timer);
      done();
    }
  });
}

/** 打印模拟数据：离屏加载模板 → 样例变量 → 浏览器打印（不打开设计器） */
async function onPrintMock() {
  const row = selected();
  if (!row) {
    toast("请先选择一条模板", 2500, "warn");
    return;
  }
  const schema = findPrintSchema(row.cDataType);
  if (!schema) {
    toast("该模板数据类型未配置 schema，无法生成样例", 3000, "warn");
    return;
  }
  printingMock.value = true;
  try {
    /* 按需加载 WC：升级已挂载的离屏 <print-designer id="print-mock-host"> */
    await ensurePrintDesigner();
    await nextTick();
    const el = printHostRef.value as any;
    if (!el) {
      toast("打印宿主未就绪", 2500, "error");
      return;
    }
    await waitPrintReady(el);
    let data: Record<string, any> | null = null;
    if (row.cTemplateData) {
      try {
        data = JSON.parse(row.cTemplateData);
      } catch {
        data = null;
      }
    }
    if (!data) {
      toast("模板内容为空或非法，无法打印", 3000, "error");
      return;
    }
    el.loadTemplateData(data);
    const { variables } = buildSamplePayload(schema);
    await el.setVariables?.(variables, { merge: true });
    await el.setTestData?.(variables, { merge: true });
    await el.print?.({ mode: "browser" });
  } catch (e) {
    console.error(e);
    toast("打印取消或失败", 2500, "warn");
  } finally {
    printingMock.value = false;
  }
}

onMounted(() => {
  void onQuery();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <div class="flex h-9 shrink-0 items-center gap-1 overflow-x-auto border-b border-border/60 px-2">
      <InputText
        v-model="keyword"
        maxlength="100"
        placeholder="关键字"
        class="w-48 shrink-0"
        @keydown.enter="onQuery"
      />
      <Select
        v-model="typeFilter"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        class="w-44 shrink-0"
      />
      <Button text class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onAdd"> <IconPlus class="h-3 w-3" />添加 </Button>
      <Button text class="shrink-0 whitespace-nowrap" @click="onEdit"> <IconPencil class="h-3 w-3" />编辑 </Button>
      <Button text severity="danger" class="shrink-0 whitespace-nowrap" @click="onDelete">
        <IconTrash class="h-3 w-3" />删除
      </Button>
      <Button text class="shrink-0 whitespace-nowrap" :loading="printingMock" @click="onPrintMock">
        <IconPrinter class="h-3 w-3" />打印模拟数据
      </Button>
      <span class="ml-auto shrink-0 text-xs text-muted-foreground">报表打印模板（{{ rows.length }}）</span>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :locale-text="AG_GRID_LOCALE_CN"
        :default-col-def="hmxDefaultColDef"
        :column-defs="colDefs"
        :row-data="rows"
        :row-selection="{ mode: 'singleRow', checkboxes: true, enableClickSelection: true }"
        :pagination="false"
        :animate-rows="false"
        :loading="querying"
        @grid-ready="onGridReady"
        @first-data-rendered="autoSizeOnFirstData"
      />
    </div>

    <Dialog v-model:visible="addOpen" modal header="选择数据类型" :style="{ width: 'min(28rem, calc(100vw - 2rem))' }">
      <div class="flex flex-col gap-2 py-2">
        <label class="text-xs text-muted-foreground">打印数据源（IXtraReportDataSourceDto）</label>
        <Select
          v-model="addAqn"
          :options="typeOptions.filter((x) => x.value)"
          option-label="label"
          option-value="value"
          class="w-full"
          placeholder="请选择"
        />
        <p class="text-xs text-muted-foreground">与原类型选择器一致的 6 类 AQN；确认后在新窗打开空布局设计器。</p>
      </div>
      <template #footer>
        <Button text label="取消" @click="addOpen = false" />
        <Button label="新窗打开设计器" :disabled="!addAqn" @click="confirmAdd" />
      </template>
    </Dialog>

    <!-- 离屏打印宿主 -->
    <div
      aria-hidden="true"
      class="pointer-events-none fixed top-0 left-0 -z-50 h-[297mm] w-[210mm] overflow-hidden opacity-0"
    >
      <!-- @vue-ignore print-designer 为 Web Component -->
      <print-designer id="print-mock-host" ref="printHostRef" class="block h-full w-full" />
    </div>
  </div>
</template>
