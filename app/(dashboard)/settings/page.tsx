"use client";
import { useEffect, useState } from "react";
import { Instagram, CheckCircle, AlertCircle, UserRound, Check, KeyRound, Users, Settings2 } from "lucide-react";
import { GeneralPanel } from "@/components/workspace/general-panel";
import { colorTile } from "@/lib/workspace-colors";
import { TeamPanel } from "@/components/workspace/team-panel";
import Link from "next/link";
import { SignInMethods } from "@/components/sign-in-methods";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AccountRowSkeleton, FormPageSkeleton } from "@/components/skeletons";

// Two settings areas, side by side: the workspace (shared with your team) and
// your own account. The side menu groups them so each is one click away.
const WORKSPACE_TABS = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "team", label: "Team", icon: Users },
  { id: "instagram", label: "Instagram", icon: Instagram },
] as const;
const ACCOUNT_TABS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "sign-in", label: "Sign-in methods", icon: KeyRound },
] as const;
const TABS = [...WORKSPACE_TABS, ...ACCOUNT_TABS];
type TabId = (typeof TABS)[number]["id"];

interface IgAccount {
  id: string;
  username: string;
  profilePicUrl?: string;
  createdAt: string;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<IgAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  // Only the owner connects or disconnects; members see who can.
  const [isOwner, setIsOwner] = useState(true);
  const [ws, setWs] = useState<{ name: string; color: string } | null>(null);
  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setIsOwner(d.current.role === "owner");
        setWs({ name: d.current.name, color: d.current.color });
      })
      .catch(() => {});
  }, []);

  const tab = TABS.some((t) => t.id === searchParams.get("tab")) ? (searchParams.get("tab") as TabId) : "instagram";
  const successMsg = searchParams.get("success");
  const errorMsg = searchParams.get("error");

  useEffect(() => {
    fetch("/api/instagram/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.account) setAccount(data.account);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function disconnect() {
    if (!confirm("Disconnect your Instagram account?\n\nAll automations will be paused. Reconnect this same account later and they will start again — nothing is lost.")) return;
    setDisconnecting(true);
    await fetch("/api/instagram/disconnect", { method: "DELETE" });
    setAccount(null);
    setDisconnecting(false);
  }

  const tabLink = (id: TabId) => (id === "instagram" ? "/settings" : `/settings?tab=${id}`);
  const item = (t: (typeof TABS)[number]) => (
    <Link
      key={t.id}
      href={tabLink(t.id)}
      scroll={false}
      aria-current={tab === t.id ? "page" : undefined}
      className={`shrink-0 flex items-center gap-2.5 rounded-xl px-3 h-10 text-sm font-semibold transition-colors ${
        tab === t.id ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-900 hover:bg-white/60"
      }`}
    >
      <t.icon className="w-4 h-4" /> {t.label}
    </Link>
  );

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Your workspace — shared with your team — and your own account, side by side.</p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
      <nav className="md:sticky md:top-6 self-start rounded-2xl bg-[#eef0eb] p-2 flex md:flex-col gap-1 overflow-x-auto" aria-label="Settings sections">
        <p className="hidden md:flex items-center gap-2 px-3 pt-2 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">
          Workspace
        </p>
        {ws && (
          <p className="hidden md:flex items-center gap-2 px-3 pb-2 text-sm font-bold text-gray-900 min-w-0">
            <span className={`w-6 h-6 rounded-lg text-[11px] font-extrabold flex items-center justify-center shrink-0 ${colorTile(ws.color)}`}>
              {(ws.name.trim()[0] ?? "W").toUpperCase()}
            </span>
            <span className="truncate">{ws.name}</span>
          </p>
        )}
        {WORKSPACE_TABS.map(item)}
        <span className="hidden md:block my-2 h-px bg-gray-200 mx-3" />
        <p className="hidden md:block px-3 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-gray-400">Your account</p>
        {ACCOUNT_TABS.map(item)}
      </nav>

      <div className="min-w-0 space-y-6">

      {tab === "instagram" && (<>
      {/* Status banners */}
      {successMsg === "connected" && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          Instagram account connected successfully!
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {errorMsg === "no_instagram" && "Couldn't read your Instagram account. Make sure it's a professional (Business or Creator) account."}
          {errorMsg === "instagram_auth_failed" && "Instagram authorization failed. Please try again."}
          {errorMsg === "account_taken" && "That Instagram account is already connected to another AutoFlow account. Disconnect it there first, or connect a different Instagram account."}
          {errorMsg === "owner_only" && "Only the workspace owner can connect or change the Instagram account."}
          {errorMsg === "workspace_has_account" && "This workspace already has an Instagram account. Disconnect it first, or create a new workspace for the other account."}
          {!["no_instagram", "instagram_auth_failed", "account_taken", "owner_only", "workspace_has_account"].includes(errorMsg) && "Something went wrong. Please try again."}
        </div>
      )}


      {/* Instagram account card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-400 to-brand-500 flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Instagram Account</h2>
              <p className="text-xs text-gray-400">Connect your Instagram professional account</p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <AccountRowSkeleton />
          ) : account ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {account.profilePicUrl ? (
                  <Image src={account.profilePicUrl} alt={account.username} width={44} height={44} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-400 to-brand-400 flex items-center justify-center text-white font-bold">
                    {account.username[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-900">@{account.username}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle className="w-3 h-3" /> Connected
                  </span>
                </div>
              </div>
              {isOwner ? (
                <Button variant="outline" size="sm" onClick={disconnect} loading={disconnecting}>
                  Disconnect
                </Button>
              ) : (
                <span className="text-xs text-gray-400">Managed by the workspace owner</span>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">No Instagram account connected</p>
                <p className="text-xs text-gray-400 mt-1">One click — log in with your Instagram <strong>Business</strong> or <strong>Creator</strong> account. No Facebook Page needed.</p>
              </div>
              {isOwner ? (
                <a
                  href="/api/instagram/connect"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap shadow-md"
                >
                  <Instagram className="w-4 h-4" />
                  Connect Instagram
                </a>
              ) : (
                <p className="text-sm text-gray-500">Ask the workspace owner to connect Instagram.</p>
              )}
            </div>
          )}
        </CardBody>
      </Card>
      </>)}
      {tab === "general" && <GeneralPanel />}
      {tab === "profile" && <ProfileCard />}
      {tab === "team" && <TeamPanel />}
      {tab === "sign-in" && <SignInMethodsCard linkedNow={searchParams.get("linked")} />}
      </div>
      </div>
    </div>
  );
}

interface Profile {
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
}

/** Settings → Profile: the display name is editable; the email is the login and isn't. */
function ProfileCard() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          setProfile(data.user);
          setName(data.user.name && data.user.name !== "AutoFlow" ? data.user.name : "");
        }
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? "Couldn't save — try again.");
    setProfile(data.user);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // The top bar is rendered on the server; refresh it so the new name shows.
    router.refresh();
  }

  const current = profile?.name && profile.name !== "AutoFlow" ? profile.name : "";
  const dirty = name.trim() !== current;

  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-lime-200 flex items-center justify-center">
              <UserRound className="w-5 h-5 text-brand-900" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Profile</h2>
              <p className="text-xs text-gray-400">How you appear in AutoFlow</p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {!profile ? (
            <AccountRowSkeleton />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="relative w-14 h-14 rounded-full overflow-hidden bg-lime-200 shrink-0 flex items-center justify-center">
                  {profile.image ? (
                    <Image src={profile.image} alt="" fill unoptimized className="object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-brand-900">{(name || profile.email)[0]?.toUpperCase()}</span>
                  )}
                </span>
                <div className="text-sm">
                  <p className="font-semibold text-gray-900">{current || "No name set"}</p>
                  <p className="text-gray-400">
                    Member since {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Display name" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="Your name" error={error ?? undefined} />
                <Input label="Email" value={profile.email} disabled hint="Your login — it can't be changed here." />
              </div>

              <div className="pt-1">
                <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
                  {saved ? <><Check className="w-4 h-4" /> Saved</> : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/** Settings → Sign-in methods. The profile menu's "Add sign-in options" opens this tab. */
function SignInMethodsCard({ linkedNow }: { linkedNow: string | null }) {
  return (
    <div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Sign-in methods</h2>
              <p className="text-xs text-gray-400">Link Google or Facebook, then log in with any of them</p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <SignInMethods linkedNow={linkedNow} returnTo="/settings?tab=sign-in" />
        </CardBody>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<FormPageSkeleton label="Loading settings" />}>
      <SettingsContent />
    </Suspense>
  );
}
