<script setup lang="ts">
/** 打印模板设计器容器（裸画布）：
 *  - inline：/print-designer 空布局整屏，无应用 Header/侧栏，也无自定义顶栏/右侧字段树
 *  - 数据源字段用库内浮动面板（已改名为「数据源」）
 *  - 保存/打印走 print-designer 自带工具栏 + setCrudEndpoints mock
 */
import { computed, nextTick, ref, watch } from "vue";
import Dialog from "primevue/dialog";
import {
  PRINT_SCHEMAS,
  buildAvailableVariables,
  buildSamplePayload,
  findPrintSchema,
} from "./printSchemas";
import type { PrintTemplateRow } from "@/api/widgets/printReport";
import { printDesignerCloudFetch, setPrintDesignerActiveSchema } from "./printDesignerCloudMock";
import { ensurePrintDesigner } from "./loadPrintDesigner";
import { useToast } from "@/composables/useToast";

const props = defineProps<{
  open: boolean;
  template: PrintTemplateRow | null;
  initialSchema?: string;
  /** true = 不套 Dialog，铺满父容器 */
  inline?: boolean;
}>();
const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "saved"): void;
}>();

const { toast } = useToast();
const designerRef = ref<HTMLElement | null>(null);
const schemaAqn = ref("");
const comments = ref("");
const ready = ref(false);

const currentSchema = computed(() => findPrintSchema(schemaAqn.value));
const active = computed(() => (props.inline ? true : props.open));

async function bootstrap() {
  ready.value = false;
  if (props.template) {
    schemaAqn.value = props.template.cDataType;
    comments.value = props.template.cComments ?? "";
  } else {
    schemaAqn.value = props.initialSchema ?? "";
    comments.value = "";
  }
  /* 按需加载 WC（main.ts 不再全局 import），define 后 upgrade 已挂载的 <print-designer> */
  await ensurePrintDesigner();
  await nextTick();
  await waitReady();
  await applyTemplateToDesigner();
}

watch(active, async (on) => {
  if (on) await bootstrap();
}, { immediate: true });

watch(
  () => [props.template?.id, props.initialSchema, props.template?.cDataType] as const,
  async (cur, prev) => {
    if (!active.value || !prev) return;
    if (cur[0] === prev[0] && cur[1] === prev[1] && cur[2] === prev[2]) return;
    await bootstrap();
  },
);

function waitReady(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve) => {
    const el = designerRef.value;
    if (!el) {
      resolve();
      return;
    }
    const done = () => resolve();
    const timer = window.setTimeout(done, timeoutMs);
    el.addEventListener("ready", done, { once: true });
    if ((el as unknown as { getTemplates?: unknown }).getTemplates) {
      window.clearTimeout(timer);
      done();
    }
  });
}

function getEl(): any {
  return designerRef.value as any;
}

function withAvailableVariables(data: any, tree: ReturnType<typeof buildAvailableVariables>) {
  const base = data && typeof data === "object" ? data : { pages: [] };
  return {
    ...base,
    ext: { ...(base.ext ?? {}), availableVariables: tree },
  };
}

