<script setup lang="ts">
/** 打印模板设计器页（BlankLayout 子页）：
 *  路由：/print-designer?design=<id|new>[&aqn=...]，meta.layout = "blank"
 *  由列表页 window.open；本页只负责 query → 拉模板 → 嵌 PrintDesignerDialog(inline)。
 */
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { printReportApi, type PrintTemplateRow } from "@/api/mes4ddh/printReport";
import { useToast } from "@/composables/useToast";
import PrintDesignerDialog from "./PrintDesignerDialog.vue";

const route = useRoute();
const router = useRouter();
const { toast } = useToast();

const designId = computed(() => {
  const d = route.query.design;
  return typeof d === "string" && d ? d : "";
});
const aqn = computed(() => (typeof route.query.aqn === "string" ? route.query.aqn : ""));

const template = ref<PrintTemplateRow | null>(null);
const schema = ref("");
const loading = ref(false);

async function loadTarget() {
  loading.value = true;
  try {
    if (designId.value === "new") {
      template.value = null;
      schema.value = aqn.value;
      return;
    }
    if (!designId.value) {
      toast("缺少 design 参数", 2500, "warn");
      return;
    }
    const all = (await printReportApi.queryAllTemplates(2)) ?? [];
    template.value = all.find((r) => r.id === designId.value) ?? null;
    if (!template.value) toast("未找到该模板", 3000, "warn");
  } finally {
    loading.value = false;
  }
}

function onClose() {
  window.close();
  setTimeout(() => {
    if (!window.closed) void router.push("/admin/widgets-xtrareporttemplatemanager-676165");
  }, 120);
}

watch(designId, () => void loadTarget(), { immediate: true });
</script>

<template>
  <!-- 由 BlankLayout 提供整屏容器；本页只占满父级 -->
  <div class="relative h-full w-full overflow-hidden">
    <div
      v-if="loading && !template && designId !== 'new'"
      class="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground"
    >
      正在加载模板…
    </div>
    <PrintDesignerDialog
      v-if="designId && (designId === 'new' || template || !loading)"
      inline
      :open="true"
      :template="template"
      :initial-schema="schema"
      @update:open="onClose"
    />
    <div v-else-if="designId" class="flex h-full items-center justify-center text-sm text-muted-foreground">
      正在打开设计器…
    </div>
    <div v-else class="flex h-full items-center justify-center text-sm text-muted-foreground">
      缺少 design 参数，无法打开设计器
    </div>
  </div>
</template>
