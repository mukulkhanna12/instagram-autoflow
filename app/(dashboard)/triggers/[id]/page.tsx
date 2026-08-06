"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2, Plus, X, ArrowLeft, ImageIcon, Search, Minus, Maximize2,
  Eye, Check, ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PhonePreview } from "@/components/phone-preview";
import { TriggerInspector } from "@/components/trigger-inspector";
import {
  TriggerCard, MessageCard, ConditionCard, CARD_W,
} from "@/components/trigger-nodes";
import {
  getTrigger, upsertTrigger, uid, commentSource, dmSource,
  type Trigger, type FlowNode, type FlowButton, type TriggerReel, type TriggerSource,
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
  const [showPreview, setShowPreview] = useState(true);
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

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-node]")) return; // dragging a card shouldn't pan
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

  function addMessage(attach: (newId: string) => void) {
    const nid = uid("msg");
    setNodes((prev) => [...prev, {
      id: nid, type: "message",
      title: `Send Message #${prev.filter((n) => n.type === "message").length + 1}`,
      text: "", buttons: [],
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

  function addSource(kind: "comment" | "dm") {
    const src = kind === "comment" ? commentSource() : dmSource();
    setNodes((prev) => prev.map((n) =>
      n.type === "trigger" ? { ...n, sources: [...n.sources, src] } : n));
    setEditingSourceId(src.id);
  }

  function removeSource(sourceId: string) {
    setNodes((prev) => prev.map((n) =>
      n.type === "trigger" ? { ...n, sources: n.sources.filter((x) => x.id !== sourceId) } : n));
  }

  function addButton(nid: string) {
    setNodes((prev) => prev.map((n) =>
      n.id === nid && n.type === "message"
        ? { ...n, buttons: [...n.buttons, { id: uid("btn"), label: "New button", kind: "next", next: null } as FlowButton] }
        : n));
  }

  function removeNode(nid: string) {
    setNodes((prev) => prev.filter((n) => n.id !== nid).map((n) => {
      if (n.type === "trigger" && n.next === nid) return { ...n, next: null };
      if (n.type === "condition") return { ...n, yes: n.yes === nid ? null : n.yes, no: n.no === nid ? null : n.no };
      if (n.type === "message") return { ...n, buttons: n.buttons.map((b) => (b.next === nid ? { ...b, next: null } : b)) };
      return n;
    }));
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
          addSource={addSource}
          removeSource={removeSource}
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
            </svg>

            {nodes.map((node) => {
              const pos = layout.get(node.id) ?? { x: 0, y: 0 };
              return (
                <div
                  key={node.id}
                  data-node
                  ref={(el) => { if (el) nodeEls.current.set(node.id, el); else nodeEls.current.delete(node.id); }}
                  className="absolute"
                  style={{ left: pos.x, top: pos.y }}
                >
                  {node.type === "trigger" && (
                    <TriggerCard
                      node={node} selected={selectedId === node.id}
                      onSelect={() => { setSelectedId(node.id); setDrawerOpen(true); }}
                      registerPort={registerPort}
                      onAddNext={() => !node.next && addMessage((nid) => patch(node.id, { next: nid } as Partial<FlowNode>))}
                      onEditSource={(sid) => { setSelectedId(node.id); setDrawerOpen(true); setEditingSourceId(sid); }}
                      onAddSource={() => { setSelectedId(node.id); setDrawerOpen(true); addSource("dm"); }}
                    />
                  )}
                  {node.type === "message" && (
                    <MessageCard
                      node={node} index={msgIndex(node.id)} selected={selectedId === node.id}
                      onSelect={() => { setSelectedId(node.id); setDrawerOpen(true); }}
                      registerPort={registerPort}
                      onAddFromButton={(bid) => {
                        if (node.buttons.find((b) => b.id === bid)?.next) return;
                        addMessage((nid) => setNodes((prev) => prev.map((x) =>
                          x.id === node.id && x.type === "message"
                            ? { ...x, buttons: x.buttons.map((b) => (b.id === bid ? { ...b, next: nid } : b)) }
                            : x)));
                      }}
                      onAddButton={() => addButton(node.id)}
                      onDelete={() => removeNode(node.id)}
                    />
                  )}
                  {node.type === "condition" && (
                    <ConditionCard
                      node={node} selected={selectedId === node.id}
                      onSelect={() => { setSelectedId(node.id); setDrawerOpen(true); }}
                      registerPort={registerPort}
                      onAddBranch={(b) => !node[b] && addMessage((nid) => patch(node.id, { [b]: nid } as unknown as Partial<FlowNode>))}
                      onDelete={() => removeNode(node.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {!drawerOpen && selected && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-16 bg-white rounded-r-lg shadow-md ring-1 ring-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 cursor-pointer"
              title="Show the editing panel"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {/* Zoom controls — a compact pill, bottom-left */}
          <div className="absolute bottom-5 left-5 flex items-center gap-0.5 bg-white rounded-full shadow-md ring-1 ring-gray-200 px-1 py-1">
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

          <p className="absolute bottom-6 right-5 text-[11px] text-gray-400 pointer-events-none">
            Scroll to zoom · drag to pan
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
