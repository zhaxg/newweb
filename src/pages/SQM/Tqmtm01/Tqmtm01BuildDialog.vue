<script setup lang="ts">
/** FrmTqmtm011（新建/复制冶金规范向导）：DDH.Winforms.SQM.Forms.Tqmtm.FrmTqmtm011
 *  布局：DataLayoutControl 单列 7 行（产品大类→标准牌号→品名→形状→钢类→标准类别→厂别）+ 底部生成码标签
 *  已接入：mSCApi.buildMSCNo（形状/钢类/标准类别/厂别 四项齐 → 自动生成）；字典 QMA1/QMA2/QMA3/FAC_CODE/PRODUCT_CLASS/PRODUCT_CODE；标准牌号=tqmtpa6Api.query
 *  校验：七项必填 → 「信息不完整」；未生成规范码 → 「未能生成冶金规范码」 */
import { reactive, ref, watch, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import { mSCApi, tqmtpa6Api, type Tqmtpa6 } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { useToast } from "@/composables/useToast";

export interface BuildResult {
  msc: string;
  productClass: string | null;
  productClassDesc: string | null;
  prodCode: string | null;
  prodName: string | null;
  stdSgCode: string | null;
  sgSign: string | null;
  sgStd: string | null;
  sgClassCode: string | null;
  fac: string | null;
}

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ "update:visible": [boolean]; ok: [BuildResult] }>();
const { toast } = useToast();

type Opt = { label: string; value: string };
const form = reactive({
  productClass: null as string | null,
  stdSgCode: null as string | null,
  prodCode: null as string | null,
  shape: null as string | null,
  steelType: null as string | null,
  stdType: null as string | null,
  fac: null as string | null,
});
const mscNo = ref("");
const kvProductClass = ref<Opt[]>([]);
const kvProdCode = ref<Opt[]>([]);
const kvShape = ref<Opt[]>([]);
const kvSteelType = ref<Opt[]>([]);
const kvStdType = ref<Opt[]>([]);
const kvFac = ref<Opt[]>([]);
const sgOptions = ref<{ label: string; value: string; row: Tqmtpa6 }[]>([]);

async function loadKv(target: Ref<Opt[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}
const labelOf = (src: Ref<Opt[]>, v: string | null) => src.value.find((x) => x.value === v)?.label ?? null;

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    Object.assign(form, {
      productClass: null,
      stdSgCode: null,
      prodCode: null,
      shape: null,
      steelType: null,
      stdType: null,
      fac: null,
    });
    mscNo.value = "";
    await Promise.all([
      loadKv(kvProductClass, "A0100:PRODUCT_CLASS"),
      loadKv(kvProdCode, "A0100:PRODUCT_CODE"),
      loadKv(kvShape, "A0100:QMA1"),
      loadKv(kvSteelType, "A0100:QMA2"),
      loadKv(kvStdType, "A0100:QMA3"),
      loadKv(kvFac, "A0100:FAC_CODE"),
    ]);
    try {
      const list = (await tqmtpa6Api.query({})) ?? [];
      sgOptions.value = list.map((x) => ({
        label: [x.cStdSgCode, x.cSgSign, x.cSgStd].filter(Boolean).join(" "),
        value: x.cStdSgCode ?? "",
        row: x,
      }));
    } catch {
      /* 拦截层已 toast */
    }
  },
);

/* 原 SetMSCNo：形状/钢类/标准类别/厂别 四项齐才请求，失败置空 */
async function setMscNo() {
  const { shape, stdType, steelType, fac } = form;
  if (!shape || !stdType || !steelType || !fac) {
    mscNo.value = "";
    return;
  }
  try {
    mscNo.value = (await mSCApi.buildMSCNo(shape, steelType, stdType, fac)) ?? "";
  } catch {
    mscNo.value = "";
  }
}
const onShapeChange = (v: string | null) => {
  form.shape = v;
  void setMscNo();
};
const onStdTypeChange = (v: string | null) => {
  form.stdType = v;
  void setMscNo();
};
const onSteelChange = (v: string | null) => {
  form.steelType = v;
  void setMscNo();
};
const onFacChange = (v: string | null) => {
  form.fac = v;
  void setMscNo();
};

