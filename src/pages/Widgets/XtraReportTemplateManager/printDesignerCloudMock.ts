/**
 * vue-print-designer 云端模板 CRUD mock（setCrudMode("remote") + setCrudEndpoints.fetcher）。
 * 默认端点 /api/print/templates 与 /api/print/custom-elements 由原生 fetch 发出，
 * 不经 axios/mockAdapter；这里用 fetcher 在进程内实现，读写与 printReport 相同的
 * localStorage（hmx.print_templates.v1），列表项附带 ext.availableVariables 供设计器字段树。
 */
import {
  PRINT_SCHEMAS,
  buildAvailableVariables,
  findPrintSchema,
} from "./printSchemas";
import { ensureSeedPrintTemplates } from "./printSeedTemplates";
import type { PrintTemplateRow } from "@/api/widgets/printReport";

const KEY = "hmx.print_templates.v1";

/** 弹窗打开时记录当前 schema，设计器「另存/新建」缺 AQN 时用 */
let activeSchemaAqn = "";

export function setPrintDesignerActiveSchema(aqn: string): void {
  activeSchemaAqn = aqn;
}

function loadRows(): PrintTemplateRow[] {
  let rows: PrintTemplateRow[] = [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) rows = JSON.parse(raw) as PrintTemplateRow[];
  } catch {
    /* ignore */
  }
  const seeded = ensureSeedPrintTemplates(rows);
  if (seeded !== rows) {
    try {
      localStorage.setItem(KEY, JSON.stringify(seeded));
    } catch {
      /* ignore */
    }
  }
  return seeded;
}

function saveRows(rows: PrintTemplateRow[]): void {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function parseJson<T>(text: string | undefined | null, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function designerName(row: PrintTemplateRow): string {
  const schema = findPrintSchema(row.cDataType);
  return row.cComments || schema?.title || row.id;
}

function toDesignerTemplate(row: PrintTemplateRow, includeData: boolean): Record<string, unknown> {
  const schema = findPrintSchema(row.cDataType);
  const data = parseJson<Record<string, any> | null>(row.cTemplateData, null);
  const tree = schema ? buildAvailableVariables(schema) : [];
  const prevExt =
    data && typeof data === "object" && data.ext && typeof data.ext === "object" ? data.ext : {};
  const ext = { ...prevExt, availableVariables: tree };
  const updatedAt = Date.parse(String(row.lastModifyTime ?? "").replace(" ", "T")) || Date.now();
  const base: Record<string, unknown> = {
    id: row.id,
    name: designerName(row),
    updatedAt,
    ext,
  };
  if (includeData) {
    base.data = {
      ...(data && typeof data === "object" ? data : {}),
      ext,
      ...(schema ? { testData: data?.testData ?? {} } : {}),
    };
  }
  return base;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** 供 setCrudEndpoints({ fetcher }) 使用 */
export async function printDesignerCloudFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const rawUrl =
    typeof input === "string" ? input : input instanceof URL ? input.href : String(input);
  const path = rawUrl.replace(/^https?:\/\/[^/]+/i, "").split("?")[0] || rawUrl;
  const method = String(init?.method ?? "GET").toUpperCase();
  let body: Record<string, any> | null = null;
  if (init?.body != null) {
    try {
      body = JSON.parse(String(init.body));
    } catch {
      body = null;
    }
  }

  /* 自定义元素：空库，避免设计器初始化报错 */
  if (path.startsWith("/api/print/custom-elements")) {
    if (method === "GET") return jsonResponse([]);
    if (method === "DELETE") return jsonResponse({ ok: true });
    if (method === "POST" || method === "PUT") return jsonResponse({ id: body?.id ?? "ce-1" });
  }

  /* 模板列表 */
  if (path === "/api/print/templates" && method === "GET") {
    const list = loadRows().map((r) => toDesignerTemplate(r, true));
    return jsonResponse(list);
  }

  /* 单条：/api/print/templates/{id} */
  const one = path.match(/^\/api\/print\/templates\/([^/]+)$/);
  if (one) {
    const id = decodeURIComponent(one[1]);
    const rows = loadRows();
    const hit = rows.find((r) => r.id === id);
    if (method === "GET") {
      if (!hit) return jsonResponse({ error: "not found" }, 404);
      return jsonResponse({ template: toDesignerTemplate(hit, true) });
    }
    if (method === "DELETE") {
      saveRows(rows.filter((r) => r.id !== id));
      return jsonResponse({ ok: true });
    }
  }

  /* 新建/更新：POST /api/print/templates —— payload: { id, name, data, ext } */
  if (path === "/api/print/templates" && (method === "POST" || method === "PUT")) {
    const rows = loadRows();
    const data = body?.data && typeof body.data === "object" ? (body.data as Record<string, any>) : {};
    const name = String(body?.name ?? "未命名模板");
    const id = String(body?.id ?? "");
    const existing = id ? rows.find((r) => r.id === id) : undefined;
    const dataType =
      existing?.cDataType ||
      String(body?.printDTOType ?? body?.cDataType ?? "") ||
      activeSchemaAqn ||
      PRINT_SCHEMAS[0].aqn;
    const schema = findPrintSchema(dataType);
    const tree = schema ? buildAvailableVariables(schema) : [];
    const designerExt = body?.ext && typeof body.ext === "object" ? (body.ext as Record<string, unknown>) : {};
    const nextData = {
      ...data,
      ext: {
        ...designerExt,
        ...(data.ext && typeof data.ext === "object" ? data.ext : {}),
        availableVariables: tree,
      },
    };
    const ts = nowStamp();
    if (existing) {
      existing.lastModifyTime = ts;
      existing.lastModifier = "admin";
      existing.cDataType = dataType;
      existing.cTemplateData = JSON.stringify(nextData);
      existing.cComments = name;
      saveRows(rows);
      return jsonResponse({ id: existing.id, name, updatedAt: Date.now(), ext: nextData.ext });
    }
    const newRow: PrintTemplateRow = {
      id: id || crypto.randomUUID().replace(/-/g, ""),
      cDataType: dataType,
      createTime: ts,
      lastModifyTime: ts,
      cComments: name,
      nTemplateType: 2,
      cTemplateData: JSON.stringify(nextData),
      creator: "admin",
      lastModifier: "admin",
    };
    rows.unshift(newRow);
    saveRows(rows);
    return jsonResponse({ id: newRow.id, name, updatedAt: Date.now(), ext: nextData.ext });
  }

  return jsonResponse({ error: `mock 未实现: ${method} ${path}` }, 404);
}
