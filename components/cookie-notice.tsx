"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

const KEY = "autoflow.cookies.ok";

/**
 * The cookie notice. AutoFlow only uses essential cookies — the sign-in
 * session and which workspace you're in — and no tracking or advertising
 * ones, so there's nothing to opt in or out of: this says so, once, and links
 * to the details. Dismissing it is remembered in this browser.
 */
export function CookieNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(KEY) !== "1");
    } catch {
      setShow(true);
    }
  }, []);

  function dismiss() {
    setShow(false);
    try { window.localStorage.setItem(KEY, "1"); } catch {}
  }

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Cookies"
      className="fixed z-[70] bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm rounded-3xl bg-gray-950 text-white p-5 shadow-2xl animate-pop"
    >
      <button onClick={dismiss} aria-label="Close" className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="w-9 h-9 rounded-xl bg-lime text-gray-950 flex items-center justify-center shrink-0">
          <Cookie className="w-4 h-4" />
        </span>
        <div>
          <p className="text-sm font-bold">Just the essential cookies</p>
          <p className="mt-1 text-xs leading-relaxed text-white/70">
            We only use cookies to keep you signed in and remember your workspace. No tracking, no ads.
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button onClick={dismiss} className="h-9 px-4 rounded-full bg-lime text-gray-950 text-sm font-extrabold hover:bg-lime-400 cursor-pointer">
          Got it
        </button>
        <Link href="/privacy#browser" onClick={dismiss} className="h-9 px-3 inline-flex items-center rounded-full text-sm font-semibold text-white/70 hover:text-white">
          Learn more
        </Link>
      </div>
    </div>
  );
}
