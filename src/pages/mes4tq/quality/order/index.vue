<script setup lang="ts">
/** 对应 TQ0002 检验委托管理（质量管理 · 附录 A3 版式 **L7 流程看板**）
 *
 *  接口：`inspectionApi.page`（委托数据）· `inspectionApi.flow`（列头计数）
 *        `inspectionApi.detail`（详情）· `qualityBatchApi.page`（结果下钻）
 *
 *  演示要点：**A3 说的「MES发起→检化验系统→结果回传」是一条要走给人看的流程**，
 *  所以这一页不是表格而是**七列看板**：
 *  ```
 *  已创建 → 已取样 → 已制样 → 检验中 → 已判定 → 已报出    ＋  复检（S3 末档）
 *  ```
 *  每列的头数来自 `/inspection/flow`（与行同源），点卡片看详情，
 *  「已判定」的卡片里能读到判定人/判定时间/判定结果。
 *
 *  **复检那一列必须有数**：约 8% 的委托判为不合格，它们会流进「复检」。
 *  不给这一列，客户就会问「判不合格的委托去哪了」——
 *  而 S3 状态机明确写着「不合格可发起复检」，链在这里必须接得住。
 *
 *  **发起方是 B11 第 7 条的落实**：原燃料（澳粉/精粉/石灰石）由 ERP-MR 发起、
 *  产成品与铁水由 MES 发起，详情里那行「由 XX 发起」就是它。
 *
 *  待接入：发起委托、回传结果、复检（本域只查桩——所以卡片**不给操作按钮**，
 *  本页是只读看板，不是流程引擎）。
 */
import { computed, onMounted, ref, watch } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import { inspectionApi, qualityBatchApi } from "@/api/mes4tq";
import { useToast } from "@/composables/useToast";
import type { InspectionOrder } from "@/api/mes4tq/types";
import DetailDialog from "../../DetailDialog.vue";
import type { DetailSection } from "../../listTypes";

/** 流程列的顺序就是 S3 状态机的顺序（复检是末档、单独一列） */
const COLUMNS = ["已创建", "已取样", "已制样", "检验中", "已判定", "已报出", "复检"] as const;

const { toast } = useToast();
const loading = ref(true);
const counts = ref<Record<string, number>>({});
const rows = ref<InspectionOrder[]>([]);
/** 筛选条件（与 L1 一致的四个下拉，但筛的是看板而不是表格） */
const model = ref<Record<string, any>>({ keyword: "", proName: "", inspTypeName: "", bc: "" });
const proOptions = ref<string[]>([]);

/** 按列分组：**同一行的委托只出现在一列**，所以用 `status` 分组、复检列取判不合格的 */
const grouped = computed(() => {
  const by: Record<string, InspectionOrder[]> = {};
  for (const c of COLUMNS) by[c] = [];
  for (const r of rows.value) {
    const key = r.judgeResult === "不合格" ? "复检" : (r.status ?? "已创建");
    (by[key] ??= []).push(r);
  }
  return by;
});

