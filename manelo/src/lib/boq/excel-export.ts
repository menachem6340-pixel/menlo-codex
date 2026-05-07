import ExcelJS from "exceljs";
import fs from "fs/promises";
import path from "path";

export interface BoqExportData {
  boq: {
    name: string;
    created_at: string;
  };
  project?: {
    name: string;
    address?: string;
  } | null;
  client?: {
    name: string;
    phone?: string;
  } | null;
  organization: {
    name: string;
    business_id?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  sections: Array<{
    id: string;
    name: string;
    display_order: number;
  }>;
  items: Array<{
    id: string;
    section_id: string | null;
    description: string;
    unit: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    display_order: number;
    notes?: string | null;
  }>;
}

// פלטה של מנלו בנייה
const COLORS = {
  YELLOW: "FFF5C842", // צהוב מותג
  YELLOW_LIGHT: "FFFEF3D9",
  BLUE: "FF2B7FBF", // כחול מותג
  BLUE_LIGHT: "FFD9E8F2",
  GREEN: "FF1FA890",
  GREEN_LIGHT: "FFD9F0E8",
  DARK: "FF3A3A3A",
  GRAY: "FF595959",
  GRAY_LIGHT: "FFF2F2F2",
  WHITE: "FFFFFFFF",
};

const FONT_NAME = "Arial";

export async function buildBoqExcel(data: BoqExportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = data.organization.name;
  wb.created = new Date();

  // נסה לטעון את הלוגו
  let logoId: number | null = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-full.png");
    const logoBuffer = await fs.readFile(logoPath);
    logoId = wb.addImage({
      buffer: logoBuffer as unknown as ArrayBuffer,
      extension: "png",
    });
  } catch {
    // אם אין לוגו - נמשיך בלי
  }

  // --- גיליון 1: שער ---
  buildCoverSheet(wb, data, logoId);

  // --- גיליונות מקצועיים לפי construction-intelligence-pro v5 ---
  const executionRows = buildExecutionSheet(wb, data, logoId);
  buildFinishingProductsSheet(wb, data, logoId);
  buildQuantitySummarySheet(wb, data, executionRows);
  buildFinancialSummarySheet(wb, executionRows);
  buildWarningsSheet(wb, data);
  buildRecommendationsSheet(wb);

  // --- גיליון 2 ואילך: לכל פרק גיליון ---
  const sectionRowMap = new Map<string, { sheet: string; startRow: number; endRow: number }>();
  let sectionIndex = 1;

  for (const section of data.sections) {
    const sectionItems = data.items
      .filter((i) => i.section_id === section.id)
      .sort((a, b) => a.display_order - b.display_order);

    if (sectionItems.length === 0) continue;

    const safeName = section.name.replace(/[\\/?*[\]]/g, "").substring(0, 31) || `פרק ${sectionIndex}`;
    const sheetName = ensureUniqueSheetName(wb, safeName);
    const sheet = wb.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }],
    });

    const result = buildChapterSheet(sheet, section.name, sectionItems, logoId, data.organization.name);
    sectionRowMap.set(section.id, { sheet: sheetName, startRow: result.firstDataRow, endRow: result.lastDataRow });
    sectionIndex++;
  }

  // --- גיליון אחרון: סיכום ---
  buildSummarySheet(wb, data, sectionRowMap, logoId);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function ensureUniqueSheetName(wb: ExcelJS.Workbook, base: string): string {
  let name = base;
  let counter = 2;
  while (wb.getWorksheet(name)) {
    name = `${base.substring(0, 27)} (${counter})`;
    counter++;
  }
  return name;
}

