<script setup lang="ts">
/**
 * 对应 TW0101 料仓变料管理（原料工序 · 附录 A3 版式 **L2 左树右表**）
 *
 * 底板：`BinChangeBoard`（多工序共用，只换入参——见该文件头「为什么不给每个工序各写一份」）
 *
 * 接口：binChangeApi.page / binChangeApi.current
 *
 * 演示要点：
 * 混匀配料仓的料种/库存变更记录。左树选机组、点到仓号只看那一仓。
 * 台账的「当前料种」是**初始配置 + 最后一次变料**叠出来的，所以这页能看出
 * 1#混匀线 3#仓 从澳粉换成了巴西粉——那正是 B7「模拟上料」的落点。
 *
 * 待接入：规格书 B7 的「▶ 模拟…」按钮走 `toolbar.extraButtons`，点了提示「待接入」
 * （本域只查桩，没有写端点，见 `listTypes.ts` 文件头）。
 */
import BinChangeBoard from "../../BinChangeBoard.vue";
</script>

<template>
  <BinChangeBoard process="raw" code="TW0101" />
</template>
