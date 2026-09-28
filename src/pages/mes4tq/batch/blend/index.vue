<script setup lang="ts">
/**
 * 对应 TB0001 混匀配料计划（配料管理 · 附录 A3 版式 **L3 主从双表**）
 *
 * 底板：`BatchBoard`（四工序共用，只换入参——四道配料共用同一张表 `TPM_2010`）
 *
 * 接口：batchingApi.page / batchingApi.items / batchingApi.detail
 *
 * 演示要点：
 * 单品种矿配比 / 质量加权 / 成本预测——A3 对这一页的原话。
 * 上表选中一条计划，下表就是它的**配比明细**：配比合计强制 100%，
 * 目标重量 = 配比 × 计划产量 / 100（拿计算器能对上）。
 * 「预测成本」的单价口径与 TG0002 完全同源，改一次价这四页同步变。
 *
 * 待接入：规格书 B7 的「▶ 模拟配料执行」走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BatchBoard from "../BatchBoard.vue";
</script>

<template>
  <BatchBoard process="raw" code="TB0001" label="混匀配料" />
</template>
