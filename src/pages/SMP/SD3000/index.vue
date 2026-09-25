<script setup lang="ts">
/** 对应 FrmSD3000（中厚板调配日志查询）：DDH.Winforms.SMP.Forms.FrmSD3000
 *  已接入：tmp2000Api.getTyd2000AllocationLogsAsync（查询后上表按 创建人+日期+结算单位+订货单位 分组计件数，下表明细）
 *  待接入：无（上下双表：gridControl1 分组 / splitterControl1 / gridControl2 明细；装载默认 DBegin=当月首日、DEnd=今日） */

import { onMounted, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import DatePicker from "primevue/datepicker";
import Splitter from "primevue/splitter";
import SplitterPanel from "primevue/splitterpanel";
import { IconSearch } from "@tabler/icons-vue";

import { AgGridVue } from "ag-grid-vue3";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { AG_GRID_LOCALE_CN } from "@ag-grid-community/locale";
import { autoSizeOnFirstData, hmxDefaultColDef, makeHmxGridTheme } from "@/lib/agGrid";
import { tmp2000Api } from "@/api/mes4ddh/smp.swagger";
import type { InputTyd2000AllocationDto, Tyd2000Allocation } from "@/api/mes4ddh/smp.swagger";

const theme = makeHmxGridTheme();

// 查询条件（原 dataLayoutControl1 → InputTyd2000AllocationDto）
const q = ref({
  cOrderNo: "", // 订单号
  cSettleCust: "", // 结算单位
  cPieceNo: "", // 件次号
  dBegin: null as Date | null, // 开始时间
  dEnd: null as Date | null, // 截止时间
});
const querying = ref(false);

const groupRows = ref<Tyd2000Allocation[]>([]); // 上表：分组（原 GroupByBindingSource）
const detailRows = ref<Tyd2000Allocation[]>([]); // 下表：明细（原 tyd2000AllocationLogBindingSource）
const groupApi = ref<GridApi | null>(null);
const detailApi = ref<GridApi | null>(null);

function fmtDate(d: Date | null): string | undefined {
  if (!d) return undefined;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 上表 gridView1：可见 5 列 + 隐藏 9 列（Tyd2000Allocation 实体 [LDisplay]）
const groupColDefs: ColDef[] = [
  { field: "creator", headerName: "创建人", width: 150 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "nNum", headerName: "件数", width: 90 },
  { field: "cSettleCust", headerName: "结算单位", width: 150 },
  { field: "cCustName", headerName: "订货单位", width: 150 },
  { field: "id", headerName: "C_ID", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cPieceNo", headerName: "件次号", hide: true },
  { field: "cOrderNo", headerName: "预约单号", hide: true },
  { field: "cRemark", headerName: "反馈结果", hide: true },
  { field: "cInboundNo", headerName: "原入库标识", hide: true },
  { field: "cInboundNo2", headerName: "现入库标识", hide: true },
  { field: "selected", headerName: "选择", hide: true },
];

// 下表 gridView2：可见 8 列（COrderNo 列头为 Designer Caption「订单号」）+ 隐藏 6 列
const detailColDefs: ColDef[] = [
  { field: "creator", headerName: "创建人", width: 150 },
  { field: "createTime", headerName: "创建时间", width: 150 },
  { field: "cPieceNo", headerName: "件次号", width: 150 },
  { field: "cOrderNo", headerName: "订单号", width: 150 },
  { field: "cSettleCust", headerName: "结算单位", width: 150 },
  { field: "cInboundNo2", headerName: "现入库标识", width: 150 },
  { field: "cInboundNo", headerName: "原入库标识", width: 150 },
  { field: "cCustName", headerName: "订货单位", width: 150 },
  { field: "id", headerName: "C_ID", hide: true },
  { field: "lastModifier", headerName: "最后修改人", hide: true },
  { field: "lastModifyTime", headerName: "最后修改时间", hide: true },
  { field: "cRemark", headerName: "反馈结果", hide: true },
  { field: "nNum", headerName: "件数", hide: true },
  { field: "selected", headerName: "选择", hide: true },
];

function onGroupGridReady(e: GridReadyEvent) {
  groupApi.value = e.api;
}
function onDetailGridReady(e: GridReadyEvent) {
  detailApi.value = e.api;
}

/** 原 BindData：GetTyd2000AllocationLogsAsync(_searchInput) → GroupBy(Creator, yyyy/MM/dd, CSettleCust, CCustName).Count() */
async function onQuery() {
  querying.value = true;
  try {
    const dto: InputTyd2000AllocationDto = {
      cOrderNo: q.value.cOrderNo || undefined,
      cSettleCust: q.value.cSettleCust || undefined,
      cPieceNo: q.value.cPieceNo || undefined,
      dBegin: fmtDate(q.value.dBegin),
      dEnd: fmtDate(q.value.dEnd),
    };
    const list = (await tmp2000Api.getTyd2000AllocationLogsAsync(dto)) ?? [];

    const map = new Map<string, Tyd2000Allocation>();
    for (const r of list) {
      const date = String(r.createTime ?? "")
        .slice(0, 10)
        .replace(/-/g, "/");
      const key = `${r.creator}|${date}|${r.cSettleCust}|${r.cCustName}`;
      const hit = map.get(key);
      if (hit) {
        hit.nNum = (hit.nNum ?? 0) + 1;
      } else {
        map.set(key, {
          creator: r.creator,
          createTime: date,
          cSettleCust: r.cSettleCust,
          cCustName: r.cCustName,
          nNum: 1,
        });
      }
    }
    groupRows.value = [...map.values()];
    detailRows.value = list;
    requestAnimationFrame(() => {
      groupApi.value?.autoSizeAllColumns();
      detailApi.value?.autoSizeAllColumns();
    });
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

onMounted(() => {
  // 原 FrmSD3000_Load：DBegin=当月第一天、DEnd=今天（仅赋默认值，不自动查询）
  const now = new Date();
  q.value.dBegin = new Date(now.getFullYear(), now.getMonth(), 1);
  q.value.dEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询条件（原 dataLayoutControl1）：订单号/结算单位/件次号/开始时间/截止时间 -->
    <div class="shrink-0 border-b border-border/60 px-3 py-2">
      <div class="grid grid-cols-6 items-center gap-x-3 gap-y-1.5">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
          <InputText v-model="q.cOrderNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">结算单位</label>
          <InputText v-model="q.cSettleCust" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">件次号</label>
          <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">开始时间</label>
          <DatePicker
            v-model="q.dBegin"
            :manual-input="false"
            date-format="yy-mm-dd"
            show-icon
            class="min-w-0 flex-1"
          />
        </div>
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-16 shrink-0 text-xs text-muted-foreground">截止时间</label>
          <DatePicker v-model="q.dEnd" :manual-input="false" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1）：查询 -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">中厚板调配日志查询（{{ detailRows.length }}）</span>
    </div>

    <!-- 上下分栏（原 gridControl1 Dock.Top + splitterControl1 + gridControl2 Dock.Fill，约 40/60） -->
    <Splitter :gutter-size="1" layout="vertical" class="min-h-0 flex-1 border-0">
      <SplitterPanel :size="40" :min-size="15">
        <div class="h-full min-h-0 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="groupColDefs"
            :row-data="groupRows"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onGroupGridReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
      <SplitterPanel :size="60" :min-size="15">
        <div class="h-full min-h-0 overflow-hidden">
          <AgGridVue
            class="hmx-ag-grid h-full w-full"
            :theme="theme"
            :locale-text="AG_GRID_LOCALE_CN"
            :default-col-def="hmxDefaultColDef"
            :column-defs="detailColDefs"
            :row-data="detailRows"
            :suppress-column-virtualisation="true"
            :pagination="false"
            :animate-rows="false"
            :loading="querying"
            @grid-ready="onDetailGridReady"
            @first-data-rendered="autoSizeOnFirstData"
          />
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
