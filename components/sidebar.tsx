"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ImageIcon, Workflow, Lightbulb,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, BookMarked, BarChart3, LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand";
import { WorkspaceSwitcher } from "@/components/workspace/switcher";
import type { Role } from "@/lib/roles";

interface SidebarProps {
  usage: { replies: number; repliesLimit: number; accounts: number; accountsLimit: number };
  workspace: {
    current: { id: string; name: string; color: string; role: Role };
    all: Array<{ id: string; name: string; color: string; role: Role }>;
    invites: Array<{ id: string; workspaceName: string; invitedBy: string }>;
  };
}

const menu = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/triggers", icon: Workflow, label: "Automations" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/posts", icon: ImageIcon, label: "Reels" },
  { href: "/playbooks", icon: BookMarked, label: "Playbooks" },
];

const general = [
  // Opens in a new tab, so reading a guide doesn't lose your place in the app.
  { href: "/help", icon: LifeBuoy, label: "Help", newTab: true },
  { href: "/feedback", icon: Lightbulb, label: "Feedback" },
  { href: "/privacy", icon: ShieldCheck, label: "Privacy" },
];

const COLLAPSED_KEY = "autoflow.sidebar.collapsed";

export function Sidebar({ usage, workspace }: SidebarProps) {
  const path = usePathname();

  // Read after mount, not during render: the server has no localStorage, and
  // seeding state from it directly would make the first client render disagree.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {}
  }, []);

  function toggle() {
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <aside
      className={cn(
        "shrink-0 h-[calc(100vh-1.5rem)] sticky top-3 rounded-3xl bg-white flex flex-col transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-64"
      )}
    >
      {/* Logo + collapse */}
      <div className={cn("flex items-center pt-6 pb-5", collapsed ? "flex-col gap-3 px-3" : "px-6")}>
        {collapsed ? <LogoMark /> : <Logo href="/dashboard" />}
        <button
          onClick={toggle}
          className={cn("text-gray-300 hover:text-gray-700 cursor-pointer", !collapsed && "ml-auto")}
          title={collapsed ? "Expand the sidebar" : "Collapse to icons"}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      <div data-tour="workspace" className={cn("mb-3", collapsed ? "px-3" : "px-4")}>
        <WorkspaceSwitcher current={workspace.current} all={workspace.all} invites={workspace.invites} collapsed={collapsed} />
      </div>

      {/* Menu and usage scroll together on short screens, with soft fades at the
          edges instead of items cutting off under a hard line. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col pt-3 [mask-image:linear-gradient(to_bottom,transparent,black_14px,black_calc(100%-14px),transparent)]">
      <nav className="mt-1">
        <NavGroup title="Menu" collapsed={collapsed}>
          {menu.map((l) => <NavItem key={l.href} {...l} active={isActive(l.href)} collapsed={collapsed} />)}
        </NavGroup>
        <NavGroup title="General" collapsed={collapsed}>
          {general.map((l) => <NavItem key={l.href} {...l} active={isActive(l.href)} collapsed={collapsed} />)}
        </NavGroup>
      </nav>

      {!collapsed && <div className="mt-auto pt-2"><UsagePanel {...usage} /></div>}
      </div>
    </aside>
  );
}

function NavGroup({ title, collapsed, children }: { title: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      {!collapsed && (
        <p className="px-7 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">{title}</p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavItem({
  href, icon: Icon, label, active, collapsed, newTab,
}: {
  newTab?: boolean;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      data-tour={`nav-${href.slice(1)}`}
      title={collapsed ? label : undefined}
      className={cn(
        "relative flex items-center text-sm transition-colors",
        collapsed ? "justify-center py-2.5" : "gap-3 pl-7 pr-4 py-2",
        active ? "text-gray-950 font-bold" : "text-gray-500 font-medium hover:text-gray-950"
      )}
    >
      {/* The active marker from 6.png: a rounded bar on the panel's edge. */}
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-1.5 rounded-r-full bg-brand-700" />}
      <Icon className={cn("w-[18px] h-[18px] shrink-0", active ? "text-brand-700" : "text-gray-400")} />
      {!collapsed && label}
    </Link>
  );
}

/**
 * 7.png, with real numbers: Meta's hourly private-reply cap and the account
 * slot. There are no plans to upgrade to, so there's no upgrade button.
 */
function UsagePanel({
  replies, repliesLimit, accounts, accountsLimit,
}: SidebarProps["usage"]) {
  const pct = Math.min(100, (replies / repliesLimit) * 100);
  const nearLimit = pct >= 80;
  return (
    <div className="mx-4 mb-4 rounded-2xl border border-gray-100 bg-[#fafbf8] p-3 space-y-3">
      <UsageRow
        label="DMs this hour"
        value={`${replies}/${repliesLimit}`}
        pct={pct}
        barClass={nearLimit ? "bg-amber-400" : "bg-lime-400"}
        title="Meta allows 750 first DMs (private replies) per hour. Past that, new commenters are skipped until the hour rolls over."
      />
      <UsageRow
        label="IG accounts"
        value={`${accounts}/${accountsLimit}`}
        pct={(accounts / accountsLimit) * 100}
        barClass="bg-lime-400"
      />
    </div>
  );
}

function UsageRow({
  label, value, pct, barClass, title,
}: {
  label: string;
  value: string;
  pct: number;
  barClass: string;
  title?: string;
}) {
  return (
    <div title={title}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="font-extrabold text-gray-950 tabular-nums">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }} />
      </div>
    </div>
  );
}
