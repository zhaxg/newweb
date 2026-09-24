/**
 * zhb 样例（仅单元格表格，无形状/drawing）→ Univer IWorkbookData。
 * 源：temp/ddh_rmes/zhb.xlsx 解析出的 zhb_sample.json（A1:AF42、合并单元格、列宽）。
 */
import type { IWorkbookData } from "@univerjs/core";
import zhbSample from "./zhb_sample.json";

function colLettersToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseRef(ref: string): { r: number; c: number } {
  const m = ref.match(/^([A-Z]+)(\d+)$/);
  if (!m) throw new Error(`bad ref ${ref}`);
  return { r: Number(m[2]) - 1, c: colLettersToIndex(m[1]) };
}

/** Excel 字符宽 → px（近似，够用） */
function excelWidthToPx(w: number): number {
  return Math.max(20, Math.round(w * 7 + 5));
}

type Sample = {
  maxRow: number;
  maxCol: number;
  cols: { min: number; max: number; width: number }[];
  merges: string[];
  cells: Record<string, { v: string }>;
};

export function buildZhbWorkbook(): Partial<IWorkbookData> {
  const sample = zhbSample as unknown as Sample;
  const sheetId = "sheet1";

  const cellData: Record<number, Record<number, { v: string }>> = {};
  for (const [ref, cell] of Object.entries(sample.cells)) {
    const { r, c } = parseRef(ref);
    if (!cellData[r]) cellData[r] = {};
    cellData[r][c] = { v: String(cell.v ?? "") };
  }

  const columnData: Record<number, { w: number }> = {};
  for (const col of sample.cols) {
    const w = excelWidthToPx(col.width);
    for (let i = col.min - 1; i < col.max; i++) columnData[i] = { w };
  }

  const mergeData = sample.merges.map((ref) => {
    const [a, b] = ref.split(":");
    const p1 = parseRef(a);
    const p2 = parseRef(b ?? a);
    return {
      startRow: Math.min(p1.r, p2.r),
      startColumn: Math.min(p1.c, p2.c),
      endRow: Math.max(p1.r, p2.r),
      endColumn: Math.max(p1.c, p2.c),
    };
  });

  return {
    id: "yd1010_map",
    name: "库位图",
    sheetOrder: [sheetId],
    appVersion: "1.0.0",
    locale: "zhCN" as IWorkbookData["locale"],
    styles: {},
    sheets: {
      [sheetId]: {
        id: sheetId,
        name: "库位图",
        tabColor: "",
        hidden: 0,
        rowCount: Math.max(sample.maxRow + 10, 60),
        columnCount: Math.max(sample.maxCol + 5, 40),
        zoomRatio: 1,
        scrollTop: 0,
        scrollLeft: 0,
        defaultColumnWidth: 74,
        defaultRowHeight: 24,
        mergeData,
        cellData,
        rowData: {},
        columnData,
        rowHeader: { width: 40 },
        columnHeader: { height: 24 },
        showGridlines: 1,
        rightToLeft: 0,
        freeze: { startRow: 0, startColumn: 0, ySplit: 0, xSplit: 0 },
      },
    },
  };
}

