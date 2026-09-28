<script setup lang="ts">
/** 对应 AE0004 文档知识库（模块二 设备台账 · 附录 B5 版式 L1 列表 + 右栏预览）
 *  接口：docApi.page（POST /eam/doc/listPage）/ save（/doc/save，有 id 即改）/ remove（/doc/remove）
 *        + equipmentApi.list（设备候选与外键翻译）+ exportRows("doc")
 *  演示要点：**资料要能落到设备上**，所以右栏不是「文档详情」而是**按文档信息生成的占位图框**——
 *        标题栏里的图号、名称、设计单位就是行里的字段，客户读到的信息量等同于翻一份纸质图册。
 *        不套 `ListPage`：预览面板需要「选中某行 → 右栏换内容」这个钩子，而 spec 骨架刻意不提供
 *        自定义动作钩子（见 ../../listTypes.ts 文件头），本页就自己接表格。
 *  待接入：文件上传与真实预览（mock 侧 `TechDoc` 只有元信息，没有文件服务）。 */
import { computed, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent, RowClickedEvent } from "ag-grid-community";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { docApi, equipmentApi, exportRows } from "@/api/equipment";
import type { Equipment, TechDoc } from "@/api/equipment/types";
import Pager from "../../Pager.vue";
import DetailDialog from "../../DetailDialog.vue";
import FormDialog from "../../FormDialog.vue";
import { actionRenderer, applyResult, rowId } from "../../rowActions";
import { dashFmt, dayFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { EditField } from "../../listTypes";

const TYPES = ["图纸", "说明书", "操作SOP", "故障案例"];

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { eqName, ready } = useNameMaps();

const equips = ref<Equipment[]>([]);

/* ── 查询条件 ─────────────────────────────────────────────────────────── */
const keyword = ref("");
const type = ref("");
const eqId = ref("");

const rows = ref<TechDoc[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);
/** 选中一行即右栏预览；查询后原选中项可能不在结果里，所以每次重查都清掉 */
const picked = ref<TechDoc | null>(null);

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    const q: Record<string, any> = { currentPage: page.value, pageSize: pageSize.value };
    if (keyword.value.trim()) q.keyword = keyword.value.trim();
    if (type.value) q.type = type.value;
    const hit = equips.value.find((e) => `${e.name}（${e.model}）` === eqId.value);
    if (hit) q.eqId = hit.id;
    const res = await docApi.page(q);
    rows.value = res?.rows ?? [];
    total.value = res?.total ?? rows.value.length;
    picked.value = rows.value[0] ?? null;
  } catch {
    /* 拦截层已 toast */
  }
  querying.value = false;
}

function search() {
  page.value = 1;
  void query();
}

function reset() {
  keyword.value = "";
  type.value = "";
  eqId.value = "";
  page.value = 1;
  void query();
}

function onPage(p: number, size: number) {
  page.value = p;
  pageSize.value = size;
  void query();
}

onMounted(async () => {
  await query();
  try {
    equips.value = (await equipmentApi.list()) ?? [];
  } catch {
    /* 拦截层已 toast；候选空只影响设备筛选，列表照常能查 */
  }
});

watch(ready, (on) => {
  if (on) void query();
});

const summary = computed(() => {
  const byType = new Map<string, number>();
  for (const r of rows.value) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
  const text = [...byType.entries()].map(([k, v]) => `${k} ${v}`).join(" · ");
  return `共 ${total.value} 份 · 本页 ${text}`;
});

/* ── 弹窗：登记/编辑、删除确认、元信息 ─────────────────────────────────── */
const formOpen = ref(false);
const formRow = ref<Record<string, any> | null>(null);
const delRow = ref<TechDoc | null>(null);
const infoOpen = ref(false);

const editFields = computed<EditField[]>(() => [
  { key: "name", label: "文档名称", kind: "input", placeholder: "如：F4 精轧机机械安装图（总装）", full: true },
  { key: "type", label: "文档类型", kind: "select", options: TYPES },
  {
    key: "eqId",
    label: "归属设备",
    kind: "select",
    options: equips.value.map((e) => `${e.name}（${e.model}）`),
    valueMap: Object.fromEntries(equips.value.map((e) => [`${e.name}（${e.model}）`, e.id])),
    placeholder: "选设备",
  },
  { key: "author", label: "编制 / 厂商", kind: "input", placeholder: "如：西门子VAI" },
  { key: "at", label: "发布日期", kind: "date", placeholder: "发布日期" },
  { key: "size", label: "文件大小", kind: "input", placeholder: "如：18.4 MB" },
]);

