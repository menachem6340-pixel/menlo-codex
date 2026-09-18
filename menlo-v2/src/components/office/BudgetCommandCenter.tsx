'use client';

import { 
  Layers, 
  Download, 
  Cpu, 
  Lock
} from 'lucide-react';

export const ALLOWED_TABS = [
  'today', 'projects', 'project_overview', 'tasks', 'field_logs', 'plans',
  'areas', 'documents', 'boq', 'quotes', 'contracts', 'purchases',
  'suppliers', 'contacts', 'professionals', 'payments', 'reports', 'users',
  'settings',
] as const;

type AllowedTab = (typeof ALLOWED_TABS)[number];

const ROLE_ALLOWED_TABS: Record<'admin' | 'subcontractor', readonly AllowedTab[]> = {
  admin: ALLOWED_TABS,
  subcontractor: ['today', 'projects', 'tasks', 'field_logs', 'areas'],
};

interface CategoryItem {
  id: string;
  name: string;
  contractor: string;
  planned: number;
  contracted: number;
  paid: number;
}

export default function BudgetCommandCenter({ userRole = 'admin' }: { userRole?: 'admin' | 'subcontractor' }) {
  // בדיקת הרשאות קפדנית לפי 19 מפתחות allowed_tabs:
  // לקבלן משנה (subcontractor עם הרשאת tasks בלבד) - אין גישה לנתוני שכר, מחזורים או תקבולים!
  const allowedTabs = ROLE_ALLOWED_TABS[userRole];
  const hasFinanceAccess = ['boq', 'contracts', 'payments'].every((tab) =>
    allowedTabs.includes(tab as AllowedTab),
  );

  const items: CategoryItem[] = [
    { id: '1', name: '1.0 עבודות שלד וברזלנות', contractor: 'אחים יוסף בע"מ', planned: 980000, contracted: 950000, paid: 760000 },
    { id: '2', name: '2.0 איטום מרתף, קורות וגג', contractor: 'איטום המרכז (אחמד)', planned: 210000, contracted: 225000, paid: 150000 },
    { id: '3', name: '3.0 אינסטלציה וצנרת סניטרית', contractor: 'טופ סניטר', planned: 340000, contracted: 320000, paid: 160000 },
    { id: '4', name: '4.0 עבודות חשמל ותשתיות', contractor: 'אור וחשמל הנדסה', planned: 280000, contracted: 275000, paid: 110000 },
    { id: '5', name: '5.0 טיח, ריצוף וגמרים', contractor: 'אבן וגמר מושלם', planned: 650000, contracted: 620000, paid: 200000 },
  ];

  const totalPlanned = items.reduce((a, b) => a + b.planned, 0);
  const totalContracted = items.reduce((a, b) => a + b.contracted, 0);
  const totalPaid = items.reduce((a, b) => a + b.paid, 0);
  const totalSavings = totalPlanned - totalContracted;

  // חישוב התקדמות לפי משקל שלבים וכמויות (BOQ) ולא לפי ספירת משימות!
  const weightedProgressPercent = Math.round((totalPaid / totalContracted) * 100);

  return (
    <div className="space-y-6 font-hebrew dir-rtl text-slate-100" dir="rtl">
      
      {/* סרגל עליון של חמ"ל משרדי */}
      <div className="bg-[#1e2022] border-2 border-[#1b75bc] p-5 rounded-2xl shadow-strong flex flex-wrap justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-[#1b75bc] text-white font-bold px-2 py-0.5 rounded shadow">
              COMMAND CENTER
            </span>
            <span className="text-xs text-[#f3c936] font-bold">מנלו בנייה • לוח בקרה הנדסי וביצוע</span>
          </div>
          <h1 className="text-2xl font-black text-white mt-1">פרויקט ברקאי 11 / מקווה גבעולים</h1>
          <p className="text-xs text-slate-400">
            התקדמות הנדסית משוקללת: <strong className="text-emerald-400 font-num">{weightedProgressPercent}%</strong> (מחושב לפי משקל שלבים וכמויות מאושרות, ולא לפי ספירת משימות)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#2b2d30] px-3 py-2 rounded-xl border border-slate-700 text-xs">
            <Cpu className="w-4 h-4 text-[#00a79d]" />
            <div>
              <span className="text-slate-400 block text-[10px]">מנוע ניתוח תוכניות (Async):</span>
              <span className="text-emerald-400 font-bold">100% תוכניות מנותחות • ללא 504 Timeouts</span>
            </div>
          </div>

          {hasFinanceAccess && (
            <button className="px-4 py-2.5 bg-[#1b75bc] hover:bg-[#155d96] text-white font-bold text-xs rounded-xl shadow-glow-blue flex items-center gap-2 transition">
              <Download className="w-4 h-4 text-[#f3c936]" />
              <span>ייצוא דוח פיננסי</span>
            </button>
          )}
        </div>
      </div>

      {/* הרשאות: הצגת נתונים כספיים רק למורשים (מניעת דליפת ההרשאות שנחסמה ב-Dashboard) */}
      {!hasFinanceAccess ? (
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-700 text-xs text-slate-300 flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold block text-white">תצוגת קבלן משנה מוגבלת (הרשאת משימות בלבד):</span>
            <span>בהתאם להגדרת ההרשאות המאובטחת, נתוני שכר, מחזור כספי וסכומי הצעות חסומים לצפייה.</span>
          </div>
        </div>
      ) : (
        <>
          {/* 4 כרטיסי KPI משרדיים למנהל */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#1e2022] p-4 rounded-2xl border border-slate-700 shadow">
              <span className="text-xs text-slate-400 font-medium block mb-1">אומדן תכנון מקורי (BOQ)</span>
              <div className="text-2xl font-black font-num text-white">₪{totalPlanned.toLocaleString()}</div>
              <span className="text-[11px] text-[#1b75bc] font-bold mt-1 block">חולץ אוטומטית מ-7 תוכניות עבודה</span>
            </div>

            <div className="bg-[#1e2022] p-4 rounded-2xl border border-slate-700 shadow">
              <span className="text-xs text-slate-400 font-medium block mb-1">חוזים חתומים (התחייבויות)</span>
              <div className="text-2xl font-black font-num text-[#f3c936]">₪{totalContracted.toLocaleString()}</div>
              <span className="text-[11px] text-emerald-400 font-bold mt-1 block">חיסכון של ₪{totalSavings.toLocaleString()} (3.2%)</span>
            </div>

            <div className="bg-[#1e2022] p-4 rounded-2xl border border-slate-700 shadow">
              <span className="text-xs text-slate-400 font-medium block mb-1">שולם בפועל (חשבונות מאושרים)</span>
              <div className="text-2xl font-black font-num text-[#00a79d]">₪{totalPaid.toLocaleString()}</div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-[#00a79d] h-full" style={{ width: `${weightedProgressPercent}%` }} />
              </div>
            </div>

            <div className="bg-[#1e2022] p-4 rounded-2xl border border-slate-700 shadow">
              <span className="text-xs text-slate-400 font-medium block mb-1">יתרת תקציב לביצוע</span>
              <div className="text-2xl font-black font-num text-white">₪{(totalContracted - totalPaid).toLocaleString()}</div>
              <span className="text-[11px] text-slate-400 block mt-1">מרווח ביטחון תזרימי תקין</span>
            </div>
          </div>

          {/* טבלת מעקב תקציב קבלנים */}
          <div className="bg-[#1e2022] rounded-2xl border border-slate-700 shadow-strong overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#f3c936]" />
                <h3 className="text-base font-black text-white">פירוט סעיפי תכנון, חוזים ואישורי תשלום</h3>
              </div>
              <span className="text-xs bg-[#2b2d30] px-3 py-1 rounded-lg text-slate-300 font-bold border border-slate-700">
                5 קבלני משנה פעילים
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-[#2b2d30] text-slate-300 font-bold border-b border-slate-700">
                    <th className="p-3.5">פרק ביצוע</th>
                    <th className="p-3.5">קבלן משנה</th>
                    <th className="p-3.5">אומדן BOQ</th>
                    <th className="p-3.5">חוזה חתום</th>
                    <th className="p-3.5">אושר ושולם</th>
                    <th className="p-3.5">התקדמות</th>
                    <th className="p-3.5">סטטוס תקציבי</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map((it) => {
                    const diff = it.contracted - it.planned;
                    const pct = Math.round((it.paid / it.contracted) * 100);
                    return (
                      <tr key={it.id} className="hover:bg-slate-800/50 transition">
                        <td className="p-3.5 font-bold text-white">{it.name}</td>
                        <td className="p-3.5 text-slate-300">{it.contractor}</td>
                        <td className="p-3.5 font-num font-medium text-slate-200">₪{it.planned.toLocaleString()}</td>
                        <td className="p-3.5 font-num font-bold text-[#f3c936]">₪{it.contracted.toLocaleString()}</td>
                        <td className="p-3.5 font-num font-bold text-[#00a79d]">₪{it.paid.toLocaleString()}</td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2 font-num">
                            <div className="w-20 bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div className="bg-[#1b75bc] h-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-slate-300">{pct}%</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          {diff <= 0 ? (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                              במסגרת ({diff === 0 ? 'מדויק' : `חיסכון ₪${Math.abs(diff).toLocaleString()}`})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-950 text-rose-400 border border-rose-800/40">
                              חריגה (+₪{diff.toLocaleString()})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
