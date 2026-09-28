<script setup lang="ts">
/**
 * 对应 TW0403 烧结收料实绩（烧结工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`OutputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：outputApi.page / outputApi.detail
 *
 * 演示要点：
 * 烧结收料实绩：烧结矿产出 / 质量（TFe·SiO2·CaO）/ 粒度 / 返矿。
 * 烧结矿以**班**为基本单元（B11 第 3 条），三班一汇总就是日产量——
 * TR0001 的日报正是从这张表的班值加出来的。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import OutputBoard from "../../OutputBoard.vue";
</script>

<template>
  <OutputBoard process="sinter" code="TW0403" />
</template>
