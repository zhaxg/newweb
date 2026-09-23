<script setup lang="ts">
/** 对应 FrmHR4000New（添加实绩）：DDH.Winforms.SHR.Forms.FrmHR4000New（ShowDialog 二级弹窗）
 *  已接入：hR4000Api.addSjByManual / querySg + systemKeyValueApi.getSysKvListByGroup（切边方式字典）
 *  待接入：无
 *  偏差：原 CSgCodeTextEdit.SelectedIndex=0 会随后被绑定源 thr4000.CSgCode=null 覆盖，web 默认钢种留空由用户选择；
 *        坯料件次号在 HiddenItems 不渲染 */

import { computed, reactive, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { useToast } from "@/composables/useToast";
import { systemKeyValueApi } from "@/api/admin/request";
import { NextStrId } from "@/lib/yitIdHelper";
import { NProTypeEnum, hR4000Api, type Thr4000 } from "@/api/mes4ddh/shr.swagger";
import type { Tqmtpa6 } from "@/api/mes4ddh/sqm.swagger";

const props = defineProps<{
  visible: boolean;
  lineCode: string;
}>();
const emit = defineEmits<{
  "update:visible": [v: boolean];
  ok: [];
}>();

const { toast } = useToast();

/* 剪切线代码（原 comSlCode.Items 三项写死） */
const slCodeOptions = [
  { label: "1#剪切线", value: "1" },
  { label: "2#剪切线", value: "2" },
  { label: "火切线", value: "3" },
];

const cutFlagOptions = ref<{ label: string; value: string }[]>([]);
const sgList = ref<Tqmtpa6[]>([]);
const sgOptions = computed(() => sgList.value.map((x) => ({ label: x.cSgSign ?? "", value: x.cSgSign ?? "" })));

/* 原构造：Id=NextStrId + CLineCode + NProType=产成品 + CDelivyStatusCode=ZG01 */
const form = reactive<Thr4000>({
  id: NextStrId(),
  cLineCode: props.lineCode,
  nProType: NProTypeEnum.C,
  cDelivyStatusCode: "ZG01",
  cOrderNo: "",
  cBatchNo: "",
  cStove: "",
  cPieceNo: "",
  cSgCode: "",
  cSgStd: "",
  cInboundNo: "",
  nThick: 0,
  nWidth: 0,
  nLen: 0,
  nQua: 0,
  nWgt: 0,
  cTrimFlag: "",
  cSlCode: "",
});

const confirming = ref(false);
const saving = ref(false);

/* 原 CSgCodeTextEdit_SelectedValueChanged：按钢种带出执行标准 */
function onSgChange(v: string | null) {
  form.cSgCode = v ?? "";
  form.cSgStd = sgList.value.find((x) => x.cSgSign === form.cSgCode)?.cSgStd ?? "";
}

/* 原 btnSave_Click：确认「是否确认保存？」→ AddSjByManual → 「数据保存成功！」→ 关闭 */
async function doSave() {
  saving.value = true;
  try {
    await hR4000Api.addSjByManual(form);
    toast("数据保存成功！", 2000, "success");
    confirming.value = false;
    emit("update:visible", false);
    emit("ok");
  } catch {
    /* 拦截层已 toast */
  } finally {
    saving.value = false;
  }
}

function askSave() {
  confirming.value = true;
}

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    try {
      const list = (await systemKeyValueApi.getSysKvListByGroup("010100:CUTFLAG")) ?? [];
      cutFlagOptions.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
    } catch {
      /* 拦截层已 toast */
    }
    try {
      sgList.value = (await hR4000Api.querySg()) ?? [];
    } catch {
      /* 拦截层已 toast */
    }
  },
);
</script>

<template>
  <Dialog :visible="visible" modal header="添加实绩" :style="{ width: 'min(56rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)">
    <!-- 表单（原 dataLayoutControl1：14 个可见项，坯料件次号 HiddenItems 不渲染） -->
    <div class="grid grid-cols-4 items-center gap-x-3 gap-y-2">
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">订单号</label>
        <InputText v-model="form.cOrderNo" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">批号</label>
        <InputText v-model="form.cBatchNo" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">炉号</label>
        <InputText v-model="form.cStove" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">件次号</label>
        <InputText v-model="form.cPieceNo" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">钢种</label>
        <Select :model-value="form.cSgCode" :options="sgOptions" :filter="true" placeholder="钢种"
          class="min-w-0 flex-1" @update:model-value="onSgChange" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">执行标准</label>
        <InputText v-model="form.cSgStd" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">厚度</label>
        <InputNumber v-model="form.nThick" :min="0" :use-grouping="false" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">宽度</label>
        <InputNumber v-model="form.nWidth" :min="0" :use-grouping="false" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">长度</label>
        <InputNumber v-model="form.nLen" :min="0" :use-grouping="false" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">支数</label>
        <InputNumber v-model="form.nQua" :min="0" :use-grouping="false" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">重量</label>
        <InputNumber v-model="form.nWgt" :min="0" :use-grouping="false" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">切边方式</label>
        <Select v-model="form.cTrimFlag" :options="cutFlagOptions" :filter="true" placeholder="切边方式"
          class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">入库标识</label>
        <InputText v-model="form.cInboundNo" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <label class="w-20 shrink-0 text-xs text-muted-foreground">剪切线代码</label>
        <Select v-model="form.cSlCode" :options="slCodeOptions" placeholder="剪切线代码" class="min-w-0 flex-1" />
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:visible', false)" />
      <Button label="保存" variant="outlined" :loading="saving" @click="askSave" />
    </template>
  </Dialog>

  <!-- 确认（对应原 MsgBox.ShowYesNo("是否确认保存？")） -->
  <Dialog :visible="confirming" modal header="确认" :style="{ width: 'min(26rem, calc(100vw - 2rem))' }"
    @update:visible="confirming = $event">
    <p class="text-xs">是否确认保存？</p>
    <template #footer>
      <Button label="取消" variant="outlined" @click="confirming = false" />
      <Button label="确定" variant="outlined" :loading="saving" @click="doSave" />
    </template>
  </Dialog>
</template>