function buildExecutionSheet(wb: ExcelJS.Workbook, data: BoqExportData, logoId: number | null) {
  const sheet = wb.addWorksheet("Part A - Execution", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 4 }],
  });
  sheet.columns = [
    { width: 10 }, { width: 34 }, { width: 34 }, { width: 12 },
    { width: 10 }, { width: 14 }, { width: 14 }, { width: 16 },
    { width: 16 }, { width: 18 }, { width: 18 }, { width: 14 },
    { width: 18 }, { width: 20 }, { width: 28 }, { width: 28 },
  ];

  if (logoId !== null) {
    sheet.addImage(logoId, { tl: { col: 13, row: 0.2 }, ext: { width: 120, height: 45 } });
  }

  sheet.mergeCells("A1:P1");
  const title = sheet.getCell("A1");
  title.value = "Part A - Execution / עבודות ביצוע";
  title.font = { name: FONT_NAME, size: 18, bold: true, color: { argb: COLORS.WHITE } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  const headers = [
    "Item Number", "Work Description", "Calculation / Location", "Quantity", "Unit",
    "Client Price", "Client Total", "Contractor Price", "Contractor Total",
    "Subcontractor Price", "Subcontractor Total", "Confidence Score",
    "Validation Status", "Source Drawing", "Notes", "Warnings",
  ];
  const headerRow = sheet.getRow(4);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = thinBorder();
  });
  headerRow.height = 32;

  const sectionById = new Map(data.sections.map((section) => [section.id, section.name]));
  let rowNumber = 5;
  let itemNumber = 1;

  data.sections.forEach((section) => {
    const sectionItems = data.items
      .filter((item) => item.section_id === section.id)
      .sort((a, b) => a.display_order - b.display_order);
    if (sectionItems.length === 0) return;

    sheet.mergeCells(`A${rowNumber}:P${rowNumber}`);
    const sectionCell = sheet.getCell(`A${rowNumber}`);
    sectionCell.value = section.name;
    sectionCell.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: COLORS.DARK } };
    sectionCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.YELLOW } };
    sectionCell.alignment = { horizontal: "right", vertical: "middle" };
    rowNumber++;

    sectionItems.forEach((item) => {
      const meta = parseItemMeta(item.notes || "");
      const row = sheet.getRow(rowNumber);
      const values = [
        itemNumber++,
        item.description,
        meta.calculation || item.notes || "",
        Number(item.quantity || 0),
        item.unit,
        Number(item.unit_price || 0),
        { formula: `D${rowNumber}*F${rowNumber}` },
        0,
        { formula: `D${rowNumber}*H${rowNumber}` },
        0,
        { formula: `D${rowNumber}*J${rowNumber}` },
        meta.confidence || "",
        meta.validation || "",
        meta.source || sectionById.get(item.section_id || "") || "",
        item.notes || "",
        meta.warnings || "",
      ];

      values.forEach((value, index) => {
        const cell = row.getCell(index + 1);
        cell.value = value as ExcelJS.CellValue;
        cell.font = { name: FONT_NAME, size: 10 };
        cell.alignment = { horizontal: index >= 3 && index <= 10 ? "left" : "right", vertical: "middle", wrapText: true };
        cell.border = thinBorder();
        if ([6, 8, 10].includes(index + 1)) cell.numFmt = '#,##0';
        if ([7, 9, 11].includes(index + 1)) {
          cell.numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
          cell.font = { name: FONT_NAME, size: 10, bold: true, color: { argb: COLORS.BLUE } };
        }
        if (meta.warnings && index + 1 === 16) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE699" } };
        }
      });
      row.height = 26;
      rowNumber++;
    });
  });

  return { firstRow: 5, lastRow: Math.max(5, rowNumber - 1) };
}

