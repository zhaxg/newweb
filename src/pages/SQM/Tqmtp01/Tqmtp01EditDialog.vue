<script setup lang="ts">
/** FrmTqmtp01EditForm（新增/编辑产品规范）：DDH.Winforms.SQM.Forms.Tqmtp.FrmTqmtp01EditForm
 *  已接入：tqmtp01Api.save；标准牌号选择=tqmtpa6Api.query；字典=querySysKvItemList(PRODUCT_CLASS/PRODUCT_CODE/CUST_STD/DELIVY_STATUS/FAC_CODE/PRODUCT_LEVEL)
 *  布局：DataLayoutControl 坐标回读 = 3 列 × 7 行 + 三个整行（产品规范说明/合同备注/备注），按行主序排布
 *  偏差：热处理状态和类型/表面状态/截面公差精度组别/弯曲度/质保书类型代码/新试产品代码1 六个 ImageComboBox
 *        在原程序中既无 Designer Items 也未挂 formatter（运行时空下拉），按原样迁为文本输入 */
import { reactive, ref, watch, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import InputNumber from "primevue/inputnumber";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import { tqmtp01Api, tqmtpa6Api, type Tqmtp01, type Tqmtpa6, ValidFlag } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { NextStrId } from "@/lib/yitIdHelper";

const props = defineProps<{ visible: boolean; row: Tqmtp01 | null }>();
const emit = defineEmits<{ "update:visible": [boolean]; ok: [] }>();

type Opt = { label: string; value: string };
const blank = (): Tqmtp01 => ({
  id: NextStrId(),
  creator: "",
  createTime: "",
  cValidFlag: ValidFlag.Invalid,
});
const form = reactive<Tqmtp01>(blank());
const errors = reactive<Record<string, string>>({});
const saving = ref(false);
const changeDate = ref<Date | null>(null);

const kvProdClass = ref<Opt[]>([]);
const kvProdCode = ref<Opt[]>([]);
const kvCustStd = ref<Opt[]>([]);
const kvDelivy = ref<Opt[]>([]);
const kvFactory = ref<Opt[]>([]);
const kvLevel = ref<Opt[]>([]);
const sgOptions = ref<{ label: string; value: string; row: Tqmtpa6 }[]>([]);

async function loadKv(target: Ref<Opt[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    Object.assign(form, blank(), props.row ?? {});
    changeDate.value = form.dChangeProductDate ? new Date(form.dChangeProductDate) : null;
    await Promise.all([
      loadKv(kvProdClass, "A0100:PRODUCT_CLASS"),
      loadKv(kvProdCode, "A0100:PRODUCT_CODE"),
      loadKv(kvCustStd, "A0100:CUST_STD"),
      loadKv(kvDelivy, "A0100:DELIVY_STATUS"),
      loadKv(kvFactory, "A0100:FAC_CODE"),
      loadKv(kvLevel, "A0100:PRODUCT_LEVEL"),
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

/* 原 ucSelectTqmtpa61_EditValueChanged：选中标准牌号回填牌号/标准/代码 */
function onSgChange(v: string | null) {
  if (!v) {
    form.cStdSgCode = null;
    return;
  }
  const o = sgOptions.value.find((x) => x.value === v)?.row;
  form.cSgSign = o?.cSgSign ?? null;
  form.cSgStd = o?.cSgStd ?? null;
  form.cStdSgCode = o?.cStdSgCode ?? null;
}
/* 原 ucJgyt1/ucJhzt1/ucProdCode/ucProdClass_EditValueChanged：选中回填叙述列 */
function onKvChange(key: "cProcessPurposeCode" | "cDelivyStatusCode" | "cProdCode" | "cProdClass", v: string | null) {
  const src =
    key === "cProcessPurposeCode" ? kvCustStd
      : key === "cDelivyStatusCode" ? kvDelivy
        : key === "cProdCode" ? kvProdCode
          : kvProdClass;
  const label = src.value.find((x) => x.value === v)?.label ?? null;
  if (key === "cProcessPurposeCode") form.cProcessPurposeDesc = label;
  if (key === "cDelivyStatusCode") form.cDeliveryStateDesc = label;
  if (key === "cProdCode") form.cProdCName = label;
  if (key === "cProdClass") form.cProdClassText = label;
}

/* 原 OnOkClick：四个叙述列=下拉文本 → 六项必填校验 → 拼 CPscDesc → save（原程序保存无成功提示，静默关闭） */
async function onOk() {
  form.cBendGroupDesc = form.cBendGroup ?? null;
  form.cTolPrecGroupDesc = form.cTolPrecGroup ?? null;
  form.cSurfaceStatusDesc = form.cSurfaceStatus ?? null;
  form.cHeatAndTypeDesc = form.cHeatAndTypeCode ?? null;

  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.cProdClass) errors.cProdClass = "请选择产品大类";
  if (!form.cProdCode) errors.cProdCode = "请选择品名";
  if (!form.cStdSgCode) errors.cStdSgCode = "请选择标准牌号";
  if (!form.cDelivyStatusCode) errors.cDelivyStatusCode = "请选择交货状态";
  if (!form.cLevel) errors.cLevel = "请选择产品等级";
  if (!form.cFactoryId) errors.cFactoryId = "请选择制造厂别";
  if (Object.keys(errors).length) return;

  form.cPscDesc = `${form.cProdCName ?? ""} ${form.cProdClassText ?? ""} ${form.cSgStd ?? ""} ${form.cSgSign ?? ""} ${form.cDeliveryStateDesc ?? ""}`;
  form.dChangeProductDate = fmtD(changeDate.value);
  saving.value = true;
  try {
    await tqmtp01Api.save(form);
    emit("update:visible", false);
    emit("ok");
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}
const fmtD = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19) : null;
</script>

<template>
  <Dialog :visible="props.visible" modal :header="props.row ? '编辑产品规范' : '新增产品规范'"
    :style="{ width: 'min(64rem, calc(100vw - 2rem))' }" @update:visible="emit('update:visible', $event)">
    <!-- 原 DataLayoutControl 三列行主序（坐标回读），末三行整行 -->
    <div class="grid grid-cols-3 items-start gap-x-3 gap-y-2">
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">产品规范码</label>
          <InputText v-model="form.cPsc" placeholder="自动生成" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">品名代码</label>
          <Select :model-value="form.cProdCode ?? null" :options="kvProdCode" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="品名代码" class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => { form.cProdCode = v; onKvChange('cProdCode', v); }" />
        </div>
        <p v-if="errors.cProdCode" class="mt-0.5 pl-[5.375rem] text-xs text-destructive">{{ errors.cProdCode }}</p>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">加工用途</label>
          <Select :model-value="form.cProcessPurposeCode ?? null" :options="kvCustStd" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="加工用途" class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => { form.cProcessPurposeCode = v; onKvChange('cProcessPurposeCode', v); }" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">标准牌号代码</label>
          <Select :model-value="form.cStdSgCode ?? null" :options="sgOptions" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="标准牌号" class="min-w-0 flex-1"
            @update:model-value="onSgChange" />
        </div>
        <p v-if="errors.cStdSgCode" class="mt-0.5 pl-[5.375rem] text-xs text-destructive">{{ errors.cStdSgCode }}</p>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">标准</label>
          <InputText v-model="form.cSgStd" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">钢种牌号</label>
          <InputText v-model="form.cSgSign" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">热处理状态和类型</label>
          <InputText v-model="form.cHeatAndTypeCode" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">表面状态</label>
          <InputText v-model="form.cSurfaceStatus" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">截面公差精度组别</label>
          <InputText v-model="form.cTolPrecGroup" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">弯曲度</label>
          <InputText v-model="form.cBendGroup" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">产品认证</label>
          <InputText v-model="form.cProdAuth" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">质保书类型代码</label>
          <InputText v-model="form.cCertiTypeCode" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">质保书份数</label>
          <InputNumber v-model="form.nCertiNum" :min="0" :use-grouping="false" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">新试产品代码1</label>
          <InputText v-model="form.cNewProductCode" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">转产日期1</label>
          <DatePicker v-model="changeDate" :manual-input="false" date-format="yy-mm-dd" show-icon
            class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">交货状态</label>
          <Select :model-value="form.cDelivyStatusCode ?? null" :options="kvDelivy" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="交货状态" class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => { form.cDelivyStatusCode = v; onKvChange('cDelivyStatusCode', v); }" />
        </div>
        <p v-if="errors.cDelivyStatusCode" class="mt-0.5 pl-[5.375rem] text-xs text-destructive">{{ errors.cDelivyStatusCode }}</p>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">产品大类及形状</label>
          <Select :model-value="form.cProdClass ?? null" :options="kvProdClass" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="产品大类及形状" class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => { form.cProdClass = v; onKvChange('cProdClass', v); }" />
        </div>
        <p v-if="errors.cProdClass" class="mt-0.5 pl-[5.375rem] text-xs text-destructive">{{ errors.cProdClass }}</p>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">制造厂别</label>
          <Select :model-value="form.cFactoryId ?? null" :options="kvFactory" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="制造厂别" class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => (form.cFactoryId = v)" />
        </div>
        <p v-if="errors.cFactoryId" class="mt-0.5 pl-[5.375rem] text-xs text-destructive">{{ errors.cFactoryId }}</p>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">产品等级</label>
          <Select :model-value="form.cLevel ?? null" :options="kvLevel" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="产品等级" class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => (form.cLevel = v)" />
        </div>
        <p v-if="errors.cLevel" class="mt-0.5 pl-[5.375rem] text-xs text-destructive">{{ errors.cLevel }}</p>
      </div>

      <div class="col-span-3 min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">产品规范说明</label>
          <InputText v-model="form.cPscDesc" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="col-span-3 min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-20 shrink-0 text-xs text-muted-foreground">合同备注</label>
          <InputText v-model="form.cRemarkDesc" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="col-span-3 min-w-0">
        <div class="flex min-w-0 items-start gap-1.5">
          <label class="w-20 shrink-0 pt-1.5 text-xs text-muted-foreground">备注</label>
          <Textarea v-model="form.cRemark" rows="4" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:visible', false)" />
      <Button label="确定" variant="outlined" :loading="saving" @click="onOk" />
    </template>
  </Dialog>
</template>
