<script setup lang="ts">
/** 对应 AS0004 寿命考核结算单（模块五 备品备件 · 附录 B4 第 9 幕 · 版式 L4 单据页）
 *  接口：assessmentApi.page（POST /eam/assessment/listPage）/ run（POST /eam/assessment/run）
 *        analysisApi.params（GET /eam/analysis/params，奖罚系数与公式口径）+ exportRows("assessment")
 *  演示要点：**客户最想看的「自动算账」，钱不是页面算出来的**——
 *        「生成 9 月结算」调 `runAssessment(month)`，由 store 按每条寿命记录的
 *        实际使用小时 × 系统参数（奖 20 / 罚 40 / 达标线 90%）结算并**落成一张单**，
 *        页面只负责显示这张单。所以：
 *        ① 系数与公式从 `/analysis/params` 读，不写在模板里——客户问「我们厂系数不一样」，
 *           答案是改参数、重生成，页面零改动（附录模块五命名说明）；
 *        ② 生成后能反复查、可打印，是一张**单据**（有单号、有签字栏），不是一屏即时数字；
 *        ③ 未达线处罚是负数，表格里标红，纸面上靠「金额」列的正负号自证。
 *  待接入：打印走浏览器打印（新窗口渲染纸面单据，见 ./printDoc.ts），不生成 PDF 文件。 */
import { computed, onMounted, ref } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconPrinter, IconReceipt2, IconRotateClockwise } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { analysisApi, assessmentApi, exportRows } from "@/api/equipment";
import type { Assessment } from "@/api/equipment/types";
import { applyResult } from "../../rowActions";
import { moneyFmt, numFmt, tagRenderer } from "../../cells";
import { toDate, toMonth } from "../../dateField";
import { printDocument } from "../../printDoc";
import type { PrintColumn } from "../../printDoc";

const { toast } = useToast();
const theme = makeHmxGridTheme();

const docs = ref<Assessment[]>([]);
const current = ref<Assessment | null>(null);
const busy = ref(false);
/** 结算月份：DatePicker 的 v-model 是 Date，送接口时才转 `YYYY-MM`（见 dateField.ts） */
const month = ref<Date>(toDate("2026-09-01") ?? new Date());
/** 系统参数：系数与公式都从配置读，页面不写死数字 */
const params = ref<Record<string, any>>({});

const net = (a: Assessment | null) => (a ? a.rewardTotal + a.punishTotal : 0);

async function load(selectId?: string) {
  const res = await assessmentApi.page({ currentPage: 1, pageSize: 50 });
  docs.value = res?.rows ?? [];
  current.value = docs.value.find((d) => d.id === selectId) ?? docs.value[0] ?? null;
}

onMounted(async () => {
  try {
    const [p] = await Promise.all([analysisApi.params(), load()]);
    params.value = p ?? {};
  } catch {
    /* 拦截层已 toast */
  }
});

async function generate() {
  if (busy.value) return;
  busy.value = true;
  const m = toMonth(month.value);
  let res: unknown;
  try {
    res = await assessmentApi.run(m);
  } catch {
    busy.value = false;
    return;
  }
  busy.value = false;
  if (!applyResult(res, `${m} 结算单已生成`, toast)) return;
  const made = (res as { data?: Assessment }).data;
  await load(made?.id);
}

/* ── 明细列（屏幕与纸面共用同一份列定义，避免两处各改各的）───────────── */
const COLUMNS: Array<{ title: string; field: string; align?: PrintColumn["align"]; width?: number }> = [
  { title: "寿命序列号", field: "serial", width: 28 },
  { title: "备件", field: "spName", width: 40 },
  { title: "责任人", field: "holder", width: 16 },
  { title: "寿命限期 h", field: "lifeLimitHours", align: "right", width: 20 },
  { title: "实际使用 h", field: "usedHours", align: "right", width: 20 },
  { title: "超期/差额 h", field: "overHours", align: "right", width: 20 },
  { title: "考核结果", field: "result", width: 20 },
  { title: "金额 元", field: "amount", align: "right", width: 20 },
];

