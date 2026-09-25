import { getBody, getParams, ok, type RouteMap } from "../admin/core";
import type { PrintTemplateRow } from "@/api/mes4ddh/printReport";
import { ensureSeedPrintTemplates } from "@/pages/Widgets/XtraReportTemplateManager/printSeedTemplates";

/**
 * IPrintReportAppService mock：TS_PRINT_TEMPLATE 列表 localStorage 持久化。
 * cTemplateData 存模板 JSON 字符串（不兼容旧 XR byte[]）。
 * NTemplateType=2 → XtraReport 槽位；web 模板仍用 2，以 CDataType AQN 区分。
 */

const KEY = "hmx.print_templates.v1";
const P = "/hmx.Service.Widgets.Services/printReport";

function loadTemplates(): PrintTemplateRow[] {
  let rows: PrintTemplateRow[] = [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) rows = JSON.parse(raw) as PrintTemplateRow[];
  } catch {
    /* 回退种子 */
  }
  const seeded = ensureSeedPrintTemplates(rows);
  if (seeded !== rows) saveTemplates(seeded);
  return seeded;
}
function saveTemplates(rows: PrintTemplateRow[]): void {
  localStorage.setItem(KEY, JSON.stringify(rows));
}
function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export const printReportRoutes: RouteMap = {
  [`post ${P}/queryAllTemplates`]: (config) => {
    const { templateType } = getParams(config) as { templateType?: number };
    const t = Number(templateType ?? 2);
    return ok(config, loadTemplates().filter((x) => x.nTemplateType === t));
  },

  [`post ${P}/saveOrUpdateTemplate`]: (config) => {
    const body = getBody<{
      templateID?: string;
      printDTOType?: string;
      templateData?: string;
      templateType?: number;
      comments?: string;
    }>(config);
    const rows = loadTemplates();
    const ts = now();
    if (!body.templateID) {
      const row: PrintTemplateRow = {
        id: crypto.randomUUID().replace(/-/g, ""),
        cDataType: body.printDTOType ?? "",
        createTime: ts,
        lastModifyTime: ts,
        cComments: body.comments ?? "",
        nTemplateType: body.templateType ?? 2,
        cTemplateData: body.templateData ?? "",
        creator: "admin",
        lastModifier: "admin",
      };
      rows.unshift(row);
      saveTemplates(rows);
      return ok(config, row.id);
    }
    const hit = rows.find((r) => r.id === body.templateID);
    if (!hit) return ok(config, null);
    hit.lastModifyTime = ts;
    hit.lastModifier = "admin";
    hit.cDataType = body.printDTOType ?? hit.cDataType;
    hit.cTemplateData = body.templateData ?? hit.cTemplateData;
    if (body.comments != null) hit.cComments = body.comments;
    saveTemplates(rows);
    return ok(config, hit.id);
  },

  [`post ${P}/readFromTemplate`]: (config) => {
    const { templateId } = getParams(config) as { templateId?: string };
    const hit = loadTemplates().find((r) => r.id === templateId);
    if (!hit) return ok(config, null);
    return ok(config, {
      templateId: hit.id,
      printDTOType: hit.cDataType,
      templateData: hit.cTemplateData ?? "",
      templateType: hit.nTemplateType,
      comments: hit.cComments ?? "",
    });
  },

  [`post ${P}/removeTemplate`]: (config) => {
    const { templateId } = getParams(config) as { templateId?: string };
    const rows = loadTemplates();
    const next = rows.filter((r) => r.id !== templateId);
    saveTemplates(next);
    return ok(config, next.length < rows.length);
  },
};
