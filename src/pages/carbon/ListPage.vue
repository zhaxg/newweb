<script setup lang="ts">
/**
 * 碳域通用列表页骨架（spec 驱动，见 ./listTypes.ts）。
 *
 * 一个文件把 ui-rules 的布局纪律写死一次，48 个页面不再各抄一遍：
 *  - 查询条件 **≤2 个**：与按钮同行、不写 label、靠 placeholder（§6）；
 *  - 查询条件 **≥3 个**：独立 `grid grid-cols-6` 条件区 + 下一行 `h-9` 按钮条（照 LIMS/QL3000）；
 *    日期范围占 `col-span-2`；
 *  - **凡有按钮的一行统一 `h-9`**，按钮靠左、表格统计靠右 `ml-auto`（§6）；
 *  - 表格 `hmx-ag-grid` + `makeHmxGridTheme()` + `autoSizeOnFirstData`，`:pagination="false"`
 *    （分页是服务端的，由下方 CarbonPager 负责——见它的文件头说明）；
 *  - 每个 `<Dialog>` 都标了 autofocus（R5）。
 */
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { IconDownload, IconPlus, IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { useToast } from "@/composables/useToast";
import CarbonPager from "./CarbonPager.vue";
import DetailDialog from "./DetailDialog.vue";
import EditDialog from "./EditDialog.vue";
import { actionRenderer, rowId, seqRenderer } from "./rowActions";
import type { ListPageSpec } from "./listTypes";

const props = defineProps<{ spec: ListPageSpec }>();

const { toast } = useToast();
const router = useRouter();
const theme = makeHmxGridTheme();

const spec = computed(() => props.spec);
/** 条件数 ≥3 才拆成独立条件区 + 按钮行（ui-rules §6） */
const multiQuery = computed(() => spec.value.query.length >= 3);

/* ── 查询条件 ─────────────────────────────────────────── */
const model = reactive<Record<string, any>>({});
for (const f of props.spec.query) model[f.key] = f.kind === "range" ? null : "";

const pad2 = (n: number) => String(n).padStart(2, "0");
const fmt = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;

function buildParams(): Record<string, any> {
  const p: Record<string, any> = { currentPage: page.value, pageSize: pageSize.value };
  for (const f of spec.value.query) {
    const v = model[f.key];
    if (f.kind === "range") {
      if (v?.[0]) p.startTime = fmt(v[0]);
      if (v?.[1]) p.endTime = fmt(v[1]);
      continue;
    }
    if (f.kind === "date") {
      if (v) p[f.key] = f.as === "year" ? String((v as Date).getFullYear()) : fmt(v);
      continue;
    }
    if (f.kind === "range" && f.as === "year" && v?.[0]) {
      p[f.key] = String((v[0] as Date).getFullYear());
      continue;
    }
    const s = typeof v === "string" ? v.trim() : v;
    if (s !== "" && s !== null && s !== undefined) p[f.key] = f.valueMap?.[String(s)] ?? s;
  }
  return p;
}

const rows = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    const res = await spec.value.fetch(buildParams());
    rows.value = res?.rows ?? [];
    total.value = res?.total ?? rows.value.length;
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function reset() {
  for (const f of spec.value.query) model[f.key] = f.kind === "range" ? null : "";
  page.value = 1;
  query();
}

function onPage(p: number, size: number) {
  page.value = p;
  pageSize.value = size;
  query();
}

onMounted(query);

function onExport() {
  void spec.value.exportFn?.(buildParams());
  toast("导出待接入", 2000, "warn");
}

function onExtra(label: string) {
  toast(`${label}待接入`, 2000, "warn");
}

/* ── 行内动作 ─────────────────────────────────────────── */
const detailOpen = ref(false);
const detailData = ref<Record<string, any> | null>(null);
const editOpen = ref(false);
const editRow = ref<Record<string, any> | null>(null);
const delOpen = ref(false);
const delRow = ref<Record<string, any> | null>(null);

async function openDetail(row: any) {
  if (!row) return;
  if (spec.value.detailFetch) {
    try {
      detailData.value = await spec.value.detailFetch(rowId(row) ?? "");
    } catch {
      return; // 拦截层已 toast
    }
  } else {
    detailData.value = row;
  }
  detailOpen.value = true;
}

function openEdit(row: any) {
  editRow.value = row ?? null;
  editOpen.value = true;
}

function openDelete(row: any) {
  delRow.value = row ?? null;
  delOpen.value = true;
}

async function confirmDelete() {
  const id = rowId(delRow.value);
  if (spec.value.deleteFn && id != null) {
    try {
      await spec.value.deleteFn(String(id));
    } catch {
      return;
    }
  }
  delOpen.value = false;
  toast("删除成功", 2000, "success");
}

const rowActions = computed(() => {
  const acts = spec.value.actions ?? [];
  if (!acts.length) return [];
  return acts.map((a) => ({
    label: a.label,
    onClick: (row: any) => {
      if (a.kind === "detail") void openDetail(row);
      else if (a.kind === "edit") openEdit(row);
      else if (a.kind === "delete") openDelete(row);
      else if (a.kind === "link" && a.to) void router.push(a.to);
      else toast(`${a.label}待接入`, 2000, "warn");
    },
  }));
});

const colDefs = computed<ColDef[]>(() => {
  const seqCol: ColDef = { colId: "seq", headerName: "序号", width: 64, valueGetter: seqRenderer, sortable: false };
  const acts = rowActions.value;
  const actionCol: ColDef | undefined = acts.length
    ? {
        colId: "actions",
        headerName: "操作",
        width: Math.max(90, acts.length * 78),
        sortable: false,
        cellRenderer: actionRenderer(acts),
      }
    : undefined;
  return [...(spec.value.noSeq ? [] : [seqCol]), ...spec.value.columns, ...(actionCol ? [actionCol] : [])];
});

const summaryText = computed(() => {
  const s = spec.value.summary;
  if (typeof s === "function") return s({ total: total.value, rows: rows.value });
  return s ?? `共 ${total.value} 条`;
});

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件 ≥3 个：独立条件区（grid-cols-6，日期范围 col-span-2） -->
    <div v-if="multiQuery" class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div
          v-for="f in spec.query"
          :key="f.key"
          class="flex min-w-0 items-center gap-1.5"
          :class="f.kind === 'range' ? 'col-span-2' : ''"
        >
          <label :class="[spec.queryLabelWidth ?? 'w-16', 'shrink-0 text-xs text-muted-foreground']">{{
            f.label
          }}</label>
          <InputText
            v-if="f.kind === 'input'"
            v-model="model[f.key]"
            :placeholder="f.placeholder"
            class="min-w-0 flex-1"
            @keydown.enter="query"
          />
          <Select
            v-else-if="f.kind === 'select'"
            v-model="model[f.key]"
            :options="f.options ?? []"
            show-clear
            :placeholder="f.placeholder ?? '请选择'"
            class="min-w-0 flex-1"
          />
          <DatePicker
            v-else-if="f.kind === 'date'"
            v-model="model[f.key]"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            :placeholder="f.placeholder"
            class="min-w-0 flex-1"
          />
          <DatePicker
            v-else
            v-model="model[f.key]"
            selection-mode="range"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-time
            hour-format="24"
            show-icon
            :placeholder="f.placeholder ?? '开始时间'"
            class="min-w-0 flex-1"
          />
        </div>
      </div>
    </div>

    <!-- 工具栏 h-9：按钮靠左、统计靠右（条件 ≤2 时条件与按钮同行） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <!-- 条件 ≤2：与按钮同行，按 spec 原顺序渲染（不按控件类型分组，否则会打乱线上字段次序） -->
      <template v-if="!multiQuery" v-for="f in spec.query" :key="f.key">
        <InputText
          v-if="f.kind === 'input'"
          v-model="model[f.key]"
          :placeholder="f.placeholder ?? f.label"
          class="w-44 shrink-0"
          @keydown.enter="query"
        />
        <Select
          v-else-if="f.kind === 'select'"
          v-model="model[f.key]"
          :options="f.options ?? []"
          show-clear
          :placeholder="f.placeholder ?? f.label"
          class="w-40 shrink-0"
        />
        <DatePicker
          v-else
          v-model="model[f.key]"
          :selection-mode="f.kind === 'range' ? 'range' : undefined"
          :manual-input="false"
          date-format="yy-mm-dd"
          :show-time="f.kind === 'range'"
          show-icon
          :placeholder="f.placeholder ?? f.label"
          class="w-56 shrink-0"
        />
      </template>

      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
        <IconRotateClockwise class="h-3 w-3" />重置
      </Button>
      <Button v-if="spec.toolbar?.add" variant="outlined" class="shrink-0 whitespace-nowrap" @click="openEdit(null)">
        <IconPlus class="h-3 w-3" />新增
      </Button>
      <Button
        v-for="b in spec.toolbar?.extraButtons ?? []"
        :key="b"
        variant="outlined"
        class="shrink-0 whitespace-nowrap"
        @click="onExtra(b)"
      >
        {{ b }}
      </Button>
      <Button v-if="spec.toolbar?.export" variant="outlined" class="shrink-0 whitespace-nowrap" @click="onExport">
        <IconDownload class="h-3 w-3" />导出
      </Button>

      <span class="ml-auto text-xs text-muted-foreground">{{ summaryText }}</span>
    </div>

    <!-- 表格 -->
    <div class="min-h-0 flex-1 overflow-hidden">
      <AgGridVue
        class="hmx-ag-grid h-full w-full"
        :theme="theme"
        :column-defs="colDefs"
        :row-data="rows"
        :pagination="false"
        @first-data-rendered="onFirstData"
      />
    </div>

    <CarbonPager :total="total" :page="page" :page-size="pageSize" @change="onPage" />

    <DetailDialog v-if="spec.detail" v-model:open="detailOpen" :sections="spec.detail.sections" :data="detailData" />

    <EditDialog
      v-if="spec.edit"
      v-model:open="editOpen"
      :title="spec.edit.title"
      :fields="spec.edit.fields"
      :row="editRow"
      :write-fn="spec.writeFn"
      @done="query"
    />

    <Dialog v-model:visible="delOpen" modal header="删除" :style="{ width: 'min(24rem, calc(100vw - 2rem))' }">
      <div class="text-body py-2">是否确定删除该条记录？</div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="delOpen = false" />
        <Button label="删除" severity="danger" autofocus @click="confirmDelete" />
      </template>
    </Dialog>
  </div>
</template>
