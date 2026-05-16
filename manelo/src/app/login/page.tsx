"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";
import { APP_BRAND_NAME, APP_BRAND_TAGLINE } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--color-brand-yellow)]/20 via-neutral-50 to-[var(--color-brand-blue)]/10 p-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-neutral-200">
          <div className="mb-8 flex flex-col items-center text-center">
            <Logo variant="full" size={78} className="mb-3 w-[210px] max-w-full" />
            <p className="text-lg font-extrabold text-[var(--color-brand-dark)]">
              {APP_BRAND_NAME}
            </p>
            <p className="text-sm text-neutral-500">
              {APP_BRAND_TAGLINE}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="אימייל"
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              dir="ltr"
              className="text-right"
            />

            <Input
              label="סיסמה"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={6}
            />

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "מתחבר..." : "כניסה"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-neutral-600">
            אין לך חשבון?{" "}
            <Link
              href="/signup"
              className="font-semibold text-[var(--color-brand-blue)] hover:underline"
            >
              הירשם עכשיו
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} {APP_BRAND_NAME} - כל הזכויות שמורות
        </p>
      </div>
    </main>
  );
}

function translateAuthError(message: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "אימייל או סיסמה שגויים",
    "Email not confirmed": "האימייל לא אומת - בדוק את תיבת המייל שלך",
    "User not found": "משתמש לא נמצא",
  };
  return map[message] || `שגיאה: ${message}`;
}
