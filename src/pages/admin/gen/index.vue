<script setup lang="ts">
/** 对应 FrmLowCode（低代码管理）：HmxWinForms.Forms.Admin.LowCode.FrmLowCode
 *  画面迁移，逻辑不迁移到 */


import { computed, ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import Tab from "primevue/tab";
import TabList from "primevue/tablist";
import TabPanel from "primevue/tabpanel";
import TabPanels from "primevue/tabpanels";
import Tabs from "primevue/tabs";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import csharp from "highlight.js/lib/languages/csharp";
import xml from "highlight.js/lib/languages/xml";
import sql from "highlight.js/lib/languages/sql";
import json from "highlight.js/lib/languages/json";
import { useToast } from "@/composables/useToast";
import { tablerIcon } from "@/lib/tablerIcons";
import { codeGenApi } from "@/api/admin/request";
import type { GenerateInput, GenerateOutput } from "@/api/admin/types";

/* 低代码管理：表结构 / Swagger 两种数据源生成 CRUD 代码，结果按文件分页签高亮展示 */

const IconCheck = tablerIcon("Check");
const IconCode = tablerIcon("Code");
const IconCopy = tablerIcon("Copy");
const IconFileCode = tablerIcon("FileCode");
const IconLoader = tablerIcon("Loader");
const IconSparkles = tablerIcon("Sparkles");

const { toast } = useToast();

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("json", json);

type GenMode = "按表结构" | "按 Swagger";
const modes: GenMode[] = ["按表结构", "按 Swagger"];
const mode = ref<GenMode>("按表结构");

const swagger = ref("");
const databaseKey = ref("masterdb");
const tableName = ref("HMX_USER");
const namespace = ref("Hmx.Service.Admin.Entities");
const loading = ref(false);

interface TabInfo {
  name: string;
  title: string;
  content: string;
}
const lstTabInfo = ref<TabInfo[]>([]);
const activeTab = ref("");

/** 文件扩展名 → highlight.js 语言（vue 模板按 xml 着色，ts/js 同 grammar） */
function langOf(title: string): string {
  const ext = title.split(".").pop()?.toLowerCase() ?? "";
  return (({ cs: "csharp", ts: "typescript", js: "typescript", vue: "xml", html: "xml", xml: "xml", sql: "sql", json: "json" }) as Record<string, string>)[ext] ?? "";
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const views = computed(() =>
  lstTabInfo.value.map((t) => {
    const lang = langOf(t.title);
    let html: string;
    try {
      html = lang ? hljs.highlight(t.content, { language: lang, ignoreIllegals: true }).value : escapeHtml(t.content);
    } catch {
      html = escapeHtml(t.content);
    }
    return { ...t, lang, html, lines: t.content.split("\n").length };
  }),
);
const activeView = computed(() => views.value.find((v) => v.name === activeTab.value));

async function btnCodeGen() {
  if (loading.value) return;
  if (mode.value === "按 Swagger" && !swagger.value.trim()) {
    toast("请填写 Swagger 地址", 2000, "warn");
    return;
  }
  loading.value = true;
  try {
    let response: GenerateOutput[] | null = null;
    if (mode.value === "按 Swagger") {
      response = await codeGenApi.generateVueFiles(swagger.value.trim());
    } else {
      response = await codeGenApi.generatedCode({
        databaseKey: databaseKey.value,
        tableName: tableName.value,
        nameSpace: namespace.value,
      } as GenerateInput);
    }

    if (response) {
      const tabs = response
        .filter((x) => x.content)
        .map(
          (x) =>
            ({
              name: x.fileName?.replace(".", "_") ?? "",
              title: x.fileName ?? "",
              content: x.content ?? "",
            }) as TabInfo,
        );
      if (tabs.length) {
        lstTabInfo.value = tabs;
        activeTab.value = tabs[0].name;
      }
      toast("已完成代码生成", 2000, "success");
    }
  } catch {
    /* 拦截层已 toast */
  } finally {
    loading.value = false;
  }
}

const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
async function btnCopy() {
  const content = activeView.value?.content;
  if (!content) return;
  await navigator.clipboard.writeText(content);
  copied.value = true;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = false), 1500);
  toast("复制成功", 1500, "success");
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <!-- 参数区：数据源模式切换 + 对应参数 -->
    <div class="shrink-0 space-y-2 border-b border-border/60 px-3 py-2.5">
      <div class="flex items-center gap-3">
        <SelectButton v-model="mode" :options="modes" size="small" class="shrink-0" />
        <div class="min-h-[24px] flex-1"></div>
        <Button size="small" raised class="shrink-0 whitespace-nowrap" :loading="loading" @click="btnCodeGen">
          <component :is="loading ? IconLoader : IconSparkles" :class="['h-3.5 w-3.5', loading && 'animate-spin']" />
          生成代码
        </Button>
      </div>

      <div v-if="mode === '按表结构'" class="flex flex-wrap items-center gap-x-2 gap-y-2">
        <span class="text-xs text-muted-foreground">数据库Key</span>
        <InputText v-model="databaseKey" class="w-32 shrink-0" autocapitalize="off" spellcheck="false"
          @keydown.enter="btnCodeGen" />
        <span class="text-xs text-muted-foreground">表名</span>
        <InputText v-model="tableName" class="w-40 shrink-0" autocapitalize="off" spellcheck="false"
          @keydown.enter="btnCodeGen" />
        <span class="text-xs text-muted-foreground">命名空间</span>
        <InputText v-model="namespace" class="w-64 min-w-0 grow basis-48" autocapitalize="off" spellcheck="false"
          @keydown.enter="btnCodeGen" />
      </div>
      <div v-else class="flex items-center gap-2">
        <span class="shrink-0 text-xs text-muted-foreground">Swagger</span>
        <InputText v-model="swagger" placeholder="接口文档地址，如 http://host/swagger/xxx/swagger.json" autocapitalize="off"
          spellcheck="false" class="min-w-0 flex-1" @keydown.enter="btnCodeGen" />
      </div>
    </div>

    <!-- 结果区：未生成 = 引导空态；生成中 = 遮罩；已生成 = 文件页签 + 行号 + 高亮 -->
    <div v-if="!lstTabInfo.length" class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
      <component :is="IconLoader" v-if="loading" class="h-9 w-9 animate-spin opacity-60" />
      <component :is="IconCode" v-else class="h-9 w-9 opacity-40" />
      <div class="text-sm">{{ loading ? "正在生成代码…" : "选择数据源并点击「生成代码」，结果将展示在此处" }}</div>
    </div>

    <Tabs v-else v-model:value="activeTab" class="flex min-h-0 flex-1 flex-col">
      <div class="relative flex shrink-0 items-center border-b border-border/60">
        <TabList class="min-w-0 flex-1">
          <Tab v-for="tab in views" :key="tab.name" :value="tab.name">
            <span class="flex items-center gap-1.5">
              <component :is="IconFileCode" class="h-3.5 w-3.5 opacity-60" />
              {{ tab.title }}
            </span>
          </Tab>
        </TabList>
        <div class="mr-2 flex shrink-0 items-center gap-2">
          <span v-if="activeView?.lang"
            class="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
            {{ activeView.lang }}
          </span>
          <span v-if="activeView" class="text-[11px] tabular-nums text-muted-foreground">{{ activeView.lines }} 行</span>
          <Button variant="outlined" size="small" class="whitespace-nowrap" @click="btnCopy">
            <component :is="IconCheck" v-if="copied" class="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            <component :is="IconCopy" v-else class="h-3.5 w-3.5" />
            {{ copied ? "已复制" : "复制当前页代码" }}
          </Button>
        </div>
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
          <component :is="IconLoader" class="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </div>

      <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
        <TabPanel v-for="view in views" :key="view.name" :value="view.name" class="h-full overflow-auto p-0">
          <div class="code-view flex min-h-full font-mono text-xs leading-5">
            <div aria-hidden="true"
              class="sticky left-0 z-10 shrink-0 select-none border-r border-border/40 bg-muted/40 px-2 py-2 text-right text-[11px] tabular-nums text-muted-foreground/70 backdrop-blur">
              <div v-for="n in view.lines" :key="n">{{ n }}</div>
            </div>
            <pre class="m-0 min-w-0 flex-1 py-2 pl-3"><code v-html="view.html"></code></pre>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<style scoped>
/* highlight.js 配色（浅色 One-Light / 暗色 One-Dark，跟随 .dark 切换），只覆盖本页生成产物用到的 token */
.code-view {
  --hg-keyword: #a626a4;
  --hg-string: #50a14f;
  --hg-number: #b76b01;
  --hg-comment: #a0a1a7;
  --hg-title: #4078f2;
  --hg-attr: #986801;
  --hg-built: #e45649;
  --hg-meta: #0184bc;
}

:global(.dark) .code-view {
  --hg-keyword: #c678dd;
  --hg-string: #98c379;
  --hg-number: #d19a66;
  --hg-comment: #7f848e;
  --hg-title: #61afef;
  --hg-attr: #e5c07b;
  --hg-built: #e06c75;
  --hg-meta: #56b6c2;
}

.code-view :deep(.hljs-keyword),
.code-view :deep(.hljs-literal),
.code-view :deep(.hljs-doctag) {
  color: var(--hg-keyword);
}

.code-view :deep(.hljs-string),
.code-view :deep(.hljs-regexp),
.code-view :deep(.hljs-addition) {
  color: var(--hg-string);
}

.code-view :deep(.hljs-number) {
  color: var(--hg-number);
}

.code-view :deep(.hljs-comment),
.code-view :deep(.hljs-quote) {
  color: var(--hg-comment);
  font-style: italic;
}

.code-view :deep(.hljs-title),
.code-view :deep(.hljs-name) {
  color: var(--hg-title);
}

.code-view :deep(.hljs-attr),
.code-view :deep(.hljs-attribute),
.code-view :deep(.hljs-property),
.code-view :deep(.hljs-symbol) {
  color: var(--hg-attr);
}

.code-view :deep(.hljs-built_in),
.code-view :deep(.hljs-type),
.code-view :deep(.hljs-deletion) {
  color: var(--hg-built);
}

.code-view :deep(.hljs-meta),
.code-view :deep(.hljs-selector-tag),
.code-view :deep(.hljs-selector-class) {
  color: var(--hg-meta);
}

.code-view pre code {
  display: block;
  white-space: pre;
  background: transparent;
}
</style>
