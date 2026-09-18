'use client';

import React, { useState } from 'react';
import {
  HardHat, 
  CalendarDays, 
  FolderKanban, 
  Users, 
  DollarSign, 
  Settings, 
  Layers,
  Lock
} from 'lucide-react';
import FieldDailyLog from '@/components/field/FieldDailyLog';
import BudgetCommandCenter from '@/components/office/BudgetCommandCenter';
import RoomAreaPortfolio from '@/components/office/RoomAreaPortfolio';

export default function MenloV2Page() {
  const [activeDomain, setActiveDomain] = useState<'today' | 'projects' | 'people' | 'finance' | 'admin'>('projects');
  const [viewSubMode, setViewSubMode] = useState<'overview' | 'rooms' | 'field'>('overview');
  const [currentRole, setCurrentRole] = useState<'admin' | 'subcontractor'>('admin');

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-hebrew dir-rtl" dir="rtl">
      
      {/* סרגל עליון ראשי מבוסס מותג מנלו */}
      <header className="sticky top-0 z-50 bg-[#414042] border-b-2 border-[#1b75bc] shadow-strong">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center shadow">
              <div className="flex flex-col items-center justify-center font-black text-xs leading-none">
                <span style={{ color: '#1b75bc' }}>MENLO</span>
                <span style={{ color: '#f3c936' }}>BUILD</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">מנלו בנייה V2 — אפליקציה מקבילה עצמאית</h1>
                <span className="text-[10px] bg-[#f3c936] text-slate-950 font-black px-2 py-0.5 rounded shadow">
                  הייטקי ונוכחות חזקה
                </span>
              </div>
              <p className="text-xs text-slate-300">סביבה מבודדת לחלוטין • המערכת הראשית שמורה ללא מגע</p>
            </div>
          </div>

          {/* הדמיית אבטחה: בורר תפקיד לבדיקת allowed_tabs */}
          <div className="flex items-center gap-2 bg-[#2b2d30] px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 font-bold text-[11px]">הרשאה פעילה:</span>
            <button
              onClick={() => setCurrentRole('admin')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                currentRole === 'admin' ? 'bg-[#1b75bc] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              מנחם (מנהל מלא)
            </button>
            <button
              onClick={() => setCurrentRole('subcontractor')}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                currentRole === 'subcontractor' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>קבלן (tasks בלבד)</span>
            </button>
          </div>

          {/* 5 תחומי הליבה המאוחדים במקום 20 פריטי תפריט */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setActiveDomain('today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                activeDomain === 'today' ? 'bg-[#1b75bc] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>היום (החלטות)</span>
            </button>

            <button
              onClick={() => setActiveDomain('projects')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                activeDomain === 'projects' ? 'bg-[#1b75bc] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>פרויקטים</span>
            </button>

            <button
              onClick={() => setActiveDomain('people')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                activeDomain === 'people' ? 'bg-[#1b75bc] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>אנשים</span>
            </button>

            {currentRole === 'admin' && (
              <button
                onClick={() => setActiveDomain('finance')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                  activeDomain === 'finance' ? 'bg-[#1b75bc] text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>כספים ורכש</span>
              </button>
            )}

            <button
              onClick={() => setActiveDomain('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition ${
                activeDomain === 'admin' ? 'bg-[#1b75bc] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>ניהול ובריאות</span>
            </button>
          </nav>

        </div>
      </header>

      {/* תת-ניווט פרויקטים: סקירה, תיק אזורים, ומצב שטח */}
      <div className="bg-[#1e2022] border-b border-slate-800 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">פרויקט פעיל:</span>
            <span className="font-black text-white text-sm">פרויקט ברקאי 11 / מקווה גבעולים</span>
            <span className="bg-[#1b75bc]/20 text-[#1b75bc] font-bold px-2 py-0.5 rounded text-[11px] border border-[#1b75bc]/40">
              שלד ואיטום
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewSubMode('overview')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                viewSubMode === 'overview' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              סקירה ובקרה
            </button>

            <button
              onClick={() => setViewSubMode('rooms')}
              className={`px-3 py-1 rounded-lg font-bold transition flex items-center gap-1.5 ${
                viewSubMode === 'rooms' ? 'bg-[#1b75bc] text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#f3c936]" />
              <span>תיק חדר ואזור (project_areas)</span>
            </button>

            <button
              onClick={() => setViewSubMode('field')}
              className={`px-3 py-1 rounded-lg font-black transition flex items-center gap-1.5 ${
                viewSubMode === 'field' ? 'bg-[#f3c936] text-slate-950 shadow-glow-amber' : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>מצב שטח (קליטה ויומן)</span>
            </button>
          </div>
        </div>
      </div>

      {/* אזור תוכן מרכזי */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeDomain === 'finance' && currentRole !== 'admin' ? (
          <div className="rounded-2xl border border-amber-600/50 bg-amber-950/40 p-6 text-amber-200">
            אין הרשאה לצפייה בנתונים כספיים.
          </div>
        ) : viewSubMode === 'rooms' ? (
          <RoomAreaPortfolio />
        ) : viewSubMode === 'field' ? (
          <FieldDailyLog />
        ) : (
          <BudgetCommandCenter userRole={currentRole} />
        )}
      </main>

    </div>
  );
}
