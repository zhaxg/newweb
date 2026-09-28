<script setup lang="ts">
/**
 * 对应 TW0103 混匀投料实绩（原料工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`InputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：inputApi.page / inputApi.detail
 *
 * 演示要点：
 * 各单品种矿 → 混匀配料仓的投料量 + 质量。
 * 看点是 `wetWeight`/`dryWeight`/`h2o` 三者自洽（干重 = 湿重/(1+水分)），
 * 客户拿计算器一按就知道数不是随手编的。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import InputBoard from "../../InputBoard.vue";
</script>

<template>
  <InputBoard process="raw" code="TW0103" />
</template>
