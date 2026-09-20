import loadingHtml from "./loading.html?raw";

/** 全屏白底遮罩（移植自 hmx_web）：mount 前 show、mount 后 hide，2s 淡出后移除 */
export function useLoadingScreen() {
  let loadingEl: HTMLElement | null = null;

  // 显示 loading
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

  // 隐藏 loading
  function hide() {
    if (!loadingEl) return;

    requestAnimationFrame(() => {
      loadingEl!.style.opacity = "0";
      /* 淡出期间不再拦截鼠标（否则屏幕中央 2s 内点击落在遮罩上） */
      loadingEl!.style.pointerEvents = "none";
      loadingEl!.addEventListener(
        "transitionend",
        () => {
          loadingEl?.remove();
          loadingEl = null;
        },
        { once: true },
      );
    });
  }

  return { show, hide };
}
