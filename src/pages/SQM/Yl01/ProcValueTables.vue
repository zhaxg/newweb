<script setup lang="ts">
/** UCProcValueTables + UCProcPage（下栏三层页签）：
 *  DDH.Winforms.SQM.Forms.Tqmyl.UCProcValueTables / UCProcPage
 *  结构：
 *    第 1 层 xtraTabControl2（Dock Fill）= 静态页「产前准备」+ 按 model.gylj 动态生成的工序页
 *      · 产前准备页 → ucIndexValueEditView1（BindCqzb）
 *      · 工序页 Tag=YlgyGx，选中时把控件 ucProcPage1 挂进去（web 侧等价为条件渲染）
 *    第 2 层 UCProcPage.stackPanel1(Dock Top)：从其他工艺复制 / 从当前工艺复制
 *           + xtraTabControl1：按 gx.valueGrps 生成分组页（GrpName）
 *    第 3 层 每个分组页 → ucIndexValueEditView1（BindData(gx, grp, model)）
 *  原 ShowProcPages 会隐藏产前准备页，RefreshProcPages() 再显示 —— web 侧恒显示（主流程只走 RefreshProcPages）
 *  待接入：「从其他工艺复制」→ FrmYl03、「从当前工艺复制」→ FrmYl04（本轮按约定留占位） */
import { computed, ref, watch } from "vue";
import Button from "primevue/button";
import Tabs from "primevue/tabs";
import TabList from "primevue/tablist";
import Tab from "primevue/tab";
import TabPanels from "primevue/tabpanels";
import TabPanel from "primevue/tabpanel";
import { IconCopy } from "@tabler/icons-vue";
import IndexValueView from "./IndexValueView.vue";
import type { Ylgy } from "./ylgy";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ model: Ylgy | null; editable?: boolean }>();
const { toast } = useToast();

/** 第 1 层：产前准备 / 各工序 */
const outerTab = ref("cqzb");
/** 第 2 层：当前工序内的指标分组 */
const innerTab = ref("");

const outerTabs = computed(() => [
  { value: "cqzb", label: "产前准备" },
  ...((props.model?.gylj ?? []).map((gx, i) => ({
    value: `gx-${i}`,
    label: gx.data.cProcName || gx.data.cProc || "",
  })) as { value: string; label: string }[]),
]);

const activeGx = computed(() => {
  if (!outerTab.value.startsWith("gx-") || !props.model) return null;
  return props.model.gylj[Number(outerTab.value.slice(3))] ?? null;
});

const innerTabs = computed(() => (activeGx.value?.valueGrps ?? []).map((g) => ({ value: g.grp, label: g.grpName })));
const activeGrp = computed(() => {
  const gx = activeGx.value;
  if (!gx) return null;
  return gx.valueGrps.find((g) => g.grp === innerTab.value) ?? gx.valueGrps[0] ?? null;
});

watch(
  outerTabs,
  (list) => {
    if (!list.some((x) => x.value === outerTab.value)) outerTab.value = list[0]?.value ?? "cqzb";
  },
  { immediate: true },
);
watch(
  innerTabs,
  (list) => {
    if (!list.length) {
      innerTab.value = "";
      return;
    }
    if (!list.some((x) => x.value === innerTab.value)) innerTab.value = list[0].value;
  },
  { immediate: true },
);
/* 换工序时重置分组选中 */
watch(activeGx, () => {
  const list = innerTabs.value;
  innerTab.value = list[0]?.value ?? "";
});

function onCopyFromOtherProc() {
  toast("画面迁移：从其他工艺复制（FrmYl03 选择器）逻辑待接入", 3000, "warn");
}
function onCopyFromCurrentProc() {
  toast("画面迁移：从当前工艺复制（FrmYl04 选择器）逻辑待接入", 3000, "warn");
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col">
    <Tabs v-model:value="outerTab" class="min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center border-b border-border/60">
        <TabList class="min-w-0 flex-1">
          <Tab v-for="t in outerTabs" :key="t.value" :value="t.value">{{ t.label }}</Tab>
        </TabList>
      </div>

      <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
        <!-- 第 1 层 · 产前准备（原 xtraTabPage4，BindCqzb） -->
        <TabPanel value="cqzb" class="h-full overflow-hidden">
          <IndexValueView v-if="outerTab === 'cqzb'" :model="model" :editable="editable" />
        </TabPanel>

        <!-- 第 1 层 · 工序页（原 ucProcPage1 挂入的动态页） -->
        <TabPanel
          v-for="(gxItem, i) in model?.gylj ?? []"
          :key="`gx-${i}`"
          :value="`gx-${i}`"
          class="h-full overflow-hidden"
        >
          <div v-if="outerTab === `gx-${i}`" class="flex h-full min-h-0 flex-col">
            <!-- 第 2 层 · UCProcPage.stackPanel1(Dock Top) -->
            <div v-if="editable" class="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 px-2">
              <Button text class="shrink-0 whitespace-nowrap" @click="onCopyFromOtherProc">
                <IconCopy class="h-3 w-3" />从其他工艺复制
              </Button>
              <Button text class="shrink-0 whitespace-nowrap" @click="onCopyFromCurrentProc">
                <IconCopy class="h-3 w-3" />从当前工艺复制
              </Button>
            </div>

            <!-- 第 2 层 · UCProcPage.xtraTabControl1（按 ValueGrps 生成分组页） -->
            <Tabs v-model:value="innerTab" class="min-h-0 flex-1 flex-col">
              <div class="flex shrink-0 items-center border-b border-border/60">
                <TabList class="min-w-0 flex-1">
                  <Tab v-for="g in innerTabs" :key="g.value" :value="g.value">{{ g.label }}</Tab>
                </TabList>
              </div>
              <TabPanels class="min-h-0 flex-1 overflow-hidden !p-0">
                <!-- 第 3 层 · 每个分组页 → UCIndexValueEditView（BindData(gx, grp, model)） -->
                <TabPanel v-for="g in innerTabs" :key="g.value" :value="g.value" class="h-full overflow-hidden">
                  <IndexValueView
                    v-if="activeGrp?.grp === g.value"
                    :model="model"
                    :gx="activeGx"
                    :grp="activeGrp"
                    :editable="editable"
                  />
                </TabPanel>
                <TabPanel v-if="!innerTabs.length" value="__empty" class="h-full overflow-hidden">
                  <div class="p-3 text-xs text-muted-foreground">该工序暂无指标分组</div>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>
