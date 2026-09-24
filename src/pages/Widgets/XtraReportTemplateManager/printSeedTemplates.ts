/**
 * 预置基础打印模板（画布 JSON）：
 * - 文本绑定 {#path} / @path（与设计器 extractVariable 一致）
 * - 表格 variable=@list，columns 与 schema lists 对齐
 * - ext.availableVariables 由 printSchemas.buildAvailableVariables 注入
 * 仅在 mock 列表为空时播种，便于开箱验证变量绑定与样例打印。
 */
import {
  PRINT_SCHEMAS,
  buildAvailableVariables,
  buildSamplePayload,
  findPrintSchema,
  type PrintSchema,
} from "./printSchemas";
import type { PrintTemplateRow } from "@/api/widgets/printReport";

const SEED_KEY = "hmx.print_templates_seeded.v1";

function textEl(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  content: string,
  variable = "",
  fontSize = 14,
) {
  return {
    id,
    type: "text",
    x,
    y,
    width,
    height,
    variable,
    printable: true,
    content,
    style: {
      fontSize,
      color: "#000000",
      fontWeight: fontSize >= 16 ? "bold" : "normal",
      backgroundColor: "transparent",
      borderColor: "transparent",
    },
  };
}

function qrcodeEl(id: string, x: number, y: number, content: string, variable = "") {
  return {
    id,
    type: "qrcode",
    x,
    y,
    width: 100,
    height: 100,
    variable,
    printable: true,
    content,
    style: { backgroundColor: "transparent", borderColor: "transparent" },
  };
}

function tableEl(
  id: string,
  schemaList: NonNullable<PrintSchema["lists"]>[number],
  sampleRows: Record<string, unknown>[],
) {
  const columns = schemaList.columns.map((c, i) => ({
    field: c.key,
    header: c.label,
    width: i === 0 ? 70 : 90,
  }));
  return {
    id,
    type: "table",
    x: 36,
    y: 200,
    width: 722,
    height: 220,
    variable: `@${schemaList.key}`,
    columnsVariable: "",
    footerDataVariable: "",
    columns,
    data: sampleRows,
    showHeader: true,
    showFooter: false,
    tfootRepeat: true,
    autoPaginate: true,
    designOmitRows: true,
    printable: true,
    style: {
      fontSize: 12,
      color: "#000000",
      backgroundColor: "#ffffff",
      borderColor: "#000000",
      headerBackgroundColor: "#f3f4f6",
      headerColor: "#000000",
      textAlign: "left",
      headerTextAlign: "left",
    },
  };
}

function baseData(schema: PrintSchema, name: string) {
  const { variables } = buildSamplePayload(schema);
  return {
    canvasSize: { width: 794, height: 1123 },
    testData: variables,
    ext: { availableVariables: buildAvailableVariables(schema) },
    name,
  };
}

/** 试坯：标题 + 字段 + 二维码 */
function seedThrSampPrint(): Record<string, any> {
  const schema = findPrintSchema("ThrSampPrint")!;
  const { sample } = buildSamplePayload(schema);
  const samp = (sample.samp ?? {}) as Record<string, any>;
  return {
    ...baseData(schema, "试坯打印基本模板"),
    pages: [
      {
        id: "page-1",
        elements: [
          textEl("t-title", 36, 36, 400, 32, "试坯打印单", "", 20),
          textEl("t-batch", 36, 88, 280, 24, `批号：{#samp.cBatchNo}`, "@samp.cBatchNo", 14),
          textEl("t-sg", 36, 120, 280, 24, `钢种：{#samp.cSgCode}`, "@samp.cSgCode", 14),
          textEl("t-stove", 36, 152, 280, 24, `炉号：{#samp.cStove}`, "@samp.cStove", 14),
          textEl("t-thick", 36, 184, 280, 24, `厚度：{#samp.nThick}`, "@samp.nThick", 14),
          textEl("t-time", 36, 216, 360, 24, `时间：{#samp.createTime}`, "@samp.createTime", 14),
          textEl("t-user", 36, 248, 280, 24, `创建人：{#samp.creator}`, "@samp.creator", 14),
          qrcodeEl("q-stove", 620, 88, String(samp.cStove ?? "L1001"), "@samp.cStove"),
        ],
      },
    ],
  };
}

/** 轧钢实绩：标题 + 表格（1 行样例）+ 二维码 */
function seedDtoThr4000Print(): Record<string, any> {
  const schema = findPrintSchema("DtoThr4000Print")!;
  const { sample } = buildSamplePayload(schema);
  const list = schema.lists[0];
  const rows = ((sample[list.key] as Record<string, unknown>[]) ?? []).slice(0, 1);
  const row0 = (rows[0] ?? {}) as Record<string, any>;
  return {
    ...baseData(schema, "轧钢实绩打印基本模板"),
    pages: [
      {
        id: "page-1",
        elements: [
          textEl("t-title", 36, 36, 400, 32, "轧钢实绩打印", "", 20),
          textEl("t-line", 36, 84, 200, 22, `产线：{#thr4000s.cLineCode}`, "", 13),
          textEl("t-stove", 250, 84, 200, 22, `炉号：{#thr4000s.cStove}`, "", 13),
          tableEl("tb-1", list, rows),
          qrcodeEl("q-1", 620, 440, String(row0.cPrintCode ?? row0.cPieceNo ?? "P001"), ""),
        ],
      },
    ],
  };
}

function toRow(schema: PrintSchema, data: Record<string, any>, name: string, comments: string): PrintTemplateRow {
  const ts = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${ts.getFullYear()}-${p(ts.getMonth() + 1)}-${p(ts.getDate())} ${p(ts.getHours())}:${p(ts.getMinutes())}:${p(ts.getSeconds())}`;
  return {
    id: `seed_${schema.name.toLowerCase()}`,
    cDataType: schema.aqn,
    createTime: stamp,
    lastModifyTime: stamp,
    cComments: comments,
    nTemplateType: 2,
    cTemplateData: JSON.stringify(data),
    creator: "system",
    lastModifier: "system",
    ...({ name } as object),
  };
}

/** 空库时播种两条基础模板；有数据则跳过 */
export function ensureSeedPrintTemplates(rows: PrintTemplateRow[]): PrintTemplateRow[] {
  try {
    if (localStorage.getItem(SEED_KEY) === "1") return rows;
  } catch {
    /* ignore */
  }
  if (rows.length > 0) {
    try {
      localStorage.setItem(SEED_KEY, "1");
    } catch {
      /* ignore */
    }
    return rows;
  }
  const samp = findPrintSchema("ThrSampPrint");
  const thr = findPrintSchema("DtoThr4000Print");
  const next = [...rows];
  if (thr) next.push(toRow(thr, seedDtoThr4000Print(), "轧钢实绩打印基本模板", "轧钢实绩：标题+明细表+二维码（1 行样例）"));
  if (samp) next.push(toRow(samp, seedThrSampPrint(), "试坯打印基本模板", "试坯：标题+字段+二维码"));
  try {
    localStorage.setItem(SEED_KEY, "1");
  } catch {
    /* ignore */
  }
  return next;
}

export { PRINT_SCHEMAS };