function openEdit(row: TechDoc | null) {
  formRow.value = row ? { ...row } : null;
  formOpen.value = true;
}

async function removeDoc() {
  const id = rowId(delRow.value);
  delRow.value = null;
  if (!id) return;
  try {
    applyResult(await docApi.remove(id), "文档已删除", toast);
  } catch {
    return; // 拦截层已 toast
  }
  void query();
}

const colDefs = computed<ColDef[]>(() => [
  { field: "id", headerName: "文档编号", width: 108 },
  { field: "name", headerName: "文档名称", minWidth: 220, flex: 1 },
  { field: "type", headerName: "类型", width: 100, sortable: false, cellRenderer: tagRenderer() },
  { field: "eqId", headerName: "归属设备", minWidth: 170, valueFormatter: (p) => eqName(p.value) },
  { field: "author", headerName: "编制 / 厂商", minWidth: 120, width: 140, valueFormatter: dashFmt },
  { field: "at", headerName: "发布日期", width: 108, valueFormatter: dayFmt },
  { field: "size", headerName: "大小", width: 92 },
  {
    colId: "actions",
    headerName: "操作",
    width: 112,
    sortable: false,
    pinned: "left",
    cellRenderer: actionRenderer([
      { label: "编辑", onClick: (row) => openEdit(row as TechDoc) },
      { label: "删除", onClick: (row) => (delRow.value = row as TechDoc) },
    ]),
  },
]);

function onRowClick(e: RowClickedEvent) {
  picked.value = e.data as TechDoc;
}

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

