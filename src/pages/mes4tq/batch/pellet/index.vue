<script setup lang="ts">
/**
 * 对应 TB0003 球团配料计划（配料管理 · 附录 A3 版式 **L3 主从双表**）
 *
 * 底板：`BatchBoard`（四工序共用，只换入参——四道配料共用同一张表 `TPM_2010`）
 *
 * 接口：batchingApi.page / batchingApi.items / batchingApi.detail
 *
 * 演示要点：
 * 精粉 + 膨润土 + 返矿 三种料——A3 原文。
 * 膨润土只占 4%，但它是**粘结剂**，少一点球团强度就垮；
 * 所以这一行看着微不足道，工艺上却是关键。目标质量里的「抗压强度」由它决定。
 *
 * 待接入：规格书 B7 的「▶ 模拟配料执行」走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BatchBoard from "../BatchBoard.vue";
</script>

<template>
  <BatchBoard process="pellet" code="TB0003" label="球团配料" />
</template>
