<script setup lang="ts">
import { ref, onErrorCaptured } from "vue";

const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  error.value = err instanceof Error ? err : new Error(String(err));
  console.error("[ErrorBoundary]", err);
  return false;
});

function retry() {
  error.value = null;
}
</script>

<template>
  <div class="contents">
    <div v-if="error" class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <p class="text-sm text-red-600 dark:text-red-400">{{ error.message }}</p>
      <button class="text-xs text-primary underline" @click="retry">重试</button>
    </div>
    <slot v-else />
  </div>
</template>