async function doExport() {
  applyResult(await exportRows("doc"), "导出任务已提交", toast);
}
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 查询条件区（3 个条件 → 独立条件区 + 按钮行，见 ui-rules §6） -->
      <div class="shrink-0 border-b border-border/60 px-3 py-2">
        <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">关键词</label>
            <InputText
              v-model="keyword"
              placeholder="文档名称 / 编制单位"
              class="min-w-0 flex-1"
              @keydown.enter="search()"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">类型</label>
            <Select v-model="type" :options="TYPES" show-clear placeholder="全部类型" class="min-w-0 flex-1" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">归属设备</label>
            <Select
              v-model="eqId"
              :options="equips.map((e) => `${e.name}（${e.model}）`)"
              show-clear
              filter
              placeholder="全部设备"
              class="min-w-0 flex-1"
            />
          </div>
        </div>
      </div>

      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
          <IconRotateClockwise class="h-3 w-3" />重置
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="search()">
          <IconSearch class="h-3 w-3" />查询
        </Button>
        <Button class="shrink-0 whitespace-nowrap" @click="openEdit(null)"> 登记文档 </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="doExport"> 导出 </Button>
        <span class="ml-auto text-xs text-muted-foreground">{{ summary }}</span>
      </div>

      <div class="min-h-0 flex-1 overflow-hidden px-1 py-1">
        <AgGridVue
          class="hmx-ag-grid h-full w-full"
          :theme="theme"
          :column-defs="colDefs"
          :row-data="rows"
          :pagination="false"
          @first-data-rendered="onFirstData"
          @row-click="onRowClick"
          @row-dblclick="infoOpen = true"
        />
      </div>

      <Pager :total="total" :page="page" :page-size="pageSize" @change="onPage" />
    </div>

    <!-- 右栏：预览。图框与标题栏的文字全部取自行数据，不是贴一张静态图 -->
    <aside class="flex w-96 shrink-0 flex-col border-l border-border/60">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-3">
        <span class="truncate text-xs text-muted-foreground">{{ picked ? picked.name : "预览" }}</span>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div v-if="!picked" class="text-xs text-muted-foreground">点左侧任意一行，这里出它的预览。</div>
        <template v-else>
          <div class="relative overflow-hidden rounded border border-border/60 bg-card">
            <svg viewBox="0 0 320 220" class="block w-full" role="img" :aria-label="picked.name">
              <rect x="6" y="6" width="308" height="208" fill="none" stroke="currentColor" stroke-opacity=".35" />
              <rect
                x="14"
                y="14"
                width="292"
                height="160"
                fill="none"
                stroke="currentColor"
                stroke-opacity=".2"
                stroke-dasharray="4 3"
              />
              <text x="160" y="92" text-anchor="middle" font-size="11" fill="currentColor" fill-opacity=".55">
                {{ picked.type }}占位图框
              </text>
              <text x="160" y="110" text-anchor="middle" font-size="9" fill="currentColor" fill-opacity=".4">
                演示环境不接文件服务
              </text>
              <!-- 标题栏：纸质图册上「图号 / 名称 / 编制 / 日期」四格，这里逐格取行里的值 -->
              <line x1="14" y1="180" x2="306" y2="180" stroke="currentColor" stroke-opacity=".35" />
              <line x1="120" y1="180" x2="120" y2="214" stroke="currentColor" stroke-opacity=".35" />
              <line x1="216" y1="180" x2="216" y2="214" stroke="currentColor" stroke-opacity=".35" />
              <text x="20" y="196" font-size="9" fill="currentColor" fill-opacity=".65">{{ picked.id }}</text>
              <text x="20" y="209" font-size="8" fill="currentColor" fill-opacity=".45">图号</text>
              <text x="126" y="196" font-size="9" fill="currentColor" fill-opacity=".65">{{ picked.author }}</text>
              <text x="126" y="209" font-size="8" fill="currentColor" fill-opacity=".45">编制 / 厂商</text>
              <text x="222" y="196" font-size="9" fill="currentColor" fill-opacity=".65">{{ picked.at }}</text>
              <text x="222" y="209" font-size="8" fill="currentColor" fill-opacity=".45">发布日期</text>
            </svg>
          </div>

          <dl class="mt-3 space-y-1.5">
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">文档名称</dt>
              <dd class="min-w-0 break-words text-right text-body">{{ picked.name }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">类型</dt>
              <dd class="text-body">{{ picked.type }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">归属设备</dt>
              <dd class="min-w-0 truncate text-right text-body">{{ eqName(picked.eqId) }}</dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-xs text-muted-foreground">文件大小</dt>
              <dd class="text-body tabular-nums">{{ picked.size }}</dd>
            </div>
          </dl>

          <div class="mt-3 flex gap-2">
            <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="openEdit(picked)"> 编辑 </Button>
            <Button variant="text" class="shrink-0 whitespace-nowrap" @click="infoOpen = true"> 元信息 </Button>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">
            接入文件服务后，这一栏换成图纸/PDF 的真实预览与在线批注；现在图框里的四格信息就是台账里的那一行。
          </p>
        </template>
      </div>
    </aside>

    <DetailDialog
      v-model:open="infoOpen"
      title="文档元信息"
      :data="picked"
      :sections="[
        {
          title: '台账字段',
          fields: [
            { label: '文档编号', from: 'id' },
            { label: '文档名称', from: 'name' },
            { label: '类型', from: 'type' },
            { label: '归属设备', from: 'eqName' },
            { label: '编制 / 厂商', from: 'author' },
            { label: '发布日期', from: 'at' },
            { label: '文件大小', from: 'size' },
          ],
        },
      ]"
    />

    <FormDialog
      v-model:open="formOpen"
      :title="formRow ? '编辑文档' : '登记文档'"
      :fields="editFields"
      :row="formRow"
      :submit="(p) => docApi.save(p)"
      ok-msg="文档已登记"
      @done="query()"
    />

    <Dialog
      :visible="!!delRow"
      modal
      header="删除文档"
      :style="{ width: 'min(24rem, calc(100vw - 2rem))' }"
      @update:visible="delRow = null"
    >
      <p class="text-body">
        确定删除「{{ delRow?.name }}」？删除后这台设备的随机资料里就没有它了，台账与预览都会同步少一条。
      </p>
      <template #footer>
        <Button label="取消" variant="outlined" @click="delRow = null" />
        <Button label="删除" severity="contrast" autofocus @click="removeDoc" />
      </template>
    </Dialog>
  </div>
</template>
