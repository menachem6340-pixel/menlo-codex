import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";

type ImportSource = "dekel" | "binarit";

interface ImportedRow {
  section: string;
  code?: string;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number;
  notes?: string;
}

const SOURCE_LABELS: Record<ImportSource, string> = {
  dekel: "דקל",
  binarit: "בינארית",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const source = normalizeSource(String(formData.get("source") || "dekel"));
    const projectId = String(formData.get("project_id") || "") || null;
    const requestedName = String(formData.get("name") || "").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "לא נבחר קובץ לייבוא" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseImportFile(buffer, file.name, source);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "לא נמצאו שורות כתב כמויות בקובץ. בדוק שיש עמודות תיאור, יחידה, כמות ומחיר." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: profile } = await supabase.from("profiles").select("organization_id").single();
    if (!profile?.organization_id) {
      return NextResponse.json({ error: "לא נמצא ארגון למשתמש" }, { status: 400 });
    }

    const boqName =
      requestedName ||
      `ייבוא ${SOURCE_LABELS[source]} - ${file.name.replace(/\.[^.]+$/, "")}`;

    const { data: boq, error: boqError } = await supabase
      .from("boqs")
      .insert({
        organization_id: profile.organization_id,
        project_id: projectId,
        name: boqName,
        notes: `נוצר מייבוא ${SOURCE_LABELS[source]}: ${file.name}`,
      })
      .select("id")
      .single();

    if (boqError || !boq) {
      return NextResponse.json({ error: boqError?.message || "יצירת כתב הכמויות נכשלה" }, { status: 400 });
    }

    const sectionNames = Array.from(new Set(rows.map((row) => row.section || SOURCE_LABELS[source])));
    const sectionIds = new Map<string, string>();

    for (let i = 0; i < sectionNames.length; i++) {
      const sectionName = sectionNames[i];
      const { data: section, error } = await supabase
        .from("boq_sections")
        .insert({
          boq_id: boq.id,
          name: sectionName,
          display_order: i,
        })
        .select("id")
        .single();

      if (error || !section) {
        return NextResponse.json({ error: error?.message || "יצירת פרק נכשלה" }, { status: 400 });
      }
      sectionIds.set(sectionName, section.id);
    }

    const items = rows.map((row, index) => ({
      boq_id: boq.id,
      section_id: sectionIds.get(row.section || SOURCE_LABELS[source]) || null,
      display_order: index,
      code: row.code || null,
      description: row.description,
      unit: row.unit || "יח'",
      quantity: row.quantity,
      unit_price: row.unit_price,
      notes: row.notes || null,
    }));

    const { error: itemsError } = await supabase.from("boq_items").insert(items);
    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 400 });
    }

    return NextResponse.json({
      boqId: boq.id,
      rowsImported: rows.length,
      sectionsImported: sectionNames.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "שגיאה בייבוא הקובץ" },
      { status: 500 }
    );
  }
}

function normalizeSource(value: string): ImportSource {
  return value === "binarit" ? "binarit" : "dekel";
}

async function parseImportFile(buffer: Buffer, filename: string, source: ImportSource): Promise<ImportedRow[]> {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (extension === "xls") {
    throw new Error("קובץ XLS ישן לא נתמך כרגע. פתח את הקובץ ושמור אותו כ-XLSX או CSV ואז נסה שוב.");
  }

  if (extension === "xlsx" || extension === "xlsm") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    if (!sheet) return [];

    const matrix: string[][] = [];
    sheet.eachRow((row) => {
      const values: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        values[colNumber - 1] = String(cell.text || cell.value || "").trim();
      });
      matrix.push(values);
    });

    return normalizeMatrix(matrix, source);
  }

  const text = decodeText(buffer);
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  });

  return normalizeMatrix(parsed.data || [], source);
}

function decodeText(buffer: Buffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  if (replacementCount < 3) return utf8;

  try {
    return new TextDecoder("windows-1255").decode(buffer);
  } catch {
    return utf8;
  }
}

