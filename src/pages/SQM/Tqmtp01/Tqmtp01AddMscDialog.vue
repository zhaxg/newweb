<script setup lang="ts">
/** FrmTqmtp01AddMsc（添加冶金规范对照）：DDH.Winforms.SQM.Forms.Tqmtp.FrmTqmtp01AddMsc
 *  已接入：tqmtp01Api.addMsc；冶金规范选择=mSCApi.queryTqmtm01s(validFlag=Valid)；字典=querySysKvItemList(CUST_STD/QM04/FAC_CODE)
 *  布局：DataLayoutControl 坐标回读 = 两列行主序 + 检验行三项 + 整行 客户评审号/备注/合同备注
 *  偏差：cboxCustomer（最终用户代码）原程序无绑定也无候选项（相关代码已注释），按原样迁为不入模文本框 */
import { reactive, ref, watch, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Textarea from "primevue/textarea";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import {
  tqmtp01Api,
  mSCApi,
  type Tqmtm01,
  type Tqmtp01,
  type Tqmtp03,
  ValidFlag,
} from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { NextStrId } from "@/lib/yitIdHelper";

const props = defineProps<{ visible: boolean; pscRow: Tqmtp01 | null }>();
const emit = defineEmits<{ "update:visible": [boolean]; ok: [] }>();

type Opt = { label: string; value: string };
const form = reactive<Tqmtp03>({
  id: NextStrId(),
  creator: "",
  createTime: "",
  cValidFlag: ValidFlag.Invalid,
});
const errors = reactive<Record<string, string>>({});
const saving = ref(false);
const checkDate = ref<Date | null>(null);
const customerDraft = ref(""); // 原 cboxCustomer：无绑定，编辑内容不入模型

const kvCustStd = ref<Opt[]>([]);
const kvQM04 = ref<Opt[]>([]);
const kvFactory = ref<Opt[]>([]);
const mscOptions = ref<{ label: string; value: string; row: Tqmtm01 }[]>([]);
const jgytSel = ref<string | null>(null);
const tsytSel = ref<string | null>(null);

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
    Object.assign(form, {
      id: NextStrId(),
      creator: "",
      createTime: "",
      cValidFlag: ValidFlag.Invalid,
      cPsc: props.pscRow?.cPsc ?? null,
      cPscDesc: props.pscRow?.cPscDesc ?? null,
      cMsc: null,
      cFinalUse1: null,
      cProcUseDesc: null,
      cSpecialUsagec: null,
      cCheckMaker: null,
      dCheckTime: null,
      cFactoryId: null,
      cRemark: null,
      cRemarkDesc: null,
      cClientEvaluateCode: null,
    } satisfies Partial<Tqmtp03>);
    checkDate.value = null;
    customerDraft.value = "";
    jgytSel.value = null;
    tsytSel.value = null;
    await Promise.all([
      loadKv(kvCustStd, "A0100:CUST_STD"),
      loadKv(kvQM04, "A0100:QM04"),
      loadKv(kvFactory, "A0100:FAC_CODE"),
    ]);
    try {
      const list = (await mSCApi.queryTqmtm01s({ validFlag: ValidFlag.Valid })) ?? [];
      mscOptions.value = list.map((x) => ({
        label: [x.cMsc, x.cCustStd].filter(Boolean).join(" "),
        value: x.cMsc ?? "",
        row: x,
      }));
    } catch {
      /* 拦截层已 toast */
    }
  },
);

const labelOf = (src: Ref<Opt[]>, v: string | null) => src.value.find((x) => x.value === v)?.label ?? "";

/* 原 CboxJgyt_EditValueChanged：最终用途1 = 加工用途码 + 特殊用途码；加工用途描述 = 加工用途文本 */
function onJgytChange() {
  form.cFinalUse1 = `${jgytSel.value ?? ""}${tsytSel.value ?? ""}`;
  form.cProcUseDesc = labelOf(kvCustStd, jgytSel.value) || null;
}
/* 原 CboxTsyt_EditValueChanged：最终用途1 同上拼接；特殊用途叙述 = 特殊用途文本 */
function onTsytChange() {
  form.cFinalUse1 = `${jgytSel.value ?? ""}${tsytSel.value ?? ""}`;
  form.cSpecialUsagec = labelOf(kvQM04, tsytSel.value) || null;
}
/* 原 ucSelectMSC1_EditValueChanged：选中冶金规范回填一组字段，加工用途/特殊用途联动（特殊用途取首项） */
function onMscChange(v: string | null) {
  if (!v) {
    form.cMsc = null;
    errors.cMsc = "请选择冶金规范";
    return;
  }
  delete errors.cMsc;
  const o = mscOptions.value.find((x) => x.value === v)?.row;
  form.dCheckTime = o?.dCheckTime ?? null;
  checkDate.value = o?.dCheckTime ? new Date(o.dCheckTime) : null;
  form.cCheckMaker = o?.cCheckMaker ?? null;
  form.cFactoryId = o?.cFactoryId ?? null;
  form.cMsc = o?.cMsc ?? null;
  form.cRemark = o?.cRemark ?? null;
  form.cValidFlag = o?.cValidFlag ?? ValidFlag.Invalid;
  jgytSel.value = o?.cCustStdCode ?? null;
  onJgytChange();
  tsytSel.value = kvQM04.value[0]?.value ?? null; // 原 cboxTsyt.SelectedIndex = 0
  onTsytChange();
}