const colDefs = computed<ColDef[]>(() =>
  COLUMNS.map((c) => {
    if (c.field === "amount") {
      return {
        field: "amount",
        headerName: "金额（元）",
        width: 110,
        valueFormatter: moneyFmt,
        /* 负数=未达线处罚：颜色直接把「谁被扣钱」这件事说清楚，不用客户去读符号 */
        cellClass: (p: any) => (Number(p.value) < 0 ? "text-red-600 font-medium" : "text-emerald-600 font-medium"),
      };
    }
    if (c.field === "result") {
      return { field: "result", headerName: "考核结果", width: 104, sortable: false, cellRenderer: tagRenderer() };
    }
    if (c.field === "overHours") {
      return {
        field: "overHours",
        headerName: "超期 / 差额（h）",
        width: 128,
        valueFormatter: (p) => {
          const v = Number(p.value);
          if (!Number.isFinite(v)) return "—";
          return v > 0 ? `超期 ${v}` : `差 ${-v}`;
        },
      };
    }
    if (c.field === "lifeLimitHours" || c.field === "usedHours") {
      return {
        field: c.field,
        headerName: c.field === "lifeLimitHours" ? "寿命限期（h）" : "实际使用（h）",
        width: 116,
        valueFormatter: numFmt(),
      };
    }
    return {
      field: c.field,
      headerName: c.title,
      minWidth: 110,
      ...(c.field === "spName" ? { flex: 1 } : {}),
    };
  }),
);

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

async function doExport() {
  applyResult(await exportRows("assessment"), "导出任务已提交", toast);
}

