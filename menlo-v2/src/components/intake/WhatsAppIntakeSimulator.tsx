'use client';

import { useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, MapPin, MessageCircle, Send } from 'lucide-react';

type CreatedTask = { title: string; area: string; dueDate: string };

const areas = [
  'בור טבילה ומשקעי מים (-1)',
  'חדר הכנה וטבילה מס 1',
  'מערכת חימום וחדר מכונות',
  'לובי כניסה ומבואת קהל',
];

export default function WhatsAppIntakeSimulator({
  onTaskCreated,
}: {
  onTaskCreated: (task: CreatedTask) => void;
}) {
  const tomorrow = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  }, []);
  const [title, setTitle] = useState('שולח תמונות');
  const [area, setArea] = useState('');
  const [dueDate, setDueDate] = useState(tomorrow);
  const [created, setCreated] = useState(false);

  const canCreate = title.trim().length > 2 && area.length > 0 && dueDate.length > 0;

  function createTask() {
    if (!canCreate) return;
    onTaskCreated({ title: title.trim(), area, dueDate });
    setCreated(true);
  }

  return (
    <section className="rounded-2xl border border-emerald-500/40 bg-[#1e2022] p-4 shadow-sm" aria-labelledby="whatsapp-intake-title">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-400"><MessageCircle className="h-5 w-5" /></div>
          <div>
            <h3 id="whatsapp-intake-title" className="text-sm font-black text-white">קליטת WhatsApp חכמה</h3>
            <p className="text-[11px] text-slate-400">המערכת משלימה את שתי השאלות שחסרות לפני פתיחת משימה.</p>
          </div>
        </div>
        <span className="rounded bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-300">INTAKE</span>
      </div>

      <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
        <label className="block text-xs font-bold text-slate-300">
          ההודעה שהתקבלה
          <input value={title} onChange={(event) => { setTitle(event.target.value); setCreated(false); }} className="mt-1 min-h-14 w-full rounded-xl border border-slate-700 bg-[#2b2d30] px-3 text-white" />
        </label>

        <label className="block text-xs font-bold text-slate-300">
          <span className="mb-1 flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#f3c936]" />לאיזה אזור?</span>
          <select value={area} onChange={(event) => { setArea(event.target.value); setCreated(false); }} className="min-h-14 w-full rounded-xl border border-slate-700 bg-[#2b2d30] px-3 text-white">
            <option value="">בחר אזור בפרויקט…</option>
            {areas.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className="block text-xs font-bold text-slate-300">
          <span className="mb-1 flex items-center gap-1.5"><CalendarClock className="h-4 w-4 text-[#1b75bc]" />עד מתי?</span>
          <input type="date" value={dueDate} onChange={(event) => { setDueDate(event.target.value); setCreated(false); }} className="min-h-14 w-full rounded-xl border border-slate-700 bg-[#2b2d30] px-3 text-white" />
        </label>

        <button type="button" onClick={createTask} disabled={!canCreate} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-black text-white transition enabled:hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
          <Send className="h-5 w-5" />צור משימה מלאה
        </button>

        {created ? <p role="status" className="flex items-center gap-2 text-xs font-bold text-emerald-400"><CheckCircle2 className="h-4 w-4" />המשימה נוצרה עם אזור ותאריך יעד.</p> : null}
      </div>
    </section>
  );
}
