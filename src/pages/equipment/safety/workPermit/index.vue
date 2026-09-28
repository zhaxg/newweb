<script setup lang="ts">
/** 对应 AC0001 作业票审批（模块六 安全合规 · 附录 B5 版式 L4：列表 + 右侧审批链）
 *  接口：workPermitApi.page（POST /eam/workPermit/listPage）· create（/workPermit/create）
 *        · approve（/workPermit/approve，pass=false 即驳回）· start（/workPermit/start）· close（/workPermit/close）
 *        + orgApi.assignees（申请人候选）+ exportRows("workPermit")
 *  演示要点：**特种作业（动火、受限空间…）客户买的是「审批链留痕 + A 级多一道厂级」这件事**。
 *        所以右侧那条审批链是本页的主角：点一张票，看得到走到哪一级、每一级是谁在几点批的；
 *        「通过」一路点下去节点逐级变绿，A 级票比 B 级票多一格——这条分支是**看得见的**。
 *        审批不带表单：现场安全员点一下就走完一级，这才是票证系统的卖点（要填东西的审批流没人用）。
 *        「驳回」把链砍回申请并留一条驳回痕迹（不是静默回退），客户问「驳回了怎么查」时当场能指。
 *  已知偏差：真实系统每级还要电子签名与作业前安全交底附件，这里只做到「谁批的、几点批的」，不画签名板。 */