/* ── 纸面单据 ─────────────────────────────────────────────────────────── */
function print() {
  const a = current.value;
  if (!a) {
    toast("还没有结算单，请先生成", 2000, "warn");
    return;
  }
  const p = params.value;
  const ok = printDocument({
    org: String(p.plantName ?? ""),
    title: "备件寿命考核结算单",
    docNo: a.id,
    date: a.createdAt.slice(0, 10),
    head: [
      { label: "结算月份", value: a.month },
      { label: "考核明细", value: `${a.rows.length} 条` },
      { label: "归口部门", value: String(p.deptName ?? "设备管理部") },
      { label: "超期奖励", value: `${a.rewardTotal} 元` },
      { label: "未达线处罚", value: `${a.punishTotal} 元` },
      { label: "本期净额", value: `${net(a)} 元` },
    ],
    columns: COLUMNS.map((c) => ({ title: c.title, width: c.width, align: c.align })),
    rows: a.rows.map((r) => [
      r.serial,
      r.spName,
      r.holder,
      String(r.lifeLimitHours),
      String(r.usedHours),
      r.overHours > 0 ? `+${r.overHours}` : String(r.overHours),
      r.result,
      String(r.amount),
    ]),
    foot: ["合计", "", "", "", "", "", `奖 ${a.rewardTotal} / 罚 ${a.punishTotal}`, String(net(a))],
    notes: [
      `口径：${String(p.rewardFormula ?? "")}`,
      `口径：${String(p.punishFormula ?? "")}（达标线 ${Math.round(Number(p.passRate ?? 0.9) * 100)}%）`,
      "实际使用小时由维修工单与 MES 采集累计，本单由系统自动核算，考核到人。",
    ],
    signatures: ["考核人", "被考核人", "设备管理部"],
  });
  if (!ok) toast("浏览器拦截了打印窗口，请允许弹出后重试", 3000, "warn");
}
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左：结算单目录（一张单 = 一个月，可反复回看历史单据） -->
    <aside class="flex w-60 shrink-0 flex-col border-r border-border/60">
      <div class="flex h-9 shrink-0 items-center border-b border-border/60 px-3">
        <IconReceipt2 class="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
        <span class="text-xs text-muted-foreground">结算单目录</span>
        <span class="ml-auto text-xs text-muted-foreground">{{ docs.length }}</span>
      </div>
      <div class="min-h-0 flex-1 overflow-y-auto">
        <button
          v-for="d in docs"
          :key="d.id"
          type="button"
          class="flex w-full flex-col items-start gap-1 border-b border-border/40 px-3 py-2 text-left hover:bg-muted/60"
          :class="d.id === current?.id ? 'bg-primary/10' : ''"
          @click="current = d"
        >
          <span class="text-body font-medium">{{ d.month }} 月度结算</span>
          <span class="text-xs text-muted-foreground">奖 {{ d.rewardTotal }} · 罚 {{ d.punishTotal }}</span>
        </button>
        <div v-if="!docs.length" class="px-3 py-4 text-xs text-muted-foreground">
          还没有结算单。点右侧「生成结算单」按当月寿命数据自动核算。
        </div>
      </div>
    </aside>

    <!-- 右：单据视图 -->
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <DatePicker
          v-model="month"
          view="month"
          date-format="yy-mm"
          :manual-input="false"
          :show-icon="false"
          placeholder="结算月份"
          class="w-36 shrink-0"
        />
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="busy" @click="generate">
          <IconRotateClockwise class="h-3 w-3" />生成结算单
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="print">
          <IconPrinter class="h-3 w-3" />打印
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="doExport"> 导出 </Button>
        <span class="ml-auto text-xs text-muted-foreground">
          <template v-if="current">
            {{ current.month }} · 明细 {{ current.rows.length }} 条 · 净额 {{ net(current) }} 元 · 奖
            {{ params.rewardRate }} 元/h · 罚 {{ params.punishRate }} 元/h
          </template>
          <template v-else>共 {{ docs.length }} 张结算单</template>
        </span>
      </div>

      <div v-if="current" class="flex min-h-0 flex-1 flex-col">
        <!-- 单头信息卡 -->
        <div class="shrink-0 border-b border-border/60 px-3 py-2.5">
          <div class="text-sm font-medium">{{ params.plantName }} · 备件寿命考核结算单</div>
          <dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            <div class="flex min-w-0 items-baseline gap-2">
              <dt class="shrink-0 text-xs text-muted-foreground">单号</dt>
              <dd class="min-w-0 text-body">{{ current.id }}</dd>
            </div>
            <div class="flex min-w-0 items-baseline gap-2">
              <dt class="shrink-0 text-xs text-muted-foreground">结算月份</dt>
              <dd class="min-w-0 text-body">{{ current.month }}</dd>
            </div>
            <div class="flex min-w-0 items-baseline gap-2">
              <dt class="shrink-0 text-xs text-muted-foreground">生成时间</dt>
              <dd class="min-w-0 text-body">{{ current.createdAt }}</dd>
            </div>
            <div class="flex min-w-0 items-baseline gap-2">
              <dt class="shrink-0 text-xs text-muted-foreground">超期奖励</dt>
              <dd class="min-w-0 text-body text-emerald-600 dark:text-emerald-400">{{ current.rewardTotal }} 元</dd>
            </div>
            <div class="flex min-w-0 items-baseline gap-2">
              <dt class="shrink-0 text-xs text-muted-foreground">未达线处罚</dt>
              <dd class="min-w-0 text-body text-red-600 dark:text-red-400">{{ current.punishTotal }} 元</dd>
            </div>
            <div class="flex min-w-0 items-baseline gap-2">
              <dt class="shrink-0 text-xs text-muted-foreground">达标线</dt>
              <dd class="min-w-0 text-body">{{ Math.round(Number(params.passRate ?? 0.9) * 100) }}%</dd>
            </div>
          </dl>
        </div>

        <!-- 明细 -->
        <div class="min-h-0 flex-1 overflow-hidden px-1 py-1">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :column-defs="colDefs"
            :row-data="current.rows"
            :pagination="false"
            @first-data-rendered="onFirstData"
          />
        </div>

        <!-- 口径脚注：公式来自系统参数，客户要能对着自己的制度文本核 -->
        <div class="shrink-0 space-y-1 border-t border-border/60 px-3 py-2.5">
          <div class="text-xs text-muted-foreground">{{ params.rewardFormula }}</div>
          <div class="text-xs text-muted-foreground">{{ params.punishFormula }}</div>
          <div class="text-xs text-muted-foreground">
            实际使用小时由维修工单与 MES 采集累计，本单由系统自动核算、考核到人；调整参数后重新生成即按新口径结算。
          </div>
        </div>
      </div>

      <div v-else class="flex min-h-0 flex-1 items-center justify-center px-6">
        <div class="max-w-md text-center">
          <div class="text-sm font-medium">还没有生成结算单</div>
          <p class="mt-1.5 text-xs text-muted-foreground">
            选一个月份点「生成结算单」——系统按寿命台账里每条记录的实际使用小时，
            自动核算超期奖励与未达线处罚并落成一张可打印的单据。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
