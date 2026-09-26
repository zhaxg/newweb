<script setup lang="ts">
/**
 * 碳账户 5 页共用骨架：查询条 + 主表 + 分页 +（按 variant）账户记录子表 / 资产划拨弹窗。
 *
 * 为什么抽成一个组件而不是抄 5 遍：这 5 页骨架完全一致，差异只有
 * 「查哪个接口 / 列是哪几根 / 账户号参数叫什么 / 有哪几个行内动作」，
 * 已经全部收敛进下面的 `CONF` 配置表。5 个 index.vue 只留来源注释 + 一行标签。
 *
 * 对应线上 https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/{main,emission,reduction,quota,trading}，
 * 每列的字段映射见 CONF 里的注释（配额页六列已按页面实测取值逐列反查过字段名）。
 */
import { computed, onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, FirstDataRenderedEvent } from "ag-grid-community";
import { autoSizeOnFirstData, makeHmxGridTheme } from "@/lib/agGrid";
import { IconDownload, IconRotateClockwise, IconSearch } from "@tabler/icons-vue";
import { carbonApi, type AccountListQuery, type AccountNoKey } from "@/api/carbon";
import type { PageResult } from "@/api/carbon/types";
import { useToast } from "@/composables/useToast";
import CarbonPager from "@/pages/carbon/CarbonPager.vue";
import { actionRenderer, seqRenderer } from "./rowActions";
import AccountRecordPanel from "./AccountRecordPanel.vue";
import AssetTransferDialog from "./AssetTransferDialog.vue";

type PageVariant = "main" | "emission" | "reduction" | "quota" | "trading";
/** 与 AccountRecordPanel 的 variant 同名同义（那边是 <script setup> 内部类型、导不出来，故此处重述） */
type RecordVariant = "emission" | "reduction" | "quota" | "trade";

const props = defineProps<{ variant: PageVariant }>();

const { toast } = useToast();
const theme = makeHmxGridTheme();

/* ── 每页的差异表 ────────────────────────────────────────── */
interface Conf {
  /** 账户号查询参数名（线上逐页实测：mainAccountNo / emissionAccountNo / ...） */
  accountNoField: AccountNoKey;
  /** 记录子表变体；主账户页没有 */
  record: RecordVariant | null;
  /** 行内动作标签 */
  actions: string[];
  fetch: (q: AccountListQuery) => Promise<PageResult<any>>;
  cols: ColDef[];
  exportFn: (q?: unknown) => Promise<null>;
}

const seqCol: ColDef = { colId: "seq", headerName: "序号", width: 64, valueGetter: seqRenderer, sortable: false };
const nameCol: ColDef = { field: "enterName", headerName: "企业名称", minWidth: 170, flex: 1 };
const noCol = (field: string): ColDef => ({ field, headerName: "账户号", width: 150 });
const amt = (field: string, headerName: string): ColDef => ({ field, headerName, width: 132 });

const CONF: Record<PageVariant, Conf> = {
  main: {
    accountNoField: "mainAccountNo",
    record: null,
    actions: [],
    fetch: carbonApi.getMainAccounts,
    exportFn: carbonApi.exportMainList,
    cols: [
      seqCol,
      nameCol,
      noCol("mainAccountNo"),
      amt("mainSum", "主账户"),
      amt("emissionSum", "碳排账户"),
      amt("reductionSum", "减排账户"),
    ],
  },
  emission: {
    accountNoField: "emissionAccountNo",
    record: "emission",
    actions: ["账户记录"],
    fetch: carbonApi.getEmissionAccounts,
    exportFn: carbonApi.exportEmissionList,
    cols: [seqCol, nameCol, noCol("emissionAccountNo"), amt("emissionSum", "排放量（tCO2）")],
  },
  reduction: {
    accountNoField: "reductionAccountNo",
    record: "reduction",
    actions: ["账户记录"],
    fetch: carbonApi.getReductionAccounts,
    exportFn: carbonApi.exportReductionList,
    cols: [seqCol, nameCol, noCol("reductionAccountNo"), amt("reductionSum", "减排量（tCO2）")],
  },
  quota: {
    accountNoField: "tradeAccountNo",
    record: "quota",
    actions: ["账户记录", "资产划拨"],
    fetch: carbonApi.getQuotaAccounts,
    exportFn: carbonApi.exportQuotaList,
    cols: [
      seqCol,
      nameCol,
      noCol("tradeAccountNo"),
      amt("buySum", "配额量（tCO2）"),
      amt("sellSum", "履约量（tCO2）"),
      amt("inspectSum", "核查量（tCO2）"),
      amt("markOffSum", "划出量（tCO2）"),
      amt("cutInSum", "划入量（tCO2）"),
      amt("tradeSurplusSum", "余量（tCO2）"),
    ],
  },
  trading: {
    accountNoField: "tradeAccountNo",
    record: "trade",
    actions: ["账户记录", "资产划拨"],
    fetch: carbonApi.getTradeAccounts,
    exportFn: carbonApi.exportTradeList,
    cols: [
      seqCol,
      nameCol,
      noCol("tradeAccountNo"),
      amt("buySum", "购入量（tCO2）"),
      amt("sellSum", "卖出量（tCO2）"),
      amt("markOffSum", "划出量（tCO2）"),
      amt("cutInSum", "划入量（tCO2）"),
      amt("tradeSurplusSum", "余量（tCO2）"),
    ],
  },
};