function onOk() {
  const { productClass, stdSgCode, prodCode, shape, stdType, steelType, fac } = form;
  if (!productClass || !stdSgCode || !prodCode || !shape || !stdType || !steelType || !fac) {
    toast("信息不完整", 2500, "error");
    return;
  }
  if (!mscNo.value.trim()) {
    toast("未能生成冶金规范码", 2500, "error");
    return;
  }
  const sg = sgOptions.value.find((x) => x.value === stdSgCode)?.row;
  emit("ok", {
    msc: mscNo.value,
    productClass,
    productClassDesc: labelOf(kvProductClass, productClass),
    prodCode,
    prodName: labelOf(kvProdCode, prodCode),
    stdSgCode,
    sgSign: sg?.cSgSign ?? null,
    sgStd: sg?.cSgStd ?? null,
    sgClassCode: sg?.cSgClassCode ?? null,
    fac,
  });
  emit("update:visible", false);
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    header="新建冶金规范"
    :style="{ width: 'min(30rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="grid grid-cols-1 items-start gap-y-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-24 shrink-0 text-xs text-muted-foreground">产品大类</label>
        <Select
          :model-value="form.productClass"
          :options="kvProductClass"
          :filter="true"
          show-clear
          option-label="label"
          option-value="value"
          placeholder="产品大类"
          class="min-w-0 flex-1"
          @update:model-value="(v: string | null) => (form.productClass = v)"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-24 shrink-0 text-xs text-muted-foreground">标准牌号</label>
        <Select
          :model-value="form.stdSgCode"
          :options="sgOptions"
          :filter="true"
          show-clear
          option-label="label"
          option-value="value"
          placeholder="标准牌号"
          class="min-w-0 flex-1"
          @update:model-value="(v: string | null) => (form.stdSgCode = v)"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-24 shrink-0 text-xs text-muted-foreground">品名</label>
        <Select
          :model-value="form.prodCode"
          :options="kvProdCode"
          :filter="true"
          show-clear
          option-label="label"
          option-value="value"
          placeholder="品名"
          class="min-w-0 flex-1"
          @update:model-value="(v: string | null) => (form.prodCode = v)"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-24 shrink-0 text-xs text-muted-foreground">形状</label>
        <Select
          :model-value="form.shape"
          :options="kvShape"
          :filter="true"
          show-clear
          option-label="label"
          option-value="value"
          placeholder="形状"
          class="min-w-0 flex-1"
          @update:model-value="onShapeChange"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-24 shrink-0 text-xs text-muted-foreground">钢类</label>
        <Select
          :model-value="form.steelType"
          :options="kvSteelType"
          :filter="true"
          show-clear
          option-label="label"
          option-value="value"
          placeholder="钢类"
          class="min-w-0 flex-1"
          @update:model-value="onSteelChange"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-24 shrink-0 text-xs text-muted-foreground">标准类别</label>
        <Select
          :model-value="form.stdType"
          :options="kvStdType"
          :filter="true"
          show-clear
          option-label="label"
          option-value="value"
          placeholder="标准类别"
          class="min-w-0 flex-1"
          @update:model-value="onStdTypeChange"
        />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-24 shrink-0 text-xs text-muted-foreground">厂别</label>
        <Select
          :model-value="form.fac"
          :options="kvFac"
          :filter="true"
          show-clear
          option-label="label"
          option-value="value"
          placeholder="厂别"
          class="min-w-0 flex-1"
          @update:model-value="onFacChange"
        />
      </div>
      <div class="mt-1 flex items-center gap-1.5 border-t border-border/60 pt-2">
        <label class="w-24 shrink-0 text-xs text-muted-foreground">冶金规范码</label>
        <span class="text-xs font-medium">{{ mscNo || "—" }}</span>
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:visible', false)" />
      <Button label="确定" variant="outlined" @click="onOk" />
    </template>
  </Dialog>
</template>
