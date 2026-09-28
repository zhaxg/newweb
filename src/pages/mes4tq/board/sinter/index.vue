<script setup lang="ts">
/**
 * 对应 TD0001 烧结生产大屏（大屏看板 · 附录 A3 版式 **L6 全屏大屏**）
 *
 * 底板：`ScreenBoard`（三张屏共用，只换 kind——三张屏版式完全一致，
 * 差别只在数据与那块工艺区域色，所以只有一份底板）
 *
 * 接口：boardApi.sinter（数据，5s 轮询）· boardApi.shell（外壳，挂载取一次）
 *
 * 演示要点：
 * 2×360m² 烧结机的产量 / 利用系数 / 返矿率 / 机速 / 主抽负压 / 合格品率。
 * **B7 的「▶ 模拟烧结波动」落点就在这块屏**：主抽负压一旦超限，
 * KPI 卡转红、右侧报警条同时出一条——判定在 `model.paramSnapshot`，屏与页同源。
 *
 * 本页**只读**（本域只查桩）：屏上没有任何可点的操作。
 */
import ScreenBoard from "../ScreenBoard.vue";
</script>

<template>
  <ScreenBoard kind="sinter" />
</template>
