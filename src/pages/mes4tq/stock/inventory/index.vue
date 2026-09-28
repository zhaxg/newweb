<script setup lang="ts">
/** 对应 TS0002 库存管理（物料与库存 · 附录 A3 版式 **L1 · 实物库存 + 收发存两页签**）
 *
 *  接口：`stockApi.page`（实物库存分页）· `stockApi.balance`（收发存汇总）
 *
 *  演示要点：**两个页签回答两个不同问题**——
 *  - **实物库存**：「这个料现在在哪个库位、有多少」（料号 + 批次 + 库位的粒度）；
 *  - **收发存**：「这个料这期间进出了多少、结存对不对」（料号 + 库房的粒度）。
 *  合成一张表是做不到的，因为**粒度不同**：同料号在收发存里只有一行、
 *  在实物库存里有两三行。拆成两页签，客户就知道该翻哪一页。
 *
 *  **收发存那条等式是这一页的全部价值**：`期初 + 入 - 出 = 结存`。
 *  行上五个数全在，客户拿计算器一按就能验；`diff` 列直接给出残差（应为 0）。
 *  这张表本来就是给对账用的，差 1 吨客户就会问「哪笔漏了」。
 *
 *  **与 TS0003 的分工**：那一页看**单笔流水**（凭证号级），
 *  这一页看**状态与汇总结存**。查账流程是：先在收发存看出对不上、
 *  再去 TS0003 翻那笔凭证。
 *
 *  待接入：库存调拨、盘点单（本域只查桩）。
 */
import { computed, onMounted, ref, watch } from "vue";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import ListPage from "../../ListPage.vue";
import { materialApi, stockApi, storeApi } from "@/api/mes4tq";
import { codeFmt, dashFmt, dayFmt, numFmt, qtyFmt, tagRenderer } from "../../cells";
import { useNameMaps } from "../../nameMaps";
import type { ListPageSpec } from "../../listTypes";

const { ready, materialMap } = useNameMaps();
const listRef = ref<InstanceType<typeof ListPage> | null>(null);
const cards = ref<Array<{ label: string; value: string | number; sub?: string }>>([]);

const activeTab = ref("stock");
const materialOptions = ref<string[]>([]);
const materialValueMap = ref<Record<string, string>>({});
const roomOptions = ref<string[]>([]);
const roomValueMap = ref<Record<string, string>>({});
const roomMap = ref<Record<string, string>>({});

const spec = computed<ListPageSpec>(() => ({
  code: "TS0002",
  exportEntity: "stock",
  query: [
    { key: "keyword", label: "关键词", kind: "input", placeholder: "物料 / 批次 / 库位 / 供应商" },
    {
      key: "materialId",
      label: "物料",
      kind: "select",
      options: materialOptions.value,
      valueMap: materialValueMap.value,
      placeholder: "全部",
    },
    {
      key: "storeRoomCode",
      label: "库房",
      kind: "select",
      options: roomOptions.value,
      valueMap: roomValueMap.value,
      placeholder: "全部",
    },
    { key: "unit", label: "单位", kind: "select", options: ["t", "m³", "kg"], placeholder: "全部" },
    { key: "minH2o", label: "水分≥%", kind: "input", placeholder: "0-20" },
  ],
  columns: [
    { field: "materialId", headerName: "物料", width: 132, pinned: "left", valueFormatter: codeFmt(materialMap.value) },
    { field: "cargoName", headerName: "货名", width: 130 },
    { field: "batchNo", headerName: "批次号", width: 148 },
    { field: "spec", headerName: "规格", width: 130, valueFormatter: dashFmt },
    { field: "dryWeight", headerName: "干基 t", width: 126, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "wetWeight", headerName: "湿基 t", width: 126, type: "numericColumn", valueFormatter: qtyFmt },
    { field: "h2o", headerName: "水分 %", width: 100, type: "numericColumn", valueFormatter: numFmt(2) },
    { field: "storeRoomCode", headerName: "库房", width: 140, valueFormatter: codeFmt(roomMap.value) },
    { field: "storePositionCode", headerName: "库位", width: 140 },
    { field: "supplierDesc", headerName: "供应商", width: 140, valueFormatter: dashFmt },
    { field: "timeStamp", headerName: "乐观锁时间戳", width: 176, valueFormatter: dayFmt },
    { field: "creator", headerName: "创建人", width: 96 },
    { field: "createTime", headerName: "创建时间", width: 166 },
  ],
  actions: [
    { label: "详情", kind: "detail" },
    { label: "流水", kind: "link", to: "/tqmes/stock/inout" },
  ],
  toolbar: { extraButtons: ["▶ 模拟入库", "▶ 模拟出库"] },
  fetch: (q) => stockApi.page(q),
  summary: ({ total, rows }) => {
    const dry = rows.reduce((s, r) => s + r.dryWeight, 0);
    return `本页 ${total} 条 · 干基合计 ${Math.round(dry).toLocaleString("zh-CN")} t`;
  },
}));

