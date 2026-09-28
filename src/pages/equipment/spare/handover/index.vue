<script setup lang="ts">
/** 对应 AS0005 离职交接折算（模块五 备品备件 · 附录 B4 第 10 幕 · 版式 L4 单据页）
 *  接口：handoverApi.candidates（GET /eam/handover/candidates）
 *        handoverApi.preview（GET /eam/handover/preview，逐件明细，只读）
 *        handoverApi.run（POST /eam/handover/run，折算落单 + 状态推进 + 归还入库流水）
 *        analysisApi.params（GET /eam/analysis/params，折算公式口径）+ exportRows("handover")
 *  演示要点：**「折算 7.56 万」这个数字要能在客户面前逐行手算出来**（B4 第 10 幕）。
 *        ① 选人即出明细：下拉里就带在册件数与预估金额，选中后逐件列「单价 × 剩余占比 = 金额」，
 *           所以金额必须来自后端的 `preview`（与 `run` 同一个行工厂），页面自己乘一遍就是造假；
 *        ② 折算是一次**状态推进**，不是删记录：寿命件转「已折算」、实物回库写归还流水、
 *           人转为离职，因此提交后要同时刷新人员名单、明细与交接单目录；
 *        ③ 单据可打印（纸面上留单价列与签字栏），历史交接单在左侧目录里可反复回看。
 *  待接入：打印走浏览器打印（新窗口渲染纸面单据，见 ../../printDoc.ts），不生成 PDF 文件。 */
