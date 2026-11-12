import { strToU8, unzipSync, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { MAX_IMPORT_FILE_BYTES, parseImportFile } from "../importFiles";

describe("transaction import file parser", () => {
  it("parses quoted CSV cells and detects a semicolon delimiter", async () => {
    const file = new File(
      ["Date;Description;Amount;Type\r\n2026-11-01;\"Cafe; lunch\";-24.50;expense"],
      "transactions.csv",
      { type: "text/csv" },
    );

    const [table] = await parseImportFile(file);
    expect(table?.rows).toEqual([
      ["Date", "Description", "Amount", "Type"],
      ["2026-11-01", "Cafe; lunch", "-24.50", "expense"],
    ]);
  });

  it("reads transaction rows from a selectable DOCX table", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
        <w:tbl>
          <w:tr><w:tc><w:p><w:r><w:t>Date</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Description</w:t></w:r></w:p></w:tc></w:tr>
          <w:tr><w:tc><w:p><w:r><w:t>2026-11-02</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Train</w:t></w:r></w:p></w:tc></w:tr>
        </w:tbl>
      </w:body></w:document>`;
    const compressed = zipSync({ "word/document.xml": strToU8(xml) });
    const buffer = compressed.buffer.slice(compressed.byteOffset, compressed.byteOffset + compressed.byteLength) as ArrayBuffer;
    const file = new File([buffer], "transactions.docx");
    expect(Object.keys(unzipSync(new Uint8Array(await file.arrayBuffer())))).toContain("word/document.xml");

    const [table] = await parseImportFile(file);
    expect(table?.rows).toEqual([["Date", "Description"], ["2026-11-02", "Train"]]);
  });

  it("rejects files above the configured size limit before reading them", async () => {
    const oversized = {
      name: "transactions.csv",
      size: MAX_IMPORT_FILE_BYTES + 1,
      arrayBuffer: () => Promise.reject(new Error("The file should not be read")),
    } as unknown as File;

    await expect(parseImportFile(oversized)).rejects.toThrow("File is too large");
  });

  it("rejects legacy Word formats with a clear unsupported-format error", async () => {
    const file = new File(["old document"], "transactions.doc");
    await expect(parseImportFile(file)).rejects.toThrow("Choose a CSV, XLSX, XLSM, text-based PDF, or DOCX file");
  });
});