async function applyTemplateToDesigner() {
  const el = getEl();
  if (!el) return;
  try {
    el.setBranding?.({ title: "", showTitle: false, showLogo: false });
    el.setTheme?.("light");
    el.setLanguage?.("zh");

    const schema = currentSchema.value;
    if (schema) setPrintDesignerActiveSchema(schema.aqn);
    const tree = schema ? buildAvailableVariables(schema) : [];

    const { sample, variables } = schema
      ? buildSamplePayload(schema)
      : { sample: {} as Record<string, unknown>, variables: {} as Record<string, unknown> };

    el.setCrudEndpoints?.(
      {
        templates: {
          list: "/api/print/templates",
          get: "/api/print/templates/{id}",
          upsert: "/api/print/templates",
          delete: "/api/print/templates/{id}",
        },
        customElements: {
          list: "/api/print/custom-elements",
          get: "/api/print/custom-elements/{id}",
          upsert: "/api/print/custom-elements",
          delete: "/api/print/custom-elements/{id}",
        },
      },
      { fetcher: printDesignerCloudFetch },
    );
    el.setCrudMode?.("remote");

    let data: any = null;
    if (props.template?.cTemplateData) {
      try {
        data = JSON.parse(props.template.cTemplateData);
      } catch {
        toast("模板数据不是合法 JSON，已按空白模板打开", 3000, "warn");
      }
    }
    if (!data || typeof data !== "object") {
      data = {
        id: `tpl_${Date.now().toString(36)}`,
        name: comments.value || schema?.title || "未命名模板",
        pages: [],
      };
    }
    data = withAvailableVariables(data, tree);
    if (schema) {
      data.testData = { ...(data.testData ?? {}), ...variables };
      el.loadTemplateData(data);
      await el.setTestData?.(variables, { merge: true });
      await el.setVariables?.(variables, { merge: true });
      await el.setTemplateVariables?.(variables, { merge: true });
    } else {
      el.loadTemplateData(data);
    }

    await customizeFloatingPanel(el);
    el.setTemplateContextMenu?.([
      { id: "open", label: "打开模板" },
      { id: "duplicate", label: "复制为新模板" },
      { id: "delete", label: "删除模板" },
    ]);
  } catch (e) {
    console.error(e);
    toast("初始化设计器失败", 2500, "error");
  }
}

/** 浮动面板：去 tab、标题改「数据源」、只留可用变量内容 */
async function customizeFloatingPanel(el: any): Promise<void> {
  const root: ShadowRoot | null = el?.shadowRoot ?? null;
  if (!root) return;

  if (!root.querySelector("style[data-hmx-print-vars]")) {
    const style = document.createElement("style");
    style.setAttribute("data-hmx-print-vars", "1");
    style.textContent = `
      [data-floating-panel-surface] {
        min-width: 300px !important;
      }
      [data-floating-panel-surface] button.flex-1.py-3 {
        display: none !important;
      }
    `;
    root.appendChild(style);
  }

  await new Promise((r) => requestAnimationFrame(() => r(null)));

  const renameTitle = () => {
    for (const h of [...root.querySelectorAll("h2, [role=heading]")]) {
      const t = (h.textContent ?? "").trim();
      if (t === "模版列表" || t === "模板列表" || t === "Templates") {
        h.textContent = "数据源";
      }
    }
    for (const p of [...root.querySelectorAll("p")]) {
      const t = (p.textContent ?? "").trim();
      if (t === "选择模版" || t === "选择模板" || /Select template/i.test(t)) {
        p.textContent = "从数据源拖拽字段到画布";
      }
    }
  };
  renameTitle();

  const variablesTab = [...root.querySelectorAll("button")].find((b) => {
    const text = b.textContent ?? "";
    return (
      b.classList.contains("flex-1") &&
      (text.includes("可用变量") || /Available Variables/i.test(text))
    );
  });
  if (variablesTab instanceof HTMLElement) variablesTab.click();

  await new Promise((r) => requestAnimationFrame(() => r(null)));
  renameTitle();
}

function onClose() {
  emit("update:open", false);
}
</script>

<template>
  <!-- 裸设计器：无自定义顶栏、无右侧字段树 -->
  <div v-if="inline" class="relative h-full w-full overflow-hidden">
    <!-- @vue-ignore print-designer 为 Web Component -->
    <print-designer
      id="print-template-designer"
      ref="designerRef"
      class="absolute inset-0 block h-full w-full"
    />
  </div>

  <Dialog
    v-else
    :visible="open"
    modal
    :maximizable="true"
    :closable="true"
    :style="{ width: 'min(1320px, 97vw)', height: 'min(880px, 95vh)' }"
    content-class="!h-[min(880px,95vh)] !p-0"
    @update:visible="onClose"
  >
    <div class="relative h-full w-full overflow-hidden">
      <!-- @vue-ignore print-designer 为 Web Component -->
      <print-designer
        id="print-template-designer"
        ref="designerRef"
        class="absolute inset-0 block h-full w-full"
      />
    </div>
  </Dialog>
</template>
