import type { App, Plugin } from "vue";
import ToastEventBus from "primevue/toasteventbus";

/**
 * HMX 全局异常捕获插件：兜住三类漏网错误——Vue 组件渲染/生命周期错误、未处理的
 * Promise rejection、未捕获的同步脚本错误。策略是「console 全量留痕 + toast 克制提示」：
 *   - console 逐条记录（对象原样传，保留堆栈展开），排查信息零丢失；
 *   - toast 只弹给用户可读的一句（severity=error），同类错误 3s 去重、连环错误 1s 最多一条，
 *     避免组件崩溃级联刷屏；App.vue 根挂的 <Toast> 未挂载前（启动早期）emit 是 no-op，
 *     console 仍先兜底，故无需额外处理。
 * unhandledrejection 的 preventDefault 是刻意接管：原生输出与我们的 console 记录重复。
 */

/* window 级监听只注册一次：多应用实例重复 use 时不再叠加 */
let windowListenersRegistered = false;

/* 同一（标签+消息）3s 内只弹一次：崩溃常级联出多条同因错误 */
const DEDUP_MS = 3000;
/* 不同消息连环弹时的全局节流：1s 内最多一条 toast */
const GAP_MS = 1000;
const lastShown = new Map<string, number>();
let lastAnyAt = 0;

function summarize(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === "string") return err;
  return "";
}

function report(label: string, err: unknown) {
  const msg = summarize(err);
  const now = Date.now();
  const key = `${label}|${msg}`;
  const prev = lastShown.get(key);
  if ((prev === undefined || now - prev >= DEDUP_MS) && now - lastAnyAt >= GAP_MS) {
    lastShown.set(key, now);
    lastAnyAt = now;
    try {
      ToastEventBus.emit("add", {
        severity: "error",
        summary: label,
        detail: msg ? msg.slice(0, 160) : "详情见控制台",
        life: 5000,
      });
    } catch {
      /* 提示失败不影响错误处理本身 */
    }
  }
  // key 含错误消息、理论可无限增长；量级实际很小，超 50 条时顺手清掉超窗的
  if (lastShown.size > 50) {
    for (const [k, t] of lastShown) if (now - t >= DEDUP_MS) lastShown.delete(k);
  }
}

export const hmxErrorPlugin: Plugin = {
  install(app: App) {
    app.config.errorHandler = (err, instance, info) => {
      console.error("[Vue Error]", err, info, instance);
      report("页面异常", err);
    };
    if (windowListenersRegistered) return;
    windowListenersRegistered = true;
    // 未捕获的 Promise rejection（如 AG Grid 异步报错）
    window.addEventListener("unhandledrejection", (e) => {
      console.error("[UnhandledRejection]", e.reason);
      report("异步任务异常", e.reason);
      e.preventDefault();
    });
    // 未捕获的同步错误
    window.addEventListener("error", (e) => {
      console.error("[WindowError]", e.message, e.filename, e.lineno);
      report("脚本执行异常", e.message);
    });
  },
};