import { computed, onMounted, ref, watch } from "vue";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { useToast } from "@/composables/useToast";
import { exportRows, orgApi, workPermitApi } from "@/api/equipment";
import type { WorkPermit } from "@/api/equipment/types";
import Pager from "../../Pager.vue";
import FormDialog from "../../FormDialog.vue";
import { actionRenderer, applyResult } from "../../rowActions";
import type { EditField } from "../../listTypes";
import { dashFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";

const TYPES = ["动火作业", "高处作业", "受限空间", "临时用电", "吊装作业"];
const GRADES = ["A", "B"];
const STATUSES = ["申请", "班组审批", "安全部门审批", "厂级审批", "已签发", "作业中", "已关闭"];
/** 还停在审批段（可以点「通过 / 驳回」）的节点 */
const APPROVING = ["申请", "班组审批", "安全部门审批", "厂级审批"];

/**
 * 审批链的**显示**节点表。推进顺序由后端 `store.approvePermit` 里的 `PERMIT_FLOW` 说了算，
 * 这里只负责把链画出来，所以只多带一条信息：`aOnly` 标出 A 级才有的那一级。
 * 两边各自演进的后果是某一格永远亮不了——加节点时两处一起改。
 */
const CHAIN: Array<{ node: string; aOnly?: boolean }> = [
  { node: "申请" },
  { node: "班组审批" },
  { node: "安全部门审批" },
  { node: "厂级审批", aOnly: true },
  { node: "签发" },
  { node: "作业中" },
  { node: "已关闭" },
];

const theme = makeHmxGridTheme();
const { toast } = useToast();
const { eqName, eqMap, ready } = useNameMaps();

const keyword = ref("");
const type = ref("");
const grade = ref("");
const status = ref("");

const rows = ref<WorkPermit[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);
const applicants = ref<string[]>([]);

const selected = ref<WorkPermit | null>(null);
const acting = ref(false);
const addOpen = ref(false);

onMounted(async () => {
  try {
    applicants.value = (await orgApi.assignees()) ?? [];
  } catch {
    /* 拦截层已 toast；拉不到就只是新建票里没有申请人候选 */
  }
});

/** 设备名表是后到的（`valueFormatter` 只在渲染时跑），到位后重查一次，别让客户看一屏 EQ-BR-F4-03 */
watch(ready, (on) => {
  if (on) void query();
});

async function query(keepId?: string) {
  querying.value = true;
  try {
    const res = await workPermitApi.page({
      currentPage: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      type: type.value,
      grade: grade.value,
      status: status.value,
    });
    rows.value = res?.rows ?? [];
    total.value = res?.total ?? 0;
    // 动作之后重查要把右侧跟着换成这一行的新状态，否则审批链停在点之前的旧数据上
    const id = keepId ?? selected.value?.id;
    const fresh = id ? rows.value.find((r) => r.id === id) : undefined;
    if (fresh) selected.value = fresh;
    else if (id && !rows.value.some((r) => r.id === id)) selected.value = null;
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
  grade.value = "";
  status.value = "";
  search();
}

function onPage(p: number, size: number) {
  page.value = p;
  pageSize.value = size;
  void query();
}

function pick(row: WorkPermit) {
  selected.value = row;
}

/** 审批 / 开始 / 关闭：三个动作都无入参，成功后只重查一次并跟着这一行走 */
async function act(run: (id: string) => Promise<unknown>, okMsg: string) {
  const p = selected.value;
  if (!p) return;
  acting.value = true;
  try {
    const res = await run(p.id);
    if (applyResult(res, okMsg, toast)) await query(p.id);
  } catch {
    /* 拦截层已 toast */
  }
  acting.value = false;
}

const canApprove = computed(() => !!selected.value && APPROVING.includes(selected.value.status));

async function doExport() {
  applyResult(await exportRows("workPermit"), "导出任务已提交", toast);
}

/**
 * 链上每一格的三种状态：
 * - done：`approvedBy` 里有这条痕迹，人和时间原样显示（客户要的「留痕」就是这两行小字）
 * - todo：等于当前 `status` 的那一格
 * - na：B 级票的「厂级审批」。**显示成「B 级免」而不是干脆不画**——不画就看不出这张票为什么少一级，
 *   而「A 级要多审一道」正是这一页要卖的那个分支。
 */
const chainSteps = computed(() => {
  const p = selected.value;
  if (!p) return [];
  const trail = new Map(p.approvedBy.map((a) => [a.node, a]));
  return CHAIN.map((c) => {
    const hit = trail.get(c.node);
    // 「作业中 / 已关闭」两格没有对应的审批痕迹，用状态本身点亮，时间留空不编一个假时刻
    const on =
      hit ??
      ((c.node === "作业中" || c.node === "已关闭") && p.status === c.node ? { by: p.applicant, at: "" } : undefined);
    return {
      node: c.node,
      state: on ? "done" : c.aOnly && p.grade !== "A" ? "na" : p.status === c.node ? "todo" : "wait",
      by: on?.by ?? "",
      at: on?.at ?? "",
    };
  });
});

const colDefs = computed<ColDef[]>(() => [
  { field: "id", headerName: "票号", width: 96 },
  { field: "type", headerName: "作业类型", width: 104 },
  { field: "grade", headerName: "级别", width: 70, cellRenderer: tagRenderer() },
  { field: "eqId", headerName: "作业设备", minWidth: 160, valueFormatter: (p) => eqName(p.value) },
  { field: "area", headerName: "作业地点", minWidth: 170 },
  { field: "applicant", headerName: "申请人", width: 86 },
  { field: "workContent", headerName: "作业内容", minWidth: 240, flex: 1 },
  { field: "status", headerName: "当前节点", width: 116, cellRenderer: tagRenderer() },
  { field: "planStart", headerName: "计划开始", width: 140, valueFormatter: dashFmt },
  { field: "planEnd", headerName: "计划结束", width: 140, valueFormatter: dashFmt },
  {
    colId: "actions",
    headerName: "操作",
    width: 110,
    sortable: false,
    pinned: "left",
    cellRenderer: actionRenderer([{ label: "查看审批链", onClick: (row) => pick(row as WorkPermit) }]),
  },
]);

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}

const summary = computed(() => {
  const open = rows.value.filter((r) => r.status !== "已关闭").length;
  const fire = rows.value.filter((r) => r.type === "动火作业" && r.status !== "已关闭").length;
  return `共 ${total.value} 张 · 本页未关闭 ${open} · 动火 ${fire}`;
});

/** 新建作业票：这一屏只填申请，后面每一级都是「通过」点出来的 */
const addFields = computed<EditField[]>(() => {
  const labels = Object.values(eqMap.value);
  const idByLabel = Object.fromEntries(Object.entries(eqMap.value).map(([id, name]) => [name, id]));
  return [
    { key: "type", label: "作业类型", kind: "select", options: TYPES, initial: "动火作业" },
    { key: "grade", label: "作业级别", kind: "select", options: GRADES, initial: "B" },
    { key: "eqId", label: "作业设备", kind: "select", options: labels, valueMap: idByLabel, placeholder: "选择设备" },
    { key: "area", label: "作业地点", kind: "input", placeholder: "如 1780 精轧跨 F4 电机底座" },
    { key: "applicant", label: "申请人", kind: "select", options: applicants.value, placeholder: "选择申请人" },
    {
      key: "workContent",
      label: "作业内容",
      kind: "textarea",
      full: true,
      placeholder: "做什么、在哪个部位、怎么个做法",
    },
    { key: "planStart", label: "计划开始", kind: "date", withTime: true },
    { key: "planEnd", label: "计划结束", kind: "date", withTime: true },
  ];
});

function submitAdd(payload: Record<string, any>) {
  return workPermitApi.create(payload);
}
</script>

<template>
  <div class="flex min-h-0 flex-1">
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- 查询条件区（label 统一 w-16） -->
      <div class="shrink-0 border-b border-border/60 px-3 py-2">
        <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">关键词</label>
            <InputText
              v-model="keyword"
              placeholder="票号 / 地点 / 作业内容"
              class="min-w-0 flex-1"
              @keydown.enter="search()"
            />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">作业类型</label>
            <Select v-model="type" :options="TYPES" show-clear placeholder="全部类型" class="min-w-0 flex-1" />
          </div>
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">作业级别</label>
            <Select v-model="grade" :options="GRADES" show-clear placeholder="全部级别" class="min-w-0 flex-1" />
          </div>
          <div class="col-span-2 flex min-w-0 items-center gap-1.5">
            <label class="w-16 shrink-0 text-xs text-muted-foreground">当前节点</label>
            <Select v-model="status" :options="STATUSES" show-clear placeholder="全部节点" class="min-w-0 flex-1" />
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
        <Button label="新建作业票" class="shrink-0 whitespace-nowrap" @click="addOpen = true" />
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
          @row-dblclick="pick($event.data as WorkPermit)"
        />
      </div>

      <Pager :total="total" :page="page" :page-size="pageSize" @change="onPage" />
    </div>

    <!-- 右：审批链（本页的主角，不是详情替代品） -->
    <aside class="flex w-80 shrink-0 flex-col border-l border-border/60">
      <div class="flex h-9 shrink-0 items-center border-b border-border/60 px-3 text-sm font-medium">电子审批链</div>

      <div v-if="!selected" class="min-h-0 flex-1 px-3 py-3 text-body text-muted-foreground">
        点左侧一张作业票，这里显示它的审批走到哪一级、每一级是谁在几点批的。
      </div>

      <div v-else class="flex min-h-0 flex-1 flex-col">
        <div class="space-y-1 border-b border-border/60 px-3 py-2.5">
          <div class="flex min-w-0 items-center gap-2">
            <span class="text-sm font-medium">{{ selected.id }}</span>
            <span class="truncate text-body">{{ selected.type }}</span>
            <span class="ml-auto shrink-0 text-xs text-muted-foreground">{{ selected.grade }} 级</span>
          </div>
          <div class="text-xs text-muted-foreground">{{ eqName(selected.eqId) }} · {{ selected.area }}</div>
          <div class="text-xs text-muted-foreground">作业内容：{{ selected.workContent }}</div>
        </div>

        <ol class="min-h-0 flex-1 overflow-auto px-3 py-2">
          <li v-for="(s, i) in chainSteps" :key="s.node" class="flex min-w-0 gap-2.5">
            <!-- 竖线连到下一格：审批链要读得出「顺序」，一串孤立的圆点做不到 -->
            <div class="flex w-4 shrink-0 flex-col items-center">
              <span
                class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                :class="
                  s.state === 'done'
                    ? 'bg-emerald-500'
                    : s.state === 'todo'
                      ? 'bg-amber-500'
                      : s.state === 'na'
                        ? 'bg-zinc-300 dark:bg-zinc-700'
                        : 'border border-border bg-background'
                "
              />
              <span v-if="i < chainSteps.length - 1" class="w-px flex-1 bg-border" />
            </div>
            <div class="min-w-0 flex-1 pb-3">
              <div
                class="text-body"
                :class="
                  s.state === 'todo'
                    ? 'font-medium text-amber-600 dark:text-amber-400'
                    : s.state === 'na'
                      ? 'text-muted-foreground'
                      : ''
                "
              >
                {{ s.node }}
                <span v-if="s.state === 'na'" class="text-xs">（B 级免）</span>
                <span v-else-if="s.state === 'todo'" class="text-xs">（待批）</span>
              </div>
              <div v-if="s.by" class="truncate text-xs text-muted-foreground">
                {{ s.by }}{{ s.at ? ` · ${s.at}` : "" }}
              </div>
            </div>
          </li>
        </ol>

        <div class="flex h-9 shrink-0 items-center gap-2 border-t border-border/60 px-3">
          <template v-if="canApprove">
            <Button
              label="通过"
              class="shrink-0 whitespace-nowrap"
              :loading="acting"
              @click="act((id) => workPermitApi.approve(id, true), '审批通过')"
            />
            <Button
              label="驳回"
              variant="outlined"
              severity="contrast"
              class="shrink-0 whitespace-nowrap"
              :loading="acting"
              @click="act((id) => workPermitApi.approve(id, false), '作业票已驳回')"
            />
          </template>
          <Button
            v-else-if="selected.status === '已签发'"
            label="开始作业"
            class="shrink-0 whitespace-nowrap"
            :loading="acting"
            @click="act(workPermitApi.start, '作业已开始')"
          />
          <Button
            v-else-if="selected.status === '作业中'"
            label="关闭作业"
            variant="outlined"
            class="shrink-0 whitespace-nowrap"
            :loading="acting"
            @click="act(workPermitApi.close, '作业已关闭、票面归档')"
          />
          <span v-else class="text-xs text-muted-foreground">票面已归档，只剩查阅</span>
        </div>
      </div>
    </aside>

    <FormDialog
      v-model:open="addOpen"
      title="新建作业票"
      :fields="addFields"
      :submit="submitAdd"
      ok-msg="作业票已提交，等待班组审批"
      action-label="提交申请"
      @done="search()"
    />
  </div>
</template>
