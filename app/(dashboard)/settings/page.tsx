"use client";
import { useEffect, useState } from "react";
import { Instagram, CheckCircle, AlertCircle, UserRound, LogOut, Check, KeyRound } from "lucide-react";
import { signOut } from "next-auth/react";
import { SignInMethods } from "@/components/sign-in-methods";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AccountRowSkeleton, FormPageSkeleton } from "@/components/skeletons";

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

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your profile and connected Instagram account</p>
      </div>

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
          {!["no_instagram", "instagram_auth_failed", "account_taken"].includes(errorMsg) && "Something went wrong. Please try again."}
        </div>
      )}

      <ProfileCard />
      <SignInMethodsCard linkedNow={searchParams.get("linked")} />

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
              <Button variant="outline" size="sm" onClick={disconnect} loading={disconnecting}>
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">No Instagram account connected</p>
                <p className="text-xs text-gray-400 mt-1">One click — log in with your Instagram <strong>Business</strong> or <strong>Creator</strong> account. No Facebook Page needed.</p>
              </div>
              <a
                href="/api/instagram/connect"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity whitespace-nowrap shadow-md"
              >
                <Instagram className="w-4 h-4" />
                Connect Instagram
              </a>
            </div>
          )}
        </CardBody>
      </Card>
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
    <div id="profile" className="scroll-mt-6">
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

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
                  {saved ? <><Check className="w-4 h-4" /> Saved</> : "Save changes"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="w-4 h-4" /> Log out
                </Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/** Settings → Sign-in methods; the same list the profile menu's dialog shows. */
function SignInMethodsCard({ linkedNow }: { linkedNow: string | null }) {
  return (
    <div id="sign-in" className="scroll-mt-6">
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
          <SignInMethods linkedNow={linkedNow} returnTo="/settings" />
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
