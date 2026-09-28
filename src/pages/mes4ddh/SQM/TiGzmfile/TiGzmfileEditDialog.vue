<script setup lang="ts">
/** FrmTiGzmfileEdit（标准/工艺文件 修改）：DDH.Winforms.SQM.Forms.Tqmtq.FrmTiGzmfileEdit
 *  已接入：tqmtpa6Api.query（标准/牌号候选）；保存回调由父页 tiGzmfileApi.addEditGzmfiles 承接（原 _flag=false 分支）
 *  布局：DataLayoutControl 坐标回读 Root 834×349，2 列（411）行主序 + 4 整行 + 文件行 + 备注整行，
 *        底部 stackPanel1 Dock Bottom RightToLeft（取消/保存）
 *  选项来源：文件种类 = Designer 写死 Items[工艺文件/结论文件]；受控状态 = 写死 Items[非保密/保密]；
 *            使用单位 = AccessibleName(A0000:TIGZMFILE_DEPT) 运行时字典；厂别区分 = 原 ucLine1.RefreshData → 产线
 *  逻辑：标准（SearchLookUpEdit）选中 → 同步 SgStd/SgSign/CSgStdCodes/CSgCodes；
 *        选择文件 → 拆文件名得 RegulateName + Type + CLocalName；
 *        OnOkClick 五项校验 + 文件名非法字符校验 + 「确定保存？」确认，中文提示逐字照抄
 *  待接入：新增分支（_flag=true）保存前经 OnSaved → FtpHelper(10.11.5.63) 上传，web 无对应后端，父页「上传」已留占位 */
import { reactive, ref, watch, type Ref } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import DatePicker from "primevue/datepicker";
import Dialog from "primevue/dialog";
import {
  GzmFileControlStateEnum,
  GzmFileVarietyEnum,
  tqmtpa6Api,
  type TiGzmfile,
  type Tqmtpa6,
} from "@/api/mes4ddh/sqm.swagger";
import { tPa1000Api } from "@/api/mes4ddh/shr.swagger";
import { systemKeyValueApi } from "@/api/admin/request";
import { useToast } from "@/composables/useToast";

const props = defineProps<{ visible: boolean; row: TiGzmfile | null }>();
const emit = defineEmits<{ "update:visible": [boolean]; ok: [TiGzmfile] }>();
const { toast } = useToast();

type Opt = { label: string; value: string };

const form = reactive<TiGzmfile>({});
const errors = reactive<Record<string, string>>({});
const saving = ref(false);
const publishDate = ref<Date | null>(null);
const dScrapDate = ref<Date | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

const kvUseUnit = ref<Opt[]>([]);
const lineOpts = ref<Opt[]>([]);
const sgOptions = ref<{ label: string; value: string; row: Tqmtpa6 }[]>([]);

/** 原 VarietyImageComboBoxEdit.Properties.Items（写死两项） */
const varietyOpts: Opt[] = [
  { label: "工艺文件", value: String(GzmFileVarietyEnum.GYFile) },
  { label: "结论文件", value: String(GzmFileVarietyEnum.JLFile) },
];
/** 原 ControlStateImageComboBoxEdit.Properties.Items（写死两项） */
const controlStateOpts: Opt[] = [
  { label: "非保密", value: String(GzmFileControlStateEnum.NC) },
  { label: "保密", value: String(GzmFileControlStateEnum.C) },
];

async function loadKv(target: Ref<Opt[]>, pcode: string) {
  try {
    const list = (await systemKeyValueApi.querySysKvItemList(pcode)) ?? [];
    target.value = list.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
  } catch {
    /* 拦截层已 toast */
  }
}

const fmtD = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 19) : null;
const parseD = (v?: string | null) => (v ? new Date(v) : null);

