import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight, Clock, Instagram } from "lucide-react";
import {
  ARTICLES, SUPPORT, articleBySlug, articlesIn, categoryById, headingId, readingMinutes,
} from "@/lib/help/articles";
import { ArticleBody } from "@/components/help/rich-text";
import { ArticleFeedback } from "@/components/help/article-feedback";
import { AskAssistantButton } from "@/components/help/ask-assistant-button";
import { HelpSearch } from "@/components/help/help-search";
import { CategoryIcon } from "@/components/help/category-icon";

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleBySlug((await params).slug);
  return a ? { title: `${a.title} — AutoFlow Help`, description: a.summary } : {};
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = articleBySlug((await params).slug);
  if (!article) notFound();
  const category = categoryById(article.category)!;
  const siblings = articlesIn(article.category);
  const i = siblings.findIndex((a) => a.slug === article.slug);
  const prev = siblings[i - 1];
  const next = siblings[i + 1];
  const headings = article.body.flatMap((b) => ("h" in b ? [b.h] : []));

  return (
    <main>
      {/* Header band */}
      <div className="relative z-20 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-8">
          <div className="flex flex-wrap items-center gap-4">
            <nav className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-gray-500">
              <Link href="/help" className="hover:text-gray-950">Help</Link>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
              <Link href={`/help/category/${category.id}`} className="truncate hover:text-gray-950">{category.title}</Link>
            </nav>
            <div className="ml-auto w-full sm:w-80">
              <HelpSearch size="md" />
            </div>
          </div>

          <div className="mt-10 max-w-3xl">
            <Link
              href={`/help/category/${category.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-lime-100 py-1 pl-1 pr-3 text-sm font-bold text-brand-900 hover:bg-lime-200"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lime">
                <CategoryIcon icon={category.icon} className="h-3.5 w-3.5" />
              </span>
              {category.title}
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.6rem]">{article.title}</h1>
            <p className="mt-3 text-lg text-gray-500">{article.summary}</p>
            <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-gray-400">
              <Clock className="h-4 w-4" /> {readingMinutes(article)} min read
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-[1fr_290px]">
        <div className="min-w-0">
          <article className="rounded-3xl bg-white p-6 ring-1 ring-gray-100 sm:p-10">
            <ArticleBody blocks={article.body} />
            <ArticleFeedback key={article.slug} />
          </article>

          {(prev || next) && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {prev ? (
                <Link href={`/help/${prev.slug}`} className="group rounded-3xl bg-white p-5 ring-1 ring-gray-100 hover:ring-brand-200">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" /> Previous
                  </p>
                  <p className="mt-1 font-bold group-hover:text-brand-700">{prev.title}</p>
                </Link>
              ) : <span className="hidden sm:block" />}
              {next && (
                <Link href={`/help/${next.slug}`} className="group rounded-3xl bg-white p-5 text-right ring-1 ring-gray-100 hover:ring-brand-200">
                  <p className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-400">
                    Next <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </p>
                  <p className="mt-1 font-bold group-hover:text-brand-700">{next.title}</p>
                </Link>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {headings.length > 1 && (
            <div className="hidden rounded-3xl bg-white p-5 ring-1 ring-gray-100 lg:block">
              <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-gray-400">On this page</p>
              <ul className="space-y-0.5 border-l-2 border-gray-100">
                {headings.map((h) => (
                  <li key={h}>
                    <a href={`#${headingId(h)}`} className="-ml-0.5 block border-l-2 border-transparent py-1.5 pl-3.5 text-sm font-medium text-gray-600 hover:border-lime-400 hover:text-gray-950">
                      {h}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-3xl bg-white p-5 ring-1 ring-gray-100">
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.14em] text-gray-400">In {category.title}</p>
            <ul className="space-y-0.5">
              {siblings.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/help/${a.slug}`}
                    className={`-mx-2 block rounded-xl px-3 py-2 text-sm ${
                      a.slug === article.slug ? "bg-lime-100 font-bold text-brand-900" : "font-medium text-gray-600 hover:bg-[#f5f7f1] hover:text-gray-950"
                    }`}
                  >
                    {a.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-brand-900 p-5 text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-lime/20 blur-2xl" />
            <p className="relative font-extrabold">Need a hand?</p>
            <p className="relative mt-1 text-sm text-brand-100/75">Ask the assistant, or message a real person.</p>
            <div className="relative mt-4 flex flex-wrap gap-2">
              <AskAssistantButton label="Ask" className="h-9" />
              <a
                href={SUPPORT.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full border border-white/20 px-3.5 text-sm font-bold hover:bg-white/10"
              >
                <Instagram className="h-4 w-4" /> DM us
              </a>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
