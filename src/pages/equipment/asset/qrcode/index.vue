<script setup lang="ts">
/** 对应 AE0005 扫码查询（模块二 设备台账 · 附录 B4 第 2 幕 · 自定版式：二维码 + 真·移动端预览）
 *  接口：equipmentApi.list（GET /eam/equipment/list，设备下拉候选）
 *        + 页内 iframe 打的是 **`/eam/eq` 那条独立 H5 路由**（`src/router/business.ts` 里全站唯一
 *          `meta.public` 路由，落地页组件 `../EqArchiveH5.vue`，数据走 GET /eam/equipment/scan）
 *  演示要点：**这一页不是列表页，是"扫码这件事"的展台**——左边一张能真扫的二维码，右边一台手机。
 *        演示者拿自己手机扫屏上的码，档案页就在手机上打开：同网段可扫，因为地址跟着
 *        `window.location.origin` 走（见 ../h5Url.ts），不是写死的 localhost。
 *        没手机时右边那台"手机"照样能看——它是真 iframe，不是画出来的假屏，
 *        所以扫出来的效果与台上看到的一模一样，不需要提前准备截图。
 *        下面「手动输入编码」是**故意留的负例入口**：输入一个不存在的编码，右边立刻变成
 *        「这台设备没有登记」，用来回答客户必问的那句"扫错了 / 不是我们的设备怎么办"。
 *  已知偏差：文档写的是「H5 路由白名单免登录」，本仓库的等价实现是路由 `meta.public`
 *        （`src/router/core/routeMeta.ts`），不引入新的白名单机制。
 *  待接入：无。 */
import { onMounted, ref, watch } from "vue";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import { IconExternalLink, IconScan } from "@tabler/icons-vue";
import { equipmentApi } from "@/api/equipment";
import type { Equipment } from "@/api/equipment/types";
import { useToast } from "@/composables/useToast";
import QrPanel from "../../QrPanel.vue";
import { h5ArchiveUrl } from "../../h5Url";

const { toast } = useToast();

const list = ref<Equipment[]>([]);
const picked = ref<Equipment | null>(null);

/** 扫码内容：设备编码。选中设备由下面 watch 写入，手动输入那条路直接改它 */
const code = ref("");
const manual = ref("");

onMounted(async () => {
  try {
    list.value = (await equipmentApi.list()) ?? [];
    // 默认停在 F4 主传动——剧本第 2 幕讲的就是这台设备，别让客户进来先选一遍
    picked.value = list.value.find((e) => e.id === "EQ-BR-F4-01") ?? list.value[0] ?? null;
  } catch {
    /* 拦截层已 toast；下拉空着，手动输入那条路仍可用 */
  }
});

watch(picked, (row) => {
  if (row) {
    code.value = row.id;
    manual.value = "";
  }
});

function useManual() {
  const val = manual.value.trim();
  if (!val) {
    toast("请先输入设备编码", 2000, "warn");
    return;
  }
  picked.value = null;
  code.value = val;
}

function openInNewTab() {
  if (!code.value) return;
  window.open(h5ArchiveUrl(code.value), "_blank");
}

/** 下拉候选用「名称（编码）」：只给名称的话现场两台同名设备选不出区别，只给编码又看不出是哪台 */
const options = () => list.value.map((e) => ({ label: `${e.name}（${e.id}）`, value: e }));
</script>

<template>
  <div class="flex min-h-0 flex-1 gap-3 overflow-auto p-3">
    <!-- 左：码 + 操作（固定宽，和右边手机框同量级，谁也不挤谁） -->
    <div class="flex w-[22rem] shrink-0 flex-col gap-4">
      <div class="space-y-2">
        <label class="text-xs text-muted-foreground">选择设备</label>
        <Select
          v-model="picked"
          :options="options()"
          option-label="label"
          option-value="value"
          filter
          placeholder="台账里的设备"
          class="w-full"
        />
      </div>

      <div class="flex flex-col items-center gap-3 rounded-md border border-border/60 px-3 py-4">
        <QrPanel v-if="code" :code="code" :size="220" />
        <p v-else class="text-body text-muted-foreground">选择设备或手动输入编码后生成二维码</p>
        <Button label="在新标签打开" variant="outlined" class="w-full" :disabled="!code" @click="openInNewTab">
          <IconExternalLink class="h-3.5 w-3.5" />
        </Button>
      </div>

      <div class="space-y-2 rounded-md border border-border/60 px-3 py-3">
        <label class="text-xs text-muted-foreground">手动输入编码</label>
        <div class="flex min-w-0 items-center gap-2">
          <InputText
            v-model="manual"
            placeholder="如 EQ-BR-F4-01 / EQ-XX-99-99"
            class="min-w-0 flex-1"
            @keydown.enter="useManual"
          />
          <Button label="生成" variant="outlined" class="shrink-0 whitespace-nowrap" @click="useManual">
            <IconScan class="h-3 w-3" />
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          输入一个台账里没有的编码试试：移动端档案页会明确回「这台设备没有登记」，不会打开别人的档案。
        </p>
      </div>

      <div class="space-y-1.5 text-xs text-muted-foreground">
        <p>· 二维码内容是当前页面地址下的 H5 档案直链，打印张贴到设备上即可现场扫码。</p>
        <p>· 档案页免登录、只读，编码不是凭证，所以扫码不需要账号（见路由 <code>meta.public</code>）。</p>
        <p>· 手机需与本机同网段；演示机上直接用右边这台"手机"看即可。</p>
      </div>
    </div>

    <!-- 右：手机外框里跑的是真 iframe（同 ../workorder/mobile 那台的画法，内容是真实路由） -->
    <div class="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div
        class="flex h-[720px] w-[380px] shrink-0 overflow-hidden rounded-[28px] border-[10px] border-zinc-800 bg-zinc-900 shadow-xl"
      >
        <iframe v-if="code" :src="h5ArchiveUrl(code)" :title="`设备档案 ${code}`" class="h-full w-full border-0" />
        <div v-else class="flex h-full w-full items-center justify-center text-body text-zinc-500">
          选择设备后这里就是扫码后的画面
        </div>
      </div>
      <span class="text-xs text-muted-foreground">左侧选中变更后，这台"手机"里就是现场扫码看到的同一页</span>
    </div>
  </div>
</template>
