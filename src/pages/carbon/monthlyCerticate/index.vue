<script setup lang="ts">
/**
 * 对应线上「月度存证」（https://carbon-ui.rcisyn.com/jnpf_app_carbonAssets/carbonReport/monthlyCerticate）
 *
 * **这是「站内特殊布局页 → 直接复刻原版 HTML」的那一类**（2026-09-26 约定），
 * 所以它**不套 ListPage / 不用 ag-Grid**：原版是「年份切换 + 12 张月份卡片」的年历布局，
 * 硬塞进列表页骨架只会把它毁掉。DOM 层级、class 名与 CSS 均照线上原样抄
 * （`.header-section` / `.month-cards-grid` / `.month-card` / `.report-info` … 是线上的原名）。
 *
 * 数据：GET /business/business/monthlyEvidence/yearStatus → 12 行（month/status/fillTime/fillPeople/hasHistory）。
 * status 的含义由线上显示反推：**0=可填报**（1–7、9 月）、**1=已填报**（8 月，带填报时间与查看/编辑）、
 * **2=未来月份**（10–12 月，按钮禁用）。
 *
 * ── 与线上/平台规则的偏差（都是有意的，验收时按这里对照）──
 * 1. **字号用原版 px 写在 `<style scoped>` 里**（月标签 26px、提示语 18px、信息行 14px），
 *    没有用本仓库的四档字阶类。原因是这页按约定就是「复刻原版」，字阶是全站列表页的纪律，
 *    套到复刻页上会立刻走形。代价：这一页不受 `text-xs/body/sm/base` 约束，是唯一的例外。
 * 2. **原版的两张背景图**（`/png/calendar-*.png` 日历图标、`/png/calendarBg-*.png` 头部底纹）
 *    没有引用——那在对方域名上，热链既不稳定也拿不到文件。改用 Tabler `IconCalendar` +
 *    同色系渐变代替，形状/配色对齐，图片本身不复刻。
 * 3. 按钮文案按本仓库风格写成「填报/查看/编辑」，线上渲染的是「填 报」（antd 中文按钮自动加空格）。
 * 4. 「填报」「查看」「编辑」「历史数据」都是插桩：线上各自有一套存证表单流程，本次不实现。
 */
import { onMounted, ref } from "vue";
import Button from "primevue/button";
import { IconCalendar } from "@tabler/icons-vue";
import { carbonQuery } from "@/api/carbon/queries";
import { useToast } from "@/composables/useToast";

interface MonthRow {
  month: number;
  /** 0=可填报 1=已填报 2=未来月份（禁用） */
  status: number;
  fillTime?: string | null;
  fillPeople?: string | null;
  hasHistory?: boolean | null;
}

const { toast } = useToast();
const year = ref<number>(new Date().getFullYear());
const rows = ref<MonthRow[]>([]);

async function load() {
  try {
    const res = await carbonQuery("/business/monthlyEvidence/yearStatus", "get", { year: String(year.value) })();
    rows.value = (res.rows ?? []) as MonthRow[];
  } catch {
    /* 拦截层已 toast */
  }
}

onMounted(load);

function shift(delta: number) {
  year.value += delta;
  void load();
}

function rowOf(m: number): MonthRow | undefined {
  return rows.value.find((r) => r.month === m);
}

function stub(label: string) {
  toast(`${label}待接入`, 2000, "warn");
}
</script>

