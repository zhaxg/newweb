<script setup lang="ts">
/**
 * 账户记录·详情（碳排账户 / 减排账户两种账户共用）。
 * 对应线上「账户记录 → 详情」弹窗（GET /business/accountRecord/get{Emission,Reduction}Info/:id）。
 *
 * 结构照原弹窗两段：账户变动信息 / 业务信息，字段逐条对照线上 innerText 抄录（见下方 label）。
 *
 * 已知偏差：原弹窗**没有任何按钮**（只有右上角关闭），此处补一个「关闭」页脚按钮并标 autofocus——
 * ui-rules R5 要求每个 <Dialog> 必须有 autofocus 标记，否则 PrimeVue 兜底聚焦右上角关闭按钮，
 * 读纯文本详情时回车/空格极易误触。补按钮是平台焦点契约的代价，非新增业务能力。
 */
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import type { EmissionRecordDetail, ReductionRecordDetail } from "@/api/carbon/types";

type RecordDetail = EmissionRecordDetail | ReductionRecordDetail;

const props = defineProps<{
  open: boolean;
  /** 账户名（碳排账户 / 减排账户）——原弹窗「账户：」一栏取自账户类型，非接口字段 */
  accountLabel: string;
  detail: RecordDetail | null;
}>();

const emit = defineEmits<{ "update:open": [value: boolean] }>();

/** 只读明细的 label：辅助档灰字 */
const LBL = "shrink-0 text-xs text-muted-foreground";
const VAL = "min-w-0 text-body";

function row(label: string, value: unknown) {
  return { label, value: value === null || value === undefined || value === "" ? "-" : String(value) };
}

function section1() {
  const d = props.detail;
  if (!d) return [];
  return [
    row("企业名称", d.enterName),
    row("账户", props.accountLabel),
    row("账户号", d.emissionAccountNo),
    row("变动类型", d.serviceName),
    row("变动额度", d.dataVal),
    row("账户变动后余额", d.balanceVal),
    row("账务流水号", d.recordNo),
    row("记账时间", d.recordTime),
  ];
}

function section2() {
  const d = props.detail as EmissionRecordDetail | null;
  if (!d) return [];
  const project = (props.detail as ReductionRecordDetail).projectName;
  const rows = [
    row("来源", d.dataSource),
    row("业务流水号", d.serialnumber),
    row("业务时间", d.dataTime),
    row("业务类型", d.serviceName),
    row("碳排放", d.dataVal),
  ];
  // 减排账户的详情才带项目名，碳排没有——按有值才显示，避免空行
  if (project) rows.push(row("项目名称", project));
  return rows;
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
      <Button label="关闭" variant="outlined" autofocus @click="emit('update:open', false)" />
    </template>
  </Dialog>
</template>
