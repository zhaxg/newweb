<script setup lang="ts">
/**
 * 对应 TW0202 备煤投料实绩（焦化工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`InputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：inputApi.page / inputApi.detail
 *
 * 演示要点：
 * 备煤投料实绩：单品种煤的消耗量 + 配合煤产量。
 * 五个煤种按配比进配煤仓，配合煤的质量（水分/灰分）决定下一道焦炭的 M40/M10。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import InputBoard from "../../InputBoard.vue";
</script>

<template>
  <InputBoard process="coke" code="TW0202" />
</template>
