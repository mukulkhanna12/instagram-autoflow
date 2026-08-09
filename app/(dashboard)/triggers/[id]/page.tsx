"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, Plus, X, ArrowLeft, ImageIcon, Search, Minus, Maximize2,
  Eye, Check, ChevronRight, MessageSquare, GitBranch, Sliders, Unlink,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhonePreview } from "@/components/phone-preview";
import { MAX_BUTTONS } from "@/lib/buttons";
import { TriggerInspector } from "@/components/trigger-inspector";
import {
  TriggerCard, MessageCard, ConditionCard, CARD_W,
} from "@/components/trigger-nodes";
import {
  getTrigger, upsertTrigger, uid, commentSource, dmSource, hasCondition,
  type Trigger, type FlowNode, type FlowButton, type TriggerReel, type TriggerSource,
  type NodePos,
} from "@/lib/trigger-store";

const COL_GAP = 130;
const ROW_GAP = 44;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.8;

export default function TriggerBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [trigger, setTrigger] = useState<Trigger | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  // An empty port that was clicked, waiting for a choice of what to add.
  const [pendingPort, setPendingPort] = useState<
    { attach: (id: string) => void; detach?: () => void; x: number; y: number; at: NodePos } | null
  >(null);
  const [showPreview, setShowPreview] = useState(false);
  // Reels are loaded once, the first time a wizard step asks for them.
  const [reels, setReels] = useState<TriggerReel[] | null>(null);
  const reelsRequested = useRef(false);

  const loadReels = useCallback(() => {
    if (reelsRequested.current) return;
    reelsRequested.current = true;
    fetch("/api/instagram/posts").then((r) => r.json())
      .then(({ posts }) => setReels((posts ?? []).map((p: { id: string; caption?: string; thumbnail_url?: string; media_url?: string }) => ({
        id: p.id, caption: p.caption, thumbnail: p.thumbnail_url ?? p.media_url,
      }))))
      .catch(() => setReels([]));
  }, []);

  // viewport
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const panning = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const portEls = useRef<Map<string, HTMLElement>>(new Map());
  const nodeEls = useRef<Map<string, HTMLElement>>(new Map());
  const [paths, setPaths] = useState<string[]>([]);

  useEffect(() => {
    const t = getTrigger(id);
    if (!t) router.replace("/triggers");
    else setTrigger(t);
  }, [id, router]);

  const nodes = trigger?.nodes ?? [];
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const selected = selectedId ? byId.get(selectedId) ?? null : null;

  const setNodes = useCallback((fn: (prev: FlowNode[]) => FlowNode[]) => {
    setTrigger((prev) => (prev ? { ...prev, nodes: fn(prev.nodes) } : prev));
  }, []);

  function save() {
    if (!trigger) return;
    upsertTrigger(trigger);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  // ── layout ───────────────────────────────────────────────────────────────
  const layout = useMemo(() => {
    const depth = new Map<string, number>();
    const root = nodes.find((n) => n.type === "trigger");
    if (root) {
      const walk = (nid: string, d: number, seen: Set<string>) => {
        if (seen.has(nid)) return;
        seen.add(nid);
        depth.set(nid, Math.max(depth.get(nid) ?? 0, d));
        const n = byId.get(nid);
        if (!n) return;
        const kids = n.type === "trigger" ? [n.next]
          : n.type === "condition" ? [n.yes, n.no]
          : n.buttons.map((b) => b.next ?? null);
        kids.filter(Boolean).forEach((k) => walk(k as string, d + 1, seen));
      };
      walk(root.id, 0, new Set());
    }
    nodes.forEach((n) => { if (!depth.has(n.id)) depth.set(n.id, 0); });

    const cols = new Map<number, string[]>();
    nodes.forEach((n) => cols.set(depth.get(n.id)!, [...(cols.get(depth.get(n.id)!) ?? []), n.id]));

    const pos = new Map<string, { x: number; y: number }>();
    [...cols.keys()].sort((a, b) => a - b).forEach((d) => {
      let y = 0;
      cols.get(d)!.forEach((nid) => {
        pos.set(nid, { x: d * (CARD_W + COL_GAP), y });
        y += (nodeEls.current.get(nid)?.offsetHeight ?? 210) + ROW_GAP;
      });
    });
    // A card that has been dragged keeps where it was put.
    nodes.forEach((n) => { if (n.pos) pos.set(n.id, n.pos); });
    return pos;
  }, [nodes, byId]);

  const registerPort = useCallback((pid: string, el: HTMLElement | null) => {
    if (el) portEls.current.set(pid, el);
    else portEls.current.delete(pid);
  }, []);

  // ── connectors, in world coordinates (rects ÷ zoom) ──────────────────────
  const drawEdges = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    const origin = world.getBoundingClientRect();

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
      const x1 = (f.left - origin.left + f.width / 2) / zoom;
      const y1 = (f.top - origin.top + f.height / 2) / zoom;
      const x2 = (t.left - origin.left) / zoom;
      const y2 = (t.top - origin.top) / zoom + Math.min(46, t.height / zoom / 2);
      const dx = Math.max(55, (x2 - x1) / 2);
      next.push(`M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
    }
    setPaths(next);
  }, [nodes, zoom]);

  useLayoutEffect(() => { drawEdges(); }, [drawEdges, layout, pan]);

  // Escape closes the add-step menu — the overlay alone left it stuck whenever
  // a click landed on a card instead of the backdrop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPendingPort(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onResize = () => drawEdges();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawEdges]);

  // Current viewport, readable from the wheel handler without re-subscribing.
  const view = useRef({ zoom: 1, pan: { x: 40, y: 40 } });
  view.current = { zoom, pan };

  // ── mouse zoom (to cursor) + drag to pan ─────────────────────────────────
  // Depends on `trigger` because the viewport isn't in the DOM until it loads —
  // with an empty dep list this bailed out on the first render and the wheel
  // listener was never attached.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const { zoom: z, pan: p } = view.current;

      // Trackpads send horizontal deltas for a two-finger swipe; treat those as
      // panning and everything else as zoom.
      const isPan = !e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (isPan) {
        setPan({ x: p.x - e.deltaX, y: p.y - e.deltaY });
        return;
      }

      const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * Math.exp(-e.deltaY * 0.0015)));
      if (nz === z) return;
      // Keep whatever sits under the cursor pinned in place.
      setZoom(nz);
      setPan({
        x: mx - ((mx - p.x) * nz) / z,
        y: my - ((my - p.y) * nz) / z,
      });
    };

    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [trigger]);

  // ── dragging a card ──────────────────────────────────────────────────────
  const dragging = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  function onNodePointerDown(e: React.PointerEvent, nid: string) {
    // Let inputs, buttons and ports keep their own behaviour.
    if ((e.target as HTMLElement).closest("button, input, textarea, a")) return;

    // Select, but don't open the panel. A card is also its own drag handle, so
    // opening on contact meant every attempt to move one threw the drawer open.
    // The pencil on the card is the way in; this only marks what's selected.
    setSelectedId(nid);

    const start = layout.get(nid) ?? { x: 0, y: 0 };
    dragging.current = { id: nid, sx: e.clientX, sy: e.clientY, ox: start.x, oy: start.y, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.stopPropagation();
  }

  function onNodePointerMove(e: React.PointerEvent) {
    const d = dragging.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / zoom;
    const dy = (e.clientY - d.sy) / zoom;
    // A few pixels of slop so a click doesn't register as a drag.
    if (!d.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    d.moved = true;
    patch(d.id, { pos: { x: d.ox + dx, y: d.oy + dy } } as Partial<FlowNode>);
  }

  function onNodePointerUp(e: React.PointerEvent) {
    const d = dragging.current;
    dragging.current = null;
    // Suppress the click that follows a real drag, so it doesn't also select.
    if (d?.moved) e.stopPropagation();
  }

  /**
   * Start panning — but only on the canvas itself.
   *
   * The capture below is what makes a pan survive the pointer leaving the
   * viewport, and it is also a trap: while an element holds pointer capture the
   * browser retargets the following `click` to that element. Any control drawn
   * inside the viewport therefore lost its click entirely — the add-step menu
   * did nothing, its backdrop wouldn't dismiss, and the zoom buttons were dead.
   *
   * So chrome drawn over the canvas is marked `data-canvas-ui` and excluded
   * here, exactly as cards are.
   */
  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-node], [data-canvas-ui]")) return;
    panning.current = { x: pan.x, y: pan.y, px: e.clientX, py: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedId(null);
  }
  function onPointerMove(e: React.PointerEvent) {
    const p = panning.current;
    if (!p) return;
    setPan({ x: p.x + (e.clientX - p.px), y: p.y + (e.clientY - p.py) });
  }
  function onPointerUp() { panning.current = null; }

  function fit() {
    const vp = viewportRef.current;
    if (!vp || layout.size === 0) return;
    let w = 0, h = 0;
    layout.forEach((p, nid) => {
      w = Math.max(w, p.x + CARD_W);
      h = Math.max(h, p.y + (nodeEls.current.get(nid)?.offsetHeight ?? 210));
    });
    const z = Math.min(1, Math.min((vp.clientWidth - 80) / w, (vp.clientHeight - 80) / h));
    setZoom(Math.max(MIN_ZOOM, z));
    setPan({ x: 40, y: 40 });
  }

  // ── graph edits ──────────────────────────────────────────────────────────
  const patch = (nid: string, up: Partial<FlowNode>) =>
    setNodes((prev) => prev.map((n) => (n.id === nid ? ({ ...n, ...up } as FlowNode) : n)));

  const msgIndex = (nid: string) =>
    nodes.filter((n) => n.type === "message").findIndex((n) => n.id === nid) + 1;

  /**
   * Add a follow check, wired into whichever port was clicked.
   *
   * At most one per flow: Instagram answers the follow question once, when they
   * tap, so a second check downstream would only re-ask something already known.
   */
  function addCondition(attach: (newId: string) => void, pos: NodePos) {
    if (hasCondition(nodes)) return;
    const nid = uid("cnd");
    setNodes((prev) => [...prev, {
      id: nid, type: "condition", label: "Do they follow you?", yes: null, no: null, pos,
    }]);
    attach(nid);
    setSelectedId(nid);
    setDrawerOpen(true);
  }

  function addMessage(attach: (newId: string) => void, pos: NodePos) {
    const nid = uid("msg");
    setNodes((prev) => [...prev, {
      id: nid, type: "message",
      title: `Send Message #${prev.filter((n) => n.type === "message").length + 1}`,
      text: "", buttons: [], pos,
    }]);
    attach(nid);
    setSelectedId(nid);
    setDrawerOpen(true);
  }

  function patchSource(sourceId: string, up: Partial<TriggerSource>) {
    setNodes((prev) => prev.map((n) =>
      n.type === "trigger"
        ? { ...n, sources: n.sources.map((x) => (x.id === sourceId ? ({ ...x, ...up } as TriggerSource) : x)) }
        : n));
  }

  /**
   * Change what starts this trigger, keeping the one source rather than adding
   * a second. Keywords and replies carry over — they're about the wording, not
   * about which surface it arrived on. The reel does not: a DM has none.
   */
  function switchSourceKind(kind: "comment" | "dm") {
    setNodes((prev) => prev.map((n) => {
      if (n.type !== "trigger") return n;
      const old = n.sources[0];
      const base = kind === "comment" ? commentSource() : dmSource();
      const src: TriggerSource = old
        ? { ...base, include: old.include, exclude: old.exclude, autoReply: old.autoReply, replies: old.replies }
        : base;
      return { ...n, sources: [src] };
    }));
    setEditingSourceId(null);
  }

  /**
   * The "add next step" menu, kept inside the canvas.
   *
   * The viewport clips its overflow, so a menu opened from a port near the
   * bottom or right edge used to render outside it — visible as a popup that
   * appeared to do nothing and couldn't be dismissed.
   */
  function openAddMenuAt(
    clientX: number, clientY: number,
    attach: (id: string) => void,
    detach?: () => void,
  ) {
    const vp = viewportRef.current;
    const world = worldRef.current;
    if (!vp || !world) return;
    const r = vp.getBoundingClientRect();
    const o = world.getBoundingClientRect();
    const W = 208, H = detach ? 186 : 140;
    setPendingPort({
      attach, detach,
      x: Math.min(Math.max(8, clientX - r.left - W / 2), Math.max(8, r.width - W - 8)),
      y: Math.min(Math.max(8, clientY - r.top + 12), Math.max(8, r.height - H - 8)),
      // Where the new card should land, in world coordinates. Without an
      // explicit position it inherits {0,0} and stacks on the trigger card.
      at: { x: (clientX - o.left) / zoom, y: (clientY - o.top) / zoom - 24 },
    });
  }

  /**
   * Point a port at a node, or at nothing. Port ids carry everything needed to
   * find the field that holds the arrow: `<node>:out`, `<node>:yes|no`, or
   * `<node>:btn:<buttonId>`.
   */
  function connectPort(portId: string, targetId: string | null) {
    const [nid, slot, bid] = portId.split(":");
    setNodes((prev) => prev.map((n) => {
      // Pin every auto-placed card where it currently sits. Rewiring changes
      // the depths the layout is derived from, and a detached card drops to
      // depth 0 — landing on top of the trigger, which reads as a crash.
      //
      // A card added in this same batch has no layout entry yet, and pinning it
      // to a {0,0} fallback is exactly that bug: it carries its own position.
      const at = layout.get(n.id);
      const held: FlowNode = n.pos || !at ? n : { ...n, pos: at };
      if (held.id !== nid) return held;
      if (held.type === "trigger") return { ...held, next: targetId };
      if (held.type === "condition") return { ...held, [slot as "yes" | "no"]: targetId };
      return { ...held, buttons: held.buttons.map((b) => (b.id === bid ? { ...b, next: targetId } : b)) };
    }));
  }

  // The arrow being dragged out of a port, in world coordinates, and the card
  // currently under the cursor while that drag is in flight.
  const [linkLine, setLinkLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  /**
   * Drag an arrow off a port and drop it on the card it should point at.
   *
   * Listeners go on the window rather than the canvas because the pointer
   * leaves the port immediately, and the cards capture their own pointer events
   * for dragging. A drop on empty space offers to create the next step there.
   */
  // A drag that ends back on its own port would otherwise fire the port's click
  // too, running the rewire and then immediately undoing it.
  const suppressPortClick = useRef(false);

  function startLink(portId: string, e: React.PointerEvent) {
    const world = worldRef.current;
    const el = portEls.current.get(portId);
    if (!world || !el) return;
    e.stopPropagation();
    suppressPortClick.current = false;

    const o = world.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x1 = (r.left - o.left + r.width / 2) / zoom;
    const y1 = (r.top - o.top + r.height / 2) / zoom;
    let moved = false;

    const owner = portId.split(":")[0];

    const move = (ev: PointerEvent) => {
      const w = worldRef.current;
      if (!w) return;
      moved = true;
      const oo = w.getBoundingClientRect();
      setLinkLine({ x1, y1, x2: (ev.clientX - oo.left) / zoom, y2: (ev.clientY - oo.top) / zoom });

      // Ring the card under the cursor, so it's clear where the arrow will land.
      const over = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)
        ?.closest("[data-node-id]")?.getAttribute("data-node-id") ?? null;
      setDropTarget(over && over !== owner ? over : null);
    };

    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      setLinkLine(null);
      setDropTarget(null);
      if (!moved) return; // A tap, not a drag — the port's own click handles it.
      suppressPortClick.current = true;

      const dropped = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)
        ?.closest("[data-node-id]");
      const targetId = dropped?.getAttribute("data-node-id") ?? null;

      // Dropping a card on itself would draw an arrow into its own head.
      if (targetId && targetId !== owner) connectPort(portId, targetId);
      else if (!targetId) openAddMenuAt(ev.clientX, ev.clientY, (nid) => connectPort(portId, nid));
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  /**
   * Every port answers a tap the same way — with the menu of what can come
   * next — whether or not it already points somewhere. Two buttons in one
   * message can therefore each be pointed at the same follow check, and the
   * gesture doesn't change meaning depending on what is already wired.
   *
   * Detach lives in that menu rather than on the tap itself, where it was both
   * undiscoverable and easy to trigger by accident.
   */
  const ports = {
    register: registerPort,
    onPointerDown: startLink,
    onClick: (portId: string, connected: boolean, e: React.MouseEvent) => {
      if (suppressPortClick.current) { suppressPortClick.current = false; return; }
      openAddMenuAt(
        e.clientX, e.clientY,
        (nid) => connectPort(portId, nid),
        connected ? () => connectPort(portId, null) : undefined,
      );
    },
  };

  /**
   * Instagram's button template takes at most three buttons and rejects a
   * fourth outright, so the canvas stops at the same ceiling rather than
   * letting a flow be drawn that could never send.
   */
  function addButton(nid: string) {
    setNodes((prev) => prev.map((n) =>
      n.id === nid && n.type === "message" && n.buttons.length < MAX_BUTTONS
        ? { ...n, buttons: [...n.buttons, { id: uid("btn"), label: "New button", kind: "next", next: null } as FlowButton] }
        : n));
  }

  /**
   * Delete a card. Removing a follow check splices it out rather than cutting
   * the flow in half: whatever pointed at it now points at its "yes" branch,
   * so the payoff stays reachable and just loses the gate.
   */
  function removeNode(nid: string) {
    setNodes((prev) => {
      const gone = prev.find((n) => n.id === nid);
      const bypass = gone?.type === "condition" ? gone.yes : null;
      const redirect = (target: string | null | undefined) =>
        target === nid ? bypass : (target ?? null);

      return prev.filter((n) => n.id !== nid).map((n) => {
        if (n.type === "trigger") return { ...n, next: redirect(n.next) };
        if (n.type === "condition") return { ...n, yes: redirect(n.yes), no: redirect(n.no) };
        return { ...n, buttons: n.buttons.map((b) => ({ ...b, next: redirect(b.next) })) };
      });
    });
    if (selectedId === nid) setSelectedId(null);
  }

  if (!trigger) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>;
  }

  return (
    <div className="flex h-screen">
      {/* Editing drawer — left of the canvas, like a step inspector */}
      {drawerOpen && selected && (
        <TriggerInspector
          node={selected}
          nodes={nodes}
          msgIndex={msgIndex}
          patch={patch}
          onClose={() => setDrawerOpen(false)}
          onDelete={removeNode}
          onAddButton={addButton}
          setNodes={setNodes}
          reels={reels}
          loadReels={loadReels}
          editingSourceId={editingSourceId}
          setEditingSourceId={setEditingSourceId}
          patchSource={patchSource}
          switchSourceKind={switchSourceKind}
          onSelectNode={(nid) => { setSelectedId(nid); setDrawerOpen(true); }}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-100 bg-white flex items-center gap-3 shrink-0">
          <button onClick={() => router.push("/triggers")} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <input
            value={trigger.name}
            onChange={(e) => setTrigger({ ...trigger, name: e.target.value })}
            className="text-sm font-semibold text-gray-900 bg-transparent focus:outline-none focus:bg-gray-50 rounded px-2 py-1 -ml-2 min-w-0"
          />
          <Badge variant={trigger.status === "live" ? "success" : "default"}>
            {trigger.status === "live" ? "Live" : "Draft"}
          </Badge>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setTrigger({ ...trigger, status: trigger.status === "live" ? "draft" : "live" })}
            >
              {trigger.status === "live" ? "Switch to draft" : "Set live"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPreview((v) => !v)}>
              <Eye className="w-4 h-4" /> {showPreview ? "Hide preview" : "Preview"}
            </Button>
            <Button size="sm" onClick={save}>
              {saved ? <><Check className="w-4 h-4" /> Saved</> : "Save"}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="relative flex-1 overflow-hidden bg-[#fafafa] cursor-grab active:cursor-grabbing"
          style={{
            backgroundImage: "radial-gradient(#d8d8dd 1px, transparent 1px)",
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <div
            ref={worldRef}
            className="absolute origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <svg className="absolute inset-0 pointer-events-none overflow-visible" width="1" height="1">
              <defs>
                <marker id="tarrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#a1a1aa" />
                </marker>
              </defs>
              {paths.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="#a1a1aa" strokeWidth="1.5" markerEnd="url(#tarrow)" />
              ))}
              {/* The arrow currently being dragged out of a port. */}
              {linkLine && (
                <path
                  d={`M ${linkLine.x1} ${linkLine.y1} C ${linkLine.x1 + 60} ${linkLine.y1}, ${linkLine.x2 - 60} ${linkLine.y2}, ${linkLine.x2} ${linkLine.y2}`}
                  fill="none" stroke="#7c3aed" strokeWidth="2" strokeDasharray="5 4"
                />
              )}
            </svg>

            {nodes.map((node) => {
              const pos = layout.get(node.id) ?? { x: 0, y: 0 };
              return (
                <div
                  key={node.id}
                  data-node
                  data-node-id={node.id}
                  ref={(el) => { if (el) nodeEls.current.set(node.id, el); else nodeEls.current.delete(node.id); }}
                  onPointerDown={(e) => onNodePointerDown(e, node.id)}
                  onPointerMove={onNodePointerMove}
                  onPointerUp={onNodePointerUp}
                  className={`absolute touch-none rounded-2xl ${
                    dropTarget === node.id ? "ring-2 ring-violet-500 ring-offset-2" : ""
                  }`}
                  style={{ left: pos.x, top: pos.y }}
                >
                  {node.type === "trigger" && (
                    <TriggerCard
                      node={node} selected={selectedId === node.id}
                      onSelect={() => setSelectedId(node.id)}
                      onEdit={() => { setSelectedId(node.id); setDrawerOpen(true); setEditingSourceId(null); }}
                      ports={ports}
                      onEditSource={(sid) => { setSelectedId(node.id); setDrawerOpen(true); setEditingSourceId(sid); }}
                    />
                  )}
                  {node.type === "message" && (
                    <MessageCard
                      node={node} index={msgIndex(node.id)} selected={selectedId === node.id}
                      onSelect={() => setSelectedId(node.id)}
                      onEdit={() => { setSelectedId(node.id); setDrawerOpen(true); setEditingSourceId(null); }}
                      ports={ports}
                      onAddButton={() => addButton(node.id)}
                      onDelete={() => removeNode(node.id)}
                    />
                  )}
                  {node.type === "condition" && (
                    <ConditionCard
                      node={node} selected={selectedId === node.id}
                      onSelect={() => setSelectedId(node.id)}
                      onEdit={() => { setSelectedId(node.id); setDrawerOpen(true); setEditingSourceId(null); }}
                      ports={ports}
                      onDelete={() => removeNode(node.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {!drawerOpen && selected && (
            <button
              data-canvas-ui
              onClick={() => setDrawerOpen(true)}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-16 bg-white rounded-r-lg shadow-md ring-1 ring-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              title="Show the editing panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {pendingPort && (
            <>
              <div data-canvas-ui className="absolute inset-0 z-20" onClick={() => setPendingPort(null)} />
              <div
                data-canvas-ui
                className="absolute z-30 bg-white rounded-xl shadow-lg ring-1 ring-gray-200 p-1 w-52"
                style={{ left: Math.max(8, pendingPort.x - 100), top: pendingPort.y + 12 }}
              >
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide px-2.5 pt-1.5 pb-1">
                  Add next step
                </p>
                <button
                  onClick={() => { addMessage(pendingPort.attach, pendingPort.at); setPendingPort(null); }}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-2.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  <span>
                    <span className="block text-xs font-medium text-gray-800">Send a message</span>
                    <span className="block text-[11px] text-gray-400">A DM with optional buttons</span>
                  </span>
                </button>
                <button
                  onClick={() => { addCondition(pendingPort.attach, pendingPort.at); setPendingPort(null); }}
                  disabled={hasCondition(nodes)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-50 cursor-pointer flex items-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <GitBranch className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>
                    <span className="block text-xs font-medium text-gray-800">Follow check</span>
                    <span className="block text-[11px] text-gray-400">
                      {hasCondition(nodes)
                        ? "This flow already has one"
                        : "Branch on whether they follow"}
                    </span>
                  </span>
                </button>

                {pendingPort.detach && (
                  <button
                    onClick={() => { pendingPort.detach?.(); setPendingPort(null); }}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-red-50 cursor-pointer flex items-center gap-2.5 border-t border-gray-100 mt-1 pt-2"
                  >
                    <Unlink className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    <span>
                      <span className="block text-xs font-medium text-gray-800">Detach</span>
                      <span className="block text-[11px] text-gray-400">Leave this branch empty</span>
                    </span>
                  </button>
                )}

                <p className="text-[10px] text-gray-400 px-2.5 pt-1.5 pb-1 leading-relaxed border-t border-gray-100 mt-1">
                  Or drag this dot onto any existing card — several buttons can point at the same one.
                </p>
              </div>
            </>
          )}

          {/* Zoom controls — a compact pill, bottom-left */}
          <div data-canvas-ui className="absolute bottom-5 left-5 flex items-center gap-0.5 bg-white rounded-full shadow-md ring-1 ring-gray-200 px-1 py-1">
            <button onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.15))} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer" title="Zoom out">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setZoom(1); setPan({ x: 40, y: 40 }); }} className="px-2 text-[11px] font-medium text-gray-600 tabular-nums hover:text-gray-900 cursor-pointer" title="Reset to 100%">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.15))} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer" title="Zoom in">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button onClick={fit} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 cursor-pointer" title="Fit to screen">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="absolute bottom-6 right-5 text-[11px] text-gray-400 pointer-events-none text-right leading-relaxed">
            Scroll to zoom · drag to pan<br />
            Drag a dot onto a card to connect · click a filled dot to detach
          </p>
        </div>
      </div>

      {/* Preview rail — collapsible, so the canvas can take the full width */}
      {showPreview && (
        <aside className="w-[320px] shrink-0 border-l border-gray-100 bg-white overflow-y-auto">
          <div className="p-5">
            <PhonePreview nodes={nodes} username="mkexplores_" />
          </div>
        </aside>
      )}
    </div>
  );
}