watch(
  () => props.visible,
  async (v) => {
    if (!v) return;
    Object.keys(errors).forEach((k) => delete errors[k]);
    confirmOpen.value = false;
    Object.assign(form, props.row ?? {});
    publishDate.value = parseD(form.publishDate);
    dScrapDate.value = parseD(form.dScrapDate);
    await Promise.all([
      loadKv(kvUseUnit, "A0000:TIGZMFILE_DEPT"),
      (async () => {
        try {
          const lines = (await tPa1000Api.queryLines()) ?? [];
          lineOpts.value = lines.filter((x) => x.cCode).map((x) => ({ label: x.cName ?? "", value: x.cCode ?? "" }));
        } catch {
          /* 拦截层已 toast */
        }
      })(),
    ]);
    try {
      const list = (await tqmtpa6Api.query({})) ?? [];
      sgOptions.value = list.map((x) => ({
        label: [x.cSgStd, x.cSgSign].filter(Boolean).join(" "),
        value: x.cStdSgCode ?? "",
        row: x,
      }));
    } catch {
      toast("数据加载失败", 3000, "warn");
    }
  },
);

/** 原 SgStdTextEdit_Closed：取候选行回填四个字段 */
function onSgChange(v: string | null) {
  const hit = sgOptions.value.find((o) => o.value === v)?.row;
  form.cSgStdCodes = hit?.cStdSgCode ?? null;
  form.sgStd = hit?.cSgStd ?? null;
  form.sgSign = hit?.cSgSign ?? null;
  form.cSgCodes = hit?.cSgCode ?? null;
}

/** 原 btnGetFile_Click + BindFileInfo：按「名称.扩展名」拆文件名 */
function onPickFile(e: Event) {
  const file = e.target as HTMLInputElement;
  const f = file.files?.[0];
  if (!f) return;
  const parts = f.name.split(".");
  if (parts.length < 2) {
    toast("文件类型获取失败，请检查文件名称是否合规！", 3000, "error");
    return;
  }
  form.regulateName = parts.slice(0, -1).join(".");
  form.type = parts[parts.length - 1];
  form.cLocalName = f.name;
  file.value = "";
}

/* ---------- 确认（对应原 MsgBox.ShowYesNo("确定保存？")，与编辑 Dialog 平级，避免嵌套） ---------- */
const confirmOpen = ref(false);
const confirmMsg = ref("确定保存？");

/** 原 btnSave_Click 校验，中文提示逐字照抄 */
function onOk() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!form.matKind) errors.matKind = "请选择厂区分别！";
  if (!form.regulateNo) errors.regulateNo = "工艺规程号禁止为空！";
  if (!form.sgStd) errors.sgStd = "标准不得为空！";
  if (Object.keys(errors).length) return;

  if (form.regulateName && /[\\/:*?"<>|]/.test(form.regulateName)) {
    toast('文件名不能包含Windows文件名非法字符\r请检查是否包含以下字符:\n\\ / : * ? " < > |', 4000, "error");
    return;
  }
  confirmOpen.value = true;
}

