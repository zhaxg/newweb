import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import Aura from "@primeuix/themes/aura";
import { definePreset } from "@primeuix/themes";
import type { App } from "vue";

/* PrimeVue v4 中文 locale（日期周一起始、中文星期月份、常用按钮/提示文案）。
   组件自身文案（placeholder/emptyMessage 等）仍优先在页面显式传中文。 */
const zhCN = {
  startsWith: "开头是",
  contains: "包含",
  notContains: "不包含",
  endsWith: "结尾是",
  equals: "等于",
  notEquals: "不等于",
  noFilter: "无过滤",
  lt: "小于",
  lte: "小于等于",
  gt: "大于",
  gte: "大于等于",
  dateIs: "日期是",
  dateIsNot: "日期不是",
  dateBefore: "日期早于",
  dateAfter: "日期晚于",
  clear: "清除",
  apply: "应用",
  matchAll: "匹配全部",
  matchAny: "匹配任意",
  addRule: "添加规则",
  removeRule: "移除规则",
  accept: "确定",
  reject: "取消",
  choose: "选择",
  upload: "上传",
  cancel: "取消",
  completed: "已完成",
  pending: "进行中",
  fileSizeTypes: ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"],
  dayNames: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"],
  dayNamesShort: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
  dayNamesMin: ["日", "一", "二", "三", "四", "五", "六"],
  monthNames: ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"],
  monthNamesShort: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  chooseYear: "选择年份",
  chooseMonth: "选择月份",
  chooseDate: "选择日期",
  prevDecade: "上一个十年",
  nextDecade: "下一个十年",
  prevYear: "上一年",
  nextYear: "下一年",
  prevMonth: "上个月",
  nextMonth: "下个月",
  prevHour: "上一小时",
  nextHour: "下一小时",
  prevMinute: "上一分钟",
  nextMinute: "下一分钟",
  prevSecond: "上一秒",
  nextSecond: "下一秒",
  am: "上午",
  pm: "下午",
  today: "今天",
  weekHeader: "周",
  firstDayOfWeek: 1,
  showMonthAfterYear: true,
  dateFormat: "yy/mm/dd",
  weak: "弱",
  medium: "中",
  strong: "强",
  passwordPrompt: "请输入密码",
  emptyFilterMessage: "无匹配结果",
  searchMessage: "有 {0} 个结果",
  selectionMessage: "已选择 {0} 项",
  emptySelectionMessage: "未选择任何项",
  emptySearchMessage: "未找到结果",
  emptyMessage: "无可用选项",
  fileChosenMessage: "已选择 {0} 个文件",
  noFileChosenMessage: "未选择文件",
};

/* HMX 紧凑预设（主题层定义，非 CSS 覆盖）：
   - semantic.typography.fontSize → formField/list/navigation/日期面板 全链路 12px
   - semantic.iconSize → 全局 .p-icon/.pi（下拉箭头、关闭、日历导航等）12px
   - formField 内边距 → 控件高约 28px（12px×1.5 行高 + 上下 4px + 边框 2px）
   - 圆角统一 4px，与项目 token 体系一致
   注意：overlay.modal.padding 会被 dialog.content 以四值插值引用，保持单值。 */
const HmxCompact = definePreset(Aura, {
  semantic: {
    typography: { fontSize: "12px" },
    iconSize: "12px",
    anchorGutter: "0px",
    disabledOpacity: "0.55",
    /* 品牌主色 #0052D9：仅替换 Aura 默认 emerald 色阶（500 = 主色），
       color/hover/active/contrast 等派生键由深合并保留，明暗两套自动切换 */
    primary: {
      50: "#eaf0fd",
      100: "#cdddf8",
      200: "#9fbdf1",
      300: "#6b97e7",
      400: "#3a73da",
      500: "#0052d9",
      600: "#0047bc",
      700: "#003c9e",
      800: "#003181",
      900: "#002663",
      950: "#001a45",
    },
    formField: {
      paddingX: "8px",
      paddingY: "4px",
      borderRadius: "4px",
      sm: { paddingX: "6px", paddingY: "2px" },
      lg: { paddingX: "10px", paddingY: "6px" },
    },
    content: { borderRadius: "4px" },
    list: { option: { padding: "3px 8px" }, header: { padding: "0.375rem 0.625rem 0.125rem" } },
    navigation: { item: { padding: "4px 10px", gap: "0.375rem" } },
    overlay: {
      select: { borderRadius: "4px" },
      popover: { borderRadius: "4px", padding: "0.5rem" },
      modal: { borderRadius: "4px", padding: "0.875rem" },
    },
  },
  components: {
    button: { root: { gap: "0.375rem", iconOnlyWidth: "28px" } },
    dialog: {
      header: { padding: "0.625rem 1rem" },
      title: { fontSize: "13px" },
      content: { padding: "0.75rem 1rem 1rem" },
      footer: { padding: "0.625rem 1rem" },
    },
    datepicker: {
      header: { padding: "0 0 0.375rem" },
      title: { gap: "0.25rem" },
      date: { width: "24px", height: "24px" },
      dropdown: { width: "28px" },
    },
    select: { dropdown: { width: "24px" } },
    treeselect: { dropdown: { width: "24px" } },
    multiselect: { dropdown: { width: "24px" } },
    checkbox: { root: { width: "14px", height: "14px" }, icon: { size: "9px" } },
    toggleswitch: { root: { width: "2rem", height: "1.25rem", gap: "0.125rem" }, handle: { size: "0.75rem" } },
    inputgroup: { addon: { minWidth: "1.75rem", padding: "0 0.375rem" } },
    tree: { node: { padding: "2px 8px" } },
  },
});

export function installPrimeVue(app: App) {
  app.use(PrimeVue, {
    locale: zhCN,
    ripple: false,
    theme: {
      preset: HmxCompact,
      options: {
        prefix: "p",
        darkModeSelector: ".dark",
        cssLayer: false,
      },
    },
  });
  app.use(ToastService);
}