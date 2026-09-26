import Link from "next/link";
import { ArrowLeft, Compass, LifeBuoy } from "lucide-react";
import { Logo } from "@/components/brand";

export const metadata = { title: "Page not found — AutoFlow" };

/** Any address that doesn't exist, in the app or on the site. */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f3f4f1] flex flex-col">
      <header className="px-6 py-5 max-w-6xl w-full mx-auto"><Logo /></header>
      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-lg text-center">
          <p className="text-[120px] sm:text-[160px] leading-none font-extrabold tracking-tighter bg-gradient-to-b from-brand-900 to-brand-500 bg-clip-text text-transparent select-none">
            404
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-950">
            This page slid out of the DMs.
          </h1>
          <p className="mt-2 text-gray-500">
            The link may be old, mistyped, or the page has moved. Let&apos;s get you back on track.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Link href="/dashboard" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-lime text-gray-950 text-sm font-extrabold hover:bg-lime-400">
              <Compass className="w-4 h-4" /> Go to your dashboard
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 h-11 px-5 rounded-full border border-gray-300 bg-white text-sm font-bold text-gray-800 hover:border-gray-950">
              <ArrowLeft className="w-4 h-4" /> Home
            </Link>
            <Link href="/help" className="inline-flex items-center gap-2 h-11 px-5 rounded-full text-sm font-bold text-gray-600 hover:text-gray-950">
              <LifeBuoy className="w-4 h-4" /> Help Center
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
