<script setup lang="ts">
/** 对应 AM0005 点巡检（模块三 状态监测 · 附录 B5 版式 L2：巡检线 + 任务表 + 移动端录入）
 *  接口：inspectionApi.page（POST /eam/inspection/listPage）· submit（POST /eam/inspection/submit）
 *        + orgApi.assignees（点检人候选）+ exportRows("inspection")
 *  演示要点：**这一页要卖的是"防漏检"，不是"有个点检表"**。所以移动端录入面板把现场动作做成三步：
 *        ① 扫码签到（未签到不能录入——把「人到过设备跟前」这件事变成流程里的硬前置）
 *        ② 录入实测值 ③ 拍照。第三步是防替代的关键：只填数字的表可以被坐在办公室里补，
 *        照片不行。提交「异常」时 mock 会**当场产一条「人工点检」来源的报警并扣健康度**
 *        （`store.submitInspection`），所以点完能立刻在报警中心看到它，这条链是闭合的。
 *        左侧巡检线不是装饰：现场是按线走的，一屏全是别的线的任务等于没排程。
 *  已知偏差：真实移动端还有 GPS/蓝牙信标打卡与离线缓存，这里只做扫码这一步的模拟，
 *        不画一个假的地图。照片不落文件（mock 没有文件服务），只把张数记进点检备注。
 *  待接入：无。 */
