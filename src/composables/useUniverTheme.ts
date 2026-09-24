/** Univer 暗黑模式全局同步：跟随 useAppTheme 的 isDark，对所有存活 Univer 实例切主题。
 *  页面挂载 Univer 后 attachUniverTheme(univerAPI)，卸载时 detachUniverTheme；
 *  主题切换由本模块的 watch 统一驱动，页面不各自处理。
 *  主题包动态 import：Univer 是按需加载的，不把 @univerjs/themes 带进首屏 bundle。
 *
 *  ⚠ 暗色只走「换色板」这一条路，不要叠加 toggleDarkMode(true)：
 *    · darkBlueTheme 是自洽的暗色板（gray-0 #07111F / gray-900 #F5F6F7，整套灰度反转），
 *      换上去之后 chrome 的基础类（bg-gray-0 / text-gray-900）自然就是暗底亮字；
 *    · toggleDarkMode(true) 是另一套独立机制：给 <html> 挂 .univer-dark，
 *      让 dark: 变体生效 —— 而那些变体取的是 gray-700/800/900，
 *      在 darkBlueTheme 下恰好是浅色，会把工具栏/页签又翻回亮色（拼色）；
 *      同时 engine-render 的 CanvasColorService 会把画布上每个 fillStyle/strokeStyle
 *      做反色矩阵，与已经反转过的色板二次叠加。
 *    两者同开 = 画布被反色、chrome 一半深一半浅，即「文字变色了、其他没变」。
 *    故这里显式 toggleDarkMode(false)：保留画布真实颜色（库位图的区域配色不能被反色）。 */
import { watch } from "vue";
import { isDark } from "@/composables/useAppTheme";

const instances = new Set<any>();
let applying = false;

async function applyAll() {
  if (applying || !instances.size) return;
  applying = true;
  try {
    const { defaultTheme, darkBlueTheme } = await import("@univerjs/themes");
    const theme = isDark.value ? darkBlueTheme : defaultTheme;
    for (const api of instances) {
      try {
        api.setTheme(theme);
        api.toggleDarkMode(false);
      } catch {
        /* 实例已销毁：移除，等页面 dispose 时再 detach 也不影响 */
        instances.delete(api);
      }
    }
  } catch {
    /* 主题包加载失败：保持 Univer 自带亮色，不阻断页面 */
  } finally {
    applying = false;
  }
}

/* 模块级 watch（无组件作用域）：isDark 翻转 → 全部存活实例同步切主题 */
watch(isDark, () => void applyAll());

export function attachUniverTheme(univerApi: any): void {
  if (!univerApi) return;
  instances.add(univerApi);
  /* 新实例按当前主题初始化（createUniver 默认亮色） */
  void applyAll();
}

export function detachUniverTheme(univerApi: any): void {
  instances.delete(univerApi);
}