import { computed, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import Button from "primevue/button";
import Select from "primevue/select";
import { IconArrowBackUp, IconPrinter, IconArchive, IconReceipt2 } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { analysisApi, exportRows, handoverApi } from "@/api/equipment";
import type { HandoverRecord } from "@/api/equipment/types";
import { applyResult } from "../../rowActions";
import { moneyFmt, numFmt, pctFmt } from "../../cells";
import { printDocument } from "../../printDoc";
import type { PrintColumn, PrintHeadItem } from "../../printDoc";

const { toast } = useToast();
const theme = makeHmxGridTheme();

type Candidate = { name: string; role: string; dept: string; records: number; total: number };
type Row = HandoverRecord["rows"][number];

const candidates = ref<Candidate[]>([]);
/** 下拉选中的是整条候选（要拿它的岗位/部门/件数），不是名字字符串 */
const person = ref<Candidate | null>(null);
const preview = ref<{ rows: Row[]; total: number }>({ rows: [], total: 0 });
const docs = ref<HandoverRecord[]>([]);
/** 从左侧目录选中的**已归档**交接单；为 null 时右屏显示的是待折算预览 */
const current = ref<HandoverRecord | null>(null);
const busy = ref(false);
const params = ref<Record<string, any>>({});

async function loadPeople() {
  candidates.value = (await handoverApi.candidates()) ?? [];
}

async function loadDocs(selectId?: string) {
  const res = await handoverApi.page({ currentPage: 1, pageSize: 50 });
  docs.value = res?.rows ?? [];
  current.value = docs.value.find((d) => d.id === selectId) ?? null;
}

onMounted(async () => {
  try {
    const [p] = await Promise.all([analysisApi.params(), loadPeople(), loadDocs()]);
    params.value = p ?? {};
  } catch {
    /* 拦截层已 toast */
  }
});

/** 换人即重算预览（只读端点，不碰库存与状态）；清空选择就退回目录视图 */
watch(person, async (p) => {
  if (!p) {
    preview.value = { rows: [], total: 0 };
    return;
  }
  current.value = null;
  try {
    preview.value = (await handoverApi.preview(p.name)) ?? { rows: [], total: 0 };
  } catch {
    preview.value = { rows: [], total: 0 };
  }
});

const inView = computed<{ settled: boolean; person: string; at: string; rows: Row[]; total: number } | null>(() => {
  if (current.value) {
    const d = current.value;
    return { settled: true, person: d.person, at: d.at, rows: d.rows, total: d.total };
  }
  const c = person.value;
  if (!c) return null;
  return { settled: false, person: c.name, at: "", rows: preview.value.rows, total: preview.value.total };
});

const roleOf = computed(() => {
  const name = inView.value?.person;
  const hit = candidates.value.find((c) => c.name === name);
  return { role: hit?.role ?? "", dept: hit?.dept ?? "" };
});

/** 单头字段：屏上的信息卡与纸面单据共用同一份，避免两处口径漂 */
const headItems = computed<PrintHeadItem[]>(() => {
  const v = inView.value;
  if (!v) return [];
  return [
    { label: "单号", value: v.settled ? (current.value?.id ?? "") : "待生成" },
    { label: "交接人", value: `${v.person}（${roleOf.value.role}）` },
    { label: "所属部门", value: roleOf.value.dept },
    { label: "在册寿命件", value: `${v.rows.length} 件` },
    { label: "折算合计", value: `${v.total.toLocaleString("zh-CN")} 元` },
    { label: "单据状态", value: v.settled ? "已折算 · 实物已回库" : "待折算（尚未落单）" },
  ];
});

/* ── 明细列 ───────────────────────────────────────────────────────────── */
const PAPER_COLUMNS: PrintColumn[] = [
  { title: "寿命序列号", width: 30 },
  { title: "备件", width: 34 },
  { title: "规格型号", width: 34 },
  { title: "寿命限期 h", align: "right", width: 20 },
  { title: "已使用 h", align: "right", width: 18 },
  { title: "剩余占比", align: "right", width: 16 },
  { title: "单价 元", align: "right", width: 18 },
  { title: "折算金额 元", align: "right", width: 22 },
];

const colDefs: ColDef[] = [
  { field: "serial", headerName: "寿命序列号", width: 140 },
  { field: "spName", headerName: "备件", minWidth: 120, flex: 1 },
  { field: "spec", headerName: "规格型号", minWidth: 120 },
  { field: "lifeLimitHours", headerName: "寿命限期（h）", width: 118, valueFormatter: numFmt() },
  { field: "usedHours", headerName: "已使用（h）", width: 112, valueFormatter: numFmt() },
  { field: "restRatio", headerName: "剩余寿命", width: 96, valueFormatter: pctFmt(1) },
  { field: "price", headerName: "单价（元）", width: 106, valueFormatter: moneyFmt },
  {
    field: "amount",
    headerName: "折算金额（元）",
    width: 130,
    valueFormatter: moneyFmt,
    /* 折算的落点就是这一列，加粗让它在一堆数字里第一眼被读到 */
    cellClass: "font-medium",
  },
];

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

async function commit() {
  const c = person.value;
  if (!c || busy.value) return;
  if (!preview.value.rows.length) {
    toast(`${c.name} 名下没有在手寿命件`, 2000, "warn");
    return;
  }
  busy.value = true;
  let res: unknown;
  try {
    res = await handoverApi.run(c.name);
  } catch {
    busy.value = false;
    return;
  }
  busy.value = false;
  if (!applyResult(res, `${c.name} 的 ${preview.value.rows.length} 件寿命件已折算回库`, toast)) return;
  const made = (res as { data?: HandoverRecord }).data;
  person.value = null;
  preview.value = { rows: [], total: 0 };
  await Promise.all([loadPeople(), loadDocs(made?.id)]);
}

function selectDoc(d: HandoverRecord) {
  current.value = d;
  person.value = null;
}

async function doExport() {
  applyResult(await exportRows("handover"), "导出任务已提交", toast);
}

/* ── 纸面单据 ─────────────────────────────────────────────────────────── */
function print() {
  const v = inView.value;
  if (!v) {
    toast("请先选择交接人，或在左侧选一张交接单", 2000, "warn");
    return;
  }
  const p = params.value;
  const shown = printDocument({
    org: String(p.plantName ?? ""),
    title: v.settled ? "离职交接折算单" : "离职交接折算单（待确认）",
    docNo: v.settled ? (current.value?.id ?? "") : "预览",
    date: v.at ? v.at.slice(0, 10) : "",
    head: headItems.value,
    columns: PAPER_COLUMNS,
    rows: v.rows.map((r) => [
      r.serial,
      r.spName,
      r.spec,
      String(r.lifeLimitHours),
      String(r.usedHours),
      `${(r.restRatio * 100).toFixed(1)}%`,
      String(r.price),
      String(r.amount),
    ]),
    foot: ["合计", "", "", "", "", "", "", String(v.total)],
    notes: [
      `口径：${String(p.handoverFormula ?? "")}`,
      "剩余占比按寿命台账的累计使用小时现算；已超期件按 0 元折算，实物仍回库。",
      v.settled
        ? "本单由系统生成，折算后寿命记录归档为「已折算」，库存已登记归还流水。"
        : "本单为折算预览，提交后才生效。",
    ],
    signatures: ["交接人", "接收人", "设备管理部"],
  });
  if (!shown) toast("浏览器拦截了打印窗口，请允许弹出后重试", 3000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左：历史交接单目录（折算过的都能回看、重打） -->
    <aside class="flex w-60 shrink-0 flex-col border-r border-border/60">
      <div class="flex h-9 shrink-0 items-center border-b border-border/60 px-3">
        <IconArchive class="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-xs text-muted-foreground">交接单目录</span>
        <span class="ml-auto text-xs text-muted-foreground">{{ docs.length }}</span>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <button
          v-for="d in docs"
          :key="d.id"
          type="button"
          class="flex w-full flex-col items-start gap-1 border-b border-border/40 px-3 py-2 text-left hover:bg-muted/60"
          :class="d.id === current?.id ? 'bg-primary/10' : ''"
          @click="selectDoc(d)"
        >
          <span class="text-body font-medium">{{ d.person }} 离职折算</span>
          <span class="text-xs text-muted-foreground">{{ d.rows.length }} 件 · {{ d.total }} 元</span>
        </button>
        <div v-if="!docs.length" class="px-3 py-4 text-xs text-muted-foreground">
          还没有交接单。右侧选人后点「折算并生成交接单」。
        </div>
      </div>
    </aside>

    <!-- 右：折算视图 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <Select
          v-model="person"
          :options="candidates"
          option-label="name"
          placeholder="选择交接人"
          show-clear
          class="w-48 shrink-0"
        >
          <template #option="s">
            <div class="flex w-full min-w-0 flex-col">
              <span class="text-body">{{ s.option.name }} · {{ s.option.role }}</span>
              <span class="text-xs text-muted-foreground"
                >{{ s.option.records }} 件 / 预估 {{ s.option.total }} 元</span
              >
            </div>
          </template>
        </Select>
        <Button
          variant="outlined"
          class="shrink-0 whitespace-nowrap"
          :disabled="!person"
          :loading="busy"
          @click="commit"
        >
          <IconArrowBackUp class="h-3 w-3" />折算并生成交接单
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="print">
          <IconPrinter class="h-3 w-3" />打印
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="doExport"> 导出 </Button>
        <span class="ml-auto text-xs text-muted-foreground">
          <template v-if="inView">
            {{ inView.person }} · {{ inView.rows.length }} 件 · 折算 {{ inView.total.toLocaleString("zh-CN") }} 元 ·
            {{ inView.settled ? "已归档" : "待折算" }}
          </template>
          <template v-else>在岗且有在册寿命件的 {{ candidates.length }} 人</template>
        </span>
      </div>

      <div v-if="inView" class="flex min-h-0 flex-1 flex-col">
        <!-- 单头信息卡 -->
        <div class="shrink-0 border-b border-border/60 px-3 py-2.5">
          <div class="text-sm font-medium">{{ params.plantName }} · 离职交接折算单</div>
          <dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <div v-for="h in headItems" :key="h.label" class="flex min-w-0 items-baseline gap-2">
              <dt class="shrink-0 text-xs text-muted-foreground">{{ h.label }}</dt>
              <dd
                class="min-w-0 text-body"
                :class="h.label === '折算合计' ? 'font-medium' : h.label === '单据状态' ? 'text-muted-foreground' : ''"
              >
                {{ h.value }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- 逐件明细：单价 × 剩余占比 = 折算金额，三列并排就是要让人当场算给业务看 -->
        <div class="min-h-0 flex-1 overflow-hidden px-1 py-1">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="colDefs"
            :row-data="inView.rows"
            :pagination="false"
            @first-data-rendered="onFirstData"
          />
        </div>

        <div class="shrink-0 space-y-1 border-t border-border/60 px-3 py-2.5">
          <div class="text-xs text-muted-foreground">{{ params.handoverFormula }}</div>
          <div class="text-xs text-muted-foreground">
            折算后该员工转为离职，寿命记录归档为「已折算」、实物回库并登记归还流水；已超期件剩余为零，按 0
            元折算但实物仍收回。
          </div>
        </div>
      </div>

      <div v-else class="flex min-h-0 flex-1 items-center justify-center px-6">
        <div class="max-w-md text-center">
          <IconReceipt2 class="mx-auto h-6 w-6 text-muted-foreground" />
          <div class="mt-2 text-sm font-medium">选人即可看到逐件折算明细</div>
          <p class="mt-1.5 text-xs text-muted-foreground">
            下拉里列出在岗、且名下有在手寿命件的人，连预估金额一起给出；
            选中后逐件显示单价、剩余寿命与折算金额，核对无误再点「折算并生成交接单」。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
