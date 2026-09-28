<script setup lang="ts">
/**
 * 设备域通用列表页骨架（spec 驱动，见 ./listTypes.ts）。
 *
 * 一个文件把 ui-rules 的布局纪律写死一次，二十多个列表页不再各抄一遍：
 *  - 查询条件 **≤2 个**：与按钮同行、不写 label、靠 placeholder（§6）；
 *  - 查询条件 **≥3 个**：独立 `grid grid-cols-6` 条件区 + 下一行 `h-9` 按钮条（照 LIMS/QL3000）；
 *    日期范围占 `col-span-2`；
 *  - **凡有按钮的一行统一 `h-9`**，按钮靠左、表格统计靠右 `ml-auto`（§6）；
 *  - 表格 `hmx-ag-grid` + `makeHmxGridTheme()` + `autoSizeOnFirstData`，`:pagination="false"`
 *    （分页是服务端的，由下方 Pager 负责——见它的文件头说明）；
 *  - 每个 `<Dialog>` 都标了 autofocus（R5）。
 *
 * 与 `src/pages/carbon/ListPage.vue` 的实质差别只有一处：**动作真的会改状态**。
 * carbon 的写操作是插桩（点了不落库），所以「删除」只需弹个成功提示；
 * 本域的派工/接单/领料/验证/结算/折算都会改 `eam` 内存态并引发跨模块联动，
 * 于是这里多了三件事：`applyResult` 统一判业务拒绝、成功后**必须重查**、
 * 动作按钮按 `shown(row)` 随状态机出现或消失。这三件都是本域骨架的核心职责，不是可选装饰。
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
import { IconPlus, IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { useToast } from "@/composables/useToast";
import { toDay, toStamp } from "./dateField";
import Pager from "./Pager.vue";
import DetailDialog from "./DetailDialog.vue";
import FormDialog from "./FormDialog.vue";
import { actionRenderer, applyResult, rowId } from "./rowActions";
import type { EditField, ListPageSpec, RowAct, ToolAct } from "./listTypes";

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

function buildParams(): Record<string, any> {
  const p: Record<string, any> = { currentPage: page.value, pageSize: pageSize.value };
  for (const f of spec.value.query) {
    const v = model[f.key];
    if (f.kind === "range") {
      // 区间固定送 startTime/endTime（mock 的 dateRange/dayRange 只认这两个键，见 mock/equipment/query.ts）
      const pick = (d: Date) => (f.as === "date" ? toDay(d) : toStamp(d));
      if (v?.[0]) p.startTime = pick(v[0]);
      if (v?.[1]) p.endTime = pick(v[1]);
      continue;
    }
    if (f.kind === "date") {
      if (!v) continue;
      p[f.key] = f.as === "year" ? String((v as Date).getFullYear()) : f.as === "date" ? toDay(v) : toStamp(v);
      continue;
    }
    const s = typeof v === "string" ? v.trim() : v;
    if (s === "" || s === null || s === undefined) continue;
    p[f.key] = f.valueMap?.[String(s)] ?? s;
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

/** 供页面外部（父组件通过 ref）触发重查：跨页联动演示时「我刚在别的页改了，这页也要立刻见到」 */
defineExpose({ reload: query });

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

/* ── 弹窗：详情 / 表单（编辑与动作共用 FormDialog）/ 确认 ─────────────── */
const detailOpen = ref(false);
const detailData = ref<Record<string, any> | null>(null);

const formOpen = ref(false);
const formState = ref<{
  title: string;
  fields: EditField[];
  row: Record<string, any> | null;
  okMsg: string;
  actionLabel: string;
  submit: (payload: Record<string, any>) => Promise<unknown>;
} | null>(null);

const confirmState = ref<{ text: string; run: () => Promise<unknown>; okMsg: string; danger: boolean } | null>(null);

function openForm(state: NonNullable<typeof formState.value>) {
  formState.value = state;
  formOpen.value = true;
}

/** 执行动作：成功才刷新（业务拒绝时列表本来就没错，重查一次只会闪） */
async function exec(run: () => Promise<unknown>, okMsg: string, refresh = true): Promise<boolean> {
  let res: unknown;
  try {
    res = await run();
  } catch {
    return false; // 拦截层已 toast
  }
  if (!applyResult(res, okMsg, toast)) return false;
  if (refresh) query();
  return true;
}

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

/** 新增/编辑：`writeFn` 收到的是**含 id 的完整 payload**（有 id 即改、无 id 即增，见 mock 的 saveRow） */
function openEdit(row: any) {
  const e = spec.value.edit;
  if (!e || !spec.value.writeFn) return;
  const id = rowId(row);
  openForm({
    title: e.title ?? (row ? "编辑" : "新增"),
    fields: e.fields,
    row,
    okMsg: "保存成功",
    actionLabel: "保存",
    submit: (payload) => spec.value.writeFn!({ ...payload, ...(id ? { id } : {}) }),
  });
}