/* 原 OnOkClick：CMsc 必填 → AddMsc（原程序保存无成功提示，静默关闭） */
async function onOk() {
  delete errors.cMsc;
  if (!form.cMsc) {
    errors.cMsc = "请选择冶金规范";
    return;
  }
  form.dCheckTime = fmtD(checkDate.value);
  saving.value = true;
  try {
    await tqmtp01Api.addMsc(form);
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
  <Dialog :visible="props.visible" modal header="冶金规范对照"
    :style="{ width: 'min(56rem, calc(100vw - 2rem))' }" @update:visible="emit('update:visible', $event)">
    <div class="grid grid-cols-2 items-start gap-x-3 gap-y-2">
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">产品规范码</label>
          <InputText v-model="form.cPsc" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">产品规范说明</label>
          <InputText v-model="form.cPscDesc" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">冶金规范码</label>
          <Select :model-value="form.cMsc ?? null" :options="mscOptions" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="选择冶金规范" class="min-w-0 flex-1"
            @update:model-value="onMscChange" />
        </div>
        <p v-if="errors.cMsc" class="mt-0.5 pl-[6.375rem] text-xs text-destructive">{{ errors.cMsc }}</p>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">制造厂别</label>
          <Select :model-value="form.cFactoryId ?? null" :options="kvFactory" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="制造厂别" class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => (form.cFactoryId = v)" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">加工用途</label>
          <Select v-model="jgytSel" :options="kvCustStd" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="加工用途" class="min-w-0 flex-1"
            @update:model-value="onJgytChange" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">加工用途描述</label>
          <InputText v-model="form.cProcUseDesc" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">特殊用途</label>
          <Select v-model="tsytSel" :options="kvQM04" :filter="true" show-clear
            option-label="label" option-value="value" placeholder="特殊用途" class="min-w-0 flex-1"
            @update:model-value="onTsytChange" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">特殊用途叙述</label>
          <InputText v-model="form.cSpecialUsagec" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">最终用途1</label>
          <InputText v-model="form.cFinalUse1" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">最终用户代码</label>
          <InputText v-model="customerDraft" class="min-w-0 flex-1" />
        </div>
      </div>

      <!-- 原坐标：检验责任者/检验时间1/生效标记 同处一行（生效标记在第三列） -->
      <div class="col-span-2 grid grid-cols-3 items-start gap-x-3">
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">检验责任者</label>
            <InputText v-model="form.cCheckMaker" class="min-w-0 flex-1" />
          </div>
        </div>
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-24 shrink-0 text-xs text-muted-foreground">检验时间1</label>
            <DatePicker v-model="checkDate" :manual-input="false" date-format="yy-mm-dd" show-icon
              class="min-w-0 flex-1" />
          </div>
        </div>
        <div class="min-w-0">
          <div class="flex min-w-0 items-center gap-1.5">
            <label class="w-20 shrink-0 text-xs text-muted-foreground">生效标记</label>
            <Select :model-value="form.cValidFlag" :options="[
              { label: '未生效', value: ValidFlag.Invalid },
              { label: '生效', value: ValidFlag.Valid },
            ]" show-clear option-label="label" option-value="value" placeholder="生效标记"
              class="min-w-0 flex-1"
              @update:model-value="(v: ValidFlag | null) => (form.cValidFlag = v ?? ValidFlag.Invalid)" />
          </div>
        </div>
      </div>

      <div class="col-span-2 min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">客户评审号</label>
          <InputText v-model="form.cClientEvaluateCode" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="col-span-2 min-w-0">
        <div class="flex min-w-0 items-start gap-1.5">
          <label class="w-24 shrink-0 pt-1.5 text-xs text-muted-foreground">备注</label>
          <Textarea v-model="form.cRemark" rows="5" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="col-span-2 min-w-0">
        <div class="flex min-w-0 items-start gap-1.5">
          <label class="w-24 shrink-0 pt-1.5 text-xs text-muted-foreground">合同备注</label>
          <Textarea v-model="form.cRemarkDesc" rows="1" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:visible', false)" />
      <Button label="确定" variant="outlined" :loading="saving" @click="onOk" />
    </template>
  </Dialog>
</template>
