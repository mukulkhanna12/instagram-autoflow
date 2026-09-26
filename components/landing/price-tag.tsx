"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Currency = "INR" | "USD";
const KEY = "autoflow.currency";
const EVENT = "autoflow:currency";

/** ₹ for visitors in India (by their timezone), $ for everyone else — until they choose. */
function initialCurrency(): Currency {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === "INR" || saved === "USD") return saved;
  } catch {}
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  return tz === "Asia/Kolkata" || tz === "Asia/Calcutta" ? "INR" : "USD";
}

function useCurrency(): [Currency, (c: Currency) => void] {
  const [cur, setCur] = useState<Currency>("USD");
  useEffect(() => {
    setCur(initialCurrency());
    const on = (e: Event) => setCur((e as CustomEvent<Currency>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const set = (c: Currency) => {
    try { window.localStorage.setItem(KEY, c); } catch {}
    window.dispatchEvent(new CustomEvent(EVENT, { detail: c }));
  };
  return [cur, set];
}

/** The ₹ / $ switch at the top of Pricing. */
export function CurrencySwitch() {
  const [cur, set] = useCurrency();
  return (
    <div className="inline-flex rounded-full bg-white p-1 ring-1 ring-black/5 text-sm font-bold" role="radiogroup" aria-label="Currency">
      {(["INR", "USD"] as const).map((c) => (
        <button
          key={c}
          role="radio"
          aria-checked={cur === c}
          onClick={() => set(c)}
          className={cn("h-9 px-4 rounded-full cursor-pointer transition-colors", cur === c ? "bg-brand-900 text-white" : "text-gray-500 hover:text-gray-900")}
        >
          {c === "INR" ? "₹ INR" : "$ USD"}
        </button>
      ))}
    </div>
  );
}

/** A price in the chosen currency. */
export function Price({ inr, usd, className }: { inr: number; usd: number; className?: string }) {
  const [cur] = useCurrency();
  const text = cur === "INR" ? `₹${inr.toLocaleString("en-IN")}` : `$${usd.toLocaleString("en-US")}`;
  return <span className={className}>{text}</span>;
}
