<script setup lang="ts">
/**
 * 对应 TW0104 混匀收料实绩（原料工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`OutputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：outputApi.page / outputApi.detail
 *
 * 演示要点：
 * 混匀收料实绩：混匀料产出量 + 质量检验 + 送各分厂数量。
 * 「送各分厂」是原料工序的出口，下游的烧结/球团投料实绩要能对上这批数。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import OutputBoard from "../../OutputBoard.vue";
</script>

<template>
  <OutputBoard process="raw" code="TW0104" />
</template>