import { computed, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import InputText from "primevue/inputtext";
import { IconCamera, IconCheck, IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { exportRows, inspectionApi, orgApi } from "@/api/equipment";
import type { InspectionTask } from "@/api/equipment/types";
import Pager from "../../Pager.vue";
import { actionRenderer, applyResult } from "../../rowActions";
import { dashFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";

const RESULTS = ["待检", "正常", "异常"];

const { toast } = useToast();
const theme = makeHmxGridTheme();
const { eqName, ready } = useNameMaps();

/* ── 查询条件 + 巡检线 ────────────────────────────────────────────────── */
const keyword = ref("");
const result = ref("");
const route = ref("");
const persons = ref<string[]>([]);

const rows = ref<InspectionTask[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);
/**
 * 巡检线是从任务里长出来的（后端没有独立的路线表），所以不做树、做一排可点的线。
 *
 * 单独拉一次全量、而不是从当前页 `rows` 里算：**筛选会吃掉线**。
 * 用当前页算的话，客户一选「异常」，左栏就只剩出过异常的那两条线，
 * 想换回原来的线点不了，看起来像「线被删了」。
 */
const routes = ref<string[]>([]);

async function loadRoutes() {
  try {
    const res = await inspectionApi.page({ currentPage: 1, pageSize: 500 });
    routes.value = [...new Set((res?.rows ?? []).map((r) => r.route))].toSorted();
  } catch {
    /* 拦截层已 toast；左栏空着，右侧任务表照常可用 */
  }
}

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    const q: Record<string, any> = { currentPage: page.value, pageSize: pageSize.value };
    if (keyword.value.trim()) q.keyword = keyword.value.trim();
    if (result.value) q.result = result.value;
    if (route.value) q.route = route.value;
    const res = await inspectionApi.page(q);
    rows.value = res?.rows ?? [];
    total.value = res?.total ?? rows.value.length;
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
  result.value = "";
  route.value = "";
  page.value = 1;
  void query();
}

function onPage(p: number, size: number) {
  page.value = p;
  pageSize.value = size;
  void query();
}

onMounted(async () => {
  void query();
  void loadRoutes();
  try {
    persons.value = (await orgApi.assignees()) ?? [];
  } catch {
    /* 拦截层已 toast；拉不到就用任务上原有点检人 */
  }
});

/** 设备名表是后到的（AG Grid 的 valueFormatter 只在渲染时跑），到位后重查一次 */
watch(ready, (on) => {
  if (on) void query();
});

/* ── 移动端录入面板（扫码签到 → 录入 → 拍照 → 提交）───────────────────── */
const panelOpen = ref(false);
const task = ref<InspectionTask | null>(null);
/** 签到时间：null = 还没扫码，此时②③两步全部锁住 */
const signedAt = ref<string | null>(null);
const measured = ref("");
const shots = ref<string[]>([]);
const verdict = ref<"正常" | "异常">("正常");
const note = ref("");
const person = ref("");
const saving = ref(false);

const SHOTS = ["设备铭牌", "部位近照", "仪表读数"];

/** 点检人候选：花名册 + 这一项原本的点检人（人名的来源表可能没这个人，不能让下拉把任务上的人清掉） */
const personOptions = computed(() => [...new Set([task.value?.person, ...persons.value].filter(Boolean))]);

function openPanel(row: InspectionTask) {
  task.value = row;
  signedAt.value = null;
  measured.value = "";
  shots.value = [];
  verdict.value = "正常";
  note.value = "";
  person.value = row.person;
  panelOpen.value = true;
}

/** 扫码签到：真实动作是手机对着设备上的二维码（AE0005 那台"扫码"页生成的）扫一下 */
function sign() {
  signedAt.value = `${new Date().toLocaleTimeString("zh-CN", { hour12: false })} 于 ${task.value?.eqId ?? ""}`;
}

function toggleShot(name: string) {
  shots.value = shots.value.includes(name) ? shots.value.filter((s) => s !== name) : [...shots.value, name];
}

/** 提交：备注里带上实测值与照片数，让「这条记录是现场产生的」在纸面上也成立 */
async function submit() {
  const t = task.value;
  if (!t) return;
  const parts = [];
  if (measured.value.trim()) parts.push(`实测 ${measured.value.trim()}`);
  if (shots.value.length) parts.push(`现场照片 ${shots.value.length} 张`);
  if (note.value.trim()) parts.push(note.value.trim());
  saving.value = true;
  try {
    const res = await inspectionApi.submit({
      id: t.id,
      result: verdict.value,
      note: parts.join("；"),
      by: person.value,
    });
    if (applyResult(res, "点检结果已录入", toast)) {
      panelOpen.value = false;
      void query();
    }
  } catch {
    /* 拦截层已 toast */
  }
  saving.value = false;
}

const colDefs = computed<ColDef[]>(() => [
  { field: "id", headerName: "任务号", width: 142 },
  { field: "name", headerName: "点检项目", minWidth: 180, flex: 1 },
  { field: "route", headerName: "巡检线", width: 130 },
  { field: "eqId", headerName: "设备", minWidth: 170, valueFormatter: (p) => eqName(p.value) },
  { field: "person", headerName: "点检人", width: 86 },
  { field: "planDate", headerName: "计划日", width: 106 },
  { field: "doneAt", headerName: "完成时间", width: 150, valueFormatter: dashFmt },
  { field: "result", headerName: "结果", width: 84, sortable: false, cellRenderer: tagRenderer() },
  { field: "note", headerName: "点检记录", minWidth: 220, valueFormatter: dashFmt },
  {
    colId: "actions",
    headerName: "操作",
    width: 116,
    sortable: false,
    pinned: "left",
    cellRenderer: actionRenderer([{ label: "移动端录入", onClick: (row) => openPanel(row as InspectionTask) }]),
  },
]);

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

const summary = computed(() => {
  const wait = rows.value.filter((r) => r.result === "待检").length;
  const bad = rows.value.filter((r) => r.result === "异常").length;
  return `共 ${total.value} 项 · 本页待检 ${wait} · 异常 ${bad}`;
});

async function doExport() {
  applyResult(await exportRows("inspection"), "导出任务已提交", toast);
}
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <!-- 左：巡检线（点一条就按它筛，再点一次取消） -->
    <aside class="flex w-52 shrink-0 flex-col border-r border-border/60">
      <div class="flex h-9 shrink-0 items-center border-b border-border/60 px-3 text-sm font-medium">巡检线</div>
      <ul class="min-h-0 flex-1 overflow-auto py-1">
        <li v-for="r in routes" :key="r">
          <button
            type="button"
            class="w-full truncate px-3 py-1.5 text-left text-body"
            :class="route === r ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-accent/50'"
            @click="
              route = route === r ? '' : r;
              search();
            "
          >
            {{ r }}
          </button>
        </li>
        <li v-if="!routes.length" class="px-3 py-1.5 text-xs text-muted-foreground">本页没有任务</li>
      </ul>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 查询条件区（3 个条件 → 独立条件区） -->
      <div class="shrink-0 border-b border-border/60 px-3 py-2">
        <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">关键词</label>
            <InputText
              v-model="keyword"
              placeholder="项目 / 巡检线 / 点检人"
              class="min-w-0 flex-1"
              @keydown.enter="search()"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">结果</label>
            <Select v-model="result" :options="RESULTS" show-clear placeholder="全部结果" class="min-w-0 flex-1" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">巡检线</label>
            <Select
              v-model="route"
              :options="routes"
              show-clear
              placeholder="全部巡检线"
              class="min-w-0 flex-1"
              @change="search()"
            />
          </div>
        </div>
      </div>

      <!-- 工具栏 h-9：按钮靠左、统计靠右 -->
      <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
          <IconRotateClockwise class="h-3 w-3" />重置
        </Button>
        <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="search()">
          <IconSearch class="h-3 w-3" />查询
        </Button>
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
          @row-dblclick="openPanel($event.data as InspectionTask)"
        />
      </div>

      <Pager :total="total" :page="page" :page-size="pageSize" @change="onPage" />
    </div>

    <!-- 移动端录入：三步都在这一个弹窗里，顺序即现场动作顺序 -->
    <Dialog
      v-model:visible="panelOpen"
      modal
      header="移动端点检录入"
      :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
    >
      <div class="space-y-4 py-1">
        <div class="min-w-0 space-y-1">
          <div class="text-body font-medium">{{ task?.name }}</div>
          <div class="text-xs text-muted-foreground">
            {{ task ? eqName(task.eqId) : "" }} · {{ task?.route }} · 计划 {{ task?.planDate }}
          </div>
        </div>

        <!-- ① 扫码签到 -->
        <div class="space-y-1.5">
          <div class="text-xs text-muted-foreground">① 扫码签到（对设备上的二维码，未签到不能录入）</div>
          <div v-if="signedAt" class="flex min-w-0 items-center gap-2 text-body">
            <IconCheck class="h-4 w-4 shrink-0 text-emerald-500" />
            已签到 {{ signedAt }}
          </div>
          <Button v-else label="扫码签到" variant="outlined" fluid autofocus @click="sign" />
        </div>

        <!-- ② 录入实测值 -->
        <div class="space-y-1.5">
          <label class="text-xs text-muted-foreground">② 录入实测值</label>
          <InputText
            v-model="measured"
            :disabled="!signedAt"
            placeholder="如 轴承温度 72.4 ℃ / 振动 6.8 mm/s"
            class="w-full"
            :autofocus="!!signedAt"
          />
        </div>

        <!-- ③ 拍照 -->
        <div class="space-y-1.5">
          <label class="text-xs text-muted-foreground">③ 拍照（防漏检：只填数字的记录不作数）</label>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="s in SHOTS"
              :key="s"
              :variant="shots.includes(s) ? 'solid' : 'outlined'"
              :disabled="!signedAt"
              class="whitespace-nowrap"
              @click="toggleShot(s)"
            >
              <IconCamera class="h-3 w-3" />{{ s }}
            </Button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="min-w-0 space-y-1.5">
            <label class="text-xs text-muted-foreground">点检人</label>
            <Select v-model="person" :options="personOptions" class="w-full" />
          </div>
          <div class="min-w-0 space-y-1.5">
            <label class="text-xs text-muted-foreground">判定</label>
            <Select v-model="verdict" :options="['正常', '异常']" class="w-full" />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-xs text-muted-foreground">备注</label>
          <Textarea v-model="note" rows="2" :disabled="!signedAt" placeholder="异常现象、处理意见" class="w-full" />
          <p v-if="verdict === '异常'" class="text-xs text-muted-foreground">
            提交异常会立即生成一条「人工点检」来源的报警，并下调该设备健康度。
          </p>
        </div>
      </div>

      <template #footer>
        <Button label="取消" variant="outlined" @click="panelOpen = false" />
        <Button label="提交" :loading="saving" :disabled="!signedAt" @click="submit" />
      </template>
    </Dialog>
  </div>
</template>
