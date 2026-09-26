"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Copy, Crown, Link2, Mail, Pencil, Send, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AccountRowSkeleton } from "@/components/skeletons";
import { ROLE_BLURB, ROLE_LABEL, isRole } from "@/lib/roles";

interface Member { userId: string; name: string | null; email: string; image: string | null; role: string; joinedAt: string }
interface Invite { id: string; email: string; createdAt: string; expiresAt: string; status: "pending" | "expired" | "revoked" | "accepted" }
interface Data {
  you: { userId: string; role: "owner" | "member" };
  workspace: { id: string; name: string };
  members: Member[];
  invites: Invite[];
}

/**
 * Settings → Team. Everyone sees who's in the workspace; the owner can rename
 * it, invite by email (the link is also shown to share by hand), cancel
 * invites and remove people. Members can leave.
 */
export function TeamPanel() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ email: string; url: string; emailed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  async function load() {
    const res = await fetch("/api/workspaces/members");
    if (res.ok) {
      const d: Data = await res.json();
      setData(d);
      setName(d.workspace.name);
    }
  }
  useEffect(() => { load(); }, []);

  const owner = data?.you.role === "owner";

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    setSent(null);
    const res = await fetch("/api/workspaces/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const d = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) return setError(d.error ?? "Couldn't send the invite.");
    setSent({ email, url: d.url, emailed: d.emailed });
    setEmail("");
    load();
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the link is on screen to copy by hand.
    }
  }

  async function revoke(id: string) {
    await fetch(`/api/workspaces/invites/${id}`, { method: "DELETE" });
    load();
  }

  async function remove(m: Member) {
    const leaving = m.userId === data?.you.userId;
    const msg = leaving
      ? `Leave ${data?.workspace.name}? You'll lose access until you're invited again.`
      : `Remove ${m.name ?? m.email} from ${data?.workspace.name}? They lose access straight away.`;
    if (!confirm(msg)) return;
    const res = await fetch(`/api/workspaces/members/${m.userId}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json().catch(() => ({}))).error ?? "Couldn't do that.");
    if (leaving) {
      router.push("/dashboard");
      router.refresh();
    } else load();
  }

  async function rename() {
    const res = await fetch("/api/workspaces/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setEditingName(false);
      load();
      router.refresh();
    }
  }

  if (!data) {
    return <Card><CardBody><AccountRowSkeleton /></CardBody></Card>;
  }

  const pending = data.invites.filter((i) => i.status === "pending" || i.status === "expired");

  return (
    <div className="space-y-6">
      {/* Workspace + invite */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-900 text-lime flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              {editingName ? (
                <form onSubmit={(e) => { e.preventDefault(); rename(); }} className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={name}
                    maxLength={60}
                    onChange={(e) => setName(e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-gray-200 px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button type="submit" className="w-9 h-9 rounded-lg bg-brand-700 text-white flex items-center justify-center cursor-pointer" aria-label="Save name"><Check className="w-4 h-4" /></button>
                  <button type="button" onClick={() => { setEditingName(false); setName(data.workspace.name); }} className="w-9 h-9 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center cursor-pointer" aria-label="Cancel"><X className="w-4 h-4" /></button>
                </form>
              ) : (
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  {data.workspace.name}
                  {owner && (
                    <button onClick={() => setEditingName(true)} className="text-gray-300 hover:text-gray-600 cursor-pointer" aria-label="Rename workspace">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                </h2>
              )}
              <p className="text-xs text-gray-400">{data.members.length} {data.members.length === 1 ? "person" : "people"} · one Instagram account</p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {owner ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">Invite someone</p>
              <form onSubmit={invite} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teammate@example.com"
                    className="w-full h-11 rounded-full border border-gray-200 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <Button type="submit" loading={sending} className="h-11 px-5">
                  <Send className="w-4 h-4" /> Send invite
                </Button>
              </form>
              <p className="text-xs text-gray-400">
                They join as a <strong>Member</strong> — {ROLE_BLURB.member.toLowerCase()}. Only you manage the team and
                the Instagram connection.
              </p>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {sent && (
                <div className="rounded-2xl bg-lime-50 border border-lime-200 p-4 space-y-2">
                  <p className="text-sm text-gray-900">
                    {sent.emailed ? <>Invite emailed to <strong>{sent.email}</strong>. You can also share this link:</> : <>Couldn&apos;t email <strong>{sent.email}</strong> — share this link with them instead:</>}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate rounded-lg bg-white border border-gray-200 px-3 py-2 text-xs text-gray-700">{sent.url}</code>
                    <Button variant="outline" size="sm" onClick={() => copy(sent.url)}>
                      {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy</>}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">Works once, for that email address, for 7 days.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              You&apos;re a <strong>Member</strong> here. The owner invites people and manages the Instagram connection.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">People</h2>
        </CardHeader>
        <div className="divide-y divide-gray-100">
          {data.members.map((m) => {
            const role = isRole(m.role) ? m.role : "member";
            const me = m.userId === data.you.userId;
            return (
              <div key={m.userId} className="flex items-center gap-3 px-6 py-4">
                <span className="relative w-10 h-10 rounded-full overflow-hidden bg-lime-200 shrink-0 flex items-center justify-center">
                  {m.image ? <Image src={m.image} alt="" fill unoptimized className="object-cover" /> : <span className="font-bold text-brand-900">{(m.name ?? m.email)[0]?.toUpperCase()}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {m.name ?? m.email}{me && <span className="text-gray-400 font-normal"> (you)</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{m.email}</p>
                </div>
                <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-1 ${role === "owner" ? "bg-brand-900 text-lime" : "bg-gray-100 text-gray-600"}`}>
                  {role === "owner" && <Crown className="w-3 h-3" />} {ROLE_LABEL[role]}
                </span>
                {role !== "owner" && (owner || me) && (
                  <Button variant="ghost" size="sm" onClick={() => remove(m)}>
                    {me ? "Leave" : "Remove"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Pending invites — owner only */}
      {owner && pending.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900">Invites waiting</h2>
          </CardHeader>
          <div className="divide-y divide-gray-100">
            {pending.map((i) => (
              <div key={i.id} className="flex items-center gap-3 px-6 py-4">
                <span className="w-10 h-10 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4 text-gray-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{i.email}</p>
                  <p className="text-xs text-gray-400">
                    {i.status === "expired"
                      ? "Expired — send a new invite"
                      : `Expires ${new Date(i.expiresAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setEmail(i.email); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  Resend
                </Button>
                {i.status === "pending" && (
                  <Button variant="ghost" size="sm" onClick={() => revoke(i.id)}>Cancel</Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
