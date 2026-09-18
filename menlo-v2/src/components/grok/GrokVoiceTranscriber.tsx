'use client';

import React, { useState } from 'react';
import { Mic, CheckCircle, Radio, Sparkles } from 'lucide-react';

interface GrokProps {
  onDataExtracted: (data: { stage?: string; workers?: number; notes?: string }) => void;
}

export default function GrokVoiceTranscriber({ onDataExtracted }: GrokProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);

  const simulateGrokTranscription = () => {
    setIsListening(true);
    setTranscription(null);

    setTimeout(() => {
      setIsListening(false);
      const audioText = "יצקנו היום קורות קשר בקומה א', הגיעו 6 פועלים של קבלן השלד, בוצעה בדיקת שקיעת בטון סלמפ 18, יש להזמין איטום למחר בבוקר.";
      setTranscription(audioText);
      onDataExtracted({
        stage: "יציקת תקרת בטון + קורות קשר קומה א",
        workers: 6,
        notes: "בדיקת שקיעת בטון סלמפ 18 תקינה. משימה למחר: תיאום קבלן איטום.",
      });
    }, 1200);
  };

  return (
    <div className="bg-[#1e2022] p-4 rounded-2xl border border-slate-700 shadow-sm font-hebrew">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#f3c936]/10 text-[#f3c936]">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              תמלול קולי Grok Voice (xAI)
              <span className="text-[10px] bg-sky-500/20 text-sky-400 px-1.5 py-0.2 rounded font-mono">Audio API</span>
            </h4>
            <p className="text-[11px] text-slate-400">הקלטת וואטסאפ חופשית ופיענוח לשדות מובנים</p>
          </div>
        </div>

        <button
          type="button"
          onClick={simulateGrokTranscription}
          disabled={isListening}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${
            isListening
              ? 'bg-amber-500 text-slate-950 animate-pulse'
              : 'bg-[#1b75bc] text-white hover:bg-[#155d96] shadow-glow-blue'
          }`}
        >
          {isListening ? (
            <>
              <Radio className="w-3.5 h-3.5 animate-spin" />
              <span>Grok מקשיב...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-[#f3c936]" />
              <span>הדמה הודעת שטח</span>
            </>
          )}
        </button>
      </div>

      {transcription && (
        <div className="mt-3 p-3 bg-[#2b2d30] rounded-xl border border-slate-700 text-xs space-y-2">
          <div className="text-slate-300">
            <span className="font-bold text-[#f3c936] block mb-0.5">תמלול גולמי מקורי:</span>
            ״{transcription}״
          </div>
          <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>השדות (שלב, 6 פועלים, ובדיקת מעבדה) חולצו ועודכנו בטופס אוטומטית</span>
          </div>
        </div>
      )}
    </div>
  );
}
