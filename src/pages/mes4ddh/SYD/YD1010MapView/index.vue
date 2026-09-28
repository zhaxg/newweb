<script setup lang="ts">
/** 对应 FrmYD1010MapView（库位图查询，多菜单共用 cQueryString=库位图Id）：DDH.Winforms.SYD.Forms.FrmYD1010MapView
 *  已接入：tyd1000Api.queryMapData（加载库位图模板，Load）
 *          + tyd2000Api.queryStorageByMap（查询，按条件取库存并高亮垛位）
 *          + tyd1000Api.queryRoom（库房下拉）
 *  待接入：① 右侧 SpreadsheetControl xlsx 模板 + 垛位高亮/tooltip（原 TemplateByte xlsx 渲染，web 无表格渲染设施）
 *          ② 双击垛位 → FrmYD1010MapViewDetail（二级弹窗，占位）
 *          ③ 放大/缩小作用于上述占位预览区
 *  布局：查询区(11条件) → 工具栏(查询/放大/缩小) → 预览区占位 */
import { onMounted, reactive, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import RangeInput from "@/components/common/RangeInput.vue";
import Select from "primevue/select";
import { IconLayoutGrid, IconSearch, IconZoomIn, IconZoomOut } from "@tabler/icons-vue";
import { useMenuQuery } from "@/lib/menuQuery";
import {
  tyd1000Api,
  tyd2000Api,
  type StoreMapInputDto,
  type StoreMapItemDto,
  type Tyd1000,
  type Tyd2000Dto,
} from "@/api/mes4ddh/syd.swagger";
import { useToast } from "@/composables/useToast";

const { toast } = useToast();
const { raw: menuQs } = useMenuQuery();

const q = reactive({
  roomId: null as string | null,
  cStove: "",
  cPieceNo: "",
  cCon: "",
  cOrderNo: "",
  customerName: "",
  thickMin: null as number | null,
  thickMax: null as number | null,
  wthMin: null as number | null,
  wthMax: null as number | null,
  lenMin: null as number | null,
  lenMax: null as number | null,
  zzThickMin: null as number | null,
  zzThickMax: null as number | null,
  stackNo: "",
});

const roomOptions = ref<{ label: string; value: string }[]>([]);
const mapItem = ref<StoreMapItemDto | null>(null);
const mapName = ref("");
const data = ref<Tyd2000Dto[]>([]);
const querying = ref(false);
const zoom = ref(1);

/** 原 UCDecimalRange.Value → DecimalRange{min,max}；两端皆空则整条条件不传 */
function numRange(min: number | null, max: number | null) {
  if (min == null && max == null) return undefined;
  return { min: min ?? undefined, max: max ?? undefined };
}

async function loadRooms() {
  try {
    const list = ((await tyd1000Api.queryRoom("")) ?? []) as Tyd1000[];
    roomOptions.value = list
      .filter((x) => x.cStoreCode != null)
      .map((x) => ({ label: x.cStoreDes ?? x.cStoreCode ?? "", value: x.cStoreCode! }));
    if (roomOptions.value.length) q.roomId = roomOptions.value[0]!.value;
  } catch {
    /* 拦截层已 toast */
  }
}

/* Load → QueryMapData(QueryString) */
async function loadMap() {
  try {
    const item = ((await tyd1000Api.queryMapData(menuQs || undefined)) ?? null) as StoreMapItemDto | null;
    mapItem.value = item;
    mapName.value = item?.mapName ?? "";
    if (item?.mapId) {
      roomOptions.value = [{ label: item.mapName ?? item.mapId, value: item.mapId }];
      q.roomId = item.mapId;
    }
  } catch {
    /* 拦截层已 toast */
  }
}

function buildInput(): StoreMapInputDto {
  return {
    roomId: q.roomId,
    cStove: q.cStove || null,
    cPieceNo: q.cPieceNo || null,
    cCon: q.cCon || null,
    cOrderNo: q.cOrderNo || null,
    customerName: q.customerName || null,
    thick: numRange(q.thickMin, q.thickMax),
    width: numRange(q.wthMin, q.wthMax),
    len: numRange(q.lenMin, q.lenMax),
    // 原 ucDecimalRange4 → bscInput「NZZThick」；服务端 WhereInRange(PlanItem.NThick, input.NZZThick)
    nZZThick: numRange(q.zzThickMin, q.zzThickMax),
    stackNo: q.stackNo || null,
  };
}

/* btnQuery → QueryStorageByMap */
async function onQuery() {
  querying.value = true;
  try {
    data.value = ((await tyd2000Api.queryStorageByMap(buildInput())) ?? []) as Tyd2000Dto[];
    if (!data.value.length) toast("无符合条件的数据", 2000, "info");
  } catch {
    /* 拦截层已 toast */
  } finally {
    querying.value = false;
  }
}

function onZoom(delta: number) {
  zoom.value = Math.min(3, Math.max(0.3, +(zoom.value + delta).toFixed(2)));
}

function onPreviewDblClick() {
  toast("垛位明细弹窗（FrmYD1010MapViewDetail）待接入", 2500, "warn");
}

onMounted(() => {
  void loadRooms()
    .then(() => loadMap())
    .then(() => onQuery());
});
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 查询区（原 dataLayoutControl1：11 条件） -->
    <div class="grid shrink-0 grid-cols-6 items-center gap-x-3 gap-y-1.5 border-b border-border/60 px-3 py-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">库房</label>
        <Select
          v-model="q.roomId"
          :options="roomOptions"
          option-label="label"
          option-value="value"
          show-clear
          placeholder="选择库房"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="q.cStove" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">材料号</label>
        <InputText v-model="q.cPieceNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">合同号</label>
        <InputText v-model="q.cCon" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="q.cOrderNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">客户名称</label>
        <InputText v-model="q.customerName" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">厚</label>
        <RangeInput
          v-model:min="q.thickMin"
          v-model:max="q.thickMax"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">宽</label>
        <RangeInput
          v-model:min="q.wthMin"
          v-model:max="q.wthMax"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">长</label>
        <RangeInput
          v-model:min="q.lenMin"
          v-model:max="q.lenMax"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">轧制厚</label>
        <RangeInput
          v-model:min="q.zzThickMin"
          v-model:max="q.zzThickMax"
          :min-fraction-digits="0"
          :max-fraction-digits="2"
          class="min-w-0 flex-1"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">垛位</label>
        <InputText v-model="q.stackNo" class="min-w-0 flex-1" @keydown.enter="onQuery" />
      </div>
    </div>

    <!-- 工具栏（原 stackPanel1：查询 / 放大 / 缩小） -->
    <div class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" :loading="querying" @click="onQuery">
        <IconSearch class="h-3 w-3" />查询
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZoom(0.1)">
        <IconZoomIn class="h-3 w-3" />放大
      </Button>
      <Button variant="outlined" class="shrink-0 whitespace-nowrap" @click="onZoom(-0.1)">
        <IconZoomOut class="h-3 w-3" />缩小
      </Button>
      <span class="ml-auto text-xs text-muted-foreground">
        {{ mapName || "库位图" }} · 命中 {{ data.length }} 条 · {{ Math.round(zoom * 100) }}%
      </span>
    </div>

    <!-- 预览区（原 SpreadsheetControl Dock.Fill，xlsx 模板渲染 → 占位） -->
    <div class="min-h-0 flex-1 overflow-auto bg-muted/30 p-4" @dblclick="onPreviewDblClick">
      <div
        class="mx-auto max-w-3xl text-center"
        :style="{ transform: `scale(${zoom})`, transformOrigin: 'top center' }"
      >
        <IconLayoutGrid class="mx-auto h-10 w-10 text-muted-foreground/60" />
        <p class="mt-3 text-sm text-muted-foreground">库位图预览待接入</p>
        <p class="mt-2 text-xs text-muted-foreground">
          原窗体以内嵌 SpreadsheetControl 加载库位图 xlsx 模板（TemplateByte）并对垛位单元格着色/加批注； web
          侧暂无等价表格渲染设施。双击垛位明细弹窗（FrmYD1010MapViewDetail）同样待接入。
        </p>
        <p class="mt-4 text-xs text-muted-foreground">
          当前命中库存 {{ data.length }} 条（接口已接，随模板渲染接入一并展示）
        </p>
      </div>
    </div>
  </div>
</template>
