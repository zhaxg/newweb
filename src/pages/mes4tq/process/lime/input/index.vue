<script setup lang="ts">
/**
 * 对应 TW0502 白灰投料实绩（石灰工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`InputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：inputApi.page / inputApi.detail
 *
 * 演示要点：
 * 白灰投料实绩：石灰石投入量 + 燃气消耗。
 * 这一页是全站最短的投料链（一种料进、一种料出），适合先点开讲流程。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import InputBoard from "../../InputBoard.vue";
</script>

<template>
  <InputBoard process="lime" code="TW0502" />
</template>