function buildFinishingProductsSheet(wb: ExcelJS.Workbook, data: BoqExportData, logoId: number | null) {
  const sheet = wb.addWorksheet("Part B - Finishing Products", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }],
  });
  sheet.columns = [{ width: 10 }, { width: 38 }, { width: 16 }, { width: 14 }, { width: 14 }, { width: 44 }];
  if (logoId !== null) sheet.addImage(logoId, { tl: { col: 4.2, row: 0.2 }, ext: { width: 120, height: 45 } });
  sheet.mergeCells("A1:F1");
  sheet.getCell("A1").value = "Part B - Finishing Products / מוצרי גמר";
  sheet.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: COLORS.WHITE } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  ["מס'", "מוצר/עבודה", "כמות", "יחידה", "מחיר לקוח", "הערות"].forEach((header, index) => {
    const cell = sheet.getRow(3).getCell(index + 1);
    cell.value = header;
    cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BLUE } };
    cell.alignment = { horizontal: "center" };
    cell.border = thinBorder();
  });

  const finishingItems = data.items.filter((item) =>
    /ריצוף|חיפוי|קרמיקה|שיש|פרקט|דלת|חלון|אלומיניום|נגרות|ארון|צבע|גבס/.test(item.description)
  );
  finishingItems.forEach((item, index) => {
    const row = sheet.getRow(index + 4);
    row.values = [index + 1, item.description, Number(item.quantity || 0), item.unit, Number(item.unit_price || 0), item.notes || ""];
    row.eachCell((cell, cellIndex) => {
      cell.font = { name: FONT_NAME, size: 10 };
      cell.alignment = { horizontal: cellIndex >= 3 && cellIndex <= 5 ? "left" : "right", wrapText: true };
      cell.border = thinBorder();
      if (cellIndex === 5) cell.numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
    });
  });
}

function buildQuantitySummarySheet(
  wb: ExcelJS.Workbook,
  data: BoqExportData,
  executionRows: { firstRow: number; lastRow: number }
) {
  const sheet = wb.addWorksheet("Quantity Summary", { views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }] });
  sheet.columns = [{ width: 10 }, { width: 36 }, { width: 18 }, { width: 18 }, { width: 24 }];
  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = "Quantity Summary / סיכום כמויות";
  sheet.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: COLORS.WHITE } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  ["מס'", "פרק", "כמות שורות", "סה\"כ לקוח", "הערות"].forEach((header, index) => {
    const cell = sheet.getRow(3).getCell(index + 1);
    cell.value = header;
    cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BLUE } };
    cell.border = thinBorder();
  });

  data.sections.forEach((section, index) => {
    const rowNumber = index + 4;
    const row = sheet.getRow(rowNumber);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = section.name;
    row.getCell(3).value = data.items.filter((item) => item.section_id === section.id).length;
    row.getCell(4).value = "";
    row.getCell(5).value = "פירוט מלא בגיליון Part A - Execution";
    row.eachCell((cell) => {
      cell.font = { name: FONT_NAME, size: 10 };
      cell.border = thinBorder();
      cell.alignment = { horizontal: "right" };
    });
    row.getCell(4).numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
  });

  const totalRow = sheet.getRow(data.sections.length + 5);
  totalRow.getCell(2).value = "סה\"כ מקושר לגיליון הביצוע";
  totalRow.getCell(4).value = { formula: `SUM('Part A - Execution'!G${executionRows.firstRow}:G${executionRows.lastRow})` };
  totalRow.eachCell((cell) => {
    cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
    cell.border = thinBorder();
  });
  totalRow.getCell(4).numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
}

function buildFinancialSummarySheet(wb: ExcelJS.Workbook, executionRows: { firstRow: number; lastRow: number }) {
  const sheet = wb.addWorksheet("Financial Summary", { views: [{ rightToLeft: true }] });
  sheet.columns = [{ width: 34 }, { width: 20 }];
  sheet.mergeCells("A1:B1");
  sheet.getCell("A1").value = "Financial Summary / סיכום כספי";
  sheet.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: COLORS.WHITE } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
  sheet.getCell("A1").alignment = { horizontal: "center" };

  const rows: Array<[string, ExcelJS.CellValue]> = [
    ["סה\"כ מחיר לקוח", { formula: `SUM('Part A - Execution'!G${executionRows.firstRow}:G${executionRows.lastRow})` }],
    ["סה\"כ מחיר קבלן", { formula: `SUM('Part A - Execution'!I${executionRows.firstRow}:I${executionRows.lastRow})` }],
    ["סה\"כ מחיר קבלני משנה", { formula: `SUM('Part A - Execution'!K${executionRows.firstRow}:K${executionRows.lastRow})` }],
    ["מע\"מ 18%", { formula: "B3*0.18" }],
    ["סה\"כ כולל מע\"מ", { formula: "B3+B6" }],
  ];
  rows.forEach(([label, value], index) => {
    const row = sheet.getRow(index + 3);
    row.getCell(1).value = label;
    row.getCell(2).value = value;
    row.eachCell((cell) => {
      cell.font = { name: FONT_NAME, size: 12, bold: index === rows.length - 1 };
      cell.border = thinBorder();
      cell.alignment = { horizontal: "right" };
    });
    row.getCell(2).numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
  });
}

