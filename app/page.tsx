import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MessageCircle, Zap, Users, ArrowRight, CheckCircle } from "lucide-react";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">AutoFlow</span>
        </div>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 text-brand-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          Instagram DM Automation
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Turn comments into
          <span className="block bg-gradient-to-r from-brand-600 to-pink-500 bg-clip-text text-transparent">
            automated conversations
          </span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Auto-reply to Instagram post comments, send personalized DMs, check follower status,
          and guide users to your links — all on autopilot.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-brand-700 transition-all hover:shadow-lg hover:shadow-brand-200 active:scale-[0.98]"
          >
            Start for free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Flow preview */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-br from-gray-900 to-brand-900 rounded-2xl p-8 md:p-12">
          <h2 className="text-white font-bold text-2xl mb-8 text-center">How the flow works</h2>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { icon: "💬", step: "1", title: "Comment on post", desc: "Someone comments on your selected Instagram post" },
              { icon: "📩", step: "2", title: "Auto-reply", desc: "Instantly replies: \"I've sent details to your DM!\"" },
              { icon: "🤝", step: "3", title: "Check follower", desc: "Bot checks if they follow you. If not, asks them to follow." },
              { icon: "🔗", step: "4", title: "Send details", desc: "Sends final message with a button linking to your page" },
            ].map((item) => (
              <div key={item.step} className="bg-white/10 rounded-xl p-5 text-white">
                <div className="text-3xl mb-3">{item.icon}</div>
                <div className="text-xs font-semibold text-brand-300 mb-1">STEP {item.step}</div>
                <div className="font-semibold text-sm mb-2">{item.title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything you need</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: MessageCircle, color: "bg-blue-50 text-blue-600", title: "Smart Comment Reply", desc: "Automatically reply to comments on any Instagram post you choose, keeping every reply consistent." },
            { icon: Zap, color: "bg-brand-50 text-brand-600", title: "DM Flow Builder", desc: "Build multi-step DM conversations with buttons, follower checks, and external links." },
            { icon: Users, color: "bg-pink-50 text-pink-600", title: "Multi-Account", desc: "Invite your team or friends to manage their own Instagram accounts independently." },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-4 p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-md transition-all">
              <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center`}>
                <f.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Free tier callout */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="bg-brand-50 border border-brand-100 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">100% Free to use</h3>
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            {["Unlimited automations", "Google Sign In", "Real-time DM flow"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors"
          >
            Sign in with Google <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400">
        AutoFlow — Instagram DM Automation
      </footer>
    </div>
  );
}
