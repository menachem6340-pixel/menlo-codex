import { PDFDocument } from "pdf-lib";
import path from "path";
import fs from "fs/promises";

/**
 * ממזג את הצעת המחיר עם הבלאנק/לטרהד של העסק.
 * הצעת המחיר תופיע מעל רקע הבלאנק.
 *
 * אם אין letterhead.pdf בתיקיית public, מחזיר את ה-PDF המקורי כמו שהוא.
 */
export async function mergeWithLetterhead(quotePdfBytes: Buffer): Promise<Buffer> {
  const letterheadPath = path.join(process.cwd(), "public", "letterhead.pdf");

  let letterheadBytes: Buffer;
  try {
    letterheadBytes = await fs.readFile(letterheadPath);
  } catch {
    // אין בלאנק - החזר את ההצעה כמו שהיא
    return quotePdfBytes;
  }

  const quoteDoc = await PDFDocument.load(quotePdfBytes);
  const letterheadDoc = await PDFDocument.load(letterheadBytes);
  const letterheadPage = letterheadDoc.getPages()[0];
  if (!letterheadPage) return quotePdfBytes;

  // מזג: לכל דף בהצעה, הטמע את הבלאנק כרקע
  const result = await PDFDocument.create();
  const embeddedLetterhead = await result.embedPage(letterheadPage);
  const quotePages = await result.copyPages(quoteDoc, quoteDoc.getPageIndices());

  for (const quotePage of quotePages) {
    const newPage = result.addPage([quotePage.getWidth(), quotePage.getHeight()]);
    const { width: sourceWidth, height: sourceHeight } = letterheadPage.getSize();
    const pageWidth = newPage.getWidth();
    const pageHeight = newPage.getHeight();
    const scale = Math.max(pageWidth / sourceWidth, pageHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;

    // הצב את הבלאנק כרקע (שכבה תחתונה)
    newPage.drawPage(embeddedLetterhead, {
      x: (pageWidth - width) / 2,
      y: (pageHeight - height) / 2,
      width,
      height,
    });
    // הצב את תוכן ההצעה מעל
    const embeddedQuote = await result.embedPage(quotePage);
    newPage.drawPage(embeddedQuote, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });
  }

  const merged = await result.save();
  return Buffer.from(merged);
}