function buildWarningsSheet(wb: ExcelJS.Workbook, data: BoqExportData) {
  const sheet = wb.addWorksheet("Warnings & Risks", { views: [{ rightToLeft: true, state: "frozen", ySplit: 3 }] });
  sheet.columns = [{ width: 10 }, { width: 44 }, { width: 28 }, { width: 54 }];
  sheet.mergeCells("A1:D1");
  sheet.getCell("A1").value = "Warnings & Risks / אזהרות וסיכונים";
  sheet.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: COLORS.WHITE } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
  ["מס'", "סעיף", "מקור", "אזהרה/הערה"].forEach((header, index) => {
    const cell = sheet.getRow(3).getCell(index + 1);
    cell.value = header;
    cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BLUE } };
    cell.border = thinBorder();
  });
  const warningItems = data.items.filter((item) => /אזהר|נדרש|ביטחון|Human review|Estimated|low/i.test(item.notes || ""));
  warningItems.forEach((item, index) => {
    const meta = parseItemMeta(item.notes || "");
    const row = sheet.getRow(index + 4);
    row.values = [index + 1, item.description, meta.source || "", meta.warnings || item.notes || ""];
    row.eachCell((cell) => {
      cell.font = { name: FONT_NAME, size: 10 };
      cell.border = thinBorder();
      cell.alignment = { horizontal: "right", wrapText: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF2CC" } };
    });
  });
}

function buildRecommendationsSheet(wb: ExcelJS.Workbook) {
  const sheet = wb.addWorksheet("AI Recommendations", { views: [{ rightToLeft: true }] });
  sheet.columns = [{ width: 10 }, { width: 42 }, { width: 80 }];
  sheet.mergeCells("A1:C1");
  sheet.getCell("A1").value = "AI Recommendations / המלצות AI";
  sheet.getCell("A1").font = { name: FONT_NAME, size: 18, bold: true, color: { argb: COLORS.WHITE } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
  ["מס'", "תחום", "המלצה"].forEach((header, index) => {
    const cell = sheet.getRow(3).getCell(index + 1);
    cell.value = header;
    cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BLUE } };
    cell.border = thinBorder();
  });
  const recommendations = [
    ["בדיקת אדם", "יש לעבור על כל סעיף עם ביטחון נמוך לפני שליחה ללקוח."],
    ["מקורות", "ודא שכל כמות משמעותית מקושרת לתכנית, אזור או חישוב."],
    ["תמחור", "עדכן מחירי קבלן משנה ומחירי קבלן לפני הפקת הצעת מחיר סופית."],
  ];
  recommendations.forEach(([area, recommendation], index) => {
    const row = sheet.getRow(index + 4);
    row.values = [index + 1, area, recommendation];
    row.eachCell((cell) => {
      cell.font = { name: FONT_NAME, size: 10 };
      cell.border = thinBorder();
      cell.alignment = { horizontal: "right", wrapText: true };
    });
  });
}

