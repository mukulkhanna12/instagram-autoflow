import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoFlow – Instagram DM Automation",
  description: "Automate Instagram comment replies and DM flows",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
