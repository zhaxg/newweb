/*
 * HMX Chrome 风格标签栏元素（vendored 自 qn-chrome-tabs@1.1.0，MIT）
 * https://github.com/qlynick/qn-chrome-tabs
 *
 * 本地改动：
 * - 移除分组、新建标签按钮、editAddress、图标/提示渲染钩子（HMX 壳层不使用）
 * - 修复原库 bug：关闭标签时把全部标签宽度固化为内联样式、且只在 pointerleave 才解除，
 *   导致 --chrome-tab-min/max-width 变量失效。现在关闭后由 CSS 自然回流，无需解除动画。
 * - 新增 widthMode：'fixed'（定宽，行为同原库）| 'content'（宽度随标题内容，超出容器横向滚动）
 */
import styles from "./hmxChromeTabs.css?inline";

export const HMX_CHROME_TABS_TAG = "hmx-chrome-tabs";

export const hmxChromeTabsEvents = {
  activate: "tab-activate",
  close: "tab-close",
  reorder: "tab-reorder",
  closeLeft: "tab-close-left",
  closeRight: "tab-close-right",
  closeOthers: "tab-close-others",
} as const;

export interface HmxChromeTabItem {
  id: string;
  title: string;
  backgroundColor?: string;
  /** 固定标签：无关闭按钮、不可关闭、不可拖拽，其他标签不得拖到其前面 */
  pinned?: boolean;
}

export interface HmxChromeTabEventDetail {
  tabId: string;
}

export interface HmxChromeTabReorderEventDetail {
  tabId: string;
  targetTabId: string;
  position: "before" | "after";
}

export type HmxChromeTabsLocale = "zh" | "en";
export type HmxChromeTabTooltipMode = "truncated" | "always" | "never";
export type HmxChromeTabsWidthMode = "fixed" | "content";

const messages = {
  zh: {
    close: "关闭",
    closeLeft: "关闭左侧所有",
    closeRight: "关闭右侧所有",
    closeOthers: "关闭其他所有",
    scrollLeft: "向左滚动标签",
    scrollRight: "向右滚动标签",
  },
  en: {
    close: "Close",
    closeLeft: "Close all to the left",
    closeRight: "Close all to the right",
    closeOthers: "Close other tabs",
    scrollLeft: "Scroll tabs left",
    scrollRight: "Scroll tabs right",
  },
} as const;

function browserLocale(): HmxChromeTabsLocale {
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "zh";
}

