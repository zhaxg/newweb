<script setup lang="ts">
/**
 * 对应 TW0601 高炉料仓变料（高炉工序 · 附录 A3 版式 **L2 左树右表**）
 *
 * 底板：`BinChangeBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：binChangeApi.page / binChangeApi.current
 *
 * 演示要点：
 * 高炉料仓变料：矿仓/焦仓/球团仓的料种变更，3 座高炉各 5 个仓。
 * 与 B9 的种子数据对齐：1#高炉五仓初值是烧结矿/球团矿/焦炭/焦丁/块矿，
 * 焦炭换成焦丁是**降焦比**的常见操作，工长一看就懂。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BinChangeBoard from "../../BinChangeBoard.vue";
</script>

<template>
  <BinChangeBoard process="blast" code="TW0601" />
</template>
