<script setup lang="ts">
/**
 * 对应 TD0002 高炉运行大屏（大屏看板 · 附录 A3 版式 **L6 全屏大屏**）
 *
 * 底板：`ScreenBoard`（三张屏共用，只换 kind——三张屏版式完全一致，
 * 差别只在数据与那块工艺区域色，所以只有一份底板）
 *
 * 接口：boardApi.blast（数据，5s 轮询）· boardApi.shell（外壳，挂载取一次）
 *
 * 演示要点：
 * 3×1800m³ 高炉的铁水产量 / 利用系数 / 焦比 / 煤比 / 热风温度 / 透气性指数。
 * **B9 给的 1#高炉种子数（利用系数 2.15）口径是错的**，屏上一律以
 * `model.utilization()` 为准（t/(m³·d)）——屏与报表页必须同数，否则交叉核当场露馅。
 * **B7 的「▶ 模拟高炉波动」落点是 3#高炉的透气性指数**（屏取它做代表机组）。
 *
 * 本页**只读**（本域只查桩）：屏上没有任何可点的操作。
 */
import ScreenBoard from "../ScreenBoard.vue";
</script>

<template>
  <ScreenBoard kind="blast" />
</template>
