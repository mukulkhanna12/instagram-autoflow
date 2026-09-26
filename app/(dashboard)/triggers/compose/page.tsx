"use client";
import { useEffect, useState } from "react";
import { TriggerComposer } from "@/components/trigger-composer";
import { emptyCompose, type ComposeState } from "@/lib/trigger-compose";

/** New flow, one-page editor. Defaults are read after mount — they live in localStorage. */
export default function ComposeTriggerPage() {
  const [initial, setInitial] = useState<ComposeState | null>(null);
  useEffect(() => setInitial(emptyCompose()), []);
  if (!initial) return null;
  return <TriggerComposer initial={initial} mode="create" />;
}