function normalizeMatrix(matrix: string[][], source: ImportSource): ImportedRow[] {
  const rows = matrix.map((row) => row.map((cell) => String(cell || "").trim()));
  const headerIndex = findHeaderIndex(rows);
  const headers = headerIndex >= 0 ? rows[headerIndex].map(normalizeHeader) : [];
  const dataRows = rows.slice(headerIndex >= 0 ? headerIndex + 1 : 0);
  const columnMap = headerIndex >= 0 ? buildColumnMap(headers) : defaultColumnMap();
  const result: ImportedRow[] = [];
  let currentSection = `ייבוא ${SOURCE_LABELS[source]}`;

  for (const row of dataRows) {
    if (!row.some(Boolean)) continue;

    const description = getCell(row, columnMap.description);
    const sectionCell = getCell(row, columnMap.section);
    const code = getCell(row, columnMap.code);
    const unit = getCell(row, columnMap.unit);
    const quantity = parseNumber(getCell(row, columnMap.quantity));
    const unitPrice = parseNumber(getCell(row, columnMap.unit_price));

    if (sectionCell && !description && !unit && quantity === 0 && unitPrice === 0) {
      currentSection = sectionCell;
      continue;
    }

    if (looksLikeSectionRow({ description, unit, quantity, unitPrice, code })) {
      currentSection = description || sectionCell || currentSection;
      continue;
    }

    if (!description || isSummaryRow(description)) continue;

    result.push({
      section: sectionCell || currentSection,
      code,
      description,
      unit: unit || "יח'",
      quantity,
      unit_price: unitPrice,
      notes: `יובא מ-${SOURCE_LABELS[source]}`,
    });
  }

  return result;
}

function findHeaderIndex(rows: string[][]): number {
  return rows.findIndex((row, index) => {
    if (index > 12) return false;
    const normalized = row.map(normalizeHeader);
    return (
      normalized.some((cell) => cell === "description") &&
      (normalized.some((cell) => cell === "quantity") || normalized.some((cell) => cell === "unit"))
    );
  });
}

function buildColumnMap(headers: string[]) {
  return {
    section: headers.findIndex((h) => h === "section"),
    code: headers.findIndex((h) => h === "code"),
    description: headers.findIndex((h) => h === "description"),
    unit: headers.findIndex((h) => h === "unit"),
    quantity: headers.findIndex((h) => h === "quantity"),
    unit_price: headers.findIndex((h) => h === "unit_price"),
  };
}

function defaultColumnMap() {
  return {
    section: -1,
    code: 0,
    description: 1,
    unit: 2,
    quantity: 3,
    unit_price: 4,
  };
}

function normalizeHeader(value: string): string {
  const text = value.replace(/\s+/g, " ").trim().toLowerCase();
  if (/^(פרק|תחום|קבוצה|section|chapter)$/.test(text)) return "section";
  if (/^(מס|מס'|מספר|סעיף|קוד|מק"ט|מקט|item|code|no\.?)$/.test(text)) return "code";
  if (/תיאור|תאור|שם סעיף|תכולה|description|desc/.test(text)) return "description";
  if (/יחידה|יח'|יחידת מידה|מידה|unit/.test(text)) return "unit";
  if (/כמות|quantity|qty/.test(text)) return "quantity";
  if (/מחיר יח|מחיר ליח|מחיר|unit price|price/.test(text)) return "unit_price";
  return text;
}

function getCell(row: string[], index: number): string {
  return index >= 0 ? String(row[index] || "").trim() : "";
}

function parseNumber(value: string): number {
  const cleaned = String(value || "")
    .replace(/[₪,\s]/g, "")
    .replace(/(\d)\.(?=\d{3}(\D|$))/g, "$1")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function looksLikeSectionRow({
  description,
  unit,
  quantity,
  unitPrice,
  code,
}: {
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  code: string;
}) {
  return Boolean(description && !unit && quantity === 0 && unitPrice === 0 && (!code || code.length < 8));
}

function isSummaryRow(description: string): boolean {
  return /סה"כ|סה״כ|סך הכל|subtotal|total/.test(description.toLowerCase());
}