/** 行内动作的分派全在这一处：页面 spec 只声明「有什么动作」，不各页抄一遍管道 */
async function runRowAct(a: RowAct, row: any) {
  if (a.kind === "detail") {
    void openDetail(row);
    return;
  }
  if (a.kind === "edit") {
    openEdit(row);
    return;
  }
  if (a.kind === "link" && a.to) {
    void router.push(a.to);
    return;
  }
  if (a.kind === "delete") {
    const id = rowId(row);
    if (id === undefined) {
      toast("该行没有主键，无法删除", 2400, "warn");
      return;
    }
    confirmState.value = {
      text: "是否确定删除该条记录？",
      okMsg: "删除成功",
      danger: true,
      run: () => spec.value.deleteFn!(id),
    };
    return;
  }
  if (a.kind === "stub" || !a.run) {
    toast(`${a.label}待接入`, 2000, "warn");
    return;
  }
  if (a.kind === "form") {
    openForm({
      title: a.title ?? a.label,
      fields: a.fields ?? [],
      row,
      okMsg: a.okMsg ?? "操作成功",
      actionLabel: "确定",
      submit: (payload) => a.run!(row, payload),
    });
    return;
  }
  await exec(() => a.run!(row, {}), a.okMsg ?? "操作成功", a.refresh !== false);
}

async function runToolAct(a: ToolAct) {
  if (!a.run) {
    toast(`${a.label}待接入`, 2000, "warn");
    return;
  }
  if (a.fields?.length) {
    openForm({
      title: a.label,
      fields: a.fields,
      row: null,
      okMsg: a.okMsg ?? "操作成功",
      actionLabel: "确定",
      submit: (payload) => a.run!(payload),
    });
    return;
  }
  if (a.confirm) {
    // 二次确认框的主按钮**不默认红色**：删除才要 danger，「生成本月结算单」这类推进型动作用红按钮会让客户误以为要出事
    confirmState.value = {
      text: a.confirm,
      okMsg: a.okMsg ?? "操作成功",
      danger: false,
      run: () => a.run!({}),
    };
    return;
  }
  await exec(() => a.run!({}), a.okMsg ?? "操作成功", a.refresh !== false);
}

async function runConfirm() {
  const c = confirmState.value;
  if (!c) return;
  if (await exec(c.run, c.okMsg)) confirmState.value = null;
}

function onExtra(label: string) {
  toast(`${label}待接入`, 2000, "warn");
}

const rowActions = computed(() =>
  (spec.value.actions ?? []).map((a) => ({
    label: a.label,
    shown: a.shown,
    onClick: (row: any) => void runRowAct(a, row),
  })),
);

const colDefs = computed<ColDef[]>(() => {
  const acts = rowActions.value;
  /**
   * 「操作」列钉在**最左**，并且放在数组最前面（不是靠 pinned 让 AG Grid 把它挪过去）：
   * 本域表格普遍 12~20 列，1366 宽的笔记本必出横向滚动条，而详情/编辑/删除这些按钮
   * 是每一行的落点——挂在右端就得先滚到底才点得到。放在最左还顺带解决了
   * 「第一列是编号、第二列是名称」谁先谁后都不影响操作的问题。
   */
  const actionCol: ColDef | undefined = acts.length
    ? {
        colId: "actions",
        headerName: "操作",
        width: Math.max(90, acts.length * 78),
        sortable: false,
        pinned: "left",
        cellRenderer: actionRenderer(acts),
      }
    : undefined;
  return [...(actionCol ? [actionCol] : []), ...spec.value.columns];
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
            :view-mode="f.as === 'year' ? 'year' : 'date'"
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
            :show-time="f.as !== 'date'"
            :hour-format="f.as === 'date' ? undefined : '24'"
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
          :view-mode="f.as === 'year' ? 'year' : 'date'"
          :manual-input="false"
          date-format="yy-mm-dd"
          :show-time="f.kind === 'range' && f.as !== 'date'"
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
        v-for="a in spec.toolbar?.acts ?? []"
        :key="a.label"
        variant="outlined"
        class="shrink-0 whitespace-nowrap"
        @click="runToolAct(a)"
      >
        {{ a.label }}
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

    <Pager :total="total" :page="page" :page-size="pageSize" @change="onPage" />

    <DetailDialog v-if="spec.detail" v-model:open="detailOpen" :sections="spec.detail.sections" :data="detailData" />

    <FormDialog
      v-if="formState"
      v-model:open="formOpen"
      :title="formState.title"
      :fields="formState.fields"
      :row="formState.row"
      :ok-msg="formState.okMsg"
      :action-label="formState.actionLabel"
      :submit="formState.submit"
      @done="query"
    />

    <Dialog
      v-if="confirmState"
      :visible="true"
      modal
      header="确认"
      :style="{ width: 'min(24rem, calc(100vw - 2rem))' }"
      @update:visible="confirmState = null"
    >
      <div class="text-body py-2">{{ confirmState.text }}</div>
      <template #footer>
        <Button label="取消" variant="outlined" @click="confirmState = null" />
        <Button label="确定" :severity="confirmState.danger ? 'danger' : 'primary'" autofocus @click="runConfirm" />
      </template>
    </Dialog>
  </div>
</template>
