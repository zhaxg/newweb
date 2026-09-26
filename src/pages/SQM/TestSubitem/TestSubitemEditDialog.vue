<script setup lang="ts">
/** FrmTestSubitemEdit（试验子项目新增/编辑）：DDH.Winforms.SQM.Forms.Basic.FrmTestSubitemEdit
 *  已接入：testItemApi.queryTestItems（试验项目下拉，InitData）；保存回调由父页 testItemApi.insertOrUpdate 承接
 *  布局：DataLayoutControl 2 列 × 7 行（坐标回读：行主序，左列 x=0 / 右列 x=336，行高 24，Root 692×280）
 *  逻辑：试验项目种类（KV A0100:TEST_ITEM_TYPE）变更 → 置 testItemTypeDesc 并按种类过滤试验项目代码；
 *        试验项目代码变更 → 同步 testItemCode / testItemName；OnOkClick 三项必填校验，中文提示逐字照抄
 *  待接入：无 */
import { reactive, ref, watch, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Dialog from "primevue/dialog";
import { testItemApi, type TestItemDto, type TestSubItem } from "@/api/mes4ddh/sqm.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ visible: boolean; row: TestSubItem | null; isNew?: boolean }>();
const emit = defineEmits<{ "update:visible": [boolean]; ok: [TestSubItem] }>();
const { toast } = useToast();

type Opt = { label: string; value: string };

const form = reactive<TestSubItem>({});
const errors = reactive<Record<string, string>>({});
const saving = ref(false);

const kvItemType = ref<Opt[]>([]);
const testItems = ref<TestItemDto[]>([]);
/** 原 TestItemCodeImageComboBoxEdit：Items.Add(TestItemName, TestItemCode) → 显示名称、存代码 */
const itemCodeOpts = ref<Opt[]>([]);

async function loadKv(target: Ref<Opt[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}

/** 原 BindTestItemCbox：按当前试验项目种类过滤试验项目代码 */
function bindItemCode() {
  itemCodeOpts.value = testItems.value
    .filter((x) => x.testItemType === form.testItemType)
    .map((x) => ({ label: x.testItemName ?? "", value: x.testItemCode ?? "" }));
}

/** 原 TestItemTypeImageComboBoxEdit_EditValueChanged */
function onTypeChange(v: string | null) {
  form.testItemType = v;
  form.testItemTypeDesc = kvItemType.value.find((o) => o.value === v)?.label ?? null;
  form.testItemCode = null;
  form.testItemName = null;
  bindItemCode();
}

/** 原 TestItemCodeImageComboBoxEdit_EditValueChanged */
function onCodeChange(v: string | null) {
  form.testItemCode = v;
  form.testItemName = itemCodeOpts.value.find((o) => o.value === v)?.label ?? null;
}

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    Object.assign(form, props.row ?? {});
    await loadKv(kvItemType, "A0100:TEST_ITEM_TYPE");
    try {
      testItems.value = (await testItemApi.queryTestItems()) ?? [];
    } catch {
      // 原 InitData catch：MsgBox.ShowAlert("数据加载失败")
      testItems.value = [];
      toast("数据加载失败", 3000, "warn");
    }
    bindItemCode();
  },
);

/** 原 OnOkClick：三项必填校验，ErrorText 中文逐字照抄 */
function onOk() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.testItemType) errors.testItemType = "请选择试验项目种类";
  if (!form.testSubItemCode) errors.testSubItemCode = "请输入试验子项目代码";
  if (!form.testSubItemName) errors.testSubItemName = "请输入试验子项目名称";
  if (Object.keys(errors).length) return;
  emit("ok", { ...form });
}
</script>

<template>
  <Dialog
    :visible="props.visible"
    modal
    :header="props.isNew ? '添加试验子项目' : '编辑试验子项目'"
    :style="{ width: 'min(46rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)"
  >
    <!-- 原 DataLayoutControl 2 列行主序（坐标回读 336/692，行高 24） -->
    <div class="grid grid-cols-2 items-start gap-x-3 gap-y-2">
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">试验项目种类</label>
          <Select
            :model-value="form.testItemType ?? null"
            :options="kvItemType"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="试验项目种类"
            class="min-w-0 flex-1"
            :invalid="!!errors.testItemType"
            @update:model-value="onTypeChange"
          />
        </div>
        <p v-if="errors.testItemType" class="mt-0.5 pl-[7.75rem] text-xs text-destructive">{{ errors.testItemType }}</p>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">试验项目代码</label>
          <Select
            :model-value="form.testItemCode ?? null"
            :options="itemCodeOpts"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="试验项目代码"
            class="min-w-0 flex-1"
            @update:model-value="onCodeChange"
          />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">试验子项目代码</label>
          <InputText
            v-model="form.testSubItemCode"
            maxlength="50"
            class="min-w-0 flex-1"
            :invalid="!!errors.testSubItemCode"
          />
        </div>
        <p v-if="errors.testSubItemCode" class="mt-0.5 pl-[7.75rem] text-xs text-destructive">
          {{ errors.testSubItemCode }}
        </p>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">试验子项目名称</label>
          <InputText
            v-model="form.testSubItemName"
            maxlength="100"
            class="min-w-0 flex-1"
            :invalid="!!errors.testSubItemName"
          />
        </div>
        <p v-if="errors.testSubItemName" class="mt-0.5 pl-[7.75rem] text-xs text-destructive">
          {{ errors.testSubItemName }}
        </p>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">单位</label>
          <InputText v-model="form.unit" maxlength="20" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">试验子项目描述</label>
          <InputText v-model="form.other1" maxlength="200" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">值来源</label>
          <InputText v-model="form.other2" maxlength="50" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">显示名称来源</label>
          <InputText v-model="form.other3" maxlength="50" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">试验子项目英文名称</label>
          <InputText v-model="form.other4" maxlength="100" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">精度</label>
          <InputText
            :model-value="form.other5 == null ? '' : String(form.other5)"
            class="min-w-0 flex-1"
            @update:model-value="(v?: string) => (form.other5 = !v ? null : Number(v))"
          />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">预留6</label>
          <InputText v-model="form.other6" maxlength="50" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">预留7</label>
          <InputText v-model="form.other7" maxlength="50" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">预留8</label>
          <InputText v-model="form.other8" maxlength="50" class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-28 shrink-0 text-xs text-muted-foreground">录入排序</label>
          <InputText
            :model-value="form.seq == null ? '' : String(form.seq)"
            class="min-w-0 flex-1"
            @update:model-value="(v?: string) => (form.seq = !v ? null : Number(v))"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:visible', false)" />
      <Button label="确定" variant="outlined" :loading="saving" @click="onOk" />
    </template>
  </Dialog>
</template>
