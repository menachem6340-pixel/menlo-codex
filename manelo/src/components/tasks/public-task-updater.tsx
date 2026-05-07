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

  async function updateStatus(newStatus: string) {
    setStatus(newStatus);
    await fetch(`/api/tasks/public/${token}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSavedMessage("הסטטוס נשמר ✓");
    setTimeout(() => setSavedMessage(null), 2000);
  }

  async function updateProgress(p: number) {
    setProgress(p);
    await fetch(`/api/tasks/public/${token}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress_pct: p }),
    });
  }

  async function toggleChecklist(itemId: string, currentDone: boolean) {
    setChecklist((prev) => prev.map((c) => (c.id === itemId ? { ...c, is_done: !currentDone } : c)));
    await fetch(`/api/tasks/public/${token}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: itemId, is_done: !currentDone }),
    });
  }

  async function addComment() {
    if (!comment.trim() || !name.trim()) return;
    setSaving(true);
    await fetch(`/api/tasks/public/${token}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment, author_name: name }),
    });
    setComment("");
    setSaving(false);
    setSavedMessage("ההערה נשלחה ✓");
    setTimeout(() => setSavedMessage(null), 2000);
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
        <div className="text-center text-sm text-green-600 font-medium">{savedMessage}</div>
      )}
    </div>
  );
}
