import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseBearer } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const { audioBase64 } = await req.json();

    if (!audioBase64) {
      return NextResponse.json({ error: 'Missing audio payload' }, { status: 400 });
    }

    // קריאה ל-Grok (xAI) Audio API עם הנחיות ספציפיות לענף הבנייה בישראל
    // curl https://api.x.ai/v1/audio/transcriptions
    const grokApiKey = process.env.XAI_API_KEY;
    const transcriptionUrl = process.env.XAI_TRANSCRIPTION_URL;
    const transcriptionModel = process.env.XAI_TRANSCRIPTION_MODEL;

    // במידה ואין מפתח מוגדר בסביבה המקבילה, נחזיר פיענוח מובנה להדמיה
    if (!grokApiKey || !transcriptionUrl || !transcriptionModel) {
      return NextResponse.json({
        success: true,
        source: 'grok-voice-simulation',
        transcription: "יצקנו היום קורות קשר בקומה א', הגיעו 6 פועלים של קבלן השלד, בוצעה בדיקת שקיעת בטון סלמפ 18, יש להזמין איטום למחר בבוקר.",
        parsed: {
          stage: "יציקת תקרת בטון + קורות קשר קומה א",
          workers: 6,
          trade: "שלד וברזלנות",
          qualityCheck: "בדיקת שקיעת בטון סלמפ 18 - תקין",
          nextAction: "הזמנת קבלן איטום למחר בבוקר",
        }
      });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Server authentication is not configured' }, { status: 503 });
    }

    const verified = await verifySupabaseBearer(req, supabaseUrl, serviceRoleKey);
    if (!verified) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // קריאת אמת אם קיים מפתח
    const response = await fetch(transcriptionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${grokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: transcriptionModel,
        audio: audioBase64,
        language: 'he',
      }),
    });

    const data: unknown = await response.json();
    return NextResponse.json(data, { status: response.status });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
