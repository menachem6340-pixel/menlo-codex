import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { APP_BRAND_NAME, APP_BRAND_TAGLINE } from "@/lib/brand";
import {
  FileText,
  Calculator,
  Briefcase,
  Users,
  Truck,
  HardHat,
} from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "ניתוח תכניות חכם",
    description: "העלה PDF של תכנית, AI מזהה חדרים, שטחים וכמויות אוטומטית",
  },
  {
    icon: Calculator,
    title: "כתבי כמויות והצעות מחיר",
    description: "הפקה אוטומטית עם מחירון דקל + המחירון האישי שלך",
  },
  {
    icon: Briefcase,
    title: "ניהול פרויקטים",
    description: "לוחות זמנים, תקציבים, משימות, תמונות מהשטח",
  },
  {
    icon: Users,
    title: "ניהול לקוחות",
    description: "CRM, היסטוריית פרויקטים, תקשורת ותשלומים",
  },
  {
    icon: Truck,
    title: "ספקים והשוואת מחירים",
    description: "הזמנות, השוואת מחירים, ניהול קטלוג מוצרים",
  },
  {
    icon: HardHat,
    title: "בעלי מקצוע",
    description: "מאגר חשמלאים, אינסטלטורים, טייחים - לפי אזור ודירוג",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[var(--color-brand-yellow)]/30 via-white to-[var(--color-brand-blue)]/15 px-4 py-12 sm:py-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-7 inline-flex flex-col items-center gap-3 sm:flex-row-reverse sm:gap-4">
            <Image
              src="/logo-full.svg"
              alt="מנלו בנייה"
              width={260}
              height={98}
              priority
              className="h-auto w-56 max-w-full object-contain sm:w-64"
            />
            <div className="text-center sm:text-right">
              <p className="text-3xl font-extrabold text-[var(--color-brand-dark)] sm:text-4xl">
                {APP_BRAND_NAME}
              </p>
              <p className="mt-1 text-sm font-medium text-neutral-500 sm:text-base">
                {APP_BRAND_TAGLINE}
              </p>
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--color-brand-dark)] mb-4 leading-tight">
            כל העסק שלך,
            <br />
            במקום אחד
          </h1>
          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-neutral-600 mb-8">
            {APP_BRAND_TAGLINE} חכמה - מתכנית ועד חשבונית. AI שמנתח
            תכניות, מחשב כמויות, מפיק הצעות מחיר מקצועיות.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/signup">
              <Button size="lg" className="text-base">
                התחל בחינם
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-base">
                כבר יש לי חשבון
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-3">
            הכל במערכת אחת
          </h2>
          <p className="text-center text-neutral-600 mb-12">
            6 מודולים שמחליפים את כל הכלים שאתה משתמש בהם היום
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl bg-white p-6 border border-neutral-200 hover:shadow-lg transition-shadow"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-brand-yellow)]/20 text-[var(--color-brand-blue)]">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-neutral-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-8 px-4 text-center text-sm text-neutral-500">
        © {new Date().getFullYear()} {APP_BRAND_NAME} - כל הזכויות שמורות
      </footer>
    </main>
  );
}
