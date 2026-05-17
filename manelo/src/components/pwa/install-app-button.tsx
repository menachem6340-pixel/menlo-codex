"use client";

import { useEffect, useState } from "react";
import { Download, MonitorDown, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

interface InstallAppButtonProps {
  className?: string;
  compact?: boolean;
}

export function InstallAppButton({ className, compact = false }: InstallAppButtonProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalone(standalone);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsStandalone(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isStandalone) return null;

  async function handleInstall() {
    if (!installPrompt) {
      setShowHelp((value) => !value);
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice.catch(() => undefined);
    setInstallPrompt(null);
  }

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <Button
        type="button"
        size={compact ? "sm" : "lg"}
        variant="outline"
        className={cn(compact ? "text-sm" : "text-base")}
        onClick={handleInstall}
      >
        {compact ? <MonitorDown className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        <span>{compact ? "התקנה" : "התקן כאפליקציה"}</span>
      </Button>

      {showHelp && (
        <div className="absolute top-full z-20 mt-3 w-72 rounded-xl border border-neutral-200 bg-white p-4 text-right text-sm text-neutral-700 shadow-xl">
          <div className="mb-2 flex items-center gap-2 font-semibold text-neutral-900">
            <Smartphone className="h-4 w-4 text-[var(--color-brand-blue)]" />
            התקנה בטלפון ובמחשב
          </div>
          <p className="leading-6">
            בכרום לחץ על התפריט של הדפדפן, ואז בחר
            {" "}
            <strong>התקן אפליקציה</strong>
            {" "}
            או
            {" "}
            <strong>הוסף למסך הבית</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
