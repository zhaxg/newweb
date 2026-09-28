<script setup lang="ts">
/** 对应 AR0002 报表中心（模块七 分析 · 附录 B5 版式 A：报表目录 + 报表表格）
 *  接口：analysisApi.reportDefs（GET /eam/analysis/reportDefs）· report（/analysis/report?month=YYYY-MM|YYYY）
 *        + exportRows("report")
 *  演示要点：**报表页最容易做成"一张表加个月份框"，那不值一页菜单**。左边那份目录才是重点：
 *        八张报表各自有归口部门和保存年限（特种设备检验台账永久、点检到位率 3 年），
 *        这是设备部迎接上级检查时真正要拿出来的东西——**报表不只是数，还有"谁负责、留几年"**。
 *        目录来自系统配置（`org.ts` 的 `REPORT_DEFS`），不是页面写死的四行文字。
 *        右边表格是**现算的**：每行一台设备，工单数/停机工时/材料费从当前工单表按所选期间汇总，
 *        所以主线剧本跑完再回这页，数字和早上那一屏不一样——这就是「由主线数据自动生成一份演示报表」。
 *        期间跟随报表口径：`period=年` 的那三张（OEE 年报、特种检验台账、计量周检情况）切到年选择器，
 *        送 `YYYY`，mock 按前缀长度决定比到月还是比到年。
 *  待接入：打印模板（平台有 vue-print-designer，本域后端没有报表模板接口，不硬接）。 */
