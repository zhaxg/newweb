<script setup lang="ts">
/**
 * ER0004 自定义报表（模块四 · 附录 B5 版式 **V5 矩阵 · 模板 + 组态 + 预览 + 发布**）
 *
 *  接口：`templateApi.list`（模板列表）· `templateApi.config`（组态骨架）
 *        `templateApi.publish`（日报发布，回单号）
 *
 *  演示要点：规格书原话「报表模板列表 + 简易组态视图（选维度/指标/时间粒度
 *  → 预览表格样式）+ 日报"发布"动作」——**三步就是三块**，顺序不能颠倒：
 *  ① 左栏选模板（模板定义了维度/指标/粒度的**候选**，不是先填后查）
 *  ② 中栏改组态（维度/指标多选，粒度三选一）
 *  ③ 右栏预览**表格骨架**——**行留空**（`config` 端点的契约）：
 *     预览阶段给假行，客户会把假数据当成这个模板的口径（最坏的一种「看起来对」）。
 *
 *  **模板不硬编码**：早期版本在页面里写死三个模板，而 `ems.reportTemplates`
 *  才是真源（EG 那边维护）——两份模板会各自演化，客户在 EG 加一个模板、
 *  这页看不到，就变成了「系统里有、报表里没有」。
 *
 *  发布走模拟：回一个带演示日的单号，toast 明说是模拟——
 *  假装成功而且回一句「已发布」是最难查的谎。
 *
 *  待接入：模板的新建/编辑（主数据，本页只读 + 发布）。
 */
import { computed, onMounted, ref, watch } from "vue";
import Button from "primevue/button";
import { templateApi } from "@/api/energy";
import type { ReportTemplate } from "@/api/energy/types";
import { useToast } from "@/composables/useToast";
import { emsDarkClass, emsHeaderTextClass } from "../../emsTheme";

const { toast } = useToast();

/* ── ① 模板列表 ──────────────────────────────────────────────────────── */

const templates = ref<ReportTemplate[]>([]);
const activeTemplate = ref<ReportTemplate | null>(null);
const loading = ref(true);

