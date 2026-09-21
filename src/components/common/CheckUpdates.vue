<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";

/* 版本更新检测（移植自 hmx_web check-updates.vue）：
   对 BASE_URL 做 HEAD 请求，比较 etag/last-modified 变化则弹窗提示刷新。
   原版 t-dialog 换为 PrimeVue Dialog，icon-[...] 换为 Lucide。localhost 下跳过检测。 */

interface Props {
  /** 轮询时间，分钟 */
  checkUpdatesIntervalMinutes?: number;
  /** 检查更新的地址 */
  checkUpdateUrl?: string;
}

defineOptions({ name: "CheckUpdates" });

const props = withDefaults(defineProps<Props>(), {
  checkUpdatesIntervalMinutes: 1,
  checkUpdateUrl: import.meta.env.BASE_URL || "/",
});

const currentVersionTag = ref("");
const lastVersionTag = ref("");
const showModal = ref(false);
const timer = ref<ReturnType<typeof setInterval>>();

let isCheckingUpdates = false;

function handleConfirm() {
  lastVersionTag.value = currentVersionTag.value;
  window.location.reload();
}

function handleCancel() {
  showModal.value = false;
}

async function getVersionTag() {
  try {
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      return;
    }
    const response = await fetch(props.checkUpdateUrl, {
      cache: "no-cache",
      method: "HEAD",
      redirect: "manual",
    });

    return response.headers.get("etag") || response.headers.get("last-modified");
  } catch {
    console.error("Failed to fetch version tag");
    return;
  }
}

async function checkForUpdates() {
  const versionTag = await getVersionTag();
  if (!versionTag) {
    return;
  }

  // 首次运行时不提示更新
  if (!lastVersionTag.value) {
    lastVersionTag.value = versionTag;
    return;
  }

  if (lastVersionTag.value !== versionTag) {
    stop();
    handleNotice(versionTag);
  }
}

function handleNotice(versionTag: string) {
  currentVersionTag.value = versionTag;
  showModal.value = true;
}

function start() {
  if (props.checkUpdatesIntervalMinutes <= 0) {
    return;
  }

  // 每 checkUpdatesIntervalMinutes（默认 1）分钟检查一次
  timer.value = setInterval(checkForUpdates, props.checkUpdatesIntervalMinutes * 60 * 1000);
}

function stop() {
  clearInterval(timer.value);
}

function handleVisibilitychange() {
  if (document.hidden) {
    stop();
  } else if (!isCheckingUpdates) {
    isCheckingUpdates = true;
    checkForUpdates().finally(() => {
      isCheckingUpdates = false;
      start();
    });
  }
}

onMounted(() => {
  start();
  document.addEventListener("visibilitychange", handleVisibilitychange);
});

onUnmounted(() => {
  stop();
  document.removeEventListener("visibilitychange", handleVisibilitychange);
});
</script>

<template>
  <Dialog v-model:visible="showModal" modal header="新版本可用" :style="{ width: 'min(28rem, 92vw)' }"
    :dismissable-mask="false">
    <div class="text-[13px] leading-relaxed text-foreground">
      <div>检测到新版本，点击「刷新」重新加载页面</div>
      <!-- 版本标识（etag）可能很长且无空格，单独成块 break-all 换行，不撑乱行内布局 -->
      <div class="mt-2 break-all rounded bg-success-bg px-2 py-1 font-mono text-xs text-success">
        {{ currentVersionTag }}
      </div>
    </div>
    <template #footer>
      <Button label="稍后" text severity="secondary" @click="handleCancel" />
      <Button label="刷新" raised autofocus @click="handleConfirm" />
    </template>
  </Dialog>
</template>
