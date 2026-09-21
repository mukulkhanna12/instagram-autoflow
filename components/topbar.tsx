import Image from "next/image";
import Link from "next/link";
import { Instagram } from "lucide-react";

interface TopbarProps {
  user: { name?: string | null; email?: string | null; image?: string | null };
  igAccount: { username: string; profilePicUrl: string | null } | null;
}

/** 6.png's header strip: the connected account on the left, you on the right. */
export function Topbar({ user, igAccount }: TopbarProps) {
  return (
    <header className="rounded-3xl bg-white px-5 sm:px-6 h-[76px] flex items-center gap-4">
      {igAccount ? (
        <Link
          href="/settings"
          className="flex items-center gap-2.5 rounded-full bg-[#f3f4f1] pl-1.5 pr-4 h-11 hover:bg-gray-100 transition-colors min-w-0"
        >
          <span className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 shrink-0">
            {igAccount.profilePicUrl ? (
              <Image src={igAccount.profilePicUrl} alt="" fill unoptimized className="object-cover" />
            ) : (
              <Instagram className="w-4 h-4 m-2 text-gray-500" />
            )}
          </span>
          <span className="text-sm font-semibold text-gray-900 truncate">@{igAccount.username}</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Connected
          </span>
        </Link>
      ) : (
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 h-11 text-sm font-semibold text-amber-800 hover:bg-amber-100"
        >
          <Instagram className="w-4 h-4" /> Connect Instagram
        </Link>
      )}

      <div className="ml-auto flex items-center gap-3 min-w-0">
        <span className="relative w-11 h-11 rounded-full overflow-hidden bg-lime-200 shrink-0 flex items-center justify-center">
          {user.image ? (
            <Image src={user.image} alt="" fill unoptimized className="object-cover" />
          ) : (
            <span className="font-bold text-brand-900">{(user.name || user.email || "U")[0]?.toUpperCase()}</span>
          )}
        </span>
        <div className="hidden sm:block min-w-0">
          <p className="text-[15px] font-bold text-gray-950 truncate">{user.name && user.name !== "AutoFlow" ? user.name : "Your account"}</p>
          <p className="text-sm text-gray-400 truncate">{user.email}</p>
        </div>
      </div>
    </header>
  );
}
