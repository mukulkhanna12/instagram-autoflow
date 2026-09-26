import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { CATEGORIES, articlesIn, categoryById } from "@/lib/help/articles";
import { CategoryIcon } from "@/components/help/category-icon";
import { HelpSearch } from "@/components/help/help-search";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const c = categoryById((await params).id);
  return c ? { title: `${c.title} — AutoFlow Help`, description: c.blurb } : {};
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const category = categoryById((await params).id);
  if (!category) notFound();
  const articles = articlesIn(category.id);
  const others = CATEGORIES.filter((c) => c.id !== category.id);

  return (
    <main>
      <div className="relative z-20 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-8">
          <div className="mb-10 flex flex-wrap items-center gap-4">
            <nav className="flex items-center gap-1.5 text-sm font-semibold text-gray-500">
              <Link href="/help" className="hover:text-gray-950">Help</Link>
              <ChevronRight className="h-4 w-4 text-gray-300" />
              <span className="text-gray-950">{category.title}</span>
            </nav>
            <div className="ml-auto w-full sm:w-80">
              <HelpSearch size="md" />
            </div>
          </div>

          <div className="flex items-start gap-5">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-lime text-brand-900">
              <CategoryIcon icon={category.icon} className="h-8 w-8" />
            </span>
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">{category.title}</h1>
              <p className="mt-2 text-lg text-gray-500">{category.blurb}</p>
              <p className="mt-3 text-sm font-semibold text-brand-700">
                {articles.length} article{articles.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-16">
        <div className="mt-10 overflow-hidden rounded-3xl bg-white ring-1 ring-gray-100">
          {articles.map((a, i) => (
            <Link
              key={a.slug}
              href={`/help/${a.slug}`}
              className={`group flex items-center gap-5 px-6 py-5 hover:bg-[#f7f8f5] ${i > 0 ? "border-t border-gray-100" : ""}`}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5f7f1] text-sm font-extrabold tabular-nums text-brand-700 group-hover:bg-lime group-hover:text-gray-950">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-950 group-hover:text-brand-700">{a.title}</p>
                <p className="mt-0.5 text-sm text-gray-500">{a.summary}</p>
              </div>
              <ArrowRight className="h-5 w-5 shrink-0 text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-brand-700" />
            </Link>
          ))}
        </div>

        <h2 className="mt-14 text-xl font-extrabold tracking-tight">Other topics</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {others.map((c) => (
            <Link
              key={c.id}
              href={`/help/category/${c.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold ring-1 ring-gray-200 hover:ring-brand-500"
            >
              <CategoryIcon icon={c.icon} className="h-4 w-4 text-brand-600" /> {c.title}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
