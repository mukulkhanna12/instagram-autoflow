import Link from "next/link";
import { Zap } from "lucide-react";

export const metadata = {
  title: "Privacy Policy — AutoFlow",
  description: "How AutoFlow handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link href="/" className="inline-flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">AutoFlow</span>
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: August 2026</p>

        <div className="prose prose-sm max-w-none text-gray-700 space-y-6 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">What AutoFlow is</h2>
            <p>
              AutoFlow is a self-hosted tool that lets the account owner automate replies to
              comments on their own Instagram reels and send follow-up direct messages. It is
              operated by the individual who deploys and connects it to their own Instagram
              account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Information we process</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Your Instagram/Facebook account data</strong> you authorize: your
                Instagram Business account id and username, the linked Facebook Page, and the
                access tokens needed to reply to comments and send messages on your behalf.
              </li>
              <li>
                <strong>Interaction data</strong> for people who comment on your automated
                reels: their Instagram user id and username, and their progress through your
                configured flow (greeted / asked to follow / completed). This is used solely to
                run the automation you set up and to show you basic analytics.
              </li>
              <li>
                <strong>Your login email</strong>, used only to send you a one-time sign-in code.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">How it's used</h2>
            <p>
              Data is used only to operate the automations you configure — posting your comment
              replies, sending your messages, checking follow status, and displaying your
              dashboard. We do not sell your data, and we do not use it for advertising or share
              it with third parties beyond the services required to run the app (Instagram/Meta
              APIs, the hosting provider, the database, and the email provider for login codes).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Storage & retention</h2>
            <p>
              Data is stored in the app's own PostgreSQL database. Access tokens are stored to
              keep the automation running and are refreshed periodically. You can disconnect your
              Instagram account at any time from Settings, which removes the connection, and you
              can delete automations and their associated conversation records from within the app.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Your controls</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Disconnect Instagram at any time (Settings → Disconnect).</li>
              <li>Turn any reel automation on or off, or delete it.</li>
              <li>Request deletion of your data by disconnecting and deleting your automations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
            <p>
              For any privacy question or a data-deletion request, contact the account owner who
              operates this AutoFlow deployment at the email associated with the account.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-100">
          <Link href="/" className="text-sm text-brand-600 hover:underline">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
