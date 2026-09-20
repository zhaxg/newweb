<script setup lang="ts">
import { ShieldX } from "@lucide/vue";
import Button from "primevue/button";
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <div class="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
    <ShieldX class="h-14 w-14 text-amber-500/80" />
    <div class="text-xl font-semibold text-foreground/85">403 · 无访问权限</div>
    <div class="text-sm">当前账号没有该页面的访问权限，请联系管理员或返回首页</div>
    <Button label="返回首页" size="small" raised class="mt-2" @click="router.replace('/')" />
  </div>
</template>
