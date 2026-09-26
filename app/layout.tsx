import type { Metadata } from "next";
import "./globals.css";
import { CookieNotice } from "@/components/cookie-notice";

export const metadata: Metadata = {
  title: "AutoFlow – Instagram DM Automation",
  description: "Automate Instagram comment replies and DM flows",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <CookieNotice />
      </body>
    </html>
  );
}