const conf = CONF[props.variant];
const recordVariant = conf.record;
const hasTransfer = props.variant === "quota" || props.variant === "trading";

/* ── 查询 / 分页 ───────────────────────────────────────── */
const q = reactive({ enterName: "", accountNo: "" });
const rows = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const querying = ref(false);

function params(): AccountListQuery {
  const p: AccountListQuery = {
    currentPage: page.value,
    pageSize: pageSize.value,
    enterName: q.enterName.trim() || undefined,
  };
  p[conf.accountNoField] = q.accountNo.trim() || undefined;
  return p;
}

async function query() {
  if (querying.value) return;
  querying.value = true;
  try {
    const res = await conf.fetch(params());
    rows.value = res.rows ?? [];
    total.value = res.total ?? rows.value.length;
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function reset() {
  q.enterName = "";
  q.accountNo = "";
  page.value = 1;
  query();
}

function onPage(nextPage: number, nextSize: number) {
  page.value = nextPage;
  pageSize.value = nextSize;
  query();
}

onMounted(query);

function onExport() {
  void conf.exportFn(params());
  toast("导出待接入", 2000, "warn");
}

/* ── 账户记录子表（点行内「账户记录」在下方展开） ───────────── */
const recordOpen = ref(false);
const recordEnterId = ref("");

function toggleRecord(row: any) {
  if (!recordVariant || !row) return;
  if (recordOpen.value && recordEnterId.value === row.enterId) {
    recordOpen.value = false;
    return;
  }
  recordEnterId.value = row.enterId ?? "";
  recordOpen.value = true;
}

/* ── 资产划拨弹窗 ─────────────────────────────────────── */
const transferOpen = ref(false);
const transferRow = ref<any>(null);

function openTransfer(row: any) {
  transferRow.value = row;
  transferOpen.value = true;
}

function onTransferDone() {
  // 插桩：写操作不落库，刷新拿到的仍是种子数据；保留刷新动作是为了接口真接上后行为正确
  query();
}

/* ── 表格 ──────────────────────────────────────────────── */
const colDefs = computed<ColDef[]>(() => {
  if (!conf.actions.length) return conf.cols;
  return [
    ...conf.cols,
    {
      colId: "actions",
      headerName: "操作",
      width: conf.actions.length > 1 ? 150 : 90,
      sortable: false,
      cellRenderer: actionRenderer([
        { label: "账户记录", onClick: toggleRecord },
        ...(hasTransfer ? [{ label: "资产划拨", onClick: openTransfer }] : []),
      ]),
    },
  ];
});

function onFirstData(e: FirstDataRenderedEvent) {
  autoSizeOnFirstData(e);
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条：2 个条件 → 与按钮同行、不写 label、靠 placeholder（ui-rules §6） -->
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-border/60 px-2">
      <InputText v-model="q.enterName" placeholder="请输入企业名称" class="w-48 shrink-0" @keydown.enter="query" />
      <InputText v-model="q.accountNo" placeholder="请输入账户号" class="w-44 shrink-0" @keydown.enter="query" />
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="query">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="reset">
        <IconRotateClockwise class="h-3 w-3" />重置
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">共 {{ total }} 条</span>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onExport">
        <IconDownload class="h-3 w-3" />导出
      </Button>
    </div>

    <!-- 主表（有记录子表时用上下 Splitter，对应线上「点账户记录后区块被推下去」） -->
    <Splitter v-if="recordOpen" :gutter-size="1" layout="vertical" class="min-h-0 flex-1 border-0">
      <SplitterPanel :size="55" :min-size="25">
        <div class="flex h-full min-h-0 flex-col overflow-hidden">
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
        </div>
      </SplitterPanel>
      <SplitterPanel :size="45" :min-size="25">
        <AccountRecordPanel v-if="recordVariant && recordOpen" :variant="recordVariant" :enter-id="recordEnterId" />
      </SplitterPanel>
    </Splitter>

    <template v-else>
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
    </template>

    <AssetTransferDialog
      v-if="hasTransfer"
      v-model:open="transferOpen"
      :mode="props.variant === 'quota' ? 'quota' : 'trade'"
      :enter-id="transferRow?.enterId ?? ''"
      :enter-name="transferRow?.enterName ?? ''"
      :default-from="props.variant === 'quota' ? '配额账户' : '交易账户'"
      :default-to="props.variant === 'quota' ? '交易账户' : '配额账户'"
      @done="onTransferDone"
    />
  </div>
</template>
