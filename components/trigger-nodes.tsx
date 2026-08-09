"use client";
import { Zap, Instagram, MessageSquare, GitBranch, Plus, Trash2, Pencil, Link2, Send, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

/**
 * Node cards for the trigger canvas.
 *
 * Design-only for now — these render shape and state, they don't run anything.
 * Every outgoing connection point is a `Port`, and each one registers itself by
 * id so the canvas can measure where it sits and draw the curve. A button owns
 * its own port, which is what allows one message to branch into several.
 */

import type { FlowNode } from "@/lib/trigger-store";
import { MAX_BUTTONS } from "@/lib/buttons";

export const CARD_W = 288;

type PortRegister = (id: string, el: HTMLElement | null) => void;

/**
 * Everything a port needs from the canvas. Bundled rather than threaded through
 * each card as three separate props, because every card wires them identically
 * and only the port id differs.
 */
export interface PortHandlers {
  register: PortRegister;
  /** Tap: connect an open port, or cut the arrow from a connected one. */
  onClick: (portId: string, connected: boolean, e: React.MouseEvent) => void;
  /** Drag: pull an arrow out and drop it on the card it should point at. */
  onPointerDown: (portId: string, e: React.PointerEvent) => void;
}

/**
 * An outgoing connection point — filled when connected, hollow when open.
 *
 * It answers to both gestures because both are natural here: drag it onto a
 * card to rewire, or click it to detach and leave the branch dangling. A
 * connected port turns red on hover to say the click will cut, not connect.
 */
function Port({
  id, ports, connected, title,
}: {
  id: string;
  ports: PortHandlers;
  connected: boolean;
  title?: string;
}) {
  return (
    <button
      ref={(el) => ports.register(id, el)}
      onPointerDown={(e) => ports.onPointerDown(id, e)}
      onClick={(e) => { e.stopPropagation(); ports.onClick(id, connected, e); }}
      title={title ?? (connected
        ? "Drag to another card to move this arrow · click to detach"
        : "Drag onto a card to connect · click to add the next step")}
      className={`absolute -right-[7px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 transition-all cursor-crosshair z-10 touch-none ${
        connected
          ? "bg-gray-400 border-white hover:bg-red-500 hover:scale-125"
          : "bg-white border-gray-300 hover:border-brand-500 hover:scale-125"
      }`}
    />
  );
}

function CardShell({
  selected, onClick, children, tone = "white",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  tone?: "white" | "amber";
}) {
  return (
    <div
      onClick={onClick}
      style={{ width: CARD_W }}
      className={`group relative rounded-2xl bg-white shadow-sm cursor-pointer transition-all ${
        selected
          ? "ring-2 ring-brand-400 shadow-md"
          : tone === "amber"
          ? "ring-1 ring-amber-200 hover:shadow-md"
          : "ring-1 ring-gray-200/80 hover:shadow-md"
      }`}
    >
      {children}
    </div>
  );
}

/** Small Instagram-style header, matching the reference design. */
function NodeHeader({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 flex items-center justify-center shrink-0">
        {icon ?? <Instagram className="w-3.5 h-3.5 text-white" />}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 leading-none">Instagram</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
      </div>
      <MessageSquare className="w-3.5 h-3.5 text-gray-300 ml-auto shrink-0" />
    </div>
  );
}

export function TriggerCard({
  node, selected, onSelect, onEdit, ports, onEditSource,
}: {
  node: Extract<FlowNode, { type: "trigger" }>;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  ports: PortHandlers;
  onEditSource: (sourceId: string) => void;
}) {
  return (
    <CardShell selected={selected} onClick={onSelect}>
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
        <Zap className="w-4 h-4 text-gray-700" />
        <p className="text-sm font-semibold text-gray-900">When…</p>
      </div>

      <div className="px-3 pb-3 space-y-2">
        {node.sources.map((src) => (
          <button
            key={src.id}
            onClick={(e) => { e.stopPropagation(); onEditSource(src.id); }}
            className={`w-full text-left rounded-xl border p-2.5 flex items-center gap-2.5 transition-colors cursor-pointer ${
              src.kind === "comment"
                ? "bg-emerald-50 border-emerald-100 hover:border-emerald-300"
                : "bg-sky-50 border-sky-100 hover:border-sky-300"
            }`}
          >
            {src.kind === "comment" && src.reel?.thumbnail ? (
              <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0">
                <Image src={src.reel.thumbnail} alt="" fill className="object-cover" />
              </div>
            ) : (
              <div className={`w-9 h-9 rounded-lg bg-white border flex items-center justify-center shrink-0 ${
                src.kind === "comment" ? "border-emerald-200" : "border-sky-200"
              }`}>
                {src.kind === "comment"
                  ? <ImageIcon className="w-4 h-4 text-emerald-500" />
                  : <Send className="w-4 h-4 text-sky-500" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-800 leading-tight">
                {src.kind === "comment" ? "Comments on a reel" : "Sends you a DM"}
              </p>
              <p className="text-[11px] text-gray-500 truncate">
                {src.include.length > 0 ? src.include.join(", ") : "Any " + (src.kind === "comment" ? "comment" : "message")}
              </p>
            </div>
            {/* Both states are labelled — "no public reply" is a deliberate
                choice, and silence on the card looks like an unset one. */}
            <span
              className={`text-[9px] font-bold tracking-wide rounded px-1.5 py-0.5 shrink-0 ${
                src.autoReply ? "text-gray-500 bg-white/70" : "text-gray-400 bg-white/50 line-through"
              }`}
              title={src.autoReply
                ? `Replies publicly, rotating ${src.replies.filter(Boolean).length} variant(s)`
                : "Nothing is posted publicly — only the DM goes out"}
            >
              {src.kind === "comment" ? "PUBLIC REPLY" : "AUTO-REPLY"}
            </span>
          </button>
        ))}

      </div>

      <div className="relative border-t border-gray-100 px-4 py-2 flex justify-end">
        <span className="text-[11px] text-gray-400">Then</span>
        <Port id={`${node.id}:out`} ports={ports} connected={!!node.next} />
      </div>

      {/* No delete: a flow without its trigger has nothing to start it. */}
      <CardActions selected={selected} onEdit={onEdit} />
    </CardShell>
  );
}

export function MessageCard({
  node, index, selected, onSelect, onEdit, ports, onAddButton, onDelete,
}: {
  node: Extract<FlowNode, { type: "message" }>;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  ports: PortHandlers;
  onAddButton: () => void;
  onDelete: () => void;
}) {
  return (
    <CardShell selected={selected} onClick={onSelect}>
      <NodeHeader title={node.title || `Send Message #${index}`} />

      <div className="px-3 pb-3">
        <div className="rounded-xl bg-gray-100 px-3 py-2.5 text-xs text-gray-800 leading-relaxed whitespace-pre-line min-h-[2.5rem]">
          {renderMergeTags(node.text) }
        </div>

        {node.buttons.map((b) => (
          <div
            key={b.id}
            className="relative mt-1.5 rounded-xl bg-white border border-gray-200 px-3 py-2 flex items-center justify-center gap-1.5"
          >
            <span className="text-xs font-medium text-gray-800 truncate">
              {b.label || "Button"}
            </span>
            {b.kind === "link" && <Link2 className="w-3 h-3 text-brand-400 shrink-0" />}
            {b.kind === "next" && (
              <Port id={`${node.id}:btn:${b.id}`} ports={ports} connected={!!b.next} />
            )}
          </div>
        ))}

        {/* Instagram takes three buttons at most; a fourth is rejected. */}
        {node.buttons.length < MAX_BUTTONS ? (
          <button
            onClick={(e) => { e.stopPropagation(); onAddButton(); }}
            className="mt-1.5 w-full rounded-xl border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3 h-3" /> Add button
          </button>
        ) : (
          <p className="mt-1.5 text-center text-[11px] text-gray-400">
            Instagram allows a maximum of 3 buttons
          </p>
        )}
      </div>

      <CardActions selected={selected} onEdit={onEdit} onDelete={onDelete} deleteLabel="Remove this message" />
    </CardShell>
  );
}

export function ConditionCard({
  node, selected, onSelect, onEdit, ports, onDelete,
}: {
  node: Extract<FlowNode, { type: "condition" }>;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  ports: PortHandlers;
  onDelete: () => void;
}) {
  return (
    <CardShell selected={selected} onClick={onSelect} tone="amber">
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <GitBranch className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div>
          <p className="text-[10px] text-gray-400 leading-none">Condition</p>
          <p className="text-sm font-semibold text-gray-900">{node.label}</p>
        </div>
      </div>

      <div className="px-3 pb-3">
        <p className="text-[11px] text-gray-400 px-1 pb-2">
          Checked when they tap — never at comment time.
        </p>

        {(["yes", "no"] as const).map((branch) => (
          <div
            key={branch}
            className="relative mt-1.5 rounded-xl bg-white border border-gray-200 px-3 py-2 flex items-center gap-2"
          >
            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
              branch === "yes" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              {branch}
            </span>
            <span className="text-xs text-gray-500">
              {branch === "yes" ? "They follow you" : "Not following yet"}
            </span>
            <Port id={`${node.id}:${branch}`} ports={ports} connected={!!node[branch]} />
          </div>
        ))}
      </div>

      <CardActions selected={selected} onEdit={onEdit} onDelete={onDelete} deleteLabel="Remove the follow check" />
    </CardShell>
  );
}

/**
 * The controls on a card: edit, and optionally remove.
 *
 * Edit is a button rather than a click on the card itself. The card is its own
 * drag handle, so opening the panel on contact meant every attempt to move a
 * card threw the drawer open — pressing a card now only selects it, and this is
 * the deliberate way in.
 *
 * Shown on hover as well as on selection, so both are discoverable without
 * having to select something first.
 */
function CardActions({
  selected, onEdit, onDelete, deleteLabel,
}: {
  selected: boolean;
  onEdit: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
}) {
  const cls = `w-6 h-6 rounded-full bg-white ring-1 ring-gray-200 shadow-sm flex items-center justify-center text-gray-400 cursor-pointer`;
  return (
    <div
      className={`absolute -top-2.5 -right-2.5 flex items-center gap-1 transition-opacity ${
        selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        className={`${cls} hover:text-brand-600 hover:ring-brand-200`}
        title="Edit this step"
      >
        <Pencil className="w-3 h-3" />
      </button>
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={`${cls} hover:text-red-500 hover:ring-red-200`}
          title={deleteLabel}
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/** Renders {{merge_tags}} as chips, the way the reference design shows them. */
export function renderMergeTags(text: string) {
  if (!text) return <span className="text-gray-400">Empty message</span>;
  return text.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
    /^\{\{[^}]+\}\}$/.test(part) ? (
      <span key={i} className="inline-block bg-blue-500 text-white rounded px-1.5 py-0.5 text-[11px] font-medium mx-0.5">
        {part.replace(/[{}]/g, "").replace(/_/g, " ")}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
