"use client";
import { useEffect, useState } from "react";
import { ImageIcon, Loader2, Heart, MessageCircle, Zap, AlertCircle, ExternalLink, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";
import { truncate } from "@/lib/utils";

interface Post {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

interface QueuedFlow {
  id: string;
  name: string;
  position: number;
}

interface Automation {
  id: string;
  postId: string;
  isActive: boolean;
  fromTemplate: boolean;
  _count: { conversations: number };
}

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const [flows, setFlows] = useState<QueuedFlow[]>([]);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [postsRes, autoRes, flowsRes] = await Promise.all([
          fetch("/api/instagram/posts"),
          fetch("/api/automations"),
          fetch("/api/flows"),
        ]);
        if (!postsRes.ok) {
          const e = await postsRes.json();
          setError(e.error ?? "Failed to load posts");
          return;
        }
        const { posts } = await postsRes.json();
        const { automations } = await autoRes.json();
        const { flows } = await flowsRes.json();
        setPosts(posts ?? []);
        setAutomations(automations ?? []);
        setFlows(flows ?? []);
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Front of the queue — what "Attach flow" would hand to a reel.
  const nextFlow = flows[0] ?? null;

  async function attachFlow(post: Post) {
    setAttaching(post.id);
    setAttachError(null);
    try {
      const res = await fetch("/api/automations/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          postUrl: post.permalink,
          postCaption: post.caption,
          postThumbnail: post.thumbnail_url ?? post.media_url,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAttachError(data.error ?? "Couldn't attach the flow");
        return;
      }
      setAutomations((prev) => [...prev.filter((a) => a.postId !== post.id), data.automation]);
      // It's been consumed — the next reel gets the one behind it.
      setFlows((prev) => prev.slice(1));
    } finally {
      setAttaching(null);
    }
  }

  const getAutomation = (postId: string) => automations.find((a) => a.postId === postId);

  async function createAutomation(post: Post) {
    setCreating(post.id);
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          postUrl: post.permalink,
          postCaption: post.caption,
          postThumbnail: post.thumbnail_url ?? post.media_url,
        }),
      });
      const { automation } = await res.json();
      setAutomations((prev) => [...prev.filter((a) => a.postId !== post.id), automation]);
    } finally {
      setCreating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-3xl">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">{error}</p>
            <p className="text-sm text-amber-600 mt-1">
              {error.includes("No Instagram") ? (
                <>Please <Link href="/settings" className="underline">connect your Instagram account</Link> first.</>
              ) : "Check that your Instagram Business account is properly connected."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reels</h1>
        <p className="text-gray-500 text-sm mt-1">Select a reel to set up a comment-to-DM automation</p>
      </div>

      {nextFlow && (
        <div className="mb-6 flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-xl p-4">
          <Wand2 className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-brand-900">
              &ldquo;{nextFlow.name || "Next prepared flow"}&rdquo; is waiting
              {flows.length > 1 && <span className="font-normal"> ({flows.length - 1} more behind it)</span>}
            </p>
            <p className="text-xs text-brand-700 mt-0.5">
              Press <strong>Attach flow</strong> on the reel you meant it for and it goes Live straight away.
              Leave it and it attaches on its own when someone first comments.
            </p>
          </div>
        </div>
      )}

      {attachError && (
        <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{attachError}</p>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No reels found</p>
          <p className="text-sm mt-1">Make sure your Instagram Business account has reels.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {posts.map((post) => {
            const automation = getAutomation(post.id);
            const thumb = post.thumbnail_url ?? post.media_url;
            return (
              <div
                key={post.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-brand-200 hover:shadow-md transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-square bg-gray-100">
                  {thumb ? (
                    <Image src={thumb} alt={post.caption ?? "Post"} fill className="object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  {automation && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      {automation.fromTemplate && (
                        <Badge variant="info" className="bg-brand-100 text-brand-700">Auto</Badge>
                      )}
                      <Badge variant={automation.isActive ? "success" : "info"}>
                        {automation.isActive ? "Live" : "Draft"}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs text-gray-500 line-clamp-2 min-h-[2.5rem]">
                    {post.caption ? truncate(post.caption, 70) : "No caption"}
                  </p>

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.like_count ?? 0}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.comments_count ?? 0}</span>
                    {automation && (
                      <span className="flex items-center gap-1 ml-auto">
                        <Zap className="w-3 h-3 text-brand-400" />
                        {automation._count.conversations}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {automation ? (
                      <Link
                        href={`/posts/${automation.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        <Zap className="w-3 h-3" /> Configure
                      </Link>
                    ) : nextFlow ? (
                      // A flow is waiting. Attaching it here is the same thing
                      // the first comment would do — this just doesn't make you
                      // wait for one.
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        loading={attaching === post.id}
                        onClick={() => attachFlow(post)}
                        title={`Attach "${nextFlow.name || "the next prepared flow"}" and go Live`}
                      >
                        <Wand2 className="w-3 h-3" /> Attach flow
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1 text-xs"
                        loading={creating === post.id}
                        onClick={() => createAutomation(post)}
                      >
                        <Zap className="w-3 h-3" /> Automate
                      </Button>
                    )}
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