<template>
  <div class="mc-root">
    <!-- 头部：日历图标 + 年份左右切换 + 提示语（照线上 header-section 结构） -->
    <div class="header-section">
      <div class="calendarLeft">
        <IconCalendar class="calendar-icon" />
        <div class="calendarFont">
          <span class="handle" @click="shift(-1)">&lt;</span>
          <span class="year">{{ year }}</span>
          <span class="handle" @click="shift(1)">&gt;</span>
        </div>
      </div>
      <div class="calendarRight">请您依据行业指南要求，按时完成月度信息化</div>
    </div>

    <!-- 12 张月份卡片：4 列网格，照线上 month-cards-grid -->
    <div class="month-cards-grid">
      <div v-for="m in 12" :key="m" class="month-card">
        <span v-if="rowOf(m)?.hasHistory" class="history-link" @click="stub('历史数据')">历史数据 &gt;</span>

        <div class="monthLabel">{{ m }}月</div>

        <!-- 未填报：中间一个按钮；status=2（未来月份）禁用 -->
        <div v-if="rowOf(m)?.status !== 1" class="unreported-content">
          <Button label="填报" :disabled="rowOf(m)?.status === 2" class="w-24" @click="stub('填报')" />
        </div>

        <!-- 已填报：填报信息 + 查看/编辑 -->
        <template v-else>
          <div class="report-info">
            <div class="info-item">
              <span class="label">填报时间:</span>
              <span class="value">{{ rowOf(m)?.fillTime ?? "-" }}</span>
            </div>
            <div class="info-item">
              <span class="label">填报人:</span>
              <span class="value">{{ rowOf(m)?.fillPeople ?? "-" }}</span>
            </div>
          </div>
          <div class="action-buttons">
            <Button label="查看" variant="outlined" @click="stub('查看')" />
            <Button label="编辑" @click="stub('编辑')" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── 以下规则抄自线上 .header-section / .month-cards-grid 一族（px 原样保留，见文件头偏差说明 1）── */
.mc-root {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
}

.header-section {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 14px;
  border-radius: 8px;
  /* 原版是 /png/calendarBg-*.png 满铺底纹；改同色系渐变，见文件头偏差说明 2 */
  background-image: linear-gradient(90deg, rgba(50, 182, 139, 0.22), rgba(50, 182, 139, 0.05));
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.calendarLeft {
  display: flex;
  align-items: center;
  padding: 10px 30px;
  border-radius: 8px;
  background: #fff;
}

.calendar-icon {
  width: 3.175rem;
  height: 3.19rem;
  color: rgb(50, 182, 139);
}

.calendarFont {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 1.2rem;
  color: rgb(50, 182, 139);
  font-size: 1.9375rem;
  white-space: nowrap;
}

.calendarFont .handle {
  cursor: pointer;
  padding: 0 10px;
  font-weight: 600;
}

.calendarFont .year {
  font-weight: 600;
}

.calendarRight {
  padding-left: 380px;
  color: rgb(50, 182, 139);
  font-size: 18px;
  font-weight: 600;
  line-height: 18px;
}

.month-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  padding: 20px;
  border-radius: 20px;
  background: #fff;
}

.month-card {
  position: relative;
  display: flex;
  min-height: 200px;
  flex-direction: column;
  justify-content: space-between;
  padding: 14px 20px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: rgba(50, 182, 139, 0.1);
  box-shadow: rgba(0, 0, 0, 0.1) 0 2px 4px;
}

.month-card:hover {
  border: 2px solid rgb(50, 182, 139);
  box-shadow: rgba(27, 169, 197, 0.24) 0 6px 24px;
}

.monthLabel {
  color: #333;
  font-size: 26px;
  font-weight: 600;
  line-height: 37px;
  text-align: center;
}

.unreported-content {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  margin-top: 96px;
}

.report-info {
  margin-top: 20px;
  margin-bottom: 15px;
  padding-left: 16%;
}

.info-item {
  margin-bottom: 8px;
  font-size: 14px;
}

.info-item .label {
  margin-right: 8px;
  color: rgb(96, 98, 102);
}

.info-item .value {
  color: rgb(96, 98, 102);
}

.action-buttons {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-top: auto;
}

.history-link {
  position: absolute;
  top: 20px;
  right: 20px;
  color: rgb(50, 182, 139);
  font-size: 14px;
  cursor: pointer;
}

.history-link:hover {
  text-decoration: underline;
}
</style>
