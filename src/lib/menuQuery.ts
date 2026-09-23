import { useRoute } from "vue-router";

/**
 * 菜单资源 cQueryString（RouteMeta.qs）：同窗体多菜单的运行参数。
 * raw = 原串；parts = 逗号分段（非 JSON 时）；json = JSON 对象串解析结果（其余为 {}）。
 */
export function useMenuQuery(): { raw: string; parts: string[]; json: Record<string, unknown> } {
  const raw = String(useRoute().meta.qs ?? "");
  const parts = raw && !raw.startsWith("{") ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
  let json: Record<string, unknown> = {};
  if (raw.startsWith("{")) {
    try {
      json = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      /* 坏 JSON 按空处理 */
    }
  }
  return { raw, parts, json };
}
