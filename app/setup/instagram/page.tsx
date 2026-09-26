import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace";
import { Logo } from "@/components/brand";
import { InstagramSetup } from "./instagram-setup";

export const metadata = { title: "Finish setting up — AutoFlow" };

/**
 * Where an owner lands while their workspace has no Instagram account: they
 * started a new workspace and closed the Instagram login, or logged out
 * halfway. Every workspace runs one account, so there's no skipping — they
 * connect or move one, switch to another workspace, or log out and come back.
 */
export default async function SetupInstagramPage() {
  const ctx = await getWorkspaceContext();
  if (!ctx) redirect("/login");
  if (ctx.role !== "owner" || ctx.igAccount) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#f3f4f1] flex flex-col">
      <header className="px-6 py-5 max-w-6xl w-full mx-auto"><Logo href={null} /></header>
      <main className="flex-1 flex items-start sm:items-center justify-center px-4 pb-16">
        <InstagramSetup
          workspace={{ id: ctx.workspace.id, name: ctx.workspace.name, color: ctx.workspace.color, personal: ctx.workspace.personal }}
          others={ctx.workspaces.filter((w) => w.id !== ctx.workspace.id)}
        />
      </main>
    </div>
  );
}