function parseItemMeta(notes: string) {
  const parts = notes.split("|").map((part) => part.trim());
  const findValue = (label: string) =>
    parts.find((part) => part.startsWith(`${label}:`))?.replace(`${label}:`, "").trim();
  return {
    calculation: findValue("חישוב"),
    source: findValue("מקור"),
    confidence: findValue("ביטחון"),
    validation: findValue("סטטוס בדיקה"),
    warnings: findValue("אזהרות") || (notes.includes("נדרש אישור אדם") ? "נדרש אישור אדם" : ""),
  };
}

function thinBorder(): Partial<ExcelJS.Borders> {
  return {
    top: { style: "thin", color: { argb: "FFE5E5E5" } },
    bottom: { style: "thin", color: { argb: "FFE5E5E5" } },
    left: { style: "thin", color: { argb: "FFE5E5E5" } },
    right: { style: "thin", color: { argb: "FFE5E5E5" } },
  };
}

// =====================================================
// שער
// =====================================================
function buildCoverSheet(wb: ExcelJS.Workbook, data: BoqExportData, logoId: number | null) {
  const sheet = wb.addWorksheet("שער", { views: [{ rightToLeft: true }] });

  sheet.columns = [
    { width: 3 },
    { width: 25 },
    { width: 50 },
    { width: 3 },
  ];

  // לוגו
  if (logoId !== null) {
    sheet.addImage(logoId, {
      tl: { col: 1.5, row: 0.5 },
      ext: { width: 200, height: 80 },
    });
  }

  for (let i = 1; i <= 5; i++) sheet.getRow(i).height = 22;

  // כותרת
  sheet.mergeCells("B7:C7");
  const title = sheet.getCell("B7");
  title.value = "כתב כמויות";
  title.font = { name: FONT_NAME, size: 28, bold: true, color: { argb: COLORS.DARK } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(7).height = 40;

  sheet.mergeCells("B8:C8");
  const subtitle = sheet.getCell("B8");
  subtitle.value = data.boq.name;
  subtitle.font = { name: FONT_NAME, size: 14, color: { argb: COLORS.GRAY } };
  subtitle.alignment = { horizontal: "center" };
  sheet.getRow(8).height = 22;

  // קו צהוב
  sheet.mergeCells("B9:C9");
  sheet.getCell("B9").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.YELLOW } };
  sheet.getRow(9).height = 5;

  // טבלת פרטים
  let row = 11;
  const details: Array<[string, string]> = [
    ["שם הפרויקט", data.project?.name || ""],
    ["כתובת", data.project?.address || ""],
    ["לקוח", data.client?.name || ""],
    ["טלפון לקוח", data.client?.phone || ""],
    ["תאריך הצעה", new Date(data.boq.created_at).toLocaleDateString("he-IL")],
  ];

  for (const [label, value] of details) {
    if (!value) continue;
    const labelCell = sheet.getCell(`B${row}`);
    labelCell.value = label;
    labelCell.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: COLORS.DARK } };
    labelCell.alignment = { horizontal: "right", vertical: "middle" };
    labelCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.YELLOW_LIGHT } };

    const valueCell = sheet.getCell(`C${row}`);
    valueCell.value = value;
    valueCell.font = { name: FONT_NAME, size: 12 };
    valueCell.alignment = { horizontal: "right", vertical: "middle" };

    [labelCell, valueCell].forEach((c) => {
      c.border = {
        top: { style: "thin", color: { argb: "FFE5E5E5" } },
        bottom: { style: "thin", color: { argb: "FFE5E5E5" } },
        left: { style: "thin", color: { argb: "FFE5E5E5" } },
        right: { style: "thin", color: { argb: "FFE5E5E5" } },
      };
    });

    sheet.getRow(row).height = 24;
    row++;
  }

  // פרטי העסק בתחתית
  row += 2;
  const orgTitle = sheet.getCell(`B${row}`);
  orgTitle.value = "מוצא ההצעה:";
  orgTitle.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLORS.BLUE } };
  row++;

  const orgInfo = sheet.getCell(`B${row}`);
  orgInfo.value = data.organization.name;
  orgInfo.font = { name: FONT_NAME, size: 13, bold: true };
  row++;

  if (data.organization.business_id) {
    sheet.getCell(`B${row}`).value = `ע.מ./ח.פ. ${data.organization.business_id}`;
    sheet.getCell(`B${row}`).font = { name: FONT_NAME, size: 10, color: { argb: COLORS.GRAY } };
    row++;
  }
  if (data.organization.phone) {
    sheet.getCell(`B${row}`).value = `טלפון: ${data.organization.phone}`;
    sheet.getCell(`B${row}`).font = { name: FONT_NAME, size: 10, color: { argb: COLORS.GRAY } };
    row++;
  }
  if (data.organization.email) {
    sheet.getCell(`B${row}`).value = `אימייל: ${data.organization.email}`;
    sheet.getCell(`B${row}`).font = { name: FONT_NAME, size: 10, color: { argb: COLORS.GRAY } };
    row++;
  }
}

