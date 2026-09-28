<script setup lang="ts">
/**
 * 设备二维码面板（AE0001 行上的「二维码」与 AE0005 扫码页共用）。
 *
 * 为什么自己画而不是贴一张静态图：码的内容是**这台设备的 H5 档案地址**，
 * 换成另一台设备就得换一个码，图片方案等于给 30 台设备各存一张。
 *
 * 为什么 `import("qrcode")` 放在点击后而不是文件头：本域列表页已经背着 AG Grid，
 * 二维码编码器（≈50 KB）属于「点了按钮才需要」的东西——动态导入让它单独成一个 chunk，
 * 台账页首屏一分体积都不多花（AGENTS §5 懒加载边界）。
 */
import { shallowRef, watch } from "vue";
import { h5ArchiveUrl } from "./h5Url";

const props = defineProps<{
  /** 编码内容：设备编码（也是 H5 档案页的 `?code=`） */
  code: string;
  size?: number;
}>();

const svg = shallowRef("");
const url = shallowRef("");

const SIZE = () => props.size ?? 200;

watch(
  () => props.code,
  async (code) => {
    svg.value = "";
    if (!code) return;
    url.value = h5ArchiveUrl(code);
    try {
      const QRCode = (await import("qrcode")).default;
      svg.value = await QRCode.toString(url.value, {
        type: "svg",
        width: SIZE(),
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#18181b", light: "#ffffff" },
      });
    } catch {
      /* 编码器没加载出来：下面按「没码」渲染占位，页面上其余信息照常可读 */
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <!-- 白底：手机相机对深色底上的码识别率明显差，这里刻意不跟随主题 -->
    <div
      class="flex items-center justify-center overflow-hidden rounded bg-white p-2"
      :style="{ width: `${SIZE()}px`, height: `${SIZE()}px` }"
    >
      <div v-if="svg" class="size-full [&>svg]:size-full" v-html="svg" />
      <span v-else class="text-xs text-muted-foreground">生成中…</span>
    </div>
    <div class="text-body font-medium">{{ code }}</div>
    <div class="max-w-full truncate text-xs text-muted-foreground">{{ url }}</div>
  </div>
</template>