function onConfirmOk() {
  confirmOpen.value = false;
  saving.value = true;
  try {
    form.publishDate = fmtD(publishDate.value);
    form.dScrapDate = fmtD(dScrapDate.value);
    emit("ok", { ...form });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <!-- 确认（平级，不嵌在编辑 Dialog 内） -->
  <Dialog
    :visible="confirmOpen"
    modal
    header="确认"
    :style="{ width: 'min(24rem, calc(100vw - 2rem))' }"
    @update:visible="confirmOpen = $event"
  >
    <p class="text-xs">{{ confirmMsg }}</p>
    <template #footer>
      <Button label="取消" variant="outlined" @click="confirmOpen = false" />
      <Button label="确定" variant="outlined" :loading="saving" @click="onConfirmOk" />
    </template>
  </Dialog>

  <Dialog
    :visible="props.visible"
    modal
    header="修改标准/工艺文件"
    :style="{ width: 'min(56rem, calc(100vw - 2rem))' }"
    @update:visible="emit('update:visible', $event)"
  >
    <!-- 原 DataLayoutControl：2 列（411）行主序 + 整行，Root 834×349 -->
    <div class="grid grid-cols-2 items-start gap-x-3 gap-y-2">
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">使用单位</label>
          <Select
            :model-value="form.useUnit ?? null"
            :options="kvUseUnit"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="使用单位"
            class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => (form.useUnit = v)"
          />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">文件种类</label>
          <Select
            :model-value="form.variety ?? null"
            :options="varietyOpts"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="文件种类"
            class="min-w-0 flex-1"
            @update:model-value="(v: string | null) => (form.variety = v)"
          />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">受控状态</label>
          <Select
            :model-value="form.controlState == null ? null : String(form.controlState)"
            show-clear
            :options="controlStateOpts"
            option-label="label"
            option-value="value"
            placeholder="受控状态"
            class="min-w-0 flex-1"
            @update:model-value="
              (v: string | null) => (form.controlState = (v == null ? null : Number(v)) as GzmFileControlStateEnum)
            "
          />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">版本号</label>
          <InputText
            :model-value="form.versionNo == null ? '' : String(form.versionNo)"
            class="min-w-0 flex-1"
            @update:model-value="(v?: string) => (form.versionNo = !v ? null : Number(v))"
          />
        </div>
      </div>

      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">发布日期</label>
          <DatePicker v-model="publishDate" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
      </div>
      <div class="min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">作废时间</label>
          <DatePicker v-model="dScrapDate" date-format="yy-mm-dd" show-icon class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="col-span-2 min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">厂别区分</label>
          <Select
            :model-value="form.matKind ?? null"
            :options="lineOpts"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="厂别区分"
            class="min-w-0 flex-1"
            :invalid="!!errors.matKind"
            @update:model-value="
              (v: string | null) => {
                form.matKind = v;
                form.matKindName = lineOpts.find((o) => o.value === v)?.label ?? null;
              }
            "
          />
        </div>
        <p v-if="errors.matKind" class="mt-0.5 pl-[6.75rem] text-xs text-destructive">{{ errors.matKind }}</p>
      </div>

      <div class="col-span-2 min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">标准</label>
          <Select
            :model-value="form.cSgStdCodes ?? null"
            :options="sgOptions"
            :filter="true"
            show-clear
            option-label="label"
            option-value="value"
            placeholder="执行标准 牌号"
            class="min-w-0 flex-1"
            :invalid="!!errors.sgStd"
            @update:model-value="onSgChange"
          />
        </div>
        <p v-if="errors.sgStd" class="mt-0.5 pl-[6.75rem] text-xs text-destructive">{{ errors.sgStd }}</p>
      </div>

      <div class="col-span-2 min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">工艺规程号</label>
          <InputText v-model="form.regulateNo" maxlength="50" class="min-w-0 flex-1" :invalid="!!errors.regulateNo" />
        </div>
        <p v-if="errors.regulateNo" class="mt-0.5 pl-[6.75rem] text-xs text-destructive">{{ errors.regulateNo }}</p>
      </div>

      <div class="col-span-2 min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">工艺规程名称</label>
          <InputText v-model="form.regulateName" maxlength="200" class="min-w-0 flex-1" />
        </div>
      </div>

      <div class="col-span-2 min-w-0">
        <div class="flex min-w-0 items-center gap-1.5">
          <label class="w-24 shrink-0 text-xs text-muted-foreground">文件选择</label>
          <InputText v-model="form.cLocalName" readonly class="min-w-0 flex-1" placeholder="未选择文件" />
          <input ref="fileInput" type="file" accept=".pdf" class="hidden" @change="onPickFile" />
          <Button label="选择文件" variant="outlined" class="shrink-0 whitespace-nowrap" @click="fileInput?.click()" />
        </div>
      </div>

      <div class="col-span-2 min-w-0">
        <div class="flex min-w-0 items-start gap-1.5">
          <label class="w-24 shrink-0 pt-1.5 text-xs text-muted-foreground">备注</label>
          <InputText v-model="form.remark" maxlength="500" class="min-w-0 flex-1" />
        </div>
      </div>
    </div>

    <!-- 原 stackPanel1（Dock Bottom，RightToLeft：取消 / 保存） -->
    <template #footer>
      <Button label="取消" variant="outlined" @click="emit('update:visible', false)" />
      <Button label="保存" variant="outlined" :loading="saving" @click="onOk" />
    </template>
  </Dialog>
</template>
