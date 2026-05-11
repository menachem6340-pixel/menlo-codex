"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { APP_BRAND_NAME, APP_LOGO_ICON } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          business_name: businessName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1500);
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-brand-yellow)]/20 via-neutral-50 to-[var(--color-brand-green)]/10 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          <div className="mb-4 mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-brand-green)] text-white text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-bold mb-2">נרשמת בהצלחה!</h2>
          <p className="text-neutral-600">מעביר אותך למערכת...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-brand-yellow)]/20 via-neutral-50 to-[var(--color-brand-blue)]/10 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-neutral-200">
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src={APP_LOGO_ICON}
              alt={APP_BRAND_NAME}
              width={120}
              height={120}
              className="mb-2 h-24 w-24 object-contain"
            />
            <p className="text-sm text-neutral-500">
              הרשמה חדשה - 30 שניות וסיימנו
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="שם מלא"
              type="text"
              required
              placeholder="ישראל ישראלי"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Input
              label="שם העסק"
              type="text"
              required
              placeholder={`לדוגמא: ${APP_BRAND_NAME}`}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />

            <Input
              label="אימייל"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="text-right"
            />

            <Input
              label="סיסמה"
              type="password"
              required
              placeholder="לפחות 6 תווים"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
            />

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "נרשם..." : "צור חשבון"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            כבר יש לך חשבון?{" "}
            <Link
              href="/login"
              className="font-semibold text-[var(--color-brand-blue)] hover:underline"
            >
              כניסה
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

function translateAuthError(message: string): string {
  if (message.includes("already registered")) return "האימייל כבר רשום במערכת";
  if (message.includes("Password")) return "הסיסמה צריכה להיות לפחות 6 תווים";
  if (message.includes("valid email")) return "כתובת אימייל לא תקינה";
  return `שגיאה: ${message}`;
}
