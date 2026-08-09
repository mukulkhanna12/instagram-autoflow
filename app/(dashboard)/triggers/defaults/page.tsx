"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RotateCcw, Zap, UserCheck, Link2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import {
  loadDefaults, saveDefaults, FALLBACK_DEFAULTS, type TriggerDefaults,
} from "@/lib/trigger-store";

/**
 * The wording every new trigger starts from.
 *
 * Deliberately does not touch triggers that already exist — by the time one is
 * saved it has been customised, and silently rewriting it would be the opposite
 * of a default.
 */
export default function TriggerDefaultsPage() {
  const router = useRouter();
  const [d, setD] = useState<TriggerDefaults | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => setD(loadDefaults()), []);

  if (!d) return null;

  const set = (
    key: keyof TriggerDefaults,
    field: "text" | "button",
    value: string
  ) => setD({ ...d, [key]: { ...d[key], [field]: value } });

  function save() {
    if (!d) return;
    saveDefaults(d);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="p-8 max-w-2xl">
      <button
        onClick={() => router.push("/triggers")}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-5 cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All triggers
      </button>

      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Default messages</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            What every new trigger starts with
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setD(FALLBACK_DEFAULTS)}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={save}>
            {saved ? <><Check className="w-4 h-4" /> Saved</> : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-2.5 bg-gray-50 border border-gray-200 rounded-xl p-3.5 my-5">
        <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600">
          Changing these only affects triggers you create <strong>from now on</strong>. Existing
          triggers keep the wording you gave them.
        </p>
      </div>

      <div className="space-y-4">
        <Block
          icon={Zap}
          tone="text-brand-600 bg-brand-50 border-brand-200"
          title="Send Message #1"
          desc="The opening DM, sent the moment they comment"
          text={d.opener.text}
          button={d.opener.button}
          onText={(v) => set("opener", "text", v)}
          onButton={(v) => set("opener", "button", v)}
          note="Their tap on this button is what opens the DM window — and the only moment Instagram will tell us whether they follow you."
        />

        <Block
          icon={UserCheck}
          tone="text-amber-600 bg-amber-50 border-amber-200"
          title="Follow message"
          desc="Sent when the follow check comes back negative"
          text={d.follow.text}
          button={d.follow.button}
          onText={(v) => set("follow", "text", v)}
          onButton={(v) => set("follow", "button", v)}
          note="Repeats on every tap until they actually follow, so the payoff is never reachable early."
        />

        <Block
          icon={RotateCcw}
          tone="text-orange-600 bg-orange-50 border-orange-200"
          title="Retry follow message"
          desc="For a repeat tap, when the first nudge didn't land"
          text={d.followRetry.text}
          button={d.followRetry.button}
          onText={(v) => set("followRetry", "text", v)}
          onButton={(v) => set("followRetry", "button", v)}
          note="Optional second step on the loop — add it from the follow check on the canvas. Without it, someone who taps again just sees the follow message a second time."
        />

        <Block
          icon={Link2}
          tone="text-emerald-600 bg-emerald-50 border-emerald-200"
          title="Send Message #2"
          desc="The payoff, once the follow is confirmed"
          text={d.payoff.text}
          button={d.payoff.button}
          onText={(v) => set("payoff", "text", v)}
          onButton={(v) => set("payoff", "button", v)}
          note="The link itself stays per-trigger — it's different every time, so it isn't a default."
        />
      </div>

      <p className="text-[11px] text-gray-400 mt-6">
        Use <code className="bg-gray-100 rounded px-1 py-0.5">{"{{full_name}}"}</code> or{" "}
        <code className="bg-gray-100 rounded px-1 py-0.5">{"{{username}}"}</code> anywhere in a message.
      </p>
    </div>
  );
}

function Block({
  icon: Icon, tone, title, desc, text, button, onText, onButton, note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  desc: string;
  text: string;
  button: string;
  onText: (v: string) => void;
  onButton: (v: string) => void;
  note: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3.5">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${tone}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="text-xs text-gray-400">{desc}</p>
        </div>
      </div>

      <Textarea label="Message" rows={4} value={text} onChange={(e) => onText(e.target.value)} />
      <Input label="Button label" value={button} onChange={(e) => onButton(e.target.value)} />
      <p className="text-[11px] text-gray-400 leading-relaxed">{note}</p>
    </div>
  );
}
