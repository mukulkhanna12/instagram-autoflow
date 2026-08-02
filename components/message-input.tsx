"use client";
import React, { useRef, useState } from "react";
import { Type } from "lucide-react";
import { cn } from "@/lib/utils";

// The merge tags we can actually fill from an Instagram commenter's profile.
// (No email/phone — Instagram doesn't expose those, so we don't offer tokens
// that would never resolve.)
const VARIABLES = [
  { label: "First Name", token: "first_name" },
  { label: "Last Name", token: "last_name" },
  { label: "Full Name", token: "full_name" },
  { label: "Username", token: "username" },
];

interface Props {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  rows?: number;
  hint?: string;
  placeholder?: string;
}

/**
 * A textarea that offers a variable picker when you type "{" — ManyChat-style.
 * Selecting a variable inserts a {{token}} at the cursor. Supports arrow keys +
 * Enter, Escape to dismiss, and filtering by what you type after the brace.
 */
export function MessageInput({ label, value, onChange, disabled, rows = 3, hint, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [menu, setMenu] = useState<{ query: string; start: number; index: number } | null>(null);

  const filtered = menu
    ? VARIABLES.filter(
        (v) =>
          v.label.toLowerCase().includes(menu.query.toLowerCase()) ||
          v.token.includes(menu.query.toLowerCase().replace(/\s+/g, "_"))
      )
    : [];

  // Is the user mid-way through typing a {{tag}} just before the caret?
  function detectTrigger(text: string, caret: number) {
    const before = text.slice(0, caret);
    const m = before.match(/\{\{?([\w ]*)$/); // "{" or "{{" then word/space chars
    if (!m) return null;
    return { query: m[1], start: caret - m[0].length };
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value;
    onChange(text);
    const caret = e.target.selectionStart ?? text.length;
    const trig = detectTrigger(text, caret);
    setMenu(trig ? { ...trig, index: 0 } : null);
  }

  function insert(token: string) {
    const el = ref.current;
    if (!el || !menu) return;
    const caret = el.selectionStart ?? value.length;
    const tag = `{{${token}}}`;
    const next = value.slice(0, menu.start) + tag + value.slice(caret);
    onChange(next);
    setMenu(null);
    requestAnimationFrame(() => {
      el.focus();
      const pos = menu.start + tag.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!menu || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMenu((m) => (m ? { ...m, index: (m.index + 1) % filtered.length } : m));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMenu((m) => (m ? { ...m, index: (m.index - 1 + filtered.length) % filtered.length } : m));
    } else if (e.key === "Enter" && menu) {
      e.preventDefault();
      insert(filtered[menu.index].token);
    } else if (e.key === "Escape") {
      setMenu(null);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <div className="relative">
        <textarea
          ref={ref}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setMenu(null), 150)}
          className={cn(
            "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 resize-none",
            "focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors",
            disabled && "bg-gray-50 text-gray-500 cursor-not-allowed"
          )}
        />
        {menu && filtered.length > 0 && !disabled && (
          <div className="absolute z-20 left-2 top-full mt-1 w-56 max-h-64 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg py-1">
            {filtered.map((v, i) => (
              <button
                key={v.token}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insert(v.token);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm text-gray-700 flex items-center gap-2.5",
                  i === menu.index ? "bg-brand-50" : "hover:bg-gray-50"
                )}
              >
                <Type className="w-4 h-4 text-gray-400 shrink-0" />
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {hint ? (
        <p className="text-xs text-gray-400">{hint}</p>
      ) : (
        !disabled && (
          <p className="text-[11px] text-gray-400">
            Type <code className="bg-gray-100 px-1 rounded">{"{"}</code> to insert a variable
          </p>
        )
      )}
    </div>
  );
}
