import { strFromU8, unzipSync } from "fflate";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export interface ParsedImportTable {
  id: string;
  label: string;
  rows: string[][];
}

export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;
const MAX_DOCX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

function decodeCsv(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes.slice(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.slice(2));
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder("utf-8").decode(bytes.slice(3));

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("windows-874").decode(bytes);
    } catch {
      throw new Error("This CSV encoding is not supported. Save it as UTF-8 and try again.");
    }
  }
}

function countDelimiter(line: string, delimiter: string) {
  let count = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] === '"') {
      if (quoted && line[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if (!quoted && line[i] === delimiter) {
      count += 1;
    }
  }
  return count;
}

function parseDelimitedText(text: string) {
  const sample = text.split(/\r?\n/, 8).find((line) => line.trim()) ?? "";
  const delimiter = [",", ";", "\t"].sort((a, b) => countDelimiter(sample, b) - countDelimiter(sample, a))[0] ?? ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i] ?? "";
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      row.push(field);
      field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const cell = value as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> };
    if (Array.isArray(cell.richText)) return cell.richText.map((part) => part.text ?? "").join("").trim();
    if (cell.text !== undefined) return String(cell.text);
    if (cell.result !== undefined) return cellText(cell.result);
  }
  return String(value).trim();
}

async function parseWorkbook(buffer: ArrayBuffer): Promise<ParsedImportTable[]> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  return workbook.worksheets.map((sheet, index) => {
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values as unknown[];
      rows.push(values.slice(1).map(cellText));
    });
    return { id: `sheet-${index}`, label: sheet.name, rows };
  }).filter((table) => table.rows.length > 0);
}

function directChildren(element: Element, localName: string) {
  return Array.from(element.children).filter((child) => child.localName === localName);
}

function validateDocxArchiveSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.length - 65_557);
  let endRecord = -1;
  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      endRecord = offset;
      break;
    }
  }
  if (endRecord < 0) throw new Error("This Word file could not be read.");

  const entryCount = view.getUint16(endRecord + 10, true);
  const directorySize = view.getUint32(endRecord + 12, true);
  let entryOffset = view.getUint32(endRecord + 16, true);
  if (entryCount === 0xffff || directorySize === 0xffffffff || entryOffset === 0xffffffff) {
    throw new Error("This Word file is too large to read safely.");
  }

  let totalUncompressedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (entryOffset + 46 > bytes.length || view.getUint32(entryOffset, true) !== 0x02014b50) {
      throw new Error("This Word file could not be read.");
    }
    const compressedBytes = view.getUint32(entryOffset + 20, true);
    const uncompressedBytes = view.getUint32(entryOffset + 24, true);
    const fileNameLength = view.getUint16(entryOffset + 28, true);
    const extraLength = view.getUint16(entryOffset + 30, true);
    const commentLength = view.getUint16(entryOffset + 32, true);
    if (compressedBytes === 0xffffffff || uncompressedBytes === 0xffffffff) {
      throw new Error("This Word file is too large to read safely.");
    }
    totalUncompressedBytes += uncompressedBytes;
    if (totalUncompressedBytes > MAX_DOCX_UNCOMPRESSED_BYTES) {
      throw new Error("This Word file is too large after decompressing.");
    }
    entryOffset += 46 + fileNameLength + extraLength + commentLength;
  }
}

function parseWordTables(bytes: Uint8Array): ParsedImportTable[] {
  validateDocxArchiveSize(bytes);
  const archive = unzipSync(bytes);
  const documentXml = archive["word/document.xml"];
  if (!documentXml) throw new Error("This Word file does not contain a readable document table.");

  const parsed = new DOMParser().parseFromString(strFromU8(documentXml), "application/xml");
  if (parsed.querySelector("parsererror")) throw new Error("This Word file could not be read.");
  const tables = Array.from(parsed.getElementsByTagNameNS("*", "tbl"));
  return tables.map((table, tableIndex) => {
    const rows = directChildren(table, "tr").map((row) =>
      directChildren(row, "tc").map((cell) =>
        Array.from(cell.getElementsByTagNameNS("*", "t"))
          .map((text) => text.textContent ?? "")
          .join("")
          .trim(),
      ),
    ).filter((row) => row.some((cell) => cell));
    return { id: `table-${tableIndex}`, label: `Table ${tableIndex + 1}`, rows };
  }).filter((table) => table.rows.length > 0);
}

