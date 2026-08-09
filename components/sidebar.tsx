"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ImageIcon, Settings, Zap, LogOut, ChevronRight, Wand2, Workflow,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

const links = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/posts", icon: ImageIcon, label: "Reels" },
  { href: "/triggers", icon: Workflow, label: "Triggers" },
  { href: "/queue", icon: Wand2, label: "Upcoming reels" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

const COLLAPSED_KEY = "autoflow.sidebar.collapsed";

export function Sidebar({ user }: SidebarProps) {
  const path = usePathname();

  // Read after mount, not during render: the server has no localStorage, and
  // seeding state from it directly would make the first client render disagree.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((c) => {
      window.localStorage.setItem(COLLAPSED_KEY, c ? "0" : "1");
      return !c;
    });
  }

  return (
    <aside
      className={cn(
        "shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100 flex flex-col transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo + the collapse toggle */}
      <div className={cn("border-b border-gray-100", collapsed ? "p-3" : "p-5")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <>
              <span className="font-bold text-gray-900">AutoFlow</span>
              <button
                onClick={toggle}
                className="ml-auto text-gray-300 hover:text-gray-600 cursor-pointer"
                title="Collapse to icons"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        {collapsed && (
          <button
            onClick={toggle}
            className="mt-2 w-full flex justify-center text-gray-300 hover:text-gray-600 cursor-pointer"
            title="Expand the sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav — collapsed, the label becomes the tooltip so nothing is guesswork */}
      <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-3")}>
        {links.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-lg text-sm font-medium transition-all",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-brand-600" : "text-gray-400")} />
              {!collapsed && (
                <>
                  {label}
                  {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-brand-400" />}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className={cn("border-t border-gray-100", collapsed ? "p-2" : "p-3")}>
        <div
          className={cn(
            "flex rounded-lg",
            collapsed ? "flex-col items-center gap-2 py-2" : "items-center gap-3 px-2 py-2"
          )}
        >
          {user.image ? (
            <Image
              src={user.image} alt="avatar" width={32} height={32}
              title={collapsed ? (user.name ?? undefined) : undefined}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              title={collapsed ? (user.name ?? undefined) : undefined}
              className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0"
            >
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-gray-400 hover:text-gray-600 p-1 rounded cursor-pointer shrink-0"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
