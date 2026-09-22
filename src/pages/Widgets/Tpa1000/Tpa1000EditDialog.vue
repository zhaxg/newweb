<script setup lang="ts">
import { reactive, computed, watch } from "vue";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import Select from "primevue/select";

/** 对应 FrmTpa1000Edit（工厂/产线/设备编辑）：画面迁移，逻辑不迁移 */

interface Tpa1000 {
  id: string;
  cCode: string;
  cName: string;
  cSimpName?: string;
  cSimpCode?: string;
  cSimpNo?: string;
  cPid?: string;
  nLevel: number;
  cWorkCenter?: string;
  cProc?: string;
  cType?: string;
  nOrder?: number;
  cLineCode?: string;
}

const props = defineProps<{
  open: boolean;
  item: Tpa1000 | null;
  parents: Tpa1000[];
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  submit: [item: Tpa1000];
}>();

const LEVEL_OPTIONS = [
  { label: "工厂", value: 0 },
  { label: "产线", value: 10 },
  { label: "区域", value: 20 },
  { label: "设备", value: 30 },
];

/** 对应原 CLineCodeTextEdit：仅层级=产线(10) 的记录可作为产线选项 */
const lineOptions = computed(() =>
  props.parents
    .filter((p) => p.nLevel === 10)
    .map((p) => ({ label: p.cName, value: p.cCode })),
);

/** 对应原 CPidTextEdit（TreeListLookUpEdit）：父级列表 */
const parentOptions = computed(() =>
  props.parents.map((p) => ({ label: p.cName, value: p.cCode })),
);

const form = reactive<Tpa1000>({
  id: "",
  cCode: "",
  cName: "",
  cSimpName: "",
  cSimpCode: "",
  cSimpNo: "",
  cPid: "",
  nLevel: 0,
  cWorkCenter: "",
  cProc: "",
  cType: "",
  nOrder: 0,
  cLineCode: "",
});

const isEdit = computed(() => !!props.item);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    if (props.item) Object.assign(form, props.item);
    else
      Object.assign(form, {
        id: "",
        cCode: "",
        cName: "",
        cSimpName: "",
        cSimpCode: "",
        cSimpNo: "",
        cPid: "",
        nLevel: 0,
        cWorkCenter: "",
        cProc: "",
        cType: "",
        nOrder: 0,
        cLineCode: "",
      });
  },
);

function onSubmit() {
  emit("submit", { ...form });
}
</script>

<template>
  <Dialog :visible="open" modal header="工厂/产线/设备编辑" :style="{ width: 'min(34rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:open', $event)">
    <div class="min-w-0 space-y-3 py-1">
      <div class="grid grid-cols-1 gap-x-4 gap-y-3">
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">父主键</label>
          <Select v-model="form.cPid" :options="parentOptions" option-label="label" option-value="value"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">层级</label>
          <Select v-model="form.nLevel" :options="LEVEL_OPTIONS" option-label="label" option-value="value"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">代码<span class="ml-0.5 text-destructive">*</span></label>
          <InputText v-model="form.cCode" :disabled="isEdit" placeholder="请输入代码" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">名称</label>
          <InputText v-model="form.cName" placeholder="请输入名称" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">简称</label>
          <InputText v-model="form.cSimpName" placeholder="请输入简称" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">拼音简称</label>
          <InputText v-model="form.cSimpCode" placeholder="请输入拼音简称" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">流水</label>
          <InputText v-model="form.cSimpNo" placeholder="请输入流水" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">产线代码</label>
          <Select v-model="form.cLineCode" :options="lineOptions" option-label="label" option-value="value"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">工作中心代码</label>
          <InputText v-model="form.cWorkCenter" placeholder="请输入工作中心代码" autocapitalize="off" spellcheck="false"
            class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">所属工序代码</label>
          <Select v-model="form.cProc" :options="[]" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">类型</label>
          <InputText v-model="form.cType" placeholder="请输入类型" class="w-full min-w-0" />
        </div>
        <div class="min-w-0 space-y-1">
          <label class="text-xs font-medium text-muted-foreground">排序</label>
          <InputNumber v-model="form.nOrder" :show-buttons="false" :use-grouping="false" class="w-full min-w-0" />
        </div>
      </div>
    </div>
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:open', false)" />
      <Button label="保存" variant="outlined" @click="onSubmit" />
    </template>
  </Dialog>
</template>
