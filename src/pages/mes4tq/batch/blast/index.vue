<script setup lang="ts">
/**
 * 对应 TB0004 高炉配料计划（配料管理 · 附录 A3 版式 **L3 主从双表**）
 *
 * 底板：`BatchBoard`（四工序共用，只换入参——四道配料共用同一张表 `TPM_2010`）
 *
 * 接口：batchingApi.page / batchingApi.items / batchingApi.detail
 *
 * 演示要点：
 * 矿焦比 / 喷煤 / 燃料消耗——A3 原文。
 * 这一页的目标质量不是化学成分，而是**三个燃料比指标**（矿焦比 5.6、煤比 165、焦比 380），
 * 与 TR 的技经指标口径一致（B4）。
 * 配比里的「烧结矿 58% + 球团矿 18% + 块矿 8% + 焦炭 16%」是炉料结构，焦炭那一项在**装料**里，不在喷煤里。
 *
 * 待接入：规格书 B7 的「▶ 模拟配料执行」走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BatchBoard from "../BatchBoard.vue";
</script>

<template>
  <BatchBoard process="blast" code="TB0004" label="高炉配料" />
</template>
