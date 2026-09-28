<script setup lang="ts">
/**
 * 对应 TW0302 球团投料实绩（球团工序 · 附录 A3 版式 **L1 列表页**）
 *
 * 底板：`InputBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：inputApi.page / inputApi.detail
 *
 * 演示要点：
 * 球团投料实绩：配料投入量（皮带秤 / 螺旋秤）+ 质量。
 * 精粉走皮带秤、膨润土走螺旋秤——B1 的工艺秤清单里球团有 9 台皮带秤 + 2 台螺旋秤。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import InputBoard from "../../InputBoard.vue";
</script>

<template>
  <InputBoard process="pellet" code="TW0302" />
</template>