async function load() {
  loading.value = true;
  try {
    const [flow, res] = await Promise.all([
      inspectionApi.flow(),
      inspectionApi.page({ ...model.value, pageSize: 500 }),
    ]);
    counts.value = flow;
    rows.value = res.rows;
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

function reset() {
  model.value = { keyword: "", proName: "", inspTypeName: "", bc: "" };
  void load();
}

/* ── 详情 ────────────────────────────────────────────── */

const detailOpen = ref(false);
const detailData = ref<Record<string, any> | null>(null);

/** 详情分段：**判定段只在已判定/已报出时出现**（给空段不如不给，
 *  一个全是「—」的判定段会让客户以为是数据没传回来） */
const SECTIONS: DetailSection[] = [
  {
    title: "委托信息",
    fields: [
      { label: "委托单号", from: "testNo" },
      { label: "品名", from: "proName" },
      { label: "物料", from: "mtalName" },
      { label: "批次号", from: "batchNo" },
      { label: "铁次号", from: "feBatchNo" },
      { label: "取样点", from: "smpaddrName" },
      { label: "样本数", from: "smpCnt" },
      { label: "检验类别", from: "inspTypeName" },
      { label: "状态", from: "status" },
    ],
  },
  {
    title: "取样与送样",
    fields: [
      { label: "取样时间", from: "smpTime" },
      { label: "取样人", from: "smpUser" },
      { label: "送样人", from: "sendUser" },
      { label: "送样时间", from: "sendTime" },
      { label: "接收人", from: "receiveUser" },
      { label: "接收时间", from: "receiveTime" },
      { label: "班次", from: "bc" },
      { label: "班组", from: "bz" },
    ],
  },
  {
    title: "判定与报出",
    fields: [
      { label: "判定人", from: "judgeUser" },
      { label: "判定时间", from: "judgeTime" },
      { label: "判定结果", from: "judgeResult", map: { 合格: "合格", 不合格: "不合格" } },
      { label: "判定备注", from: "judgeRemark" },
      { label: "是否报出", from: "isReport" },
      { label: "发起方", from: "remark" },
    ],
  },
];

async function openDetail(row: InspectionOrder) {
  try {
    detailData.value = await inspectionApi.detail(row.id);
  } catch {
    detailData.value = row; // 拦截层已 toast；退回行数据比关掉强
  }
  detailOpen.value = true;
}

/**
 * 结果下钻：已判定的委托查它同批次的实绩。
 *
 * 拍平成一行的原因同 TQ0003 的 `detailFetch`——`DetailDialog` 对对象数组
 * 只会 `join`，结果是 `[object Object]`。
 */
const resultOpen = ref(false);
const resultText = ref("");
const resultTitle = ref("");

async function openResult(row: InspectionOrder) {
  try {
    const list = await qualityBatchApi.page({ keyword: row.batchNo, pageSize: 20 });
    const hit = list.rows.find((b) => b.batchNo === row.batchNo);
    if (!hit) {
      resultText.value = "该批次还没有回传结果（检化验系统未返回）";
    } else {
      resultText.value = (hit.items ?? []).map((it: any) => `${it.itemName} ${it.value}${it.unit}`).join(" · ");
      resultText.value = `综合判定 ${hit.overallGrade} ｜ ${resultText.value}`;
    }
  } catch {
    resultText.value = "结果查询失败（拦截层已提示）";
  }
  resultTitle.value = `检验结果 · ${row.testNo}`;
  resultOpen.value = true;
}

async function loadOptions() {
  try {
    const p = await import("@/api/mes4tq").then((m) => m.qualityStandardApi.products());
    proOptions.value = p;
  } catch {
    /* 拦截层已 toast；下拉空着仍可按其余条件筛 */
  }
}

watch(
  () => model.value,
  () => void load(),
  { deep: true },
);

onMounted(() => {
  void load();
  void loadOptions();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 条件区：只有四个下拉 + 关键词，够筛流程板（多给条件反而遮住板） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <InputText
        v-model="model.keyword"
        class="w-52 shrink-0"
        placeholder="委托单号 / 品名 / 批次 / 铁次号"
        @keydown.enter="load"
      />
      <Select v-model="model.proName" :options="proOptions" show-clear placeholder="品名" class="w-36 shrink-0" />
      <Select
        v-model="model.inspTypeName"
        :options="['抽检', '常规']"
        show-clear
        placeholder="检验类别"
        class="w-32 shrink-0"
      />
      <Select v-model="model.bc" :options="['A', 'B', 'C']" show-clear placeholder="班次" class="w-28 shrink-0" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="loading" @click="load"> 查询 </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">重置</Button>
      <Button
        variant="outlined"
        class="shrink-0 whitespace-nowrap"
        @click="toast('模拟触发待接入 · 本域只查桩', 2000, 'warn')"
      >
        ▶ 模拟委托创建
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">
        {{ rows.length }} 条委托 · 点卡片看详情，已判定的可下钻结果
      </span>
    </div>

    <!-- 流程看板：七列，列头是状态机的档位 -->
    <div class="min-h-0 flex-1 overflow-x-auto p-3">
      <div class="flex min-w-max gap-3">
        <div v-for="(c, i) in COLUMNS" :key="c" class="flex w-56 shrink-0 flex-col">
          <!-- 列头：档位名 + 计数 + 与上一档的箭头 -->
          <div
            class="mb-2 flex items-center gap-2 rounded border px-2.5 py-1.5"
            :class="c === '复检' ? 'border-amber-500/50 bg-amber-500/10' : 'border-border/70 bg-card'"
          >
            <span class="text-body font-medium">{{ i + 1 > 6 ? "复检" : i + 1 + ". " + c }}</span>
            <span
              class="ml-auto rounded-full px-2 py-0.5 text-xs tabular-nums"
              :class="(counts[c] ?? 0) ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'"
            >
              {{ counts[c] ?? 0 }}
            </span>
          </div>
          <span v-if="i < COLUMNS.length - 1" class="mb-1 text-xs text-muted-foreground">↓ 流转到下一档</span>

          <div class="flex min-h-24 flex-col gap-2">
            <button
              v-for="r in grouped[c]"
              :key="r.id"
              type="button"
              class="cursor-pointer rounded border border-border/70 bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/60"
              @click="openDetail(r)"
            >
              <div class="flex items-baseline gap-2">
                <span class="text-body font-medium">{{ r.testNo }}</span>
                <span
                  class="ml-auto text-xs"
                  :class="r.judgeResult === '不合格' ? 'text-destructive' : 'text-muted-foreground'"
                >
                  {{ r.judgeResult || "" }}
                </span>
              </div>
              <div class="mt-0.5 truncate text-xs text-muted-foreground">{{ r.proName }} · {{ r.batchNo }}</div>
              <div class="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{{ String(r.smpTime ?? "").slice(5, 16) }}</span>
                <span>{{ r.smpUser }}</span>
                <span v-if="r.feBatchNo" class="text-primary">{{ r.feBatchNo }}</span>
              </div>
              <!-- 已判定的给出「看结果」入口：流程板的价值就在于不用切页就能追到结果 -->
              <div class="mt-1 flex gap-3">
                <span
                  v-if="c === '已判定' || c === '已报出' || c === '复检'"
                  class="text-xs text-primary hover:underline"
                  @click.stop="openResult(r)"
                >
                  查看结果
                </span>
                <span class="text-xs text-muted-foreground">详情 →</span>
              </div>
            </button>

            <div
              v-if="!grouped[c]?.length"
              class="rounded border border-dashed border-border/70 px-2.5 py-4 text-center text-xs text-muted-foreground"
            >
              {{ loading ? "加载中…" : "暂无" }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 委托详情 -->
    <DetailDialog v-model:open="detailOpen" :sections="SECTIONS" :data="detailData" />

    <!-- 结果下钻（拍平的一行串，见 openResult 的说明） -->
    <Dialog
      v-model:visible="resultOpen"
      modal
      :header="resultTitle"
      :style="{ width: 'min(44rem, calc(100vw - 2rem))' }"
    >
      <div class="py-2 text-body leading-6">{{ resultText }}</div>
      <template #footer>
        <Button label="关闭" variant="outlined" autofocus @click="resultOpen = false" />
      </template>
    </Dialog>
  </div>
</template>
