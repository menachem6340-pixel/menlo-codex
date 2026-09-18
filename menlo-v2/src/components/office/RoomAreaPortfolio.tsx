'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, Layers3, MapPin } from 'lucide-react';

type Area = {
  id: string;
  name: string;
  floor: string;
  progress: number;
  openTasks: number;
  photos: number;
  documents: number;
  status: 'תקין' | 'דורש החלטה';
};

const areas: Area[] = [
  { id: 'immersion', name: 'בור טבילה ומשקעי מים', floor: 'מרתף ‎-1', progress: 72, openTasks: 3, photos: 28, documents: 7, status: 'תקין' },
  { id: 'prep-1', name: 'חדר הכנה וטבילה 1', floor: 'קומת קרקע', progress: 54, openTasks: 5, photos: 17, documents: 4, status: 'דורש החלטה' },
  { id: 'plant', name: 'חדר מכונות ומערכת חימום', floor: 'מרתף ‎-1', progress: 38, openTasks: 6, photos: 12, documents: 9, status: 'תקין' },
  { id: 'lobby', name: 'לובי כניסה ומבואת קהל', floor: 'קומת קרקע', progress: 61, openTasks: 2, photos: 15, documents: 3, status: 'תקין' },
];

export default function RoomAreaPortfolio() {
  const [selectedId, setSelectedId] = useState(areas[0].id);
  const selected = areas.find((area) => area.id === selectedId) ?? areas[0];

  return (
    <div className="space-y-5" dir="rtl">
      <div className="rounded-2xl border-2 border-[#00a79d] bg-[#1e2022] p-5 shadow-strong">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#00a79d]/15 p-3 text-[#00a79d]"><Layers3 className="h-6 w-6" /></div>
          <div><span className="text-[11px] font-black tracking-wide text-[#f3c936]">ROOM / AREA PORTFOLIO</span><h2 className="text-xl font-black text-white">תיק חדר ואזור</h2><p className="text-xs text-slate-400">משימות, תמונות, מסמכים והתקדמות מרוכזים לפי אזור פיזי בפרויקט.</p></div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-2">
          {areas.map((area) => (
            <button key={area.id} type="button" onClick={() => setSelectedId(area.id)} className={`w-full rounded-xl border p-4 text-right transition ${selectedId === area.id ? 'border-[#1b75bc] bg-[#1b75bc]/15' : 'border-slate-700 bg-[#1e2022] hover:border-slate-500'}`}>
              <div className="flex items-start justify-between gap-2"><div><div className="font-black text-white">{area.name}</div><div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400"><MapPin className="h-3 w-3" />{area.floor}</div></div><span className="font-num text-sm font-black text-[#f3c936]">{area.progress}%</span></div>
            </button>
          ))}
        </div>

        <section className="rounded-2xl border border-slate-700 bg-[#1e2022] p-5" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700 pb-4">
            <div><p className="text-xs text-slate-400">אזור נבחר</p><h3 className="text-2xl font-black text-white">{selected.name}</h3><p className="text-xs text-slate-400">{selected.floor}</p></div>
            <span className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-bold ${selected.status === 'תקין' ? 'border-emerald-700 bg-emerald-950 text-emerald-400' : 'border-amber-700 bg-amber-950 text-amber-300'}`}>{selected.status === 'תקין' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{selected.status}</span>
          </div>

          <div className="my-5"><div className="mb-2 flex justify-between text-xs font-bold"><span className="text-slate-300">התקדמות משוקללת באזור</span><span className="font-num text-[#00a79d]">{selected.progress}%</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-gradient-to-l from-[#00a79d] to-[#1b75bc]" style={{ width: `${selected.progress}%` }} /></div></div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-[#2b2d30] p-4 text-center"><AlertTriangle className="mx-auto mb-1 h-5 w-5 text-[#f3c936]" /><div className="font-num text-xl font-black text-white">{selected.openTasks}</div><div className="text-[11px] text-slate-400">משימות פתוחות</div></div>
            <div className="rounded-xl bg-[#2b2d30] p-4 text-center"><ImageIcon className="mx-auto mb-1 h-5 w-5 text-[#1b75bc]" /><div className="font-num text-xl font-black text-white">{selected.photos}</div><div className="text-[11px] text-slate-400">תמונות שטח</div></div>
            <div className="rounded-xl bg-[#2b2d30] p-4 text-center"><FileText className="mx-auto mb-1 h-5 w-5 text-[#00a79d]" /><div className="font-num text-xl font-black text-white">{selected.documents}</div><div className="text-[11px] text-slate-400">מסמכים ותוכניות</div></div>
          </div>
        </section>
      </div>
    </div>
  );
}
