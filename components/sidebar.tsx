"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ImageIcon, Settings, Zap, LogOut, ChevronRight, Wand2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface SidebarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
}

const links = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/posts", icon: ImageIcon, label: "Reels" },
  { href: "/queue", icon: Wand2, label: "Upcoming reels" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar({ user }: SidebarProps) {
  const path = usePathname();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900">AutoFlow</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ href, icon: Icon, label }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-brand-600" : "text-gray-400")} />
              {label}
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-brand-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          {user.image ? (
            <Image src={user.image} alt="avatar" width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
              {user.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-gray-400 hover:text-gray-600 p-1 rounded cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
