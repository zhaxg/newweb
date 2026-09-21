import loadingHtml from "./loading.html?raw";

/* 全屏白底遮罩（移植自 hmx_web）：由路由守卫首个 beforeEach 显示（覆盖刷新时拉菜单/
   注册路由等异步空白），首次导航完成 afterEach 淡出移除。
   路由级豁免：RouteMeta.loading === false 的页面不启用——遮罩本为白底，导航落地时按
   immediate 无动画直除，观感与从未显示一致。模块级单例，守卫与入口共用。 */
function createLoadingScreen() {
  let loadingEl: HTMLElement | null = null;

  function show() {
    if (loadingEl) return;

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
    loadingEl.style.transition = "opacity 2s";
    loadingEl.style.opacity = "1";

    loadingEl.innerHTML = loadingHtml;
    document.body.appendChild(loadingEl);
  }

  function hide(options?: { immediate?: boolean }) {
    if (!loadingEl) return;
    const el = loadingEl;
    loadingEl = null;
    if (options?.immediate) {
      el.remove();
      return;
    }
    requestAnimationFrame(() => {
      el.style.opacity = "0";
      /* 淡出期间不再拦截鼠标（否则屏幕中央 2s 内点击落在遮罩上） */
      el.style.pointerEvents = "none";
      el.addEventListener(
        "transitionend",
        () => {
          el.remove();
        },
        { once: true },
      );
    });
  }

  return { show, hide };
}

export const loadingScreen = createLoadingScreen();
