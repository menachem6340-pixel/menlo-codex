import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicKey } from "@/lib/env";

const SYSTEM_PROMPT = `אתה מומחה לחילוץ פרטי קשר מטקסט בעברית.
תפקידך לקרוא טקסט (לרוב מוואטסאפ) ולזהות אנשים שונים שמופיעים בו, יחד עם הפרטים שלהם.

חשוב:
- כל אדם נפרד = רשומה נפרדת
- אם אדם מופיע פעמיים - מזג את הפרטים לרשומה אחת
- חלץ אך ורק מידע שמופיע בטקסט - אל תמציא
- מספרי טלפון: שמור בפורמט המקורי (לדוגמא 050-1234567)
- אם משהו לא ברור - השאר ריק

החזר תוצאה כ-JSON בלבד, ללא טקסט מסביב, במבנה:
{
  "contacts": [
    {
      "name": "משה כהן",
      "phone": "050-1234567",
      "email": "moshe@example.com",
      "address": "רחוב הרצל 12",
      "city": "רעננה",
      "notes": "מעוניין בשיפוץ דירה - להגיע מחר"
    }
  ]
}

אם אין אנשים שמזוהים - החזר {"contacts": []}`;

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text: string };
    if (!text || text.trim().length < 10) {
      return NextResponse.json({ error: "טקסט קצר מדי" }, { status: 400 });
    }

    const apiKey = getAnthropicKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "מפתח AI לא מוגדר" },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    });

    const textBlock = message.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "תגובה ריקה מ-AI" }, { status: 500 });
    }

    const cleaned = textBlock.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as {
      contacts: Array<{
        name: string;
        phone?: string;
        email?: string;
        address?: string;
        city?: string;
        notes?: string;
      }>;
    };

    return NextResponse.json({ contacts: parsed.contacts });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
