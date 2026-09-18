'use client';

import React, { useState } from 'react';
import { Camera, Send, Users, CheckCircle2, ShieldCheck, MapPin, Calendar } from 'lucide-react';
import GrokVoiceTranscriber from '../grok/GrokVoiceTranscriber';
import WhatsAppIntakeSimulator from '../intake/WhatsAppIntakeSimulator';

interface SubcontractorAttendance {
  trade: string;
  workerCount: number;
}

export default function FieldDailyLog() {
  const [stage, setStage] = useState('יציקת תקרת בטון + קורות קשר קומה א');
  const [selectedArea, setSelectedArea] = useState('בור טבילה ומשקעי מים (-1)');
  const [dueDate, setDueDate] = useState('2026-09-19');
  const [notes, setNotes] = useState('');
  const [workers, setWorkers] = useState<SubcontractorAttendance[]>([
    { trade: 'שלד וברזלנות (אחים יוסף)', workerCount: 6 },
    { trade: 'איטום קירות וגגות (אחמד)', workerCount: 3 },
    { trade: 'אינסטלציה וצנרת סמויה', workerCount: 2 },
    { trade: 'חשמל ותשתיות לוח', workerCount: 0 },
  ]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleWorkerDelta = (index: number, delta: number) => {
    setWorkers(prev => {
      const updated = prev.map((worker) => ({ ...worker }));
      updated[index].workerCount = Math.max(0, updated[index].workerCount + delta);
      return updated;
    });
  };

  const handleGrokParsedData = (data: { stage?: string; workers?: number; notes?: string }) => {
    if (data.stage) setStage(data.stage);
    if (data.notes) setNotes(prev => prev ? `${prev}\n${data.notes}` : data.notes!);
    if (data.workers) {
      setWorkers(prev => {
        const updated = prev.map((worker) => ({ ...worker }));
        updated[0].workerCount = data.workers!;
        return updated;
      });
    }
  };

  const handleTaskCreatedFromIntake = (task: { title: string; area: string; dueDate: string }) => {
    setSelectedArea(task.area);
    setNotes(prev => `משימה מוואטסאפ: ${task.title} (יעד: ${task.dueDate})\n${prev}`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const totalWorkers = workers.reduce((acc, curr) => acc + curr.workerCount, 0);

  return (
    <div className="max-w-md mx-auto space-y-4 font-hebrew dir-rtl text-slate-100 pb-20" dir="rtl">
      
      {/* כותרת שטח בנוכחות חזקה */}
      <div className="bg-[#414042] border-2 border-[#1b75bc] p-4 rounded-2xl shadow-strong flex justify-between items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2 h-full bg-[#f3c936]"></div>
        <div className="mr-2">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#f3c936] text-slate-950 font-black px-2 py-0.5 rounded shadow-sm tracking-wider">
              MENLO FIELD
            </span>
            <span className="text-xs text-slate-300 font-bold">דיווח וקליטת שטח</span>
          </div>
          <h2 className="text-xl font-black text-white mt-1">יומן עבודה וקליטת משימות</h2>
          <p className="text-xs text-slate-300">פרויקט: רחוב ברקאי 11, רמת גן</p>
        </div>
        <div className="text-left font-num text-xs bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-700">
          <div className="font-bold text-[#f3c936]">18/09/2026</div>
          <div className="text-slate-400 text-[10px]">31°C • בהיר</div>
        </div>
      </div>

      {/* סימולטור קליטת הוואטסאפ שפותר את השאלה החסרה */}
      <WhatsAppIntakeSimulator onTaskCreated={handleTaskCreatedFromIntake} />

      {/* תמלול שטח קולי מבוסס Grok */}
      <GrokVoiceTranscriber onDataExtracted={handleGrokParsedData} />

      <form onSubmit={handleSave} className="space-y-4">
        
        {/* שיוך לאזור מוגדר (project_areas) ותאריך יעד */}
        <div className="bg-[#1e2022] p-4 rounded-2xl border border-slate-700 shadow-sm space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#f3c936]" />
              <span>אזור עבודה בפרויקט (project_areas):</span>
            </label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-700 bg-[#2b2d30] text-white text-xs font-bold focus:border-[#1b75bc] outline-none"
            >
              <option value="בור טבילה ומשקעי מים (-1)">בור טבילה ומשקעי מים (קומת מרתף -1)</option>
              <option value="חדר הכנה וטבילה מס 1">חדר הכנה וטבילה מס 1 (קומת קרקע 0)</option>
              <option value="מערכת חימום וחדר מכונות">מערכת חימום וחדר מכונות (מרתף -1)</option>
              <option value="לובי כניסה ומבואת קהל">לובי כניסה ומבואת קהל</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1b75bc]" />
              <span>תאריך יעד לביצוע (due_date - מונע משימות אבודות):</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-700 bg-[#2b2d30] text-white text-xs font-bold focus:border-[#1b75bc] outline-none font-num"
            />
          </div>
        </div>

        {/* שלב ביצוע באתר */}
        <div className="bg-[#1e2022] p-4 rounded-2xl border border-slate-700 shadow-sm">
          <label className="block text-xs font-bold text-slate-300 mb-2">שלב ביצוע הנדסי פעיל</label>
          <select 
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full p-3.5 rounded-xl border border-slate-700 bg-[#2b2d30] text-white text-xs font-bold focus:border-[#1b75bc] outline-none"
          >
            <option value="יציקת תקרת בטון + קורות קשר קומה א">יציקת תקרת בטון + קורות קשר קומה א</option>
            <option value="הנחת ברזל עליון ובדיקת קונסטרוקטור">הנחת ברזל עליון ובדיקת קונסטרוקטור</option>
            <option value="איטום בהתזה ביטומנית דו-רכיבית">איטום בהתזה ביטומנית דו-רכיבית</option>
            <option value="הנחת צנרת מים סמויה וביוב">הנחת צנרת מים סמויה וביוב</option>
          </select>
        </div>

        {/* נוכחות בעלי מקצוע בטאץ גדול (56px) */}
        <div className="bg-[#1e2022] p-4 rounded-2xl border border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#f3c936]" />
              <h3 className="text-sm font-black text-white">נוכחות בעלי מקצוע (סה״כ: <span className="text-[#f3c936] font-num text-base">{totalWorkers}</span>)</h3>
            </div>
            <span className="text-[11px] text-slate-400">הקשה אחת לעדכון</span>
          </div>

          <div className="space-y-2">
            {workers.map((w, idx) => (
              <div key={w.trade} className="flex justify-between items-center bg-[#2b2d30] p-3 rounded-xl border border-slate-700">
                <span className="text-xs font-bold text-slate-200">{w.trade}</span>
                <div className="flex items-center gap-3 font-num">
                  <button
                    type="button"
                    onClick={() => handleWorkerDelta(idx, -1)}
                    className="w-11 h-11 rounded-xl bg-[#414042] text-white font-bold text-lg flex items-center justify-center border border-slate-600 active:bg-slate-700 shadow"
                  >
                    -
                  </button>
                  <span className="w-7 text-center font-black text-lg text-white">{w.workerCount}</span>
                  <button
                    type="button"
                    onClick={() => handleWorkerDelta(idx, 1)}
                    className="w-11 h-11 rounded-xl bg-[#f3c936] text-slate-950 font-black text-xl flex items-center justify-center active:bg-[#ffd84d] shadow-glow-amber"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* צילום ומצלמה */}
        <div className="grid grid-cols-2 gap-2">
          <label className="p-4 rounded-xl bg-[#2b2d30] border-2 border-dashed border-slate-600 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-[#1b75bc] transition active:bg-slate-800">
            <Camera className="w-6 h-6 text-[#1b75bc]" />
            <span className="text-xs font-bold text-slate-200">צלם תיעוד לאזור</span>
            <input type="file" accept="image/*" capture="environment" className="hidden" />
          </label>

          <div className="p-4 rounded-xl bg-[#2b2d30] border border-slate-700 flex flex-col justify-center text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Offline-Sync</span>
            </div>
            <p className="text-[11px] text-slate-400">נשמר במכשיר ומסתנכרן ברקע ברשת</p>
          </div>
        </div>

        {/* הערות חופשיות */}
        <div className="bg-[#1e2022] p-4 rounded-2xl border border-slate-700 shadow-sm">
          <label className="block text-xs font-bold text-slate-300 mb-2">הערות, יציקות ודגשים</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="דגשים מהשטח..."
            className="w-full p-3 rounded-xl bg-[#2b2d30] border border-slate-700 text-white text-xs focus:border-[#1b75bc] outline-none"
          />
        </div>

        {savedSuccess && (
          <div className="p-3.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>יומן השטח נשמר וסונכרן למרכז הפיקוד!</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full p-4 rounded-xl bg-gradient-to-r from-[#1b75bc] to-[#155d96] text-white font-black text-base flex items-center justify-center gap-2 shadow-glow-blue active:opacity-90 transition"
        >
          <Send className="w-5 h-5 text-[#f3c936]" />
          <span>שמור יומן עבודה יומי</span>
        </button>

      </form>
    </div>
  );
}
