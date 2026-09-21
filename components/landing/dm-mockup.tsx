import { ArrowRight, Heart, UserPlus } from "lucide-react";

/**
 * The hero's phone: a comment, the public reply, then the DM thread with the
 * follow gate and the link — the whole AutoFlow loop in one picture. Handles
 * and wording are illustrative.
 */
export function DmMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      <div className="absolute -inset-6 rounded-[3rem] bg-lime/40 blur-2xl" aria-hidden />
      <div className="relative rounded-[2.5rem] bg-gray-950 p-3 shadow-2xl">
        <div className="rounded-[2rem] bg-white overflow-hidden">
          {/* Comment on the reel */}
          <div className="px-5 pt-6 pb-4 border-b border-gray-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3">Comments</p>
            <div className="flex gap-3">
              <span className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 text-sm font-bold flex items-center justify-center shrink-0">P</span>
              <div className="flex-1">
                <p className="text-sm"><span className="font-bold">priya.makes</span> LINK please! 🙏</p>
                <div className="flex gap-3 mt-3">
                  <span className="w-7 h-7 rounded-full bg-lime text-brand-900 text-[11px] font-extrabold flex items-center justify-center shrink-0">AF</span>
                  <p className="text-sm"><span className="font-bold">you</span> Sent you a DM! 📩</p>
                </div>
              </div>
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0 mt-1" />
            </div>
          </div>

          {/* DM thread */}
          <div className="px-4 py-5 space-y-3 bg-[#fafbf8]">
            <Bubble>Hey Priya! 👋 Here&apos;s the guide you asked for.</Bubble>
            <Bubble>
              Follow me first so you never miss the next one 🙏
              <span className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-white text-gray-950 text-xs font-bold py-2">
                <UserPlus className="w-3.5 h-3.5" /> I&apos;ve followed
              </span>
            </Bubble>
            <p className="text-right">
              <span className="inline-block rounded-2xl rounded-br-md bg-brand-600 text-white text-sm px-3.5 py-2">
                Done ✓
              </span>
            </p>
            <Bubble>
              Here you go 🎉
              <span className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-lime text-gray-950 text-xs font-bold py-2">
                Get the guide <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </Bubble>
          </div>
        </div>
      </div>
    </div>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-gray-200/80 text-gray-900 text-sm px-3.5 py-2.5">
      {children}
    </div>
  );
}
