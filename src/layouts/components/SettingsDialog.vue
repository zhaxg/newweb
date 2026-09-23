<script setup lang="ts">
import { ref } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Select from "primevue/select";
import { IconPlus } from "@tabler/icons-vue";
import { useSettingsStore, type FontScale } from "@/stores/settingsStore";
import { primaryOptions } from "@/lib/themeSettings";
import {
  chineseFontOptions,
  englishFontOptions,
  ensureFontLoaded,
  findFontOption,
  applyFontSettings,
  type FontOption,
} from "@/lib/fontSettings";

/* 系统设置弹窗（主题色 / 字体大小 / 中英文字体）：
   全部写 editorSettings → settingsStore watch 即时生效并持久化，弹窗自身无提交动作 */

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ "update:visible": [value: boolean] }>();

const { editorSettings, updateEditorSettings } = useSettingsStore();

/* 字体大小档位：写 editorSettings.fontScale */
const fontScaleOptions: { label: string; value: FontScale }[] = [
  { label: "标准", value: "standard" },
  { label: "大字体", value: "large" },
  { label: "更大字体", value: "xlarge" },
];

function onFontChange(kind: "zh" | "en", option: FontOption) {
  ensureFontLoaded(option);
  updateEditorSettings(kind === "zh" ? { fontChineseFamily: option.family } : { fontEnglishFamily: option.family });
  applyFontSettings();
}

/* 分段单选项类族（主题色/字体大小 共用；SFC scoped 样式里 @apply 不可用，见 Tailwind v4 @reference 限制）。
   inactive 串自带 text-xs，满足字段族辅助档声明 */
const SEG_BASE = "relative flex items-center gap-1.5 px-3 py-1 transition-colors";
const SEG_ACTIVE = `${SEG_BASE} bg-primary font-medium text-primary-foreground`;
const SEG_INACTIVE = `${SEG_BASE} bg-background text-xs text-muted-foreground hover:bg-accent hover:text-foreground`;

/* 主题色自定义取色：只在选到非预设色时占用该值，点回预设即恢复 */
function onCustomColor(e: Event) {
  const hex = (e.target as HTMLInputElement).value;
  if (/^#[0-9a-f]{6}$/i.test(hex)) updateEditorSettings({ primaryColor: hex });
}
</script>

<template>
  <Dialog :visible="visible" modal header="系统设置" :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)">
    <div class="space-y-3 text-xs text-muted-foreground">
      <div class="flex items-center justify-between gap-4">
        <span>· 主题色</span>
        <div class="inline-flex overflow-hidden rounded-md border border-border" role="radiogroup" aria-label="主题色">
          <button v-for="opt in primaryOptions" :key="opt.id" type="button" role="radio"
            :aria-checked="editorSettings.primaryColor === opt.id"
            :class="editorSettings.primaryColor === opt.id ? SEG_ACTIVE : SEG_INACTIVE"
            @click="updateEditorSettings({ primaryColor: opt.id })">
            <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: opt.base }" />{{ opt.label }}
          </button>
          <label class="text-xs"
            :class="[/^#[0-9a-f]{6}$/i.test(editorSettings.primaryColor) ? SEG_ACTIVE : SEG_INACTIVE, 'cursor-pointer']"
            title="任意颜色">
            <span v-if="/^#[0-9a-f]{6}$/i.test(editorSettings.primaryColor)" class="size-2 shrink-0 rounded-full"
              :style="{ backgroundColor: editorSettings.primaryColor }" />
            <IconPlus v-else class="size-3 shrink-0" />自定义
            <input type="color" class="absolute inset-0 cursor-pointer opacity-0"
              :value="/^#[0-9a-f]{6}$/i.test(editorSettings.primaryColor) ? editorSettings.primaryColor : '#0052d9'"
              @input="onCustomColor" />
          </label>
        </div>
      </div>
      <div class="flex items-center justify-between gap-4">
        <span>· 字体大小</span>
        <!-- 分段单选（radio 式）：档位少且互斥，比下拉少一次展开 -->
        <div class="inline-flex overflow-hidden rounded-md border border-border" role="radiogroup" aria-label="字体大小">
          <button v-for="o in fontScaleOptions" :key="o.value" type="button" role="radio"
            :aria-checked="editorSettings.fontScale === o.value"
            :class="editorSettings.fontScale === o.value ? SEG_ACTIVE : SEG_INACTIVE"
            @click="updateEditorSettings({ fontScale: o.value })">{{ o.label }}</button>
        </div>
      </div>
      <div class="flex items-center justify-between gap-4">
        <span>· 中文字体</span>
        <!-- Select 丢弃 $attrs，autofocus 须走 pt 挂到 focusInput(span)，供 Dialog 的 [autofocus] 查询命中 -->
        <Select :model-value="findFontOption(chineseFontOptions, editorSettings.fontChineseFamily)"
          :options="chineseFontOptions" option-label="label" data-key="family" class="w-40"
          :pt="{ label: { autofocus: true } }" @update:model-value="onFontChange('zh', $event)" />
      </div>
      <div class="flex items-center justify-between gap-4">
        <span>· 英文字体</span>
        <Select :model-value="findFontOption(englishFontOptions, editorSettings.fontEnglishFamily)"
          :options="englishFontOptions" option-label="label" data-key="family" class="w-40"
          @update:model-value="onFontChange('en', $event)" />
      </div>
    </div>
    <template #footer>
      <Button label="关闭" raised @click="emit('update:visible', false)" />
    </template>
  </Dialog>
</template>