/* ── 收发存页签：整张表，不分页（见文件头「粒度不同」的说明）─────────── */

const balances = ref<any[]>([]);

async function loadBalance() {
  try {
    balances.value = await stockApi.balance();
  } catch {
    /* 拦截层已 toast */
  }
}

/** 收发存的行必须满足 `期初 + 入 - 出 = 结存`；`diff` 非 0 的行标出来（应为 0 行） */
const badRows = computed(() => balances.value.filter((r) => Math.abs(Number(r.diff)) > 0));

async function loadOptions() {
  try {
    const [mats, rooms] = await Promise.all([materialApi.list(), storeApi.rooms()]);
    materialOptions.value = mats.map((m) => m.name);
    materialValueMap.value = Object.fromEntries(mats.map((m) => [m.name, m.id]));
    roomOptions.value = rooms.map((r) => r.name);
    roomValueMap.value = Object.fromEntries(rooms.map((r) => [r.name, r.id]));
    roomMap.value = Object.fromEntries(rooms.map((r) => [r.id, r.name]));
  } catch {
    /* 拦截层已 toast */
  }
}

async function loadCards() {
  try {
    const [all, bal] = await Promise.all([stockApi.page({ pageSize: 500 }), stockApi.balance()]);
    const rows = all.rows;
    cards.value = [
      { label: "库存记录", value: rows.length, sub: "料号 + 批次 + 库位" },
      {
        label: "干基合计",
        value: `${Math.round(rows.reduce((s, r) => s + r.dryWeight, 0)).toLocaleString("zh-CN")} t`,
        sub: "全库房",
      },
      { label: "涉及物料", value: new Set(rows.map((r) => r.materialId)).size, sub: "29 种主数据中动过的" },
      {
        label: "收发存验算不平",
        value: bal.filter((r) => Math.abs(Number(r.diff)) > 0).length,
        sub: "期初+入-出=结存，应为 0",
      },
    ];
    listRef.value?.reload();
  } catch {
    /* 拦截层已 toast */
  }
}

watch(
  ready,
  (v) => {
    if (v) listRef.value?.reload();
  },
  { once: true },
);

onMounted(() => {
  void loadOptions();
  void loadCards();
  void loadBalance();
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <Tabs v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col">
      <TabList class="min-w-0 flex-1">
        <Tab value="stock">实物库存</Tab>
        <Tab value="balance">收发存</Tab>
      </TabList>
      <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
        <!-- 页签一：实物库存（分页） -->
        <TabPanel value="stock" class="h-full">
          <ListPage ref="listRef" :spec="spec" :stat-cards="cards" />
        </TabPanel>

        <!-- 页签二：收发存（整张表，不分页） -->
        <TabPanel value="balance" class="h-full overflow-auto">
          <div class="flex h-9 items-center gap-3 border-b border-border/60 px-3">
            <span class="text-xs text-muted-foreground"> 收发存（按料号 + 库房）· 期初 + 入 − 出 = 结存 </span>
            <span class="ml-auto text-xs" :class="badRows.length ? 'text-destructive' : 'text-muted-foreground'">
              {{ badRows.length ? `验算不平 ${badRows.length} 行` : "全部行验算通过" }}
            </span>
          </div>
          <table class="w-full text-body">
            <thead class="sticky top-0 bg-card text-xs text-muted-foreground">
              <tr class="[&>th]:px-3 [&>th]:py-2 [&>th]:text-right [&>th]:font-normal">
                <th class="!text-left">物料</th>
                <th class="!text-left">库房</th>
                <th>期初 t</th>
                <th>本期入 t</th>
                <th>本期出 t</th>
                <th>结存 t</th>
                <th>残差 t</th>
              </tr>
            </thead>
            <tbody class="[&>td]:px-3 [&>td]:py-2">
              <tr v-for="r in balances" :key="r.id" class="border-t border-border/50 [&>td]:text-right">
                <td class="!text-left">{{ materialMap[r.materialId] ?? r.materialId }}</td>
                <td class="!text-left">{{ roomMap[r.storeRoomCode] ?? r.storeRoomCode }}</td>
                <td class="tabular-nums">{{ r.beginWeight.toLocaleString("zh-CN") }}</td>
                <td class="tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{{ r.inWeight.toLocaleString("zh-CN") }}
                </td>
                <td class="tabular-nums text-red-600 dark:text-red-400">−{{ r.outWeight.toLocaleString("zh-CN") }}</td>
                <td class="tabular-nums font-medium">{{ r.endWeight.toLocaleString("zh-CN") }}</td>
                <td
                  class="tabular-nums"
                  :class="Math.abs(r.diff) > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'"
                >
                  {{ r.diff === 0 ? "0" : r.diff }}
                </td>
              </tr>
              <tr v-if="!balances.length">
                <td colspan="7" class="py-6 text-center text-sm text-muted-foreground">加载中…</td>
              </tr>
            </tbody>
          </table>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