// =====================================================
// פרק
// =====================================================
function buildChapterSheet(
  sheet: ExcelJS.Worksheet,
  chapterName: string,
  items: BoqExportData["items"],
  logoId: number | null,
  orgName: string
): { firstDataRow: number; lastDataRow: number } {
  sheet.columns = [
    { width: 6 }, // A: מס"ד
    { width: 50 }, // B: תיאור
    { width: 10 }, // C: יחידה
    { width: 12 }, // D: כמות
    { width: 14 }, // E: מחיר ליחידה
    { width: 16 }, // F: סה"כ
    { width: 30 }, // G: הערות
  ];

  // לוגו פינה ימנית
  if (logoId !== null) {
    sheet.addImage(logoId, {
      tl: { col: 5.7, row: 0.2 },
      ext: { width: 130, height: 50 },
    });
  }
  sheet.getRow(1).height = 20;
  sheet.getRow(2).height = 22;

  // כותרת
  sheet.mergeCells("A2:G2");
  const titleCell = sheet.getCell("A2");
  titleCell.value = chapterName;
  titleCell.font = { name: FONT_NAME, size: 18, bold: true, color: { argb: COLORS.DARK } };
  titleCell.alignment = { horizontal: "right", vertical: "middle", indent: 1 };

  // קו צהוב
  sheet.mergeCells("A3:G3");
  sheet.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.YELLOW } };
  sheet.getRow(3).height = 4;

  // כותרות עמודות (שורה 5)
  const headerRow = sheet.getRow(5);
  const headers = ["מס\"ד", "תיאור", "יחידה", "כמות", "מחיר ליחידה", "סה\"כ", "הערות"];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = {
      top: { style: "medium", color: { argb: COLORS.DARK } },
      bottom: { style: "medium", color: { argb: COLORS.DARK } },
      left: { style: "thin", color: { argb: COLORS.WHITE } },
      right: { style: "thin", color: { argb: COLORS.WHITE } },
    };
  });
  headerRow.height = 28;

  // שורות נתונים
  const firstDataRow = 6;
  items.forEach((item, idx) => {
    const row = sheet.getRow(firstDataRow + idx);
    const isAlt = idx % 2 === 1;
    const fillColor = isAlt ? COLORS.GRAY_LIGHT : COLORS.WHITE;

    const cells: Array<{ col: number; value: string | number; align?: "right" | "center" | "left"; format?: string; bold?: boolean }> = [
      { col: 1, value: idx + 1, align: "center" },
      { col: 2, value: item.description, align: "right" },
      { col: 3, value: item.unit, align: "center" },
      { col: 4, value: item.quantity, align: "left", format: "#,##0.##" },
      { col: 5, value: item.unit_price, align: "left", format: '_-* #,##0_-;[Red]-* #,##0_-;_-* "-"_-;_-@_-' },
    ];

    cells.forEach((c) => {
      const cell = row.getCell(c.col);
      cell.value = c.value;
      cell.font = { name: FONT_NAME, size: 11 };
      cell.alignment = { horizontal: c.align, vertical: "middle", indent: c.align === "right" ? 1 : 0 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
      if (c.format) cell.numFmt = c.format;
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE5E5E5" } },
      };
    });

    // עמודת סה"כ - נוסחה
    const totalCell = row.getCell(6);
    totalCell.value = { formula: `D${firstDataRow + idx}*E${firstDataRow + idx}` };
    totalCell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLORS.BLUE } };
    totalCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    totalCell.numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
    totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
    totalCell.border = { bottom: { style: "thin", color: { argb: "FFE5E5E5" } } };

    // הערות
    const notesCell = row.getCell(7);
    notesCell.value = item.notes || "";
    notesCell.alignment = { horizontal: "right", vertical: "middle" };
    notesCell.font = { name: FONT_NAME, size: 10, color: { argb: COLORS.GRAY } };
    notesCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };
    notesCell.border = { bottom: { style: "thin", color: { argb: "FFE5E5E5" } } };

    row.height = 22;
  });

  const lastDataRow = firstDataRow + items.length - 1;

  // שורת סיכום
  const sumRow = sheet.getRow(lastDataRow + 2);
  sheet.mergeCells(`A${sumRow.number}:E${sumRow.number}`);
  const sumLabel = sumRow.getCell(1);
  sumLabel.value = `סה"כ ${chapterName}`;
  sumLabel.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: COLORS.WHITE } };
  sumLabel.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
  sumLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };

  const sumValue = sumRow.getCell(6);
  sumValue.value = { formula: `SUM(F${firstDataRow}:F${lastDataRow})` };
  sumValue.font = { name: FONT_NAME, size: 13, bold: true, color: { argb: COLORS.WHITE } };
  sumValue.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  sumValue.numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
  sumValue.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
  sumRow.height = 30;

  // פוטר
  const footerRow = sheet.getRow(lastDataRow + 4);
  footerRow.getCell(1).value = `${orgName} · גיליון ${chapterName}`;
  footerRow.getCell(1).font = { name: FONT_NAME, size: 9, italic: true, color: { argb: COLORS.GRAY } };

  return { firstDataRow, lastDataRow };
}

