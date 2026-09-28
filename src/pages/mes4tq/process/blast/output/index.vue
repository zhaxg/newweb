<script setup lang="ts">
/**
 * 对应 TW0603 高炉收料实绩（高炉工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`OutputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：outputApi.page / outputApi.detail
 *
 * 演示要点：
 * 高炉收料实绩：铁水产量 / 质量（Si·Mn·S·P）/ 渣况。
 * `direction` 是铁水去向（0=炼钢 1=铸铁）、`ctk` 是出铁口——
 * 铁水以**铁次**为基本单元（B11 第 2 条），一个铁次 = 一次出铁。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import OutputBoard from "../../OutputBoard.vue";
</script>

<template>
  <OutputBoard process="blast" code="TW0603" />
</template>
