"use client";
import { useEffect, useState } from "react";
import { Instagram, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
        <p className="text-gray-500 text-sm mt-1">Manage your connected Instagram account</p>
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
          {!["no_instagram", "instagram_auth_failed"].includes(errorMsg) && "Something went wrong. Please try again."}
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
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading...
            </div>
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

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-8"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
