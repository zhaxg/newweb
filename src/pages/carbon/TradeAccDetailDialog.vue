<script setup lang="ts">
/**
 * 账户记录·详情（配额账户 / 交易账户两种账户共用）。
 * 对应线上「账户记录 → 详情」弹窗（GET /business/accountRecord/getTradeAccInfo/:id，
 * **配额与交易是同一个端点**，按 accountType 返回不同额外字段）。
 *
 * 与碳排/减排那张详情弹窗字段完全不同（碳量/业务来源/划拨类型… vs 变动额度/账务流水号…），
 * 故拆成两个组件而不是用 variant 分支——放一起要读的人来回对照两套 label。
 *
 * 原弹窗有「取 消」按钮，此处照抄并标 autofocus（ui-rules R5：确认类标右下主按钮）。
 */
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import type { TradeAccDetail } from "@/api/carbon/types";

const props = defineProps<{
  open: boolean;
  detail: TradeAccDetail | null;
}>();

const emit = defineEmits<{ "update:open": [value: boolean] }>();

const LBL = "shrink-0 text-xs text-muted-foreground";
const VAL = "min-w-0 text-body";

function row(label: string, value: unknown, suffix = "") {
  return { label, value: value === null || value === undefined || value === "" ? "-" : `${String(value)}${suffix}` };
}

function section1() {
  const d = props.detail;
  if (!d) return [];
  return [
    row("企业名称", d.enterName),
    row("账号", d.tradeAccountNo),
    row("变动类型", d.changeName),
    row("碳量", d.dataVal, " 吨"),
    row("业务来源", d.sourceTypeName),
    row("变动后余额", d.balanceVal, " 吨"),
    row("记录时间", d.recordTime),
  ];
}

function section2() {
  const d = props.detail;
  if (!d) return [];
  return [
    row("业务名称", d.accountTypeName),
    row("划拨类型", d.transferTypeName),
    row("划拨量", d.tradeVal, "吨"),
    row("添加人", d.creatorUserName),
    row("添加时间", d.creatorTime),
  ];
}
</script>

<template>
  <Dialog
    :visible="open"
    modal
    header="详情"
    :style="{ width: 'min(40rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)"
  >
    <div class="min-w-0 space-y-4 py-1">
      <div class="space-y-2">
        <div class="text-sm font-medium">账户变动信息</div>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-2">
          <template v-for="r in section1()" :key="r.label">
            <dt :class="LBL">{{ r.label }}</dt>
            <dd :class="VAL">{{ r.value }}</dd>
          </template>
        </dl>
      </div>
      <div class="space-y-2">
        <div class="text-sm font-medium">业务信息</div>
        <dl class="grid grid-cols-2 gap-x-6 gap-y-2">
          <template v-for="r in section2()" :key="r.label">
            <dt :class="LBL">{{ r.label }}</dt>
            <dd :class="VAL">{{ r.value }}</dd>
          </template>
        </dl>
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" autofocus @click="emit('update:open', false)" />
    </template>
  </Dialog>
</template>