async function loadTemplates() {
  loading.value = true;
  try {
    templates.value = (await templateApi.list()) ?? [];
    /* 默认选第一个：不选就没有任何候选，组态区会是「无模板可选」的死态 */
    if (!activeTemplate.value && templates.value.length) activeTemplate.value = templates.value[0];
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

function pickTemplate(t: ReportTemplate) {
  activeTemplate.value = t;
  /* 换模板就把组态重置成它的默认——否则上一个模板的维度会跟着走到下一个模板上，
     预览出来的是「A 模板的维度 + B 模板的粒度」这种不存在的组合 */
  dimensions.value = [...t.dims];
  metrics.value = [...t.metrics];
  granularity.value = t.granularity;
  preview.value = null;
}

/* ── ② 组态（维度 / 指标 / 粒度）────────────────────────────────────── */

const dimensions = ref<string[]>([]);
const metrics = ref<string[]>([]);
const granularity = ref<"时" | "日" | "月">("日");
const preview = ref<{ columns: string[]; metrics: string[]; granularity: string; rows: any[] } | null>(null);
const publishing = ref(false);
const published = ref("");

const GRANULARITIES = ["时", "日", "月"] as const;

/** 维度/指标的**候选池**取自当前模板的定义，但允许临时增删——
 *  模板是起点不是牢笼，组态的价值就在于改模板之外的组合 */
const dimPool = computed(() => [...new Set([...(activeTemplate.value?.dims ?? []), ...dimensions.value])]);
const metricPool = computed(() => [...new Set([...(activeTemplate.value?.metrics ?? []), ...metrics.value])]);

/** 用 `string[]` 字段路径而不是 `ref<string[]>`：`script setup` 里 `ref` 是**值**，
 *  当类型用会报 `ref refers to a value, but is being used as a type`。 */
function toggle(list: string[], item: string) {
  const i = list.indexOf(item);
  if (i >= 0) list.splice(i, 1);
  else list.push(item);
  preview.value = null; // 改了组态就让旧预览失效，免得「显示的是上一次的骨架」
}

async function buildPreview() {
  if (!dimensions.value.length || !metrics.value.length) {
    toast("维度与指标至少各选一项", 2400, "warn");
    return;
  }
  try {
    preview.value = await templateApi.config(dimensions.value, metrics.value, granularity.value);
    toast("预览骨架已生成（行待发布时按模板查）", 2200, "success");
  } catch {
    /* 拦截层已 toast */
  }
}

/* ── ③ 发布（模拟）──────────────────────────────────────────────────── */

async function publish() {
  publishing.value = true;
  try {
    const res = await templateApi.publish();
    /* 单号带演示日（`B-20260928-01` 这种）——与导出口径一致，**不读墙上时间** */
    published.value = res?.id ?? "";
    toast(`日报已发布（模拟）· 单号 ${published.value}`, 2800, "success");
  } catch {
    /* 拦截层已 toast */
  } finally {
    publishing.value = false;
  }
}

onMounted(() => void loadTemplates());

/** 选模板后自动把它的定义灌进组态（首屏也要灌，否则中栏是空的） */
watch(activeTemplate, (t) => {
  if (!t) return;
  if (!dimensions.value.length) dimensions.value = [...t.dims];
  if (!metrics.value.length) metrics.value = [...t.metrics];
});
</script>

<template>
  <div class="flex min-h-0 flex-1 gap-2 p-3" :class="emsDarkClass">
    <!-- ① 左：模板列表 -->
    <aside class="flex w-56 shrink-0 flex-col gap-2">
      <div class="rounded-md border border-white/10 bg-[#111A2C] px-3 py-2 text-sm text-sky-400">
        报表模板
        <span class="ml-2 text-xs text-slate-500">真源 EG0003 维护</span>
      </div>
      <div class="min-h-0 flex-1 overflow-auto rounded-md border border-white/10 bg-[#111A2C]">
        <button
          v-for="t in templates"
          :key="t.id"
          type="button"
          class="block w-full cursor-pointer border-b border-white/5 px-3 py-2 text-left transition-colors"
          :class="activeTemplate?.id === t.id ? 'bg-[#38BDF8]/15' : 'hover:bg-white/5'"
          @click="pickTemplate(t)"
        >
          <div class="flex items-baseline gap-2">
            <span class="truncate text-body text-slate-300">{{ t.name }}</span>
            <span
              class="ml-auto shrink-0 rounded px-1.5 py-0.5 text-xs"
              :class="t.status === '已发布' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'"
            >
              {{ t.status }}
            </span>
          </div>
          <div class="truncate text-xs text-slate-500">
            {{ t.granularity }}粒度 · {{ t.dims.length }} 维 · {{ t.metrics.length }} 标
            <template v-if="t.lastPublishAt"> · {{ t.lastPublishAt }}</template>
          </div>
        </button>
        <div v-if="!templates.length" class="px-3 py-6 text-center text-sm text-slate-500">
          {{ loading ? "加载中…" : "暂无模板（去 EG0003 维护）" }}
        </div>
      </div>
    </aside>

    <!-- ② 中：组态 -->
    <section class="flex min-w-0 flex-1 flex-col gap-2">
      <div class="rounded-md border border-white/10 bg-[#111A2C] px-3 py-2 text-sm text-sky-400">
        简易组态
        <span class="ml-2 text-xs text-slate-500"> 模板是起点不是牢笼——勾选在模板定义之外的组合就是自定义 </span>
      </div>

      <div class="rounded-md border border-white/10 bg-[#111A2C] p-3">
        <div class="mb-2 text-xs font-medium text-slate-300">维度（行的分组方式）</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="d in dimPool"
            :key="d"
            type="button"
            class="cursor-pointer rounded border px-2 py-1 text-xs transition-colors"
            :class="
              dimensions.includes(d)
                ? 'border-[#38BDF8]/60 bg-[#38BDF8]/15 text-sky-400'
                : 'border-white/15 text-slate-500 hover:bg-white/10'
            "
            @click="toggle(dimensions, d)"
          >
            {{ d }}
          </button>
          <span v-if="!dimPool.length" class="text-xs text-slate-500">该模板没有定义维度</span>
        </div>

        <div class="mt-3 mb-2 text-xs font-medium text-slate-300">指标（列里放什么数）</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="m in metricPool"
            :key="m"
            type="button"
            class="cursor-pointer rounded border px-2 py-1 text-xs transition-colors"
            :class="
              metrics.includes(m)
                ? 'border-[#38BDF8]/60 bg-[#38BDF8]/15 text-sky-400'
                : 'border-white/15 text-slate-500 hover:bg-white/10'
            "
            @click="toggle(metrics, m)"
          >
            {{ m }}
          </button>
          <span v-if="!metricPool.length" class="text-xs text-slate-500">该模板没有定义指标</span>
        </div>

        <div class="mt-3 mb-2 text-xs font-medium text-slate-300">时间粒度</div>
        <div class="flex gap-1.5">
          <button
            v-for="g in GRANULARITIES"
            :key="g"
            type="button"
            class="cursor-pointer rounded border px-3 py-1 text-xs transition-colors"
            :class="
              granularity === g
                ? 'border-[#38BDF8]/60 bg-[#38BDF8]/15 text-sky-400'
                : 'border-white/15 text-slate-500 hover:bg-white/10'
            "
            @click="
              granularity = g;
              preview = null;
            "
          >
            {{ g }}
          </button>
        </div>

        <div class="mt-3 flex gap-2">
          <Button label="生成预览" @click="buildPreview" />
          <Button label="▶ 发布日报" variant="outlined" :loading="publishing" @click="publish" />
          <span v-if="published" class="self-center text-xs text-emerald-400"> 最近发布：{{ published }}（模拟） </span>
        </div>
      </div>

      <!-- ③ 右下：预览骨架 -->
      <div class="min-h-0 flex-1 overflow-auto rounded-md border border-white/10 bg-[#111A2C]">
        <div class="flex h-8 items-center gap-2 border-b border-white/10 px-3 text-sm text-sky-400">
          预览
          <span class="text-xs text-slate-500">
            {{ preview ? `骨架 · ${preview.granularity}粒度 · 行待发布时按模板查` : "选好组态后点「生成预览」" }}
          </span>
        </div>
        <div v-if="preview" class="overflow-x-auto p-3">
          <table class="min-w-full" style="font-size: 13px">
            <thead>
              <tr class="text-slate-500">
                <th
                  v-for="c in preview.columns"
                  :key="c"
                  class="border-b border-white/10 px-3 py-2 text-left font-normal"
                >
                  {{ c }}
                </th>
                <th
                  v-for="m in preview.metrics"
                  :key="m"
                  class="border-b border-white/10 px-3 py-2 text-right font-normal"
                >
                  {{ m }}
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- 行留空是**契约**（见文件头第 ③ 条）：预览给假行 = 把假数据当口径 -->
              <tr v-if="!preview.rows.length">
                <td
                  :colspan="preview.columns.length + preview.metrics.length"
                  class="border-b border-white/5 px-3 py-6 text-center text-sm text-slate-500"
                >
                  骨架就绪 · 0 行（真实行在发布时按模板查，预览不给假数据）
                </td>
              </tr>
              <tr v-for="(row, i) in preview.rows" :key="i" class="border-b border-white/5">
                <td v-for="(c, j) in preview.columns" :key="j" class="px-3 py-2 text-slate-300">
                  {{ row[j] ?? "" }}
                </td>
                <td v-for="(m, j) in preview.metrics" :key="m" class="px-3 py-2 text-right tabular-nums text-slate-300">
                  {{ row[preview.columns.length + j] ?? "" }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-6 text-center text-sm text-slate-500">维度与指标至少各选一项，再生成预览</div>
      </div>
    </section>
  </div>
</template>