// =====================================================
// סיכום
// =====================================================
function buildSummarySheet(
  wb: ExcelJS.Workbook,
  data: BoqExportData,
  sectionRowMap: Map<string, { sheet: string; startRow: number; endRow: number }>,
  logoId: number | null
) {
  const sheet = wb.addWorksheet("סיכום", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }],
  });

  sheet.columns = [
    { width: 6 }, // A: מס"ד
    { width: 45 }, // B: שם הפרק
    { width: 18 }, // C: סה"כ
  ];

  if (logoId !== null) {
    sheet.addImage(logoId, {
      tl: { col: 1.7, row: 0.2 },
      ext: { width: 130, height: 50 },
    });
  }
  sheet.getRow(1).height = 20;
  sheet.getRow(2).height = 22;

  // כותרת
  sheet.mergeCells("A2:C2");
  const titleCell = sheet.getCell("A2");
  titleCell.value = "סיכום כתב כמויות";
  titleCell.font = { name: FONT_NAME, size: 22, bold: true, color: { argb: COLORS.DARK } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  sheet.mergeCells("A3:C3");
  sheet.getCell("A3").fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.YELLOW } };
  sheet.getRow(3).height = 4;

  // כותרות עמודות
  const headerRow = sheet.getRow(5);
  ["מס\"ד", "פרק", "סה\"כ"].forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: FONT_NAME, size: 12, bold: true, color: { argb: COLORS.WHITE } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.BLUE } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  headerRow.height = 28;

  // שורת לכל פרק - עם נוסחה לגיליון של הפרק
  let row = 6;
  const sumFormulas: string[] = [];

  data.sections.forEach((section, idx) => {
    const ref = sectionRowMap.get(section.id);
    if (!ref) return;

    const isAlt = idx % 2 === 1;
    const fillColor = isAlt ? COLORS.GRAY_LIGHT : COLORS.WHITE;

    const numCell = sheet.getCell(`A${row}`);
    numCell.value = idx + 1;
    numCell.font = { name: FONT_NAME, size: 11 };
    numCell.alignment = { horizontal: "center", vertical: "middle" };
    numCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };

    const nameCell = sheet.getCell(`B${row}`);
    // קישור היפר ל-גיליון הפרק
    nameCell.value = {
      text: section.name,
      hyperlink: `#'${ref.sheet}'!A1`,
    };
    nameCell.font = { name: FONT_NAME, size: 11, bold: true, color: { argb: COLORS.BLUE }, underline: true };
    nameCell.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
    nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };

    // נוסחה שמושכת מגיליון הפרק
    const formula = `SUM('${ref.sheet}'!F${ref.startRow}:F${ref.endRow})`;
    const totalCell = sheet.getCell(`C${row}`);
    totalCell.value = { formula };
    totalCell.font = { name: FONT_NAME, size: 11, bold: true };
    totalCell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    totalCell.numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
    totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } };

    sumFormulas.push(`C${row}`);
    sheet.getRow(row).height = 24;
    row++;
  });

  // שורות סיכום
  row += 1;
  const subTotalRow = row;

  // סה"כ ללא מע"מ
  sheet.mergeCells(`A${row}:B${row}`);
  const subLabel = sheet.getCell(`A${row}`);
  subLabel.value = 'סה"כ לפני מע"מ';
  subLabel.font = { name: FONT_NAME, size: 12, bold: true };
  subLabel.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
  subLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.YELLOW_LIGHT } };

  const subValue = sheet.getCell(`C${row}`);
  subValue.value = { formula: sumFormulas.length > 0 ? sumFormulas.join("+") : "0" };
  subValue.font = { name: FONT_NAME, size: 12, bold: true };
  subValue.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  subValue.numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
  subValue.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.YELLOW_LIGHT } };
  sheet.getRow(row).height = 28;
  row++;

  // מע"מ
  sheet.mergeCells(`A${row}:B${row}`);
  const vatLabel = sheet.getCell(`A${row}`);
  vatLabel.value = 'מע"מ 18%';
  vatLabel.font = { name: FONT_NAME, size: 11, color: { argb: COLORS.GRAY } };
  vatLabel.alignment = { horizontal: "right", vertical: "middle", indent: 1 };

  const vatValue = sheet.getCell(`C${row}`);
  vatValue.value = { formula: `C${subTotalRow}*0.18` };
  vatValue.font = { name: FONT_NAME, size: 11, color: { argb: COLORS.GRAY } };
  vatValue.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  vatValue.numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
  sheet.getRow(row).height = 24;
  row++;

  // סה"כ כולל
  sheet.mergeCells(`A${row}:B${row}`);
  const grandLabel = sheet.getCell(`A${row}`);
  grandLabel.value = 'סה"כ לתשלום (כולל מע"מ)';
  grandLabel.font = { name: FONT_NAME, size: 14, bold: true, color: { argb: COLORS.WHITE } };
  grandLabel.alignment = { horizontal: "right", vertical: "middle", indent: 1 };
  grandLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
  grandLabel.border = {
    top: { style: "medium", color: { argb: COLORS.DARK } },
    bottom: { style: "medium", color: { argb: COLORS.DARK } },
  };

  const grandValue = sheet.getCell(`C${row}`);
  grandValue.value = { formula: `C${subTotalRow}*1.18` };
  grandValue.font = { name: FONT_NAME, size: 16, bold: true, color: { argb: COLORS.WHITE } };
  grandValue.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  grandValue.numFmt = '_-[$₪-40D]* #,##0_-;[Red]-[$₪-40D]* #,##0_-;_-[$₪-40D]* "-"_-;_-@_-';
  grandValue.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.DARK } };
  grandValue.border = {
    top: { style: "medium", color: { argb: COLORS.DARK } },
    bottom: { style: "medium", color: { argb: COLORS.DARK } },
  };
  sheet.getRow(row).height = 38;
}