import { computed, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import Button from "primevue/button";
import DatePicker from "primevue/datepicker";
import { IconSearch } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { analysisApi, exportRows } from "@/api/equipment";
import { applyResult } from "../../rowActions";
import { dashFmt, healthBarRenderer, moneyFmt, numFmt } from "../../cells";
import { toMonth } from "../../dateField";

interface ReportDef {
  id: string;
  name: string;
  period: string;
  owner: string;
  retention: string;
}

const theme = makeHmxGridTheme();
const { toast } = useToast();

const defs = ref<ReportDef[]>([]);
const picked = ref<ReportDef | null>(null);
const period = ref<Date | null>(new Date());
const rows = ref<Array<Record<string, any>>>([]);
const loading = ref(false);

/** 默认统计期间 = 当前月：种子里的工单与报警都堆在演示月，进页面第一眼就有数 */
onMounted(async () => {
  try {
    defs.value = (await analysisApi.reportDefs()) ?? [];
    picked.value = defs.value[0] ?? null;
    void load();
  } catch {
    /* 拦截层已 toast */
  }
});

/** 送后端的期间串：年报 `YYYY`、月报 `YYYY-MM` */
const rangeValue = computed(() => {
  const d = period.value;
  if (!d) return "";
  return picked.value?.period === "年" ? String(d.getFullYear()) : toMonth(d);
});

async function load() {
  const r = rangeValue.value;
  if (!r) {
    rows.value = [];
    return;
  }
  loading.value = true;
  try {
    rows.value = (await analysisApi.report(r)) ?? [];
  } catch {
    /* 拦截层已 toast */
  }
  loading.value = false;
}

function pickDef(d: ReportDef) {
  picked.value = d;
}

/** 年报的期间是年、月报的是月，口径不一样；切目录时把上一次的期间清掉重选，避免"年报用着 2026-09" */
watch(picked, () => {
  period.value = new Date();
  void load();
});

const colDefs = computed<ColDef[]>(() => [
  { field: "eqId", headerName: "设备编号", width: 124 },
  { field: "eqName", headerName: "设备名称", minWidth: 170, flex: 1 },
  { field: "model", headerName: "型号规格", minWidth: 130, valueFormatter: dashFmt },
  { field: "lineName", headerName: "所属产线", minWidth: 130, valueFormatter: dashFmt },
  { field: "level", headerName: "设备级别", width: 92, valueFormatter: dashFmt },
  { field: "health", headerName: "健康度", width: 104, sortable: false, cellRenderer: healthBarRenderer() },
  { field: "runHours", headerName: "累计运行(h)", width: 110, valueFormatter: numFmt(0) },
  { field: "woCount", headerName: "期间工单", width: 96, valueFormatter: numFmt(0) },
  { field: "workHours", headerName: "维修工时(h)", width: 110, valueFormatter: numFmt(1) },
  { field: "stopMinutes", headerName: "停机(分钟)", width: 106, valueFormatter: numFmt(0) },
  { field: "alarmCount", headerName: "报警", width: 76, valueFormatter: numFmt(0) },
  { field: "urgentCount", headerName: "其中紧急", width: 96, valueFormatter: numFmt(0) },
  { field: "materialCost", headerName: "材料费(元)", width: 116, valueFormatter: moneyFmt },
]);

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

const summary = computed(() => {
  const wo = rows.value.reduce((s, r) => s + Number(r.woCount ?? 0), 0);
  const cost = rows.value.reduce((s, r) => s + Number(r.materialCost ?? 0), 0);
  const stop = rows.value.reduce((s, r) => s + Number(r.stopMinutes ?? 0), 0);
  return `${rangeValue.value} · ${rows.value.length} 台设备 · 工单 ${wo} 单 · 停机 ${Math.round(stop / 60)} 小时 · 材料费 ${(cost / 10000).toFixed(1)} 万元`;
});

async function doExport() {
  applyResult(await exportRows("report", { month: rangeValue.value }), "导出任务已提交", toast);
}
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左：报表目录（名称/归口/保存年限） -->
    <aside class="flex w-64 shrink-0 flex-col border-r border-border/60">
      <div class="flex h-9 shrink-0 items-center border-b border-border/60 px-3 text-sm font-medium">报表目录</div>
      <ul class="min-h-0 flex-1 overflow-auto py-1">
        <li v-for="d in defs" :key="d.id">
          <button
            type="button"
            class="w-full px-3 py-1.5 text-left"
            :class="picked?.id === d.id ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'"
            @click="pickDef(d)"
          >
            <div class="truncate text-body">{{ d.name }}</div>
            <div class="truncate text-xs text-muted-foreground">
              {{ d.period === "年" ? "年报" : "月报" }} · {{ d.owner }} · 保存 {{ d.retention }}
            </div>
          </button>
        </li>
        <li v-if="!defs.length" class="px-3 py-1.5 text-xs text-muted-foreground">目录还没取回来</li>
      </ul>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 条件区：只有一个期间条件，按 ui-rules §6 并进工具栏一行 -->
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <span class="shrink-0 text-xs text-muted-foreground">统计期间</span>
        <DatePicker
          v-model="period"
          :view="picked?.period === '年' ? 'year' : 'month'"
          :manual-input="false"
          :date-format="picked?.period === '年' ? 'yyyy' : 'yyyy-mm'"
          :style="{ width: '9rem' }"
          class="shrink-0"
          fluid
        />
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="load">
          <IconSearch class="h-3 w-3" />生成报表
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="doExport"> 导出 </Button>
        <span class="ml-auto text-xs text-muted-foreground">{{ summary }}</span>
      </div>

      <div class="border-b border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
        当前报表：<span class="text-body">{{ picked?.name ?? "未选择" }}</span> · 归口 {{ picked?.owner ?? "—" }} ·
        保存年限 {{ picked?.retention ?? "—" }}
        · 行内数据由工单/报警/设备台账按期间现算，不是静态快照
      </div>

      <div class="min-h-0 flex-1 overflow-hidden px-1 py-1">
        <AgGridVue
          class="hmx-ag-grid h-full w-full"
          :theme="theme"
          :column-defs="colDefs"
          :row-data="rows"
          :pagination="false"
          @first-data-rendered="onFirstData"
        />
      </div>
    </div>
  </div>
</template>
