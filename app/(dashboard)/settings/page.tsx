"use client";
import { useEffect, useState } from "react";
import { Instagram, CheckCircle, AlertCircle, Loader2, ExternalLink, Copy, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface IgAccount {
  id: string;
  username: string;
  profilePicUrl?: string;
  pageName?: string;
  createdAt: string;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [account, setAccount] = useState<IgAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const successMsg = searchParams.get("success");
  const errorMsg = searchParams.get("error");

  useEffect(() => {
    fetch("/api/instagram/posts")
      .then(async (r) => {
        if (r.status === 404) return setAccount(null);
        // If we can fetch posts, account is connected — get account info separately
      })
      .catch(() => {})
      .finally(() => {
        fetch("/api/automations")
          .then((r) => r.json())
          .then((data) => {
            // We infer connection state from automations endpoint returning data vs error
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      });

    // Try fetching account info directly
    fetch("/api/instagram/account")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.account) setAccount(data.account); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function disconnect() {
    if (!confirm("Disconnect your Instagram account? All automations will be paused.")) return;
    setDisconnecting(true);
    await fetch("/api/instagram/disconnect", { method: "DELETE" });
    setAccount(null);
    setDisconnecting(false);
  }

  function copyWebhookUrl() {
    const url = `${window.location.origin}/api/webhooks/instagram`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${appUrl}/api/webhooks/instagram`;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your Instagram account and webhook configuration</p>
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
              <p className="text-xs text-gray-400">Connect your Instagram Business account</p>
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
                  {account.pageName && <p className="text-xs text-gray-400">{account.pageName}</p>}
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

      {/* Webhook configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
              <Zap className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Webhook Configuration</h2>
              <p className="text-xs text-gray-400">Add these to your Meta Developer App</p>
            </div>
          </div>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Webhook Callback URL</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 truncate">
                {webhookUrl}
              </code>
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                {copied ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1.5">Verify Token</label>
            <code className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-700">
              Your META_WEBHOOK_VERIFY_TOKEN value (from your environment variables)
            </code>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-700 mb-2">Subscribe to these webhook fields:</p>
            <div className="flex flex-wrap gap-2">
              {["comments", "messages"].map((f) => (
                <code key={f} className="bg-white border border-blue-200 text-blue-700 text-xs px-2 py-1 rounded-md">{f}</code>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Setup guide */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Setup Guide</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          {[
            { num: "1", title: "Create a Meta Developer App", link: "https://developers.facebook.com/apps", text: "Go to developers.facebook.com → Create App → Business type" },
            { num: "2", title: "Add the Instagram product (with Instagram login)", text: "In your app dashboard → Add Product → Instagram → 'API setup with Instagram login'. Copy the Instagram App ID and Secret into INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET." },
            { num: "3", title: "Configure OAuth redirect URI", text: `Under Instagram → Business login settings, add:\n${appUrl}/api/instagram/callback` },
            { num: "4", title: "Set up Webhooks", text: "Under the Instagram product → Webhooks: use the Webhook URL above + your verify token, subscribe to comments and messages." },
            { num: "5", title: "Connect your account", text: "Use the Connect Instagram button above — one click, no Facebook Page needed." },
          ].map((step) => (
            <div key={step.num} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {step.num}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  {step.link && (
                    <a href={step.link} target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-700">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed whitespace-pre-line">{step.text}</p>
              </div>
            </div>
          ))}
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
