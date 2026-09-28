<script setup lang="ts">
/**
 * 对应 TW0501 白灰仓变料管理（石灰工序 · 附录 A3 版式 **L2 左树右表**）
 *
 * 底板：`BinChangeBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：binChangeApi.page / binChangeApi.current
 *
 * 演示要点：
 * 白灰仓变料管理：石灰石（进窑的原料）与白灰块（产出的料）两个仓。
 * 这工序只有两个品种，切换关系简单，是最好讲的一条产线。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BinChangeBoard from "../../BinChangeBoard.vue";
</script>

<template>
  <BinChangeBoard process="lime" code="TW0501" />
</template>
