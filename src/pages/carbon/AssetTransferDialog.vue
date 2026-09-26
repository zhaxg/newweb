<script setup lang="ts">
/**
 * 资产划拨（配额账户 / 交易账户两页共用）。
 * 对应线上行内「资产划拨」弹窗：企业名称(只读) · 划出账户 · 划入账户 · 划出量(tCO2) · 取消/确定。
 *
 * **确定只插桩**：调 carbonApi.{quota,trade}Transfer，mock 回成功信封但不落库、不改余额——
 * 本次约定「只 mock 查询，增删改只插桩」。端点路径取自线上 chunk 静态抽取，未在演示系统实测提交。
 */
import { computed, reactive, ref, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { carbonApi } from "@/api/carbon";
import type { AssetTransferInput } from "@/api/carbon/types";
import { useToast } from "@/composables/useToast";

const props = defineProps<{
  open: boolean;
  /** quota = 走 quotaTransfer；trade = 走 tradeTransfer */
  mode: "quota" | "trade";
  enterId: string;
  enterName: string;
  /** 默认划出账户（原页面打开时是「配额账户」） */
  defaultFrom: string;
  /** 默认划入账户（原页面打开时是「交易账户」） */
  defaultTo: string;
}>();

const emit = defineEmits<{ "update:open": [value: boolean]; done: [] }>();

const { toast } = useToast();

/** 只有配额账户与交易账户之间可划拨（线上两端点也只这两个 accountType） */
const ACCOUNT_OPTIONS = ["配额账户", "交易账户"];

const form = reactive({ from: "", to: "", val: null as number | null });
const saving = ref(false);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    form.from = props.defaultFrom;
    form.to = props.defaultTo;
    form.val = null;
  },
);

/** 同一账户不能自己划给自己——线上未提示，这里只做基本挡板，提示走 toast */
const sameAccount = computed(() => form.from && form.from === form.to);

async function confirm() {
  if (sameAccount.value) {
    toast("划出与划入账户不能相同", 2000, "warn");
    return;
  }
  if (!form.val || form.val <= 0) {
    toast("请输入划出量", 2000, "warn");
    return;
  }
  const payload: AssetTransferInput = {
    enterId: props.enterId,
    fromAccountNo: form.from,
    toAccountNo: form.to,
    transferVal: form.val,
  };
  saving.value = true;
  try {
    if (props.mode === "quota") await carbonApi.quotaTransfer(payload);
    else await carbonApi.tradeTransfer(payload);
  } catch {
    return; // 拦截层已 toast
  } finally {
    saving.value = false;
  }
  emit("update:open", false);
  emit("done");
  toast("提交成功", 2000, "success");
}
</script>

<template>
  <Dialog
    :visible="open"
    modal
    header="资产划拨"
    :style="{ width: 'min(30rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)"
  >
    <div class="min-w-0 space-y-3 py-1">
      <div class="flex min-w-0 items-center gap-2">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">企业名称</label>
        <InputText :model-value="enterName" disabled class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">划出账户</label>
        <Select
          v-model="form.from"
          :options="ACCOUNT_OPTIONS"
          show-clear
          placeholder="请选择"
          class="min-w-0 flex-1"
          autofocus
        />
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">划入账户</label>
        <Select v-model="form.to" :options="ACCOUNT_OPTIONS" show-clear placeholder="请选择" class="min-w-0 flex-1" />
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <label class="w-16 shrink-0 text-xs text-muted-foreground">划出量</label>
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <div class="min-w-0 flex-1">
            <InputNumber v-model="form.val" :min="0" :show-buttons="false" placeholder="请输入" class="w-full" fluid />
          </div>
          <span class="shrink-0 text-xs text-muted-foreground">tCO2</span>
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="确定" :loading="saving" @click="confirm" />
    </template>
  </Dialog>
</template>