interface PdfTextItem {
  str?: string;
  width?: number;
  height?: number;
  transform?: number[];
}

interface PdfLine {
  y: number;
  fontSize: number;
  items: Array<{ x: number; width: number; text: string }>;
}

async function parsePdf(bytes: Uint8Array): Promise<ParsedImportTable[]> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const loading = pdfjs.getDocument({ data: bytes });
  const pdf = await loading.promise;
  const rows: string[][] = [];

  try {
    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
      const page = await pdf.getPage(pageIndex);
      const content = await page.getTextContent();
      const lines: PdfLine[] = [];
      for (const raw of content.items) {
        const item = raw as PdfTextItem;
        const text = item.str?.trim();
        const transform = item.transform;
        if (!text || !transform) continue;
        const x = Number(transform[4] ?? 0);
        const y = Number(transform[5] ?? 0);
        const fontSize = Math.max(Number(item.height ?? 0), Math.hypot(Number(transform[2] ?? 0), Number(transform[3] ?? 0)), 8);
        let line = lines.find((candidate) => Math.abs(candidate.y - y) <= Math.max(2, fontSize * 0.25));
        if (!line) {
          line = { y, fontSize, items: [] };
          lines.push(line);
        }
        line.items.push({ x, width: Number(item.width ?? 0), text });
      }

      lines.sort((a, b) => b.y - a.y);
      for (const line of lines) {
        line.items.sort((a, b) => a.x - b.x);
        const cells: string[] = [];
        let cellTextValue = "";
        let cellRight = Number.NEGATIVE_INFINITY;
        const gapThreshold = Math.max(14, line.fontSize * 1.15);
        for (const item of line.items) {
          if (cellTextValue && item.x - cellRight > gapThreshold) {
            cells.push(cellTextValue.trim());
            cellTextValue = "";
          }
          cellTextValue += `${cellTextValue ? " " : ""}${item.text}`;
          cellRight = item.x + item.width;
        }
        if (cellTextValue.trim()) cells.push(cellTextValue.trim());
        if (cells.length) rows.push(cells);
      }
    }
  } finally {
    await pdf.destroy();
  }

  if (!rows.length) throw new Error("No selectable text was found. Scanned PDFs are not supported.");
  return [{ id: "pdf-text", label: "PDF text table", rows }];
}

export async function parseImportFile(file: File): Promise<ParsedImportTable[]> {
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error("File is too large. Choose a file under 10 MB.");
  const extension = file.name.toLowerCase().split(".").pop();
  const buffer = await file.arrayBuffer();
  let tables: ParsedImportTable[];

  if (extension === "csv" || extension === "txt") {
    tables = [{ id: "csv", label: file.name, rows: parseDelimitedText(decodeCsv(new Uint8Array(buffer))) }];
  } else if (extension === "xlsx" || extension === "xlsm") {
    tables = await parseWorkbook(buffer);
  } else if (extension === "pdf") {
    tables = await parsePdf(new Uint8Array(buffer));
  } else if (extension === "docx") {
    tables = parseWordTables(new Uint8Array(buffer));
  } else {
    throw new Error("Choose a CSV, XLSX, XLSM, text-based PDF, or DOCX file.");
  }

  const rowCount = tables.reduce((sum, table) => sum + table.rows.length, 0);
  if (!rowCount) throw new Error("No table rows were found in this file.");
  if (rowCount > MAX_IMPORT_ROWS) throw new Error("This file has more than 1,000 rows. Split it into smaller files and try again.");
  return tables;
}