export class HmxChromeTabsElement extends HTMLElement {
  #tabs: HmxChromeTabItem[] = [];
  #activeTabId = "";
  #locale: HmxChromeTabsLocale = browserLocale();
  #tabTooltipMode: HmxChromeTabTooltipMode = "truncated";
  #tabsInitialized = false;
  #enteringTabIds = new Set<string>();
  readonly #viewport: HTMLElement;
  readonly #content: HTMLElement;
  readonly #scrollLeftButton: HTMLButtonElement;
  readonly #scrollRightButton: HTMLButtonElement;
  readonly #contextMenu: HTMLElement;
  readonly #tabPopover: HTMLElement;
  #popoverAnchor: HTMLElement | null = null;
  #popoverAlignRight = false;
  #popoverCloseTimer: number | undefined;
  readonly #repositionTabPopover = () => {
    this.#tabPopover.removeAttribute("data-moving");
    this.#positionTabPopover();
  };
  readonly #resizeObserver = new ResizeObserver(() => {
    this.#updateScrollControls();
  });
  readonly #closeMenuOnOutsideClick = (event: PointerEvent) => {
    if (!event.composedPath().includes(this.#contextMenu)) this.#contextMenu.hidden = true;
    if (!event.composedPath().includes(this.#tabPopover)) this.#closeTabPopover();
  };

  constructor() {
    super();
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${styles}</style><div class="tab-strip" part="strip"><div class="tab-navigation"><button class="tab-scroll-button" data-direction="left" part="scroll-left-button" type="button" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5"/></svg></button><div class="chrome-tabs" part="tab-list" role="tablist"><div class="chrome-tabs-content"></div></div><button class="tab-scroll-button" data-direction="right" part="scroll-right-button" type="button" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 7 5 5-5 5"/></svg></button></div></div><div class="tab-context-menu" part="context-menu" hidden></div><div class="tab-popover" part="tab-popover" hidden></div>`;
    this.#viewport = root.querySelector(".chrome-tabs")!;
    this.#content = root.querySelector(".chrome-tabs-content")!;
    this.#scrollLeftButton = root.querySelector('[data-direction="left"]')!;
    this.#scrollRightButton = root.querySelector('[data-direction="right"]')!;
    this.#contextMenu = root.querySelector(".tab-context-menu")!;
    this.#tabPopover = root.querySelector(".tab-popover")!;
    this.#tabPopover.addEventListener("pointerenter", () => this.#cancelPopoverClose());
    this.#tabPopover.addEventListener("pointerleave", () => this.#schedulePopoverClose());
    this.#viewport.addEventListener("scroll", () => {
      this.#updateScrollControls();
      this.#repositionTabPopover();
    });
    this.#viewport.addEventListener(
      "wheel",
      (event) => {
        if (this.#viewport.scrollWidth <= this.#viewport.clientWidth) return;
        event.preventDefault();
        this.#viewport.scrollLeft += Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      },
      { passive: false },
    );
    for (const button of [this.#scrollLeftButton, this.#scrollRightButton]) {
      const direction = button === this.#scrollLeftButton ? "left" : "right";
      button.setAttribute("aria-haspopup", "menu");
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("pointerenter", () => {
        this.#showOverflowTabs(button, direction);
      });
      button.addEventListener("pointerleave", () => this.#schedulePopoverClose());
      button.addEventListener("click", () => {
        const offsetDirection = direction === "left" ? -1 : 1;
        this.#closeTabPopover();
        this.#viewport.scrollBy({
          left: offsetDirection * Math.max(160, this.#viewport.clientWidth * 0.7),
          behavior: "smooth",
        });
      });
    }
  }

  connectedCallback() {
    document.addEventListener("pointerdown", this.#closeMenuOnOutsideClick);
    window.addEventListener("scroll", this.#repositionTabPopover, true);
    window.addEventListener("resize", this.#repositionTabPopover);
    this.#resizeObserver.observe(this.#viewport);
  }

  disconnectedCallback() {
    document.removeEventListener("pointerdown", this.#closeMenuOnOutsideClick);
    window.removeEventListener("scroll", this.#repositionTabPopover, true);
    window.removeEventListener("resize", this.#repositionTabPopover);
    this.#resizeObserver.disconnect();
    this.#cancelPopoverClose();
  }

  set tabs(value: HmxChromeTabItem[]) {
    if (this.#tabsInitialized) {
      const currentTabIds = new Set(this.#tabs.map((tab) => tab.id));
      for (const tab of value) {
        if (!currentTabIds.has(tab.id)) this.#enteringTabIds.add(tab.id);
      }
    }
    this.#tabsInitialized = true;
    this.#tabs = value;
    this.#render();
  }

  get tabs(): HmxChromeTabItem[] {
    return this.#tabs;
  }

  set activeTabId(value: string) {
    this.#activeTabId = value;
    this.#render();
  }

  get activeTabId(): string {
    return this.#activeTabId;
  }

  set locale(value: HmxChromeTabsLocale) {
    this.#locale = value in messages ? value : "zh";
    this.#render();
  }

  get locale(): HmxChromeTabsLocale {
    return this.#locale;
  }

  set tabTooltipMode(value: HmxChromeTabTooltipMode) {
    this.#tabTooltipMode = value === "always" || value === "never" ? value : "truncated";
    if (this.#tabTooltipMode === "never") this.#closeTabPopover();
  }

  get tabTooltipMode(): HmxChromeTabTooltipMode {
    return this.#tabTooltipMode;
  }

  set widthMode(value: HmxChromeTabsWidthMode) {
    if (value === "content") {
      this.setAttribute("data-width-mode", "content");
    } else {
      this.removeAttribute("data-width-mode");
    }
    this.#updateScrollControls();
  }

  get widthMode(): HmxChromeTabsWidthMode {
    return this.getAttribute("data-width-mode") === "content" ? "content" : "fixed";
  }

  #emit(name: string, detail?: HmxChromeTabEventDetail | HmxChromeTabReorderEventDetail) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }

  /** 关闭动画结束后 emit tab-close（关闭按钮 / 双击标签共用） */
  #requestCloseTab(element: HTMLElement, tabId: string) {
    if (element.hasAttribute("data-closing")) return;
    element.toggleAttribute("data-closing", true);
    let emitted = false;
    const finish = () => {
      if (emitted) return;
      emitted = true;
      this.#emit(hmxChromeTabsEvents.close, { tabId });
    };
    element.addEventListener("animationend", finish, { once: true });
    window.setTimeout(finish, 200);
  }

  #render() {
    this.#closeTabPopover();
    if (this.#tabs.length === 0) this.#viewport.scrollLeft = 0;
    const text = messages[this.#locale];
    this.#scrollLeftButton.setAttribute("aria-label", text.scrollLeft);
    this.#scrollRightButton.setAttribute("aria-label", text.scrollRight);
    const fragment = document.createDocumentFragment();

    for (const tab of this.#tabs) {
      const active = tab.id === this.#activeTabId;
      const element = document.createElement("div");
      element.className = "chrome-tab";
      element.setAttribute("part", active ? "tab active-tab" : "tab");
      element.dataset.tabId = tab.id;
      element.toggleAttribute("data-active", active);
      element.toggleAttribute("data-pinned", !!tab.pinned);
      element.setAttribute("role", "tab");
      element.setAttribute("aria-selected", String(active));
      /* 固定标签不可拖拽（保持在最前组） */
      element.draggable = !tab.pinned;
      if (this.#enteringTabIds.has(tab.id)) {
        element.toggleAttribute("data-entering", true);
        element.addEventListener(
          "animationend",
          () => {
            this.#enteringTabIds.delete(tab.id);
            element.removeAttribute("data-entering");
          },
          { once: true },
        );
      }
      if (active) {
        element.style.setProperty("--tab-background", tab.backgroundColor ?? "var(--chrome-tab-active-background)");
      }
      element.addEventListener("click", () => {
        this.#contextMenu.hidden = true;
        this.#emit(hmxChromeTabsEvents.activate, { tabId: tab.id });
      });
      /* 双击标签关闭（与关闭按钮同一收起动画；固定标签不可关） */
      element.addEventListener("dblclick", (event) => {
        event.preventDefault();
        if (tab.pinned) return;
        this.#requestCloseTab(element, tab.id);
      });
      element.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this.#showContextMenu(event, tab.id);
      });
      element.addEventListener("dragstart", (event) => {
        this.#contextMenu.hidden = true;
        event.dataTransfer?.setData("text/plain", tab.id);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
        element.toggleAttribute("data-dragging", true);
      });
      element.addEventListener("dragend", () => {
        element.removeAttribute("data-dragging");
        this.#clearDropIndicators();
      });
      element.addEventListener("dragover", (event) => {
        if (tab.pinned) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        const position =
          event.clientX < element.getBoundingClientRect().left + element.offsetWidth / 2 ? "before" : "after";
        this.#clearDropIndicators();
        element.dataset.dropPosition = position;
      });
      element.addEventListener("drop", (event) => {
        if (tab.pinned) return;
        event.preventDefault();
        const tabId = event.dataTransfer?.getData("text/plain");
        const position = element.dataset.dropPosition as "before" | "after" | undefined;
        this.#clearDropIndicators();
        if (!tabId || tabId === tab.id || !position) return;
        this.#emit(hmxChromeTabsEvents.reorder, { tabId, targetTabId: tab.id, position });
      });

      const dividers = document.createElement("div");
      dividers.className = "chrome-tab-dividers";

      const background = document.createElement("div");
      background.className = "chrome-tab-background";
      background.setAttribute("aria-hidden", "true");
      if (active) {
        background.style.backgroundColor = "var(--tab-background)";
        background.style.color = "var(--tab-background)";
      }

      const content = document.createElement("div");
      content.className = "chrome-tab-content";

      const title = document.createElement("span");
      title.className = "chrome-tab-title";
      title.setAttribute("part", "title");
      title.textContent = tab.title;
      element.addEventListener("pointerenter", () => {
        const shouldShow =
          this.#tabTooltipMode === "always" ||
          (this.#tabTooltipMode === "truncated" && title.scrollWidth > title.clientWidth);
        if (shouldShow) {
          this.#showTabTooltip(tab.title, element);
        } else {
          this.#closeTabPopover();
        }
      });
      element.addEventListener("pointerleave", () => this.#schedulePopoverClose());

      const close = document.createElement("button");
      close.type = "button";
      close.className = "chrome-tab-close";
      close.setAttribute("part", "close-button");
      close.setAttribute("aria-label", `${text.close} ${tab.title}`);
      close.addEventListener("dblclick", (event) => event.stopPropagation());
      close.addEventListener("click", (event) => {
        event.stopPropagation();
        this.#requestCloseTab(element, tab.id);
      });

      /* 固定标签不渲染关闭按钮（content 宽度模式下也不占位） */
      content.append(title);
      if (!tab.pinned) content.append(close);
      element.append(dividers, background, content);
      fragment.append(element);
    }

    this.#content.replaceChildren(fragment);
    requestAnimationFrame(() => {
      this.#updateScrollControls();
      this.#scrollActiveTabIntoView();
    });
  }

  #scrollActiveTabIntoView() {
    const active = this.#content.querySelector<HTMLElement>("[data-active]");
    if (!active) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    const radius = Number.parseFloat(getComputedStyle(this).getPropertyValue("--chrome-tab-radius"));
    const cornerSpace = Number.isFinite(radius) ? radius + 2 : 10;
    const leftControlSpace = this.#scrollLeftButton.hidden ? 0 : this.#scrollLeftButton.offsetWidth;
    const rightControlSpace = this.#scrollRightButton.hidden ? 0 : this.#scrollRightButton.offsetWidth;
    if (left - cornerSpace < this.#viewport.scrollLeft + leftControlSpace) {
      this.#viewport.scrollLeft = Math.max(0, left - cornerSpace - leftControlSpace);
    } else if (right + cornerSpace > this.#viewport.scrollLeft + this.#viewport.clientWidth - rightControlSpace) {
      this.#viewport.scrollLeft = right + cornerSpace + rightControlSpace - this.#viewport.clientWidth;
    }
  }

  #updateScrollControls() {
    const overflow = this.#viewport.scrollWidth > this.#viewport.clientWidth + 1;
    const maxScrollLeft = this.#viewport.scrollWidth - this.#viewport.clientWidth;
    this.#scrollLeftButton.hidden = !overflow || this.#viewport.scrollLeft <= 1;
    this.#scrollRightButton.hidden = !overflow || this.#viewport.scrollLeft >= maxScrollLeft - 1;
    this.#scrollLeftButton.disabled = false;
    this.#scrollRightButton.disabled = false;
  }

  #showOverflowTabs(anchor: HTMLButtonElement, direction: "left" | "right") {
    this.#cancelPopoverClose();
    const elements = new Map(
      [...this.#content.querySelectorAll<HTMLElement>(".chrome-tab")].map((element) => [
        element.dataset.tabId,
        element,
      ]),
    );
    const visibleLeft =
      this.#viewport.scrollLeft + (this.#scrollLeftButton.hidden ? 0 : this.#scrollLeftButton.offsetWidth);
    const visibleRight =
      this.#viewport.scrollLeft +
      this.#viewport.clientWidth -
      (this.#scrollRightButton.hidden ? 0 : this.#scrollRightButton.offsetWidth);
    const hiddenTabs = this.#tabs.filter((tab) => {
      const element = elements.get(tab.id);
      if (!element) return false;
      return direction === "left"
        ? element.offsetLeft < visibleLeft
        : element.offsetLeft + element.offsetWidth > visibleRight;
    });
    if (hiddenTabs.length === 0) {
      this.#closeTabPopover();
      return;
    }

    const list = document.createElement("div");
    list.className = "overflow-tab-list";
    list.setAttribute("role", "menu");
    for (const tab of hiddenTabs) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "overflow-tab-option";
      item.setAttribute("part", "overflow-tab-option");
      item.setAttribute("role", "menuitem");
      item.textContent = tab.title;
      item.addEventListener("click", () => {
        this.#closeTabPopover();
        this.#emit(hmxChromeTabsEvents.activate, { tabId: tab.id });
      });
      list.append(item);
    }

    this.#openTabPopover(anchor, list, "overflow", direction === "right");
    anchor.setAttribute("aria-expanded", "true");
  }

  #showTabTooltip(title: string, anchor: HTMLElement) {
    this.#cancelPopoverClose();
    const body = document.createElement("div");
    body.className = "tab-tooltip-content";
    body.textContent = title;
    this.#openTabPopover(anchor, body, "tooltip");
  }

  #openTabPopover(anchor: HTMLElement, content: Node, kind: "overflow" | "tooltip", alignRight = false) {
    const animatePosition =
      !this.#tabPopover.hidden && this.#tabPopover.dataset.kind === "tooltip" && kind === "tooltip";
    this.#tabPopover.removeAttribute("data-moving");
    if (this.#popoverAnchor instanceof HTMLButtonElement) {
      this.#popoverAnchor.setAttribute("aria-expanded", "false");
    }
    this.#popoverAnchor = anchor;
    this.#popoverAlignRight = alignRight;
    this.#tabPopover.dataset.kind = kind;
    this.#tabPopover.setAttribute("role", kind === "tooltip" ? "tooltip" : "presentation");
    this.#tabPopover.replaceChildren(content);
    this.#tabPopover.hidden = false;
    if (animatePosition) {
      void this.#tabPopover.offsetLeft;
      this.#tabPopover.toggleAttribute("data-moving", true);
    }
    this.#positionTabPopover();
  }

  #positionTabPopover() {
    const anchor = this.#popoverAnchor;
    if (!anchor || this.#tabPopover.hidden) return;
    if (!anchor.isConnected) {
      this.#closeTabPopover();
      return;
    }
    const anchorRect = anchor.getBoundingClientRect();
    const width = this.#tabPopover.offsetWidth;
    const height = this.#tabPopover.offsetHeight;
    const left = this.#popoverAlignRight ? anchorRect.right - width : anchorRect.left;
    this.#tabPopover.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
    const below = anchorRect.bottom + 6;
    this.#tabPopover.style.top = `${below + height <= window.innerHeight - 8 ? below : Math.max(8, anchorRect.top - height - 6)}px`;
  }

  #schedulePopoverClose() {
    this.#cancelPopoverClose();
    this.#popoverCloseTimer = window.setTimeout(() => {
      this.#closeTabPopover();
    }, 120);
  }

  #cancelPopoverClose() {
    if (this.#popoverCloseTimer === undefined) return;
    window.clearTimeout(this.#popoverCloseTimer);
    this.#popoverCloseTimer = undefined;
  }

  #closeTabPopover() {
    this.#cancelPopoverClose();
    if (this.#popoverAnchor instanceof HTMLButtonElement) {
      this.#popoverAnchor.setAttribute("aria-expanded", "false");
    }
    this.#popoverAnchor = null;
    this.#tabPopover.removeAttribute("data-moving");
    this.#tabPopover.hidden = true;
    this.#tabPopover.replaceChildren();
  }

  #clearDropIndicators() {
    for (const tab of this.#content.querySelectorAll(".chrome-tab")) {
      tab.removeAttribute("data-drop-position");
    }
  }

  #showContextMenu(event: MouseEvent, tabId: string) {
    /* 固定标签：菜单均为关闭操作，直接不弹 */
    if (this.#tabs.find((t) => t.id === tabId)?.pinned) return;
    this.#contextMenu.hidden = true;
    this.#closeTabPopover();
    const text = messages[this.#locale];
    const fragment = document.createDocumentFragment();
    /* 仅保留 关闭 / 关闭其他所有，无分割线 */
    for (const [label, eventName] of [
      [text.close, hmxChromeTabsEvents.close],
      [text.closeOthers, hmxChromeTabsEvents.closeOthers],
    ] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", () => {
        this.#contextMenu.hidden = true;
        this.#emit(eventName, { tabId });
      });
      fragment.append(button);
    }
    this.#contextMenu.replaceChildren(fragment);
    this.#contextMenu.style.left = `${Math.min(event.clientX, window.innerWidth - 176)}px`;
    this.#contextMenu.style.top = `${Math.min(event.clientY, window.innerHeight - 150)}px`;
    this.#contextMenu.hidden = false;
  }
}

if (!customElements.get(HMX_CHROME_TABS_TAG)) {
  customElements.define(HMX_CHROME_TABS_TAG, HmxChromeTabsElement);
}

declare global {
  interface HTMLElementTagNameMap {
    [HMX_CHROME_TABS_TAG]: HmxChromeTabsElement;
  }
}
