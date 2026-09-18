"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square } from "lucide-react";

interface ChecklistItem {
  id: string;
  description: string;
  is_done: boolean;
  display_order: number;
}

interface Props {
  taskId: string;
  token: string;
  currentStatus: string;
  currentProgress: number;
  checklist: ChecklistItem[];
}

const STATUS_OPTIONS = [
  { value: "not_started", label: "טרם התחלתי", color: "bg-neutral-100" },
  { value: "in_progress", label: "בעבודה כרגע", color: "bg-blue-100" },
  { value: "blocked", label: "חסום - יש בעיה", color: "bg-orange-100" },
  { value: "completed", label: "סיימתי ✓", color: "bg-green-100" },
];

export function PublicTaskUpdater({ token, currentStatus, currentProgress, checklist: initialChecklist }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [progress, setProgress] = useState(currentProgress);
  const [checklist, setChecklist] = useState(initialChecklist.sort((a, b) => a.display_order - b.display_order));
  const [comment, setComment] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function post(path: string, body: Record<string, unknown>) {
    setErrorMessage(null);
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "לא ניתן היה לשמור את העדכון");
  }

  async function updateStatus(newStatus: string) {
    const previous = status;
    setStatus(newStatus);
    setSaving(true);
    try {
      await post(`/api/tasks/public/${token}/update`, { status: newStatus });
      setSavedMessage("הסטטוס נשמר וסונכרן");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch (error) {
      setStatus(previous);
      setErrorMessage(error instanceof Error ? error.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function updateProgress(p: number) {
    const previous = progress;
    setProgress(p);
    setSaving(true);
    try {
      await post(`/api/tasks/public/${token}/update`, { progress_pct: p });
      setSavedMessage("ההתקדמות נשמרה וסונכרנה");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch (error) {
      setProgress(previous);
      setErrorMessage(error instanceof Error ? error.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function toggleChecklist(itemId: string, currentDone: boolean) {
    setChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, is_done: !currentDone } : c)));
    setSaving(true);
    try {
      await post(`/api/tasks/public/${token}/checklist`, { item_id: itemId, is_done: !currentDone });
      setSavedMessage("רשימת הבדיקה סונכרנה");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch (error) {
      setChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, is_done: currentDone } : c)));
      setErrorMessage(error instanceof Error ? error.message : "השמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function addComment() {
    if (!comment.trim() || !name.trim()) return;
    setSaving(true);
    try {
      await post(`/api/tasks/public/${token}/comment`, { body: comment, author_name: name });
      setComment("");
      setSavedMessage("ההערה נשלחה וסונכרנה");
      setTimeout(() => setSavedMessage(null), 2500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "שליחת ההערה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 border-t border-neutral-200 pt-5">
      {/* סטטוס */}
      <div>
        <label className="text-sm font-semibold text-neutral-700 mb-2 block">מה הסטטוס שלך?</label>
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateStatus(opt.value)}
              disabled={saving}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                status === opt.value
                  ? "border-[var(--color-brand-yellow)] bg-[var(--color-brand-yellow)]/20"
                  : `border-neutral-200 ${opt.color}/50 hover:border-neutral-300`
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* התקדמות */}
      <div>
        <label className="text-sm font-semibold text-neutral-700 mb-2 block">
          כמה אחוז ביצעת? <span className="text-[var(--color-brand-blue)] font-bold">{progress}%</span>
        </label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          onMouseUp={(e) => updateProgress(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => updateProgress(Number((e.target as HTMLInputElement).value))}
          className="w-full"
        />
      </div>

      {/* ציק-ליסט */}
      {checklist.length > 0 && (
        <div>
          <label className="text-sm font-semibold text-neutral-700 mb-2 block">
            רשימת בדיקה ({checklist.filter((c) => c.is_done).length}/{checklist.length})
          </label>
          <div className="space-y-1.5 bg-neutral-50 rounded-lg p-3">
            {checklist.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleChecklist(item.id, item.is_done)}
                disabled={saving}
                className="w-full flex items-center gap-2 text-sm hover:bg-white rounded p-1.5 text-right"
              >
                {item.is_done ? (
                  <CheckSquare className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Square className="h-5 w-5 text-neutral-400 shrink-0" />
                )}
                <span className={item.is_done ? "line-through text-neutral-500" : ""}>{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* הערה */}
      <div>
        <label className="text-sm font-semibold text-neutral-700 mb-2 block">שלח עדכון לקבלן</label>
        <input
          type="text"
          placeholder="שמך"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full mb-2 h-10 px-3 rounded-lg border border-neutral-300 text-sm"
        />
        <textarea
          rows={3}
          placeholder="לדוגמא: יש לי בעיה עם הצנרת, צריך עזרה..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full p-3 rounded-lg border border-neutral-300 text-sm"
        />
        <Button onClick={addComment} disabled={saving || !comment.trim() || !name.trim()} className="mt-2 w-full">
          {saving ? "שולח..." : "שלח עדכון"}
        </Button>
      </div>

      {savedMessage && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-center text-sm font-medium text-green-700">{savedMessage}</div>
      )}
      {errorMessage && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-700">
          {errorMessage}. אפשר לנסות שוב; המצב הקודם נשמר במסך.
        </div>
      )}
    </div>
  );
}
