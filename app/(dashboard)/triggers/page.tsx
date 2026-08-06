"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, X, Workflow, ImageIcon, Search, Info } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  TriggerCard, MessageCard, ConditionCard, CARD_W,
  type FlowNode, type FlowButton, type TriggerReel,
} from "@/components/trigger-nodes";

/**
 * Trigger builder — a branching canvas, design-first.
 *
 * Deliberately separate from the existing per-reel flow editor, which is live
 * and untouched. Nothing here talks to the automation API: the graph lives in
 * local state so the shape and the interactions can be judged before any of it
 * is wired up.
 *
 * Two ideas being tried out:
 *   · the trigger owns the reel, so a trigger can be pointed at a different
 *     reel later instead of a reel owning its flow
 *   · every button carries its own port, so one message can fan out into
 *     several — the thing the current linear flow can't express
 */

const COL_GAP = 120;
const ROW_GAP = 40;

let seq = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${seq++}`;

function starterGraph(): FlowNode[] {
  const trigger = uid("trg");
  const m1 = uid("msg");
  const cond = uid("cnd");
  const m2 = uid("msg");
  const btn = uid("btn");
  return [
    { id: trigger, type: "trigger", reel: null, keywords: "", next: m1 },
    {
      id: m1, type: "message", title: "Send Message #1",
      text: "Hey {{full_name}} 👋\n\nQuick check before I share the link — are you following this page? 😊",
      buttons: [{ id: btn, label: "Yes, I'm Following", kind: "next", next: cond }],
    },
    { id: cond, type: "condition", label: "Do they follow you?", yes: m2, no: null },
    {
      id: m2, type: "message", title: "Send Message #2",
      text: "Awesome 🙌 Here's the link 👇",
      buttons: [{ id: uid("btn"), label: "Click here", kind: "link", url: "" }],
    },
  ];
}

export default function TriggersPage() {
  const [nodes, setNodes] = useState<FlowNode[]>(starterGraph);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const portEls = useRef<Map<string, HTMLElement>>(new Map());
  const nodeEls = useRef<Map<string, HTMLElement>>(new Map());
  const [paths, setPaths] = useState<string[]>([]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  // ── layout: columns by depth from the trigger ────────────────────────────
  const layout = useMemo(() => {
    const depth = new Map<string, number>();
    const root = nodes.find((n) => n.type === "trigger");
    if (root) {
      const walk = (id: string, d: number, seen: Set<string>) => {
        if (seen.has(id)) return;
        seen.add(id);
        depth.set(id, Math.max(depth.get(id) ?? 0, d));
        const n = byId.get(id);
        if (!n) return;
        const kids =
          n.type === "trigger" ? [n.next]
          : n.type === "condition" ? [n.yes, n.no]
          : n.buttons.map((b) => b.next ?? null);
        kids.filter(Boolean).forEach((k) => walk(k as string, d + 1, seen));
      };
      walk(root.id, 0, new Set());
    }
    // Anything disconnected still needs somewhere to live.
    nodes.forEach((n) => { if (!depth.has(n.id)) depth.set(n.id, 0); });

    const cols = new Map<number, string[]>();
    nodes.forEach((n) => {
      const d = depth.get(n.id)!;
      cols.set(d, [...(cols.get(d) ?? []), n.id]);
    });

    const pos = new Map<string, { x: number; y: number }>();
    [...cols.keys()].sort((a, b) => a - b).forEach((d) => {
      let y = 0;
      cols.get(d)!.forEach((id) => {
        pos.set(id, { x: d * (CARD_W + COL_GAP), y });
        y += (nodeEls.current.get(id)?.offsetHeight ?? 200) + ROW_GAP;
      });
    });
    return pos;
  }, [nodes, byId]);

  const registerPort = useCallback((id: string, el: HTMLElement | null) => {
    if (el) portEls.current.set(id, el);
    else portEls.current.delete(id);
  }, []);

  // ── connectors: measured from the DOM so curves always meet the ports ────
  const drawEdges = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const origin = canvas.getBoundingClientRect();

    const edges: Array<[string, string]> = [];
    nodes.forEach((n) => {
      if (n.type === "trigger" && n.next) edges.push([`${n.id}:out`, n.next]);
      if (n.type === "condition") {
        if (n.yes) edges.push([`${n.id}:yes`, n.yes]);
        if (n.no) edges.push([`${n.id}:no`, n.no]);
      }
      if (n.type === "message") {
        n.buttons.forEach((b) => { if (b.next) edges.push([`${n.id}:btn:${b.id}`, b.next]); });
      }
    });

    const next: string[] = [];
    for (const [portId, targetId] of edges) {
      const from = portEls.current.get(portId);
      const to = nodeEls.current.get(targetId);
      if (!from || !to) continue;
      const f = from.getBoundingClientRect();
      const t = to.getBoundingClientRect();
      const x1 = f.left - origin.left + f.width / 2;
      const y1 = f.top - origin.top + f.height / 2;
      const x2 = t.left - origin.left;
      const y2 = t.top - origin.top + Math.min(48, t.height / 2);
      const dx = Math.max(50, (x2 - x1) / 2);
      next.push(`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
    }
    setPaths(next);
  }, [nodes]);

  useLayoutEffect(() => { drawEdges(); }, [drawEdges, layout]);
  useEffect(() => {
    const onResize = () => drawEdges();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawEdges]);

  // ── graph edits ──────────────────────────────────────────────────────────
  const patch = (id: string, up: Partial<FlowNode>) =>
    setNodes((prev) => prev.map((n) => (n.id === id ? ({ ...n, ...up } as FlowNode) : n)));

  const messageCount = () => nodes.filter((n) => n.type === "message").length;

  function addMessageAt(attach: (newId: string) => void) {
    const id = uid("msg");
    const node: FlowNode = {
      id, type: "message",
      title: `Send Message #${messageCount() + 1}`,
      text: "",
      buttons: [],
    };
    setNodes((prev) => [...prev, node]);
    attach(id);
    setSelectedId(id);
  }

  function addFromTrigger(triggerId: string) {
    const t = byId.get(triggerId);
    if (t?.type === "trigger" && t.next) return;
    addMessageAt((newId) => patch(triggerId, { next: newId } as Partial<FlowNode>));
  }

  function addFromButton(nodeId: string, buttonId: string) {
    const n = byId.get(nodeId);
    if (n?.type !== "message") return;
    if (n.buttons.find((b) => b.id === buttonId)?.next) return;
    addMessageAt((newId) =>
      setNodes((prev) => prev.map((x) =>
        x.id === nodeId && x.type === "message"
          ? { ...x, buttons: x.buttons.map((b) => (b.id === buttonId ? { ...b, next: newId } : b)) }
          : x))
    );
  }

  function addFromBranch(nodeId: string, branch: "yes" | "no") {
    const n = byId.get(nodeId);
    if (n?.type !== "condition" || n[branch]) return;
    addMessageAt((newId) => patch(nodeId, { [branch]: newId } as unknown as Partial<FlowNode>));
  }

  function addButton(nodeId: string) {
    setNodes((prev) => prev.map((n) =>
      n.id === nodeId && n.type === "message"
        ? { ...n, buttons: [...n.buttons, { id: uid("btn"), label: "New button", kind: "next", next: null } as FlowButton] }
        : n));
  }

  /** Remove a node and any edge pointing at it. */
  function removeNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id).map((n) => {
      if (n.type === "trigger" && n.next === id) return { ...n, next: null };
      if (n.type === "condition") {
        return { ...n, yes: n.yes === id ? null : n.yes, no: n.no === id ? null : n.no };
      }
      if (n.type === "message") {
        return { ...n, buttons: n.buttons.map((b) => (b.next === id ? { ...b, next: null } : b)) };
      }
      return n;
    }));
    if (selectedId === id) setSelectedId(null);
  }

  const msgIndex = (id: string) =>
    nodes.filter((n) => n.type === "message").findIndex((n) => n.id === id) + 1;

  const canvasSize = useMemo(() => {
    let w = 0, h = 0;
    layout.forEach((p, id) => {
      w = Math.max(w, p.x + CARD_W);
      h = Math.max(h, p.y + (nodeEls.current.get(id)?.offsetHeight ?? 200));
    });
    return { width: w + 80, height: h + 80 };
  }, [layout, nodes]);

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="px-8 py-5 border-b border-gray-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Workflow className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">Trigger builder</h1>
                <Badge variant="warning">Design preview</Badge>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Build the flow first, then point it at a reel
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => { setNodes(starterGraph()); setSelectedId(null); }}>
            Reset canvas
          </Button>
        </div>

        <div className="px-8 py-3 bg-amber-50/60 border-b border-amber-100 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            Nothing here is wired up yet — this is the shape and the interactions only. Your live
            reel automations are untouched. Click a hollow dot to add the next step; click a card to edit it.
          </p>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-[#f5f5f7]" onClick={() => setSelectedId(null)}>
          <div
            ref={canvasRef}
            className="relative m-8"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            <svg className="absolute inset-0 pointer-events-none overflow-visible" width="100%" height="100%">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
                </marker>
              </defs>
              {paths.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="#9ca3af" strokeWidth="1.5" markerEnd="url(#arrow)" />
              ))}
            </svg>

            {nodes.map((node) => {
              const pos = layout.get(node.id) ?? { x: 0, y: 0 };
              return (
                <div
                  key={node.id}
                  ref={(el) => { if (el) nodeEls.current.set(node.id, el); else nodeEls.current.delete(node.id); }}
                  className="absolute"
                  style={{ left: pos.x, top: pos.y }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {node.type === "trigger" && (
                    <TriggerCard
                      node={node}
                      selected={selectedId === node.id}
                      onSelect={() => setSelectedId(node.id)}
                      registerPort={registerPort}
                      onAddNext={() => addFromTrigger(node.id)}
                      onPickReel={() => setPickerFor(node.id)}
                    />
                  )}
                  {node.type === "message" && (
                    <MessageCard
                      node={node}
                      index={msgIndex(node.id)}
                      selected={selectedId === node.id}
                      onSelect={() => setSelectedId(node.id)}
                      registerPort={registerPort}
                      onAddFromButton={(bid) => addFromButton(node.id, bid)}
                      onAddButton={() => addButton(node.id)}
                      onDelete={() => removeNode(node.id)}
                    />
                  )}
                  {node.type === "condition" && (
                    <ConditionCard
                      node={node}
                      selected={selectedId === node.id}
                      onSelect={() => setSelectedId(node.id)}
                      registerPort={registerPort}
                      onAddBranch={(b) => addFromBranch(node.id, b)}
                      onDelete={() => removeNode(node.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Editor panel */}
      <aside className="w-80 shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
        {!selected ? (
          <div className="p-6 text-center text-xs text-gray-400 mt-16">
            <Workflow className="w-8 h-8 mx-auto mb-3 opacity-20" />
            Select a card to edit it
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <p className="text-sm font-semibold text-gray-900">
              {selected.type === "trigger" ? "Trigger"
                : selected.type === "condition" ? "Condition"
                : `Send Message #${msgIndex(selected.id)}`}
            </p>

            {selected.type === "trigger" && (
              <>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Reel</p>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setPickerFor(selected.id)}>
                    {selected.reel ? "Change reel" : "Choose a reel"}
                  </Button>
                  {selected.reel && (
                    <p className="text-[11px] text-gray-400 mt-1.5 truncate">{selected.reel.caption || "No caption"}</p>
                  )}
                </div>
                <Input
                  label="Keywords (optional)"
                  value={selected.keywords}
                  onChange={(e) => patch(selected.id, { keywords: e.target.value } as Partial<FlowNode>)}
                  placeholder="prompt, link"
                  hint="Leave empty to respond to every comment"
                />
              </>
            )}

            {selected.type === "message" && (
              <>
                <Input
                  label="Card title"
                  value={selected.title}
                  onChange={(e) => patch(selected.id, { title: e.target.value } as Partial<FlowNode>)}
                />
                <Textarea
                  label="Message"
                  rows={5}
                  value={selected.text}
                  onChange={(e) => patch(selected.id, { text: e.target.value } as Partial<FlowNode>)}
                  hint="Use {{full_name}} or {{username}} for merge tags"
                />
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2">Buttons</p>
                  {selected.buttons.length === 0 && (
                    <p className="text-[11px] text-gray-400 mb-2">No buttons — sends as plain text.</p>
                  )}
                  {selected.buttons.map((b) => (
                    <div key={b.id} className="rounded-lg border border-gray-200 p-3 mb-2 space-y-2">
                      <Input
                        value={b.label}
                        onChange={(e) => setNodes((prev) => prev.map((n) =>
                          n.id === selected.id && n.type === "message"
                            ? { ...n, buttons: n.buttons.map((x) => x.id === b.id ? { ...x, label: e.target.value } : x) }
                            : n))}
                      />
                      <div className="flex gap-1.5">
                        {(["next", "link"] as const).map((k) => (
                          <button
                            key={k}
                            onClick={() => setNodes((prev) => prev.map((n) =>
                              n.id === selected.id && n.type === "message"
                                ? { ...n, buttons: n.buttons.map((x) => x.id === b.id ? { ...x, kind: k } : x) }
                                : n))}
                            className={`flex-1 text-[11px] py-1.5 rounded-md border cursor-pointer transition-colors ${
                              b.kind === k
                                ? "bg-brand-50 border-brand-300 text-brand-700 font-medium"
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            {k === "next" ? "Opens a message" : "Opens a link"}
                          </button>
                        ))}
                      </div>
                      {b.kind === "link" && (
                        <Input
                          value={b.url ?? ""}
                          placeholder="https://…"
                          onChange={(e) => setNodes((prev) => prev.map((n) =>
                            n.id === selected.id && n.type === "message"
                              ? { ...n, buttons: n.buttons.map((x) => x.id === b.id ? { ...x, url: e.target.value } : x) }
                              : n))}
                        />
                      )}
                      <button
                        onClick={() => setNodes((prev) => prev.map((n) =>
                          n.id === selected.id && n.type === "message"
                            ? { ...n, buttons: n.buttons.filter((x) => x.id !== b.id) }
                            : n))}
                        className="text-[11px] text-gray-400 hover:text-red-500 cursor-pointer"
                      >
                        Remove button
                      </button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => addButton(selected.id)}>
                    <Plus className="w-3.5 h-3.5" /> Add button
                  </Button>
                </div>
              </>
            )}

            {selected.type === "condition" && (
              <p className="text-xs text-gray-500 leading-relaxed">
                Instagram only reveals whether someone follows you once they&apos;ve messaged you,
                and their button tap is that message. So this check can only sit after a button —
                never straight after the comment.
              </p>
            )}
          </div>
        )}
      </aside>

      {pickerFor && (
        <ReelPicker
          onClose={() => setPickerFor(null)}
          onPick={(reel) => { patch(pickerFor, { reel } as Partial<FlowNode>); setPickerFor(null); }}
        />
      )}
    </div>
  );
}

/**
 * Reels are fetched only when this opens — the point of putting the reel inside
 * the trigger rather than listing every reel up front.
 */
function ReelPicker({ onClose, onPick }: { onClose: () => void; onPick: (r: TriggerReel) => void }) {
  const [posts, setPosts] = useState<Array<{ id: string; caption?: string; thumbnail_url?: string; media_url?: string }> | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/instagram/posts")
      .then((r) => r.json())
      .then(({ posts }) => setPosts(posts ?? []))
      .catch(() => setPosts([]));
  }, []);

  const shown = (posts ?? []).filter((p) => !q || (p.caption ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Choose a reel</h3>
            <p className="text-xs text-gray-400 mt-0.5">Loaded only now, not on every page view</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search captions…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-brand-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {posts === null ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-brand-500" /></div>
          ) : shown.length === 0 ? (
            <p className="py-12 text-center text-xs text-gray-400">No reels found.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {shown.map((p) => {
                const thumb = p.thumbnail_url ?? p.media_url;
                return (
                  <button
                    key={p.id}
                    onClick={() => onPick({ id: p.id, caption: p.caption, thumbnail: thumb })}
                    className="group text-left cursor-pointer"
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 group-hover:ring-brand-400 transition-all">
                      {thumb ? (
                        <Image src={thumb} alt="" fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2">{p.caption || "No caption"}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
