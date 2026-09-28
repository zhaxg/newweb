<script setup lang="ts">
/**
 * 对应 TW0503 白灰收料实绩（石灰工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`OutputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：outputApi.page / outputApi.detail
 *
 * 演示要点：
 * 白灰收料实绩：白灰产出量 + 质量（CaO 含量 / 活性度）。
 * 活性度是白灰的**关键指标**（与 CaO 含量同等重要），客户会盯着这一列看。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import OutputBoard from "../../OutputBoard.vue";
</script>

<template>
  <OutputBoard process="lime" code="TW0503" />
</template>
