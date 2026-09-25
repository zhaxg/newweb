import loadingHtml from "./loading.html?raw";

/** 遮罩整体退场时长。原为 2s：淡出起点是 afterEach——导航已落地、页面已可交互之后，
 *  等于加载完成后又让用户对着一层白幕等 2s（实测感知加载 ~1.5s → ~3.7s，翻了一倍多）。
 *  降到 1s：品牌启动页的观感保留，拖沓去掉。 */
const FADE_MS = 1000;

/* 自动化测试提速开关：全局置 window.HMX_DISABLE_LOADING = true 时，遮罩完全不创建。
   只影响这个纯视觉过渡——遮罩不承载任何权限/数据语义，跳过它不改变任何业务行为；
   换来的是测试免去每次导航等淡出（首屏那一次尤其明显）。
   测试侧在首屏脚本前注入（Playwright 的 addInitScript / evaluate），生产无人设置即行为不变。
   为什么不挂 import.meta.env.DEV：那样就没法对生产构建产物做同样的提速验证，
   而这里的代价只是首次导航时一次属性读取。
   命名不用 __ 前后缀：本仓 oxlint 未配 no-underscore-dangle 白名单，双下划线会新增一条 warning，
   而框架层的 warning 计数是这里的健康指标（见 AGENTS §3）。HMX 前缀已足够避让冲突。 */
function disabledByFlag(): boolean {
  return (globalThis as { HMX_DISABLE_LOADING?: boolean }).HMX_DISABLE_LOADING === true;
}

/** 系统级「减少动态效果」：遮罩不做淡出，直接移除。
 *  仓库在 MainLayout / FlowBg / chromeTabs / ThemeToggle 四处都做了同样处理，此处补齐
 *  （此前遗漏，开该选项的用户照样吃 3 条无限滑动渐变 + 整段淡出）。 */
function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* 全屏白底遮罩（移植自 hmx_web）：由路由守卫首个 beforeEach 显示（覆盖刷新时拉菜单/
   注册路由等异步空白），首次导航完成 afterEach 淡出移除。
   路由级豁免：RouteMeta.loading === false 的页面不启用——遮罩本为白底，导航落地时按
   immediate 无动画直除，观感与从未显示一致。模块级单例，守卫与入口共用。 */
function createLoadingScreen() {
  let loadingEl: HTMLElement | null = null;

  function show() {
    if (loadingEl || disabledByFlag()) return;

    loadingEl = document.createElement("div");
    loadingEl.style.position = "fixed";
    loadingEl.style.top = "0";
    loadingEl.style.left = "0";
    loadingEl.style.width = "100%";
    loadingEl.style.height = "100%";
    loadingEl.style.zIndex = "9999";
    loadingEl.style.backgroundColor = "white";
    loadingEl.style.display = "flex";
    loadingEl.style.alignItems = "center";
    loadingEl.style.justifyContent = "center";
    loadingEl.style.transition = `opacity ${FADE_MS}ms`;
    loadingEl.style.opacity = "1";

    loadingEl.innerHTML = loadingHtml;
    document.body.appendChild(loadingEl);
  }

  function hide(options?: { immediate?: boolean }) {
    if (!loadingEl) return;
    const el = loadingEl;
    loadingEl = null;
    if (options?.immediate || prefersReducedMotion()) {
      el.remove();
      return;
    }
    requestAnimationFrame(() => {
      el.style.opacity = "0";
      /* 淡出期间不再拦截鼠标（否则屏幕中央的点击落在遮罩上） */
      el.style.pointerEvents = "none";
      /* 移除不能只认 transitionend：过渡被打断、或标签页在后台时它可能不触发，
         遮罩就永久留在 DOM 里（opacity 0 + pointer-events none 虽不挡事，但 z-index 9999
         的节点不该常驻）。配兜底定时器，两条路径都幂等——remove() 可重复调用。 */
      let timer = 0;
      const done = () => {
        clearTimeout(timer);
        el.remove();
      };
      el.addEventListener("transitionend", done, { once: true });
      timer = window.setTimeout(done, FADE_MS + 300);
    });
  }

  return { show, hide };
}

export const loadingScreen = createLoadingScreen();
