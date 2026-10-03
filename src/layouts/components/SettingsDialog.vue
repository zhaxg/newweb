<script setup lang="ts">
import { ref } from "vue";
import Dialog from "primevue/dialog";
import Button from "primevue/button";
import Select from "primevue/select";
import { useSettingsStore, type FontScale } from "@/stores/settingsStore";
import { themePresets } from "@/lib/themePresets";
import {
  chineseFontOptions,
  englishFontOptions,
  ensureFontLoaded,
  findFontOption,
  applyFontSettings,
  type FontOption,
} from "@/lib/fontSettings";

/* 系统设置弹窗（配色方案 / 字体大小 / 中英文字体）：
   全部写 editorSettings → settingsStore watch 即时生效并持久化，弹窗自身无提交动作。
   原「主题色」分段已由配色方案替代（选卡联动写 primaryColor），themeSettings 链路保留 */

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

/* 分段单选项类族（字体大小用；SFC scoped 样式里 @apply 不可用，见 Tailwind v4 @reference 限制）。
   inactive 串自带 text-xs，满足字段族辅助档声明 */
const SEG_BASE = "relative flex items-center gap-1.5 px-3 py-1 transition-colors";
const SEG_ACTIVE = `${SEG_BASE} bg-primary font-medium text-primary-foreground`;
const SEG_INACTIVE = `${SEG_BASE} bg-background text-xs text-muted-foreground hover:bg-accent hover:text-foreground`;

/* 配色方案卡：默认 + 6 预设，是系统设置里唯一的换色入口。
   选卡 = 一次写 themePreset 与 primaryColor（一键换装，预设带推荐主色） */
const presetCards = [
  {
    id: "default",
    label: "默认配色",
    gradient: "linear-gradient(135deg, #0052d9 0%, #6b97e7 100%)",
    primaryHex: "brand",
  },
  ...themePresets.map((p) => ({
    id: p.id,
    label: p.label,
    gradient: `linear-gradient(135deg, ${p.swatches[0]} 0%, ${p.swatches[1]} 100%)`,
    primaryHex: p.primaryHex,
  })),
];

function onPresetPick(card: (typeof presetCards)[number]) {
  updateEditorSettings({ themePreset: card.id, primaryColor: card.primaryHex });
}

/* 历史脏数据里的未知预设 id 兜底到默认卡，避免整片卡片都不高亮 */
function isPresetActive(id: string) {
  if (id === editorSettings.themePreset) return true;
  return id === "default" && !themePresets.some((p) => p.id === editorSettings.themePreset);
}
</script>

<template>
  <Dialog
    :visible="visible"
    modal
    header="系统设置"
    :style="{ width: 'min(32rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="space-y-3 text-xs text-muted-foreground">
      <div>
        <div class="mb-2">· 配色方案</div>
        <div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="配色方案">
          <button
            v-for="card in presetCards"
            :key="card.id"
            type="button"
            role="radio"
            :aria-checked="isPresetActive(card.id)"
            :class="
              isPresetActive(card.id)
                ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                : 'ring-1 ring-border hover:ring-primary/50'
            "
            class="rounded-md p-1 text-center transition"
            @click="onPresetPick(card)"
          >
            <span class="block h-8 rounded" :style="{ background: card.gradient }" />
            <span
              class="mt-1 block text-xs"
              :class="isPresetActive(card.id) ? 'font-medium text-foreground' : 'text-muted-foreground'"
              >{{ card.label }}</span
            >
          </button>
        </div>
      </div>
      <!-- 色卡块视觉体量大，与下方字段行多留分隔：space-y-3 是相邻 12px margin-bottom，
           同元素 margin-top 须 >12 才不被合并吞掉（mt-5=20 → 视觉 20px） -->
      <div class="mt-5 flex items-center justify-between gap-4">
        <span>· 字体大小</span>
        <!-- 分段单选（radio 式）：档位少且互斥，比下拉少一次展开 -->
        <div
          class="inline-flex overflow-hidden rounded-md border border-border"
          role="radiogroup"
          aria-label="字体大小"
        >
          <button
            v-for="o in fontScaleOptions"
            :key="o.value"
            type="button"
            role="radio"
            :aria-checked="editorSettings.fontScale === o.value"
            :class="editorSettings.fontScale === o.value ? SEG_ACTIVE : SEG_INACTIVE"
            @click="updateEditorSettings({ fontScale: o.value })"
          >
            {{ o.label }}
          </button>
        </div>
      </div>
      <div class="flex items-center justify-between gap-4">
        <span>· 英文字体</span>
        <!-- Select 丢弃 $attrs，autofocus 须走 pt 挂到 focusInput(span)，供 Dialog 的 [autofocus] 查询命中；
             挂在首个 Select（英文字体，行序 英→中） -->
        <Select
          :model-value="findFontOption(englishFontOptions, editorSettings.fontEnglishFamily)"
          :options="englishFontOptions"
          option-label="label"
          data-key="family"
          class="w-40"
          :pt="{ label: { autofocus: true } }"
          @update:model-value="onFontChange('en', $event)"
        />
      </div>
      <div class="flex items-center justify-between gap-4">
        <span>· 中文字体</span>
        <Select
          :model-value="findFontOption(chineseFontOptions, editorSettings.fontChineseFamily)"
          :options="chineseFontOptions"
          option-label="label"
          data-key="family"
          class="w-40"
          @update:model-value="onFontChange('zh', $event)"
        />
      </div>
    </div>
    <template #footer>
      <Button label="关闭" raised @click="emit('update:visible', false)" />
    </template>
  </Dialog>
</template>
